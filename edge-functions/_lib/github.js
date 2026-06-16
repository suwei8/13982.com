const GIT_API = 'https://gitee.com/api/v5';

function getHeaders(env) {
  return {
    'Authorization': `Bearer ${env.GITEE_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function getOwnerRepo(env) {
  return { owner: env.GITEE_OWNER, repo: env.GITEE_REPO };
}

function getBranch(env) {
  return env.GITEE_BRANCH || 'master';
}

export async function listDir(dirPath, env) {
  const { owner, repo } = getOwnerRepo(env);
  const encodedPath = encodeURIComponent(dirPath);
  const url = `${GIT_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${getBranch(env)}`;
  const res = await fetch(url, { headers: getHeaders(env) });
  if (res.status === 404) return [];
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

export async function getFile(filePath, env) {
  const { owner, repo } = getOwnerRepo(env);
  const encodedPath = encodeURIComponent(filePath);
  const url = `${GIT_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${getBranch(env)}`;
  const res = await fetch(url, { headers: getHeaders(env) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  const data = await res.json();
  return {
    sha: data.sha,
    content: decodeBase64(data.content),
    name: data.name,
    path: data.path,
  };
}

export async function putFile(filePath, content, message, env, sha) {
  const { owner, repo } = getOwnerRepo(env);
  const encodedPath = encodeURIComponent(filePath);
  const url = `${GIT_API}/repos/${owner}/${repo}/contents/${encodedPath}`;
  const body = {
    message,
    content: encodeBase64(content),
    branch: getBranch(env),
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(env),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

export async function deleteFile(filePath, sha, message, env) {
  const { owner, repo } = getOwnerRepo(env);
  const encodedPath = encodeURIComponent(filePath);
  const url = `${GIT_API}/repos/${owner}/${repo}/contents/${encodedPath}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(env),
    body: JSON.stringify({
      message,
      sha,
      branch: getBranch(env),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

// YAML double-quoted scalar escaping (subset of YAML 1.2 spec).
// Order matters: backslash first so we don't double-escape the escapes we add.
function yamlEscape(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Unescape a YAML double-quoted scalar. Critical: collapse escaped backslashes
// (\\) FIRST via a placeholder, then process the other escape sequences.
// Otherwise a literal "\\t" in the source would be eaten by the \t rule.
const BACKSLASH_PLACEHOLDER = '\x00';
function yamlUnescape(str) {
  let s = str.replace(/\\\\/g, BACKSLASH_PLACEHOLDER);
  s = s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
  return s.replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\');
}

function formatYamlValue(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (Array.isArray(val)) {
    const items = val.map(v => `"${yamlEscape(String(v))}"`).join(', ');
    return `[${items}]`;
  }
  if (typeof val === 'string') {
    return `"${yamlEscape(val)}"`;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  return `"${yamlEscape(String(val))}"`;
}

export function buildFrontmatter(data, content) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(data)) {
    const formatted = formatYamlValue(val);
    if (formatted === null) continue;
    lines.push(`${key}: ${formatted}`);
  }
  lines.push('---', '');
  return lines.join('\n') + (content || '');
}

function parsePlainScalar(val) {
  if (val === '') return '';
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  // Keep ISO date strings as-is; Astro's z.coerce.date() will handle it.
  return val;
}

function parseArrayScalar(inner) {
  const result = [];
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /\s/.test(inner[i])) i++;
    if (i >= inner.length) break;

    if (inner[i] === '"') {
      let raw = '';
      let j = i + 1;
      while (j < inner.length) {
        if (inner[j] === '\\' && j + 1 < inner.length) {
          raw += inner[j] + inner[j + 1];
          j += 2;
        } else if (inner[j] === '"') {
          break;
        } else {
          raw += inner[j];
          j++;
        }
      }
      result.push(yamlUnescape(raw));
      i = j + 1;
      while (i < inner.length && inner[i] !== ',') i++;
      if (inner[i] === ',') i++;
    } else {
      let j = i;
      while (j < inner.length && inner[j] !== ',') j++;
      const v = inner.slice(i, j).trim();
      if (v.length > 0) result.push(parsePlainScalar(v));
      i = j + 1;
    }
  }
  return result;
}

export function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: md };

  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = parseArrayScalar(val.slice(1, -1));
      continue;
    }
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
      data[key] = yamlUnescape(val.slice(1, -1));
      continue;
    }
    data[key] = parsePlainScalar(val);
  }
  return { data, content: match[2] };
}

const GITHUB_API = 'https://api.github.com';

function getHeaders(env) {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': '13982-admin',
  };
}

function getOwnerRepo(env) {
  return { owner: env.GITHUB_OWNER, repo: env.GITHUB_REPO };
}

function getBranch(env) {
  return env.GITHUB_BRANCH || 'main';
}

export async function listDir(dirPath, env) {
  const { owner, repo } = getOwnerRepo(env);
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${dirPath}?ref=${getBranch(env)}`;
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
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${getBranch(env)}`;
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
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
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
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
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
  return decodeURIComponent(escape(atob(str)));
}

export function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, content: md };
  const data = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
    }
    data[key] = val;
  });
  return { data, content: match[2] };
}

export function buildFrontmatter(data, content) {
  let fm = '---\n';
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      fm += `${key}: [${val.map(v => `"${v}"`).join(', ')}]\n`;
    } else if (typeof val === 'string') {
      fm += `${key}: "${val}"\n`;
    } else {
      fm += `${key}: ${val}\n`;
    }
  }
  fm += '---\n\n';
  return fm + content;
}

import { authenticate } from '../../_lib/auth.js';
import { putFile, deleteFile, buildFrontmatter } from '../../_lib/github.js';
import { json, error } from '../../_lib/response.js';

const CASES_SCHEMA = {
  title: { type: 'string', required: true },
  description: { type: 'string', required: true },
  thumbnail: { type: 'string', required: false },
  tags: { type: 'array', required: false, default: [] },
  date: { type: 'date', required: true },
};

const SERVICES_SCHEMA = {
  title: { type: 'string', required: true },
  description: { type: 'string', required: true },
  icon: { type: 'string', required: false },
  order: { type: 'number', required: false, default: 0 },
};

function validateContent(type, data) {
  const schema = type === 'cases' ? CASES_SCHEMA : SERVICES_SCHEMA;
  const errors = [];
  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && (data[key] === undefined || data[key] === '')) {
      errors.push(`Missing required field: ${key}`);
    }
  }
  return errors;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { type, path: filePath, data, content, sha } = body || {};

  if (!type || !['cases', 'services'].includes(type)) {
    return error('Missing or invalid "type" (cases|services)');
  }

  if (!data || !content) {
    return error('Missing "data" (frontmatter fields) or "content" (body)');
  }

  const errors = validateContent(type, data);
  if (errors.length > 0) {
    return error(errors.join('; '));
  }

  const dirMap = {
    cases: 'src/content/cases',
    services: 'src/content/services',
  };

  let targetPath = filePath;
  if (!targetPath) {
    const slug = slugify(data.title);
    targetPath = `${dirMap[type]}/${slug}.md`;
  }

  const markdown = buildFrontmatter(data, content);

  try {
    const result = await putFile(
      targetPath,
      markdown,
      `admin: update ${type} - ${data.title}`,
      env,
      sha || undefined
    );
    return json({
      success: true,
      path: targetPath,
      sha: result.content?.sha,
      message: 'Content saved. Deployment will trigger automatically.',
    });
  } catch (e) {
    return error(`Failed to save content: ${e.message}`, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const sha = url.searchParams.get('sha');

  if (!path || !sha) {
    return error('Missing "path" or "sha" parameter');
  }

  try {
    await deleteFile(path, sha, `admin: delete ${path}`, env);
    return json({ success: true, message: `Deleted ${path}` });
  } catch (e) {
    return error(`Failed to delete file: ${e.message}`, 500);
  }
}

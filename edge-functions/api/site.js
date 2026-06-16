import { authenticate } from '../_lib/auth.js';
import { getFile, putFile } from '../_lib/github.js';
import { json, error } from '../_lib/response.js';

const SITE_PATH = 'src/content/site.json';

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  try {
    const file = await getFile(SITE_PATH, env);
    let data;
    try {
      data = JSON.parse(file.content);
    } catch {
      return error('Failed to parse site.json', 500);
    }
    return json({ sha: file.sha, data });
  } catch (e) {
    return error(`Failed to read site.json: ${e.message}`, 404);
  }
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

  const { data, sha } = body || {};
  if (!data) {
    return error('Missing "data" field');
  }

  const jsonContent = JSON.stringify(data, null, 2);

  try {
    const result = await putFile(
      SITE_PATH,
      jsonContent,
      'admin: update site.json',
      env,
      sha || undefined
    );
    return json({
      success: true,
      sha: result.content?.sha,
      message: 'Site config saved. Deployment will trigger automatically.',
    });
  } catch (e) {
    return error(`Failed to save site.json: ${e.message}`, 500);
  }
}

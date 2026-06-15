import { authenticate } from '../../_lib/auth.js';
import { getFile } from '../../_lib/github.js';
import { json, error } from '../../_lib/response.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return error('Missing "path" parameter');
  }

  try {
    const file = await getFile(path, env);
    return json({
      path: file.path,
      name: file.name,
      sha: file.sha,
      content: file.content,
    });
  } catch (e) {
    return error(`Failed to read file: ${e.message}`, 404);
  }
}

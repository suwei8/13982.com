import { authenticate } from '../../_lib/auth.js';
import { listDir, getFile, parseFrontmatter } from '../../_lib/github.js';
import { json, error } from '../../_lib/response.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  if (!type || !['cases', 'services'].includes(type)) {
    return error('Missing or invalid "type" parameter (cases|services)');
  }

  const dirMap = {
    cases: 'src/content/cases',
    services: 'src/content/services',
  };

  try {
    const files = await listDir(dirMap[type], env);
    const items = [];

    for (const f of files) {
      if (!f.name.endsWith('.md')) continue;
      try {
        const file = await getFile(f.path, env);
        const { data } = parseFrontmatter(file.content);
        items.push({
          filename: f.name,
          path: f.path,
          sha: file.sha,
          ...data,
        });
      } catch (e) {
        items.push({ filename: f.name, path: f.path, error: e.message });
      }
    }

    return json({ type, items, count: items.length });
  } catch (e) {
    return error(`Failed to list content: ${e.message}`, 500);
  }
}

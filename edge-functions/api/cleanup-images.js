import { json, error } from '../../_lib/response.js';
import { listDir, getFile, deleteFile } from '../../_lib/github.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // 1. Get all image files from public/images/
    const imageFiles = [];
    async function scanDir(dirPath) {
      const items = await listDir(dirPath, env);
      for (const item of items) {
        if (item.type === 'dir') {
          await scanDir(item.path);
        } else if (item.type === 'file' && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name)) {
          imageFiles.push({ name: item.name, path: item.path, sha: item.sha, size: item.size });
        }
      }
    }
    await scanDir('public/images');

    // 2. Get all content files to check references
    const contentFiles = [];
    async function scanContentDir(dirPath) {
      const items = await listDir(dirPath, env);
      for (const item of items) {
        if (item.type === 'file' && /\.md$/i.test(item.name)) {
          contentFiles.push(item.path);
        }
      }
    }
    await scanContentDir('src/content/cases');
    await scanContentDir('src/content/services');

    // Also check site.json
    contentFiles.push('src/content/site.json');

    // 3. Read all content files and collect image references
    const referencedImages = new Set();
    for (const contentPath of contentFiles) {
      try {
        const file = await getFile(contentPath, env);
        const content = file.content;
        // Match /images/... references
        const matches = [];
        const regex = /\/images\/\S+/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
          matches.push(m[0]);
        }
        for (const m of matches) {
          // Clean up trailing punctuation
          const clean = m.replace(/[.,;:!?)\]]+$/, '');
          referencedImages.add(clean);
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }

    // 4. Find unreferenced images
    const unreferenced = imageFiles.filter(img => {
      const publicPath = '/' + img.path.replace(/^public\//, '');
      return !referencedImages.has(publicPath);
    });

    return json({
      total: imageFiles.length,
      referenced: imageFiles.length - unreferenced.length,
      unreferenced: unreferenced.map(img => ({
        name: img.name,
        path: img.path,
        sha: img.sha,
        url: '/' + img.path.replace(/^public\//, ''),
      })),
    });
  } catch (e) {
    return error('Failed to scan images: ' + e.message, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { path, sha, message } = body || {};
  if (!path || !sha) {
    return error('path and sha are required');
  }

  try {
    await deleteFile(path, sha, message || `chore: remove unused image ${path.split('/').pop()}`, env);
    return json({ success: true, deleted: path });
  } catch (e) {
    return error('Failed to delete: ' + e.message, 500);
  }
}

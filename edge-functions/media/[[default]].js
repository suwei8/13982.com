import { getBlob, isAllowedBlobKey } from '../_lib/blob.js';
import { error } from '../_lib/response.js';

const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function getMime(key) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/media\/?/, ''));

  if (!isAllowedBlobKey(env, key)) {
    return error('Missing or invalid blob key', 400);
  }

  const body = await getBlob(env, key);
  if (!body) {
    return error('Blob not found', 404);
  }

  return new Response(body, {
    headers: {
      'Content-Type': getMime(key),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

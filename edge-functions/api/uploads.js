import { authenticate } from '../_lib/auth.js';
import { deleteBlob, getMediaUrl, isAllowedBlobKey, listBlobs } from '../_lib/blob.js';
import { json, error } from '../_lib/response.js';

function nameFromKey(key) {
  return key.split('/').pop() || key;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  try {
    const result = await listBlobs(env);
    const items = (result.blobs || []).map((blob) => ({
      key: blob.key,
      name: nameFromKey(blob.key),
      etag: blob.etag,
      url: getMediaUrl(blob.key),
    }));
    return json({ items, count: items.length });
  } catch (e) {
    return error(`Failed to list uploads: ${e.message}`, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!isAllowedBlobKey(env, key)) {
    return error('Missing or invalid blob key', 400);
  }

  try {
    await deleteBlob(env, key);
    return json({ success: true, key });
  } catch (e) {
    return error(`Failed to delete upload: ${e.message}`, 500);
  }
}

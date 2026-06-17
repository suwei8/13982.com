import { authenticate } from '../_lib/auth.js';
import { putFileBase64 } from '../_lib/github.js';
import { json, error } from '../_lib/response.js';

// Convert an ArrayBuffer/Uint8Array to base64 in 32 KiB chunks to avoid
// O(n^2) string concat from String.fromCharCode in a tight loop.
function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < view.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, view.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = await authenticate(request, env);
  if (auth.error) return error(auth.error, auth.status);

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return error('Content-Type must be multipart/form-data');
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return error('Invalid form data');
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return error('Missing "file" field');
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const allowedExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
  if (!allowedExts.has(ext)) {
    return error('Unsupported file type. Allowed: png, jpg, jpeg, gif, webp, svg');
  }
  if (file.size > 10 * 1024 * 1024) {
    return error('File exceeds 10MB limit');
  }

  const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : String(Date.now());
  const filename = `${random}.${ext}`;
  const uploadPath = `public/images/uploads/${filename}`;

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    return error('Failed to read file');
  }

  const base64 = bytesToBase64(arrayBuffer);

  try {
    const result = await putFileBase64(
      uploadPath,
      base64,
      `admin: upload image ${file.name}`,
      env
    );
    return json({
      success: true,
      path: uploadPath,
      url: `/images/uploads/${filename}`,
      name: file.name,
      sha: result.content?.sha,
    });
  } catch (e) {
    return error(`Failed to upload image: ${e.message}`, 500);
  }
}

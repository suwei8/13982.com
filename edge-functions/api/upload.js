import { authenticate } from '../_lib/auth.js';
import { putFileBase64 } from '../_lib/github.js';
import { getBlobKey, getMediaUrl, putBlob } from '../_lib/blob.js';
import { json, error } from '../_lib/response.js';

const DEFAULT_UPLOAD_DIR = 'public/images/uploads';
const DEFAULT_UPLOAD_URL_PREFIX = '/images/uploads';
const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_UPLOAD_ALLOWED_EXTS = 'png,jpg,jpeg,gif,webp,svg';
const DEFAULT_UPLOAD_STORAGE = 'gitee';

function cleanPathPart(value, fallback) {
  return String(value || fallback).replace(/^\/+|\/+$/g, '');
}

function cleanUrlPrefix(value, fallback) {
  const cleaned = String(value || fallback).replace(/\/+$/g, '');
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

function getUploadConfig(env) {
  const maxBytes = Number.parseInt(env.UPLOAD_MAX_BYTES || '', 10);
  return {
    dir: cleanPathPart(env.UPLOAD_DIR, DEFAULT_UPLOAD_DIR),
    urlPrefix: cleanUrlPrefix(env.UPLOAD_URL_PREFIX, DEFAULT_UPLOAD_URL_PREFIX),
    maxBytes: Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_UPLOAD_MAX_BYTES,
    storage: String(env.UPLOAD_STORAGE || DEFAULT_UPLOAD_STORAGE).toLowerCase(),
    allowedExts: new Set(String(env.UPLOAD_ALLOWED_EXTS || DEFAULT_UPLOAD_ALLOWED_EXTS)
      .split(',')
      .map((ext) => ext.trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean)),
  };
}

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

  const uploadConfig = getUploadConfig(env);
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!uploadConfig.allowedExts.has(ext)) {
    return error(`Unsupported file type. Allowed: ${Array.from(uploadConfig.allowedExts).join(', ')}`);
  }
  if (file.size > uploadConfig.maxBytes) {
    return error(`File exceeds ${uploadConfig.maxBytes} bytes limit`);
  }

  const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : String(Date.now());
  const filename = `${random}.${ext}`;
  const uploadPath = `${uploadConfig.dir}/${filename}`;
  const blobKey = getBlobKey(env, filename);

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    return error('Failed to read file');
  }

  try {
    if (uploadConfig.storage === 'blob') {
      await putBlob(env, blobKey, arrayBuffer);
      return json({
        success: true,
        storage: 'blob',
        key: blobKey,
        path: blobKey,
        url: getMediaUrl(blobKey),
        name: file.name,
      });
    }

    const base64 = bytesToBase64(arrayBuffer);
    const result = await putFileBase64(
      uploadPath,
      base64,
      `admin: upload image ${file.name}`,
      env
    );
    return json({
      success: true,
      storage: 'gitee',
      path: uploadPath,
      url: `${uploadConfig.urlPrefix}/${filename}`,
      name: file.name,
      sha: result.content?.sha,
    });
  } catch (e) {
    return error(`Failed to upload image: ${e.message}`, 500);
  }
}

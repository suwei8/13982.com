import { authenticate } from '../_lib/auth.js';
import { putFile } from '../_lib/github.js';
import { json, error } from '../_lib/response.js';

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

  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const uploadPath = `public/images/uploads/${timestamp}.${ext}`;

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    return error('Failed to read file');
  }

  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  try {
    const result = await putFile(
      uploadPath,
      base64,
      `admin: upload image ${file.name}`,
      env
    );
    return json({
      success: true,
      path: uploadPath,
      url: `/images/uploads/${timestamp}.${ext}`,
      name: file.name,
      sha: result.content?.sha,
    });
  } catch (e) {
    return error(`Failed to upload image: ${e.message}`, 500);
  }
}

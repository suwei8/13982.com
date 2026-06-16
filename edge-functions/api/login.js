import { hashPassword, signToken } from '../_lib/auth.js';
import { json, error } from '../_lib/response.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const ADMIN_USER = env.ADMIN_USER;
  const ADMIN_PASS_HASH = env.ADMIN_PASS_HASH;
  const SESSION_SECRET = env.SESSION_SECRET;

  if (!ADMIN_USER || !ADMIN_PASS_HASH || !SESSION_SECRET) {
    return error('Server configuration error', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return error('Username and password are required');
  }

  const hash = await hashPassword(password, SESSION_SECRET);
  if (username !== ADMIN_USER || hash !== ADMIN_PASS_HASH) {
    return error('Invalid credentials', 401);
  }

  const token = await signToken(username, SESSION_SECRET, 12);
  return json({ token, exp: Math.floor(Date.now() / 1000) + 12 * 3600 });
}

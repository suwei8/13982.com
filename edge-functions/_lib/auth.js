const encoder = new TextEncoder();

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

export async function hmacVerify(message, signature, secret) {
  const expected = await hmacSign(message, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassword(password, secret) {
  return hmacSign(password, secret);
}


export async function signToken(user, secret, expHours = 12) {
  const exp = Math.floor(Date.now() / 1000) + expHours * 3600;
  const payload = JSON.stringify({ user, exp });
  const b64 = btoa(payload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const sig = await hmacSign(payload, secret);
  return `${b64}.${sig}`;
}

export async function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const payload = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const valid = await hmacVerify(payload, sig, secret);
  if (!valid) return null;
  const data = JSON.parse(payload);
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

export async function authenticate(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }
  const token = auth.slice(7);
  const data = await verifyToken(token, env.SESSION_SECRET);
  if (!data) {
    return { error: 'Invalid or expired token', status: 401 };
  }
  return { user: data.user };
}

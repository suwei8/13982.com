export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function missingEnv(...keys) {
  const missing = keys.filter(k => !process.env[k] && !globalThis.__env?.[k]);
  if (missing.length > 0) {
    return error(`Missing required environment variables: ${missing.join(', ')}`, 500);
  }
  return null;
}

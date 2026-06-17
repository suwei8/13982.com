function normalizeAdminPath(value) {
  const raw = String(value || '/admin').trim();
  const normalized = `/${raw.replace(/^\/+|\/+$/g, '') || 'admin'}`;
  return normalized.toLowerCase();
}

export function onRequest(context) {
  const adminPath = normalizeAdminPath(context.env?.ADMIN_PATH || context.env?.ADMIN_ROUTE);
  if (adminPath !== '/admin') {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (typeof context.next === 'function') return context.next();
  return new Response('Admin path guard is active. Set ADMIN_PATH to a custom path for production.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

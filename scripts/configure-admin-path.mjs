import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const adminDir = path.join(distDir, 'admin');
const rawPath = process.env.ADMIN_PATH || process.env.ADMIN_ROUTE || '/admin';
const normalized = `/${String(rawPath).trim().replace(/^\/+|\/+$/g, '') || 'admin'}`;
const safeSegment = normalized.replace(/^\//, '');

if (!existsSync(adminDir)) {
  console.log('[configure-admin-path] dist/admin/ not found, skipping');
  process.exit(0);
}

if (normalized === '/admin') {
  console.log('[configure-admin-path] ADMIN_PATH not set, keeping /admin/');
  process.exit(0);
}

if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]{1,80}$/.test(safeSegment) || safeSegment.includes('..')) {
  throw new Error(`Invalid ADMIN_PATH: ${rawPath}. Use a path like /sw or /dm-console-2026`);
}

const targetDir = path.join(distDir, safeSegment);
await mkdir(path.dirname(targetDir), { recursive: true });
await rm(targetDir, { recursive: true, force: true });
await cp(adminDir, targetDir, { recursive: true });
await writeFile(
  path.join(adminDir, 'index.html'),
  '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>404</title></head><body><h1>404 Not Found</h1></body></html>\n'
);
console.log(`[configure-admin-path] admin UI moved to ${normalized}/ and /admin/ was disabled`);

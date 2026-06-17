import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const source = 'edge-functions';
const target = join('dist', 'edge-functions');

if (!existsSync(source)) {
  console.log('[copy-edge-functions] skipped: edge-functions directory not found');
  process.exit(0);
}

if (!existsSync('dist')) {
  throw new Error('dist directory not found. Run astro build before copying edge functions.');
}

await rm(target, { recursive: true, force: true });
await cp(source, target, {
  recursive: true,
  filter: (src) => !src.includes(`${source}/__tests__`),
});

console.log(`[copy-edge-functions] copied ${source}/ to ${target}/`);

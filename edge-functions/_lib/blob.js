const DEFAULT_BLOB_STORE = 'uploads';
const DEFAULT_BLOB_PREFIX = 'uploads';
const DEFAULT_BLOB_READ_CONSISTENCY = 'strong';

function cleanPathPart(value, fallback) {
  return String(value || fallback).replace(/^\/+|\/+$/g, '');
}

function getBlobConfig(env) {
  return {
    storeName: env.BLOB_STORE || DEFAULT_BLOB_STORE,
    prefix: cleanPathPart(env.BLOB_PREFIX, DEFAULT_BLOB_PREFIX),
    readConsistency: env.BLOB_READ_CONSISTENCY || DEFAULT_BLOB_READ_CONSISTENCY,
  };
}

async function getStoreFactory() {
  const mod = await import('@edgeone/pages-blob');
  return mod.getStore;
}

export function getBlobKey(env, filename) {
  const { prefix } = getBlobConfig(env);
  return `${prefix}/${filename}`;
}

export function isAllowedBlobKey(env, key) {
  const { prefix } = getBlobConfig(env);
  return typeof key === 'string' && key.startsWith(`${prefix}/`) && !key.includes('..') && !key.includes('\\');
}

export async function putBlob(env, key, value) {
  const { storeName } = getBlobConfig(env);
  const getStore = await getStoreFactory();
  const store = getStore(storeName);
  await store.set(key, value, { onlyIfNew: true });
}

export async function getBlob(env, key) {
  const { storeName, readConsistency } = getBlobConfig(env);
  const getStore = await getStoreFactory();
  const store = getStore(storeName);
  return store.get(key, { type: 'arrayBuffer', consistency: readConsistency });
}

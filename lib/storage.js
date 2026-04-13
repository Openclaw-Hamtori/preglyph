import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WRITERS_PATH = path.join(DATA_DIR, 'writers.json');
const PRESENCE_REQUESTS_PATH = path.join(DATA_DIR, 'presence-requests.json');
const PRESENCE_BINDINGS_PATH = path.join(DATA_DIR, 'presence-bindings.json');
const PRESENCE_AUDIT_PATH = path.join(DATA_DIR, 'presence-audit.json');

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function atomicWriteJson(filePath, value) {
  await ensureDataDir();
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await rename(tempPath, filePath);
}

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function getWriterRegistry() {
  return readJson(WRITERS_PATH, { writers: {} });
}

export async function getWriterStatus(address) {
  if (!address) return null;
  const normalized = address.toLowerCase();
  const registry = await getWriterRegistry();
  return registry.writers[normalized] || null;
}

export async function setWriterStatus(address, status) {
  const normalized = address.toLowerCase();
  const registry = await getWriterRegistry();
  registry.writers[normalized] = {
    ...(registry.writers[normalized] || {}),
    ...status,
    address: normalized,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(WRITERS_PATH, registry);
  return registry.writers[normalized];
}

export async function savePresenceRequest(request) {
  const store = await readJson(PRESENCE_REQUESTS_PATH, { requests: {} });
  store.requests[request.id] = request;
  await atomicWriteJson(PRESENCE_REQUESTS_PATH, store);
  return request;
}

export async function getPresenceRequest(requestId) {
  if (!requestId) return null;
  const store = await readJson(PRESENCE_REQUESTS_PATH, { requests: {} });
  return store.requests[requestId] || null;
}

export async function savePresenceBinding(address, binding) {
  const normalized = address.toLowerCase();
  const store = await readJson(PRESENCE_BINDINGS_PATH, { bindings: {} });
  store.bindings[normalized] = {
    ...(store.bindings[normalized] || {}),
    ...binding,
    accountId: normalized,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(PRESENCE_BINDINGS_PATH, store);
  return store.bindings[normalized];
}

export async function getPresenceBinding(address) {
  if (!address) return null;
  const store = await readJson(PRESENCE_BINDINGS_PATH, { bindings: {} });
  return store.bindings[address.toLowerCase()] || null;
}

export async function appendPresenceAudit(event) {
  const store = await readJson(PRESENCE_AUDIT_PATH, { events: [] });
  store.events.push(event);
  await atomicWriteJson(PRESENCE_AUDIT_PATH, store);
  return event;
}

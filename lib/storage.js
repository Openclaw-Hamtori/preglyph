import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WRITERS_PATH = path.join(DATA_DIR, 'writers.json');

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

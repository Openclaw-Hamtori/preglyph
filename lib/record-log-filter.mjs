import { getInscriptionModeFromCode } from './inscription-mode.mjs';

const RECORD_EVENT = 'RecordWritten';
const RECORD_EVENT_V2 = 'RecordWrittenV2';

function toParsedRecord(log, parsed) {
  const [recordId, author, content, createdAt, inscriptionModeCode] = parsed.args;
  return {
    id: Number(recordId),
    author,
    content,
    createdAt: Number(createdAt),
    inscriptionMode: parsed.name === RECORD_EVENT_V2 ? getInscriptionModeFromCode(inscriptionModeCode) : 'horizontal',
    txHash: log.transactionHash,
    contractAddress: log.address,
    blockNumber: Number(log.blockNumber || 0),
    logIndex: Number(log.index ?? log.logIndex ?? 0),
  };
}

function getRecordEntryKey(record) {
  return [record?.contractAddress || '', record?.txHash || '', record?.id ?? ''].join(':').toLowerCase();
}

function shouldPreferRecord(candidate, existing) {
  if (!existing) return true;
  const candidateIsV2 = candidate?.inscriptionMode !== 'horizontal';
  const existingIsV2 = existing?.inscriptionMode !== 'horizontal';
  if (candidateIsV2 !== existingIsV2) {
    return candidateIsV2;
  }
  if ((candidate?.blockNumber || 0) !== (existing?.blockNumber || 0)) {
    return (candidate?.blockNumber || 0) > (existing?.blockNumber || 0);
  }
  return (candidate?.logIndex || 0) > (existing?.logIndex || 0);
}

export function normalizeRecordEntries(records = []) {
  const deduped = new Map();
  for (const record of records) {
    if (!record) continue;
    const key = getRecordEntryKey(record);
    const existing = deduped.get(key);
    if (shouldPreferRecord(record, existing)) {
      deduped.set(key, record);
    }
  }
  return Array.from(deduped.values());
}

export function pickAllowedRecordFromLogs({ logs = [], allowedContracts = [], recordInterface }) {
  if (!recordInterface || !Array.isArray(logs) || !Array.isArray(allowedContracts)) {
    return null;
  }

  const allowedAddresses = new Set(
    allowedContracts
      .map((entry) => String(entry?.address || '').trim().toLowerCase())
      .filter(Boolean),
  );

  const parsedRecords = [];

  for (const log of logs) {
    const logAddress = String(log?.address || '').trim().toLowerCase();
    if (!allowedAddresses.has(logAddress)) continue;

    try {
      const parsed = recordInterface.parseLog(log);
      if (!parsed || (parsed.name !== RECORD_EVENT && parsed.name !== RECORD_EVENT_V2)) continue;
      parsedRecords.push(toParsedRecord(log, parsed));
    } catch {
      // ignore unrelated logs from allowed contracts too
    }
  }

  const [preferredRecord] = normalizeRecordEntries(parsedRecords)
    .sort((a, b) => (b.blockNumber - a.blockNumber) || (b.logIndex - a.logIndex));
  return preferredRecord || null;
}

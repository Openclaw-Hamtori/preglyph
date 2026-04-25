import { getInscriptionModeFromCode } from './inscription-mode.mjs';

const RECORD_EVENT = 'RecordWritten';
const RECORD_EVENT_V2 = 'RecordWrittenV2';

export function pickAllowedRecordFromLogs({ logs = [], allowedContracts = [], recordInterface }) {
  if (!recordInterface || !Array.isArray(logs) || !Array.isArray(allowedContracts)) {
    return null;
  }

  const allowedAddresses = new Set(
    allowedContracts
      .map((entry) => String(entry?.address || '').trim().toLowerCase())
      .filter(Boolean),
  );

  for (const log of logs) {
    const logAddress = String(log?.address || '').trim().toLowerCase();
    if (!allowedAddresses.has(logAddress)) continue;

    try {
      const parsed = recordInterface.parseLog(log);
      if (!parsed || (parsed.name !== RECORD_EVENT && parsed.name !== RECORD_EVENT_V2)) continue;

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
    } catch {
      // ignore unrelated logs from allowed contracts too
    }
  }

  return null;
}

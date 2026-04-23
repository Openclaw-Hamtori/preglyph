export const INITIAL_RECORDS_LIMIT = 40;
export const INCREMENTAL_RECORDS_LIMIT = 20;

export function sanitizeRecordsLimit(rawLimit, { fallback = INITIAL_RECORDS_LIMIT, maximum = INITIAL_RECORDS_LIMIT } = {}) {
  const parsed = Number.parseInt(String(rawLimit || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, maximum);
}

export function encodeRecordsCursor(record) {
  if (!record) return null;
  const blockNumber = Number(record.blockNumber);
  const logIndex = Number(record.logIndex);
  if (!Number.isFinite(blockNumber) || !Number.isFinite(logIndex)) {
    return null;
  }
  return `${blockNumber}:${logIndex}`;
}

export function parseRecordsCursor(rawCursor) {
  const value = String(rawCursor || '').trim();
  if (!value) return null;
  const [blockNumberText, logIndexText] = value.split(':');
  const blockNumber = Number.parseInt(blockNumberText || '', 10);
  const logIndex = Number.parseInt(logIndexText || '', 10);
  if (!Number.isFinite(blockNumber) || !Number.isFinite(logIndex) || blockNumber < 0 || logIndex < 0) {
    return null;
  }
  return { blockNumber, logIndex };
}

function compareRecordOrder(a, b) {
  return (Number(b.blockNumber) - Number(a.blockNumber)) || (Number(b.logIndex) - Number(a.logIndex));
}

function isOlderThanCursor(record, cursor) {
  if (!cursor) return true;
  return Number(record.blockNumber) < cursor.blockNumber || (
    Number(record.blockNumber) === cursor.blockNumber && Number(record.logIndex) < cursor.logIndex
  );
}

export function paginateOrderedRecords(records, { limit = INITIAL_RECORDS_LIMIT, cursor = null } = {}) {
  const ordered = [...records].sort(compareRecordOrder);
  const filtered = ordered.filter((record) => isOlderThanCursor(record, cursor));
  const page = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  return {
    records: page,
    hasMore,
    nextCursor: hasMore ? encodeRecordsCursor(page.at(-1)) : null,
  };
}

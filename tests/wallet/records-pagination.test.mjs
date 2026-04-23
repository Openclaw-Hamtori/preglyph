import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_RECORDS_LIMIT,
  INCREMENTAL_RECORDS_LIMIT,
  encodeRecordsCursor,
  parseRecordsCursor,
  paginateOrderedRecords,
  sanitizeRecordsLimit,
} from '../../lib/records-pagination.mjs';

test('records pagination exposes the intended initial and incremental page sizes', () => {
  assert.equal(INITIAL_RECORDS_LIMIT, 40);
  assert.equal(INCREMENTAL_RECORDS_LIMIT, 20);
});

test('records cursor round-trips block and log positions', () => {
  const cursor = encodeRecordsCursor({ blockNumber: 123, logIndex: 7 });
  assert.equal(cursor, '123:7');
  assert.deepEqual(parseRecordsCursor(cursor), { blockNumber: 123, logIndex: 7 });
  assert.equal(parseRecordsCursor('bad-cursor'), null);
});

test('paginateOrderedRecords returns the newest page and a cursor for older records', () => {
  const records = [
    { id: 1, blockNumber: 100, logIndex: 1 },
    { id: 2, blockNumber: 101, logIndex: 3 },
    { id: 3, blockNumber: 101, logIndex: 1 },
    { id: 4, blockNumber: 99, logIndex: 9 },
  ];

  const firstPage = paginateOrderedRecords(records, { limit: 2 });
  assert.deepEqual(firstPage.records.map((record) => record.id), [2, 3]);
  assert.equal(firstPage.hasMore, true);
  assert.equal(firstPage.nextCursor, '101:1');

  const secondPage = paginateOrderedRecords(records, { limit: 2, cursor: parseRecordsCursor(firstPage.nextCursor) });
  assert.deepEqual(secondPage.records.map((record) => record.id), [1, 4]);
  assert.equal(secondPage.hasMore, false);
  assert.equal(secondPage.nextCursor, null);
});

test('sanitizeRecordsLimit clamps unsafe page sizes', () => {
  assert.equal(sanitizeRecordsLimit('200', { fallback: 40, maximum: 40 }), 40);
  assert.equal(sanitizeRecordsLimit('0', { fallback: 40, maximum: 40 }), 40);
  assert.equal(sanitizeRecordsLimit('20', { fallback: 40, maximum: 40 }), 20);
});

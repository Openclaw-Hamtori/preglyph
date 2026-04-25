import test from 'node:test';
import assert from 'node:assert/strict';

import { Interface } from 'ethers';

import PREGlyph_ABI from '../../lib/preglyphAbi.cjs';
import { normalizeRecordEntries, pickAllowedRecordFromLogs } from '../../lib/record-log-filter.mjs';

const recordInterface = new Interface(PREGlyph_ABI);

function makeRecordLog({
  contractAddress,
  txHash = '0x' + 'ab'.repeat(32),
  recordId = 1,
  author = '0x1111111111111111111111111111111111111111',
  content = 'hello preglyph',
  createdAt = 1710000000,
  inscriptionMode = null,
  blockNumber = 123,
  logIndex = 0,
}) {
  const eventName = inscriptionMode === null ? 'RecordWritten' : 'RecordWrittenV2';
  const encoded = recordInterface.encodeEventLog(
    recordInterface.getEvent(eventName),
    inscriptionMode === null ? [recordId, author, content, createdAt] : [recordId, author, content, createdAt, inscriptionMode],
  );

  return {
    address: contractAddress,
    transactionHash: txHash,
    blockNumber,
    index: logIndex,
    logIndex,
    topics: encoded.topics,
    data: encoded.data,
  };
}

test('pickAllowedRecordFromLogs ignores RecordWritten logs from non-preglyph contracts', () => {
  const allowedContract = '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe';
  const foreignContract = '0x9999999999999999999999999999999999999999';

  const foreignLog = makeRecordLog({
    contractAddress: foreignContract,
    txHash: '0x' + 'cd'.repeat(32),
    content: 'spoofed external record',
  });

  const allowedLog = makeRecordLog({
    contractAddress: allowedContract,
    txHash: '0x' + 'ef'.repeat(32),
    content: 'real preglyph record',
    recordId: 2,
  });

  const record = pickAllowedRecordFromLogs({
    logs: [foreignLog, allowedLog],
    allowedContracts: [{ address: allowedContract, deployBlock: 0 }],
    recordInterface,
  });

  assert.equal(record?.contractAddress.toLowerCase(), allowedContract.toLowerCase());
  assert.equal(record?.content, 'real preglyph record');
  assert.equal(record?.txHash, '0x' + 'ef'.repeat(32));
  assert.equal(record?.inscriptionMode, 'horizontal');
});

test('pickAllowedRecordFromLogs preserves ujongseo render mode from RecordWrittenV2 logs', () => {
  const allowedContract = '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe';
  const record = pickAllowedRecordFromLogs({
    logs: [makeRecordLog({ contractAddress: allowedContract, inscriptionMode: 1, content: 'vertical record' })],
    allowedContracts: [{ address: allowedContract, deployBlock: 0 }],
    recordInterface,
  });

  assert.equal(record?.content, 'vertical record');
  assert.equal(record?.inscriptionMode, 'ujongseo');
});

test('pickAllowedRecordFromLogs prefers RecordWrittenV2 over legacy RecordWritten from the same tx', () => {
  const allowedContract = '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe';
  const txHash = '0x' + 'aa'.repeat(32);
  const record = pickAllowedRecordFromLogs({
    logs: [
      makeRecordLog({ contractAddress: allowedContract, txHash, recordId: 7, content: 'same tx', logIndex: 1 }),
      makeRecordLog({ contractAddress: allowedContract, txHash, recordId: 7, content: 'same tx', inscriptionMode: 1, logIndex: 2 }),
    ],
    allowedContracts: [{ address: allowedContract, deployBlock: 0 }],
    recordInterface,
  });

  assert.equal(record?.inscriptionMode, 'ujongseo');
  assert.equal(record?.logIndex, 2);
});

test('normalizeRecordEntries collapses duplicate legacy and v2 records from the same tx', () => {
  const normalized = normalizeRecordEntries([
    {
      id: 1,
      txHash: '0x' + '11'.repeat(32),
      contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
      inscriptionMode: 'horizontal',
      blockNumber: 10,
      logIndex: 1,
      content: 'same',
    },
    {
      id: 1,
      txHash: '0x' + '11'.repeat(32),
      contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
      inscriptionMode: 'ujongseo',
      blockNumber: 10,
      logIndex: 2,
      content: 'same',
    },
  ]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]?.inscriptionMode, 'ujongseo');
  assert.equal(normalized[0]?.logIndex, 2);
});

test('pickAllowedRecordFromLogs returns null when every matching event comes from foreign contracts', () => {
  const foreignLog = makeRecordLog({
    contractAddress: '0x8888888888888888888888888888888888888888',
    content: 'not a preglyph record',
  });

  const record = pickAllowedRecordFromLogs({
    logs: [foreignLog],
    allowedContracts: [{ address: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe', deployBlock: 0 }],
    recordInterface,
  });

  assert.equal(record, null);
});

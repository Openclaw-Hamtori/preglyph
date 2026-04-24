import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProfileRequestPath, mergeProfilePage } from '../../lib/profile-pagination-ui.mjs';

test('buildProfileRequestPath includes cursor and limit when loading additional profile records', () => {
  assert.equal(
    buildProfileRequestPath('0xabc', { cursor: '101:4', limit: 20 }),
    '/api/profile/0xabc?cursor=101%3A4&limit=20',
  );
});

test('mergeProfilePage appends older profile records while preserving address and page info', () => {
  const current = {
    address: '0xabc',
    onchainApproved: true,
    records: [{ id: 2 }, { id: 1 }],
    pageInfo: { nextCursor: '100:1', hasMore: true },
  };
  const incoming = {
    address: '0xabc',
    onchainApproved: true,
    records: [{ id: 0 }],
    pageInfo: { nextCursor: null, hasMore: false },
  };

  assert.deepEqual(mergeProfilePage(current, incoming, { append: true }), {
    address: '0xabc',
    onchainApproved: true,
    records: [{ id: 2 }, { id: 1 }, { id: 0 }],
    pageInfo: { nextCursor: null, hasMore: false },
  });
});

test('mergeProfilePage drops duplicate records when the same profile page is appended twice', () => {
  const current = {
    address: '0xabc',
    onchainApproved: true,
    records: [{ id: 2, txHash: '0x2' }, { id: 1, txHash: '0x1' }],
    pageInfo: { nextCursor: '100:1', hasMore: true },
  };
  const incoming = {
    address: '0xabc',
    onchainApproved: true,
    records: [{ id: 1, txHash: '0x1' }, { id: 0, txHash: '0x0' }],
    pageInfo: { nextCursor: null, hasMore: false },
  };

  assert.deepEqual(mergeProfilePage(current, incoming, { append: true }), {
    address: '0xabc',
    onchainApproved: true,
    records: [{ id: 2, txHash: '0x2' }, { id: 1, txHash: '0x1' }, { id: 0, txHash: '0x0' }],
    pageInfo: { nextCursor: null, hasMore: false },
  });
});

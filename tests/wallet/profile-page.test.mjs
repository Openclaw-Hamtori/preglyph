import test from 'node:test';
import assert from 'node:assert/strict';

import { loadProfilePage } from '../../lib/profile-page.mjs';

test('loadProfilePage uses paginated record loading for a profile', async () => {
  const calls = [];
  const page = {
    records: [{ id: 1, content: 'hello' }],
    nextCursor: '101:4',
    hasMore: true,
  };

  const result = await loadProfilePage({
    address: '0xabc',
    limit: 20,
    cursor: { blockNumber: 200, logIndex: 3 },
    getRecordsPageImpl: async (args) => {
      calls.push(args);
      return page;
    },
  });

  assert.deepEqual(calls, [{ author: '0xabc', limit: 20, cursor: { blockNumber: 200, logIndex: 3 } }]);
  assert.deepEqual(result, {
    address: '0xabc',
    onchainApproved: true,
    records: page.records,
    pageInfo: {
      nextCursor: '101:4',
      hasMore: true,
    },
  });
});

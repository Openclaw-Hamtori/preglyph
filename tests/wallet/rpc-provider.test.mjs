import test from 'node:test';
import assert from 'node:assert/strict';

import { createRpcProviderCache } from '../../lib/rpc-provider.mjs';

test('rpc provider cache reuses the same provider for the same RPC URL', () => {
  const created = [];
  const cache = createRpcProviderCache({
    createProvider: (rpcUrl) => {
      const provider = { rpcUrl, id: created.length + 1 };
      created.push(provider);
      return provider;
    },
  });

  const first = cache.get('https://rpc.example');
  const second = cache.get('https://rpc.example');
  const third = cache.get('https://rpc.other');

  assert.equal(first, second);
  assert.notEqual(first, third);
  assert.equal(created.length, 2);
});

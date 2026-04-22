import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureWritableProfile } from '../../lib/write-access.mjs';

test('ensureWritableProfile keeps an already approved profile shape', async () => {
  const calls = [];
  const profile = { address: '0xabc', onchainApproved: true, records: [] };
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      async json() {
        return { ok: true, profile };
      },
    };
  };

  const result = await ensureWritableProfile({ address: '0xabc', fetchImpl });
  assert.deepEqual(result, profile);
  assert.deepEqual(calls, ['/api/profile/0xabc']);
});

test('ensureWritableProfile upgrades an unapproved profile without a separate approval request', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      async json() {
        return { ok: true, profile: { address: '0xabc', onchainApproved: false, records: [] } };
      },
    };
  };

  const result = await ensureWritableProfile({ address: '0xabc', fetchImpl });
  assert.equal(result.onchainApproved, true);
  assert.deepEqual(calls, ['/api/profile/0xabc']);
});

test('ensureWritableProfile surfaces profile fetch failures', async () => {
  const fetchImpl = async () => ({
    ok: false,
    async json() {
      return { ok: false, error: 'Profile failed.' };
    },
  });

  await assert.rejects(
    ensureWritableProfile({ address: '0xabc', fetchImpl }),
    /Profile failed\./,
  );
});

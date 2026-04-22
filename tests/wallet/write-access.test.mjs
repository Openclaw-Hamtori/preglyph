import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureWritableProfile } from '../../lib/write-access.mjs';

test('ensureWritableProfile returns existing approved profile without extra approval call', async () => {
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

test('ensureWritableProfile auto-approves an unapproved profile', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/profile/0xabc') {
      return {
        ok: true,
        async json() {
          return { ok: true, profile: { address: '0xabc', onchainApproved: false, records: [] } };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return { ok: true, approved: true };
      },
    };
  };

  const result = await ensureWritableProfile({ address: '0xabc', fetchImpl });
  assert.equal(result.onchainApproved, true);
  assert.equal(calls[1].url, '/api/writers/approve');
  assert.equal(calls[1].options.method, 'POST');
  assert.match(calls[1].options.body, /0xabc/);
});

test('ensureWritableProfile surfaces approval failures', async () => {
  const fetchImpl = async (url) => {
    if (url === '/api/profile/0xabc') {
      return {
        ok: true,
        async json() {
          return { ok: true, profile: { address: '0xabc', onchainApproved: false, records: [] } };
        },
      };
    }

    return {
      ok: false,
      async json() {
        return { ok: false, error: 'Approval failed.' };
      },
    };
  };

  await assert.rejects(
    ensureWritableProfile({ address: '0xabc', fetchImpl }),
    /Approval failed\./,
  );
});

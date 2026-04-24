import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePermitFeeQuote } from '../../lib/permit-fee-quote.mjs';

test('resolvePermitFeeQuote returns the fresh quote when the first lookup succeeds', async () => {
  let calls = 0;
  const quote = await resolvePermitFeeQuote(
    { rpcUrl: 'https://example.invalid', usdCents: 100 },
    {
      async getQuote() {
        calls += 1;
        return { source: 'chainlink', feeWei: 123n, stale: false };
      },
    },
  );

  assert.equal(calls, 1);
  assert.equal(quote.source, 'chainlink');
  assert.equal(quote.feeWei, 123n);
  assert.equal(quote.stale, false);
});

test('resolvePermitFeeQuote falls back to the latest stale Chainlink quote instead of failing closed', async () => {
  const calls = [];
  const quote = await resolvePermitFeeQuote(
    { rpcUrl: 'https://example.invalid', usdCents: 100 },
    {
      async getQuote(options) {
        calls.push(options);
        if (!options.allowStale) {
          throw new Error('Chainlink ETH/USD feed is stale.');
        }
        return {
          source: 'chainlink-stale',
          feeWei: 456n,
          updatedAt: 123,
          stale: true,
        };
      },
    },
  );

  assert.equal(calls.length, 2);
  assert.equal(Boolean(calls[0].allowStale), false);
  assert.equal(calls[1].allowStale, true);
  assert.equal(quote.source, 'chainlink-stale-fallback');
  assert.equal(quote.feeWei, 456n);
  assert.equal(quote.stale, true);
});

test('resolvePermitFeeQuote still throws non-stale quote errors', async () => {
  await assert.rejects(
    () => resolvePermitFeeQuote(
      { rpcUrl: 'https://example.invalid', usdCents: 100 },
      {
        async getQuote() {
          throw new Error('RPC exploded');
        },
      },
    ),
    /RPC exploded/,
  );
});

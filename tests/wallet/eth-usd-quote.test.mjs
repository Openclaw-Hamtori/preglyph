import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CHAINLINK_ETH_USD_FEED,
  DEFAULT_FEE_QUOTE_TTL_SECONDS,
  assertChainlinkPriceFresh,
  assertChainlinkRoundComplete,
  convertUsdCentsToWei,
  parseChainlinkAnswerToPrice,
  resolveChainlinkFeedAddress,
} from '../../lib/eth-usd-quote.mjs';

test('DEFAULT_FEE_QUOTE_TTL_SECONDS stays short-lived', () => {
  assert.equal(DEFAULT_FEE_QUOTE_TTL_SECONDS, 300);
});

test('parseChainlinkAnswerToPrice normalizes 8-decimal ETH/USD answers', () => {
  assert.equal(parseChainlinkAnswerToPrice({ answer: 200000000000n, decimals: 8 }), 2000);
});

test('convertUsdCentsToWei rounds up so the quote never undercharges', () => {
  assert.equal(convertUsdCentsToWei({ usdCents: 100, ethUsdPrice: 2000 }), 500000000000000n);
  assert.equal(convertUsdCentsToWei({ usdCents: 100, ethUsdPrice: 3333.33 }), 300000300000301n);
});

test('resolveChainlinkFeedAddress falls back to the canonical mainnet feed when config is blank', () => {
  assert.equal(resolveChainlinkFeedAddress(''), DEFAULT_CHAINLINK_ETH_USD_FEED);
});

test('assertChainlinkPriceFresh rejects stale Chainlink rounds', () => {
  assert.throws(
    () => assertChainlinkPriceFresh({ updatedAt: 100, now: 1000, maxAgeSeconds: 300 }),
    /stale/i,
  );
});

test('assertChainlinkRoundComplete rejects incomplete Chainlink rounds', () => {
  assert.throws(
    () => assertChainlinkRoundComplete({ roundId: 10n, answeredInRound: 9n }),
    /incomplete/i,
  );
});

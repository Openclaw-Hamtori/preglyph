import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_CHAINLINK_ETH_USD_FEED,
  DEFAULT_CHAINLINK_ETH_USD_FEED,
  DEFAULT_FEE_QUOTE_TTL_SECONDS,
  assertChainlinkPriceFresh,
  assertChainlinkRoundComplete,
  convertUsdCentsToWei,
  isChainlinkPriceStaleError,
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

test('resolveChainlinkFeedAddress returns the Sepolia feed when chainId is 11155111 and config is blank', () => {
  assert.equal(resolveChainlinkFeedAddress('', 11155111), '0x694AA1769357215DE4FAC081bf1f309aDC325306');
});

test('resolveChainlinkFeedAddress returns the Base feed when chainId is 8453 and config is blank', () => {
  assert.equal(resolveChainlinkFeedAddress('', 8453), BASE_CHAINLINK_ETH_USD_FEED);
});

test('assertChainlinkPriceFresh rejects stale Chainlink rounds', () => {
  assert.throws(
    () => assertChainlinkPriceFresh({ updatedAt: 100, now: 1000, maxAgeSeconds: 300 }),
    /stale/i,
  );
});

test('isChainlinkPriceStaleError recognizes the canonical stale error', () => {
  assert.equal(isChainlinkPriceStaleError(new Error('Chainlink ETH/USD feed is stale.')), true);
  assert.equal(isChainlinkPriceStaleError(new Error('something else')), false);
});

test('assertChainlinkRoundComplete rejects incomplete Chainlink rounds', () => {
  assert.throws(
    () => assertChainlinkRoundComplete({ roundId: 10n, answeredInRound: 9n }),
    /incomplete/i,
  );
});

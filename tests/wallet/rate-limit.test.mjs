import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryRateLimiter, getRateLimitKeyFromHeaders } from '../../lib/rate-limit.mjs';

test('memory rate limiter blocks requests after the configured limit within the same window', () => {
  const limiter = createMemoryRateLimiter({ windowMs: 60_000, limit: 2 });

  const first = limiter.consume({ key: 'ip:1', nowMs: 1_000 });
  const second = limiter.consume({ key: 'ip:1', nowMs: 2_000 });
  const third = limiter.consume({ key: 'ip:1', nowMs: 3_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.retryAfterSeconds, 58);
});

test('memory rate limiter resets usage after the window elapses', () => {
  const limiter = createMemoryRateLimiter({ windowMs: 60_000, limit: 1 });

  assert.equal(limiter.consume({ key: 'ip:2', nowMs: 1_000 }).allowed, true);
  assert.equal(limiter.consume({ key: 'ip:2', nowMs: 2_000 }).allowed, false);
  assert.equal(limiter.consume({ key: 'ip:2', nowMs: 61_001 }).allowed, true);
});

test('getRateLimitKeyFromHeaders prefers trusted forwarding headers when present', () => {
  const headers = new Headers({
    'cf-connecting-ip': '1.2.3.4',
    'x-forwarded-for': '5.6.7.8, 9.9.9.9',
  });

  assert.equal(getRateLimitKeyFromHeaders(headers), 'ip:1.2.3.4');
});

test('getRateLimitKeyFromHeaders ignores spoofable forwarded headers when no trusted proxy header is present', () => {
  const headers = new Headers({
    'x-forwarded-for': '5.6.7.8, 9.9.9.9',
    'user-agent': 'PreglyphTest/1.0',
    'accept-language': 'ko-KR',
    host: 'preglyph.com',
  });

  assert.equal(
    getRateLimitKeyFromHeaders(headers),
    'fingerprint:PreglyphTest/1.0|ko-KR|preglyph.com',
  );
});

test('getRateLimitKeyFromHeaders falls back to a request fingerprint instead of a global bucket', () => {
  const headers = new Headers({
    'user-agent': 'PreglyphTest/1.0',
    'accept-language': 'ko-KR',
    host: 'preglyph.com',
  });

  assert.equal(
    getRateLimitKeyFromHeaders(headers),
    'fingerprint:PreglyphTest/1.0|ko-KR|preglyph.com',
  );
});

export function getRateLimitKeyFromHeaders(headers) {
  const trustedIp = [
    headers?.get?.('cf-connecting-ip'),
    headers?.get?.('x-vercel-forwarded-for'),
  ]
    .map((value) => String(value || '').split(',')[0].trim())
    .find(Boolean);

  if (trustedIp) {
    return `ip:${trustedIp}`;
  }

  const userAgent = String(headers?.get?.('user-agent') || '').trim();
  const acceptLanguage = String(headers?.get?.('accept-language') || '').trim();
  const host = String(headers?.get?.('host') || '').trim();
  const fingerprint = [userAgent, acceptLanguage, host].filter(Boolean).join('|');

  return fingerprint ? `fingerprint:${fingerprint}` : 'global';
}

export function createMemoryRateLimiter({ windowMs, limit } = {}) {
  const entries = new Map();
  const normalizedWindowMs = Number(windowMs || 60_000);
  const normalizedLimit = Number(limit || 10);

  return {
    consume({ key, nowMs = Date.now() }) {
      const bucketKey = String(key || 'global');
      const existing = entries.get(bucketKey);
      const active = existing && nowMs < existing.resetAt
        ? existing
        : { count: 0, resetAt: nowMs + normalizedWindowMs };

      if (active.count >= normalizedLimit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((active.resetAt - nowMs) / 1000)),
        };
      }

      active.count += 1;
      entries.set(bucketKey, active);
      return {
        allowed: true,
        retryAfterSeconds: 0,
      };
    },
  };
}

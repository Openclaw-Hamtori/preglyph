import test from 'node:test';
import assert from 'node:assert/strict';

function applyEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = String(value);
  }
}

test('getServerRuntimeConfig exposes fee treasury and fee policy', async () => {
  const previous = {
    PREGLYPH_FEE_USD_CENTS: process.env.PREGLYPH_FEE_USD_CENTS,
    PREGLYPH_FEE_TREASURY_ADDRESS: process.env.PREGLYPH_FEE_TREASURY_ADDRESS,
    PREGLYPH_FEE_QUOTE_TTL_SECONDS: process.env.PREGLYPH_FEE_QUOTE_TTL_SECONDS,
  };

  applyEnv({
    PREGLYPH_FEE_USD_CENTS: '100',
    PREGLYPH_FEE_TREASURY_ADDRESS: '0x3B0Bca0c5921c9F416093DCa8D7713b2508ad49A',
    PREGLYPH_FEE_QUOTE_TTL_SECONDS: '180',
  });

  try {
    const mod = await import(`../../lib/config.js?test=${Date.now()}`);
    const config = mod.getServerRuntimeConfig();
    assert.equal(config.feeUsdCents, 100);
    assert.equal(config.feeTreasuryAddress, '0x3B0Bca0c5921c9F416093DCa8D7713b2508ad49A');
    assert.equal(config.feeQuoteTtlSeconds, 180);
  } finally {
    applyEnv(previous);
  }
});

test('getPublicRuntimeConfig exposes fee display state without secrets', async () => {
  const previous = {
    PREGLYPH_FEE_USD_CENTS: process.env.PREGLYPH_FEE_USD_CENTS,
    PREGLYPH_FEE_TREASURY_ADDRESS: process.env.PREGLYPH_FEE_TREASURY_ADDRESS,
    PREGLYPH_ADMIN_PRIVATE_KEY: process.env.PREGLYPH_ADMIN_PRIVATE_KEY,
  };

  applyEnv({
    PREGLYPH_FEE_USD_CENTS: '100',
    PREGLYPH_FEE_TREASURY_ADDRESS: '0x3B0Bca0c5921c9F416093DCa8D7713b2508ad49A',
    PREGLYPH_ADMIN_PRIVATE_KEY: '0xabc123',
  });

  try {
    const mod = await import(`../../lib/config.js?test=${Date.now()}`);
    const config = mod.getPublicRuntimeConfig();
    assert.equal(config.feeEnabled, true);
    assert.equal(config.feeDisplayUsd, '$1.00');
    assert.equal('adminPrivateKey' in config, false);
  } finally {
    applyEnv(previous);
  }
});

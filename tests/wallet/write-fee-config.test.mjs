import test from 'node:test';
import assert from 'node:assert/strict';

function applyEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = String(value);
  }
}

function importFreshConfigModule() {
  return import(`../../lib/config.js?test=${Date.now()}-${Math.random()}`);
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
    const mod = await importFreshConfigModule();
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
    const mod = await importFreshConfigModule();
    const config = mod.getPublicRuntimeConfig();
    assert.equal(config.feeEnabled, true);
    assert.equal(config.feeDisplayUsd, '$1.00');
    assert.equal('adminPrivateKey' in config, false);
  } finally {
    applyEnv(previous);
  }
});

test('getPublicRuntimeConfig infers Base chain name and Basescan explorer for chainId 8453', async () => {
  const previous = {
    NEXT_PUBLIC_PREGLYPH_CHAIN_ID: process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID,
    NEXT_PUBLIC_PREGLYPH_CHAIN_NAME: process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_NAME,
    NEXT_PUBLIC_PREGLYPH_EXPLORER_BASE_URL: process.env.NEXT_PUBLIC_PREGLYPH_EXPLORER_BASE_URL,
  };

  applyEnv({
    NEXT_PUBLIC_PREGLYPH_CHAIN_ID: '8453',
    NEXT_PUBLIC_PREGLYPH_CHAIN_NAME: '',
    NEXT_PUBLIC_PREGLYPH_EXPLORER_BASE_URL: '',
  });

  try {
    const mod = await importFreshConfigModule();
    const config = mod.getPublicRuntimeConfig();
    assert.equal(config.chainName, 'Base');
    assert.equal(config.explorerBaseUrl, 'https://basescan.org/tx/');
  } finally {
    applyEnv(previous);
  }
});

test('getServerRuntimeConfig prefers server-only chain and contract env over NEXT_PUBLIC values', async () => {
  const previous = {
    NEXT_PUBLIC_PREGLYPH_CHAIN_ID: process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID,
    PREGLYPH_CHAIN_ID: process.env.PREGLYPH_CHAIN_ID,
    NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS,
    PREGLYPH_CONTRACT_ADDRESS: process.env.PREGLYPH_CONTRACT_ADDRESS,
  };

  applyEnv({
    NEXT_PUBLIC_PREGLYPH_CHAIN_ID: '11155111',
    PREGLYPH_CHAIN_ID: '1',
    NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
    PREGLYPH_CONTRACT_ADDRESS: '0x2222222222222222222222222222222222222222',
  });

  try {
    const mod = await importFreshConfigModule();
    const config = mod.getServerRuntimeConfig();
    assert.equal(config.chainId, 1);
    assert.equal(config.contractAddress, '0x2222222222222222222222222222222222222222');
  } finally {
    applyEnv(previous);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadHardhatConfigWithEnv(env) {
  const configPath = path.join(process.cwd(), 'hardhat.config.js');
  const source = fs.readFileSync(configPath, 'utf8');
  const module = { exports: {} };
  const dotenvCalls = [];

  const sandbox = {
    process: {
      env: {
        ...process.env,
        ...env,
      },
    },
    module,
    exports: module.exports,
    require(specifier) {
      if (specifier === '@nomicfoundation/hardhat-toolbox') return {};
      if (specifier === 'dotenv') {
        return {
          config(options = {}) {
            dotenvCalls.push(options);
            return {};
          },
        };
      }
      throw new Error(`Unexpected require: ${specifier}`);
    },
  };

  vm.runInNewContext(source, sandbox, { filename: configPath });
  return { config: module.exports, dotenvCalls };
}

test('hardhat config uses PREGLYPH_ADMIN_PRIVATE_KEY for sepolia accounts', () => {
  const { config } = loadHardhatConfigWithEnv({
    SEPOLIA_RPC_URL: 'https://example-sepolia-rpc.invalid',
    PREGLYPH_ADMIN_PRIVATE_KEY: '0x' + '11'.repeat(32),
    PRIVATE_KEY: '',
  });

  assert.deepEqual(Array.from(config.networks.sepolia.accounts), ['0x' + '11'.repeat(32)]);
  assert.equal(config.networks.sepolia.chainId, 11155111);
});

test('hardhat config exposes a Base network when Base chain env points MAINNET_RPC_URL at Base', () => {
  const key = '0x' + '33'.repeat(32);
  const { config } = loadHardhatConfigWithEnv({
    MAINNET_RPC_URL: 'https://example-base-rpc.invalid',
    PREGLYPH_CHAIN_ID: '8453',
    PREGLYPH_ADMIN_PRIVATE_KEY: key,
  });

  assert.equal(config.networks.base.url, 'https://example-base-rpc.invalid');
  assert.deepEqual(Array.from(config.networks.base.accounts), [key]);
  assert.equal(config.networks.base.chainId, 8453);
  assert.equal('mainnet' in config.networks, false);
});

test('hardhat config loads both .env.local and .env', () => {
  const { dotenvCalls } = loadHardhatConfigWithEnv({});

  assert.deepEqual(JSON.parse(JSON.stringify(dotenvCalls)), [
    { path: '.env.local' },
    { path: '.env' },
  ]);
});

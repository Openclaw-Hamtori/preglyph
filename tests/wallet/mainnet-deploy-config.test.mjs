import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadHardhatConfigWithEnv(env) {
  const configPath = path.join(process.cwd(), 'hardhat.config.js');
  const source = fs.readFileSync(configPath, 'utf8');
  const module = { exports: {} };

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
      if (specifier === 'dotenv') return { config() { return {}; } };
      throw new Error(`Unexpected require: ${specifier}`);
    },
  };

  vm.runInNewContext(source, sandbox, { filename: configPath });
  return module.exports;
}

test('hardhat config exposes an Ethereum mainnet network when MAINNET_RPC_URL is configured for chainId 1', () => {
  const key = '0x' + '22'.repeat(32);
  const config = loadHardhatConfigWithEnv({
    MAINNET_RPC_URL: 'https://example-mainnet-rpc.invalid',
    PREGLYPH_CHAIN_ID: '1',
    PREGLYPH_ADMIN_PRIVATE_KEY: key,
  });

  assert.equal(config.networks.mainnet.url, 'https://example-mainnet-rpc.invalid');
  assert.deepEqual(Array.from(config.networks.mainnet.accounts), [key]);
  assert.equal(config.networks.mainnet.chainId, 1);
});

test('repo ships a dedicated deploy-mainnet script and npm entrypoint', async () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'scripts/deploy-mainnet.js')), true);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );

  assert.equal(
    packageJson.scripts['deploy:mainnet'],
    'hardhat run scripts/deploy-mainnet.js --network mainnet',
  );
});

test('repo ships a dedicated deploy-base script and npm entrypoint', async () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'scripts/deploy-base.js')), true);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );

  assert.equal(
    packageJson.scripts['deploy:base'],
    'hardhat run scripts/deploy-base.js --network base',
  );
});

async function runDeployScript({ scriptName, networkName, chainId, env }) {
  const scriptPath = path.join(process.cwd(), `scripts/${scriptName}`);
  const source = fs.readFileSync(scriptPath, 'utf8');
  const module = { exports: {} };
  let exitCode = null;
  let deployArgs = null;
  const errors = [];

  const sandbox = {
    process: {
      env: {
        ...process.env,
        ...env,
      },
      exit(code) {
        exitCode = code;
      },
    },
    console: {
      log() {},
      error(...args) {
        errors.push(args.map((value) => String(value)).join(' '));
      },
    },
    module,
    exports: module.exports,
    require(specifier) {
      if (specifier === 'hardhat') {
        return {
          ethers: {
            async getSigners() {
              return [{ address: '0xDeployer' }];
            },
            async getContractFactory() {
              return {
                async deploy(...args) {
                  deployArgs = args;
                  return {
                    deploymentTransaction() {
                      return null;
                    },
                    async waitForDeployment() {},
                    async getAddress() {
                      return '0xContract';
                    },
                  };
                },
              };
            },
            provider: {
              async getNetwork() {
                return { chainId: BigInt(chainId) };
              },
            },
          },
          network: { name: networkName },
        };
      }
      throw new Error(`Unexpected require: ${specifier}`);
    },
  };

  vm.runInNewContext(source, sandbox, { filename: scriptPath });
  await new Promise((resolve) => setTimeout(resolve, 0));

  return { exitCode, deployArgs, errors };
}

test('deploy-mainnet fails fast when treasury or permit signer env is missing', async () => {
  const treasuryMissing = await runDeployScript({
    scriptName: 'deploy-mainnet.js',
    networkName: 'mainnet',
    chainId: 1,
    env: {
      PREGLYPH_FEE_TREASURY_ADDRESS: '',
      PREGLYPH_PERMIT_SIGNER_ADDRESS: '0xPermitSigner',
    },
  });

  assert.equal(treasuryMissing.exitCode, 1);
  assert.equal(treasuryMissing.deployArgs, null);
  assert.match(treasuryMissing.errors.join('\n'), /PREGLYPH_FEE_TREASURY_ADDRESS/);

  const permitSignerMissing = await runDeployScript({
    scriptName: 'deploy-mainnet.js',
    networkName: 'mainnet',
    chainId: 1,
    env: {
      PREGLYPH_FEE_TREASURY_ADDRESS: '0xTreasury',
      PREGLYPH_PERMIT_SIGNER_ADDRESS: '',
    },
  });

  assert.equal(permitSignerMissing.exitCode, 1);
  assert.equal(permitSignerMissing.deployArgs, null);
  assert.match(permitSignerMissing.errors.join('\n'), /PREGLYPH_PERMIT_SIGNER_ADDRESS/);
});

test('deploy-base fails fast when treasury or permit signer env is missing', async () => {
  const treasuryMissing = await runDeployScript({
    scriptName: 'deploy-base.js',
    networkName: 'base',
    chainId: 8453,
    env: {
      PREGLYPH_FEE_TREASURY_ADDRESS: '',
      PREGLYPH_PERMIT_SIGNER_ADDRESS: '0xPermitSigner',
    },
  });

  assert.equal(treasuryMissing.exitCode, 1);
  assert.equal(treasuryMissing.deployArgs, null);
  assert.match(treasuryMissing.errors.join('\n'), /PREGLYPH_FEE_TREASURY_ADDRESS/);

  const permitSignerMissing = await runDeployScript({
    scriptName: 'deploy-base.js',
    networkName: 'base',
    chainId: 8453,
    env: {
      PREGLYPH_FEE_TREASURY_ADDRESS: '0xTreasury',
      PREGLYPH_PERMIT_SIGNER_ADDRESS: '',
    },
  });

  assert.equal(permitSignerMissing.exitCode, 1);
  assert.equal(permitSignerMissing.deployArgs, null);
  assert.match(permitSignerMissing.errors.join('\n'), /PREGLYPH_PERMIT_SIGNER_ADDRESS/);
});

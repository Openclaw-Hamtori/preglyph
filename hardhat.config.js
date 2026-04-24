require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || '';
const configuredChainId = Number(process.env.PREGLYPH_CHAIN_ID || process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID || 0);
const baseRpcUrl = process.env.BASE_MAINNET_RPC_URL || ((configuredChainId === 8453 || configuredChainId === 0) ? (process.env.MAINNET_RPC_URL || '') : '');
const mainnetRpcUrl = process.env.ETH_MAINNET_RPC_URL || (configuredChainId === 1 ? (process.env.MAINNET_RPC_URL || '') : '');
const deployerKey = process.env.PREGLYPH_ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY || '';

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    ...(sepoliaRpcUrl && deployerKey
      ? {
          sepolia: {
            url: sepoliaRpcUrl,
            accounts: [deployerKey],
            chainId: 11155111,
          },
        }
      : {}),
    ...(mainnetRpcUrl && deployerKey
      ? {
          mainnet: {
            url: mainnetRpcUrl,
            accounts: [deployerKey],
            chainId: 1,
          },
        }
      : {}),
    ...(baseRpcUrl && deployerKey
      ? {
          base: {
            url: baseRpcUrl,
            accounts: [deployerKey],
            chainId: 8453,
          },
        }
      : {}),
  },
};

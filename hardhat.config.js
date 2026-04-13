require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || '';
const deployerKey = process.env.PREGlyph_ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY || '';

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
  },
};

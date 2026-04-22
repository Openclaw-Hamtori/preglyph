const LOCAL_CHAIN_ID = Number(process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID || process.env.PREGLYPH_CHAIN_ID || 31337);
const LOCAL_RPC_URL = process.env.PREGLYPH_RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS || process.env.PREGLYPH_CONTRACT_ADDRESS || '';
const ADMIN_PRIVATE_KEY = process.env.PREGLYPH_ADMIN_PRIVATE_KEY || '';
const DEPLOY_BLOCK = Number(process.env.PREGLYPH_DEPLOY_BLOCK || 0);
const PRESENCE_SERVICE_ID = process.env.PREGLYPH_PRESENCE_SERVICE_ID || 'noctu';
const PRESENCE_FLOW_TYPE = process.env.PREGLYPH_PRESENCE_FLOW_TYPE || 'verify';
const PRESENCE_ENDPOINT_REF = process.env.PREGLYPH_PRESENCE_ENDPOINT_REF || 'verify-proof';
const PRESENCE_AUTH_CONTEXT = process.env.PREGLYPH_PRESENCE_AUTH_CONTEXT || 'service-auth-context';
const PRESENCE_SEEDS_JSON = process.env.PREGLYPH_PRESENCE_SEEDS_JSON || '';

function parseLegacyContracts(raw = process.env.PREGLYPH_LEGACY_CONTRACTS || '') {
  return String(raw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [address, deployBlockText] = entry.split('@').map((part) => part.trim());
      return {
        address,
        deployBlock: Number(deployBlockText || 0),
      };
    })
    .filter((entry) => entry.address);
}

const LEGACY_CONTRACTS = parseLegacyContracts();

export function getPublicRuntimeConfig() {
  return {
    chainId: LOCAL_CHAIN_ID,
    rpcUrl: process.env.NEXT_PUBLIC_PREGLYPH_RPC_HTTP_URL || LOCAL_RPC_URL,
    contractAddress: CONTRACT_ADDRESS,
    chainName: process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_NAME || (LOCAL_CHAIN_ID === 11155111 ? 'Sepolia' : 'Preglyph Testchain'),
    currencySymbol: process.env.NEXT_PUBLIC_PREGLYPH_CURRENCY_SYMBOL || 'ETH',
    explorerBaseUrl:
      process.env.NEXT_PUBLIC_PREGLYPH_EXPLORER_BASE_URL ||
      (LOCAL_CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/tx/' : ''),
  };
}

export function getServerRuntimeConfig() {
  return {
    chainId: LOCAL_CHAIN_ID,
    rpcUrl: LOCAL_RPC_URL,
    contractAddress: CONTRACT_ADDRESS,
    adminPrivateKey: ADMIN_PRIVATE_KEY,
    deployBlock: DEPLOY_BLOCK,
    legacyContracts: LEGACY_CONTRACTS,
    presenceServiceId: PRESENCE_SERVICE_ID,
    presenceFlowType: PRESENCE_FLOW_TYPE,
    presenceEndpointRef: PRESENCE_ENDPOINT_REF,
    presenceAuthContext: PRESENCE_AUTH_CONTEXT,
    presenceSeedsJson: PRESENCE_SEEDS_JSON,
  };
}

export function assertContractConfigured() {
  const config = getServerRuntimeConfig();
  if (!config.contractAddress) {
    throw new Error('Missing PREGLYPH contract address. Run the local deploy script or set env vars first.');
  }
  return config;
}

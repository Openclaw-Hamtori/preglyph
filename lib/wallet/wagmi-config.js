import { createConfig, createStorage, http, injected, noopStorage } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID || 31337);
const TARGET_CHAIN_NAME = process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_NAME || 'Preglyph Testchain';
const TARGET_RPC_URL = process.env.NEXT_PUBLIC_PREGLYPH_RPC_HTTP_URL || 'http://127.0.0.1:8545';
const TARGET_CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_PREGLYPH_CURRENCY_SYMBOL || 'ETH';

function buildTargetChain() {
  if (TARGET_CHAIN_ID === mainnet.id) return mainnet;
  if (TARGET_CHAIN_ID === sepolia.id) return sepolia;

  return {
    id: TARGET_CHAIN_ID,
    name: TARGET_CHAIN_NAME,
    nativeCurrency: {
      name: 'Ether',
      symbol: TARGET_CURRENCY_SYMBOL,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [TARGET_RPC_URL] },
      public: { http: [TARGET_RPC_URL] },
    },
    blockExplorers: {
      default: { name: TARGET_CHAIN_NAME, url: TARGET_RPC_URL },
    },
    testnet: TARGET_CHAIN_ID !== mainnet.id,
  };
}

export const preglyphTargetChain = buildTargetChain();
export const wagmiChains = [mainnet, preglyphTargetChain].filter(
  (chain, index, chains) => chains.findIndex((candidate) => candidate.id === chain.id) === index,
);

export const wagmiConfig = createConfig({
  chains: wagmiChains,
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  multiInjectedProviderDiscovery: true,
  ssr: false,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
  transports: Object.fromEntries(
    wagmiChains.map((chain) => {
      const rpcUrl = chain.id === preglyphTargetChain.id ? TARGET_RPC_URL : chain.rpcUrls.default.http[0];
      return [chain.id, http(rpcUrl)];
    }),
  ),
});

import { JsonRpcProvider } from 'ethers';

export function createRpcProviderCache({ createProvider = (rpcUrl) => new JsonRpcProvider(rpcUrl) } = {}) {
  const providers = new Map();

  return {
    get(rpcUrl) {
      const key = String(rpcUrl || '').trim();
      if (!key) {
        throw new Error('RPC URL is required.');
      }
      if (!providers.has(key)) {
        providers.set(key, createProvider(key));
      }
      return providers.get(key);
    },
  };
}

const sharedRpcProviderCache = createRpcProviderCache();

export function getSharedRpcProvider(rpcUrl) {
  return sharedRpcProviderCache.get(rpcUrl);
}

export const METAMASK_CONNECTOR_ID = 'metamask';
export const LAST_CONNECTOR_KEY = 'preglyph:last-connector';
export const LAST_CONNECTED_ADDRESS_KEY = 'preglyph:last-connected-address';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMemoryStorage() {
  const state = new Map();
  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    },
  };
}

export function getStorage(storageLike) {
  if (storageLike) return storageLike;
  if (typeof window === 'undefined') return null;
  return window.localStorage || null;
}

export function readRememberedSession(storageLike) {
  const storage = getStorage(storageLike);
  if (!storage) return { connector: '', address: '' };

  return {
    connector: storage.getItem(LAST_CONNECTOR_KEY) || '',
    address: storage.getItem(LAST_CONNECTED_ADDRESS_KEY) || '',
  };
}

export function rememberConnectedWallet(storageLike, address) {
  const storage = getStorage(storageLike);
  if (!storage || !address) return;

  storage.setItem(LAST_CONNECTOR_KEY, METAMASK_CONNECTOR_ID);
  storage.setItem(LAST_CONNECTED_ADDRESS_KEY, address);
}

export function clearRememberedWallet(storageLike) {
  const storage = getStorage(storageLike);
  if (!storage) return;

  storage.removeItem(LAST_CONNECTOR_KEY);
  storage.removeItem(LAST_CONNECTED_ADDRESS_KEY);
}

export function shouldRestoreRememberedSession(rememberedSession) {
  return rememberedSession?.connector === METAMASK_CONNECTOR_ID && Boolean(rememberedSession?.address);
}

export function resolveMetaMaskProvider(injected = typeof window === 'undefined' ? null : window.ethereum) {
  if (!injected) return null;

  const providers = Array.isArray(injected.providers) && injected.providers.length ? injected.providers : [injected];

  const byRdns = providers.find((provider) => provider?.providerInfo?.rdns === 'io.metamask');
  if (byRdns) return byRdns;

  return (
    providers.find(
      (provider) =>
        provider?.isMetaMask &&
        !provider?.isAvalanche &&
        !provider?.isBraveWallet &&
        !provider?.isCoinbaseWallet &&
        !provider?.isOkxWallet &&
        !provider?.isOKExWallet &&
        !provider?.isOKXWallet &&
        !provider?.isRabby &&
        !provider?.isTokenPocket &&
        !provider?.isTrust,
    ) || null
  );
}

export function isProbablyMobile(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '') {
  return /Android|iPhone|iPad|iPod/i.test(userAgent || '');
}

export function openMetaMaskInstall({ windowObject = typeof window === 'undefined' ? null : window, dappUrl = 'preglyph.com' } = {}) {
  if (!windowObject) return;

  if (isProbablyMobile(windowObject?.navigator?.userAgent || '')) {
    windowObject.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
    return;
  }

  windowObject.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
}

export function isTransientMetaMaskStartupError(error) {
  return error?.code === -32603;
}

export async function requestWithRetry(provider, method, { attempts = 3, delayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await provider.request({ method });
    } catch (error) {
      lastError = error;
      if (!isTransientMetaMaskStartupError(error) || attempt === attempts) {
        throw error;
      }
      await delay(delayMs * attempt);
    }
  }

  throw lastError;
}

export async function waitForMetaMaskProvider({
  windowObject = typeof window === 'undefined' ? null : window,
  timeoutMs = 1200,
  getProvider = resolveMetaMaskProvider,
} = {}) {
  const existingProvider = getProvider(windowObject?.ethereum);
  if (existingProvider) return existingProvider;
  if (!windowObject) return null;

  return await new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      windowObject.removeEventListener('ethereum#initialized', handleInitialized);
      if (timeoutId) clearTimeout(timeoutId);
      resolve(getProvider(windowObject.ethereum));
    };

    const handleInitialized = () => finish();

    windowObject.addEventListener('ethereum#initialized', handleInitialized, { once: true });
    timeoutId = setTimeout(finish, timeoutMs);
  });
}

export function extractMetaMaskErrorDetail(error) {
  const originalError = error?.data?.originalError;
  const nestedMessage = originalError?.message || error?.data?.message || error?.message || 'Unexpected error';
  const nestedCode = originalError?.code ?? error?.data?.code ?? error?.code ?? '';
  let detail = '';

  try {
    detail = originalError ? JSON.stringify(originalError) : error?.data ? JSON.stringify(error.data) : '';
  } catch {
    detail = originalError?.message || error?.data?.message || '';
  }

  return {
    code: String(nestedCode || ''),
    message: nestedMessage,
    detail,
  };
}

export function formatDebugValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return JSON.stringify(value);
  }
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function readProviderSnapshot(provider) {
  let isConnected = 'n/a';
  if (typeof provider?.isConnected === 'function') {
    try {
      isConnected = provider.isConnected();
    } catch (error) {
      isConnected = `error:${error?.code || error?.message || 'unknown'}`;
    }
  }

  return {
    selectedAddress: provider?.selectedAddress || '',
    chainId: provider?.chainId || '',
    isConnected,
    hasMetaMaskApi: typeof provider?._metamask?.isUnlocked === 'function',
  };
}

export function formatProviderSnapshot(snapshot = {}) {
  return [
    `selected=${snapshot.selectedAddress || '—'}`,
    `chain=${snapshot.chainId || '—'}`,
    `connected=${formatDebugValue(snapshot.isConnected)}`,
    `metamaskApi=${snapshot.hasMetaMaskApi ? 'yes' : 'no'}`,
  ].join(' · ');
}

export function getPassiveRetryCount(reason = '') {
  const match = String(reason).match(/^retry:(\d+):/);
  return match ? Number(match[1]) : 0;
}

export async function restoreMetaMaskSession(provider) {
  const accounts = await provider.request({ method: 'eth_accounts' });
  return {
    accounts: accounts || [],
    address: accounts?.[0] || '',
  };
}

export async function connectMetaMask(
  provider,
  {
    waitAfterPreflightError = () => delay(450),
    requestAuthorizedAccounts = async () => await requestWithRetry(provider, 'eth_accounts', { attempts: 1, delayMs: 250 }),
    requestInteractiveAccounts = async () => await provider.request({ method: 'eth_requestAccounts' }),
  } = {},
) {
  let existingAccounts = [];
  let hadTransientPreflightError = false;

  try {
    existingAccounts = await requestAuthorizedAccounts();
  } catch (error) {
    if (!isTransientMetaMaskStartupError(error)) {
      throw error;
    }
    hadTransientPreflightError = true;
  }

  if (!hadTransientPreflightError && existingAccounts?.[0]) {
    return {
      accounts: existingAccounts,
      address: existingAccounts[0],
      reusedExisting: true,
      hadTransientPreflightError: false,
    };
  }

  if (hadTransientPreflightError) {
    await waitAfterPreflightError();
  }

  const accounts = await requestInteractiveAccounts();
  return {
    accounts: accounts || [],
    address: accounts?.[0] || '',
    reusedExisting: false,
    hadTransientPreflightError,
  };
}

export function subscribeMetaMaskProvider(provider, { onAccountsChanged, onChainChanged } = {}) {
  provider?.on?.('accountsChanged', onAccountsChanged);
  provider?.on?.('chainChanged', onChainChanged);

  return () => {
    provider?.removeListener?.('accountsChanged', onAccountsChanged);
    provider?.removeListener?.('chainChanged', onChainChanged);
  };
}

export async function ensureWalletOnExpectedChain({
  browserProvider,
  metamaskProvider,
  chainId,
  chainName,
  rpcUrl,
  currencySymbol,
}) {
  const networkInfo = await browserProvider.getNetwork();
  if (Number(networkInfo.chainId) === chainId) return;

  const chainHex = `0x${chainId.toString(16)}`;
  try {
    await metamaskProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await metamaskProvider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chainHex,
          chainName,
          rpcUrls: [rpcUrl],
          nativeCurrency: {
            name: 'Ether',
            symbol: currencySymbol,
            decimals: 18,
          },
        },
      ],
    });
  }
}

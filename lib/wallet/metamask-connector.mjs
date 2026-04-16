export const METAMASK_CONNECTOR_ID = 'metamask';
export const LAST_CONNECTOR_KEY = 'preglyph:last-connector';
export const LAST_CONNECTED_ADDRESS_KEY = 'preglyph:last-connected-address';

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

function isPreferredMetaMaskProvider(provider) {
  return Boolean(
    provider && (
      provider?.providerInfo?.rdns === 'io.metamask' || (
        provider?.isMetaMask &&
        !provider?.isAvalanche &&
        !provider?.isBraveWallet &&
        !provider?.isCoinbaseWallet &&
        !provider?.isOkxWallet &&
        !provider?.isOKExWallet &&
        !provider?.isOKXWallet &&
        !provider?.isRabby &&
        !provider?.isTokenPocket &&
        !provider?.isTrust
      )
    )
  );
}

function createDelegatingProvider(provider, onHandler) {
  return Object.assign(Object.create(provider), {
    request: provider.request.bind(provider),
    on: onHandler,
    removeListener: typeof provider.removeListener === 'function'
      ? provider.removeListener.bind(provider)
      : typeof provider.off === 'function'
        ? provider.off.bind(provider)
        : () => {},
  });
}

function normalizeEip1193Provider(provider) {
  if (!provider || typeof provider.request !== 'function') return null;

  if (typeof provider.on === 'function') {
    if (typeof provider.removeListener === 'function') return provider;
    return createDelegatingProvider(provider, provider.on.bind(provider));
  }

  if (typeof provider.addListener === 'function') {
    return createDelegatingProvider(provider, provider.addListener.bind(provider));
  }

  return null;
}

function isUsableEip1193Provider(provider) {
  return Boolean(normalizeEip1193Provider(provider));
}

export function resolveMetaMaskProvider(injected = typeof window === 'undefined' ? null : window.ethereum) {
  if (!injected) return null;

  if (isPreferredMetaMaskProvider(injected)) {
    const normalizedProvider = normalizeEip1193Provider(injected);
    if (normalizedProvider) return normalizedProvider;
  }

  const providers = Array.isArray(injected.providers) && injected.providers.length ? injected.providers : [injected];

  const byRdns = providers.find((provider) => provider?.providerInfo?.rdns === 'io.metamask' && isUsableEip1193Provider(provider));
  if (byRdns) return normalizeEip1193Provider(byRdns);

  const preferredProvider = providers.find((provider) => isPreferredMetaMaskProvider(provider) && isUsableEip1193Provider(provider));
  return preferredProvider ? normalizeEip1193Provider(preferredProvider) : null;
}

export function isProbablyMobile(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '') {
  return /Android|iPhone|iPad|iPod/i.test(userAgent || '');
}

export function getRestoreProbeDelayMs({ mobile = false } = {}) {
  return mobile ? 3200 : 2500;
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

export function stripPassiveRetryPrefixes(reason = '') {
  return String(reason).replace(/^(?:retry:\d+:)+/, '');
}

export async function restoreMetaMaskSession(provider) {
  const accounts = await provider.request({ method: 'eth_accounts' });
  return {
    accounts: accounts || [],
    address: accounts?.[0] || '',
  };
}

export async function getMetaMaskUnlockState(provider) {
  if (typeof provider?._metamask?.isUnlocked !== 'function') {
    return null;
  }

  try {
    return await provider._metamask.isUnlocked();
  } catch {
    return null;
  }
}

export async function connectMetaMask(provider, { requestInteractiveAccounts } = {}) {
  const accounts = requestInteractiveAccounts
    ? await requestInteractiveAccounts()
    : await provider.request({ method: 'eth_requestAccounts' });

  return {
    accounts: accounts || [],
    address: accounts?.[0] || '',
    reusedExisting: false,
  };
}

export function subscribeMetaMaskProvider(provider, { onAccountsChanged, onChainChanged, onConnect } = {}) {
  provider?.on?.('accountsChanged', onAccountsChanged);
  provider?.on?.('chainChanged', onChainChanged);
  provider?.on?.('connect', onConnect);

  return () => {
    provider?.removeListener?.('accountsChanged', onAccountsChanged);
    provider?.removeListener?.('chainChanged', onChainChanged);
    provider?.removeListener?.('connect', onConnect);
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

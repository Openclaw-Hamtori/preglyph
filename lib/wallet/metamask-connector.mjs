function isPreferredMetaMaskProvider(provider) {
  if (!provider) return false;
  if (provider?.providerInfo?.rdns === 'io.metamask') return true;
  if (!provider?.isMetaMask) return false;

  // Match wagmi's MetaMask connector behavior here.
  if (provider?.isBraveWallet && !provider?._events && !provider?._state) {
    return false;
  }

  return !(
    provider?.isApexWallet ||
    provider?.isAvalanche ||
    provider?.isBitKeep ||
    provider?.isBlockWallet ||
    provider?.isKuCoinWallet ||
    provider?.isMathWallet ||
    provider?.isOkxWallet ||
    provider?.isOKExWallet ||
    provider?.isOKXWallet ||
    provider?.isOneInchIOSWallet ||
    provider?.isOneInchAndroidWallet ||
    provider?.isOpera ||
    provider?.isPhantom ||
    provider?.isPortal ||
    provider?.isRabby ||
    provider?.isTokenPocket ||
    provider?.isTokenary ||
    provider?.isUniswapWallet ||
    provider?.isZerion
  );
}

export function shouldDeferNoProviderDisconnect({
  connectionAddress = '',
  walletAddress = '',
  hasActiveProvider = false,
} = {}) {
  return Boolean(hasActiveProvider || connectionAddress || walletAddress);
}

export function resolveReconnectProvider({ detectedProvider = null, cachedProvider = null } = {}) {
  return detectedProvider || cachedProvider || null;
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

export function openMetaMaskInstall({
  windowObject = typeof window === 'undefined' ? null : window,
  dappUrl = typeof window !== 'undefined' ? window.location.host : 'preglyph.com',
} = {}) {
  if (!windowObject) return;

  if (isProbablyMobile(windowObject?.navigator?.userAgent || '')) {
    windowObject.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
    return;
  }

  windowObject.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
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

export async function ensureWalletOnExpectedChain({
  metamaskProvider,
  chainId,
  chainName,
  rpcUrl,
  currencySymbol,
}) {
  const currentChainId = await metamaskProvider.request({ method: 'eth_chainId' }).catch(() => '');
  if (Number(currentChainId) === chainId) return;

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

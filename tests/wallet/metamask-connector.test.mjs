import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAuthorizedAccounts,
  getMetaMaskUnlockState,
  openMetaMaskInstall,
  resolveMetaMaskProvider,
  resolveReconnectProvider,
  shouldDeferNoProviderDisconnect,
  waitForMetaMaskProvider,
} from '../../lib/wallet/metamask-connector.mjs';

test('getMetaMaskUnlockState returns null when the private MetaMask API is unavailable', async () => {
  const provider = {
    request: async () => [],
  };

  assert.equal(await getMetaMaskUnlockState(provider), null);
});

test('getMetaMaskUnlockState reads the private MetaMask unlock signal when available', async () => {
  const provider = {
    _metamask: {
      isUnlocked: async () => false,
    },
  };

  assert.equal(await getMetaMaskUnlockState(provider), false);
});

test('getAuthorizedAccounts returns eth_accounts when available and swallows transient errors', async () => {
  const okProvider = {
    request: async ({ method }) => (method === 'eth_accounts' ? ['0xabc'] : []),
  };
  const failingProvider = {
    request: async () => {
      throw new Error('transient');
    },
  };

  assert.deepEqual(await getAuthorizedAccounts(okProvider), ['0xabc']);
  assert.deepEqual(await getAuthorizedAccounts(failingProvider), []);
  assert.deepEqual(await getAuthorizedAccounts(null), []);
});

test('waitForMetaMaskProvider returns an already-detected provider immediately', async () => {
  const provider = {
    isMetaMask: true,
    request: async () => [],
    on: () => {},
    removeListener: () => {},
  };
  const windowObject = { ethereum: provider };

  assert.equal(await waitForMetaMaskProvider({ windowObject, timeoutMs: 1 }), provider);
});

test('waitForMetaMaskProvider performs one delayed retry so late MetaMask injection can still restore a remembered session', async () => {
  const provider = {
    isMetaMask: true,
    request: async () => [],
    on: () => {},
    removeListener: () => {},
  };
  const listeners = new Map();
  const windowObject = {
    ethereum: null,
    addEventListener(eventName, handler) {
      listeners.set(eventName, handler);
    },
    removeEventListener(eventName) {
      listeners.delete(eventName);
    },
  };

  setTimeout(() => {
    windowObject.ethereum = provider;
  }, 20);

  const resolved = await waitForMetaMaskProvider({
    windowObject,
    timeoutMs: 5,
    retryTimeoutMs: 30,
  });

  assert.equal(resolved, provider);
});

test('openMetaMaskInstall derives the dapp host dynamically for mobile deep links', () => {
  const windowObject = {
    navigator: { userAgent: 'iPhone' },
    location: { href: '', host: 'example.org' },
  };

  openMetaMaskInstall({ windowObject, dappUrl: 'example.org' });
  assert.equal(windowObject.location.href, 'https://metamask.app.link/dapp/example.org');
});

test('shouldDeferNoProviderDisconnect keeps an already-restored wallet session from being overwritten by late no-provider probe results', () => {
  assert.equal(
    shouldDeferNoProviderDisconnect({
      connectionAddress: '0xabc',
      walletAddress: '',
      hasActiveProvider: false,
    }),
    true,
  );

  assert.equal(
    shouldDeferNoProviderDisconnect({
      connectionAddress: '',
      walletAddress: '0xdef',
      hasActiveProvider: false,
    }),
    true,
  );

  assert.equal(
    shouldDeferNoProviderDisconnect({
      connectionAddress: '',
      walletAddress: '',
      hasActiveProvider: false,
    }),
    false,
  );
});

test('resolveReconnectProvider reuses the cached MetaMask provider when fresh detection is temporarily unavailable', () => {
  const cachedProvider = {
    request: async () => [],
    on: () => {},
    removeListener: () => {},
    isMetaMask: true,
  };

  assert.equal(
    resolveReconnectProvider({ detectedProvider: null, cachedProvider }),
    cachedProvider,
  );
  assert.equal(resolveReconnectProvider({ detectedProvider: null, cachedProvider: null }), null);
});

test('resolveReconnectProvider normalizes a cached request-only MetaMask wrapper before reuse', () => {
  const cachedProvider = {
    isMetaMask: true,
    providerInfo: { rdns: 'io.metamask' },
    request: async () => [],
  };

  const resolved = resolveReconnectProvider({ detectedProvider: null, cachedProvider });

  assert.equal(typeof resolved?.request, 'function');
  assert.equal(typeof resolved?.on, 'function');
  assert.equal(typeof resolved?.removeListener, 'function');
});

test('resolveMetaMaskProvider prefers the top-level injected MetaMask provider when child providers are partial proxies', () => {
  const nestedMetaMaskProvider = {
    isMetaMask: true,
    _metamask: {
      isUnlocked: async () => true,
    },
  };
  const injected = {
    isMetaMask: true,
    isConnected: () => true,
    request: async () => [],
    on: () => {},
    providerInfo: { rdns: 'io.metamask' },
    _metamask: {
      isUnlocked: async () => true,
    },
    providers: [nestedMetaMaskProvider],
  };

  const resolved = resolveMetaMaskProvider(injected);
  assert.equal(resolved.providerInfo?.rdns, 'io.metamask');
  assert.equal(typeof resolved.request, 'function');
  assert.equal(typeof resolved.on, 'function');
  assert.equal(typeof resolved.removeListener, 'function');
  assert.equal(resolved.providers?.[0], nestedMetaMaskProvider);
});

test('resolveMetaMaskProvider ignores a top-level MetaMask wrapper without EIP-1193 events and falls back to a usable nested provider', () => {
  const nestedMetaMaskProvider = {
    isMetaMask: true,
    request: async () => [],
    on: () => {},
    providerInfo: { rdns: 'io.metamask' },
    _metamask: {
      isUnlocked: async () => true,
    },
  };
  const injected = {
    isMetaMask: true,
    providerInfo: { rdns: 'io.metamask' },
    _metamask: {
      isUnlocked: async () => true,
    },
    providers: [nestedMetaMaskProvider],
  };

  const resolved = resolveMetaMaskProvider(injected);
  assert.equal(resolved.providerInfo?.rdns, 'io.metamask');
  assert.equal(typeof resolved.request, 'function');
  assert.equal(typeof resolved.on, 'function');
  assert.equal(typeof resolved.removeListener, 'function');
});

test('resolveMetaMaskProvider upgrades MetaMask-style addListener/off providers into usable EIP-1193 providers', () => {
  const calls = [];
  let selectedAddress = '0x111';
  const nestedMetaMaskProvider = {
    isMetaMask: true,
    request: async () => [],
    addListener(eventName, handler) {
      calls.push(['addListener', eventName, handler]);
    },
    off(eventName, handler) {
      calls.push(['off', eventName, handler]);
    },
    providerInfo: { rdns: 'io.metamask' },
    _metamask: {
      isUnlocked: async () => true,
    },
  };
  Object.defineProperty(nestedMetaMaskProvider, 'selectedAddress', {
    configurable: true,
    get() {
      return selectedAddress;
    },
  });
  const injected = {
    providers: [nestedMetaMaskProvider],
  };

  const resolved = resolveMetaMaskProvider(injected);
  const handler = () => {};

  assert.notEqual(resolved, nestedMetaMaskProvider);
  assert.equal(typeof resolved.on, 'function');
  assert.equal(typeof resolved.removeListener, 'function');
  assert.equal(nestedMetaMaskProvider.on, undefined);
  assert.equal(nestedMetaMaskProvider.removeListener, undefined);
  assert.equal(resolved.selectedAddress, '0x111');

  selectedAddress = '0x222';
  assert.equal(resolved.selectedAddress, '0x222');

  resolved.on('accountsChanged', handler);
  resolved.removeListener('accountsChanged', handler);

  assert.deepEqual(calls, [
    ['addListener', 'accountsChanged', handler],
    ['off', 'accountsChanged', handler],
  ]);
});

test('resolveMetaMaskProvider accepts Brave-style MetaMask providers when MetaMask internals are present', () => {
  const provider = {
    isMetaMask: true,
    isBraveWallet: true,
    _events: {},
    _state: {},
    request: async () => [],
    on: () => {},
    removeListener: () => {},
  };

  const resolved = resolveMetaMaskProvider(provider);
  assert.equal(resolved, provider);
});

test('resolveMetaMaskProvider still finds MetaMask inside providers when top-level injected object is not MetaMask', () => {
  const nestedMetaMaskProvider = {
    isMetaMask: true,
    request: async () => [],
    on: () => {},
    providerInfo: { rdns: 'io.metamask' },
    isConnected: () => true,
  };
  const injected = {
    providers: [
      { isCoinbaseWallet: true },
      nestedMetaMaskProvider,
    ],
  };

  const resolved = resolveMetaMaskProvider(injected);
  assert.equal(resolved.providerInfo?.rdns, 'io.metamask');
  assert.equal(typeof resolved.request, 'function');
  assert.equal(typeof resolved.on, 'function');
  assert.equal(typeof resolved.removeListener, 'function');
  assert.equal(resolved.isConnected(), true);
});

test('resolveMetaMaskProvider prefers a nested event-capable MetaMask provider over a top-level request-only wrapper', () => {
  const nestedMetaMaskProvider = {
    isMetaMask: true,
    providerInfo: { rdns: 'io.metamask' },
    request: async () => [],
    on: () => {},
    removeListener: () => {},
  };
  const injected = {
    isMetaMask: true,
    providerInfo: { rdns: 'io.metamask' },
    request: async () => [],
    providers: [nestedMetaMaskProvider],
  };

  const resolved = resolveMetaMaskProvider(injected);
  assert.equal(resolved, nestedMetaMaskProvider);
});

test('resolveMetaMaskProvider keeps a request-capable MetaMask wrapper connectable even when listener methods are missing', () => {
  const provider = {
    isMetaMask: true,
    providerInfo: { rdns: 'io.metamask' },
    request: async () => [],
  };

  const resolved = resolveMetaMaskProvider(provider);
  assert.equal(typeof resolved?.request, 'function');
  assert.equal(typeof resolved?.on, 'function');
  assert.equal(typeof resolved?.removeListener, 'function');
});

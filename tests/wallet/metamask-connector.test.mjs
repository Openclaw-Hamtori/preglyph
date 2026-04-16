import test from 'node:test';
import assert from 'node:assert/strict';

import {
  METAMASK_CONNECTOR_ID,
  connectMetaMask,
  createMemoryStorage,
  getMetaMaskUnlockState,
  getRestoreProbeDelayMs,
  getPassiveRetryCount,
  readRememberedSession,
  resolveMetaMaskProvider,
  resolveReconnectProvider,
  rememberConnectedWallet,
  clearRememberedWallet,
  shouldRestoreRememberedSession,
  restoreMetaMaskSession,
  shouldDeferNoProviderDisconnect,
  stripPassiveRetryPrefixes,
  subscribeMetaMaskProvider,
} from '../../lib/wallet/metamask-connector.mjs';

test('remembered session helpers persist and clear the MetaMask connector state', () => {
  const storage = createMemoryStorage();

  assert.deepEqual(readRememberedSession(storage), { connector: '', address: '' });

  rememberConnectedWallet(storage, '0xabc');
  assert.deepEqual(readRememberedSession(storage), {
    connector: METAMASK_CONNECTOR_ID,
    address: '0xabc',
  });
  assert.equal(shouldRestoreRememberedSession(readRememberedSession(storage)), true);

  clearRememberedWallet(storage);
  assert.deepEqual(readRememberedSession(storage), { connector: '', address: '' });
  assert.equal(shouldRestoreRememberedSession(readRememberedSession(storage)), false);
});

test('stripPassiveRetryPrefixes normalizes nested retry reasons', () => {
  assert.equal(getPassiveRetryCount('retry:2:retry:1:restore:remembered'), 2);
  assert.equal(stripPassiveRetryPrefixes('retry:2:retry:1:restore:remembered'), 'restore:remembered');
  assert.equal(stripPassiveRetryPrefixes('restore:remembered'), 'restore:remembered');
});

test('restoreMetaMaskSession uses eth_accounts and returns the authorized address', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return ['0x123'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await restoreMetaMaskSession(provider);

  assert.deepEqual(calls, ['eth_accounts']);
  assert.deepEqual(result, {
    accounts: ['0x123'],
    address: '0x123',
  });
});

test('restoreMetaMaskSession issues exactly one eth_accounts request and surfaces persistent failure', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  await assert.rejects(
    restoreMetaMaskSession(provider),
    (error) => error?.code === -32603,
  );

  assert.deepEqual(calls, ['eth_accounts']);
});

test('connectMetaMask performs one interactive request without preflight or fallback polling', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_requestAccounts') {
        return ['0xbbb'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider);

  assert.deepEqual(calls, ['eth_requestAccounts']);
  assert.equal(result.reusedExisting, false);
  assert.deepEqual(result.accounts, ['0xbbb']);
});

test('connectMetaMask surfaces a transient MetaMask failure without retry flooding', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_requestAccounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  await assert.rejects(
    connectMetaMask(provider),
    (error) => error?.code === -32603,
  );

  assert.deepEqual(calls, ['eth_requestAccounts']);
});

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

test('getRestoreProbeDelayMs gives provider-connect enough time before desktop fallback', () => {
  assert.equal(getRestoreProbeDelayMs({ mobile: false }), 2500);
  assert.equal(getRestoreProbeDelayMs({ mobile: true }), 3200);
});

test('subscribeMetaMaskProvider wires and unwires the provider connect event', () => {
  const listeners = new Map();
  const provider = {
    on(eventName, handler) {
      listeners.set(eventName, handler);
    },
    removeListener(eventName, handler) {
      if (listeners.get(eventName) === handler) {
        listeners.delete(eventName);
      }
    },
  };

  const onConnect = () => {};
  const unsubscribe = subscribeMetaMaskProvider(provider, { onConnect });

  assert.equal(listeners.get('connect'), onConnect);

  unsubscribe();

  assert.equal(listeners.has('connect'), false);
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

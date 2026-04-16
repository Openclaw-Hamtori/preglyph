import test from 'node:test';
import assert from 'node:assert/strict';

import {
  METAMASK_CONNECTOR_ID,
  connectMetaMask,
  createMemoryStorage,
  getMetaMaskUnlockState,
  getPassiveRetryCount,
  readRememberedSession,
  rememberConnectedWallet,
  clearRememberedWallet,
  shouldRestoreRememberedSession,
  restoreMetaMaskSession,
  stripPassiveRetryPrefixes,
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

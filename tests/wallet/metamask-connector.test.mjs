import test from 'node:test';
import assert from 'node:assert/strict';

import {
  METAMASK_CONNECTOR_ID,
  connectMetaMask,
  createMemoryStorage,
  readRememberedSession,
  rememberConnectedWallet,
  clearRememberedWallet,
  shouldRestoreRememberedSession,
  restoreMetaMaskSession,
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

test('connectMetaMask reuses an already-authorized account before prompting', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return ['0xaaa'];
      }
      if (method === 'eth_requestAccounts') {
        throw new Error('should not prompt when already authorized');
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider);

  assert.deepEqual(calls, ['eth_accounts']);
  assert.equal(result.reusedExisting, true);
  assert.equal(result.hadTransientPreflightError, false);
  assert.deepEqual(result.accounts, ['0xaaa']);
});

test('connectMetaMask prompts exactly once when no authorized account exists', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return [];
      }
      if (method === 'eth_requestAccounts') {
        return ['0xbbb'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider);

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts']);
  assert.equal(result.reusedExisting, false);
  assert.equal(result.hadTransientPreflightError, false);
  assert.deepEqual(result.accounts, ['0xbbb']);
});

test('connectMetaMask still prompts once after a transient MetaMask preflight error', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      if (method === 'eth_requestAccounts') {
        return ['0xccc'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider, {
    waitAfterPreflightError: async () => {},
  });

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts']);
  assert.equal(result.reusedExisting, false);
  assert.equal(result.hadTransientPreflightError, true);
  assert.deepEqual(result.accounts, ['0xccc']);
});

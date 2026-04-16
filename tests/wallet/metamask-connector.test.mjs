import test from 'node:test';
import assert from 'node:assert/strict';

import {
  METAMASK_CONNECTOR_ID,
  connectMetaMask,
  createMemoryStorage,
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

test('restoreMetaMaskSession retries a transient eth_accounts startup failure', async () => {
  const calls = [];
  let attempts = 0;
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error('Unexpected error');
          error.code = -32603;
          throw error;
        }
        return ['0x124'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await restoreMetaMaskSession(provider, { attempts: 2, delayMs: 0 });

  assert.deepEqual(calls, ['eth_accounts', 'eth_accounts']);
  assert.deepEqual(result, {
    accounts: ['0x124'],
    address: '0x124',
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

test('connectMetaMask retries a transient eth_requestAccounts startup failure once', async () => {
  const calls = [];
  let interactiveAttempts = 0;
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return [];
      }
      if (method === 'eth_requestAccounts') {
        interactiveAttempts += 1;
        if (interactiveAttempts === 1) {
          const error = new Error('Unexpected error');
          error.code = -32603;
          throw error;
        }
        return ['0xddd'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  let retryWaits = 0;
  const result = await connectMetaMask(provider, {
    waitAfterPreflightError: async () => {
      retryWaits += 1;
    },
  });

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts', 'eth_accounts', 'eth_accounts', 'eth_requestAccounts']);
  assert.equal(retryWaits, 2);
  assert.equal(result.reusedExisting, false);
  assert.equal(result.hadTransientPreflightError, false);
  assert.deepEqual(result.accounts, ['0xddd']);
});

test('connectMetaMask recovers via delayed eth_accounts after a transient eth_requestAccounts failure', async () => {
  const calls = [];
  let fallbackChecks = 0;
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        fallbackChecks += 1;
        if (fallbackChecks < 3) {
          return [];
        }
        return ['0xeee'];
      }
      if (method === 'eth_requestAccounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  let retryWaits = 0;
  const result = await connectMetaMask(provider, {
    waitAfterPreflightError: async () => {
      retryWaits += 1;
    },
  });

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts', 'eth_accounts', 'eth_accounts']);
  assert.equal(retryWaits, 2);
  assert.equal(result.reusedExisting, true);
  assert.deepEqual(result.accounts, ['0xeee']);
});

test('connectMetaMask performs a second passive recovery poll if the first fallback restore throws', async () => {
  const calls = [];
  let fallbackChecks = 0;
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        fallbackChecks += 1;
        if (fallbackChecks <= 3) {
          const error = new Error('Unexpected error');
          error.code = -32603;
          throw error;
        }
        return ['0xabc123'];
      }
      if (method === 'eth_requestAccounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider, {
    waitAfterPreflightError: async () => {},
  });

  assert.deepEqual(calls, [
    'eth_accounts',
    'eth_requestAccounts',
    'eth_accounts',
    'eth_accounts',
    'eth_accounts',
  ]);
  assert.equal(result.reusedExisting, true);
  assert.deepEqual(result.accounts, ['0xabc123']);
});

test('connectMetaMask honors custom recoverAuthorizedAccounts during fallback recovery', async () => {
  const calls = [];
  let recoverCalls = 0;
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return [];
      }
      if (method === 'eth_requestAccounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider, {
    waitAfterPreflightError: async () => {},
    recoverAuthorizedAccounts: async () => {
      recoverCalls += 1;
      return recoverCalls === 1
        ? { accounts: [], address: '' }
        : { accounts: ['0xfeed'], address: '0xfeed' };
    },
  });

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts']);
  assert.equal(recoverCalls, 2);
  assert.equal(result.reusedExisting, true);
  assert.deepEqual(result.accounts, ['0xfeed']);
});

test('connectMetaMask surfaces non-transient recoverAuthorizedAccounts failures without a second interactive retry', async () => {
  const calls = [];
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return [];
      }
      if (method === 'eth_requestAccounts') {
        const error = new Error('Unexpected error');
        error.code = -32603;
        throw error;
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const fallbackError = new Error('User rejected recovery');
  fallbackError.code = 4001;

  await assert.rejects(
    connectMetaMask(provider, {
      waitAfterPreflightError: async () => {},
      recoverAuthorizedAccounts: async () => {
        throw fallbackError;
      },
    }),
    (error) => error === fallbackError,
  );

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts']);
});

test('connectMetaMask clamps interactiveRetryAttempts to a single bounded retry', async () => {
  const calls = [];
  let interactiveAttempts = 0;
  const provider = {
    async request({ method }) {
      calls.push(method);
      if (method === 'eth_accounts') {
        return [];
      }
      if (method === 'eth_requestAccounts') {
        interactiveAttempts += 1;
        if (interactiveAttempts === 1) {
          const error = new Error('Unexpected error');
          error.code = -32603;
          throw error;
        }
        return ['0xfff'];
      }
      throw new Error(`Unexpected method: ${method}`);
    },
  };

  const result = await connectMetaMask(provider, {
    interactiveRetryAttempts: 99,
    waitAfterPreflightError: async () => {},
  });

  assert.deepEqual(calls, ['eth_accounts', 'eth_requestAccounts', 'eth_accounts', 'eth_accounts', 'eth_requestAccounts']);
  assert.deepEqual(result.accounts, ['0xfff']);
});

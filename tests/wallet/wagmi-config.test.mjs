import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStorage } from './test-helpers.mjs';

test('wagmiConfig uses persistent storage when browser localStorage is available', async () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const localStorage = createMemoryStorage();

  globalThis.window = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    ethereum: undefined,
  };
  globalThis.localStorage = localStorage;

  try {
    const mod = await import(`../../lib/wallet/wagmi-config.js?test=${Date.now()}`);
    const { wagmiConfig } = mod;

    await wagmiConfig.storage.setItem('recentConnectorId', 'metaMask');
    assert.equal(await wagmiConfig.storage.getItem('recentConnectorId'), 'metaMask');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;

    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

test('wagmiConfig falls back cleanly when browser localStorage access throws', async () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  const windowObject = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    ethereum: undefined,
  };
  Object.defineProperty(windowObject, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('blocked');
    },
  });

  globalThis.window = windowObject;
  delete globalThis.localStorage;

  try {
    const mod = await import(`../../lib/wallet/wagmi-config.js?test=${Date.now()}`);
    const { wagmiConfig } = mod;

    await wagmiConfig.storage.setItem('recentConnectorId', 'metaMask');
    assert.equal(await wagmiConfig.storage.getItem('recentConnectorId'), null);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;

    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

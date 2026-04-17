import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStorage } from './test-helpers.mjs';
import {
  METAMASK_WAGMI_CONNECTOR_ID,
  readWalletSessionPreference,
  rememberWalletConnected,
  rememberWalletDisconnected,
  shouldAutoReconnectWallet,
} from '../../lib/wallet/session-storage.mjs';

test('wallet session preference starts disconnected by default', () => {
  const storage = createMemoryStorage();

  assert.deepEqual(readWalletSessionPreference(storage), {
    connector: '',
    address: '',
    manuallyDisconnected: false,
  });
  assert.equal(shouldAutoReconnectWallet(storage), false);
});

test('rememberWalletConnected enables wagmi auto reconnect semantics', () => {
  const storage = createMemoryStorage();

  rememberWalletConnected(storage, '0xabc');

  assert.deepEqual(readWalletSessionPreference(storage), {
    connector: METAMASK_WAGMI_CONNECTOR_ID,
    address: '0xabc',
    manuallyDisconnected: false,
  });
  assert.equal(shouldAutoReconnectWallet(storage), true);
});

test('rememberWalletDisconnected disables reconnect without erasing the last address', () => {
  const storage = createMemoryStorage();

  rememberWalletConnected(storage, '0xabc');
  rememberWalletDisconnected(storage);

  assert.deepEqual(readWalletSessionPreference(storage), {
    connector: METAMASK_WAGMI_CONNECTOR_ID,
    address: '0xabc',
    manuallyDisconnected: true,
  });
  assert.equal(shouldAutoReconnectWallet(storage), false);
});

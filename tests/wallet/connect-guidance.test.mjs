import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleMetaMaskConnectFailure,
  shouldOpenMetaMaskMobileConnect,
} from '../../lib/wallet/connect-guidance.mjs';

test('mobile no-provider connect failure deep-links into MetaMask without showing an alert', () => {
  const calls = [];
  const windowObject = {
    navigator: { userAgent: 'iPhone' },
    alert(message) {
      calls.push(['alert', message]);
    },
  };

  const handled = handleMetaMaskConnectFailure({
    errorCode: 'NO_PROVIDER',
    windowObject,
    openMetaMaskInstallImpl() {
      calls.push(['open']);
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, [['open']]);
});

test('desktop no-provider connect failure keeps the alert guidance', () => {
  const calls = [];
  const windowObject = {
    navigator: { userAgent: 'Macintosh' },
    alert(message) {
      calls.push(['alert', message]);
    },
  };

  const handled = handleMetaMaskConnectFailure({
    errorCode: 'NO_PROVIDER',
    windowObject,
    openMetaMaskInstallImpl() {
      calls.push(['open']);
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    ['open'],
    ['alert', 'MetaMask is required to continue.'],
  ]);
});

test('mobile pending-request connect failure reopens MetaMask instead of only alerting', () => {
  const calls = [];
  const windowObject = {
    navigator: { userAgent: 'Android' },
    alert(message) {
      calls.push(['alert', message]);
    },
  };

  const handled = handleMetaMaskConnectFailure({
    errorCode: -32002,
    windowObject,
    openMetaMaskInstallImpl() {
      calls.push(['open']);
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, [['open']]);
});

test('mobile Connect opens MetaMask immediately when Safari has no MetaMask provider', () => {
  const windowObject = {
    navigator: { userAgent: 'iPhone' },
    ethereum: null,
  };

  assert.equal(shouldOpenMetaMaskMobileConnect({ windowObject }), true);
});

test('mobile Connect stays in-app when MetaMask mobile browser already injected the provider', () => {
  const windowObject = {
    navigator: { userAgent: 'MetaMaskMobile iPhone' },
    ethereum: {
      isMetaMask: true,
      providerInfo: { rdns: 'io.metamask' },
      request: async () => [],
      on: () => {},
      removeListener: () => {},
    },
  };

  assert.equal(shouldOpenMetaMaskMobileConnect({ windowObject }), false);
});

test('desktop Connect does not deep-link to MetaMask mobile', () => {
  const windowObject = {
    navigator: { userAgent: 'Macintosh' },
    ethereum: null,
  };

  assert.equal(shouldOpenMetaMaskMobileConnect({ windowObject }), false);
});

import {
  isProbablyMobile,
  openMetaMaskInstall,
  resolveMetaMaskProvider,
} from './metamask-connector.mjs';

export function shouldOpenMetaMaskMobileConnect({
  windowObject = typeof window === 'undefined' ? null : window,
  provider = resolveMetaMaskProvider(windowObject?.ethereum),
} = {}) {
  if (!windowObject) return false;
  if (!isProbablyMobile(windowObject?.navigator?.userAgent || '')) return false;
  return !provider;
}

export function handleMetaMaskConnectFailure({
  errorCode,
  windowObject = typeof window === 'undefined' ? null : window,
  openMetaMaskInstallImpl = openMetaMaskInstall,
} = {}) {
  if (!windowObject) return false;

  const mobile = isProbablyMobile(windowObject?.navigator?.userAgent || '');

  if (errorCode === 'NO_PROVIDER') {
    openMetaMaskInstallImpl({ windowObject });
    if (!mobile && typeof windowObject.alert === 'function') {
      windowObject.alert('MetaMask is required to continue.');
    }
    return true;
  }

  if (mobile && (errorCode === -32002 || errorCode === -32603)) {
    openMetaMaskInstallImpl({ windowObject });
    return true;
  }

  return false;
}

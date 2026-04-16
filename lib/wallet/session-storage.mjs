export const WALLET_CONNECTOR_KEY = 'preglyph:last-connector';
export const WALLET_ADDRESS_KEY = 'preglyph:last-connected-address';
export const WALLET_MANUAL_DISCONNECT_KEY = 'preglyph:wallet-manually-disconnected';
export const METAMASK_WAGMI_CONNECTOR_ID = 'metaMask';

function getStorage(storageLike) {
  if (storageLike) return storageLike;
  if (typeof window === 'undefined') return null;
  return window.localStorage || null;
}

export function readWalletSessionPreference(storageLike) {
  const storage = getStorage(storageLike);
  if (!storage) {
    return {
      connector: '',
      address: '',
      manuallyDisconnected: false,
    };
  }

  return {
    connector: storage.getItem(WALLET_CONNECTOR_KEY) || '',
    address: storage.getItem(WALLET_ADDRESS_KEY) || '',
    manuallyDisconnected: storage.getItem(WALLET_MANUAL_DISCONNECT_KEY) === '1',
  };
}

export function shouldAutoReconnectWallet(storageLike) {
  const session = readWalletSessionPreference(storageLike);
  return session.connector === METAMASK_WAGMI_CONNECTOR_ID && Boolean(session.address) && !session.manuallyDisconnected;
}

export function rememberWalletConnected(storageLike, address, connectorId = METAMASK_WAGMI_CONNECTOR_ID) {
  const storage = getStorage(storageLike);
  if (!storage || !address) return;
  storage.setItem(WALLET_CONNECTOR_KEY, connectorId);
  storage.setItem(WALLET_ADDRESS_KEY, address);
  storage.removeItem(WALLET_MANUAL_DISCONNECT_KEY);
}

export function rememberWalletDisconnected(storageLike) {
  const storage = getStorage(storageLike);
  if (!storage) return;
  storage.setItem(WALLET_MANUAL_DISCONNECT_KEY, '1');
}

export function clearWalletSessionPreference(storageLike) {
  const storage = getStorage(storageLike);
  if (!storage) return;
  storage.removeItem(WALLET_CONNECTOR_KEY);
  storage.removeItem(WALLET_ADDRESS_KEY);
  storage.removeItem(WALLET_MANUAL_DISCONNECT_KEY);
}

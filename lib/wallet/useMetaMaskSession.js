'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useConnection,
  useConnectionEffect,
  useConnect,
  useConnectors,
  useDisconnect,
  useReconnect,
} from 'wagmi';
import {
  extractMetaMaskErrorDetail,
  formatProviderSnapshot,
  getMetaMaskUnlockState,
  readProviderSnapshot,
  resolveMetaMaskProvider,
  waitForMetaMaskProvider,
} from './metamask-connector.mjs';
import {
  clearWalletSessionPreference,
  METAMASK_WAGMI_CONNECTOR_ID,
  readWalletSessionPreference,
  rememberWalletConnected,
  rememberWalletDisconnected,
  shouldAutoReconnectWallet,
} from './session-storage.mjs';

function createInitialWalletDebug() {
  return {
    providerDetected: false,
    providerRdns: '',
    selectedAddress: '',
    chainId: '',
    probeStatus: 'idle',
    lastEthAccounts: [],
    lastPermissions: [],
    lastErrorCode: '',
    lastErrorMessage: '',
    lastErrorDetail: '',
    lastErrorAt: '',
    lastEvent: 'init',
    probeTrace: [],
  };
}

export function useMetaMaskSession() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletProbeDone, setWalletProbeDone] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [walletDebug, setWalletDebug] = useState(createInitialWalletDebug);
  const [chainChangeCount, setChainChangeCount] = useState(0);

  const connection = useConnection();
  const connectors = useConnectors();
  const { connectAsync, isPending: connectPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { reconnectAsync } = useReconnect();

  const activeProviderRef = useRef(null);
  const initializedRef = useRef(false);
  const manualDisconnectRef = useRef(false);
  const previousChainIdRef = useRef(null);
  const previousConnectedAddressRef = useRef('');
  const walletAddressRef = useRef('');

  const connectedWalletAddress = connectionStatus === 'connected' && walletProbeDone ? walletAddress : '';
  const isConnecting = connectPending || connectionStatus === 'connecting';
  const metaMaskConnector = useMemo(
    () => connectors.find((connector) => connector.id === METAMASK_WAGMI_CONNECTOR_ID) || null,
    [connectors],
  );

  const appendProbeTrace = (label, detail = '') => {
    const entry = detail ? `${label} · ${detail}` : label;
    setWalletDebug((current) => ({
      ...current,
      probeTrace: [...current.probeTrace.slice(-6), entry],
    }));
  };

  const setDisconnectedState = (lastEvent = 'disconnect') => {
    setWalletAddress('');
    setConnectionStatus('disconnected');
    setWalletProbeDone(true);
    setWalletDebug((current) => ({
      ...current,
      selectedAddress: '',
      lastEthAccounts: [],
      lastPermissions: [],
      probeStatus: 'disconnected',
      lastEvent,
    }));
  };

  const syncProviderDebug = async ({
    provider = activeProviderRef.current,
    address = walletAddressRef.current,
    event,
    clearError = false,
  } = {}) => {
    if (!provider) return;

    const snapshot = readProviderSnapshot(provider);
    setWalletDebug((current) => ({
      ...current,
      providerDetected: true,
      providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
      selectedAddress: snapshot.selectedAddress || address || '',
      chainId: snapshot.chainId || current.chainId || '',
      probeStatus: address ? 'connected' : current.probeStatus,
      lastEthAccounts: address ? [address] : current.lastEthAccounts,
      lastPermissions: [],
      lastErrorCode: clearError ? '' : current.lastErrorCode,
      lastErrorMessage: clearError ? '' : current.lastErrorMessage,
      lastErrorDetail: clearError ? '' : current.lastErrorDetail,
      lastEvent: event || current.lastEvent,
    }));
    appendProbeTrace(event || 'provider:sync', formatProviderSnapshot(snapshot));
  };

  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  useEffect(() => {
    let cancelled = false;

    async function initializeWalletSession() {
      if (initializedRef.current) return;
      if (!metaMaskConnector) return;
      initializedRef.current = true;

      setWalletProbeDone(false);
      setConnectionStatus('checking');

      const provider = await waitForMetaMaskProvider({ timeoutMs: 2500 });
      if (cancelled) return;

      activeProviderRef.current = provider;
      if (!provider) {
        setWalletDebug((current) => ({
          ...current,
          providerDetected: false,
          providerRdns: '',
          selectedAddress: '',
          chainId: '',
          probeStatus: 'no_provider',
          lastEthAccounts: [],
          lastPermissions: [],
          lastErrorCode: '',
          lastErrorMessage: '',
          lastErrorDetail: '',
          lastEvent: 'probe:no_provider',
          probeTrace: [],
        }));
        setConnectionStatus('disconnected');
        setWalletProbeDone(true);
        return;
      }

      const snapshot = readProviderSnapshot(provider);
      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: snapshot.selectedAddress || '',
        chainId: snapshot.chainId || '',
        probeStatus: 'idle',
        lastEvent: 'provider:ready',
      }));
      appendProbeTrace('provider:ready', formatProviderSnapshot(snapshot));

      if (!shouldAutoReconnectWallet()) {
        setConnectionStatus('disconnected');
        setWalletProbeDone(true);
        setWalletDebug((current) => ({
          ...current,
          probeStatus: 'disconnected',
          lastEvent: 'probe:idle:manual_disconnect',
        }));
        return;
      }

      try {
        setWalletDebug((current) => ({
          ...current,
          probeStatus: 'probing',
          lastEvent: 'reconnect:start',
        }));
        appendProbeTrace('reconnect:start', formatProviderSnapshot(snapshot));
        const reconnects = await reconnectAsync();
        if (cancelled) return;

        const restored = reconnects.some((item) => item.connector.id === METAMASK_WAGMI_CONNECTOR_ID);
        if (!restored) {
          setConnectionStatus('disconnected');
          setWalletProbeDone(true);
          setWalletDebug((current) => ({
            ...current,
            probeStatus: 'disconnected',
            lastEvent: 'reconnect:none',
          }));
        }
      } catch (error) {
        if (cancelled) return;
        const errorDetail = extractMetaMaskErrorDetail(error);
        setConnectionStatus('disconnected');
        setWalletProbeDone(true);
        setWalletDebug((current) => ({
          ...current,
          probeStatus: 'error',
          lastErrorCode: errorDetail.code || String(error?.code || ''),
          lastErrorMessage: errorDetail.message,
          lastErrorDetail: errorDetail.detail,
          lastErrorAt: new Date().toISOString(),
          lastEvent: 'reconnect:error',
        }));
        appendProbeTrace('reconnect:error', errorDetail.message || error?.message || 'Unknown error');
      }
    }

    void initializeWalletSession();

    return () => {
      cancelled = true;
    };
  }, [metaMaskConnector, reconnectAsync]);

  useConnectionEffect({
    onConnect(data) {
      previousConnectedAddressRef.current = data.address;
      void (async () => {
        const provider = data.connector?.getProvider ? await data.connector.getProvider() : activeProviderRef.current || resolveMetaMaskProvider();
        activeProviderRef.current = provider;
        rememberWalletConnected(undefined, data.address, data.connector?.id || METAMASK_WAGMI_CONNECTOR_ID);
        setWalletAddress(data.address);
        setConnectionStatus('connected');
        setWalletProbeDone(true);
        await syncProviderDebug({
          provider,
          address: data.address,
          event: data.isReconnected ? 'reconnect:success' : 'connect:requestAccounts-success',
          clearError: true,
        });
      })();
    },
    onDisconnect() {
      previousConnectedAddressRef.current = '';
      if (manualDisconnectRef.current) {
        rememberWalletDisconnected();
        manualDisconnectRef.current = false;
        setDisconnectedState('disconnect');
        return;
      }

      clearWalletSessionPreference();
      setDisconnectedState('event:disconnect');
    },
  });

  useEffect(() => {
    const nextChainId = connection.status === 'connected' ? connection.chainId || null : null;
    if (nextChainId && previousChainIdRef.current && nextChainId !== previousChainIdRef.current) {
      setChainChangeCount((current) => current + 1);
      setWalletDebug((current) => ({
        ...current,
        chainId: `0x${nextChainId.toString(16)}`,
        lastEvent: 'event:chainChanged',
      }));
    }
    previousChainIdRef.current = nextChainId;
  }, [connection.status, connection.chainId]);

  useEffect(() => {
    if (connection.status !== 'connected' || !connection.address) return;
    const normalizedAddress = connection.address.toLowerCase();
    if (normalizedAddress === walletAddressRef.current?.toLowerCase()) return;

    let cancelled = false;
    const nextEvent = previousConnectedAddressRef.current && previousConnectedAddressRef.current.toLowerCase() !== normalizedAddress
      ? 'event:accountsChanged'
      : 'connection:sync';
    previousConnectedAddressRef.current = connection.address;

    void (async () => {
      const provider = connection.connector?.getProvider
        ? await connection.connector.getProvider()
        : activeProviderRef.current || resolveMetaMaskProvider();
      if (cancelled) return;
      activeProviderRef.current = provider;
      rememberWalletConnected(undefined, connection.address, connection.connector?.id || METAMASK_WAGMI_CONNECTOR_ID);
      setWalletAddress(connection.address);
      setConnectionStatus('connected');
      setWalletProbeDone(true);
      await syncProviderDebug({
        provider,
        address: connection.address,
        event: nextEvent,
        clearError: true,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [connection.status, connection.address, connection.connector]);

  async function connect() {
    const provider = await waitForMetaMaskProvider({ timeoutMs: 2500 });
    const connector = metaMaskConnector;

    if (!provider || !connector) {
      const error = new Error('MetaMask is required to continue.');
      error.code = 'NO_PROVIDER';
      throw error;
    }

    activeProviderRef.current = provider;
    manualDisconnectRef.current = false;

    const unlockState = await getMetaMaskUnlockState(provider);
    const snapshot = readProviderSnapshot(provider);
    setConnectionStatus('connecting');
    setWalletProbeDone(false);
    setWalletDebug((current) => ({
      ...current,
      providerDetected: true,
      providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
      selectedAddress: snapshot.selectedAddress || current.selectedAddress || '',
      chainId: snapshot.chainId || current.chainId || '',
      probeStatus: 'probing',
      lastErrorCode: '',
      lastErrorMessage: '',
      lastErrorDetail: '',
      lastEvent: 'connect:requestAccounts-start',
    }));
    appendProbeTrace('connect:start', formatProviderSnapshot(snapshot));

    try {
      await connectAsync({ connector });
      const accounts = await provider.request({ method: 'eth_accounts' }).catch(() => []);
      return accounts?.[0] || walletAddressRef.current || '';
    } catch (error) {
      const connectErrorDetail = extractMetaMaskErrorDetail(error);
      try {
        error.metaMaskUnlocked = unlockState;
      } catch {}
      setConnectionStatus(connection.status === 'connected' ? 'connected' : 'disconnected');
      setWalletProbeDone(true);
      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: provider?.selectedAddress || current.selectedAddress || '',
        chainId: provider?.chainId || current.chainId || '',
        probeStatus: 'error',
        lastErrorCode: connectErrorDetail.code || String(error?.code || ''),
        lastErrorMessage: connectErrorDetail.message,
        lastErrorDetail: connectErrorDetail.detail,
        lastErrorAt: new Date().toISOString(),
        lastEvent: 'connect:error',
      }));
      appendProbeTrace('connect:error', connectErrorDetail.message || error?.message || 'Unknown error');
      throw error;
    }
  }

  async function disconnect() {
    manualDisconnectRef.current = true;
    rememberWalletDisconnected();
    await disconnectAsync();
    setDisconnectedState('disconnect');
  }

  async function getConnectedProvider() {
    if (connection.status === 'connected' && connection.connector?.getProvider) {
      const provider = await connection.connector.getProvider();
      activeProviderRef.current = provider;
      return provider;
    }

    return activeProviderRef.current || resolveMetaMaskProvider();
  }

  return {
    walletAddress,
    connectedWalletAddress,
    walletProbeDone,
    connectionStatus,
    isConnecting,
    walletDebug,
    chainChangeCount,
    connect,
    disconnect,
    getConnectedProvider,
  };
}

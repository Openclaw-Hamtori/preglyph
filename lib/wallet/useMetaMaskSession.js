'use client';

import { useEffect, useRef, useState } from 'react';
import {
  clearRememberedWallet,
  connectMetaMask,
  extractMetaMaskErrorDetail,
  formatProviderSnapshot,
  getMetaMaskUnlockState,
  isProbablyMobile,
  readProviderSnapshot,
  readRememberedSession,
  rememberConnectedWallet,
  resolveMetaMaskProvider,
  restoreMetaMaskSession,
  shouldRestoreRememberedSession,
  subscribeMetaMaskProvider,
  waitForMetaMaskProvider,
} from './metamask-connector.mjs';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletDebug, setWalletDebug] = useState(createInitialWalletDebug);
  const [chainChangeCount, setChainChangeCount] = useState(0);

  const connectPromiseRef = useRef(null);
  const connectInFlightRef = useRef(false);
  const probeInFlightRef = useRef(false);
  const probeRequestIdRef = useRef(0);
  const walletAddressRef = useRef('');
  const connectedWalletAddressRef = useRef('');
  const activeProviderRef = useRef(null);
  const scheduledSyncTimeoutRef = useRef(null);
  const restoreProbeTimeoutRef = useRef(null);
  const manualDisconnectRef = useRef(false);

  const connectedWalletAddress = connectionStatus === 'connected' && walletProbeDone ? walletAddress : '';

  const appendProbeTrace = (label, detail = '') => {
    const entry = detail ? `${label} · ${detail}` : label;
    setWalletDebug((current) => ({
      ...current,
      probeTrace: [...current.probeTrace.slice(-6), entry],
    }));
  };

  const hydrateConnectedWallet = async (provider, accounts, lastEvent) => {
    const nextAddress = accounts?.[0] || '';
    if (!nextAddress) {
      throw new Error('MetaMask did not return a wallet address.');
    }

    if (restoreProbeTimeoutRef.current) {
      clearTimeout(restoreProbeTimeoutRef.current);
      restoreProbeTimeoutRef.current = null;
    }

    setWalletAddress(nextAddress);
    setConnectionStatus('connected');
    setWalletProbeDone(true);
    rememberConnectedWallet(undefined, nextAddress);
    setWalletDebug((current) => ({
      ...current,
      providerDetected: true,
      providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
      selectedAddress: nextAddress,
      chainId: provider?.chainId || '',
      lastEthAccounts: accounts || [],
      probeStatus: 'connected',
      lastErrorCode: '',
      lastErrorMessage: '',
      lastErrorDetail: '',
      lastEvent,
    }));
    return nextAddress;
  };

  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  useEffect(() => {
    connectedWalletAddressRef.current = connectedWalletAddress;
  }, [connectedWalletAddress]);

  useEffect(() => {
    let cancelled = false;

    const clearScheduledSync = () => {
      if (scheduledSyncTimeoutRef.current) {
        clearTimeout(scheduledSyncTimeoutRef.current);
        scheduledSyncTimeoutRef.current = null;
      }
    };

    const clearRestoreProbe = () => {
      if (restoreProbeTimeoutRef.current) {
        clearTimeout(restoreProbeTimeoutRef.current);
        restoreProbeTimeoutRef.current = null;
      }
    };

    const scheduleSync = (reason, delayMs = 0) => {
      if (cancelled || connectInFlightRef.current || manualDisconnectRef.current) return;
      clearScheduledSync();
      scheduledSyncTimeoutRef.current = setTimeout(() => {
        scheduledSyncTimeoutRef.current = null;
        if (!cancelled && !manualDisconnectRef.current) {
          syncWalletState(reason);
        }
      }, delayMs);
    };

    const scheduleRestoreProbe = (delayMs) => {
      clearRestoreProbe();
      restoreProbeTimeoutRef.current = setTimeout(() => {
        restoreProbeTimeoutRef.current = null;
        if (cancelled || manualDisconnectRef.current || connectedWalletAddressRef.current || connectInFlightRef.current) return;
        syncWalletState('restore:fallback');
      }, delayMs);
    };

    const syncWalletState = async (reason = 'mount') => {
      const provider = activeProviderRef.current;
      if (!provider || connectInFlightRef.current || manualDisconnectRef.current || probeInFlightRef.current) return;

      probeInFlightRef.current = true;
      const requestId = ++probeRequestIdRef.current;

      setConnectionStatus((current) => (current === 'connected' ? current : 'checking'));
      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: provider?.selectedAddress || current.selectedAddress || '',
        chainId: provider?.chainId || '',
        probeStatus: 'probing',
        lastEvent: `probe:start:${reason}`,
      }));

      try {
        const startSnapshot = readProviderSnapshot(provider);
        if (cancelled || requestId !== probeRequestIdRef.current) return;
        appendProbeTrace('probe:start', `${reason} · ${formatProviderSnapshot(startSnapshot)}`);
        appendProbeTrace('eth_accounts:request', formatProviderSnapshot(startSnapshot));
        const { accounts, address } = await restoreMetaMaskSession(provider);
        if (cancelled || requestId !== probeRequestIdRef.current || manualDisconnectRef.current) return;

        const successSnapshot = readProviderSnapshot(provider);
        appendProbeTrace(
          'eth_accounts:success',
          `accounts=${JSON.stringify(accounts || [])} · ${formatProviderSnapshot(successSnapshot)}`,
        );

        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: provider?.selectedAddress || address,
          chainId: provider?.chainId || '',
          probeStatus: address ? 'connected' : 'disconnected',
          lastEthAccounts: accounts || [],
          lastPermissions: [],
          lastErrorCode: '',
          lastErrorMessage: '',
          lastErrorDetail: '',
          lastEvent: `probe:success:${reason}`,
        }));
        setWalletAddress(address);
        setConnectionStatus(address ? 'connected' : 'disconnected');
        setWalletProbeDone(true);

        if (!address) {
          clearRememberedWallet();
        } else {
          rememberConnectedWallet(undefined, address);
        }
      } catch (error) {
        if (cancelled || requestId !== probeRequestIdRef.current || manualDisconnectRef.current) return;

        const passiveErrorDetail = extractMetaMaskErrorDetail(error);
        const errorSnapshot = readProviderSnapshot(provider);
        appendProbeTrace(
          'eth_accounts:error',
          `code=${passiveErrorDetail.code || error?.code || '—'} · ${passiveErrorDetail.message || error?.message || 'Unexpected error'} · ${formatProviderSnapshot(errorSnapshot)}`,
        );
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: provider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: provider?.selectedAddress || current.selectedAddress || '',
          chainId: provider?.chainId || '',
          probeStatus: 'error',
          lastErrorCode: passiveErrorDetail.code || String(error?.code || ''),
          lastErrorMessage: passiveErrorDetail.message,
          lastErrorDetail: passiveErrorDetail.detail,
          lastErrorAt: new Date().toISOString(),
          lastEvent: `probe:error:${reason}`,
        }));
        appendProbeTrace('probe:failed', `${reason} · ${formatProviderSnapshot(errorSnapshot)}`);
        setConnectionStatus((current) => (current === 'connected' ? 'connected' : 'disconnected'));
        setWalletProbeDone(true);
      } finally {
        if (!cancelled && requestId === probeRequestIdRef.current) {
          probeInFlightRef.current = false;
        }
      }
    };

    const setupWallet = async () => {
      setWalletProbeDone(false);
      setConnectionStatus('checking');
      const metamaskProvider = await waitForMetaMaskProvider({ timeoutMs: 2500 });
      if (cancelled) return;

      if (!metamaskProvider) {
        setWalletDebug((current) => ({
          ...current,
          providerDetected: false,
          providerRdns: '',
          selectedAddress: '',
          chainId: '',
          probeStatus: 'no_provider',
          lastPermissions: [],
          lastEvent: 'probe:no_provider',
          probeTrace: [],
        }));
        setConnectionStatus('disconnected');
        setWalletProbeDone(true);
        return;
      }

      activeProviderRef.current = metamaskProvider;

      const handleAccountsChanged = (accounts) => {
        clearRestoreProbe();
        const nextAddress = accounts?.[0] || '';
        if (manualDisconnectRef.current && nextAddress) {
          setWalletDebug((current) => ({
            ...current,
            providerDetected: true,
            providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
            selectedAddress: nextAddress,
            chainId: metamaskProvider?.chainId || '',
            lastEvent: 'event:accountsChanged:ignored',
          }));
          return;
        }

        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: nextAddress,
          chainId: metamaskProvider?.chainId || '',
          lastEthAccounts: accounts || [],
          lastPermissions: [],
          probeStatus: nextAddress ? 'connected' : 'disconnected',
          lastErrorCode: '',
          lastErrorMessage: '',
          lastErrorDetail: '',
          lastEvent: 'event:accountsChanged',
        }));
        setWalletAddress(nextAddress);
        setConnectionStatus(nextAddress ? 'connected' : 'disconnected');
        if (!nextAddress) {
          clearRememberedWallet();
        } else {
          rememberConnectedWallet(undefined, nextAddress);
        }
        setWalletProbeDone(true);
      };

      const handleChainChanged = () => {
        setWalletDebug((current) => ({
          ...current,
          chainId: metamaskProvider?.chainId || '',
          lastEvent: 'event:chainChanged',
        }));
        setChainChangeCount((current) => current + 1);
        if (walletAddressRef.current) {
          scheduleSync('chainChanged', 400);
        }
      };

      const handleProviderConnect = () => {
        setWalletDebug((current) => ({
          ...current,
          chainId: metamaskProvider?.chainId || '',
          lastEvent: 'event:connect',
        }));

        const shouldRestoreOnConnect = shouldRestoreRememberedSession(readRememberedSession());
        if (!manualDisconnectRef.current && !connectedWalletAddressRef.current && shouldRestoreOnConnect) {
          appendProbeTrace('event:connect', formatProviderSnapshot(readProviderSnapshot(metamaskProvider)));
          scheduleSync('restore:provider_connect', 150);
        }
      };

      const unsubscribe = subscribeMetaMaskProvider(metamaskProvider, {
        onAccountsChanged: handleAccountsChanged,
        onChainChanged: handleChainChanged,
        onConnect: handleProviderConnect,
      });

      const rememberedSession = readRememberedSession();
      const shouldRestoreRemembered = rememberedSession.connector === 'metamask' && Boolean(rememberedSession.address);

      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: metamaskProvider?.selectedAddress || rememberedSession.address || '',
        chainId: metamaskProvider?.chainId || '',
        lastPermissions: [],
        probeStatus: shouldRestoreRemembered ? 'awaiting_event' : current.probeStatus,
        lastEvent: shouldRestoreRemembered ? 'probe:provider_ready:await_accountsChanged' : 'probe:provider_ready:idle',
      }));

      if (shouldRestoreRemembered) {
        setWalletAddress(rememberedSession.address);
        setConnectionStatus('checking');
        setWalletProbeDone(false);
        appendProbeTrace('probe:awaiting_accountsChanged', formatProviderSnapshot(readProviderSnapshot(metamaskProvider)));
        scheduleRestoreProbe(isProbablyMobile() ? 1800 : 1200);
      } else {
        setConnectionStatus('disconnected');
        setWalletProbeDone(true);
      }

      return unsubscribe;
    };

    let cleanupListeners = null;
    setupWallet().then((cleanup) => {
      if (typeof cleanup === 'function') {
        cleanupListeners = cleanup;
      }
    });

    return () => {
      cancelled = true;
      clearScheduledSync();
      clearRestoreProbe();
      activeProviderRef.current = null;
      probeInFlightRef.current = false;
      if (cleanupListeners) cleanupListeners();
    };
  }, []);

  const connect = async () => {
    const metamaskProvider = activeProviderRef.current || resolveMetaMaskProvider();
    if (!metamaskProvider) {
      const error = new Error('MetaMask is required to continue.');
      error.code = 'NO_PROVIDER';
      throw error;
    }

    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    const connectPromise = (async () => {
      manualDisconnectRef.current = false;
      if (scheduledSyncTimeoutRef.current) {
        clearTimeout(scheduledSyncTimeoutRef.current);
        scheduledSyncTimeoutRef.current = null;
      }
      if (restoreProbeTimeoutRef.current) {
        clearTimeout(restoreProbeTimeoutRef.current);
        restoreProbeTimeoutRef.current = null;
      }
      setIsConnecting(true);
      connectInFlightRef.current = true;
      setConnectionStatus('connecting');
      const unlockState = await getMetaMaskUnlockState(metamaskProvider);
      appendProbeTrace('connect:unlock_state', `value=${unlockState === null ? 'unknown' : String(unlockState)}`);
      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: metamaskProvider?.selectedAddress || '',
        chainId: metamaskProvider?.chainId || '',
        lastEvent: 'connect:requestAccounts-start',
        lastErrorCode: '',
        lastErrorMessage: '',
        lastErrorDetail: '',
      }));

      try {
        const result = await connectMetaMask(metamaskProvider);

        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: result.address || metamaskProvider?.selectedAddress || '',
          chainId: metamaskProvider?.chainId || '',
          lastEthAccounts: result.accounts || [],
          lastPermissions: [],
          probeStatus: result.address ? 'connected' : 'disconnected',
          lastEvent: 'connect:requestAccounts-user-gesture',
        }));

        return await hydrateConnectedWallet(
          metamaskProvider,
          result.accounts,
          'connect:requestAccounts-success',
        );
      } catch (error) {
        const connectErrorDetail = extractMetaMaskErrorDetail(error);
        try {
          error.metaMaskUnlocked = unlockState;
        } catch {}

        setConnectionStatus(walletAddressRef.current ? 'connected' : 'disconnected');
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: metamaskProvider?.selectedAddress || '',
          chainId: metamaskProvider?.chainId || '',
          lastPermissions: [],
          lastErrorCode: connectErrorDetail.code || String(error?.code || ''),
          lastErrorMessage: connectErrorDetail.message,
          lastErrorDetail: connectErrorDetail.detail,
          lastErrorAt: new Date().toISOString(),
          lastEvent: 'connect:error',
          probeStatus: 'error',
        }));
        throw error;
      } finally {
        connectInFlightRef.current = false;
        connectPromiseRef.current = null;
        setIsConnecting(false);
      }
    })();

    connectPromiseRef.current = connectPromise;
    return connectPromise;
  };

  const disconnect = async () => {
    manualDisconnectRef.current = true;
    if (scheduledSyncTimeoutRef.current) {
      clearTimeout(scheduledSyncTimeoutRef.current);
      scheduledSyncTimeoutRef.current = null;
    }
    if (restoreProbeTimeoutRef.current) {
      clearTimeout(restoreProbeTimeoutRef.current);
      restoreProbeTimeoutRef.current = null;
    }
    probeRequestIdRef.current += 1;
    probeInFlightRef.current = false;
    clearRememberedWallet();
    setWalletAddress('');
    setConnectionStatus('disconnected');
    setWalletProbeDone(true);
    setWalletDebug((current) => ({
      ...current,
      selectedAddress: '',
      lastEthAccounts: [],
      lastEvent: 'disconnect',
      probeStatus: 'disconnected',
      probeTrace: [],
    }));
  };

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
  };
}

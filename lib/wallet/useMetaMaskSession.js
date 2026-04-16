'use client';

import { useEffect, useRef, useState } from 'react';
import {
  clearRememberedWallet,
  connectMetaMask,
  extractMetaMaskErrorDetail,
  formatProviderSnapshot,
  getPassiveRetryCount,
  isProbablyMobile,
  isTransientMetaMaskStartupError,
  readProviderSnapshot,
  readRememberedSession,
  rememberConnectedWallet,
  resolveMetaMaskProvider,
  restoreMetaMaskSession,
  stripPassiveRetryPrefixes,
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
  const queuedProbeReasonRef = useRef('');
  const walletAddressRef = useRef('');
  const lifecycleRetryTimeoutRef = useRef(null);
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
    let cancelled = false;
    let activeProvider = null;

    const clearScheduledSync = () => {
      if (lifecycleRetryTimeoutRef.current) {
        clearTimeout(lifecycleRetryTimeoutRef.current);
        lifecycleRetryTimeoutRef.current = null;
      }
    };

    const scheduleSync = (reason, delayMs = 0) => {
      if (cancelled || connectInFlightRef.current || manualDisconnectRef.current) return;
      clearScheduledSync();
      lifecycleRetryTimeoutRef.current = setTimeout(() => {
        lifecycleRetryTimeoutRef.current = null;
        if (!cancelled && !manualDisconnectRef.current) {
          syncWalletState(reason);
        }
      }, delayMs);
    };

    const syncWalletState = async (reason = 'mount') => {
      if (!activeProvider || connectInFlightRef.current || manualDisconnectRef.current) return;
      if (probeInFlightRef.current) {
        queuedProbeReasonRef.current = reason;
        return;
      }

      probeInFlightRef.current = true;
      const requestId = ++probeRequestIdRef.current;
      setConnectionStatus((current) => (current === 'connected' ? current : 'checking'));
      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: activeProvider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: activeProvider?.selectedAddress || '',
        chainId: activeProvider?.chainId || '',
        probeStatus: 'probing',
        lastEvent: `probe:start:${reason}`,
      }));

      try {
        const startSnapshot = readProviderSnapshot(activeProvider);
        if (cancelled || requestId !== probeRequestIdRef.current) return;
        appendProbeTrace('probe:start', `${reason} · ${formatProviderSnapshot(startSnapshot)}`);
        appendProbeTrace('eth_accounts:request', formatProviderSnapshot(startSnapshot));
        const { accounts, address } = await restoreMetaMaskSession(activeProvider);
        if (cancelled || requestId !== probeRequestIdRef.current || manualDisconnectRef.current) return;

        const successSnapshot = readProviderSnapshot(activeProvider);
        appendProbeTrace(
          'eth_accounts:success',
          `accounts=${JSON.stringify(accounts || [])} · ${formatProviderSnapshot(successSnapshot)}`,
        );

        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: activeProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: activeProvider?.selectedAddress || address,
          chainId: activeProvider?.chainId || '',
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
        if (!address) {
          clearRememberedWallet();
        } else {
          rememberConnectedWallet(undefined, address);
        }
      } catch (error) {
        if (cancelled || requestId !== probeRequestIdRef.current || manualDisconnectRef.current) return;

        const passiveErrorDetail = extractMetaMaskErrorDetail(error);
        const retryCount = getPassiveRetryCount(reason);
        const baseReason = stripPassiveRetryPrefixes(reason);
        const allowRetry = baseReason === 'chainChanged' || baseReason === 'restore:remembered';
        const retryable = isTransientMetaMaskStartupError(error) && allowRetry && retryCount < 2;
        const errorSnapshot = readProviderSnapshot(activeProvider);
        appendProbeTrace(
          'eth_accounts:error',
          `code=${passiveErrorDetail.code || error?.code || '—'} · ${passiveErrorDetail.message || error?.message || 'Unexpected error'} · ${formatProviderSnapshot(errorSnapshot)}`,
        );
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: activeProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: activeProvider?.selectedAddress || current.selectedAddress || '',
          chainId: activeProvider?.chainId || '',
          probeStatus: retryable ? 'retrying' : 'error',
          lastErrorCode: passiveErrorDetail.code || String(error?.code || ''),
          lastErrorMessage: passiveErrorDetail.message,
          lastErrorDetail: passiveErrorDetail.detail,
          lastErrorAt: new Date().toISOString(),
          lastEvent: retryable ? `probe:retry:${reason}` : `probe:error:${reason}`,
        }));
        if (retryable) {
          appendProbeTrace('probe:retry', `next=${retryCount + 1} · reason=${reason}`);
          setConnectionStatus('checking');
          scheduleSync(`retry:${retryCount + 1}:${reason}`, 900);
          return;
        }
        appendProbeTrace('probe:failed', `${reason} · ${formatProviderSnapshot(errorSnapshot)}`);
        if (baseReason === 'restore:remembered') {
          clearRememberedWallet();
          setWalletAddress('');
          setConnectionStatus('disconnected');
          return;
        }
        setConnectionStatus((current) => (current === 'connected' ? 'connected' : 'disconnected'));
      } finally {
        if (!cancelled && requestId === probeRequestIdRef.current) {
          setWalletProbeDone(true);
          probeInFlightRef.current = false;
          const queuedReason = queuedProbeReasonRef.current;
          queuedProbeReasonRef.current = '';
          if (queuedReason) {
            scheduleSync(queuedReason, 150);
          }
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

      activeProvider = metamaskProvider;

      const handleAccountsChanged = (accounts) => {
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
          scheduleSync('chainChanged', 800);
        }
      };

      const unsubscribe = subscribeMetaMaskProvider(metamaskProvider, {
        onAccountsChanged: handleAccountsChanged,
        onChainChanged: handleChainChanged,
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
        lastEvent: shouldRestoreRemembered ? 'probe:provider_ready:restore' : 'probe:provider_ready:idle',
      }));

      if (shouldRestoreRemembered) {
        setWalletAddress(rememberedSession.address);
        setConnectionStatus('checking');
        setWalletProbeDone(false);
        scheduleSync('restore:remembered', isProbablyMobile() ? 1800 : 900);
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
      probeInFlightRef.current = false;
      queuedProbeReasonRef.current = '';
      if (cleanupListeners) cleanupListeners();
    };
  }, []);

  const connect = async () => {
    const metamaskProvider = resolveMetaMaskProvider();
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
      setIsConnecting(true);
      connectInFlightRef.current = true;
      setConnectionStatus('connecting');
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
        const result = await connectMetaMask(metamaskProvider, {
          waitAfterPreflightError: async () => {
            await new Promise((resolve) => setTimeout(resolve, 450));
          },
        });

        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: result.address || metamaskProvider?.selectedAddress || '',
          chainId: metamaskProvider?.chainId || '',
          lastEthAccounts: result.accounts || [],
          lastPermissions: [],
          probeStatus: result.address ? 'connected' : 'disconnected',
          lastEvent: result.reusedExisting
            ? 'connect:reuse-existing'
            : result.hadTransientPreflightError
              ? 'connect:requestAccounts-after-preflight-error'
              : 'connect:requestAccounts-user-gesture',
        }));

        return await hydrateConnectedWallet(
          metamaskProvider,
          result.accounts,
          result.reusedExisting ? 'connect:hydrated-reuse' : 'connect:requestAccounts-success',
        );
      } catch (error) {
        const connectErrorDetail = extractMetaMaskErrorDetail(error);
        if (error?.code !== 4001 && error?.code !== -32002 && isTransientMetaMaskStartupError(error)) {
          try {
            const fallback = await restoreMetaMaskSession(metamaskProvider);
            if (fallback.address) {
              setWalletDebug((current) => ({
                ...current,
                selectedAddress: fallback.address,
                lastEthAccounts: fallback.accounts || [],
                probeStatus: 'connected',
                lastEvent: 'connect:fallback-eth_accounts',
              }));
              return await hydrateConnectedWallet(metamaskProvider, fallback.accounts, 'connect:fallback-eth_accounts');
            }
          } catch {
            // ignore fallback errors and surface the original connect failure below
          }
        }

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
    if (lifecycleRetryTimeoutRef.current) {
      clearTimeout(lifecycleRetryTimeoutRef.current);
      lifecycleRetryTimeoutRef.current = null;
    }
    probeRequestIdRef.current += 1;
    probeInFlightRef.current = false;
    queuedProbeReasonRef.current = '';
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

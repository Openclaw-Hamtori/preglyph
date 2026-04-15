'use client';

import { BrowserProvider, Contract } from 'ethers';
import { useEffect, useMemo, useRef, useState } from 'react';
import DetailSlab3D from './components/DetailSlab3D';
import { MATRIX_SIZE, createInscriptionDataUrl } from './components/inscriptionTexture';
import PREGlyph_ABI from '@/lib/preglyphAbi.cjs';

const CLIENT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID || 31337);
const CLIENT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS || '';
const CLIENT_RPC_URL = process.env.NEXT_PUBLIC_PREGLYPH_RPC_HTTP_URL || 'http://127.0.0.1:8545';
const CLIENT_CHAIN_NAME = process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_NAME || 'Preglyph Testchain';
const CLIENT_CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_PREGLYPH_CURRENCY_SYMBOL || 'ETH';
const MAX_RECORD_LENGTH = 280;

function getMetaMaskProvider() {
  if (typeof window === 'undefined') return null;
  const injected = window.ethereum;
  if (!injected) return null;

  const providers = Array.isArray(injected.providers) && injected.providers.length ? injected.providers : [injected];

  const byRdns = providers.find((provider) => provider?.providerInfo?.rdns === 'io.metamask');
  if (byRdns) return byRdns;

  return (
    providers.find(
      (provider) =>
        provider?.isMetaMask &&
        !provider?.isAvalanche &&
        !provider?.isBraveWallet &&
        !provider?.isCoinbaseWallet &&
        !provider?.isOkxWallet &&
        !provider?.isOKExWallet &&
        !provider?.isOKXWallet &&
        !provider?.isRabby &&
        !provider?.isTokenPocket &&
        !provider?.isTrust,
    ) || null
  );
}

function isProbablyMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function openMetaMaskInstall() {
  if (typeof window === 'undefined') return;
  const dappUrl = 'preglyph.com';
  if (isProbablyMobile()) {
    window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
    return;
  }
  window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
}

function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isTransientMetaMaskStartupError(error) {
  return error?.code === -32603;
}

async function requestWithRetry(provider, method, { attempts = 3, delayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await provider.request({ method });
    } catch (error) {
      lastError = error;
      if (!isTransientMetaMaskStartupError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

async function waitForMetaMaskProvider(timeoutMs = 1200) {
  const existingProvider = getMetaMaskProvider();
  if (existingProvider) return existingProvider;
  if (typeof window === 'undefined') return null;

  return await new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('ethereum#initialized', handleInitialized);
      if (timeoutId) clearTimeout(timeoutId);
      resolve(getMetaMaskProvider());
    };

    const handleInitialized = () => finish();

    window.addEventListener('ethereum#initialized', handleInitialized, { once: true });
    timeoutId = setTimeout(finish, timeoutMs);
  });
}

function extractMetaMaskErrorDetail(error) {
  const originalError = error?.data?.originalError;
  const nestedMessage = originalError?.message || error?.data?.message || error?.message || 'Unexpected error';
  const nestedCode = originalError?.code ?? error?.data?.code ?? error?.code ?? '';
  let detail = '';
  try {
    detail = originalError ? JSON.stringify(originalError) : error?.data ? JSON.stringify(error.data) : '';
  } catch {
    detail = originalError?.message || error?.data?.message || '';
  }
  return {
    code: String(nestedCode || ''),
    message: nestedMessage,
    detail,
  };
}

function formatDebugValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return JSON.stringify(value);
  }
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function readProviderSnapshot(provider) {
  let isConnected = 'n/a';
  if (typeof provider?.isConnected === 'function') {
    try {
      isConnected = provider.isConnected();
    } catch (error) {
      isConnected = `error:${error?.code || error?.message || 'unknown'}`;
    }
  }

  return {
    selectedAddress: provider?.selectedAddress || '',
    chainId: provider?.chainId || '',
    isConnected,
    hasMetaMaskApi: typeof provider?._metamask?.isUnlocked === 'function',
  };
}

function formatProviderSnapshot(snapshot = {}) {
  return [
    `selected=${snapshot.selectedAddress || '—'}`,
    `chain=${snapshot.chainId || '—'}`,
    `connected=${formatDebugValue(snapshot.isConnected)}`,
    `metamaskApi=${snapshot.hasMetaMaskApi ? 'yes' : 'no'}`,
  ].join(' · ');
}

function getPassiveRetryCount(reason = '') {
  const match = String(reason).match(/^retry:(\d+):/);
  return match ? Number(match[1]) : 0;
}

async function requestAccountsWithRetry(provider, { attempts = 3, delayMs = 700 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await provider.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      lastError = error;
      if (!isTransientMetaMaskStartupError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}

function relativeTimeFromUnix(timestamp) {
  if (!timestamp) return 'pending';
  const diffSeconds = Math.max(1, Math.floor(Date.now() / 1000 - timestamp));
  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  return `${Math.floor(diffSeconds / 86400)}d`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.5 4a6.5 6.5 0 1 0 4.053 11.58l3.433 3.433 1.414-1.414-3.433-3.433A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor" />
    </svg>
  );
}

function Inscription({ text, size = MATRIX_SIZE, variant = 'preview', fontVersion = 0 }) {
  const textureUrl = useMemo(() => createInscriptionDataUrl(text, size), [text, size, fontVersion]);
  const hoverFillTextureUrl = useMemo(() => createInscriptionDataUrl(text, size, 'hover-fill'), [text, size, fontVersion]);
  const glowTextureUrl = useMemo(() => createInscriptionDataUrl(text, size, 'glow'), [text, size, fontVersion]);

  return (
    <span className={`inscription-shell ${variant}`}>
      <img
        className={`inscription ${variant}`}
        src={textureUrl}
        alt={`${size} by ${size} inscription preview`}
        draggable={false}
      />
      {variant === 'preview' && (
        <>
          <img className="inscription-hover-fill" src={hoverFillTextureUrl} alt="" aria-hidden="true" draggable={false} />
          <img className="inscription-glow" src={glowTextureUrl} alt="" aria-hidden="true" draggable={false} />
        </>
      )}
    </span>
  );
}

export default function Page() {
  const [records, setRecords] = useState([]);
  const [network, setNetwork] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletProbeDone, setWalletProbeDone] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isConnecting, setIsConnecting] = useState(false);
  const [profile, setProfile] = useState(null);
  const connectPromiseRef = useRef(null);
  const connectInFlightRef = useRef(false);
  const probeInFlightRef = useRef(false);
  const probeRequestIdRef = useRef(0);
  const queuedProbeReasonRef = useRef('');
  const walletAddressRef = useRef('');
  const [walletDebug, setWalletDebug] = useState({
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
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [composeText, setComposeText] = useState('');
  const [composeState, setComposeState] = useState({ loading: false, message: '' });
  const [fontVersion, setFontVersion] = useState(0);
  const [activePanel, setActivePanel] = useState('');

  const connectedWalletAddress = connectionStatus === 'connected' ? walletAddress : '';
  const activeProfile = connectionStatus === 'connected' ? profile : null;
  const isWriter = Boolean(activeProfile?.onchainApproved);
  const profileRecords = activeProfile?.records || [];
  const displayedRecords = searchResults === null ? records : searchResults;

  const appendProbeTrace = (label, detail = '') => {
    const entry = detail ? `${label} · ${detail}` : label;
    setWalletDebug((current) => ({
      ...current,
      probeTrace: [...current.probeTrace.slice(-6), entry],
    }));
  };

  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  useEffect(() => {
    if (connectionStatus === 'connected') return;
    setActivePanel((current) => (current === 'menu' || current === 'my-preglyph' || current === 'write' ? '' : current));
  }, [connectionStatus]);

  async function loadRecords() {
    try {
      const response = await fetch('/api/records', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load records.');
      setRecords(payload.records || []);
      setNetwork(payload.network || null);
      setSearchResults(null);
    } catch (error) {
      setRecords([]);
    }
  }

  async function loadProfile(address) {
    if (!address) {
      setProfile(null);
      return;
    }

    try {
      const response = await fetch(`/api/profile/${address}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load profile.');
      setProfile(payload.profile);
    } catch (error) {
      setProfile(null);
    }
  }

  async function ensureWriterReady(address) {
    if (!address) return false;

    const response = await fetch('/api/writers/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to enable writing.');
    return true;
  }

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveRecord(null);
        setActivePanel('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return undefined;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontVersion((current) => current + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) return;
    setSearchResults(null);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    let activeProvider = null;
    let lifecycleRetryTimeout = null;

    const clearScheduledSync = () => {
      if (lifecycleRetryTimeout) {
        clearTimeout(lifecycleRetryTimeout);
        lifecycleRetryTimeout = null;
      }
    };

    const scheduleSync = (reason, delayMs = 0) => {
      if (cancelled || connectInFlightRef.current) return;
      clearScheduledSync();
      lifecycleRetryTimeout = setTimeout(() => {
        lifecycleRetryTimeout = null;
        if (!cancelled) syncWalletState(reason);
      }, delayMs);
    };

    const syncWalletState = async (reason = 'mount') => {
      if (!activeProvider || connectInFlightRef.current) return;
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
        const accounts = await activeProvider.request({ method: 'eth_accounts' });
        if (cancelled || requestId !== probeRequestIdRef.current) return;
        const successSnapshot = readProviderSnapshot(activeProvider);
        appendProbeTrace(
          'eth_accounts:success',
          `accounts=${formatDebugValue(accounts)} · ${formatProviderSnapshot(successSnapshot)}`,
        );

        const nextAddress = accounts?.[0] || '';
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: activeProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: activeProvider?.selectedAddress || nextAddress,
          chainId: activeProvider?.chainId || '',
          probeStatus: nextAddress ? 'connected' : 'disconnected',
          lastEthAccounts: accounts || [],
          lastPermissions: [],
          lastErrorCode: '',
          lastErrorMessage: '',
          lastErrorDetail: '',
          lastEvent: `probe:success:${reason}`,
        }));
        setWalletAddress(nextAddress);
        setConnectionStatus(nextAddress ? 'connected' : 'disconnected');
        setActivePanel((current) => (!nextAddress && (current === 'my-preglyph' || current === 'menu') ? '' : current));
        if (!nextAddress) {
          setProfile(null);
        }
        await loadProfile(nextAddress);
      } catch (error) {
        if (cancelled || requestId !== probeRequestIdRef.current) return;
        const passiveErrorDetail = extractMetaMaskErrorDetail(error);
        const retryCount = getPassiveRetryCount(reason);
        const baseReason = reason.replace(/^retry:\d+:/, '');
        const allowRetry = baseReason === 'chainChanged' && Boolean(walletAddressRef.current);
        const retryable = isTransientMetaMaskStartupError(error) && allowRetry && retryCount < 1;
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
      const metamaskProvider = await waitForMetaMaskProvider(2500);
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
          setProfile(null);
        }
        setWalletProbeDone(true);
        setActivePanel((current) => (!nextAddress && (current === 'my-preglyph' || current === 'menu') ? '' : current));
        loadProfile(nextAddress);
      };

      const handleChainChanged = () => {
        setWalletDebug((current) => ({
          ...current,
          chainId: metamaskProvider?.chainId || '',
          lastEvent: 'event:chainChanged',
        }));
        loadRecords();
        if (walletAddressRef.current) {
          scheduleSync('chainChanged', 800);
        }
      };

      metamaskProvider.on?.('accountsChanged', handleAccountsChanged);
      metamaskProvider.on?.('chainChanged', handleChainChanged);

      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: metamaskProvider?.selectedAddress || '',
        chainId: metamaskProvider?.chainId || '',
        lastPermissions: [],
        lastEvent: 'probe:provider_ready:idle',
      }));

      setConnectionStatus('disconnected');
      setWalletProbeDone(true);

      return () => {
        metamaskProvider.removeListener?.('accountsChanged', handleAccountsChanged);
        metamaskProvider.removeListener?.('chainChanged', handleChainChanged);
      };
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

  async function ensureWalletOnExpectedChain(provider, metamaskProvider) {
    const networkInfo = await provider.getNetwork();
    if (Number(networkInfo.chainId) === CLIENT_CHAIN_ID) return;

    const chainHex = `0x${CLIENT_CHAIN_ID.toString(16)}`;
    try {
      await metamaskProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainHex }],
      });
    } catch (error) {
      if (error?.code !== 4902) throw error;
      await metamaskProvider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainHex,
            chainName: CLIENT_CHAIN_NAME,
            rpcUrls: [CLIENT_RPC_URL],
            nativeCurrency: {
              name: 'Ether',
              symbol: CLIENT_CURRENCY_SYMBOL,
              decimals: 18,
            },
          },
        ],
      });
    }
  }

  async function handleConnectWallet() {
    const metamaskProvider = getMetaMaskProvider();
    if (!metamaskProvider) {
      openMetaMaskInstall();
      if (typeof window !== 'undefined') {
        window.alert('MetaMask is required to continue.');
      }
      return '';
    }

    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    const hydrateConnectedWallet = async (accounts) => {
      const nextAddress = accounts?.[0] || '';
      if (!nextAddress) {
        throw new Error('MetaMask did not return a wallet address.');
      }
      setWalletAddress(nextAddress);
      setConnectionStatus('connected');
      setActivePanel('');
      setWalletProbeDone(true);
      setWalletDebug((current) => ({
        ...current,
        selectedAddress: nextAddress,
        lastEthAccounts: accounts || [],
        probeStatus: 'connected',
        lastErrorCode: '',
        lastErrorMessage: '',
        lastErrorDetail: '',
        lastEvent: 'connect:hydrated',
      }));
      await loadProfile(nextAddress);
      return nextAddress;
    };

    const connectPromise = (async () => {
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
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: metamaskProvider?.selectedAddress || '',
          chainId: metamaskProvider?.chainId || '',
          lastPermissions: [],
          lastEvent: 'connect:requestAccounts-user-gesture',
        }));

        const accounts = await requestAccountsWithRetry(metamaskProvider, {
          attempts: 3,
          delayMs: 900,
        });
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: accounts?.[0] || '',
          chainId: metamaskProvider?.chainId || '',
          lastEthAccounts: accounts || [],
          lastPermissions: [],
          probeStatus: accounts?.[0] ? 'connected' : 'disconnected',
          lastEvent: 'connect:requestAccounts-success',
        }));
        return await hydrateConnectedWallet(accounts);
      } catch (error) {
        const connectErrorDetail = extractMetaMaskErrorDetail(error);
        if (error?.code !== 4001 && error?.code !== -32002 && isTransientMetaMaskStartupError(error)) {
          try {
            const fallbackAccounts = await requestWithRetry(metamaskProvider, 'eth_accounts', { attempts: 2, delayMs: 250 });
            if (fallbackAccounts?.[0]) {
              setWalletDebug((current) => ({
                ...current,
                selectedAddress: fallbackAccounts?.[0] || '',
                lastEthAccounts: fallbackAccounts || [],
                probeStatus: 'connected',
                lastEvent: 'connect:fallback-eth_accounts',
              }));
              return await hydrateConnectedWallet(fallbackAccounts);
            }
          } catch {}
        }

        setConnectionStatus(walletAddressRef.current ? 'connected' : 'disconnected');
        if (typeof window !== 'undefined') {
          console.error('MetaMask connect failed', {
            code: error?.code,
            message: error?.message,
            detail: connectErrorDetail,
            rawData: error?.data,
            error,
          });
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
          if (error?.code === 4001) {
            window.alert('MetaMask connection was cancelled.');
          } else if (error?.code === -32002) {
            window.alert('MetaMask already has a pending connection request. Open MetaMask and finish or cancel it first.');
          } else {
            const detail = connectErrorDetail.message || error?.message || 'Wallet connection failed.';
            window.alert(`Connect failed: ${detail}`);
          }
        }
        return '';
      } finally {
        connectInFlightRef.current = false;
        connectPromiseRef.current = null;
        setIsConnecting(false);
      }
    })();

    connectPromiseRef.current = connectPromise;
    return connectPromise;
  }

  async function handleOpenWriteFlow() {
    setComposeState({ loading: false, message: '' });

    let nextAddress = walletAddress;
    if (!nextAddress) {
      nextAddress = await handleConnectWallet();
      if (!nextAddress) return;
    }

    await ensureWriterReady(nextAddress);
    await loadProfile(nextAddress);
    setActivePanel('write');
  }

  async function handleDisconnectWallet() {
    setWalletAddress('');
    setProfile(null);
    setConnectionStatus('disconnected');
    setActivePanel('');
    setWalletProbeDone(true);
    setWalletDebug((current) => ({
      ...current,
      selectedAddress: '',
      lastEthAccounts: [],
      lastEvent: 'disconnect',
      probeStatus: 'disconnected',
      probeTrace: [],
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      await loadRecords();
      return;
    }

    const isTxHash = /^0x([A-Fa-f0-9]{64})$/.test(query);

    try {
      const params = new URLSearchParams(isTxHash ? { txHash: query } : { q: query });
      const response = await fetch(`/api/records/search?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Search failed.');

      if (payload.record) {
        setSearchResults(null);
        setActiveRecord(payload.record);
        return;
      }

      setSearchResults(payload.records || []);
    } catch (error) {
      setSearchResults([]);
    }
  }

  async function handleComposeSubmit(event) {
    event.preventDefault();
    const metamaskProvider = getMetaMaskProvider();
    if (!metamaskProvider) {
      setComposeState({ loading: false, message: 'MetaMask is required to write.' });
      return;
    }
    if (!walletAddress) {
      setComposeState({ loading: false, message: 'Connect a wallet first.' });
      return;
    }
    if (!CLIENT_CONTRACT_ADDRESS) {
      setComposeState({ loading: false, message: 'Contract address is missing. Run the deploy step first.' });
      return;
    }

    const content = composeText.trim();
    if (!content) {
      setComposeState({ loading: false, message: 'Write something first.' });
      return;
    }

    try {
      setComposeState({ loading: true, message: 'Preparing transaction…' });
      await ensureWriterReady(walletAddress);
      const provider = new BrowserProvider(metamaskProvider);
      await ensureWalletOnExpectedChain(provider, metamaskProvider);
      const signer = await provider.getSigner();
      const contract = new Contract(CLIENT_CONTRACT_ADDRESS, PREGlyph_ABI, signer);
      const tx = await contract.writeRecord(content);
      setComposeState({ loading: true, message: `Transaction sent: ${tx.hash}` });
      const receipt = await tx.wait();
      await Promise.all([loadRecords(), loadProfile(walletAddress)]);
      setComposeText('');
      setSearchQuery(receipt.hash);
      setActivePanel('');
      setComposeState({ loading: false, message: `Record confirmed onchain: ${receipt.hash}` });
    } catch (error) {
      setComposeState({ loading: false, message: error.reason || error.shortMessage || error.message || 'Write failed.' });
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Preglyph home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <span className="brand-kicker">Public archive</span>
            <strong>Preglyph</strong>
          </span>
        </a>

        <form className="search-shell" onSubmit={handleSearch}>
          <label className="search-field" aria-label="Search transaction">
            <SearchIcon />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tx hash or content"
            />
          </label>
          <button type="submit" className="ghost-chip icon-chip" aria-label="Search">
            <SearchIcon />
          </button>
        </form>

        <div className="nav nav-actions">
          {connectionStatus === 'connected' && walletAddress ? (
            <div className="profile-menu-shell">
              <button type="button" className="connect-chip" onClick={() => setActivePanel(activePanel === 'menu' ? '' : 'menu')}>
                Profile
              </button>
              {activePanel === 'menu' ? (
                <div className="profile-menu glass-panel" role="menu" aria-label="Profile menu">
                  <button type="button" className="profile-menu-item" onClick={handleOpenWriteFlow}>
                    <span>Write</span>
                    <strong>New record</strong>
                  </button>
                  <button type="button" className="profile-menu-item" onClick={() => setActivePanel('my-preglyph')}>
                    <span>My Preglyph</span>
                    <strong>{profileRecords.length} records</strong>
                  </button>
                  <div className="profile-menu-divider" />
                  <div className="profile-menu-address">
                    <span>Wallet</span>
                    <strong>{truncateAddress(walletAddress)}</strong>
                  </div>
                  <button type="button" className="profile-menu-item danger" onClick={handleDisconnectWallet}>
                    <span>Disconnect</span>
                    <strong>Disconnect</strong>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button type="button" className="connect-chip" onClick={handleConnectWallet} disabled={connectionStatus === 'checking' || isConnecting}>
              {connectionStatus === 'checking' ? 'Checking…' : isConnecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </header>

      <div className="archive-count" aria-label="Total preglyph count">
        <span className="archive-count-label">Total Preglyphs</span>
        <span className="archive-count-value">{records.length}</span>
      </div>

      <section className="debug-panel glass-panel" aria-label="MetaMask debug panel">
        <div className="debug-panel-head">
          <div>
            <p className="eyebrow">Debug</p>
            <h3>Wallet session</h3>
          </div>
          <span className="debug-badge">temporary</span>
        </div>
        <div className="debug-grid">
          <div className="debug-row"><span>provider</span><strong>{walletDebug.providerDetected ? 'detected' : 'missing'}</strong></div>
          <div className="debug-row"><span>provider rdns</span><strong>{walletDebug.providerRdns || '—'}</strong></div>
          <div className="debug-row"><span>probe</span><strong>{walletDebug.probeStatus}</strong></div>
          <div className="debug-row"><span>wallet state</span><strong>{walletAddress || '—'}</strong></div>
          <div className="debug-row"><span>selectedAddress</span><strong>{walletDebug.selectedAddress || '—'}</strong></div>
          <div className="debug-row"><span>chainId</span><strong>{walletDebug.chainId || '—'}</strong></div>
          <div className="debug-row"><span>probe done</span><strong>{walletProbeDone ? 'true' : 'false'}</strong></div>
          <div className="debug-row"><span>isConnecting</span><strong>{isConnecting ? 'true' : 'false'}</strong></div>
          <div className="debug-row"><span>last event</span><strong>{walletDebug.lastEvent}</strong></div>
          <div className="debug-row"><span>last error code</span><strong>{walletDebug.lastErrorCode || '—'}</strong></div>
          <div className="debug-row debug-row-wide"><span>last error message</span><strong>{walletDebug.lastErrorMessage || '—'}</strong></div>
          <div className="debug-row debug-row-wide"><span>last error detail</span><strong>{walletDebug.lastErrorDetail || '—'}</strong></div>
          <div className="debug-row debug-row-wide">
            <span>probe trace</span>
            <div className="debug-trace-list">
              {walletDebug.probeTrace.length ? (
                walletDebug.probeTrace.map((entry, index) => (
                  <code key={`${index}-${entry}`} className="debug-trace-item">{entry}</code>
                ))
              ) : (
                <strong>—</strong>
              )}
            </div>
          </div>
          <div className="debug-row debug-row-wide"><span>eth_accounts</span><strong>{walletDebug.lastEthAccounts.length ? walletDebug.lastEthAccounts.join(', ') : '[]'}</strong></div>
          <div className="debug-row debug-row-wide"><span>permissions</span><strong>{walletDebug.lastPermissions.length ? JSON.stringify(walletDebug.lastPermissions) : '[]'}</strong></div>
          <div className="debug-row debug-row-wide"><span>last error at</span><strong>{walletDebug.lastErrorAt || '—'}</strong></div>
        </div>
      </section>

      <main id="top" className="main-layout">
        {activePanel === 'my-preglyph' && connectionStatus === 'connected' ? (
          <div className="floating-panel glass-panel profile-panel">
            <div className="floating-panel-head">
              <div>
                <p className="eyebrow">My Preglyph</p>
                <h3>{connectedWalletAddress ? truncateAddress(connectedWalletAddress) : 'Connect wallet'}</h3>
              </div>
              <button type="button" className="ghost-chip" onClick={() => setActivePanel('')}>
                Close
              </button>
            </div>
            <div className="profile-grid">
              <div className="glass-subpanel profile-card">
                <p className="eyebrow">Wallet</p>
                <strong>{connectedWalletAddress || 'Not connected'}</strong>
                <span>{activeProfile?.onchainApproved ? 'Ready to write onchain.' : 'Connect to enable writing.'}</span>
                <div className="profile-actions wrap-actions">
                  <button type="button" className="ghost-chip" onClick={handleOpenWriteFlow}>
                    Write
                  </button>
                  <button type="button" className="ghost-chip" onClick={handleDisconnectWallet}>
                    Disconnect MetaMask
                  </button>
                </div>
              </div>
            </div>
            <div className="profile-records">
              <div className="section-row">
                <h4>My writings</h4>
                <span>{profileRecords.length} records</span>
              </div>
              {profileRecords.length ? (
                <div className="profile-record-list">
                  {profileRecords.map((record) => (
                    <button key={`${record.txHash}-${record.id}`} type="button" className="profile-record-item" onClick={() => setActiveRecord(record)}>
                      <strong>{record.content}</strong>
                      <span>{relativeTimeFromUnix(record.createdAt)} · {record.txHash.slice(0, 10)}…</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">No records yet. Connect and write your first permanent record.</p>
              )}
            </div>
          </div>
        ) : null}

        {activePanel === 'write' && connectionStatus === 'connected' ? (
          <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label="Write record">
            <div className="detail-dim" onClick={() => setActivePanel('')} />
            <div className="detail-panel glass-panel write-modal">
              <button type="button" className="detail-close" onClick={() => setActivePanel('')}>
                Close
              </button>
              <div className="floating-panel-head">
                <div>
                  <p className="eyebrow">Write to Ethereum</p>
                  <h3>Write a permanent record</h3>
                </div>
                <span className="gate-pill unlocked">Connected</span>
              </div>
              <form className="compose-form write-modal-form" onSubmit={handleComposeSubmit}>
                <textarea
                  value={composeText}
                  onChange={(event) => setComposeText(event.target.value.slice(0, MAX_RECORD_LENGTH))}
                  placeholder="Write a short permanent public record…"
                />
                <div className="compose-footer">
                  <span>{composeText.length} / {MAX_RECORD_LENGTH}</span>
                  <button type="submit" className="connect-chip" disabled={composeState.loading}>
                    {composeState.loading ? 'Writing…' : 'Write onchain'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <section className="slab-grid" aria-label="Public record slabs">
          {displayedRecords.length ? (
            displayedRecords.map((record) => (
              <button
                key={`${record.txHash}-${record.id}`}
                type="button"
                className="slab-button"
                onClick={() => setActiveRecord(record)}
                aria-label={`Open record by ${record.author}`}
              >
                <Inscription text={record.content} size={MATRIX_SIZE} variant="preview" fontVersion={fontVersion} />
              </button>
            ))
          ) : searchQuery.trim() ? (
            <div className="empty-state glass-panel">
              <p className="eyebrow">No results</p>
              <h3>No records found for that search.</h3>
              <p className="floating-panel-copy">Try a full transaction hash or a different keyword.</p>
            </div>
          ) : (
            <div className="empty-state glass-panel">
              <p className="eyebrow">Archive empty</p>
              <h3>No records yet.</h3>
              <p className="floating-panel-copy">Connect and write the first permanent record.</p>
            </div>
          )}
        </section>
      </main>

      {activeRecord ? (
        <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label="Record detail">
          <div className="detail-dim" onClick={() => setActiveRecord(null)} />
          <div className="detail-panel glass-panel">
            <button type="button" className="detail-close" onClick={() => setActiveRecord(null)}>
              Close
            </button>
            <div className="detail-head simple-head">
              <div className="detail-author-block">
                <p className="eyebrow">Recorded by</p>
                <strong>{truncateAddress(activeRecord.author)}</strong>
              </div>
              <div className="detail-time-block">
                <p className="eyebrow">Recorded at</p>
                <span>{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(activeRecord.createdAt * 1000))}</span>
              </div>
            </div>
            <div className="detail-tx glass-subpanel">
              <p className="eyebrow">Transaction</p>
              <code>{activeRecord.txHash}</code>
            </div>
            <div className="detail-copy glass-subpanel">
              <p className="eyebrow">Plain text</p>
              <strong>{activeRecord.content}</strong>
            </div>
            <div className="detail-body stacked-detail">
              <div className="detail-slab-wrap full-width detail-3d-stage">
                <DetailSlab3D text={activeRecord.content} fontVersion={fontVersion} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

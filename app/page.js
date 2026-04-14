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

function getPermissionAccounts(permissions = []) {
  const ethAccountsPermission = Array.isArray(permissions)
    ? permissions.find((permission) => permission?.parentCapability === 'eth_accounts')
    : null;
  const restrictReturnedAccounts = ethAccountsPermission?.caveats?.find(
    (caveat) => caveat?.type === 'restrictReturnedAccounts',
  );
  return Array.isArray(restrictReturnedAccounts?.value) ? restrictReturnedAccounts.value : [];
}

async function requestWithRetry(provider, method, { attempts = 3, delayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await provider.request({ method });
    } catch (error) {
      lastError = error;
      const isRetriableInternalError = error?.code === -32603;
      if (!isRetriableInternalError || attempt === attempts) {
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [profile, setProfile] = useState(null);
  const connectPromiseRef = useRef(null);
  const probeRetryTimeoutRef = useRef(null);
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
    lastErrorAt: '',
    lastEvent: 'init',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [composeText, setComposeText] = useState('');
  const [composeState, setComposeState] = useState({ loading: false, message: '' });
  const [fontVersion, setFontVersion] = useState(0);
  const [activePanel, setActivePanel] = useState('');

  const isWriter = Boolean(profile?.onchainApproved);
  const profileRecords = profile?.records || [];
  const displayedRecords = searchResults === null ? records : searchResults;

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
    setWalletProbeDone(false);
    const metamaskProvider = getMetaMaskProvider();
    if (!metamaskProvider) {
      setWalletDebug((current) => ({
        ...current,
        providerDetected: false,
        providerRdns: '',
        selectedAddress: '',
        chainId: '',
        probeStatus: 'no_provider',
        lastEvent: 'probe:no_provider',
      }));
      setWalletProbeDone(true);
      return undefined;
    }

    let cancelled = false;

    const clearProbeRetry = () => {
      if (probeRetryTimeoutRef.current) {
        clearTimeout(probeRetryTimeoutRef.current);
        probeRetryTimeoutRef.current = null;
      }
    };

    const snapshotProvider = async (eventLabel, extra = {}) => {
      let permissions = [];
      try {
        permissions = await requestWithRetry(metamaskProvider, 'wallet_getPermissions', { attempts: 2, delayMs: 200 });
      } catch {}

      if (cancelled) return;

      setWalletDebug((current) => ({
        ...current,
        providerDetected: true,
        providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
        selectedAddress: metamaskProvider?.selectedAddress || '',
        chainId: metamaskProvider?.chainId || '',
        lastPermissions: permissions,
        lastEvent: eventLabel,
        ...extra,
      }));
    };

    const syncWalletState = async () => {
      clearProbeRetry();
      setWalletDebug((current) => ({ ...current, probeStatus: 'probing', lastEvent: 'probe:start' }));
      let shouldFinalizeProbe = true;
      try {
        const accounts = await requestWithRetry(metamaskProvider, 'eth_accounts', { attempts: 4, delayMs: 300 });
        if (cancelled) return;
        let permissions = [];
        try {
          permissions = await requestWithRetry(metamaskProvider, 'wallet_getPermissions', { attempts: 2, delayMs: 200 });
        } catch {}
        const permissionAccounts = getPermissionAccounts(permissions);
        const resolvedAccounts = accounts?.[0] ? accounts : permissionAccounts;
        const nextAddress = resolvedAccounts?.[0] || '';
        await snapshotProvider('probe:success', {
          probeStatus: nextAddress ? 'connected' : 'disconnected',
          lastEthAccounts: resolvedAccounts || [],
          lastPermissions: permissions,
          lastErrorCode: '',
          lastErrorMessage: '',
        });
        setWalletAddress(nextAddress);
        setActivePanel((current) => (nextAddress ? current || 'profile' : current === 'profile' ? '' : current));
        await loadProfile(nextAddress);
      } catch (error) {
        if (cancelled) return;
        await snapshotProvider('probe:error', {
          probeStatus: error?.code === -32603 ? 'retrying' : 'error',
          lastErrorCode: String(error?.code || ''),
          lastErrorMessage: error?.message || 'Unknown probe error',
          lastErrorAt: new Date().toISOString(),
        });
        if (error?.code === -32603) {
          shouldFinalizeProbe = false;
          probeRetryTimeoutRef.current = setTimeout(() => {
            if (!cancelled) syncWalletState();
          }, 1200);
          return;
        }
        setWalletAddress('');
        setProfile(null);
      } finally {
        if (!cancelled && shouldFinalizeProbe) setWalletProbeDone(true);
      }
    };

    const handleAccountsChanged = (accounts) => {
      const nextAddress = accounts?.[0] || '';
      setWalletDebug((current) => ({
        ...current,
        selectedAddress: nextAddress,
        lastEthAccounts: accounts || [],
        probeStatus: nextAddress ? 'connected' : 'disconnected',
        lastEvent: 'event:accountsChanged',
      }));
      setWalletAddress(nextAddress);
      setActivePanel((current) => (nextAddress ? current || 'profile' : current === 'profile' ? '' : current));
      loadProfile(nextAddress);
    };

    const handleChainChanged = () => {
      setWalletDebug((current) => ({
        ...current,
        chainId: metamaskProvider?.chainId || '',
        lastEvent: 'event:chainChanged',
      }));
      setWalletProbeDone(false);
      loadRecords();
      syncWalletState();
    };

    const handleWindowFocus = () => {
      setWalletDebug((current) => ({ ...current, lastEvent: 'event:focus' }));
      setWalletProbeDone(false);
      syncWalletState();
    };

    const handlePageShow = () => {
      setWalletDebug((current) => ({ ...current, lastEvent: 'event:pageshow' }));
      setWalletProbeDone(false);
      syncWalletState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setWalletDebug((current) => ({ ...current, lastEvent: 'event:visibilitychange' }));
      setWalletProbeDone(false);
      syncWalletState();
    };

    syncWalletState();
    metamaskProvider.on?.('accountsChanged', handleAccountsChanged);
    metamaskProvider.on?.('chainChanged', handleChainChanged);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearProbeRetry();
      metamaskProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      metamaskProvider.removeListener?.('chainChanged', handleChainChanged);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      setActivePanel('profile');
      setWalletProbeDone(true);
      await loadProfile(nextAddress);
      return nextAddress;
    };

    const connectPromise = (async () => {
      setIsConnecting(true);
      setWalletDebug((current) => ({
        ...current,
        lastEvent: 'connect:start',
        lastErrorCode: '',
        lastErrorMessage: '',
      }));
      try {
        const existingAccounts = await requestWithRetry(metamaskProvider, 'eth_accounts', { attempts: 3, delayMs: 250 });
        let permissions = [];
        try {
          permissions = await requestWithRetry(metamaskProvider, 'wallet_getPermissions', { attempts: 2, delayMs: 200 });
        } catch {}
        const permissionAccounts = getPermissionAccounts(permissions);
        const reusableAccounts = existingAccounts?.[0] ? existingAccounts : permissionAccounts;
        if (reusableAccounts?.[0]) {
          setWalletDebug((current) => ({
            ...current,
            providerDetected: true,
            providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
            selectedAddress: reusableAccounts?.[0] || '',
            chainId: metamaskProvider?.chainId || '',
            lastEthAccounts: reusableAccounts || [],
            lastPermissions: permissions,
            probeStatus: 'connected',
            lastEvent: 'connect:reuse-existing',
          }));
          return hydrateConnectedWallet(reusableAccounts);
        }

        const accounts = await requestWithRetry(metamaskProvider, 'eth_requestAccounts', { attempts: 2, delayMs: 400 });
        let requestPermissions = [];
        try {
          requestPermissions = await requestWithRetry(metamaskProvider, 'wallet_getPermissions', { attempts: 2, delayMs: 200 });
        } catch {}
        setWalletDebug((current) => ({
          ...current,
          providerDetected: true,
          providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
          selectedAddress: accounts?.[0] || '',
          chainId: metamaskProvider?.chainId || '',
          lastEthAccounts: accounts || [],
          lastPermissions: requestPermissions,
          probeStatus: accounts?.[0] ? 'connected' : 'disconnected',
          lastEvent: 'connect:requestAccounts-success',
        }));
        return hydrateConnectedWallet(accounts);
      } catch (error) {
        try {
          const fallbackAccounts = await requestWithRetry(metamaskProvider, 'eth_accounts', { attempts: 3, delayMs: 250 });
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

        if (typeof window !== 'undefined') {
          let permissions = [];
          try {
            permissions = await requestWithRetry(metamaskProvider, 'wallet_getPermissions', { attempts: 2, delayMs: 200 });
          } catch {}

          console.error('MetaMask connect failed', {
            code: error?.code,
            message: error?.message,
            permissions,
            error,
          });
          setWalletDebug((current) => ({
            ...current,
            providerDetected: true,
            providerRdns: metamaskProvider?.providerInfo?.rdns || 'io.metamask?',
            selectedAddress: metamaskProvider?.selectedAddress || '',
            chainId: metamaskProvider?.chainId || '',
            lastPermissions: permissions,
            lastErrorCode: String(error?.code || ''),
            lastErrorMessage: error?.message || 'Unexpected error',
            lastErrorAt: new Date().toISOString(),
            lastEvent: 'connect:error',
            probeStatus: 'error',
          }));
          if (error?.code === 4001) {
            window.alert('MetaMask connection was cancelled.');
          } else if (error?.code === -32002) {
            window.alert('MetaMask already has a pending connection request. Open MetaMask and finish or cancel it first.');
          } else {
            const detail = error?.message || 'Wallet connection failed.';
            window.alert(`Connect failed: ${detail}`);
          }
        }
        return '';
      } finally {
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
    const metamaskProvider = getMetaMaskProvider();

    try {
      await metamaskProvider?.request?.({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Some MetaMask builds do not support programmatic revoke; local disconnect still applies.
    }

    setWalletAddress('');
    setProfile(null);
    setActivePanel('');
    setWalletProbeDone(true);
    setWalletDebug((current) => ({
      ...current,
      selectedAddress: '',
      lastEthAccounts: [],
      lastEvent: 'disconnect',
      probeStatus: 'disconnected',
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
          <button type="button" className="nav-link" onClick={handleOpenWriteFlow}>
            Write
          </button>
          {walletAddress ? (
            <button type="button" className="connect-chip" onClick={() => setActivePanel(activePanel === 'profile' ? '' : 'profile')}>
              Profile
            </button>
          ) : (
            <button type="button" className="connect-chip" onClick={handleConnectWallet} disabled={!walletProbeDone || isConnecting}>
              {!walletProbeDone ? 'Checking…' : isConnecting ? 'Connecting…' : 'Connect'}
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
          <div className="debug-row debug-row-wide"><span>eth_accounts</span><strong>{walletDebug.lastEthAccounts.length ? walletDebug.lastEthAccounts.join(', ') : '[]'}</strong></div>
          <div className="debug-row debug-row-wide"><span>permissions</span><strong>{walletDebug.lastPermissions.length ? JSON.stringify(walletDebug.lastPermissions) : '[]'}</strong></div>
          <div className="debug-row debug-row-wide"><span>last error at</span><strong>{walletDebug.lastErrorAt || '—'}</strong></div>
        </div>
      </section>

      <main id="top" className="main-layout">
        {activePanel === 'profile' ? (
          <div className="floating-panel glass-panel profile-panel">
            <div className="floating-panel-head">
              <div>
                <p className="eyebrow">Profile</p>
                <h3>{walletAddress ? truncateAddress(walletAddress) : 'Connect wallet'}</h3>
              </div>
              <button type="button" className="ghost-chip" onClick={() => setActivePanel('')}>
                Close
              </button>
            </div>
            <div className="profile-grid">
              <div className="glass-subpanel profile-card">
                <p className="eyebrow">Wallet</p>
                <strong>{walletAddress || 'Not connected'}</strong>
                <span>{profile?.onchainApproved ? 'Ready to write onchain.' : 'Connect to enable writing.'}</span>
                <div className="profile-actions">
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

        {activePanel === 'write' ? (
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

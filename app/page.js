'use client';

import { BrowserProvider, Contract } from 'ethers';
import { useEffect, useMemo, useRef, useState } from 'react';
import DetailSlab3D from './components/DetailSlab3D';
import { MATRIX_SIZE, createInscriptionDataUrl } from './components/inscriptionTexture';
import PREGlyph_ABI from '@/lib/preglyphAbi.cjs';
import {
  ensureWalletOnExpectedChain,
  extractMetaMaskErrorDetail,
  openMetaMaskInstall,
} from '@/lib/wallet/metamask-connector.mjs';
import { useMetaMaskSession } from '@/lib/wallet/useMetaMaskSession';

const CLIENT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_ID || 31337);
const CLIENT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS || '';
const CLIENT_RPC_URL = process.env.NEXT_PUBLIC_PREGLYPH_RPC_HTTP_URL || 'http://127.0.0.1:8545';
const CLIENT_CHAIN_NAME = process.env.NEXT_PUBLIC_PREGLYPH_CHAIN_NAME || 'Preglyph Testchain';
const CLIENT_CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_PREGLYPH_CURRENCY_SYMBOL || 'ETH';
const WRITE_PREVIEW_SIZE = 10;
const MAX_RECORD_LENGTH = 280;

function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
  const [profile, setProfile] = useState(null);
  const {
    walletAddress,
    connectedWalletAddress,
    walletProbeDone,
    connectionStatus,
    isConnecting,
    walletDebug,
    chainChangeCount,
    connect: connectWalletSession,
    disconnect: disconnectWalletSession,
    getConnectedProvider,
  } = useMetaMaskSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [recordView, setRecordView] = useState('all');
  const [composeText, setComposeText] = useState('');
  const [composeState, setComposeState] = useState({ loading: false, message: '' });
  const [fontVersion, setFontVersion] = useState(0);
  const [activePanel, setActivePanel] = useState('');
  const profileRequestIdRef = useRef(0);
  const connectedWalletAddressRef = useRef('');
  const profileMenuShellRef = useRef(null);

  const activeProfile = connectionStatus === 'connected' && walletProbeDone ? profile : null;
  const isWalletConnected = connectionStatus === 'connected' && walletProbeDone;
  const isWriter = Boolean(activeProfile?.onchainApproved);
  const profileRecords = activeProfile?.records || [];
  const displayedRecords = recordView === 'mine' ? profileRecords : (searchResults === null ? records : searchResults);
  const showWalletDebug = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (connectionStatus === 'connected') return;
    setActivePanel((current) => (current === 'menu' || current === 'write' ? '' : current));
    setRecordView('all');
  }, [connectionStatus]);

  useEffect(() => {
    if (activePanel !== 'menu') return undefined;

    function handlePointerDown(event) {
      if (profileMenuShellRef.current?.contains(event.target)) {
        return;
      }
      setActivePanel('');
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [activePanel]);

  useEffect(() => {
    connectedWalletAddressRef.current = connectedWalletAddress;
  }, [connectedWalletAddress]);

  useEffect(() => {
    profileRequestIdRef.current += 1;
    setProfile(null);
    if (!connectedWalletAddress) {
      return;
    }

    loadProfile(connectedWalletAddress);
  }, [connectedWalletAddress]);

  useEffect(() => {
    if (!chainChangeCount) return;
    loadRecords();
    if (connectedWalletAddress) {
      loadProfile(connectedWalletAddress);
    }
  }, [chainChangeCount, connectedWalletAddress]);

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
      profileRequestIdRef.current += 1;
      setProfile(null);
      return;
    }

    const requestId = ++profileRequestIdRef.current;

    try {
      const response = await fetch(`/api/profile/${address}`, { cache: 'no-store' });
      const payload = await response.json();
      if (requestId !== profileRequestIdRef.current) return;
      if (!response.ok) throw new Error(payload.error || 'Failed to load profile.');
      setProfile(payload.profile);
    } catch (error) {
      if (requestId !== profileRequestIdRef.current) return;
      setProfile(null);
    }
  }

  async function ensureWriterReady(address) {
    if (!address) {
      throw new Error('Connect a wallet first.');
    }

    const response = await fetch(`/api/profile/${address}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load writer status.');

    const profileData = payload.profile || null;
    if (!profileData?.onchainApproved) {
      throw new Error('Presence verification is required before writing.');
    }

    return profileData;
  }

  function isCurrentConnectedAddress(address) {
    return Boolean(address) && connectedWalletAddressRef.current?.toLowerCase() === address.toLowerCase();
  }

  function applyProfileForCurrentAddress(address, profileData) {
    if (!isCurrentConnectedAddress(address)) return false;
    profileRequestIdRef.current += 1;
    setProfile(profileData);
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

  async function handleConnectWallet() {
    try {
      const nextAddress = await connectWalletSession();
      connectedWalletAddressRef.current = nextAddress;
      return nextAddress;
    } catch (error) {
      if (error?.code === 'NO_PROVIDER') {
        openMetaMaskInstall();
        if (typeof window !== 'undefined') {
          window.alert('MetaMask is required to continue.');
        }
        return '';
      }

      const connectErrorDetail = extractMetaMaskErrorDetail(error);
      if (typeof window !== 'undefined') {
        console.error('MetaMask connect failed', {
          code: error?.code,
          message: error?.message,
          detail: connectErrorDetail,
          rawData: error?.data,
          error,
        });

        if (error?.code === 4001) {
          window.alert('MetaMask connection was cancelled.');
        } else if (error?.code === -32002) {
          window.alert('MetaMask already has a pending connection request. Open MetaMask and finish or cancel it first.');
        } else if (error?.code === -32603) {
          const guidance = error?.metaMaskUnlocked === false
            ? 'MetaMask is locked. Unlock MetaMask first, then try again.'
            : 'MetaMask did not complete the request. Open the MetaMask extension, make sure it is unlocked, then try again.';
          window.alert(guidance);
        } else {
          const detail = connectErrorDetail.message || error?.message || 'Wallet connection failed.';
          window.alert(`Connect failed: ${detail}`);
        }
      }

      return '';
    }
  }

  async function handleDisconnectWallet() {
    profileRequestIdRef.current += 1;
    await disconnectWalletSession();
    setProfile(null);
    setActivePanel('');
  }

  async function handleOpenWriteFlow() {
    setComposeState({ loading: false, message: '' });

    try {
      let nextAddress = isWalletConnected ? walletAddress : '';
      if (!nextAddress) {
        nextAddress = await handleConnectWallet();
        if (!nextAddress) return;
        connectedWalletAddressRef.current = nextAddress;
      }

      const profileData = await ensureWriterReady(nextAddress);
      if (!applyProfileForCurrentAddress(nextAddress, profileData)) return;

      await loadProfile(nextAddress);
      if (!isCurrentConnectedAddress(nextAddress)) return;
      setActivePanel('write');
    } catch (error) {
      setComposeState({ loading: false, message: error?.message || 'Presence verification is required before writing.' });
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setRecordView('all');
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

      setRecordView('all');
      if (payload.record) {
        setSearchResults(null);
        setActiveRecord(payload.record);
        return;
      }

      setSearchResults(payload.records || []);
    } catch (error) {
      setRecordView('all');
      setSearchResults([]);
    }
  }

  function handleShowMyPreglyph() {
    setSearchQuery('');
    setSearchResults(null);
    setActivePanel('');
    setRecordView('mine');
  }

  function handleClearRecordView() {
    setRecordView('all');
  }

  async function handleComposeSubmit(event) {
    event.preventDefault();
    const metamaskProvider = await getConnectedProvider();
    if (!metamaskProvider) {
      setComposeState({ loading: false, message: 'MetaMask is required to write.' });
      return;
    }
    if (!isWalletConnected) {
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
      const currentAddress = walletAddress;
      const profileData = await ensureWriterReady(currentAddress);
      if (!applyProfileForCurrentAddress(currentAddress, profileData)) {
        setComposeState({ loading: false, message: 'Wallet session changed. Please try again.' });
        return;
      }
      const provider = new BrowserProvider(metamaskProvider);
      await ensureWalletOnExpectedChain({
        metamaskProvider,
        chainId: CLIENT_CHAIN_ID,
        chainName: CLIENT_CHAIN_NAME,
        rpcUrl: CLIENT_RPC_URL,
        currencySymbol: CLIENT_CURRENCY_SYMBOL,
      });
      if (!isCurrentConnectedAddress(currentAddress)) {
        setComposeState({ loading: false, message: 'Wallet session changed. Please try again.' });
        return;
      }
      const signer = await provider.getSigner();
      const contract = new Contract(CLIENT_CONTRACT_ADDRESS, PREGlyph_ABI, signer);
      const tx = await contract.writeRecord(content);
      setComposeState({ loading: true, message: `Transaction sent: ${tx.hash}` });
      const receipt = await tx.wait();
      if (!isCurrentConnectedAddress(currentAddress)) {
        setComposeState({ loading: false, message: 'Wallet session changed before confirmation.' });
        return;
      }
      await Promise.all([loadRecords(), loadProfile(currentAddress)]);
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
          {isWalletConnected ? (
            <div className="profile-menu-shell" ref={profileMenuShellRef}>
              <button type="button" className="connect-chip" onClick={() => setActivePanel(activePanel === 'menu' ? '' : 'menu')}>
                Profile
              </button>
              {activePanel === 'menu' ? (
                <div className="profile-menu glass-panel" role="menu" aria-label="Profile menu">
                  <div className="profile-menu-address">
                    <span>Wallet</span>
                    <strong>{truncateAddress(walletAddress)}</strong>
                  </div>
                  <div className="profile-menu-divider" />
                  <button type="button" className="profile-menu-item" onClick={handleOpenWriteFlow} disabled={!isWriter}>
                    <span>Write</span>
                    <strong>{isWriter ? 'New Preglyph' : 'Presence required'}</strong>
                  </button>
                  <button type="button" className="profile-menu-item" onClick={handleShowMyPreglyph}>
                    <span>My Preglyph</span>
                    <strong>{profileRecords.length}</strong>
                  </button>
                  <button type="button" className="profile-menu-item danger" onClick={handleDisconnectWallet}>
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

      {composeState.message ? (
        <section className="glass-panel status-banner" aria-live="polite">
          <strong>{composeState.loading ? 'Working' : 'Status'}</strong>
          <span>{composeState.message}</span>
        </section>
      ) : null}

      {showWalletDebug ? (
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
      ) : null}

      <main id="top" className="main-layout">
        {recordView === 'mine' && isWalletConnected ? (
          <section className="glass-panel status-banner status-banner-row" aria-live="polite">
            <div className="status-banner-copy">
              <strong>My Preglyph</strong>
              <span>{profileRecords.length} records</span>
            </div>
            <button type="button" className="ghost-chip icon-chip" onClick={handleClearRecordView} aria-label="Show all records">
              ×
            </button>
          </section>
        ) : null}

        {activePanel === 'write' && isWalletConnected ? (
          <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label="Write record">
            <div className="detail-dim" onClick={() => setActivePanel('')} />
            <div className="detail-panel glass-panel write-modal">
              <div className="floating-panel-head">
                <div>
                  <p className="eyebrow">Preglyph</p>
                  <h3>Write a permanent record</h3>
                </div>
                <button type="button" className="detail-close" onClick={() => setActivePanel('')} aria-label="Close write modal">
                  ×
                </button>
              </div>
              <form className="compose-form write-modal-form" onSubmit={handleComposeSubmit}>
                <div className="write-preview-block">
                  <div className="write-preview-shell glass-subpanel">
                    <Inscription text={composeText.trim() || ' '} size={WRITE_PREVIEW_SIZE} variant="preview" fontVersion={fontVersion} />
                  </div>
                </div>
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

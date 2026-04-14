'use client';

import { BrowserProvider, Contract } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
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

function CenterModal({ title, body, onClose }) {
  return (
    <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="detail-dim" onClick={onClose} />
      <div className="detail-panel glass-panel info-modal">
        <button type="button" className="detail-close" onClick={onClose}>
          Close
        </button>
        <div className="floating-panel-head">
          <div>
            <p className="eyebrow">Preglyph</p>
            <h3>{title}</h3>
          </div>
        </div>
        <p className="floating-panel-copy">{body}</p>
      </div>
    </div>
  );
}

export default function Page() {
  const [records, setRecords] = useState([]);
  const [network, setNetwork] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [profile, setProfile] = useState(null);
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
    const metamaskProvider = getMetaMaskProvider();
    if (!metamaskProvider) return undefined;

    const handleAccountsChanged = (accounts) => {
      const nextAddress = accounts?.[0] || '';
      setWalletAddress(nextAddress);
      setActivePanel(nextAddress ? 'profile' : '');
      loadProfile(nextAddress);
    };

    const handleChainChanged = () => {
      loadRecords();
      if (walletAddress) loadProfile(walletAddress);
    };

    metamaskProvider.request({ method: 'eth_accounts' }).then(handleAccountsChanged).catch(() => {});
    metamaskProvider.on?.('accountsChanged', handleAccountsChanged);
    metamaskProvider.on?.('chainChanged', handleChainChanged);

    return () => {
      metamaskProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      metamaskProvider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [walletAddress]);

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

    try {
      const accounts = await metamaskProvider.request({ method: 'eth_requestAccounts' });
      const nextAddress = accounts?.[0] || '';
      if (!nextAddress) {
        throw new Error('MetaMask did not return a wallet address.');
      }
      const provider = new BrowserProvider(metamaskProvider);
      await ensureWalletOnExpectedChain(provider, metamaskProvider);
      await ensureWriterReady(nextAddress);
      setWalletAddress(nextAddress);
      setActivePanel('profile');
      await loadProfile(nextAddress);
      return nextAddress;
    } catch (error) {
      if (typeof window !== 'undefined') {
        if (error?.code === 4001) {
          window.alert('MetaMask connection was cancelled.');
        } else {
          window.alert(error.message || 'Wallet connection failed.');
        }
      }
      return '';
    }
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
          <button type="button" className="nav-link" onClick={() => setActivePanel(activePanel === 'how' ? '' : 'how')}>
            How it works
          </button>
          <button type="button" className="nav-link" onClick={handleOpenWriteFlow}>
            Write
          </button>
          {walletAddress ? (
            <button type="button" className="connect-chip" onClick={() => setActivePanel(activePanel === 'profile' ? '' : 'profile')}>
              Profile
            </button>
          ) : (
            <button type="button" className="connect-chip" onClick={handleConnectWallet}>
              Connect
            </button>
          )}
        </div>
      </header>

      <main id="top" className="main-layout">

        {activePanel === 'how' ? (
          <CenterModal
            title="How it works"
            body="1. Connect with MetaMask. 2. Open Write. 3. Sign the transaction. 4. Your record is written to Ethereum. 5. Search by tx hash or record text and revisit your archive from Profile."
            onClose={() => setActivePanel('')}
          />
        ) : null}
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

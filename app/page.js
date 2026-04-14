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
const ABOUT_COPY =
  'Preglyph is a public archive where only Presence-passed humans can leave short permanent records on Ethereum.';

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

function formatRecordedAt(timestampOrRelative) {
  if (!timestampOrRelative) return '—';
  if (typeof timestampOrRelative === 'number') {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestampOrRelative * 1000));
  }
  return timestampOrRelative;
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

function Panel({ title, body, onClose }) {
  return (
    <div className="floating-panel glass-panel">
      <div className="floating-panel-head">
        <div>
          <p className="eyebrow">Preglyph</p>
          <h3>{title}</h3>
        </div>
        <button type="button" className="ghost-chip" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="floating-panel-copy">{body}</p>
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
  const [searchStatus, setSearchStatus] = useState('');
  const [composeText, setComposeText] = useState('');
  const [composeState, setComposeState] = useState({ loading: false, message: '' });
  const [claimState, setClaimState] = useState({ loading: false, message: '' });
  const [presenceRequest, setPresenceRequest] = useState(null);
  const [liveProofText, setLiveProofText] = useState('');
  const [fontVersion, setFontVersion] = useState(0);
  const [activePanel, setActivePanel] = useState('');

  const isWriter = Boolean(profile?.presence?.passed && profile?.onchainApproved);
  const profileRecords = profile?.records || [];

  async function loadRecords() {
    try {
      const response = await fetch('/api/records', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load records.');
      setRecords(payload.records || []);
      setNetwork(payload.network || null);
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
      setClaimState({ loading: false, message: 'MetaMask is required. Opening MetaMask…' });
      openMetaMaskInstall();
      return '';
    }

    try {
      const accounts = await metamaskProvider.request({ method: 'eth_requestAccounts' });
      const nextAddress = accounts?.[0] || '';
      const provider = new BrowserProvider(metamaskProvider);
      await ensureWalletOnExpectedChain(provider, metamaskProvider);
      setWalletAddress(nextAddress);
      setActivePanel('profile');
      await loadProfile(nextAddress);
      return nextAddress;
    } catch (error) {
      setClaimState({ loading: false, message: error.message || 'Wallet connection failed.' });
      return '';
    }
  }

  async function handlePresenceClaim() {
    if (!walletAddress) {
      setClaimState({ loading: false, message: 'Connect a wallet first.' });
      return;
    }

    try {
      setClaimState({ loading: true, message: 'Verifying Presence sandbox proof…' });
      const response = await fetch('/api/presence/claim-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Presence claim failed.');
      await loadProfile(walletAddress);
      setClaimState({ loading: false, message: 'Presence pass verified. Writing access is now unlocked.' });
    } catch (error) {
      setClaimState({ loading: false, message: error.message || 'Presence claim failed.' });
    }
  }

  async function handleCreatePresenceRequest(addressOverride = '') {
    const targetAddress = addressOverride || walletAddress;
    if (!targetAddress) {
      setClaimState({ loading: false, message: 'Connect a wallet first.' });
      return;
    }

    try {
      setClaimState({ loading: true, message: 'Creating Presence request…' });
      const response = await fetch('/api/presence/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: targetAddress }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to create Presence request.');
      setPresenceRequest(payload.request);
      setClaimState({ loading: false, message: 'Presence request created. Submit a real proof JSON to complete live verification.' });
    } catch (error) {
      setClaimState({ loading: false, message: error.message || 'Failed to create Presence request.' });
    }
  }

  async function handleVerifyLivePresence() {
    if (!walletAddress || !presenceRequest) {
      setClaimState({ loading: false, message: 'Create a Presence request first.' });
      return;
    }

    try {
      const proof = JSON.parse(liveProofText);
      setClaimState({ loading: true, message: 'Verifying Presence proof…' });
      const response = await fetch('/api/presence/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, requestId: presenceRequest.requestId, proof }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Live Presence verification failed.');
      await loadProfile(walletAddress);
      setClaimState({ loading: false, message: 'Live Presence verification succeeded. Writing access is now unlocked.' });
    } catch (error) {
      setClaimState({ loading: false, message: error.message || 'Live Presence verification failed.' });
    }
  }

  async function handleOpenWriteFlow() {
    setComposeState({ loading: false, message: '' });

    let nextAddress = walletAddress;
    if (!nextAddress) {
      nextAddress = await handleConnectWallet();
      if (!nextAddress) return;
    }

    setActivePanel('write');

    if (!profile?.presence?.passed) {
      await handleCreatePresenceRequest(nextAddress);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchStatus('Enter a transaction hash or record text.');
      return;
    }

    const isTxHash = /^0x([A-Fa-f0-9]{64})$/.test(query);

    try {
      setSearchStatus(isTxHash ? 'Searching transaction…' : 'Searching archive…');
      const params = new URLSearchParams(isTxHash ? { txHash: query } : { q: query });
      const response = await fetch(`/api/records/search?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Search failed.');

      if (payload.record) {
        setActiveRecord(payload.record);
        setSearchStatus('Record found.');
        return;
      }

      setRecords(payload.records || []);
      setSearchStatus(`${payload.records?.length || 0} records found.`);
    } catch (error) {
      setSearchStatus(error.message || 'Search failed.');
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
    if (!isWriter) {
      setComposeState({ loading: false, message: 'Only Presence-passed wallets can write.' });
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
      setSearchStatus('Latest record transaction is ready to inspect.');
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
          <button type="submit" className="ghost-chip">
            Search
          </button>
        </form>

        <div className="nav nav-actions">
          <button type="button" className="nav-link" onClick={() => setActivePanel(activePanel === 'about' ? '' : 'about')}>
            About
          </button>
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
              Connect MetaMask
            </button>
          )}
        </div>
      </header>

      <main id="top" className="main-layout">

        {activePanel === 'about' ? (
          <Panel title="About Preglyph" body={ABOUT_COPY} onClose={() => setActivePanel('')} />
        ) : null}
        {activePanel === 'how' ? (
          <Panel
            title="How it works"
            body="1. Connect with MetaMask. 2. Open Write. 3. Complete Presence verification if required. 4. Write a short record to Ethereum. 5. Search by tx hash or record text and revisit your archive from Profile."
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
                <span>{profile?.onchainApproved ? 'Onchain writer access granted.' : 'Write access locked.'}</span>
              </div>
              <div className="glass-subpanel profile-card">
                <p className="eyebrow">Presence</p>
                <strong>{profile?.presence?.passed ? 'Passed' : 'Not passed yet'}</strong>
                <span>
                  {profile?.presence?.writer?.verifiedAt
                    ? `Verified ${formatRecordedAt(Math.floor(new Date(profile.presence.writer.verifiedAt).getTime() / 1000))}`
                    : 'Use the sandbox verifier to unlock writing during testnet setup.'}
                </span>
              </div>
            </div>
            <div className="profile-actions wrap-actions">
              <button type="button" className="connect-chip" disabled={claimState.loading || !walletAddress} onClick={handlePresenceClaim}>
                {claimState.loading ? 'Verifying…' : 'Pass Presence sandbox'}
              </button>
              <button type="button" className="ghost-chip" disabled={claimState.loading || !walletAddress} onClick={handleCreatePresenceRequest}>
                Create live Presence request
              </button>
            </div>
            {presenceRequest ? (
              <div className="live-presence-panel glass-subpanel">
                <p className="eyebrow">Live Presence request</p>
                <code>{presenceRequest.requestId}</code>
                <span>nonce {presenceRequest.nonce}</span>
                <textarea
                  value={liveProofText}
                  onChange={(event) => setLiveProofText(event.target.value)}
                  placeholder="Paste a real Presence signed proof JSON here after completing the mobile flow."
                />
                <button type="button" className="connect-chip" onClick={handleVerifyLivePresence}>
                  Verify live proof
                </button>
              </div>
            ) : null}
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
                <p className="empty-copy">No records yet. Pass Presence, then write your first permanent record.</p>
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
                  <h3>{isWriter ? 'Write a permanent record' : 'Presence verification required'}</h3>
                </div>
                <span className={`gate-pill ${isWriter ? 'unlocked' : 'locked'}`}>{isWriter ? 'Unlocked' : 'Locked'}</span>
              </div>
              {isWriter ? (
                <form className="compose-form write-modal-form" onSubmit={handleComposeSubmit}>
                  <textarea
                    value={composeText}
                    onChange={(event) => setComposeText(event.target.value.slice(0, MAX_RECORD_LENGTH))}
                    placeholder="Write a short permanent public record…"
                  />
                  <div className="compose-footer">
                    <span>{composeText.length} / {MAX_RECORD_LENGTH}</span>
                    <button type="submit" className="connect-chip" disabled={composeState.loading || !isWriter}>
                      {composeState.loading ? 'Writing…' : 'Write onchain'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="write-gate-stack">
                  <p className="floating-panel-copy">Only Presence-passed humans can write. Opening Write can create a Presence request for your connected wallet.</p>
                  <div className="profile-actions wrap-actions">
                    <button type="button" className="connect-chip" disabled={claimState.loading || !walletAddress} onClick={handlePresenceClaim}>
                      {claimState.loading ? 'Verifying…' : 'Pass Presence sandbox'}
                    </button>
                    <button type="button" className="ghost-chip" disabled={claimState.loading || !walletAddress} onClick={handleCreatePresenceRequest}>
                      Refresh live Presence request
                    </button>
                  </div>
                  {presenceRequest ? (
                    <div className="live-presence-panel glass-subpanel">
                      <p className="eyebrow">Live Presence request</p>
                      <code>{presenceRequest.requestId}</code>
                      <span>nonce {presenceRequest.nonce}</span>
                      <textarea
                        value={liveProofText}
                        onChange={(event) => setLiveProofText(event.target.value)}
                        placeholder="Paste a real Presence signed proof JSON here after completing the mobile flow."
                      />
                      <button type="button" className="connect-chip" onClick={handleVerifyLivePresence}>
                        Verify live proof
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <section className="slab-grid" aria-label="Public record slabs">
          {records.length ? (
            records.map((record) => (
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
          ) : (
            <div className="empty-state glass-panel">
              <p className="eyebrow">Archive empty</p>
              <h3>Deploy the contract, pass a wallet, and write the first record.</h3>
              <p className="floating-panel-copy">Once the local test chain is running, every confirmed transaction will appear here as a slab preview.</p>
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
                <span>{formatRecordedAt(activeRecord.createdAt)}</span>
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

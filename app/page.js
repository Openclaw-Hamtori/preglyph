'use client';

import { useEffect, useRef } from 'react';

const records = [
  {
    author: 'chae.eth',
    time: '12m',
    metaLeft: 'Ethereum mainnet',
    metaRight: 'reply · cite',
    text: 'Permanent public writing changes how carefully people speak.',
  },
  {
    author: '0x8a2...4af1',
    time: '34m',
    metaLeft: 'canonical record',
    metaRight: 'open',
    text: 'Presence should not be the social network itself. It should unlock the right to leave durable marks.',
  },
  {
    author: 'minji.eth',
    time: '1h',
    metaLeft: '12×12 preview',
    metaRight: 'quote',
    text: 'A record should feel closer to engraving than posting.',
  },
];

function sanitizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9 .,;:'"!?\-]/g, '')
    .toUpperCase();
}

function buildMatrix(text, size = 12) {
  const cleaned = sanitizeText(text).slice(0, size * size);
  const padded = cleaned.padEnd(size * size, ' ');
  return padded.split('');
}

function SlabCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frameId = 0;
    let offset = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(231, 221, 205, 0.03)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const cols = 12;
      const rows = 12;
      const cellW = width / cols;
      const cellH = height / rows;

      context.strokeStyle = 'rgba(226, 214, 194, 0.08)';
      context.lineWidth = 1;
      for (let i = 1; i < cols; i += 1) {
        const x = Math.round(i * cellW) + 0.5;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let i = 1; i < rows; i += 1) {
        const y = Math.round(i * cellH) + 0.5;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.strokeStyle = 'rgba(214, 178, 122, 0.12)';
      context.lineWidth = 1.25;
      for (let i = 0; i < rows; i += 1) {
        const y = i * cellH + cellH * 0.5;
        const wave = Math.sin(i * 0.75 + offset) * cellW * 0.18;
        context.beginPath();
        context.moveTo(cellW * 1.2 + wave, y);
        context.lineTo(width - cellW * 1.2 - wave, y);
        context.stroke();
      }

      context.fillStyle = 'rgba(236, 225, 207, 0.15)';
      for (let i = 0; i < cols; i += 1) {
        const x = i * cellW + cellW * 0.5 + Math.sin(offset + i * 0.8) * 4;
        for (let j = 0; j < rows; j += 3) {
          const y = j * cellH + cellH * 0.5 + Math.cos(offset + j * 0.6) * 4;
          context.beginPath();
          context.arc(x, y, 1.2, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width * dpr));
      canvas.height = Math.max(1, Math.floor(bounds.height * dpr));
      canvas.style.width = `${bounds.width}px`;
      canvas.style.height = `${bounds.height}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);
      width = bounds.width;
      height = bounds.height;
      draw();
    };

    const animate = () => {
      offset += 0.01;
      draw();
      frameId = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="slab-canvas" aria-hidden="true" />;
}

function Inscription({ text }) {
  const cells = buildMatrix(text);

  return (
    <div className="inscription" aria-label="12 by 12 inscription preview">
      {cells.map((char, index) => (
        <span key={`${char}-${index}`} className={char === ' ' ? 'cell empty' : 'cell'}>
          {char === ' ' ? '·' : char}
        </span>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Preglyph home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <strong>Preglyph</strong>
            <small>public records by verified humans</small>
          </span>
        </a>

        <nav className="nav">
          <a href="#concept">Concept</a>
          <a href="#gate">Writing gate</a>
          <a href="#records">Records</a>
          <a href="#direction">Direction</a>
        </nav>

        <a className="button button-ghost" href="#records">
          Connect wallet
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Presence-gated writing on Ethereum</p>
            <h1>Write only when your presence is real.</h1>
            <p className="hero-text">
              Preglyph is a minimal writing surface for durable public records. A wallet identifies
              the writer. Presence unlocks the right to write. Ethereum keeps the text.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#gate">
                Try the writer gate
              </a>
              <a className="button button-subtle" href="#direction">
                See the design direction
              </a>
            </div>
            <div className="hero-notes">
              <span>MetaMask-first</span>
              <span>Presence-auth-gated writing</span>
              <span>12×12 record previews</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-head">
              <div>
                <p className="micro-label">Signal slab</p>
                <h2>The page as an inscription surface.</h2>
              </div>
              <span className="micro-chip">Live concept</span>
            </div>

            <div className="slab-frame featured-slab">
              <SlabCanvas />
              <div className="slab-overlay">
                <strong>Wallet connects. Presence verifies. Writing unlocks.</strong>
                <p>
                  Less like a social feed. More like a chamber where only authenticated marks can
                  be made.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="concept" className="section intro-section">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Concept</p>
              <h2>What the UI should feel like.</h2>
            </div>
            <p className="section-text narrow">
              Not a generic crypto dashboard. Not a noisy social feed. A quiet writing layer with
              carved geometry, sparse metadata, and slow visual rhythm.
            </p>
          </div>

          <div className="principles-grid">
            <article className="principle-card">
              <span className="micro-label">Visual language</span>
              <h3>Stone, silence, restraint</h3>
              <p>Warm dark surfaces, pale text, hairline geometry, almost no decorative noise.</p>
            </article>
            <article className="principle-card">
              <span className="micro-label">Interaction model</span>
              <h3>Unlock, then inscribe</h3>
              <p>
                Access matters more than browsing. Writing should feel gated, intentional, and
                ceremonial.
              </p>
            </article>
            <article className="principle-card">
              <span className="micro-label">Blockchain tone</span>
              <h3>Trust through permanence</h3>
              <p>Ethereum is the record. Presence is the gate. Social motion can come later.</p>
            </article>
          </div>
        </section>

        <section id="gate" className="section gate-section">
          <div className="section-heading-row stack-mobile">
            <div>
              <p className="eyebrow">Writing gate</p>
              <h2>A minimal first step.</h2>
            </div>
            <p className="section-text narrow">
              The first version does not need likes, reposts, or feed tricks. It only needs a clear
              sequence: connect wallet, pass presence, leave a record.
            </p>
          </div>

          <div className="gate-flow">
            <div className="gate-step">
              <span className="step-index">01</span>
              <strong>Connect wallet</strong>
              <p>Wallet becomes identity. ENS is optional.</p>
            </div>
            <div className="gate-step">
              <span className="step-index">02</span>
              <strong>Pass presence</strong>
              <p>Only verified humans unlock writing rights.</p>
            </div>
            <div className="gate-step">
              <span className="step-index">03</span>
              <strong>Commit record</strong>
              <p>Short text is written as the canonical public record.</p>
            </div>
          </div>
        </section>

        <section id="records" className="section records-section">
          <div className="section-heading-row stack-mobile align-end">
            <div>
              <p className="eyebrow">Records</p>
              <h2>Every post previews as a slab.</h2>
            </div>
            <p className="section-text narrow">
              Each preview is capped at a 12×12 inscription field. Empty cells stay empty. Longer
              text opens on demand.
            </p>
          </div>

          <div className="records-grid">
            {records.map((record) => (
              <article className="record-card" key={`${record.author}-${record.time}`}>
                <div className="record-head">
                  <div>
                    <strong>{record.author}</strong>
                    <span>verified human</span>
                  </div>
                  <time>{record.time}</time>
                </div>
                <Inscription text={record.text} />
                <div className="record-foot">
                  <span>{record.metaLeft}</span>
                  <span>{record.metaRight}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="direction" className="section direction-section">
          <div className="section-heading-row stack-mobile">
            <div>
              <p className="eyebrow">Direction</p>
              <h2>Minimal now. Broader later.</h2>
            </div>
            <p className="section-text narrow">
              Start with verified-human writing and quiet record previews. Add lighter actions later
              without changing the core truth of the product.
            </p>
          </div>

          <div className="direction-list">
            <div className="direction-item">Core post = Ethereum</div>
            <div className="direction-item">Write access = Presence</div>
            <div className="direction-item muted">Likes / recasts / follows = later layer</div>
          </div>
        </section>
      </main>
    </div>
  );
}

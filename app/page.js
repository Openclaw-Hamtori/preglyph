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
    metaLeft: 'presence-gated',
    metaRight: 'open',
    text: 'Presence should unlock the right to leave durable public marks.',
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

function GlassCanvas() {
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

    const roundedRect = (x, y, w, h, r) => {
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + w, y, x + w, y + h, r);
      context.arcTo(x + w, y + h, x, y + h, r);
      context.arcTo(x, y + h, x, y, r);
      context.arcTo(x, y, x + w, y, r);
      context.closePath();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      const bg = context.createRadialGradient(width * 0.7, height * 0.15, 20, width * 0.5, height * 0.5, width * 0.8);
      bg.addColorStop(0, 'rgba(105, 195, 255, 0.14)');
      bg.addColorStop(0.45, 'rgba(70, 120, 255, 0.09)');
      bg.addColorStop(1, 'rgba(2, 8, 23, 0)');
      context.fillStyle = bg;
      context.fillRect(0, 0, width, height);

      const cols = 14;
      const rows = 14;
      const cellW = width / cols;
      const cellH = height / rows;

      context.strokeStyle = 'rgba(190, 225, 255, 0.07)';
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

      const slabW = width * 0.46;
      const slabH = height * 0.72;
      const slabX = width * 0.28 + Math.sin(offset * 0.5) * 10;
      const slabY = height * 0.12 + Math.cos(offset * 0.7) * 8;
      const radius = 34;

      const slabGradient = context.createLinearGradient(slabX, slabY, slabX + slabW, slabY + slabH);
      slabGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
      slabGradient.addColorStop(0.15, 'rgba(157,220,255,0.14)');
      slabGradient.addColorStop(0.6, 'rgba(70,120,255,0.08)');
      slabGradient.addColorStop(1, 'rgba(255,255,255,0.06)');
      roundedRect(slabX, slabY, slabW, slabH, radius);
      context.fillStyle = slabGradient;
      context.fill();

      context.strokeStyle = 'rgba(215, 240, 255, 0.28)';
      context.lineWidth = 1.15;
      roundedRect(slabX, slabY, slabW, slabH, radius);
      context.stroke();

      roundedRect(slabX + 18, slabY + 18, slabW - 36, slabH - 36, 26);
      context.strokeStyle = 'rgba(255,255,255,0.08)';
      context.stroke();

      const glare = context.createLinearGradient(slabX, slabY, slabX + slabW * 0.6, slabY + slabH * 0.4);
      glare.addColorStop(0, 'rgba(255,255,255,0.34)');
      glare.addColorStop(0.2, 'rgba(185,230,255,0.14)');
      glare.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = glare;
      roundedRect(slabX + 10, slabY + 10, slabW * 0.52, slabH * 0.28, 28);
      context.fill();

      context.strokeStyle = 'rgba(164, 221, 255, 0.12)';
      for (let i = 1; i < 6; i += 1) {
        const y = slabY + slabH * (i / 6);
        context.beginPath();
        context.moveTo(slabX + 28, y + Math.sin(offset + i) * 3);
        context.lineTo(slabX + slabW - 28, y - Math.cos(offset + i) * 3);
        context.stroke();
      }

      context.fillStyle = 'rgba(214, 239, 255, 0.25)';
      for (let i = 0; i < 32; i += 1) {
        const x = slabX + 42 + ((i % 6) * (slabW * 0.14)) + Math.sin(offset + i) * 3;
        const y = slabY + 56 + (Math.floor(i / 6) * (slabH * 0.13)) + Math.cos(offset + i * 0.6) * 3;
        context.beginPath();
        context.arc(x, y, 1.35, 0, Math.PI * 2);
        context.fill();
      }

      const orbX = width * 0.2 + Math.cos(offset * 0.9) * 8;
      const orbY = height * 0.26 + Math.sin(offset * 0.8) * 8;
      const orb = context.createRadialGradient(orbX, orbY, 8, orbX, orbY, 80);
      orb.addColorStop(0, 'rgba(220,245,255,0.95)');
      orb.addColorStop(0.18, 'rgba(156,220,255,0.58)');
      orb.addColorStop(0.5, 'rgba(78,124,255,0.18)');
      orb.addColorStop(1, 'rgba(78,124,255,0)');
      context.fillStyle = orb;
      context.beginPath();
      context.arc(orbX, orbY, 80, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = 'rgba(166, 224, 255, 0.16)';
      context.beginPath();
      context.arc(width * 0.5, height * 0.52, width * 0.34 + Math.sin(offset) * 6, Math.PI * 0.12, Math.PI * 1.85);
      context.stroke();
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

  return <canvas ref={canvasRef} className="glass-canvas" aria-hidden="true" />;
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
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

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
          <a href="#gate">Gate</a>
          <a href="#records">Records</a>
          <a href="#direction">Direction</a>
        </nav>

        <a className="button button-glass" href="#records">
          Connect wallet
        </a>
      </header>

      <main id="top">
        <section className="hero hero-grid">
          <div className="hero-copy glass-panel soft-panel">
            <p className="eyebrow">Presence-gated writing on Ethereum</p>
            <h1>Write only when your presence is real.</h1>
            <p className="hero-text">
              Preglyph is a minimal writing layer for durable public records. Wallet identifies the
              writer. Presence unlocks the right to inscribe. Ethereum keeps the text.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#gate">
                Try the writer gate
              </a>
              <a className="button button-glass" href="#direction">
                See direction
              </a>
            </div>
            <div className="hero-notes">
              <span>Dark blue liquid glass</span>
              <span>Presence-auth gated writing</span>
              <span>12×12 slab previews</span>
            </div>
          </div>

          <div className="hero-visual glass-panel">
            <div className="panel-head compact-head">
              <div>
                <p className="micro-label">Glass monolith</p>
                <h2>The interface as a quiet inscription chamber.</h2>
              </div>
              <span className="micro-chip">live concept</span>
            </div>
            <div className="glass-stage">
              <GlassCanvas />
              <div className="glass-overlay glass-badge top">Presence verified</div>
              <div className="glass-overlay glass-card bottom">
                <strong>Wallet connects. Presence verifies. Writing unlocks.</strong>
                <p>Quiet motion, liquid glass, and hard limits on who gets to write.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="concept" className="section glass-panel section-split">
          <div>
            <p className="eyebrow">Concept</p>
            <h2>Minimal, blue, calm.</h2>
          </div>
          <p className="section-text narrow">
            Less stone museum, more nocturnal liquid glass. The surface should feel premium and
            restrained, with very little chrome and just enough motion to feel alive.
          </p>
        </section>

        <section className="section cards-row">
          <article className="glass-panel feature-card">
            <span className="micro-label">Visual language</span>
            <h3>Deep blue glass, soft light</h3>
            <p>Layered blur, pale blue highlights, restrained glow, and precise spacing.</p>
          </article>
          <article className="glass-panel feature-card">
            <span className="micro-label">Interaction model</span>
            <h3>Unlock, then inscribe</h3>
            <p>Writing is the premium act. Browsing stays quiet. Trust appears before action.</p>
          </article>
          <article className="glass-panel feature-card">
            <span className="micro-label">Preview model</span>
            <h3>12×12 as the artifact</h3>
            <p>Each post previews as a fixed glass slab so the feed reads like collected objects.</p>
          </article>
        </section>

        <section id="gate" className="section glass-panel">
          <div className="section-split stack-mobile">
            <div>
              <p className="eyebrow">Gate</p>
              <h2>A very small first product.</h2>
            </div>
            <p className="section-text narrow">
              The first version does not need likes or feed noise. It needs one clean sequence:
              connect wallet, pass Presence, leave a record.
            </p>
          </div>

          <div className="gate-flow">
            <div className="glass-panel gate-step">
              <span className="step-index">01</span>
              <strong>Connect wallet</strong>
              <p>Wallet becomes the public anchor. ENS stays optional.</p>
            </div>
            <div className="glass-panel gate-step">
              <span className="step-index">02</span>
              <strong>Pass presence</strong>
              <p>Only verified humans unlock the right to publish.</p>
            </div>
            <div className="glass-panel gate-step">
              <span className="step-index">03</span>
              <strong>Commit record</strong>
              <p>Short text becomes a durable public inscription.</p>
            </div>
          </div>
        </section>

        <section id="records" className="section records-wrap">
          <div className="section-split stack-mobile align-end glass-panel header-panel">
            <div>
              <p className="eyebrow">Records</p>
              <h2>Every post previews as a glass slab.</h2>
            </div>
            <p className="section-text narrow">
              Each preview is capped at a 12×12 field. Empty cells stay empty. Full text opens only
              when the reader chooses to go deeper.
            </p>
          </div>

          <div className="records-grid">
            {records.map((record) => (
              <article className="record-card glass-panel" key={`${record.author}-${record.time}`}>
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

        <section id="direction" className="section cards-row final-row">
          <div className="glass-panel direction-card wide-card">
            <p className="eyebrow">Direction</p>
            <h2>Minimal now. Broader later.</h2>
            <p className="section-text">
              Start with verified-human writing, quiet glass surfaces, and compact inscription
              previews. Add lighter social actions later without changing the core product truth.
            </p>
          </div>
          <div className="stack-list">
            <div className="glass-panel mini-card">Core post = Ethereum</div>
            <div className="glass-panel mini-card">Write access = Presence</div>
            <div className="glass-panel mini-card muted">Likes / recasts / follows = later</div>
          </div>
        </section>
      </main>
    </div>
  );
}

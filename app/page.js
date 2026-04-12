'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const records = [
  {
    id: 'chae-1',
    author: 'chae.eth',
    time: '12m',
    title: 'Permanent public writing changes how carefully people speak.',
    text: 'Permanent public writing changes how carefully people speak. When deletion is not the default, language becomes slower, clearer, and more accountable. Preglyph should preserve that feeling instead of drifting toward noisy feed behavior.',
    metaLeft: 'Ethereum mainnet',
    metaRight: 'reply · cite',
  },
  {
    id: 'wallet-2',
    author: '0x8a2...4af1',
    time: '34m',
    title: 'Presence should unlock the right to leave durable public marks.',
    text: 'Presence should unlock the right to leave durable public marks. It should not become the social network itself. Wallet is identity, Presence is the writing gate, and Ethereum is the place where the text actually remains.',
    metaLeft: 'Presence-gated',
    metaRight: 'open',
  },
  {
    id: 'minji-3',
    author: 'minji.eth',
    time: '1h',
    title: 'A record should feel closer to engraving than posting.',
    text: 'A record should feel closer to engraving than posting. The interface should make writing feel intentional, almost ceremonial, so that every inscription carries the sense of public permanence rather than disposable social chatter.',
    metaLeft: '12×12 preview',
    metaRight: 'quote',
  },
  {
    id: 'sora-4',
    author: 'sora.eth',
    time: '2h',
    title: 'The feed should feel quiet enough that every line carries weight.',
    text: 'The feed should feel quiet enough that every line carries weight. The right surface is less like a busy marketplace and more like a calm archive of objects. Each record should feel discrete, collectible, and legible at its own pace.',
    metaLeft: 'public record',
    metaRight: 'reply',
  },
  {
    id: 'wallet-5',
    author: '0x44...da2',
    time: '4h',
    title: 'Wallet is the account. Presence is the writing gate.',
    text: 'Wallet is the account. Presence is the writing gate. The product gets simpler when those roles stay distinct. Identity can stay wallet-native while human authorization is enforced separately and quietly in the background.',
    metaLeft: 'wallet id',
    metaRight: 'cite',
  },
  {
    id: 'jiwoo-6',
    author: 'jiwoo.eth',
    time: '7h',
    title: 'A human record layer should feel slower than a normal social app.',
    text: 'A human record layer should feel slower than a normal social app. Not because it is clumsy, but because the environment itself encourages precision, calm, and a stronger sense that the public artifact matters after the moment passes.',
    metaLeft: 'human record',
    metaRight: 'open',
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

function GlassOrb() {
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

      const bg = context.createRadialGradient(width * 0.3, height * 0.25, 10, width * 0.5, height * 0.5, width * 0.7);
      bg.addColorStop(0, 'rgba(138, 210, 255, 0.2)');
      bg.addColorStop(0.45, 'rgba(116, 169, 255, 0.12)');
      bg.addColorStop(1, 'rgba(5, 11, 22, 0)');
      context.fillStyle = bg;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = 'rgba(190, 225, 255, 0.08)';
      for (let i = 1; i < 12; i += 1) {
        const x = Math.round((width / 12) * i) + 0.5;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let i = 1; i < 12; i += 1) {
        const y = Math.round((height / 12) * i) + 0.5;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const orbX = width * 0.52 + Math.cos(offset * 0.8) * 8;
      const orbY = height * 0.45 + Math.sin(offset * 0.65) * 8;
      const orb = context.createRadialGradient(orbX, orbY, 8, orbX, orbY, Math.min(width, height) * 0.28);
      orb.addColorStop(0, 'rgba(235,248,255,0.95)');
      orb.addColorStop(0.18, 'rgba(162,224,255,0.58)');
      orb.addColorStop(0.5, 'rgba(102,138,255,0.22)');
      orb.addColorStop(1, 'rgba(102,138,255,0)');
      context.fillStyle = orb;
      context.beginPath();
      context.arc(orbX, orbY, Math.min(width, height) * 0.28, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = 'rgba(166, 224, 255, 0.18)';
      context.lineWidth = 1.15;
      context.beginPath();
      context.arc(width * 0.5, height * 0.48, Math.min(width, height) * 0.33 + Math.sin(offset) * 4, Math.PI * 0.12, Math.PI * 1.84);
      context.stroke();

      context.beginPath();
      context.arc(width * 0.5, height * 0.48, Math.min(width, height) * 0.24 + Math.cos(offset * 0.8) * 3, Math.PI * 0.2, Math.PI * 1.72);
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
  const cells = useMemo(() => buildMatrix(text), [text]);
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
  const [activeRecord, setActiveRecord] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveRecord(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Preglyph home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <strong>Preglyph</strong>
          </span>
        </a>

        <nav className="nav">
          <a href="#about">About</a>
          <a href="#my-edit">My Edit</a>
          <a href="#connect">Connect</a>
        </nav>
      </header>

      <main id="top" className="main-layout">
        <section className="hero-strip glass-panel">
          <div className="hero-copy compact-copy">
            <p className="eyebrow">Verified-human public records</p>
            <h1>Public records by verified humans.</h1>
            <p className="hero-text">Tap a slab to open the full record.</p>
          </div>
          <div className="hero-orb-wrap compact-orb">
            <GlassOrb />
          </div>
        </section>

        <section className="slab-grid" aria-label="Public record slabs">
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              className="slab-button"
              onClick={() => setActiveRecord(record)}
              aria-label={`Open record by ${record.author}`}
            >
              <div className="slab-meta-top">
                <strong>{record.author}</strong>
                <span>{record.time}</span>
              </div>
              <Inscription text={record.text} />
              <div className="slab-meta-bottom">
                <span>{record.metaLeft}</span>
                <span>{record.metaRight}</span>
              </div>
            </button>
          ))}
        </section>

        <section id="about" className="bottom-grid">
          <article className="glass-panel info-card">
            <p className="eyebrow">About</p>
            <h3>Preglyph is a public writing layer where only verified humans can publish records.</h3>
          </article>
          <article id="my-edit" className="glass-panel info-card">
            <p className="eyebrow">My Edit</p>
            <h3>Your writing surface opens after wallet connection and Presence verification.</h3>
          </article>
          <article id="connect" className="glass-panel info-card compact-action">
            <p className="eyebrow">Connect</p>
            <h3>Connect wallet</h3>
          </article>
        </section>
      </main>

      {activeRecord && (
        <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label="Record detail">
          <div className="detail-dim" onClick={() => setActiveRecord(null)} />
          <div className="detail-panel glass-panel">
            <button type="button" className="detail-close" onClick={() => setActiveRecord(null)}>
              Close
            </button>
            <div className="detail-head">
              <div>
                <p className="eyebrow">Record detail</p>
                <h2>{activeRecord.title}</h2>
              </div>
              <div className="detail-author">
                <strong>{activeRecord.author}</strong>
                <span>{activeRecord.time}</span>
              </div>
            </div>
            <div className="detail-body">
              <div className="detail-slab-wrap">
                <Inscription text={activeRecord.text} />
              </div>
              <div className="detail-copy">
                <p>{activeRecord.text}</p>
                <div className="detail-meta">
                  <span>{activeRecord.metaLeft}</span>
                  <span>{activeRecord.metaRight}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

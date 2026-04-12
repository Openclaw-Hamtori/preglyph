'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const records = [
  {
    id: 'en-1',
    author: 'chae.eth',
    time: '12m',
    title: 'Permanent public writing changes how carefully people speak.',
    text: 'Permanent public writing changes how carefully people speak. When deletion is not the default, language becomes slower, clearer, and more accountable.',
    metaLeft: 'Ethereum mainnet',
    metaRight: 'reply · cite',
  },
  {
    id: 'en-2',
    author: '0x8a2...4af1',
    time: '34m',
    title: 'Presence should unlock the right to leave durable public marks.',
    text: 'Presence should unlock the right to leave durable public marks. It should not become the social network itself. Wallet is identity and Presence is the gate.',
    metaLeft: 'Presence-gated',
    metaRight: 'open',
  },
  {
    id: 'ko-1',
    author: 'han.eth',
    time: '51m',
    title: '지워지지 않는 기록은 말을 더 신중하게 만든다.',
    text: '지워지지 않는 기록은 말을 더 신중하게 만든다. 프레그리프는 빠른 소비보다 오래 남는 문장을 위한 공간이어야 한다.',
    metaLeft: 'Korean record',
    metaRight: 'open',
  },
  {
    id: 'ko-2',
    author: 'seoul.eth',
    time: '1h',
    title: '지갑은 계정이고 프레즌스는 쓰기 권한이다.',
    text: '지갑은 계정이고 프레즌스는 쓰기 권한이다. 둘의 역할이 분리될수록 제품은 더 단순하고 강해진다.',
    metaLeft: 'wallet id',
    metaRight: 'cite',
  },
  {
    id: 'zh-1',
    author: 'hanzi.eth',
    time: '1h',
    title: '公开且不可删除的记录会改变写作方式。',
    text: '公开且不可删除的记录会改变写作方式。写下的每一句话都会更慢，更清楚，也更负责任。',
    metaLeft: 'Chinese record',
    metaRight: 'reply',
  },
  {
    id: 'zh-2',
    author: '0x77...be1',
    time: '1h',
    title: '身份来自钱包，写作权来自通过验证的人类存在。',
    text: '身份来自钱包，写作权来自通过验证的人类存在。记录留在链上，而不是停留在可删除的数据库里。',
    metaLeft: 'verified human',
    metaRight: 'open',
  },
  {
    id: 'fr-1',
    author: 'paris.eth',
    time: '2h',
    title: 'Un écrit public et durable change le ton de la parole.',
    text: 'Un écrit public et durable change le ton de la parole. Quand rien ne disparaît facilement, chaque phrase porte davantage de poids.',
    metaLeft: 'French record',
    metaRight: 'quote',
  },
  {
    id: 'fr-2',
    author: '0x19...fa2',
    time: '2h',
    title: 'Le produit doit ressembler à une chambre calme, pas à un flux bruyant.',
    text: 'Le produit doit ressembler à une chambre calme, pas à un flux bruyant. On vient pour inscrire, pas pour faire défiler sans fin.',
    metaLeft: 'quiet interface',
    metaRight: 'open',
  },
  {
    id: 'ar-1',
    author: 'nour.eth',
    time: '3h',
    title: 'الكتابة العامة الدائمة تجعل الكلمات أكثر مسؤولية.',
    text: 'الكتابة العامة الدائمة تجعل الكلمات أكثر مسؤولية. عندما يبقى الأثر، تصبح الجملة أهدأ وأكثر وضوحًا.',
    metaLeft: 'Arabic record',
    metaRight: 'reply',
  },
  {
    id: 'ar-2',
    author: '0x55...c21',
    time: '3h',
    title: 'المحفظة هوية، والحضور البشري هو باب الكتابة.',
    text: 'المحفظة هوية، والحضور البشري هو باب الكتابة. السجل الحقيقي يجب أن يبقى على السلسلة لا في قاعدة بيانات قابلة للمحو.',
    metaLeft: 'verified gate',
    metaRight: 'open',
  },
  {
    id: 'pt-1',
    author: 'rio.eth',
    time: '4h',
    title: 'Um registro público e durável muda a forma como as pessoas escrevem.',
    text: 'Um registro público e durável muda a forma como as pessoas escrevem. O texto fica mais claro, mais lento e mais responsável.',
    metaLeft: 'Portuguese record',
    metaRight: 'reply',
  },
  {
    id: 'pt-2',
    author: '0x24...de4',
    time: '4h',
    title: 'Carteira é identidade. Presence é o direito de escrever.',
    text: 'Carteira é identidade. Presence é o direito de escrever. O produto funciona melhor quando essas camadas continuam separadas.',
    metaLeft: 'wallet + gate',
    metaRight: 'cite',
  },
  {
    id: 'es-1',
    author: 'sol.eth',
    time: '5h',
    title: 'Un registro público permanente hace que la escritura sea más cuidadosa.',
    text: 'Un registro público permanente hace que la escritura sea más cuidadosa. Si el texto permanece, el lenguaje cambia de ritmo.',
    metaLeft: 'Spanish record',
    metaRight: 'open',
  },
  {
    id: 'es-2',
    author: '0x90...aa7',
    time: '5h',
    title: 'No es una red para ruido; es una capa para memoria pública humana.',
    text: 'No es una red para ruido; es una capa para memoria pública humana. Cada inscripción debe sentirse deliberada y atribuible.',
    metaLeft: 'public memory',
    metaRight: 'reply',
  },
  {
    id: 'de-1',
    author: 'berlin.eth',
    time: '6h',
    title: 'Dauerhafte öffentliche Texte verändern die Art zu sprechen.',
    text: 'Dauerhafte öffentliche Texte verändern die Art zu sprechen. Wenn Worte bleiben, werden sie präziser und verantwortlicher.',
    metaLeft: 'German record',
    metaRight: 'open',
  },
  {
    id: 'de-2',
    author: '0x31...ef8',
    time: '6h',
    title: 'Eine ruhige Oberfläche macht den Akt des Schreibens wertvoller.',
    text: 'Eine ruhige Oberfläche macht den Akt des Schreibens wertvoller. Nicht Scrollen, sondern Einschreiben sollte sich zentral anfühlen.',
    metaLeft: 'quiet surface',
    metaRight: 'quote',
  },
  {
    id: 'ja-1',
    author: 'tokyo.eth',
    time: '7h',
    title: '消えない公開記録は、言葉をもっと慎重にする。',
    text: '消えない公開記録は、言葉をもっと慎重にする。プレグリフは速い消費ではなく、残る文章のための場所であるべきだ。',
    metaLeft: 'Japanese record',
    metaRight: 'open',
  },
  {
    id: 'ja-2',
    author: '0x72...bc0',
    time: '7h',
    title: 'ウォレットは身元であり、Presenceは書く権利である。',
    text: 'ウォレットは身元であり、Presenceは書く権利である。この二つの役割が分かれているほど、体験は明確になる。',
    metaLeft: 'wallet identity',
    metaRight: 'cite',
  },
  {
    id: 'hi-1',
    author: 'delhi.eth',
    time: '8h',
    title: 'स्थायी सार्वजनिक लेखन भाषा को अधिक जिम्मेदार बनाता है।',
    text: 'स्थायी सार्वजनिक लेखन भाषा को अधिक जिम्मेदार बनाता है। जब शब्द टिकते हैं, तो वाक्य अधिक साफ और अधिक सोच-समझकर लिखे जाते हैं।',
    metaLeft: 'Hindi record',
    metaRight: 'open',
  },
  {
    id: 'hi-2',
    author: '0x13...f20',
    time: '8h',
    title: 'वॉलेट पहचान है, और Presence लिखने का अधिकार खोलता है।',
    text: 'वॉलेट पहचान है, और Presence लिखने का अधिकार खोलता है। रिकॉर्ड ब्लॉकचेन पर रहना चाहिए, किसी मिटने योग्य डेटाबेस में नहीं।',
    metaLeft: 'verified writing',
    metaRight: 'reply',
  },
  {
    id: 'ru-1',
    author: 'moscow.eth',
    time: '9h',
    title: 'Публичная неизменяемая запись меняет ритм речи.',
    text: 'Публичная неизменяемая запись меняет ритм речи. Когда текст остаётся, каждая фраза становится осторожнее и яснее.',
    metaLeft: 'Russian record',
    metaRight: 'open',
  },
  {
    id: 'ru-2',
    author: '0x64...d92',
    time: '9h',
    title: 'Интерфейс должен быть тихим, чтобы запись ощущалась важной.',
    text: 'Интерфейс должен быть тихим, чтобы запись ощущалась важной. Это не место для шумного потребления, а слой для долговечной памяти.',
    metaLeft: 'quiet archive',
    metaRight: 'cite',
  },
  {
    id: 'tr-1',
    author: 'istanbul.eth',
    time: '10h',
    title: 'Kalıcı kamusal kayıt yazıyı daha dikkatli hale getirir.',
    text: 'Kalıcı kamusal kayıt yazıyı daha dikkatli hale getirir. Metin silinmediğinde, her cümle daha net ve daha sorumlu olur.',
    metaLeft: 'Turkish record',
    metaRight: 'open',
  },
  {
    id: 'tr-2',
    author: '0x88...ab3',
    time: '10h',
    title: 'Cüzdan kimliktir, Presence ise yazma kapısını açar.',
    text: 'Cüzdan kimliktir, Presence ise yazma kapısını açar. Ürün, bu katmanlar ayrı kaldığında daha anlaşılır hale gelir.',
    metaLeft: 'wallet gate',
    metaRight: 'reply',
  },
];

function sanitizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}\p{M} .,;:'"!?\-،。！？、，؛]/gu, '')
    .toLocaleUpperCase();
}

function buildMatrix(text, size = 9) {
  const cleaned = Array.from(sanitizeText(text)).slice(0, size * size);
  const padded = [...cleaned, ...Array(size * size - cleaned.length).fill(' ')];
  return padded;
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

function fakeTxHash(id) {
  const hex = Array.from(id)
    .map((char) => char.codePointAt(0).toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64)
    .padEnd(64, '0');
  return `0x${hex}`;
}

function Inscription({ text, size = 9, variant = 'preview' }) {
  const cells = useMemo(() => buildMatrix(text, size), [text, size]);
  return (
    <div className={`inscription ${variant}`} aria-label={`${size} by ${size} inscription preview`}>
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
              <Inscription text={record.text} size={6} variant="preview" />
              <div className="slab-meta-bottom">
                <span>{record.metaLeft}</span>
                <span>{record.metaRight}</span>
              </div>
            </button>
          ))}
        </section>

      </main>

      {activeRecord && (
        <div className="detail-backdrop" role="dialog" aria-modal="true" aria-label="Record detail">
          <div className="detail-dim" onClick={() => setActiveRecord(null)} />
          <div className="detail-panel glass-panel">
            <button type="button" className="detail-close" onClick={() => setActiveRecord(null)}>
              Close
            </button>
            <div className="detail-head simple-head">
              <div className="detail-author-block">
                <p className="eyebrow">Recorded by</p>
                <strong>{activeRecord.author}</strong>
              </div>
              <div className="detail-time-block">
                <p className="eyebrow">Recorded at</p>
                <span>{activeRecord.time}</span>
              </div>
            </div>
            <div className="detail-tx glass-subpanel">
              <p className="eyebrow">Transaction</p>
              <code>{fakeTxHash(activeRecord.id)}</code>
            </div>
            <div className="detail-body stacked-detail">
              <div className="detail-slab-wrap full-width">
                <Inscription text={activeRecord.text} size={12} variant="detail" />
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

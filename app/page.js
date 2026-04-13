'use client';

import { useEffect, useMemo, useState } from 'react';
import DetailSlab3D from './components/DetailSlab3D';
import { MATRIX_SIZE, createInscriptionDataUrl } from './components/inscriptionTexture';

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


function fakeTxHash(seed) {
  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64)
    .padEnd(64, '0');
  return `0x${hex}`;
}

function formatRecordedAt(relative) {
  const now = new Date();
  const parsed = String(relative).match(/^(\d+)(m|h)$/i);

  if (parsed) {
    const amount = Number(parsed[1]);
    const unit = parsed[2].toLowerCase();
    const deltaMs = unit === 'm' ? amount * 60_000 : amount * 3_600_000;
    const recorded = new Date(now.getTime() - deltaMs);

    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(recorded);

    const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
  }

  return relative;
}

function Inscription({ text, size = MATRIX_SIZE, variant = 'preview', fontVersion = 0 }) {
  const textureUrl = useMemo(() => createInscriptionDataUrl(text, size), [text, size, fontVersion]);

  return (
    <img
      className={`inscription ${variant}`}
      src={textureUrl}
      alt={`${size} by ${size} inscription preview`}
      draggable={false}
    />
  );
}

export default function Page() {
  const [activeRecord, setActiveRecord] = useState(null);
  const [fontVersion, setFontVersion] = useState(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveRecord(null);
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

        <div className="nav">
          <span className="nav-note">Human-made permanent records</span>
          <a className="connect-chip" href="#connect">Connect</a>
        </div>
      </header>

      <main id="top" className="main-layout">
        <section className="slab-grid" aria-label="Public record slabs">
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              className="slab-button"
              onClick={() => setActiveRecord(record)}
              aria-label={`Open record by ${record.author}`}
            >
              <Inscription text={record.text} size={MATRIX_SIZE} variant="preview" fontVersion={fontVersion} />
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
                <span>{formatRecordedAt(activeRecord.time)}</span>
              </div>
            </div>
            <div className="detail-tx glass-subpanel">
              <p className="eyebrow">Transaction</p>
              <code>{fakeTxHash(activeRecord.id)}</code>
            </div>
            <div className="detail-body stacked-detail">
              <div className="detail-slab-wrap full-width detail-3d-stage">
                <DetailSlab3D text={activeRecord.text} fontVersion={fontVersion} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

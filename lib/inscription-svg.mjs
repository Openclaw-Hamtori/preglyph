import { getInscriptionGridCells, HORIZONTAL_INSCRIPTION_MODE } from './inscription-mode.mjs';

export function createInscriptionSvgMarkup({
  text = '',
  size,
  cells,
  mode = 'base',
  inscriptionMode = HORIZONTAL_INSCRIPTION_MODE,
  fontStack = 'system-ui, sans-serif',
} = {}) {
  const viewBox = 1200;
  const safeSize = Number(size) || 10;
  const gridCells = getInscriptionGridCells(text, { size: safeSize, cells, mode: inscriptionMode });
  const inset = viewBox * 0.1;
  const cellSize = (viewBox - inset * 2) / safeSize;
  const dotRadius = Math.max(2.6, cellSize * 0.055);
  const fontSize = Math.floor(cellSize * 0.56);

  const dots = mode === 'glow' || mode === 'hover-fill'
    ? ''
    : gridCells
        .map((char, index) => {
          if (char !== ' ') return '';
          const row = Math.floor(index / safeSize);
          const col = index % safeSize;
          const x = inset + col * cellSize + cellSize / 2;
          const y = inset + row * cellSize + cellSize / 2;
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${dotRadius.toFixed(2)}" fill="rgba(11,18,28,0.34)" />`;
        })
        .join('');

  const glyphs = gridCells
    .map((char, index) => {
      if (char === ' ') return '';
      const row = Math.floor(index / safeSize);
      const col = index % safeSize;
      const x = inset + col * cellSize + cellSize / 2;
      const y = inset + row * cellSize + cellSize / 2 - cellSize * 0.012;
      const safeChar = char
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (mode === 'glow') {
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="${fontStack.replace(/"/g, '&quot;')}" font-size="${fontSize}" font-weight="600" fill="rgba(196,228,255,0.145)" filter="url(#preglyphGlow)">${safeChar}</text>`;
      }
      if (mode === 'hover-fill') {
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="${fontStack.replace(/"/g, '&quot;')}" font-size="${fontSize}" font-weight="600" fill="rgba(208,236,255,0.84)">${safeChar}</text>`;
      }
      return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="${fontStack.replace(/"/g, '&quot;')}" font-size="${fontSize}" font-weight="600" fill="rgba(6,12,18,0.96)">${safeChar}</text>`;
    })
    .join('');

  const backgroundRect = mode === 'glow' || mode === 'hover-fill'
    ? ''
    : `<rect width="${viewBox}" height="${viewBox}" fill="url(#preglyphBg)" />`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="preglyphBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#42556f" />
          <stop offset="54%" stop-color="#37475d" />
          <stop offset="100%" stop-color="#2b3747" />
        </linearGradient>
        <filter id="preglyphGlow" x="-18%" y="-18%" width="136%" height="136%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      ${backgroundRect}
      ${dots}
      ${glyphs}
    </svg>
  `;
}

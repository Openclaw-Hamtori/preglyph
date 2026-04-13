'use client';

import * as THREE from 'three';

export const MATRIX_SIZE = 10;
export const INSCRIPTION_FONT_STACK = [
  '"Noto Sans KR"',
  '"Noto Sans SC"',
  '"Noto Sans JP"',
  '"Noto Sans Devanagari"',
  '"Noto Naskh Arabic"',
  '"Noto Sans"',
  'system-ui',
  'sans-serif',
].join(', ');

export function sanitizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}\p{M} .,;:'"!?\-،。！？、，؛]/gu, '')
    .toLocaleUpperCase();
}

export function buildMatrix(text, size = MATRIX_SIZE) {
  const cleaned = Array.from(sanitizeText(text)).slice(0, size * size);
  return [...cleaned, ...Array(size * size - cleaned.length).fill(' ')];
}

function createCanvas(size = 1200) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function drawBaseMatrix(ctx, text, size) {
  const { canvas } = ctx;
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, '#42556f');
  bgGradient.addColorStop(0.54, '#37475d');
  bgGradient.addColorStop(1, '#2b3747');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cells = buildMatrix(text, size);
  const inset = canvas.width * 0.1;
  const cellSize = (canvas.width - inset * 2) / size;
  const dotRadius = Math.max(2.6, cellSize * 0.055);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.floor(cellSize * 0.56)}px ${INSCRIPTION_FONT_STACK}`;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const char = cells[row * size + col] || ' ';
      const x = inset + col * cellSize + cellSize / 2;
      const y = inset + row * cellSize + cellSize / 2;

      if (char === ' ') {
        ctx.fillStyle = 'rgba(11, 18, 28, 0.34)';
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(6, 12, 18, 0.96)';
        ctx.fillText(char, x, y - cellSize * 0.012);
      }
    }
  }
}

function drawGlowMatrix(ctx, text, size) {
  const { canvas } = ctx;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cells = buildMatrix(text, size);
  const inset = canvas.width * 0.1;
  const cellSize = (canvas.width - inset * 2) / size;
  const dotRadius = Math.max(2.6, cellSize * 0.055);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.floor(cellSize * 0.56)}px ${INSCRIPTION_FONT_STACK}`;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const char = cells[row * size + col] || ' ';
      const x = inset + col * cellSize + cellSize / 2;
      const y = inset + row * cellSize + cellSize / 2;

      if (char === ' ') {
        ctx.shadowColor = 'rgba(205, 235, 255, 0.9)';
        ctx.shadowBlur = Math.max(18, cellSize * 0.2);
        ctx.fillStyle = 'rgba(190, 226, 255, 0.34)';
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowColor = 'rgba(205, 235, 255, 0.9)';
        ctx.shadowBlur = Math.max(18, cellSize * 0.2);
        ctx.fillStyle = 'rgba(228, 244, 255, 0.74)';
        ctx.fillText(char, x, y - cellSize * 0.012);
      }

      ctx.shadowBlur = 0;
    }
  }
}

export function createInscriptionDataUrl(text, size = MATRIX_SIZE, mode = 'base') {
  const cells = buildMatrix(text, size);
  const viewBox = 1200;
  const inset = viewBox * 0.1;
  const cellSize = (viewBox - inset * 2) / size;
  const dotRadius = Math.max(2.6, cellSize * 0.055);
  const fontSize = Math.floor(cellSize * 0.56);

  const dots = mode === 'glow' || mode === 'hover-fill'
    ? ''
    : cells
        .map((char, index) => {
          if (char !== ' ') return '';
          const row = Math.floor(index / size);
          const col = index % size;
          const x = inset + col * cellSize + cellSize / 2;
          const y = inset + row * cellSize + cellSize / 2;
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${dotRadius.toFixed(2)}" fill="rgba(11,18,28,0.34)" />`;
        })
        .join('');

  const glyphs = cells
    .map((char, index) => {
      if (char === ' ') return '';
      const row = Math.floor(index / size);
      const col = index % size;
      const x = inset + col * cellSize + cellSize / 2;
      const y = inset + row * cellSize + cellSize / 2 - cellSize * 0.012;
      const safeChar = char
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (mode === 'glow') {
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="${INSCRIPTION_FONT_STACK.replace(/"/g, '&quot;')}" font-size="${fontSize}" font-weight="600" fill="rgba(196,228,255,0.72)" filter="url(#preglyphGlow)">${safeChar}</text>`;
      }
      if (mode === 'hover-fill') {
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="${INSCRIPTION_FONT_STACK.replace(/"/g, '&quot;')}" font-size="${fontSize}" font-weight="600" fill="rgba(218,240,255,0.96)">${safeChar}</text>`;
      }
      return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="${INSCRIPTION_FONT_STACK.replace(/"/g, '&quot;')}" font-size="${fontSize}" font-weight="600" fill="rgba(6,12,18,0.96)">${safeChar}</text>`;
    })
    .join('');

  const backgroundRect = mode === 'glow' || mode === 'hover-fill'
    ? ''
    : `<rect width="${viewBox}" height="${viewBox}" fill="url(#preglyphBg)" />`;

  const svg = `
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

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createGlyphTexture(text, size = MATRIX_SIZE, mode = 'base') {
  const canvas = createCanvas(1400);
  const ctx = canvas.getContext('2d');

  if (mode === 'glow') {
    drawGlowMatrix(ctx, text, size);
  } else {
    drawBaseMatrix(ctx, text, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

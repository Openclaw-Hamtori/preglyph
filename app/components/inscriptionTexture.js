'use client';

import * as THREE from 'three';

export const MATRIX_SIZE = 10;

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
  ctx.font = `700 ${Math.floor(cellSize * 0.6)}px "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;

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
        ctx.strokeStyle = 'rgba(215, 228, 245, 0.18)';
        ctx.lineWidth = Math.max(1.5, cellSize * 0.026);
        ctx.strokeText(char, x, y - cellSize * 0.012);

        ctx.fillStyle = '#08111a';
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
  ctx.font = `700 ${Math.floor(cellSize * 0.6)}px "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;

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

export function createInscriptionDataUrl(text, size = MATRIX_SIZE) {
  const cells = buildMatrix(text, size);
  const viewBox = 1200;
  const inset = viewBox * 0.1;
  const cellSize = (viewBox - inset * 2) / size;
  const dotRadius = Math.max(2.6, cellSize * 0.055);
  const fontSize = Math.floor(cellSize * 0.6);

  const dots = cells
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
      return [
        `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace" font-size="${fontSize}" font-weight="700" fill="rgba(215,228,245,0.18)" stroke="rgba(215,228,245,0.18)" stroke-width="${Math.max(1.5, cellSize * 0.026).toFixed(2)}">${safeChar}</text>`,
        `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace" font-size="${fontSize}" font-weight="700" fill="#08111a">${safeChar}</text>`,
      ].join('');
    })
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="preglyphBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#42556f" />
          <stop offset="54%" stop-color="#37475d" />
          <stop offset="100%" stop-color="#2b3747" />
        </linearGradient>
      </defs>
      <rect width="${viewBox}" height="${viewBox}" fill="url(#preglyphBg)" />
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

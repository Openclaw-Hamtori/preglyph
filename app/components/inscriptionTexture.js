'use client';

import * as THREE from 'three';

import { createInscriptionSvgMarkup } from '@/lib/inscription-svg.mjs';
import { getInscriptionGridCells } from '@/lib/inscription-mode.mjs';

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

function buildRenderCells(text, size, inscriptionMode) {
  return getInscriptionGridCells(text, {
    size,
    cells: buildMatrix(text, size),
    mode: inscriptionMode,
  });
}

function createCanvas(size = 1200) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function drawBaseMatrix(ctx, text, size, inscriptionMode = 'horizontal') {
  const { canvas } = ctx;
  const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGradient.addColorStop(0, '#42556f');
  bgGradient.addColorStop(0.54, '#37475d');
  bgGradient.addColorStop(1, '#2b3747');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cells = buildRenderCells(text, size, inscriptionMode);
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

function drawGlowMatrix(ctx, text, size, inscriptionMode = 'horizontal') {
  const { canvas } = ctx;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cells = buildRenderCells(text, size, inscriptionMode);
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

export function createInscriptionDataUrl(text, size = MATRIX_SIZE, mode = 'base', inscriptionMode = 'horizontal') {
  const svg = createInscriptionSvgMarkup({
    text,
    size,
    mode,
    inscriptionMode,
    fontStack: INSCRIPTION_FONT_STACK,
  });

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createGlyphTexture(text, size = MATRIX_SIZE, mode = 'base', inscriptionMode = 'horizontal') {
  const canvas = createCanvas(1400);
  const ctx = canvas.getContext('2d');

  if (mode === 'glow') {
    drawGlowMatrix(ctx, text, size, inscriptionMode);
  } else {
    drawBaseMatrix(ctx, text, size, inscriptionMode);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HORIZONTAL_INSCRIPTION_MODE,
  UJONGSEO_INSCRIPTION_MODE,
  getInscriptionModeLabel,
  getInscriptionGridCells,
  normalizeInscriptionMode,
} from '../../lib/inscription-mode.mjs';

test('normalizeInscriptionMode defaults unknown values to horizontal', () => {
  assert.equal(normalizeInscriptionMode(undefined), HORIZONTAL_INSCRIPTION_MODE);
  assert.equal(normalizeInscriptionMode('weird'), HORIZONTAL_INSCRIPTION_MODE);
  assert.equal(normalizeInscriptionMode(UJONGSEO_INSCRIPTION_MODE), UJONGSEO_INSCRIPTION_MODE);
});

test('getInscriptionModeLabel exposes the user-facing ujongseo label', () => {
  assert.equal(getInscriptionModeLabel(HORIZONTAL_INSCRIPTION_MODE), 'Horizontal');
  assert.equal(getInscriptionModeLabel(UJONGSEO_INSCRIPTION_MODE), 'Ujongseo');
});

test('getInscriptionGridCells lays out ujongseo text top-to-bottom then right-to-left', () => {
  const size = 3;
  const horizontal = getInscriptionGridCells('ABCDEF', { size, mode: HORIZONTAL_INSCRIPTION_MODE });
  assert.deepEqual(horizontal.slice(0, 9), ['A', 'B', 'C', 'D', 'E', 'F', ' ', ' ', ' ']);

  const ujongseo = getInscriptionGridCells('ABCDEF', { size, mode: UJONGSEO_INSCRIPTION_MODE });
  assert.deepEqual(ujongseo.slice(0, 9), [' ', 'D', 'A', ' ', 'E', 'B', ' ', 'F', 'C']);
});

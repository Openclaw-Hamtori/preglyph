import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORD_LENGTH,
  WRITE_MODAL_WARNING,
  clampComposeText,
} from '../../lib/write-modal.mjs';

test('write modal uses a 280 character cap', () => {
  assert.equal(MAX_RECORD_LENGTH, 280);
});

test('write modal warning explains records cannot be edited or deleted after publishing', () => {
  assert.match(WRITE_MODAL_WARNING, /cannot be edited or deleted/i);
});

test('clampComposeText trims input to the write modal cap', () => {
  const longText = 'a'.repeat(320);
  assert.equal(clampComposeText(longText).length, 280);
  assert.equal(clampComposeText('preglyph'), 'preglyph');
});

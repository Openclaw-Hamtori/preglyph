import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORD_LENGTH,
  WRITE_MODAL_WARNING,
  clampComposeText,
} from '../../lib/write-modal.mjs';

test('write modal uses a 100 character cap', () => {
  assert.equal(MAX_RECORD_LENGTH, 100);
});

test('write modal warning explains records cannot be edited or deleted after publishing', () => {
  assert.match(WRITE_MODAL_WARNING, /cannot be edited or deleted/i);
});

test('clampComposeText trims input to the write modal cap', () => {
  const longText = 'a'.repeat(140);
  assert.equal(clampComposeText(longText).length, 100);
  assert.equal(clampComposeText('preglyph'), 'preglyph');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORD_LENGTH,
  getRecordContentLength,
  isRecordContentWithinLimit,
  truncateRecordContent,
} from '../../lib/write-policy.mjs';

test('ASCII content counts characters one-to-one up to the 100-character limit', () => {
  assert.equal(MAX_RECORD_LENGTH, 100);
  assert.equal(getRecordContentLength('a'.repeat(100)), 100);
  assert.equal(isRecordContentWithinLimit('a'.repeat(100)), true);
});

test('multibyte Unicode content still counts by visible characters', () => {
  assert.equal(getRecordContentLength('가'.repeat(100)), 100);
  assert.equal(isRecordContentWithinLimit('가'.repeat(100)), true);
  assert.equal(getRecordContentLength('😀'.repeat(100)), 100);
  assert.equal(isRecordContentWithinLimit('😀'.repeat(101)), false);
});

test('truncateRecordContent trims by visible Unicode characters instead of UTF-16 code units', () => {
  assert.equal(truncateRecordContent('😀'.repeat(101)), '😀'.repeat(100));
  assert.equal(getRecordContentLength(truncateRecordContent('가'.repeat(120))), 100);
});

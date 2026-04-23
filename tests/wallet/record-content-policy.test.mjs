import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORD_LENGTH,
  MAX_RECORD_UTF8_BYTES,
  getRecordContentValidationError,
  isRecordContentValid,
  getUtf8ByteLength,
} from '../../lib/record-content-policy.mjs';

test('record content policy exposes the 100 character product cap and 400 byte chain cap', () => {
  assert.equal(MAX_RECORD_LENGTH, 100);
  assert.equal(MAX_RECORD_UTF8_BYTES, 400);
});

test('record content policy rejects blank and too-long content', () => {
  assert.equal(getRecordContentValidationError(''), 'Content is required.');
  assert.equal(getRecordContentValidationError('   '), 'Content is required.');
  assert.equal(getRecordContentValidationError('a'.repeat(101)), 'Content must be 100 characters or less.');
});

test('record content policy accepts content up to the 100 character cap', () => {
  assert.equal(getRecordContentValidationError('a'.repeat(100)), '');
  assert.equal(isRecordContentValid('a'.repeat(100)), true);
  assert.equal(isRecordContentValid('a'.repeat(101)), false);
});

test('record content policy accepts 100 Korean characters because they stay under the UTF-8 byte cap', () => {
  const text = '가'.repeat(100);
  assert.equal(getUtf8ByteLength(text), 300);
  assert.equal(getRecordContentValidationError(text), '');
  assert.equal(isRecordContentValid(text), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORD_LENGTH,
  getRecordContentValidationError,
  isRecordContentValid,
} from '../../lib/record-content-policy.mjs';

test('record content policy exposes the contract-aligned 100 character cap', () => {
  assert.equal(MAX_RECORD_LENGTH, 100);
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

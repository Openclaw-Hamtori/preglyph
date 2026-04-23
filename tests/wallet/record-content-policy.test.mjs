import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RECORD_LENGTH,
  getRecordContentValidationError,
  isRecordContentValid,
} from '../../lib/record-content-policy.mjs';

test('record content policy exposes the contract-aligned 280 character cap', () => {
  assert.equal(MAX_RECORD_LENGTH, 280);
});

test('record content policy rejects blank and too-long content', () => {
  assert.equal(getRecordContentValidationError(''), 'Content is required.');
  assert.equal(getRecordContentValidationError('   '), 'Content is required.');
  assert.equal(getRecordContentValidationError('a'.repeat(281)), 'Content must be 280 characters or less.');
});

test('record content policy accepts content up to the 280 character cap', () => {
  assert.equal(getRecordContentValidationError('a'.repeat(280)), '');
  assert.equal(isRecordContentValid('a'.repeat(280)), true);
  assert.equal(isRecordContentValid('a'.repeat(281)), false);
});

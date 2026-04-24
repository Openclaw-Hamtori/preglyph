import test from 'node:test';
import assert from 'node:assert/strict';

import { getWriteFeeNotice } from '../../lib/write-fee-copy.mjs';

test('getWriteFeeNotice uses the configured USD display when available', () => {
  assert.equal(getWriteFeeNotice('$2.00'), 'Each Preglyph costs about $2.00 in ETH.');
});

test('getWriteFeeNotice falls back to the default copy when fee display is unavailable', () => {
  assert.equal(getWriteFeeNotice(''), 'Each Preglyph costs about $1 in ETH.');
});

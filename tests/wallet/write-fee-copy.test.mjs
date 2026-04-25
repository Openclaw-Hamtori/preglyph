import test from 'node:test';
import assert from 'node:assert/strict';

import { getWriteFeeNotice } from '../../lib/write-fee-copy.mjs';

test('getWriteFeeNotice mentions ETH (base) in fallback and configured copy', () => {
  assert.equal(getWriteFeeNotice(''), 'Each Preglyph costs about $1 in ETH (base).');
  assert.equal(getWriteFeeNotice('$1.23'), 'Each Preglyph costs about $1.23 in ETH (base).');
});

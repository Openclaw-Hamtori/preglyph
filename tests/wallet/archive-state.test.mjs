import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowArchiveLoading } from '../../lib/archive-state.mjs';

test('archive loading shows while records are still loading and nothing is rendered yet', () => {
  assert.equal(shouldShowArchiveLoading({ recordsLoading: true, displayedRecordCount: 0, searchQuery: '' }), true);
});

test('archive loading stays hidden when records already exist', () => {
  assert.equal(shouldShowArchiveLoading({ recordsLoading: true, displayedRecordCount: 3, searchQuery: '' }), false);
});

test('archive loading stays hidden during active search states', () => {
  assert.equal(shouldShowArchiveLoading({ recordsLoading: true, displayedRecordCount: 0, searchQuery: 'moon' }), false);
});

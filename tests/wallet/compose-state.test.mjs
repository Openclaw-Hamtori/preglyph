import test from 'node:test';
import assert from 'node:assert/strict';

import {
  shouldShowComposeBanner,
  getComposeLoadingHeadline,
} from '../../lib/compose-state.mjs';

test('compose banner stays hidden while write flow is still loading', () => {
  assert.equal(shouldShowComposeBanner({ loading: true, message: 'Transaction sent: 0xabc' }), false);
});

test('compose banner still shows non-loading error/status messages', () => {
  assert.equal(shouldShowComposeBanner({ loading: false, message: 'Write failed.' }), true);
  assert.equal(shouldShowComposeBanner({ loading: false, message: '' }), false);
});

test('compose loading headline keeps the modal in a preglyph-specific loading mode', () => {
  assert.equal(getComposeLoadingHeadline(), 'Recording Preglyph');
});

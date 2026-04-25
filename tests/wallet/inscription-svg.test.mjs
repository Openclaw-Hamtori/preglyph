import test from 'node:test';
import assert from 'node:assert/strict';

import { createInscriptionSvgMarkup } from '../../lib/inscription-svg.mjs';

test('createInscriptionSvgMarkup changes preview layout when ujongseo mode is selected', () => {
  const horizontal = createInscriptionSvgMarkup({ text: 'ABCDE', size: 3, inscriptionMode: 'horizontal' });
  const ujongseo = createInscriptionSvgMarkup({ text: 'ABCDE', size: 3, inscriptionMode: 'ujongseo' });

  assert.notEqual(horizontal, ujongseo);
  assert.match(horizontal, /<text x="280\.00" y="276\.16"[^>]*>A<\/text>/);
  assert.match(ujongseo, /<text x="920\.00" y="276\.16"[^>]*>A<\/text>/);
});

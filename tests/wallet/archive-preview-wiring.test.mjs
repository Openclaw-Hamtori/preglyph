import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../../app/page.js', import.meta.url), 'utf8');

test('archive preview passes record inscriptionMode into Inscription', () => {
  assert.match(
    pageSource,
    /<Inscription text=\{record\.content\} size=\{MATRIX_SIZE\} variant="preview" inscriptionMode=\{record\.inscriptionMode\} fontVersion=\{fontVersion\} \/>/,
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globalsCssPath = path.join(__dirname, '../../app/globals.css');
const globalsCss = readFileSync(globalsCssPath, 'utf8');

test('mobile slab grid keeps two archive blocks visible per row', () => {
  assert.match(
    globalsCss,
    /@media \(max-width: 760px\)\s*\{[\s\S]*?\.slab-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  );
});

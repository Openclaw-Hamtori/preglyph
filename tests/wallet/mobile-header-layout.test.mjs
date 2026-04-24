import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globalsCssPath = path.join(__dirname, '../../app/globals.css');
const globalsCss = readFileSync(globalsCssPath, 'utf8');

test('mobile topbar hides brand copy and keeps search beside the logo', () => {
  assert.match(
    globalsCss,
    /@media \(max-width: 760px\)[\s\S]*?\.topbar\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\);/,
  );
  assert.match(
    globalsCss,
    /@media \(max-width: 760px\)[\s\S]*?\.brand-copy\s*\{[\s\S]*?display:\s*none;/,
  );
});

test('mobile topbar keeps Profile full width under the search row', () => {
  assert.match(
    globalsCss,
    /@media \(max-width: 760px\)[\s\S]*?\.nav-actions\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/,
  );
  assert.match(
    globalsCss,
    /@media \(max-width: 760px\)[\s\S]*?\.connect-chip\s*\{[\s\S]*?width:\s*100%;/,
  );
});

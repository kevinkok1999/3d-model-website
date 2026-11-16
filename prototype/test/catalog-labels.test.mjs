import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NL_LABELS, displayLabel } from '../src/labels.js';

const catalog = JSON.parse(readFileSync(new URL('../../node_modules/open-anatomy-3d/catalog.json', import.meta.url), 'utf8'));

test('Every source key has exactly one nonempty Dutch draft label and unchanged English source label', () => {
  assert.deepEqual(Object.keys(NL_LABELS).sort(), catalog.map(entry => entry.key).sort());
  for (const entry of catalog) {
    assert.ok(displayLabel(entry, 'nl').trim().length > 0, entry.key);
    assert.equal(displayLabel(entry, 'en'), entry.label, entry.key);
  }
});

test('Unknown source key is not assigned invented anatomical terminology', () => {
  assert.equal(displayLabel({ key: 'unreviewed_key', label: 'Source-only label' }, 'nl'), 'Source-only label');
});

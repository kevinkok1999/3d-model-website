import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJSON = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const domains = Array.from({ length: 10 }, (_, index) => `GAP-${String(index + 1).padStart(2, '0')}`);
const evidenceStates = ['missing-geometry', 'group-only', 'hotspot-only', 'unverified'];
const reference = () => readJSON('../../model-audit/coverage-ledger.draft.json');
const register = () => readJSON('../../model-audit/expansion-register.draft.json');

test('expansion targets are draft-only and are not a complete anatomy denominator', () => {
  const data = register();
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.status, 'DRAFT_NOT_FOR_RELEASE');
  assert.equal(data.isComplete, false);
  assert.equal(data.isGeometryValidated, false);
  assert.equal(data.isScientificallyReviewed, false);
  assert.equal(data.candidateRevision, reference().source.revision);
  assert.ok(Array.isArray(data.targets));
  assert.ok(data.targets.length >= 80);
});

test('all ten gap domains have at least eight distinct named targets, with stable IDs', () => {
  const data = register();
  assert.deepEqual(Object.keys(data.domains).sort(), domains);
  assert.equal(data.targets.length, new Set(data.targets.map(({ id }) => id)).size);
  for (const gapId of domains) {
    const rows = data.targets.filter(record => record.gapId === gapId);
    assert.ok(rows.length >= 8, `${gapId} needs at least eight named targets`);
    assert.equal(rows.length, new Set(rows.map(row => `${row.en}|${row.laterality}|${row.variant}`)).size);
  }
  for (const row of data.targets) {
    assert.ok(domains.includes(row.gapId));
    assert.match(row.id, /^target:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:(left|right|bilateral|midline|none):(male|female|both)$/);
    assert.ok(row.id.endsWith(`:${row.laterality}:${row.variant}`));
    assert.notEqual(row.category.trim(), '');
    assert.ok(row.nl.trim() && row.en.trim());
    assert.ok(evidenceStates.includes(row.state));
    assert.ok(['structure', 'microstructure', 'movement'].includes(row.targetKind));
    const url = new URL(row.sourceUrl);
    assert.equal(url.protocol, 'https:');
    assert.ok(data.sources.some(source => source.url === row.sourceUrl), 'source must be in source register');
  }
});

test('candidate pointers refer only to existing upstream catalog keys and matching variant scope', () => {
  const candidates = reference().rows;
  for (const row of register().targets) {
    const key = row.candidateKey;
    assert.ok(key === null || typeof key === 'string');
    if (row.state === 'missing-geometry') assert.equal(key, null);
    if (row.state === 'group-only' || row.state === 'hotspot-only') assert.ok(key);
    if (key === null) continue;
    const matched = candidates.filter(candidate => candidate.key === key);
    assert.ok(matched.length > 0, `${row.id}: unknown candidate key ${key}`);
    const variants = new Set(matched.map(candidate => candidate.variant));
    if (row.variant === 'both') assert.ok(variants.has('male') && variants.has('female'), row.id);
    else assert.ok(variants.has(row.variant), row.id);
    if (row.state === 'hotspot-only') assert.ok(matched.every(candidate => candidate.kind === 'hotspot'), row.id);
    if (row.state === 'group-only') assert.ok(matched.every(candidate => candidate.kind !== 'hotspot'), row.id);
  }
});

test('the draft cannot silently mark any target as accepted or bypass quality axes', () => {
  const data = register();
  assert.deepEqual(data.requiredQualityAxes, reference().coveragePolicy.requiredAxes);
  assert.deepEqual(data.requiredContent, reference().coveragePolicy.requiredContent);
  for (const row of data.targets) {
    assert.equal(row.reviewStatus, 'NOT_RUN');
    assert.equal(row.isReleaseEligible, false);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Inventory-contract tests only. The underlying OBJ archive, ELEMENT map,
// clinical accuracy and rights for each asset are not verified by these tests.
const inventory = JSON.parse(readFileSync(new URL('../../model-audit/bodyparts3d-intake-candidates.json', import.meta.url), 'utf8'));
const keys = ['fma', 'representation', 'sourceLabel', 'sourceCatalog', 'proposedSystem', 'elementFileIds', 'reviewState'];

test('BodyParts3D intake pins an official source and has no downloaded geometry claim', () => {
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.status, 'CANDIDATE_INVENTORY_NOT_DOWNLOADED');
  const expected = {
    release: '4.0', catalogType: 'IS-A', referenceVariant: 'adult_male', declaredLicense: 'CC-BY-4.0',
    catalogUrl: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt',
    elementMappingUrl: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt',
    modelArchiveUrl: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip',
    sourceLicenseUrl: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
  };
  for (const [field, value] of Object.entries(expected)) assert.equal(inventory.source[field], value, field);
  assert.match(inventory.source.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(new Date(inventory.source.verifiedAt).getTime());
  assert.equal(inventory.candidates.length, 21);
});

test('BodyParts3D intake rows are unique and explicitly unreviewed; no asset-presence claim', () => {
  const fma = new Set(), bp = new Set(), labels = new Set(), bySystem = new Map();
  for (const row of inventory.candidates) {
    assert.deepEqual(Object.keys(row).sort(), [...keys].sort(), row.sourceLabel);
    assert.match(row.fma, /^FMA[1-9]\d*$/);
    assert.match(row.representation, /^BP[1-9]\d*$/);
    assert.equal(row.sourceCatalog, 'IS-A');
    assert.equal(row.reviewState, 'NOT_DOWNLOADED');
    assert.ok(Array.isArray(row.elementFileIds) && row.elementFileIds.length > 0);
    assert.equal(new Set(row.elementFileIds).size, row.elementFileIds.length);
    for (const fileId of row.elementFileIds) assert.match(fileId, /^FJ[1-9]\d*M?$/);
    assert.ok(['skeleton', 'muscles', 'vessels'].includes(row.proposedSystem));
    assert.ok(row.sourceLabel.trim() && !labels.has(row.sourceLabel));
    assert.ok(!fma.has(row.fma), `duplicate FMA ${row.fma}`);
    assert.ok(!bp.has(row.representation), `duplicate BP ${row.representation}`);
    fma.add(row.fma); bp.add(row.representation); labels.add(row.sourceLabel);
    bySystem.set(row.proposedSystem, (bySystem.get(row.proposedSystem) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(bySystem), { skeleton: 6, muscles: 8, vessels: 7 });
  assert.equal(inventory.candidates.reduce((sum, row) => sum + row.elementFileIds.length, 0), 23);
});

test('BodyParts3D exact sampled catalog keys and labels remain stable in the intake manifest', () => {
  // These form transcription regression checks, not an independent live source fetch.
  const candidate = new Map(inventory.candidates.map(row => [row.fma, row]));
  for (const [fma, bp, label, ids] of [
    ['FMA24475', 'BP9042', 'left femur', ['FJ3259']],
    ['FMA24501', 'BP8599', 'navicular bone of left foot', ['FJ3307']],
    ['FMA37685', 'BP9153', 'short head of left biceps brachii', ['FJ1512M']],
    ['FMA37687', 'BP8816', 'long head of left biceps brachii', ['FJ1478M']],
    ['FMA38480', 'BP7826', 'left flexor digitorum profundus', ['FJ1497M']],
    ['FMA22734', 'BP6336', 'left radial artery', ['FJ2242']],
    ['FMA22949', 'BP5928', 'left radial vein', ['FJ2244']],
    ['FMA3815', 'BP7824', 'first anterior ventricular branch of right coronary artery', ['FJ2671', 'FJ2673', 'FJ2677']],
  ]) {
    assert.equal(candidate.get(fma)?.representation, bp);
    assert.equal(candidate.get(fma)?.sourceLabel, label);
    assert.deepEqual(candidate.get(fma)?.elementFileIds, ids);
  }
});

test('BodyParts3D explicitly records nerve and female geometry blockers without fake source records', () => {
  assert.equal(inventory.candidates.filter(row => row.proposedSystem === 'nerves').length, 0);
  assert.ok(inventory.openSourceGaps.some(row => row.proposedSystem === 'nerves' && row.reviewState === 'BLOCKED_SOURCE_MAPPING'));
  assert.ok(inventory.openSourceGaps.some(row => row.proposedSystem === 'all' && row.reviewState === 'BLOCKED_VARIANT_SOURCE'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { auditCatalog, auditGeometry, parseGlb } from '../../model-audit/audit-model.mjs';

// Verifies the actual installed, pinned npm candidate and its structural metadata.
// It does not verify anatomy, visual fidelity, GLTF conformance or clinical accuracy.
const root = fileURLToPath(new URL('..', import.meta.url));
const packageDir = [resolve(root, 'node_modules/open-anatomy-3d'), resolve(root, '../node_modules/open-anatomy-3d')]
  .find(dir => existsSync(resolve(dir, 'package.json')));
const expected = {
  catalog: { path: 'catalog.json', bytes: 23585, git: 'a40951e9587e4acee5bba31d89e957604679e486' },
  male: { path: 'models/anatomy-male.glb', bytes: 7614076, git: 'f173c5a08e93fb3eef85c64859680b94ad7c2aed', eligible: 140, meshes: 128 },
  female: { path: 'models/anatomy-female.glb', bytes: 8134732, git: '53a6203083490251fd7bb6421f5698db9bccd4c9', eligible: 145, meshes: 133 }
};
const pinnedCommit = 'c050aa7b1bc56ceed668199b01ea017341928d7b';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const readAsset = key => {
  assert.ok(packageDir, 'Install the pinned open-anatomy-3d package in prototype/ first');
  return readFileSync(resolve(packageDir, expected[key].path));
};
const readCatalog = () => JSON.parse(readAsset('catalog').toString('utf8'));

test('installed package provenance: version 0.1.0', () => {
  assert.ok(packageDir, 'Missing npm package open-anatomy-3d');
  assert.equal(JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8')).version, '0.1.0');
});

test('real npm catalog: 147 unique source records, variant and hotspot counts', () => {
  const catalog = readCatalog();
  assert.equal(catalog.length, 147);
  assert.equal(new Set(catalog.map(x => x.key)).size, 147);
  assert.ok(catalog.some(x => x.key === 'deltoid_l' && x.system === 'muscles'));
  assert.ok(catalog.some(x => x.key === 'deltoid_r' && x.system === 'muscles'));
  for (const variant of ['male','female']) {
    const report = auditCatalog(catalog, variant);
    assert.deepEqual(report.errors, []);
    assert.equal(report.eligible, expected[variant].eligible);
    assert.equal(report.meshExpected, expected[variant].meshes);
    assert.equal(report.hotspotExpected, 12);
  }
});

for (const variant of ['male','female']) {
  test(`actual ${variant} GLB: glTF 2.0 container, BIN data and exact variant mesh mapping`, t => {
    const bytes = readAsset(variant);
    const parsed = parseGlb(bytes);
    assert.equal(parsed.json.asset.version, '2.0');
    assert.equal(parsed.chunks.filter(x => x.type === 'JSON').length, 1);
    assert.equal(parsed.chunks.filter(x => x.type === 'BIN').length, 1);
    assert.ok(parsed.chunks.find(x => x.type === 'BIN').length > 0);
    const report = auditGeometry(readCatalog(), variant, bytes);
    t.diagnostic(JSON.stringify({ variant, bytes: report.byteLength, sha256: report.sha256, meshCount: report.meshCount,
      nodeCount: report.nodeCount, mapped: report.mappedMeshNodes, expectedMeshes: report.meshExpected, hotspots: report.hotspotExpected,
      eligible: report.eligible, usedExtensions: report.extensionsUsed, requiredExtensions: report.extensionsRequired, errors: report.errors }));
    assert.deepEqual(report.errors, [], 'Do not guess aliases for missing, duplicated or unknown named nodes');
    assert.equal(report.eligible, expected[variant].eligible);
    assert.equal(report.meshExpected, expected[variant].meshes);
    assert.equal(report.mappedMeshNodes, expected[variant].meshes);
    assert.equal(report.hotspotExpected, 12);
    const catalog = readCatalog().filter(x => !x.sex || x.sex === variant);
    for (const hotspot of catalog.filter(x => x.system === 'joints')) {
      assert.ok(!parsed.json.nodes.some(node => node.name === hotspot.key && Number.isInteger(node.mesh)), `Joint hotspot must not be reported as mesh: ${hotspot.key}`);
    }
  });
}

for (const asset of Object.keys(expected)) {
  test(`${asset}: installed package bytes match recorded Git blob at ${pinnedCommit}`, t => {
    const bytes = readAsset(asset);
    const observed = { bytes: bytes.length, git: gitBlob(bytes), sha256: sha256(bytes) };
    t.diagnostic(JSON.stringify({ asset, pinnedCommit, expected: { bytes: expected[asset].bytes, git: expected[asset].git }, actual: observed }));
    assert.equal(observed.bytes, expected[asset].bytes, 'Different byte length: inspect provenance before claiming equivalence');
    assert.equal(observed.git, expected[asset].git, 'Different Git blob: npm and pinned Git source are not byte-identical');
  });
}

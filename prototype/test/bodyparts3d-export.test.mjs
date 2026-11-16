import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const manifestPath = fileURLToPath(new URL('../../model-audit/bodyparts3d-intake-candidates.json', import.meta.url));
const combinedManifestPath = fileURLToPath(new URL('../../model-audit/bodyparts3d-combined-candidates.json', import.meta.url));
const auditScript = fileURLToPath(new URL('../../model-audit/bodyparts3d-obj-audit.py', import.meta.url));
const exportScript = fileURLToPath(new URL('../../model-audit/bodyparts3d-export.py', import.meta.url));
const input = JSON.parse(readFileSync(manifestPath, 'utf8'));
const ids = [...new Set(input.candidates.flatMap(row => row.elementFileIds))].sort();
const obj = 'v -2 8 12\nv -1 8 12\nv -1 10 12\nv -2 10 12\nf -4 -3 -2 -1\n';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture(t, override = {}, inventoryPath = manifestPath) {
  const elementIds = [...new Set(JSON.parse(readFileSync(inventoryPath, 'utf8')).candidates.flatMap(row => row.elementFileIds))].sort();
  const dir = mkdtempSync(join(tmpdir(), 'bp-export-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const zip = join(dir, 'fixture.zip'), audit = join(dir, 'audit.json');
  const built = spawnSync('python3', ['-c', `import sys,json,zipfile
with zipfile.ZipFile(sys.argv[1], 'w') as out:
    for k,v in json.load(sys.stdin): out.writestr(k,v)
`, zip], { input: JSON.stringify(elementIds.map(id => [`model/${id}.obj`, override[id] ?? obj])), encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const audited = spawnSync('python3', [auditScript, zip, inventoryPath, audit], { encoding: 'utf8' });
  assert.equal(audited.status, 0, audited.stderr);
  return { zip, audit, dir, run: (subdir = dir) => {
    const glb = join(subdir, 'geometry.glb'), report = join(subdir, 'export.json');
    const result = spawnSync('python3', [exportScript, zip, inventoryPath, audit, glb, report], { encoding: 'utf8' });
    return { result, glb, report: JSON.parse(readFileSync(report, 'utf8')) };
  }};
}

test('combined export admits exactly 71 curated concepts and 74 separate source-coordinate elements', t => {
  const combined = JSON.parse(readFileSync(combinedManifestPath, 'utf8'));
  const { result, glb, report } = fixture(t, {}, combinedManifestPath).run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.clinicallyVerified, false);
  assert.equal(report.registration, 'UNREGISTERED_SOURCE_COORDINATES');
  assert.equal(report.manifestSha256, digest(readFileSync(combinedManifestPath)));
  assert.equal(report.conceptMappings.length, 71);
  assert.equal(report.files.length, 74);
  assert.deepEqual(report.source, combined.source);
  const { doc } = readGlb(readFileSync(glb));
  assert.equal(doc.nodes.length, 74);
  assert.deepEqual(doc.nodes.map(x=>x.name), [...new Set(combined.candidates.flatMap(x=>x.elementFileIds))].sort());
  assert.ok(doc.nodes.every(n=>n.matrix===undefined && n.translation===undefined && n.rotation===undefined && n.scale===undefined));
  assert.deepEqual(report.conceptMappings.find(x=>x.fma==='FMA52749').elementFileIds, ['FJ2772','FJ3201']);
});

test('combined export rejects altered inventory even when its geometry audit passed', t => {
  const dir = mkdtempSync(join(tmpdir(), 'bp-altered-'));
  t.after(() => rmSync(dir, {recursive:true,force:true}));
  const altered = JSON.parse(readFileSync(combinedManifestPath, 'utf8'));
  altered.candidates[70].proposedDutchLabel = 'invented';
  const path = join(dir, 'altered.json');
  writeFileSync(path, JSON.stringify(altered));
  const { result, glb, report } = fixture(t, {}, path).run();
  assert.notEqual(result.status, 0);
  assert.equal(report.status, 'GEOMETRY_EXPORT_FAILED');
  assert.equal(existsSync(glb), false);
});

function readGlb(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonSize = buffer.readUInt32LE(12);
  assert.equal(buffer.toString('ascii', 16, 20), 'JSON');
  const doc = JSON.parse(buffer.toString('utf8', 20, 20 + jsonSize));
  const start = 20 + jsonSize;
  assert.equal(buffer.toString('ascii', start + 4, start + 8), 'BIN\0');
  return { doc, bin: buffer.subarray(start + 8) };
}

test('one deterministic, separate raw XYZ mesh/node per exact Element ID; safe quad winding and metadata', async t => {
  const data = fixture(t), other = join(data.dir, 'repeated');
  mkdirSync(other);
  const first = data.run(), second = data.run(other);
  assert.equal(first.result.status, 0, first.result.stderr);
  assert.equal(second.result.status, 0, second.result.stderr);
  const bytes = readFileSync(first.glb), duplicate = readFileSync(second.glb);
  assert.deepEqual(bytes, duplicate);
  const { doc, bin } = readGlb(bytes);
  const { report } = first;
  assert.equal(report.status, 'GEOMETRY_EXPORT_PASSED');
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.registration, 'UNREGISTERED_SOURCE_COORDINATES');
  assert.equal(report.fixtureOnly, true);
  assert.equal(report.archive.name, 'fixture.zip');
  assert.equal(report.clinicallyVerified, false);
  assert.deepEqual(report.source, input.source);
  assert.equal(report.glb.sha256, digest(bytes));
  assert.equal(report.glb.bytes, bytes.length);
  assert.deepEqual(report.bounds, { min: [-2, 8, 12], max: [-1, 10, 12] });
  assert.equal(report.conceptMappings.length, 21);
  assert.deepEqual(report.files.map(row => row.elementFileId), ids);
  assert.deepEqual(doc.nodes.map(row => row.name), ids);
  assert.deepEqual(doc.meshes.map(row => row.name), ids);
  assert.equal(doc.scenes[0].nodes.length, 23);
  for (const [i, node] of doc.nodes.entries()) {
    assert.equal(node.mesh, i);
    for (const transform of ['matrix', 'translation', 'rotation', 'scale']) assert.ok(!(transform in node));
    assert.equal(report.files[i].nodeIndex, i);
    const primitive = doc.meshes[i].primitives[0], pos = doc.accessors[primitive.attributes.POSITION], ix = doc.accessors[primitive.indices];
    assert.equal(primitive.mode, 4);
    assert.equal(pos.componentType, 5126);
    assert.equal(ix.componentType, 5125);
    const start = doc.bufferViews[pos.bufferView].byteOffset;
    assert.deepEqual(Array.from({ length: 12 }, (_, j) => bin.readFloatLE(start + j * 4)), [-2,8,12,-1,8,12,-1,10,12,-2,10,12]);
    const indexStart = doc.bufferViews[ix.bufferView].byteOffset;
    assert.deepEqual(Array.from({ length: 6 }, (_, j) => bin.readUInt32LE(indexStart + j * 4)), [0,1,2,0,2,3]);
  }
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  assert.deepEqual(gltf.scene.children.map(mesh => mesh.name), ids);
  assert.ok(gltf.scene.children.every(mesh => mesh.isMesh && mesh.geometry.index.count === 6));
});

test('modified archive/audit hashes are rejected without partial GLB', t => {
  const data = fixture(t);
  const audit = JSON.parse(readFileSync(data.audit, 'utf8'));
  audit.files[0].sha256 = '0'.repeat(64);
  writeFileSync(data.audit, JSON.stringify(audit));
  const { result, glb, report } = data.run();
  assert.notEqual(result.status, 0);
  assert.equal(report.status, 'GEOMETRY_EXPORT_FAILED');
  assert.equal(existsSync(glb), false);
});

test('concave, self-intersecting, nonplanar and nonrepresentable polygons fail safely', t => {
  for (const invalid of [
    'v 0 0 0\nv 2 0 0\nv 1 .1 0\nv 2 2 0\nv 0 2 0\nf 1 2 3 4 5\n',
    'v 0 0 0\nv 2 2 0\nv 2 0 0\nv 0 2 0\nf 1 2 3 4\n',
    'v 0 0 0\nv 2 0 0\nv 2 2 0.1\nv 0 2 0\nf 1 2 3 4\n',
    'v 1e300 0 0\nv 2 0 0\nv 0 2 0\nf 1 2 3\n',
  ]) {
    const { result, glb, report } = fixture(t, { [ids[0]]: invalid }).run();
    assert.notEqual(result.status, 0);
    assert.equal(report.status, 'GEOMETRY_EXPORT_FAILED');
    assert.equal(existsSync(glb), false);
  }
});

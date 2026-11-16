import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyLandmarkEvidence } from '../../model-audit/landmark-evidence.mjs';

const triangle = () => ({
  asset: { id: 'fixture-source', sha256: 'a'.repeat(64) },
  coordinateSpace: 'GLTF_PRIMITIVE_POSITION', nodeIndex: 3, meshIndex: 8,
  primitiveIndex: 1, triangleIndex: 9, vertexIndices: [7, 9, 6],
  vertices: [[1, 2, 3], [5, 2, 3], [1, 8, 3]],
});
const evidence = () => ({ schemaVersion: 1, ...triangle(), barycentric: [0.5, 0.25, 0.25], point: [2, 3.5, 3] });

test('verifies a native triangle point and never promotes anatomical, registration, unit or merge claims', () => {
  const row = evidence(), witnesses = [triangle()];
  const result = verifyLandmarkEvidence(row, witnesses);
  assert.equal(result.status, 'NATIVE_LANDMARK_EVIDENCE_PASS');
  assert.equal(result.sourceBytesVerified, false);
  assert.equal(result.physicalUnitVerified, false);
  assert.equal(result.anatomicallyValidated, false);
  assert.equal(result.registrationAuthorized, false);
  assert.equal(result.mergeAuthorized, false);
  assert.match(result.evidenceSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(result, verifyLandmarkEvidence(Object.fromEntries(Object.entries(row).reverse()), [triangle()]));
  assert.deepEqual(row, evidence());
  assert.deepEqual(witnesses, [triangle()]);
});

test('accepts edge and vertex captures without confusing native units or node identity', () => {
  const row = evidence();
  row.barycentric = [0, 0.5, 0.5]; row.point = [3, 5, 3];
  assert.equal(verifyLandmarkEvidence(row, [triangle()]).status, 'NATIVE_LANDMARK_EVIDENCE_PASS');
  const second = evidence(); second.barycentric = [1, 0, 0]; second.point = [1, 2, 3];
  assert.notEqual(verifyLandmarkEvidence(second, [triangle()]).evidenceSha256, verifyLandmarkEvidence(row, [triangle()]).evidenceSha256);
});

test('selects a unique full source/node/mesh/primitive/triangle identity; evidence cannot serve as its own witness', () => {
  const row = evidence(), alternate = triangle(); alternate.nodeIndex++;
  assert.deepEqual(verifyLandmarkEvidence(row, [alternate, triangle()]), verifyLandmarkEvidence(row, [triangle()]));
  assert.throws(() => verifyLandmarkEvidence(row, []));
  assert.throws(() => verifyLandmarkEvidence(row, [row]));
  assert.throws(() => verifyLandmarkEvidence(row, [alternate]));
  assert.throws(() => verifyLandmarkEvidence(row, [triangle(), triangle()]));
  const altered = triangle(); altered.vertices[0][0] += 0.1;
  assert.throws(() => verifyLandmarkEvidence(row, [triangle(), altered]));
  for (const mutate of [
    x => x.asset.id = 'another-source', x => x.asset.sha256 = 'b'.repeat(64),
    x => x.nodeIndex++, x => x.meshIndex++, x => x.primitiveIndex++, x => x.triangleIndex++,
  ]) {
    const witness = triangle(); mutate(witness);
    assert.throws(() => verifyLandmarkEvidence(row, [witness]));
  }
});

test('rejects changed original triangle indices, ordered vertices and interpolated point', () => {
  for (const mutate of [
    x => x.vertexIndices[0]++, x => x.vertexIndices.reverse(), x => x.vertices.reverse(),
    x => x.vertices[1][0] += 1e-10, x => x.barycentric = [0.25, 0.5, 0.25],
    x => x.point[2] += 0.001, x => x.point[0] += 0.1,
  ]) {
    const row = evidence(); mutate(row);
    assert.throws(() => verifyLandmarkEvidence(row, [triangle()]));
  }
});

test('rejects malformed fields, non-finite values, arbitrary spaces and unsupported privilege claims', () => {
  for (const mutate of [
    x => x.schemaVersion = 2, x => x.coordinateSpace = 'WORLD', x => x.asset.sha256 = 'A'.repeat(64),
    x => x.asset.id = '', x => x.asset.unit = 'mm', x => x.nodeIndex = -1,
    x => x.meshIndex = 1.1, x => x.primitiveIndex = Number.MAX_SAFE_INTEGER + 1,
    x => x.triangleIndex = NaN, x => x.vertexIndices[0] = Infinity,
    x => delete x.vertexIndices[1], x => x.vertices[0][0] = NaN,
    x => delete x.point[1], x => x.point[0] = Infinity, x => x.point[0] = '2',
    x => x.barycentric = [0.1, 0.2, 0.3], x => x.barycentric = [-0.01, 0.51, 0.5],
    x => x.barycentric = [1.01, 0, -0.01], x => x.barycentric[0] = NaN,
    x => x.vertices.push([1, 2, 3]), x => x.barycentric.push(0),
    x => x.anatomicallyValidated = true, x => x.registrationAuthorized = true,
  ]) {
    const row = evidence(); mutate(row);
    assert.throws(() => verifyLandmarkEvidence(row, [triangle()]));
  }
  const sparse = new Array(2); sparse[1] = triangle();
  assert.throws(() => verifyLandmarkEvidence(evidence(), sparse));
});

test('rejects geometrically degenerate or unreliably conditioned evidence even with a matching witness', () => {
  for (const [vertices, indices] of [
    [[[0,0,0], [0,0,0], [0,0,0]], [1,2,3]],
    [[[0,0,0], [1,1,1], [2,2,2]], [1,2,3]],
    [[[0,0,0], [1,0,0], [0,1e-14,0]], [1,2,3]],
    [[[0,0,0], [1,0,0], [0,1,0]], [1,1,3]],
    [[[0,0,0], [1e308,0,0], [0,1e308,0]], [1,2,3]],
  ]) {
    const witness = triangle(); witness.vertices = vertices; witness.vertexIndices = indices;
    const row = { schemaVersion: 1, ...structuredClone(witness), barycentric: [1,0,0], point: vertices[0] };
    assert.throws(() => verifyLandmarkEvidence(row, [witness]));
  }
});

test('interpolation verification is scale-aware for small native triangles, not a physical-unit tolerance', () => {
  const witness = triangle(); witness.vertices = [[0,0,0],[1e-12,0,0],[0,1e-12,0]];
  const row = {schemaVersion:1,...structuredClone(witness),barycentric:[0.5,0.25,0.25],point:[2.5e-13,2.5e-13,0]};
  assert.equal(verifyLandmarkEvidence(row, [witness]).status, 'NATIVE_LANDMARK_EVIDENCE_PASS');
  row.point[2] = 1e-12;
  assert.throws(() => verifyLandmarkEvidence(row, [witness]));
});

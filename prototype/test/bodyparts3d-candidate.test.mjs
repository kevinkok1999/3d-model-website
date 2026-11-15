import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import inventory from '../../model-audit/bodyparts3d-intake-candidates.json' with { type: 'json' };
import {
  validateCandidateManifest, validateCandidateGlb, candidateLabel, selectCandidateConcepts,
  CANDIDATE_CONCEPTS, candidateElementIds,
} from '../src/bodyparts3d-candidate-data.js';

const ZERO_HASH = '0'.repeat(64);
const bounds = { min: [0, 0, 0], max: [1, 1, 1] };
const elements = [...new Set(inventory.candidates.flatMap(row => row.elementFileIds))].sort();
function manifestFixture() {
  return {
    schemaVersion: 1, status: 'GEOMETRY_EXPORT_PASSED', clinicallyVerified: false,
    registration: 'UNREGISTERED_SOURCE_COORDINATES', source: structuredClone(inventory.source),
    fixtureOnly:true, archive:{name:'SYNTHETIC-QA-ONLY.zip',sha256:ZERO_HASH,bytes:200},
    manifestSha256:ZERO_HASH, scope:'Synthetic test-only provenance',
    glb: { name: 'model.glb', sha256: ZERO_HASH, bytes: 24 }, bounds,
    files: elements.map((elementFileId, nodeIndex) => ({
      elementFileId, nodeIndex, bounds, sourceBounds: bounds,
      memberPath: `${elementFileId}.obj`, vertexCount: 3, triangleCount: 1,
      bytes: 64, sha256: ZERO_HASH,
    })),
    conceptMappings: inventory.candidates.map(row => ({
      fma: row.fma, representation: row.representation, sourceLabel: row.sourceLabel,
      elementFileIds: [...row.elementFileIds], status: 'PASSED',
    })),
  };
}

/** Synthetic GLB metadata only for validator tests, never used in runtime. */
function glbFixture(manifest, mutate = () => {}) {
  const {glb,...metadata}=manifest;
  const json = {
    extras: structuredClone(metadata),
    asset: { version: '2.0' }, scene: 0,
    scenes: [{ nodes: elements.map((_, i) => i) }],
    nodes: elements.map((name, i) => ({ name, mesh: i })),
    meshes: elements.map(name => ({ name, primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] })),
    accessors: [
      { bufferView:0, componentType:5126, count:3, type:'VEC3', min:bounds.min, max:bounds.max },
      { bufferView:1, componentType:5123, count:3, type:'SCALAR' },
    ],
    buffers: [{ byteLength: 44 }],
    bufferViews: [{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
  };
  mutate(json);
  const encoded = Buffer.from(JSON.stringify(json));
  const padded = Math.ceil(encoded.length / 4) * 4;
  const output = Buffer.alloc(12 + 8 + padded + 8 + 44);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(padded, 12); output.writeUInt32LE(0x4e4f534a, 16);
  output.fill(0x20, 20, 20 + padded); encoded.copy(output, 20);
  output.writeUInt32LE(44, 20 + padded); output.writeUInt32LE(0x004e4942, 24 + padded);
  manifest.glb = { name:'model.glb', bytes:output.length, sha256:createHash('sha256').update(output).digest('hex') };
  return output;
}

test('Manifest matches all 21 official draft concepts and 23 exact ELEMENT ids, including composite concept', () => {
  const manifest = manifestFixture();
  const actual = validateCandidateManifest(manifest);
  assert.equal(actual.conceptMappings.length, 21);
  assert.equal(actual.files.length, 23);
  assert.deepEqual(CANDIDATE_CONCEPTS.map(x => x.fma), inventory.candidates.map(x => x.fma));
  assert.deepEqual(candidateElementIds(find('FMA3815')), ['FJ2671','FJ2673','FJ2677']);
  assert.equal(candidateLabel(find('FMA24475'), 'en'), 'left femur');
  assert.match(candidateLabel(find('FMA24475'), 'nl'), /links/i);
});

function find(fma) { return CANDIDATE_CONCEPTS.find(row => row.fma === fma); }

test('Missing, altered, unverified or duplicate evidence fails closed', () => {
  for (const mutate of [
    m => { m.conceptMappings.pop(); },
    m => { m.files.pop(); },
    m => { m.files[0].nodeIndex = m.files[1].nodeIndex; },
    m => { m.conceptMappings[0].elementFileIds = ['FJ888888']; },
    m => { m.conceptMappings[0].sourceLabel = 'invented'; },
    m => { m.clinicallyVerified = true; },
    m => { m.registration = 'REGISTERED'; },
    m => { m.source.referenceVariant = 'female'; },
    m => { delete m.fixtureOnly; },
    m => { m.fixtureOnly = false; },
    m => { m.archive.name='isa_BP3D_4.0_obj_99.zip'; },
    m => { m.glb.name = 'https://example.com/model.glb'; },
    m => { m.glb.bytes = 2**31; },
    m => { m.status = 'CANDIDATE_INVENTORY_NOT_DOWNLOADED'; },
  ]) {
    const manifest = manifestFixture(); mutate(manifest);
    assert.throws(() => validateCandidateManifest(manifest));
  }
});

test('GLB must match manifest exact byte length, SHA256, node names and all unregistered source transforms', async () => {
  const manifest = manifestFixture(), glb = glbFixture(manifest);
  assert.equal((await validateCandidateGlb(glb, manifest)).nodes.length, elements.length);
  const corrupt = Buffer.from(glb); corrupt[corrupt.length - 1] ^= 1;
  await assert.rejects(() => validateCandidateGlb(corrupt, manifest), /sha256/i);
  await assert.rejects(() => validateCandidateGlb(glb.subarray(0, -1), manifest), /length|bytes/i);
  for (const mutate of [
    json => { json.nodes[0].name = 'invented'; },
    json => { json.nodes[0].translation = [1,0,0]; },
    json => { json.nodes[0].mesh = json.nodes[1].mesh; },
    json => { json.scenes[0].nodes.pop(); },
    json => { json.buffers[0].uri = 'https://example.com/remote.bin'; },
    json => { json.extras.fixtureOnly = false; },
  ]) {
    const m = manifestFixture(), bad = glbFixture(m, mutate);
    await assert.rejects(() => validateCandidateGlb(bad, m));
  }
});

test('Candidate bilingual search and regional/system filters preserve a concept once', () => {
  assert.equal(selectCandidateConcepts(CANDIDATE_CONCEPTS).length, 21);
  assert.equal(selectCandidateConcepts(CANDIDATE_CONCEPTS, {region:'lower-limb', system:'skeleton'}).length, 5);
  assert.deepEqual(selectCandidateConcepts(CANDIDATE_CONCEPTS, {query:'dijbeen links'}).map(x=>x.fma), ['FMA24475']);
  assert.deepEqual(selectCandidateConcepts(CANDIDATE_CONCEPTS, {query:'RAdial artery left',locale:'en'}).map(x=>x.fma), ['FMA22734']);
  assert.deepEqual(selectCandidateConcepts(CANDIDATE_CONCEPTS, {query:'FMA3815'}).map(x=>x.fma), ['FMA3815']);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Metadata-contract checks only: no network, no GLB files, no decoded geometry.
// Exact counts and SHA-1s transcribed from the official pinned Git tree and CSV text.
const inventory = JSON.parse(readFileSync(new URL('../../model-audit/hra-intake-candidates.json', import.meta.url), 'utf8'));
const commit = '27d6d493cd53761abb10f087767ec4cc74acb051';
const rawBase = `https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${commit}/digital-objects/ref-organ/`;
const expected = {
  'blood-vasculature-female': {variant:'female', version:'v1.3', system:'vessels', doi:'HBM322.KKFC.394', model:'3d-vh-f-blood-vasculature.glb', modelBytes:17875996, modelSha:'29e13d79641eabed2c1e3590d140fec005350964', crosswalkBytes:7855, crosswalkSha:'3e1646c141bd8234dea243dc0c44e0d035900c59', expectedRows:125, expectedUniqueOntologyIds:100, metadataBytes:2121, metadataSha:'cbe3b8f8f7f342473705c4d9431ee6a7d20b8813'},
  'blood-vasculature-male': {variant:'male', version:'v1.3', system:'vessels', doi:'HBM473.XTPP.725', model:'3d-vh-m-blood-vasculature.glb', modelBytes:18050040, modelSha:'a884ad03bd510ab8a29ead2ddcfe1612e1ee99f1', crosswalkBytes:7756, crosswalkSha:'b620458005bd6c67f50c2e2dca6f721e3bc06586', expectedRows:123, expectedUniqueOntologyIds:99, metadataBytes:2121, metadataSha:'91ca1282f753666f7fc740bc0b4e35f43d68cf1e'},
  'brain-female': {variant:'female', version:'v1.4', system:'nerves', doi:'HBM674.NTLM.353', model:'3d-allen-f-brain.glb', modelBytes:11983380, modelSha:'f854b1a4566e3025a1519bc38b78878da882b726', crosswalkBytes:7274, crosswalkSha:'6f16fb198bbf598d0a36ae4f755961bc8a3aea31', expectedRows:108, expectedUniqueOntologyIds:58, metadataBytes:2865, metadataSha:'1d8beb30a35a53521a89878edd49f58907b781bc'},
  'brain-male': {variant:'male', version:'v1.4', system:'nerves', doi:'HBM538.NKCT.649', model:'3d-allen-m-brain.glb', modelBytes:11982812, modelSha:'a5de26ce952e471d96ddcdf189b930de9f2e12a6', crosswalkBytes:7274, crosswalkSha:'9489946556ab9872ad896ef98eb27b78fe44899c', expectedRows:108, expectedUniqueOntologyIds:58, metadataBytes:2746, metadataSha:'be71488d821c2e8af60ca5abc41b467359c9f87b'},
};

test('HRA inventory is pinned to the official repo and exact four variants, explicitly not downloaded', () => {
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.status, 'CANDIDATE_INVENTORY_NOT_DOWNLOADED');
  assert.equal(inventory.source.repository, 'https://github.com/hubmapconsortium/hra-kg');
  assert.equal(inventory.source.commit, commit);
  assert.equal(inventory.source.refOrganTreeGitSha1, 'fb3b43f21796dc63b93e2bbb88274b300314d3b6');
  assert.equal(inventory.source.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(inventory.sources.length, 4);
  assert.deepEqual(inventory.sources.map(x=>x.id).sort(), Object.keys(expected).sort());
  for (const row of inventory.sources) {
    const e = expected[row.id];
    assert.equal(row.variant, e.variant);
    assert.equal(row.version, e.version);
    assert.equal(row.system, e.system);
    assert.equal(row.doi, `https://doi.org/10.48539/${e.doi}`);
    assert.equal(row.license, 'CC-BY-4.0');
    assert.equal(row.reviewState, 'NOT_DOWNLOADED');
  }
});

test('HRA pinned raw URLs, safe local paths and expected file metadata agree with official tree', () => {
  const local = new Set(), urls = new Set();
  for (const row of inventory.sources) {
    const e = expected[row.id];
    const root = `${rawBase}${row.id}/${e.version}/raw/`;
    assert.deepEqual(row.metadata, {url:`${root}metadata.yaml`, bytes:e.metadataBytes, gitBlobSha1:e.metadataSha});
    assert.deepEqual(row.glb, {url:`${root}${e.model}`, bytes:e.modelBytes, gitBlobSha1:e.modelSha, filename:e.model, localPath:`${row.id}/${e.model}`});
    for (const asset of [row.glb,row.crosswalk]) {
      assert.equal(asset.localPath, `${row.id}/${asset.filename}`);
      assert.ok(!local.has(asset.localPath));
      assert.ok(!urls.has(asset.url));
      assert.ok(!('sha256' in asset), 'No invented byte-level SHA-256 before intake');
      local.add(asset.localPath); urls.add(asset.url);
    }
    assert.equal(row.crosswalk.url, `${root}crosswalk.csv`);
    assert.equal(row.crosswalk.filename, 'crosswalk.csv');
    assert.equal(row.crosswalk.bytes, e.crosswalkBytes);
    assert.equal(row.crosswalk.gitBlobSha1, e.crosswalkSha);
  }
});

test('HRA crosswalk inventory counts are exact text rows, not geometry claims; repeated ontology IDs permitted', () => {
  for (const row of inventory.sources) {
    const e = expected[row.id];
    assert.deepEqual(row.crosswalk.columns, ['node_name','OntologyID','label']);
    assert.equal(row.crosswalk.expectedRows, e.expectedRows);
    assert.equal(row.crosswalk.expectedUniqueOntologyIds, e.expectedUniqueOntologyIds);
    assert.ok(row.crosswalk.expectedUniqueOntologyIds < row.crosswalk.expectedRows);
    assert.ok(!('meshCount' in row.crosswalk));
  }
  assert.equal(inventory.sources.reduce((sum,row)=>sum+row.crosswalk.expectedRows,0),464);
});

test('Optional master crosswalk is versioned independently and anatomical provenance gaps remain visible', () => {
  const m = inventory.masterCrosswalk;
  const root = `${rawBase}asct-b-3d-models-crosswalk/v1.10/raw/`;
  assert.equal(m.version, 'v1.10');
  assert.equal(m.reviewState, 'NOT_DOWNLOADED');
  assert.equal(m.license, 'CC-BY-4.0');
  assert.equal(m.metadata.url, `${root}metadata.yaml`);
  assert.equal(m.metadata.gitBlobSha1, '35091b0bbbf9acb5841614bdb931fbd245649074');
  assert.equal(m.crosswalk.url, `${root}asct-b-3d-models-crosswalk.csv`);
  assert.equal(m.crosswalk.bytes,332136);
  assert.equal(m.crosswalk.gitBlobSha1,'8238a859acb328efb7e7ba3122998387b6f86db5');
  assert.ok(inventory.sources.filter(row=>row.system==='nerves').every(row=>/mirrored/.test(row.provenanceNote) && /not an independent/.test(row.provenanceNote)));
  assert.match(inventory.sources.find(row=>row.id==='blood-vasculature-male').provenanceNote,/discrepancy/);
  assert.ok(inventory.openGaps.some(x=>x.system==='nerves' && x.reviewState==='BLOCKED_SOURCE_MAPPING'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { summarizeCoverage } from '../src/coverage.js';

const require = createRequire(import.meta.url);
const catalog = require('open-anatomy-3d/catalog.json');
const male = catalog.filter(x => !x.sex || x.sex === 'male');
const female = catalog.filter(x => !x.sex || x.sex === 'female');
const draft = { targets: [
  {id:'draft-a',state:'group-only'},
  {id:'draft-b',state:'missing-geometry'},
  {id:'draft-c',state:'hotspot-only'},
  {id:'draft-d',state:'unverified'},
] };

test('candidate source counts distinguish geometry and annotations for both variants', () => {
  const m = summarizeCoverage(male,draft), f = summarizeCoverage(female,draft);
  assert.deepEqual([m.records,m.meshes,m.hotspots],[140,128,12]);
  assert.deepEqual([f.records,f.meshes,f.hotspots],[145,133,12]);
  assert.deepEqual(m.systems,{skin:1,skeleton:28,muscles:41,organs:34,vessels:22,nerves:2,joints:12});
  assert.equal(f.systems.organs,39);
});

test('expansion backlog remains separate from candidate mesh count and cannot imply release', () => {
  const result = summarizeCoverage(male,draft);
  assert.equal(result.targets,4);
  assert.deepEqual(result.targetStates,{'missing-geometry':1,'group-only':1,'hotspot-only':1,unverified:1});
  assert.equal(result.status,'draft');
  assert.equal(result.releaseReady,false);
});

test('unknown state rejects instead of quietly classifying target as complete', () => {
  assert.throws(()=>summarizeCoverage(male,{targets:[{id:'unexpected',state:'complete'}]}),/state/i);
  assert.throws(()=>summarizeCoverage(male,{targets:[{id:'duplicate',state:'unverified'},{id:'duplicate',state:'unverified'}]}),/duplicate/i);
});

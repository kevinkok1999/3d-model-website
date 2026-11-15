import test from 'node:test';
import assert from 'node:assert/strict';
import inventory from '../../model-audit/hra-wave3-candidates.json' with {type:'json'};
import {selectWave3Sources,wave3DownloadList,auditWave3} from '../../model-audit/hra-wave3-audit.mjs';

const allowed=['pelvis-female','pelvis-male','large-intestine-female','large-intestine-male','pancreas-female','pancreas-male','spleen-female','spleen-male','prostate-male'];
const excluded=['kidney-female-left','kidney-male-left','uterus-female'];

test('Wave 3 admits precisely seven P1 and two P2 models, excluding all three HOLD models from download',()=>{
  const selected=selectWave3Sources(inventory);
  assert.deepEqual(selected.map(x=>x.id),allowed);
  assert.equal(selected.filter(x=>x.priority==='P1').length,7);
  const list=wave3DownloadList(inventory);assert.equal(list.length,18);
  for(const row of list){assert.match(row.url,/^https:\/\/raw\.githubusercontent\.com\/hubmapconsortium\/hra-kg\/27d6d493cd53761abb10f087767ec4cc74acb051\//);assert.ok(row.bytes<25_000_000);assert.ok(!excluded.some(id=>row.path.startsWith(id+'/')));}
});

test('Any replacement source pin, priority, exclusion, repository or version fails before acquisition',()=>{
  for(const change of [
    m=>{m.sources.find(s=>s.id===excluded[0]).priority='P1';},
    m=>{m.sources.find(s=>s.id===allowed[0]).priority='HOLD';},
    m=>{m.sources[0].glb.gitBlobSha1='0'.repeat(40);},
    m=>{m.sources[0].crosswalk.expectedRows=25;},
    m=>{m.sources[0].glb.localPath='../foreign.glb';},
    m=>{m.sources[0].version='v1.2';},
    m=>{m.source.commit='f'.repeat(40);},
    m=>{m.sources.pop();},
  ]){const changed=structuredClone(inventory);change(changed);assert.throws(()=>wave3DownloadList(changed));}
});

test('Independent audit missing all source bytes fails closed while reporting every admitted source and exclusions',()=>{
  const report=auditWave3(inventory,'/not-an-existing-hra-wave3-source-dir');
  assert.equal(report.status,'BLOCKED');assert.deepEqual(report.results.map(r=>r.sourceId),allowed);
  assert.ok(report.results.every(r=>r.status==='BLOCKED'&&r.anatomicallyValidated===false&&r.mergeAuthorized===false));
  assert.deepEqual(report.excludedSources.map(r=>r.id),excluded);
  assert.ok(report.excludedSources.every(r=>r.priority==='HOLD'&&r.status==='EXCLUDED_SOURCE_CONFLICT'));
  assert.equal(report.anatomicallyValidated,false);assert.equal(report.mergeAuthorized,false);
});

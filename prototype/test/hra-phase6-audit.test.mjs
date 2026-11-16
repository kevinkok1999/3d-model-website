import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditHraManifest, validatePhase6Manifest } from '../../model-audit/hra-reference-audit.mjs';

const load=name=>JSON.parse(readFileSync(new URL(`../../model-audit/${name}`,import.meta.url),'utf8'));
const manifest=load('hra-phase6-candidates.json'),expanded=load('hra-expanded-candidates.json'),wave3=load('hra-wave3-candidates.json'),next=load('hra-next-candidates.json');
const opts={wave:'phase6'}, changed=mutate=>{const copy=structuredClone(manifest);mutate(copy);return copy};
const fixture=t=>{const dir=mkdtempSync(join(tmpdir(),'hra-phase6-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir};
const byId=(m,id)=>m.sources.find(s=>s.id===id);

test('Phase 6 exact canonical source and exclusion scope retains 23 models, four blocks and all gap tickets',()=>{
  const allowed=wave3.sources.filter(s=>s.priority!=='HOLD'),holds=wave3.sources.filter(s=>s.priority==='HOLD');
  assert.deepEqual(manifest.sources,[...expanded.sources,...allowed]);
  assert.equal(manifest.sources.length,23);
  assert.equal(new Set(manifest.sources.map(s=>s.id)).size,23);
  assert.equal(manifest.sources.filter(s=>s.priority==='P1').length,7);
  assert.deepEqual(manifest.sources.filter(s=>s.priority==='P2').map(s=>s.id),['large-intestine-female','prostate-male']);
  assert.equal(byId(manifest,'lung-male').version,'v1.3');
  assert.deepEqual(manifest.excludedSources,[...expanded.excludedSources,...holds.map(s=>({id:s.id,variant:s.variant,version:s.version,priority:s.priority,status:'EXCLUDED_SOURCE_CONFLICT',reason:s.provenanceNote}))]);
  assert.deepEqual(manifest.openGaps,[...expanded.openGaps,...wave3.openGaps]);
  assert.equal(manifest.excludedSources.length,4);
  assert.equal(validatePhase6Manifest(manifest),manifest);
});

test('Phase 6 asset-independent gate rejects omissions, duplicates, HOLD substitution and source demotion',()=>{
  for(const mutate of [m=>m.sources.pop(),m=>m.sources.push(m.sources[0]),m=>m.sources[1]=m.sources[0],m=>m.sources[0]=null,m=>m.sources[0]=byId(wave3,'kidney-female-left'),m=>m.sources[0].id='unverified-male'])
    assert.throws(()=>validatePhase6Manifest(changed(mutate)),/twenty-three-source/);
  for(const mutate of [m=>m.status='PASS',m=>m.wave='expanded',m=>delete m.wave,m=>m.schemaVersion=2])
    assert.throws(()=>validatePhase6Manifest(changed(mutate)),/status or scope/);
  for(const mutate of [m=>m.excludedSources.pop(),m=>m.excludedSources[0].status='PASS',m=>m.excludedSources[1].priority='P1',m=>m.excludedSources[3].reason='resolved'])
    assert.throws(()=>validatePhase6Manifest(changed(mutate)),/exclusions/);
  assert.throws(()=>validatePhase6Manifest(changed(m=>m.openGaps.pop())),/unresolved source\/coverage gaps/);
  assert.throws(()=>validatePhase6Manifest(changed(m=>m.source.commit='a'.repeat(40))),/official source metadata pin mismatch/);
  assert.throws(()=>validatePhase6Manifest(changed(m=>m.source.notes='approved')),/Frozen Phase 6 manifest pin mismatch/);
});

test('Phase 6 rejects blocked lung version, mixed assets, modified canonical pins, priority and order',()=>{
  assert.throws(()=>validatePhase6Manifest(changed(m=>m.sources[m.sources.indexOf(byId(m,'lung-male'))]=byId(next,'lung-male'))),/Blocked male lung v1.4/);
  assert.throws(()=>validatePhase6Manifest(changed(m=>byId(m,'pelvis-female').priority='HOLD')),/HOLD source/);
  for(const mutate of [m=>byId(m,'lung-male').glb=byId(next,'lung-male').glb,m=>byId(m,'lung-male').crosswalk=byId(next,'lung-male').crosswalk,m=>m.sources[0].version='v1.2',m=>m.sources[0].glb.bytes++,m=>m.sources[0].glb.gitBlobSha1='b'.repeat(40),m=>m.sources[0].metadata.bytes++,m=>m.sources[0].crosswalk.expectedRows++,m=>m.sources[0].crosswalk.expectedUniqueOntologyIds++,m=>m.sources[0].glb.url=m.sources[0].glb.url.replace(m.source.commit,'main'),m=>byId(m,'large-intestine-female').priority='P1',m=>byId(m,'prostate-male').license='new',m=>{[m.sources[0],m.sources[1]]=[m.sources[1],m.sources[0]]}])
    assert.throws(()=>validatePhase6Manifest(changed(mutate)),/Phase 6 source pin or order mismatch/);
});

test('Phase 6 audit absent bytes is BLOCKED for every admitted source, with exact provenance and exclusions',t=>{
  const root=fixture(t),report=auditHraManifest(manifest,root,opts);
  assert.equal(report.status,'BLOCKED');assert.equal(report.wave,'phase6');
  assert.equal(report.results.length,23);assert.deepEqual(report.excludedSources,manifest.excludedSources);
  assert.ok(report.results.every(r=>r.status==='BLOCKED'&&r.anatomicallyValidated===false&&r.mergeAuthorized===false&&r.version===byId(manifest,r.sourceId).version&&r.priority===byId(manifest,r.sourceId).priority));
  assert.match(report.scope,/P2 requires additional provenance review/);
  assert.equal(report.anatomicallyValidated,false);assert.equal(report.mergeAuthorized,false);
  assert.throws(()=>auditHraManifest(manifest,root),/four-source/);
  assert.throws(()=>auditHraManifest(manifest,root,{wave:'expanded'}),/fourteen-source/);
  assert.throws(()=>auditHraManifest(expanded,root,opts),/twenty-three-source/);
});

test('Phase 6 CLI explicit mode writes blocked report, invalid mode does not write anything',t=>{
  const root=fixture(t),output=join(root,'report.json'),bad=join(root,'bad.json');
  const cli=fileURLToPath(new URL('../../model-audit/hra-reference-audit.mjs',import.meta.url)),candidate=fileURLToPath(new URL('../../model-audit/hra-phase6-candidates.json',import.meta.url));
  const run=spawnSync(process.execPath,[cli,root,candidate,output,'--phase6-wave'],{encoding:'utf8'});
  assert.equal(run.status,1,run.stderr);
  const report=JSON.parse(readFileSync(output,'utf8'));
  assert.equal(report.status,'BLOCKED');assert.equal(report.results.length,23);assert.equal(report.excludedSources.length,4);
  const result=spawnSync(process.execPath,[cli,root,candidate,bad,'--phase7-wave'],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/Usage:/);assert.equal(existsSync(bad),false);
});

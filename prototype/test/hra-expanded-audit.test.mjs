import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditHraManifest } from '../../model-audit/hra-reference-audit.mjs';

const load=name=>JSON.parse(readFileSync(new URL(`../../model-audit/${name}`,import.meta.url),'utf8'));
const manifest=load('hra-expanded-candidates.json');
const initial=load('hra-intake-candidates.json');
const next=load('hra-next-candidates.json');
const alternate=load('hra-lung-male-v1.3-candidate.json');
const opts={wave:'expanded'};
const changed=mutate=>{const copy=structuredClone(manifest);mutate(copy);return copy};
const lung=m=>m.sources.find(s=>s.id==='lung-male');
const fixture=t=>{const dir=mkdtempSync(join(tmpdir(),'hra-expanded-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir};

test('expanded candidate contains exactly original pins and independent older male lung',()=>{
  const expected=[...initial.sources,...next.sources.map(s=>s.id==='lung-male'?alternate.sources[0]:s)];
  assert.deepEqual(manifest.sources,expected);
  assert.equal(manifest.sources.length,14);
  assert.equal(new Set(manifest.sources.map(s=>s.id)).size,14);
  assert.equal(lung(manifest).version,'v1.3');
  assert.equal(lung(next).version,'v1.4');
  assert.equal(lung(manifest).crosswalk.expectedRows,71);
  assert.equal(lung(manifest).crosswalk.expectedUniqueOntologyIds,59);
  assert.equal(manifest.excludedSources.length,1);
  assert.equal(manifest.excludedSources[0].version,'v1.4');
  assert.equal(manifest.excludedSources[0].status,'BLOCKED_SOURCE_MAPPING');
});

test('explicit expanded audit reports every absent asset as BLOCKED, not fallback/pass',t=>{
  const root=fixture(t);
  const report=auditHraManifest(manifest,root,opts);
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.wave,'expanded');
  assert.equal(report.results.length,14);
  assert.deepEqual(report.excludedSources,manifest.excludedSources);
  assert.ok(report.results.every(r=>r.status==='BLOCKED'&&r.anatomicallyValidated===false&&r.mergeAuthorized===false));
  assert.equal(report.results.find(r=>r.sourceId==='lung-male').version,'v1.3');
  assert.equal(report.anatomicallyValidated,false);
  assert.equal(report.mergeAuthorized,false);
  assert.throws(()=>auditHraManifest(manifest,root),/four-source/);
  assert.throws(()=>auditHraManifest(manifest,root,{wave:'next'}),/ten-source/);
});

test('expanded audit rejects omissions, duplicates, unknown IDs, missing marker and unapproved source scope',t=>{
  const root=fixture(t);
  for(const mutate of [m=>m.sources.pop(),m=>m.sources.push(m.sources[0]),m=>m.sources[1]=m.sources[0],m=>m.sources[0].id='unknown-female',m=>m.sources[0]=null])
    assert.throws(()=>auditHraManifest(changed(mutate),root,opts),/fourteen-source/);
  for(const mutate of [m=>delete m.wave,m=>m.wave='next',m=>m.status='PASSED'])
    assert.throws(()=>auditHraManifest(changed(mutate),root,opts),/status or scope/);
  assert.throws(()=>auditHraManifest(changed(m=>m.excludedSources=[]),root,opts),/blocked male lung/);
  assert.throws(()=>auditHraManifest(changed(m=>m.source.commit='a'.repeat(40)),root,opts),/official source metadata pin mismatch/);
});

test('expanded audit rejects full v1.4 record, mixed release assets and tampered official pins',t=>{
  const root=fixture(t);
  assert.throws(()=>auditHraManifest(changed(m=>m.sources[m.sources.indexOf(lung(m))]=lung(next)),root,opts),/Blocked male lung v1.4/);
  for(const mutate of [m=>lung(m).glb=lung(next).glb,m=>lung(m).crosswalk=lung(next).crosswalk,m=>m.sources[0].glb.bytes++,m=>m.sources[0].glb.gitBlobSha1='f'.repeat(40),m=>m.sources[0].crosswalk.expectedRows--,m=>m.sources[0].crosswalk.expectedUniqueOntologyIds--,m=>m.sources[0].crosswalk.gitBlobSha1='0'.repeat(40),m=>m.sources[0].metadata.bytes++,m=>m.sources[0].metadata.gitBlobSha1='1'.repeat(40),m=>m.sources[0].glb.url=m.sources[0].glb.url.replace(m.source.commit,'main'),m=>m.sources[0].variant='male',m=>m.sources[0].license='unknown'])
    assert.throws(()=>auditHraManifest(changed(mutate),root,opts),/Expanded-wave source pin mismatch/);
});

test('CLI expanded-wave writes fail-closed missing-byte report containing exact version scope',t=>{
  const root=fixture(t),output=join(root,'report.json');
  const cli=fileURLToPath(new URL('../../model-audit/hra-reference-audit.mjs',import.meta.url));
  const candidate=fileURLToPath(new URL('../../model-audit/hra-expanded-candidates.json',import.meta.url));
  const run=spawnSync(process.execPath,[cli,root,candidate,output,'--expanded-wave'],{encoding:'utf8'});
  assert.equal(run.status,1,run.stderr);
  const report=JSON.parse(readFileSync(output,'utf8'));
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.results.length,14);
  assert.equal(report.results.find(r=>r.sourceId==='lung-male').version,'v1.3');
  assert.equal(report.excludedSources[0].version,'v1.4');
});

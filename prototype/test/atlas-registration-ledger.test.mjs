import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAtlasRegistrationLedger, validateAtlasRegistrationLedger } from '../../model-audit/atlas-registration-ledger.mjs';

const manifest=JSON.parse(readFileSync(new URL('../../model-audit/hra-phase6-candidates.json',import.meta.url),'utf8'));
const changed=mutate=>{const ledger=createAtlasRegistrationLedger();mutate(ledger);return ledger;};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('exact frozen 23 source identities link only to matching variants, with prior exclusions retained',()=>{
  const ledger=createAtlasRegistrationLedger();assert.deepEqual(ledger,createAtlasRegistrationLedger());
  assert.equal(validateAtlasRegistrationLedger(ledger),ledger);
  assert.equal(ledger.schemaVersion,1);assert.equal(ledger.status,'SOURCE_LINK_ONLY');
  assert.equal(ledger.rows.length,23);assert.deepEqual(ledger.rows.map(r=>r.source.id),manifest.sources.map(s=>s.id));
  assert.deepEqual(ledger.excludedSources,manifest.excludedSources);
  assert.equal(ledger.sourceManifestSha256,digest(JSON.stringify(manifest)));
  assert.equal(ledger.rows.filter(r=>r.target.variant==='female').length,11);
  assert.equal(ledger.rows.filter(r=>r.target.variant==='male').length,12);
  for(const [i,row] of ledger.rows.entries()){
    const source=manifest.sources[i];
    assert.deepEqual(row.source,{id:source.id,variant:source.variant,version:source.version,revision:manifest.source.commit,gitBlobSha1:source.glb.gitBlobSha1,bytes:source.glb.bytes,url:source.glb.url,sha256:null,unit:null});
    assert.equal(row.target.variant,source.variant);assert.equal(row.target.id,`open-anatomy-3d-${source.variant}`);
    assert.equal(row.status,'SOURCE_LINK_ONLY');assert.equal(row.registrationStatus,'UNREGISTERED');
    assert.equal(row.sourcePhysicalUnitVerified,false);assert.equal(row.targetPhysicalUnitVerified,false);
    assert.equal(row.sourceAssetBytesVerified,false);assert.equal(row.targetAssetBytesVerified,false);
    assert.equal(row.target.unit,null);assert.equal(row.landmarks,null);assert.equal(row.registrationProof,null);assert.equal(row.transform,null);
    assert.equal(row.anatomicallyValidated,false);assert.equal(row.mergeAuthorized,false);
  }
  assert.equal(ledger.physicalUnitVerified,false);assert.equal(ledger.registrationProofPresent,false);
  assert.equal(ledger.mergeAuthorized,false);assert.equal(ledger.anatomicallyValidated,false);
});

test('both immutable target pins equal actual installed base GLB bytes and independent Git blob hash',()=>{
  const ledger=createAtlasRegistrationLedger();
  for(const variant of ['female','male']){
    const pin=ledger.rows.find(r=>r.target.variant===variant).target;
    const bytes=readFileSync(new URL(`../../node_modules/open-anatomy-3d/models/anatomy-${variant}.glb`,import.meta.url));
    assert.equal(pin.sha256,digest(bytes));assert.equal(pin.bytes,bytes.length);
    assert.equal(pin.gitBlobSha1,createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'));
    assert.equal(pin.revision,'c050aa7b1bc56ceed668199b01ea017341928d7b');
  }
});

test('validator rejects variant substitution, source/target pin modification and changes to exact source order',()=>{
  for(const mutate of [
    x=>x.rows[0].target=x.rows.find(r=>r.target.variant!==x.rows[0].source.variant).target,
    x=>x.rows[0].source.variant='male',x=>x.rows[0].source.version='v999.0',x=>x.rows[0].source.bytes++,x=>x.rows[0].source.gitBlobSha1='0'.repeat(40),x=>x.rows[0].source.sha256='a'.repeat(64),
    x=>x.rows[0].target.sha256='b'.repeat(64),x=>x.rows[0].target.bytes++,x=>x.rows[0].target.gitBlobSha1='0'.repeat(40),
    x=>x.rows.pop(),x=>x.rows.push(x.rows[0]),x=>x.rows[1]=x.rows[0],x=>{[x.rows[0],x.rows[1]]=[x.rows[1],x.rows[0]]},x=>x.rows[0].source.id='unknown-female',x=>x.excludedSources.pop(),x=>x.sourceManifestSha256='0'.repeat(64),
  ])assert.throws(()=>validateAtlasRegistrationLedger(changed(mutate)),/frozen SOURCE_LINK_ONLY/);
});

test('validator refuses unverified promotion, units, landmark evidence, transforms, and unknown approval flags',()=>{
  for(const mutate of [
    x=>x.status='PASS',x=>x.mergeAuthorized=true,x=>x.anatomicallyValidated=true,x=>x.physicalUnitVerified=true,x=>x.registrationProofPresent=true,
    x=>x.rows[0].status='TECHNICAL_LANDMARK_REGISTRATION_PASS',x=>x.rows[0].registrationStatus='REGISTERED',x=>x.rows[0].mergeAuthorized=true,x=>x.rows[0].anatomicallyValidated=true,
    x=>x.rows[0].source.unit='mm',x=>x.rows[0].targetPhysicalUnitVerified=true,x=>x.rows[0].sourceAssetBytesVerified=true,x=>x.rows[0].targetAssetBytesVerified=true,
    x=>x.rows[0].landmarks=[],x=>x.rows[0].registrationProof={status:'verified'},x=>x.rows[0].transform={scale:1},x=>x.rows[0].extraApproval=true,
  ])assert.throws(()=>validateAtlasRegistrationLedger(changed(mutate)),/frozen SOURCE_LINK_ONLY/);
});

test('CLI creates only a new deterministic report and never overwrites existing data',t=>{
  const dir=mkdtempSync(join(tmpdir(),'registration-ledger-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const cli=fileURLToPath(new URL('../../model-audit/atlas-registration-ledger.mjs',import.meta.url)),report=join(dir,'report.json'),unused=join(dir,'unused.json');
  const first=spawnSync(process.execPath,[cli,report],{encoding:'utf8'});assert.equal(first.status,0,first.stderr);
  const before=readFileSync(report);assert.deepEqual(JSON.parse(before),createAtlasRegistrationLedger());
  const again=spawnSync(process.execPath,[cli,report],{encoding:'utf8'});assert.equal(again.status,1);assert.deepEqual(readFileSync(report),before);
  const invalid=spawnSync(process.execPath,[cli,unused,'extra'],{encoding:'utf8'});assert.equal(invalid.status,1);assert.match(invalid.stderr,/Usage:/);assert.equal(existsSync(unused),false);
});

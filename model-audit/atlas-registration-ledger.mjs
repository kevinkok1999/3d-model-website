#!/usr/bin/env node
// Frozen identity-link ledger only. Neither GLB geometry nor transformations
// are read, derived, or authorized here. Source-native physical units remain
// unverified until independently documented and reviewed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePhase6Manifest } from './hra-reference-audit.mjs';

const TARGET_REVISION='c050aa7b1bc56ceed668199b01ea017341928d7b';
const TARGET_PINS=Object.freeze({
  male:Object.freeze({id:'open-anatomy-3d-male',variant:'male',sha256:'25248bef02f0ca43eedbd25231f8b6f9681865a57016f9d5e352d407407336c7',bytes:7614076,gitBlobSha1:'f173c5a08e93fb3eef85c64859680b94ad7c2aed'}),
  female:Object.freeze({id:'open-anatomy-3d-female',variant:'female',sha256:'2eee011f8cb7a189af0757f5e287754e84276dd084faeb2daca45572942f4ce2',bytes:8134732,gitBlobSha1:'53a6203083490251fd7bb6421f5698db9bccd4c9'}),
});
const need=(condition,message)=>{if(!condition)throw new Error(message)};

// No caller-selected inputs, targets, variants, credentials, statuses or
// proofs are accepted. A changed upstream candidate requires a separately
// reviewed frozen ledger version; it cannot inherit old registration state.
export function createAtlasRegistrationLedger(){
  const path=new URL('./hra-phase6-candidates.json',import.meta.url);
  const manifest=validatePhase6Manifest(JSON.parse(readFileSync(path,'utf8')));
  const rows=manifest.sources.map(source=>{
    need(Object.hasOwn(TARGET_PINS,source.variant),`Unknown atlas target variant: ${source.variant}`);
    const target=TARGET_PINS[source.variant];
    return {
      source:{id:source.id,variant:source.variant,version:source.version,revision:manifest.source.commit,
        gitBlobSha1:source.glb.gitBlobSha1,bytes:source.glb.bytes,url:source.glb.url,sha256:null,unit:null},
      target:{...target,revision:TARGET_REVISION,unit:null},
      status:'SOURCE_LINK_ONLY',registrationStatus:'UNREGISTERED',
      sourceAssetBytesVerified:false,targetAssetBytesVerified:false,
      sourcePhysicalUnitVerified:false,targetPhysicalUnitVerified:false,
      landmarks:null,registrationProof:null,transform:null,anatomicallyValidated:false,mergeAuthorized:false,
    };
  });
  need(rows.length===23&&new Set(rows.map(r=>r.source.id)).size===23&&rows.filter(r=>r.target.variant==='male').length===12&&rows.filter(r=>r.target.variant==='female').length===11,'Frozen variant-link count mismatch');
  return {
    schemaVersion:1,status:'SOURCE_LINK_ONLY',phase:'phase7',sourceManifest:'hra-phase6-candidates.json',
    sourceManifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    scope:'Exact frozen source identities linked to matching atlas variants only. This ledger does not inspect model bytes, establish physical units, certify landmarks, validate transformations, anatomy or topology, or authorize merging.',
    physicalUnitVerified:false,registrationProofPresent:false,anatomicallyValidated:false,mergeAuthorized:false,rows,
    excludedSources:manifest.excludedSources,
  };
}

// Full structural equality (including order, all pins, absent proofs and
// negative scope flags) rejects any extra, missing, swapped or promoted row.
export function validateAtlasRegistrationLedger(ledger){
  need(isDeepStrictEqual(ledger,createAtlasRegistrationLedger()),'Atlas registration ledger differs from frozen SOURCE_LINK_ONLY identities or blocked scope');
  return ledger;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const [report,...extra]=process.argv.slice(2);
    need(report&&!extra.length,'Usage: node model-audit/atlas-registration-ledger.mjs <new-report.json>');
    const ledger=validateAtlasRegistrationLedger(createAtlasRegistrationLedger());
    writeFileSync(report,JSON.stringify(ledger,null,2)+'\n',{flag:'wx'});
    console.log(`Atlas registration ledger: ${ledger.rows.length} SOURCE_LINK_ONLY rows, ${ledger.excludedSources.length} exclusions, no physical-unit/landmark/registration proof, merge blocked.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}

#!/usr/bin/env node
// Source-only wave 3 preflight; excludes HOLD candidates, never stages assets.
import {createHash} from 'node:crypto';
import {openSync,closeSync,fstatSync,readSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {auditHraSource} from './hra-reference-audit.mjs';

const COMMIT='27d6d493cd53761abb10f087767ec4cc74acb051';
// Frozen manifest's normalized parsed JSON digest, not a source-asset SHA.
const MANIFEST_SHA256='e05c837a117b4a65de1aa828f76aaf6ec4eeaca95cc69791d68f4431a3bdf38d';
const P1=['pelvis-female','pelvis-male','large-intestine-male','pancreas-female','pancreas-male','spleen-female','spleen-male'];
const P2=['large-intestine-female','prostate-male'];
const HOLD=['kidney-female-left','kidney-male-left','uterus-female'];
const ALLOWED=[...P1,...P2];
const ALL=[...ALLOWED,...HOLD];
const MAX_BYTES=25_000_000;
const need=(condition,message)=>{if(!condition)throw new Error(message);};

export function selectWave3Sources(manifest){
  need(manifest?.schemaVersion===1&&manifest.status==='CANDIDATE_INVENTORY_NOT_DOWNLOADED'&&manifest.source?.repository==='https://github.com/hubmapconsortium/hra-kg'&&manifest.source.commit===COMMIT&&manifest.source.refOrganTreeGitSha1==='fb3b43f21796dc63b93e2bbb88274b300314d3b6','Invalid pinned official wave 3 source or commit');
  need(Array.isArray(manifest.sources)&&manifest.sources.length===ALL.length&&new Set(manifest.sources.map(s=>s?.id)).size===ALL.length&&ALL.every(id=>manifest.sources.some(s=>s.id===id)),'Wave 3 requires all twelve original candidates');
  for(const row of manifest.sources){
    const priority=P1.includes(row.id)?'P1':P2.includes(row.id)?'P2':'HOLD';
    need(row.priority===priority&&row.reviewState==='NOT_DOWNLOADED'&&row.license==='CC-BY-4.0'&&/^v\d+\.\d+$/.test(row.version)&&['female','male'].includes(row.variant),'Wave 3 candidate priority, status or variant mismatch');
    if(priority==='HOLD')continue;
    need(row.id.endsWith(`-${row.variant}`),'Wave 3 variant mismatch');
    const prefix=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${COMMIT}/digital-objects/ref-organ/${row.id}/${row.version}/raw/`;
    for(const [kind,file] of [['glb',row.glb],['crosswalk',row.crosswalk]]){
      need(typeof file?.filename==='string'&&(kind==='glb'?/^[a-z0-9-]+\.glb$/:/^crosswalk\.csv$/).test(file.filename)&&file.localPath===`${row.id}/${file.filename}`&&file.url===prefix+file.filename&&Number.isSafeInteger(file.bytes)&&file.bytes>0&&file.bytes<MAX_BYTES&&/^[a-f0-9]{40}$/.test(file.gitBlobSha1),`Unsafe or incorrect wave 3 ${row.id} ${kind} pin`);
    }
  }
  need(createHash('sha256').update(JSON.stringify(manifest)).digest('hex')===MANIFEST_SHA256,'Frozen wave 3 manifest pin mismatch; re-research the source before changing pins');
  return manifest.sources.filter(row=>ALLOWED.includes(row.id));
}
export function wave3DownloadList(manifest){return selectWave3Sources(manifest).flatMap(source=>[source.glb,source.crosswalk].map(asset=>({url:asset.url,path:asset.localPath,bytes:asset.bytes})));}

export function auditWave3(manifest,root){
  const selected=selectWave3Sources(manifest),results=[];
  for(const source of selected){
    let result;
    try{result=auditHraSource(source,root,ALLOWED);}catch(error){result={sourceId:source.id,variant:source.variant,status:'BLOCKED',error:String(error.message??error),anatomicallyValidated:false,mergeAuthorized:false};}
    results.push({...result,version:source.version,priority:source.priority});
  }
  return {wave:'wave3-source-only',status:results.every(row=>row.status==='TECHNICAL_PREFLIGHT_PASS')?'TECHNICAL_PREFLIGHT_PASS':'BLOCKED',scope:'Actual pinned bytes, raw triangle geometry and exact source crosswalk only; no staging, geometry merge, anatomical, clinical or spatial-registration validation. P2 requires additional provenance review.',manifestSha256:MANIFEST_SHA256,anatomicallyValidated:false,mergeAuthorized:false,results,excludedSources:manifest.sources.filter(row=>HOLD.includes(row.id)).map(row=>({id:row.id,variant:row.variant,version:row.version,priority:row.priority,status:'EXCLUDED_SOURCE_CONFLICT',reason:row.provenanceNote}))};
}

function readManifest(path){
  const fd=openSync(path,'r');try{const stat=fstatSync(fd);need(stat.isFile()&&stat.size>0&&stat.size<=1024*1024,'Manifest outside regular-file size limit');const bytes=Buffer.alloc(stat.size);let offset=0;while(offset<bytes.length){const n=readSync(fd,bytes,offset,bytes.length-offset,offset);need(n>0,'Truncated manifest');offset+=n;}need(fstatSync(fd).size===stat.size,'Manifest changed during read');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{closeSync(fd);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=process.argv.slice(2);
    if(args.length===2&&args[0]==='--downloads'){for(const row of wave3DownloadList(readManifest(args[1])))console.log([row.url,row.path,row.bytes].join('\t'));}
    else {need(args.length===3,'Usage: node hra-wave3-audit.mjs <asset-dir> <manifest.json> <report.json> | --downloads <manifest.json>');const [root,manifestPath,out]=args;const report=auditWave3(readManifest(manifestPath),root);writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});for(const row of report.results)console.log(`${row.sourceId}: ${row.status}${row.error?` ${row.error}`:''}`);if(report.status!=='TECHNICAL_PREFLIGHT_PASS')process.exitCode=1;}
  }catch(error){console.error(error.message);process.exitCode=1;}
}

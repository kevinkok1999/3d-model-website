#!/usr/bin/env node
// Offline exact Wave 2 metadata audit; no model conversion or publication.
import {createHash} from 'node:crypto';
import {openSync,closeSync,fstatSync,readSync,writeFileSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const PIN='237077c85e58700310c3a0cfa9ef314446ce4331cf16692cfeea378ef4af66ad';
const ORIGINAL_PIN='50961b30b3b1e5a282d56948d9b8399f78d937299be120ae456af1af555ad88f';
const BASE='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const CAT='concept id\trepresentation id\ten',MAP='concept id\tname\telement file id';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(condition,msg)=>{if(!condition)throw new Error(msg);};
const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);

export function validateWave2Manifest(manifest,original){
  need(manifest?.schemaVersion===1&&manifest.status==='CANDIDATE_INVENTORY_NOT_DOWNLOADED'&&manifest.wave==='wave2'&&manifest.source?.catalogType==='IS-A'&&manifest.source.release==='4.0'&&manifest.source.catalogUrl===BASE+'isa_parts_list_e.txt'&&manifest.source.elementMappingUrl===BASE+'isa_element_parts.txt'&&manifest.source.modelArchiveUrl===BASE+'isa_BP3D_4.0_obj_99.zip','Invalid official wave 2 source pins');
  need(Array.isArray(manifest.candidates)&&manifest.candidates.length===50&&Array.isArray(original?.candidates)&&original.candidates.length===21,'Invalid candidate inventory counts');
  const fmas=new Set(original.candidates.map(x=>x.fma)),reps=new Set(original.candidates.map(x=>x.representation)),elements=new Set(original.candidates.flatMap(x=>x.elementFileIds));
  need(fmas.size===21&&reps.size===21&&elements.size===23,'Invalid original inventory');
  for(const row of manifest.candidates){
    need(row?.reviewState==='NOT_DOWNLOADED'&&row.sourceCatalog==='IS-A'&&/^FMA[1-9]\d*$/.test(row.fma)&&/^BP[1-9]\d*$/.test(row.representation)&&typeof row.sourceLabel==='string'&&row.sourceLabel.trim()===row.sourceLabel&&row.sourceLabel.length>0&&!fmas.has(row.fma)&&!reps.has(row.representation),'Invalid or overlapping concept/representation');
    fmas.add(row.fma);reps.add(row.representation);need(Array.isArray(row.elementFileIds)&&row.elementFileIds.length>0,'Missing candidate ELEMENT set');
    for(const id of row.elementFileIds){need(/^FJ[1-9]\d*M?$/.test(id)&&!elements.has(id),'Invalid or overlapping ELEMENT file ID');elements.add(id);}
  }
  need(fmas.size===71&&reps.size===71&&elements.size===74,'Wave 2 must contribute precisely 50 concepts and 51 ELEMENT IDs');
  need(sha(JSON.stringify(manifest))===PIN&&sha(JSON.stringify(original))===ORIGINAL_PIN,'Frozen wave 2/original manifest digest mismatch');
  return manifest.candidates;
}

function tableRows(text,header){need(typeof text==='string','Missing source table text');const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);need(lines.shift()===header,'Unexpected official table header');return lines.filter(s=>s.trim()!=='').map(s=>s.split('\t'));}

export function verifyWave2Tables(catalogText,elementText,manifest,original){
  const candidates=validateWave2Manifest(manifest,original),catalog=tableRows(catalogText,CAT),mapping=tableRows(elementText,MAP);
  const byId=new Map(candidates.map(c=>[c.fma,{catalog:[],elements:[],repConflicts:[]}])),byRep=new Map(candidates.map(c=>[c.representation,c.fma]));
  for(const row of catalog){const [fma,bp]=row;if(byId.has(fma))byId.get(fma).catalog.push(row);if(byRep.has(bp)&&byRep.get(bp)!==fma)byId.get(byRep.get(bp)).repConflicts.push(row);}
  for(const row of mapping)if(byId.has(row[0]))byId.get(row[0]).elements.push(row);
  const results=candidates.map(c=>{
    const found=byId.get(c.fma),errors=[];
    if(found.catalog.length!==1||found.catalog[0].length!==3||found.catalog[0][1]!==c.representation||found.catalog[0][2]!==c.sourceLabel)errors.push('Expected exactly one matching official FMA/BP/English label row');
    if(found.repConflicts.length)errors.push('Representation ID also occurs under another FMA');
    const ids=found.elements.map(r=>r[2]);
    if(found.elements.some(r=>r.length!==3||r[1]!==c.sourceLabel||!/^FJ[1-9]\d*M?$/.test(r[2]??'')))errors.push('Malformed or mismatched official ELEMENT mapping row');
    if(new Set(ids).size!==ids.length)errors.push('Duplicate official ELEMENT mapping row');
    if(ids.length!==c.elementFileIds.length||!ids.every(id=>c.elementFileIds.includes(id)))errors.push('Complete official ELEMENT set differs');
    return {fma:c.fma,representation:c.representation,sourceLabel:c.sourceLabel,elementFileIds:ids.filter(id=>typeof id==='string').sort(),status:errors.length?'FAILED':'PASSED',errors};
  });
  const passed=results.filter(r=>r.status==='PASSED').length;
  return {schemaVersion:1,wave:'wave2',status:passed===50?'METADATA_AUDIT_PASSED':'METADATA_AUDIT_FAILED',clinicallyVerified:false,anatomicallyValidated:false,scope:'Exact selected source catalogue and complete ELEMENT mapping rows only; not geometry, anatomy, coordinate registration or release validation.',manifestSha256:PIN,originalManifestSha256:ORIGINAL_PIN,catalogRows:catalog.length,elementTableRows:mapping.length,uniqueElementFiles:new Set(results.flatMap(x=>x.elementFileIds)).size,passedConcepts:passed,results};
}

function readBounded(path,min,max){const fd=openSync(path,'r');try{const stat=fstatSync(fd);need(stat.isFile()&&stat.size>=min&&stat.size<=max,`Official file size outside safe full-table bounds: ${path}`);const b=Buffer.alloc(stat.size);let offset=0;while(offset<b.length){const n=readSync(fd,b,offset,b.length-offset,offset);need(n>0,'Incomplete table read');offset+=n;}need(fstatSync(fd).size===stat.size,'Official file changed while reading');return b;}finally{closeSync(fd);}}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const [catalogPath,elementPath,out,...extra]=process.argv.slice(2);need(catalogPath&&elementPath&&out&&!extra.length,'Usage: node bodyparts3d-wave2-audit.mjs <isa_parts_list_e.txt> <isa_element_parts.txt> <report.json>');
    let report,provenance={};
    try{const manifest=JSON.parse(readFileSync(new URL('./bodyparts3d-wave2-candidates.json',import.meta.url),'utf8')),original=JSON.parse(readFileSync(new URL('./bodyparts3d-intake-candidates.json',import.meta.url),'utf8'));
      // Observed official directory sizes are ~125 KB and ~1.1 MB. Bounds
      // reject truncated/sample content; they are not authenticity checks.
      const catalog=readBounded(catalogPath,100_000,2_000_000);provenance.catalog={url:BASE+'isa_parts_list_e.txt',bytes:catalog.length,sha256:sha(catalog)};
      const mapping=readBounded(elementPath,800_000,5_000_000);provenance.elementTable={url:BASE+'isa_element_parts.txt',bytes:mapping.length,sha256:sha(mapping)};
      report=verifyWave2Tables(decode(catalog),decode(mapping),manifest,original);need(report.catalogRows>=2905&&report.elementTableRows>10_000,'Official table appears incomplete');
    }catch(error){report={schemaVersion:1,wave:'wave2',status:'METADATA_AUDIT_FAILED',clinicallyVerified:false,anatomicallyValidated:false,error:String(error.message??error)};}
    report.sourceFiles=provenance;writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(`${report.status}: ${report.passedConcepts??0}/50 selected concepts`);if(report.status!=='METADATA_AUDIT_PASSED')process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}

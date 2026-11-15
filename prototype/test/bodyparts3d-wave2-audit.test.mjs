import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import inventory from '../../model-audit/bodyparts3d-wave2-candidates.json' with {type:'json'};
import original from '../../model-audit/bodyparts3d-intake-candidates.json' with {type:'json'};
import {validateWave2Manifest,verifyWave2Tables} from '../../model-audit/bodyparts3d-wave2-audit.mjs';

const catalogHeader='concept id\trepresentation id\ten';
const mappingHeader='concept id\tname\telement file id';
const catalog=[catalogHeader,...inventory.candidates.map(x=>`${x.fma}\t${x.representation}\t${x.sourceLabel}`)].join('\r\n')+'\r\n';
const elements=[mappingHeader,...inventory.candidates.flatMap(x=>x.elementFileIds.map(id=>`${x.fma}\t${x.sourceLabel}\t${id}`))].join('\n')+'\n';
const selected=inventory.candidates[0];

test('Frozen wave2 manifest admits exactly 50 distinct new IDs and 51 files without original overlaps',()=>{
  assert.deepEqual(validateWave2Manifest(inventory,original),inventory.candidates);
  for(const mutate of [m=>{m.candidates[0].fma=original.candidates[0].fma;},m=>{m.candidates[0].representation=original.candidates[0].representation;},m=>{m.candidates[0].elementFileIds=original.candidates[0].elementFileIds;},m=>{m.candidates[0].elementFileIds=[m.candidates[1].elementFileIds[0]];},m=>{m.source.catalogUrl='https://example.org/fake.txt';},m=>{m.candidates.pop();}]){const changed=structuredClone(inventory);mutate(changed);assert.throws(()=>validateWave2Manifest(changed,original));}
});

test('Exact catalog and complete mapping sets pass; compound hyoid retains both elements',()=>{
  const result=verifyWave2Tables(catalog,elements,inventory,original);
  assert.equal(result.status,'METADATA_AUDIT_PASSED');assert.equal(result.results.length,50);assert.equal(result.uniqueElementFiles,51);
  assert.deepEqual(result.results.find(x=>x.fma==='FMA52749').elementFileIds,['FJ2772','FJ3201']);
});

test('Wrong BP, English label, duplicate, missing or extra exact concept or ELEMENT row blocks while still reporting all 50',()=>{
  const catRow=`${selected.fma}\t${selected.representation}\t${selected.sourceLabel}`;
  const elRow=`${selected.fma}\t${selected.sourceLabel}\t${selected.elementFileIds[0]}`;
  for(const [c,e] of [[catalog.replace(catRow,catRow.replace(selected.representation,'BP1234')),elements],[catalog.replace(catRow,catRow+' altered'),elements],[catalog+catRow+'\n',elements],[catalog.replace(catRow,''),elements],[catalog,elements+elRow+'\n'],[catalog,elements.replace(elRow,'')],[catalog,elements+`${selected.fma}\t${selected.sourceLabel}\tFJ999999\n`],[catalog,elements.replace(elRow,elRow+'\textra')],[catalog,elements.replace(`${selected.fma}\t${selected.sourceLabel}`,`${selected.fma}\twrong label`)],[catalog,elements.replace('FMA52749\thyoid bone\tFJ2772\n','')]]){
    const actual=verifyWave2Tables(c,e,inventory,original);assert.equal(actual.status,'METADATA_AUDIT_FAILED');assert.equal(actual.results.length,50);assert.ok(actual.results.some(x=>x.status==='FAILED'));
  }
  assert.throws(()=>verifyWave2Tables(catalog.replace(catalogHeader,'invalid'),elements,inventory,original),/header/i);
});

test('CLI refuses truncated/missing official table bytes and records failed technical report without proceeding',()=>{
  const root=mkdtempSync(join(tmpdir(),'bp-wave2-qa-'));
  try{const cat=join(root,'catalog.txt'),map=join(root,'map.txt'),report=join(root,'report.json');writeFileSync(cat,catalog);writeFileSync(map,elements);const result=spawnSync(process.execPath,['model-audit/bodyparts3d-wave2-audit.mjs',cat,map,report],{encoding:'utf8'});assert.notEqual(result.status,0);const actual=JSON.parse(readFileSync(report,'utf8'));assert.equal(actual.status,'METADATA_AUDIT_FAILED');assert.equal(actual.clinicallyVerified,false);assert.match(actual.error,/size|incomplete/i);
  }finally{rmSync(root,{recursive:true,force:true});}
});

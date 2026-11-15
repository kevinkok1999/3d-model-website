import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { auditHraManifest } from '../../model-audit/hra-reference-audit.mjs';

const cli=fileURLToPath(new URL('../../model-audit/hra-stage-candidate.mjs',import.meta.url));
const ids=['blood-vasculature-female','blood-vasculature-male','brain-female','brain-male'];
function triangle(name){
  const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name,mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:42}],bufferViews:[{buffer:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]}));
  const size=Math.ceil(json.length/4)*4, bytes=Buffer.alloc(28+size+44);
  bytes.writeUInt32LE(0x46546c67);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(size,12);bytes.writeUInt32LE(0x4e4f534a,16);
  bytes.fill(32,20,20+size);json.copy(bytes,20);bytes.writeUInt32LE(44,20+size);bytes.writeUInt32LE(0x004e4942,24+size);
  [0,0,0,1,0,0,0,1,0].forEach((n,i)=>bytes.writeFloatLE(n,28+size+i*4));[0,1,2].forEach((n,i)=>bytes.writeUInt16LE(n,64+size+i*2));
  return bytes;
}
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'hra-stage-fixture-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const assets=join(dir,'assets'),manifestPath=join(dir,'manifest.json'),auditPath=join(dir,'input-audit.json'),output=join(dir,'staged');mkdirSync(assets);
  const commit='a'.repeat(40),manifest={schemaVersion:1,source:{repository:'https://github.com/hubmapconsortium/hra-kg',commit},sources:ids.map(id=>{
    mkdirSync(join(assets,id));
    const prefix=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${commit}/digital-objects/ref-organ/${id}/v1.3/raw/`;
    const pin=(name,bytes)=>{const localPath=`${id}/${name}`;writeFileSync(join(assets,localPath),bytes);return {filename:name,localPath,url:prefix+name,bytes:bytes.length,gitBlobSha1:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')};};
    return {id,variant:id.endsWith('-female')?'female':'male',version:'v1.3',glb:pin('synthetic.glb',triangle(id)),crosswalk:{...pin('crosswalk.csv',Buffer.from(`node_name,OntologyID,label\n${id},FMA:1,Synthetic\n`)),columns:['node_name','OntologyID','label'],expectedRows:1,expectedUniqueOntologyIds:1}};
  })};
  const audit=auditHraManifest(manifest,assets);assert.equal(audit.status,'TECHNICAL_PREFLIGHT_PASS','Synthetic fixture must pass technical audit');
  writeFileSync(manifestPath,JSON.stringify(manifest));writeFileSync(auditPath,JSON.stringify(audit));writeFileSync(join(assets,'unrelated.txt'),'must not be staged');
  const run=(out=output,...args)=>spawnSync(process.execPath,[cli,assets,manifestPath,auditPath,out,...args],{encoding:'utf8'});
  const noPartial=()=>assert.ok(readdirSync(dir).every(x=>!x.startsWith('.hra-stage-')),'Private temporary staging directory leaked');
  return {dir,assets,manifestPath,auditPath,output,manifest,audit,run,noPartial};
}
test('stages exactly four original GLB+CSV pairs and the matching audit, byte-for-byte',t=>{
  const f=fixture(t),result=f.run();assert.equal(result.status,0,result.stderr);
  assert.deepEqual(readdirSync(f.output).sort(),['audit.json',...ids].sort());
  for(const id of ids){assert.deepEqual(readdirSync(join(f.output,id)).sort(),['crosswalk.csv','synthetic.glb']);for(const name of ['crosswalk.csv','synthetic.glb'])assert.deepEqual(readFileSync(join(f.output,id,name)),readFileSync(join(f.assets,id,name)));}
  assert.deepEqual(JSON.parse(readFileSync(join(f.output,'audit.json'))),f.audit);f.noPartial();
});
test('a fabricated PASS or stale audited details cannot produce a candidate',t=>{
  const f=fixture(t);f.audit.results[1].glb.triangles++;
  writeFileSync(f.auditPath,JSON.stringify(f.audit));const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/existing audit.*mismatch/i);assert.ok(!existsSync(f.output));f.noPartial();
});
test('changed original bytes after the first audit fail closed',t=>{
  const f=fixture(t),path=join(f.assets,ids[2],'synthetic.glb'),bytes=readFileSync(path);bytes[bytes.length-1]=1;writeFileSync(path,bytes);
  const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/fresh audit blocked/i);assert.ok(!existsSync(f.output));f.noPartial();
});
test('does not overwrite an existing empty or populated destination or symlink',t=>{
  const f=fixture(t);mkdirSync(f.output);const empty=f.run();assert.notEqual(empty.status,0);assert.match(empty.stderr,/destination already exists/i);assert.deepEqual(readdirSync(f.output),[]);
  writeFileSync(join(f.output,'preserve'),'prior data');const populated=f.run();assert.notEqual(populated.status,0);assert.equal(readFileSync(join(f.output,'preserve'),'utf8'),'prior data');
  const link=join(f.dir,'link');symlinkSync(f.output,link,'dir');assert.notEqual(f.run(link).status,0);assert.deepEqual(readdirSync(f.output),['preserve']);f.noPartial();
});
test('rejects a path escaping its exact source id directory',t=>{
  const f=fixture(t);f.manifest.sources[1].glb.localPath='../escape.glb';writeFileSync(f.manifestPath,JSON.stringify(f.manifest));
  const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/localPath/i);assert.ok(!existsSync(f.output));f.noPartial();
});
test('refuses staging inside the source tree',t=>{
  const f=fixture(t),inside=join(f.assets,'candidate'),r=f.run(inside);assert.notEqual(r.status,0);assert.match(r.stderr,/inside source tree/i);assert.ok(!existsSync(inside));f.noPartial();
});
test('expanded mode rejects a valid but incomplete four-source audit without creating output',t=>{
  const f=fixture(t),r=f.run(f.output,'--expanded-wave');assert.notEqual(r.status,0);assert.doesNotMatch(r.stderr,/Usage:/);assert.match(r.stderr,/expanded|fourteen|inventory/i);assert.ok(!existsSync(f.output));f.noPartial();
});
test('phase6 staging rejects an incomplete source set before copying',t=>{
  const f=fixture(t),r=f.run(f.output,'--phase6-wave');assert.notEqual(r.status,0);assert.doesNotMatch(r.stderr,/Usage:/);assert.match(r.stderr,/phase6|twenty-three|inventory/i);assert.ok(!existsSync(f.output));f.noPartial();
});
test('unknown staging mode is rejected, never silently treated as initial mode',t=>{
  const f=fixture(t),r=f.run(f.output,'--next-wave');assert.notEqual(r.status,0);assert.match(r.stderr,/Usage:/);assert.ok(!existsSync(f.output));f.noPartial();
});

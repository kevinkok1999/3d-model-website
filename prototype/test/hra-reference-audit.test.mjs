import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditHraSource, auditHraManifest } from '../../model-audit/hra-reference-audit.mjs';

// Synthetic triangle fixture; source shape mirrors the pinned HRA crosswalk
// header. It is not HRA data or an anatomical validation fixture.
function fixture(t, mutateJson = () => {}, mutateBin = () => {}, csv = 'node_name,OntologyID,label\nroot,UBERON:0000001,Organ\nA,FMA:1,"Part, A"\nB,FMA:1,Part B\n', mutateBytes = b => b) {
  const root = mkdtempSync(join(tmpdir(), 'hra-audit-test-'));
  t.after(() => rmSync(root, {recursive:true,force:true}));
  const id = 'brain-male';
  mkdirSync(join(root, id));
  const json = {asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'root',children:[1,2]},{name:'A',mesh:0},{name:'B',mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:42}],bufferViews:[{buffer:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]};
  mutateJson(json);
  const bin = Buffer.alloc(44);
  [0,0,0,1,0,0,0,1,0].forEach((n,i)=>bin.writeFloatLE(n,i*4));
  [0,1,2].forEach((n,i)=>bin.writeUInt16LE(n,36+i*2));
  mutateBin(bin);
  const payload = Buffer.from(JSON.stringify(json));
  const length = Math.ceil(payload.length/4)*4;
  const bytes = Buffer.alloc(12+8+length+8+bin.length,0);
  bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(length,12);bytes.writeUInt32LE(0x4e4f534a,16);
  bytes.fill(32,20,20+length);payload.copy(bytes,20);
  bytes.writeUInt32LE(bin.length,20+length);bytes.writeUInt32LE(0x004e4942,24+length);bin.copy(bytes,28+length);
  const actual = mutateBytes(bytes), cross = Buffer.from(csv);
  const pin = (data, filename) => ({filename,localPath:`${id}/${filename}`,url:`https://example.invalid/${filename}`,bytes:data.length,
    gitBlobSha1:createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex'),sha256:createHash('sha256').update(data).digest('hex')});
  const source = {id,variant:'male',version:'v1.3',glb:pin(actual,'model.glb'),crosswalk:{...pin(cross,'crosswalk.csv'),columns:['node_name','OntologyID','label'],expectedRows:3,expectedUniqueOntologyIds:2}};
  writeFileSync(join(root,source.glb.localPath),actual);writeFileSync(join(root,source.crosswalk.localPath),cross);
  return {source,root};
}

test('exact GLB and crosswalk report two direct mesh matches and a group, with duplicate ontology ID allowed', t => {
  const {source,root}=fixture(t);
  const result=auditHraSource(source, root);
  assert.equal(result.status,'TECHNICAL_PREFLIGHT_PASS');
  assert.equal(result.glb.sha256, source.glb.sha256);
  assert.equal(result.glb.meshNodes,2);
  assert.equal(result.glb.meshes,1);
  assert.equal(result.glb.triangles,1); // unique primitive, not instance count
  assert.equal(result.crosswalk.directMeshRows,2);
  assert.equal(result.crosswalk.groupRows,1);
  assert.equal(result.crosswalk.uniqueOntologyIds,2);
  assert.equal(result.anatomicallyValidated,false);
  assert.equal(result.mergeAuthorized,false);
});

test('a missing asset, mismatching pinned size, Git blob or SHA256 fails closed',t=>{
  const {source,root}=fixture(t);
  const copy=()=>structuredClone(source);
  let c=copy();c.glb.filename='missing.glb';c.glb.localPath='brain-male/missing.glb';assert.throws(()=>auditHraSource(c,root),/missing|ENOENT/i);
  c=copy();c.glb.localPath='../unexpected.glb';assert.throws(()=>auditHraSource(c,root),/localPath/i);
  c=copy();c.glb.bytes++;assert.throws(()=>auditHraSource(c,root),/length|size|bytes/i);
  c=copy();c.glb.gitBlobSha1='0'.repeat(40);assert.throws(()=>auditHraSource(c,root),/git blob/i);
  c=copy();c.glb.sha256='0'.repeat(64);assert.throws(()=>auditHraSource(c,root),/sha256/i);
});

test('rejects malformed GLB header and BIN chunk boundary even with matching provenance',t=>{
  let x=fixture(t,undefined,undefined,undefined, b=>{b.writeUInt32LE(1,4);return b;});
  assert.throws(()=>auditHraSource(x.source,x.root),/version/i);
  x=fixture(t,undefined,undefined,undefined, b=>{b.writeUInt32LE(b.length-1,8);return b;});
  assert.throws(()=>auditHraSource(x.source,x.root),/length/i);
  x=fixture(t,undefined,undefined,undefined,b=>{b.writeUInt32LE(0xffffffff,20+b.readUInt32LE(12));return b;});
  assert.throws(()=>auditHraSource(x.source,x.root),/chunk/i);
});

test('rejects external buffers and byte range overflow in valid GLB framing',t=>{
  let x=fixture(t,j=>j.buffers[0].uri='external.bin');assert.throws(()=>auditHraSource(x.source,x.root),/external|uri/i);
  x=fixture(t,j=>j.bufferViews[1].byteLength=12);assert.throws(()=>auditHraSource(x.source,x.root),/bufferView|range/i);
  x=fixture(t,j=>j.accessors[0].count=4);assert.throws(()=>auditHraSource(x.source,x.root),/accessor|range/i);
});

test('rejects non-finite raw positions and out-of-range element indices',t=>{
  let x=fixture(t,undefined,b=>b.writeFloatLE(Infinity,0));assert.throws(()=>auditHraSource(x.source,x.root),/position|finite/i);
  x=fixture(t,undefined,b=>b.writeUInt16LE(3,40));assert.throws(()=>auditHraSource(x.source,x.root),/index|indices/i);
});

test('rejects missing and ambiguous crosswalk node names without fuzzy matching',t=>{
  let x=fixture(t,j=>j.nodes[2].name='b');assert.throws(()=>auditHraSource(x.source,x.root),/crosswalk|node.*B/i);
  x=fixture(t,j=>{j.nodes.push({name:'B',mesh:0});j.nodes[0].children.push(3)});assert.throws(()=>auditHraSource(x.source,x.root),/duplicate|ambiguous/i);
  x=fixture(t,undefined,undefined,'node_name,OntologyID,label\nroot,UBERON:1,Organ\nA,FMA:1,Part\nA,FMA:1,Part B\n');assert.throws(()=>auditHraSource(x.source,x.root),/duplicate|ambiguous/i);
});

test('rejects a crosswalk group with no mesh descendants, a cycle and unreachable mesh',t=>{
  let x=fixture(t,j=>j.nodes[0].children=[]);assert.throws(()=>auditHraSource(x.source,x.root),/unreachable|descendant|scene/i);
  x=fixture(t,j=>j.nodes[1].children=[0]);assert.throws(()=>auditHraSource(x.source,x.root),/cycle|multiple parent/i);
  x=fixture(t,j=>j.nodes.push({name:'C',mesh:0}));assert.throws(()=>auditHraSource(x.source,x.root),/unreachable/i);
});

test('strict pinned crosswalk inventory and ontology schema fail closed',t=>{
  let x=fixture(t);x.source.crosswalk.expectedRows=4;assert.throws(()=>auditHraSource(x.source,x.root),/rows|inventory/i);
  x=fixture(t);x.source.crosswalk.expectedUniqueOntologyIds=3;assert.throws(()=>auditHraSource(x.source,x.root),/ontology|inventory/i);
  x=fixture(t,undefined,undefined,'node_name,OntologyID,label\nroot,UBERON:1,Organ\nA,X:1,Part\nB,X:1,Part B\n');assert.throws(()=>auditHraSource(x.source,x.root),/ontology/i);
});

test('manifest audit refuses incomplete four-source inventory',t=>{
  const {source,root}=fixture(t);
  assert.throws(()=>auditHraManifest({schemaVersion:1,sources:[source]},root),/four|inventory|sources/i);
});

test('manifest rejects mutable or off-repository asset URLs before trying to read local files',()=>{
  const commit='a'.repeat(40),ids=['blood-vasculature-female','blood-vasculature-male','brain-female','brain-male'];
  const manifest={schemaVersion:1,source:{repository:'https://github.com/hubmapconsortium/hra-kg',commit},sources:ids.map(id=>{
    const base=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${commit}/digital-objects/ref-organ/${id}/v1.3/raw/`;
    return {id,variant:id.endsWith('-female')?'female':'male',version:'v1.3',glb:{filename:'model.glb',url:base+'model.glb'},crosswalk:{filename:'crosswalk.csv',url:base+'crosswalk.csv'}};
  })};
  manifest.sources[0].glb.url=manifest.sources[0].glb.url.replace(commit,'main');
  assert.throws(()=>auditHraManifest(manifest,'/nonexistent'),/pinned.*url|url.*pin/i);
});

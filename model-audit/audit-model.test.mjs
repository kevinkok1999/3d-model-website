import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditCatalog, auditGeometry, parseGlb} from './audit-model.mjs';

const catalog=[{key:'deltoid_l',label:'Synthetic left muscle fixture',system:'muscles'},
  {key:'shoulder_l',label:'Synthetic hotspot fixture',system:'joints',anchor:[0,1,0],anchorFemale:[0,1,0]},
  {key:'variant_only',label:'Synthetic female fixture',system:'organs',sex:'female'}];
function fixture(names=['deltoid_l']) {
  const data={asset:{version:'2.0'},nodes:names.map((name,i)=>({name,mesh:i})),meshes:names.map(()=>({primitives:[]}))};
  const text=Buffer.from(JSON.stringify(data),'utf8'), padding=(4-text.length%4)%4;
  const out=Buffer.alloc(20+text.length+padding,0x20);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(text.length+padding,12);out.writeUInt32LE(0x4e4f534a,16);text.copy(out,20);return out;
}
test('catalog separates hotspot, mesh and model-specific rows',()=>{
  const a=auditCatalog(catalog,'male');assert.equal(a.meshExpected,1);assert.equal(a.hotspotExpected,1);assert.equal(a.eligible,2);assert.deepEqual(a.errors,[]);
  assert.equal(auditCatalog(catalog,'female').meshExpected,2);
});
test('duplicate key and invalid hotspot are rejected',()=>{
  const a=auditCatalog([...catalog,catalog[0],{key:'bad',label:'Bad',system:'joints',anchor:[0,1]}],'male');
  assert.equal(a.errors.length,2);
});
test('valid fixture metadata maps one mesh and no hotspot mesh',()=>{const r=auditGeometry(catalog,'male',fixture());assert.equal(r.mappedMeshNodes,1);assert.deepEqual(r.errors,[]);assert.equal(r.sha256.length,64)});
test('missing, duplicate and unknown mesh node are reported',()=>{
  assert.match(auditGeometry(catalog,'male',fixture([])).errors.join(' '),/got 0/);
  assert.match(auditGeometry(catalog,'male',fixture(['deltoid_l','deltoid_l'])).errors.join(' '),/got 2/);
  assert.match(auditGeometry(catalog,'male',fixture(['deltoid_l','unknown'])).errors.join(' '),/Unmapped/);
});
test('structural prefix and chunk errors fail closed',()=>{const a=fixture();a.writeUInt32LE(0,0);assert.throws(()=>parseGlb(a),/magic/);const b=fixture();b.writeUInt32LE(1,8);assert.throws(()=>parseGlb(b),/length/);const c=fixture();c.writeUInt32LE(2,12);assert.throws(()=>parseGlb(c),/chunk length/)});

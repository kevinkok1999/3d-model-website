import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {verifyFromPinnedGlb} from '../../model-audit/landmark-source-witness.mjs';

for(const variant of ['male','female'])test(`independent source witness re-reads real ${variant} triangle and rejects tampering`,async()=>{
  const bytes=readFileSync(new URL(`../../node_modules/open-anatomy-3d/models/anatomy-${variant}.glb`,import.meta.url));
  await MeshoptDecoder.ready;
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true);
  let evidence,expected;
  gltf.scene.traverse(mesh=>{
    if(evidence||!mesh.isMesh)return;
    const association=gltf.parser.associations.get(mesh),p=mesh.geometry.getAttribute('position'),index=mesh.geometry.getIndex();
    if(!Number.isInteger(association?.nodes)||!p)return;
    for(let triangleIndex=0;triangleIndex<Math.min(50,Math.floor((index?.count??p.count)/3));triangleIndex++){
      const vertexIndices=[0,1,2].map(i=>index?index.getX(triangleIndex*3+i):triangleIndex*3+i);
      const verts=vertexIndices.map(i=>new THREE.Vector3().fromBufferAttribute(p,i));
      if(new THREE.Triangle(...verts).getArea()<=1e-10)continue;
      const barycentric=[.2,.3,.5],point=verts.reduce((a,v,i)=>a.addScaledVector(v,barycentric[i]),new THREE.Vector3());
      evidence={schemaVersion:1,asset:{id:`open-anatomy-3d-${variant}`,sha256:createHash('sha256').update(bytes).digest('hex')},coordinateSpace:'GLTF_PRIMITIVE_POSITION',nodeIndex:association.nodes,meshIndex:association.meshes,primitiveIndex:association.primitives??0,triangleIndex,vertexIndices,vertices:verts.map(v=>v.toArray()),barycentric,point:point.toArray()};
      expected=point.clone().applyMatrix4(mesh.matrixWorld).toArray();break;
    }
  });
  assert.ok(evidence,'real nondegenerate triangle found');
  const report=await verifyFromPinnedGlb(evidence,bytes);
  assert.equal(report.status,'PINNED_SOURCE_TRIANGLE_VERIFIED');assert.equal(report.mergeAuthorized,false);assert.equal(report.physicalUnitVerified,false);
  assert.ok(report.sourceScenePoint.every((v,i)=>Math.abs(v-expected[i])<=1e-12));
  assert.equal(report.sourceBytesVerified,true);assert.equal(report.registrationAuthorized,false);
  const altered=structuredClone(evidence);altered.vertices[0][0]+=0.05;
  await assert.rejects(verifyFromPinnedGlb(altered,bytes));
  await assert.rejects(verifyFromPinnedGlb({...evidence,asset:{...evidence.asset,sha256:'0'.repeat(64)}},bytes),/digest mismatch/);
  const corrupt=Buffer.from(bytes);corrupt[corrupt.length-1]^=1;
  await assert.rejects(verifyFromPinnedGlb(evidence,corrupt),/digest mismatch/);
  gltf.scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])m.dispose();});
});

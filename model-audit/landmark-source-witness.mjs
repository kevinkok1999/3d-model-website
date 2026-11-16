#!/usr/bin/env node
// Re-derive a captured triangle from pinned GLB bytes; never trust browser
// vertex values as independent evidence. No correspondence or registration.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { parseGlb } from './audit-model.mjs';
import { createAtlasRegistrationLedger } from './atlas-registration-ledger.mjs';
import { verifyLandmarkEvidence } from './landmark-evidence.mjs';

const need=(ok,msg)=>{if(!ok)throw new Error(msg);};
const digest=(algorithm,bytes)=>createHash(algorithm).update(bytes).digest('hex');
const sourcePins=()=>{const rows=createAtlasRegistrationLedger().rows;return new Map(rows.flatMap(r=>[[r.source.id,r.source],[r.target.id,r.target]]));};
const int=n=>Number.isSafeInteger(n)&&n>=0;

export async function verifyFromPinnedGlb(evidence,bytes){
  const pin=sourcePins().get(evidence?.asset?.id);
  need(pin&&Buffer.isBuffer(bytes)&&bytes.length===pin.bytes,'Unknown, missing or incorrectly sized pinned asset');
  const sha256=digest('sha256',bytes);
  const gitHash=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  need(gitHash===pin.gitBlobSha1&&(!pin.sha256||sha256===pin.sha256)&&sha256===evidence.asset.sha256,'Pinned asset digest mismatch');
  const {json}=parseGlb(bytes);
  const {nodeIndex,meshIndex,primitiveIndex,triangleIndex}=evidence;
  need([nodeIndex,meshIndex,primitiveIndex,triangleIndex].every(int),'Invalid GLB location index');
  const node=json.nodes?.[nodeIndex],primitive=json.meshes?.[meshIndex]?.primitives?.[primitiveIndex];
  need(node?.mesh===meshIndex&&primitive&&(primitive.mode===undefined||primitive.mode===4)&&node.skin===undefined&&!primitive.targets?.length&&!primitive.extensions?.KHR_draco_mesh_compression,'Not a supported original triangle primitive');
  await MeshoptDecoder.ready;
  const manager=new THREE.LoadingManager().setURLModifier(()=>{throw new Error('External asset is not allowed in witness verification');});
  const gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  try{
    // GLTFLoader can decompose a matrix into TRS. Preserve the authored
    // matrix (including shear) when calculating the original scene point.
    const restored=new Set();
    gltf.scene.traverse(obj=>{const n=gltf.parser.associations.get(obj)?.nodes,matrix=json.nodes?.[n]?.matrix;if(matrix){need(!restored.has(n)&&matrix.length===16&&matrix.every(Number.isFinite),'Ambiguous or invalid authored node matrix');restored.add(n);obj.matrix.fromArray(matrix);obj.matrixAutoUpdate=false;obj.matrixWorldNeedsUpdate=true;}});
    gltf.scene.updateMatrixWorld(true);
    const matches=[];
    gltf.scene.traverse(obj=>{
      if(!obj.isMesh)return;
      const a=gltf.parser.associations.get(obj);
      // Multi-primitive nodes may store the original node index on a group.
      let n=a?.nodes;
      if(n===undefined){let ancestor=obj.parent;while(ancestor&&n===undefined){n=gltf.parser.associations.get(ancestor)?.nodes;ancestor=ancestor.parent;}}
      const p=a?.primitives??(json.meshes?.[meshIndex]?.primitives?.length===1?0:undefined);
      if(n===nodeIndex&&a?.meshes===meshIndex&&p===primitiveIndex)matches.push(obj);
    });
    need(matches.length===1,'No unique decoded triangle mesh association');
    const mesh=matches[0];
    need(!mesh.isSkinnedMesh&&!mesh.isInstancedMesh&&!mesh.morphTargetInfluences?.length,'Animated or instanced mesh is unsupported');
    const positions=mesh.geometry.getAttribute('position'),indices=mesh.geometry.getIndex();
    const positionAccessor=await gltf.parser.getDependency('accessor',primitive.attributes.POSITION),indexAccessor=primitive.indices===undefined?null:await gltf.parser.getDependency('accessor',primitive.indices);
    const count=indices?.count??positions?.count;
    need(positions===positionAccessor&&indices===indexAccessor&&positions?.itemSize===3&&positions.count===json.accessors[primitive.attributes.POSITION].count&&count%3===0&&mesh.geometry.drawRange.start===0&&mesh.geometry.drawRange.count>=count&&triangleIndex<count/3,'Triangle ordering or position accessor differs from original primitive');
    const vertexIndices=[0,1,2].map(i=>indices?indices.getX(triangleIndex*3+i):triangleIndex*3+i);
    need(vertexIndices.every(i=>int(i)&&i<positions.count),'Triangle vertex index is outside original POSITION accessor');
    const vertices=vertexIndices.map(i=>new THREE.Vector3().fromBufferAttribute(positions,i).toArray());
    const witness={asset:{id:pin.id,sha256},coordinateSpace:'GLTF_PRIMITIVE_POSITION',nodeIndex,meshIndex,primitiveIndex,triangleIndex,vertexIndices,vertices};
    const verified=verifyLandmarkEvidence(evidence,[witness]);
    const weightSum=evidence.barycentric.reduce((a,b)=>a+b,0),weights=evidence.barycentric.map(x=>x/weightSum);
    const [a,b,c]=vertices;
    const reconstructedPoint=a.map((x,i)=>x+weights[1]*(b[i]-x)+weights[2]*(c[i]-x));
    const sourceScenePoint=new THREE.Vector3(...reconstructedPoint).applyMatrix4(mesh.matrixWorld).toArray();
    need(sourceScenePoint.every(Number.isFinite)&&mesh.matrixWorld.elements.every(Number.isFinite),'Nonfinite decoded source-scene transform');
    return {schemaVersion:1,status:'PINNED_SOURCE_TRIANGLE_VERIFIED',scope:'Source geometry identity and point only; no anatomy, correspondence, scale or registration approval.',sourceBytesVerified:true,witness,verified,sourceScenePoint,sourceSceneMatrixColumnMajor:mesh.matrixWorld.toArray(),physicalUnitVerified:false,anatomicallyValidated:false,registrationAuthorized:false,mergeAuthorized:false};
  }finally{
    const geometries=new Set(),materials=new Set();gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const [evidencePath,glbPath,out,...extra]=process.argv.slice(2);need(evidencePath&&glbPath&&out&&!extra.length,'Usage: node landmark-source-witness.mjs evidence.json pinned-source.glb report.json');
    const eStat=statSync(evidencePath);need(eStat.isFile()&&eStat.size<=65536,'Evidence exceeds size limit');
    const evidenceBytes=readFileSync(evidencePath);need(evidenceBytes.length<=65536,'Evidence exceeds size limit');
    const evidence=JSON.parse(evidenceBytes.toString('utf8')),pin=sourcePins().get(evidence?.asset?.id),gStat=statSync(glbPath);
    need(pin&&gStat.isFile()&&gStat.size===pin.bytes,'Unpinned asset or incorrect file size');
    const report=await verifyFromPinnedGlb(evidence,readFileSync(glbPath));
    writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(report.status);
  }catch(error){console.error(error.message);process.exitCode=1;}
}

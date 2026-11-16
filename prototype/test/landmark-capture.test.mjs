import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {BASE_LANDMARK_ASSETS,pinnedBaseLandmarkAsset,prepareLandmarkSources,captureNativeLandmark,uniqueLandmarkHit} from '../src/landmark-capture.js';

const asset={id:'local-test-fixture',sha256:'f'.repeat(64)};
function fixture(indexed=true){
  const scene=new THREE.Group(),node=new THREE.Group();scene.add(node);
  node.position.set(12,-3,7);node.rotation.set(.2,.5,.17);node.scale.set(3,2,1);
  const geometry=new THREE.BufferGeometry(),position=new THREE.Float32BufferAttribute([0,0,0,4,0,0,0,2,0],3);
  geometry.setAttribute('position',position);if(indexed)geometry.setIndex([2,0,1]);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));node.add(mesh);scene.updateMatrixWorld(true);
  const json={nodes:[{mesh:0}],meshes:[{primitives:[{mode:4,attributes:{POSITION:0},...(indexed?{indices:1}:{})}]}],accessors:[{type:'VEC3',count:3},{type:'SCALAR',count:3}]};
  const associations=new Map([[node,{nodes:0}],[mesh,{meshes:0,primitives:0}]]);
  const gltf={scene,parser:{associations,getDependency:async(type,i)=>[position,geometry.index][i]}};
  const p=new THREE.Vector3(1,.5,0).applyMatrix4(mesh.matrixWorld),normal=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld),origin=p.clone().addScaledVector(normal,4);
  const ray=new THREE.Raycaster(origin,normal.negate());const hit=ray.intersectObject(mesh,false)[0];assert.ok(hit);
  return {scene,node,mesh,json,gltf,hit};
}

for(const indexed of [true,false])test(`native capture of actual ${indexed?'indexed':'nonindexed'} transformed ray hit`,async()=>{
  const {mesh,gltf,json,hit}=fixture(indexed),sources=await prepareLandmarkSources(gltf,json,asset,[mesh]);
  assert.equal(sources.size,1);const evidence=captureNativeLandmark(hit,sources);
  assert.deepEqual(evidence.asset,asset);assert.equal(evidence.coordinateSpace,'GLTF_PRIMITIVE_POSITION');
  assert.deepEqual([evidence.nodeIndex,evidence.meshIndex,evidence.primitiveIndex,evidence.triangleIndex],[0,0,0,0]);
  assert.deepEqual(evidence.vertexIndices,indexed?[2,0,1]:[0,1,2]);
  assert.deepEqual(evidence.vertices,indexed?[[0,2,0],[0,0,0],[4,0,0]]:[[0,0,0],[4,0,0],[0,2,0]]);
  assert.ok(new THREE.Vector3(...evidence.point).distanceTo(new THREE.Vector3(1,.5,0))<1e-12);
  assert.ok(new THREE.Vector3(...evidence.point).distanceTo(hit.point)>1,'World point must not be exported as native');
  assert.ok(Math.abs(evidence.barycentric.reduce((a,b)=>a+b)-1)<1e-12);
  assert.throws(()=>captureNativeLandmark({...hit,faceIndex:1},sources));
  assert.throws(()=>captureNativeLandmark({...hit,face:{...hit.face,a:99}},sources));
  assert.throws(()=>captureNativeLandmark({...hit,point:hit.point.clone().addScalar(1)},sources));
  mesh.geometry.setAttribute('position',mesh.geometry.getAttribute('position').clone());
  assert.throws(()=>captureNativeLandmark(hit,sources));
});

test('ambiguous source, missing identity, synthetic or deformed geometry fail closed',async()=>{
  const {mesh,node,gltf,json,hit}=fixture();
  assert.equal((await prepareLandmarkSources(gltf,json,null,[mesh])).size,0);
  const duplicate=mesh.clone();node.add(duplicate);gltf.parser.associations.set(duplicate,{meshes:0,primitives:0});
  assert.equal((await prepareLandmarkSources(gltf,json,asset,[mesh])).size,0);
  node.remove(duplicate);mesh.morphTargetInfluences=[0];
  assert.equal((await prepareLandmarkSources(gltf,json,asset,[mesh])).size,0);
  delete mesh.morphTargetInfluences;json.meshes[0].primitives[0].mode=5;
  assert.equal((await prepareLandmarkSources(gltf,json,asset,[mesh])).size,0);
  assert.throws(()=>captureNativeLandmark({object:new THREE.Sprite()},new Map()));
  assert.throws(()=>captureNativeLandmark(hit,new Map()));
});

test('capture rejects distinct coincident ray triangles, never falls through',()=>{
  const {mesh,hit}=fixture();assert.equal(uniqueLandmarkHit([]),null);assert.equal(uniqueLandmarkHit([hit]),hit);
  assert.throws(()=>uniqueLandmarkHit([hit,{...hit,object:mesh.clone()}]));
  assert.throws(()=>uniqueLandmarkHit([hit,{...hit,faceIndex:1,distance:hit.distance+1e-10}]));
  assert.equal(uniqueLandmarkHit([hit,{...hit,faceIndex:1,distance:hit.distance+.001}]),hit);
});

for(const variant of ['male','female'])test(`exact pinned ${variant} bytes resolve native source accessors and real ray`,async()=>{
  const bytes=readFileSync(new URL(`../../node_modules/open-anatomy-3d/models/anatomy-${variant}.glb`,import.meta.url)),payload=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  assert.deepEqual(await pinnedBaseLandmarkAsset(variant,payload),BASE_LANDMARK_ASSETS[variant]);
  assert.equal(await pinnedBaseLandmarkAsset(variant,new Uint8Array([3,2,1])),null);
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(payload,'');
  const json=gltf.parser.json,meshes=[];gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(object=>{if(object.isMesh)meshes.push(object);});
  const sources=await prepareLandmarkSources(gltf,json,BASE_LANDMARK_ASSETS[variant],meshes);
  assert.equal(sources.size,meshes.length,'Every exact static primitive must have proof');
  // Choose an anatomical mesh and cast onto its actual visible triangle, not
  // a face fabricated from bounding boxes. Check original source accessor.
  let result=null;
  for(const mesh of meshes){
    if(result)break;const source=sources.get(mesh),p=source.position,index=source.indices;
    for(let i=0;i<Math.min(index?.count??p.count,90);i+=3){
      const vertices=[i,i+1,i+2].map(n=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(n):n).applyMatrix4(mesh.matrixWorld));
      const point=vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3),normal=new THREE.Triangle(...vertices).getNormal(new THREE.Vector3());
      if(normal.lengthSq()===0)continue;const ray=new THREE.Raycaster(point.clone().addScaledVector(normal,.001),normal.negate());
      const hit=ray.intersectObject(mesh,false)[0];if(!hit)continue;
      try{result=captureNativeLandmark(hit,sources);break;}catch{/* test searches a nondegenerate ray */}
    }
  }
  assert.ok(result,'At least one verified ray hit from actual source geometry required');
  const primitive=json.meshes[result.meshIndex].primitives[result.primitiveIndex],position=await gltf.parser.getDependency('accessor',primitive.attributes.POSITION);
  assert.deepEqual(result.vertices,result.vertexIndices.map(i=>new THREE.Vector3().fromBufferAttribute(position,i).toArray()));
  for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
});

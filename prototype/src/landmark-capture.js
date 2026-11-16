import * as THREE from 'three';

// Capture only decoded, untouched source POSITION and TRIANGLES accessors.
// No anatomical identifications, registration transforms or landmark pairing.
const indexIn=(index,items)=>Number.isSafeInteger(index)&&index>=0&&index<(items?.length??0);
const need=(ok,message)=>{if(!ok)throw new Error(message);};
const finite=values=>values.every(Number.isFinite);
const SHA256=/^[a-f0-9]{64}$/;
export const BASE_LANDMARK_ASSETS=Object.freeze({
  male:Object.freeze({id:'open-anatomy-3d-male',sha256:'25248bef02f0ca43eedbd25231f8b6f9681865a57016f9d5e352d407407336c7'}),
  female:Object.freeze({id:'open-anatomy-3d-female',sha256:'2eee011f8cb7a189af0757f5e287754e84276dd084faeb2daca45572942f4ce2'}),
});

export async function pinnedBaseLandmarkAsset(variant,bytes){
  const asset=BASE_LANDMARK_ASSETS[variant];
  if(!asset||!globalThis.crypto?.subtle)return null;
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  return digest===asset.sha256?asset:null;
}

// Resolve exact authored node/mesh/primitive indices, never object names. The
// accessor references must be identical to the actual renderer's attributes;
// this rejects geometry reordered or synthesized by a loader extension.
export async function prepareLandmarkSources(gltf,json,asset,objects){
  const proven=new Map();
  if(!asset||typeof asset.id!=='string'||!asset.id||!SHA256.test(asset.sha256??''))return proven;
  const parser=gltf?.parser;
  if(!parser?.associations||!parser.getDependency)return proven;
  const sceneMeshes=[];
  gltf.scene.traverse(object=>{if(object.isMesh)sceneMeshes.push(object);});
  const candidate=await Promise.all(sceneMeshes.map(async object=>{
    try{
      const assoc=parser.associations.get(object);
      let nodeIndex;
      let ancestor=object;
      while(ancestor){const a=parser.associations.get(ancestor);if(a?.nodes!==undefined){nodeIndex=a.nodes;break;}if(ancestor===gltf.scene)break;ancestor=ancestor.parent;}
      const meshIndex=assoc?.meshes,primitiveIndex=assoc?.primitives;
      need(indexIn(nodeIndex,json.nodes)&&indexIn(meshIndex,json.meshes)&&json.nodes[nodeIndex].mesh===meshIndex,'Unproven mesh node');
      const mesh=json.meshes[meshIndex];need(indexIn(primitiveIndex,mesh.primitives),'Unproven primitive');
      return {object,nodeIndex,meshIndex,primitiveIndex,primitive:mesh.primitives[primitiveIndex]};
    }catch{return null;}
  }));
  const counts=new Map();for(const item of candidate.filter(Boolean)){const k=`${item.nodeIndex}:${item.meshIndex}:${item.primitiveIndex}`;counts.set(k,(counts.get(k)??0)+1);}
  const allowed=new Set(objects??sceneMeshes);
  await Promise.all(candidate.filter(Boolean).map(async item=>{
    const {object,nodeIndex,meshIndex,primitiveIndex,primitive}=item;
    const key=`${nodeIndex}:${meshIndex}:${primitiveIndex}`;
    try{
      need(allowed.has(object)&&counts.get(key)===1,'Ambiguous source mesh association');
      need(object.isMesh&&!object.isSkinnedMesh&&!object.isInstancedMesh&&!object.morphTargetInfluences?.length&&!primitive.targets?.length&&json.nodes[nodeIndex].skin===undefined,'Deformed geometry');
      need((primitive.mode??4)===4&&!primitive.extensions?.KHR_draco_mesh_compression,'Not a native triangle primitive');
      const geometry=object.geometry,positionIndex=primitive.attributes?.POSITION,indexIndex=primitive.indices;
      need(indexIn(positionIndex,json.accessors)&&json.accessors[positionIndex].type==='VEC3','Missing source position accessor');
      const position=await parser.getDependency('accessor',positionIndex);
      const indices=indexIndex===undefined?null:await parser.getDependency('accessor',indexIndex);
      need(position===geometry?.getAttribute('position')&&indices===(geometry.index??null)&&position.itemSize===3&&position.count===json.accessors[positionIndex].count,'Source accessor identity mismatch');
      need(indexIndex===undefined||(indexIn(indexIndex,json.accessors)&&indices?.count===json.accessors[indexIndex].count&&indices.itemSize===1&&!indices.normalized),'Invalid source index accessor');
      const count=indices?.count??position.count;
      need(count>=3&&count%3===0&&geometry.drawRange.start===0&&geometry.drawRange.count>=count,'Source does not use full triangle ordering');
      proven.set(object,{asset:{id:asset.id,sha256:asset.sha256},nodeIndex,meshIndex,primitiveIndex,position,indices});
    }catch{/* fail closed per mesh; unrelated rendering stays available */}
  }));
  return proven;
}

// Capture, unlike ordinary selection, cannot resolve coincident / equally
// near triangle hits by draw order. Caller supplies camera-depth-filtered
// Raycaster hits (sorted by distance).
export function uniqueLandmarkHit(hits){
  if(!hits.length)return null;
  const nearest=hits[0],scale=Math.max(Math.abs(nearest.distance),...nearest.point.toArray().map(Math.abs),Number.MIN_VALUE);
  const tolerance=scale*1e-9;
  if(!Number.isFinite(nearest.distance)||!Number.isFinite(tolerance))throw new Error('Invalid ray distance');
  for(const other of hits.slice(1)){
    if(other.distance-nearest.distance>tolerance)break;
    if(other.object!==nearest.object||other.faceIndex!==nearest.faceIndex)throw new Error('Ambiguous coincident source triangles');
  }
  return nearest;
}

export function captureNativeLandmark(hit,proven){
  need(hit?.object&&hit.face&&Number.isSafeInteger(hit.faceIndex)&&hit.faceIndex>=0,'No actual source triangle hit');
  const source=proven.get(hit.object);
  need(source,'Exact source triangle identity cannot be proven');
  need(!hit.object.isSkinnedMesh&&!hit.object.isInstancedMesh&&!hit.object.morphTargetInfluences?.length,'Deformed geometry');
  const {asset,nodeIndex,meshIndex,primitiveIndex,position,indices}=source;
  need(hit.object.geometry.getAttribute('position')===position&&(hit.object.geometry.index??null)===indices,'Source geometry changed');
  const triangleIndex=hit.faceIndex,base=triangleIndex*3,count=indices?.count??position.count;
  need(base+2<count,'Triangle index is not in the source primitive');
  const vertexIndices=[base,base+1,base+2].map(i=>indices?indices.getX(i):i);
  need(vertexIndices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<position.count)&&new Set(vertexIndices).size===3,'Invalid source triangle indices');
  need(vertexIndices.every((i,n)=>i===[hit.face.a,hit.face.b,hit.face.c][n]),'Source triangle ordering differs from ray hit');
  const verts=vertexIndices.map(i=>new THREE.Vector3().fromBufferAttribute(position,i));
  const vertices=verts.map(v=>v.toArray());need(vertices.every(finite),'Invalid source triangle vertices');
  const matrix=hit.object.matrixWorld,det=matrix.determinant();
  need(finite(matrix.elements)&&Number.isFinite(det)&&det!==0&&finite(hit.point.toArray()),'World-to-local transform is not invertible');
  const local=hit.point.clone().applyMatrix4(matrix.clone().invert());
  // Raycaster computes this at the real mesh-local intersection, before
  // matrixWorld. Cross-check against the inverse-transformed world point.
  const weights=hit.barycoord?.toArray();
  need(weights?.length===3&&finite(weights)&&weights.every(w=>w>=-1e-8&&w<=1+1e-8),'Invalid intersection barycentric weights');
  const bounded=weights.map(w=>Math.max(0,Math.min(1,w))),sum=bounded.reduce((a,b)=>a+b,0);
  need(Math.abs(sum-1)<1e-8,'Invalid barycentric sum');
  const barycentric=bounded.map(w=>w/sum);
  const reconstructed=new THREE.Vector3();verts.forEach((v,i)=>reconstructed.addScaledVector(v,barycentric[i]));
  const magnitude=Math.max(...vertices.flat().map(Math.abs));
  const ab=verts[1].clone().sub(verts[0]),ac=verts[2].clone().sub(verts[0]),bc=verts[2].clone().sub(verts[1]);
  const lengths=[ab.length(),ac.length(),bc.length()],edgeScale=Math.max(...lengths);
  need(Number.isFinite(edgeScale)&&edgeScale>0&&Math.min(...lengths)>128*Number.EPSILON*magnitude,'Degenerate triangle edges');
  const area=ab.divideScalar(edgeScale).cross(ac.divideScalar(edgeScale)).length();
  need(Number.isFinite(area)&&area>=1e-10&&finite(local.toArray())&&reconstructed.distanceTo(local)<=edgeScale*1e-8+16*Number.EPSILON*magnitude,'Native intersection cannot be independently reconstructed');
  return {schemaVersion:1,asset:{...asset},coordinateSpace:'GLTF_PRIMITIVE_POSITION',nodeIndex,meshIndex,primitiveIndex,triangleIndex,vertexIndices,vertices,barycentric,point:reconstructed.toArray()};
}

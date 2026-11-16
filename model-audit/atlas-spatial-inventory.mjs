#!/usr/bin/env node
// Exact source-native coordinates only. Bounding boxes are NOT anatomical landmarks.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {parseGlb,auditGeometry} from './audit-model.mjs';

const PINS=Object.freeze({
  male:{hash:'25248bef02f0ca43eedbd25231f8b6f9681865a57016f9d5e352d407407336c7',count:128},
  female:{hash:'2eee011f8cb7a189af0757f5e287754e84276dd084faeb2daca45572942f4ce2',count:133},
});
const CATALOG_HASH='485cbdca2d5bdb19fc233151672780996394e956da75442a50f79cd593d03657';
const hash=b=>createHash('sha256').update(b).digest('hex');
const finite=a=>a.every(Number.isFinite);
const require=(c,msg)=>{if(!c)throw new Error(msg);};
const boxData=b=>({min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()});

export async function measureAtlasSource(variant,catalogBytes,glbBytes){
  const pin=PINS[variant];require(Object.hasOwn(PINS,variant)&&pin,'Unknown base variant');
  require(hash(catalogBytes)===CATALOG_HASH,'Unpinned base catalog');
  require(hash(glbBytes)===pin.hash,'Unpinned base GLB');
  const catalog=JSON.parse(catalogBytes.toString('utf8')),preflight=auditGeometry(catalog,variant,glbBytes);
  require(preflight.errors.length===0,'Base identity preflight failed');
  const expected=new Map(catalog.filter(x=>(!x.sex||x.sex===variant)&&x.system!=='joints').map(x=>[x.key,x]));
  const {json}=parseGlb(glbBytes);
  await MeshoptDecoder.ready;
  const manager=new THREE.LoadingManager().setURLModifier(()=>{throw new Error('Unexpected external asset');});
  const gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).parseAsync(glbBytes.buffer.slice(glbBytes.byteOffset,glbBytes.byteOffset+glbBytes.byteLength),'');
  const seen=new Set(),records=[],nativeBounds=new THREE.Box3(),point=new THREE.Vector3();
  try{
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const a=gltf.parser.associations.get(mesh),node=json.nodes[a?.nodes];
      require(Number.isInteger(a?.nodes)&&node?.mesh===a.meshes&&expected.has(node.name)&&!seen.has(node.name),'Unmapped/duplicate decoded mesh association');
      require(finite(mesh.matrixWorld.elements),'Nonfinite world transform');
      require(!mesh.isSkinnedMesh&&!mesh.isInstancedMesh&&!mesh.morphTargetInfluences?.length,'Animated/instanced base requires separate spatial inventory');
      const p=mesh.geometry.getAttribute('position');require(p?.itemSize===3&&p.count>=3,'Invalid positions');
      // Transform EVERY actual decoded vertex, not just accessor metadata or
      // rotated local box corners. This is an axis-aligned source scene extent.
      const b=new THREE.Box3();
      for(let i=0;i<p.count;i++){
        point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
        require(finite(point.toArray()),'Nonfinite decoded world vertex');b.expandByPoint(point);
      }
      require(!b.isEmpty()&&b.getSize(new THREE.Vector3()).lengthSq()>0,'Empty/degenerate bound');
      const key=node.name;seen.add(key);nativeBounds.union(b);
      records.push({key,system:expected.get(key).system,nodeIndex:a.nodes,meshIndex:a.meshes,positionCount:p.count,worldMatrixColumnMajor:mesh.matrixWorld.toArray(),nativeWorldBounds:boxData(b)});
    });
    require(records.length===pin.count&&seen.size===expected.size,'Missing base geometry');
    const anchors=catalog.filter(x=>x.system==='joints'&&(!x.sex||x.sex===variant)).map(x=>({key:x.key,kind:'SOURCE_CATALOG_HOTSPOT_NOT_FIT_LANDMARK',point:variant==='female'?x.anchorFemale:x.anchor}));
    require(anchors.every(x=>Array.isArray(x.point)&&x.point.length===3&&finite(x.point)),'Invalid source hotspot');
    return {variant,sourceId:`open-anatomy-3d-${variant}`,assetSha256:pin.hash,catalogSha256:CATALOG_HASH,sourceRevision:'c050aa7b1bc56ceed668199b01ea017341928d7b',coordinateConvention:'DECODED_GLTF_SOURCE_SCENE_NATIVE',physicalUnitVerified:false,anatomicallyValidated:false,registrationStatus:'UNREGISTERED',mergeAuthorized:false,nativeWorldBounds:boxData(nativeBounds),meshCount:records.length,hotspotCount:anchors.length,records:records.sort((a,b)=>a.nodeIndex-b.nodeIndex),anchors};
  }finally{
    const geometries=new Set(),materials=new Set();gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const [out,...extra]=process.argv.slice(2);require(out&&!extra.length,'Usage: node model-audit/atlas-spatial-inventory.mjs report.json');
    const root=new URL('../node_modules/open-anatomy-3d/',import.meta.url),catalog=readFileSync(new URL('catalog.json',root));
    const variants=[];for(const variant of ['male','female'])variants.push(await measureAtlasSource(variant,catalog,readFileSync(new URL(`models/anatomy-${variant}.glb`,root))));
    const report={status:'SOURCE_COORDINATE_INVENTORY_PASS',scope:'Actual decoded base-scene vertex bounds and original hotspot records; no inter-source transform, physical scale claim, landmark correspondence or anatomy review.',mergeAuthorized:false,variants};
    writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({status:report.status,variants:variants.map(({variant,meshCount,hotspotCount,nativeWorldBounds})=>({variant,meshCount,hotspotCount,nativeWorldBounds})),mergeAuthorized:false}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}

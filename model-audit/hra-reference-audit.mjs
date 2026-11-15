#!/usr/bin/env node
// Offline, bounded HRA reference-source preflight. No anatomical validation,
// source merge, model publication, coordinate registration or medical claims.
import { openSync, closeSync, fstatSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_GLB=256*1024*1024, MAX_CSV=8*1024*1024, MAX_JSON=32*1024*1024;
const MAX_ELEMENTS=50_000_000, MAX_NODES=100_000;
const IDS=['blood-vasculature-female','blood-vasculature-male','brain-female','brain-male'];
const COLUMNS=['node_name','OntologyID','label'];
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const fail=msg=>{throw new Error(msg)};
const need=(condition,msg)=>{if(!condition)fail(msg)};
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const arr=(v,name)=>{need(Array.isArray(v),`Invalid ${name} array`);return v};
const index=(a,i,label)=>{need(integer(i,0,a.length-1),`Invalid ${label} index ${i}`);return a[i]};
const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);

function readBounded(path, max, expected) {
  const fd=openSync(path,'r');
  try {
    const stat=fstatSync(fd);
    need(stat.isFile()&&integer(stat.size,1,max),`File size outside bounded regular file limit: ${path}`);
    if(expected!==undefined)need(stat.size===expected,`Pinned byte length mismatch: ${path}`);
    const bytes=Buffer.allocUnsafe(stat.size);
    let read=0;
    while(read<bytes.length){const n=readSync(fd,bytes,read,bytes.length-read,read);need(n>0,'Truncated file');read+=n;}
    need(fstatSync(fd).size===bytes.length,'File changed while reading');
    return bytes;
  } finally {closeSync(fd)}
}

function pinnedAsset(root,id,pin,max) {
  need(pin&&integer(pin.bytes,1,max)&&/^[a-f0-9]{40}$/.test(pin.gitBlobSha1),'Missing/invalid pinned byte length or Git blob SHA1');
  need(typeof pin.filename==='string'&&/^[A-Za-z0-9_.-]+$/.test(pin.filename)&&!['.','..'].includes(pin.filename),'Unsafe pinned filename');
  need(pin.localPath===`${id}/${pin.filename}`,'Invalid pinned localPath');
  if(pin.sha256!==undefined)need(/^[a-f0-9]{64}$/.test(pin.sha256),'Invalid pinned SHA256');
  const base=realpathSync(root), file=realpathSync(resolve(base,pin.localPath)), rel=relative(base,file);
  need(!isAbsolute(rel)&&rel!==''&&rel!=='..'&&!rel.startsWith(`..${sep}`),'Asset path escapes intake directory');
  const bytes=readBounded(file,max,pin.bytes), gitBlobSha1=gitBlob(bytes), digest=sha256(bytes);
  need(gitBlobSha1===pin.gitBlobSha1,`Git blob SHA1 mismatch: ${pin.localPath}`);
  if(pin.sha256!==undefined)need(digest===pin.sha256,`SHA256 mismatch: ${pin.localPath}`);
  return {bytes,provenance:{bytes:bytes.length,gitBlobSha1,sha256:digest,sha256WasPinned:pin.sha256!==undefined}};
}

function glbChunks(bytes) {
  need(bytes.length>=28&&bytes.readUInt32LE(0)===0x46546c67,'Invalid GLB header magic');
  need(bytes.readUInt32LE(4)===2,'Invalid GLB version');
  need(bytes.readUInt32LE(8)===bytes.length,'GLB declared length mismatch');
  let offset=12;const chunks=[];
  while(offset<bytes.length){
    need(offset+8<=bytes.length,'Truncated GLB chunk header');
    const length=bytes.readUInt32LE(offset), type=bytes.readUInt32LE(offset+4);offset+=8;
    need(integer(length,1)&&length%4===0&&length<=bytes.length-offset,'Invalid GLB chunk length/range');
    chunks.push({type,length,data:bytes.subarray(offset,offset+length)});offset+=length;
    need(chunks.length<=2,'Unexpected extra GLB chunk');
  }
  need(chunks.length===2&&chunks[0].type===0x4e4f534a&&chunks[1].type===0x004e4942,'Expected exact JSON then BIN GLB chunks');
  need(chunks[0].length<=MAX_JSON,'GLB JSON chunk exceeds bound');
  const json=JSON.parse(decode(chunks[0].data));
  need(json?.asset?.version==='2.0','Missing glTF 2.0 asset version');
  return {json,bin:chunks[1].data,jsonBytes:chunks[0].length};
}

function modelRanges(json,bin) {
  const buffers=arr(json.buffers,'buffers');
  need(buffers.length===1&&!('uri' in buffers[0]),'Expected one embedded BIN buffer; external uri forbidden');
  const byteLength=buffers[0].byteLength;
  need(integer(byteLength,1,bin.length)&&bin.length-byteLength<=3,'BIN buffer length mismatch');
  const views=arr(json.bufferViews,'bufferViews'), accessors=arr(json.accessors,'accessors');
  need(views.length>0&&accessors.length>0&&views.length<=MAX_NODES&&accessors.length<=MAX_NODES,'Buffer/accessor count outside bounds');
  const allowed=new Set(['KHR_materials_unlit','KHR_materials_specular','KHR_materials_ior','KHR_materials_pbrSpecularGlossiness','KHR_materials_transmission','KHR_materials_clearcoat','KHR_materials_emissive_strength','KHR_texture_transform']);
  for(const ext of json.extensionsRequired??[])need(allowed.has(ext),`Unsupported required extension: ${ext}`);
  for(const img of json.images??[]){need(!('uri' in img),'External image uri forbidden');index(views,img.bufferView,'image bufferView');}
  for(const [i,view] of views.entries()){
    const start=view.byteOffset??0;
    need(view.buffer===0&&integer(start,0,byteLength)&&integer(view.byteLength,1,byteLength-start),`bufferView ${i} outside BIN range`);
    if(view.byteStride!==undefined)need(integer(view.byteStride,4,252)&&view.byteStride%4===0,`Invalid bufferView ${i} stride`);
    need(!view.extensions?.EXT_meshopt_compression,'Unsupported meshopt-compressed bufferView');
  }
  const componentSize={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  const typeSize={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const ranges=accessors.map((a,i)=>{
    const view=index(views,a.bufferView,`accessor ${i} bufferView`), component=componentSize[a.componentType], width=typeSize[a.type];
    need(!a.sparse&&component&&width&&integer(a.count,1,MAX_ELEMENTS),`Unsupported or invalid accessor ${i} format/count`);
    const local=a.byteOffset??0, elementBytes=component*width,stride=view.byteStride??elementBytes,start=(view.byteOffset??0)+local;
    need(integer(local,0,view.byteLength)&&local%component===0&&start%component===0&&stride>=elementBytes&&stride%component===0,`Misaligned accessor ${i}`);
    need((a.count-1)*stride+elementBytes<=view.byteLength-local,`accessor ${i} outside bufferView range`);
    for(const bound of ['min','max'])if(a[bound]!==undefined)need(Array.isArray(a[bound])&&a[bound].length===width&&a[bound].every(Number.isFinite),`Invalid accessor ${i} ${bound}`);
    if(a.min&&a.max)need(a.min.every((n,c)=>n<=a.max[c]),`Invalid accessor ${i} bounds order`);
    return {a,view,start,stride,width,component};
  });
  return {ranges,byteLength,viewCount:views.length};
}

function meshesAudit(json,bin,ranges){
  const meshes=arr(json.meshes,'meshes');
  need(meshes.length>0&&meshes.length<=MAX_NODES,'Mesh count outside bounds');
  let primitives=0,vertices=0,triangles=0,indices=0,scanCost=0;
  const positionCache=new Set(),indexCache=new Set();
  for(const [i,mesh] of meshes.entries()){
    const ps=arr(mesh.primitives,'mesh primitives');need(ps.length>0,'Empty mesh primitives');
    for(const p of ps){
      need(++primitives<=MAX_NODES,'Primitive count exceeds bound');
      need(!p.extensions?.KHR_draco_mesh_compression,'Unsupported Draco-compressed primitive');
      need((p.mode??4)===4,'Unsupported non-triangle mesh primitive');
      const posIndex=p.attributes?.POSITION,pos=index(ranges,posIndex,`mesh ${i} POSITION`);
      need(pos.a.componentType===5126&&pos.a.type==='VEC3'&&pos.a.count>=3&&!pos.a.normalized,'Invalid POSITION accessor');
      for(const [name,aIndex] of Object.entries(p.attributes))need(index(ranges,aIndex,`attribute ${name}`).a.count===pos.a.count,`Mismatched ${name} vertex count`);
      need(!(p.targets?.length),'Morph targets not supported by this reference-only audit');
      if(!positionCache.has(posIndex)){
        scanCost+=pos.a.count;need(scanCost<=MAX_ELEMENTS,'Geometry scan exceeds bounded element count');
        const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];
        for(let v=0;v<pos.a.count;v++)for(let c=0;c<3;c++){
          const value=bin.readFloatLE(pos.start+v*pos.stride+c*4);
          need(Number.isFinite(value),'Non-finite POSITION value');mins[c]=Math.min(mins[c],value);maxs[c]=Math.max(maxs[c],value);
        }
        need(maxs.some((n,c)=>n>mins[c]),'Zero-extent POSITION data');
        if(pos.a.min&&pos.a.max){
          const near=(a,b)=>Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a),Math.abs(b));
          need(mins.every((n,c)=>near(n,pos.a.min[c])&&near(maxs[c],pos.a.max[c])),'POSITION computed bounds mismatch');
        }
        positionCache.add(posIndex);
      }
      let triangleCount=pos.a.count;
      if(p.indices!==undefined){
        const ix=index(ranges,p.indices,`mesh ${i} indices`);
        need(ix.a.type==='SCALAR'&&[5121,5123,5125].includes(ix.a.componentType)&&!ix.a.normalized&&ix.view.byteStride===undefined,'Invalid indices accessor');
        triangleCount=ix.a.count;indices+=triangleCount;
        const cacheKey=`${p.indices}:${pos.a.count}`;
        if(!indexCache.has(cacheKey)){
          scanCost+=ix.a.count;need(scanCost<=MAX_ELEMENTS,'Geometry scan exceeds bounded element count');
          for(let n=0;n<ix.a.count;n++)need(bin.readUIntLE(ix.start+n*ix.stride,ix.component)<pos.a.count,'Element index outside POSITION range');
          indexCache.add(cacheKey);
        }
      }
      need(triangleCount>=3&&triangleCount%3===0,'Invalid triangle-list element count');
      vertices+=pos.a.count;triangles+=triangleCount/3;
    }
  }
  return {meshCount:meshes.length,primitives,vertices,triangles,indices,meshDefs:meshes};
}

function nodesAudit(json,meshDefs){
  const nodes=arr(json.nodes,'nodes'),scenes=arr(json.scenes,'scenes');
  need(nodes.length>0&&nodes.length<=MAX_NODES&&scenes.length>0,'Scene/node count outside bounds');
  const scene=index(scenes,json.scene??0,'scene'), parents=new Int32Array(nodes.length).fill(-1), byName=new Map();
  let meshNodes=0;
  const fields={matrix:16,translation:3,rotation:4,scale:3};
  for(const [i,node] of nodes.entries()){
    need(node&&typeof node==='object','Invalid node');
    if(node.name!==undefined){need(typeof node.name==='string','Invalid node name');const existing=byName.get(node.name)??[];existing.push(i);byName.set(node.name,existing);}
    for(const [field,width] of Object.entries(fields))if(node[field]!==undefined)need(Array.isArray(node[field])&&node[field].length===width&&node[field].every(Number.isFinite),`Invalid node ${i} transform ${field}`);
    need(!(node.matrix&&(node.translation||node.rotation||node.scale)),'Mixed matrix and TRS node transforms');
    if(node.mesh!==undefined){index(meshDefs,node.mesh,'node mesh');meshNodes++;}
    for(const child of node.children??[]){index(nodes,child,'child node');need(parents[child]===-1,`Node ${child} has duplicate/multiple parent`);parents[child]=i;}
  }
  const roots=arr(scene.nodes,'scene nodes');need(roots.length>0,'Empty scene');
  const seen=new Set(),post=[],stack=[];
  for(const i of roots){index(nodes,i,'scene root');need(parents[i]===-1,'Scene root has parent/cycle');stack.push(i)}
  while(stack.length){const i=stack.pop();need(!seen.has(i),'Scene duplicate/cycle');seen.add(i);post.push(i);for(const j of nodes[i].children??[])stack.push(j);}
  need(seen.size===nodes.length,'Unreachable node or scene cycle');
  const hasMesh=new Uint8Array(nodes.length), meshesUsed=new Set();
  for(let n=post.length-1;n>=0;n--){const i=post[n],node=nodes[i];if(node.mesh!==undefined){hasMesh[i]=1;meshesUsed.add(node.mesh)}if(hasMesh[i]&&parents[i]!==-1)hasMesh[parents[i]]=1;}
  need(meshNodes>0&&meshesUsed.size===meshDefs.length,'No mesh nodes or unreachable mesh definitions');
  return {nodes,byName,hasMesh,meshNodes,parents};
}

function parseCsv(bytes){
  const source=decode(bytes).replace(/^\uFEFF/,'');const rows=[];
  let row=[],field='',quoted=false,closed=false;
  const endField=()=>{row.push(field);field='';closed=false};
  const endRow=()=>{endField();rows.push(row);row=[];need(rows.length<=MAX_NODES,'CSV row count exceeds bound')};
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quoted){if(c==='"'){if(source[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
    else if(c===',')endField();else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;endRow();}
    else if(c==='"'){need(!field&&!closed,'Malformed CSV quote');quoted=true;}
    else {need(!closed,'Unexpected characters after CSV closing quote');field+=c;}
  }
  need(!quoted,'Unclosed CSV quote');if(field||row.length||closed)endRow();
  need(rows.length>1&&JSON.stringify(rows.shift())===JSON.stringify(COLUMNS),'Unexpected crosswalk CSV header');
  return rows;
}

function crosswalkAudit(bytes,pin,model){
  need(JSON.stringify(pin.columns)===JSON.stringify(COLUMNS),'Pinned crosswalk columns mismatch');
  const rows=parseCsv(bytes),seen=new Set(),unique=new Set(),mapped=new Set();const matches=[];
  need(integer(pin.expectedRows,1,MAX_NODES)&&rows.length===pin.expectedRows,'Crosswalk inventory row count mismatch');
  let directMeshRows=0,groupRows=0;
  for(const row of rows){
    need(row.length===3,'Invalid crosswalk row width');const [name,id,label]=row;
    need(name&&name.trim()===name&&label.trim(),'Missing crosswalk node name or label');
    need(/^(?:FMA|UBERON):\d+$/.test(id),`Invalid crosswalk ontology ID: ${id}`);
    need(!seen.has(name),`Duplicate crosswalk node name: ${name}`);seen.add(name);unique.add(id);
    const found=model.byName.get(name)??[];need(found.length===1,`Missing or ambiguous crosswalk node: ${name} (${found.length} matches)`);
    const nodeIndex=found[0],node=model.nodes[nodeIndex];mapped.add(nodeIndex);
    const kind=node.mesh!==undefined?'mesh':'group';
    need(model.hasMesh[nodeIndex],`Crosswalk node has no mesh descendant: ${name}`);
    if(kind==='mesh')directMeshRows++;else groupRows++;
    matches.push({nodeName:name,ontologyId:id,nodeIndex,kind,meshIndex:node.mesh??null});
  }
  need(integer(pin.expectedUniqueOntologyIds,1,MAX_NODES)&&unique.size===pin.expectedUniqueOntologyIds,'Crosswalk unique ontology ID inventory mismatch');
  const unmappedMeshNodeNames=[],groupCoveredMeshNodeNames=[];
  for(const [i,node] of model.nodes.entries())if(node.mesh!==undefined&&!mapped.has(i)){
    let ancestor=model.parents[i];while(ancestor!==-1&&!mapped.has(ancestor))ancestor=model.parents[ancestor];
    if(ancestor===-1)unmappedMeshNodeNames.push(node.name??`#${i}`);else groupCoveredMeshNodeNames.push(node.name??`#${i}`);
  }
  // Group containment is reported explicitly; it does not assign an ontology ID
  // to any child mesh. Geometry with no crosswalk association is a hard stop.
  need(!unmappedMeshNodeNames.length,`Unmapped mesh nodes (${unmappedMeshNodeNames.length}): ${unmappedMeshNodeNames.slice(0,5).join(', ')}`);
  return {rows:rows.length,uniqueOntologyIds:unique.size,directMeshRows,groupRows,groupCoveredMeshNodes:groupCoveredMeshNodeNames.length,unmappedMeshNodes:0,matches};
}

export function auditHraSource(source,root){
  need(IDS.includes(source?.id)&&source.id.endsWith(`-${source.variant}`),'Unknown HRA source or variant');
  const glb=pinnedAsset(root,source.id,source.glb,MAX_GLB),csv=pinnedAsset(root,source.id,source.crosswalk,MAX_CSV);
  const {json,bin,jsonBytes}=glbChunks(glb.bytes),{ranges,byteLength,viewCount}=modelRanges(json,bin);
  const {meshDefs,meshCount,...meshStats}=meshesAudit(json,bin,ranges),model=nodesAudit(json,meshDefs);
  return {sourceId:source.id,variant:source.variant,status:'TECHNICAL_PREFLIGHT_PASS',anatomicallyValidated:false,mergeAuthorized:false,
    glb:{...glb.provenance,jsonBytes,binBytes:bin.length,bufferBytes:byteLength,bufferViews:viewCount,accessors:ranges.length,nodes:model.nodes.length,meshNodes:model.meshNodes,meshes:meshCount,...meshStats},
    crosswalk:{...csv.provenance,...crosswalkAudit(csv.bytes,source.crosswalk,model)}};
}

export function auditHraManifest(manifest,root){
  need(manifest?.schemaVersion===1&&Array.isArray(manifest.sources)&&manifest.sources.length===4&&new Set(manifest.sources.map(s=>s.id)).size===4&&IDS.every(id=>manifest.sources.some(s=>s.id===id)),'Expected exact four-source HRA inventory');
  const {repository,commit}=manifest.source??{};
  need(repository==='https://github.com/hubmapconsortium/hra-kg'&&/^[a-f0-9]{40}$/.test(commit),'Expected pinned official HRA repository and commit');
  for(const source of manifest.sources){
    need(/^v\d+\.\d+$/.test(source.version),'Invalid source version');
    const prefix=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${commit}/digital-objects/ref-organ/${source.id}/${source.version}/raw/`;
    for(const kind of ['glb','crosswalk'])need(source[kind]?.url===prefix+source[kind]?.filename,`Pinned asset URL mismatch: ${source.id}/${kind}`);
  }
  const results=[];
  for(const source of manifest.sources){
    try{results.push(auditHraSource(source,root))}catch(e){results.push({sourceId:source.id,variant:source.variant,status:'BLOCKED',error:e.message,anatomicallyValidated:false,mergeAuthorized:false})}
  }
  return {status:results.every(r=>r.status==='TECHNICAL_PREFLIGHT_PASS')?'TECHNICAL_PREFLIGHT_PASS':'BLOCKED',scope:'Actual pinned local bytes, raw triangle geometry ranges and exact source crosswalk only; not anatomical, clinical, spatial registration or merge validation.',anatomicallyValidated:false,mergeAuthorized:false,results};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const [root,manifestPath,reportPath]=process.argv.slice(2);
    need(root&&manifestPath&&reportPath,'Usage: node model-audit/hra-reference-audit.mjs <asset-dir> <manifest.json> <report.json>');
    const result=auditHraManifest(JSON.parse(decode(readBounded(manifestPath,MAX_CSV))),root);
    writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    for(const r of result.results)console.log(r.status==='BLOCKED'?`${r.sourceId}: BLOCKED ${r.error}`:`${r.sourceId}: ${r.status}; ${r.glb.meshNodes} mesh nodes / ${r.crosswalk.directMeshRows} direct matches / ${r.crosswalk.groupRows} groups; SHA256 ${r.glb.sha256}`);
    if(result.status!=='TECHNICAL_PREFLIGHT_PASS')process.exitCode=1;
  }catch(e){console.error(e.message);process.exitCode=1;}
}

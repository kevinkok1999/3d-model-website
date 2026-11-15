import inventory from '../../model-audit/hra-intake-candidates.json' with {type:'json'};

// Standalone HRA source intake only. The loader never requests upstream public
// URLs, synthesizes anatomy, inherits ontology labels or registers coordinates.
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};
export const HRA_SOURCES=freeze(inventory.sources);
const byId=new Map(HRA_SOURCES.map(s=>[s.id,s]));
const MAX_AUDIT=8*1024*1024,MAX_GLB=32*1024*1024,MAX_CSV=1024*1024,MAX_NODES=100_000,MAX_JSON=16*1024*1024;
const COLUMNS=['node_name','OntologyID','label'];
const ALLOWED_REQUIRED=new Set(['KHR_materials_unlit','KHR_materials_specular','KHR_materials_ior','KHR_materials_pbrSpecularGlossiness','KHR_materials_transmission','KHR_materials_clearcoat','KHR_materials_emissive_strength','KHR_texture_transform']);
const need=(condition,message)=>{if(!condition)throw new Error(message);};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const hex=(value,len)=>typeof value==='string'&&value.length===len&&/^[a-f0-9]+$/.test(value);
const decode=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const equalArray=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const passed=r=>r?.status==='TECHNICAL_PREFLIGHT_PASS'&&r.anatomicallyValidated===false&&r.mergeAuthorized===false;

function validatePin(pin,max){need(record(pin)&&integer(pin.bytes,1,max)&&hex(pin.gitBlobSha1,40),'Invalid pinned HRA asset metadata');}
function validateAuditAsset(pin,audited,max){validatePin(pin,max);need(record(audited)&&audited.bytes===pin.bytes&&audited.gitBlobSha1===pin.gitBlobSha1&&hex(audited.sha256,64),'Audit differs from pinned HRA asset metadata');}
export function selectHraAudit(report,id){
  need(byId.has(id),'Unknown HRA source');need(passed(report)&&Array.isArray(report.results)&&report.results.length===HRA_SOURCES.length,'Complete unregistered HRA audit required');
  const seen=new Set();let selected;
  for(const audit of report.results){
    const source=byId.get(audit?.sourceId);need(source&&!seen.has(source.id)&&audit.variant===source.variant&&passed(audit),'HRA audit source/variant/status mismatch');seen.add(source.id);
    validateAuditAsset(source.glb,audit.glb,MAX_GLB);validateAuditAsset(source.crosswalk,audit.crosswalk,MAX_CSV);
    if(source.id===id)selected=audit;
  }
  need(selected,'HRA source preflight not available');return selected;
}

function arrayBufferView(bytes){need(bytes instanceof Uint8Array,'Expected asset byte data');return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
async function digest(bytes,algorithm){need(globalThis.crypto?.subtle,'Secure HRA digest verification unavailable');return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest(algorithm,bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function verifyHraAsset(bytes,pin,audited){
  validateAuditAsset(pin,audited,MAX_GLB);need(bytes instanceof Uint8Array&&bytes.length===pin.bytes,'Pinned HRA asset byte length mismatch');
  const header=new TextEncoder().encode(`blob ${bytes.length}\0`),object=new Uint8Array(header.length+bytes.length);object.set(header);object.set(bytes,header.length);
  need(await digest(object,'SHA-1')===pin.gitBlobSha1,'Pinned HRA Git blob SHA1 mismatch');
  need(await digest(bytes,'SHA-256')===audited.sha256,'HRA audit SHA256 mismatch');return bytes;
}

export function parseHraGlb(bytes,audited){
  const v=arrayBufferView(bytes);need(bytes.length>=28&&bytes.length<=MAX_GLB&&v.getUint32(0,true)===0x46546c67&&v.getUint32(4,true)===2&&v.getUint32(8,true)===bytes.length,'Invalid HRA GLB 2.0 header or length');
  const jsonLength=v.getUint32(12,true);need(integer(jsonLength,4,MAX_JSON)&&jsonLength%4===0&&jsonLength+28<bytes.length&&v.getUint32(16,true)===0x4e4f534a,'Invalid HRA GLB JSON chunk');
  const offset=jsonLength+20,binLength=v.getUint32(offset,true);need(integer(binLength,4)&&binLength%4===0&&v.getUint32(offset+4,true)===0x004e4942&&offset+8+binLength===bytes.length,'Invalid HRA GLB BIN chunk');
  const json=JSON.parse(decode(bytes.subarray(20,offset)));need(json?.asset?.version==='2.0','Invalid glTF asset version');
  need(Array.isArray(json.buffers)&&json.buffers.length===1&&record(json.buffers[0])&&!('uri' in json.buffers[0]),'Embedded GLB only; external buffer uri forbidden');
  const bufferBytes=json.buffers[0].byteLength;need(integer(bufferBytes,1,binLength)&&binLength-bufferBytes<=3,'HRA BIN buffer length mismatch');
  const views=json.bufferViews;need(Array.isArray(views)&&views.length<=MAX_NODES&&Array.isArray(json.accessors)&&json.accessors.length<=MAX_NODES,'Invalid HRA GLB views/accessors');
  for(const view of views){const start=view?.byteOffset??0;need(record(view)&&view.buffer===0&&integer(start,0,bufferBytes)&&integer(view.byteLength,1,bufferBytes-start)&&!view.extensions?.EXT_meshopt_compression,'Invalid HRA bufferView range or compression');}
  for(const image of json.images??[])need(record(image)&&!('uri' in image)&&integer(image.bufferView,0,views.length-1),'External HRA image uri forbidden');
  for(const extension of json.extensionsRequired??[])need(ALLOWED_REQUIRED.has(extension),'Unsupported required HRA glTF extension');
  need(!json.animations?.length&&!json.skins?.length,'Animated or skinned HRA geometry unsupported');
  if(audited){for(const [actual,expected] of [[jsonLength,audited.jsonBytes],[binLength,audited.binBytes],[bufferBytes,audited.bufferBytes],[views.length,audited.bufferViews],[json.accessors.length,audited.accessors]])need(actual===expected,'HRA GLB chunk/accessor audit mismatch');}
  return json;
}

function parseCrosswalk(bytes){
  need(bytes instanceof Uint8Array&&bytes.length<=MAX_CSV,'Invalid HRA crosswalk byte data');
  const input=decode(bytes).replace(/^\uFEFF/,''),rows=[];let row=[],field='',quoted=false,closed=false;
  const endField=()=>{row.push(field);field='';closed=false;};const endRow=()=>{endField();rows.push(row);row=[];need(rows.length<=MAX_NODES,'Too many crosswalk rows');};
  for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}else if(c===',')endField();else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;endRow();}else if(c==='"'){need(!field&&!closed,'Malformed crosswalk quote');quoted=true;}else{need(!closed,'Unexpected text after crosswalk quote');field+=c;}}
  need(!quoted,'Unclosed crosswalk quote');if(field||row.length||closed)endRow();need(equalArray(rows.shift(),COLUMNS),'Unexpected HRA CSV header');return rows;
}

function inspectTree(json,audit){
  const nodes=json?.nodes,meshes=json?.meshes,scenes=json?.scenes;
  need(Array.isArray(nodes)&&integer(nodes.length,1,MAX_NODES)&&Array.isArray(meshes)&&integer(meshes.length,1,MAX_NODES)&&Array.isArray(scenes)&&integer(json.scene??0,0,scenes.length-1),'Invalid HRA scene tree');
  const roots=scenes[json.scene??0]?.nodes;need(Array.isArray(roots)&&roots.length>0,'Empty HRA scene');
  const parents=new Int32Array(nodes.length).fill(-1),byName=new Map(),usedMeshes=new Set();let meshNodes=0;
  for(const [i,node] of nodes.entries()){
    need(record(node),'Invalid HRA source node');if(node.name!==undefined){need(typeof node.name==='string','Invalid HRA source node name');const found=byName.get(node.name)??[];found.push(i);byName.set(node.name,found);}
    if(node.mesh!==undefined){need(integer(node.mesh,0,meshes.length-1),'Invalid HRA source mesh index');usedMeshes.add(node.mesh);meshNodes++;}
    if(node.children!==undefined)need(Array.isArray(node.children),'Invalid HRA child links');
    for(const child of node.children??[]){need(integer(child,0,nodes.length-1)&&parents[child]===-1,'Duplicate or invalid HRA node parent');parents[child]=i;}
    for(const [field,count] of [['matrix',16],['translation',3],['rotation',4],['scale',3]]){if(node[field]!==undefined)need(Array.isArray(node[field])&&node[field].length===count&&node[field].every(Number.isFinite),'Invalid source node transform');}
    need(!(node.matrix&&(node.translation||node.rotation||node.scale)),'Mixed HRA node matrix/TRS transform');
  }
  const seen=new Set(),stack=[...roots];for(const root of roots)need(integer(root,0,nodes.length-1)&&parents[root]===-1,'Invalid HRA scene root');
  while(stack.length){const i=stack.pop();need(!seen.has(i),'Duplicate node or HRA cycle');seen.add(i);for(const child of nodes[i].children??[])stack.push(child);}
  need(seen.size===nodes.length&&usedMeshes.size===meshes.length&&meshNodes===audit.meshNodes&&nodes.length===audit.nodes&&meshes.length===audit.meshes,'HRA tree node/mesh counts differ from audit or are unreachable');
  return {nodes,parents,byName};
}

export function buildHraRows(source,audit,json,csvBytes){
  need(passed(audit)&&audit.sourceId===source.id&&audit.variant===source.variant,'Selected HRA audit not valid');
  const tree=inspectTree(json,audit.glb),raw=parseCrosswalk(csvBytes),proof=audit.crosswalk;
  need(equalArray(source.crosswalk.columns,COLUMNS)&&raw.length===source.crosswalk.expectedRows&&raw.length===proof.rows&&Array.isArray(proof.matches)&&proof.matches.length===raw.length,'HRA crosswalk row count differs from exact audit');
  const names=new Set(),ontology=new Set(),mapped=new Set(),rows=[];let direct=0,groups=0,expansionCount=0;
  for(const [i,row] of raw.entries()){
    const [nodeName,ontologyId,label]=row;
    need(row.length===3&&nodeName&&nodeName.trim()===nodeName&&label.trim()&&/^(?:FMA|UBERON):\d+$/.test(ontologyId)&&!names.has(nodeName),'Invalid or duplicate crosswalk node row');
    names.add(nodeName);ontology.add(ontologyId);const located=tree.byName.get(nodeName)??[];need(located.length===1,'Missing or ambiguous HRA crosswalk node');
    const nodeIndex=located[0],node=tree.nodes[nodeIndex],kind=node.mesh===undefined?'group':'mesh',meshIndex=node.mesh??null;
    const match=proof.matches[i];need(match?.nodeName===nodeName&&match.ontologyId===ontologyId&&match.nodeIndex===nodeIndex&&match.kind===kind&&match.meshIndex===meshIndex,'Crosswalk identity or raw-node association differs from audit');
    const meshNodeIndices=[];if(kind==='mesh'){meshNodeIndices.push(nodeIndex);direct++;}else{
      groups++;const pending=[...(node.children??[])];while(pending.length){const index=pending.pop();need(++expansionCount<=1_000_000,'HRA group expansion exceeds safe bound');const child=tree.nodes[index];if(child.mesh!==undefined)meshNodeIndices.push(index);for(const nested of child.children??[])pending.push(nested);}
      need(meshNodeIndices.length>0,'HRA crosswalk group has no descendant mesh node');meshNodeIndices.sort((a,b)=>a-b);
    }
    mapped.add(nodeIndex);rows.push({nodeName,ontologyId,label,nodeIndex,kind,meshIndex,meshNodeIndices});
  }
  let groupCovered=0,unmapped=0;
  for(const [i,node] of tree.nodes.entries())if(node.mesh!==undefined&&!mapped.has(i)){let ancestor=tree.parents[i];while(ancestor!==-1&&!mapped.has(ancestor))ancestor=tree.parents[ancestor];if(ancestor===-1)unmapped++;else groupCovered++;}
  need(ontology.size===source.crosswalk.expectedUniqueOntologyIds&&ontology.size===proof.uniqueOntologyIds&&direct===proof.directMeshRows&&groups===proof.groupRows&&groupCovered===proof.groupCoveredMeshNodes&&unmapped===0&&proof.unmappedMeshNodes===0,'HRA exact crosswalk uniqueness or mesh coverage differs from audit');
  return rows;
}

export class HraAssetUnavailableError extends Error {constructor(message='Local HRA asset unavailable'){super(message);this.name='HraAssetUnavailableError';}}
export async function boundedHraBytes(res,limit,expected){
  if(res.status===404||res.status===410||(res.headers.get('content-type')??'').includes('text/html'))throw new HraAssetUnavailableError();
  need(res.ok,'HRA local asset request failed');
  const len=res.headers.get('content-length'),coding=res.headers.get('content-encoding');if(len!==null&&(!coding||coding==='identity')){const n=Number(len);need(integer(n,1,limit)&&(expected===undefined||n===expected),'HRA asset response length mismatch');}
  need(res.body,'Missing HRA asset response stream');const reader=res.body.getReader(),chunks=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new Error('HRA asset exceeds safe byte bound');}chunks.push(value);}}finally{reader.releaseLock();}
  need(total>0&&(expected===undefined||total===expected),'HRA asset downloaded length mismatch');const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
async function localBytes(path,limit,signal,expected){
  need(/^(?:audit\.json|[a-z0-9-]+\/[A-Za-z0-9_.-]+)$/.test(path),'Invalid local HRA asset path');
  const base=new URL(import.meta.env.BASE_URL,location.href),url=new URL(`hra-candidate/${path}`,base);
  need(url.origin===location.origin,'HRA asset origin mismatch');
  const res=await fetch(url,{credentials:'same-origin',redirect:'error',signal});
  need(res.url&&new URL(res.url).origin===location.origin,'HRA local asset response origin mismatch');return boundedHraBytes(res,limit,expected);
}

export async function loadHraCandidate(id,{signal}={}){
  const source=byId.get(id);need(source,'Unknown HRA source');
  const auditReport=JSON.parse(decode(await localBytes('audit.json',MAX_AUDIT,signal))),audit=selectHraAudit(auditReport,id);
  const csv=await localBytes(source.crosswalk.localPath,source.crosswalk.bytes,signal,source.crosswalk.bytes);await verifyHraAsset(csv,source.crosswalk,audit.crosswalk);
  const bytes=await localBytes(source.glb.localPath,source.glb.bytes,signal,source.glb.bytes);await verifyHraAsset(bytes,source.glb,audit.glb);
  if(signal?.aborted)throw signal.reason;const gltfJson=parseHraGlb(bytes,audit.glb),rows=buildHraRows(source,audit,gltfJson,csv);
  return {source,audit,rows,bytes,gltfJson};
}

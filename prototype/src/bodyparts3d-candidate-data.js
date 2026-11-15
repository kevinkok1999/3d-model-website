import inventory from '../../model-audit/bodyparts3d-intake-candidates.json' with { type: 'json' };

// This remains the exact, source-labelled 21-concept candidate; no observed
// geometry, registration or anatomical completeness is inferred from labels.
export const MAX_MANIFEST_BYTES = 512 * 1024;
export const MAX_GLB_BYTES = 128 * 1024 * 1024;

const NL_CONCEPTS = Object.freeze({
  FMA24474: 'Dijbeen (rechts)', FMA24475: 'Dijbeen (links)',
  FMA24477: 'Scheenbeen (rechts)', FMA24478: 'Scheenbeen (links)',
  FMA24473: 'Vijfde middenhandsbeentje (links)', FMA24501: 'Scheepvormig voetbeen (links)',
  FMA37684: 'Korte kop van de biceps brachii (rechts)', FMA37685: 'Korte kop van de biceps brachii (links)',
  FMA37686: 'Lange kop van de biceps brachii (rechts)', FMA37687: 'Lange kop van de biceps brachii (links)',
  FMA38479: 'Diepe vingerbuiger (rechts)', FMA38480: 'Diepe vingerbuiger (links)',
  FMA38928: 'Rectus femoris (rechts)', FMA38929: 'Rectus femoris (links)',
  FMA22733: 'Spaakbeenslagader (rechts)', FMA22734: 'Spaakbeenslagader (links)',
  FMA22797: 'Ellebeenslagader (rechts)', FMA22798: 'Ellebeenslagader (links)',
  FMA22948: 'Spaakbeenader (rechts)', FMA22949: 'Spaakbeenader (links)',
  FMA3815: 'Eerste voorste ventrikelvertakking van de rechter kransslagader',
});

const CONCEPT_REGION = Object.freeze({
  FMA24474:'lower-limb', FMA24475:'lower-limb', FMA24477:'lower-limb', FMA24478:'lower-limb',
  FMA24473:'upper-limb', FMA24501:'lower-limb',
  FMA37684:'upper-limb', FMA37685:'upper-limb', FMA37686:'upper-limb', FMA37687:'upper-limb',
  FMA38479:'upper-limb', FMA38480:'upper-limb', FMA38928:'lower-limb', FMA38929:'lower-limb',
  FMA22733:'upper-limb', FMA22734:'upper-limb', FMA22797:'upper-limb', FMA22798:'upper-limb',
  FMA22948:'upper-limb', FMA22949:'upper-limb', FMA3815:'trunk',
});

export const CANDIDATE_CONCEPTS = Object.freeze(inventory.candidates.map(row => Object.freeze({
  fma:row.fma, representation:row.representation, sourceLabel:row.sourceLabel,
  elementFileIds:Object.freeze([...row.elementFileIds]), system:row.proposedSystem,
  region:CONCEPT_REGION[row.fma],
})));
export const CANDIDATE_SOURCE = Object.freeze({...inventory.source});
const EXPECTED_CONCEPTS = new Map(CANDIDATE_CONCEPTS.map(row => [row.fma,row]));
const EXPECTED_ELEMENTS = new Set(CANDIDATE_CONCEPTS.flatMap(row => row.elementFileIds));

export function candidateLabel(concept, locale='nl') {
  if (!concept || !EXPECTED_CONCEPTS.has(concept.fma)) throw new Error('Unknown source concept.');
  return locale==='nl' ? NL_CONCEPTS[concept.fma] : EXPECTED_CONCEPTS.get(concept.fma).sourceLabel;
}
export function candidateElementIds(concept) {
  const row=EXPECTED_CONCEPTS.get(concept?.fma);
  if (!row) throw new Error('Unknown source concept.');
  return [...row.elementFileIds];
}

const normalize = value => String(value??'').normalize('NFKD').replace(/\p{Mark}+/gu,'').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim();
export function selectCandidateConcepts(concepts, {region='all',system='all',query='',locale='nl'}={}) {
  const words=normalize(query).split(' ').filter(Boolean);
  return concepts.filter(concept => {
    if (region!=='all' && concept.region!==region || system!=='all' && concept.system!==system) return false;
    const text=normalize([concept.fma,concept.representation,concept.sourceLabel,candidateLabel(concept,locale),
      candidateLabel(concept,'nl'),concept.system,concept.region,...candidateElementIds(concept)].join(' '));
    return words.every(word => text.includes(word));
  });
}

const fail=(message)=>{throw new Error(message);};
const record = value => value!==null && typeof value==='object' && !Array.isArray(value);
const integer = (value,min=0,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value>=min && value<=max;
const sha256 = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const vector=(value)=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const boundsValid=value=>record(value)&&vector(value.min)&&vector(value.max)&&value.min.every((x,i)=>x<=value.max[i]);
const sameSet=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const close=(a,b)=>Math.abs(a-b)<=Math.max(1e-6,Math.abs(a)*1e-7,Math.abs(b)*1e-7);
const sameBounds=(a,b)=>boundsValid(a)&&boundsValid(b)&&a.min.every((x,i)=>close(x,b.min[i]))&&a.max.every((x,i)=>close(x,b.max[i]));

export function validateCandidateManifest(manifest) {
  if (!record(manifest) || manifest.schemaVersion!==1 || manifest.status!=='GEOMETRY_EXPORT_PASSED' ||
      manifest.clinicallyVerified!==false || manifest.registration!=='UNREGISTERED_SOURCE_COORDINATES') {
    fail('Candidate manifest has no supported geometry-export proof.');
  }
  if (!record(manifest.source)||!Object.entries(CANDIDATE_SOURCE).every(([k,v])=>manifest.source[k]===v)) fail('Candidate source metadata differs from the pinned inventory.');
  if(!sha256(manifest.manifestSha256)||typeof manifest.scope!=='string'||!manifest.scope.length)fail('Missing export manifest provenance.');
  if (typeof manifest.fixtureOnly!=='boolean') fail('Missing fixture-only provenance marker.');
  const archive=manifest.archive, officialArchive='isa_BP3D_4.0_obj_99.zip';
  if(!record(archive)||typeof archive.name!=='string'||!/^[A-Za-z0-9_.-]{1,200}\.zip$/i.test(archive.name)||
     !sha256(archive.sha256)||!integer(archive.bytes,1)||manifest.fixtureOnly!==(archive.name!==officialArchive)) fail('Invalid source archive provenance or fixture marker.');
  if (!record(manifest.glb) || manifest.glb.name!=='model.glb' || !sha256(manifest.glb.sha256) || !integer(manifest.glb.bytes,24,MAX_GLB_BYTES)) fail('Invalid local GLB manifest name, SHA256 or byte length.');
  if (!boundsValid(manifest.bounds) || !Array.isArray(manifest.files) || manifest.files.length!==EXPECTED_ELEMENTS.size ||
      !Array.isArray(manifest.conceptMappings) || manifest.conceptMappings.length!==EXPECTED_CONCEPTS.size) fail('Candidate manifest does not cover the exact inventory.');

  const seenFiles=new Set(), seenNodes=new Set();
  const totalBounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for (const file of manifest.files) {
    if (!record(file)||!EXPECTED_ELEMENTS.has(file.elementFileId)||seenFiles.has(file.elementFileId)||
        !integer(file.nodeIndex,0,EXPECTED_ELEMENTS.size-1)||seenNodes.has(file.nodeIndex)||
        !boundsValid(file.bounds)||!boundsValid(file.sourceBounds)||!sha256(file.sha256)||!integer(file.bytes,1)||
        !integer(file.vertexCount,3)||!integer(file.triangleCount,1)||typeof file.memberPath!=='string'||
        file.memberPath.split('/').at(-1).toLowerCase()!==`${file.elementFileId.toLowerCase()}.obj`) fail('Invalid or duplicate candidate ELEMENT file metadata.');
    seenFiles.add(file.elementFileId);seenNodes.add(file.nodeIndex);
    for (let i=0;i<3;i++){totalBounds.min[i]=Math.min(totalBounds.min[i],file.bounds.min[i]);totalBounds.max[i]=Math.max(totalBounds.max[i],file.bounds.max[i]);}
  }
  if (!sameBounds(totalBounds,manifest.bounds)) fail('Candidate overall bounds do not match all ELEMENT bounds.');
  const seenConcepts=new Set();
  for(const row of manifest.conceptMappings){
    const expected=EXPECTED_CONCEPTS.get(row?.fma);
    if(!expected||seenConcepts.has(row.fma)||row.status!=='PASSED'||row.representation!==expected.representation||
       row.sourceLabel!==expected.sourceLabel||!sameSet(row.elementFileIds,expected.elementFileIds)) fail('Invalid or duplicate candidate concept-to-ELEMENT mapping.');
    seenConcepts.add(row.fma);
  }
  return manifest;
}

function glbJson(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.byteLength<24||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)fail('Invalid GLB 2.0 header or length.');
  const jsonLen=view.getUint32(12,true);
  if(jsonLen<4||jsonLen%4||view.getUint32(16,true)!==0x4e4f534a||jsonLen+28>bytes.byteLength)fail('Invalid GLB JSON chunk.');
  let json;
  try{json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(20,20+jsonLen)));}catch{fail('Invalid GLB JSON.');}
  const binaryLen=view.getUint32(20+jsonLen,true);
  if(binaryLen%4||view.getUint32(24+jsonLen,true)!==0x004e4942||binaryLen+jsonLen+28!==bytes.byteLength)fail('Invalid embedded GLB binary length.');
  if(json?.asset?.version!=='2.0'||!Array.isArray(json.buffers)||json.buffers.length!==1||json.buffers.some(buffer=>buffer.uri!==undefined)||
     !integer(json.buffers[0].byteLength,1,binaryLen)||binaryLen-json.buffers[0].byteLength>3||
     json.images?.length||json.textures?.length||json.extensionsRequired?.length||json.extensionsUsed?.length||json.animations?.length||json.skins?.length)fail('Only unextended, embedded static candidate GLB geometry is supported.');
  return json;
}

function identityTransform(node){
  const equal=(actual,expected)=>actual===undefined||(Array.isArray(actual)&&actual.length===expected.length&&actual.every((x,i)=>x===expected[i]));
  return equal(node.translation,[0,0,0])&&equal(node.rotation,[0,0,0,1])&&equal(node.scale,[1,1,1])&&
    equal(node.matrix,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])&&!node.children?.length&&node.skin===undefined;
}
const canonical = value => {
  if(Array.isArray(value))return value.map(canonical);
  if(record(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
};

/** Validates actual payload identity before Three parses it. Not medical QA. */
export async function validateCandidateGlb(input,manifest){
  validateCandidateManifest(manifest);
  const bytes=input instanceof ArrayBuffer ? new Uint8Array(input) : (input instanceof Uint8Array ? input : fail('Expected GLB bytes.'));
  if(bytes.byteLength!==manifest.glb.bytes||bytes.byteLength>MAX_GLB_BYTES)fail('Candidate GLB byte length mismatch.');
  if(!globalThis.crypto?.subtle)fail('Secure SHA256 verification not available.');
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  if(fingerprint!==manifest.glb.sha256)fail('Candidate GLB SHA256 mismatch.');
  const json=glbJson(bytes), count=EXPECTED_ELEMENTS.size;
  const {glb:payload,...metadata}=manifest;
  if(JSON.stringify(canonical(json.extras))!==JSON.stringify(canonical(metadata)))fail('Candidate embedded provenance differs from external manifest.');
  if(!Array.isArray(json.nodes)||json.nodes.length!==count||!Array.isArray(json.meshes)||json.meshes.length!==count||
     !Array.isArray(json.scenes)||json.scenes.length!==1||!integer(json.scene??0,0,0)||!sameSet(json.scenes[0].nodes,Array.from({length:count},(_,i)=>i)))fail('Candidate scene nodes do not match the audited ELEMENT set.');
  const seenMeshes=new Set();
  for(const file of manifest.files){
    const node=json.nodes[file.nodeIndex];
    if(!record(node)||node.name!==file.elementFileId||!identityTransform(node)||!integer(node.mesh,0,count-1)||seenMeshes.has(node.mesh))fail('Candidate node identity or raw source transform mismatch.');
    seenMeshes.add(node.mesh);
    const mesh=json.meshes[node.mesh];
    if(!record(mesh)||mesh.name!==file.elementFileId||!Array.isArray(mesh.primitives)||mesh.primitives.length!==1)fail('Candidate mesh does not match audited element.');
    const primitive=mesh.primitives[0];
    const position=json.accessors?.[primitive?.attributes?.POSITION],index=json.accessors?.[primitive?.indices];
    if(!record(primitive)||primitive.mode!==undefined&&primitive.mode!==4||primitive.targets?.length||!record(position)||
       position.type!=='VEC3'||position.componentType!==5126||position.count!==file.vertexCount||!sameBounds(position,file.bounds)||
       !record(index)||index.type!=='SCALAR'||![5121,5123,5125].includes(index.componentType)||index.count!==file.triangleCount*3)fail('Candidate mesh geometry metadata differs from audited bounds/count.');
  }
  return json;
}

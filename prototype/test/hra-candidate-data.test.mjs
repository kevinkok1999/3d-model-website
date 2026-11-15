import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HRA_SOURCES,HRA_FAMILIES,hraFamilyId,hraFamilyLabel,hraSourceScopeWarning,HraAssetUnavailableError,loadHraCandidate,verifyHraAsset,parseHraGlb,buildHraRows,selectHraAudit,boundedHraBytes} from '../src/hra-candidate-data.js';

const encode=s=>new TextEncoder().encode(s);
const csv=encode('node_name,OntologyID,label\r\nGroup,FMA:1,"Group, label"\r\nDirect,UBERON:2,"Direct ""label"""\r\nOther,UBERON:2,Other label\r\n');
const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0,4]}],nodes:[{name:'Group',children:[1,2]},{name:'Direct',mesh:0,children:[3]},{name:'Contained',mesh:1},{name:'Child',mesh:2},{name:'Other',mesh:3}],meshes:[{},{},{},{}],buffers:[{byteLength:4}],bufferViews:[{buffer:0,byteLength:4}],accessors:[]};
const source={id:'test',variant:'male',crosswalk:{columns:['node_name','OntologyID','label'],expectedRows:3,expectedUniqueOntologyIds:2}};
const report={sourceId:'test',variant:'male',status:'TECHNICAL_PREFLIGHT_PASS',anatomicallyValidated:false,mergeAuthorized:false,glb:{nodes:5,meshNodes:4,meshes:4},crosswalk:{rows:3,uniqueOntologyIds:2,directMeshRows:2,groupRows:1,groupCoveredMeshNodes:2,unmappedMeshNodes:0,matches:[{nodeName:'Group',ontologyId:'FMA:1',nodeIndex:0,kind:'group',meshIndex:null},{nodeName:'Direct',ontologyId:'UBERON:2',nodeIndex:1,kind:'mesh',meshIndex:0},{nodeName:'Other',ontologyId:'UBERON:2',nodeIndex:4,kind:'mesh',meshIndex:3}]}};

test('All fourteen actual sources retain distinct pinned inventory sizes, versions and paths; unknown IDs cannot load',async()=>{
  assert.deepEqual(HRA_SOURCES.map(s=>[s.id,s.version,s.glb.bytes,s.crosswalk.expectedRows]).sort(([a],[b])=>a.localeCompare(b)),[
    ['blood-vasculature-female','v1.3',17875996,125],['blood-vasculature-male','v1.3',18050040,123],['brain-female','v1.4',11983380,108],['brain-male','v1.4',11982812,108],
    ['heart-female','v1.3',1745560,17],['heart-male','v1.3',4071772,17],['liver-female','v1.2',1738552,23],['liver-male','v1.2',1136412,23],
    ['lung-female','v1.4',23255188,70],['lung-male','v1.3',10941068,71],['small-intestine-female','v1.2',856536,11],['small-intestine-male','v1.2',618728,12],
    ['spinal-cord-female','v1.1',7657228,30],['spinal-cord-male','v1.1',490652,31],
  ]);
  assert.equal(HRA_SOURCES.reduce((total,s)=>total+s.crosswalk.expectedRows,0),769);
  for(const s of HRA_SOURCES){assert.equal(s.glb.localPath,`${s.id}/${s.glb.filename}`);assert.equal(s.crosswalk.localPath,`${s.id}/${s.crosswalk.filename}`);assert.ok(s.glb.url.includes(`/${s.id}/${s.version}/raw/`));}
  const lung=HRA_SOURCES.find(s=>s.id==='lung-male');assert.equal(lung.glb.gitBlobSha1,'dbbfdaf4cc51ea7d75cb0887b8fa003b8da9c00a');assert.match(lung.provenanceNote,/v1\.4.*failed/i);
  await assert.rejects(()=>loadHraCandidate('../outside'),/unknown/i);
});

test('Seven exact bilingual families have two source variants; labels are not inferred from broad systems',()=>{
  const pairs=[['blood-vasculature','Bloedvaten','Blood vasculature'],['brain','Hersenen','Brain'],['heart','Hart','Heart'],['liver','Lever','Liver'],['lung','Longen','Lung'],['small-intestine','Dunne darm','Small intestine'],['spinal-cord','Ruggenmerg','Spinal cord']];
  assert.deepEqual(HRA_FAMILIES,pairs.map(([id])=>id));
  for(const [id,nl,en] of pairs){const sources=HRA_SOURCES.filter(s=>hraFamilyId(s)===id);assert.equal(sources.length,2);assert.deepEqual(sources.map(s=>s.variant).sort(),['female','male']);assert.equal(hraFamilyLabel(id,'nl'),nl);assert.equal(hraFamilyLabel(id,'en'),en);}
  assert.throws(()=>hraFamilyId({id:'unknown-male',variant:'male'}));
});

test('CSV exact labels and repeated ontology IDs are preserved; groups include descendant mesh nodes while direct rows include only their own',()=>{
  const rows=buildHraRows(source,report,gltf,csv);
  assert.deepEqual(rows,[{nodeName:'Group',ontologyId:'FMA:1',label:'Group, label',nodeIndex:0,kind:'group',meshIndex:null,meshNodeIndices:[1,2,3]},{nodeName:'Direct',ontologyId:'UBERON:2',label:'Direct "label"',nodeIndex:1,kind:'mesh',meshIndex:0,meshNodeIndices:[1]},{nodeName:'Other',ontologyId:'UBERON:2',label:'Other label',nodeIndex:4,kind:'mesh',meshIndex:3,meshNodeIndices:[4]}]);
});

test('A missing, duplicate, mismatched or unsafe glTF tree/crosswalk fails closed',()=>{
  for(const mutate of [
    (g,r)=>{g.nodes[2].name='Other';},
    (g,r)=>{g.nodes[2].children=[0];},
    (g,r)=>{g.nodes[4].children=[1];},
    (g,r)=>{g.nodes[0].children.pop();},
    (g,r)=>{r.crosswalk.matches[1].nodeIndex=2;},
    (g,r)=>{r.crosswalk.matches[0].kind='mesh';},
    (g,r)=>{r.crosswalk.matches[0].ontologyId='FMA:999';},
    (g,r)=>{r.crosswalk.matches.pop();},
    (g,r)=>{r.crosswalk.groupCoveredMeshNodes=0;},
  ]) {const g=structuredClone(gltf),r=structuredClone(report);mutate(g,r);assert.throws(()=>buildHraRows(source,r,g,csv));}
  assert.throws(()=>buildHraRows(source,report,gltf,encode('node_name,OntologyID,label\nDirect,FMA:1,"unclosed')));
});

test('Asset Git blob SHA1 includes Git header; exact pin and fresh audit SHA256 both enforced',async()=>{
  const bytes=encode('actual bytes'),pin={bytes:bytes.length,gitBlobSha1:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')};
  const audit={...pin,sha256:createHash('sha256').update(bytes).digest('hex')};
  await verifyHraAsset(bytes,pin,audit);
  await assert.rejects(()=>verifyHraAsset(bytes,pin,{...audit,sha256:'0'.repeat(64)}),/SHA256/i);
  await assert.rejects(()=>verifyHraAsset(encode('edited bytes'),pin,audit));
  await assert.rejects(()=>verifyHraAsset(bytes,{...pin,gitBlobSha1:createHash('sha1').update(bytes).digest('hex')},audit));
});

function glbFixture(json){
  const payload=Buffer.from(JSON.stringify(json)),size=Math.ceil(payload.length/4)*4;
  const buffer=Buffer.alloc(28+size+4);buffer.writeUInt32LE(0x46546c67,0);buffer.writeUInt32LE(2,4);buffer.writeUInt32LE(buffer.length,8);buffer.writeUInt32LE(size,12);buffer.writeUInt32LE(0x4e4f534a,16);buffer.fill(0x20,20,20+size);payload.copy(buffer,20);buffer.writeUInt32LE(4,20+size);buffer.writeUInt32LE(0x004e4942,24+size);return buffer;
}
test('Local GLB 2.0 validates binary lengths and forbids external image or buffer URI',()=>{
  const glb=glbFixture(gltf);assert.equal(parseHraGlb(glb).nodes[2].name,'Contained');
  assert.throws(()=>parseHraGlb(glb.subarray(0,-1)));
  assert.throws(()=>parseHraGlb(glbFixture({...gltf,buffers:[{byteLength:4,uri:'https://example.org/data.bin'}]})));
  assert.throws(()=>parseHraGlb(glbFixture({...gltf,images:[{uri:'https://example.org/pixel.png'}]})));
});

function completeAudit(){return {status:'TECHNICAL_PREFLIGHT_PASS',wave:'expanded',excludedSources:[{id:'lung-male',version:'v1.4',status:'BLOCKED_SOURCE_MAPPING',reason:'Missing exact VH_M_hyoid node in pinned source GLB; no correction, alias, row removal or fallback.'}],anatomicallyValidated:false,mergeAuthorized:false,results:HRA_SOURCES.map(s=>{
  const rows=s.crosswalk.expectedRows,uniqueOntologyIds=s.crosswalk.expectedUniqueOntologyIds;
  return {sourceId:s.id,variant:s.variant,version:s.version,status:'TECHNICAL_PREFLIGHT_PASS',anatomicallyValidated:false,mergeAuthorized:false,
    glb:{...s.glb,sha256:'1'.repeat(64),nodes:rows+1,meshNodes:rows,meshes:rows,primitives:rows},
    crosswalk:{...s.crosswalk,sha256:'2'.repeat(64),rows,uniqueOntologyIds,directMeshRows:rows-1,groupRows:1,groupCoveredMeshNodes:1,unmappedMeshNodes:0,
      matches:Array.from({length:rows},(_,i)=>({nodeIndex:i,nodeName:`node_${i}`,ontologyId:`FMA:${1+i%uniqueOntologyIds}`,kind:i?'mesh':'group',meshIndex:i?i-1:null}))}};
})};}
test('Complete audit must match all official sources and never claim anatomical or merge validation',()=>{
  const a=completeAudit();assert.equal(selectHraAudit(a,HRA_SOURCES[2].id).sourceId,'brain-female');
  assert.equal(selectHraAudit(a,'lung-male').glb.gitBlobSha1,'dbbfdaf4cc51ea7d75cb0887b8fa003b8da9c00a');
  for(const mutate of [a=>{a.results.pop();},a=>{a.results=a.results.slice(0,4);},a=>{a.anatomicallyValidated=true;},a=>{a.results[0].variant='male';},a=>{a.results[2].status='BLOCKED';},a=>{a.results[2].glb.gitBlobSha1='0'.repeat(40);},a=>{a.results[2].crosswalk.sha256='bad';},a=>{a.results[2].mergeAuthorized=true;},a=>{a.results.find(s=>s.sourceId==='lung-male').glb.bytes=10942332;},a=>{delete a.wave;},a=>{a.wave='next';},a=>{a.excludedSources=[];},a=>{a.excludedSources[0].status='TECHNICAL_PREFLIGHT_PASS';},a=>{a.excludedSources[0].reason='corrected';},a=>{a.results.find(s=>s.sourceId==='lung-male').version='v1.4';},a=>{delete a.results[2].version;}]){const invalid=completeAudit();mutate(invalid);assert.throws(()=>selectHraAudit(invalid,'brain-female'));}
});

test('Every unselected source must carry consistent pinned row, mesh and match cardinalities before loading',()=>{
  for(const mutate of [
    r=>{delete r.glb.nodes;},r=>{r.glb.meshNodes=0;},r=>{r.glb.meshes=r.glb.meshNodes+1;},r=>{r.glb.nodes=r.glb.meshNodes-1;},r=>{r.glb.primitives=0;},
    r=>{delete r.crosswalk.rows;},r=>{r.crosswalk.rows++;},r=>{r.crosswalk.uniqueOntologyIds++;},r=>{r.crosswalk.directMeshRows--;},r=>{r.crosswalk.groupRows=-1;},r=>{r.crosswalk.unmappedMeshNodes=1;},r=>{r.crosswalk.groupCoveredMeshNodes++;},
    r=>{r.crosswalk.matches.pop();},r=>{r.crosswalk.matches[1].nodeIndex=r.glb.nodes;},r=>{r.crosswalk.matches[1].nodeName=r.crosswalk.matches[0].nodeName;},r=>{r.crosswalk.matches[1].nodeIndex=0;},r=>{r.crosswalk.matches[1].meshIndex=r.glb.meshes;},r=>{r.crosswalk.matches[0].meshIndex=0;},r=>{r.crosswalk.matches[1].ontologyId='bogus';},r=>{r.crosswalk.matches[1].kind='group';},
  ]){const proof=completeAudit();mutate(proof.results.find(row=>row.sourceId==='liver-male'));assert.throws(()=>selectHraAudit(proof,'brain-female'));}
});

test('Bilingual source warnings retain version-specific scope and guide caveats',()=>{
  for(const sex of ['male','female']){
    assert.match(hraSourceScopeWarning(`brain-${sex}`,'nl'),/gespiegeld.*(onafhankelijke|zelfstandige)/i);assert.match(hraSourceScopeWarning(`brain-${sex}`,'en'),/mirrored.*independent/i);
    assert.match(hraSourceScopeWarning(`small-intestine-${sex}`,'nl'),/meet.*(norm|populatie)/i);assert.match(hraSourceScopeWarning(`small-intestine-${sex}`,'en'),/guide.*population/i);
    assert.match(hraSourceScopeWarning(`lung-${sex}`,'nl'),/strottenhoofd.*luchtpijp.*hoofdbronchi/i);assert.match(hraSourceScopeWarning(`lung-${sex}`,'en'),/larynx.*trachea.*main bronchi/i);
  }
  assert.match(hraSourceScopeWarning('spinal-cord-female','nl'),/zes.*lendenwervels.*vijfde.*sacrale/i);
  assert.match(hraSourceScopeWarning('spinal-cord-female','en'),/six.*lumbar.*fifth.*sacral/i);
  assert.match(hraSourceScopeWarning('spinal-cord-male','en'),/peripheral nerves/i);assert.equal(hraSourceScopeWarning('heart-male','nl'),'');
  assert.throws(()=>hraSourceScopeWarning('fake','nl'));
});

test('Bounded body verifies decoded pinned length even for compressed HTTP responses; missing and oversized remain blocked',async()=>{
  const bytes=encode('hello browser'),headers={'content-encoding':'gzip','content-length':'40'};
  assert.deepEqual(await boundedHraBytes(new Response(bytes,{headers}),bytes.length,bytes.length),bytes);
  await assert.rejects(()=>boundedHraBytes(new Response(bytes),5,5),/bound|length/i);
  await assert.rejects(()=>boundedHraBytes(new Response(bytes,{headers:{'content-length':'100'}}),bytes.length,bytes.length),/length/i);
  await assert.rejects(()=>boundedHraBytes(new Response('<html>fallback</html>',{headers:{'content-type':'text/html'}}),100),HraAssetUnavailableError);
  await assert.rejects(()=>boundedHraBytes(new Response('',{status:404}),100),HraAssetUnavailableError);
});

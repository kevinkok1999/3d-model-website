import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../../model-audit/hra-next-candidates.json',import.meta.url),'utf8'));
const commit='27d6d493cd53761abb10f087767ec4cc74acb051';
const base=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${commit}/digital-objects/ref-organ/`;
// Regression values transcribed from official Git metadata and pinned CSV text.
// These are offline inventory tests, not downloaded source verification.
const expected=[
  ["heart-female","female","v1.3","organs","HBM449.SHRV.225","3d-vh-f-heart.glb",1745560,"750adbdaf5e43ece6bbbeaa8a283ebb0b7b20f5c",1170,"8b3492cec6a3b4a4433b60dae84ccbfc17085231",17,17,1965,"fc9e8d572a57f9dc544ac85fb459d2e60c78e22e"],
  ["heart-male","male","v1.3","organs","HBM564.WKNG.249","3d-vh-m-heart.glb",4071772,"6faffa67aaa6588d9d1058021d5b335d781bba1c",1216,"b26446dc3690c0c4635f7f14068a4efe1f9fbbec",17,17,1998,"f0e80e15b3cd909af93b88dc2c9eb16ef956087d"],
  ["liver-female","female","v1.2","organs","HBM599.GZLD.639","3d-vh-f-liver.glb",1738552,"8b44a99e5c7d73048085fc1c27895dff35305ce5",1521,"c234ca6e13703b283cec3e6e9bb8d6c486cee004",23,23,2151,"c4b7d016b625f9156e394d575eae6a1aa30c5323"],
  ["liver-male","male","v1.2","organs","HBM896.WMSL.867","3d-vh-m-liver.glb",1136412,"9808fbac25ffb21372a49d13b3d9a01a8339e902",1511,"76a96abbb52419081a10604901478354358c56a0",23,23,2314,"accb0520dfdf66f1cc6333a850af8b375809c7ec"],
  ["lung-female","female","v1.4","organs","HBM994.HXJP.575","3d-vh-f-lung.glb",23255188,"6fcfff36d2d11b8c3884de40ad9515e830444d11",5341,"c6ccde655f8601fa5d47bbb0c25fed253e092e7f",70,62,2124,"fa44414d5fe35cbd3ca4b91e25c9966c7f5b4a56"],
  ["lung-male","male","v1.4","organs","HBM532.KLZD.394","3d-vh-m-lung.glb",10942332,"900ef332cb4b72fdf70c61f4cdb0f73f9e39c241",5416,"228adf6f8cca021c1427c2ea5aa4d993fbfdc26f",72,60,2266,"b7fbdf23f39c7a5077c14230bfe99ef9ffae7e1c"],
  ["small-intestine-female","female","v1.2","organs","HBM784.FBXB.245","3d-vh-f-small-intestine.glb",856536,"c3e367680e9e64dfee4e12f257c70dab22f354c7",635,"6e589360039da601ee2be1b0c4d65e28bcdc7511",11,11,2379,"7045b79e7476e32c8f7300cd25ba75829870275b"],
  ["small-intestine-male","male","v1.2","organs","HBM789.XTDK.794","3d-vh-m-small-intestine.glb",618728,"936f5a4ace62807357867e1f1f7c34b0a8b8bfd6",694,"95f4ef0c3927b1012fa119c9de0182e7acf093bb",12,12,2529,"6099fa14ce4ab1e30c460bece79924f06e084fd7"],
  ["spinal-cord-female","female","v1.1","nerves","HBM242.QQQB.777","3d-vh-f-spinal-cord.glb",7657228,"8f5f22edc05279a5e85679a037f40f775166c1fa",2701,"5e17e4a5460c1019f57671442bafea2c69fbd029",30,30,2170,"95d63c44f55c93d24d29205d68490c69f062cec0"],
  ["spinal-cord-male","male","v1.1","nerves","HBM575.VDJW.494","3d-vh-m-spinal-cord.glb",490652,"c1d901c120f1b43ed04974e3a2a7cb2106e11e22",2789,"e14ed3c5c43dd07f909810c11fc6828d9b6904f3",31,31,2496,"c192bde9c4e7b45b987561866adfaaeb090db377"],
];

test('next HRA wave is an independent, locked ten-source inventory, no geometry claim',()=>{
  assert.equal(manifest.schemaVersion,1);
  assert.equal(manifest.status,'CANDIDATE_INVENTORY_NOT_DOWNLOADED');
  assert.equal(manifest.source.repository,'https://github.com/hubmapconsortium/hra-kg');
  assert.equal(manifest.source.commit,commit);
  assert.equal(manifest.source.refOrganTreeGitSha1,'fb3b43f21796dc63b93e2bbb88274b300314d3b6');
  assert.equal(manifest.source.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(manifest.sources.length,10);
  assert.deepEqual(manifest.sources.map(x=>x.id).sort(),expected.map(x=>x[0]).sort());
  for(const [id,variant,version,system,doi] of expected){
    const r=manifest.sources.find(x=>x.id===id);
    assert.equal(r.variant,variant);
    assert.equal(r.version,version);
    assert.equal(r.system,system);
    assert.equal(r.doi,`https://doi.org/10.48539/${doi}`);
    assert.equal(r.reviewState,'NOT_DOWNLOADED');
    assert.equal(r.license,'CC-BY-4.0');
  }
});

test('all GLB, crosswalk and metadata paths, source blob IDs and advertised byte sizes match the pin',()=>{
  const paths=new Set(),urls=new Set();
  for(const [id,variant,version,system,doi,name,bytes,sha,csvBytes,csvSha,n,ids,metaBytes,metaSha] of expected){
    const r=manifest.sources.find(x=>x.id===id);
    const dir=`${base}${id}/${version}/raw/`;
    assert.deepEqual(r.metadata,{url:`${dir}metadata.yaml`,bytes:metaBytes,gitBlobSha1:metaSha});
    assert.deepEqual(r.glb,{url:`${dir}${name}`,bytes,gitBlobSha1:sha,filename:name,localPath:`${id}/${name}`});
    assert.equal(r.crosswalk.url,`${dir}crosswalk.csv`);
    assert.equal(r.crosswalk.bytes,csvBytes);
    assert.equal(r.crosswalk.gitBlobSha1,csvSha);
    assert.equal(r.crosswalk.filename,'crosswalk.csv');
    assert.equal(r.crosswalk.localPath,`${id}/crosswalk.csv`);
    for(const asset of [r.glb,r.crosswalk]){
      assert.ok(!paths.has(asset.localPath),asset.localPath);
      paths.add(asset.localPath);
      assert.ok(!urls.has(asset.url),asset.url);
      urls.add(asset.url);
      assert.ok(!('sha256' in asset),'No byte-level SHA-256 claimed before actual file intake');
    }
  }
});

test('crosswalk exact text counts and ontological cardinality are explicit; no implied mesh count',()=>{
  let total=0;
  for(const [id,variant,version,system,doi,name,bytes,sha,csvBytes,csvSha,n,ids] of expected){
    const {crosswalk}=manifest.sources.find(x=>x.id===id);
    assert.deepEqual(crosswalk.columns,['node_name','OntologyID','label']);
    assert.equal(crosswalk.expectedRows,n);
    assert.equal(crosswalk.expectedUniqueOntologyIds,ids);
    assert.ok(ids<=n);
    assert.ok(!('meshCount' in crosswalk));
    total+=n;
  }
  assert.equal(total,306);
});

test('paired systems and known variant-specific exceptions remain explicit',()=>{
  for(const organ of ['heart','liver','lung','small-intestine','spinal-cord']){
    assert.ok(manifest.sources.some(x=>x.id===`${organ}-male`));
    assert.ok(manifest.sources.some(x=>x.id===`${organ}-female`));
  }
  for(const r of manifest.sources.filter(x=>x.id.startsWith('lung-'))) assert.match(r.provenanceNote,/larynx, trachea and main bronchi were removed/);
  assert.match(manifest.sources.find(x=>x.id==='small-intestine-female').provenanceNote,/VH_F_jejenum/);
  assert.match(manifest.sources.find(x=>x.id==='small-intestine-male').provenanceNote,/VH_M_duodenum_horizonal/);
  const female=manifest.sources.find(x=>x.id==='spinal-cord-female');
  assert.match(female.provenanceNote,/six lumbar vertebrae/);
  assert.match(female.provenanceNote,/fifth sacral segment/);
  assert.ok(manifest.openGaps.some(x=>x.system==='organs'&&x.reviewState==='BLOCKED_SOURCE_MAPPING'&&x.reason.includes('kidney')));
  assert.ok(manifest.openGaps.some(x=>x.system==='nerves'&&x.reviewState==='BLOCKED_SOURCE_MAPPING'&&x.reason.includes('peripheral')));
});

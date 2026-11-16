import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {measureAtlasSource} from '../../model-audit/atlas-spatial-inventory.mjs';

const root=new URL('../../node_modules/open-anatomy-3d/',import.meta.url);
const catalog=readFileSync(new URL('catalog.json',root));
const model=variant=>readFileSync(new URL(`models/anatomy-${variant}.glb`,root));

for(const [variant,count] of [['male',128],['female',133]])test(`Exact ${variant} source-native spatial inventory covers every mesh, separate hotspot records`,async()=>{
  const r=await measureAtlasSource(variant,catalog,model(variant));
  assert.equal(r.meshCount,count);assert.equal(r.hotspotCount,12);assert.equal(r.records.length,count);
  assert.equal(r.registrationStatus,'UNREGISTERED');assert.equal(r.mergeAuthorized,false);assert.equal(r.physicalUnitVerified,false);
  assert.equal(new Set(r.records.map(x=>x.key)).size,count);assert.equal(new Set(r.records.map(x=>x.nodeIndex)).size,count);
  assert.ok(r.records.every(x=>x.worldMatrixColumnMajor.length===16&&x.worldMatrixColumnMajor.every(Number.isFinite)));
  assert.ok(r.anchors.every(x=>x.kind==='SOURCE_CATALOG_HOTSPOT_NOT_FIT_LANDMARK'&&!r.records.some(y=>y.key===x.key)));
  for(const rec of r.records)for(let i=0;i<3;i++){
    assert.ok(rec.nativeWorldBounds.min[i]>=r.nativeWorldBounds.min[i]);assert.ok(rec.nativeWorldBounds.max[i]<=r.nativeWorldBounds.max[i]);
  }
});

test('Reject altered catalog, altered exact-size GLB, and cross-variant substitution',async()=>{
  const badCat=Buffer.from(catalog);badCat[0]^=1;
  await assert.rejects(measureAtlasSource('male',badCat,model('male')),/Unpinned base catalog/);
  const bad=Buffer.from(model('male'));bad[bad.length-1]^=1;
  await assert.rejects(measureAtlasSource('male',catalog,bad),/Unpinned base GLB/);
  await assert.rejects(measureAtlasSource('male',catalog,model('female')),/Unpinned base GLB/);
  await assert.rejects(measureAtlasSource('unknown',catalog,model('male')),/Unknown base variant/);
});

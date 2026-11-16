import test from 'node:test';
import assert from 'node:assert/strict';
import { auditHraManifest } from '../../model-audit/hra-reference-audit.mjs';

const ids=['heart-female','heart-male','liver-female','liver-male','lung-female','lung-male','small-intestine-female','small-intestine-male','spinal-cord-female','spinal-cord-male'];
const commit='27d6d493cd53761abb10f087767ec4cc74acb051';
const inventory={schemaVersion:1,source:{repository:'https://github.com/hubmapconsortium/hra-kg',commit},sources:ids.map(id=>{
  const version='v1.2', base=`https://raw.githubusercontent.com/hubmapconsortium/hra-kg/${commit}/digital-objects/ref-organ/${id}/${version}/raw/`;
  return {id,variant:id.endsWith('-female')?'female':'male',version,glb:{filename:'model.glb',url:base+'model.glb'},crosswalk:{filename:'crosswalk.csv',url:base+'crosswalk.csv'}};
})};

test('separate ten-source wave admits only its explicit exact inventory and still blocks missing bytes',()=>{
  const result=auditHraManifest(inventory,'/nonexistent',{wave:'next'});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.results.length,10);
  assert.deepEqual(result.results.map(r=>r.sourceId),ids);
  assert.ok(result.results.every(r=>r.status==='BLOCKED'&&r.anatomicallyValidated===false));
  assert.throws(()=>auditHraManifest(inventory,'/nonexistent'),/four-source/);
  assert.throws(()=>auditHraManifest({...inventory,sources:inventory.sources.slice(1)},'/nonexistent',{wave:'next'}),/ten-source/);
  assert.throws(()=>auditHraManifest({...inventory,sources:[...inventory.sources.slice(0,9),inventory.sources[0]]},'/nonexistent',{wave:'next'}),/ten-source/);
});

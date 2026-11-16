import { test } from 'node:test';
import assert from 'node:assert/strict';
import { associateHraMeshes, buildHraSelectionIndex, filterHraRows, selectionChange, isolationChange } from '../src/hra-controller.js';

const json={scene:0,scenes:[{nodes:[0]}],nodes:[
  {name:'group',children:[1,2]}, {name:'direct',mesh:0,children:[3]}, {name:'nested',children:[4]}, {name:'child',mesh:1}, {name:'nestedChild',mesh:1}
], meshes:[{primitives:[{},{}]},{primitives:[{}]}]};
const row=(nodeIndex,kind,meshNodeIndices,label,ontologyId='FMA:123')=>({nodeIndex,nodeName:json.nodes[nodeIndex].name,kind,meshIndex:json.nodes[nodeIndex].mesh??null,meshNodeIndices,label,ontologyId});
const rows=[row(0,'group',[1,3,4],'Outer group'),row(1,'mesh',[1],'Direct object'),row(2,'group',[4],'Nested group')];

function decoded(){
  const associations=new Map();
  const make=(index,mesh,primitive,children=[])=>{
    const object={children,isMesh:primitive!==undefined};
    const association={};if(index!==undefined)association.nodes=index;if(mesh!==undefined)association.meshes=mesh;if(primitive!==undefined)association.primitives=primitive;
    associations.set(object,association);return object;
  };
  const direct0=make(undefined,0,0),direct1=make(undefined,0,1),child=make(3,1,0),nestedChild=make(4,1,0);
  const direct=make(1,0,undefined,[direct0,direct1,child]),nested=make(2,undefined,undefined,[nestedChild]);
  const group=make(0,undefined,undefined,[direct,nested]);
  return {scene:{children:[group]},associations,direct0,direct1,child,nestedChild};
}

test('exact raw node associations separate multiple mesh primitives from child mesh nodes',()=>{
  const d=decoded(),map=associateHraMeshes(d.scene,d.associations,json);
  assert.deepEqual([...map.byMeshNode.keys()],[1,3,4]);
  assert.deepEqual(map.byMeshNode.get(1),[d.direct0,d.direct1]);
  assert.deepEqual(map.byMeshNode.get(3),[d.child]);
  assert.equal(map.meshNodeByObject.get(d.nestedChild),4);
  // Runtime object names are irrelevant; association indexes are authoritative.
  d.direct1.name='renamed_generic_mesh';
  assert.equal(associateHraMeshes(d.scene,d.associations,json).meshNodeByObject.get(d.direct1),1);
});

test('missing primitive, duplicate node or wrong source mesh association fails closed',()=>{
  let d=decoded();d.associations.delete(d.direct1);assert.throws(()=>associateHraMeshes(d.scene,d.associations,json));
  d=decoded();d.associations.get(d.direct1).primitives=0;assert.throws(()=>associateHraMeshes(d.scene,d.associations,json));
  d=decoded();d.associations.get(d.child).meshes=0;assert.throws(()=>associateHraMeshes(d.scene,d.associations,json));
});

test('direct semantics never include child meshes; exact group sets and deterministic click resolution',()=>{
  const index=buildHraSelectionIndex(json,rows);
  assert.deepEqual([...index.byNode.get(1).meshNodeIndices],[1]);
  assert.deepEqual([...index.byNode.get(0).meshNodeIndices],[1,3,4]);
  assert.equal(index.pickRowByMeshNode.get(1),1);
  assert.equal(index.pickRowByMeshNode.get(3),0);
  assert.equal(index.pickRowByMeshNode.get(4),2);
  assert.throws(()=>buildHraSelectionIndex(json,[rows[0],{...rows[1],meshNodeIndices:[1,3]},rows[2]]));
  assert.throws(()=>buildHraSelectionIndex(json,[{...rows[0],meshNodeIndices:[1,3]},rows[1],rows[2]]));
});

test('search identity does not collapse duplicate ontology labels and isolation transitions are explicit',()=>{
  assert.equal(filterHraRows(rows,'FMA:123','all').length,3);
  assert.deepEqual(filterHraRows(rows,'nested','group').map(row=>row.nodeIndex),[2]);
  assert.deepEqual(filterHraRows(rows,'','direct').map(row=>row.nodeIndex),[1]);
  assert.deepEqual(selectionChange({selected:0,isolated:0},1),{selected:1,isolated:null});
  assert.deepEqual(selectionChange({selected:0,isolated:0},0),{selected:0,isolated:0});
  assert.deepEqual(isolationChange({selected:0,isolated:null}),{selected:0,isolated:0});
  assert.deepEqual(isolationChange({selected:0,isolated:0}),{selected:0,isolated:null});
});

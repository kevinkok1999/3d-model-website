/** HRA source-index association and selection logic. No runtime names, inferred
 * anatomical identities or ontology-ID deduplication. Independent of WebGL. */
const need=(condition,message)=>{if(!condition)throw new Error(message);};
const validIndex=(index,items)=>Number.isSafeInteger(index)&&index>=0&&index<items.length;

function sourceGraph(json){
  const {nodes,meshes,scenes}=json;
  need(Array.isArray(nodes)&&Array.isArray(meshes)&&Array.isArray(scenes),'Invalid source graph');
  const roots=scenes[json.scene??0]?.nodes;
  need(Array.isArray(roots)&&roots.length,'Missing source scene');
  const parent=new Map(),seen=new Set(),depth=new Map(),stack=roots.map(index=>({index,parentIndex:null,level:0}));
  while(stack.length){
    const {index,parentIndex,level}=stack.pop();
    need(validIndex(index,nodes)&&!seen.has(index),'Duplicate, cyclic or invalid source node');
    seen.add(index);parent.set(index,parentIndex);depth.set(index,level);
    const node=nodes[index];
    if(node.mesh!==undefined)need(validIndex(node.mesh,meshes)&&Array.isArray(meshes[node.mesh].primitives)&&meshes[node.mesh].primitives.length,'Invalid source mesh');
    for(const child of node.children??[])stack.push({index:child,parentIndex:index,level:level+1});
  }
  need(seen.size===nodes.length,'Unreachable source node');
  return {nodes,meshes,parent,depth};
}

export function associateHraMeshes(scene,associations,json){
  const {nodes,meshes,parent}=sourceGraph(json);
  need(associations&&typeof associations.get==='function','Missing GLTFLoader source associations');
  const byMeshNode=new Map(),meshNodeByObject=new Map(),nodeObjects=new Map(),seenObjects=new Set(),primitivesByNode=new Map();
  const stack=[{object:scene,owner:null}];
  while(stack.length){
    const {object,owner:inherited}=stack.pop();
    need(object&&!seenObjects.has(object),'Duplicate parsed scene object');seenObjects.add(object);
    const assoc=associations.get(object)??{};
    let owner=inherited;
    if(assoc.nodes!==undefined){
      need(validIndex(assoc.nodes,nodes)&&!nodeObjects.has(assoc.nodes),'Invalid or duplicate parsed source node index');
      need(parent.get(assoc.nodes)===inherited,'Parsed hierarchy differs from original source node graph');
      owner=assoc.nodes;nodeObjects.set(owner,object);
    }
    if(object.isMesh){
      need(owner!==null&&nodes[owner].mesh!==undefined,'Parsed mesh has no exact source mesh node');
      const meshIndex=nodes[owner].mesh;
      need(assoc.meshes===meshIndex&&validIndex(assoc.primitives,meshes[meshIndex].primitives),'Parsed primitive association differs from source mesh index');
      const primitives=primitivesByNode.get(owner)??new Map();
      need(!primitives.has(assoc.primitives),'Duplicate source primitive association');
      primitives.set(assoc.primitives,object);primitivesByNode.set(owner,primitives);meshNodeByObject.set(object,owner);
    }
    for(let i=(object.children?.length??0)-1;i>=0;i--)stack.push({object:object.children[i],owner});
  }
  need(nodeObjects.size===nodes.length,'Incomplete decoded source node graph');
  for(const [index,node] of nodes.entries())if(node.mesh!==undefined){
    const primitives=primitivesByNode.get(index);
    need(primitives?.size===meshes[node.mesh].primitives.length,'Missing decoded mesh primitives');
    byMeshNode.set(index,[...primitives].sort(([a],[b])=>a-b).map(([,object])=>object));
  }
  return {byMeshNode,meshNodeByObject,nodeObjects};
}

export function buildHraSelectionIndex(json,rows){
  const {nodes,parent}=sourceGraph(json);
  need(Array.isArray(rows)&&rows.length,'Empty source crosswalk');
  const byNode=new Map();
  for(const row of rows){
    const node=nodes[row.nodeIndex];
    need(node&&node.name===row.nodeName&&!byNode.has(row.nodeIndex),'Missing or duplicate exact crosswalk node');
    const direct=node.mesh!==undefined,expected=[];
    need(row.kind===(direct?'mesh':'group')&&row.meshIndex===(node.mesh??null),'Incorrect direct/group classification');
    if(direct)expected.push(row.nodeIndex);
    else{
      const stack=[...node.children??[]];
      while(stack.length){const index=stack.pop(),child=nodes[index];if(child.mesh!==undefined)expected.push(index);stack.push(...child.children??[]);}
    }
    expected.sort((a,b)=>a-b);
    need(expected.length&&Array.isArray(row.meshNodeIndices)&&row.meshNodeIndices.length===expected.length&&[...row.meshNodeIndices].sort((a,b)=>a-b).every((index,i)=>index===expected[i]),'Incorrect exact descendant mesh-node set');
    byNode.set(row.nodeIndex,{...row,meshNodeIndices:expected});
  }
  const pickRowByMeshNode=new Map();
  for(const [index,node] of nodes.entries())if(node.mesh!==undefined){
    if(byNode.get(index)?.kind==='mesh'){pickRowByMeshNode.set(index,index);continue;}
    let ancestor=parent.get(index);
    while(ancestor!==null){if(byNode.get(ancestor)?.kind==='group'){pickRowByMeshNode.set(index,ancestor);break;}ancestor=parent.get(ancestor);}
    // An unmatched mesh remains visible as source context, not relabelled.
  }
  return {byNode,pickRowByMeshNode};
}

export function filterHraRows(rows,query='',kind='all'){
  if(!['all','group','direct'].includes(kind))return [];
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(row=>{
    const haystack=`${row.label} ${row.nodeName} ${row.ontologyId} ${row.nodeIndex}`.toLocaleLowerCase();
    return (kind==='all'||row.kind===(kind==='direct'?'mesh':'group'))&&words.every(word=>haystack.includes(word));
  });
}

export const selectionChange=({isolated},nodeIndex)=>({selected:nodeIndex,isolated:isolated===nodeIndex?isolated:null});
export const isolationChange=({selected,isolated})=>({selected,isolated:selected!==null&&isolated!==selected?selected:null});

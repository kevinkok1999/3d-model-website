#!/usr/bin/env node
// Offline preflight. Not a full Khronos validator or evidence of anatomical accuracy.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const SYSTEMS = new Set(['skin','skeleton','muscles','organs','vessels','nerves','joints']);
const SEXES = new Set(['male','female']);
const finite3 = x => Array.isArray(x) && x.length === 3 && x.every(Number.isFinite);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function auditCatalog(catalog, variant) {
  if (!SEXES.has(variant)) throw new Error('Variant must be male or female');
  if (!Array.isArray(catalog)) throw new Error('Catalog must be a JSON array');
  const errors = [], seen = new Set(), systemCounts = {};
  let eligible = 0, meshExpected = 0, hotspotExpected = 0;
  for (const [i, item] of catalog.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`Entry ${i}: not an object`); continue; }
    const {key, label, system, sex} = item;
    if (typeof key !== 'string' || !/^[a-z][a-z0-9_]*$/.test(key)) errors.push(`Entry ${i}: invalid key`);
    if (seen.has(key)) errors.push(`Duplicate catalog key: ${key}`);
    seen.add(key);
    if (typeof label !== 'string' || !label.trim()) errors.push(`${key}: missing label`);
    if (!SYSTEMS.has(system)) errors.push(`${key}: unknown system ${system}`);
    if (sex !== undefined && !SEXES.has(sex)) errors.push(`${key}: invalid model variant`);
    if (SYSTEMS.has(system)) systemCounts[system] = (systemCounts[system] || 0) + 1;
    if (sex && sex !== variant) continue;
    eligible++;
    if (system === 'joints') {
      hotspotExpected++;
      if (!finite3(variant === 'female' ? item.anchorFemale : item.anchor)) errors.push(`${key}: invalid ${variant} hotspot anchor`);
    } else meshExpected++;
  }
  return {catalogCount:catalog.length, variant, eligible, meshExpected, hotspotExpected, systemCounts, errors};
}

export function parseGlb(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 20) throw new Error('GLB is too short');
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic');
  if (bytes.readUInt32LE(4) !== 2) throw new Error('Expected GLB version 2');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB length mismatch');
  let cursor = 12, json, chunks = [];
  while (cursor < bytes.length) {
    if (cursor + 8 > bytes.length) throw new Error('Truncated chunk header');
    const len = bytes.readUInt32LE(cursor), type = bytes.readUInt32LE(cursor+4);
    cursor += 8;
    if (len % 4 || cursor + len > bytes.length) throw new Error('Invalid chunk length or alignment');
    if (!chunks.length && type !== 0x4e4f534a) throw new Error('First GLB chunk must be JSON');
    if (type === 0x4e4f534a) {
      if (json) throw new Error('Duplicate JSON chunk');
      json = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(cursor,cursor+len)));
    }
    chunks.push({type: type === 0x4e4f534a ? 'JSON' : type === 0x004e4942 ? 'BIN' : `0x${type.toString(16)}`, length:len});
    cursor += len;
  }
  if (!json || json.asset?.version !== '2.0') throw new Error('Missing glTF 2.0 asset declaration');
  return {json, chunks};
}

export function auditGeometry(catalog, variant, glb) {
  const report = auditCatalog(catalog,variant);
  const {json,chunks} = parseGlb(glb), errors=[...report.errors];
  const nodes=json.nodes ?? [], meshes=json.meshes ?? [], records=new Map();
  if (!Array.isArray(nodes) || !Array.isArray(meshes)) throw new Error('Invalid nodes/meshes arrays');
  // For this source, named catalog mesh nodes are the contract. Never guess aliases.
  for(const node of nodes) {
    if (!node || typeof node !== 'object') {errors.push('Invalid scene node');continue;}
    if (node.mesh === undefined) continue;
    if (!Number.isInteger(node.mesh) || node.mesh < 0 || node.mesh >= meshes.length) { errors.push(`Invalid mesh index on node ${node.name ?? '(unnamed)'}`); continue; }
    if (typeof node.name !== 'string' || !node.name) {errors.push('Unnamed mesh node');continue;}
    const entries=records.get(node.name) ?? [];entries.push(node.mesh); records.set(node.name,entries);
  }
  const expected=new Set(), candidateHotspots=new Set();
  for(const item of catalog) {
    if (!item?.key || (item.sex && item.sex !== variant)) continue;
    if(item.system === 'joints') {candidateHotspots.add(item.key);continue;}
    expected.add(item.key);
    const matches=records.get(item.key) ?? [];
    if(matches.length !== 1) errors.push(`${item.key}: expected 1 mesh node, got ${matches.length}`);
  }
  const extras=[...records.keys()].filter(x=>!expected.has(x));
  if(extras.length) errors.push(`Unmapped mesh nodes: ${extras.join(', ')}`);
  for(const k of candidateHotspots) if(records.has(k))errors.push(`${k}: hotspot unexpectedly represented as mesh`);
  if((json.buffers??[]).some(b=>b.uri) || (json.images??[]).some(i=>i.uri)) errors.push('External resources found: require a separate audited asset manifest');
  return {...report, errors, byteLength:glb.length, sha256:sha256(glb), chunks, nodeCount:nodes.length, meshCount:meshes.length,
    mappedMeshNodes:[...expected].filter(k=>(records.get(k)??[]).length===1).length,
    extensionsRequired:json.extensionsRequired ?? [], extensionsUsed:json.extensionsUsed ?? [], unknownMeshNodes:extras};
}

function main(args) {
  const value = flag => {const i=args.indexOf(flag);return i===-1?undefined:args[i+1]};
  const catalogPath=value('--catalog'), modelPath=value('--model'), variant=value('--variant');
  if(!catalogPath || !SEXES.has(variant)) throw new Error('Usage: node audit-model.mjs --catalog catalog.json --variant male|female [--model anatomy.glb]');
  const catalogBytes=readFileSync(catalogPath),catalog=JSON.parse(catalogBytes.toString('utf8'));
  const report=modelPath ? auditGeometry(catalog,variant,readFileSync(modelPath)) : auditCatalog(catalog,variant);
  console.log(JSON.stringify({scope:modelPath?'catalog + GLB metadata':'catalog ONLY; geometry, visuals and medical accuracy not verified',catalogSha256:sha256(catalogBytes),...report,status:report.errors.length?'FAIL':'PREFLIGHT_PASS'},null,2));
  if(report.errors.length) process.exitCode=1;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){try{main(process.argv.slice(2))}catch(e){console.error(e.message);process.exitCode=1}}

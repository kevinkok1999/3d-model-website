import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** Resolve concepts against the official IS-A element table, not the BP representation ID.
 * Source text is supplied locally; this tool makes no requests and cannot approve geometry. */
export function resolveElementFiles(text,candidates){
  const [header,...lines]=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  if(header!=='concept id\tname\telement file id')throw new Error('Unexpected element table header');
  const wanted=new Map();
  for(const item of candidates){
    if(!/^FMA\d+$/.test(item.fma)||!/^BP\d+$/.test(item.representation)||!item.sourceLabel||wanted.has(item.fma))throw new Error('Invalid or duplicate candidate concept');
    wanted.set(item.fma,{...item,files:new Set()});
  }
  for(const line of lines){
    if(!line.trim())continue;
    const [concept,name,element,...rest]=line.split('\t');
    if(!wanted.has(concept))continue;
    const target=wanted.get(concept);
    if(name!==target.sourceLabel)throw new Error(`Source label mismatch for ${concept}`);
    if(rest.length||!/^FJ\d+M?$/.test(element??''))throw new Error(`Invalid element ID for ${concept}`);
    target.files.add(element);
  }
  return [...wanted.values()].map(({files,...item})=>({...item,elementFileIds:[...files].sort(),state:files.size?'MAPPED_NOT_DOWNLOADED':'UNRESOLVED'}));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==3){console.error('Usage: node model-audit/bodyparts3d-mapping.mjs /path/to/isa_element_parts.txt');process.exitCode=2;}
  else try{
    const {candidates}=JSON.parse(readFileSync(new URL('./bodyparts3d-intake-candidates.json',import.meta.url),'utf8'));
    const mapped=resolveElementFiles(readFileSync(process.argv[2],'utf8'),candidates);
    console.log(JSON.stringify({status:'METADATA_ONLY_NO_GEOMETRY',mapped},null,2));
    if(mapped.some(row=>row.state==='UNRESOLVED'))process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}

// Uniform model coverage gate. A status is only a declaration; evidence requires human review.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {auditCatalog} from './audit-model.mjs';

const MODES=['herstellen','trainen','leren','blessures','sporten'];
const LOCALES=['nl','en'];
const AXES=['sourceLicense','identityLaterality','geometryOrHotspot','rendering','selectionAndLayers','accessibleAlternative','performanceEvidence','scientificReview'];
const VARIANTS=['male','female'];

function expectedRows(catalog){
  for(const v of VARIANTS){const a=auditCatalog(catalog,v);if(a.errors.length)throw new Error('Invalid catalog: '+a.errors.join('; '))}
  return VARIANTS.flatMap(variant=>catalog.filter(s=>!s.sex||s.sex===variant).map(s=>({variant,key:s.key,system:s.system,kind:s.system==='joints'?'hotspot':'mesh'})));
}
export function createLedger(catalog){
  return {schemaVersion:1,scope:'Open Anatomy 3D candidate catalog; not the full target universe',status:'DRAFT_NOT_FOR_RELEASE',
    source:{repository:'https://github.com/MervinR07/open-anatomy-3d',revision:'c050aa7b1bc56ceed668199b01ea017341928d7b',catalogLicense:'CC BY 4.0',attributionFile:'https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/ATTRIBUTION.md',changes:'Derived per-variant development inventory; not geometry or published clinical content.'},
    coveragePolicy:{requiredAxes:AXES,requiredContent:MODES.flatMap(mode=>LOCALES.map(locale=>({mode,locale})))},
    rows:expectedRows(catalog).map(x=>({...x,status:'NOT_RUN',evidence:{},content:[]}))};
}

const approved = record => record && record.status==='PASS' && typeof record.evidenceRef==='string' && record.evidenceRef.trim().length>0 && typeof record.reviewer==='string' && record.reviewer.trim().length>0;

export function validateCoverage(catalog,ledger){
  if(ledger?.schemaVersion!==1||!Array.isArray(ledger.rows))throw new Error('Invalid ledger schema');
  const errors=[], missing=[], duplicates=[], expected=expectedRows(catalog), rows=new Map(), todo=[];
  const rowId=x=>`${x.variant}:${x.key}`;
  for(const row of ledger.rows){const id=rowId(row);if(rows.has(id))duplicates.push(id);rows.set(id,row)}
  const expectedIds=new Set(expected.map(rowId));
  for(const id of rows.keys())if(!expectedIds.has(id))errors.push(`Unexpected row: ${id}`);
  for(const x of expected){
    const id=rowId(x),row=rows.get(id);if(!row){missing.push(id);continue;}
    const open=[];
    if(row.system!==x.system||row.kind!==x.kind)open.push('identity/system or kind mismatch');
    for(const axis of AXES)if(!approved(row.evidence?.[axis]))open.push(axis);
    for(const mode of MODES)for(const locale of LOCALES){
      const matches=(Array.isArray(row.content)?row.content:[]).filter(c=>c.mode===mode&&c.locale===locale);
      if(matches.length!==1||!approved(matches[0]))open.push(`content:${mode}:${locale}`);
    }
    if(row.status!=='PASS')open.push('overall review');
    if(open.length)todo.push({id,open});
  }
  const ready=expected.length-todo.length-missing.length;
  const scopeApproved=ledger.status==='REVIEWED_FOR_CANDIDATE_SCOPE';
  const pass=scopeApproved&&errors.length===0&&missing.length===0&&duplicates.length===0&&todo.length===0;
  return {pass,scopeApproved,scope:'candidate scope only; full product requires reviewed target inventory and separate release signoff',expected:expected.length,ready,unready:expected.length-ready,missing,duplicates,errors,todo};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const [action,catalogPath,ledgerPath]=process.argv.slice(2);if(!['generate','check'].includes(action)||!catalogPath)throw Error('Usage: node coverage-gate.mjs generate catalog.json | check catalog.json coverage-ledger.json');
    const c=JSON.parse(readFileSync(catalogPath,'utf8'));
    if(action==='generate')console.log(JSON.stringify(createLedger(c),null,2));
    else {if(!ledgerPath)throw Error('Missing ledger');const r=validateCoverage(c,JSON.parse(readFileSync(ledgerPath,'utf8')));console.log(JSON.stringify(r,null,2));if(!r.pass)process.exitCode=1;}
  }catch(e){console.error(e.message);process.exitCode=1;}
}

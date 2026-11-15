import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Real pinned HRA assets only. Start a preview serving the audited local bytes:
// node prototype/test/hra-browser-smoke.mjs http://127.0.0.1:4173
// Optional SMOKE_SCREENSHOT_DIR saves clearly-labelled unreviewed real-source views.
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Local preview only');
const evidence = 'ACTUAL_PINNED_HRA_GEOMETRY_NOT_ANATOMICALLY_REVIEWED';
const scope = 'Actual pinned bytes, 769 crosswalk rows, per-row DOM-driven selection and exact source-node isolation; not anatomical/clinical accuracy, spatial registration, picking accuracy or real-device performance';
const inventory = JSON.parse(readFileSync(new URL('../../model-audit/hra-expanded-candidates.json', import.meta.url), 'utf8'));
const blockedInventory = JSON.parse(readFileSync(new URL('../../model-audit/hra-next-candidates.json', import.meta.url), 'utf8'));
const target = new URL('/hra-candidate.html', base);
const auditUrl = new URL('/hra-candidate/audit.json', base);
const asset = pin => new URL(`/hra-candidate/${pin.localPath}`, base);
const sources = inventory.sources;
const expectedTotals={models:14,rows:769,meshNodes:1054,directRows:666,groupRows:103};
assert.equal(sources.length,expectedTotals.models);
assert.equal(new Set(sources.map(s=>s.id)).size,expectedTotals.models);
assert.equal(sources.reduce((sum,s)=>sum+s.crosswalk.expectedRows,0),expectedTotals.rows);
const maleLung=sources.find(s=>s.id==='lung-male'),blockedMaleLung=blockedInventory.sources.find(s=>s.id==='lung-male');
assert.equal(maleLung.version,'v1.3');assert.equal(blockedMaleLung.version,'v1.4');
assert.ok(maleLung.glb.url.includes('/lung-male/v1.3/raw/'));
assert.ok(maleLung.crosswalk.url.includes('/lung-male/v1.3/raw/'));
assert.notEqual(maleLung.glb.gitBlobSha1,blockedMaleLung.glb.gitBlobSha1);
assert.notEqual(maleLung.crosswalk.gitBlobSha1,blockedMaleLung.crosswalk.gitBlobSha1);
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { console.error(JSON.stringify({status:'BLOCKED_NOT_RUN',evidence,reason:'Playwright dependency unavailable'})); process.exit(2); }
const executablePath = process.env.CHROMIUM_PATH || (!existsSync(playwright.chromium.executablePath()) && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const screenshots = process.env.SMOKE_SCREENSHOT_DIR ? resolve(process.env.SMOKE_SCREENSHOT_DIR) : null;
if (screenshots) mkdirSync(screenshots,{recursive:true});
const checks=[], recordAudits=[], errors=[];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const sortNum = xs => [...xs].sort((a,b)=>a-b);
const listKeys = page => page.locator('#hra-list [data-node-index]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.nodeIndex)).sort((a,b)=>a-b));
const state = page => page.locator('#hra-viewport').evaluate(n=>({...n.dataset}));
const visible = s => sortNum((s.visibleNodeIndices??'').split(',').filter(Boolean).map(Number));
const ready = (page,id) => page.locator(`#hra-status[data-phase="ready"][data-source="${id}"]`).waitFor({state:'visible',timeout:90000});
const button = (page,index) => page.locator(`#hra-list [data-node-index="${index}"]`);
const matchesCount = async (page,shown,total) => assert.match(await page.locator('#hra-count').innerText(), new RegExp(`\\b${shown}\\s*/\\s*${total}\\b`));
// Independent UX expectations: exact visible NL/EN group labels, not merely
// fourteen opaque option values. Source names/IDs remain pinned English labels.
const familyLabels={
  'blood-vasculature':{nl:'Bloedvaten',en:'Blood vasculature'},brain:{nl:'Hersenen',en:'Brain'},
  heart:{nl:'Hart',en:'Heart'},liver:{nl:'Lever',en:'Liver'},lung:{nl:'Longen',en:'Lung'},
  'small-intestine':{nl:'Dunne darm',en:'Small intestine'},'spinal-cord':{nl:'Ruggenmerg',en:'Spinal cord'},
};
const variantLabels={nl:{female:'Vrouwelijk',male:'Mannelijk'},en:{female:'Female',male:'Male'}};
const familyId=source=>source.id.slice(0,-source.variant.length-1);
async function assertLocalizedSources(page,locale,source){
  assert.equal(await page.locator('html').getAttribute('lang'),locale);
  assert.equal(await page.locator('#hra-locale').inputValue(),locale);
  assert.equal(await page.locator('#hra-model').inputValue(),source.id);
  const actual=await page.locator('#hra-model optgroup').evaluateAll(groups=>groups.map(group=>({label:group.label,options:[...group.querySelectorAll('option')].map(option=>({value:option.value,text:option.textContent.trim()}))})));
  const expected=Object.entries(familyLabels).map(([id,labels])=>({label:labels[locale],options:sources.filter(s=>familyId(s)===id).map(s=>({value:s.id,text:`${labels[locale]} · ${variantLabels[locale][s.variant]} · ${s.version}${s.id==='lung-male'?(locale==='nl'?' (ouder)':' (older)'):''}`}))}));
  assert.deepEqual(actual,expected,`${locale}: exact seven localized source families, variants, version and older marker`);
  const vessel=page.locator('[data-hra-i18n="maleVesselWarning"]');
  const lung=page.locator('[data-hra-i18n="maleLungWarning"]');
  assert.equal(await vessel.isVisible(),source.id==='blood-vasculature-male',`${source.id}/${locale}: vessel discrepancy visibility`);
  assert.equal(await lung.isVisible(),source.id==='lung-male',`${source.id}/${locale}: lung discrepancy visibility`);
  if(source.id==='blood-vasculature-male')assert.match(await vessel.innerText(),locale==='nl'?/vrouwelijke variant/i:/female variant/i);
  if(source.id==='lung-male'){
    const warning=await lung.innerText();assert.match(warning,/v1\.3/);assert.match(warning,/v1\.4/);assert.match(warning,/VH_M_hyoid/);assert.match(warning,/UBERON:0001685/);
    assert.match(warning,locale==='nl'?/geblokkeerd/i:/blocked/i);
  }
  const release=page.locator('[data-hra-i18n="sourceReleaseNote"]');
  assert.equal(await release.isVisible(),true);assert.match(await release.innerText(),locale==='nl'?/v1\.3.*v1\.4.*geblokkeerd/i:/v1\.3.*v1\.4.*blocked/i);
  const scope=page.locator('#hra-scope-warning');
  const scopePatterns={
    brain:{nl:[/Allen/,/gespiegeld/,/geen onafhankelijke/,/perifere zenuwen/],en:[/Allen/,/mirrored/,/not independent/,/peripheral nerves/]},
    lung:{nl:[/strottenhoofd/,/luchtpijp/,/hoofdbronchi/,/longkwabben/,/blijven ontbreken/],en:[/larynx/,/trachea/,/main bronchi/,/lung lobes/,/remain gaps/]},
    'small-intestine':{nl:[/meetmarkeringen/,/geen populatienormen/],en:[/measurement guides/,/not population norms/]},
    'spinal-cord':{nl:source.variant==='female'?[/zes lendenwervels/,/vijfde sacrale segment/,/geen match verzonnen/]:[/Frostell/,/perifere zenuwen/],en:source.variant==='female'?[/six lumbar vertebrae/,/fifth sacral segment/,/no match is fabricated/]:[/Frostell/,/peripheral nerves/]},
  };
  const sourceScope=scopePatterns[familyId(source)];
  assert.equal(await scope.isVisible(),Boolean(sourceScope),`${source.id}/${locale}: scoped provenance warning visibility`);
  if(sourceScope){
    const warning=await scope.innerText();assert.equal(await scope.getAttribute('role'),'note');
    for(const pattern of sourceScope[locale])assert.match(warning,pattern,`${source.id}/${locale}: scoped provenance disclosure`);
    if(familyId(source)==='small-intestine')assert.ok(warning.includes(source.variant==='female'?'VH_F_jejenum':'VH_M_duodenum_horizonal'));
  }
  assert.ok(await page.locator('.hra-warning').isVisible(),'Persistent unreviewed-source warning');
}

// Independent CSV parser (including quote/doubled quote/CRLF handling): do
// not treat duplicate ontology IDs as duplicates of raw source node identity.
function crosswalk(bytes){
  const txt=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',q=false;
  const closeField=()=>{row.push(field);field='';};
  const closeRow=()=>{closeField();rows.push(row);row=[];};
  for(let i=0;i<txt.length;i++){
    const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){field+='"';i++;}else q=false;}else field+=c;}
    else if(c==='"'){assert.equal(field,'');q=true;}
    else if(c===',')closeField();
    else if(c==='\r'||c==='\n'){if(c==='\r'&&txt[i+1]==='\n')i++;closeRow();}
    else field+=c;
  }
  assert.equal(q,false);if(field||row.length)closeRow();
  assert.deepEqual(rows.shift(),['node_name','OntologyID','label']);
  return rows.map(fields=>{assert.equal(fields.length,3);return {nodeName:fields[0],ontologyId:fields[1],label:fields[2]};});
}
function jsonGlb(bytes){
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jsonLength=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
  return JSON.parse(bytes.toString('utf8',20,20+jsonLength));
}
function descendants(nodes,i){
  const result=[],visited=new Set();const stack=[i];
  while(stack.length){const n=stack.pop();assert.ok(!visited.has(n),'Source node cycle');visited.add(n);const node=nodes[n];assert.ok(node);if(node.mesh!==undefined)result.push(n);for(const j of node.children??[])stack.push(j);}
  return sortNum(result);
}
function observe(page){
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',msg=>{if(msg.type()==='error'&&!/favicon\.ico/.test(msg.location().url??''))errors.push(`console: ${msg.text()}`);});
  page.on('requestfailed',req=>{if(/hra-candidate\/(?:.*\.glb|.*\.csv|audit\.json)$/.test(req.url())&&!/ABORTED/i.test(req.failure()?.errorText??''))errors.push(`failed asset: ${req.url()} ${req.failure()?.errorText}`);});
}
async function fetchPinned(request,pin,report){
  const response=await request.get(asset(pin).href,{timeout:90000});
  assert.ok(response.ok(),`Missing actual pinned data: ${pin.localPath}`);
  const bytes=await response.body();
  assert.equal(bytes.length,pin.bytes);assert.equal(bytes.length,report.bytes);
  assert.equal(gitBlob(bytes),pin.gitBlobSha1);assert.equal(gitBlob(bytes),report.gitBlobSha1);
  assert.equal(sha256(bytes),report.sha256);await response.dispose();return bytes;
}
async function sourceData(request,audit,source){
  const report=audit.results.find(x=>x.sourceId===source.id);
  assert.ok(report,`Missing audit source ${source.id}`);assert.equal(report.status,'TECHNICAL_PREFLIGHT_PASS');assert.equal(report.variant,source.variant);
  assert.equal(report.version,source.version,`${source.id}: pinned release must match exact audit`);
  assert.equal(report.anatomicallyValidated,false);assert.equal(report.mergeAuthorized,false);
  const [glb,csv]=await Promise.all([fetchPinned(request,source.glb,report.glb),fetchPinned(request,source.crosswalk,report.crosswalk)]);
  const rows=crosswalk(csv),nodes=jsonGlb(glb).nodes;
  const allMeshes=nodes.flatMap((node,i)=>node.mesh===undefined?[]:[i]);
  assert.equal(nodes.length,report.glb.nodes);assert.equal(allMeshes.length,report.glb.meshNodes);
  assert.equal(rows.length,source.crosswalk.expectedRows);assert.equal(rows.length,report.crosswalk.rows);
  assert.equal(new Set(rows.map(row=>row.ontologyId)).size,source.crosswalk.expectedUniqueOntologyIds);
  assert.equal(report.crosswalk.unmappedMeshNodes,0);assert.equal(report.crosswalk.matches.length,rows.length);
  const rowData=rows.map(row=>{
    const matches=nodes.flatMap((node,i)=>node.name===row.nodeName?[i]:[]);assert.equal(matches.length,1);
    const index=matches[0],node=nodes[index],kind=node.mesh===undefined?'group':'mesh';
    const audited=report.crosswalk.matches.find(x=>x.nodeName===row.nodeName);
    assert.deepEqual(audited,{nodeName:row.nodeName,ontologyId:row.ontologyId,nodeIndex:index,kind,meshIndex:node.mesh??null});
    const meshNodeIndices=kind==='mesh'?[index]:descendants(nodes,index);
    assert.ok(meshNodeIndices.length>0);
    return {...row,index,kind,meshNodeIndices};
  });
  assert.equal(rowData.filter(x=>x.kind==='mesh').length,report.crosswalk.directMeshRows);
  assert.equal(rowData.filter(x=>x.kind==='group').length,report.crosswalk.groupRows);
  assert.equal(new Set(rowData.map(x=>x.index)).size,rowData.length);
  // Keep only the initial real GLB buffer for race/corruption probes. Avoid
  // retaining fourteen large buffers after their hashes and hierarchy pass.
  return {source,report,rows:rowData,allMeshes,glb:source.id===sources[0].id?glb:undefined};
}

let browser;
try{browser=await playwright.chromium.launch({executablePath,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});}
catch(error){console.error(JSON.stringify({status:'BLOCKED_NOT_RUN',evidence,reason:error.message}));process.exit(2);}

// Batch browser-native list/button click handlers. Each state is inspected
// immediately after the action (no simulated custom event, no screenshot-as-proof).
async function auditAllRows(page,data){
  const {rows,allMeshes,source}=data;const passed=[];
  for(let i=0;i<rows.length;i+=12){
    const batch=rows.slice(i,i+12);
    const result=await page.evaluate(({batch,allMeshes,sourceId})=>{
      const pass=[],fail=[];
      const dataset=()=>document.querySelector('#hra-viewport').dataset;
      const visible=()=> (dataset().visibleNodeIndices??'').split(',').filter(Boolean).map(Number).sort((a,b)=>a-b);
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      const action=document.querySelector('#hra-isolate');
      for(const row of batch){
        const el=document.querySelector(`#hra-list [data-node-index="${row.index}"]`);const problem=[];
        if(!el){fail.push(`${row.index}: no list control`);continue;}
        el.click();
        if(dataset().selected!==String(row.index))problem.push('selected raw node mismatch');
        const pressed=[...document.querySelectorAll('#hra-list [aria-pressed="true"]')].map(el=>Number(el.dataset.nodeIndex));
        if(!same(pressed,[row.index]))problem.push('list pressed mismatch');
        const detail=['#hra-title','#hra-detail','#hra-meta'].map(sel=>document.querySelector(sel)?.textContent??'').join('\n');
        for(const token of [row.label,row.nodeName,row.ontologyId])if(!detail.includes(token))problem.push(`missing exact detail ${token}`);
        if(!same(visible(),allMeshes))problem.push('selection changed all-mesh visibility');
        if(action.disabled)problem.push('isolate disabled');
        action.click();
        if(action.getAttribute('aria-pressed')!=='true'||dataset().isolated!==String(row.index))problem.push('isolation state mismatch');
        if(!same(visible(),row.meshNodeIndices)||Number(dataset().visibleMeshNodes)!==row.meshNodeIndices.length)problem.push('wrong isolated descendant set');
        action.click();
        if(action.getAttribute('aria-pressed')!=='false'||dataset().isolated!==''||!same(visible(),allMeshes))problem.push('isolation restoration mismatch');
        const s=document.querySelector('#hra-status').dataset;
        if(s.phase!=='ready'||s.source!==sourceId)problem.push('source readiness changed');
        if(problem.length)fail.push(`${row.index} (${row.nodeName}): ${problem.join('; ')}`);else pass.push(row.index);
      }
      return {pass,fail};
    },{batch,allMeshes,sourceId:source.id});
    assert.deepEqual(result.fail,[],`${source.id} row failures at offset ${i}`);passed.push(...result.pass);
  }
  assert.deepEqual(sortNum(passed),sortNum(rows.map(r=>r.index)));
  return {sourceId:source.id,rows:rows.length,selectedAndIsolated:passed.length,directRows:rows.filter(r=>r.kind==='mesh').length,groupRows:rows.filter(r=>r.kind==='group').length,sourceMeshNodes:allMeshes.length};
}

async function verifyModel(page,data){
  const {source,rows,allMeshes}=data;
  await page.locator('#hra-model').selectOption(source.id);await ready(page,source.id);
  assert.equal(await page.locator('#hra-model').inputValue(),source.id);
  await assertLocalizedSources(page,'nl',source);
  assert.equal(await page.locator('#hra-viewport').isVisible(),true);
  assert.ok(await page.locator('#hra-viewport').evaluate(n=>n.width>0&&n.height>0));
  await page.locator('#hra-search').fill('');await page.locator('#hra-type').selectOption('all');
  assert.deepEqual(await listKeys(page),sortNum(rows.map(r=>r.index)));await matchesCount(page,rows.length,rows.length);
  assert.equal(Number((await state(page)).mappedMeshNodes),allMeshes.length);assert.deepEqual(visible(await state(page)),allMeshes);
  const first=rows[0];await button(page,first.index).focus();await button(page,first.index).press('Enter');
  assert.equal((await state(page)).selected,String(first.index));
  await page.locator('#hra-clear').click();assert.equal((await state(page)).selected,'');
  recordAudits.push(await auditAllRows(page,data));

  // Exact direct/group list classification; both filters retain complete geometry.
  const type=page.locator('#hra-type'),search=page.locator('#hra-search');
  for(const [value,kind] of [['direct','mesh'],['group','group']]){
    await type.selectOption(value);const expected=rows.filter(r=>r.kind===kind).map(r=>r.index);
    assert.deepEqual(await listKeys(page),sortNum(expected));await matchesCount(page,expected.length,rows.length);
    assert.deepEqual(visible(await state(page)),allMeshes);
  }
  await type.selectOption('all');
  const searchRow=rows.find(r=>rows.filter(x=>x.ontologyId===r.ontologyId).length>1)??rows[0];
  await search.fill(searchRow.ontologyId);
  const matching=rows.filter(r=>r.ontologyId===searchRow.ontologyId).map(r=>r.index);
  const found=await listKeys(page);
  const expectedSearch=rows.filter(r=>[r.label,r.nodeName,r.ontologyId,r.index].join(' ').toLowerCase().includes(searchRow.ontologyId.toLowerCase())).map(r=>r.index);
  assert.deepEqual(found,sortNum(expectedSearch));await matchesCount(page,expectedSearch.length,rows.length);
  for(const i of matching)assert.ok(found.includes(i),'Shared ontology ID must not lose any source node');
  await type.selectOption(searchRow.kind==='mesh'?'direct':'group');
  assert.deepEqual(await listKeys(page),sortNum(found.filter(i=>rows.find(r=>r.index===i).kind===searchRow.kind)));
  await search.fill('__hra_qa_no_such_node__');assert.deepEqual(await listKeys(page),[]);await matchesCount(page,0,rows.length);
  await search.fill('');await type.selectOption('all');assert.deepEqual(await listKeys(page),sortNum(rows.map(r=>r.index)));

  const selected=rows.find(r=>r.kind==='group'&&r.meshNodeIndices.length>1)??rows.find(r=>r.kind==='group')??rows[0];
  await button(page,selected.index).click();await page.locator('#hra-isolate').click();
  assert.deepEqual(visible(await state(page)),selected.meshNodeIndices);
  for(const [view,axis] of Object.entries({front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0]})){
    await page.locator(`[data-hra-view="${view}"]`).click();const s=await state(page);
    assert.equal(s.selected,String(selected.index));assert.equal(s.view,view);assert.deepEqual(visible(s),selected.meshNodeIndices);
    const camera=await page.locator('#hra-metrics').evaluate(n=>({position:JSON.parse(n.dataset.cameraPosition),target:JSON.parse(n.dataset.cameraTarget)}));
    const offset=camera.position.map((x,i)=>x-camera.target[i]);const length=Math.hypot(...offset);assert.ok(Number.isFinite(length)&&length>0);
    assert.ok(offset.every((n,i)=>Math.abs(n/length-axis[i])<0.0001),`${source.id}/${view}: source-axis camera`);
  }
  for(const control of ['#hra-focus','#hra-fit','#hra-zoom-in','#hra-zoom-out']){
    await page.locator(control).click();assert.equal((await state(page)).selected,String(selected.index));assert.deepEqual(visible(await state(page)),selected.meshNodeIndices);
  }
  await page.locator('#hra-reset').click();assert.equal((await state(page)).selected,'');assert.equal((await state(page)).isolated,'');assert.deepEqual(visible(await state(page)),allMeshes);
  assert.equal(await page.locator('#hra-list [aria-pressed="true"]').count(),0);
  if(screenshots)await page.screenshot({path:resolve(screenshots,`hra-actual-unreviewed-${source.id}-desktop.png`),fullPage:true});
  const optionText=await page.locator(`#hra-model option[value="${source.id}"]`).innerText();
  assert.ok(optionText.includes(source.version),`${source.id}: explicit source version in option`);
  const credits=await page.locator('#hra-credits').innerText();
  assert.ok(credits.includes(source.title)&&credits.includes(source.version),`${source.id}: exact title/version in provenance panel`);
  if(source.id==='lung-male'){
    assert.ok(!optionText.includes('v1.4'),'Blocked male lung v1.4 must not be selectable');
    const warning=page.locator('[data-hra-i18n="maleLungWarning"]');
    assert.equal(await warning.isVisible(),true,'Older male lung pin is explicitly disclosed');
    const text=await warning.innerText();assert.ok(text.includes('v1.3')&&text.includes('v1.4'));
  }
  checks.push(`${source.id} ${source.version}: exact per-row selection/isolate/restore; direct/group/search filters, source axes and fit/focus/zoom preserve selected ${selected.kind} row; reset; provenance`);
}

async function failurePage(name,configure,{noGlb=false}={}){
  const page=await browser.newPage({viewport:{width:1280,height:900}});let requested=0;
  page.on('request',req=>{if(/\/hra-candidate\/.*\.glb$/.test(req.url()))requested++;});
  await configure(page);
  await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#hra-status[data-phase="error"], #hra-status[data-phase="unavailable"]').waitFor({state:'visible',timeout:90000});
  assert.equal(await page.locator('#hra-status[data-phase="ready"]').count(),0);
  assert.ok((await page.locator('#hra-error').innerText()).trim());
  for(const sel of ['#hra-fit','#hra-focus','#hra-isolate','#hra-reset'])assert.equal(await page.locator(sel).isEnabled(),false,`${name}/${sel} must fail closed`);
  assert.equal(await page.locator('#hra-list [data-node-index]').count(),0);
  if(noGlb)assert.equal(requested,0,`${name} must not fetch unchecked geometry`);
  await page.close();checks.push(`${name}: explicit failure, empty list, disabled geometry controls`);
}

try{
  const request=await playwright.request.newContext({baseURL:base.href});
  const auditResponse=await request.get(auditUrl.href);assert.ok(auditResponse.ok(),'Actual audited source manifest is required; no synthetic fallback');
  const audit=await auditResponse.json();assert.equal(audit.status,'TECHNICAL_PREFLIGHT_PASS');assert.equal(audit.anatomicallyValidated,false);assert.equal(audit.mergeAuthorized,false);
  assert.equal(audit.wave,'expanded');assert.deepEqual(audit.excludedSources,inventory.excludedSources);
  assert.ok(audit.excludedSources.some(s=>s.id==='lung-male'&&s.version==='v1.4'&&s.status==='BLOCKED_SOURCE_MAPPING'));
  assert.deepEqual(audit.results.map(x=>x.sourceId).sort(),sources.map(s=>s.id).sort());
  const models=[];for(const source of sources)models.push(await sourceData(request,audit,source));
  await request.dispose();
  const actualTotals={models:models.length,rows:models.reduce((sum,x)=>sum+x.rows.length,0),meshNodes:models.reduce((sum,x)=>sum+x.allMeshes.length,0),directRows:models.reduce((sum,x)=>sum+x.rows.filter(r=>r.kind==='mesh').length,0),groupRows:models.reduce((sum,x)=>sum+x.rows.filter(r=>r.kind==='group').length,0)};
  assert.deepEqual(actualTotals,expectedTotals);
  const maleLungData=models.find(m=>m.source.id==='lung-male'),femaleLungData=models.find(m=>m.source.id==='lung-female');
  assert.equal(maleLungData.report.glb.gitBlobSha1,maleLung.glb.gitBlobSha1);assert.notEqual(maleLungData.report.glb.gitBlobSha1,blockedMaleLung.glb.gitBlobSha1);
  checks.push('Fourteen actual GLB and fourteen actual CSV files match pinned Git blob hashes, measured audit SHA256 and bytes; independent raw hierarchy gives 769 rows, 1054 mesh nodes, 666 direct rows and 103 groups. Male lung v1.3 is a different pin from blocked v1.4.');
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});observe(page);
  await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:30000});await ready(page,sources[0].id);
  const options=await page.locator('#hra-model option').evaluateAll(nodes=>nodes.map(n=>n.value).sort());assert.deepEqual(options,sources.map(s=>s.id).sort());
  const labels=await page.locator('#hra-model option').allTextContents();assert.equal(new Set(labels).size,expectedTotals.models,'All source labels distinguish organ, variant and version');
  assert.equal(await page.locator('#hra-model optgroup').count(),7,'Seven source families with paired variants');
  assert.deepEqual(await page.locator('#hra-model optgroup').evaluateAll(groups=>groups.map(g=>g.querySelectorAll('option').length)),Array(7).fill(2));
  assert.ok(await page.locator('.hra-warning').isVisible(),'Persistent unreviewed source warning');
  for(const data of models)await verifyModel(page,data);
  assert.equal(recordAudits.reduce((sum,r)=>sum+r.selectedAndIsolated,0),expectedTotals.rows);
  for(const data of [models[0],femaleLungData,maleLungData,models[0]]){
    await page.locator('#hra-model').selectOption(data.source.id);await ready(page,data.source.id);
    assert.deepEqual(await listKeys(page),sortNum(data.rows.map(r=>r.index)));assert.deepEqual(visible(await state(page)),data.allMeshes);
    assert.equal((await state(page)).selected,'');
  }
  checks.push('Repeated switching across source families/variants restores exact list and geometry, no stale selection');await page.close();

  // Controlled race: hold initial source's network response; select another
  // source while it is loading, then release the old result. It must not win.
  const race=await browser.newPage({viewport:{width:1280,height:900}});let release,intercepted;
  const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{intercepted=r;});let oldCompleted;
  const oldSettled=new Promise(r=>{oldCompleted=r;});
  await race.route(asset(models[0].source.glb).href,async route=>{
    intercepted();await gate;
    try{await route.fulfill({status:200,contentType:'model/gltf-binary',body:models[0].glb});}catch{/* cancelled request may no longer be fulfillable */}finally{oldCompleted();}
  });
  try{
    await race.goto(target.href,{waitUntil:'domcontentloaded',timeout:30000});
    await Promise.race([started,race.waitForTimeout(30000).then(()=>{throw new Error('Initial GLB request was not intercepted');})]);
    await race.locator('#hra-model').selectOption(maleLungData.source.id);await ready(race,maleLungData.source.id);
    release();await oldSettled;
    // Browser event queue barrier rather than fixed sleep; old cancelled work
    // cannot apply after current source validation and next two frames.
    await race.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.equal(await race.locator('#hra-model').inputValue(),maleLungData.source.id);await ready(race,maleLungData.source.id);
    assert.deepEqual(await listKeys(race),sortNum(maleLungData.rows.map(r=>r.index)));assert.deepEqual(visible(await state(race)),maleLungData.allMeshes);
  }finally{release();await race.close();}
  checks.push('Controlled delayed initial GLB + mid-load source switch: latest source retains exact row/mesh state');

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});observe(mobile);
  await mobile.goto(target.href,{waitUntil:'domcontentloaded',timeout:30000});await ready(mobile,models[0].source.id);
  const mobileAudits=[];
  for(const [ordinal,data] of models.entries()){
    await mobile.locator('#hra-model').selectOption(data.source.id);await ready(mobile,data.source.id);
    assert.equal((await state(mobile)).selected,'',`${data.source.id}: no previous source selection`);
    assert.equal((await state(mobile)).isolated,'');
    assert.deepEqual(visible(await state(mobile)),data.allMeshes);
    await assertLocalizedSources(mobile,'nl',data.source);
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'390px mobile no horizontal overflow');
    // Exercise both direct and group states across the fourteen devices/models
    // without inventing a group for a source that only has direct rows.
    const mobileRow=(ordinal%2===0?data.rows.find(r=>r.kind==='group'&&r.meshNodeIndices.length>1):data.rows.find(r=>r.kind==='mesh'))??data.rows[0];
    await mobile.locator('.hra-jumps a[href="#hra-nav"]').tap();await mobile.locator('#hra-search').fill(mobileRow.nodeName);await button(mobile,mobileRow.index).tap();
    await mobile.locator('.hra-jumps a[href="#hra-detail-panel"]').tap();assert.equal((await state(mobile)).selected,String(mobileRow.index));
    assert.equal(await button(mobile,mobileRow.index).getAttribute('aria-pressed'),'true');
    await mobile.locator('#hra-isolate').tap();assert.deepEqual(visible(await state(mobile)),mobileRow.meshNodeIndices);
    assert.equal((await state(mobile)).isolated,String(mobileRow.index));
    const filteredBefore=await listKeys(mobile);
    for(const locale of ['en','nl']){
      await mobile.locator('#hra-locale').selectOption(locale);await ready(mobile,data.source.id);
      await assertLocalizedSources(mobile,locale,data.source);
      assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${data.source.id}/${locale}: no horizontal overflow`);
      const localized=await state(mobile);
      assert.equal(localized.selected,String(mobileRow.index));assert.equal(localized.isolated,String(mobileRow.index));
      assert.deepEqual(visible(localized),mobileRow.meshNodeIndices);
      assert.deepEqual(await listKeys(mobile),filteredBefore);
      assert.equal(await button(mobile,mobileRow.index).getAttribute('aria-pressed'),'true');
      const detail=await mobile.locator('#hra-detail').innerText();assert.ok(detail.includes(mobileRow.nodeName)&&detail.includes(mobileRow.ontologyId));
    }
    if(screenshots)await mobile.screenshot({path:resolve(screenshots,`hra-actual-unreviewed-${data.source.id}-mobile-390.png`),fullPage:true});
    await mobile.locator('#hra-isolate').tap();
    assert.equal((await state(mobile)).isolated,'');assert.deepEqual(visible(await state(mobile)),data.allMeshes);
    await mobile.locator('#hra-reset').tap();assert.equal((await state(mobile)).selected,'');assert.equal((await state(mobile)).isolated,'');
    assert.deepEqual(visible(await state(mobile)),data.allMeshes);
    await mobile.locator('#hra-search').fill('');assert.deepEqual(await listKeys(mobile),sortNum(data.rows.map(r=>r.index)));
    mobileAudits.push({sourceId:data.source.id,version:data.source.version,selectedIndex:mobileRow.index,kind:mobileRow.kind,isolatedMeshNodes:mobileRow.meshNodeIndices.length,locales:['en','nl'],width:390});
  }
  assert.equal(mobileAudits.length,expectedTotals.models);
  assert.ok(mobileAudits.some(r=>r.kind==='mesh')&&mobileAudits.some(r=>r.kind==='group'));
  await mobile.close();checks.push('Every one of 14 sources at 390px: touch navigation/select/isolate/restore/reset, no horizontal overflow in NL/EN; exact localized source options and source-specific warnings; locale switch retains precise selection/filter/isolation and source');
  assert.deepEqual(errors,[],'Unexpected success-path console/page/asset errors');

  await failurePage('Missing audit manifest',page=>page.route(auditUrl.href,route=>route.fulfill({status:404,contentType:'application/json',body:'{}'})),{noGlb:true});
  const altered=structuredClone(audit);altered.results[0].crosswalk.matches[0].nodeIndex=-1;
  await failurePage('Changed audit manifest mapping',page=>page.route(auditUrl.href,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(altered)})),{noGlb:true});
  const wrongVersion=structuredClone(audit);const wrongLung=wrongVersion.results.find(r=>r.sourceId==='lung-male');
  wrongLung.version='v1.4';
  wrongLung.glb.bytes=blockedMaleLung.glb.bytes;wrongLung.glb.gitBlobSha1=blockedMaleLung.glb.gitBlobSha1;
  wrongLung.crosswalk.bytes=blockedMaleLung.crosswalk.bytes;wrongLung.crosswalk.gitBlobSha1=blockedMaleLung.crosswalk.gitBlobSha1;
  await failurePage('Blocked male lung v1.4 pin substituted in audit',page=>page.route(auditUrl.href,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrongVersion)})),{noGlb:true});
  const corrupt=Buffer.from(models[0].glb);corrupt[corrupt.length-1]^=1;
  await failurePage('Actual GLB altered at same byte length',page=>page.route(asset(models[0].source.glb).href,route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:corrupt})));
  console.log(JSON.stringify({status:'PASSED',evidence,scope,actualTotals,recordAudits,mobileAudits,checks},null,2));
}catch(error){console.error(JSON.stringify({status:'FAILED',evidence,scope,recordAudits,checks,errors,reason:error.stack},null,2));process.exitCode=1;}
finally{await browser.close();}

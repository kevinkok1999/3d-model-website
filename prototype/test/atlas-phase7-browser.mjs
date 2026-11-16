import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Local Chromium only, against actual bundled central model bytes. HRA is
// intentionally tested with a missing audit manifest (no synthetic anatomy).
// node prototype/test/atlas-phase7-browser.mjs http://127.0.0.1:4173
const base=new URL(process.argv[2]??'http://127.0.0.1:4173');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
const hraStaged=process.argv[3]==='--hra-staged';
assert.ok(process.argv[3]===undefined||hraStaged,'Only optional --hra-staged is supported');
const evidence='CENTRAL_ACTUAL_PINNED_SOURCE_POINTER_PROBES_NOT_ANATOMICAL_REVIEW';
const scope='Exact source geometry decoded independently of browser scene, CSS-coordinate pointer events and nearest visible ray hits on selected stable rays; not exhaustive picking accuracy, medical or visual review, or a real-device performance test';
const require=createRequire(import.meta.url);
const catalog=require('open-anatomy-3d/catalog.json');
const packageDir=dirname(require.resolve('open-anatomy-3d/catalog.json'));
const pins={male:{bytes:7614076,gitBlob:'f173c5a08e93fb3eef85c64859680b94ad7c2aed',mesh:128,records:140},female:{bytes:8134732,gitBlob:'53a6203083490251fd7bb6421f5698db9bccd4c9',mesh:133,records:145}};
const systems=['skin','skeleton','muscles','organs','vessels','nerves','joints'];
const originalVisible=['skeleton','muscles','organs','vessels','nerves','joints'];
const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const ready=page=>page.locator('#status[data-phase="ready"]').waitFor({state:'visible',timeout:60000});
const pressed=page=>page.locator('#structure-list [data-key][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.key));
const expectedRecords=variant=>catalog.filter(x=>!x.sex||x.sex===variant);
const listButton=(page,key)=>page.locator(`#structure-list [data-key="${key}"]`);
const detailId=async page=>(await page.locator('#detail-content dl dd').allTextContents()).at(-1)?.trim();
const select=async(page,key)=>{await listButton(page,key).click();assert.deepEqual(await pressed(page),[key]);assert.equal(await detailId(page),key);};
const checks=[],pickReports=[],errors=[];
let playwright;
try{playwright=require('playwright');}catch{console.error(JSON.stringify({status:'BLOCKED_NOT_RUN',evidence,reason:'Playwright unavailable'}));process.exit(2);}
const executablePath=process.env.CHROMIUM_PATH||(!existsSync(playwright.chromium.executablePath())&&existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const screenshots=process.env.SMOKE_SCREENSHOT_DIR?resolve(process.env.SMOKE_SCREENSHOT_DIR):null;
if(screenshots)mkdirSync(screenshots,{recursive:true});

async function decodeOracle(variant){
  const bytes=readFileSync(resolve(packageDir,`models/anatomy-${variant}.glb`));
  assert.equal(bytes.length,pins[variant].bytes);assert.equal(gitBlob(bytes),pins[variant].gitBlob);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const raw=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  await MeshoptDecoder.ready;
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{throw new Error(`Unexpected source resource: ${url}`);});
  const gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const records=new Map(expectedRecords(variant).filter(x=>x.system!=='joints').map(x=>[x.key,x]));
  const meshes=[],keys=new Map(),seen=new Set();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;const a=gltf.parser.associations.get(mesh),source=raw.nodes[a?.nodes];assert.ok(source?.mesh!==undefined&&a.meshes===source.mesh,`Exact source node association: ${mesh.name}`);assert.ok(records.has(source.name)&&!seen.has(source.name),`Exact unambiguous key: ${source.name}`);seen.add(source.name);keys.set(mesh,source.name);meshes.push(mesh);});
  assert.equal(meshes.length,pins[variant].mesh);assert.deepEqual([...seen].sort(),[...records.keys()].sort());
  return {bytes,meshes,keys,records,dispose:()=>{const geometry=new Set(),materials=new Set();for(const mesh of meshes){geometry.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);}for(const g of geometry)g.dispose();for(const m of materials)m.dispose();}};
}
async function setLayers(page,active){
  for(const system of systems){const box=page.locator(`#layers input[data-system="${system}"]`);if(await box.isChecked()!==active.has(system))await box.setChecked(active.has(system));}
  assert.deepEqual((await page.locator('#layers input:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.system))).sort(),[...active].sort());
}
async function expectedVisibility(page,variant,active){
  const keys=expectedRecords(variant).filter(r=>active.has(r.system)).map(r=>r.key).sort();
  await page.waitForFunction(expected=>{const raw=document.querySelector('#metrics')?.dataset.visibleKeys;if(!raw)return false;try{return JSON.stringify(JSON.parse(raw).sort())===JSON.stringify(expected);}catch{return false;}},keys,{timeout:10000});
  return keys;
}
async function cameraSnapshot(page){
  const canvas=page.locator('#viewport canvas');await canvas.scrollIntoViewIfNeeded();
  const rect=await canvas.boundingBox();assert.ok(rect&&rect.width>100&&rect.height>100);
  const data=await page.locator('#metrics').evaluate(el=>({...el.dataset}));
  const position=JSON.parse(data.cameraPosition),target=JSON.parse(data.cameraTarget);
  const near=Number(data.cameraNear),far=Number(data.cameraFar),fov=Number(data.cameraFov),aspect=Number(data.cameraAspect);
  assert.ok([near,far,fov,aspect,...position,...target].every(Number.isFinite)&&near>0&&far>near&&fov>0&&aspect>0,'Measured public camera parameters required for exact geometric prediction');
  assert.ok(Math.abs(aspect-rect.width/rect.height)<0.03,'Camera aspect agrees with canvas CSS bounds');
  const camera=new THREE.PerspectiveCamera(fov,aspect,near,far);camera.position.fromArray(position);camera.lookAt(new THREE.Vector3(...target));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  return {rect,camera,position,target};
}
function rayHits(oracle,snapshot,active,x,y){
  const {rect,camera}=snapshot;
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);
  const hits=ray.intersectObjects(oracle.meshes.filter(m=>active.has(oracle.records.get(oracle.keys.get(m)).system)),false);
  // Independent decode + exact source association; clipping by view depth.
  return hits.filter(hit=>{const depth=-hit.point.clone().applyMatrix4(camera.matrixWorldInverse).z;return depth>=camera.near&&depth<=camera.far;}).map(hit=>({key:oracle.keys.get(hit.object),system:oracle.records.get(oracle.keys.get(hit.object)).system,distance:hit.distance}));
}
function probeRay(oracle,snapshot,active,x,y){
  const hits=rayHits(oracle,snapshot,active,x,y);if(!hits.length)return null;
  const front=hits[0],back=hits.find(h=>h.system!==front.system);
  const reduced=new Set([...active].filter(s=>s!==front.system));
  const exactBack=back?rayHits(oracle,snapshot,reduced,x,y)[0]:null;
  // Avoid edge/rounding ambiguity: nearest keys must be stable in a small
  // CSS-pixel neighbourhood in both original and masked views.
  for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2]]){
    if(rayHits(oracle,snapshot,active,x+dx,y+dy)[0]?.key!==front.key)return null;
    if(exactBack&&rayHits(oracle,snapshot,reduced,x+dx,y+dy)[0]?.key!==exactBack.key)return null;
  }
  return {x,y,front,back:exactBack,reduced};
}
function chooseProbe(oracle,snapshot,active){
  const {rect}=snapshot;let fallback=null;
  // Deterministic central/body-near samples before a broader coarse grid.
  const pairs=[[.5,.43],[.5,.5],[.5,.57],[.46,.4],[.54,.4],[.47,.55],[.53,.55],[.45,.33],[.55,.33],[.5,.27],[.5,.68]];
  for(const y of [.18,.28,.38,.48,.58,.68,.78,.88])for(const x of [.36,.43,.5,.57,.64])pairs.push([x,y]);
  for(const [u,v] of pairs){const x=Math.round(rect.x+rect.width*u),y=Math.round(rect.y+rect.height*v);const probe=probeRay(oracle,snapshot,active,x,y);if(!probe)continue;fallback??=probe;if(probe.back&&probe.back.key!==probe.front.key)return probe;}
  return fallback;
}
async function auditPointer(page,variant,oracle){
  // Exclude transparent skin and synthetic sprite hotspots. Skeleton, muscle
  // and organs can occlude each other; prove the nearest visible mesh via
  // a ray oracle before sending real Playwright mouse events to the canvas.
  const active=new Set(['skeleton','muscles','organs']);
  await setLayers(page,active);await expectedVisibility(page,variant,active);
  await page.locator('#reset-btn').click();await page.locator('[data-view="front"]').click();await page.locator('#fit-btn').click();
  const snapshot=await cameraSnapshot(page);const probe=chooseProbe(oracle,snapshot,active);
  assert.ok(probe,`${variant}: no independently stable source ray; cannot claim pointer picking`);
  assert.deepEqual(await pressed(page),[]);
  await page.mouse.click(probe.x,probe.y);assert.deepEqual(await pressed(page),[probe.front.key]);assert.equal(await detailId(page),probe.front.key);
  const report={variant,cssPixel:[probe.x,probe.y],initial:{nearest:probe.front.key,system:probe.front.system,distance:probe.front.distance},masked:null};
  if(probe.back){
    await setLayers(page,probe.reduced);await expectedVisibility(page,variant,probe.reduced);
    // Layer clicks can scroll the page: reuse normalized pixel on the newly
    // scrolled canvas and re-evaluate its camera and exact expected ray.
    const next=await cameraSnapshot(page);assert.deepEqual(next.position,snapshot.position);assert.deepEqual(next.target,snapshot.target);
    const x=Math.round(next.rect.x+(probe.x-snapshot.rect.x)/snapshot.rect.width*next.rect.width),y=Math.round(next.rect.y+(probe.y-snapshot.rect.y)/snapshot.rect.height*next.rect.height);
    const masked=rayHits(oracle,next,probe.reduced,x,y)[0];assert.ok(masked&&masked.key===probe.back.key&&masked.key!==probe.front.key);
    await page.mouse.click(x,y);assert.deepEqual(await pressed(page),[masked.key]);assert.equal(await detailId(page),masked.key);
    report.masked={hiddenSystem:probe.front.system,nearest:masked.key,system:masked.system,distance:masked.distance};
  }
  // Empty-space click must preserve selection only if independent ray oracle
  // says the coordinate really has no eligible visible source mesh.
  const current=await cameraSnapshot(page),currentLayers=probe.back?probe.reduced:active;
  let blank=null;
  for(const [u,v] of [[.05,.05],[.95,.05],[.05,.95],[.95,.95]]){const x=Math.round(current.rect.x+current.rect.width*u),y=Math.round(current.rect.y+current.rect.height*v);if(!rayHits(oracle,current,currentLayers,x,y).length){blank=[x,y];break;}}
  if(blank){const previous=await pressed(page);await page.mouse.click(...blank);assert.deepEqual(await pressed(page),previous);report.blankPreserved=true;}
  else report.blankPreserved=null;
  await setLayers(page,new Set(originalVisible));await expectedVisibility(page,variant,new Set(originalVisible));
  await page.locator('#reset-btn').click();pickReports.push(report);
}

const params=url=>Object.fromEntries(new URL(url).searchParams.entries());
async function referenceLink(page,variant,key,sourceId,locale){
  await select(page,key);
  assert.equal(await page.locator('#atlas-reference-panel').isVisible(),true);
  const link=page.locator('#atlas-reference-link');assert.ok(await link.isVisible());
  const href=await link.evaluate(a=>a.href);const url=new URL(href);
  assert.equal(url.origin,base.origin);assert.equal(url.pathname,'/hra-candidate.html');
  assert.deepEqual(params(href),{source:sourceId,lang:locale,returnVariant:variant,returnKey:key});
  assert.ok((await page.locator('#atlas-reference-message').innerText()).trim());
  assert.ok((await page.locator('#atlas-reference-note').innerText()).trim());
  return link;
}
async function noReference(page,key){await select(page,key);const link=page.locator('#atlas-reference-link');assert.equal(await link.isVisible(),false,`${key}: unsupported separate source must not be linked`);assert.equal(await link.getAttribute('href'),null);}

async function roundTrip(page,variant,locale){
  await page.locator('#locale-select').selectOption(locale);
  const key='heart';const link=await referenceLink(page,variant,key,`heart-${variant}`,locale);
  // The general QA run deliberately has no real HRA source assets. A local
  // intercepted 404 proves the navigation context still survives fail-closed.
  if(!hraStaged)await page.route('**/hra-candidate/audit.json',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'}));
  await Promise.all([page.waitForURL('**/hra-candidate.html?*'),link.click()]);
  await page.locator(`#hra-status[data-phase="${hraStaged?'ready':'unavailable'}"]`).waitFor({state:'visible',timeout:60000});
  assert.equal(await page.locator('#hra-model').inputValue(),`heart-${variant}`);
  assert.equal(await page.locator('#hra-invalid-source-warning').isVisible(),false,'Valid explicit source must not warn');
  assert.equal(await page.locator('#hra-locale').inputValue(),locale);assert.equal(await page.locator('html').getAttribute('lang'),locale);
  assert.equal(await page.locator('#hra-list [aria-pressed="true"]').count(),0,'Atlas selection does not pretend to select an equivalent HRA node');
  if(hraStaged){assert.equal(await page.locator('#hra-list [data-node-index]').count(),17,'Actual pinned heart crosswalk row count');assert.equal(await page.locator('#hra-fit').isEnabled(),true);}
  else{assert.equal(await page.locator('#hra-list [data-node-index]').count(),0);assert.equal(await page.locator('#hra-fit').isEnabled(),false);assert.ok((await page.locator('#hra-error').innerText()).trim());}
  // The return is a navigation breadcrumb, not an inferred relation to the
  // newly selected HRA model. Switching HRA source must preserve original
  // atlas key and variant even when its separate reference is different.
  const otherSource=`brain-${variant}`;
  await page.locator('#hra-model').selectOption(otherSource);
  await page.locator(`#hra-status[data-phase="${hraStaged?'ready':'unavailable'}"][data-source="${otherSource}"]`).waitFor({state:'visible',timeout:60000});
  assert.equal(await page.locator('#hra-model').inputValue(),otherSource);
  assert.equal(await page.locator('#hra-list [aria-pressed="true"]').count(),0);
  assert.equal(await page.locator('#hra-invalid-source-warning').isVisible(),false);
  if(hraStaged)assert.equal(await page.locator('#hra-list [data-node-index]').count(),108);
  else assert.equal(await page.locator('#hra-list [data-node-index]').count(),0);
  const returnLocale=locale==='en'?'nl':'en';await page.locator('#hra-locale').selectOption(returnLocale);
  const back=page.locator('#hra-return-atlas');const href=await back.evaluate(a=>a.href);assert.equal(new URL(href).origin,base.origin);assert.equal(new URL(href).pathname,'/index.html');
  assert.deepEqual(params(href),{variant,key,lang:returnLocale});
  await Promise.all([page.waitForURL('**/index.html?*'),back.click()]);await ready(page);
  assert.equal(await page.locator('#model-select').inputValue(),variant);assert.equal(await page.locator('#locale-select').inputValue(),returnLocale);assert.equal(await page.locator('html').getAttribute('lang'),returnLocale);
  assert.deepEqual(await pressed(page),[key]);assert.equal(await detailId(page),key);
  assert.equal(await page.locator('#mode-select').inputValue(),'leren');
  assert.deepEqual((await page.locator('#layers input:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.system))).sort(),[...originalVisible].sort());
  checks.push(`${variant}: exact HRA source link and preserved original atlas heart key/variant after HRA brain source switch and updated locale with ${hraStaged?'actual staged HRA ready, no equivalent row preselected':'HRA unavailable; no geometry loaded in HRA'}; default mode/layers restored`);
  if(!hraStaged)await page.unroute('**/hra-candidate/audit.json');
}

let browser;
try{browser=await playwright.chromium.launch({executablePath,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});}catch(error){console.error(JSON.stringify({status:'BLOCKED_NOT_RUN',evidence,reason:error.message}));process.exit(2);}
try{
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
  const responses=new Map();const pending=[];
  page.on('response',response=>{const match=new URL(response.url()).pathname.match(/anatomy-(male|female)[^/]*\.glb$/);if(match)pending.push(response.body().then(bytes=>{assert.equal(response.status(),200);responses.set(match[1],{bytes:bytes.length,gitBlob:gitBlob(bytes)});}));});
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',msg=>{if(msg.type()==='error'&&!/favicon\.ico|404 \(Not Found\)/i.test(`${msg.location().url} ${msg.text()}`))errors.push(`console: ${msg.text()}`);});
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await ready(page);
  assert.equal(await page.locator('#atlas-reference-panel').isVisible(),true);assert.equal(await page.locator('#atlas-reference-link').isVisible(),false);
  for(const variant of ['male','female']){
    const oracle=await decodeOracle(variant);
    try{
      await page.locator('#model-select').selectOption(variant);await ready(page);
      await page.locator('#search').fill('');await page.locator('#region-select').selectOption('all');await page.locator('#system-select').selectOption('all');
      const keys=await page.locator('#structure-list [data-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.key).sort());assert.deepEqual(keys,expectedRecords(variant).map(x=>x.key).sort());assert.equal(keys.length,pins[variant].records);
      await Promise.all(pending);assert.deepEqual(responses.get(variant),{bytes:pins[variant].bytes,gitBlob:pins[variant].gitBlob},`${variant}: browser fetched exact same source as independent oracle`);
      await auditPointer(page,variant,oracle);
      for(const key of ['deltoid_l','kidney_l','bronchi','cranial_nerves'])await noReference(page,key);
      if(variant==='female')await noReference(page,'uterus');
      const locale=variant==='male'?'nl':'en';await page.locator('#locale-select').selectOption(locale);
      for(const [key,family] of [['brain','brain'],['lung_l','lung'],['colon','large-intestine'],['pelvis','pelvis'],['pancreas','pancreas'],['spleen','spleen'],['liver','liver'],['small_intestine','small-intestine'],['spinal_cord','spinal-cord'],['aorta','blood-vasculature']])await referenceLink(page,variant,key,`${family}-${variant}`,locale);
      if(variant==='male')await referenceLink(page,variant,'prostate','prostate-male',locale);
      if(screenshots)await page.screenshot({path:resolve(screenshots,`atlas-phase7-${variant}-unreviewed.png`),fullPage:true});
      await roundTrip(page,variant,locale);
    }finally{oracle.dispose();}
  }
  // Invalid and duplicate context must not create a reference/selection.
  await page.goto(new URL('/index.html?variant=female&key=prostate&lang=en',base).href);await ready(page);
  assert.equal(await page.locator('#model-select').inputValue(),'female');assert.deepEqual(await pressed(page),[]);assert.equal(await page.locator('#atlas-reference-link').isVisible(),false);
  await page.route('**/hra-candidate/audit.json',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'}));
  for(const [query,locale] of [['source=heart-male&source=heart-female&lang=en&returnVariant=male&returnKey=heart','en'],['source=unknown-model&lang=nl&returnVariant=female&returnKey=aorta','nl'],['source=lung-male&version=v1.4&lang=en&returnVariant=male&returnKey=lung_l','en']]){
    await page.goto(new URL(`/hra-candidate.html?${query}`,base).href);
    await page.locator('#hra-status[data-phase="unavailable"]').waitFor({state:'visible',timeout:30000});
    assert.equal(await page.locator('#hra-model').inputValue(),'blood-vasculature-female');
    const invalid=page.locator('#hra-invalid-source-warning');assert.equal(await invalid.isVisible(),true,'Malformed explicitly requested HRA source is disclosed');
    assert.equal(await invalid.getAttribute('role'),'alert');
    const warning=await invalid.innerText();
    for(const token of locale==='nl'?[/ongeldige bronaanvraag/i,/standaardreferentie/i,/geen vervanging/i]:[/invalid source request/i,/default female blood vasculature/i,/not a substitute/i])assert.match(warning,token);
    assert.deepEqual(params(await page.locator('#hra-return-atlas').evaluate(a=>a.href)),{lang:locale});
  }
  await page.close();assert.deepEqual(errors,[]);
  checks.push('Invalid variant-specific atlas key and duplicate/unknown explicit HRA sources cannot restore unsupported context; visible localized alert accompanies safe default.');
  assert.equal(pickReports.length,2,'Actual pointer probes required for both source variants');
  console.log(JSON.stringify({status:'PASSED',evidence,scope,hraStaged,pickReports,checks},null,2));
}catch(error){console.error(JSON.stringify({status:'FAILED',evidence,scope,pickReports,checks,errors,reason:error.stack},null,2));process.exitCode=1;}
finally{await browser.close();}

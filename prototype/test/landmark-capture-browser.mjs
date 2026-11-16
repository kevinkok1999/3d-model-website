import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createAtlasRegistrationLedger } from '../../model-audit/atlas-registration-ledger.mjs';
import { verifyFromPinnedGlb } from '../../model-audit/landmark-source-witness.mjs';

// npm run build && npm run preview; then:
// node prototype/test/landmark-capture-browser.mjs http://127.0.0.1:4173 [--hra-staged]
// The optional HRA branch requires actual audited local source bytes; the
// default branch only verifies the fail-closed HRA unavailable state.
const base=new URL(process.argv[2]??'http://127.0.0.1:4173');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Local preview only');
const hraStaged=process.argv[3]==='--hra-staged';
assert.ok(process.argv.length<=4&&(process.argv[3]===undefined||hraStaged),'Only --hra-staged is supported');
const scope='Actual pinned GLB triangle capture via real CSS-pixel Playwright pointer events, independently decoded ray and downloaded JSON witness; not anatomical, physical-unit, correspondence, registration or merge approval.';
const require=createRequire(import.meta.url);
const packageDir=dirname(require.resolve('open-anatomy-3d/catalog.json'));
const catalog=require('open-anatomy-3d/catalog.json');
const manifest=JSON.parse(readFileSync(new URL('../../model-audit/hra-phase6-candidates.json',import.meta.url),'utf8'));
const ledger=createAtlasRegistrationLedger();
const pins=new Map(ledger.rows.flatMap(r=>[[r.source.id,r.source],[r.target.id,r.target]]));
const digest=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const gitBlob=(bytes)=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const proveBytes=(id,bytes)=>{const pin=pins.get(id);assert.ok(pin);assert.equal(bytes.length,pin.bytes);assert.equal(gitBlob(bytes),pin.gitBlobSha1);if(pin.sha256)assert.equal(digest(bytes),pin.sha256);};
const reports=[],checks=[],errors=[];
let playwright;
try{playwright=require('playwright');}catch(error){console.error(JSON.stringify({status:'BLOCKED_NOT_RUN',scope,reason:error.message}));process.exit(2);}
const executablePath=process.env.CHROMIUM_PATH||(!existsSync(playwright.chromium.executablePath())&&existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
let browser;
try{browser=await playwright.chromium.launch({executablePath,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});}catch(error){console.error(JSON.stringify({status:'BLOCKED_NOT_RUN',scope,reason:error.message}));process.exit(2);}

const selectors={central:{canvas:'#viewport canvas',metrics:'#metrics',status:'#status',panel:'#landmark-panel',reset:'#reset-btn',focus:'#focus-btn',isolate:'#isolate-btn',locale:'#locale-select',model:'#model-select',list:'#structure-list'},hra:{canvas:'#hra-viewport',metrics:'#hra-metrics',status:'#hra-status',panel:'#hra-landmark-panel',reset:'#hra-reset',focus:'#hra-focus',isolate:'#hra-isolate',locale:'#hra-locale',model:'#hra-model',list:'#hra-list'}};
const ui=(page,kind)=>{const s=selectors[kind];const panel=page.locator(s.panel);return {s,panel,canvas:page.locator(s.canvas),toggle:panel.locator('[data-capture-toggle]'),download:panel.locator('[data-capture-download]'),clear:panel.locator('[data-capture-clear]')};};
const phase=(page,kind,value='ready')=>page.locator(`${selectors[kind].status}[data-phase="${value}"]`).waitFor({state:'visible',timeout:90000});
async function state(u,value,count,armed){
  await u.panel.evaluate((panel,{value,count})=>{if(panel.dataset.captureState!==value||panel.dataset.captureCount!==String(count))throw Error(`Expected ${value}/${count}, got ${panel.dataset.captureState}/${panel.dataset.captureCount}`);},{value,count});
  assert.equal(await u.toggle.getAttribute('aria-pressed'),String(armed));
  assert.equal(await u.download.isEnabled(),count===1);
  assert.equal(await u.toggle.isEnabled(),value!=='unavailable');
  assert.equal(await u.clear.isEnabled(),count===1||armed);
}

// Independent CPU decode: never use production capture/picking helpers to
// calculate the expected triangle, coordinates, or source-node identity.
async function oracle(bytes,id,kind){
  proveBytes(id,bytes);
  const raw=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  const manager=new THREE.LoadingManager().setURLModifier(url=>{throw Error(`Unexpected external source dependency ${url}`);});
  await MeshoptDecoder.ready;
  const gltf=await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const associations=gltf.parser.associations,meshes=[],identities=new Map();
  gltf.scene.traverse(object=>{
    const association=associations.get(object);
    const node=raw.nodes[association?.nodes];
    // HRA explicitly retains authored matrices, even if the GLTFLoader's
    // automatic TRS decomposition would alter a matrix involving shear.
    if(kind==='hra'&&node?.matrix){object.matrix.fromArray(node.matrix);object.matrixAutoUpdate=false;}
    if(!object.isMesh)return;
    let owner=object;
    while(owner&&associations.get(owner)?.nodes===undefined)owner=owner.parent;
    const nodeIndex=associations.get(owner)?.nodes;
    const meshIndex=association?.meshes,primitiveIndex=association?.primitives??0;
    const source=raw.nodes[nodeIndex];
    assert.ok(source&&source.mesh===meshIndex&&raw.meshes[meshIndex].primitives[primitiveIndex]);
    meshes.push(object);identities.set(object,{nodeIndex,meshIndex,primitiveIndex,key:source.name});
  });
  gltf.scene.updateMatrixWorld(true);
  return {bytes,raw,meshes,identities,dispose(){
    const geometry=new Set(),materials=new Set();for(const mesh of meshes){geometry.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);}for(const g of geometry)g.dispose();for(const m of materials)m.dispose();
  }};
}

async function cameraSnapshot(page,u){
  await u.canvas.scrollIntoViewIfNeeded();const rect=await u.canvas.boundingBox();
  assert.ok(rect&&rect.width>100&&rect.height>100);
  const data=await page.locator(u.s.metrics).evaluate(el=>({...el.dataset}));
  const position=JSON.parse(data.cameraPosition),target=JSON.parse(data.cameraTarget),near=Number(data.cameraNear),far=Number(data.cameraFar),fov=Number(data.cameraFov),aspect=Number(data.cameraAspect);
  assert.ok([near,far,fov,aspect,...position,...target].every(Number.isFinite)&&near>0&&far>near&&fov>0&&aspect>0);
  assert.ok(Math.abs(aspect-rect.width/rect.height)<.03);
  const camera=new THREE.PerspectiveCamera(fov,aspect,near,far);camera.position.fromArray(position);camera.lookAt(new THREE.Vector3(...target));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  return {rect,camera};
}
function rayHits(geometry,snapshot,x,y){
  const {rect,camera}=snapshot,raycaster=new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);
  return raycaster.intersectObjects(geometry,false).filter(h=>{const d=-h.point.clone().applyMatrix4(camera.matrixWorldInverse).z;return d>=camera.near&&d<=camera.far;});
}
function probe(geometry,snapshot,wantHit){
  const {rect}=snapshot;const samples=wantHit?[[.5,.5],[.48,.5],[.52,.5],[.5,.48],[.5,.52]]:[[.05,.05],[.95,.05],[.05,.95],[.95,.95]];
  for(let v=.2;v<=.8;v+=.075)for(let u=.2;u<=.8;u+=.075)samples.push([u,v]);
  for(const [u,v] of samples){const x=Math.round(rect.x+rect.width*u),y=Math.round(rect.y+rect.height*v);const [hit,...behind]=rayHits(geometry,snapshot,x,y);
    if(!wantHit&&!hit)return {x,y};
    if(!wantHit||!hit||!hit.face||!hit.barycoord)continue;
    // Reject triangle-edge ambiguity and near-degenerate tiny primitives.
    if(hit.barycoord.toArray().some(n=>n<.005))continue;
    const tolerance=Math.max(Math.abs(hit.distance),hit.point.length())*1e-8;
    if(behind.some(h=>h.distance-hit.distance<=tolerance&&(h.object!==hit.object||h.faceIndex!==hit.faceIndex)))continue;
    const vertex=i=>new THREE.Vector3().fromBufferAttribute(hit.object.geometry.attributes.position,i);
    const a=vertex(hit.face.a),b=vertex(hit.face.b),c=vertex(hit.face.c),edge=Math.max(a.distanceTo(b),b.distanceTo(c),a.distanceTo(c));
    if(!(edge>0)||b.sub(a).cross(c.sub(a)).length()/(edge*edge)<=1e-8)continue;
    return {x,y,hit};
  }
  throw Error(`Could not find independent ${wantHit?'triangle interior':'blank space'} probe`);
}
async function downloadedEvidence(page,u,id){
  const [download]=await Promise.all([page.waitForEvent('download'),u.download.click()]);
  assert.equal(download.suggestedFilename(),`${id}-native-landmark.json`);
  assert.equal(await download.failure(),null);
  const path=await download.path();assert.ok(path);const bytes=readFileSync(path);assert.ok(bytes.length<=65536);
  const evidence=JSON.parse(bytes.toString('utf8'));
  assert.deepEqual(Object.keys(evidence).sort(),['schemaVersion','asset','coordinateSpace','nodeIndex','meshIndex','primitiveIndex','triangleIndex','vertexIndices','vertices','barycentric','point'].sort(),'No fabricated acceptance, physical units or registration fields');
  return evidence;
}
async function verifyCapture(page,u,source,id,localHit){
  await state(u,'captured',1,false);
  const evidence=await downloadedEvidence(page,u,id),identity=source.identities.get(localHit.object);
  assert.deepEqual(evidence.asset,{id,sha256:digest(source.bytes)});
  assert.equal(evidence.coordinateSpace,'GLTF_PRIMITIVE_POSITION');
  for(const k of ['nodeIndex','meshIndex','primitiveIndex'])assert.equal(evidence[k],identity[k],`${id} ${k}`);
  assert.equal(evidence.triangleIndex,localHit.faceIndex,`${id}: exact independent ray triangle`);
  assert.deepEqual(evidence.vertexIndices,[localHit.face.a,localHit.face.b,localHit.face.c]);
  const expectedPoint=localHit.point.clone().applyMatrix4(localHit.object.matrixWorld.clone().invert());
  assert.ok(new THREE.Vector3(...evidence.point).distanceTo(expectedPoint)<=Math.max(1,expectedPoint.length())*1e-6,'Export matches independent ray in original POSITION space');
  assert.ok(new THREE.Vector3(...evidence.barycentric).distanceTo(localHit.barycoord)<=1e-5,'Export matches independent ray barycentric weights');
  const report=await verifyFromPinnedGlb(evidence,source.bytes);
  assert.equal(report.status,'PINNED_SOURCE_TRIANGLE_VERIFIED');
  for(const key of ['physicalUnitVerified','anatomicallyValidated','mergeAuthorized'])assert.equal(report[key],false);
  assert.equal(ledger.registrationProofPresent,false);assert.equal(ledger.mergeAuthorized,false);
  const adulterated=structuredClone(evidence);adulterated.vertices[0][0]+=0.05;await assert.rejects(verifyFromPinnedGlb(adulterated,source.bytes));
  return {id,nodeIndex:evidence.nodeIndex,meshIndex:evidence.meshIndex,primitiveIndex:evidence.primitiveIndex,triangleIndex:evidence.triangleIndex,verification:report.status};
}
async function captureCycle(page,kind,source,id,selection,geometry){
  const u=ui(page,kind);
  await state(u,'idle',0,false);
  await page.locator(u.s.locale).selectOption('nl');
  assert.equal(await u.toggle.innerText(),'Punt vastleggen');
  assert.match(await u.panel.locator('[data-capture-status]').innerText(),/Nog geen punt vastgelegd/i);
  await page.locator(u.s.locale).selectOption('en');
  assert.equal(await u.toggle.innerText(),'Capture point');
  await page.locator(selection).click();assert.equal(await page.locator(selection).getAttribute('aria-pressed'),'true');
  await page.locator(u.s.isolate).click();await page.locator(u.s.focus).click();
  // Merely selecting/isolation/focus must not fabricate landmark evidence.
  await state(u,'idle',0,false);
  await u.toggle.click();await state(u,'armed',0,true);
  let snap=await cameraSnapshot(page,u),empty=probe(geometry,snap,false);
  await page.mouse.click(empty.x,empty.y);await state(u,'miss',0,true);
  // Drag is navigation, not a captured surface tap; evidence stays absent.
  snap=await cameraSnapshot(page,u);const drag=probe(geometry,snap,true);
  await page.mouse.move(drag.x,drag.y);await page.mouse.down();await page.mouse.move(drag.x+22,drag.y+12,{steps:4});await page.mouse.up();
  await state(u,'miss',0,true);
  await u.clear.click();await state(u,'idle',0,false);
  await page.locator(kind==='central'?'[data-view="front"]':'[data-hra-view="front"]').click();await page.locator(u.s.focus).click();
  await u.toggle.click();snap=await cameraSnapshot(page,u);const selected=probe(geometry,snap,true);
  await page.mouse.click(selected.x,selected.y);assert.equal(await page.locator(selection).getAttribute('aria-pressed'),'true','Capture must not change source selection');
  const proof=await verifyCapture(page,u,source,id,selected.hit);reports.push({...proof,cssPixel:[selected.x,selected.y]});
  // Clear/reset and a second capture arm cannot expose stale exports.
  await u.toggle.click();await state(u,'armed',0,true);await u.clear.click();await state(u,'idle',0,false);
  await u.toggle.click();snap=await cameraSnapshot(page,u);const second=probe(geometry,snap,true);await page.mouse.click(second.x,second.y);await state(u,'captured',1,false);
  await page.locator(u.s.reset).click();await state(u,'idle',0,false);
  checks.push(`${id}: real selected and isolated mesh; blank miss, drag, new arm, clear and viewer reset tested; independent pinned witness; no authorization`);
}

async function hotspotRejected(page,variant){
  const u=ui(page,'central'),row=catalog.find(x=>x.key==='elbow_l'&&x.system==='joints');assert.ok(row);
  await page.locator(`${u.s.list} [data-key="${row.key}"]`).click();await page.locator(u.s.isolate).click();await page.locator(u.s.focus).click();
  assert.deepEqual(JSON.parse(await page.locator(u.s.metrics).getAttribute('data-visible-keys')),[row.key]);
  await u.toggle.click();const snap=await cameraSnapshot(page,u);
  const point=new THREE.Vector3(...(variant==='male'?row.anchor:row.anchorFemale)).project(snap.camera);
  const x=Math.round(snap.rect.x+(point.x+1)*snap.rect.width/2),y=Math.round(snap.rect.y+(1-point.y)*snap.rect.height/2);
  await page.mouse.click(x,y);await state(u,'hotspot',0,true);
  assert.match(await u.panel.locator('[data-capture-status]').innerText(),/Annotation hit, not a source triangle/i);
  await page.locator(u.s.reset).click();await state(u,'idle',0,false);
  checks.push(`${variant}: isolated synthetic joint annotation cannot become a native landmark proof`);
}

async function narrowPanel(page,kind){
  const u=ui(page,kind);await u.panel.scrollIntoViewIfNeeded();
  const dimensions=await u.panel.evaluate(panel=>{
    const bounds=panel.getBoundingClientRect();return {left:bounds.left,right:bounds.right,width:innerWidth,scroll:panel.scrollWidth,client:panel.clientWidth,inside:[...panel.querySelectorAll('button')].every(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.left>=bounds.left-1&&b.right<=bounds.right+1;})};
  });
  assert.ok(dimensions.left>=-1&&dimensions.right<=dimensions.width+1&&dimensions.scroll<=dimensions.client+1&&dimensions.inside,`Mobile capture panel overflow: ${JSON.stringify(dimensions)}`);
}

try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,acceptDownloads:true});
  page.on('pageerror',error=>errors.push(error.message));
  const seen=[],pending=[];
  page.on('response',response=>{if(response.ok()&&/\.glb$/.test(new URL(response.url()).pathname))pending.push(response.body().then(bytes=>seen.push({url:response.url(),sha256:digest(bytes)})));});
  for(const variant of ['male','female']){
    const id=`open-anatomy-3d-${variant}`,source=await oracle(readFileSync(resolve(packageDir,`models/anatomy-${variant}.glb`)),id,'central');
    try{
      await page.goto(new URL(`/index.html?variant=${variant}&lang=en`,base).href);await phase(page,'central');
      await Promise.all(pending);assert.ok(seen.some(r=>r.sha256===digest(source.bytes)),'Actual browser-loaded source was pinned');
      const joints=page.locator('#layers input[data-system="joints"]');if(await joints.isChecked())await joints.uncheck();
      const geometry=source.meshes.filter(mesh=>source.identities.get(mesh).key==='heart');assert.equal(geometry.length,1);
      await captureCycle(page,'central',source,id,'#structure-list [data-key="heart"]',geometry);
      assert.match(await page.locator('[data-i18n="previewDisclaimer"]').innerText(),/require independent scientific review/i);
      assert.match(await page.locator('#landmark-panel [data-capture-copy="note"]').innerText(),/No anatomical correspondence, registration or overlay/i);
      await hotspotRejected(page,variant);
      // An armed capture cannot leak across variants even though the old
      // and new catalog happen to share heart as an exact source key.
      const u=ui(page,'central');await u.toggle.click();await page.locator(u.s.model).selectOption(variant==='male'?'female':'male');await phase(page,'central');await state(u,'idle',0,false);
      await Promise.all(pending);
    }finally{source.dispose();}
  }
  if(hraStaged){
    for(const variant of ['male','female']){
      const id=`heart-${variant}`,pin=manifest.sources.find(s=>s.id===id);assert.ok(pin);
      const response=await page.request.get(new URL(`/hra-candidate/${pin.glb.localPath}`,base).href,{timeout:90000});assert.ok(response.ok(),'--hra-staged requires real local source data');const bytes=await response.body();await response.dispose();
      const source=await oracle(bytes,id,'hra');
      try{
        await page.goto(new URL(`/hra-candidate.html?source=${id}&lang=en`,base).href);await phase(page,'hra');
        await Promise.all(pending);assert.ok(seen.some(r=>r.sha256===digest(bytes)));
        const directRows=await page.locator('#hra-list [data-kind="mesh"]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.nodeIndex)));
        assert.ok(directRows.length>0);
        const candidates=directRows.map(index=>({index,geometry:source.meshes.filter(m=>source.identities.get(m).nodeIndex===index)}));
        // Prefer the largest directly linked surface by bounding volume, for
        // stable real-source ray interior at the fitted camera resolution.
        const extent=objects=>objects.reduce((box,m)=>box.expandByObject(m),new THREE.Box3()).getSize(new THREE.Vector3()).length();
        const selected=candidates.filter(r=>r.geometry.length>0).sort((a,b)=>extent(b.geometry)-extent(a.geometry))[0];assert.ok(selected);
        await captureCycle(page,'hra',source,id,`#hra-list [data-node-index="${selected.index}"]`,selected.geometry);
        assert.match(await page.locator('[data-hra-i18n="registrationNote"]').innerText(),/Not aligned with or combined with the main model/i);
        assert.match(await page.locator('[data-hra-i18n="disclaimer"]').innerText(),/no anatomical or clinical validation/i);
        const u=ui(page,'hra');await u.toggle.click();await page.locator(u.s.model).selectOption(`heart-${variant==='male'?'female':'male'}`);await phase(page,'hra');await state(u,'idle',0,false);
        await Promise.all(pending);
      }finally{source.dispose();}
    }
  }
  // Missing audit is safe even if staged data exists. The only intercepted
  // response is the explicit failure, not anatomical data used as evidence.
  await page.route('**/hra-candidate/audit.json',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'}));
  await page.goto(new URL('/hra-candidate.html?source=heart-male&lang=en',base).href);await phase(page,'hra','unavailable');await state(ui(page,'hra'),'unavailable',0,false);
  assert.equal(await page.locator('#hra-list [data-node-index]').count(),0);
  assert.match(await page.locator('#hra-error').innerText(),/No anatomy loaded/i);
  checks.push('Missing HRA audit: no source rows, no capture or download; no simulated substitute geometry.');
  await page.setViewportSize({width:390,height:844});await narrowPanel(page,'hra');
  // Narrow viewport is a CSS/layout probe, not proof of real-device GPU
  // performance. Confirm an actual central source still enables the panel.
  await page.goto(new URL('/index.html?variant=male&lang=nl',base).href);await phase(page,'central');await state(ui(page,'central'),'idle',0,false);await narrowPanel(page,'central');
  await Promise.all(pending);
  await page.route('**/*.glb',route=>route.fulfill({status:404,contentType:'text/plain',body:'source unavailable'}));
  const central=ui(page,'central');await central.toggle.click();await page.locator(central.s.model).selectOption('female');await phase(page,'central','error');await state(central,'unavailable',0,false);
  assert.ok(await page.locator('#structure-list [data-key]').count()>0,'Catalog remains available when GLB fails');
  checks.push('390px mobile panel bounds checked in both views; missing central GLB disables capture, retains catalog and discards armed evidence.');
  await page.close();await Promise.all(pending);assert.deepEqual(errors,[]);
  assert.equal(reports.length,hraStaged?4:2);console.log(JSON.stringify({status:'PASSED',scope,hraStaged,reports,checks},null,2));
}catch(error){console.error(JSON.stringify({status:'FAILED',scope,hraStaged,reports,checks,errors,reason:error.stack},null,2));process.exitCode=1;}
finally{await browser.close();}

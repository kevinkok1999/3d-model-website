import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MAX_MANIFEST_BYTES,MAX_GLB_BYTES,CANDIDATE_CONCEPTS,CANDIDATE_SOURCE,candidateLabel,candidateElementIds,selectCandidateConcepts,validateCandidateManifest,validateCandidateGlb} from './bodyparts3d-candidate-data.js';

const COPY = {
  nl:{brand:'3D Universe',preview:'Bronreferentie',pageTitle:'Anatomische bronreferentie',intro:'Inspecteer een afzonderlijke kandidaatselectie uit het BodyParts3D-bronbestand. Selecteer concepten en bekijk hun gekoppelde geometrische elementen indien beschikbaar.',sourceModel:'Volwassen mannelijk bronmodel',noFemale:'Geen gelijkwaardige vrouwelijke bronvariant beschikbaar in deze referentie.',sourceStatus:'Onbeoordeelde, afzonderlijke bronkandidaat',localeLabel:'Taal',returnAtlas:'Terug naar de anatomieatlas',viewerTitle:'Afzonderlijk 3D-werkvlak',cameraLabel:'Camera-assen (broncoördinaten)',viewFront:'+Z',viewBack:'−Z',viewLeft:'+X',viewRight:'−X',fitBody:'Pas in beeld',focus:'Focus',isolate:'Isoleren',restore:'Stop isolatie',reset:'Reset',clear:'Deselecteer',viewerHint:'Sleep om te draaien, knijp of scroll om te zoomen. Selecteer ook via de lijst.',structuresTitle:'Concepten',searchLabel:'Zoek een concept',searchPlaceholder:'Naam, FMA-, BP- of FJ-ID…',regionLabel:'Regio',systemLabel:'Systeem',conceptsTitle:'Bronconcepten',detailTitle:'Broninformatie',disclaimer:'Deze technische referentie is geen volledige atlas, niet anatomisch of klinisch gereviewd en geen medisch hulpmiddel.',registrationNote:'Ruwe XYZ-broncoördinaten; niet geregistreerd op of overgelegd aan het hoofdmodel. Anatomische oriëntatie en eenheden zijn niet gereviewd.',sourcesTitle:'Bronnen en herkomst',sourcesIntro:'Bronverwijzingen en gegevens over de daadwerkelijk beschikbare kandidaat.',sourceCredit:'BodyParts3D, © The Database Center for Life Science',technicalTitle:'Technische bronmetingen',technicalIntro:'Versie, geometrie en technische gegevens; geen anatomische kwaliteitsclaim.',footer:'3D Universe · Technische bronreferentie',skipLink:'Direct naar de conceptlijst',loading:'Brongeometrie controleren…',ready:'Brongeometrie geladen — technische kandidaat',unavailable:'Brongeometrie niet beschikbaar',error:'Brongeometrie afgewezen',contextLost:'GPU-context verloren',missing:'Geen gevalideerd lokaal manifest en GLB beschikbaar. Geen anatomie geladen.',failure:'De technische kandidaat kon niet veilig worden geladen. Geen anatomie geladen.',empty:'Kies een bronconcept',emptyDetail:'Selecteer een concept in de lijst of via een gekoppeld element.',emptyUnavailable:'Er zijn geen gevalideerde lokale elementen om te selecteren.',none:'Geen overeenkomstige bronconcepten.',count:'concepten',all:'Alles',trunk:'Romp',upperLimb:'Bovenste ledematen',lowerLimb:'Onderste ledematen',skeleton:'Skelet',muscles:'Spieren',vessels:'Bloedvaten',rawLabel:'Engels bronlabel',representation:'Representatie-ID',elements:'ELEMENT-ID(s)',proposed:'Voorlopige Nederlandse vertaling en navigatieclassificatie; niet medisch gereviewd.',fixture:'SYNTHETISCH TESTMODEL — geen anatomie',fixtureDetail:'Testgeometrie voor softwarecontrole. Namen/IDs zijn testlabels en geen anatomische identificatie.',fixtureModel:'Synthetische softwaretest',fixtureIntro:'Inspecteer uitsluitend synthetische testgeometrie. Vorm, plaats en labels vormen geen anatomische referentie.',fixtureNoFemale:'Geen anatomische variant: uitsluitend softwaretest.',fixtureTitle:'Synthetische testreferentie',archive:'Bronarchief',notMeasured:'Geen metingen beschikbaar.',triangles:'Getekende driehoeken',calls:'Rendercalls',mapped:'Gekoppelde elementen',visible:'Zichtbare elementen',hash:'SHA-256 van lokaal GLB'},
  en:{brand:'3D Universe',preview:'Source reference',pageTitle:'Anatomical source reference',intro:'Inspect a separate candidate selection from the BodyParts3D source. Select concepts and inspect linked geometric elements when available.',sourceModel:'Adult male source model',noFemale:'No equivalent female source variant in this reference.',sourceStatus:'Unreviewed, separate source candidate',localeLabel:'Language',returnAtlas:'Return to anatomy atlas',viewerTitle:'Separate 3D workspace',cameraLabel:'Camera axes (source coordinates)',viewFront:'+Z',viewBack:'−Z',viewLeft:'+X',viewRight:'−X',fitBody:'Fit in view',focus:'Focus',isolate:'Isolate',restore:'Stop isolation',reset:'Reset',clear:'Clear selection',viewerHint:'Drag to rotate; pinch or scroll to zoom. Select via the list as well.',structuresTitle:'Concepts',searchLabel:'Find a concept',searchPlaceholder:'Name, FMA, BP or FJ ID…',regionLabel:'Region',systemLabel:'System',conceptsTitle:'Source concepts',detailTitle:'Source information',disclaimer:'This technical reference is not a complete atlas, has not been anatomically or clinically reviewed, and is not a medical device.',registrationNote:'Raw XYZ source coordinates; not registered to or overlaid on the main model. Anatomical orientation and units are not reviewed.',sourcesTitle:'Sources and provenance',sourcesIntro:'Source references and information on the actually available candidate.',sourceCredit:'BodyParts3D, © The Database Center for Life Science',technicalTitle:'Technical source metrics',technicalIntro:'Version, geometry and technical data; not an anatomy quality claim.',footer:'3D Universe · Technical source reference',skipLink:'Skip to concept list',loading:'Checking source geometry…',ready:'Source geometry loaded — technical candidate',unavailable:'Source geometry unavailable',error:'Source geometry rejected',contextLost:'GPU context lost',missing:'No validated local manifest and GLB available. No anatomy loaded.',failure:'The technical candidate could not be loaded safely. No anatomy loaded.',empty:'Choose a source concept',emptyDetail:'Select a concept in the list or via a linked element.',emptyUnavailable:'No validated local elements to select.',none:'No matching source concepts.',count:'concepts',all:'All',trunk:'Trunk',upperLimb:'Upper limbs',lowerLimb:'Lower limbs',skeleton:'Skeleton',muscles:'Muscles',vessels:'Blood vessels',rawLabel:'English source label',representation:'Representation ID',elements:'ELEMENT ID(s)',proposed:'Draft Dutch translation and navigation classification; not medically reviewed.',fixture:'SYNTHETIC TEST MODEL — not anatomy',fixtureDetail:'Synthetic geometry for software testing. Names/IDs are test labels, not anatomical identification.',fixtureModel:'Synthetic software test',fixtureIntro:'Inspect synthetic test geometry only. Shape, position and labels do not constitute an anatomical reference.',fixtureNoFemale:'No anatomical variant: software test only.',fixtureTitle:'Synthetic test reference',archive:'Source archive',notMeasured:'No measurements available.',triangles:'Drawn triangles',calls:'Draw calls',mapped:'Mapped elements',visible:'Visible elements',hash:'Local GLB SHA-256'},
};
const $=id=>document.getElementById(`bp-${id}`);
const state={locale:'nl',phase:'loading',manifest:null,selected:null,isolated:null,view:'front',error:''};
const t=key=>COPY[state.locale][key]??key;
const canvas=$('viewport'), status=$('status');
const buttons=[...document.querySelectorAll('[data-bp-view]')];
const concepts=new Map(CANDIDATE_CONCEPTS.map(c=>[c.fma,c]));
const byElement=new Map(CANDIDATE_CONCEPTS.flatMap(c=>c.elementFileIds.map(id=>[id,c.fma])));
const axis={front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0]};
const abort=new AbortController();
let renderer,scene,camera,controls,observer,group,highlight,disposed=false,applyingCamera=false,frame=0;
const meshes=new Map(),materials=new Map();
const whole=new THREE.Box3(),raycaster=new THREE.Raycaster();
let fixtureNotice=document.createElement('div');fixtureNotice.id='bp-fixture-warning';fixtureNotice.className='bp-error';fixtureNotice.setAttribute('role','alert');$('error').before(fixtureNotice);

const ready=()=>state.phase==='ready';
function setPhase(phase,error=''){state.phase=phase;state.error=error;renderTranslation();}
function paragraph(text,parent){const p=document.createElement('p');p.textContent=text;parent.append(p);}
function term(dl,key,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;dl.append(dt,dd);}
function translatedOptions(el,values,labels){const old=el.value||'all';el.replaceChildren();for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=t(labels[value]??value);el.append(option);}el.value=values.includes(old)?old:'all';}
function renderTranslation(){
  document.documentElement.lang=state.locale;
  const fixture=state.manifest?.fixtureOnly===true;
  const fixtureKeys={pageTitle:'fixtureTitle',intro:'fixtureIntro',sourceModel:'fixtureModel',noFemale:'fixtureNoFemale',sourceStatus:'fixture'};
  for(const el of document.querySelectorAll('[data-bp-i18n]')){const key=el.dataset.bpI18n;el.textContent=t(fixture&&fixtureKeys[key]?fixtureKeys[key]:key);}
  for(const el of document.querySelectorAll('[data-bp-i18n-placeholder]'))el.placeholder=t(el.dataset.bpI18nPlaceholder);
  fixtureNotice.textContent=fixture?t('fixture'):'';status.dataset.phase=state.phase;status.dataset.fixtureOnly=String(fixture);
  status.textContent=fixture&&ready()?t('fixture'):t(state.phase==='context-lost'?'contextLost':state.phase);
  $('error').textContent=state.phase==='unavailable'?t('missing'):state.phase==='error'||state.phase==='context-lost'?t('failure'):'';
  translatedOptions($('region'),['all','trunk','upper-limb','lower-limb'],{'upper-limb':'upperLimb','lower-limb':'lowerLimb'});
  translatedOptions($('system'),['all','skeleton','muscles','vessels'],{});
  renderList();renderDetail();renderCredits();sync();
}
function renderList(){
  const el=$('list');el.replaceChildren();const matches=ready()?selectCandidateConcepts(CANDIDATE_CONCEPTS,{region:$('region').value,system:$('system').value,query:$('search').value,locale:state.locale}):[];
  $('count').textContent=ready()?`${matches.length} / ${CANDIDATE_CONCEPTS.length} ${t('count')}`:`0 / 0 ${t('count')}`;
  if(!matches.length){paragraph(ready()?t('none'):t('emptyUnavailable'),el);return;}
  for(const item of matches){const button=document.createElement('button');button.type='button';button.dataset.key=item.fma;button.dataset.fma=item.fma;button.setAttribute('aria-pressed',String(state.selected===item.fma));const name=document.createElement('span'),sub=document.createElement('small');name.textContent=candidateLabel(item,state.locale);sub.textContent=`${item.fma} · ${item.representation} · ${t(item.system)}`;button.append(name,sub);button.addEventListener('click',()=>choose(item.fma,true));el.append(button);}
}
function renderDetail(){
  const concept=ready()?concepts.get(state.selected):null;const el=$('detail');el.replaceChildren();$('title').textContent=concept?candidateLabel(concept,state.locale):t('empty');$('meta').textContent=concept?`${t(concept.system)} · ${concept.fma}`:'';
  if(!concept){paragraph(ready()?t('emptyDetail'):t('emptyUnavailable'),el);return;}
  const dl=document.createElement('dl');term(dl,t('rawLabel'),concept.sourceLabel);term(dl,'FMA',concept.fma);term(dl,t('representation'),concept.representation);term(dl,t('elements'),candidateElementIds(concept).join(', '));el.append(dl);paragraph(t(state.manifest.fixtureOnly?'fixtureDetail':'proposed'),el);
}
function renderCredits(){
  const el=$('credits');el.replaceChildren();const m=state.manifest;
  if(!ready()||!m){paragraph(t('notMeasured'),el);return;}
  if(m.fixtureOnly)paragraph(t('fixtureDetail'),el);else paragraph(`${CANDIDATE_SOURCE.provider} · ${CANDIDATE_SOURCE.release} · ${CANDIDATE_SOURCE.declaredLicense}`,el);
  paragraph(`${t('archive')}: ${m.archive.name}`,el);paragraph(`${t('hash')}: ${m.glb.sha256}`,el);
  if(!m.fixtureOnly)for(const [url,label] of [[CANDIDATE_SOURCE.catalogUrl,'IS-A'],[CANDIDATE_SOURCE.elementMappingUrl,'ELEMENT'],[CANDIDATE_SOURCE.sourceLicenseUrl,'CC BY 4.0']]){const link=document.createElement('a');link.href=url;link.textContent=label;link.target='_blank';link.rel='noopener noreferrer';el.append(link,document.createTextNode(' '));}
}
function sync(){
  const active=ready(),selected=active&&!!state.selected;
  for(const id of ['search','region','system','fit','reset'])$(id).disabled=!active;
  for(const id of ['focus','isolate','clear'])$(id).disabled=!selected;
  $('isolate').setAttribute('aria-pressed',String(Boolean(active&&state.isolated)));$('isolate').querySelector('[data-bp-i18n]').textContent=t(state.isolated?'restore':'isolate');
  for(const button of buttons){button.disabled=!active;button.setAttribute('aria-pressed',String(active&&button.dataset.bpView===state.view));}
  for(const button of $('list').querySelectorAll('[data-key]'))button.setAttribute('aria-pressed',String(state.selected===button.dataset.key));
  const visible=active?[...meshes].filter(([,mesh])=>mesh.visible).map(([id])=>id).sort():[];
  canvas.dataset.selected=active?(state.selected??''):'';canvas.dataset.isolated=active?(state.isolated??''):'';
  canvas.dataset.visibleElements=String(visible.length);canvas.dataset.visibleElementIds=visible.join(',');canvas.dataset.mappedElements=String(active?meshes.size:0);canvas.dataset.view=state.view;
  updateMetrics();
}
function updateMetrics(){
  const el=$('metrics');if(!ready()||!renderer){el.textContent=t('notMeasured');return;}
  const info=renderer.info.render;el.textContent=`${t('mapped')}: ${meshes.size} · ${t('visible')}: ${canvas.dataset.visibleElements}\n${t('triangles')}: ${info.triangles.toLocaleString(state.locale)} · ${t('calls')}: ${info.calls}`;
  el.dataset.cameraPosition=JSON.stringify(camera.position.toArray());el.dataset.cameraTarget=JSON.stringify(controls.target.toArray());el.dataset.viewDirection=state.view;
}
function draw(){if(!renderer||!ready()||disposed||frame)return;frame=requestAnimationFrame(()=>{frame=0;if(ready()&&!disposed){renderer.render(scene,camera);updateMetrics();}});}
function fit(box,direction){
  const center=box.getCenter(new THREE.Vector3()),sphere=box.getBoundingSphere(new THREE.Sphere()),radius=Math.max(sphere.radius,1e-3);
  const half=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
  const distance=radius/Math.sin(half)*1.15;
  const vector=direction??camera.position.clone().sub(controls.target);if(vector.lengthSq()<1e-20)vector.set(0,0,1);vector.normalize();
  applyingCamera=true;controls.target.copy(center);camera.position.copy(center).addScaledVector(vector,distance);
  camera.near=Math.max(radius/100000,distance/100000);camera.far=distance+radius*100;camera.updateProjectionMatrix();controls.minDistance=Math.max(radius/10000,1e-6);controls.maxDistance=distance+radius*50;controls.update();applyingCamera=false;draw();
}
function view(name){if(!ready()||!axis[name])return;state.view=name;fit(whole,new THREE.Vector3(...axis[name]));sync();}
function focus(){const concept=concepts.get(state.selected);if(!ready()||!concept)return;const box=new THREE.Box3();for(const id of candidateElementIds(concept))box.union(new THREE.Box3().setFromObject(meshes.get(id)));fit(box);sync();}
function applySelection(){
  const ids=state.selected?new Set(candidateElementIds(concepts.get(state.selected))):new Set();const visibility=state.isolated?new Set(candidateElementIds(concepts.get(state.isolated))):null;
  for(const [id,mesh] of meshes){mesh.visible=!visibility||visibility.has(id);mesh.material=ids.has(id)?highlight:materials.get(id);}
  sync();draw();
}
function choose(id,zoom=false){
  if(!ready()||id!==null&&!concepts.has(id))return;
  if(state.isolated&&state.isolated!==id)state.isolated=null;state.selected=id;applySelection();renderDetail();if(zoom&&id)focus();
}
class MissingAsset extends Error{}
async function localBytes(file,limit){
  const base=new URL(import.meta.env.BASE_URL,location.href),url=new URL(`bodyparts3d-candidate/${file}`,base);
  if(url.origin!==location.origin)throw Error('Candidate asset host mismatch.');
  const res=await fetch(url,{credentials:'same-origin',redirect:'error',signal:abort.signal});
  if(res.status===404||res.status===410)throw new MissingAsset('Candidate asset missing.');
  if(!res.ok||new URL(res.url).origin!==location.origin)throw Error('Candidate asset request failed.');
  // Vite/SPA fallbacks may return an HTML shell for a missing asset.
  if((res.headers.get('content-type')??'').includes('text/html'))throw new MissingAsset('Candidate asset missing; HTML fallback.');
  const length=Number(res.headers.get('content-length'));if(length>limit)throw Error('Candidate asset too large.');
  if(!res.body)throw Error('Candidate asset stream unavailable.');
  const reader=res.body.getReader(),chunks=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw Error('Candidate asset too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
function checkParsedMesh(node,file){
  if(!node.isMesh||node.name!==file.elementFileId||node.geometry.attributes.position.count!==file.vertexCount||node.geometry.index?.count!==file.triangleCount*3)throw Error('Parsed mesh does not match audited identifier or counts.');
  node.updateWorldMatrix(true,false);if(!node.matrixWorld.equals(new THREE.Matrix4()))throw Error('Nonidentity source transform.');
  node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;
  for(const [key,vector] of [['min',b.min],['max',b.max]])for(let i=0;i<3;i++){const actual=vector.getComponent(i),expected=file.bounds[key][i];if(!Number.isFinite(actual)||Math.abs(actual-expected)>Math.max(1e-6,Math.abs(expected)*1e-7))throw Error('Parsed mesh bounds mismatch.');}
  whole.union(b);
}
function prepareScene(gltf,manifest){
  group=gltf.scene;group.updateMatrixWorld(true);const byName=new Map();group.traverse(node=>{if(node.isMesh){if(byName.has(node.name))throw Error('Duplicate parsed scene mesh.');byName.set(node.name,node);}});if(byName.size!==manifest.files.length)throw Error('Unexpected parsed mesh count.');
  for(const file of manifest.files){const node=byName.get(file.elementFileId);if(!node)throw Error('Missing parsed source element.');checkParsedMesh(node,file);meshes.set(file.elementFileId,node);materials.set(file.elementFileId,node.material);}
  if(whole.isEmpty())throw Error('Empty candidate scene.');
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));scene=new THREE.Scene();scene.add(group);scene.add(new THREE.HemisphereLight(0xffffff,0x45516c,2.3));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,3);scene.add(light);
  camera=new THREE.PerspectiveCamera(40,1,.001,10000);controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.addEventListener('change',()=>{if(!applyingCamera){state.view='orbit';sync();}draw();});
  highlight=new THREE.MeshStandardMaterial({color:0xffbe52,roughness:.65,metalness:0,emissive:0x553000,emissiveIntensity:.3,side:THREE.DoubleSide});
  const resize=()=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();draw();};
  resize();observer=new ResizeObserver(resize);observer.observe(canvas);fit(whole,new THREE.Vector3(0,0,1));
}
function cleanup(){
  if(disposed)return;disposed=true;abort.abort();if(frame)cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();
  const geometries=new Set(),allMaterials=new Set(materials.values());group?.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])allMaterials.add(material);}});for(const geometry of geometries)geometry.dispose();if(highlight)allMaterials.add(highlight);for(const material of allMaterials)material?.dispose();renderer?.dispose();meshes.clear();materials.clear();
}
async function load(){
  try{const raw=await localBytes('model.json',MAX_MANIFEST_BYTES);const manifest=validateCandidateManifest(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)));const bytes=await localBytes('model.glb',Math.min(manifest.glb.bytes,MAX_GLB_BYTES));await validateCandidateGlb(bytes,manifest);if(disposed)return;
    const manager=new THREE.LoadingManager();manager.setURLModifier(()=>{throw Error('External GLB subresource blocked.');});const gltf=await new GLTFLoader(manager).parseAsync(bytes.buffer,'');if(disposed)return;
    prepareScene(gltf,manifest);state.manifest=manifest;setPhase('ready');draw();
  }catch(error){if(disposed)return;console.warn('BodyParts3D candidate rejected/unavailable:',error?.message);cleanup();setPhase(error instanceof MissingAsset?'unavailable':'error');}
}

$('locale').addEventListener('change',e=>{state.locale=e.target.value==='en'?'en':'nl';renderTranslation();});
$('search').addEventListener('input',renderList);$('region').addEventListener('change',renderList);$('system').addEventListener('change',renderList);
for(const button of buttons)button.addEventListener('click',()=>view(button.dataset.bpView));
$('fit').addEventListener('click',()=>{if(ready()){fit(whole);sync();}});$('focus').addEventListener('click',focus);
$('isolate').addEventListener('click',()=>{if(ready()&&state.selected){state.isolated=state.isolated?null:state.selected;applySelection();}});
$('reset').addEventListener('click',()=>{if(ready()){choose(null);view('front');}});$('clear').addEventListener('click',()=>choose(null));
let tap=null;canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary){tap=null;return;}tap=e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});canvas.addEventListener('pointercancel',()=>{tap=null;});
canvas.addEventListener('pointerup',e=>{const prior=tap;tap=null;if(!ready()||!prior||e.pointerId!==prior.id||Math.hypot(e.clientX-prior.x,e.clientY-prior.y)>8)return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1),camera);const hits=raycaster.intersectObjects([...meshes.values()].filter(mesh=>mesh.visible),false);if(hits.length)choose(byElement.get(hits[0].object.name));});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(ready()){cleanup();setPhase('context-lost');}});
window.addEventListener('pagehide',e=>{if(!e.persisted)cleanup();});
renderTranslation();load();

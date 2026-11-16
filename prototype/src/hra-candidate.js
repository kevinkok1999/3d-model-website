import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HRA_SOURCES, HRA_FAMILIES, hraFamilyId, hraFamilyLabel, hraSourceScopeWarning, loadHraCandidate, HraAssetUnavailableError } from './hra-candidate-data.js';
import { associateHraMeshes, buildHraSelectionIndex, filterHraRows, selectionChange, isolationChange } from './hra-controller.js';
import {parseHraReferenceQuery,atlasReturnHref} from './atlas-source-links.js';
import {prepareLandmarkSources,captureNativeLandmark,uniqueLandmarkHit} from './landmark-capture.js';
import {createLandmarkPanel} from './landmark-panel.js';

const COPY={
  nl:{brand:'3D Universe',preview:'HRA-bronreferentie',localeLabel:'Taal',returnAtlas:'Terug naar de atlas',returnBodyparts:'BodyParts3D-bronreferentie',pageTitle:'HRA 3D-bronreferenties',intro:'Inspecteer 23 afzonderlijke bronreferenties verdeeld over 12 families. Selecteer exacte bronrecords via de lijst; bronmodellen blijven van elkaar gescheiden.',sourceLabel:'Bronmodel',sourceModelInfo:'23 afzonderlijke bronmodellen · 12 families · 881 bronrecords · geen samenvoeging.',sourceStatus:'Technische kandidaat · niet anatomisch beoordeeld',disclaimer:'Geen volledige atlas, geen anatomische of klinische validatie en geen medisch hulpmiddel.',registrationNote:'Oorspronkelijke broncoördinaten en transformaties. Niet geregistreerd op of gecombineerd met het hoofdmodel. Assen en eenheden zijn niet anatomisch geïnterpreteerd.',maleVesselWarning:'Bronwaarschuwing: de beschrijving van het mannelijke vaatmodel bevat een verwijzing naar de vrouwelijke variant; de identificatie blijft onbeoordeeld.',viewerTitle:'Afzonderlijk 3D-werkvlak',cameraLabel:'Camera-assen (broncoördinaten)',viewFront:'+Z',viewBack:'−Z',viewLeft:'+X',viewRight:'−X',fitBody:'Pas in beeld',zoomIn:'Zoom in',zoomOut:'Zoom uit',focus:'Focus',isolate:'Isoleer',restore:'Stop isolatie',reset:'Reset',clear:'Deselecteer',viewerHint:'Draai met slepen; knijp of scroll om te zoomen. Gebruik ook de bronlijst en knoppen.',structuresTitle:'Bronstructuren',searchLabel:'Zoek een bronrecord',typeLabel:'Type',typeAll:'Alles',typeGroup:'Groep (afstammelingen)',typeDirect:'Directe mesh',conceptsTitle:'Exacte bronrecords',detailTitle:'Broninformatie',sourcesTitle:'Bronnen en herkomst',sourcesIntro:'Bronmetadata en verwijzingen voor de geselecteerde referentie.',technicalTitle:'Technische bronmetingen',technicalIntro:'Geometrie, selectie en bronbewijs; geen anatomische kwaliteitsclaim.',footer:'3D Universe · Technische HRA-bronreferentie',skipLink:'Direct naar de bronlijst',searchPlaceholder:'Label, node of FMA-/UBERON-ID…',loading:'Bronmodel wordt gecontroleerd…',ready:'Bronmodel geladen — technische kandidaat',unavailable:'Brongeometrie niet beschikbaar',error:'Brongeometrie afgewezen',contextLost:'Grafische context verloren',missing:'Het gevalideerde lokale bronbestand is niet beschikbaar. Geen anatomie geladen.',failure:'De technische bronreferentie kon niet veilig worden geladen. Geen anatomie geladen.',contextFailure:'De grafische context ging verloren. Kies opnieuw een bronmodel.',none:'Geen overeenkomstige bronrecords.',select:'Kies een bronrecord',selectDetail:'Selecteer in de lijst of kies een gekoppeld element.',selectUnavailable:'Geen gevalideerde lokale bronstructuren beschikbaar.',sourceEnglish:'Engels bronlabel',nodeName:'Exacte bron-node',ontology:'Ontologie-ID',nodeIndex:'Node-index (glTF)',kind:'Bronrecordtype',meshNodes:'Mesh-node-indexen',group:'Groep — afstammende meshes',mesh:'Direct — uitsluitend eigen mesh',reference:'Bronreferentie',version:'Versie',variant:'Bronvariant',male:'Mannelijk',female:'Vrouwelijk',brain:'Hersenen',vessels:'Bloedvaten',license:'Licentie',citation:'DOI / bronpublicatie',repository:'HRA-bronbibliotheek',sourceNote:'Oorspronkelijke herkomstnotitie (EN)',auditHash:'SHA-256 van lokaal GLB',meshCount:'Mesh-nodes',visible:'Zichtbare mesh-nodes',triangles:'Getekende driehoeken',calls:'Rendercalls',notMeasured:'Geen metingen beschikbaar.'},
  en:{brand:'3D Universe',preview:'HRA source reference',localeLabel:'Language',returnAtlas:'Return to atlas',returnBodyparts:'BodyParts3D source reference',pageTitle:'HRA 3D source references',intro:'Inspect 23 separate source references across 12 families. Select exact source records from the list; source models remain separate.',sourceLabel:'Source model',sourceModelInfo:'23 separate source models · 12 families · 881 source records · no merge.',sourceStatus:'Technical candidate · not anatomically reviewed',disclaimer:'Not a complete atlas, no anatomical or clinical validation, not a medical device.',registrationNote:'Original source coordinates and transforms. Not aligned with or combined with the main model. Axes and units have not been anatomically interpreted.',maleVesselWarning:'Source warning: the male blood vasculature description references the female variant; identification remains unreviewed.',viewerTitle:'Separate 3D workspace',cameraLabel:'Camera axes (source coordinates)',viewFront:'+Z',viewBack:'−Z',viewLeft:'+X',viewRight:'−X',fitBody:'Fit in view',zoomIn:'Zoom in',zoomOut:'Zoom out',focus:'Focus',isolate:'Isolate',restore:'Stop isolation',reset:'Reset',clear:'Clear selection',viewerHint:'Drag to rotate; pinch or scroll to zoom. Use the source list and buttons too.',structuresTitle:'Source structures',searchLabel:'Find a source record',typeLabel:'Type',typeAll:'All',typeGroup:'Group (descendants)',typeDirect:'Direct mesh',conceptsTitle:'Exact source records',detailTitle:'Source information',sourcesTitle:'Sources and provenance',sourcesIntro:'Source metadata and references for the selected reference.',technicalTitle:'Technical source metrics',technicalIntro:'Geometry, selection and source evidence; not an anatomy quality claim.',footer:'3D Universe · Technical HRA source reference',skipLink:'Skip to source list',searchPlaceholder:'Label, node or FMA/UBERON ID…',loading:'Checking source model…',ready:'Source model loaded — technical candidate',unavailable:'Source geometry unavailable',error:'Source geometry rejected',contextLost:'Graphics context lost',missing:'Validated local source file unavailable. No anatomy loaded.',failure:'The technical source reference could not be loaded safely. No anatomy loaded.',contextFailure:'Graphics context lost. Choose a source model again.',none:'No matching source records.',select:'Choose a source record',selectDetail:'Select in the list or choose a linked element.',selectUnavailable:'No validated local source structures available.',sourceEnglish:'English source label',nodeName:'Exact source node',ontology:'Ontology ID',nodeIndex:'Node index (glTF)',kind:'Source record type',meshNodes:'Mesh node indices',group:'Group — descendant meshes',mesh:'Direct — own mesh only',reference:'Source reference',version:'Version',variant:'Source variant',male:'Male',female:'Female',brain:'Brain',vessels:'Blood vasculature',license:'License',citation:'DOI / source publication',repository:'HRA source library',sourceNote:'Original provenance note (EN)',auditHash:'Local GLB SHA-256',meshCount:'Mesh nodes',visible:'Visible mesh nodes',triangles:'Drawn triangles',calls:'Draw calls',notMeasured:'No measurements available.'}
};
const $=id=>document.getElementById(`hra-${id}`);
COPY.nl.disclaimer+=' De hersenvarianten zijn gespiegeld en geschaald vanuit de Allen-referentieatlas, geen onafhankelijke mannelijke of vrouwelijke scans. De vaatmodellen zijn bewerkt vanuit Visible Human.';
COPY.en.disclaimer+=' Brain variants were mirrored and rescaled from the Allen reference atlas, not independent male or female scans. Blood vasculature models were adapted from Visible Human.';
Object.assign(COPY.nl,{intro:'Inspecteer veertien afzonderlijke bronreferenties voor zeven families: bloedvaten, hersenen, hart, lever, longen, dunne darm en ruggenmerg. Selecteer exacte bronrecords via de lijst.',sourceModelInfo:'14 afzonderlijke bronmodellen · 7 families · mannelijke/vrouwelijke bronvarianten — geen samenvoeging.',sourceReleaseNote:'Mannelijk longmodel: oudere bronversie v1.3. Versie v1.4 blijft geblokkeerd.',maleLungWarning:'Bronwaarschuwing: het mannelijke longmodel gebruikt de afzonderlijke oudere bronversie v1.3. Versie v1.4 ontbreekt de gekoppelde node VH_M_hyoid (UBERON:0001685) en blijft geblokkeerd. v1.3 is geen correctie van v1.4; het hyoid blijft onbeoordeeld en ontbreekt in deze bronselectie.',older:'ouder'});
Object.assign(COPY.en,{intro:'Inspect fourteen separate source references across seven families: blood vasculature, brain, heart, liver, lung, small intestine and spinal cord. Select exact source records from the list.',sourceModelInfo:'14 separate source models · 7 families · male/female source variants — no merge.',sourceReleaseNote:'Male lung model: older source release v1.3. Release v1.4 remains blocked.',maleLungWarning:'Source warning: the male lung model uses the separate older source release v1.3. Release v1.4 lacks the linked node VH_M_hyoid (UBERON:0001685) and remains blocked. v1.3 is not a correction of v1.4; the hyoid remains unreviewed and absent from this source selection.',older:'older'});
COPY.nl.lungMaleWarning=COPY.nl.maleLungWarning;COPY.en.lungMaleWarning=COPY.en.maleLungWarning;
Object.assign(COPY.nl,{intro:'Inspecteer 23 afzonderlijke bronreferenties verdeeld over 12 families. Selecteer exacte bronrecords via de lijst; bronmodellen blijven van elkaar gescheiden.',sourceModelInfo:'23 afzonderlijke bronmodellen · 12 families · 881 bronrecords · geen samenvoeging.',sourcePairNote:'11 families met mannelijke en vrouwelijke bronreferenties en één uitsluitend mannelijke prostaatreferentie. Geen ontbrekende variant afgeleid of geconstrueerd.',excludedSources:'Uitgesloten (HOLD): linker nier vrouw/man vanwege een papillen-/metadataconflict, en baarmoeder vrouw vanwege een versiediscrepantie in de bronmetadata. Deze modellen worden niet geladen.',sourcePriority:'Aanvullende bronreview',priorityP2:'P2 — extra bronreview vereist'});
Object.assign(COPY.en,{intro:'Inspect 23 separate source references across 12 families. Select exact source records from the list; source models remain separate.',sourceModelInfo:'23 separate source models · 12 families · 881 source records · no merge.',sourcePairNote:'11 families with male and female source references, and one male-only prostate reference. No missing counterpart derived or constructed.',excludedSources:'Excluded (HOLD): left kidney female/male due to a papillae metadata conflict, and female uterus due to a source metadata version discrepancy. These models are not loaded.',sourcePriority:'Additional provenance review',priorityP2:'P2 — additional provenance review required'});
COPY.nl.sourceHoldNote=COPY.nl.excludedSources;COPY.en.sourceHoldNote=COPY.en.excludedSources;COPY.nl.sourceProstateNote=COPY.nl.sourcePairNote;COPY.en.sourceProstateNote=COPY.en.sourcePairNote;
COPY.nl.invalidSourceNotice='Ongeldige bronaanvraag: het gevraagde bron-ID of de versie is niet toegestaan. Bij openen is de standaardreferentie voor vrouwelijke bloedvaten geselecteerd. Dat is geen vervanging of anatomische overeenkomst met de aangevraagde bron. Kies desgewenst zelf een andere beschikbare referentie.';
COPY.en.invalidSourceNotice='Invalid source request: the requested source ID or version is not allowed. The default female blood vasculature reference was selected on opening. This is not a substitute or an anatomical match for the requested source. Choose another available reference if desired.';
const canvas=$('viewport'),status=$('status'),buttons=[...document.querySelectorAll('[data-hra-view]')];
const axis={front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0]};
const sources=new Map(HRA_SOURCES.map(source=>[source.id,source]));
const initialNavigation=parseHraReferenceQuery(window.location.search);
const state={locale:initialNavigation.locale,sourceId:initialNavigation.sourceId,phase:'loading',selected:null,isolated:null,view:'front'};
const t=key=>COPY[state.locale][key]??key,ready=()=>state.phase==='ready'&&!!current;
let renderer=null,scene=null,camera=null,controls=null,observer=null,frame=0,revision=0,abort=null,disposed=false,applyingCamera=false;
let current=null,whole=null,lastFit=null,visibleIndices=[];
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let tap=null;const pointers=new Set();
let captureMode=false;
const landmarkPanel=createLandmarkPanel($('landmark-panel'),{onMode:enabled=>{
  captureMode=Boolean(enabled&&ready()&&current?.landmarkSources?.size);
  canvas.style.cursor=captureMode?'crosshair':'';
  return captureMode;
}});

function text(parent,value,tag='p'){const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;}
function term(dl,key,value){text(dl,key,'dt');text(dl,String(value),'dd');}
function linkTerm(dl,key,label,url){text(dl,key,'dt');const dd=document.createElement('dd'),a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';dd.append(a);dl.append(dd);}
function sourceTitle(source){return `${hraFamilyLabel(hraFamilyId(source),state.locale)} · ${t(source.variant)} · ${source.version}${source.id==='lung-male'?` (${t('older')})`:''}${source.priority==='P2'?' · P2':''}`;}
function renderCredits(){
  const host=$('credits');host.replaceChildren();const source=sources.get(state.sourceId);if(!source)return;
  const dl=document.createElement('dl');term(dl,t('reference'),source.title);term(dl,t('variant'),t(source.variant));term(dl,t('version'),source.version);
  if(source.priority==='P2')term(dl,t('sourcePriority'),t('priorityP2'));
  linkTerm(dl,t('license'),source.license,'https://creativecommons.org/licenses/by/4.0/');linkTerm(dl,t('citation'),source.doi,source.doi);linkTerm(dl,t('repository'),'Human Reference Atlas (HRA), HuBMAP','https://humanatlas.io/3d-reference-library');term(dl,t('sourceNote'),source.provenanceNote);
  if(ready())term(dl,t('auditHash'),current.audit.glb.sha256);host.append(dl);
}
function renderDetail(){
  const host=$('detail'),row=ready()?current.index.byNode.get(state.selected):null;
  host.replaceChildren();$('title').textContent=row?.label??t('select');$('meta').textContent=row?`${row.ontologyId} · ${t(row.kind)}`:'';
  if(!row){text(host,t(ready()?'selectDetail':'selectUnavailable'));return;}
  const dl=document.createElement('dl');term(dl,t('sourceEnglish'),row.label);term(dl,t('nodeName'),row.nodeName);term(dl,t('ontology'),row.ontologyId);term(dl,t('nodeIndex'),row.nodeIndex);term(dl,t('kind'),t(row.kind));term(dl,t('meshNodes'),row.meshNodeIndices.join(', '));host.append(dl);
}
function renderList(){
  const host=$('list');host.replaceChildren();const rows=ready()?filterHraRows(current.rows,$('search').value,$('type').value):[];
  $('count').textContent=`${rows.length} / ${ready()?current.rows.length:0}`;
  if(!rows.length){text(host,t(ready()?'none':'selectUnavailable'));return;}
  const fragment=document.createDocumentFragment();
  for(const row of rows){const button=document.createElement('button');button.type='button';button.className='hra-concept';button.dataset.nodeIndex=String(row.nodeIndex);button.dataset.kind=row.kind;button.setAttribute('aria-pressed',String(row.nodeIndex===state.selected));text(button,row.label,'strong');text(button,`${row.ontologyId} · ${t(row.kind)}`,'small');button.addEventListener('click',()=>choose(row.nodeIndex));fragment.append(button);}
  host.append(fragment);
}
function renderTranslation(){
  document.documentElement.lang=state.locale;
  for(const el of document.querySelectorAll('[data-hra-i18n]')){el.textContent=t(el.dataset.hraI18n);if(el.dataset.hraI18n==='maleVesselWarning')el.hidden=state.sourceId!=='blood-vasculature-male';if(['maleLungWarning','lungMaleWarning'].includes(el.dataset.hraI18n))el.hidden=state.sourceId!=='lung-male';}
  let scopeWarning=$('scope-warning');if(!scopeWarning){scopeWarning=document.createElement('p');scopeWarning.id='hra-scope-warning';scopeWarning.className='hra-discrepancy';scopeWarning.setAttribute('role','note');document.querySelector('[data-hra-i18n="registrationNote"]').after(scopeWarning);}
  scopeWarning.textContent=hraSourceScopeWarning(state.sourceId,state.locale);scopeWarning.hidden=!scopeWarning.textContent;
  let invalidWarning=$('invalid-source-warning');if(!invalidWarning){invalidWarning=document.createElement('p');invalidWarning.id='hra-invalid-source-warning';invalidWarning.className='hra-discrepancy';invalidWarning.setAttribute('role','alert');scopeWarning.after(invalidWarning);}
  invalidWarning.hidden=initialNavigation.invalidSourceRequest!==true;const invalidText=initialNavigation.invalidSourceRequest===true?t('invalidSourceNotice'):'';if(invalidWarning.textContent!==invalidText)invalidWarning.textContent=invalidText;
  for(const el of document.querySelectorAll('[data-hra-i18n-placeholder]'))el.placeholder=t(el.dataset.hraI18nPlaceholder);
  const model=$('model');model.replaceChildren();for(const family of HRA_FAMILIES){const group=document.createElement('optgroup');group.label=hraFamilyLabel(family,state.locale);for(const source of HRA_SOURCES.filter(source=>hraFamilyId(source)===family)){const option=document.createElement('option');option.value=source.id;option.textContent=sourceTitle(source);group.append(option);}model.append(group);}model.value=state.sourceId;
  // Return to the validated original atlas selection, not to a guessed match
  // for a different standalone HRA source explored after entry.
  const back=$('return-atlas');if(back)back.href=atlasReturnHref({...initialNavigation,locale:state.locale});
  status.dataset.phase=state.phase;status.dataset.source=state.sourceId;status.textContent=t(state.phase==='context-lost'?'contextLost':state.phase);
  $('error').textContent=state.phase==='unavailable'?t('missing'):state.phase==='error'?t('failure'):state.phase==='context-lost'?t('contextFailure'):'';
  renderList();renderDetail();renderCredits();sync();
}
function metrics(){
  const el=$('metrics');if(!ready()||!renderer){el.textContent=t('notMeasured');for(const key of ['cameraPosition','cameraTarget','viewDirection','cameraNear','cameraFar','cameraFov','cameraAspect','cameraProjection','cameraView'])delete el.dataset[key];return;}
  const info=renderer.info.render;el.textContent=`${t('meshCount')}: ${current.mapping.byMeshNode.size} · ${t('visible')}: ${visibleIndices.length}\n${t('triangles')}: ${info.triangles.toLocaleString(state.locale)} · ${t('calls')}: ${info.calls}`;
  el.dataset.cameraPosition=JSON.stringify(camera.position.toArray());el.dataset.cameraTarget=JSON.stringify(controls.target.toArray());el.dataset.viewDirection=state.view;
  camera.updateMatrixWorld(true);el.dataset.cameraNear=String(camera.near);el.dataset.cameraFar=String(camera.far);el.dataset.cameraFov=String(camera.fov);el.dataset.cameraAspect=String(camera.aspect);el.dataset.cameraProjection=JSON.stringify(camera.projectionMatrix.toArray());el.dataset.cameraView=JSON.stringify(camera.matrixWorldInverse.toArray());
}
function sync(){
  const active=ready(),hasSelection=active&&state.selected!==null;
  landmarkPanel.sync(active&&Boolean(current?.landmarkSources?.size),state.locale);
  for(const id of ['search','type','fit','zoom-in','zoom-out','reset'])$(id).disabled=!active;
  for(const id of ['focus','isolate','clear'])$(id).disabled=!hasSelection;
  $('isolate').setAttribute('aria-pressed',String(active&&state.isolated!==null));$('isolate').querySelector('[data-hra-i18n]').textContent=t(state.isolated!==null?'restore':'isolate');
  for(const button of buttons){button.disabled=!active;button.setAttribute('aria-pressed',String(active&&button.dataset.hraView===state.view));}
  for(const button of $('list').querySelectorAll('[data-node-index]'))button.setAttribute('aria-pressed',String(Number(button.dataset.nodeIndex)===state.selected));
  canvas.dataset.selected=active&&state.selected!==null?String(state.selected):'';canvas.dataset.isolated=active&&state.isolated!==null?String(state.isolated):'';
  canvas.dataset.visibleMeshNodes=String(active?visibleIndices.length:0);canvas.dataset.visibleNodeIndices=active?visibleIndices.join(','):'';canvas.dataset.mappedMeshNodes=String(active?current.mapping.byMeshNode.size:0);canvas.dataset.view=state.view;
  metrics();
}
function phase(next){state.phase=next;renderTranslation();}

function disposeScene(group,originals=new Map(),highlights=new Map()){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const addMaterial=material=>{if(material)materials.add(material);};
  for(const value of [...originals.values(),...highlights.values()])for(const material of Array.isArray(value)?value:[value])addMaterial(material);
  group?.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])addMaterial(material);}});
  for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}
  for(const geometry of geometries)geometry?.dispose();for(const texture of textures)texture.dispose();
}
function clearScene(){
  if(frame){cancelAnimationFrame(frame);frame=0;}
  if(current){scene?.remove(current.group);disposeScene(current.group,current.originals,current.highlights);current=null;}
  whole=null;lastFit=null;visibleIndices=[];state.selected=null;state.isolated=null;state.view='front';
  renderer?.renderLists.dispose();renderer?.clear();
}
function draw(){
  if(!ready()||disposed||!renderer||frame)return;
  frame=requestAnimationFrame(()=>{frame=0;if(!ready()||disposed)return;try{clip();renderer.render(scene,camera);metrics();}catch(error){console.warn('HRA render rejected:',error?.message);clearScene();phase('error');}});
}
function clip(){
  if(!whole)return;const sphere=whole.getBoundingSphere(new THREE.Sphere());const radius=Math.max(sphere.radius,1e-7),distance=sphere.center.distanceTo(camera.position);
  camera.near=Math.max(radius*1e-5,Math.min(radius,distance-radius*1.25));camera.far=Math.max(camera.near*10,distance+radius*4);camera.updateProjectionMatrix();
}
function fit(box,direction){
  if(!box||box.isEmpty()||!camera)return;
  const sphere=box.getBoundingSphere(new THREE.Sphere()),globalRadius=Math.max(whole?.getBoundingSphere(new THREE.Sphere()).radius??1,1e-7),radius=Math.max(sphere.radius,globalRadius*1e-4);
  const half=Math.max(0.001,Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)));
  const vector=direction??camera.position.clone().sub(controls.target);if(vector.lengthSq()<1e-20)vector.set(0,0,1);vector.normalize();const distance=radius/Math.sin(half)*1.12;
  applyingCamera=true;try{controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(vector,distance);controls.minDistance=globalRadius*1e-5;controls.maxDistance=Math.max(globalRadius*100,distance*2);controls.update();clip();lastFit=box.clone();}finally{applyingCamera=false;}draw();
}
function setView(name){if(!ready()||!axis[name])return;state.view=name;fit(lastFit??whole,new THREE.Vector3(...axis[name]));sync();}
function fitWhole(){if(ready()){fit(whole);sync();}}
function focus(){if(!ready())return;const row=current.index.byNode.get(state.selected);if(!row)return;const box=new THREE.Box3();for(const i of row.meshNodeIndices)box.union(current.boxes.get(i));fit(box);sync();}
function zoom(factor){if(!ready())return;const delta=camera.position.clone().sub(controls.target),distance=THREE.MathUtils.clamp(delta.length()*factor,controls.minDistance,controls.maxDistance);applyingCamera=true;try{camera.position.copy(controls.target).addScaledVector(delta.normalize(),distance);controls.update();clip();lastFit=null;}finally{applyingCamera=false;}sync();draw();}

function selectedMaterial(original){const clone=original.clone();if(clone.color?.isColor)clone.color.lerp(new THREE.Color(0xffbc52),.6);if(clone.emissive?.isColor){clone.emissive.setHex(0x995000);clone.emissiveIntensity=.4;}return clone;}
function applySelection(){
  if(!ready())return;
  const selected=new Set(current.index.byNode.get(state.selected)?.meshNodeIndices??[]),isolated=state.isolated!==null?new Set(current.index.byNode.get(state.isolated)?.meshNodeIndices??[]):null;
  visibleIndices=[];
  for(const [i,objects] of current.mapping.byMeshNode){
    const visible=isolated===null||isolated.has(i);if(visible)visibleIndices.push(i);
    for(const object of objects){
      // Layers filter individual renderable meshes without hiding descendants
      // of a source node that is itself a mesh plus child nodes.
      object.layers.set(visible?0:31);
      if(selected.has(i)){
        if(!current.highlights.has(object)){const original=current.originals.get(object);current.highlights.set(object,Array.isArray(original)?original.map(selectedMaterial):selectedMaterial(original));}
        object.material=current.highlights.get(object);
      }else object.material=current.originals.get(object);
    }
  }
  visibleIndices.sort((a,b)=>a-b);sync();draw();
}
function choose(index){if(!ready()||(index!==null&&!current.index.byNode.has(index)))return;Object.assign(state,selectionChange(state,index));applySelection();renderDetail();}
function isolate(){if(ready()&&state.selected!==null){Object.assign(state,isolationChange(state));applySelection();}}
function reset(){if(!ready())return;landmarkPanel.reset();choose(null);state.view='front';fit(whole,new THREE.Vector3(0,0,1));sync();}

function setupRenderer(){
  if(renderer)return;
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'default'});renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x52627b,2.3));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(2,4,3);scene.add(key);const fill=new THREE.DirectionalLight(0xdbe9ff,1.1);fill.position.set(-3,1,-2);scene.add(fill);
  camera=new THREE.PerspectiveCamera(40,1,.001,1000);camera.position.set(0,0,1);controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=true;controls.minPolarAngle=.01;controls.maxPolarAngle=Math.PI-.01;
  controls.addEventListener('change',()=>{if(!applyingCamera&&ready()){state.view='orbit';lastFit=null;sync();}draw();});
  const resize=()=>{if(!renderer)return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,r.width<600?1.5:1.75));renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(ready()&&lastFit)fit(lastFit);draw();};
  resize();observer=new ResizeObserver(resize);observer.observe(canvas);
}
async function checkDecoded(gltf,data){
  const group=gltf.scene,mapping=associateHraMeshes(group,gltf.parser.associations,data.gltfJson),index=buildHraSelectionIndex(data.gltfJson,data.rows);
  if(mapping.byMeshNode.size!==data.audit.glb.meshNodes)throw Error('Decoded source mesh-node count differs from audit');
  // Explicit source matrix is preserved exactly, including transforms that
  // would not survive matrix decomposition and recomposition as TRS.
  for(const [i,object] of mapping.nodeObjects){const matrix=data.gltfJson.nodes[i].matrix;if(matrix){object.matrix.fromArray(matrix);object.matrixAutoUpdate=false;object.matrixWorldNeedsUpdate=true;}}
  group.updateMatrixWorld(true);const bounds=new THREE.Box3(),boxes=new Map(),originals=new Map();
  for(const [i,objects] of mapping.byMeshNode){
    const box=new THREE.Box3(),sourceMesh=data.gltfJson.meshes[data.gltfJson.nodes[i].mesh];
    for(const [primitiveIndex,object] of objects.entries()){
      const primitive=sourceMesh.primitives[primitiveIndex],position=object.geometry.attributes.position,indexCount=object.geometry.index?.count;
      const expected=data.gltfJson.accessors[primitive.attributes.POSITION].count,expectedIndices=primitive.indices===undefined?undefined:data.gltfJson.accessors[primitive.indices].count;
      if(position?.count!==expected||indexCount!==expectedIndices||!object.matrixWorld.elements.every(Number.isFinite))throw Error('Decoded geometry unexpectedly differs from source');
      object.geometry.computeBoundingBox();const b=object.geometry.boundingBox?.clone().applyMatrix4(object.matrixWorld);if(!b||b.isEmpty()||![...b.min.toArray(),...b.max.toArray()].every(Number.isFinite))throw Error('Invalid decoded source geometry bounds');
      box.union(b);originals.set(object,object.material);
    }
    boxes.set(i,box);bounds.union(box);
  }
  if(bounds.isEmpty()||bounds.getSize(new THREE.Vector3()).lengthSq()===0)throw Error('Empty source geometry bounds');
  const landmarkSources=await prepareLandmarkSources(gltf,data.gltfJson,{id:data.source.id,sha256:data.audit.glb.sha256},[...mapping.byMeshNode.values()].flat());
  return {...data,bytes:null,gltfJson:null,group,mapping,index,boxes,originals,highlights:new Map(),bounds,landmarkSources};
}
async function load(id){
  if(disposed||!sources.has(id))return;
  const run=++revision;abort?.abort();abort=new AbortController();state.sourceId=id;clearScene();$('search').value='';$('type').value='all';phase('loading');let gltf=null,prepared=null;
  try{
    const data=await loadHraCandidate(id,{signal:abort.signal});if(run!==revision||disposed)return;
    const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(url.startsWith('blob:'))return url;throw Error('External HRA GLB resource blocked.');});
    const bytes=data.bytes;gltf=await new GLTFLoader(manager).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    if(run!==revision||disposed){disposeScene(gltf.scene);return;}
    prepared=await checkDecoded(gltf,data);if(run!==revision||disposed){disposeScene(gltf.scene,prepared.originals,prepared.highlights);return;}
    setupRenderer();current=prepared;whole=prepared.bounds;scene.add(prepared.group);state.phase='ready';fit(whole,new THREE.Vector3(0,0,1));applySelection();phase('ready');draw();
  }catch(error){
    if(run!==revision||disposed){if(gltf&&gltf.scene!==current?.group)disposeScene(gltf.scene);return;}
    if(gltf&&gltf.scene!==current?.group)disposeScene(gltf.scene,prepared?.originals,prepared?.highlights);clearScene();console.warn('HRA reference unavailable/rejected:',error?.message);phase(error instanceof HraAssetUnavailableError?'unavailable':'error');
  }
}
function releaseRenderer(){observer?.disconnect();observer=null;controls?.dispose();controls=null;renderer?.dispose();renderer=null;scene=null;camera=null;}
function close(){if(disposed)return;disposed=true;revision++;abort?.abort();clearScene();releaseRenderer();}

$('model').addEventListener('change',event=>load(event.target.value));$('locale').addEventListener('change',event=>{state.locale=event.target.value==='en'?'en':'nl';renderTranslation();});
$('search').addEventListener('input',renderList);$('type').addEventListener('change',renderList);
$('fit').addEventListener('click',fitWhole);$('focus').addEventListener('click',focus);$('isolate').addEventListener('click',isolate);$('reset').addEventListener('click',reset);$('clear').addEventListener('click',()=>choose(null));$('zoom-in').addEventListener('click',()=>zoom(.8));$('zoom-out').addEventListener('click',()=>zoom(1.25));for(const button of buttons)button.addEventListener('click',()=>setView(button.dataset.hraView));
canvas.addEventListener('pointerdown',event=>{pointers.add(event.pointerId);if(pointers.size>1){tap=null;return;}tap=event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY}:null;});
canvas.addEventListener('pointermove',event=>{if(tap&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>8)tap=null;});
const cancel=event=>{pointers.delete(event.pointerId);tap=null;};canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
canvas.addEventListener('pointerup',event=>{
  pointers.delete(event.pointerId);const prior=tap;tap=null;if(!ready()||!prior||pointers.size||event.pointerId!==prior.id||Math.hypot(event.clientX-prior.x,event.clientY-prior.y)>8)return;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height||event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return;pointer.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height)*2+1);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
  const objects=visibleIndices.flatMap(index=>current.mapping.byMeshNode.get(index));const hits=raycaster.intersectObjects(objects,false).filter(hit=>{const depth=-hit.point.clone().applyMatrix4(camera.matrixWorldInverse).z;return depth>=camera.near&&depth<=camera.far;}),hit=hits[0];
  if(captureMode){if(!hit){landmarkPanel.accept({error:'miss'});return;}try{landmarkPanel.accept({evidence:captureNativeLandmark(uniqueLandmarkHit(hits),current.landmarkSources)});}catch{landmarkPanel.accept({error:'unproven'});}return;}
  if(!hit)return;const i=current.mapping.meshNodeByObject.get(hit.object),row=current.index.pickRowByMeshNode.get(i);if(row!==undefined)choose(row);
});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();revision++;abort?.abort();clearScene();releaseRenderer();phase('context-lost');});
canvas.addEventListener('webglcontextrestored',()=>{if(!disposed&&state.phase==='context-lost')load(state.sourceId);});window.addEventListener('pagehide',event=>{if(!event.persisted)close();});
$('locale').value=state.locale;renderTranslation();load(state.sourceId);

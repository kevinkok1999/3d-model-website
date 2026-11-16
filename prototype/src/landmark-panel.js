import '../landmark-panel.css';

const COPY={
  nl:{title:'Bronpunt vastleggen',note:'Leg één werkelijk geraakt driehoekspunt vast in de oorspronkelijke glTF POSITION-coördinaten (mesh-lokaal, vóór node- en wereldtransformaties). Geen anatomische koppeling, registratie of overlay.',toggle:'Punt vastleggen',download:'Download bewijs (JSON)',clear:'Wis punt',idle:'Nog geen punt vastgelegd.',armed:'Tik op een zichtbaar mesh-oppervlak. Sleep om te draaien; alleen een korte tik legt een punt vast.',miss:'Geen mesh geraakt; probeer opnieuw.',hotspot:'Annotatie geraakt, geen brondriehoek. Verberg de gewrichtsankers of kies een ander punt.',unproven:'Exacte brondriehoek niet bewijsbaar; geen punt opgeslagen.',unavailable:'Bronpunt vastleggen niet beschikbaar voor dit model.',captured:'Punt vastgelegd (mesh-lokale POSITION):'},
  en:{title:'Capture source point',note:'Capture one actual triangle hit in original glTF POSITION coordinates (mesh-local, before node and world transforms). No anatomical correspondence, registration or overlay.',toggle:'Capture point',download:'Download evidence (JSON)',clear:'Clear point',idle:'No point captured yet.',armed:'Tap a visible mesh surface. Drag to orbit; only a short tap captures a point.',miss:'No mesh hit; try again.',hotspot:'Annotation hit, not a source triangle. Hide joint anchors or pick another point.',unproven:'Exact source triangle could not be proven; no point saved.',unavailable:'Source point capture unavailable for this model.',captured:'Point captured (mesh-local POSITION):'},
};

// One evidence record per export, intentionally not paired to another source.
export function createLandmarkPanel(root,{onMode}){
  const find=selector=>root.querySelector(selector);
  const toggle=find('[data-capture-toggle]'),download=find('[data-capture-download]'),clear=find('[data-capture-clear]'),status=find('[data-capture-status]');
  let locale='nl',available=false,armed=false,evidence=null,message='idle';
  function render(){
    const copy=COPY[locale];
    for(const el of root.querySelectorAll('[data-capture-copy]'))if(el.textContent!==copy[el.dataset.captureCopy])el.textContent=copy[el.dataset.captureCopy];
    toggle.disabled=!available;toggle.setAttribute('aria-pressed',String(armed));download.disabled=!evidence;clear.disabled=!evidence&&!armed;
    root.dataset.captureState=available?message:'unavailable';root.dataset.captureCount=evidence?'1':'0';
    const statusText=!available?copy.unavailable:message==='captured'&&evidence?`${copy.captured} [${evidence.point.join(', ')}] · ${evidence.asset.id} · node ${evidence.nodeIndex} / mesh ${evidence.meshIndex} / primitive ${evidence.primitiveIndex} / triangle ${evidence.triangleIndex}`:copy[message];
    if(status.textContent!==statusText)status.textContent=statusText;
  }
  function reset(){armed=false;evidence=null;message='idle';onMode(false);render();}
  toggle.addEventListener('click',()=>{if(!available)return;if(armed){armed=false;onMode(false);message=evidence?'captured':'idle';}else{evidence=null;armed=onMode(true)!==false;message=armed?'armed':'unavailable';}render();});
  clear.addEventListener('click',reset);
  download.addEventListener('click',()=>{if(!evidence)return;const blob=new Blob([JSON.stringify(evidence,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${evidence.asset.id}-native-landmark.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  render();
  return {
    sync(nextAvailable,nextLocale){locale=nextLocale==='en'?'en':'nl';if(!nextAvailable&&(armed||evidence)){reset();}available=Boolean(nextAvailable);render();},
    accept(result){if(!available||!armed)return;evidence=result.evidence??null;message=evidence?'captured':result.error??'unproven';if(evidence){armed=false;onMode(false);}render();},
    reset,
  };
}

import catalog from 'open-anatomy-3d/catalog.json' with {type:'json'};
import inventory from '../../model-audit/hra-phase6-candidates.json' with {type:'json'};

// Navigation hints only: a core source record may be related to a separately
// reviewed HRA reference family. Never a mesh/ontology equality, laterality
// match, clinical claim or source coordinate-registration mapping.
const families=new Map(Object.entries({
  aorta:'blood-vasculature',arteries_abdomen:'blood-vasculature',arteries_thorax:'blood-vasculature',arteries_head:'blood-vasculature',
  arteries_arm_l:'blood-vasculature',arteries_arm_r:'blood-vasculature',arteries_leg_l:'blood-vasculature',arteries_leg_r:'blood-vasculature',
  arteries_pelvis:'blood-vasculature',carotid_l:'blood-vasculature',carotid_r:'blood-vasculature',coronary_arteries:'blood-vasculature',
  vena_cava_inferior:'blood-vasculature',vena_cava_superior:'blood-vasculature',pulmonary_vessels:'blood-vasculature',
  veins_abdomen:'blood-vasculature',veins_thorax:'blood-vasculature',veins_arm_l:'blood-vasculature',veins_arm_r:'blood-vasculature',
  veins_leg_l:'blood-vasculature',veins_leg_r:'blood-vasculature',veins_pelvis:'blood-vasculature',
  brain:'brain',brainstem:'brain',cerebellum:'brain',heart:'heart',liver:'liver',lung_l:'lung',lung_r:'lung',
  small_intestine:'small-intestine',spinal_cord:'spinal-cord',pelvis:'pelvis',colon:'large-intestine',appendix:'large-intestine',
  pancreas:'pancreas',spleen:'spleen',prostate:'prostate',
}));
const baseKeys=new Map(catalog.map(row=>[row.key,row]));
const bySource=new Map(inventory.sources.map(row=>[row.id,row]));
const DEFAULT_HRA='blood-vasculature-female',DEFAULT_CORE_VARIANT='male';
const validVariant=variant=>variant==='male'||variant==='female';
const validLocale=locale=>locale==='nl'||locale==='en';
const localeOrDefault=locale=>validLocale(locale)?locale:'nl';
const eligible=(key,variant)=>validVariant(variant)&&baseKeys.has(key)&&(!baseKeys.get(key).sex||baseKeys.get(key).sex===variant);

export function relatedHraSource(key,variant){
  if(!eligible(key,variant))return null;
  const family=families.get(key);if(!family)return null;
  const id=`${family}-${variant}`,source=bySource.get(id);
  return source?.variant===variant?id:null;
}

const matchedContext=(sourceId,variant,key)=>typeof sourceId==='string'&&bySource.has(sourceId)&&relatedHraSource(key,variant)===sourceId;
function params(search){return new URLSearchParams(typeof search==='string'?search:'');}
function unique(query,key){const values=query.getAll(key);return values.length===1?values[0]:null;}

export function hraReferenceHref(sourceId,locale='nl',context){
  if(!bySource.has(sourceId)||!validLocale(locale))throw new RangeError('Unknown HRA source or locale');
  const query=new URLSearchParams({source:sourceId,lang:locale});
  if(context!==undefined){
    const {returnVariant,returnKey}=context??{};
    if(!matchedContext(sourceId,returnVariant,returnKey))throw new RangeError('Return context does not match the related HRA reference');
    query.set('returnVariant',returnVariant);query.set('returnKey',returnKey);
  }
  return `./hra-candidate.html?${query}`;
}

export function parseHraReferenceQuery(search){
  const query=params(search),requested=unique(query,'source');
  // Version selection is unsupported: source IDs represent one exact pinned
  // release. Never silently reinterpret a requested blocked/unknown release.
  const invalidSourceRequest=query.has('version')||(query.has('source')&&!bySource.has(requested));
  const sourceId=!invalidSourceRequest&&bySource.has(requested)?requested:DEFAULT_HRA;
  const locale=localeOrDefault(unique(query,'lang')),result={sourceId,locale};
  if(invalidSourceRequest){result.invalidSourceRequest=true;return result;}
  const returnVariant=unique(query,'returnVariant'),returnKey=unique(query,'returnKey');
  // Missing/invalid/duplicate source must never accidentally authorize a return
  // to a matching default source; accept context only for an explicit valid ID.
  if(requested===sourceId&&matchedContext(sourceId,returnVariant,returnKey))Object.assign(result,{returnVariant,returnKey});
  return result;
}

export function parseAtlasReferenceQuery(search){
  const query=params(search),requested=unique(query,'variant'),variant=validVariant(requested)?requested:DEFAULT_CORE_VARIANT;
  const locale=localeOrDefault(unique(query,'lang')),key=unique(query,'key');
  return {variant,locale,key:requested===variant&&eligible(key,variant)?key:null};
}

export function atlasReturnHref({sourceId,locale='nl',returnVariant,returnKey}={}){
  const query=new URLSearchParams();
  if(matchedContext(sourceId,returnVariant,returnKey)){query.set('variant',returnVariant);query.set('key',returnKey);}
  query.set('lang',localeOrDefault(locale));
  return `./index.html?${query}`;
}

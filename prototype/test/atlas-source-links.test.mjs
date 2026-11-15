import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../../model-audit/upstream-catalog.local.json' with {type:'json'};
import inventory from '../../model-audit/hra-phase6-candidates.json' with {type:'json'};
import {relatedHraSource,hraReferenceHref,parseHraReferenceQuery,parseAtlasReferenceQuery,atlasReturnHref} from '../src/atlas-source-links.js';

const families={aorta:'blood-vasculature',brain:'brain',brainstem:'brain',cerebellum:'brain',heart:'heart',liver:'liver',lung_l:'lung',lung_r:'lung',small_intestine:'small-intestine',spinal_cord:'spinal-cord',pelvis:'pelvis',colon:'large-intestine',appendix:'large-intestine',pancreas:'pancreas',spleen:'spleen'};
const defaultHra={sourceId:'blood-vasculature-female',locale:'nl'};

test('Every explicit supported family uses the exact pinned source of the chosen base variant',()=>{
  for(const [key,family] of Object.entries(families))for(const variant of ['male','female'])assert.equal(relatedHraSource(key,variant),`${family}-${variant}`);
  for(const row of catalog.filter(x=>x.system==='vessels'))for(const variant of ['male','female'])assert.equal(relatedHraSource(row.key,variant),`blood-vasculature-${variant}`);
  assert.equal(relatedHraSource('prostate','male'),'prostate-male');assert.equal(relatedHraSource('prostate','female'),null);
  const mapped=new Set(catalog.flatMap(row=>['male','female'].map(v=>relatedHraSource(row.key,v))).filter(Boolean));
  assert.deepEqual([...mapped].sort(),inventory.sources.map(x=>x.id).sort());assert.equal(mapped.size,23);
});

test('Unsupported scope and mismatched sex never become guessed navigation',()=>{
  for(const key of ['kidney_l','kidney_r','uterus','ovary_l','reproductive','cranial_nerves','bronchi','larynx','trachea','hip_l','pelvic_floor','gallbladder','adrenal_l','deltoid_l','unknown','toString','Heart'])for(const variant of ['female','male'])assert.equal(relatedHraSource(key,variant),null);
  assert.equal(relatedHraSource('heart','unknown'),null);assert.equal(relatedHraSource(null,'female'),null);
});

test('HRA links are relative exact allowed source IDs and locale, no arbitrary path or blocked version',()=>{
  assert.equal(hraReferenceHref('lung-male','en'),'./hra-candidate.html?source=lung-male&lang=en');
  for(const id of ['kidney-male-left','uterus-female','lung-male-v1.4','https://example.org','../unsafe'])assert.throws(()=>hraReferenceHref(id,'nl'));
  assert.throws(()=>hraReferenceHref('lung-male','de'));
  assert.deepEqual(parseHraReferenceQuery('?source=lung-male&lang=en&version=v1.4'),{...defaultHra,locale:'en',invalidSourceRequest:true});
  assert.equal(inventory.sources.find(x=>x.id==='lung-male').version,'v1.3');
  assert.deepEqual(parseHraReferenceQuery('?source=lung-male-v1.4&lang=de'),{...defaultHra,invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?source=heart-female&source=brain-male&lang=en&lang=nl'),{...defaultHra,invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?source=%ZZ&lang=en'),{...defaultHra,locale:'en',invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?source=kidney-male-left'),{...defaultHra,invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?source='),{...defaultHra,invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?version=v1.3&version=v1.4&source=lung-male'),{...defaultHra,invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?version=v1.3'),{...defaultHra,invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery(''),defaultHra);
});

test('Return context is exact same-source navigation and never an external URL',()=>{
  const href=hraReferenceHref('heart-male','en',{returnVariant:'male',returnKey:'heart'});
  assert.equal(href,'./hra-candidate.html?source=heart-male&lang=en&returnVariant=male&returnKey=heart');
  const parsed=parseHraReferenceQuery(href.split('?')[1]);assert.deepEqual(parsed,{sourceId:'heart-male',locale:'en',returnVariant:'male',returnKey:'heart'});
  assert.equal(atlasReturnHref(parsed),'./index.html?variant=male&key=heart&lang=en');
  for(const context of [{returnVariant:'female',returnKey:'heart'},{returnVariant:'male',returnKey:'brain'},{returnVariant:'male',returnKey:'prostate'},{returnVariant:'male',returnKey:'../outside'},{returnVariant:'male'}])assert.throws(()=>hraReferenceHref('heart-male','en',context));
  assert.deepEqual(parseHraReferenceQuery('?source=heart-male&lang=en&returnVariant=female&returnKey=heart'),{sourceId:'heart-male',locale:'en'});
  assert.deepEqual(parseHraReferenceQuery('?source=heart-male&source=brain-male&lang=en&returnVariant=female&returnKey=aorta'),{...defaultHra,locale:'en',invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?source=lung-male&version=v1.3&lang=en&returnVariant=male&returnKey=lung_l'),{...defaultHra,locale:'en',invalidSourceRequest:true});
  assert.deepEqual(parseHraReferenceQuery('?source=heart-male&returnVariant=male&returnKey=heart&returnKey=brain'),{sourceId:'heart-male',locale:'nl'});
  assert.equal(atlasReturnHref({...parsed,sourceId:'brain-male'}),'./index.html?lang=en');
});

test('Core query only restores exact variant-eligible key; duplicates and malformed input fail safely',()=>{
  assert.deepEqual(parseAtlasReferenceQuery('?variant=female&key=lung_l&lang=en'),{variant:'female',locale:'en',key:'lung_l'});
  assert.deepEqual(parseAtlasReferenceQuery('?variant=female&key=prostate&lang=nl'),{variant:'female',locale:'nl',key:null});
  assert.deepEqual(parseAtlasReferenceQuery('?variant=female&variant=male&key=ovary_l&lang=de'),{variant:'male',locale:'nl',key:null});
  assert.deepEqual(parseAtlasReferenceQuery('?variant=male&key=heart&key=brain&lang=en'),{variant:'male',locale:'en',key:null});
  assert.deepEqual(parseAtlasReferenceQuery(''),{variant:'male',locale:'nl',key:null});
});

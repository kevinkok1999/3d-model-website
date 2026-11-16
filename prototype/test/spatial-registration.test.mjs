import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSpatialLandmarks, applySpatialTransform } from '../../model-audit/spatial-registration.mjs';

const near=(actual,expected,tol=1e-9)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} differs from ${expected} by > ${tol}`);
const nearVector=(actual,expected,tol)=>actual.forEach((n,i)=>near(n,expected[i],tol));
const nearMatrix=(actual,expected,tol)=>actual.forEach((row,i)=>nearVector(row,expected[i],tol));
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const multiply=(a,b)=>a.map(row=>b[0].map((_,i)=>dot(row,b.map(r=>r[i]))));
const rotation=(a,b,c)=>{
  const rx=[[1,0,0],[0,Math.cos(a),-Math.sin(a)],[0,Math.sin(a),Math.cos(a)]];
  const ry=[[Math.cos(b),0,Math.sin(b)],[0,1,0],[-Math.sin(b),0,Math.cos(b)]];
  const rz=[[Math.cos(c),-Math.sin(c),0],[Math.sin(c),Math.cos(c),0],[0,0,1]];
  return multiply(multiply(rz,ry),rx);
};
const points=[[0,0,0],[20,0,0],[0,30,0],[0,0,40],[20,30,40],[-10,30,20],[40,-15,22],[-7,-8,-9],[32,11,-19],[-8,49,-13],[29,-7,51],[-61,54,4]];
const R=rotation(.71,-1.19,2.01),s=1.17,t=[45,-13,67],factor={mm:1,cm:10,m:1000};
const map=(p,rot=R,scale=s,translation=t)=>rot.map((row,i)=>scale*dot(row,p)+translation[i]);
function request({sourceUnit='mm',targetUnit='mm',rot=R,scale=s,translation=t,sourcePoints=points}={}){
  const rows=sourcePoints.map((p,i)=>({id:`L${String(i).padStart(2,'0')}`,source:p.map(n=>n/factor[sourceUnit]),target:map(p,rot,scale,translation).map(n=>n/factor[targetUnit])}));
  return {source:{id:'synthetic-source',sha256:'a'.repeat(64),unit:sourceUnit},target:{id:'synthetic-target',sha256:'b'.repeat(64),unit:targetUnit},fitLandmarks:rows.slice(0,6),validationLandmarks:rows.slice(6),thresholds:{fitRmsMm:1e-5,fitMaxMm:1e-5,validationRmsMm:1e-5,validationMaxMm:1e-5,minScale:.1,maxScale:10}};
}

test('recovers an exact arbitrary 3-axis proper similarity, mixed physical units and unseen point',()=>{
  const input=request({sourceUnit:'cm',targetUnit:'m'}),snapshot=structuredClone(input);
  const result=registerSpatialLandmarks(input);
  assert.equal(result.status,'TECHNICAL_LANDMARK_REGISTRATION_PASS');
  assert.deepEqual(result.source,input.source);assert.deepEqual(result.target,input.target);
  assert.equal(result.sourceBytesVerified,false);assert.equal(result.anatomicallyValidated,false);assert.equal(result.mergeAuthorized,false);
  assert.deepEqual(result.failures,[]);assert.match(result.evidenceSha256,/^[a-f0-9]{64}$/);
  nearMatrix(result.transform.rotation,R,1e-10);near(result.transform.scale,s);nearVector(result.transform.translationMm,t);
  near(result.fit.rmsMm,0);near(result.validation.rmsMm,0);
  assert.equal(result.fit.count,6);assert.equal(result.validation.count,6);
  const unseen=[31,92,-71];nearVector(applySpatialTransform(result.transform,unseen.map(n=>n/10)),map(unseen).map(n=>n/1000),1e-12);
  assert.deepEqual(input,snapshot,'registration must not mutate supplied coordinates');
});

test('proper rotation solution is stable for identity, near-180 degrees, opposing axes and varied isotropic scales',()=>{
  for(const [angles,scale] of [[[0,0,0],1],[[Math.PI,0,0],.23],[[0,Math.PI-1e-10,Math.PI],3.6],[[2.5,-1.1,.03],.75],[[.8,.6,-1.2],2.1]]){
    const rot=rotation(...angles),translation=[9.3,15.7,-11.4],result=registerSpatialLandmarks(request({rot,scale,translation}));
    assert.equal(result.status,'TECHNICAL_LANDMARK_REGISTRATION_PASS');nearMatrix(result.transform.rotation,rot,1e-9);near(result.transform.scale,scale);nearVector(result.transform.translationMm,translation);
  }
});

test('deterministic numerical stress: 40 independently generated full-rank exact transforms',()=>{
  let seed=91374;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let i=0;i<40;i++){
    const rot=rotation(...Array.from({length:3},()=>2*Math.PI*(random()-.5))),scale=.2+4*random(),translation=Array.from({length:3},()=>300*(random()-.5));
    const sourcePoints=Array.from({length:12},()=>Array.from({length:3},()=>500*(random()-.5)));
    const result=registerSpatialLandmarks(request({rot,scale,translation,sourcePoints}));
    assert.equal(result.status,'TECHNICAL_LANDMARK_REGISTRATION_PASS');nearMatrix(result.transform.rotation,rot,1e-9);near(result.transform.scale,scale);nearVector(result.transform.translationMm,translation,1e-8);
  }
});

test('correspondence order is deterministic, and held-out data cannot alter the fitted transform',()=>{
  const input=request(),first=registerSpatialLandmarks(input);
  const shuffled=structuredClone(input);shuffled.fitLandmarks.reverse();shuffled.validationLandmarks.reverse();
  assert.deepEqual(registerSpatialLandmarks(shuffled),first);
  const corrupted=structuredClone(input);corrupted.validationLandmarks[0].target[0]+=8;
  const second=registerSpatialLandmarks(corrupted);
  assert.deepEqual(second.transform,first.transform);assert.deepEqual(second.fit,first.fit);
  assert.notEqual(second.evidenceSha256,first.evidenceSha256);
  assert.equal(second.status,'BLOCKED');assert.deepEqual(second.failures,['VALIDATION_RMS_EXCEEDS_THRESHOLD','VALIDATION_MAX_EXCEEDS_THRESHOLD']);
});

test('no silent outlier removal, non-similarity fit and scale-limit violations are explicitly blocked',()=>{
  const input=request();input.fitLandmarks[0].target[0]+=2;
  const result=registerSpatialLandmarks(input);
  assert.equal(result.status,'BLOCKED');assert.ok(result.failures.includes('FIT_RMS_EXCEEDS_THRESHOLD'));assert.ok(result.failures.includes('FIT_MAX_EXCEEDS_THRESHOLD'));
  assert.equal(result.fit.landmarks.length,6);assert.ok(result.fit.landmarks.some(x=>x.id==='L00'));
  const scale=request();scale.thresholds.minScale=.9;scale.thresholds.maxScale=1.01;
  const limited=registerSpatialLandmarks(scale);assert.equal(limited.status,'BLOCKED');assert.deepEqual(limited.failures,['SCALE_OUTSIDE_THRESHOLD']);
});

test('fit and held-out reflection both fail closed rather than correcting handedness',()=>{
  for(const key of ['fitLandmarks','validationLandmarks']){
    const input=request();for(const row of input[key])row.target[0]*=-1;
    assert.throws(()=>registerSpatialLandmarks(input),/reflection|handedness/);
  }
  const result=registerSpatialLandmarks(request());const invalid=structuredClone(result.transform);invalid.rotation[0]=invalid.rotation[0].map(n=>-n);
  assert.throws(()=>applySpatialTransform(invalid,[1,2,3]),/proper|reflection/);
});

test('insufficient, coplanar, near-collinear and ill-conditioned landmark sets are rejected by both partitions',()=>{
  for(const key of ['fitLandmarks','validationLandmarks']){
    let input=request();input[key]=input[key].slice(0,3);assert.throws(()=>registerSpatialLandmarks(input),/require 4/);
    input=request();input[key]=input[key].map((row,i)=>({...row,source:[100+i*7,100+i*11,100],target:map([100+i*7,100+i*11,100])}));
    assert.throws(()=>registerSpatialLandmarks(input),/degenerate|coplanar|collinear/);
    input=request();input[key]=input[key].map((row,i)=>({...row,source:[100+i*10,100+i*1e-7,100+i*i*1e-8],target:map([100+i*10,100+i*1e-7,100+i*i*1e-8])}));
    assert.throws(()=>registerSpatialLandmarks(input),/degenerate|coplanar|collinear/);
  }
});

test('rejects undisclosed units, malformed provenance, reused landmarks, bounds and nonfinite values',()=>{
  const mutate=fn=>{const input=request();fn(input);return input};
  for(const fn of [x=>delete x.source.unit,x=>x.target.unit='unknown',x=>x.source.unit='toString'])assert.throws(()=>registerSpatialLandmarks(mutate(fn)),/unit/);
  for(const fn of [x=>x.source.sha256='bogus',x=>delete x.target.sha256,x=>x.source.id='',x=>x.source.id='  label'])assert.throws(()=>registerSpatialLandmarks(mutate(fn)),/ID|SHA-256/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>x.target={...x.source})),/separately identified/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>x.validationLandmarks[0].id=x.fitLandmarks[0].id)),/Duplicate landmark ID/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>x.validationLandmarks[0].source=[...x.fitLandmarks[0].source])),/Repeated source coordinate/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>x.validationLandmarks[0].target=[...x.fitLandmarks[0].target])),/Repeated target coordinate/);
  for(const value of [NaN,Infinity,'1',null])assert.throws(()=>registerSpatialLandmarks(mutate(x=>x.fitLandmarks[0].source[0]=value)),/finite 3D coordinate/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>delete x.fitLandmarks[0].source[1])),/finite 3D coordinate/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>delete x.fitLandmarks[0])),/missing correspondence/);
  assert.throws(()=>registerSpatialLandmarks(mutate(x=>x.fitLandmarks[0].source[0]=1e20)),/bounded millimeter/);
  for(const fn of [x=>delete x.thresholds,x=>x.thresholds.fitMaxMm=Infinity,x=>x.thresholds.validationRmsMm=0,x=>x.thresholds.minScale=11,x=>x.thresholds.fitRmsMm=100,x=>x.thresholds.extra=1])assert.throws(()=>registerSpatialLandmarks(mutate(fn)),/thresholds/);
});

// Deterministic landmark-only registration. This module never reads geometry,
// mutates source coordinates, claims anatomy validity, or authorizes merging.
import { createHash } from 'node:crypto';

const UNIT_MM=Object.freeze({mm:1,cm:10,m:1000});
const MAX_LANDMARKS=4096;
const MAX_ABS_MM=1e7;
const MIN_SPREAD_MM=1e-6;
const MIN_CONDITION_RATIO=1e-8;
const THRESHOLD_KEYS=['fitRmsMm','fitMaxMm','validationRmsMm','validationMaxMm','minScale','maxScale'];
const fail=message=>{throw new Error(message)};
const need=(condition,message)=>{if(!condition)fail(message)};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const vector=v=>Array.isArray(v)&&v.length===3&&finite(v[0])&&finite(v[1])&&finite(v[2]);
const positive=n=>finite(n)&&n>0;
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const subtract=(a,b)=>a.map((n,i)=>n-b[i]);
const matVec=(m,v)=>m.map(row=>dot(row,v));
const norm=v=>Math.hypot(...v);
const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identifier=id=>typeof id==='string'&&id.length>0&&id.length<=200&&id.trim()===id&&!/[\x00-\x1f\x7f]/.test(id);
const hasUnit=unit=>typeof unit==='string'&&Object.hasOwn(UNIT_MM,unit);

function identity(asset,label){
  need(asset&&identifier(asset.id)&&typeof asset.sha256==='string'&&/^[a-f0-9]{64}$/.test(asset.sha256),`${label} must declare an ID and lowercase source SHA-256`);
  need(hasUnit(asset.unit),`${label} unit must be explicitly mm, cm or m`);
  return {id:asset.id,sha256:asset.sha256,unit:asset.unit};
}

function millimeters(v,unit,label){
  need(vector(v),`${label} must be a finite 3D coordinate`);
  const result=v.map(n=>n*UNIT_MM[unit]);
  need(result.every(n=>Number.isFinite(n)&&Math.abs(n)<=MAX_ABS_MM),`${label} exceeds the bounded millimeter coordinate range`);
  return result;
}

function thresholdsOf(input){
  need(input&&Object.keys(input).length===THRESHOLD_KEYS.length&&THRESHOLD_KEYS.every(key=>Object.hasOwn(input,key)&&positive(input[key])),'Explicit positive finite fit/validation residual and scale thresholds are required');
  const t=Object.fromEntries(THRESHOLD_KEYS.map(key=>[key,input[key]]));
  need(t.fitRmsMm<=t.fitMaxMm&&t.validationRmsMm<=t.validationMaxMm&&t.minScale<=t.maxScale,'Inconsistent RMS/max residual or scale thresholds');
  return t;
}

function landmarks(rows,label,source,target,seen){
  need(Array.isArray(rows)&&rows.length>=4&&rows.length<=MAX_LANDMARKS,`${label} require 4–${MAX_LANDMARKS} correspondences`);
  need(Array.from({length:rows.length},(_,i)=>Object.hasOwn(rows,i)).every(Boolean),`${label} contain missing correspondence rows`);
  const result=rows.map(row=>{
    need(row&&identifier(row.id),`${label} has an invalid landmark ID`);
    need(!seen.ids.has(row.id),`Duplicate landmark ID across fit/validation: ${row.id}`);
    seen.ids.add(row.id);
    const p=millimeters(row.source,source.unit,`Source landmark ${row.id}`),q=millimeters(row.target,target.unit,`Target landmark ${row.id}`);
    for(const [point,set,kind] of [[p,seen.source,'source'],[q,seen.target,'target']]){
      const key=JSON.stringify(point);
      need(!set.has(key),`Repeated ${kind} coordinate across fit/validation: ${row.id}`);
      set.add(key);
    }
    return {id:row.id,sourceMm:p,targetMm:q};
  });
  // Sorting by code point makes accumulation and evidence reproducible even if
  // a supplied correspondence list has a different order.
  result.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  return result;
}

// Jacobi diagonalization for tiny real symmetric matrices (3x3 scatter and
// 4x4 Horn matrices). A scaled matrix avoids absolute-tolerance dependence.
function symmetricEigen(input){
  const n=input.length,scale=Math.max(...input.flat().map(Math.abs));
  need(positive(scale),'Degenerate eigenproblem');
  const a=input.map(row=>row.map(x=>x/scale)),v=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
  let converged=false;
  for(let iteration=0;iteration<200;iteration++){
    let p=0,q=1,largest=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>largest){largest=Math.abs(a[i][j]);p=i;q=j;}
    if(largest<=1e-15){converged=true;break;}
    const app=a[p][p],aqq=a[q][q],apq=a[p][q];
    const angle=0.5*Math.atan2(2*apq,aqq-app),c=Math.cos(angle),s=Math.sin(angle);
    for(let k=0;k<n;k++)if(k!==p&&k!==q){const kp=a[k][p],kq=a[k][q];a[k][p]=a[p][k]=c*kp-s*kq;a[k][q]=a[q][k]=s*kp+c*kq;}
    a[p][p]=c*c*app-2*s*c*apq+s*s*aqq;
    a[q][q]=s*s*app+2*s*c*apq+c*c*aqq;
    a[p][q]=a[q][p]=0;
    for(let k=0;k<n;k++){const kp=v[k][p],kq=v[k][q];v[k][p]=c*kp-s*kq;v[k][q]=s*kp+c*kq;}
  }
  need(converged,'Symmetric eigenproblem did not converge');
  return Array.from({length:n},(_,i)=>({value:a[i][i]*scale,vector:v.map(row=>row[i])})).sort((a,b)=>b.value-a.value);
}

function centered(rows,key,label){
  const mean=[0,0,0];
  for(const row of rows)for(let i=0;i<3;i++)mean[i]+=row[key][i]/rows.length;
  const points=rows.map(row=>subtract(row[key],mean));
  const scatter=Array.from({length:3},()=>[0,0,0]);
  for(const p of points)for(let i=0;i<3;i++)for(let j=0;j<3;j++)scatter[i][j]+=p[i]*p[j];
  const energy=scatter[0][0]+scatter[1][1]+scatter[2][2];
  need(positive(energy)&&Math.sqrt(energy/rows.length)>=MIN_SPREAD_MM,`${label} is degenerate: insufficient spatial spread`);
  const eigen=symmetricEigen(scatter),ratio=eigen[2].value/eigen[0].value;
  need(finite(ratio)&&ratio>=MIN_CONDITION_RATIO,`${label} is degenerate: coplanar, collinear or ill-conditioned landmarks`);
  return {mean,points,energy,conditionRatio:ratio};
}

function correspondenceGeometry(rows,label){
  const source=centered(rows,'sourceMm',`${label} source`),target=centered(rows,'targetMm',`${label} target`);
  const cross=Array.from({length:3},()=>[0,0,0]);
  for(let k=0;k<rows.length;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)cross[i][j]+=source.points[k][i]*target.points[k][j];
  const crossScale=Math.max(...cross.flat().map(Math.abs));
  need(positive(crossScale),`${label} cross-covariance is degenerate`);
  const normalized=cross.map(row=>row.map(n=>n/crossScale)),orientation=det(normalized);
  need(finite(orientation)&&Math.abs(orientation)>=MIN_CONDITION_RATIO**2,`${label} cross-covariance is degenerate or orientation ambiguous`);
  // A negative cross-covariance determinant gives an orientation-reversing
  // unconstrained orthogonal fit. Do not quietly correct or fit a reflection.
  need(orientation>0,`${label} reflection or reversed handedness detected`);
  return {source,target,cross};
}

function quaternionRotation(cross){
  const [[xx,xy,xz],[yx,yy,yz],[zx,zy,zz]]=cross;
  const h=[
    [xx+yy+zz,yz-zy,zx-xz,xy-yx],
    [yz-zy,xx-yy-zz,xy+yx,zx+xz],
    [zx-xz,xy+yx,-xx+yy-zz,yz+zy],
    [xy-yx,zx+xz,yz+zy,-xx-yy+zz],
  ];
  const eig=symmetricEigen(h);
  need(eig[0].value-eig[1].value>Math.abs(eig[0].value)*1e-12,'Orientation solution is degenerate');
  const magnitude=norm(eig[0].vector);
  need(positive(magnitude),'Invalid optimal quaternion');
  const [w,x,y,z]=eig[0].vector.map(n=>n/magnitude);
  return [
    [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
    [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
    [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)],
  ];
}

function properRotation(rotation){
  need(Array.isArray(rotation)&&rotation.length===3&&vector(rotation[0])&&vector(rotation[1])&&vector(rotation[2]),'Invalid 3D rotation matrix');
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)need(Math.abs(dot(rotation[i],rotation[j])-(i===j?1:0))<=1e-10,'Rotation matrix must be orthonormal');
  need(Math.abs(det(rotation)-1)<=1e-10,'Rotation matrix must be proper (determinant +1, no reflection)');
}

function transformMm(transform,p){return matVec(transform.rotation,p).map((n,i)=>transform.scale*n+transform.translationMm[i]);}

// Transform a source-native coordinate to the declared target-native unit.
// Translation stored in transform is always millimeters; scale is unitless.
export function applySpatialTransform(transform,sourcePoint){
  need(transform&&positive(transform.scale)&&vector(transform.translationMm)&&hasUnit(transform.sourceUnit)&&hasUnit(transform.targetUnit),'Invalid similarity transform or unit declaration');
  properRotation(transform.rotation);
  const result=transformMm(transform,millimeters(sourcePoint,transform.sourceUnit,'Source point')).map(n=>n/UNIT_MM[transform.targetUnit]);
  need(vector(result),'Non-finite transformed coordinate');
  return result;
}

function fitTransform(fitGeometry,sourceUnit,targetUnit){
  const {source,target,cross}=fitGeometry,rotation=quaternionRotation(cross);
  properRotation(rotation);
  // Least-squares scale for a proper rotation; target/source coordinates
  // are already converted to the same physical unit.
  let numerator=0;
  for(let k=0;k<source.points.length;k++)numerator+=dot(target.points[k],matVec(rotation,source.points[k]));
  const scale=numerator/source.energy;
  need(positive(scale),'Invalid or nonpositive similarity scale');
  const translationMm=target.mean.map((n,i)=>n-scale*matVec(rotation,source.mean)[i]);
  need(vector(translationMm),'Non-finite similarity translation');
  return {rotation,scale,translationMm,sourceUnit,targetUnit};
}

function residuals(rows,transform,geometry){
  let squared=0,maxMm=0;
  const points=rows.map(row=>{
    const predicted=transformMm(transform,row.sourceMm),error=norm(subtract(predicted,row.targetMm));
    need(finite(error),'Non-finite landmark residual');
    squared+=error*error;maxMm=Math.max(maxMm,error);
    return {id:row.id,errorMm:error};
  });
  const rmsMm=Math.sqrt(squared/rows.length);
  need(finite(rmsMm),'Non-finite RMS residual');
  return {count:rows.length,rmsMm,maxMm,sourceConditionRatio:geometry.source.conditionRatio,targetConditionRatio:geometry.target.conditionRatio,landmarks:points};
}

export function registerSpatialLandmarks(input){
  need(input&&typeof input==='object','Registration request is missing');
  const source=identity(input.source,'Source'),target=identity(input.target,'Target');
  need(source.id!==target.id||source.sha256!==target.sha256,'Source and target must be separately identified');
  const thresholds=thresholdsOf(input.thresholds),seen={ids:new Set(),source:new Set(),target:new Set()};
  const fit=landmarks(input.fitLandmarks,'Fit landmarks',source,target,seen),validation=landmarks(input.validationLandmarks,'Held-out validation landmarks',source,target,seen);
  // The fit is finalized before held-out geometry is inspected. Validation
  // never adjusts rotation, scale, translation, or the training membership.
  const fitGeometry=correspondenceGeometry(fit,'Fit'),transform=fitTransform(fitGeometry,source.unit,target.unit);
  const fitMetrics=residuals(fit,transform,fitGeometry);
  const validationGeometry=correspondenceGeometry(validation,'Held-out validation');
  const validationMetrics=residuals(validation,transform,validationGeometry);
  const failures=[];
  if(fitMetrics.rmsMm>thresholds.fitRmsMm)failures.push('FIT_RMS_EXCEEDS_THRESHOLD');
  if(fitMetrics.maxMm>thresholds.fitMaxMm)failures.push('FIT_MAX_EXCEEDS_THRESHOLD');
  if(validationMetrics.rmsMm>thresholds.validationRmsMm)failures.push('VALIDATION_RMS_EXCEEDS_THRESHOLD');
  if(validationMetrics.maxMm>thresholds.validationMaxMm)failures.push('VALIDATION_MAX_EXCEEDS_THRESHOLD');
  if(transform.scale<thresholds.minScale||transform.scale>thresholds.maxScale)failures.push('SCALE_OUTSIDE_THRESHOLD');
  return {status:failures.length?'BLOCKED':'TECHNICAL_LANDMARK_REGISTRATION_PASS',scope:'Supplied landmark pairs only. Source asset bytes, landmark anatomical identities, spatial registration outside sampled landmarks and merge safety are not validated.',
    source,target,sourceBytesVerified:false,anatomicallyValidated:false,mergeAuthorized:false,transform,fit:fitMetrics,validation:validationMetrics,thresholds,failures,
    evidenceSha256:digest({source,target,fit,validation,thresholds}),method:'Horn proper quaternion rotation; least-squares positive isotropic scale and translation; independent fixed-transform held-out validation'};
}

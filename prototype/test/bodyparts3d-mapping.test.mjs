import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveElementFiles} from '../../model-audit/bodyparts3d-mapping.mjs';

// Small text fixture of documented column format. Not a downloaded asset.
const label='first anterior ventricular branch of right coronary artery';
const header='concept id\tname\telement file id';
const fixture=[header,`FMA3815\t${label}\tFJ2671`,`FMA3815\t${label}\tFJ2673`,`FMA3815\t${label}\tFJ2677`,'FMA3710\tvascular tree\tFJ2925'].join('\n');
const candidate={fma:'FMA3815',representation:'BP7824',sourceLabel:label};

test('mapping uses official concept-to-element rows, not representation ID as filename',()=>{
  const [result]=resolveElementFiles(fixture,[candidate]);
  assert.deepEqual(result.elementFileIds,['FJ2671','FJ2673','FJ2677']);
  assert.equal(result.state,'MAPPED_NOT_DOWNLOADED');
  assert.equal(result.representation,'BP7824');
});

test('missing concept and mismatched source name cannot pass as mapped',()=>{
  const [missing]=resolveElementFiles(fixture,[{...candidate,fma:'FMA999999'}]);
  assert.equal(missing.state,'UNRESOLVED');assert.deepEqual(missing.elementFileIds,[]);
  assert.throws(()=>resolveElementFiles(fixture,[{...candidate,sourceLabel:'wrong artery'}]),/label/i);
});

test('invalid or path-traversal element IDs and malformed headers fail closed',()=>{
  assert.throws(()=>resolveElementFiles('wrong\thead\ner',[candidate]),/header/i);
  assert.throws(()=>resolveElementFiles(`${header}\nFMA3815\t${label}\t../evil`,[candidate]),/element/i);
});

test('verified mirrored ELEMENT ID suffix is retained, not silently changed',()=>{
  const [result]=resolveElementFiles(`${header}\nFMA37685\tshort head of left biceps brachii\tFJ1512M`,[{fma:'FMA37685',representation:'BP9153',sourceLabel:'short head of left biceps brachii'}]);
  assert.deepEqual(result.elementFileIds,['FJ1512M']);
});

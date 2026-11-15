import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLedger,validateCoverage} from './coverage-gate.mjs';
const catalog=[{key:'left_muscle',label:'Synthetic fixture',system:'muscles'},{key:'joint_l',label:'Synthetic hotspot',system:'joints',anchor:[0,1,0],anchorFemale:[0,1,0]}];
const evidence={status:'PASS',reviewer:'Synthetic test fixture only',evidenceRef:'fixture-not-real-evidence'};
function readyFixture(){const l=createLedger(catalog);l.status='REVIEWED_FOR_CANDIDATE_SCOPE';for(const r of l.rows){r.status='PASS';r.evidence=Object.fromEntries(l.coveragePolicy.requiredAxes.map(axis=>[axis,evidence]));r.content=l.coveragePolicy.requiredContent.map(c=>({...c,...evidence}));}return l;}
test('fresh ledger refuses release for every row',()=>{const l=createLedger(catalog);const r=validateCoverage(catalog,l);assert.equal(r.expected,4);assert.equal(r.ready,0);assert.equal(r.pass,false);});
test('all evidence entries present passes synthetic schema only, draft scope cannot pass',()=>{const l=readyFixture();const r=validateCoverage(catalog,l);assert.equal(r.ready,4);assert.equal(r.pass,true);l.status='DRAFT_NOT_FOR_RELEASE';assert.equal(validateCoverage(catalog,l).pass,false);});
test('missing structure, missing locale or duplicate blocks whole candidate',()=>{const l=readyFixture();l.rows[0].content.pop();assert.equal(validateCoverage(catalog,l).pass,false);l.rows.pop();assert.equal(validateCoverage(catalog,l).missing.length,1);l.rows.push(l.rows[0]);assert.equal(validateCoverage(catalog,l).duplicates.length,1);});
test('PASS without reference or reviewer cannot satisfy gate',()=>{const l=readyFixture();l.rows[0].evidence.scientificReview={status:'PASS'};assert.equal(validateCoverage(catalog,l).pass,false);});

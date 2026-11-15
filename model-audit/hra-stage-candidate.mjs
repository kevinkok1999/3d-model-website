#!/usr/bin/env node
// Isolated, fail-closed staging of original HRA reference bytes. Linux CI
// only: no publishing, coordinate changes, merging or anatomical validation.
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readSync, realpathSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { auditHraManifest } from './hra-reference-audit.mjs';

const need=(condition,msg)=>{if(!condition)throw new Error(msg)};
const pass='TECHNICAL_PREFLIGHT_PASS';
const contains=(parent,child)=>{const rel=relative(parent,child);return rel===''||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith(`..${sep}`));};
const exists=path=>{try{lstatSync(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const openRead=path=>openSync(path,constants.O_RDONLY|constants.O_NONBLOCK);

function readJson(path){
  const fd=openRead(path);
  try{
    const stat=fstatSync(fd);need(stat.isFile()&&stat.size>0&&stat.size<=8*1024*1024,'JSON input must be a bounded regular file');
    const bytes=Buffer.alloc(stat.size);let offset=0;
    while(offset<bytes.length){const n=readSync(fd,bytes,offset,bytes.length-offset,offset);need(n>0,'Truncated JSON input');offset+=n;}
    need(fstatSync(fd).size===bytes.length,'JSON input changed during reading');
    return {bytes,json:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
  }finally{closeSync(fd);}
}

function sameAudit(expected,actual,label){
  need(actual.status===pass,`${label} blocked: ${actual.results.filter(r=>r.status!==pass).map(r=>`${r.sourceId}: ${r.error}`).join('; ')}`);
  need(actual.anatomicallyValidated===false&&actual.mergeAuthorized===false,'Unexpected validation/merge state');
  need(isDeepStrictEqual(expected,actual),`Existing audit report mismatch against ${label.toLowerCase()}`);
}

function copyPinned(root,temp,id,pin){
  // The source audit also verifies this contract. Repeat before copying; no
  // unchecked traversal and no arbitrary filenames from input directories.
  need(pin.localPath===`${id}/${pin.filename}`&&/^[a-zA-Z0-9_.-]+$/.test(pin.filename),'Invalid staged asset localPath');
  const src=realpathSync(join(root,pin.localPath)),dest=join(temp,pin.localPath);
  need(contains(root,src),'Source path escapes intake');
  const input=openRead(src);
  try{
    const stat=fstatSync(input);need(stat.isFile()&&stat.size===pin.bytes&&stat.size>0,'Source bytes changed before staging');
    const output=openSync(dest,'wx',0o600);
    try{
      const buffer=Buffer.alloc(64*1024);let offset=0;
      while(offset<stat.size){
        const n=readSync(input,buffer,0,Math.min(buffer.length,stat.size-offset),offset);need(n>0,'Source truncated during staging');
        let written=0;while(written<n){const w=writeSync(output,buffer,written,n-written,offset+written);need(w>0,'Failed staged write');written+=w;}
        offset+=n;
      }
      need(fstatSync(input).size===stat.size,'Source size changed during staging');
    }finally{closeSync(output);}
  }finally{closeSync(input);}
}

function renameNoReplace(temp,output){
  // POSIX rename() alone can replace an existing empty directory. Linux
  // renameat2(RENAME_NOREPLACE) performs a true atomic no-clobber move.
  // If Python3/libc/kernel support is absent, fail closed (no fallback).
  const code=`import ctypes,os,sys\nlibc=ctypes.CDLL(None,use_errno=True)\nrename=libc.renameat2\nrename.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint]\nrename.restype=ctypes.c_int\nif rename(-100,os.fsencode(sys.argv[1]),-100,os.fsencode(sys.argv[2]),1)!=0:\n e=ctypes.get_errno()\n raise OSError(e,os.strerror(e))`;
  const child=spawnSync('python3',['-I','-c',code,temp,output],{encoding:'utf8',timeout:10000});
  need(!child.error&&child.status===0,`Atomic no-overwrite staging failed: ${child.error?.message??child.stderr?.trim()??'unknown failure'}`);
}

function main(args){
  need(args.length===4,'Usage: node model-audit/hra-stage-candidate.mjs <asset-dir> <manifest.json> <audit.json> <new-output-dir>');
  const [input,manifestPath,auditPath,requestedOutput]=args,root=realpathSync(input);
  const absoluteOutput=resolve(requestedOutput),parent=realpathSync(dirname(absoluteOutput)),output=join(parent,basename(absoluteOutput));
  need(!exists(output),'Staging destination already exists; will not overwrite');
  need(!contains(root,output),'Staging destination inside source tree is forbidden');
  const {json:manifest}=readJson(manifestPath),{json:expected,bytes:auditBytes}=readJson(auditPath);
  need(expected.status===pass,'Existing audit report must have technical preflight PASS');
  const fresh=auditHraManifest(manifest,root);sameAudit(expected,fresh,'Fresh audit');
  for(const s of manifest.sources)need(/\.glb$/i.test(s.glb.filename)&&s.crosswalk.filename==='crosswalk.csv','Unexpected staged source asset filename');

  const temp=mkdtempSync(join(parent,'.hra-stage-'));let moved=false;
  try{
    for(const source of manifest.sources){
      mkdirSync(join(temp,source.id));
      for(const pin of [source.glb,source.crosswalk])copyPinned(root,temp,source.id,pin);
    }
    // Audit the exact copies again, not merely the intake directory. This
    // catches any content replacement or mutation between source audit/copy.
    sameAudit(expected,auditHraManifest(manifest,temp),'Staged copy audit');
    writeFileSync(join(temp,'audit.json'),auditBytes,{flag:'wx',mode:0o600});
    renameNoReplace(temp,output);moved=true;
    console.log('HRA staged: four ORIGINAL GLBs, four ORIGINAL crosswalks, matching technical audit only. No anatomical validation or merge.');
  }finally{
    // Only remove our unique private temporary directory, never input or
    // destination. No partial output survives a rejected audit.
    if(!moved)rmSync(temp,{recursive:true,force:true});
  }
}

try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}

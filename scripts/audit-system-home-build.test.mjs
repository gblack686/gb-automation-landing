import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {auditBuild} from './audit-system-home-build.mjs';

const prose='Synthetic previously published architecture label';
const identity='g_0123456789abcdef01234567';
function fixture(body=prose) {
  const repo=mkdtempSync(join(tmpdir(),'system-audit-'));mkdirSync(join(repo,'public'));mkdirSync(join(repo,'dist'));
  writeFileSync(join(repo,'public','report.html'),body);writeFileSync(join(repo,'dist','report.html'),body);
  const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git('init');git('add','public');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','public baseline');
  const publicBaseline=git('rev-parse','HEAD').trim(),feed=join(repo,'feed.json');
  writeFileSync(feed,JSON.stringify({topology:{nodes:[]},docs:{rows:[]},context_graph:{nodes:[{id:identity,label:prose}]}}));
  return {repo,root:join(repo,'dist'),feed,publicBaseline,cleanup:()=>{
    assert.ok(resolve(repo).startsWith(resolve(tmpdir())+sep+'system-audit-'));
    rmSync(repo,{recursive:true,force:true});
  }};
}
test('exact existing public report is separately counted only with an explicit baseline',()=>{
  const f=fixture();try {
    assert.equal(auditBuild({...f,publicBaseline:null}).ok,false);
    const r=auditBuild(f);assert.equal(r.ok,true);assert.equal(r.preexistingPublicMatches,1);assert.equal(r.privateMatches,0);
  }finally{f.cleanup();}
});
test('a new bundle embedding an existing label fails even when another public file matches',()=>{
  const f=fixture();try {
    writeFileSync(join(f.root,'app.js'),JSON.stringify(prose));
    const r=auditBuild(f);assert.equal(r.ok,false);assert.equal(r.privateMatches,1);assert.equal(r.preexistingPublicMatches,1);
  }finally{f.cleanup();}
});
test('baseline comparison permits only checkout line endings, not other whitespace changes',()=>{
  const f=fixture(prose+'\n');try {
    writeFileSync(join(f.root,'report.html'),prose+'\r\n');assert.equal(auditBuild(f).ok,true);
    writeFileSync(join(f.root,'report.html'),prose+' \r\n');assert.equal(auditBuild(f).ok,false);
  }finally{f.cleanup();}
});
test('modified or renamed public files cannot use the baseline allowance',()=>{
  const f=fixture();try {
    writeFileSync(join(f.root,'report.html'),prose+' changed');assert.equal(auditBuild(f).ok,false);
    writeFileSync(join(f.root,'report.html'),prose);writeFileSync(join(f.root,'renamed.html'),prose);assert.equal(auditBuild(f).ok,false);
  }finally{f.cleanup();}
});
test('opaque private graph IDs remain forbidden in byte-identical public files',()=>{
  const f=fixture(prose+' '+identity);try {const r=auditBuild(f);assert.equal(r.ok,false);assert.equal(r.preexistingPublicMatches,0);}finally{f.cleanup();}
});
test('credential detection cannot be exempted by the public baseline',()=>{
  const f=fixture(prose+' ghp_'+'A'.repeat(30));try {const r=auditBuild(f);assert.equal(r.ok,false);assert.equal(r.credentialMatches,1);}finally{f.cleanup();}
});
test('baseline must be an exact existing commit',()=>{
  const f=fixture();try {assert.throws(()=>auditBuild({...f,publicBaseline:'HEAD'}));assert.throws(()=>auditBuild({...f,publicBaseline:'f'.repeat(40)}));}finally{f.cleanup();}
});

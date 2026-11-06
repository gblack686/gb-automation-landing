import test from 'node:test';
import assert from 'node:assert/strict';
import {recordNavigation,githubDestination,recordIdentity} from './forgeSearchNavigation.mjs';
test('only typed exact destinations survive projection',()=>{
 const plan='prd_'+'a'.repeat(20),key='host:'+ 'a'.repeat(280);
 for(const [source,id,nav] of [['proposal','prop_one',{kind:'proposal',id:'prop_one'}],['proposal',plan,{kind:'plan',id:plan}],['session','intent-one',{kind:'session',id:key}]])assert.deepEqual(recordNavigation(source,id,nav),nav);
 for(const nav of [{kind:'plan',id:'prop_one'},{kind:'proposal',id:'prop_other'},{kind:'proposal',id:'prop_one',url:'https://evil.invalid'}])assert.equal(recordNavigation('proposal','prop_one',nav),null);
 assert.equal(recordNavigation('session','intent-one',{kind:'session',id:null}),null);
 assert.equal(recordIdentity('x'.repeat(513)),false);assert.equal(recordIdentity('x\ny'),false);
});
test('external navigation is limited to exact repository PRs and code lines',()=>{
 for(const repo of ['gbauto/gbautomation','gblack686/gb-automation-landing']){
  const pr=`https://github.com/${repo}/pull/12`,code=`https://github.com/${repo}/blob/main/src/app.js#L12-L20`;
  assert.equal(githubDestination('pr',pr),pr);assert.equal(githubDestination('code',code),code);
  assert.equal(githubDestination('pr',code),null);
 }
 for(const href of ['javascript:alert(1)','https://githubXcom/gbauto/gbautomation/pull/12','https://github.com/other/repo/pull/12','https://github.com/gbauto/gbautomation/pull/12?next=evil','https://github.com/gbauto/gbautomation/pull/12\n','https://github.com/gbauto/gbautomation/blob/main/../secret','https://github.com/gbauto/gbautomation/blob/main/%2e%2e/secret']){
  assert.equal(githubDestination('pr',href),null);assert.equal(githubDestination('code',href),null);
 }
});

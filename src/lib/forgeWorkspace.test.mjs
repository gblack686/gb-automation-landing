import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorkspaceReader,workspaceLocation,workspaceHref,WORKSPACE_WINDOWS} from './forgeWorkspace.mjs';
const agent='youtube-intel',hash='a'.repeat(64);
const input={resource_id:'ui.youtube',catalog_sha256:hash};
const asset={agent_id:agent,owner_expert:agent,...input,sha256:hash,freshness:'stale',observed_at:'2026-11-01T00:00:00Z',media_type:'text/html',url:'must-not-leak'};
const searchReply=(q,id)=>({schema_version:'forge-unified-search.v1',tenant_id:'gbautomation',agent_id:id,query:q.query,
 coverage:{[q.source]:'available'},results:[{id:q.source+'-1',source:q.source,title:'Evidence',href:'do-not-forward'}]});

test('workspace search reuses exact-owner readers without invoking all-source classifier',async()=>{
 const calls=[];
 const read=makeWorkspaceReader({readCatalog:async(q,id)=>{calls.push({q,id});return {agent_id:id,rows:[],catalog_sha256:hash,next:null};},
  readSearch:async(q,id)=>{calls.push({q,id});return searchReply(q,id);}});
 const result=await read('workspaceSearch',{search:' Evidence '},agent);
 assert.equal(result.query,'Evidence');assert.equal(result.activities.length,4);assert.equal(result.coverage.resources,'empty');
 assert.deepEqual(calls.slice(1).map(x=>x.q.source),['proposal','session','pr','code']);
 assert(calls.every(x=>x.id===agent));assert.equal(calls[0].q.owner,agent);
 assert(!JSON.stringify(result).includes('do-not-forward'));
});

test('partial search preserves available sources and labels failures unavailable',async()=>{
 const read=makeWorkspaceReader({readCatalog:async()=>{throw Error('Offline');},readSearch:async(q,id)=>{
  if(q.source==='session')throw Error('Offline');return {...searchReply(q,id),coverage:{[q.source]:'empty'},results:[]};}});
 const result=await read('workspaceSearch',{search:'Evidence'},agent);
 assert.deepEqual(result.coverage,{resources:'unavailable',proposal:'empty',session:'unavailable',pr:'empty',code:'empty'});
 assert.deepEqual(result.activities,[]);
});

test('search identity mismatch fails closed, including a foreign catalog or mixed source',async()=>{
 for(const corrupted of ['catalog','agent','source','query']){
  const read=makeWorkspaceReader({readCatalog:async()=>({agent_id:corrupted==='catalog'?'foreign':agent,rows:[],catalog_sha256:hash,next:null}),
   readSearch:async(q,id)=>{const data=searchReply(q,id);if(corrupted==='agent')data.agent_id='foreign';if(corrupted==='source')data.results[0].source='foreign';if(corrupted==='query')data.query='other';return data;}});
  await assert.rejects(read('workspaceSearch',{search:'Evidence'},agent));
 }
});

test('search input is bounded before any reads and delayed cancelled responses are denied',async()=>{
 let calls=0;const read=makeWorkspaceReader({readCatalog:async()=>{calls++;},readSearch:async()=>{calls++;}});
 for(const input of [{search:''},{search:'x'.repeat(121)},{search:'a\nb'},{search:'x',owner:'foreign'}])await assert.rejects(read('workspaceSearch',input,agent));
 assert.equal(calls,0);
 const controller=new AbortController();
 const delayed=makeWorkspaceReader({signal:controller.signal,readCatalog:async()=>{controller.abort();return {};},readSearch:searchReply});
 await assert.rejects(delayed('workspaceSearch',{search:'Evidence'},agent));
});
test('every Atlas window and expert resource round trips through both routes',()=>{
 for(const mode of ['bench','atlas'])for(const windowId of WORKSPACE_WINDOWS){
  const url=new URL(workspaceHref(agent,{mode,windowId,resourceId:input.resource_id}),'https://fixture.invalid');
  assert.deepEqual(workspaceLocation(url.pathname,url.search),{mode,agentId:agent,windowId,resourceId:input.resource_id});
 }
 assert.equal(workspaceLocation('/bench/../../admin'),null);
 assert.equal(workspaceLocation('/bench/youtube-intel','?window=<script>&resource=https://elsewhere').resourceId,null);
 assert.throws(()=>workspaceHref('foreign/../../expert'));
});
test('catalog fixes owner; supplied tenant/owner/URL is rejected before fetch',async()=>{
 const calls=[];const read=makeWorkspaceReader({readCatalog:async(q,id)=>{calls.push([q,id]);return {agent_id:id,rows:[{owner_expert:id}]};}});
 await read('workspaceCatalog',{kind:'ui',search:'reports'},agent);
 assert.deepEqual(calls,[[{kind:'ui',search:'reports',owner:agent},agent]]);
 for(const extra of [{owner:'news-agent'},{tenant:'elsewhere'},{url:'http://127.0.0.1'},{offset:-1},{search:'a'.repeat(121)}])
  await assert.rejects(read('workspaceCatalog',{kind:'ui',...extra},agent));
 assert.equal(calls.length,1);
});
test('cross-owner artifacts and mixed-owner catalogs never reach the document',async()=>{
 const read=makeWorkspaceReader({readCatalog:async()=>({agent_id:agent,rows:[{owner_expert:'news-agent'}]}),
  readArtifact:async()=>({asset:{...asset,owner_expert:'news-agent'},bytes:new Uint8Array()}),documentFor:()=>assert.fail('must not render')});
 await assert.rejects(read('workspaceCatalog',{kind:'ui'},agent));
 await assert.rejects(read('workspaceArtifact',input,agent));
});
test('resource lookup matches only the exact registered ID under the selected expert',async()=>{
 const calls=[];const read=makeWorkspaceReader({readCatalog:async(q,id)=>{calls.push([q,id]);return {agent_id:id,rows:[{id:'ui.youtube',owner_expert:id},{id:'ui.youtube.extra',owner_expert:id}],next:50};}});
 const result=await read('workspaceLookup',{resource_id:'ui.youtube'},agent);
 assert.deepEqual(result.rows,[{id:'ui.youtube',owner_expert:agent}]);assert.equal(result.next,null);
 assert.deepEqual(calls,[[{search:'ui.youtube',owner:agent},agent]]);
 await assert.rejects(read('workspaceLookup',{resource_id:'ui.youtube',owner:'news-agent'},agent));
});
test('verified result carries capture age but never signed URL; aborted requests are fenced',async()=>{
 const controller=new AbortController();
 const read=makeWorkspaceReader({readArtifact:async()=>({asset,bytes:new Uint8Array()}),documentFor:()=>'<html>restricted result</html>',signal:controller.signal});
 const result=await read('workspaceArtifact',input,agent);
 assert.equal(result.freshness,'stale');assert.equal(result.observed_at,asset.observed_at);
 assert(!JSON.stringify(result).includes('must-not-leak'));
 controller.abort();await assert.rejects(read('workspaceArtifact',input,agent));
 await assert.rejects(read('workspaceArtifact',{...input,resource_id:'https://invalid'},agent));
});

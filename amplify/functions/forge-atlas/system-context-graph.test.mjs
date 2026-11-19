import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSystemSnapshot} from './system-home.mjs';
import {systemFixture} from './fixtures/system-home.mjs';
const now=Date.parse('2026-11-18T12:00:00Z');
test('combined graph preserves one shared identity, distinct conflicts and only observed edges',()=>{
 const x=systemFixture(now),g=validateSystemSnapshot(x,now).context_graph;
 assert.equal(g.nodes.length,5);assert.equal(g.nodes.filter(n=>n.sources.length===2).length,1);
 const conflicts=g.nodes.filter(n=>n.label==='Synthetic conflicting title');assert.equal(conflicts.length,2);assert.notEqual(conflicts[0].id,conflicts[1].id);
 assert.deepEqual(g.links,x.context_graph.links);assert.equal(g.sources[1].generated_at,'2020-01-01T00:00:00Z');assert.equal(g.sources[1].status,'stale');
 assert.equal(g.sources[1].nodes_total,null);assert.equal(g.complete,false);
});
test('missing or entirely unavailable graph stays explicitly empty without invented totals',()=>{
 const x=systemFixture(now);delete x.context_graph;assert.throws(()=>validateSystemSnapshot(x,now));
 const y=systemFixture(now);y.context_graph.nodes=[];y.context_graph.links=[];
 y.context_graph.sources=y.context_graph.sources.map(s=>({...s,status:'unavailable',reason:'not_configured',generated_at:null,nodes_total:null,nodes_returned:null,possibly_truncated:false}));
 assert.deepEqual(validateSystemSnapshot(y,now).context_graph,y.context_graph);
});
test('context graph rejects identity conflicts, invented endpoints/provenance, duplicates and private payloads',()=>{
 const cases=[g=>g.visibility='public',g=>g.complete=true,g=>g.schema='other',g=>g.body='private',
  g=>g.sources.pop(),g=>g.sources[1].id='operations',g=>g.sources[0].status='fresh',g=>g.sources[0].generated_at='2026-11-18T12:01:01Z',g=>g.sources[0].reason='raw upstream error',g=>g.sources[0].nodes_total=-1,g=>g.sources[0].nodes_returned=1.5,g=>g.sources[0].possibly_truncated='true',
  g=>g.nodes.push({...g.nodes[0],label:'Conflicting identity'}),g=>g.nodes[0].id='raw-path',g=>g.nodes[0].label='<script>alert(1)</script>',g=>g.nodes[0].label='https://private.invalid/path',g=>g.nodes[0].label='C:/private/record',g=>g.nodes[0].label='Bearer private',g=>g.nodes[0].label='ghp_'+'x'.repeat(30),g=>g.nodes[0].label='x'.repeat(161),g=>g.nodes[0].label='Non-ascii é',g=>g.nodes[0].kind='credential',g=>g.nodes[0].area='x'.repeat(81),g=>g.nodes[0].area='html<script>',g=>g.nodes[0].sources=[],g=>g.nodes[0].sources=['operations','operations'],g=>g.nodes[0].sources=['foreign'],g=>g.nodes[0].path='private/source',
  g=>g.links.push({...g.links[0]}),g=>g.links[0].t='g_'+'f'.repeat(24),g=>g.links[0].sources=['knowledge'],g=>g.links[0].url='https://private.invalid',g=>g.links[0].sources=[]];
 for(const change of cases){const x=systemFixture(now);change(x.context_graph);assert.throws(()=>validateSystemSnapshot(x,now),change.toString());}
});
test('400 nodes and 2000 observed links are accepted; excess rows fail closed',()=>{
 const x=systemFixture(now),g=x.context_graph;
 g.nodes=Array.from({length:400},(_,i)=>({id:'g_'+i.toString(16).padStart(24,'0'),label:`Example node ${i}`,kind:'note',area:'example',sources:['operations','knowledge']}));
 g.links=Array.from({length:2000},(_,i)=>({s:g.nodes[Math.floor(i/400)].id,t:g.nodes[i%400].id,sources:['operations']}));
 assert.equal(validateSystemSnapshot(x,now).context_graph.links.length,2000);
 g.links.push({s:g.nodes[6].id,t:g.nodes[0].id,sources:['knowledge']});assert.throws(()=>validateSystemSnapshot(x,now));g.links.pop();
 g.nodes.push({...g.nodes[0],id:'g_'+'f'.repeat(24)});assert.throws(()=>validateSystemSnapshot(x,now));
});

test('all graph metadata rejects credential shapes and location strings',()=>{
 for(const [field,value] of [['label','ftp://fixture.invalid/private'],['label','Open C:/synthetic/private'],['area','ghp_'+'x'.repeat(24)],['area','sk-'+'x'.repeat(24)],['area','nested/path']]){
  const x=systemFixture(now);x.context_graph.nodes[0][field]=value;
  assert.throws(()=>validateSystemSnapshot(x,now),`${field} must not expose a location or sensitive value`);
 }
});

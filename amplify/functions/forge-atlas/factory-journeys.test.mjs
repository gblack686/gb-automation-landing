import test from 'node:test';
import assert from 'node:assert/strict';
import {validateJourneys} from './factory-journeys.mjs';
const expert='gbautomation/news-agent',snapshot='2026-11-06T04:00:00Z';
const fixture=()=>({schema_version:'forge-workspace-journeys.v1',expert_id:expert,captured_at:'2026-11-06T01:00:00Z',source_sha256:'a'.repeat(64),selection:'explicit_ids',rows:[{
 id:'news-card-8',kind:'news',status:'completed',work:[['Conversation','1'],['Sweep','77'],['Sweep task','101'],['Run entry','100'],['Tool task','104'],['Generation','102'],['Generation task','103'],['Provider call','fixture-call']].map(([label,id])=>({label,id})),
 outputs:[{id:'8',artifact_id:null,sha256:null,verification:'recorded'}],
 collector_events:[{id:'fixture-event',session_id:'dna-local-1',type:'tool_result',is_error:false}],
 generation:{id:'102',scope:'generation',provider:'fixture-provider',model:'fixture-model',input_tokens:10,output_tokens:20,cache_read_tokens:1000,total_tokens:1030,cost_usd:null,duration_ms:4500},
 complete:null,delivered:null,langfuse_trace_id:null,target_evidence:'missing',acceptance:'pending'}]});

test('native capture retains original age, generation scope and pending acceptance',()=>{
 const d=fixture();assert.equal(validateJourneys(d,expert,snapshot),d);
 assert.equal(d.rows[0].generation.cost_usd,null);assert.equal(d.rows[0].acceptance,'pending');
});
test('exact ownership, identity, bounded metrics and missing links are enforced',()=>{
 for(const edit of [d=>d.expert_id='gbautomation/youtube-intel',d=>d.captured_at='2027-01-01T00:00:00Z',d=>d.selection='all_history',
  d=>d.rows.push(structuredClone(d.rows[0])),d=>d.rows[0].acceptance='met',d=>d.rows[0].langfuse_trace_id='fixture-event',
  d=>d.rows[0].generation.scope='sweep',d=>d.rows[0].generation.id='999',d=>d.rows[0].generation.cost_usd=-1,
  d=>d.rows[0].outputs[0].id='99',d=>d.rows[0].outputs[0].url='https://untrusted.invalid',d=>d.rows[0].work[0].id='x'.repeat(241),
  d=>d.rows[0].collector_events.push({...d.rows[0].collector_events[0]}),d=>delete d.rows[0].generation.cost_usd,
  d=>d.rows[0].outputs[0].verification='verified',d=>d.rows[0].generation.total_tokens=Infinity,d=>d.rows[0].collector_events[0].session_id='dna-local-2']){
  const d=fixture();edit(d);assert.throws(()=>validateJourneys(d,expert,snapshot));
 }
});
test('YouTube artifact verification does not become delivery or target acceptance',()=>{
 const d=fixture();d.expert_id='gbautomation/youtube-intel';const id='yt_'+'1'.repeat(24);
 d.rows=[{id,kind:'youtube',status:'partial',work:[{label:'Run',id},{label:'Source commit',id:'b'.repeat(40)},{label:'Binding',id:'c'.repeat(64)}],
  outputs:[{id:'output',artifact_id:'artifact',sha256:'d'.repeat(64),verification:'unverified'}],collector_events:[],generation:null,
  complete:false,delivered:false,langfuse_trace_id:null,target_evidence:'missing',acceptance:'pending'}];
 assert.equal(validateJourneys(d,d.expert_id,snapshot).rows[0].acceptance,'pending');
 d.rows[0].outputs[0].verification='verified';d.rows[0].outputs[0].sha256=null;
 assert.throws(()=>validateJourneys(d,d.expert_id,snapshot));
});

test('only verified native outputs can carry exact archived publication bindings',()=>{
 const d=fixture();d.expert_id='gbautomation/youtube-intel';const id='yt_'+'1'.repeat(24);d.output_links_sha256=['e'.repeat(64)];
 d.rows=[{id,kind:'youtube',status:'completed',work:[{label:'Run',id},{label:'Source commit',id:'b'.repeat(40)},{label:'Binding',id:'c'.repeat(64)}],
  outputs:[{id:'output',artifact_id:'artifact',sha256:'d'.repeat(64),verification:'verified',hosted_binding:{resource_id:'ui.youtube',catalog_sha256:'a'.repeat(64),catalog_version_id:'manifest-v1',content_sha256:'d'.repeat(64),version_id:'artifact-v1'}}],
  collector_events:[],generation:null,complete:true,delivered:false,langfuse_trace_id:null,target_evidence:'missing',acceptance:'pending'}];
 validateJourneys(d,d.expert_id,snapshot);
 for(const edit of [v=>v.rows[0].outputs[0].hosted_binding.content_sha256='b'.repeat(64),v=>v.rows[0].outputs[0].hosted_binding.catalog_version_id='null',v=>v.rows[0].outputs[0].verification='unverified',v=>delete v.output_links_sha256,v=>v.rows[0].outputs[0].hosted_binding.url='https://evil.invalid']){
  const bad=structuredClone(d);edit(bad);assert.throws(()=>validateJourneys(bad,bad.expert_id,snapshot));
 }
});

test('exported News outputs retain capture-producer source and exact immutable publication',()=>{
 const d=fixture();d.output_links_sha256=['e'.repeat(64)];
 d.rows[0].outputs=[{id:'8',artifact_id:'news-card-8',sha256:'d'.repeat(64),verification:'verified',export_source_commit:'e'.repeat(40),
  hosted_binding:{resource_id:'ui.news.result',catalog_sha256:'a'.repeat(64),catalog_version_id:'news-manifest-v1',content_sha256:'d'.repeat(64),version_id:'news-artifact-v1'}}];
 assert.equal(validateJourneys(d,expert,snapshot).rows[0].acceptance,'pending');
 for(const edit of [v=>delete v.rows[0].outputs[0].export_source_commit,v=>v.rows[0].outputs[0].artifact_id='news-card-9',v=>v.rows[0].outputs[0].verification='recorded',v=>v.rows[0].outputs[0].export_source_commit='bad',v=>v.rows[0].outputs[0].hosted_binding.content_sha256='b'.repeat(64),v=>v.rows[0].outputs[0].running_source_commit='e'.repeat(40)]){
  const bad=structuredClone(d);edit(bad);assert.throws(()=>validateJourneys(bad,expert,snapshot));
 }
});

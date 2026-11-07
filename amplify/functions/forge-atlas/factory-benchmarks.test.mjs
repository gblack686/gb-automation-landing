import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBenchmarks} from './factory-benchmarks.mjs';
const expert='gbautomation/news-agent',captured='2026-11-06T00:00:00Z',sha='a'.repeat(64);
const fixture=()=>({schema_version:'forge-benchmark-scorecard.v1',expert_id:expert,scope:'synthetic_benchmark',production_acceptance:false,
 catalog_sha256:sha,source_sha256:sha,through:'2026-11-03T00:00:00Z',rows:[{id:'sf-fixture',case_id:'B07',system:'Pi factory',model:'fixture-model',
 state:'failed',code:'fail',visual:'Not reviewed',tokens:null,seconds:0,elapsed_seconds:2,estimate_usd:null,receipt_sha256:sha,comparison_group:null}]});
test('missing metrics, failure and zero retain distinct meanings',()=>{
 const d=fixture();assert.equal(validateBenchmarks(d,expert,captured),d);
 assert.equal(d.rows[0].tokens,null);assert.equal(d.rows[0].seconds,0);assert.equal(d.production_acceptance,false);
});
test('timeline is optional and only opens an immutable resource for the selected expert',()=>{
 const d=fixture();d.timeline={links_sha256:sha,descriptor_sha256:sha,hosted_binding:{resource_id:'ui.news-agent.benchmark-timeline',
  catalog_sha256:sha,catalog_version_id:'manifest-v1',content_sha256:sha,version_id:'artifact-v1'}};
 assert.equal(validateBenchmarks(d,expert,captured),d);
 for(const change of [v=>v.timeline.hosted_binding.resource_id='ui.youtube-intel.benchmark-timeline',
  v=>v.timeline.hosted_binding.version_id='null',v=>v.timeline.hosted_binding.catalog_version_id='',
  v=>v.timeline.hosted_binding.url='https://untrusted.invalid',v=>v.timeline.links_sha256='wrong',
  v=>v.timeline.descriptor_sha256='wrong',v=>v.timeline.hosted_binding.content_sha256='wrong']){
  const wrong=structuredClone(d);change(wrong);assert.throws(()=>validateBenchmarks(wrong,expert,captured));
 }
});
test('foreign expert, task relevance, duplicate runs, fabricated acceptance and unexpected fields rejected',()=>{
 for(const change of [d=>d.expert_id='gbautomation/youtube-intel',d=>d.scope='production',d=>d.production_acceptance=true,
  d=>d.through='2027-01-01T00:00:00Z',d=>d.through='2026-11-03T00:00:00',d=>d.rows.push({...d.rows[0]}),
  d=>d.rows[0].case_id='B06',d=>d.rows[0].tokens=NaN,d=>d.rows[0].tokens=true,d=>d.rows[0].estimate_usd=-1,
  d=>d.rows[0].receipt_sha256='invented',d=>d.rows[0].comparison_group='all',d=>d.rows[0].trace_id='invented']){
  const d=fixture();change(d);assert.throws(()=>validateBenchmarks(d,expert,captured));
 }
});

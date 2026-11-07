import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateFactory} from './factory.mjs';
const root=process.env.FORGE_WORKSPACE_NATIVE_LINK_FIXTURES;
if(!root)throw Error('Explicit synthetic native-link fixtures required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const fixtures=await Promise.all(['news-agent','youtube-intel'].map(async agent=>JSON.parse(await readFile(root+'/'+agent+'-factory.json'))));
const verify=d=>{const bytes=Buffer.from(JSON.stringify(d));return validateFactory(bytes,hash(bytes),{agent_id:d.agent_id,config_sha256:d.config_sha256});};
test('real producer snapshots retain separate native content, exported artifact and trace identities',()=>{
 for(const d of fixtures){const row=verify(d).continuity_evidence.journey_links.rows[0];assert.equal(row.run_verified,true);assert.equal(row.outputs[0].verification,'verified');
  assert.notEqual(row.trace.id,row.trace.root_observation_id);assert.equal(d.journey_evidence.rows[0].acceptance,'pending');}
 const news=fixtures[0].continuity_evidence.journey_links.rows[0].outputs[0];assert.notEqual(news.native_content_sha256,news.artifact_sha256);
});
test('foreign captures, owners, runs, outputs, source files and readback contradictions fail closed',()=>{
 for(const mutate of [d=>delete d.journey_evidence,
  d=>d.continuity_evidence.journey_links.expert_id='gbautomation/youtube-intel',
  d=>d.continuity_evidence.journey_links.journey_source_sha256='0'.repeat(64),
  d=>d.continuity_evidence.journey_links.native_source_id='0'.repeat(64),
  d=>d.continuity_evidence.journey_links.source.commit='0'.repeat(40),
  d=>d.continuity_evidence.journey_links.rows[0].journey_id='news-card-9',
  d=>d.continuity_evidence.journey_links.rows[0].native_run_id='0'.repeat(64),
  d=>d.continuity_evidence.journey_links.rows[0].trace.id='0'.repeat(32),
  d=>d.continuity_evidence.journey_links.rows[0].trace.replay=true,
  d=>d.continuity_evidence.journey_links.rows[0].trace.root_observation_id='0'.repeat(16),
  d=>d.continuity_evidence.journey_links.rows[0].trace.readback_sha256='0'.repeat(64),
  d=>d.continuity_evidence.journey_links.rows[0].trace.observations++,
  d=>d.continuity_evidence.journey_links.rows[0].trace.verified_at='2099-01-01T00:00:00Z',
  d=>d.continuity_evidence.journey_links.rows[0].trace.url='https://evil.example',
  d=>d.continuity_evidence.journey_links.rows[0].outputs[0].artifact_sha256='0'.repeat(64),
  d=>d.continuity_evidence.journey_links.rows[0].outputs[0].native_content_sha256='0'.repeat(64),
  d=>d.continuity_evidence.journey_links.rows[0].outputs[0].native_output_id='0'.repeat(64),
 ]){const d=structuredClone(fixtures[0]);mutate(d);assert.throws(()=>verify(d),undefined,String(mutate));}
});
test('missing trace and changed output remain visible without promoting acceptance',()=>{
 const d=structuredClone(fixtures[0]),row=d.continuity_evidence.journey_links.rows[0];
 row.trace=null;row.gaps=['native_trace_readback_incomplete'];row.outputs[0].verification='unavailable';row.outputs[0].reason='native_card_changed';
 assert.equal(verify(d).continuity_evidence.journey_links.rows[0].trace,null);
 row.run_verified=false;row.outputs=[];assert.equal(verify(d).continuity_evidence.journey_links.rows[0].run_verified,false);
});
test('legacy continuity remains valid and no orphan link can be added',()=>{
 const d=structuredClone(fixtures[0]);delete d.continuity_evidence.journey_links;assert.equal(verify(d).continuity_evidence.journey_links,undefined);
 d.continuity_evidence.journey_links=structuredClone(fixtures[0].continuity_evidence.journey_links);
 d.continuity_evidence.journey_links.rows=[];assert.throws(()=>verify(d));
});

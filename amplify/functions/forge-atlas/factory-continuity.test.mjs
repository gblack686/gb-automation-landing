import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateFactory} from './factory.mjs';
import {validateContinuity} from './factory-continuity.mjs';
const root=process.env.FORGE_WORKSPACE_CONTINUITY_FIXTURES;
if(!root)throw Error('Explicit synthetic producer fixtures are required');
const source=JSON.parse(await readFile(root+'/news-agent-factory.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const verify=d=>{const bytes=Buffer.from(JSON.stringify(d));return validateFactory(bytes,hash(bytes),{agent_id:d.agent_id,config_sha256:d.config_sha256});};

test('actual producer snapshot preserves native failure counts and separate qualification',()=>{
 const d=verify(source),e=d.continuity_evidence;
 assert.equal(e.selection.slots_total,4);assert.equal(e.selection.verdict_counts.failed,1);assert.equal(e.selection.verdict_counts.missing,1);
 assert.equal(e.window.slot_gate_passed,false);assert.equal(e.window.qualification.shakeout_passed,false);
 assert.equal(e.evidence_mode,'fixture');assert.equal(e.promotion_authorized,false);
 assert(e.rows.flatMap(r=>r.runs).every(r=>r.langfuse_trace_id===null));
});

test('wrong expert or lane cannot be relabeled as owned evidence',()=>{
 for(const mutate of [d=>d.expert_id='gbautomation/youtube-intel',d=>d.rows[0].lane='youtube-trusted']){
  const e=structuredClone(source.continuity_evidence);mutate(e);
  assert.throws(()=>validateContinuity(e,source.expert_id,source.captured_at));
 }
});

test('counts, modes, promotions, invented traces, future evidence and private extra fields fail closed',()=>{
 for(const mutate of [
  e=>e.selection.slots_total++,e=>e.selection.verdict_counts.successful++,e=>e.rows.push(e.rows[0]),
  e=>e.rows[0].runs_total++,e=>e.rows[0].runs[0].outputs_total++,e=>e.window.live_window_eligible=true,
  e=>e.window.qualification.shakeout_passed=true,e=>e.window.slot_gate_passed=true,e=>e.promotion_authorized=true,
  e=>e.rows[0].runs[0].langfuse_trace_id='inferred-trace',e=>e.captured_at='2099-01-01T00:00:00Z',
  e=>e.rows[0].runs[0].prompt='private body',e=>e.source.files['src/extra.ts']={},e=>e.source.export_sha256='invalid',
 ]){
  const d=structuredClone(source);mutate(d.continuity_evidence);assert.throws(()=>verify(d),undefined,String(mutate));
 }
});

test('legacy snapshot and genuinely missing qualification stay unavailable',()=>{
 const older=structuredClone(source);delete older.continuity_evidence;assert.equal(verify(older).continuity_evidence,undefined);
 const missing=structuredClone(source);missing.continuity_evidence.window.qualification=null;
 missing.continuity_evidence.source.qualification_input_sha256=null;missing.continuity_evidence.source.native_qualification_sha256=null;
 assert.equal(verify(missing).continuity_evidence.window.qualification,null);
 missing.continuity_evidence.source.native_qualification_sha256='a'.repeat(64);assert.throws(()=>verify(missing));
});

test('opaque source bytes and configuration are still verified by the parent reader',()=>{
 const bytes=Buffer.from(JSON.stringify(source));
 assert.throws(()=>validateFactory(bytes,'0'.repeat(64),{agent_id:source.agent_id,config_sha256:source.config_sha256}));
 assert.throws(()=>validateFactory(bytes,hash(bytes),{agent_id:source.agent_id,config_sha256:'0'.repeat(64)}));
});

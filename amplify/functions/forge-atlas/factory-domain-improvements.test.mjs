import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateImprovements} from './factory-improvements.mjs';
import {projectImprovementProposal} from './improvement-proposals.mjs';
const root=process.env.FORGE_DOMAIN_IMPROVEMENT_FIXTURES??fileURLToPath(new URL('./fixtures/factory/domain-improvements',import.meta.url));
if(!root)throw Error('Synthetic native fixture path cannot be empty');
for(const agent of ['news-agent','youtube-intel']){
 const path=join(root,agent,'ready'),d=JSON.parse(await readFile(join(path,'projection.json')));
 test(agent+' exact native review and canonical proposal preserve ownership',async()=>{
  assert.equal(validateImprovements(d,d.expert_id,d.captured_at),d);
  const p=JSON.parse(await readFile(join(path,'preparation.json'))),row={...p.spine_rows.agent_os_proposals[0],producer_runs:p.spine_rows.producer_runs[0]};
  assert.equal(projectImprovementProposal(row).binding.expert_id,d.expert_id);
  row.producer_runs.owner_expert='pi';assert.throws(()=>projectImprovementProposal(row));
 });
 test(agent+' foreign, altered and contradictory domain evidence is rejected',()=>{
  for(const mutate of [
   v=>v.expert_id='consulting/pi',v=>v.rows[0].domain.repository='gbauto/foreign',
   v=>v.rows[0].domain.assessment.privacy=false,v=>v.rows[0].domain.assessment.p95_latency_ratio=2,
   v=>v.rows[0].domain.assessment.cohorts[1].cases=0,v=>v.domain_source.native_source.commit='f'.repeat(40),
   v=>v.rows[0].proposal_reference.binding.expert_id='consulting/pi',v=>v.rows[0].domain.finding.assessment_sha256='f'.repeat(64),
   v=>v.domain_source.evidence_mode='captured']){
   const value=structuredClone(d);mutate(value);assert.throws(()=>validateImprovements(value,d.expert_id,d.captured_at));
  }
 });
 test(agent+' domain performance proposal retains native cohort gates',async()=>{
  const value=JSON.parse(await readFile(join(root,agent,'performance/projection.json')));
  validateImprovements(value,value.expert_id,value.captured_at);
  assert.equal(value.rows[0].domain.assessment.p95_latency_ratio,.8);
  assert.equal(value.rows[0].proposal_reference.binding.expert_id,value.expert_id);
 });
}

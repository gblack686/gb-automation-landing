import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateOutcomes} from './factory-outcomes.mjs';
import {validateFactory} from './factory.mjs';
const sha='a'.repeat(64),expert='gbautomation/news-agent',captured='2026-11-07T00:00:00Z';
const source={from_season:'2026-W45',to_season:'2026-W45'};
const fixture=()=>({schema_version:'forge-outcome-evidence.v1',expert_id:expert,production_acceptance:false,policy:'factory-outcome-credit.v1',
 policy_sha256:sha,authority_sha256:sha,package_sha256:sha,projection_sha256:sha,...source,
 activity:{insights:1,reviewed_quests:1,rejected_quests:0},impact:{verified_outcomes:0,net_xp:0,ledger_xp:0},
 quests:[{id:'quest-1',expert_id:expert,title:'Synthetic withdrawn result',review_id:'review-1',source_sha256:sha,native_run_id:'run-1',insight_ids:['insight-1'],status:'withdrawn',net_xp:0,ledger_xp:0,
  events:[{id:'verified',status:'verified',at:'2026-11-05T00:00:00Z',source_sha256:sha,lines:[{receipt_id:'d4:'+sha,rule:'independent_validator',xp:1.5,season:'2026-W45',in_ledger:true,reverses:null}]},
   {id:'withdrawn',status:'withdrawn',at:'2026-11-06T00:00:00Z',source_sha256:sha,lines:[{receipt_id:'d4:reversal:'+sha,rule:'outcome_credit_reversal',xp:-1.5,season:'2026-W45',in_ledger:true,reverses:'d4:'+sha}]}]}]});
const validate=d=>validateOutcomes(d,expert,captured,source);

test('withdrawn credit retains exact positive and negative fractional history',()=>{
 const d=fixture();assert.doesNotThrow(()=>validate(d));assert.equal(d.quests[0].events[0].lines[0].xp,1.5);
});

for(const [name,edit] of Object.entries({
 'foreign top owner':d=>d.expert_id='consulting/pi',
 'foreign shared-seat quest':d=>d.quests[0].expert_id='consulting/pi',
 'release acceptance claim':d=>d.production_acceptance=true,
 'unknown field':d=>d.quests[0].url='https://unreviewed.invalid',
 'null identity':d=>d.quests[0].id=null,
 'future history':d=>d.quests[0].events[1].at='2027-01-01T00:00:00Z',
 'changed net score':d=>d.impact.net_xp=1,
 'changed quest score':d=>d.quests[0].net_xp=1,
 'wrong inverse':d=>d.quests[0].events[1].lines[0].xp=-1,
 'invented reversal':d=>d.quests[0].events[1].lines[0].reverses='d4:'+'b'.repeat(64),
 'duplicate history':d=>d.quests[0].events.push(d.quests[0].events[1]),
 'hidden withdrawal':d=>d.quests[0].status='verified',
 'false season credit':d=>d.quests[0].events[0].lines[0].in_ledger=false,
 'wrong week':d=>d.quests[0].events[0].lines[0].season='2026-W44',
 'extra payload':d=>d.quests[0].events[0].secret='blocked',
 'false activity count':d=>d.activity.reviewed_quests=2,
}))test(name+' is rejected',()=>{const d=fixture();edit(d);assert.throws(()=>validate(d));});

test('older snapshots can omit outcomes and empty exact-owner package stays empty',()=>{
 const d=fixture();d.quests=[];d.activity={insights:0,reviewed_quests:0,rejected_quests:0};assert.doesNotThrow(()=>validate(d));
});

test('actual paired Python producer passes the private reader for both experts',{skip:!process.env.FORGE_WORKSPACE_OUTCOME_FIXTURES},()=>{
 for(const agent of ['youtube-intel','news-agent']){
  const bytes=readFileSync(process.env.FORGE_WORKSPACE_OUTCOME_FIXTURES+'/'+agent+'-factory.json');
  const parsed=JSON.parse(bytes),hash=createHash('sha256').update(bytes).digest('hex');
  const result=validateFactory(bytes,hash,{agent_id:agent,config_sha256:parsed.config_sha256});
  assert.equal(result.outcome_evidence.expert_id,'gbautomation/'+agent);
  assert.equal(result.outcome_evidence.impact.net_xp,17);
  assert.equal(result.outcome_evidence.quests.length,agent==='youtube-intel'?5:1);
 }
});

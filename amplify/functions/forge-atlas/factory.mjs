// Private read-only Factory Game projection. The producer owns scoring rules;
// this reader verifies identity, bytes, bounds and display-safe fields.
import {createHash} from 'node:crypto';
import {validateJourneys} from './factory-journeys.mjs';
import {validateBenchmarks} from './factory-benchmarks.mjs';
import {validateImprovements} from './factory-improvements.mjs';
import {validateOutcomes} from './factory-outcomes.mjs';
import {validateContinuity} from './factory-continuity.mjs';
const sha=/^[a-f0-9]{64}$/,slug=/^[a-z][a-z0-9-]{1,62}$/;
const fail=()=>{throw Error('Factory evidence unavailable');};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const bounded=(v,n)=>typeof v==='string'&&v.length<=n&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const numeric=v=>v===null||typeof v==='number'&&Number.isFinite(v);
const stamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
function only(value,keys){if(!object(value)||Object.keys(value).some(k=>!keys.includes(k)))fail();}
function list(value,n){if(!Array.isArray(value)||value.length>n)fail();return value;}
const texts=(value,n,max)=>list(value,n).every(v=>bounded(v,max));

export function validateFactory(bytes,expected,request,now=Date.now()){
 if(!Buffer.isBuffer(bytes)||bytes.length>1_000_000||!sha.test(expected)
  ||createHash('sha256').update(bytes).digest('hex')!==expected)fail();
 const d=JSON.parse(bytes.toString('utf8'));
 only(d,['schema_version','tenant_id','agent_id','expert_id','config_sha256','captured_at','source','seat','goals','quests','receipts','targets','coverage','counts','truncated','limitations','journey_evidence','benchmark_evidence','improvement_evidence','outcome_evidence','continuity_evidence']);
 if(d.schema_version!=='forge-factory-workspace.v1'||d.tenant_id!=='gbautomation'||d.agent_id!==request.agent_id
  ||!slug.test(d.agent_id)||!['gbautomation/'+d.agent_id,'consulting/'+d.agent_id].includes(d.expert_id)
  ||d.config_sha256!==request.config_sha256||!sha.test(d.config_sha256)||!stamp(d.captured_at)||Date.parse(d.captured_at)>now+300_000)fail();
 only(d.source,['ledger_sha256','ledger_file_sha256','from_season','to_season','inputs','targets']);
 if(!sha.test(d.source.ledger_sha256)||!sha.test(d.source.ledger_file_sha256)
  ||!/^\d{4}-W\d{2}$/.test(d.source.from_season)||!/^\d{4}-W\d{2}$/.test(d.source.to_season))fail();
 only(d.source.inputs,['rocks.json','kanban-snapshot.json']);
 for(const v of Object.values(d.source.inputs)){
  only(v,['sha256','captured_at']);if(!sha.test(v.sha256)||v.captured_at!==null&&!stamp(v.captured_at))fail();
 }
 if(d.source.targets){only(d.source.targets,['sha256','measured_at']);if(!sha.test(d.source.targets.sha256)||!stamp(d.source.targets.measured_at)||Date.parse(d.source.targets.measured_at)>now+300_000)fail();}
 only(d.seat,['id','name','shared','experts','season','xp','cumulative_xp','level','slots']);
 if(!slug.test(d.seat.id)||!bounded(d.seat.name,120)||!texts(d.seat.experts,30,120)||!d.seat.experts.includes(d.expert_id)
  ||d.seat.shared!==(d.seat.experts.length>1)||d.seat.season!==d.source.to_season
  ||['xp','cumulative_xp','level','slots'].some(k=>!numeric(d.seat[k])))fail();
 for(const row of list(d.goals,100)){
  only(row,['id','title','status','recorded_status','checks_total','checks_proven','objective_id']);
  if(!bounded(row.id,160)||!row.id||!bounded(row.title,240)||!['landed','pending'].includes(row.status)||!bounded(row.recorded_status,40)
   ||!bounded(row.objective_id,160)||!Number.isSafeInteger(row.checks_total)||!Number.isSafeInteger(row.checks_proven)
   ||row.checks_proven<0||row.checks_total<row.checks_proven||row.status==='landed'&&(!row.checks_total||row.checks_total!==row.checks_proven))fail();
 }
 for(const row of list(d.quests,100)){
  only(row,['id','title','status','closeout','receipt_ids']);
  if(!bounded(row.id,160)||!row.id||!bounded(row.title,240)||!bounded(row.status,40)||!bounded(row.closeout,80)||!texts(row.receipt_ids,20,240))fail();
 }
 for(const row of list(d.receipts,100)){
  only(row,['receipt_id','source','rule','xp','season']);
  if(!bounded(row.receipt_id,240)||!bounded(row.source,120)||!bounded(row.rule,80)||typeof row.xp!=='number'||!Number.isFinite(row.xp)||!/^\d{4}-W\d{2}$/.test(row.season))fail();
 }
 for(const row of list(d.targets,100)){
  only(row,['id','label','gate','approved','state','acceptance','value','goal','op','unit','observed_at','detail']);
  if(!bounded(row.id,120)||!row.id||!bounded(row.label,240)||!bounded(row.gate,40)||typeof row.approved!=='boolean'
   ||!['met','missed','pending'].includes(row.state)||row.acceptance!==(row.approved?row.state:'proposed')
   ||!numeric(row.value)||!numeric(row.goal)||row.value===null&&row.state!=='pending'||!bounded(row.op,8)||!bounded(row.unit,80)
   ||row.observed_at!==null&&!stamp(row.observed_at)||!bounded(row.detail,500))fail();
 }
 only(d.coverage,['game','goals','quests','targets']);only(d.counts,['goals','quests','receipts','targets']);
 if(['game','goals','quests','targets'].some(k=>!['available','unavailable'].includes(d.coverage[k]))
  ||['goals','quests','receipts','targets'].some(k=>!Number.isSafeInteger(d.counts[k])||d.counts[k]<d[k].length)
  ||!texts(d.truncated,4,20)||!texts(d.limitations,10,500))fail();
 const fields=['goals','quests','receipts','targets'];
 if(d.coverage.game!=='available'||new Set(d.truncated).size!==d.truncated.length||d.truncated.some(k=>!fields.includes(k)))fail();
 for(const key of fields){
  if((d.counts[key]>d[key].length)!==d.truncated.includes(key)||d.truncated.includes(key)&&d[key].length!==100)fail();
  if(key!=='receipts'&&new Set(d[key].map(r=>r.id)).size!==d[key].length)fail();
 }
 for(const [key,source] of [['goals',d.source.inputs['rocks.json']],['quests',d.source.inputs['kanban-snapshot.json']],['targets',d.source.targets]]){
  if((d.coverage[key]==='available')!==!!source||d.coverage[key]==='unavailable'&&d[key].length)fail();
 }
 if('journey_evidence' in d)validateJourneys(d.journey_evidence,d.expert_id,d.captured_at);
 if('benchmark_evidence' in d)validateBenchmarks(d.benchmark_evidence,d.expert_id,d.captured_at);
 if('improvement_evidence' in d)validateImprovements(d.improvement_evidence,d.expert_id,d.captured_at);
 if('outcome_evidence' in d)validateOutcomes(d.outcome_evidence,d.expert_id,d.captured_at,d.source);
 if('continuity_evidence' in d)validateContinuity(d.continuity_evidence,d.expert_id,d.captured_at,d.journey_evidence);
 return {...d,snapshot_sha256:expected,freshness:now-Date.parse(d.captured_at)>6*3600_000?'stale':'recent'};
}

export function makeFactoryService({enabled=false,load,now=Date.now}){
 return async request=>{
  if(!enabled||!slug.test(request.agent_id)||!sha.test(request.config_sha256))fail();
  const stored=await load(request.agent_id);
  return validateFactory(stored.bytes,stored.sha256,request,now());
 };
}

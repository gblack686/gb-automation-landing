// Read-only native controller projection. A decision or effect is not a new
// approval, external release readback, or permission to invoke the controller.
import {validateImprovementReference} from './improvement-proposals.mjs';
const fail=()=>{throw Error('Improvement evidence unavailable');};
const need=value=>{if(!value)fail();};
const only=(value,keys)=>{const names=keys.split(' ');need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(k=>Object.hasOwn(value,k)));};
const text=(v,n=160)=>typeof v==='string'&&v.length>0&&v.length<=n&&!/[\x00-\x1f\x7f]/.test(v);
const hash=(v,n=64)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const count=v=>Number.isSafeInteger(v)&&v>=0;
const stamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const list=(v,n)=>{need(Array.isArray(v)&&v.length<=n);return v;};
const outcomes=['rejected','inconclusive','confirmation_needed','review_ready','repair_eligible','held','failed','cancelled'];
const missingFields=['finding_receipt','proposal_evidence','control_evidence','candidate_evidence','evaluation_receipt','confirmation_cycles','confirmation_artifacts','release_receipts'];

export function validateImprovements(d,expert,captured){
 only(d,'schema_version expert_id captured_at source controller scope promotion_authorized rows source_sha256');
 need(expert==='consulting/pi'&&d.expert_id===expert&&d.schema_version==='forge-improvement-review.v1'
  &&d.scope==='bounded_native_diagnostics'&&d.promotion_authorized===false&&hash(d.source_sha256)
  &&stamp(d.captured_at)&&Date.parse(d.captured_at)<=Date.parse(captured));
 const source=d.source;only(source,'diagnostics_sha256 policy_sha256 runs_sha256 verifier_source_commit');
 need(hash(source.diagnostics_sha256)&&hash(source.verifier_source_commit,40));
 for(const field of ['policy_sha256','runs_sha256'])need(source[field]===null||hash(source[field]));
 const c=d.controller;only(c,'configured enabled revoked release_hold policy_hash standing_authority_sha256');
 need(['configured','enabled','revoked','release_hold'].every(k=>typeof c[k]==='boolean'));
 need(c.configured?hash(c.policy_hash)&&hash(source.policy_sha256):!c.enabled&&!d.rows.length&&c.policy_hash===null&&c.standing_authority_sha256===null);
 need(c.standing_authority_sha256===null||hash(c.standing_authority_sha256));
 const seen=new Set();
 for(const r of list(d.rows,100)){
  only(r,'id task_id updated_at phase outcome reason base_commit candidate_sha256 finding proposal attempts evaluation release_state effects missing verification'+(Object.hasOwn(r,'proposal_reference')?' proposal_reference':''));
  need(typeof r.id==='string'&&/^improvement:[a-f0-9]{32}$/.test(r.id)&&!seen.has(r.id));seen.add(r.id);
  need(count(r.task_id)&&r.task_id>0&&stamp(r.updated_at)&&Date.parse(r.updated_at)<=Date.parse(d.captured_at)
   &&['admitted','proposal','control','candidate','evaluating','releasing','terminal'].includes(r.phase)
   &&(r.outcome===null||outcomes.includes(r.outcome))&&(r.reason===null||text(r.reason))
   &&hash(r.base_commit,40)&&(r.candidate_sha256===null||hash(r.candidate_sha256))&&['none','pending','healthy','rolled_back','held'].includes(r.release_state));
  const missing=list(r.missing,8);need(new Set(missing).size===missing.length&&missing.every(v=>missingFields.includes(v))&&r.verification===(missing.length?'partial':'verified'));
  const f=r.finding;only(f,'run_id request_id kind code evidence_sha256 verification');
  need(['run_id','request_id','code'].every(k=>text(f[k]))&&['bug','performance'].includes(f.kind)&&hash(f.evidence_sha256)
   &&f.verification===(missing.includes('finding_receipt')?'missing':'verified'));
  if(r.proposal!==null){const p=r.proposal;only(p,'summary artifact_sha256 candidate_sha256 changed_paths');
   need(text(p.summary,2000)&&hash(p.artifact_sha256)&&hash(p.candidate_sha256)&&p.candidate_sha256===r.candidate_sha256&&list(p.changed_paths,40).every(v=>text(v,240)));}
  const ids=new Set(),stages=new Set();
  for(const a of list(r.attempts,3)){
   only(a,'id stage status reused_from artifact_sha256 receipt_sha256 verification usage');
   need(a.reused_from===null||a.stage==='proposal'&&typeof a.reused_from==='string'&&/^improvement:[a-f0-9]{32}$/.test(a.reused_from)&&a.reused_from!==r.id);
   need(text(a.id)&&!ids.has(a.id)&&['proposal','control','candidate'].includes(a.stage)&&!stages.has(a.stage)&&['intent','completed','failed','unknown'].includes(a.status));ids.add(a.id);stages.add(a.stage);
   for(const k of ['artifact_sha256','receipt_sha256'])need(a[k]===null||hash(a[k]));
   need(a.verification===(missing.includes(a.stage+'_evidence')?'missing':'verified'));
   if(a.verification==='verified'){
    need(hash(a.artifact_sha256)&&hash(a.receipt_sha256));const u=a.usage;
    only(u,'model_calls input_tokens cache_read_tokens output_tokens total_tokens estimate_usd elapsed_ms complete');
    need(['model_calls','input_tokens','cache_read_tokens','output_tokens','total_tokens','elapsed_ms'].every(k=>count(u[k]))
     &&u.cache_read_tokens<=u.input_tokens&&u.total_tokens===u.input_tokens+u.output_tokens&&typeof u.complete==='boolean'
     &&typeof u.estimate_usd==='number'&&Number.isFinite(u.estimate_usd)&&u.estimate_usd>=0);
   }else need(a.usage===null);
  }
  if(r.evaluation!==null){const e=r.evaluation;
   only(e,'outcome reason receipt_sha256 scope_valid regression_passed complete classification confirmations holdouts required_confirmations required_holdouts verification');
   need(outcomes.includes(e.outcome)&&text(e.reason)&&['scope_valid','regression_passed','complete'].every(k=>typeof e[k]==='boolean')
    &&['internal_bug','performance','mixed','unknown'].includes(e.classification)
    &&['confirmations','holdouts','required_confirmations','required_holdouts'].every(k=>count(e[k]))
    &&e.required_confirmations>=3&&e.required_confirmations<=30&&e.required_holdouts>=1&&e.required_holdouts<=10
    &&(e.receipt_sha256===null||hash(e.receipt_sha256))&&['verified','missing'].includes(e.verification));
   need(e.verification===(missing.some(k=>k!=='release_receipts')?'missing':'verified'));
   need(e.verification!=='verified'||hash(e.receipt_sha256));
  }
  const effectIDs=new Set();
  for(const e of list(r.effects,6)){
   only(e,'effect status target_commit previous_release artifact_sha256 verification');
   need(['pr','merge','verify_merge','canary','health','rollback'].includes(e.effect)&&!effectIDs.has(e.effect)
    &&['intent','completed','failed','unknown'].includes(e.status)&&['recorded','missing'].includes(e.verification));effectIDs.add(e.effect);
   for(const [k,n] of [['target_commit',40],['previous_release',40],['artifact_sha256',64]])need(e[k]===null||hash(e[k],n));
   if(e.verification==='recorded')need(['completed','failed'].includes(e.status)&&hash(e.target_commit,40)&&hash(e.artifact_sha256));
   else need(['target_commit','previous_release','artifact_sha256'].every(k=>e[k]===null));
  }
  need(missing.includes('release_receipts')===r.effects.some(e=>e.verification==='missing'));
  if(Object.hasOwn(r,'proposal_reference'))validateImprovementReference(r.proposal_reference,r,c);
 }
 return d;
}

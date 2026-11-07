// Read-only binding to canonical proposal records. Never grants release authority.
import {createHash} from 'node:crypto';
const need=value=>{if(!value)throw Error('Improvement proposal unavailable');};
const only=(v,keys)=>need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));
const hash=(v,n=64)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const sort=value=>Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])])):value;
const stable=value=>JSON.stringify(sort(value));
const fields='schema_version expert_id cycle_id base_commit candidate_sha256 policy_hash finding_sha256 proposal_sha256 evaluation_sha256 confirmations_sha256 attempts_sha256 source_synthetic'.split(' ');

export function validateImprovementBinding(binding,digest){
 const domain=binding?.expert_id!=='consulting/pi',keys=[...fields,...(domain?['domain_sha256','native_source_sha256']:[])];
 only(binding,keys);
 need(binding.schema_version==='forge-improvement-proposal-binding.v1'&&['consulting/pi','gbautomation/news-agent','gbautomation/youtube-intel'].includes(binding.expert_id)
  &&typeof binding.cycle_id==='string'&&/^improvement:[a-f0-9]{32}$/.test(binding.cycle_id)
  &&hash(binding.base_commit,40)&&typeof binding.source_synthetic==='boolean');
 for(const field of keys.filter(k=>k.endsWith('sha256')||k==='policy_hash'))need(hash(binding[field]));
 // Every permitted string is ASCII; Python and JS serialize this binding identically.
 need(hash(digest)&&sha(stable(binding))===digest);
 return binding;
}

export function validateImprovementReference(reference,row,controller,domainSource){
 only(reference,['proposal_id','binding','binding_sha256','attempts_json',...(row.domain?['domain_json','domain_source_json']:[])]);
 need(typeof reference.proposal_id==='string'&&/^prop_[a-z0-9_]{1,190}$/.test(reference.proposal_id));
 const b=validateImprovementBinding(reference.binding,reference.binding_sha256),e=row.evaluation;
 need(!controller.revoked&&!controller.release_hold&&row.phase==='terminal'&&row.outcome==='review_ready'
  &&row.verification==='verified'&&!row.missing.length&&row.release_state==='none'&&!row.effects.length
  &&row.proposal&&e?.verification==='verified'&&e.outcome==='review_ready'&&e.scope_valid&&e.regression_passed&&e.complete);
 need(row.attempts.length===3&&new Set(row.attempts.map(a=>a.stage)).size===3
  &&row.attempts.every(a=>a.status==='completed'&&a.verification==='verified'&&a.usage?.complete));
 if(!row.domain&&row.finding.kind==='performance')need(e.confirmations>=e.required_confirmations&&e.holdouts>=e.required_holdouts);
 need(b.expert_id===(row.domain?{news:'gbautomation/news-agent',youtube:'gbautomation/youtube-intel'}[row.domain.source]:'consulting/pi'));
 need(b.cycle_id===row.id&&b.base_commit===row.base_commit&&b.candidate_sha256===row.candidate_sha256
  &&b.policy_hash===controller.policy_hash&&b.finding_sha256===row.finding.evidence_sha256
  &&b.proposal_sha256===row.proposal.artifact_sha256&&b.evaluation_sha256===e.receipt_sha256);
 // Retain the producer's exact preimage to handle Python/JS float exponent
 // formatting without changing existing v1 identities or rounding usage.
 const raw=reference.attempts_json;
 need(typeof raw==='string'&&raw.length<=12000&&sha(raw)===b.attempts_sha256);
 need(stable(JSON.parse(raw))===stable([...row.attempts].sort((a,b)=>a.stage.localeCompare(b.stage))));
 if(row.domain){
  need(domainSource&&(domainSource.evidence_mode!=='fixture'||b.source_synthetic));
  for(const [key,value,field] of [['domain_json',row.domain,'domain_sha256'],['domain_source_json',domainSource,'native_source_sha256']]){
   const serialized=reference[key];need(typeof serialized==='string'&&serialized.length<=16000&&sha(serialized)===b[field]&&stable(JSON.parse(serialized))===stable(value));
  }
 }
 return reference;
}

export function projectImprovementProposal(row){
 const producer=row.producer_runs,metadata=producer?.metadata;
 if(!metadata||!Object.hasOwn(metadata,'native_improvement')&&!Object.hasOwn(metadata,'native_binding_sha256'))return null;
 const binding=validateImprovementBinding(metadata.native_improvement,metadata.native_binding_sha256);
 const p=row.payload;
 const owner={'consulting/pi':'pi','gbautomation/news-agent':'news-agent','gbautomation/youtube-intel':'youtube-intel'}[binding.expert_id];
 need(producer.owner_expert===owner&&producer.tenant==='gbautomation'&&row.tenant==='gbautomation'
  &&row.source_type==='second_brain_item'&&row.workflow_route==='self_improvement'
  &&typeof row.source_synthetic==='boolean'&&row.source_synthetic===binding.source_synthetic&&producer.synthetic===binding.source_synthetic
  &&p?.schema_version==='proposal.v1'&&p.proposal_id===row.proposal_id&&p.tenant===row.tenant
  &&p.producer?.producer_run_id===row.producer_run_id&&p.producer.kind==='research_design_decision'
  &&p.source?.source_event_id===row.source_event_id&&p.source.type===row.source_type&&p.source.synthetic===binding.source_synthetic
  &&p.workflow?.route===row.workflow_route
  &&p.source.artifact_id==='native-improvement-binding:'+metadata.native_binding_sha256);
 return {proposal_id:row.proposal_id,binding,binding_sha256:metadata.native_binding_sha256};
}

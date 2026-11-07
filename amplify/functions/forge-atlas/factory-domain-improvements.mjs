// Validate displayed domain evidence; native Pi graders own its decision.
const need=v=>{if(!v)throw Error('Domain improvement evidence unavailable');};
const exact=(v,keys)=>need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.split(' ').sort().join());
const hash=(v,n=64)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=200;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const domainExperts={'gbautomation/news-agent':['news','gbauto/durable-news-agent'],'gbautomation/youtube-intel':['youtube','gbauto/gbauto-pi-host']};
export function validateDomainSource(d,expert){
 if(!domainExperts[expert]){need(!Object.hasOwn(d,'domain_source'));return;}
 const s=d.domain_source;exact(s,'domain inputs_sha256 evidence_mode native_source');
 need(s.domain===domainExperts[expert][0]&&['fixture','captured','unavailable'].includes(s.evidence_mode));
 need(s.evidence_mode==='unavailable'?s.inputs_sha256===null:hash(s.inputs_sha256));
 const n=s.native_source;exact(n,'commit files method checkout_mutated');
 need(n.commit===d.source.verifier_source_commit&&hash(n.commit,40)&&n.method==='immutable_git_pure_projection'&&n.checkout_mutated===false);
 const original=['src/context.ts','src/factory-improvement-contract.ts','src/expert-daily-contract.ts'];
 const projected=['src/workspace.ts','src/schedules.ts','src/factory-domain-benchmark.ts'];
 exact(n.files,[...original,...projected].join(' '));
 for(const [path,f] of Object.entries(n.files)){
  exact(f,'blob sha256'+(projected.includes(path)?' projection_sha256':''));need(hash(f.blob,40)&&hash(f.sha256));
  if(projected.includes(path))need(hash(f.projection_sha256));
 }
}
export function validateDomainRow(r,d){
 const owner=domainExperts[d.expert_id];if(!owner){need(!Object.hasOwn(r,'domain')&&!r.missing.includes('domain_assessment'));return;}
 const v=r.domain;exact(v,'source repository finding assessment');need(v.source===owner[0]&&v.repository===owner[1]);
 const finding=v.finding;need((finding===null)===r.missing.includes('finding_receipt'));
 if(finding!==null){exact(finding,'daily_receipt_sha256 source_evidence_sha256 assessment_sha256 defect_sha256 reuse_sha256');
  need(Object.values(finding).every(v=>hash(v))&&finding.source_evidence_sha256===r.finding.evidence_sha256);}
 const a=v.assessment,e=r.evaluation;need(r.missing.includes('domain_assessment')===(e!==null&&a===null));
 if(d.domain_source.evidence_mode==='unavailable')need(finding===null&&a===null);
 if(a===null)return;need(e!==null);
 exact(a,'protected_inputs correctness privacy quality_delta cost_ratio p95_latency_ratio cohorts measurement_scope');
 need(['protected_inputs','correctness','privacy'].every(k=>typeof a[k]==='boolean')&&finite(a.quality_delta)&&Math.abs(a.quality_delta)<=1
  &&a.measurement_scope==='protected_native_probe_zero_model_calls');
 for(const k of ['cost_ratio','p95_latency_ratio'])need(a[k]===null||finite(a[k])&&a[k]>=0);
 need(Array.isArray(a.cohorts)&&a.cohorts.length===2);
 for(const [i,c] of a.cohorts.entries()){
  exact(c,'cohort sha256 cases control_passed candidate_passed');
  need(c.cohort===['comparison','holdout'][i]&&hash(c.sha256)&&count(c.cases)&&c.cases>0
   &&['control_passed','candidate_passed'].every(k=>count(c[k])&&c[k]<=c.cases));
 }
 need(a.cohorts[0].sha256!==a.cohorts[1].sha256);
 if(e.outcome==='review_ready')need(['protected_inputs','correctness','privacy'].every(k=>a[k])&&a.quality_delta>=0
  &&['cost_ratio','p95_latency_ratio'].every(k=>a[k]!==null&&a[k]<=1.1)&&a.cohorts.every(c=>c.candidate_passed===c.cases));
}

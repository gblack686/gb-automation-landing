// Display boundary for the paired producer's replay of native Pi evidence.
// The native reducer owns acceptance. This reader verifies safe shape and scope.
const fail=()=>{throw Error('Continuity evidence unavailable');};
const need=v=>{if(!v)fail();};
const exact=(v,keys)=>need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));
const list=(v,max)=>{need(Array.isArray(v)&&v.length<=max);return v;};
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const commit=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,300}$/.test(v);
const text=v=>typeof v==='string'&&v.length>0&&v.length<=500&&!/[\x00-\x1f\x7f]/.test(v);
const stamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=1_000_000;
const bool=v=>typeof v==='boolean';
const nullable=(v,test)=>v===null||test(v);
const unique=rows=>need(new Set(rows.map(r=>r.id)).size===rows.length);
const strings=(v,max=1000)=>need(list(v,max).every(text));
const verdicts=['successful','pending','missing','failed','late','unknown'];
const sourceFiles=['src/context.ts','src/continuity-proof.ts','src/continuity-qualification.ts'];

export function validateContinuity(d,expert,snapshotAt){
 exact(d,['schema_version','expert_id','captured_at','evidence_mode','promotion_authorized','source','window','selection','rows','limitations']);
 need(d.schema_version==='forge-continuity-review.v1'&&d.expert_id===expert
  &&['gbautomation/news-agent','gbautomation/youtube-intel'].includes(expert)&&d.promotion_authorized===false);
 need(stamp(d.captured_at)&&Date.parse(d.captured_at)<=Date.parse(snapshotAt)&&['live','fixture','historical-replay'].includes(d.evidence_mode));
 const src=d.source;
 exact(src,['commit','files','method','checkout_mutated','pins_sha256','input_sha256','qualification_input_sha256','native_input_hash','native_proof_sha256','native_qualification_sha256','export_sha256']);
 need(commit(src.commit)&&src.method==='immutable_git_blobs'&&src.checkout_mutated===false);
 for(const k of ['pins_sha256','input_sha256','native_input_hash','native_proof_sha256','export_sha256'])need(hash(src[k]));
 exact(src.files,sourceFiles);
 for(const f of Object.values(src.files)){exact(f,['blob','sha256']);need(commit(f.blob)&&hash(f.sha256));}
 const w=d.window;
 exact(w,['from','until','as_of','scope','live_window_eligible','slot_gate_passed','trace_gate_passed','integrity_gate_passed','global_issues','qualification']);
 need(['from','until','as_of'].every(k=>stamp(w[k]))&&Date.parse(w.until)>Date.parse(w.from)&&Date.parse(w.as_of)<=Date.parse(d.captured_at));
 need(w.scope==='all_three_lanes'&&['live_window_eligible','slot_gate_passed','trace_gate_passed','integrity_gate_passed'].every(k=>bool(w[k])));
 need(d.evidence_mode==='live'||w.live_window_eligible===false);strings(w.global_issues);
 if(w.slot_gate_passed)need(w.trace_gate_passed&&w.integrity_gate_passed&&!w.global_issues.length);
 if(w.qualification===null)need(src.qualification_input_sha256===null&&src.native_qualification_sha256===null);
 else{
  need(hash(src.qualification_input_sha256)&&hash(src.native_qualification_sha256));
  const q=w.qualification;exact(q,['auxiliary_passed','shakeout_passed','seven_day_passed','thirty_day_passed','issues']);
  need(['auxiliary_passed','shakeout_passed','seven_day_passed','thirty_day_passed'].every(k=>bool(q[k])));strings(q.issues);
  if(q.auxiliary_passed)need(!q.issues.length);
  for(const [key,days] of [['shakeout_passed',3],['seven_day_passed',7],['thirty_day_passed',30]])
   if(q[key])need(w.live_window_eligible&&w.slot_gate_passed&&q.auxiliary_passed&&Date.parse(w.until)-Date.parse(w.from)>=days*86400000);
 }
 const s=d.selection;exact(s,['kind','slots_total','slots_displayed','truncated','verdict_counts']);
 need(s.kind==='exact_expert_scopes'&&count(s.slots_total)&&count(s.slots_displayed)&&s.slots_displayed===Math.min(100,s.slots_total)
  &&s.truncated===(s.slots_total>s.slots_displayed));
 exact(s.verdict_counts,verdicts);need(Object.values(s.verdict_counts).every(count)&&Object.values(s.verdict_counts).reduce((a,b)=>a+b,0)===s.slots_total);
 // Necessary consistency with the native all-lane 99.5% gate. This is not a
 // substitute for the reducer's calendar, source, sink and integrity checks.
 if(w.slot_gate_passed)need(s.slots_total>0&&s.verdict_counts.successful/s.slots_total>=0.995
  &&s.verdict_counts.missing===0&&s.verdict_counts.pending===0&&s.verdict_counts.unknown===0);
 list(d.rows,100);need(d.rows.length===s.slots_displayed);unique(d.rows);
 const visible=Object.fromEntries(verdicts.map(k=>[k,0]));let last=-Infinity;
 for(const row of d.rows){
  exact(row,['id','lane','scope_sha256','owner','due_at','deadline_at','verdict','accounted','timely_successful','issues','runs_total','runs_truncated','runs']);
  need(id(row.id)&&id(row.owner)&&hash(row.scope_sha256)&&stamp(row.due_at)&&stamp(row.deadline_at)&&Date.parse(row.deadline_at)>Date.parse(row.due_at));
  need(expert==='gbautomation/news-agent'?row.lane==='news':['youtube-trusted','youtube-likes'].includes(row.lane));
  need(row.id.startsWith(row.lane+':')&&row.id.includes(':'+row.scope_sha256+':'));
  const due=Date.parse(row.due_at);need(due>=last&&due>=Date.parse(w.from)&&due<Date.parse(w.until));last=due;
  need(verdicts.includes(row.verdict)&&bool(row.accounted)&&row.timely_successful===(row.verdict==='successful'));visible[row.verdict]++;
  strings(row.issues);need(count(row.runs_total)&&row.runs_truncated===(row.runs_total>5));
  list(row.runs,5);need(row.runs.length===Math.min(5,row.runs_total));unique(row.runs);
  for(const r of row.runs){
   exact(r,['id','receipt_sha256','result','admitted_at','ended_at','evidence_gaps','attempts_total','outputs_total','outputs_truncated','outputs','sinks','langfuse_trace_id']);
   need(id(r.id)&&nullable(r.receipt_sha256,hash)&&[null,'completed','no_work','partial','failed','uncertain','skipped_overlap'].includes(r.result));
   need(stamp(r.admitted_at)&&nullable(r.ended_at,stamp)&&count(r.attempts_total)&&count(r.outputs_total)&&r.outputs_truncated===(r.outputs_total>20));
   strings(r.evidence_gaps,64);need(r.langfuse_trace_id===null);list(r.outputs,20);need(r.outputs.length===Math.min(20,r.outputs_total));
   // Invalid duplicate native outputs are retained as failed evidence, not hidden.
   for(const o of r.outputs){
    exact(o,['id','sha256','eligible_at','eligibility_sha256','accepted_at']);
    need(id(o.id)&&hash(o.sha256)&&nullable(o.eligible_at,stamp)&&nullable(o.eligibility_sha256,hash)&&stamp(o.accepted_at));
   }
   for(const sink of list(r.sinks,2)){
    exact(sink,['sink','root_observation_id','expected_total','verified_total','complete','verified_at','readback_sha256']);
    need(['pi','langfuse'].includes(sink.sink)&&id(sink.root_observation_id)&&count(sink.expected_total)&&count(sink.verified_total)
     &&bool(sink.complete)&&nullable(sink.verified_at,stamp)&&nullable(sink.readback_sha256,hash));
   }
  }
 }
 for(const k of verdicts)need(s.truncated?visible[k]<=s.verdict_counts[k]:visible[k]===s.verdict_counts[k]);
 strings(d.limitations,10);
}

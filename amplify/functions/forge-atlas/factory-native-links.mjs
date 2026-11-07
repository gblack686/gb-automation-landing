// Display validation of the paired native reader. This does not award acceptance.
import {createHash} from 'node:crypto';
const need=v=>{if(!v)throw Error('Native journey links unavailable');};
const exact=(v,keys)=>need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const commit=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const stamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const code=v=>typeof v==='string'&&/^[a-z_]{1,100}$/.test(v);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rows=(v,cap,key)=>{need(Array.isArray(v)&&v.length<=cap&&new Set(v.map(r=>r?.[key])).size===v.length);return v;};
export function validateNativeLinks(d,continuity,journeys){
 exact(d,['schema_version','expert_id','captured_at','journey_source_sha256','native_source_id','source','rows']);
 need(d.schema_version==='forge-native-journey-links.v1'&&d.expert_id===continuity.expert_id&&journeys?.expert_id===d.expert_id
  &&d.captured_at===continuity.captured_at&&hash(d.journey_source_sha256)&&d.journey_source_sha256===journeys.source_sha256&&hash(d.native_source_id));
 exact(d.source,['commit','files','method','checkout_mutated']);
 need(d.source.commit===continuity.source.commit&&d.source.method==='immutable_git_blobs'&&d.source.checkout_mutated===false);
 exact(d.source.files,['src/context.ts','src/langfuse-sink.ts','src/langfuse-v4.ts','src/domain-observations.ts']);
 for(const f of Object.values(d.source.files)){exact(f,['blob','sha256']);need(commit(f.blob)&&hash(f.sha256));}
 need(d.source.files['src/context.ts'].sha256===continuity.source.files['src/context.ts'].sha256);
 const captures=new Map(journeys.rows.map(r=>[r.id,r]));
 need(rows(d.rows,20,'journey_id').length===captures.size);
 for(const row of d.rows){
  exact(row,['journey_id','native_run_id','slot_id','receipt_sha256','run_verified','trace','outputs','gaps']);
  const journey=captures.get(row.journey_id);need(journey&&typeof row.run_verified==='boolean'&&hash(row.native_run_id));
  const news=journey.kind==='news',key=news?Number(journey.work[1].id):journey.id;
  need(row.native_run_id===digest([d.native_source_id,news?'sweep':'run',key]));
  need(Array.isArray(row.gaps)&&row.gaps.length<=10&&row.gaps.every(code));
  const slot=continuity.rows.find(s=>s.id===row.slot_id),run=slot?.runs.find(r=>r.id===row.native_run_id);
  if(row.slot_id===null)need(row.receipt_sha256===null&&!row.run_verified);
  else need(run&&row.receipt_sha256===run.receipt_sha256);
  if(!row.run_verified){need(row.trace===null&&Array.isArray(row.outputs)&&row.outputs.length===0&&row.gaps.length>0);continue;}
  need(run&&hash(row.receipt_sha256));
  if(row.trace!==null){
   const t=row.trace;exact(t,['id','replay','root_observation_id','readback_sha256','verified_at','observations']);
   const sink=run.sinks.find(s=>s.sink==='langfuse');
   need(typeof t.id==='string'&&/^[a-f0-9]{32}$/.test(t.id)&&typeof t.root_observation_id==='string'&&/^[a-f0-9]{16}$/.test(t.root_observation_id)
    &&hash(t.readback_sha256)&&stamp(t.verified_at)&&Date.parse(t.verified_at)<=Date.parse(continuity.window.as_of)
    &&Number.isSafeInteger(t.observations)&&t.observations>0&&t.observations<=501
    &&sink?.complete===true&&sink.root_observation_id===t.root_observation_id&&sink.readback_sha256===t.readback_sha256
    &&sink.verified_at===t.verified_at&&sink.expected_total===t.observations&&sink.verified_total===t.observations);
   need(typeof t.replay==='boolean'&&t.id===digest(['domain-otlp-v1',t.replay?'replay':'live',d.native_source_id,row.native_run_id]).slice(0,32)
    &&t.root_observation_id===digest(['pi-otlp-span-1',t.id,row.native_run_id]).slice(0,16));
   need(!row.gaps.some(g=>g.startsWith('native_trace_')));
  }
  const outputs=new Map(journey.outputs.map(o=>[o.id,o]));
  need(rows(row.outputs,100,'output_id').length===outputs.size);
  for(const output of row.outputs){
   exact(output,['output_id','native_output_id','native_content_sha256','artifact_sha256','verification','reason']);
   const saved=outputs.get(output.output_id);need(saved&&output.artifact_sha256===saved.sha256);
   if(output.native_output_id===null)need(output.native_content_sha256===null&&output.verification==='unavailable');
   else{
    need(output.native_output_id===digest([d.native_source_id,news?'card':'output',news?Number(output.output_id):output.output_id]));
    const accepted=run.outputs.find(o=>o.id===output.native_output_id);need(accepted&&accepted.sha256===output.native_content_sha256);
   }
   if(output.verification==='verified')need(output.native_output_id!==null&&output.reason===null&&saved.verification==='verified'
    &&hash(output.artifact_sha256)&&(news||output.native_content_sha256===output.artifact_sha256));
   else need(output.verification==='unavailable'&&code(output.reason));
  }
 }
}

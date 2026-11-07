// Synthetic task relevance is independent of production ownership/acceptance.
import {validSavedBinding} from './saved-binding.mjs';
const sha=/^[a-f0-9]{64}$/;
const cases={'consulting/pi':null,'gbautomation/youtube-intel':['B06'],'gbautomation/news-agent':['B07']};
const fail=()=>{throw Error('Benchmark evidence unavailable');};
function only(value,keys,optional=[]){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)&&!optional.includes(k))||keys.some(k=>!Object.hasOwn(value,k)))fail();}
const stamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const text=v=>typeof v==='string'&&v.length>0&&v.length<=160&&!/[\x00-\x1f\x7f]/.test(v);
export function validateBenchmarks(d,expert,captured){
 only(d,['schema_version','expert_id','catalog_sha256','scope','production_acceptance','through','rows','source_sha256'],['timeline']);
 if(!Object.hasOwn(cases,expert)||d.schema_version!=='forge-benchmark-scorecard.v1'||d.expert_id!==expert
  ||d.scope!=='synthetic_benchmark'||d.production_acceptance!==false||!sha.test(d.catalog_sha256)||!sha.test(d.source_sha256)
  ||!stamp(d.through)||Date.parse(d.through)>Date.parse(captured)||!Array.isArray(d.rows)||d.rows.length>500)fail();
 const ids=new Set();
 for(const row of d.rows){
  only(row,['id','case_id','system','model','state','code','visual','tokens','seconds','elapsed_seconds','estimate_usd','receipt_sha256','comparison_group']);
  if(['id','case_id','system','model','state','code','visual'].some(k=>!text(row[k]))||ids.has(row.id)
   ||!/^B\d{2}$/.test(row.case_id)||cases[expert]&&!cases[expert].includes(row.case_id)
   ||!['Codex','Pi factory'].includes(row.system)||!['passed','failed','infrastructure_error','error','timeout','pending'].includes(row.state)
   ||!['pass','fail','missing','pending'].includes(row.code)||!['Approved','Needs revision','Not reviewed'].includes(row.visual)
   ||!sha.test(row.receipt_sha256)||row.comparison_group!==null&&!sha.test(row.comparison_group))fail();
  ids.add(row.id);
  for(const k of ['tokens','seconds','elapsed_seconds','estimate_usd'])if(row[k]!==null&&(typeof row[k]!=='number'||!Number.isFinite(row[k])||row[k]<0))fail();
 }
 if('timeline' in d){
  only(d.timeline,['links_sha256','descriptor_sha256','hosted_binding']);
  const b=d.timeline.hosted_binding;
  if(!sha.test(d.timeline.links_sha256)||!sha.test(d.timeline.descriptor_sha256)||!validSavedBinding(b)
   ||b.resource_id!=='ui.'+expert.split('/')[1]+'.benchmark-timeline')fail();
 }
 return d;
}

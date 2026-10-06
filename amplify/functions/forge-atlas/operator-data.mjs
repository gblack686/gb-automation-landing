// Small, display-safe projection of the retained Mini data service.
const value=(row,keys,max=240)=>{
 for(const key of keys){const item=row?.[key];if(typeof item==='string'&&item.trim())return item.slice(0,max);}
 return '';
};
const projectRow=(row,index)=>({
 id:value(row,['run_id','artifact_id','trace_id','report_id','id','path','session_key'],160)||String(index),
 title:value(row,['title','name','task_name','trace_name','skill_name','primary_path','path','source_surface'],240)||'Untitled record',
 detail:value(row,['description','snippet','command_label','schedule','kind','source_surface','path'],400),
 status:value(row,['status','state','severity','last_status','format'],80),
 updated_at:value(row,['updated_at','last_seen_at','created_at','date','observed_at','last_run_at'],48),
});
export function projectOperatorData(surface,raw,agent){
 if(!['summary','artifacts','graph','traces','reports','search','fleetSchedule'].includes(surface)||!raw||typeof raw!=='object')throw Error('Operator source unavailable');
 let source;
 if(surface==='reports'){
  if(raw.surface!=='reports'||!Array.isArray(raw.reports))throw Error('Invalid report source');
  source={Reports:raw.reports};
 }else if(surface==='fleetSchedule'){
  if(raw.schema_version!=='gbauto-schedule.v1'||!Array.isArray(raw.jobs)||raw.jobs.length>2000)throw Error('Invalid fleet schedule source');
  source={Jobs:raw.jobs.slice(0,100)};
 }else if(surface==='search'){
  if(raw.surface!=='search'||!Array.isArray(raw.results))throw Error('Invalid search source');
  source={Results:raw.results};
 }else{
  if(raw.endpoint!==surface||raw.tenant!=='gbautomation'||!raw.data||typeof raw.data!=='object')throw Error('Invalid operator source');
  source=raw.data;
 }
 const lanes=Object.entries(source).slice(0,12).map(([name,items])=>{
  if(!Array.isArray(items)||items.length>100)return {name,rows:[],total:0,coverage:'unavailable'};
  return {name:name.slice(0,80),rows:items.slice(0,20).map(projectRow),total:items.length,coverage:'available'};
 });
 return {schema_version:'forge-operator-data.v1',tenant_id:'gbautomation',agent_id:agent,surface,
  connected:surface==='reports'?Boolean(raw.available):surface==='search'||surface==='fleetSchedule'?true:Boolean(raw.connected),
  captured_at:String(raw.generated_at||new Date().toISOString()).slice(0,48),
  warnings:Array.isArray(raw.warnings)?raw.warnings.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,240)):[],lanes};
}

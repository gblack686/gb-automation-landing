// Server-only projection. Ownership follows the proposal's producer run.
import { TENANT, EXPERT } from './contract.mjs';
const columns = ['proposal_id','tenant','card_title','source_type','source_event_id','source_synthetic','producer_run_id','card_type','state','workflow_route','task_id','created_at','updated_at'];
const ownership = 'producer_runs!inner(producer_run_id,tenant,owner_expert)';
const scope = {tenant_id:TENANT,agent_id:EXPERT};
const text = (value,max=4000) => typeof value === 'string' ? value.slice(0,max) : '';
export function proposalPath({view,query}) {
 const params = new URLSearchParams({tenant:`eq.${TENANT}`,'producer_runs.tenant':`eq.${TENANT}`,'producer_runs.owner_expert':`eq.${EXPERT}`,select:columns.join(',')+','+ownership+(view==='proposal'?',payload':''),limit:view==='proposal'?'1':'50'});
 if (view === 'proposal') params.set('proposal_id',`eq.${query.proposal_id}`);
 else {
  params.set('offset',String(query.offset || 0));
  params.set('order','updated_at.desc,proposal_id.asc');
  if (query.state) params.set('state',`eq.${query.state}`);
  // PostgREST wildcard aliases and SQL LIKE wildcards must remain literal search text.
  if (query.search) params.set('card_title',`ilike.*${query.search.replace(/[\\%_*]/g,c=>'\\'+c)}*`);
 }
 return `/rest/v1/agent_os_proposals?${params}`;
}
export function projectProposals(request,rows,contentRange) {
 if (!Array.isArray(rows) || rows.length > (request.view==='proposal'?1:50)
     || rows.some(row=>!row || row.tenant!==TENANT || !/^prop_[a-z0-9_]+$/.test(row.proposal_id)
       || !row.producer_run_id || row.producer_runs?.producer_run_id!==row.producer_run_id
       || row.producer_runs?.tenant!==TENANT || row.producer_runs?.owner_expert!==EXPERT)) throw Error('Invalid proposal ownership');
 const projected = rows.map(row=> {
  const value={...scope,...Object.fromEntries(columns.filter(k=>k!=='tenant').map(k=>[k,row[k]]))};
  if (request.view==='proposal') {
   if(row.proposal_id!==request.query.proposal_id)throw Error('Invalid proposal identity');
   const payload=row.payload || {};
   value.summary=text(payload.summary || payload.card?.description || payload.card?.summary);
   value.action_items=Array.isArray(payload.action_items)?payload.action_items.slice(0,30).map(item=>text(typeof item==='string'?item:item?.description || item?.title || item?.text,1000)).filter(Boolean):[];
  }
  return value;
 });
 if(request.view==='proposal') return projected[0] || null;
 const total=Number(contentRange?.split('/').at(-1));
 if(!Number.isSafeInteger(total)||total<projected.length)throw Error('Invalid proposal count');
 return {...scope,rows:projected,total,offset:request.query.offset || 0,limit:50};
}

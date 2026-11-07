// Display validation only. The paired producer replays the original attested
// package and matches its entries against hashed seasons. No scoring or writes.
const hash=/^[a-f0-9]{64}$/,id=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/,season=/^\d{4}-W\d{2}$/;
const receipt=/^d4:(?:reversal:)?[a-f0-9]{64}$/;
const fail=()=>{throw Error('Outcome evidence unavailable');};
const need=value=>{if(!value)fail();};
const exact=(value,keys)=>need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k)));
const list=(value,max)=>{need(Array.isArray(value)&&value.length<=max);return value;};
const count=value=>Number.isSafeInteger(value)&&value>=0;
const number=value=>typeof value==='number'&&Number.isFinite(value);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=500&&!/[\x00-\x1f\x7f]/.test(value);
const stamp=value=>typeof value==='string'&&value.endsWith('Z')&&Number.isFinite(Date.parse(value));
const ident=value=>typeof value==='string'&&id.test(value);
const digest=value=>typeof value==='string'&&hash.test(value);
function isoSeason(value){
 const d=new Date(value);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
 const year=d.getUTCFullYear(),week=Math.ceil((((d-new Date(Date.UTC(year,0,1)))/86400000)+1)/7);
 return `${year}-W${String(week).padStart(2,'0')}`;
}

export function validateOutcomes(d,expert,captured,source){
 exact(d,['schema_version','expert_id','production_acceptance','policy','policy_sha256','authority_sha256','package_sha256','projection_sha256','from_season','to_season','activity','impact','quests']);
 need(d.schema_version==='forge-outcome-evidence.v1'&&d.expert_id===expert&&d.production_acceptance===false&&d.policy==='factory-outcome-credit.v1');
 need(['policy_sha256','authority_sha256','package_sha256','projection_sha256'].every(k=>typeof d[k]==='string'&&hash.test(d[k])));
 need(d.from_season===source.from_season&&d.to_season===source.to_season&&season.test(d.from_season)&&season.test(d.to_season));
 exact(d.activity,['insights','reviewed_quests','rejected_quests']);need(Object.values(d.activity).every(count));
 exact(d.impact,['verified_outcomes','net_xp','ledger_xp']);need(count(d.impact.verified_outcomes)&&number(d.impact.net_xp)&&number(d.impact.ledger_xp));
 const quests=new Set(),events=new Set(),lines=new Map(),reversed=new Set(),insights=new Set();
 let verified=0,rejected=0,net=0,scored=0;
 for(const q of list(d.quests,100)){
  exact(q,['id','expert_id','title','review_id','source_sha256','native_run_id','insight_ids','status','net_xp','ledger_xp','events']);
  need(ident(q.id)&&!quests.has(q.id)&&q.expert_id===expert&&text(q.title)&&ident(q.review_id)&&digest(q.source_sha256));quests.add(q.id);
  need(q.native_run_id===null||typeof q.native_run_id==='string'&&id.test(q.native_run_id));
  need(list(q.insight_ids,20).length>0&&q.insight_ids.every(v=>typeof v==='string'&&id.test(v))&&new Set(q.insight_ids).size===q.insight_ids.length);
  q.insight_ids.forEach(i=>insights.add(i));
  need(['verified','withdrawn','not_met','pending','rejected'].includes(q.status)&&number(q.net_xp)&&number(q.ledger_xp));
  let qnet=0,qscored=0,lastTime=-Infinity,lastID='';
  for(const e of list(q.events,100)){
   exact(e,['id','status','at','source_sha256','lines']);
   need(ident(e.id)&&!events.has(e.id)&&digest(e.source_sha256)&&stamp(e.at)&&Date.parse(e.at)<=Date.parse(captured));events.add(e.id);
   const time=Date.parse(e.at);need(time>lastTime||time===lastTime&&e.id>lastID);lastTime=time;lastID=e.id;
   need(['verified','withdrawn','not_met'].includes(e.status));
   need(list(e.lines,1000).length===0?e.status==='not_met':e.status!=='not_met');
   for(const r of e.lines){
    exact(r,['receipt_id','rule','xp','season','in_ledger','reverses']);
    need(typeof r.receipt_id==='string'&&receipt.test(r.receipt_id)&&!lines.has(r.receipt_id)&&lines.size<1000&&number(r.xp));
    need(r.season===isoSeason(e.at)&&r.in_ledger===(r.season>=d.from_season&&r.season<=d.to_season));
    if(e.status==='withdrawn'){
     const original=lines.get(r.reverses);
     need(r.rule==='outcome_credit_reversal'&&r.receipt_id.startsWith('d4:reversal:')&&r.xp<0&&original&&original.quest===q.id&&original.xp===-r.xp&&!reversed.has(r.reverses));
     reversed.add(r.reverses);
    }else need(['closeout_merged','independent_validator','done_when_check_met'].includes(r.rule)&&r.xp>0&&r.reverses===null&&!r.receipt_id.startsWith('d4:reversal:'));
    lines.set(r.receipt_id,{quest:q.id,xp:r.xp});qnet+=r.xp;if(r.in_ledger)qscored+=r.xp;
   }
  }
  need(q.net_xp===qnet&&q.ledger_xp===qscored);
  need(q.events.length?q.status===q.events.at(-1).status:['pending','rejected'].includes(q.status));
  need(q.status==='rejected'||q.native_run_id!==null);
  if(q.status==='verified')verified++;if(q.status==='rejected')rejected++;net+=qnet;scored+=qscored;
 }
 need(d.activity.reviewed_quests===quests.size&&d.activity.rejected_quests===rejected&&d.activity.insights<=insights.size&&(quests.size===0?d.activity.insights===0:d.activity.insights>0));
 need(d.impact.verified_outcomes===verified&&d.impact.net_xp===net&&d.impact.ledger_xp===scored);
}

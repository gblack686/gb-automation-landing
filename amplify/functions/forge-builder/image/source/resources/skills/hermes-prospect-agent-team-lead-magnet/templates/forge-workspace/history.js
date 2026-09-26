'use strict';
(() => {
const $ = id => document.getElementById(id);
const scope = JSON.parse($('planning-data').textContent).scope;
const local = scope && (window.ForgeHost || (location.protocol === 'http:' && ['127.0.0.1','localhost'].includes(location.hostname)));
const container = $('history-rows'), status = $('history-status');
let current = null, busy = false, selectedMessage = null;
const text = (tag, value, className) => { const n = document.createElement(tag); n.textContent = value; if(className)n.className=className; return n; };
function button(label, action) { const n=text('button',label,'panel-button');n.type='button';n.addEventListener('click',action);return n; }
function safeURL(url, id) {
 if(typeof url!=='string')return null;
 try { const u=new URL(url); return /^https:\/\/(us\.cloud\.langfuse\.com|cloud\.langfuse\.com|eu\.cloud\.langfuse\.com)\/project\/[A-Za-z0-9_-]+\/traces\/[A-Za-z0-9_-]+$/.test(url) && u.pathname.split('/').pop()===id ? url : null; } catch { return null; }
}
function validate(v, request) {
 if(!v || v.schema_version!=='forge-history-page.v1' || v.source!=='supabase' || v.tenant_id!==scope.tenant_id || v.agent_id!==scope.agent_id || v.view!==request.view || v.session_key!==(request.session_key||null) || v.message_key!==(request.message_key||null) || !Array.isArray(v.rows) || v.rows.length>50 || (v.next!==null && (typeof v.next!=='string'||!v.next||v.next.length>512)))throw Error('Invalid history response');
 const key={sessions:'session_key',messages:'message_key',traces:'trace_id'}[v.view];
 if(new Set(v.rows.map(r=>r[key])).size!==v.rows.length || v.rows.some(r=>typeof r[key]!=='string'||!r[key]||r[key].length>512))throw Error('Invalid history identity');
 if(v.view==='messages' && v.rows.some(r=>typeof r.message_text!=='string'||r.message_text.length>12000))throw Error('Invalid message preview');
 if(v.next && v.next!==v.rows.at(-1)?.[key])throw Error('Invalid history cursor');
 return v;
}
function render() {
 const v=current.page, request=current.request;
 container.replaceChildren(); $('history-breadcrumb').replaceChildren();
 if(v.session_key) {
  $('history-breadcrumb').append(text('p',v.session_key,'tiny'),button('User messages',()=>load({view:'messages',session_key:v.session_key})),button('Session traces',()=>load({view:'traces',session_key:v.session_key})));
 }
 if(v.message_key) {
  container.append(text('p','Traces explicitly linked to this user message','eyebrow'));
  if(selectedMessage?.message_key===v.message_key)container.append(text('pre',selectedMessage.message_text,'history-message'));
 }
 status.textContent=`Supabase · ${v.rows.length} ${v.view} on this page${v.next ? ' · more available' : ''}`;
 if(!v.rows.length)container.append(text('p',v.view==='sessions'?'No saved runtime sessions for this expert. Capture has not been verified.':v.view==='messages'?'No saved user messages in this session.':'No explicitly linked traces found. Missing correlation or an unsynced trace may be the cause.','small history-empty'));
 for(const row of v.rows) {
  const card=text('article','','history-card');
  if(v.view==='sessions') {
   card.append(button(row.session_id,()=>load({view:'messages',session_key:row.session_key})),text('p',`${row.harness} · ${row.last_active_at||'Time unknown'}`,'tiny'));
   const complete=row.delivery==='complete' && Number(row.saved_messages)===Number(row.expected_messages);
   card.append(text('p',`${row.saved_messages} / ${row.expected_messages} user messages saved · ${complete ? 'delivery complete for last imported snapshot' : 'capture incomplete or unverified'}`,'small'),button('View session traces',()=>load({view:'traces',session_key:row.session_key})));
  } else if(v.view==='messages') {
   card.append(text('p',`Message ${row.seq} · ${row.ts||'Time unknown'}`,'tiny'),text('pre',row.message_text,'history-message'));
   if(row.preview_truncated)card.append(text('p','Preview limited to 12,000 characters. The stored message is longer.','tiny'));
   card.append(button('View message traces',()=>{selectedMessage=row;load({view:'traces',session_key:v.session_key,message_key:row.message_key});}));
  } else {
   card.append(text('h4',row.trace_name||row.trace_id),text('p',`${row.trace_timestamp||'Time unknown'} · ${row.total_tokens??'Unknown'} tokens · ${row.observation_count??'Unknown'} observations`,'tiny'),text('code',row.trace_id));
   const url=safeURL(row.langfuse_url,row.trace_id);
   if(url) {const a=text('a','Open trace in Langfuse ↗','panel-button');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
   else card.append(text('p','Verified Langfuse link unavailable.','tiny'));
  }
  container.append(card);
 }
 $('history-next').hidden=!v.next;
 $('history-next').onclick=()=>load({...request,after:v.next});
}
async function load(request={view:'sessions'}) {
 if(!local||busy)return;
 busy=true;status.textContent='Loading private history…';
 $('history-refresh').disabled=true;
 try {
  let value;
  if(window.ForgeHost) value=await window.ForgeHost.read('history',request);
  else {
   const response=await fetch('/api/forge/history?'+new URLSearchParams(request),{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw Error('History unavailable');
   value=await response.json();
  }
  const page=validate(value,request);
  current={page,request:{...request}};render();
 }catch {status.textContent='History refresh unavailable. The last successful view is retained.';}
 finally {busy=false;$('history-refresh').disabled=false;}
}
$('history-home').onclick=()=>load({view:'sessions'});
$('history-refresh').onclick=()=>load(current?.request||{view:'sessions'});
status.textContent=local?'Open Sessions or Refresh to read private runtime history.':'Private history is available in the local review server. This document contains no saved conversations.';
if(!local){$('history-home').disabled=true;$('history-refresh').disabled=true;}
// Memory only. No transcripts, message selections or API responses in localStorage.
window.ForgeHistory={refresh:load,busy:()=>busy,view:()=>current?.page.view||null};
})();

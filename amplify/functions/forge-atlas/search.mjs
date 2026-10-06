// Authenticated Forge host search. Adapters return only profile-owned summaries.
export const SEARCH_SOURCES = ['proposal','session','pr','code'];
const empty = () => ({proposal:'unavailable',session:'unavailable',pr:'unavailable',code:'unavailable'});
const safe = (value,max) => typeof value === 'string' ? value.slice(0,max) : '';

export async function runSearch(request, adapters) {
 const raw = request.query.query.trim();
 const prefix = /^(proposal|session|pr|code):\s*(.+)$/i.exec(raw);
 const selected = request.query.source === 'all' && prefix ? prefix[1].toLowerCase() : request.query.source;
 const query = prefix && request.query.source === 'all' ? prefix[2].trim() : raw;
 let intentSource = null, classifier = 'literal';
 if(selected === 'all' && typeof adapters.classify === 'function') {
  try { const hint = await adapters.classify(query); if(SEARCH_SOURCES.includes(hint)) { intentSource=hint; classifier='jev'; } }
  catch { /* Missing key or provider error keeps literal search usable. */ }
 }
 const types = selected === 'all' ? SEARCH_SOURCES : [selected];
 const coverage = empty(), results = [];
 let truncated = false;
 const settled = await Promise.allSettled(types.map(type => adapters[type](query,request.agent_id,request.query.limit)));
 for (let i=0;i<types.length;i++) {
  const type=types[i], outcome=settled[i];
  if(outcome.status!=='fulfilled')continue;
  const source=outcome.value;
  if(!source || !Array.isArray(source.rows) || source.rows.length>41)continue;
  coverage[type]=source.coverage==='stale'?'stale':source.rows.length?'available':source.coverage==='unavailable'?'unavailable':'empty';
  truncated ||= Boolean(source.truncated || source.rows.length>request.query.limit);
  for(const row of source.rows.slice(0,request.query.limit)) {
   if(!row || !row.id || !row.title)continue;
   const href=safe(row.href,500);
   results.push({id:safe(row.id,200),source:type,title:safe(row.title,240),snippet:safe(row.snippet,500),
    status:safe(row.status,80),updated_at:safe(row.updated_at,40),
    href:/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(pull|blob)\//.test(href)?href:''});
  }
 }
 results.sort((a,b)=>Number(b.source===intentSource)-Number(a.source===intentSource)
  || Number(b.title.toLowerCase().includes(query.toLowerCase()))-Number(a.title.toLowerCase().includes(query.toLowerCase()))
  || b.updated_at.localeCompare(a.updated_at));
 if(results.length>request.query.limit)truncated=true;
 return {schema_version:'forge-unified-search.v1',tenant_id:'gbautomation',agent_id:request.agent_id,
  query:raw,source:selected,intent_source:intentSource,classifier,coverage,truncated,results:results.slice(0,request.query.limit)};
}

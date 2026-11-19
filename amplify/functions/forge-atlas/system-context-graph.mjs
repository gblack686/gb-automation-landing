const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.split(' ').sort().join();
const count=x=>x===null||(Number.isSafeInteger(x)&&x>=0);
const graphId=x=>typeof x==='string'&&/^g_[a-f0-9]{24}$/.test(x);
const kinds=new Set(['area','handoff','host','note','plan','project','research','root','routine','run','memory','skill','spec','vault']);
const secret=/Bearer\s|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[baprs]-|(?:sk|pk)-lf-|-----BEGIN|eyJ[A-Za-z0-9_-]{16,}\.|\bsk-[A-Za-z0-9_-]{20,}/;
const sources=x=>Array.isArray(x)&&x.length>0&&x.length<=2&&new Set(x).size===x.length&&x.every(s=>s==='operations'||s==='knowledge');
const ensure=x=>{if(!x)throw Error('system_unavailable');};
// The producer owns identity reconciliation. The website preserves its opaque
// identities and observed provenance; matching labels never imply a merge.
export function validateContextGraph(graph,stamp) {
 ensure(exact(graph,'schema visibility sources nodes links complete')&&graph.schema==='ai-os-context-graph.v1'&&graph.visibility==='admin'&&graph.complete===false);
 ensure(Array.isArray(graph.sources)&&graph.sources.length===2&&new Set(graph.sources.map(s=>s?.id)).size===2);
 for(const s of graph.sources)ensure(exact(s,'id status reason generated_at nodes_total nodes_returned possibly_truncated')
  && ['operations','knowledge'].includes(s.id)&&['snapshot','stale','unavailable'].includes(s.status)
  && [null,'not_configured','source_unavailable'].includes(s.reason)&&(s.generated_at===null||stamp(s.generated_at))
  && count(s.nodes_total)&&count(s.nodes_returned)&&typeof s.possibly_truncated==='boolean');
 ensure(Array.isArray(graph.nodes)&&graph.nodes.length<=400);
 const nodes=new Map();
 for(const n of graph.nodes){
  ensure(exact(n,'id label kind area sources')&&graphId(n.id)&&!nodes.has(n.id)
   && typeof n.label==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _.:/()&+\-]{0,159}$/.test(n.label)&&!secret.test(n.label)
   && !/[A-Za-z][A-Za-z0-9+.-]*:\/\/|(?:^|\s)[A-Za-z]:\//i.test(n.label)
   && kinds.has(n.kind)&&typeof n.area==='string'&&/^[A-Za-z0-9_-]{0,80}$/.test(n.area)&&!secret.test(n.area)&&sources(n.sources));
  nodes.set(n.id,n);
 }
 ensure(Array.isArray(graph.links)&&graph.links.length<=2000);
 const pairs=new Set();
 for(const l of graph.links){
  const pair=`${l?.s}/${l?.t}`;
  ensure(exact(l,'s t sources')&&graphId(l.s)&&graphId(l.t)&&nodes.has(l.s)&&nodes.has(l.t)&&!pairs.has(pair)&&sources(l.sources)
   && l.sources.every(s=>nodes.get(l.s).sources.includes(s)&&nodes.get(l.t).sources.includes(s)));
  pairs.add(pair);
 }
 return graph;
}

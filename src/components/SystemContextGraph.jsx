import {useEffect,useId,useMemo,useRef,useState} from 'react';
const colors={operations:'#df9874',knowledge:'#72c6b3',shared:'#b1a4f0'};
const sourceName={operations:'Operations',knowledge:'Knowledge'};
const origin=node=>node.sources.length===2?'shared':node.sources[0];
const number=value=>value===null?'Unknown':value.toLocaleString();
function age(stamp,now){if(!stamp)return 'Unknown source age';const seconds=Math.max(0,Math.floor((now-Date.parse(stamp))/1000));return seconds<60?`${seconds}s ago`:seconds<3600?`${Math.floor(seconds/60)}m ago`:seconds<86400?`${Math.floor(seconds/3600)}h ago`:`${Math.floor(seconds/86400)}d ago`;}
function Badges({sources}){return <span className="context-badges">{sources.map(s=><span key={s} style={{color:colors[s]}}>{sourceName[s]}</span>)}</span>;}

export default function SystemContextGraph({graph,now,onSearch,retained=false}) {
 const svg=useRef(null),drag=useRef(null),marker='context-arrow-'+useId().replace(/:/g,'');
 const [source,setSource]=useState('all'),[area,setArea]=useState(''),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[hover,setHover]=useState(null);
 const [camera,setCamera]=useState({x:0,y:0,w:1000,h:600});
 const graphKey=JSON.stringify({nodes:graph.nodes,links:graph.links});
 const areas=[...new Set(graph.nodes.map(n=>n.area))].sort();
 const layout=useMemo(()=>{
  const visible=graph.nodes.filter(n=>(source==='all'||(source==='shared'?n.sources.length===2:n.sources.includes(source)))
   && (!area||n.area===(area==='@none'?'':area))&&`${n.label} ${n.kind}`.toLowerCase().includes(query.toLowerCase()));
  const groups=[...new Set(visible.map(n=>n.area))].sort().map((id,i)=>({id,label:id||'No area',x:(i%3)*390,y:0,height:0}));
  const nodes=[];let y=0;
  for(let row=0;row<Math.ceil(groups.length/3);row++){
   const current=groups.slice(row*3,row*3+3);
   const height=Math.max(200,...current.map(g=>90+Math.ceil(visible.filter(n=>n.area===g.id).length/2)*76));
   for(const g of current){g.y=y;g.height=height;
    const members=visible.filter(n=>n.area===g.id).sort((a,b)=>a.label.localeCompare(b.label)||a.id.localeCompare(b.id));
    members.forEach((n,i)=>nodes.push({...n,x:g.x+16+(i%2)*178,y:y+54+Math.floor(i/2)*76}));
   }y+=height+20;
  }
  const byId=new Map(nodes.map(n=>[n.id,n]));
  return {nodes,byId,groups,links:graph.links.filter(l=>byId.has(l.s)&&byId.has(l.t)),width:Math.max(390,Math.min(3,groups.length)*390),height:Math.max(240,y)};
 },[graphKey,source,area,query]);
 const aspect=()=>{const r=svg.current?.getBoundingClientRect();return r?.width&&r?.height?r.width/r.height:2;};
 const fit=()=>{const ratio=aspect(),w=Math.max(layout.width+24,(layout.height+24)*ratio),h=w/ratio;setCamera({x:layout.width/2-w/2,y:layout.height/2-h/2,w,h});};
 useEffect(()=>{fit();setHover(null);setSelected(id=>layout.byId.has(id)?id:null);},[layout]);
 const zoom=factor=>setCamera(c=>{const w=Math.min(100000,Math.max(180,c.w*factor)),h=c.h*w/c.w;return {x:c.x+(c.w-w)/2,y:c.y+(c.h-h)/2,w,h};});
 const focus=()=>{const n=layout.byId.get(selected);if(n){const w=480,h=w/aspect();setCamera({x:n.x+82-w/2,y:n.y+26-h/2,w,h});}};
 useEffect(()=>{const el=svg.current;const wheel=e=>{e.preventDefault();zoom(e.deltaY>0?1.12:1/1.12);};el.addEventListener('wheel',wheel,{passive:false});return ()=>el.removeEventListener('wheel',wheel);},[]);
 const inspected=layout.byId.get(hover||selected);
 const related=inspected?graph.links.filter(l=>l.s===inspected.id||l.t===inspected.id):[];
 function inspect(id){setSource('all');setArea('');setQuery('');setSelected(id);setHover(null);}
 return <section className="system-context system-topology" aria-label="Merged operations and knowledge graph">
  <div className="system-section-heading"><div><h2>Operations + knowledge graph</h2><p>One combined view of observed relationships. Coverage incomplete.</p></div><span>{graph.nodes.length} nodes · {graph.links.length} observed links</span></div>
  {retained&&<p className="context-retained" role="status">Refresh unavailable. Showing the last successful combined graph.</p>}
  <div className="context-source-status" aria-label="Graph source coverage">{graph.sources.map(s=><article key={s.id} aria-label={`${sourceName[s.id]} graph source`}>
   <div><strong>{sourceName[s.id]}</strong><span className={`system-state state-${s.status}`}>{s.status}</span></div>
   <p>{s.status==='stale'?'Retained stale source snapshot':s.status==='unavailable'?'Source unavailable':'Source snapshot'}</p>
   <time dateTime={s.generated_at||undefined}>{s.generated_at?new Date(s.generated_at).toLocaleString():'Unknown source timestamp'}</time><span>{age(s.generated_at,now)}</span>
   <span>Returned {number(s.nodes_returned)} · Source total {number(s.nodes_total)}</span>
   <span>{s.possibly_truncated?'Possibly truncated':'No source truncation reported'}</span>
   {s.reason&&<span>{s.reason==='not_configured'?'Not configured':'Source unavailable'}</span>}
  </article>)}</div>
  <div className="context-legend" aria-label="Graph node sources"><span style={{color:colors.operations}}>Operations only</span><span style={{color:colors.knowledge}}>Knowledge only</span><span style={{color:colors.shared}}>Shared identity</span></div>
  <div className="context-filters"><label>Graph source<select aria-label="Graph source" value={source} onChange={e=>setSource(e.target.value)}><option value="all">All sources</option><option value="operations">Operations, including shared</option><option value="knowledge">Knowledge, including shared</option><option value="shared">Shared identities</option></select></label>
   <label>Graph area<select aria-label="Graph area" value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{areas.map(a=><option key={a} value={a||'@none'}>{a||'No area'}</option>)}</select></label>
   <label>Find graph nodes<input type="search" aria-label="Find graph nodes" value={query} maxLength={160} onChange={e=>setQuery(e.target.value)} placeholder="Label or kind"/></label>
  </div>
  <div className="system-graph-tools"><span aria-live="polite">Showing {layout.nodes.length} nodes · {layout.links.length} observed links</span><button onClick={fit}>Fit graph</button><button onClick={focus} disabled={!selected}>Focus node</button><button aria-label="Zoom context graph in" onClick={()=>zoom(.8)}>+</button><button aria-label="Zoom context graph out" onClick={()=>zoom(1.25)}>−</button><button onClick={()=>{setSource('all');setArea('');setQuery('');}}>Reset graph filters</button></div>
  <div className="system-graph-body"><div className="context-canvas">
   {!layout.nodes.length&&<p className="context-empty" role="status">{graph.nodes.length?'No nodes match these filters.':'No graph nodes are available from the reported sources.'}</p>}
   <svg ref={svg} role="group" aria-label="Combined context graph. Drag to pan, scroll to zoom. Select a node to inspect." tabIndex={0} viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
    onKeyDown={e=>{if(e.target!==e.currentTarget)return;const move={ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]}[e.key];if(move){e.preventDefault();setCamera(c=>({...c,x:c.x+move[0],y:c.y+move[1]}));}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.8);}else if(e.key==='-'){e.preventDefault();zoom(1.25);}}}
    onPointerDown={e=>{if(e.target.closest('[role="button"]'))return;drag.current={x:e.clientX,y:e.clientY,c:camera};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(!drag.current)return;const d=drag.current,r=e.currentTarget.getBoundingClientRect(),scale=Math.max(d.c.w/r.width,d.c.h/r.height);setCamera({...d.c,x:d.c.x-(e.clientX-d.x)*scale,y:d.c.y-(e.clientY-d.y)*scale});}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#c4cdc7"/></marker></defs>
    {layout.groups.map(g=><g key={g.id}><rect x={g.x} y={g.y} width={374} height={g.height} rx={14} fill="#27352d" stroke="#64776b"/><text x={g.x+16} y={g.y+30} fill="#d8dfd9" fontSize={16}>{g.label}</text></g>)}
    {layout.links.map(l=>{const a=layout.byId.get(l.s),b=layout.byId.get(l.t),dx=b.x-a.x,dy=b.y-a.y,k=Math.min(84/(Math.abs(dx)||.001),28/(Math.abs(dy)||.001));const d=l.s===l.t?`M${a.x+164} ${a.y+12} c50 -40 50 68 0 28`:`M${a.x+82+dx*k} ${a.y+26+dy*k} L${b.x+82-dx*k} ${b.y+26-dy*k}`;return <path key={`${l.s}/${l.t}`} data-context-link="" d={d} stroke={colors[l.sources.length===2?'shared':l.sources[0]]} strokeWidth={inspected&&(l.s===inspected.id||l.t===inspected.id)?3:1.5} opacity={inspected&&(l.s===inspected.id||l.t===inspected.id)?1:.65} fill="none" markerEnd={`url(#${marker})`}><title>{`${a.label} to ${b.label}; observed by ${l.sources.join(' and ')}`}</title></path>;})}
    {layout.nodes.map(n=><g key={n.id} role="button" tabIndex={0} data-context-node={n.id} aria-label={`Inspect context ${n.label}, ${n.kind}, ${n.sources.join(' and ')}`} aria-pressed={selected===n.id} onClick={()=>setSelected(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(n.id);}}} onFocus={()=>setHover(n.id)} onBlur={()=>setHover(null)} onMouseEnter={()=>setHover(n.id)} onMouseLeave={()=>setHover(null)}>
     <title>{`${n.label} · ${n.kind} · ${n.sources.join(' + ')}`}</title><rect x={n.x} y={n.y} width={164} height={52} rx={8} fill="#19231e" stroke={colors[origin(n)]} strokeWidth={selected===n.id?3:1.5}/><text x={n.x+10} y={n.y+22} fill="#f3f1e7" fontSize={12}>{n.label.length>21?n.label.slice(0,20)+'…':n.label}</text><text x={n.x+10} y={n.y+41} fill={colors[origin(n)]} fontSize={10}>{n.kind} · {origin(n)==='shared'?'Operations + Knowledge':sourceName[origin(n)]}</text></g>)}
   </svg>
  </div><aside className="system-inspector" aria-label="Context node inspector" aria-live="polite">
   <label className="context-node-picker">Inspect node<select aria-label="Inspect context node" value={selected||''} onChange={e=>{setSelected(e.target.value||null);setHover(null);}}><option value="">Choose a node</option>{layout.nodes.map(n=><option key={n.id} value={n.id}>{n.label} ({n.kind}, {n.sources.join(' + ')})</option>)}</select></label>
   {inspected?<><h3>{inspected.label}</h3><Badges sources={inspected.sources}/><p>{inspected.kind} · {inspected.area||'No area'}</p><p className="context-identity">{inspected.id}</p><button onClick={()=>onSearch(inspected.label)}>Search Docs for this node</button><h4>Observed connections ({related.length})</h4>{related.length?<ul>{related.map(l=>{const target=graph.nodes.find(n=>n.id===(l.s===inspected.id?l.t:l.s));return <li key={`${l.s}/${l.t}`}><span>{l.s===inspected.id?'To':'From'} </span><button onClick={()=>inspect(target.id)}>{target.label}</button><Badges sources={l.sources}/></li>;})}</ul>:<p>No observed connections in this snapshot.</p>}</>:<><h3>Explore combined context</h3><p>Select a node to inspect its source membership and actual observed connections. Areas organize the view without adding relationships.</p></>}
  </aside></div>
 </section>;
}

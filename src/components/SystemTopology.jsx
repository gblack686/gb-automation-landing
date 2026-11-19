import {useEffect,useMemo,useRef,useState} from 'react';
const palette=['#d97757','#53a89a','#8c97df','#c6a35b','#b47fa6','#73a5c0'];
export default function SystemTopology({topology}) {
 const svg=useRef(null),drag=useRef(null),[camera,setCamera]=useState({x:0,y:0,w:1000,h:600}),[selected,setSelected]=useState(null),[hover,setHover]=useState(null),[fitGroup,setFitGroup]=useState('');
 const topologyKey=JSON.stringify(topology);
 const layout=useMemo(()=>{
  const groups=topology.groups.map((g,i)=>({...g,x:(i%3)*360,y:Math.floor(i/3)*330,color:palette[i%palette.length]}));
  const nodes=topology.nodes.map(n=>{const g=groups.find(g=>g.id===n.group),j=topology.nodes.filter(r=>r.group===n.group).findIndex(r=>r.id===n.id);return {...n,x:g.x+22+(j%2)*158,y:g.y+65+Math.floor(j/2)*56,color:g.color};});
  // A boundary grows to contain every node, and subsequent rows start below it.
  let y=0;for(let row=0;row<Math.ceil(groups.length/3);row++){
   const current=groups.slice(row*3,row*3+3);const height=Math.max(240,...current.map(g=>96+Math.ceil(nodes.filter(n=>n.group===g.id).length/2)*56));
   for(const g of current){const delta=y-g.y;g.y=y;g.height=height;for(const n of nodes.filter(n=>n.group===g.id))n.y+=delta;}y+=height+24;
  }
  return {groups,nodes,width:Math.max(360,Math.min(3,groups.length)*360),height:Math.max(280,y)};
 },[topologyKey]);
 function fit(group=''){setFitGroup(group);const g=layout.groups.find(g=>g.id===group);setCamera(g?{x:g.x-16,y:g.y-16,w:376,h:g.height+32}:{x:-16,y:-16,w:layout.width+16,h:layout.height+16});}
 useEffect(()=>{fit();setSelected(null);setHover(null);},[layout]); // Keep exploration stable when refresh returns the same topology.
 const zoom=factor=>setCamera(c=>{const w=Math.min(6000,Math.max(180,c.w*factor)),h=c.h*w/c.w;return {x:c.x+(c.w-w)/2,y:c.y+(c.h-h)/2,w,h};});
 useEffect(()=>{const el=svg.current;const wheel=e=>{e.preventDefault();zoom(e.deltaY>0?1.12:1/1.12);};el.addEventListener('wheel',wheel,{passive:false});return ()=>el.removeEventListener('wheel',wheel);},[]);
 const inspect=layout.nodes.find(n=>n.id===(hover||selected));
 return <section className="system-topology" aria-label="System architecture">
  <div className="system-graph-tools"><h2>System atlas</h2><button onClick={()=>fit()}>Fit all</button><button aria-label="Zoom in" onClick={()=>zoom(0.8)}>+</button><button aria-label="Zoom out" onClick={()=>zoom(1.25)}>−</button>
   <label>Boundary <select aria-label="Fit boundary" value={fitGroup} onChange={e=>fit(e.target.value)}><option value="">All boundaries</option>{layout.groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label></div>
  <div className="system-graph-body"><svg ref={svg} role="group" aria-label="Interactive system atlas. Drag to pan, scroll to zoom. Select a node to inspect." viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`} tabIndex={0}
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;const moves={ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]};if(moves[e.key]){e.preventDefault();setCamera(c=>({...c,x:c.x+moves[e.key][0],y:c.y+moves[e.key][1]}));}else if(e.key==='+'||e.key==='=')zoom(.8);else if(e.key==='-')zoom(1.25);}}
   onPointerDown={e=>{if(e.target.closest('[role="button"]'))return;drag.current={x:e.clientX,y:e.clientY,c:camera};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{if(!drag.current)return;const d=drag.current,r=e.currentTarget.getBoundingClientRect(),scale=Math.max(d.c.w/r.width,d.c.h/r.height);setCamera({...d.c,x:d.c.x-(e.clientX-d.x)*scale,y:d.c.y-(e.clientY-d.y)*scale});}}
   onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
   {layout.groups.map(g=><g key={g.id}><rect x={g.x} y={g.y} width={344} height={g.height} rx={18} fill={g.color} fillOpacity=".08" stroke={g.color} strokeOpacity=".5"/><text x={g.x+20} y={g.y+32} fill={g.color} fontSize={16}>{g.label}</text></g>)}
   {topology.edges.map((e,i)=>{const a=layout.nodes.find(n=>n.id===e.from),b=layout.nodes.find(n=>n.id===e.to);return <path key={i} d={`M${a.x+70},${a.y+18} L${b.x+70},${b.y+18}`} stroke="#a6ada9" strokeOpacity=".4" fill="none"><title>{`${a.label}: ${e.label}: ${b.label}`}</title></path>;})}
   {layout.nodes.map(n=><g key={n.id} role="button" tabIndex={0} aria-label={`Inspect ${n.label}`} aria-pressed={selected===n.id} onClick={()=>setSelected(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(n.id);}}} onFocus={()=>setHover(n.id)} onBlur={()=>setHover(null)} onMouseEnter={()=>setHover(n.id)} onMouseLeave={()=>setHover(null)}>
    <title>{n.label}</title><rect x={n.x} y={n.y} width={140} height={38} rx={8} fill="#202725" stroke={n.color} strokeWidth={selected===n.id?3:1}/><text x={n.x+10} y={n.y+24} fill="#f3f1e7" fontSize={12}>{n.label.length>18?n.label.slice(0,17)+'…':n.label}</text></g>)}
  </svg><aside className="system-inspector" aria-label="Node inspector" aria-live="polite">{inspect?<><p className="system-eyebrow">{topology.groups.find(g=>g.id===inspect.group)?.label}</p><h3>{inspect.label}</h3><p>{inspect.description}</p><a href={inspect.source_url} target="_blank" rel="noopener noreferrer">View pinned source on GitHub</a><ul>{topology.edges.filter(e=>e.from===inspect.id||e.to===inspect.id).map((e,i)=><li key={i}>{e.label}: {layout.nodes.find(n=>n.id===(e.from===inspect.id?e.to:e.from))?.label}</li>)}</ul></>:<><h3>Explore the boundaries</h3><p>Select a node to inspect its role, connections and pinned source. Use Fit boundary to focus a group.</p></>}</aside></div>
 </section>;
}

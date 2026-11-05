import {useEffect,useState} from 'react';
import {readLiveBenchmark} from '../lib/forgeLiveAppClient';
const shown=value=>value===null?'Unknown':value.toLocaleString();
export default function ForgeLiveBenchmark({row,catalogSha,agentId}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  readLiveBenchmark(row.id,catalogSha,agentId).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};},[row.id,catalogSha,agentId,attempt]);
 return <section aria-label="Read-only benchmark view" className="resource-live-benchmark">
  <p>Read-only benchmark results from Pi. Reading does not run a benchmark or call a model.</p>
  <button disabled={loading} onClick={()=>setAttempt(n=>n+1)}>Refresh live view</button>
  {loading&&<p role="status">Reading the Mini…</p>}{error&&<p role="alert">{error}{data?' Showing the last successful read below.':''}</p>}
  {data&&<><p>Retrieved {new Date(data.retrieved_at).toLocaleString()} · Source {data.source_commit.slice(0,10)} · Receipt {data.receipt_sha256.slice(0,12)}</p>
   <p>Historical attempts. Event times are shown separately; worker seconds are not total elapsed time. Missing measurements remain unknown. This view does not establish independent quality acceptance.</p>
   <div className="resource-benchmark-table" tabIndex={0} role="region" aria-label="Benchmark attempts"><table>
    <caption>{data.attempts.length} recorded attempts</caption><thead><tr><th>Task / lane</th><th>Event time</th><th>Acceptance</th><th>Tokens</th><th>Worker seconds</th><th>Elapsed seconds</th></tr></thead>
    <tbody>{data.attempts.map(a=><tr key={a.attempt_id}><td>{a.task_id}<br/>{a.lane}</td><td>{new Date(a.occurred_at).toLocaleString()}</td><td>{a.acceptance}</td><td>{shown(a.tokens)}</td><td>{shown(a.worker_seconds)}</td><td>{shown(a.elapsed_seconds)}</td></tr>)}</tbody>
   </table></div></>}
 </section>;
}

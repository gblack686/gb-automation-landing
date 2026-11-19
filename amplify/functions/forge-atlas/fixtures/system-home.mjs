// Synthetic source-check data. Never a runtime fallback or publication input.
export function systemFixture(now=Date.now()) {
 const time=new Date(now-30000).toISOString();
 const graphId=n=>'g_'+n.toString(16).padStart(24,'0');
 return {schema_version:'forge-system-home.v1',tenant_id:'gbautomation',captured_at:time,source_commit:'a'.repeat(40),
  context_graph:{schema:'ai-os-context-graph.v1',visibility:'admin',complete:false,
   sources:[{id:'operations',status:'snapshot',reason:null,generated_at:time,nodes_total:12,nodes_returned:3,possibly_truncated:true},
    {id:'knowledge',status:'stale',reason:null,generated_at:'2020-01-01T00:00:00Z',nodes_total:null,nodes_returned:3,possibly_truncated:false}],
   nodes:[{id:graphId(1),label:'Synthetic shared project',kind:'project',area:'example',sources:['operations','knowledge']},
    {id:graphId(2),label:'Synthetic operation run',kind:'run',area:'example',sources:['operations']},
    {id:graphId(3),label:'Synthetic knowledge note',kind:'note',area:'reference',sources:['knowledge']},
    {id:graphId(4),label:'Synthetic conflicting title',kind:'plan',area:'example',sources:['operations']},
    {id:graphId(5),label:'Synthetic conflicting title',kind:'note',area:'reference',sources:['knowledge']}],
   links:[{s:graphId(1),t:graphId(2),sources:['operations']},{s:graphId(1),t:graphId(3),sources:['knowledge']}]},
  operations:{status:'fresh',generated_at:time,latest_event_at:null,reason:null,counts:{experts:2,reports:null,plans:0,runs:1},
   sources:[{id:'fixture-collector',status:'stale',updated_at:'2020-01-01T00:00:00Z',observed_at:time}],runs:[]},
  observability:{status:'stale',latest_event_at:'2020-01-01T00:00:00Z',fetched_at:time,reason:null,counts:{sessions_total:null,events_total:null,sessions_sampled:1},coverage_complete:false,
   sources:[{id:'fixture-pool',status:'stale',latest_event_at:'2020-01-01T00:00:00Z',sessions_sampled:1}],
   sessions:[{id:'fixture-session',pool:'fixture-pool',agent:null,latest_event_at:'2020-01-01T00:00:00Z',event_count:0,status:'stale'}],
   focus_session:{id:'dna-local-1',status:'unavailable',latest_event_at:null,event_count:null,reason:'not_observed_in_bounded_sample'}},
  topology:{reference_commit:'b'.repeat(40),groups:[{id:'fixture-boundary',label:'Example boundary'},{id:'fixture-second',label:'Example second boundary'}],
   nodes:[{id:'fixture-reader',label:'Example reader',group:'fixture-boundary',description:'Synthetic reader for isolated browser tests.',source_url:`https://github.com/gbauto/gbautomation/blob/${'b'.repeat(40)}/README.md`},
    {id:'fixture-store',label:'Example store',group:'fixture-second',description:'Synthetic store for isolated browser tests.',source_url:`https://github.com/gbauto/gbauto-pi-host/blob/${'b'.repeat(40)}/README.md#L1-L38`}],
   edges:[{from:'fixture-reader',to:'fixture-store',label:'Bounded read'}]},
  docs:{indexed_at:time,count:2,rows:[{id:'docs/example.md',title:'Synthetic indexed document',kind:'doc',path:'docs/example.md'},
   {id:'docs/project.md',title:'Synthetic shared project',kind:'project',path:'docs/project.md'}]}};
}

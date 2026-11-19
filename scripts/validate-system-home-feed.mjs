// Read-only pairing check. The input stays outside public source/build artifacts.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSystemSnapshot} from '../amplify/functions/forge-atlas/system-home.mjs';
if(process.argv.length!==3)throw Error('Provide one private producer snapshot path');
const bytes=readFileSync(process.argv[2]);
if(bytes.length>750000)throw Error('Snapshot exceeds bound');
const data=validateSystemSnapshot(JSON.parse(bytes.toString('utf8')));
console.log(JSON.stringify({valid:true,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
 groups:data.topology.groups.length,nodes:data.topology.nodes.length,docs:data.docs.rows.length,
 context_nodes:data.context_graph.nodes.length,context_links:data.context_graph.links.length,
 context_shared:data.context_graph.nodes.filter(n=>n.sources.length===2).length,
 context_sources:data.context_graph.sources.map(s=>({id:s.id,status:s.status,nodes_total:s.nodes_total,nodes_returned:s.nodes_returned,possibly_truncated:s.possibly_truncated})),
 operations:data.operations.status,observability:data.observability.status,freshness:data.freshness},null,2));

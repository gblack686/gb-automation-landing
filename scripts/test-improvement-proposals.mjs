import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {projectProposals,proposalPath} from '../amplify/functions/forge-atlas/proposals.mjs';
import {validateImprovements} from '../amplify/functions/forge-atlas/factory-improvements.mjs';
const root=process.env.ATLAS_IMPROVEMENT_PROPOSALS;
if(!root)throw Error('ATLAS_IMPROVEMENT_PROPOSALS must name a native-verified preparation directory');
const prepared=JSON.parse(await readFile(root+'/preparation.json'));
const bytes=await readFile(root+'/review-proposals.json');
const evidence={...JSON.parse(bytes),source_sha256:createHash('sha256').update(bytes).digest('hex')};
const row={...prepared.spine_rows.agent_os_proposals[0],producer_runs:prepared.spine_rows.producer_runs[0]};
const request={view:'proposal',agent_id:'pi',query:{proposal_id:row.proposal_id}};
const project=r=>projectProposals(request,[r],null);

test('canonical prepared proposal projects only bounded review evidence and summary',()=>{
 const value=project(row);
 assert.equal(value.improvement_reference.binding_sha256,row.producer_runs.metadata.native_binding_sha256);
 assert.equal(value.summary,row.producer_runs.metadata.summary);
 assert.deepEqual(value.action_items,[row.producer_runs.metadata.next_action]);
 assert.equal(value.payload,undefined);assert.equal(value.producer_runs,undefined);assert.equal(value.metadata,undefined);
 assert.equal(value.improvement_reference.binding.source_synthetic,true);
 assert.equal(value.agent_id,'pi');assert.equal(value.state,'gated');
 assert.equal(projectProposals({...request,view:'proposals',query:{}},[row],'0-0/1').agent_id,'pi');
});

test('Python native references pass the strict hosted reader without altering v1 IDs',()=>{
 const result=validateImprovements(evidence,'consulting/pi',evidence.captured_at);
 assert.equal(result.rows.filter(r=>r.proposal_reference).length,2);
 const ref=result.rows.find(r=>r.proposal_reference?.proposal_id===row.proposal_id).proposal_reference;
 assert.equal(ref.binding_sha256,project(row).improvement_reference.binding_sha256);
 assert.deepEqual(ref.binding,project(row).improvement_reference.binding);
});

for(const [name,change] of [
 ['foreign owner',r=>r.producer_runs.owner_expert='news-agent'],
 ['foreign tenant',r=>r.producer_runs.tenant='foreign'],
 ['changed candidate',r=>r.producer_runs.metadata.native_improvement.candidate_sha256='f'.repeat(64)],
 ['changed evidence',r=>r.producer_runs.metadata.native_improvement.confirmations_sha256='f'.repeat(64)],
 ['different payload identity',r=>r.payload.proposal_id='prop_other'],
 ['different producer',r=>r.payload.producer.producer_run_id='producer_other'],
 ['invented production',r=>r.source_synthetic=false],
 ['producer synthetic drift',r=>r.producer_runs.synthetic=false],
 ['unbound source',r=>r.payload.source.artifact_id='unbound'],
 ['unexpected approval field',r=>r.producer_runs.metadata.native_improvement.approved=true],
 ['missing binding',r=>delete r.producer_runs.metadata.native_improvement]
])test(name+' is rejected',()=>{const value=structuredClone(row);change(value);assert.throws(()=>project(value));});

test('unrelated producer metadata never leaks or creates an improvement link',()=>{
 const value=structuredClone(row);value.producer_runs.metadata={summary:'private',secret:'not exposed'};
 const result=project(value);assert.equal(result.improvement_reference,undefined);assert.equal(result.summary,'');
 assert.equal(JSON.stringify(result).includes('not exposed'),false);
 const url=new URL('https://example.invalid'+proposalPath({view:'proposals',agent_id:'pi',query:{}}));
 assert.equal(url.searchParams.get('select').includes('metadata'),false);
});

test('changed snapshot accounting cannot reuse a proposal binding',()=>{
 const value=structuredClone(evidence),r=value.rows.find(r=>r.proposal_reference);
 r.attempts[0].usage.estimate_usd+=1;
 assert.throws(()=>validateImprovements(value,'consulting/pi',value.captured_at));
});

test('Python exponent preimage is verified without JS reserialization changing its digest',()=>{
 const value=structuredClone(evidence),r=value.rows.find(r=>r.proposal_reference),ref=r.proposal_reference;
 r.attempts[0].usage.estimate_usd=1e-7;
 const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
 // Display-contract fixture only. It does not assert new native experiment proof.
 ref.attempts_json=JSON.stringify(sorted([...r.attempts].sort((a,b)=>a.stage.localeCompare(b.stage)))).replace('"estimate_usd":1e-7','"estimate_usd":1e-07');
 const hash=v=>createHash('sha256').update(v).digest('hex');
 ref.binding.attempts_sha256=hash(ref.attempts_json);ref.binding_sha256=hash(JSON.stringify(sorted(ref.binding)));
 assert.equal(validateImprovements(value,'consulting/pi',value.captured_at).rows.find(x=>x.id===r.id).attempts[0].usage.estimate_usd,1e-7);
});

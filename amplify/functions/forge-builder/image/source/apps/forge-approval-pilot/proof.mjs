import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createPilot} from './server.mjs';
import {python} from './adapters.mjs';

const root=await mkdtemp(join(tmpdir(),'forge-acceptance-'));
const pilot=await createPilot({dataRoot:root,port:0,render:false});
const workflow_id='fw_prop_forge_pilot',operator={role:'operator',actor:'greg'},coordinator={role:'coordinator',actor:'pilot-coordinator'};
try {
 const scope={outcome:'Verify a local approval fixture',deliverables:['receipt'],acceptance:['one-release'],exclusions:['production','real-email','live-execution'],repositories:['gbautomation'],environment:'local',reviewer:'greg',client_recipient:'client',dependencies:[]};
 const command=(command,input={},principal=operator)=>pilot.service.handle({mode:'forge.command',command,input:{workflow_id,...input}},principal);
 await command('accept');await command('scope',{document:scope});await pilot.adapters.drain(pilot.service);
 const {capability}=await pilot.service.mint(workflow_id,'operator');
 await pilot.service.handle({mode:'forge.decide',capability,action:'auto_approve',confirmed:true,grant:{...pilot.config.engineering,repositories:scope.repositories,environments:['local'],operations:['code','test','docs'],phases:[0,1],excluded_actions:scope.exclusions,max_cost:0,expires_at:new Date(Date.now()+86400000).toISOString()}});
 await pilot.adapters.drain(pilot.service);
 const w=await pilot.service.workflow(workflow_id),d=pilot.service.activeDocument(w);
 assert.equal(w.state,'approved');assert.ok(w.events.some(e=>e.action==='delegated_approve'));
 const resume=w.deliveries.find(d=>d.kind==='resume');assert.equal(resume.state,'delivered',JSON.stringify(resume));
 const release=await command('release',{binding:d.body.binding},coordinator);
 const replay=JSON.parse(await python(fileURLToPath(new URL('./resume-fixture.py',import.meta.url)),[],{root,release}));
 assert.equal(replay.idempotent,true);assert.equal(replay.readback_count,1);
 const validation=w.events.find(e=>e.action==='validate');
 const receipt={schema_version:'forge-approval-local-proof.v1',created_at:new Date().toISOString(),status:'local_fixture_pass',
   database:'PGlite PostgreSQL using production migration',workflow_id:w.workflow_id,scope_version:w.scope_version,plan_version:w.plan_version,
   authority:'Greg scope opt-in → independent validator → separate coordinator',
   grant:w.grant_data,release,routing:validation.payload.routing,
   deliveries:w.deliveries.filter(o=>o.kind==='review_email'&&o.result).map(o=>o.result),resume:resume.result,resume_retry:replay,
   live_proof:{actual_email_delivery:'not_run',inbox_readback:'not_run',production_migration:'not_run',live_execution:'not_run',runtime_activation:false},
   artifact_locations:'Canonical relative paths inside a disposable local mirror; no production index writes.'};
 const output=fileURLToPath(new URL('../../artifacts/forge-approval-intake-2026-09-24/local-build',import.meta.url));
 await mkdir(output,{recursive:true});await writeFile(join(output,'workflow-proof.json'),JSON.stringify(receipt,null,2)+'\n');
 process.stdout.write(JSON.stringify({status:receipt.status,artifacts:receipt.routing.artifacts.length,resume_readbacks:replay.readback_count,real_email_sent:false})+'\n');
}finally{await pilot.close();await rm(root,{recursive:true,force:true});}

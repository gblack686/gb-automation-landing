import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeWorker} from '../worker.mjs';
const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',actor='11111111-2222-3333-4444-555555555555';
function fixture(action='voice'){
 const body={action},input_sha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 let current=null,done=null,live,journal,executions=0,closed=0,cleaned=0,published=0,failure=null;
 const store={intent:async()=>({id,actor,body,input_sha256}),result:async()=>done,current:async()=>current,
  publishPacket:async()=>{published++;if(failure==='publish')throw Error('network');},
  snapshot:async()=>{if(failure==='snapshot')throw Error('network');return structuredClone(live);},
  commit:async(value,etag)=>{assert.equal(etag,current?.etag);if(failure==='commit')throw Error('CAS conflict');current={value,etag:'r'+value.revision};},
  finish:async(_id,value)=>{if(failure==='finish')throw Error('network');done=value;}};
 const work=makeWorker({store,open:async()=>{
  live=structuredClone(current?.value.snapshot||{count:0,journal:null});journal=live.journal;
  return {runtime:{execute:async()=>{
   if(journal)return {result:journal,replayed:true};
   executions++;if(failure==='domain')throw Error('version_conflict');
   live.count++;live.journal=action==='generate'?{draft:{packet:{packet_id:'a'.repeat(64)}}}:{voice_reservation:{session_id:id}};
   return {result:live.journal,replayed:false};
  },read:async()=>({count:live.count}),packet:async()=>({}),payload:{},close:async()=>{closed++;}},
   snapshot:async()=>live,cleanup:async()=>{cleaned++;}};
 }});
 return {run:()=>work(id),fail:v=>failure=v,stats:()=>({current,done,executions,closed,cleaned,published})};
}
test('redelivered voice command consumes exactly one durable reservation',async()=>{
 const f=fixture();await f.run();await f.run();const s=f.stats();assert.equal(s.executions,1);assert.equal(s.current.value.state.count,1);assert.equal(s.done.status,'done');assert.equal(s.closed,1);
});
for(const phase of ['snapshot','commit'])test(`crash at ${phase} discards uncommitted reservations`,async()=>{
 const f=fixture();f.fail(phase);await assert.rejects(f.run());assert.equal(f.stats().current,null);f.fail(null);await f.run();assert.equal(f.stats().current.value.state.count,1);assert.equal(f.stats().cleaned,2);
});
test('crash after commit replays the database journal without another decision',async()=>{
 const f=fixture();f.fail('finish');await assert.rejects(f.run());assert.equal(f.stats().current.value.state.count,1);f.fail(null);await f.run();assert.equal(f.stats().executions,1);assert.equal(f.stats().current.value.revision,1);assert.equal(f.stats().done.status,'done');
});
test('packet publication must finish before committing generated state',async()=>{
 const f=fixture('generate');f.fail('publish');await assert.rejects(f.run());assert.equal(f.stats().current,null);f.fail(null);await f.run();assert.equal(f.stats().done.status,'done');assert.equal(f.stats().published,2);
});
test('committed generation replays after crash without needing ephemeral packet files',async()=>{
 const f=fixture('generate');f.fail('finish');await assert.rejects(f.run());f.fail(null);await f.run();assert.equal(f.stats().published,1);assert.equal(f.stats().executions,1);
});
test('domain failures are terminal, sanitized and do not commit state',async()=>{
 const f=fixture();f.fail('domain');await f.run();assert.equal(f.stats().current,null);assert.equal(f.stats().done.error,'version_conflict');assert.equal(f.stats().cleaned,1);
});
test('queue identity cannot select arbitrary object paths',async()=>{
 let read=false;const work=makeWorker({store:{intent:async()=>{read=true;}}});await assert.rejects(()=>work('../private'),/invalid_command_id/);assert.equal(read,false);
});

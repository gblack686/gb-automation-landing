// One FIFO worker owns the pilot database. S3 is the durable commit boundary.
import {createHash} from 'node:crypto';
const digest=x=>createHash('sha256').update(x).digest('hex');
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>JSON.stringify(x,(_,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x);
const terminal=new Set(['version_conflict','workflow_version_conflict','idempotency_conflict','builder_scope_mismatch',
 'invalid_intake_fields','invalid_intake_answer','answer_needs_clarification','credential_shaped_answer','voice_daily_limit','voice_not_configured',
 'voice_consent_required','complete_reviewed_intake_required','proposal_required','exact_document_confirmation_required','unknown_decision','approved_plan_required','intake_approval_mismatch']);
export function makeWorker({store,open,now=()=>new Date().toISOString()}) {
 return async id=>{
  if(!uuid(id))throw Error('invalid_command_id');
  const command=await store.intent(id);
  if(!command||command.id!==id||!uuid(command.actor)||command.input_sha256!==digest(canonical(command.body)))throw Error('invalid_command_receipt');
  if(await store.result(id))return {id,replayed:true};
  const previous=await store.current();let session,committed=false;
  try {
   session=await open({current:previous,actor:command.actor});
   const {result,replayed}=await session.runtime.execute(command);
   if(result?.draft?.packet&&command.body.action==='generate'&&!replayed)await store.publishPacket(await session.runtime.packet(result.draft.packet.packet_id));
   const state=await session.runtime.read(),payload=session.runtime.payload;
   await session.runtime.close();session.closed=true;
   if(!replayed){
    const snapshot=await session.snapshot();
    const archived=await store.snapshot(id,snapshot);
    await store.commit({revision:(previous?.value.revision||0)+1,last_command:id,state,payload,snapshot:archived,updated_at:now()},previous?.etag);
   }
   committed=true;
   // The processed-command journal is already inside the committed database.
   // A crash here replays that result, never the decision or reservation.
   await store.finish(id,{id,status:'done',data:result,completed_at:now()});
   return {id,replayed};
  } catch(e) {
   if(!committed&&terminal.has(e.message)){
    await store.finish(id,{id,status:'failed',error:e.message,completed_at:now()});return {id,status:'failed'};
   }
   throw e;
  } finally {
   if(session){if(!session.closed)await session.runtime.close();await session.cleanup();}
  }
 };
}

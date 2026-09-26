import {requestFor,BuilderError,fail,canonical,digest,BINDING} from './domain.mjs';
export function makeBuilderHandler({issuer,store,queue,voice,now=()=>new Date().toISOString()}) {
 return async event=>{
  try {
   const {input,actor,operator}=requestFor(event,issuer);let result;
   const owned=async()=>{
    const intent=await store.intent(input.id);if(!intent||intent.actor!==actor)fail('command_not_found');return intent;
   };
   if(input.action==='read') {
    const current=await store.current();
    result=current?{...await store.present(current.state),payload:current.payload,operator}:{initialized:false,operator,payload:{scope:BINDING,config:{display_name:'Artist Packet Expert'}}};
   } else if(input.action==='submit') {
    if(input.body.action==='voice')await voice.validate();
    const intent={id:input.id,actor,body:input.body,input_sha256:digest(canonical(input.body)),created_at:now()};
    const existing=await store.intent(input.id);
    if(existing){if(existing.actor!==actor||existing.input_sha256!==intent.input_sha256)fail('idempotency_conflict');}
    else await store.createIntent(intent);
    // Retrying the same intent repairs a lost enqueue; worker journals deduplicate beyond SQS's five-minute window.
    await queue(input.id);result={id:input.id,status:'queued'};
   } else if(input.action==='retry') {
    await owned();await queue(input.id);result={id:input.id,status:'queued'};
   } else if(input.action==='status') {
    await owned();const done=await store.result(input.id);
    result=done?{...done,data:done.data?.draft?await store.present(done.data):done.data}:{id:input.id,status:'queued'};
   } else if(input.action==='claim_voice') {
    const intent=await owned(),done=await store.result(input.id),current=await store.current();
    const age=Date.parse(now())-Date.parse(intent.created_at);
    if(intent.body.action!=='voice'||done?.status!=='done'||!done.data?.voice_reservation?.session_id||
      !Number.isFinite(age)||age<0||age>600000||current?.state.draft.version!==intent.body.version)fail('voice_reservation_unavailable');
    await voice.validate();
    // An ambiguous provider failure consumes the claim. No URL is stored or replayed.
    await store.claimVoice(input.id,{actor,at:now(),session_id:done.data.voice_reservation.session_id});
    result=await voice.mint(done.data.voice_reservation.session_id);
   } else if(input.action==='packet')result=await store.packet(input.packet_id);
   else result=await store.asset(input.packet_id,input.path);
   return {payload:{ok:true,data:result}};
  } catch(e) {
   const known=e instanceof BuilderError||['authentication_required','tenant_access_required','voice_not_configured','voice_agent_settings_need_review','voice_provider_unavailable','voice_session_rejected'].includes(e?.message);
   return {payload:{ok:false,error:known?e.message:'builder_unavailable'}};
  }
 };
}

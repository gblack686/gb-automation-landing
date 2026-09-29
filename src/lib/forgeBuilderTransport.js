// Keep only command identity locally. Briefs, provider URLs and credentials never
// enter browser storage. Reload repairs lost enqueues using the owned intent.
export function createBuilderTransport({request,actor,storage=sessionStorage,signal,onPending=()=>{},
 delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),maxPolls=90}){
 const key='forge-builder:artist-packet-expert:'+actor;
 const check=()=>{if(signal?.aborted)throw Error('builder_closed');};
 const pending=()=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
 const clear=()=>{storage.removeItem(key);onPending(null);};
 async function poll(id){
  for(let n=0;n<maxPolls;n++){
   check();const result=await request({action:'status',id});check();
   if(result.status==='failed'){clear();throw Error(result.error);}
   if(result.status==='done'){clear();return result.data;}
   await delay(1000);
  }
  throw Error('command_pending');
 }
 async function recover(){
  check();const old=pending();
  if(old){onPending(old);await request({action:'retry',id:old.id},true);await poll(old.id);}
  check();return request({action:'read'});
 }
 async function transport(body){
  check();if(body.action==='read')return recover();
  const value=JSON.parse(JSON.stringify(body));
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');
  let item=pending();
  if(item&&item.digest!==digest)throw Error('command_pending');
  if(!item){item={id:crypto.randomUUID(),digest,action:body.action};storage.setItem(key,JSON.stringify(item));}
  onPending(item);
  try{await request({action:'submit',id:item.id,body:value},true);}
  catch(e){if(e.code&&e.code!=='builder_unavailable')clear();throw e;}
  const result=await poll(item.id);check();
  if(body.action==='voice')return request({action:'claim_voice',id:item.id},true);
  return result;
 }
 return {transport,recover};
}

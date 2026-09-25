import {SecretsManagerClient,GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import {digest} from './domain.mjs';
const secrets=new SecretsManagerClient({}),cache=new Map();
async function key(secretId){
 if(cache.has(secretId))return cache.get(secretId);
 const r=await secrets.send(new GetSecretValueCommand({SecretId:secretId}));let value=r.SecretString;
 try{const obj=JSON.parse(value);value=obj.api_key||obj.key||obj.OPENAI_API_KEY||obj.MESHY_API_KEY;}catch{}
 if(typeof value!=='string'||value.length<20)throw Error('Provider configuration unavailable');cache.set(secretId,value);return value;
}
export async function boundedBytes(response,max){
 if(!response.ok||Number(response.headers.get('content-length')||0)>max)throw Error('Download unavailable');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('Download too large');chunks.push(Buffer.from(value));}}
 finally{await reader.cancel();}
 return Buffer.concat(chunks);
}
const download=async(url,max,hosts)=>{
 const u=new URL(url);if(u.protocol!=='https:'||!hosts.includes(u.hostname)||u.username||u.password||u.port)throw Error('Invalid source host');
 return boundedBytes(await fetch(u,{redirect:'error',signal:AbortSignal.timeout(90000)}),max);
};
export function promptFor(job,stage){
 const b=job.brief, shared=`${b.direction.finish}. Preserve the supplied reference's palette, costume materials, facial character and visual style. Expert: ${b.expert.display_name}. Purpose: ${b.expert.purpose}. Operator direction: ${b.direction.operator_notes}. Original artwork, no lettering, words, card frames, logos or watermarks.`;
 return stage==='portrait'?`Create an original square fantasy expert portrait using the attached card artwork as visual reference. One character, head and shoulders, strong silhouette readable at small sizes. Reinterpret its role through objects and composition. ${shared}`:
  `Use the attached APPROVED PORTRAIT as the identity reference. Extend that exact character into a COMPLETE FULL CHARACTER, not a bust. Show head, torso, arms, hands, legs and feet (or the subject's own appendages), all inside the frame with clear margin. ${b.direction.pose} pose, anatomically coherent balance, separated limbs and clear negative space. Plain neutral studio background, no motion blur, fine miniature sculpt detail, strong silhouette, fully visible props. Preserve face and all costume colors. ${shared}`;
}
export const providers={
 async preflight(stage){await key(stage==='portrait'||stage==='character'?process.env.OPENAI_SECRET_ID:process.env.MESHY_SECRET_ID);},
 async card(brief){
  const response=await fetch(`https://api.scryfall.com/cards/${brief.card.scryfall_id}`,{headers:{Accept:'application/json','User-Agent':'GBAutoForge/1.0'},redirect:'error',signal:AbortSignal.timeout(20000)});
  const raw=JSON.parse((await boundedBytes(response,100000)).toString());if(raw.id!==brief.card.scryfall_id)throw Error('Printing mismatch');
  const faces=raw.image_uris?[raw]:raw.card_faces||[],face=faces[brief.card.face_index];if(!face?.image_uris?.art_crop)throw Error('Card face unavailable');
  return {bytes:await download(face.image_uris.art_crop,10000000,['cards.scryfall.io']),metadata:{name:raw.name,face_name:face.name,artist:face.artist||raw.artist,set_code:raw.set,collector_number:raw.collector_number,scryfall_uri:raw.scryfall_uri}};
 },
 async image(job,stage,bytes){
  const prompt=promptFor(job,stage),form=new FormData();form.append('model','gpt-image-2.5-flare');form.append('quality','low');form.append('size',stage==='portrait'?'1024x1024':'1024x1536');form.append('n','1');form.append('prompt',prompt);
  form.append('image',new Blob([bytes],{type:stage==='portrait'?'image/jpeg':'image/png'}),'reference.'+(stage==='portrait'?'jpg':'png'));
  // One attempt. Never retry a billable POST, including after a network timeout.
  const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${await key(process.env.OPENAI_SECRET_ID)}`},body:form,signal:AbortSignal.timeout(190000)});
  const raw=JSON.parse((await boundedBytes(response,30000000)).toString());if(!raw.data?.[0]?.b64_json)throw Error('Missing image output');
  const output=Buffer.from(raw.data[0].b64_json,'base64');if(output.length>15000000||output.subarray(1,4).toString()!=='PNG')throw Error('Invalid image output');
  return {bytes:output,receipt:{provider:'openai',model:'gpt-image-2.5-flare',quality:'low',prompt_sha256:digest(prompt),input_sha256:digest(bytes),usage:raw.usage||null,automatic_retries:0}};
 },
 async meshSubmit(job,stage,bytes){
  const body=stage==='master'?{image_url:`data:image/png;base64,${bytes.toString('base64')}`,ai_model:'meshy-6',model_type:'standard',should_texture:true,enable_pbr:true,texture_resolution:'4k',should_remesh:false,pose_mode:'',image_enhancement:false,remove_lighting:false}:
   {input_task_id:job.stages.master.task_id,topology:'triangle',target_polycount:50000,target_formats:['glb']};
  const response=await fetch(`https://api.meshy.ai/openapi/v1/${stage==='master'?'image-to-3d':'remesh'}`,{method:'POST',headers:{Authorization:`Bearer ${await key(process.env.MESHY_SECRET_ID)}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const raw=JSON.parse((await boundedBytes(response,50000)).toString());if(typeof raw.result!=='string'||!/^[a-f0-9-]{36}$/.test(raw.result))throw Error('Invalid task result');return raw.result;
 },
 async meshPoll(stage,id){
  if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid task');
  const response=await fetch(`https://api.meshy.ai/openapi/v1/${stage==='master'?'image-to-3d':'remesh'}/${id}`,{headers:{Authorization:`Bearer ${await key(process.env.MESHY_SECRET_ID)}`},signal:AbortSignal.timeout(30000)});
  const r=JSON.parse((await boundedBytes(response,100000)).toString());if(r.id!==id)throw Error('Task mismatch');
  return {status:r.status,progress:r.progress,credits:Number.isFinite(r.consumed_credits)?r.consumed_credits:null,url:r.model_urls?.glb};
 },
 meshDownload:url=>download(url,200000000,['assets.meshy.ai']),
};

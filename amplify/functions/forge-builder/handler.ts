import {SecretsManagerClient,GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import {makeBuilderHandler} from './api.mjs';
import {store,queue} from './storage.mjs';
import {createVoice} from './canonical/voice.mjs';
let provider:ReturnType<typeof createVoice>|undefined;
async function voiceProvider(){
 if(!provider){
  const r=await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.ELEVENLABS_SECRET_ID}));
  const value=JSON.parse(r.SecretString||'{}');
  const key=value.api_key||value.ELEVENLABS_API_KEY;if(typeof key!=='string'||key.length<10)throw Error('voice_not_configured');
  provider=createVoice({enabled:true,apiKey:key,agentId:'agent_7801k999ndjreah8914cn4pfy1mq',toolId:'tool_1701m3fejdcwewbr7k65wmczp5tt'});
 }
 return provider;
}
export const handler=makeBuilderHandler({issuer:process.env.COGNITO_ISSUER,store,queue,
 voice:{validate:async()=>{try{return await(await voiceProvider()).validate();}catch(e){if(e instanceof Error&&e.message.startsWith('voice_'))throw e;throw Error('voice_not_configured');}},
        mint:async(id:string)=>(await voiceProvider()).mint(id)}});

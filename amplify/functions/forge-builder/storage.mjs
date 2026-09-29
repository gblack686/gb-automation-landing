import {S3Client,GetObjectCommand,PutObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {SQSClient,SendMessageCommand} from '@aws-sdk/client-sqs';
import {ROOT,fail,sameBinding} from './domain.mjs';
const s3=new S3Client({}),sqs=new SQSClient({});
const location=Key=>({Bucket:process.env.DOCUMENT_BUCKET,Key});
const missing=e=>['NoSuchKey','NotFound'].includes(e?.name)||e?.$metadata?.httpStatusCode===404;
async function json(key,max=400000) {
 try{const r=await s3.send(new GetObjectCommand(location(key)));if(r.ContentLength>max)throw Error('oversize_state');return JSON.parse(await r.Body.transformToString());}
 catch(e){if(missing(e))return null;throw e;}
}
async function create(key,value,conflict) {
 try{await s3.send(new PutObjectCommand({...location(key),Body:JSON.stringify(value),ContentType:'application/json',CacheControl:'private, no-store',IfNoneMatch:'*'}));}
 catch(e){if([409,412].includes(e?.$metadata?.httpStatusCode))fail(conflict);throw e;}
}
async function sign(asset,key,attachment=false) {
 if(!asset||asset.key!==key||!/^[a-f0-9]{64}$/.test(asset.sha256)||typeof asset.version!=='string')fail('artifact_routing_failed');
 const head=await s3.send(new HeadObjectCommand({...location(key),VersionId:asset.version}));
 if(head.Metadata?.sha256!==asset.sha256||head.ContentLength!==asset.bytes||head.Metadata?.expert!=='artist-packet-expert'||head.Metadata?.tenant!=='gbautomation')fail('artifact_routing_failed');
 return {...asset,url:await getSignedUrl(s3,new GetObjectCommand({...location(key),VersionId:asset.version,ResponseCacheControl:'private, no-store',
  ...(attachment?{ResponseContentDisposition:'attachment; filename="'+key.split('/').at(-1)+'"'}:{})}),{expiresIn:120})};
}
export const store={
 current:()=>json(`${ROOT}/current.json`),
 intent:id=>json(`${ROOT}/commands/${id}/intent.json`,30000),
 result:id=>json(`${ROOT}/commands/${id}/result.json`),
 createIntent:intent=>create(`${ROOT}/commands/${intent.id}/intent.json`,intent,'idempotency_conflict'),
 claimVoice:(id,value)=>create(`${ROOT}/commands/${id}/voice-claim.json`,value,'voice_already_claimed'),
 async packet(id){const p=await json(`${ROOT}/packets/${id}/record.json`,500000);if(!p||p.packet_id!==id||!sameBinding(p.manifest.binding))fail('packet_not_found');return p;},
 async asset(id,path){const p=await this.packet(id),asset=p.assets.find(a=>a.path===path);if(!asset)fail('packet_path_denied');return sign(asset,`${ROOT}/packets/${id}/${path}`,!path.startsWith('assets/'));},
 async present(state){
  if(!sameBinding(state.draft?.binding))fail('builder_scope_mismatch');
  const result=structuredClone(state),bootstrap=await json(`${ROOT}/bootstrap/manifest.json`);
  result.visuals={};
  const card=bootstrap?.files?.find(a=>a.path==='assets/card.png');
  if(card){result.visuals.card_asset=await sign(card,`${ROOT}/bootstrap/assets/card.png`);result.visuals.card=result.visuals.card_asset.url;}
  if(result.draft.packet){result.draft.packet.url=null;result.draft.packet.download=(await this.asset(result.draft.packet.packet_id,'package.zip')).url;}
  return result;
 }
};
export const queue=id=>sqs.send(new SendMessageCommand({QueueUrl:process.env.BUILDER_QUEUE_URL,MessageBody:JSON.stringify({id}),MessageGroupId:'artist-packet-expert',MessageDeduplicationId:id}));

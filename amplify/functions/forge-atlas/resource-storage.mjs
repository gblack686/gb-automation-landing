import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { artifactKey, RESOURCE_ROOT, validateResourcePointer } from './resources.mjs';

export function makeResourceStorage({client,bucket,sign}) {
 const read = async (key,versionId,max,expectedSha) => {
  if (!bucket) throw Error('Resource storage unavailable');
  const response = await client.send(new GetObjectCommand({Bucket:bucket,Key:key,...(versionId?{VersionId:versionId}:{})}));
  if (!response.VersionId || response.VersionId==='null' || (versionId && response.VersionId!==versionId)
      || !Number.isSafeInteger(response.ContentLength) || response.ContentLength<1 || response.ContentLength>max
      || !/^[a-f0-9]{64}$/.test(response.Metadata?.sha256||'')) throw Error('Resource version unavailable');
  // Bound the stream itself, not only its advertised length.
  const chunks=[];let size=0;
  for await (const chunk of response.Body) {
   size+=chunk.length;
   if(size>max){response.Body.destroy?.();throw Error('Resource exceeds limit');}
   chunks.push(Buffer.from(chunk));
  }
  const bytes=Buffer.concat(chunks);
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(size!==response.ContentLength || digest!==response.Metadata.sha256 || (expectedSha&&digest!==expectedSha)) throw Error('Resource integrity failed');
  return {bytes,sha256:digest,version_id:response.VersionId};
 };
 return {
  async loadFactorySnapshot(agent) {
   if(typeof agent!=='string'||!/^[a-z][a-z0-9-]{1,62}$/.test(agent))throw Error('Factory expert unavailable');
   return read(`gbautomation/${agent}/factory-workspace.json`,null,1_000_000);
  },
  async loadManifest() {
   const active=await read(`${RESOURCE_ROOT}/active.json`,null,2048);
   const pointer=validateResourcePointer(JSON.parse(active.bytes.toString('utf8')));
   return read(pointer.key,pointer.version_id,1_500_000,pointer.sha256);
  },
  async describeArtifact(artifact) {
   const location={Bucket:bucket,Key:artifactKey(artifact),VersionId:artifact.version_id};
   const head=await client.send(new HeadObjectCommand(location));
   if(head.VersionId!==artifact.version_id || head.ContentLength!==artifact.bytes
       || head.Metadata?.sha256!==artifact.sha256 || head.ContentType!==artifact.media_type) throw Error('Artifact integrity failed');
   const command=new GetObjectCommand({...location,ResponseContentType:artifact.media_type,
    ResponseContentDisposition:'attachment',ResponseCacheControl:'private, no-store'});
   return {url:await sign(client,command,{expiresIn:60})};
  },
 };
}

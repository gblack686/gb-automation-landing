import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { build } from 'esbuild';

test('the locked SDK signs the private GET without network access',async () => {
 const client=new S3Client({region:'us-east-1',credentials:{accessKeyId:'test-access-key',secretAccessKey:'test-secret-key'}});
 try {
  const url=new URL(await getSignedUrl(client,new GetObjectCommand({Bucket:'forge-test',Key:'gbautomation/artist-packet-expert/index.html',ResponseCacheControl:'private, no-store'}),{expiresIn:60}));
  assert.equal(url.hostname,'forge-test.s3.us-east-1.amazonaws.com');
  assert.equal(url.searchParams.get('X-Amz-Expires'),'60');
  assert.equal(url.searchParams.get('response-cache-control'),'private, no-store');
 } finally {client.destroy();}
});

test('the production Lambda entry bundles with all its SDK imports',async () => {
 const result=await build({entryPoints:['amplify/functions/forge-atlas/handler.ts'],bundle:true,platform:'node',target:'node20',format:'esm',write:false,logLevel:'silent'});
 assert.ok(result.outputFiles[0].contents.length>0);
});

import {defineFunction} from '@aws-amplify/backend';
import {DockerImageCode,DockerImageFunction,Architecture} from 'aws-cdk-lib/aws-lambda';
import {Duration,Size} from 'aws-cdk-lib';
import {fileURLToPath} from 'node:url';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {readFileSync} from 'node:fs';

export const forgeBuilder=defineFunction({name:'forge-builder',entry:'./handler.ts',timeoutSeconds:60,resourceGroupName:'data'});
export const forgeBuilderWorker=defineFunction(scope=>{
 const digest=process.env.FORGE_BUILDER_IMAGE_DIGEST;
 const manifest=JSON.parse(readFileSync(fileURLToPath(new URL('./image/source-manifest.json',import.meta.url)),'utf8'));
 if((process.env.AWS_APP_ID||digest)&&(!/^sha256:[a-f0-9]{64}$/.test(digest||'')||process.env.FORGE_BUILDER_SOURCE_SHA256!==manifest.sha256))
  throw Error('Publish the validated Forge worker image and bind its source manifest before the Amplify release');
 const code=digest?DockerImageCode.fromEcr(Repository.fromRepositoryName(scope,'BuilderImage','gbauto-forge-builder-pilot'),{tagOrDigest:digest}):
  DockerImageCode.fromImageAsset(fileURLToPath(new URL('./image',import.meta.url)));
 return new DockerImageFunction(scope,'BuilderWorker',{
 code,
 architecture:Architecture.X86_64,timeout:Duration.seconds(300),memorySize:3072,
 ephemeralStorageSize:Size.gibibytes(2),reservedConcurrentExecutions:1,
});},{resourceGroupName:'data'});

import { defineBackend } from '@aws-amplify/backend';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { langfuseTraces } from './functions/langfuse-traces/resource';
import { macMiniOps } from './functions/mac-mini-ops/resource';
import { capabilityEdit } from './functions/capability-edit/resource';
import { forgeAtlas } from './functions/forge-atlas/resource';
import { Stack } from 'aws-cdk-lib';
import { atlasIssuer, atlasSecretArn, atlasStorage } from './functions/forge-atlas/infrastructure.mjs';
import {forgeVisual,forgeVisualWorker} from './functions/forge-visual/resource';
import {Duration} from 'aws-cdk-lib';
import {Queue} from 'aws-cdk-lib/aws-sqs';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  langfuseTraces,
  macMiniOps,
  capabilityEdit,
  forgeAtlas,
  forgeVisual,
  forgeVisualWorker,
});

const atlasStack = Stack.of(backend.forgeAtlas.resources.lambda);
const atlasDocuments = atlasStorage(atlasStack);
atlasDocuments.grantRead(backend.forgeAtlas.resources.lambda, 'gbautomation/artist-packet-expert/index.html');
backend.forgeAtlas.addEnvironment('DOCUMENT_BUCKET', atlasDocuments.bucketName);
backend.forgeAtlas.addEnvironment('COGNITO_ISSUER', atlasIssuer(atlasStack,backend.auth.resources.userPool.userPoolId));
backend.forgeAtlas.resources.lambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW, actions: ['secretsmanager:GetSecretValue'],
  resources: [atlasSecretArn(atlasStack)],
}));
backend.addOutput({custom: {forge_atlas_bucket_name: atlasDocuments.bucketName}});

const visualRoot='gbautomation/artist-packet-expert/visuals';
const visualDLQ=new Queue(atlasStack,'ForgeVisualDeadLetters',{retentionPeriod:Duration.days(14)});
const visualQueue=new Queue(atlasStack,'ForgeVisualJobs',{visibilityTimeout:Duration.seconds(1440),retentionPeriod:Duration.days(14),deadLetterQueue:{queue:visualDLQ,maxReceiveCount:5}});
for(const fn of [backend.forgeVisual,backend.forgeVisualWorker]){
 fn.addEnvironment('DOCUMENT_BUCKET',atlasDocuments.bucketName);
 fn.addEnvironment('VISUAL_QUEUE_URL',visualQueue.queueUrl);
 visualQueue.grantSendMessages(fn.resources.lambda);
 atlasDocuments.grantRead(fn.resources.lambda,`${visualRoot}/*`);
}
backend.forgeVisual.addEnvironment('COGNITO_ISSUER',atlasIssuer(atlasStack,backend.auth.resources.userPool.userPoolId));
backend.forgeVisual.resources.lambda.addToRolePolicy(new PolicyStatement({actions:['s3:PutObject'],resources:[atlasDocuments.arnForObjects(`${visualRoot}/runs/*/state.json`),atlasDocuments.arnForObjects(`${visualRoot}/active.json`)]}));
atlasDocuments.grantPut(backend.forgeVisualWorker.resources.lambda,`${visualRoot}/runs/*`);
backend.forgeVisualWorker.resources.lambda.addEventSource(new SqsEventSource(visualQueue,{batchSize:1,reportBatchItemFailures:true}));
backend.forgeVisualWorker.resources.lambda.addToRolePolicy(new PolicyStatement({actions:['secretsmanager:GetSecretValue'],resources:[
 atlasSecretArn(atlasStack).replace('infrastructure/supabase/gbauto-*','core/openai-api-key-*'),
 atlasSecretArn(atlasStack).replace('infrastructure/supabase/gbauto-*','providers/meshy-*'),
]}));

backend.langfuseTraces.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:gbautomation/infrastructure/langfuse-*'],
  }),
);

backend.macMiniOps.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:gbautomation/infrastructure/supabase/gbauto-*'],
  }),
);

// capabilityEdit opens a PR against the (private) gbautomation repo using a fine-grained
// GitHub PAT read from AWS Secrets Manager at runtime — never embedded in code/repo.
backend.capabilityEdit.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:gbautomation/github/*'],
  }),
);

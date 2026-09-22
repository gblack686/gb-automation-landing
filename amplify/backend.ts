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

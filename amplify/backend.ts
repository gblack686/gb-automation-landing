import { defineBackend } from '@aws-amplify/backend';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { langfuseTraces } from './functions/langfuse-traces/resource';
import { macMiniOps } from './functions/mac-mini-ops/resource';
import { capabilityEdit } from './functions/capability-edit/resource';
import { forgeWorkshop } from './functions/forge-workshop/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  langfuseTraces,
  macMiniOps,
  capabilityEdit,
  forgeWorkshop,
});

const workshopStack = Stack.of(backend.forgeWorkshop.resources.lambda);
backend.forgeWorkshop.addEnvironment('COGNITO_ISSUER', `https://cognito-idp.${workshopStack.region}.${workshopStack.urlSuffix}/${backend.auth.resources.userPool.userPoolId}`);
backend.forgeWorkshop.resources.lambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: [workshopStack.formatArn({service:'secretsmanager',resource:'secret',resourceName:'gbautomation/infrastructure/supabase/gbauto-*',region:'us-east-1'})],
}));

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

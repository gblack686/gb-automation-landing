import { defineBackend } from '@aws-amplify/backend';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { langfuseTraces } from './functions/langfuse-traces/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  langfuseTraces,
});

backend.langfuseTraces.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:gbautomation/infrastructure/langfuse-*'],
  }),
);

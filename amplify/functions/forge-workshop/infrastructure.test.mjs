import { App, Stack } from 'aws-cdk-lib';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workshopIssuer, workshopSecretArn } from './infrastructure.mjs';

const stack=new Stack(new App(),'fixture',{env:{account:'123456789012',region:'us-east-1'}});
test('Secrets Manager IAM resource uses a colon and the deployment account',()=>{
  const arn=workshopSecretArn(stack);
  assert.match(arn,/:secretsmanager:us-east-1:123456789012:secret:gbautomation\/infrastructure\/supabase\/gbauto-\*$/);
  assert.ok(!arn.includes(':secret/'));
});
test('issuer includes HTTPS and the same deployment pool with the AWS DNS suffix',()=>{
  assert.deepEqual(stack.resolve(workshopIssuer(stack,'us-east-1_fixture')),
    {'Fn::Join':['',['https://cognito-idp.us-east-1.',{Ref:'AWS::URLSuffix'},'/us-east-1_fixture']]});
});

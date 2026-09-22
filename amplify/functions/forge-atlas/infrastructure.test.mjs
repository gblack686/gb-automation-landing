import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atlasIssuer, atlasSecretArn, atlasStorage } from './infrastructure.mjs';
test('private document storage retains versions and blocks all public access',() => {
 const stack=new Stack(new App(),'AtlasStorage');atlasStorage(stack);
 const template=Template.fromStack(stack);
 template.hasResourceProperties('AWS::S3::Bucket',{PublicAccessBlockConfiguration:{BlockPublicAcls:true,BlockPublicPolicy:true,IgnorePublicAcls:true,RestrictPublicBuckets:true},VersioningConfiguration:{Status:'Enabled'}});
 const bucket=Object.values(template.findResources('AWS::S3::Bucket'))[0];assert.equal(bucket.DeletionPolicy,'Retain');
 const rules=bucket.Properties.CorsConfiguration.CorsRules;assert.ok(rules.every(r=>!r.AllowedOrigins.includes('*')));
});
test('issuer and secret access are bound to this deployment',() => {
 const stack=new Stack(new App(),'AtlasScope',{env:{region:'us-east-1',account:'123456789012'}});
 assert.match(atlasSecretArn(stack),/:secretsmanager:us-east-1:123456789012:secret:gbautomation\/infrastructure\/supabase\/gbauto-\*$/);
 assert.deepEqual(stack.resolve(atlasIssuer(stack,'us-east-1_example')),{'Fn::Join':['',['https://cognito-idp.us-east-1.',{Ref:'AWS::URLSuffix'},'/us-east-1_example']]});
});

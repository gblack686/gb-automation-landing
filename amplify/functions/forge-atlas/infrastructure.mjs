import { ArnFormat, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
export const factorySnapshotPolicy = (bucket,enabled=false) => enabled ? new PolicyStatement({
 actions:['s3:GetObject','s3:GetObjectVersion'],resources:[bucket.arnForObjects('gbautomation/*/factory-workspace.json')],
}) : null;
export const atlasIssuer = (stack,pool) => `https://cognito-idp.${stack.region}.${stack.urlSuffix}/${pool}`;
export const atlasSecretArn = stack => stack.formatArn({service:'secretsmanager',resource:'secret',resourceName:'gbautomation/infrastructure/supabase/gbauto-*',arnFormat:ArnFormat.COLON_RESOURCE_NAME});
export const scheduleSecretArn = stack => stack.formatArn({service:'secretsmanager',resource:'secret',resourceName:'gbautomation/core/hermes-chat-basic-auth-*',arnFormat:ArnFormat.COLON_RESOURCE_NAME});
export const typesafeSecretArn = stack => stack.formatArn({service:'secretsmanager',resource:'secret',resourceName:'gbautomation/typesafe/api-key-*',arnFormat:ArnFormat.COLON_RESOURCE_NAME});
export const atlasStorage = stack => new Bucket(stack,'ForgeAtlasDocuments',{
 blockPublicAccess:BlockPublicAccess.BLOCK_ALL,enforceSSL:true,versioned:true,removalPolicy:RemovalPolicy.RETAIN,
 cors:[{allowedMethods:[HttpMethods.GET],allowedOrigins:['https://gbautomation.xyz','https://www.gbautomation.xyz','https://master.d1qefy5a1kauhs.amplifyapp.com'],allowedHeaders:['*'],maxAge:60}],
});

import { ArnFormat } from 'aws-cdk-lib';

export const workshopIssuer = (stack, poolId) =>
  `https://cognito-idp.${stack.region}.${stack.urlSuffix}/${poolId}`;

export const workshopSecretArn = stack => stack.formatArn({
  service:'secretsmanager', region:'us-east-1', resource:'secret',
  resourceName:'gbautomation/infrastructure/supabase/gbauto-*',
  arnFormat:ArnFormat.COLON_RESOURCE_NAME,
});

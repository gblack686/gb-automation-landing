import type { Stack } from 'aws-cdk-lib';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
export function atlasIssuer(stack: Stack, pool: string): string;
export function atlasSecretArn(stack: Stack): string;
export function atlasStorage(stack: Stack): Bucket;

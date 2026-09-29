import {Stack} from 'aws-cdk-lib';
import {IBucket} from 'aws-cdk-lib/aws-s3';
import {IFunction} from 'aws-cdk-lib/aws-lambda';
import {Queue} from 'aws-cdk-lib/aws-sqs';
type FunctionResource={resources:{lambda:IFunction},addEnvironment:(key:string,value:string)=>void};
export function builderInfrastructure(stack:Stack,options:{bucket:IBucket,api:FunctionResource,worker:FunctionResource,issuer:string}):{queue:Queue,dlq:Queue};

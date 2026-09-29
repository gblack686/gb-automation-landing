import {Duration,ArnFormat} from 'aws-cdk-lib';
import {Queue,QueueEncryption} from 'aws-cdk-lib/aws-sqs';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import {PolicyStatement} from 'aws-cdk-lib/aws-iam';

export function builderInfrastructure(stack,{bucket,api:apiResource,worker:workerResource,issuer}){
 const api=apiResource.resources.lambda,worker=workerResource.resources.lambda;
 const root='gbautomation/artist-packet-expert/builder-pilot';
 const dlq=new Queue(stack,'ForgeBuilderDeadLetters',{fifo:true,encryption:QueueEncryption.SQS_MANAGED,retentionPeriod:Duration.days(14)});
 const queue=new Queue(stack,'ForgeBuilderJobs',{fifo:true,contentBasedDeduplication:false,encryption:QueueEncryption.SQS_MANAGED,
  visibilityTimeout:Duration.seconds(1800),retentionPeriod:Duration.days(14),deadLetterQueue:{queue:dlq,maxReceiveCount:5}});
 apiResource.addEnvironment('DOCUMENT_BUCKET',bucket.bucketName);
 apiResource.addEnvironment('COGNITO_ISSUER',issuer);
 apiResource.addEnvironment('BUILDER_QUEUE_URL',queue.queueUrl);
 apiResource.addEnvironment('ELEVENLABS_SECRET_ID','gbautomation/providers/elevenlabs');
 workerResource.addEnvironment('DOCUMENT_BUCKET',bucket.bucketName);
 workerResource.addEnvironment('BUILDER_QUEUE_ARN',queue.queueArn);
 queue.grantSendMessages(api);
 worker.addEventSource(new SqsEventSource(queue,{batchSize:1,reportBatchItemFailures:true}));
 // The API never receives snapshots, mail capabilities, profiles or signing keys.
 api.addToRolePolicy(new PolicyStatement({actions:['s3:GetObject','s3:GetObjectVersion'],resources:[
  'current.json','commands/*/intent.json','commands/*/result.json','packets/*','bootstrap/manifest.json','bootstrap/assets/card.png',
 ].map(p=>bucket.arnForObjects(`${root}/${p}`))}));
 api.addToRolePolicy(new PolicyStatement({actions:['s3:PutObject'],resources:[
  'commands/*/intent.json','commands/*/voice-claim.json',
 ].map(p=>bucket.arnForObjects(`${root}/${p}`))}));
 worker.addToRolePolicy(new PolicyStatement({actions:['s3:GetObject','s3:GetObjectVersion'],resources:[
  'current.json','commands/*/intent.json','commands/*/result.json','bootstrap/*','snapshots/*','packets/*',
 ].map(p=>bucket.arnForObjects(`${root}/${p}`))}));
 worker.addToRolePolicy(new PolicyStatement({actions:['s3:PutObject'],resources:[
  'current.json','commands/*/result.json','snapshots/*','packets/*',
 ].map(p=>bucket.arnForObjects(`${root}/${p}`))}));
 api.addToRolePolicy(new PolicyStatement({actions:['secretsmanager:GetSecretValue'],resources:[stack.formatArn({
  service:'secretsmanager',resource:'secret',resourceName:'gbautomation/providers/elevenlabs-*',arnFormat:ArnFormat.COLON_RESOURCE_NAME,
 })]}));
 return {queue,dlq};
}

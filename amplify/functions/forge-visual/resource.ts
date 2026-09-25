import {defineFunction} from '@aws-amplify/backend';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime,Architecture} from 'aws-cdk-lib/aws-lambda';
import {Duration} from 'aws-cdk-lib';
import {fileURLToPath} from 'node:url';
export const forgeVisual=defineFunction({name:'forge-visual',entry:'./handler.ts',timeoutSeconds:30,resourceGroupName:'data'});
// Sharp must be installed as a native Lambda dependency, not inlined by esbuild.
// The Amplify Linux build installs its matching native package from the lockfile.
export const forgeVisualWorker=defineFunction(scope=>new NodejsFunction(scope,'Worker',{
 entry:fileURLToPath(new URL('./worker-handler.ts',import.meta.url)),runtime:Runtime.NODEJS_22_X,architecture:Architecture.X86_64,
 timeout:Duration.seconds(240),memorySize:3072,bundling:{nodeModules:['sharp'],minify:true},
 environment:{OPENAI_SECRET_ID:'gbautomation/core/openai-api-key',MESHY_SECRET_ID:'gbautomation/providers/meshy'},
}),{resourceGroupName:'data'});

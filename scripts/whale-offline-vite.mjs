// Isolated production-mode build/dev configuration when Amplify's generated output is absent.
// Never deploy this output: it intentionally points to .invalid and has no real identity.
import {build,createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const mode=process.argv[2];if(!['build','serve'].includes(mode))throw Error('Use build or serve');
const main=fileURLToPath(new URL('../src/main.jsx',import.meta.url)).replaceAll('\\','/');
const virtual='\0whale-offline-amplify-outputs';
const outputs={version:'1.4',auth:{aws_region:'us-east-1',user_pool_id:'us-east-1_SYNTHETIC',user_pool_client_id:'syntheticclient',username_attributes:['email'],user_verification_types:['email']},data:{aws_region:'us-east-1',url:'https://synthetic.invalid/graphql',default_authorization_type:'AMAZON_COGNITO_USER_POOLS',authorization_types:[]}};
// Synthetic introspection lets the production SDK exercise the real compiled route.
// It supplies operation shapes only; every request is intercepted in the browser validator.
const operation=name=>({name,isArray:false,isRequired:false,type:{nonModel:'ForgeAtlasResult'},arguments:{input:{name:'input',isArray:false,isRequired:true,type:'AWSJSON'}}});
outputs.data.model_introspection={version:1,models:{},enums:{},nonModels:{ForgeAtlasResult:{name:'ForgeAtlasResult',fields:{payload:{name:'payload',isArray:false,isRequired:false,type:'AWSJSON'}}}},
 queries:Object.fromEntries(['forgeAtlasRead','forgePiRead','forgeChatRead','forgeWealthRead'].map(name=>[name,operation(name)])),
 mutations:Object.fromEntries(['forgeWealthCommand'].map(name=>[name,operation(name)]))};
const plugin={name:'whale-offline-config',enforce:'pre',resolveId(id,importer){if(id==='../amplify_outputs.json'&&importer?.replaceAll('\\','/')===main)return virtual;},load(id){if(id===virtual)return 'export default '+JSON.stringify(outputs);}};
console.log('SYNTHETIC BUILD INPUT: no cloud identity, credentials, provisioning or live access. Do not deploy this output.');
if(mode==='build')await build({plugins:[plugin]});
else{const server=await createServer({plugins:[plugin],server:{host:'127.0.0.1',port:5199,strictPort:true,watch:{ignored:['**/artifacts/**']}}});await server.listen();server.printUrls();}

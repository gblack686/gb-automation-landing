import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
assert.equal(process.version,'v24.22.1');
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),output='artifacts/whaleroom-production-evidence/regressions-'+stamp;
mkdirSync(output,{recursive:true});mkdirSync(output+'/scratch',{recursive:true});
const env={...process.env,FORGE_RESOURCE_BASE:'http://127.0.0.1:5199',FORGE_ATLAS_BASE:'http://127.0.0.1:5199',FORGE_RESOURCE_OUTPUT:output+'/resources',FORGE_ATLAS_OUTPUT:output+'/atlas',FORGE_APP_FIXTURE_ENABLED:'1',FORGE_PI_FIXTURE_ENABLED:'1',TEMP:resolve(output+'/scratch'),TMP:resolve(output+'/scratch'),PYTHONDONTWRITEBYTECODE:'1'};
const phases=[{name:'resources',args:['scripts/validate-hosted-resources.mjs']},{name:'atlas',args:['scripts/validate-forge-atlas.mjs']}];
const source=process.argv[2];
if(source){
 const lock=JSON.parse(readFileSync('scripts/wealth-package.lock.json','utf8'));
 for(const [path,expected] of Object.entries(lock.files))assert.equal(createHash('sha256').update(readFileSync(resolve(source,path))).digest('hex'),expected.sha256,'Upstream changed: '+path);
 const test=resolve(source,'tests/capture-transport.mjs');
 const provenance=['tests/capture-transport.mjs','tests/capture-wire-fixture.py','host/capture-response.mjs','wealth_platform/community/production.py','wealth_platform/community/capture_outbox.py','wealth_platform/community/capture_model.py'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(source,path))).digest('hex')}));
 writeFileSync(output+'/cross-repo-provenance.json',JSON.stringify(provenance,null,2)+'\n');
 phases.push({name:'cross-repo-capture',args:['--test',test]});
}
for(const phase of phases){
 const result=spawnSync(process.execPath,phase.args,{encoding:'utf8',env,maxBuffer:16*1024*1024});
 const log=(result.stdout||'')+(result.stderr||'')+(result.error?String(result.error):'');
 writeFileSync(output+'/'+phase.name+'.log',log);
 const receipt={command:[process.execPath,...phase.args],exit_code:result.status,scope:'Synthetic isolated browser/source validation; no live credentials or browser source.',log:output+'/'+phase.name+'.log',environment:{FORGE_RESOURCE_BASE:env.FORGE_RESOURCE_BASE,FORGE_ATLAS_BASE:env.FORGE_ATLAS_BASE,FORGE_RESOURCE_OUTPUT:env.FORGE_RESOURCE_OUTPUT,FORGE_ATLAS_OUTPUT:env.FORGE_ATLAS_OUTPUT}};
 writeFileSync(output+'/'+phase.name+'.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({...receipt,tail:log.slice(-1600)}));if(result.status!==0)process.exitCode=1;
}

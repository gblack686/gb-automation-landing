// Local synthetic validation only. Never provisions an Amplify sandbox or invokes a live API.
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
assert.equal(process.version,'v24.22.1','Use the pinned Node 24.22.1 runtime');
const root='artifacts/whaleroom-production-evidence';mkdirSync(root,{recursive:true});
const atlas=readdirSync('amplify/functions/forge-atlas').filter(p=>p.endsWith('.test.mjs')).sort().map(p=>'amplify/functions/forge-atlas/'+p);
const phases={tests:['--test',...atlas,'src/lib/forgeWorkspace.test.mjs','src/lib/forgeWealthSession.test.mjs'],
 typecheck:['node_modules/typescript/bin/tsc','--noEmit','-p','amplify/tsconfig.json'],
 package:['scripts/package-wealth.mjs','--check'],build:['node_modules/vite/bin/vite.js','build'],
 'build-offline':['scripts/whale-offline-vite.mjs','build']};
const selected=process.argv.slice(2);assert(selected.length&&selected.every(p=>Object.hasOwn(phases,p)));
const env={...process.env};for(const key of Object.keys(env))if(/^FORGE_.*FIXTURE/.test(key))delete env[key];
const receipts=[];
for(const phase of selected){
 const args=phases[phase],began=new Date().toISOString();
 const result=spawnSync(process.execPath,args,{encoding:'utf8',env,maxBuffer:32*1024*1024});
 const output=(result.stdout||'')+(result.stderr||'')+(result.error?String(result.error):'');
 const name=phase+'-'+began.replace(/[:.]/g,'-');writeFileSync(root+'/'+name+'.log',output);
 const inputs=phase==='tests'?atlas:[];
 const receipt={phase,node:process.version,command:[process.execPath,...args],started:began,finished:new Date().toISOString(),exit_code:result.status,log:root+'/'+name+'.log',inputs:inputs.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
 writeFileSync(root+'/'+name+'.json',JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);
 console.log(JSON.stringify({phase,exit_code:result.status,log:receipt.log,tail:output.slice(-1800)}));
 if(result.status!==0){process.exitCode=1;break;}
}

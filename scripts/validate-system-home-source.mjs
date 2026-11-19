// Retain complete isolated source-check receipts outside the public repository.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute,delimiter} from 'node:path';
const output=process.env.SYSTEM_HOME_OUTPUT||process.argv[2];
const relation=output?relative(resolve('.'),resolve(output)):'';
if(!output||(!relation.startsWith('..')&&!isAbsolute(relation)))throw Error('Set SYSTEM_HOME_OUTPUT to a private evidence directory');
mkdirSync(output,{recursive:true});
const npm=join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const cases=[
 ['atlas',['--test',...readdirSync('amplify/functions/forge-atlas').filter(x=>x.endsWith('.test.mjs')).map(x=>'amplify/functions/forge-atlas/'+x)]],
 ['workshop',['--test',...readdirSync('amplify/functions/forge-workshop').filter(x=>x.endsWith('.test.mjs')).map(x=>'amplify/functions/forge-workshop/'+x)]],
 ['system-client',['--test','src/lib/systemHome.test.mjs']],
 ['typecheck',['node_modules/typescript/bin/tsc','--noEmit','-p','amplify/tsconfig.json']],
 ['tenant',[npm,'run','test:tenant']],['client-hub',[npm,'run','test:client-hub']],['build',[npm,'run','build']],
];
const selected=process.argv.slice(3);
if(selected.some(name=>!cases.some(c=>c[0]===name)))throw Error('Unknown source check');
const results=[];const stamp=Date.now();
for(const [name,args] of cases.filter(c=>!selected.length||selected.includes(c[0]))){
 const start=Date.now(),r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20_000_000,env:{...process.env,PATH:dirname(process.execPath)+delimiter+process.env.PATH}});
 const log=join(output,`${name}-${stamp}.log`);writeFileSync(log,(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):''));
 const row={name,command:[process.execPath,...args],exit_code:r.status,elapsed_ms:Date.now()-start,log};results.push(row);console.log(JSON.stringify(row));
}
writeFileSync(join(output,`source-${stamp}.json`),JSON.stringify({node:process.version,results},null,2));
if(results.some(r=>r.exit_code!==0))process.exitCode=1;

// Reproduce only reviewed source bytes. No directory copy, runtime state or fixture import.
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const browser='public/apps/wealth',server='amplify/functions/forge-atlas/wealth-vendor';
const targets={
 'host/forge-contract.mjs':[browser+'/forge-contract.mjs',server+'/forge-contract.mjs'],
 'host/forge-client.mjs':[browser+'/forge-client.mjs'],
 'host/capture-response.mjs':[browser+'/capture-response.mjs',server+'/capture-response.mjs'],
 'host/forge-gateway.mjs':[server+'/forge-gateway.mjs'],
 'web/whale-cloud.js':[browser+'/whale-cloud.js'],
 'web/whale-browser-captures.js':[browser+'/whale-browser-captures.js'],
 'web/whale-room.css':[browser+'/whale-room.css'],
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const lock=JSON.parse(await readFile('scripts/wealth-package.lock.json','utf8'));
assert.equal(lock.schema_version,'forge-wealth-package.v1');assert.match(lock.source_commit,/^[a-f0-9]{40}$/);
assert.deepEqual(Object.keys(lock.files).sort(),Object.keys(targets).sort());
const args=process.argv.slice(2),check=args.length===1&&args[0]==='--check';
assert(check||args.length===2&&args[0]==='--source-root','Use --check or --source-root <frozen wealth-platform root>');
const planned=[];
for(const [source,destinations] of Object.entries(targets)){
 const expected=lock.files[source];assert.match(expected.sha256,/^[a-f0-9]{64}$/);assert(Number.isSafeInteger(expected.bytes)&&expected.bytes>0);
 for(const target of destinations){
  const path=check?target:resolve(args[1],source);assert(!(await lstat(path)).isSymbolicLink());
  const bytes=await readFile(path);assert.equal(bytes.length,expected.bytes,source+' size changed');assert.equal(hash(bytes),expected.sha256,source+' hash changed');
  if(target.startsWith(browser)){
   const content=bytes.toString('utf8');
   assert(!/\b(?:import|export)\s[^;]*?(?:from\s*)?['"](?:node:|https?:|\.\.\/)|\bimport\s*\(|\beval\s*\(|\bnew\s+Function\s*\(/.test(content),'Unexpected browser import/code: '+source);
   for(const match of content.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g))assert(Object.keys(targets).some(p=>p.endsWith('/'+match[1].replace(/^\.\//,''))),source+' unreviewed import');
   assert(!/@import|url\(\s*['"]?https?:/i.test(content),'Remote CSS is not packaged');
  }
  planned.push({source,target,bytes});
 }
}
const provenance=Buffer.from(JSON.stringify({schema_version:lock.schema_version,source_commit:lock.source_commit,source_state:lock.source_state,files:planned.filter(p=>p.target.startsWith(browser)).map(p=>({source:p.source,file:p.target.slice(browser.length+1),sha256:hash(p.bytes),bytes:p.bytes.length}))},null,2)+'\n');
planned.push({source:null,target:browser+'/provenance.json',bytes:provenance});
for(const dir of [browser,server]){
 let files=[];try{files=await readdir(dir);}catch(error){if(error.code!=='ENOENT')throw error;}
 const allowed=planned.filter(p=>dirname(p.target)===dir).map(p=>p.target.split('/').at(-1));
 assert(files.every(name=>allowed.includes(name)),'Unexpected packaged file in '+dir);
}
if(check)assert.deepEqual(await readFile(browser+'/provenance.json'),provenance,'Provenance changed');
else for(const p of planned){await mkdir(dirname(p.target),{recursive:true});await writeFile(p.target,p.bytes);}
console.log(JSON.stringify({mode:check?'verified':'packaged',source_commit:lock.source_commit,files:planned.map(p=>({path:p.target,sha256:hash(p.bytes),bytes:p.bytes.length}))}));

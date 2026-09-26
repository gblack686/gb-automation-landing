// Check the exact vendored image closure and browser/server canonical copies.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('amplify/functions/forge-builder/image'),source=join(root,'source');
const manifest=JSON.parse(await readFile(join(root,'source-manifest.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(', ')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+': '+canonical(v[k])).join(', ')+'}':JSON.stringify(v);
assert.equal(digest(await readFile(join(root,'Dockerfile'))),manifest.dockerfile_sha256);
assert.equal(digest(canonical({files:manifest.files,dockerfile_sha256:manifest.dockerfile_sha256})),manifest.sha256);
const files=[];
async function walk(dir=''){for(const row of await readdir(join(source,dir),{withFileTypes:true})){
 assert.equal(row.isSymbolicLink(),false);const name=dir?dir+'/'+row.name:row.name;if(row.isDirectory())await walk(name);else files.push(name);
}}
await walk();assert.deepEqual(files.sort(),manifest.files.map(r=>r.path).sort());
for(const row of manifest.files){
 assert.ok(!row.path.includes('..')&&!row.path.includes('node_modules')&&!row.path.includes('.env'));
 const bytes=await readFile(join(source,row.path));assert.equal(bytes.length,row.bytes,row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);
}
for(const [from,to] of [
 ['apps/forge-approval-pilot/voice.mjs','amplify/functions/forge-builder/canonical/voice.mjs'],
 ...['expert-builder.js','expert-builder.css'].map(n=>['resources/skills/hermes-prospect-agent-team-lead-magnet/templates/forge-workspace/'+n,'src/lib/forge-builder/'+n]),
])assert.deepEqual(await readFile(join(source,from)),await readFile(to),to);
console.log(JSON.stringify({passed:true,files:files.length,source_base_commit:manifest.source_base_commit,source_manifest_sha256:manifest.sha256}));

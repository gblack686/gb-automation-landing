import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(root,'../..');
const context={window:{},structuredClone};vm.createContext(context);
for(const file of ['../nexus-forge-window-preview-2026-09-18/source-data.js','data.js'])vm.runInContext(fs.readFileSync(path.resolve(root,file),'utf8'),context);
const data=context.window.FORGE_DATA,contracts=context.window.FORGE_CONTRACTS;
const errors=[];
for(const [kind,key] of Object.entries(contracts.keys)){
 const seen=new Set();for(const row of data[kind]){if(!row[key]||seen.has(row[key]))errors.push(`${kind}: missing or duplicate ${key}`);seen.add(row[key]);}
}
for(const [from,field,to] of contracts.relations){for(const row of data[from]){const ref=field.split('.').reduce((v,k)=>v?.[k],row);if(ref&&!data[to].some(r=>r[contracts.keys[to]]===ref))errors.push(`${from}.${field} -> missing ${to}:${ref}`);}}
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sources=Object.entries(contracts.sources).map(([id,s])=>{const file=path.join(repo,s.path);if(!fs.existsSync(file)){errors.push('Missing contract: '+s.path);return {id,...s,missing:true};}return {id,...s,sha256:hash(fs.readFileSync(file))};});
const browser=JSON.parse(fs.readFileSync(path.join(root,'validation/browser-checks.json'),'utf8'));
if(!browser.passed)errors.push('Browser validation is not passing');
const theme=JSON.parse(fs.readFileSync(path.join(root,'validation/theme-check.json'),'utf8').replace(/^\uFEFF/,''));
if(theme.status!=='pass')errors.push('Theme validation is not passing');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root).filter(f=>!f.endsWith('manifest.json')&&!f.includes('__pycache__')).map(file=>{const bytes=fs.readFileSync(file);return {path:path.relative(root,file).replaceAll('\\','/'),format:path.extname(file).slice(1),bytes:bytes.length,sha256:hash(bytes)};});
const receipt={schema_version:'forge-window-design-manifest.v1',created_at:new Date().toISOString(),status:errors.length?'fail':'pass',demo:true,live_integration:false,source_recipe_revision:data.source_revision,window_count:13,table_count:Object.keys(contracts.keys).length,relationship_count:contracts.relations.length,record_counts:Object.fromEntries(Object.keys(contracts.keys).map(k=>[k,data[k].length])),browser_checks:browser.checks.length,sources,files,failures:errors};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,windows:receipt.window_count,relationships:receipt.relationship_count,browser_checks:receipt.browser_checks,files:files.length,failures:errors}));
if(errors.length)process.exitCode=1;

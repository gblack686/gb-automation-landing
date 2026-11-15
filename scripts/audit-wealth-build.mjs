import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=v=>createHash('sha256').update(v).digest('hex');
const expected=(await readdir('public/apps/wealth')).sort(),actual=(await readdir('dist/apps/wealth')).sort();
assert.deepEqual(actual,expected);const files=[];
for(const name of expected){const source=await readFile('public/apps/wealth/'+name),built=await readFile('dist/apps/wealth/'+name);assert.deepEqual(built,source);files.push({path:'apps/wealth/'+name,sha256:hash(built),bytes:built.length});}
assert(!actual.some(name=>/fixture|server|gateway|database|sqlite|\.png$|\.test\./i.test(name)));
const assets=await readdir('dist/assets');
for(const name of assets.filter(name=>name.endsWith('.js'))){const text=await readFile('dist/assets/'+name,'utf8');assert(!text.includes('Synthetic private capture'));assert(!text.includes('synthetic-request'));}
const receipt={status:'pass',scope:'Exact reviewed Wealth asset set and bytes in production-mode output; no synthetic capture content or server modules in that asset set.',files};
await mkdir('artifacts/whaleroom-production-evidence',{recursive:true});
await writeFile('artifacts/whaleroom-production-evidence/bundle-audit-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));

// Copy only a verified public intake build. The private workbench is excluded.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const source=process.argv[2];if(!source)throw Error('Usage: node scripts/sync-forge.mjs <agent-forge-intake/dist>');
const receipt=JSON.parse(await readFile(join(resolve(source),'build-receipt.json'),'utf8'));
const expected=['forge/index.html','forge/app.js','forge/style.css','forge/theme.js','forge/particle-scene.js','forge/template-tree.generated.js','forge/gb-signature.png','forge/gb-particle-poster.jpg','forge/animated-cta.css','forge/config.js'];
if(receipt.type!=='forge-intake.static-build.v1'||JSON.stringify(receipt.files.map(f=>f.path))!==JSON.stringify(expected))throw Error('Unexpected public build manifest');
for(const f of receipt.files){const bytes=await readFile(join(resolve(source),f.path));if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Build hash mismatch: '+f.path);}
await mkdir('public/forge',{recursive:true});
for(const f of receipt.files)await copyFile(join(resolve(source),f.path),join('public',f.path));
await writeFile('public/forge/build-receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Verified and copied ten public Forge assets.');

// Read only the voice quota from a verified private copy, never open the live DB.
import {readFile,writeFile,mkdir,readdir,cp,mkdtemp} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createStore} from '../forge-approval-pilot/store.mjs';
const [dataRoot,output]=process.argv.slice(2);
if(!dataRoot||!output)throw Error('usage: node export_voice_ledger.mjs DATA_ROOT OUTPUT_JSON');
async function inventory(root){const rows=[];async function walk(dir){for(const entry of await readdir(join(root,dir),{withFileTypes:true})){
 const name=dir?dir+'/'+entry.name:entry.name;if(entry.isSymbolicLink())throw Error('ledger_source_link');
 if(entry.isDirectory())await walk(name);else rows.push([name,createHash('sha256').update(await readFile(join(root,name))).digest('hex')]);
 }}await walk('');return createHash('sha256').update(JSON.stringify(rows.sort())).digest('hex');}
const source=resolve(dataRoot,'postgres'),out=resolve(output);
if(!out.includes('artifacts')||!out.includes('vault-exhaust'))throw Error('private_output_required');
await mkdir(resolve(out,'..'),{recursive:true});
const clone=await mkdtemp(join(resolve(out,'..'),'ledger-copy-')),before=await inventory(source);
await cp(source,join(clone,'postgres'),{recursive:true,errorOnExist:true,force:false});
if(await inventory(source)!==before||await inventory(join(clone,'postgres'))!==before)throw Error('ledger_changed_during_copy');
const db=await createStore(join(clone,'postgres'));
try{
 const normal=(await db.db.query('select id,created_at from pilot_builder_voice order by created_at')).rows.map(row=>({id:row.id,created_at:new Date(row.created_at).toISOString()}));
 const events=await readFile(join(dataRoot,'voice-verification-exceptions/events.jsonl'),'utf8');
 const extra=events.trim().split('\n').map(line=>JSON.parse(line)).filter(row=>row.event==='reserved').map(row=>({id:'exception:'+row.approval_id,created_at:row.at}));
 const value={reviewed:true,source_sha256:before,normal_usage:normal.length,exception_usage:extra.length,usage:[...normal,...extra]};
 await writeFile(out,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({normal_usage:normal.length,exception_usage:extra.length,source_sha256:before}));
}finally{await db.close();}

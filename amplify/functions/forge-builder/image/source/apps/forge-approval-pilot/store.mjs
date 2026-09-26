import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const migrationPath=fileURLToPath(new URL('../../supabase/migrations/20260924090000_forge_approval_workflow.sql',import.meta.url));

// Only this fixture adapter creates minimal stand-ins for upstream spine tables.
// Production runs the migration against the existing native proposal table.
export async function createStore(path) {
  const db=new PGlite(path);
  await db.waitReady;
  const migration=await readFile(migrationPath,'utf8');
  const migrationHash=createHash('sha256').update(migration).digest('hex');
  const existing=await db.query("select to_regclass('public.forge_approval_workflows') as name");
  if(!existing.rows[0].name) {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.agent_os_proposals(proposal_id text primary key,tenant text not null,card_title text not null,source_synthetic boolean not null default true);
      create table public.agent_os_contract_records(record_id uuid primary key);
      create table public.prd_artifacts(prd_id text primary key);
      create table public.architecture_artifacts(architecture_version_id text primary key);`);
    await db.exec(migration);
    await db.exec('create table pilot_schema_version(sha256 text not null)');
    await db.query('insert into pilot_schema_version values($1)',[migrationHash]);
  } else {
    const hasVersion=await db.query("select to_regclass('public.pilot_schema_version') as name");
    const version=hasVersion.rows[0].name?(await db.query('select sha256 from pilot_schema_version')).rows[0]?.sha256:null;
    if(version!==migrationHash){await db.close();throw Error('pilot_schema_changed_use_new_data_root');}
  }
  const signatures={forge_approval_command:['p_tenant','p_actor','p_role','p_command','p_input'],forge_approval_snapshot:['p_tenant','p_agent'],forge_approval_job:['p_tenant','p_command','p_input']};
  return {db,
    async rpc(name,args) {
      const fields=signatures[name];if(!fields)throw Error('unknown_rpc');
      const result=await db.query(`select public.${name}(${fields.map((_,i)=>'$'+(i+1)).join(',')}) as result`,fields.map(k=>typeof args[k]==='object'?JSON.stringify(args[k]):args[k]));
      return result.rows[0].result;
    },
    async seed(id='prop_forge_pilot',tenant='gbautomation') {
      await db.query('insert into public.agent_os_proposals(proposal_id,tenant,card_title) values($1,$2,$3) on conflict do nothing',[id,tenant,'Automate the weekly client report']);
    },
    close:()=>db.close()
  };
}

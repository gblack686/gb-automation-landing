import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('frozen factory contract fixtures retain exact producer provenance and synthetic scope',async()=>{
 const root=new URL('./fixtures/factory/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',root)));
 assert.equal(manifest.schema_version,'forge-factory-test-fixtures.v1');
 assert.match(manifest.source_commit,/^[a-f0-9]{40}$/);
 assert.equal(new Set(manifest.files.map(row=>row.path)).size,manifest.files.length);
 const files=(await readdir(root,{recursive:true})).filter(path=>path.endsWith('.json')&&path!=='manifest.json').map(path=>path.replaceAll('\\','/')).sort();
 assert.deepEqual(files,manifest.files.map(row=>row.path).sort());
 for(const row of manifest.files){
  assert(!row.path.includes('..')&&!row.path.startsWith('/'));
  const bytes=await readFile(new URL(row.path,root));
  assert.equal(bytes.length,row.bytes,row.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);
  assert.match(row.original_sha256,/^[a-f0-9]{64}$/);
  const value=JSON.parse(bytes);
  if(row.path.endsWith('/preparation.json')){
   assert.equal(value.spine_rows.agent_os_proposals[0].source_synthetic,true);
   assert.equal(value.spine_rows.producer_runs[0].synthetic,true);
  }else assert.equal((value.continuity_evidence??value.domain_source).evidence_mode,'fixture');
 }
});

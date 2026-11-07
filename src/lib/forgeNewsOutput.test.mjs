import test from 'node:test';
import assert from 'node:assert/strict';
import {newsOutputSummary} from './forgeNewsOutput.mjs';
const fixture=()=>({schema_version:'forge-news-card-export.v1',expert_id:'gbautomation/news-agent',export_source_commit:'e'.repeat(40),running_source_commit:null,
 card:{id:8,tool_call_id:'104',conversation_id:1,sweep_id:77,props_json:JSON.stringify({title:'Saved headline',summary:'Captured summary'}),primary_category:'Technology',created_at:'2026-11-06T01:00:00Z'},
 lineage:{tool_row_id:12,tool_task_id:104,run_entry_id:100,generation_entry_id:102,generation_task_id:103,sweep_task_id:101}});
test('saved News output preserves exact headline and native identity without awarding acceptance',()=>{
 const value=newsOutputSummary(fixture());assert.equal(value.title,'Saved headline');assert.equal(value.taskId,104);assert.equal(value.generationId,102);
 assert.equal(value.exportSource,'e'.repeat(40));assert.equal(value.acceptance,undefined);
});
test('foreign owner, mismatched tasks, false native source and malformed records are refused',()=>{
 for(const edit of [v=>v.expert_id='gbautomation/youtube-intel',v=>v.card.tool_call_id='12',v=>v.running_source_commit='e'.repeat(40),v=>v.export_source_commit='bad',v=>v.card.props_json='{',v=>v.lineage.generation_entry_id=0]){
  const v=fixture();edit(v);assert.throws(()=>newsOutputSummary(v));
 }
});
test('unrecognized JSON and native card variants retain the generic source view',()=>{
 assert.equal(newsOutputSummary({schema_version:'other'}),null);
 const v=fixture();v.card.props_json=JSON.stringify({title:'Different card type'});assert.equal(newsOutputSummary(v),null);
});

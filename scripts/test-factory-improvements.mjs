import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateImprovements} from '../amplify/functions/forge-atlas/factory-improvements.mjs';
const root=process.env.ATLAS_IMPROVEMENT_FIXTURE;
if(!root)throw Error('ATLAS_IMPROVEMENT_FIXTURE is required');
async function read(name){const raw=await readFile(root+'/'+name);return {...JSON.parse(raw),source_sha256:createHash('sha256').update(raw).digest('hex')};}
const evidence=await read('review.json'),validate=(d,owner='consulting/pi')=>validateImprovements(d,owner,'2026-11-07T00:00:00Z');
test('native review and partial evidence survive the hosted reader',async()=>{
 assert.equal(validate(evidence).rows.length,9);assert.equal(validate(await read('partial-review.json')).promotion_authorized,false);
});
test('wrong expert cannot inherit Pi ownership',()=>assert.throws(()=>validate(evidence,'gbautomation/news-agent')));
for(const [name,mutate] of [
 ['invented promotion',d=>d.promotion_authorized=true],
 ['wrong owner',d=>d.expert_id='gbautomation/news-agent'],
 ['double-counted tokens',d=>d.rows[0].attempts[0].usage.total_tokens+=10],
 ['verified decision with missing confirmation',d=>{d.rows[0].missing=['confirmation_artifacts'];d.rows[0].verification='partial';}],
 ['unknown effect with invented target',d=>{d.rows[0].effects=[{effect:'merge',status:'unknown',verification:'recorded',target_commit:'a'.repeat(40),previous_release:null,artifact_sha256:'b'.repeat(64)}];}],
 ['game state mutation',d=>d.xp=1000],
 ['future capture',d=>d.captured_at='2030-01-01T00:00:00Z']
])test(name,()=>{const d=structuredClone(evidence);mutate(d);assert.throws(()=>validate(d));});

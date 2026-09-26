import {createHash} from 'node:crypto';
import {authenticate,TENANT,EXPERT,CONFIG_SHA} from '../forge-atlas/contract.mjs';
export const ROOT=`${TENANT}/${EXPERT}/builder-pilot`;
export const BINDING=Object.freeze({tenant_id:TENANT,agent_id:EXPERT,board_slug:'gbautomation',config_sha256:CONFIG_SHA});
export const OPERATOR_GROUP='forge-builder-operator';
export class BuilderError extends Error {}
export const fail=code=>{throw new BuilderError(code);};
export const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
export const digest=v=>createHash('sha256').update(v).digest('hex');
export const canonical=v=>JSON.stringify(v,(_,x)=>object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export const sameBinding=b=>object(b)&&Object.keys(b).length===Object.keys(BINDING).length&&Object.entries(BINDING).every(([k,v])=>b[k]===v);
const base=['action','binding','version','workflow_id','workflow_revision'];
const extras={initialize:[],save:['answers'],propose:['confirmed'],accept:[],decide:['confirmed','decision','document_sha256','snooze_until'],generate:[],voice:['confirmed']};
export function commandBody(body) {
 if(!object(body)||!Object.hasOwn(extras,body.action)||!sameBinding(body.binding)||JSON.stringify(body).length>25000)fail('builder_scope_mismatch');
 if(Object.keys(body).some(k=>![...base,...extras[body.action]].includes(k)))fail('invalid_request');
 if(body.action!=='initialize'&&(!Number.isSafeInteger(body.version)||body.version<1))fail('invalid_request');
 if(['propose','decide','voice'].includes(body.action)&&body.confirmed!==true)fail('explicit_confirmation_required');
 if(['accept','decide','generate'].includes(body.action)&&(!/^fw_prop_builder_[a-f0-9]{24}$/.test(body.workflow_id)||!Number.isSafeInteger(body.workflow_revision)||body.workflow_revision<0))fail('invalid_request');
 if(body.action==='decide'&&(!['approve','revise','decline','snooze'].includes(body.decision)||!/^[a-f0-9]{64}$/.test(body.document_sha256)))fail('invalid_request');
 return body;
}
export function requestFor(event,issuer) {
 const claims=authenticate(event,issuer),write=event.typeName==='Mutation'&&event.fieldName==='forgeBuilderCommand';
 if(!write&&!(event.typeName==='Query'&&event.fieldName==='forgeBuilderRead'))fail('invalid_request');
 if(Object.keys(event.arguments||{}).join()!=='input')fail('invalid_request');
 let input=event.arguments.input;if(typeof input==='string'){try{input=JSON.parse(input);}catch{fail('invalid_request');}}
 if(!object(input)||JSON.stringify(input).length>27000||Object.keys(input).some(k=>!['action','id','body','packet_id','path'].includes(k)))fail('invalid_request');
 if(!(write?['submit','retry','claim_voice']:['read','status','packet','asset']).includes(input.action))fail('invalid_request');
 const operator=claims['cognito:groups'].includes(OPERATOR_GROUP);
 if(write&&!operator)fail('operator_access_required');
 if(['submit','retry','claim_voice','status'].includes(input.action)&&!uuid(input.id))fail('invalid_request');
 if(input.action==='submit')commandBody(input.body);
 if(['asset','packet'].includes(input.action)&&!/^[a-f0-9]{64}$/.test(input.packet_id))fail('invalid_request');
 if(input.action==='asset'&&(typeof input.path!=='string'||input.path.length>200||!/^[-a-zA-Z0-9_./]+$/.test(input.path)||input.path.split('/').some(p=>!p||p==='.'||p==='..')))fail('invalid_request');
 return {input,actor:claims.sub,operator};
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateWealthConfig,wealthSecretArns} from './wealth-config.mjs';
const config={enabled:true,origin:'https://fixture.tail000000.ts.net',expert_id:'wealth-expert',resource_id:'ui.wealth.whale-room',catalog_sha256:'a'.repeat(64),source_commit:'b'.repeat(40),tenant_bindings:{['c'.repeat(64)]:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}};
test('Wealth config pins a bounded destination, source and server identity mapping',()=>{
 assert.equal(validateWealthConfig(config),config);
 assert(validateWealthConfig({...config,origin:config.origin+':8443'}));
 for(const origin of ['http://127.0.0.1','https://fixture.tail000000.ts.net:8444','https://fixture.tail000000.ts.net/path','https://user@fixture.tail000000.ts.net','https://example.org'])assert.throws(()=>validateWealthConfig({...config,origin}));
 for(const delta of [{enabled:'true'},{tenant_bindings:{}},{tenant_bindings:{owner:'private'}},{url:config.origin},{issuer:'https://attacker.invalid'},{source_commit:'bad'}])assert.throws(()=>validateWealthConfig({...config,...delta}));
});
test('read and command secret grants are exact, separate, and cannot reuse benchmark authority',()=>{
 const read='arn:aws:secretsmanager:us-east-1:123456789012:secret:gbautomation/wealth/read-abcdef',command=read.replace('/read-','/command-');
 assert.deepEqual(wealthSecretArns(read),[read]);assert.deepEqual(wealthSecretArns(read,command),[read,command]);
 for(const args of [[read,read],[read,'',read],[read,command,command],[read+'*'],['*']])assert.throws(()=>wealthSecretArns(...args));
});

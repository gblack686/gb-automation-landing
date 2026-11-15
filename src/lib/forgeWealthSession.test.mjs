import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWealthSession} from './forgeWealthSession.mjs';
const sessionFor=(sub='owner',exp=60)=>({tokens:{idToken:{payload:{sub,iss:'https://issuer.invalid',exp,'cognito:groups':['tenant-gbautomation']}}}});
function setup(transport=async()=>new Response('{}')){
 let current=sessionFor(),event,expired,invalidations=0;
 const guard=createWealthSession({session:async()=>current,transport,onInvalidate:()=>invalidations++,clock:()=>1000,
  listen:fn=>{event=fn;return()=>{};},setTimer:fn=>{expired=fn;return 1;},clearTimer:()=>{}});
 return {guard,change:value=>{current=value;},event:value=>event(value),expire:()=>expired(),invalidations:()=>invalidations};
}
test('bridge admits the current session, but never dispatches after expiry or signout',async()=>{
 let count=0;const h=setup(async()=>{count++;return new Response('{}');});await h.guard.ready;
 assert.equal((await h.guard.fetch('/saved')).status,200);assert.equal(count,1);
 h.expire();await assert.rejects(h.guard.fetch('/saved'),{name:'AbortError'});assert.equal(count,1);assert.equal(h.invalidations(),1);
});
test('logout aborts transport and fences a delayed success',async()=>{
 let complete,entered,signal;const started=new Promise(resolve=>entered=resolve);
 const h=setup(async(_,init)=>{signal=init.signal;entered();return new Promise(resolve=>complete=resolve);});await h.guard.ready;
 const pending=h.guard.fetch('/saved');await started;h.event('signedOut');assert(signal.aborted);
 complete(new Response('{"data":"private"}'));await assert.rejects(pending,{name:'AbortError'});assert.equal(h.invalidations(),1);
});
test('an account switch during a request cannot return the previous private data',async()=>{
 const h=setup(async()=>{h.change(sessionFor('other'));return new Response('private');});await h.guard.ready;
 await assert.rejects(h.guard.fetch('/saved'),{name:'AbortError'});assert.equal(h.invalidations(),1);
});
test('new sign-in, refresh failure and server denial invalidate the mounted app',async()=>{
 for(const event of ['signedIn','tokenRefresh_failure']){const h=setup();await h.guard.ready;h.event(event);await assert.rejects(h.guard.fetch('/saved'),{name:'AbortError'});}
 for(const status of [401,403]){const h=setup(async()=>new Response('{}',{status}));await h.guard.ready;await assert.rejects(h.guard.fetch('/saved'),{name:'AbortError'});assert.equal(h.invalidations(),1);}
});
test('caller abort fences late response without ending the account session',async()=>{
 const controller=new AbortController(),h=setup(async()=>{controller.abort();return new Response('{}');});await h.guard.ready;
 await assert.rejects(h.guard.fetch('/saved',{signal:controller.signal}),{name:'AbortError'});assert.equal(h.invalidations(),0);h.guard.stop();
});
test('missing, expired or foreign-group sessions never dispatch',async()=>{
 for(const value of [null,sessionFor('owner',1),{tokens:{idToken:{payload:{sub:'owner',iss:'https://issuer.invalid',exp:60,'cognito:groups':['foreign']}}}}]){
  let calls=0;const h=setup(async()=>{calls++;return new Response('{}');});await h.guard.ready;h.change(value);
  await assert.rejects(h.guard.fetch('/saved'),{name:'AbortError'});assert.equal(calls,0);
 }
});

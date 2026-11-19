import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeNext,systemSelection,cycleSystemView,createSystemSession} from './systemHome.mjs';
test('safe deep links preserve query and hash; external/encoded/backslash redirects refused',()=>{
 const good='/atlas/example?window=resources&owner=pi#selected';assert.equal(safeNext('?next='+encodeURIComponent(good)),good);
 for(const bad of ['//evil.invalid','/\\evil.invalid','https://evil.invalid','/%2fevil.invalid','/login','/\nevil.invalid'])assert.equal(safeNext('?next='+encodeURIComponent(bad)),null);
 assert.deepEqual(systemSelection('#view=observability&sid=dna-local-1'),{view:'observability',sid:'dna-local-1'});
});
test('Shift+Tab cycles only outside editing/dialogs and ignores modified/repeated/handled keys',()=>{
 const doc={querySelector:()=>null},e={key:'Tab',shiftKey:true,target:{closest:()=>null}};assert(cycleSystemView(e,doc));
 for(const change of [{defaultPrevented:true},{repeat:true},{isComposing:true},{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:false},{key:'Enter'},{target:{closest:()=>({})}}])assert(!cycleSystemView({...e,...change},doc));assert(!cycleSystemView(e,{querySelector:()=>({})}));
});
const auth=(sub='a',exp=60)=>({tokens:{idToken:{payload:{sub,iss:'fixture-issuer',exp}}}});
function guard(request=async()=>({})){let s=auth(),invalidate=0,listener,timer;const g=createSystemSession({session:async()=>s,request,clock:()=>1000,onInvalidate:()=>invalidate++,listen:cb=>{listener=cb;return ()=>{};},setTimer:cb=>{timer=cb;return 1;},clearTimer:()=>{}});return {g,set:v=>s=v,fire:e=>listener(e),expire:()=>timer(),invalidations:()=>invalidate};}
test('logout, expiry, account switch and revoked access clear and fence late replies',async()=>{
 for(const mode of ['signedOut','signedIn','tokenRefresh_failure','expiry','switch']){
  let release;const h=guard(()=>new Promise(r=>release=r));const p=h.g.read('snapshot');await new Promise(r=>setImmediate(r));
  if(mode==='expiry')h.expire();else if(mode==='switch')h.set(auth('b'));else h.fire(mode);release({private:'late'});await assert.rejects(p);assert.equal(h.invalidations(),1);
 }
 const denied=guard(async()=>{throw Object.assign(Error('denied'),{code:'system_access_required'});});await assert.rejects(denied.g.read('snapshot'));assert.equal(denied.invalidations(),1);
});
test('expired auth dispatches nothing; transient unavailable retains authorized session only',async()=>{
 let calls=0;const h=guard(async()=>{calls++;});h.set(auth('a',1));await assert.rejects(h.g.read('snapshot'));assert.equal(calls,0);
 const transient=guard(async()=>{throw Object.assign(Error('unavailable'),{code:'system_unavailable'});});await assert.rejects(transient.g.read('snapshot'));assert.equal(transient.invalidations(),0);transient.g.stop();
});

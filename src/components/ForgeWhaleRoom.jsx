import {useEffect,useRef,useState} from 'react';
import {generateClient} from 'aws-amplify/data';
import {fetchAuthSession} from 'aws-amplify/auth';
import {Hub} from 'aws-amplify/utils';
import {createWealthSession,scrubWealthDOM} from '../lib/forgeWealthSession.mjs';
import './ForgeWhaleRoom.css';

// The path is compiled host code. Catalog content never chooses a script or URL.
const CLIENT=new URL('/apps/wealth/forge-client.mjs',window.location.origin).href;
const ENTRY=new URL('/apps/wealth/whale-cloud.js',window.location.origin).href;
export default function ForgeWhaleRoom({row,catalogSha}) {
 const root=useRef(null),[error,setError]=useState('');
 useEffect(()=>{
  const element=root.current;let alive=true,guard,unmount,installed;
  const listeners=new Set();
  const invalidate=()=>{
   alive=false;for(const fn of listeners)fn();listeners.clear();unmount?.();
   scrubWealthDOM(element);
   if(globalThis.WealthHost===installed)delete globalThis.WealthHost;
   setError('Your session changed or access expired. Sign in again and reopen Whale Room.');
  };
  const check=()=>{if(guard)void guard.check().catch(()=>{});};
  const storage=event=>{if(event.key===null||event.key?.startsWith('CognitoIdentityServiceProvider.'))guard?.stop();};
  window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);window.addEventListener('storage',storage);
  const css=document.createElement('link');css.rel='stylesheet';css.href='/apps/wealth/whale-room.css';document.head.append(css);
  setError('');
  (async()=>{
   try{
    const {createForgeFetch}=await import(/* @vite-ignore */ CLIENT);
    if(!alive)return;
    const transport=createForgeFetch(generateClient(),{enabled:true,expertId:row.owner_expert,resourceId:row.id,catalogSha256:catalogSha});
    guard=createWealthSession({session:fetchAuthSession,transport,onInvalidate:invalidate,
     listen:fn=>Hub.listen('auth',({payload})=>fn(payload.event))});
    await guard.ready;if(!alive)return;
    installed=Object.freeze({fetch:guard.fetch});globalThis.WealthHost=installed;
    const {mountCloudWhaleRoom}=await import(/* @vite-ignore */ ENTRY);
    if(!alive)return;
    // Bridge and session invalidation are installed before the first app request.
    unmount=mountCloudWhaleRoom(element,{fetch:installed.fetch,subscribeSession:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}});
   }catch{if(alive){guard?.stop();scrubWealthDOM(element);setError('Whale Room could not open. Refresh the resource catalog and retry.');}}
  })();
  return()=>{
   alive=false;guard?.stop();unmount?.();scrubWealthDOM(element);css.remove();
   window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);window.removeEventListener('storage',storage);
   if(globalThis.WealthHost===installed)delete globalThis.WealthHost;
  };
 },[row.id,row.owner_expert,catalogSha]);
 return <div className="forge-whale-room">{error&&<p role="alert">{error}</p>}<div ref={root} /></div>;
}

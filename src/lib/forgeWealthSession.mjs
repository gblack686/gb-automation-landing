// One mount, one verified browser session. Authorization still belongs to AppSync/Lambda.
const abortError = () => new DOMException('The private session ended.', 'AbortError');
function identity(session, now) {
 const claims=session?.tokens?.idToken?.payload;
 if(typeof claims?.sub!=='string'||typeof claims.iss!=='string'||!Number.isSafeInteger(claims.exp)
  ||claims.exp*1000<=now||!Array.isArray(claims['cognito:groups'])||!claims['cognito:groups'].includes('tenant-gbautomation'))throw abortError();
 return {sub:claims.sub,issuer:claims.iss,expires:claims.exp*1000};
}
export function createWealthSession({session,transport,onInvalidate=()=>{},listen=()=>()=>{},
 clock=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}) {
 let scope,stopped=false,expiry,unlisten=()=>{};
 const pending=new Set();
 const stop=()=>{
  if(stopped)return;
  stopped=true;clearTimer(expiry);unlisten();
  for(const controller of pending)controller.abort();pending.clear();scope=null;
  onInvalidate();
 };
 async function check() {
  if(stopped)throw abortError();
  let current;
  try{current=identity(await session(),clock());}catch{stop();throw abortError();}
  if(stopped)throw abortError();
  if(scope&&(scope.sub!==current.sub||scope.issuer!==current.issuer)){stop();throw abortError();}
  scope=current;clearTimer(expiry);expiry=setTimer(stop,Math.min(2147483647,current.expires-clock()));
  return current;
 }
 unlisten=listen(event=>{
  if(['signedOut','signedIn','tokenRefresh_failure'].includes(event))stop();
  else if(event==='tokenRefresh')void check().catch(()=>{});
 });
 return {
  ready:check(),check,stop,
  async fetch(input,init={}) {
   if(stopped||init.signal?.aborted)throw abortError();
   const controller=new AbortController();pending.add(controller);
   const abort=()=>controller.abort();init.signal?.addEventListener('abort',abort,{once:true});
   try{
    await check();if(controller.signal.aborted)throw abortError();
    const response=await transport(input,{...init,signal:controller.signal});
    if(stopped||controller.signal.aborted)throw abortError();
    // Check again after dispatch: another account may now own the Amplify cache.
    await check();if(stopped||controller.signal.aborted)throw abortError();
    if(response.status===401||response.status===403){stop();throw abortError();}
    return response;
   }finally{pending.delete(controller);init.signal?.removeEventListener('abort',abort);}
  },
 };
}

// Clear detached nodes as well: action closures must not retain their private text.
export function scrubWealthDOM(root) {
 for(const node of [...root.querySelectorAll('*')].reverse()){
  if('value' in node)node.value='';
  node.textContent='';node.removeAttribute('href');node.removeAttribute('src');
 }
 root.replaceChildren();
}

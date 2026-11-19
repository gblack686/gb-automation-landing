export const SYSTEM_VIEWS=['operations','docs','observability'];
export function safeNext(search) {
 const next=new URLSearchParams(search).get('next');
 if(!next||next.length>2048||!next.startsWith('/')||next.startsWith('//')||/[\\\x00-\x20\x7f]/.test(next)||/%(?:2f|5c|00|0a|0d)/i.test(next))return null;
 try {const url=new URL(next,'https://workspace.invalid');return url.origin==='https://workspace.invalid'&&url.pathname!=='/login'?next:null;}catch{return null;}
}
export function systemSelection(hash) {
 const p=new URLSearchParams(hash.replace(/^#/,''));
 return {view:SYSTEM_VIEWS.includes(p.get('view'))?p.get('view'):'operations',sid:/^[A-Za-z0-9_.:-]{1,160}$/.test(p.get('sid')||'')?p.get('sid'):'dna-local-1'};
}
export function cycleSystemView(event,document) {
 if(event.key!=='Tab'||!event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.defaultPrevented||event.repeat||event.isComposing)return false;
 if(document.querySelector('dialog[open],[role="dialog"],[aria-modal="true"]'))return false;
 return !event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],.monaco-editor,.cm-editor,iframe');
}
const ended=()=>Object.assign(Error('Your private session ended. Sign in again.'),{code:'session_ended'});
export function createSystemSession({session,request,listen=()=>()=>{},onInvalidate=()=>{},clock=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}) {
 let identity,stopped=false,timer,unlisten=()=>{};
 function stop(){if(stopped)return;stopped=true;clearTimer(timer);unlisten();identity=null;onInvalidate();}
 async function check(){
  if(stopped)throw ended();
  let c;try{c=(await session())?.tokens?.idToken?.payload;}catch{stop();throw ended();}
  if(stopped||!c?.sub||!c.iss||!Number.isSafeInteger(c.exp)||c.exp*1000<=clock()||(identity&&(identity.sub!==c.sub||identity.iss!==c.iss))){stop();throw ended();}
  identity={sub:c.sub,iss:c.iss};clearTimer(timer);timer=setTimer(stop,Math.min(2147483647,c.exp*1000-clock()));
 }
 unlisten=listen(event=>{if(['signedOut','signedIn','tokenRefresh_failure'].includes(event))stop();else if(event==='tokenRefresh')void check().catch(()=>{});});
 return {check,stop,async read(view){
  await check();
  try {const data=await request(view);await check();return data;}
  catch(e){if(stopped)throw ended();if(['authentication_required','system_access_required','access_unavailable','session_ended','invalid_request'].includes(e.code))stop();throw e;}
 }};
}

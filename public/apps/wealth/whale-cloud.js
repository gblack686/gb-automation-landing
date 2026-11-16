/** First-party Forge mount. Host supplies authenticated fetch AND session lifecycle. */
import {mountBrowserCaptures} from './whale-browser-captures.js';
const node=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
export function mountCloudWhaleRoom(container,{fetch:hostFetch,subscribeSession,onBack}={}){
  const root=node('section','','whale-workspace wr-cloud');root.setAttribute('aria-label','Whale Room');container.replaceChildren(root);
  if(typeof hostFetch!=='function'||typeof subscribeSession!=='function'){
    root.append(node('p','Sign in to Forge to open private Whale Room captures.','wr-notice'));
    return ()=>root.remove();
  }
  let stopped=false,active=null,queue=Promise.resolve(),panel,unsubscribe=()=>{},timer;
  root.dataset.pane='feed';root.dataset.view='forum';
  const rail=node('nav','','wr-server-rail');rail.setAttribute('aria-label','Whale Room workspace');
  const orb=node('span','W','wr-server-home');orb.setAttribute('aria-hidden','true');
  const closeChannels=()=>{root.dataset.pane='feed';root.querySelector('.wr-mobile-channel-toggle')?.focus();};
  const server=node('button','WR','wr-server-current');server.type='button';server.setAttribute('aria-label','Show Whale Room channels');server.onclick=()=>{if(root.dataset.pane==='channels')closeChannels();else{root.dataset.pane='channels';root.querySelector('.wr-sidebar [aria-current="true"]')?.focus();}};
  rail.append(orb,node('span','','wr-server-divider'),server,node('span','PRIVATE','wr-server-caption'));
  const sidebar=node('aside','','wr-sidebar'),nav=node('nav');nav.setAttribute('aria-label','Whale Room channels');
  const brand=node('div','','wr-server-heading');brand.append(node('strong','Whale Room'),node('span','⌄','wr-chevron'));
  const channelBack=node('button','Back to messages','wr-mobile-channel-back');channelBack.type='button';channelBack.onclick=closeChannels;
  const chooseChannel=id=>{const drawer=root.dataset.pane==='channels';panel?.selectChannel(id);root.dataset.pane='feed';if(drawer)closeChannels();};
  const allChannels=node('button','All saved captures');allChannels.type='button';allChannels.dataset.channelId='';allChannels.onclick=()=>chooseChannel('');
  const channelScroll=node('div','','wr-channel-scroll');channelScroll.append(channelBack,node('p','YOUR LIBRARY','wr-channel-group-label'),allChannels,nav);
  const identity=node('div','','wr-reader-identity');identity.append(node('span','W','wr-reader-orb'),node('div','Private workspace','wr-reader-name'),node('span','Saved from Discord','wr-reader-subtitle'));
  sidebar.append(brand,channelScroll,identity);
  const selectChannel=id=>{for(const b of sidebar.querySelectorAll('button[data-channel-id]')){if(b.dataset.channelId===id)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');}root.dataset.pane='feed';};
  const renderChannels=channels=>{
    nav.replaceChildren();
    for(const [label,match] of [['TRADER CHANNELS',name=>!['institutional-charts','daily-candle'].includes(name)],['MARKET CONTEXT',name=>['institutional-charts','daily-candle'].includes(name)]]){
      const entries=channels.filter(c=>match(c.name));if(!entries.length)continue;
      const group=node('div','','wr-channel-group');group.append(node('p',label,'wr-channel-group-label'));
      for(const {id,name} of entries){const b=node('button','#'+name);b.type='button';b.dataset.channelId=id;b.onclick=()=>chooseChannel(id);group.append(b);}nav.append(group);
    }
  };
  const main=node('section','','wr-browser-captures');root.append(rail,sidebar,main);
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.dataset.pane==='channels'){event.preventDefault();event.stopPropagation();closeChannels();}});
  const scrub=message=>{
    if(stopped)return;stopped=true;clearTimeout(timer);active?.abort();panel?.destroy();unsubscribe();
    [...root.querySelectorAll('*')].reverse().forEach(n=>{n.textContent='';n.removeAttribute('href');});root.replaceChildren();
    if(message){const p=node('p',message,'wr-notice');p.setAttribute('role','alert');root.append(p);}
  };
  const request=async(path,options={})=>{
    if(stopped)throw new Error('Closed');
    const controller=new AbortController();active=controller;
    const deadline=setTimeout(()=>scrub('Connection timed out. Reopen Whale Room from Forge.'),12000);
    try{
      const response=await hostFetch('/api/wealth/v1/whale-room'+path,{method:options.method||'GET',signal:controller.signal,
        ...(options.body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(options.body)}:{})});
      if(stopped||controller.signal.aborted)throw new Error('Closed');
      const value=await response.json();if(stopped)throw new Error('Closed');
      if(!response.ok){
        if(response.status===401||response.status===403)scrub('Your Forge session expired or access changed. Sign in again to reopen Whale Room.');
        throw Object.assign(new Error(value.error?.code||'storage_unavailable'),{code:value.error?.code,status:response.status});
      }
      return value.data;
    }finally{clearTimeout(deadline);if(active===controller)active=null;}
  };
  const enqueue=(_key,task)=>{queue=queue.then(()=>{if(!stopped)return task();}).catch(()=>{});};
  panel=mountBrowserCaptures(main,{enqueue,call:request,isStopped:()=>stopped,cloud:true,
    back:typeof onBack==='function'?()=>{scrub();onBack();}:undefined,onChannels:renderChannels,onSelection:selectChannel});
  // This callback must fire synchronously on logout, expiry, or owner change, including an idle tab.
  const subscription=subscribeSession(()=>scrub('Your Forge session changed. Reopen Whale Room after signing in.'));
  if(typeof subscription!=='function'){scrub('The Forge session lifecycle is unavailable. Reopen Whale Room.');return ()=>root.remove();}
  unsubscribe=subscription;
  if(stopped){unsubscribe();return ()=>root.remove();}
  const checkSession=()=>{if(stopped)return;enqueue('session',async()=>{try{await request('/browser-captures/status');}catch{}finally{if(!stopped)timer=setTimeout(checkSession,15000);}});};
  panel.open();timer=setTimeout(checkSession,15000);
  return ()=>{scrub();root.remove();};
}

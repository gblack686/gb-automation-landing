import { useEffect, useRef } from 'react';
import { workshopCommand } from '../lib/forgeWorkshopClient';

const METHODS=new Set(['read','save','run','status']);
export default function AgentWorkshop() {
  const frame=useRef(null);
  useEffect(()=>{
    const receive=async event=>{
      if(event.origin!==window.location.origin || event.source!==frame.current?.contentWindow)return;
      const message=event.data;
      if(message?.type!=='forge-workshop.request.v1'||!METHODS.has(message.method)
        ||typeof message.id!=='string'||message.id.length>50
        ||JSON.stringify(message).length>10000)return;
      let payload;
      try { payload=await workshopCommand(message.method,message.input); }
      catch { payload={ok:false,error:'workshop_unavailable'}; }
      frame.current?.contentWindow?.postMessage({type:'forge-workshop.response.v1',id:message.id,payload},window.location.origin);
    };
    window.addEventListener('message',receive);
    return ()=>window.removeEventListener('message',receive);
  },[]);
  return <iframe ref={frame} title="Agent Workshop Studio" src="/workshop-ui/index.html"
    onLoad={()=>frame.current?.contentWindow?.postMessage({type:'forge-workshop.ready.v1'},window.location.origin)}
    style={{position:'fixed',inset:0,width:'100%',height:'100dvh',border:0,background:'#F3F1E7',zIndex:100}}
    allow="clipboard-write" />;
}

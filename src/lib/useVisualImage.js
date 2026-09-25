import {useEffect,useState} from 'react';
import {visualAsset} from './forgeVisualClient';
export function useVisualImage(job,role){
 const [url,setUrl]=useState(null),id=job?.id,hash=job?.assets?.[role]?.sha256;
 useEffect(()=>{setUrl(null);if(!id||!hash)return;let objectURL;const abort=new AbortController();
  visualAsset(id,role,abort.signal).then(r=>{if(!abort.signal.aborted){objectURL=URL.createObjectURL(new Blob([r.bytes],{type:r.asset.mime}));setUrl(objectURL);}}).catch(()=>{});
  return()=>{abort.abort();if(objectURL)URL.revokeObjectURL(objectURL);};
 },[id,hash,role]);return url;
}


import {useEffect,useState,useId} from 'react';
import {useVisualImage} from '../lib/useVisualImage';
import {cardSvg,frameFor} from '../../amplify/functions/forge-visual/card-frame.mjs';

export function CardTextPreview({text,portrait,source,card,printing={}}){
 const id=useId().replace(/[^a-zA-Z0-9]/g,'');
 let svg,error;
 if(source){try{svg=cardSvg({text,portrait,source,card,printing,id});}catch(e){error=e.message;}}
 return <article className="card-text-preview" aria-label="Card text layout preview">
  {svg?<div role="img" aria-label={`${text.title}. ${text.creature_type}. ${text.abilities}. ${text.quote}. Source frame preserved.`} dangerouslySetInnerHTML={{__html:svg}}/>:source?<img src={source} alt="Unmodified source card"/>:<p role="status">Loading the original card…</p>}
  {error&&<p role="alert">{error} Showing the unmodified source.</p>}
 </article>;
}

export default function ForgeCardDraft({job,text,onChange,disabled}){
 const portrait=useVisualImage(job,'portrait'),source=useVisualImage(job,'source_card'),[show,setShow]=useState(false);
 useEffect(()=>setShow(false),[job.id]);
 const variants=job.card_text_variants?.variants||[];
 return <div className="card-draft-workspace">
  <div><button type="button" disabled={disabled} onClick={()=>setShow(true)}>Preview text variants</button><small>Three local writing treatments · no generation charge</small>
   {show&&<div className="card-text-variants">{variants.map(v=><button type="button" disabled={disabled} key={v.id} onClick={()=>onChange(v.text)} aria-label={`Use ${v.label}`} aria-pressed={['title','abilities','quote'].every(k=>text[k]===v.text[k])}><strong>{v.label}</strong><b>{v.text.title}</b><p>{v.text.abilities}</p><em>{v.text.quote}</em></button>)}</div>}
   {show&&<div className="card-mix-fields">{[['title','Title'],['abilities','Abilities'],['quote','Quote']].map(([key,label])=><label key={key}>Choose {label.toLowerCase()}<select aria-label={`Choose ${label.toLowerCase()} variant`} disabled={disabled} value={variants.find(v=>v.text[key]===text[key])?.id||''} onChange={e=>{const v=variants.find(v=>v.id===e.target.value);if(v)onChange({...text,[key]:v.text[key]});}}><option value="">Custom text</option>{variants.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>)}</div>}
  </div><div><CardTextPreview text={text} portrait={portrait} source={source} card={job.brief.card} printing={job.assets.card?.printing}/><small>{frameFor(job.brief.card)?'Original frame · editable art and text interiors. Final PNG gets a protected-pixel check.':'Original source shown. This printing needs a verified frame map.'}</small></div>
 </div>;
}

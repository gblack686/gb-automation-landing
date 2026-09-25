import {useEffect,useState} from 'react';
import {useVisualImage} from '../lib/useVisualImage';

export function CardTextPreview({text,portrait,colors=[]}){
 const palette={W:'#d5caa0',U:'#678aa1',B:'#756a7d',R:'#b96a51',G:'#6d8d6c'};
 const frame=colors.length>1?'#ab9862':palette[colors[0]]||'#a99c86';
 return <article className="card-text-preview" style={{'--card-frame':frame}} aria-label="Card text layout preview">
  <div className="draft-card-title"><strong>{text.title}</strong><span>{text.mana_cost}</span></div>
  {portrait?<img src={portrait} alt="Agent portrait in draft card"/>:<div className="draft-art-placeholder">◇</div>}
  <div className="draft-card-type">{text.creature_type}</div>
  <div className="draft-card-body"><p>{text.abilities}</p><em>{text.quote}</em></div>
  <footer><small>TEXT LAYOUT PREVIEW</small>{text.power&&<b>{text.power}/{text.toughness}</b>}</footer>
 </article>;
}

export default function ForgeCardDraft({job,text,onChange,disabled}){
 const portrait=useVisualImage(job,'portrait'),[show,setShow]=useState(false);
 useEffect(()=>setShow(false),[job.id]);
 const variants=job.card_text_variants?.variants||[];
 return <div className="card-draft-workspace">
  <div><button type="button" disabled={disabled} onClick={()=>setShow(true)}>Preview text variants</button><small>Three local writing treatments · no generation charge</small>
   {show&&<div className="card-text-variants">{variants.map(v=><button type="button" disabled={disabled} key={v.id} onClick={()=>onChange(v.text)} aria-label={`Use ${v.label}`} aria-pressed={['title','abilities','quote'].every(k=>text[k]===v.text[k])}><strong>{v.label}</strong><b>{v.text.title}</b><p>{v.text.abilities}</p><em>{v.text.quote}</em></button>)}</div>}
   {show&&<div className="card-mix-fields">{[['title','Title'],['abilities','Abilities'],['quote','Quote']].map(([key,label])=><label key={key}>Choose {label.toLowerCase()}<select aria-label={`Choose ${label.toLowerCase()} variant`} disabled={disabled} value={variants.find(v=>v.text[key]===text[key])?.id||''} onChange={e=>{const v=variants.find(v=>v.id===e.target.value);if(v)onChange({...text,[key]:v.text[key]});}}><option value="">Custom text</option>{variants.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>)}</div>}
  </div><div><CardTextPreview text={text} portrait={portrait} colors={job.assets.card?.printing?.colors}/><small>Layout mockup. The generated card uses the exact full-card reference.</small></div>
 </div>;
}

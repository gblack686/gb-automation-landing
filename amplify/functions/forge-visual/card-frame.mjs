import fonts from './card-fonts.json' with {type:'json'};
// Shared by the browser preview and PNG compositor. Coordinates are measured on
// the exact NEO 224 printing, not inferred from a card's colors or creature type.
export const FRAME_VERSION = 'neo-224-source-pixels-v1';
export const ISSHIN_PRINTING = 'a062a004-984e-4b62-960c-af7288f7a3e9';
export function frameFor(card) {
 return card?.scryfall_id===ISSHIN_PRINTING && (card.face_index??0)===0 ? {
  id:FRAME_VERSION,width:488,height:680,
  art:[37,77,413,299],
  fields:{
   title:{rect:[40,36,332,28],sample:[362,38,11,22],size:24,min:14,bold:true},
   creature_type:{rect:[40,392,361,23],sample:[401,394,3,17],size:20,min:13,bold:true},
   abilities:{rect:[40,431,407,104],sample:[275,506,169,26],size:23,min:15},
   quote:{rect:[40,545,405,62],sample:[275,506,169,26],size:21,min:15,italic:true},
   stats:{rect:[390,614,57,23],sample:[389,611,54,2],size:24,min:14,bold:true},
  }
 } : null;
}
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Outline lettering is identical in the browser and Lambda, with no host fonts.
const fontFor=field=>fonts[field.bold?'bold':field.italic?'italic':'regular'];
const glyphFor=(font,c)=>{const glyph=font.glyphs[c];if(!glyph)throw Error('The card font cannot render this character: '+c);return glyph;};
const advance=(s,size,field)=>{const font=fontFor(field);return [...s].reduce((n,c)=>n+glyphFor(font,c)[0],0)*size/font.units;};
function lettering(line,size,field,x,y){
 const font=fontFor(field),scale=size/font.units;
 return [...line].map(c=>{const [width,path]=glyphFor(font,c),element=`<path d="${path}" transform="translate(${x} ${y}) scale(${scale} ${-scale})"/>`;x+=width*scale;return element;}).join('');
}
function fit(value,field,single=false) {
 for(let size=field.size;size>=field.min;size-=.5){
  const width=field.rect[2]-4,lines=[];let valid=true;
  for(const paragraph of String(value).split('\n')){
   let line='';
   for(const word of paragraph.split(/\s+/).filter(Boolean)){
    if(advance(word,size,field)>width){valid=false;break;}
    const candidate=line?line+' '+word:word;
    if(line&&advance(candidate,size,field)>width){lines.push(line);line=word;}else line=candidate;
   }
   lines.push(line);
  }
  if(valid&&(!single||lines.length===1)&&lines.length*size*1.12<=field.rect[3])return {size,lines};
 }
 throw Error('Shorten the '+(single?'title or agent type':'abilities or quote')+' to fit the original text area.');
}
export function cardLayout(card,text,printing={}) {
 const frame=frameFor(card);if(!frame)throw Error('This printing needs a verified frame map before generation.');
 // The initial verified map preserves the original mana symbols and stat badge.
 // A different cost needs its own symbol layout, never a literal {R} substitute.
 if(text.mana_cost!==(printing.mana_cost??''))throw Error('Keep the source mana cost for this frame.');
 const edits=['title','creature_type','abilities','quote'].map(key=>({key,...frame.fields[key],...fit(text[key],frame.fields[key],['title','creature_type'].includes(key))}));
 edits.push({key:'quote_tail',rect:[40,607,337,15],sample:[275,506,169,26],size:1,lines:[]});
 if(text.power!==(printing.power??'')||text.toughness!==(printing.toughness??'')){
  const value=text.power?`${text.power}/${text.toughness}`:'';
  edits.push({key:'stats',...frame.fields.stats,...fit(value,frame.fields.stats,true)});
 }
 return {frame,edits,regions:[frame.art,...edits.map(e=>e.rect)]};
}
export function cardSvg({card,text,printing,source,portrait,id='card'}) {
 const {frame,edits}=cardLayout(card,text,printing);
 const picture=(href,rect,view,preserve='none')=>`<svg x="${rect[0]}" y="${rect[1]}" width="${rect[2]}" height="${rect[3]}" viewBox="${view.join(' ')}" preserveAspectRatio="${preserve}" overflow="hidden"><image href="${xml(href)}" width="488" height="680" preserveAspectRatio="none"/></svg>`;
 const patches=edits.map(({rect,sample,size,lines,bold,italic,key})=>`<defs><pattern id="paper-${id}-${key}" x="${rect[0]}" y="${rect[1]}" width="${sample[2]}" height="${sample[3]}" patternUnits="userSpaceOnUse">${picture(source,[0,0,sample[2],sample[3]],sample)}</pattern></defs><rect x="${rect[0]}" y="${rect[1]}" width="${rect[2]}" height="${rect[3]}" fill="url(#paper-${id}-${key})"/><svg x="${rect[0]}" y="${rect[1]}" width="${rect[2]}" height="${rect[3]}" overflow="hidden"><g fill="#171713">${lines.map((line,i)=>lettering(line,size,{bold,italic},key==='stats'?(rect[2]-advance(line,size,{bold,italic}))/2:1,size*.88+i*size*1.12)).join('')}</g></svg>`).join('');
 const [x,y,w,h]=frame.art;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680" viewBox="0 0 488 680"><image href="${xml(source)}" width="488" height="680"/>${portrait?`<svg x="${x}" y="${y}" width="${w}" height="${h}" overflow="hidden"><image href="${xml(portrait)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></svg>`:''}${patches}</svg>`;
}
export function pixelRegions(layout,width,height) {
 return layout.regions.map(([x,y,w,h])=>{const left=Math.ceil(x*width/488),top=Math.ceil(y*height/680);return {left,top,width:Math.floor((x+w)*width/488)-left,height:Math.floor((y+h)*height/680)-top};});
}

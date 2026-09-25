import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {cardLayout,cardSvg,pixelRegions} from './card-frame.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const decode=b=>sharp(b,{limitInputPixels:20000000}).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
const dataUrl=(b,type)=>`data:image/${type};base64,${b.toString('base64')}`;
export async function verifyCardFrame(job,source,output) {
 const original=await decode(source),rendered=await decode(output),{width,height,channels}=original.info;
 if(rendered.info.width!==width||rendered.info.height!==height||rendered.info.channels!==channels)throw Error('Card dimensions changed');
 const layout=cardLayout(job.brief.card,job.card_text,job.assets.card.printing),regions=pixelRegions(layout,width,height);
 let protectedPixels=0,changed=0;
 const a=createHash('sha256'),b=createHash('sha256');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(regions.some(r=>x>=r.left&&x<r.left+r.width&&y>=r.top&&y<r.top+r.height))continue;
  const i=(y*width+x)*channels,old=original.data.subarray(i,i+channels),next=rendered.data.subarray(i,i+channels);
  protectedPixels++;if(!old.equals(next))changed++;a.update(old);b.update(next);
 }
 if(changed)throw Error('Protected card pixels changed');
 return {schema:'forge-card-frame-proof.v1',profile:layout.frame.id,source_sha256:hash(source),portrait_sha256:job.assets.portrait.sha256,card_text_sha256:hash(JSON.stringify(job.card_text)),output_sha256:hash(output),width,height,editable_regions:regions,protected_pixels:protectedPixels,changed_protected_pixels:changed,source_protected_sha256:a.digest('hex'),output_protected_sha256:b.digest('hex'),passed:true};
}
export async function composeCard(job,{source_card,portrait}) {
 if(hash(source_card)!==job.assets.source_card.sha256||hash(portrait)!==job.assets.portrait.sha256)throw Error('Card input hash mismatch');
 const layout=cardLayout(job.brief.card,job.card_text,job.assets.card.printing),original=await decode(source_card),{width,height,channels}=original.info;
 if(Math.abs(width/height-488/680)>.003)throw Error('Source printing dimensions do not match the verified frame');
 const svg=cardSvg({card:job.brief.card,text:job.card_text,printing:job.assets.card.printing,source:dataUrl(source_card,'jpeg'),portrait:dataUrl(portrait,'png')});
 const rendered=await sharp(Buffer.from(svg),{density:72*width/488}).resize(width,height).removeAlpha().toColourspace('srgb').raw().toBuffer();
 // Copy only approved interiors. Never round-trip protected pixels through SVG.
 const pixels=Buffer.from(original.data);
 for(const r of pixelRegions(layout,width,height))for(let y=r.top;y<r.top+r.height;y++){
  const offset=(y*width+r.left)*channels;rendered.copy(pixels,offset,offset,offset+r.width*channels);
 }
 const bytes=await sharp(pixels,{raw:{width,height,channels}}).png({compressionLevel:9}).toBuffer();
 return {bytes,receipt:{provider:'local-compositor',model:null,provider_charge:0,usage:null,automatic_retries:0,frame_preservation:await verifyCardFrame(job,source_card,bytes)}};
}

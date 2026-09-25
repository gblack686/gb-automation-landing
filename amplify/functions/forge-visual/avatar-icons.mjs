import sharp from 'sharp';
export const ICON_SIZES=[32,64,128];
export async function deriveAvatarIcons(bytes) {
 const metadata=await sharp(bytes,{limitInputPixels:20000000}).metadata();
 if(metadata.format!=='png'||!metadata.width||!metadata.height)throw Error('Invalid portrait');
 return Promise.all(ICON_SIZES.map(async size=>({role:`avatar${size}`,size,bytes:await sharp(bytes,{limitInputPixels:20000000}).rotate().resize(size,size,{fit:'cover',position:'centre'}).png({compressionLevel:9}).toBuffer()})));
}

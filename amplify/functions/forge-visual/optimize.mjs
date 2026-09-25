import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
export async function optimize(bytes){
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB');
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 if((json.buffers||[]).some(x=>x.uri)||(json.images||[]).some(x=>x.uri))throw Error('External GLB resources are forbidden');
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes);
 await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:82}));
 let triangles=0,max_texture_edge_px=0;
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  if(p.getMode()!==4)throw Error('Unsupported topology');triangles+=(p.getIndices()||p.getAttribute('POSITION')).getCount()/3;
 }
 for(const texture of doc.getRoot().listTextures()){const m=await sharp(texture.getImage()).metadata();max_texture_edge_px=Math.max(max_texture_edge_px,m.width||Infinity,m.height||Infinity);}
 const output=Buffer.from(await io.writeBinary(doc)),metrics={triangles,max_texture_edge_px,bytes:output.length};
 metrics.passed=triangles<=100000&&max_texture_edge_px<=2048&&output.length<=5000000;
 return {bytes:output,metrics};
}

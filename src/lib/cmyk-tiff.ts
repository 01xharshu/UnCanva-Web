/** Uncompressed, chunky 8-bit CMYK TIFF with embedded printer ICC. No RGB masquerading as CMYK. */
export function encodeCMYKTIFF(width:number,height:number,pixels:Uint8Array,profile:Uint8Array): ArrayBuffer {
  if(pixels.length!==width*height*4) throw new Error('Invalid CMYK pixel count');
  const entries=13, ifdEnd=8+2+entries*12+4, bitsOffset=ifdEnd, profileOffset=bitsOffset+8;
  const pixelOffset=(profileOffset+profile.length+3)&~3;
  const out=new ArrayBuffer(pixelOffset+pixels.length),view=new DataView(out),bytes=new Uint8Array(out);
  view.setUint16(0,0x4949,true);view.setUint16(2,42,true);view.setUint32(4,8,true);view.setUint16(8,entries,true);
  const fields:[number,number,number,number][]=[[256,4,1,width],[257,4,1,height],[258,3,4,bitsOffset],[259,3,1,1],[262,3,1,5],[273,4,1,pixelOffset],[277,3,1,4],[278,4,1,height],[279,4,1,pixels.length],[284,3,1,1],[332,3,1,1],[334,3,1,4],[34675,7,profile.length,profileOffset]];
  fields.forEach(([tag,type,count,value],i)=>{const p=10+i*12;view.setUint16(p,tag,true);view.setUint16(p+2,type,true);view.setUint32(p+4,count,true);if(type===3&&count===1)view.setUint16(p+8,value,true);else view.setUint32(p+8,value,true);});
  for(let i=0;i<4;i++)view.setUint16(bitsOffset+i*2,8,true);
  bytes.set(profile,profileOffset);bytes.set(pixels,pixelOffset);return out;
}

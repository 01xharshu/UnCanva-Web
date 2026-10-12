import { dimensions } from './document';
import { encodeCMYKTIFF } from './cmyk-tiff';
type Profile = number;
type CMS = {
  cmsOpenProfileFromMem: (p:Uint8Array,n:number)=>Profile;
  cmsCreate_sRGBProfile: ()=>Profile;
  cmsCloseProfile: (p:Profile)=>void;
  cmsGetColorSpaceASCII: (p:Profile)=>string;
  cmsFormatterForColorspaceOfProfile: (p:Profile,n:number,float:boolean)=>number;
  cmsCreateTransform: (a:Profile,at:number,b:Profile,bt:number,intent:number,flags:number)=>number;
  cmsDeleteTransform: (t:number)=>void;
  cmsDoTransform: (t:number,input:Uint8Array,n:number)=>Uint8Array;
};
self.onmessage=async e=>{
  try {
    const {width,height,data,profile,kind,intent=1}=e.data;
    dimensions(width,height);
    const path='/codecs/lcms.min.js';
    const {instantiate}=await import(/* webpackIgnore: true */ path) as {instantiate:(options:Record<string,unknown>)=>Promise<CMS>};
    const cms=await instantiate({locateFile:(name:string)=>'/codecs/'+name});
    const icc=new Uint8Array(profile), destination=cms.cmsOpenProfileFromMem(icc,icc.length), srgb=cms.cmsCreate_sRGBProfile();
    if(!destination) {cms.cmsCloseProfile(srgb);throw new Error('Invalid or unsupported ICC profile');}
    try {
      const space=cms.cmsGetColorSpaceASCII(destination);
      if(kind!=='interpret' && space!=='CMYK') throw new Error('Choose a CMYK printer ICC profile for print export or soft proof.');
      if(kind==='interpret' && !['RGB','CMYK'].includes(space)) throw new Error('Only RGB and CMYK source profiles are supported.');
      const source=kind==='interpret'?destination:srgb, target=kind==='interpret'?srgb:destination;
      const inputChannels=kind==='interpret' && space==='CMYK'?4:3, outputChannels=kind==='interpret'?3:4;
      const original=new Uint8ClampedArray(data),count=width*height,input=new Uint8Array(count*inputChannels);
      for(let i=0;i<count;i++) for(let c=0;c<inputChannels;c++) input[i*inputChannels+c]=original[i*4+c];
      const transform=cms.cmsCreateTransform(source,cms.cmsFormatterForColorspaceOfProfile(source,1,false),target,cms.cmsFormatterForColorspaceOfProfile(target,1,false),intent,0x2000);
      if(!transform) throw new Error('ICC transform could not be created');
      let converted:Uint8Array;
      try {converted=cms.cmsDoTransform(transform,input,count);} finally {cms.cmsDeleteTransform(transform);}
      if(kind==='print') {
        const result=encodeCMYKTIFF(width,height,converted,icc);
        self.postMessage({data:result}, {transfer:[result]});return;
      }
      if(kind==='proof') {
        const reverse=cms.cmsCreateTransform(destination,cms.cmsFormatterForColorspaceOfProfile(destination,1,false),srgb,cms.cmsFormatterForColorspaceOfProfile(srgb,1,false),intent,0x2000);
        if(!reverse) throw new Error('ICC proof transform could not be created');
        try {converted=cms.cmsDoTransform(reverse,converted,count);} finally {cms.cmsDeleteTransform(reverse);}
      }
      const rgba=new Uint8ClampedArray(count*4);
      for(let i=0;i<count;i++) {for(let c=0;c<3;c++) rgba[i*4+c]=converted[i*(kind==='proof'?3:outputChannels)+c];rgba[i*4+3]=kind==='interpret' && inputChannels===4?255:original[i*4+3];}
      const canvas=new OffscreenCanvas(width,height);canvas.getContext('2d')!.putImageData(new ImageData(rgba,width,height),0,0);
      self.postMessage({blob:await canvas.convertToBlob({type:'image/png'})});
    } finally {cms.cmsCloseProfile(destination);cms.cmsCloseProfile(srgb);}
  } catch(error) {self.postMessage({error:String(error)});}
};

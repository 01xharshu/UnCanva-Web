import { colorJob } from "./color";
import { dimensions } from "./document";
import {
  Raster,
  encodeBMP,
  decodeBMP,
  encodeTGA,
  decodeTGA,
  encodePPM,
  decodePPM,
  encodeQOI,
  decodeQOI,
  wrapICO,
} from "./binary-codecs";
type Request = {
  id: number;
  kind: "encode" | "decode" | "pdf" | "psd-write" | "psd-read";
  width?: number;
  height?: number;
  data?: ArrayBuffer;
  type?: string;
  ext?: string;
  quality?: number;
  children?: import("ag-psd").Layer[];
  imageData?: ImageData;
  xmp?: string;
  pages?: { png: ArrayBuffer; width: number; height: number }[];
};
const locateFile = (name: string) => "/codecs/" + name;
async function psdModule() {
  const module = await import("ag-psd");
  module.initializeCanvas(
    (w, h) => new OffscreenCanvas(w, h) as unknown as HTMLCanvasElement,
    (w, h) => new ImageData(w, h),
  );
  return module;
}
async function encode(
  p: Raster,
  type: string,
  quality: number,
): Promise<ArrayBuffer> {
  if (type === "image/bmp") return encodeBMP(p);
  if (type === "image/x-tga") return encodeTGA(p);
  if (type === "image/x-portable-pixmap") return encodePPM(p);
  if (type === "image/qoi") return encodeQOI(p);
  if (type === "image/tiff") {
    const tiff = await import("utif");
    return tiff.encodeImage(new Uint8Array(p.data), p.width, p.height, {
      t338: [2],
      t305: ["UnCanva"],
    } as unknown as import("utif").IFD);
  }
  if (type === "image/gif") {
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
    const palette = quantize(p.data, 256, {
        format: "rgba4444",
        oneBitAlpha: true,
      }),
      indices = applyPalette(p.data, palette, "rgba4444"),
      transparentIndex = palette.findIndex((color) => color[3] === 0),
      gif = GIFEncoder();
    gif.writeFrame(indices, p.width, p.height, {
      palette,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
    });
    gif.finish();
    return new Uint8Array(gif.bytes()).buffer;
  }
  if (type === "image/webp") {
    const { default: factory } =
      await import("@jsquash/webp/codec/enc/webp_enc.js");
    const { defaultOptions } = await import("@jsquash/webp/meta.js");
    const module = await factory({ locateFile });
    const result = module.encode(new Uint8Array(p.data), p.width, p.height, {
      ...defaultOptions,
      quality: Math.round(quality * 100),
      method: 4,
      low_memory: 1,
    });
    if (!result) throw new Error("WebP encoding failed");
    return new Uint8Array(result).buffer;
  }
  if (type === "image/avif") {
    const { default: factory } =
      await import("@jsquash/avif/codec/enc/avif_enc.js");
    const { defaultOptions } = await import("@jsquash/avif/meta.js");
    const module = await factory({ locateFile });
    const result = module.encode(new Uint8Array(p.data), p.width, p.height, {
      ...defaultOptions,
      quality: Math.round(quality * 100),
      qualityAlpha: 100,
      speed: 8,
    });
    if (!result) throw new Error("AVIF encoding failed");
    return new Uint8Array(result).buffer;
  }
  if (type === "image/jxl") {
    const { default: factory } =
      await import("@jsquash/jxl/codec/enc/jxl_enc.js");
    const { defaultOptions } = await import("@jsquash/jxl/meta.js");
    const module = await factory({ locateFile });
    const result = module.encode(new Uint8Array(p.data), p.width, p.height, {
      ...defaultOptions,
      quality: Math.round(quality * 100),
      effort: 3,
    });
    if (!result) throw new Error("JPEG XL encoding failed");
    return new Uint8Array(result).buffer;
  }
  if (type === "image/vnd.adobe.photoshop") {
    const module = await psdModule(),
      imageData = new ImageData(
        new Uint8ClampedArray(p.data),
        p.width,
        p.height,
      );
    return module.writePsd({
      width: p.width,
      height: p.height,
      imageData,
      children: [{ name: "UnCanva raster composite", imageData }],
    });
  }
  if (type === "image/x-icon") {
    const side = Math.min(256, Math.max(p.width, p.height)),
      source = new OffscreenCanvas(p.width, p.height);
    source
      .getContext("2d")!
      .putImageData(
        new ImageData(new Uint8ClampedArray(p.data), p.width, p.height),
        0,
        0,
      );
    const c = new OffscreenCanvas(side, side),
      scale = Math.min(side / p.width, side / p.height);
    c.getContext("2d")!.drawImage(
      source,
      (side - p.width * scale) / 2,
      (side - p.height * scale) / 2,
      p.width * scale,
      p.height * scale,
    );
    return wrapICO(
      await (await c.convertToBlob({ type: "image/png" })).arrayBuffer(),
      side,
      side,
    );
  }
  throw new Error("Unsupported encoder");
}
async function decode(data: ArrayBuffer, ext: string): Promise<Raster> {
  if (ext === "bmp") return decodeBMP(data);
  if (ext === "tga") return decodeTGA(data);
  if (ext === "ppm") return decodePPM(data);
  if (ext === "qoi") return decodeQOI(data);
  if (["tiff", "tif"].includes(ext)) {
    const tiff = await import("utif"),
      ifds = tiff.decode(data);
    const image = ifds.find(
      (i) => Array.isArray(i.t256) && Array.isArray(i.t257),
    );
    if (!image) throw new Error("TIFF has no image");
    dimensions(
      Number((image.t256 as number[])[0]),
      Number((image.t257 as number[])[0]),
    );
    tiff.decodeImage(data, image);
    if ((image.t262 as number[])?.[0] === 5) {
      const icc = image.t34675 as number[] | Uint8Array | undefined;
      if (!icc?.length) throw new Error("CMYK TIFF needs an embedded ICC profile. Assign and embed the printer profile before importing.");
      if ((image.t277 as number[])?.[0] !== 4 || (image.t258 as number[])?.some(n => n !== 8) || ((image.t284 as number[])?.[0] || 1) !== 1) throw new Error("Only chunky 8-bit CMYK TIFF is supported.");
      const result = await colorJob({kind:"interpret",width:image.width,height:image.height,data:new Uint8Array(image.data).buffer,profile:new Uint8Array(icc).buffer});
      const bitmap = await createImageBitmap(result.blob), canvas = new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext("2d")!;
      ctx.drawImage(bitmap,0,0);bitmap.close();
      return {width:image.width,height:image.height,data:ctx.getImageData(0,0,image.width,image.height).data};
    }
    return {
      width: image.width,
      height: image.height,
      data: new Uint8ClampedArray(tiff.toRGBA8(image)),
    };
  }
  if (ext === "psd") {
    const view = new DataView(data);
    if (data.byteLength < 26 || view.getUint32(0) !== 0x38425053)
      throw new Error("Invalid PSD");
    dimensions(view.getUint32(18), view.getUint32(14));
    const module = await psdModule(),
      psd = module.readPsd(data, {
        skipLayerImageData: true,
        skipThumbnail: true,
        useImageData: true,
      });
    if (!psd.imageData)
      throw new Error("PSD has no supported raster composite");
    return {
      width: psd.width,
      height: psd.height,
      data: new Uint8ClampedArray(psd.imageData.data),
    };
  }
  if (ext === "jxl") {
    const module = await import("@jsquash/jxl/decode");
    await module.init({ locateFile });
    const image = await module.default(data);
    if (!image) throw new Error("JPEG XL decode failed");
    return image;
  }
  if (ext === "webp") {
    const module = await import("@jsquash/webp/decode");
    await module.init({ locateFile });
    return module.default(data);
  }
  if (ext === "avif") {
    const module = await import("@jsquash/avif/decode");
    await module.init({ locateFile });
    const image = await module.default(data);
    if (!image) throw new Error("AVIF decode failed");
    return image;
  }
  throw new Error("No local decoder for this format");
}
self.onmessage = async (e: MessageEvent<Request>) => {
  const r = e.data;
  try {
    if (r.kind === "pdf") {
      const pages = r.pages!;
      if (!pages?.length) throw new Error("No PDF pages");
      const { jsPDF } = await import("jspdf");
      const first = pages[0],
        pdf = new jsPDF({
          unit: "pt",
          format: [first.width * 0.75, first.height * 0.75],
          orientation: first.width > first.height ? "landscape" : "portrait",
          compress: true,
        });
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i],
          w = p.width * 0.75,
          h = p.height * 0.75;
        if (i) pdf.addPage([w, h], w > h ? "landscape" : "portrait");
        pdf.addImage(
          new Uint8Array(p.png),
          "PNG",
          0,
          0,
          w,
          h,
          undefined,
          "FAST",
        );
      }
      pdf.setProperties({
        title: "UnCanva image export",
        creator: "UnCanva local image studio",
      });
      const data = pdf.output("arraybuffer");
      self.postMessage({ id: r.id, data }, [data]);
      return;
    }
    if (r.kind === "psd-write") {
      const psd = await psdModule();
      const data = psd.writePsdBuffer({ width:r.width!, height:r.height!, children:r.children, imageData:r.imageData, imageResources:{xmpMetadata:r.xmp} });
      self.postMessage({ id:r.id, data:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) }); return;
    }
    if (r.kind === "psd-read") {
      const module=await psdModule(), psd=module.readPsd(r.data!,{useImageData:true,skipThumbnail:true});
      dimensions(psd.width,psd.height);
      const layers: Record<string,unknown>[]=[];
      let warning="External PSD layers are imported as editable pixel layers. Text, effects, masks, blend modes and adjustment layers may require rasterization in Photoshop first.";
      const visit=async (children: import("ag-psd").Layer[], opacity=1, visible=true) => {
        for(const l of children) {
          if(l.children) { await visit(l.children,opacity*(l.opacity??1),visible&&!l.hidden); continue; }
          const pixels=l.imageData; if(!pixels || !pixels.width || !pixels.height) continue;
          dimensions(pixels.width,pixels.height);
          const c=new OffscreenCanvas(pixels.width,pixels.height),cx=c.getContext("2d")!;
          cx.putImageData(new ImageData(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height),0,0);
          if(l.mask?.imageData && !l.mask.disabled) {
            const mp=l.mask.imageData, mc=new OffscreenCanvas(pixels.width,pixels.height), mx=mc.getContext("2d")!;
            mx.fillStyle=l.mask.defaultColor===255?"white":"transparent";mx.fillRect(0,0,mc.width,mc.height);
            const mask=new ImageData(new Uint8ClampedArray(mp.data),mp.width,mp.height);
            for(let i=0;i<mask.data.length;i+=4) {mask.data[i+3]=mask.data[i]; mask.data[i]=mask.data[i+1]=mask.data[i+2]=255;}
            const tmp=new OffscreenCanvas(mp.width,mp.height);tmp.getContext("2d")!.putImageData(mask,0,0);
            mx.drawImage(tmp,(l.mask.left||0)-(l.left||0),(l.mask.top||0)-(l.top||0));cx.globalCompositeOperation="destination-in";cx.drawImage(mc,0,0);
          }
          layers.push({name:l.name||"PSD layer",left:l.left||0,top:l.top||0,width:pixels.width,height:pixels.height,opacity:opacity*(l.opacity??1),visible:visible&&!l.hidden,locked:!!l.protected?.composite,blob:await c.convertToBlob({type:"image/png"})});
        }
      };
      await visit(psd.children||[]);
      if(!layers.length && psd.imageData) { const p=psd.imageData,c=new OffscreenCanvas(p.width,p.height);c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.data),p.width,p.height),0,0);layers.push({name:"PSD composite",left:0,top:0,width:p.width,height:p.height,opacity:1,visible:true,locked:false,blob:await c.convertToBlob({type:"image/png"})});warning="Only the flattened PSD composite was available."; }
      self.postMessage({id:r.id,xmp:psd.imageResources?.xmpMetadata,width:psd.width,height:psd.height,layers,warning});return;
    }
    if (r.kind === "encode") {
      dimensions(r.width!, r.height!);
      const data = await encode(
        {
          width: r.width!,
          height: r.height!,
          data: new Uint8ClampedArray(r.data!),
        },
        r.type!,
        r.quality ?? 0.92,
      );
      self.postMessage({ id: r.id, data }, [data]);
      return;
    }
    const raster = await decode(r.data!, r.ext!);
    dimensions(raster.width, raster.height);
    const c = new OffscreenCanvas(raster.width, raster.height);
    c.getContext("2d")!.putImageData(
      new ImageData(
        new Uint8ClampedArray(raster.data),
        raster.width,
        raster.height,
      ),
      0,
      0,
    );
    self.postMessage({
      id: r.id,
      blob: await c.convertToBlob({ type: "image/png" }),
    });
  } catch (error) {
    self.postMessage({
      id: r.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

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
  kind: "encode" | "decode" | "pdf";
  width?: number;
  height?: number;
  data?: ArrayBuffer;
  type?: string;
  ext?: string;
  quality?: number;
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

import { Artboard, Layer, dimensions } from "./document";
import { getAsset } from "./storage";
import { applyStroke } from "./mask";
const originals = new Map<string, Promise<ImageBitmap>>();
const originalBytes = new Map<string, number>();
const rendered = new Map<string, Promise<HTMLCanvasElement>>();
const prepared = new Map<string, Promise<HTMLCanvasElement>>();
function trim(cache: Map<string, Promise<HTMLCanvasElement>>) {
  let count = 0;
  const entries = [...cache.entries()].reverse();
  Promise.all(
    entries.map(async ([key, p]) => {
      try {
        const c = await p;
        return { key, bytes: c.width * c.height * 4 };
      } catch {
        return { key, bytes: 0 };
      }
    }),
  ).then((items) => {
    for (const item of items) {
      count += item.bytes;
      if (count > 96 * 1024 * 1024 && items[0].key !== item.key)
        cache.delete(item.key);
    }
  });
  while (cache.size > 8) cache.delete(cache.keys().next().value!);
}
let worker: Worker | undefined;
let seq = 0;
const jobs = new Map<
  number,
  { resolve: (v: Uint8ClampedArray) => void; reject: (e: Error) => void }
>();
async function pixels(data: ImageData, l: Layer, blurFallback = 0) {
  worker ??= new Worker(new URL("./adjust.worker.ts", import.meta.url));
  worker.onmessage = (e) => {
    const j = jobs.get(e.data.id);
    if (j) {
      jobs.delete(e.data.id);
      if (e.data.error) j.reject(new Error(e.data.error));
      else j.resolve(new Uint8ClampedArray(e.data.data));
    }
  };
  worker.onerror = (e) => {
    for (const job of jobs.values())
      job.reject(new Error(e.message || "Image worker failed"));
    jobs.clear();
    worker?.terminate();
    worker = undefined;
  };
  const id = ++seq;
  return new Promise<Uint8ClampedArray>((resolve, reject) => {
    jobs.set(id, { resolve, reject });
    worker!.postMessage(
      {
        id,
        data: data.data.buffer,
        w: data.width,
        h: data.height,
        a: l.adjustments,
        blurFallback,
      },
      [data.data.buffer],
    );
  });
}
export function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export async function original(id: string) {
  if (!originals.has(id))
    originals.set(
      id,
      (async () => {
        const b = await getAsset(id);
        if (!b) throw new Error("Image missing from local storage");
        const bitmap = await createImageBitmap(b);
        // Evict references rather than closing bitmaps still used by in-flight renders.
        originalBytes.set(id, bitmap.width * bitmap.height * 4);
        let bytes = 0;
        for (const [key] of [...originals].reverse()) {
          bytes += originalBytes.get(key) || 0;
          if (key !== id && (bytes > 96 * 1024 * 1024 || originals.size > 16)) {
            originals.delete(key);
            originalBytes.delete(key);
          }
        }
        return bitmap;
      })(),
    );
  return originals.get(id)!;
}
async function adjustedLayer(l: Layer, edge: number) {
  const key = JSON.stringify([l.asset, l.adjustments, edge]);
  if (!prepared.has(key)) {
    const promise = (async () => {
      const img = await original(l.asset!);
      const factor = Math.min(1, edge / Math.max(img.width, img.height));
      const c = canvas(
          Math.max(1, Math.round(img.width * factor)),
          Math.max(1, Math.round(img.height * factor)),
        ),
        ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const nativeBlur = "filter" in ctx;
      const p = await pixels(
        ctx.getImageData(0, 0, c.width, c.height),
        l,
        nativeBlur ? 0 : l.adjustments.blur * factor,
      );
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(p), c.width, c.height),
        0,
        0,
      );
      if (l.adjustments.blur && nativeBlur) {
        const temp = canvas(c.width, c.height),
          t = temp.getContext("2d")!;
        t.filter = `blur(${l.adjustments.blur * factor}px)`;
        t.drawImage(c, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(temp, 0, 0);
      }
      return c;
    })();
    prepared.set(key, promise);
    promise.catch(() => prepared.delete(key));
    trim(prepared);
  }
  return prepared.get(key)!;
}
export async function imageLayer(l: Layer, edge = Infinity) {
  const key = JSON.stringify([l.asset, l.mask, l.strokes, l.adjustments, edge]);
  if (!rendered.has(key)) {
    const promise = (async () => {
      const adjusted = await adjustedLayer(l, edge);
      const c = canvas(adjusted.width, adjusted.height),
        ctx = c.getContext("2d")!;
      ctx.drawImage(adjusted, 0, 0);
      const m = canvas(c.width, c.height),
        mc = m.getContext("2d")!;
      mc.fillStyle = "white";
      mc.fillRect(0, 0, m.width, m.height);
      if (l.mask) {
        mc.clearRect(0, 0, m.width, m.height);
        mc.drawImage(await original(l.mask), 0, 0, m.width, m.height);
      }
      const img = await original(l.asset!);
      const fx = c.width / img.width,
        fy = c.height / img.height;
      for (const stroke of l.strokes)
        applyStroke(
          mc,
          fx === 1 && fy === 1
            ? stroke
            : {
                ...stroke,
                size: stroke.size * fx,
                aspect: ((stroke.aspect || 1) * fy) / fx,
                points: stroke.points.map(([x, y]) => [x * fx, y * fy]),
              },
        );
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(m, 0, 0);
      return c;
    })();
    rendered.set(key, promise);
    promise.catch(() => rendered.delete(key));
    trim(rendered);
  }
  return rendered.get(key)!;
}
export async function renderBoard(
  b: Artboard,
  width = b.width,
  height = b.height,
  preview = false,
) {
  dimensions(width, height);
  const c = canvas(width, height),
    ctx = c.getContext("2d")!;
  ctx.scale(width / b.width, height / b.height);
  if (b.background !== "transparent") {
    ctx.fillStyle = b.background;
    ctx.fillRect(0, 0, b.width, b.height);
  }
  for (const l of b.layers) {
    if (!l.visible) continue;
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.translate(l.x + l.width / 2, l.y + l.height / 2);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.translate(-l.width / 2, -l.height / 2);
    if (l.type === "image")
      ctx.drawImage(
        await imageLayer(
          l,
          preview
            ? Math.max(256, Math.min(2048, Math.max(width, height)))
            : Infinity,
        ),
        0,
        0,
        l.width,
        l.height,
      );
    else {
      ctx.fillStyle = l.color;
      if (l.type === "text") {
        ctx.font = `600 ${l.fontSize}px Arial`;
        ctx.textBaseline = "top";
        l.text
          .split("\n")
          .forEach((line, i) =>
            ctx.fillText(line, 0, i * l.fontSize * 1.2, l.width),
          );
      } else if (l.type === "path") {
        ctx.scale(l.width / (l.pathBox?.[0] || 1), l.height / (l.pathBox?.[1] || 1));
        ctx.fill(new Path2D(l.pathData || ""));
      } else if (l.type === "rect") ctx.fillRect(0, 0, l.width, l.height);
      else {
        ctx.beginPath();
        ctx.ellipse(
          l.width / 2,
          l.height / 2,
          l.width / 2,
          l.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }
  return c;
}
export async function encode(
  b: Artboard,
  type: string,
  quality: number,
  width = b.width,
  height = b.height,
) {
  const c = await renderBoard(b, width, height);
  if (type === "image/jpeg") {
    const ctx = c.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(type)) {
    const { encodeExtra } = await import("./codecs");
    return encodeExtra(c, type, quality);
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    c.toBlob(resolve, type, quality),
  );
  if (blob?.type === type) return blob;
  if (type === "image/webp") {
    const { encodeExtra } = await import("./codecs");
    return encodeExtra(c, type, quality);
  }
  throw new Error("This browser cannot encode the selected format");
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

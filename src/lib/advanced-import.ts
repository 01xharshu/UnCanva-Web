import { Artboard, dimensions, newBoard, newLayer, uid } from './document';
import { putAsset } from './storage';
export const rawExtensions = ['raw','dng','cr2','cr3','nef','nrw','arw','srf','sr2','raf','orf','rw2','pef','srw','3fr','fff','iiq','kdc','mos','mrw','rwl','x3f'];
export async function importPDF(file: File): Promise<Artboard[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/codecs/pdf.worker.mjs';
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true, disableFontFace: false });
  const pdf = await task.promise;
  try {
    if (pdf.numPages > 50) throw new Error('PDF import supports up to 50 pages. Split a larger document first.');
    const boards: Artboard[] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 4096 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      dimensions(canvas.width, canvas.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PDF rasterization failed')), 'image/png'));
      const board = newBoard(), layer = newLayer('image');
      board.name = `${file.name} · page ${pageNo}`; board.width = canvas.width; board.height = canvas.height;
      layer.asset = uid(); layer.name = board.name; layer.x = layer.y = 0; layer.width = board.width; layer.height = board.height;
      await putAsset(layer.asset, blob); board.layers.push(layer); boards.push(board); page.cleanup();
    }
    return boards;
  } finally { await task.destroy(); }
}
export type RawOptions = {halfSize:boolean;whiteBalance:"camera"|"auto";exposure:number;denoise:number};
export const defaultRawOptions:RawOptions={halfSize:true,whiteBalance:"camera",exposure:0,denoise:0};
export async function decodeRAW(file: File, options:RawOptions=defaultRawOptions) {
  if (!crossOriginIsolated) throw new Error('RAW decoding needs secure cross-origin isolation. Use the configured Vercel deployment or npm run serve; host must send COOP/COEP headers.');
  // Separate replaceable upstream module, never a CDN or processing service.
  const path = '/codecs/raw/index.js';
  const { default: LibRaw } = await import(/* webpackIgnore: true */ path) as typeof import('libraw-wasm');
  const raw = new LibRaw();
  const timeout = setTimeout(() => raw.dispose(), 120000);
  try {
    await raw.open(new Uint8Array(await file.arrayBuffer()), { useCameraWb: options.whiteBalance === "camera", useAutoWb: options.whiteBalance === "auto", outputColor: 1, outputBps: 8, halfSize: options.halfSize, noAutoBright: true, expCorrec: options.exposure !== 0, expShift: 2 ** options.exposure, threshold: options.denoise });
    const image = await raw.imageData();
    if (!image || image.bits !== 8 || image.colors < 3) throw new Error('This camera RAW compression is unsupported by this decoder.');
    dimensions(image.width, image.height);
    const rgba = new Uint8ClampedArray(image.width * image.height * 4);
    for (let i = 0; i < image.width * image.height; i++) { for (let c = 0; c < 3; c++) rgba[i * 4 + c] = image.data[i * image.colors + c]; rgba[i * 4 + 3] = 255; }
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    canvas.getContext('2d')!.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('RAW development failed')), 'image/png'));
    return { blob, width: image.width, height: image.height, rawSource:file, rawOptions:structuredClone(options) };
  } finally { clearTimeout(timeout); raw.dispose(); }
}

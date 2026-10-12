import * as ort from "onnxruntime-web/webgpu";
import { models, ModelId, AI_CACHE, modelURLs } from "./ai-models";
import { SubjectRegion, regionPixels } from "./ai-region";
import { matteValues, assertUsefulMatte } from "./ai-math";
ort.env.wasm.wasmPaths = "/runtime/";
ort.env.wasm.numThreads = 1;
self.onmessage = async (
  e: MessageEvent<{
    blob: Blob;
    model?: ModelId;
    provider?: "cpu" | "auto";
    region?: SubjectRegion;
  }>,
) => {
  let session: ort.InferenceSession | undefined;
  let bitmap: ImageBitmap | undefined;
  const model = models[e.data.model || "general"];
  try {
    self.postMessage({ stage: "Loading local model" });
    const modelCache =
      typeof caches === "undefined"
        ? null
        : await caches.open(AI_CACHE).catch(() => null);
    const bytes = new Uint8Array(model.bytes);
    let received = 0;
    for (const url of modelURLs(e.data.model || "general")) {
      let response = await modelCache?.match(url);
      if (!response) {
        response = await fetch(url);
        if (!response.ok)
          throw new Error(
            "Model unavailable. Run npm run assets, then rebuild.",
          );
        // A controlling service worker already caches the response in this same cache.
        if (modelCache && !(await modelCache.match(url)))
          await modelCache.put(url, response.clone()).catch(() => {});
      }
      const part = new Uint8Array(await response.arrayBuffer());
      if (received + part.length > bytes.length)
        throw new Error("Invalid model asset size");
      bytes.set(part, received);
      received += part.length;
      self.postMessage({
        stage: `Loading local model · ${(received / 1048576).toFixed(1)} / ${(model.bytes / 1048576).toFixed(1)} MB`,
      });
    }
    if (received !== bytes.length)
      throw new Error(
        "Incomplete model assets. Rebuild or clear the AI cache.",
      );
    bitmap = await createImageBitmap(e.data.blob);
    const source = regionPixels(e.data.region, bitmap.width, bitmap.height);
    const size = model.size,
      c = new OffscreenCanvas(size, size),
      ctx = c.getContext("2d")!;
    const factor = Math.min(size / source.width, size / source.height);
    const drawWidth =
      model.normalization === "modnet" ? source.width * factor : size;
    const drawHeight =
      model.normalization === "modnet" ? source.height * factor : size;
    const offsetX = (size - drawWidth) / 2,
      offsetY = (size - drawHeight) / 2;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      bitmap,
      source.x,
      source.y,
      source.width,
      source.height,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight,
    );
    const rgba = ctx.getImageData(0, 0, size, size).data,
      input = new Float32Array(3 * size * size);
    const mean =
      model.normalization === "modnet"
        ? [0.5, 0.5, 0.5]
        : [0.485, 0.456, 0.406];
    const std =
      model.normalization === "modnet"
        ? [0.5, 0.5, 0.5]
        : [0.229, 0.224, 0.225];
    for (let i = 0; i < size * size; i++)
      for (let ch = 0; ch < 3; ch++)
        input[ch * size * size + i] =
          (rgba[i * 4 + ch] / 255 - mean[ch]) / std[ch];
    let backend = "WebGPU";
    let outputs: ort.InferenceSession.ReturnType;
    const run = async (provider: "webgpu" | "wasm") => {
      session = await ort.InferenceSession.create(bytes, {
        executionProviders: [provider],
      });
      self.postMessage({ stage: `Segmenting ${model.label} · ${backend}` });
      return session.run({
        [session.inputNames[0]]: new ort.Tensor("float32", input, [
          1,
          3,
          size,
          size,
        ]),
      });
    };
    let gpuTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (e.data.provider === "cpu") throw new Error("WebGPU is not enabled for this browser engine");
      outputs = await Promise.race([
        run("webgpu"),
        new Promise<never>((_, reject) => {
          gpuTimer = setTimeout(() => reject(new Error("WebGPU inference exceeded 45 seconds; switching to WASM / CPU.")), 45_000);
        }),
      ]);
    } catch {
      await session?.release().catch(() => {});
      session = undefined;
      backend = "WASM / CPU";
      outputs = await run("wasm");
    } finally {
      if (gpuTimer) clearTimeout(gpuTimer);
    }
    const result = outputs[session!.outputNames[0]],
      w = Number(result.dims.at(-1)),
      h = Number(result.dims.at(-2));
    const mask = new OffscreenCanvas(w, h),
      mc = mask.getContext("2d")!,
      pixels = mc.createImageData(w, h);
    const alpha = matteValues(result.data as ArrayLike<number>, model.output);
    assertUsefulMatte(alpha);
    for (let i = 0; i < w * h; i++) {
      pixels.data[i * 4] =
        pixels.data[i * 4 + 1] =
        pixels.data[i * 4 + 2] =
          255;
      pixels.data[i * 4 + 3] = alpha[i];
    }
    mc.putImageData(pixels, 0, 0);
    const full = new OffscreenCanvas(bitmap.width, bitmap.height);
    full
      .getContext("2d")!
      .drawImage(
        mask,
        (offsetX * w) / size,
        (offsetY * h) / size,
        (drawWidth * w) / size,
        (drawHeight * h) / size,
        source.x,
        source.y,
        source.width,
        source.height,
      );
    self.postMessage({
      blob: await full.convertToBlob({ type: "image/png" }),
      backend,
      model: model.label,
    });
  } catch (error) {
    self.postMessage({
      error: /memory|bad_alloc|allocat/i.test(String(error))
        ? "This model exceeded available memory. Choose General subjects · fast, close other tabs, or use a smaller image."
        : error instanceof Error
          ? error.message
          : String(error),
    });
  } finally {
    bitmap?.close();
    await session?.release().catch(() => {});
  }
};

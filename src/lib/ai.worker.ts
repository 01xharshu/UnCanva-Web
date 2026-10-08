import * as ort from "onnxruntime-web/webgpu";
ort.env.wasm.wasmPaths = "/runtime/";
ort.env.wasm.numThreads = 1;
self.onmessage = async (e: MessageEvent<{ blob: Blob }>) => {
  try {
    self.postMessage({ stage: "Loading local model" });
    const modelCache = await caches.open("uncanva-ai-v1").catch(() => null);
    let response = await modelCache?.match("/models/modnet.onnx");
    if (!response) {
      response = await fetch("/models/modnet.onnx");
      if (!response.ok)
        throw new Error("Model unavailable. Run npm run assets, then rebuild.");
      const reader = response.body?.getReader(),
        total = Number(response.headers.get("content-length"));
      if (reader) {
        const parts: Uint8Array<ArrayBuffer>[] = [];
        let received = 0;
        for (;;) {
          const result = await reader.read();
          if (result.done) break;
          parts.push(new Uint8Array(result.value));
          received += result.value.length;
          self.postMessage({
            stage: `Downloading local model · ${(received / 1048576).toFixed(1)}${total ? " / " + (total / 1048576).toFixed(1) : ""} MB`,
          });
        }
        response = new Response(new Blob(parts), {
          headers: { "Content-Type": "application/octet-stream" },
        });
      }
      await modelCache
        ?.put("/models/modnet.onnx", response.clone())
        .catch(() => {});
    }
    const bytes = await response.arrayBuffer();
    let session: ort.InferenceSession;
    let backend = "WebGPU";
    try {
      session = await ort.InferenceSession.create(bytes, {
        executionProviders: ["webgpu"],
      });
    } catch {
      backend = "WASM / CPU";
      session = await ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
      });
    }
    self.postMessage({ stage: `Matting portrait · ${backend}` });
    const bitmap = await createImageBitmap(e.data.blob);
    const size = 512,
      c = new OffscreenCanvas(size, size),
      ctx = c.getContext("2d")!;
    const factor = Math.min(size / bitmap.width, size / bitmap.height),
      drawWidth = bitmap.width * factor,
      drawHeight = bitmap.height * factor,
      offsetX = (size - drawWidth) / 2,
      offsetY = (size - drawHeight) / 2;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
    const rgba = ctx.getImageData(0, 0, size, size).data,
      input = new Float32Array(3 * size * size);
    for (let i = 0; i < size * size; i++)
      for (let ch = 0; ch < 3; ch++)
        input[ch * size * size + i] = (rgba[i * 4 + ch] / 255 - 0.5) / 0.5;
    const outputs = await session.run({
      [session.inputNames[0]]: new ort.Tensor("float32", input, [
        1,
        3,
        size,
        size,
      ]),
    });
    const result = outputs[session.outputNames[0]],
      w = Number(result.dims.at(-1)),
      h = Number(result.dims.at(-2)),
      mask = new OffscreenCanvas(w, h),
      mc = mask.getContext("2d")!,
      pixels = mc.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      pixels.data[i * 4] =
        pixels.data[i * 4 + 1] =
        pixels.data[i * 4 + 2] =
          255;
      pixels.data[i * 4 + 3] = Math.round(
        Math.max(0, Math.min(1, Number(result.data[i]))) * 255,
      );
    }
    mc.putImageData(pixels, 0, 0);
    const full = new OffscreenCanvas(bitmap.width, bitmap.height);
    full
      .getContext("2d")!
      .drawImage(
        mask,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        0,
        0,
        full.width,
        full.height,
      );
    bitmap.close();
    await session.release();
    self.postMessage({
      blob: await full.convertToBlob({ type: "image/png" }),
      backend,
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

import { ModelId, AI_CACHE, modelURLs } from "./ai-models";
/** Fetch only our self-hosted public assets. No document data enters this path. */
export async function prepareOfflineAI(
  progress: (s: string) => void,
  modelId: ModelId = "general",
) {
  if (!("caches" in globalThis))
    throw new Error("Offline caching requires HTTPS or localhost.");
  const cache = await caches.open(AI_CACHE);
  const urls = [
    ...modelURLs(modelId),
    "/runtime/ort-wasm-simd-threaded.asyncify.mjs",
    "/runtime/ort-wasm-simd-threaded.asyncify.wasm",
  ];
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    if (await cache.match(url)) {
      progress(`Cached asset ${index + 1} of ${urls.length}`);
      continue;
    }
    const response = await fetch(url);
    if (!response.ok)
      throw new Error("AI files are missing. Run npm run assets and rebuild.");
    const reader = response.body?.getReader();
    if (!reader) {
      await cache.put(url, response);
      continue;
    }
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(new Uint8Array(result.value));
      bytes += result.value.byteLength;
      progress(
        `Asset ${index + 1}/${urls.length} · ${(bytes / 1048576).toFixed(1)} MB`,
      );
    }
    await cache.put(
      url,
      new Response(new Blob(chunks), {
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/octet-stream",
        },
      }),
    );
  }
  progress("AI assets cached for offline use");
}

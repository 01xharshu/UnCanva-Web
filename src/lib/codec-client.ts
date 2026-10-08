let id = 0;
export function job<T>(
  request: Record<string, unknown>,
  transfer: Transferable[] = [],
): Promise<T> {
  const worker = new Worker(new URL("./codec.worker.ts", import.meta.url));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(
        new Error(
          "Format conversion exceeded two minutes. Try a smaller image.",
        ),
      );
    }, 120000);
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || "Image codec worker failed"));
    };
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data);
    };
    worker.postMessage({ id: ++id, ...request }, transfer);
  });
}

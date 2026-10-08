import { adjustPixels } from "./pixels";
self.onmessage = (e) => {
  const { id, data, w, h, a } = e.data;
  try {
    const result = adjustPixels(new Uint8ClampedArray(data), w, h, a);
    self.postMessage({ id, data: result.buffer }, [result.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};

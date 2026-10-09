import { gaussianFallback } from "./blur";
import { adjustPixels } from "./pixels";
self.onmessage = (e) => {
  const { id, data, w, h, a, blurFallback } = e.data;
  try {
    const result = gaussianFallback(
      adjustPixels(new Uint8ClampedArray(data), w, h, a),
      w,
      h,
      blurFallback || 0,
    );
    self.postMessage({ id, data: result.buffer }, [result.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};

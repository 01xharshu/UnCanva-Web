import { floodSelection } from './selection';
self.onmessage = (e) => {
  try { const { data, width, height, x, y, tolerance, contiguous } = e.data;
    const selected = floodSelection(new Uint8ClampedArray(data), width, height, x, y, tolerance, contiguous);
    self.postMessage({ data: selected.buffer }, { transfer: [selected.buffer] });
  } catch (error) { self.postMessage({ error: String(error) }); }
};

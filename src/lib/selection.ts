export type SelectionPoint = [number, number];
/** Connected color selection, bounded to one visitation per pixel. Alpha participates. */
export function floodSelection(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, tolerance: number, contiguous = true) {
  const count = width * height;
  if (data.length !== count * 4 || x < 0 || y < 0 || x >= width || y >= height) throw new Error("Invalid selection seed");
  const seed = (Math.floor(y) * width + Math.floor(x)) * 4;
  const result = new Uint8ClampedArray(count * 4);
  const limit = Math.max(0, Math.min(255, tolerance));
  const matches = (i: number) => Math.max(...[0, 1, 2, 3].map(c => Math.abs(data[i * 4 + c] - data[seed + c]))) <= limit;
  const mark = (i: number) => { result.fill(255, i * 4, i * 4 + 4); };
  if (!contiguous) { for (let i = 0; i < count; i++) if (matches(i)) mark(i); return result; }
  const seen = new Uint8Array(count), queue = new Int32Array(count);
  let head = 0, tail = 0;
  const add = (i: number) => { if (!seen[i]) { seen[i] = 1; if (matches(i)) { queue[tail++] = i; mark(i); } } };
  add(seed / 4);
  while (head < tail) { const i = queue[head++], column = i % width;
    if (column) add(i - 1); if (column < width - 1) add(i + 1);
    if (i >= width) add(i - width); if (i < count - width) add(i + width);
  }
  return result;
}
export function polygonBounds(points: SelectionPoint[]) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

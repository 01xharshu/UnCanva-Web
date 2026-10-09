/** Three separable box passes approximate a Gaussian in O(pixels), with premultiplied alpha.
 * Used only when the browser lacks Canvas 2D filters. Outside-canvas samples are transparent. */
export function gaussianFallback(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sigma: number,
) {
  if (sigma <= 0) return data;
  const ideal = Math.sqrt(4 * sigma * sigma + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower--;
  lower = Math.max(1, lower);
  const upper = lower + 2;
  const count = Math.max(
    0,
    Math.min(
      3,
      Math.round(
        (12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) /
          (-4 * lower - 4),
      ),
    ),
  );
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    data[i] *= alpha;
    data[i + 1] *= alpha;
    data[i + 2] *= alpha;
  }
  let src: Uint8ClampedArray = data,
    dst: Uint8ClampedArray = new Uint8ClampedArray(data.length);
  for (let pass = 0; pass < 3; pass++) {
    const radius = ((pass < count ? lower : upper) - 1) / 2,
      divisor = 2 * radius + 1;
    for (const horizontal of [true, false]) {
      const lines = horizontal ? h : w,
        length = horizontal ? w : h,
        stride = horizontal ? 4 : w * 4;
      for (let line = 0; line < lines; line++)
        for (let ch = 0; ch < 4; ch++) {
          const base = horizontal ? line * w * 4 + ch : line * 4 + ch;
          let sum = 0;
          for (let j = 0; j <= Math.min(radius, length - 1); j++)
            sum += src[base + j * stride];
          for (let i = 0; i < length; i++) {
            dst[base + i * stride] = sum / divisor;
            const remove = i - radius,
              add = i + radius + 1;
            if (remove >= 0) sum -= src[base + remove * stride];
            if (add < length) sum += src[base + add * stride];
          }
        }
      [src, dst] = [dst, src];
    }
  }
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    if (a) {
      src[i] = (src[i] * 255) / a;
      src[i + 1] = (src[i + 1] * 255) / a;
      src[i + 2] = (src[i + 2] * 255) / a;
    }
  }
  return src;
}

import { applyHsl } from "./hsl";
import { Adjustments } from "./document";
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const knots = [0, 64, 128, 192, 255];
export function curve(v: number, points: number[]) {
  const value = clamp(v) * 255;
  let i = 0;
  while (i < 3 && value > knots[i + 1]) i++;
  const t = (value - knots[i]) / (knots[i + 1] - knots[i]);
  return (points[i] + (points[i + 1] - points[i]) * t) / 255;
}
export function adjustPixels(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  a: Adjustments,
) {
  const exp = 2 ** a.exposure,
    c = (1 + a.contrast / 100) ** 2,
    s = 1 + a.saturation / 100;
  const hasHsl =
    !!a.hue || a.hsl.some((b) => b.hue || b.saturation || b.lightness);
  // Exposure operates on linear-light RGB, converted back to sRGB for display controls.
  const exposure = Array.from({ length: 256 }, (_, i) => {
    const v = i / 255,
      linear = (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * exp;
    return linear <= 0.0031308
      ? 12.92 * linear
      : 1.055 * linear ** (1 / 2.4) - 0.055;
  });
  for (let i = 0; i < data.length; i += 4) {
    let r = exposure[data[i]],
      g = exposure[data[i + 1]],
      b = exposure[data[i + 2]];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const tonal =
      (a.shadows * (1 - lum) ** 2 +
        a.highlights * lum ** 2 +
        a.whites * lum ** 4 +
        a.blacks * (1 - lum) ** 4) /
      200;
    r = r + a.brightness / 100 + tonal + a.temperature / 300 + a.red / 100;
    g = g + a.brightness / 100 + tonal + a.tint / 300 + a.green / 100;
    b = b + a.brightness / 100 + tonal - a.temperature / 300 + a.blue / 100;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat =
      s *
      (1 + (a.vibrance / 100) * (1 - (Math.max(r, g, b) - Math.min(r, g, b)))) *
      (1 - a.grayscale / 100);
    r = y + (r - y) * sat;
    g = y + (g - y) * sat;
    b = y + (b - y) * sat;
    if (hasHsl)
      [r, g, b] = applyHsl(clamp(r), clamp(g), clamp(b), a.hue, a.hsl);
    const x = (i / 4) % w,
      yy = Math.floor(i / 4 / w),
      vig =
        1 -
        (a.vignette / 100) *
          Math.min(1, ((x / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2);
    data[i] =
      255 *
      clamp(
        curve(
          curve(clamp((r - 0.5) * c + 0.5) ** (1 / a.gamma), a.curve),
          a.redCurve,
        ) * vig,
      );
    data[i + 1] =
      255 *
      clamp(
        curve(
          curve(clamp((g - 0.5) * c + 0.5) ** (1 / a.gamma), a.curve),
          a.greenCurve,
        ) * vig,
      );
    data[i + 2] =
      255 *
      clamp(
        curve(
          curve(clamp((b - 0.5) * c + 0.5) ** (1 / a.gamma), a.curve),
          a.blueCurve,
        ) * vig,
      );
  }
  if (a.sharpness) {
    const copy = data.slice(),
      amount = a.sharpness / 100;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++)
        for (let k = 0; k < 3; k++) {
          const i = (y * w + x) * 4 + k;
          data[i] =
            copy[i] +
            amount *
              (4 * copy[i] -
                copy[i - 4] -
                copy[i + 4] -
                copy[i - w * 4] -
                copy[i + w * 4]);
        }
  }
  return data;
}

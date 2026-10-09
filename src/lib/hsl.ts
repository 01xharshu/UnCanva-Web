export type HSLBand = { hue: number; saturation: number; lightness: number };
export const bandNames = ["Red", "Yellow", "Green", "Cyan", "Blue", "Magenta"];
export function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2;
  let h = 0;
  if (d) {
    h =
      max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h = (((h * 60) % 360) + 360) % 360;
  }
  return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}
export function hslToRgb(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  const rgb =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return rgb.map((v) => v + m);
}
export function applyHsl(
  r: number,
  g: number,
  b: number,
  hue: number,
  bands: HSLBand[],
) {
  const [h, s, l] = rgbToHsl(r, g, b);
  let dh = hue,
    ds = 0,
    dl = 0;
  for (let i = 0; i < bands.length; i++) {
    const distance = Math.abs(((h - i * 60 + 540) % 360) - 180),
      weight = Math.max(0, 1 - distance / 60);
    dh += bands[i].hue * weight;
    ds += bands[i].saturation * weight;
    dl += bands[i].lightness * weight;
  }
  return hslToRgb(
    h + dh,
    Math.max(0, Math.min(1, s * (1 + ds / 100))),
    Math.max(0, Math.min(1, l + dl / 100)),
  );
}

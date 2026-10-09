import { test, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  newProject,
  newLayer,
  validateProject,
  defaults,
} from "../src/lib/document";
import {
  saveProject,
  loadProject,
  listProjects,
  putAsset,
  getAsset,
  compactAssets,
  deleteProject,
} from "../src/lib/storage";
import { rgbToHsl, hslToRgb, applyHsl } from "../src/lib/hsl";
import { adjustPixels } from "../src/lib/pixels";
import { subjectRegion, regionPixels } from "../src/lib/ai-region";
import { matteValues, assertUsefulMatte } from "../src/lib/ai-math";
import { gaussianFallback } from "../src/lib/blur";
import { previewSize } from "../src/lib/device";
test("project gallery preserves independent documents and cleanup protects saved and live undo assets", async () => {
  const a = newProject(),
    b = newProject();
  a.name = "first";
  b.name = "second";
  a.artboards[0].layers.push({ ...newLayer("image"), asset: "keep-saved" });
  await putAsset("keep-saved", new Blob(["original"]));
  await putAsset("keep-history", new Blob(["history"]));
  await putAsset("orphan", new Blob(["dead"]));
  await saveProject(a);
  await saveProject(b);
  expect((await loadProject())?.id).toBe(b.id);
  expect((await loadProject(a.id))?.name).toBe("first");
  expect((await listProjects()).some((p) => p.id === a.id)).toBe(true);
  const live = structuredClone(a);
  live.artboards[0].layers[0].asset = "keep-history";
  await compactAssets([live]);
  expect(await getAsset("keep-saved")).toBeDefined();
  expect(await getAsset("keep-history")).toBeDefined();
  expect(await getAsset("orphan")).toBeUndefined();
  await deleteProject(b.id);
  expect(await loadProject(b.id)).toBeNull();
});
test("legacy projects migrate new curves and HSL without overwriting existing controls", () => {
  const p = newProject(),
    l = newLayer("rect");
  p.artboards[0].layers.push(l);
  const legacy = JSON.parse(JSON.stringify(p));
  for (const key of ["redCurve", "greenCurve", "blueCurve", "hsl"])
    delete legacy.artboards[0].layers[0].adjustments[key];
  expect(
    validateProject(legacy).artboards[0].layers[0].adjustments.hsl,
  ).toHaveLength(6);
  legacy.artboards[0].layers[0].adjustments.hsl[0].lightness = NaN;
  expect(() => validateProject(legacy)).toThrow("HSL");
});
test("HSL round trips primary and arbitrary colors and changes only selected band", () => {
  for (const rgb of [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0.2, 0.6, 0.8],
    [0.4, 0.4, 0.4],
  ]) {
    const [h, s, l] = rgbToHsl(...(rgb as [number, number, number]));
    hslToRgb(h, s, l).forEach((v, i) => expect(v).toBeCloseTo(rgb[i], 6));
  }
  const bands = structuredClone(defaults.hsl);
  bands[0].hue = 120;
  expect(applyHsl(1, 0, 0, 0, bands)).toEqual([0, 1, 0]);
  expect(applyHsl(0, 0, 1, 0, bands)).toEqual([0, 0, 1]);
});
test("red channel curve affects red independently and preserves alpha", () => {
  const a = structuredClone(defaults);
  a.redCurve = [255, 255, 255, 255, 255];
  const data = adjustPixels(
    new Uint8ClampedArray([50, 100, 150, 128]),
    1,
    1,
    a,
  );
  expect([...data]).toEqual([255, 100, 150, 128]);
});
test("AI output modes decode probabilities, normalized masks and logits correctly", () => {
  expect([...matteValues([0, 0.5, 1], "alpha")]).toEqual([0, 128, 255]);
  expect([...matteValues([0.2, 0.5, 0.8], "normalized")]).toEqual([
    0, 127, 255,
  ]);
  expect([...matteValues([-100, 0, 100], "logits")]).toEqual([0, 128, 255]);
});
test("Gaussian fallback spreads coverage while preserving premultiplied color", () => {
  const d = new Uint8ClampedArray(31 * 31 * 4),
    i = (15 * 31 + 15) * 4;
  d.set([255, 0, 0, 255], i);
  const b = gaussianFallback(d, 31, 31, 2);
  expect(b[i + 3]).toBeGreaterThan(0);
  expect(b[i + 3]).toBeLessThan(255);
  expect(b[i + 4 + 3]).toBeGreaterThan(0);
  expect(b[i]).toBe(255);
  expect(b[i + 1]).toBe(0);
});
test("preview allocations stay bounded for high resolution and narrow artboards", () => {
  expect(previewSize(8192, 4096)).toEqual({ width: 2048, height: 1024 });
  expect(previewSize(1, 8192)).toEqual({ width: 1, height: 2048 });
  expect(previewSize(240, 160)).toEqual({ width: 240, height: 160 });
});

test("image selections clamp/reverse into original pixel regions independent of preview resolution", () => {
  const region = subjectRegion([900, 700], [200, 100], 1000, 800);
  expect(region).toEqual({ x: 0.2, y: 0.125, width: 0.7, height: 0.75 });
  expect(regionPixels(region, 4000, 3200)).toEqual({
    x: 800,
    y: 400,
    width: 2800,
    height: 2400,
  });
  expect(
    regionPixels(subjectRegion([-10, -20], [5000, 900], 1000, 800), 4000, 3200),
  ).toEqual({ x: 0, y: 0, width: 4000, height: 3200 });
  expect(() =>
    regionPixels({ x: 0, y: 0, width: 0, height: 1 }, 100, 100),
  ).toThrow();
});
test("invalid or empty/solid AI masks cannot destroy a previous good mask", () => {
  expect(() => matteValues([NaN], "alpha")).toThrow(/invalid mask/);
  expect(() => assertUsefulMatte(new Uint8ClampedArray(100))).toThrow(
    /preserved/,
  );
  expect(() => assertUsefulMatte(new Uint8ClampedArray(100).fill(255))).toThrow(
    /preserved/,
  );
  expect(() =>
    assertUsefulMatte(new Uint8ClampedArray([0, 128, 255])),
  ).not.toThrow();
});

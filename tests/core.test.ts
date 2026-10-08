import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import {
  History,
  newProject,
  newLayer,
  localPoint,
  dimensions,
  validateProject,
  defaults,
  resizeLayer,
} from "../src/lib/document";
import { adjustPixels, curve } from "../src/lib/pixels";
import {
  saveProject,
  loadProject,
  putAsset,
  getAsset,
} from "../src/lib/storage";
beforeAll(() => {
  if (!globalThis.crypto) throw new Error("Crypto missing");
});
describe("document and history", () => {
  it("keeps artboards and layers independent", () => {
    const p = newProject(),
      l = { ...newLayer("image"), asset: "original" };
    p.artboards[0].layers.push(l);
    const next = structuredClone(p);
    next.artboards[0].layers[0].x = 99;
    expect(p.artboards[0].layers[0].x).toBe(100);
    expect(validateProject(next)).toEqual(next);
  });
  it("undoes, redoes and invalidates redo on a branch", () => {
    const h = new History(0, 2);
    h.commit(1);
    h.commit(2);
    expect(h.undo()).toBe(1);
    expect(h.redo()).toBe(2);
    h.undo();
    h.commit(3);
    expect(h.redo()).toBe(3);
    h.commit(4);
    expect(h.past).toHaveLength(2);
  });
  it("maps rotated coordinates to layer pixels", () => {
    const l = { ...newLayer("image"), asset: "original" };
    l.x = 0;
    l.y = 0;
    l.width = 100;
    l.height = 100;
    l.rotation = 90;
    const p = localPoint(l, 50, 100);
    expect(p[0]).toBeCloseTo(100);
    expect(p[1]).toBeCloseTo(50);
  });
  it("rejects oversized and invalid dimensions", () => {
    expect(() => dimensions(9000, 10)).toThrow();
    expect(() => dimensions(NaN, 10)).toThrow();
    expect(() => dimensions(8192, 8192)).toThrow();
  });
  it("rejects malformed backups", () =>
    expect(() => validateProject({ version: 1, artboards: [] })).toThrow());
});
describe("image math", () => {
  it("identity preserves RGB and alpha", () => {
    const p = new Uint8ClampedArray([24, 100, 250, 71]);
    expect([...adjustPixels(p, 1, 1, defaults)]).toEqual([24, 100, 250, 71]);
  });
  it("exposure increases linear light by one stop, preserves alpha", () => {
    const p = new Uint8ClampedArray([64, 64, 64, 80]);
    expect([...adjustPixels(p, 1, 1, { ...defaults, exposure: 1 })]).toEqual([
      90, 90, 90, 80,
    ]);
  });
  it("grayscale yields equal channels", () => {
    const p = adjustPixels(new Uint8ClampedArray([100, 200, 50, 255]), 1, 1, {
      ...defaults,
      grayscale: 100,
    });
    expect(p[0]).toBe(p[1]);
    expect(p[1]).toBe(p[2]);
  });
  it("interpolates curves", () =>
    expect(curve(128 / 255, [0, 64, 64, 192, 255])).toBeCloseTo(64 / 255));
});
describe("IndexedDB transactions", () => {
  it("persists the full layered project", async () => {
    const p = newProject();
    p.artboards[0].layers.push({
      ...newLayer("image"),
      asset: "original",
      mask: "mask",
      strokes: [
        {
          points: [[1, 2]],
          size: 5,
          opacity: 0.5,
          hardness: 1,
          restore: false,
        },
      ],
    });
    await saveProject(p);
    expect(await loadProject()).toEqual(p);
  });
  it("stores original blobs without serialising pixels", async () => {
    const blob = new Blob(["original"], { type: "image/png" });
    await putAsset("fixture", blob);
    expect(await (await getAsset("fixture"))?.text()).toBe("original");
  });
});

it("keeps the opposite corner fixed when resizing a rotated layer", () => {
  const l = {
    ...newLayer("rect"),
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 90,
  };
  const next = { ...l, ...resizeLayer(l, [10, 195], "br") };
  expect(next.width).toBeCloseTo(200);
  expect(next.height).toBeCloseTo(75);
  const anchor = (v: typeof l) => {
    const r = (v.rotation * Math.PI) / 180;
    return [
      v.x +
        v.width / 2 -
        (Math.cos(r) * v.width) / 2 +
        (Math.sin(r) * v.height) / 2,
      v.y +
        v.height / 2 -
        (Math.sin(r) * v.width) / 2 -
        (Math.cos(r) * v.height) / 2,
    ];
  };
  expect(anchor(next)[0]).toBeCloseTo(anchor(l)[0]);
  expect(anchor(next)[1]).toBeCloseTo(anchor(l)[1]);
});

it("history restores a falsy initial state", () => {
  const h = new History(0);
  h.commit(1);
  expect(h.undo()).toBe(0);
  expect(h.redo()).toBe(1);
});

it("rejects nonfinite adjustment and malformed strokes", () => {
  const p = newProject(),
    l = newLayer("rect");
  p.artboards[0].layers.push(l);
  l.adjustments.brightness = NaN;
  expect(() => validateProject(p)).toThrow("adjustment");
  l.adjustments.brightness = 0;
  l.strokes = [
    {
      points: [[Infinity, 0]],
      size: 10,
      hardness: 1,
      opacity: 1,
      restore: false,
    },
  ];
  expect(() => validateProject(p)).toThrow("stroke");
});

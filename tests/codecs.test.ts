import { describe, it, expect } from "vitest";
import {
  encodeBMP,
  decodeBMP,
  encodeTGA,
  decodeTGA,
  encodeQOI,
  decodeQOI,
  encodePPM,
  decodePPM,
  wrapICO,
} from "../src/lib/binary-codecs";
const fixture = {
  width: 2,
  height: 2,
  data: new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 255,
  ]),
};
describe("binary image encoders and decoders", () => {
  for (const [name, encode, decode] of [
    ["TGA", encodeTGA, decodeTGA],
    ["QOI", encodeQOI, decodeQOI],
  ] as const)
    it(`${name} preserves exact RGBA and dimensions`, () =>
      expect(decode(encode(fixture))).toEqual(fixture));
  for (const [name, encode, decode] of [
    ["BMP", encodeBMP, decodeBMP],
    ["PPM", encodePPM, decodePPM],
  ] as const)
    it(`${name} flattens alpha against white`, () => {
      const result = decode(encode(fixture));
      expect([result.width, result.height]).toEqual([2, 2]);
      expect([...result.data]).toEqual([
        255, 0, 0, 255, 127, 255, 127, 255, 255, 255, 255, 255, 10, 20, 30, 255,
      ]);
    });
  it("makes a valid ICO directory for a PNG payload", () => {
    const png = new Uint8Array([137, 80, 78, 71]).buffer,
      ico = wrapICO(png, 256, 256),
      v = new DataView(ico);
    expect(v.getUint16(2, true)).toBe(1);
    expect(v.getUint16(4, true)).toBe(1);
    expect(v.getUint32(14, true)).toBe(4);
    expect(v.getUint32(18, true)).toBe(22);
    expect(new Uint8Array(ico)[6]).toBe(0);
  });
  it("rejects bad/truncated image headers", () => {
    for (const fn of [decodeBMP, decodeTGA, decodeQOI, decodePPM])
      expect(() => fn(new ArrayBuffer(30))).toThrow();
  });
  it("bounds raster allocations before decoding", () => {
    const qoi = encodeQOI(fixture);
    new DataView(qoi).setUint32(4, 999999);
    expect(() => decodeQOI(qoi)).toThrow("dimensions");
  });
});

it("rejects truncated ASCII PPM and invalid QOI markers", () => {
  expect(() =>
    decodePPM(new TextEncoder().encode("P3\n1 1\n255\n12 34").buffer),
  ).toThrow("Invalid PPM");
  const qoi = encodeQOI(fixture);
  new Uint8Array(qoi)[qoi.byteLength - 1] = 0;
  expect(() => decodeQOI(qoi)).toThrow("Invalid QOI");
});

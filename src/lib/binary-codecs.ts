import { dimensions } from "./document";
export type Raster = { width: number; height: number; data: Uint8ClampedArray };
const white = (channel: number, alpha: number) =>
  Math.round((channel * alpha) / 255 + 255 - alpha);
export function encodeBMP(p: Raster) {
  const stride = Math.ceil((p.width * 3) / 4) * 4,
    buffer = new ArrayBuffer(54 + stride * p.height),
    v = new DataView(buffer),
    out = new Uint8Array(buffer);
  out.set([66, 77]);
  v.setUint32(2, buffer.byteLength, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, p.width, true);
  v.setInt32(22, p.height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, stride * p.height, true);
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      const i = (y * p.width + x) * 4,
        j = 54 + (p.height - y - 1) * stride + x * 3;
      out[j] = white(p.data[i + 2], p.data[i + 3]);
      out[j + 1] = white(p.data[i + 1], p.data[i + 3]);
      out[j + 2] = white(p.data[i], p.data[i + 3]);
    }
  return buffer;
}
export function decodeBMP(buffer: ArrayBuffer): Raster {
  const v = new DataView(buffer);
  if (v.byteLength < 54 || v.getUint16(0, true) !== 0x4d42)
    throw new Error("Invalid BMP");
  const width = v.getInt32(18, true),
    rawHeight = v.getInt32(22, true),
    height = Math.abs(rawHeight),
    bits = v.getUint16(28, true),
    compression = v.getUint32(30, true),
    offset = v.getUint32(10, true);
  dimensions(width, height);
  if (![24, 32].includes(bits) || compression !== 0)
    throw new Error("Use an uncompressed 24/32-bit BMP");
  const stride = Math.ceil((width * bits) / 32) * 4;
  if (offset + stride * height > buffer.byteLength)
    throw new Error("Truncated BMP");
  const data = new Uint8ClampedArray(width * height * 4),
    bytes = new Uint8Array(buffer);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4,
        j =
          offset +
          (rawHeight > 0 ? height - y - 1 : y) * stride +
          (x * bits) / 8;
      data[i] = bytes[j + 2];
      data[i + 1] = bytes[j + 1];
      data[i + 2] = bytes[j];
      data[i + 3] = 255;
    }
  return { width, height, data };
}
export function encodeTGA(p: Raster) {
  const out = new Uint8Array(18 + p.width * p.height * 4),
    v = new DataView(out.buffer);
  out[2] = 2;
  v.setUint16(12, p.width, true);
  v.setUint16(14, p.height, true);
  out[16] = 32;
  out[17] = 0x28;
  for (let i = 0; i < p.data.length; i += 4) {
    out[18 + i] = p.data[i + 2];
    out[19 + i] = p.data[i + 1];
    out[20 + i] = p.data[i];
    out[21 + i] = p.data[i + 3];
  }
  return out.buffer;
}
export function decodeTGA(buffer: ArrayBuffer): Raster {
  const v = new DataView(buffer),
    bytes = new Uint8Array(buffer);
  if (bytes.length < 18) throw new Error("Invalid TGA");
  const width = v.getUint16(12, true),
    height = v.getUint16(14, true),
    bits = bytes[16],
    kind = bytes[2];
  dimensions(width, height);
  if (bytes[1] !== 0 || ![2, 10].includes(kind) || ![24, 32].includes(bits))
    throw new Error("Use true-color 24/32-bit TGA");
  let pos = 18 + bytes[0],
    n = 0;
  const data = new Uint8ClampedArray(width * height * 4),
    read = () => {
      if (pos + bits / 8 > bytes.length) throw new Error("Truncated TGA");
      const color = [
        bytes[pos + 2],
        bytes[pos + 1],
        bytes[pos],
        bits === 32 ? bytes[pos + 3] : 255,
      ];
      pos += bits / 8;
      return color;
    },
    write = (color: number[]) => {
      if (n >= width * height) throw new Error("Invalid TGA run");
      const x = n % width,
        y = Math.floor(n / width),
        xx = bytes[17] & 16 ? width - 1 - x : x,
        yy = bytes[17] & 32 ? y : height - 1 - y;
      data.set(color, (yy * width + xx) * 4);
      n++;
    };
  while (n < width * height) {
    if (kind === 2) write(read());
    else {
      if (pos >= bytes.length) throw new Error("Truncated TGA");
      const head = bytes[pos++],
        count = (head & 127) + 1;
      if (head & 128) {
        const color = read();
        for (let i = 0; i < count; i++) write(color);
      } else for (let i = 0; i < count; i++) write(read());
    }
  }
  return { width, height, data };
}
export function encodePPM(p: Raster) {
  const header = new TextEncoder().encode(`P6\n${p.width} ${p.height}\n255\n`),
    out = new Uint8Array(header.length + p.width * p.height * 3);
  out.set(header);
  for (let i = 0, j = header.length; i < p.data.length; i += 4) {
    out[j++] = white(p.data[i], p.data[i + 3]);
    out[j++] = white(p.data[i + 1], p.data[i + 3]);
    out[j++] = white(p.data[i + 2], p.data[i + 3]);
  }
  return out.buffer;
}
export function decodePPM(buffer: ArrayBuffer): Raster {
  const bytes = new Uint8Array(buffer);
  let pos = 0;
  const token = () => {
    while (pos < bytes.length) {
      if (bytes[pos] === 35) {
        while (pos < bytes.length && bytes[pos] !== 10) pos++;
      } else if (bytes[pos] <= 32) pos++;
      else break;
    }
    let out = "";
    while (pos < bytes.length && bytes[pos] > 32)
      out += String.fromCharCode(bytes[pos++]);
    return out;
  };
  const kind = token(),
    width = Number(token()),
    height = Number(token()),
    max = Number(token());
  dimensions(width, height);
  if (
    !["P6", "P3"].includes(kind) ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 255
  )
    throw new Error("Use 8-bit RGB PPM (P3/P6)");
  const data = new Uint8ClampedArray(width * height * 4);
  if (kind === "P6") {
    if (bytes[pos] === 13 && bytes[pos + 1] === 10) pos += 2;
    else pos++;
    if (pos + width * height * 3 > bytes.length)
      throw new Error("Truncated PPM");
    for (let i = 0; i < data.length; i += 4) {
      data[i] = (bytes[pos++] * 255) / max;
      data[i + 1] = (bytes[pos++] * 255) / max;
      data[i + 2] = (bytes[pos++] * 255) / max;
      data[i + 3] = 255;
    }
  } else
    for (let i = 0; i < data.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        const raw = token(),
          value = Number(raw);
        if (!raw || !Number.isInteger(value) || value < 0 || value > max)
          throw new Error("Invalid PPM pixel");
        data[i + ch] = (value * 255) / max;
      }
      data[i + 3] = 255;
    }
  return { width, height, data };
}
export function encodeQOI(p: Raster) {
  const out = new Uint8Array(14 + p.width * p.height * 5 + 8),
    v = new DataView(out.buffer);
  out.set([113, 111, 105, 102]);
  v.setUint32(4, p.width);
  v.setUint32(8, p.height);
  out[12] = 4;
  for (let i = 0, j = 14; i < p.data.length; i += 4) {
    out[j++] = 255;
    out.set(p.data.subarray(i, i + 4), j);
    j += 4;
  }
  out[out.length - 1] = 1;
  return out.buffer;
}
export function decodeQOI(buffer: ArrayBuffer): Raster {
  const bytes = new Uint8Array(buffer),
    v = new DataView(buffer);
  if (bytes.length < 22 || v.getUint32(0) !== 0x716f6966)
    throw new Error("Invalid QOI");
  const width = v.getUint32(4),
    height = v.getUint32(8);
  dimensions(width, height);
  if (
    ![3, 4].includes(bytes[12]) ||
    bytes[13] > 1 ||
    bytes
      .subarray(bytes.length - 8, bytes.length - 1)
      .some((value) => value !== 0) ||
    bytes.at(-1) !== 1
  )
    throw new Error("Invalid QOI header or end marker");
  const data = new Uint8ClampedArray(width * height * 4),
    index = new Uint8Array(256);
  let r = 0,
    g = 0,
    b = 0,
    a = 255,
    pos = 14,
    run = 0;
  const read = () => {
    if (pos >= bytes.length - 8) throw new Error("Truncated QOI");
    return bytes[pos++];
  };
  for (let i = 0; i < data.length; i += 4) {
    if (run) run--;
    else {
      const op = read();
      if (op === 254) {
        r = read();
        g = read();
        b = read();
      } else if (op === 255) {
        r = read();
        g = read();
        b = read();
        a = read();
      } else if ((op & 192) === 0) {
        const j = (op & 63) * 4;
        r = index[j];
        g = index[j + 1];
        b = index[j + 2];
        a = index[j + 3];
      } else if ((op & 192) === 64) {
        r = (r + ((op >> 4) & 3) - 2) & 255;
        g = (g + ((op >> 2) & 3) - 2) & 255;
        b = (b + (op & 3) - 2) & 255;
      } else if ((op & 192) === 128) {
        const next = read(),
          dg = (op & 63) - 32;
        r = (r + dg + (next >> 4) - 8) & 255;
        g = (g + dg) & 255;
        b = (b + dg + (next & 15) - 8) & 255;
      } else {
        run = op & 63;
        if (i / 4 + run >= width * height) throw new Error("Invalid QOI run");
      }
    }
    data.set([r, g, b, a], i);
    const hash = ((r * 3 + g * 5 + b * 7 + a * 11) % 64) * 4;
    index.set([r, g, b, a], hash);
  }
  return { width, height, data };
}
export function wrapICO(png: ArrayBuffer, width: number, height: number) {
  const out = new Uint8Array(22 + png.byteLength),
    v = new DataView(out.buffer);
  v.setUint16(2, 1, true);
  v.setUint16(4, 1, true);
  out[6] = width === 256 ? 0 : width;
  out[7] = height === 256 ? 0 : height;
  v.setUint16(10, 1, true);
  v.setUint16(12, 32, true);
  v.setUint32(14, png.byteLength, true);
  v.setUint32(18, 22, true);
  out.set(new Uint8Array(png), 22);
  return out.buffer;
}

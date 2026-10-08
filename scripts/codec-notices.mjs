import { mkdir, writeFile } from "node:fs/promises";
const sources = [
  [
    "libavif (BSD-2-Clause)",
    "https://raw.githubusercontent.com/AOMediaCodec/libavif/v1.0.1/LICENSE",
  ],
  [
    "libaom (BSD-2-Clause)",
    "https://aomedia.googlesource.com/aom/+/v3.7.0/LICENSE?format=TEXT",
    true,
  ],
  [
    "libaom patent grant",
    "https://aomedia.googlesource.com/aom/+/v3.7.0/PATENTS?format=TEXT",
    true,
  ],
  [
    "libwebp / SharpYUV (BSD-3-Clause)",
    "https://chromium.googlesource.com/webm/libwebp/+/e2c85878f6a33f29948b43d3492d9cdaf801aa54/COPYING?format=TEXT",
    true,
  ],
  [
    "libjxl (BSD-3-Clause)",
    "https://raw.githubusercontent.com/libjxl/libjxl/9f544641ec83f6abd9da598bdd08178ee8a003e0/LICENSE",
  ],
  [
    "Brotli (MIT)",
    "https://raw.githubusercontent.com/google/brotli/v1.0.9/LICENSE",
  ],
  [
    "Highway (Apache-2.0)",
    "https://raw.githubusercontent.com/google/highway/0.14.2/LICENSE",
  ],
  [
    "skcms (BSD-3-Clause)",
    "https://skia.googlesource.com/skcms/+/refs/heads/main/LICENSE?format=TEXT",
    true,
  ],
];
let notices =
  "Native codec notices accompanying the Apache-2.0 jSquash browser WASM bundles.\nBuild provenance: https://github.com/jamsinclair/jSquash/tree/main/packages/{avif,jxl}/codec\nThe npm package-lock pins the distributed binaries. These notices reproduce upstream native library terms.\n\n";
for (const [name, url, base64] of sources) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Licence download failed: ${url} (${response.status})`);
  const text = await response.text();
  notices += `--- ${name} ---\nSource: ${url}\n${base64 ? Buffer.from(text, "base64").toString("utf8") : text}\n\n`;
}
await mkdir("public/codecs", { recursive: true });
await writeFile("public/codecs/LICENSES.txt", notices);
console.log("Native codec notices saved");

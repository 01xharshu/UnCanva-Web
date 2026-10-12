import { readFile, stat, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const config = JSON.parse(await readFile("vercel.json", "utf8"));
assert.equal(config.framework, null);
assert.equal(config.outputDirectory, "out");
for (const file of [
  "index.html",
  "editor/index.html",
  "sw.js",
  "offline-shell.json",
  "THIRD_PARTY_NOTICES.txt",
  "models/LICENSE-U2NetP.txt",
  "models/LICENSE-BiRefNet.txt",
  "models/LICENSE-MODNet.txt",
  "codecs/LICENSES.txt",
  "runtime/ort-wasm-simd-threaded.asyncify.wasm",
  "runtime/ort-wasm-simd-threaded.asyncify.mjs",
])
  assert((await stat(`out/${file}`)).size > 0, file);
for (const [file, manifest] of [
  ["u2netp.onnx", "U2NetP-manifest.json"],
  ["modnet.onnx", "manifest.json"],
]) {
  const m = JSON.parse(await readFile(`out/models/${manifest}`, "utf8"));
  assert.equal(
    createHash("sha256")
      .update(await readFile(`out/models/${file}`))
      .digest("hex"),
    m.sha256,
  );
}
const hash = createHash("sha256");
for (let i = 0; i < 8; i++) {
  const bytes = await readFile(`out/models/birefnet/part-${i}.bin`);
  assert(bytes.length <= 24 * 1024 * 1024);
  hash.update(bytes);
}
const detail = JSON.parse(
  await readFile("out/models/BiRefNet-manifest.json", "utf8"),
);
assert.equal(hash.digest("hex"), detail.sha256);
assert.equal((await readdir("out/models")).includes("birefnet.onnx"), false);
for (const codec of ["avif", "jxl", "webp"])
  for (const op of ["enc", "dec"])
    assert((await stat(`out/codecs/${codec}_${op}.wasm`)).size > 0);
assert(
  config.headers.some(
    (r) =>
      r.source === "/sw.js" &&
      r.headers.some(
        (h) => h.key === "Cache-Control" && h.value === "no-cache",
      ),
  ),
);
const strictPageCsp = config.headers
  .filter((r) => ["/", "/editor(.*)"].includes(r.source))
  .flatMap((r) => r.headers)
  .find((h) => h.key === "Content-Security-Policy")?.value;
assert(strictPageCsp?.includes("connect-src 'self'") && !strictPageCsp.includes("'unsafe-eval'"));
const rawCsp = config.headers.find((r) => r.source === "/codecs/raw/(.*)")?.headers
  .find((h) => h.key === "Content-Security-Policy")?.value;
assert(rawCsp?.includes("'unsafe-eval'") && rawCsp.includes("base-uri 'none'"));
const advancedRequired = [
  "codecs/heif.js", "codecs/pdf.worker.mjs", "codecs/lcms.min.js", "codecs/lcms.wasm",
  "codecs/raw/index.js", "codecs/raw/worker.js", "codecs/raw/libraw.js", "codecs/raw/libraw.wasm",
  "codecs/sources/manifest.json", "codecs/LICENSE-HEIF.txt", "codecs/LICENSE-LibRaw.txt",
  "codecs/LICENSE-LCMS.txt", "codecs/LICENSE-PDFJS.txt",
];
for (const relative of advancedRequired) assert((await stat(`out/${relative}`)).size > 0, relative);
const sourceManifest=JSON.parse(await readFile("out/codecs/sources/manifest.json","utf8"));
for(const part of sourceManifest) {
  const bytes=await readFile(`out/codecs/sources/${part.name}.tar.gz`);
  assert.equal(bytes.length,part.bytes,`source bytes: ${part.name}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),part.sha256,`source checksum: ${part.name}`);
}
const policy=JSON.stringify(config.headers[0].headers);
assert(policy.includes("Cross-Origin-Opener-Policy")&&policy.includes("Cross-Origin-Embedder-Policy"));
console.log(
  "Static Vercel artifact PASS: routes, self-hosted AI and RAW/HEIF/PDF/ICC runtimes, codec notices, checksummed corresponding source archives, and static isolation/security headers.",
);

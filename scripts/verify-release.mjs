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
assert(
  config.headers[0].headers
    .find((h) => h.key === "Content-Security-Policy")
    .value.includes("connect-src 'self'"),
);
console.log(
  "Static Vercel artifact PASS: routes, self-hosted model checksums/chunks, runtime, codec assets, licences and security headers.",
);

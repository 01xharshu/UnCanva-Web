import { mkdir, readdir, copyFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("public/runtime", { recursive: true });
await mkdir("public/models", { recursive: true });
for (const name of await readdir("node_modules/onnxruntime-web/dist"))
  if (/^ort-wasm-simd-threaded\.asyncify\.(wasm|mjs)$/.test(name))
    await copyFile(
      `node_modules/onnxruntime-web/dist/${name}`,
      `public/runtime/${name}`,
    );
const revision = "fa2fa546052fba4c08921230a26cc69a333fca12";
const url = `https://huggingface.co/Xenova/modnet/resolve/${revision}/onnx/model.onnx`;
console.log("Downloading pinned Apache-2.0 MODNet weights…");
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status}: ${url}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (
  sha256 !== "07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9"
)
  throw new Error("Model checksum mismatch");
await writeFile("public/models/modnet.onnx", bytes);
const license = await fetch(
  "https://raw.githubusercontent.com/ZHKKKe/MODNet/master/LICENSE",
);
if (!license.ok) throw new Error("Licence download failed");
await writeFile("public/models/LICENSE-MODNet.txt", await license.text());
await writeFile(
  "public/models/manifest.json",
  JSON.stringify(
    {
      model: "Xenova/modnet",
      revision,
      url,
      license: "Apache-2.0",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    },
    null,
    2,
  ),
);
console.log("Self-hosted runtime and model ready:", bytes.length, "bytes");

const runtimeLicense = await fetch(
  "https://raw.githubusercontent.com/microsoft/onnxruntime/v1.30.0/LICENSE",
);
if (!runtimeLicense.ok) throw new Error("Runtime licence download failed");
await writeFile(
  "public/models/LICENSE-ONNX-RUNTIME.txt",
  await runtimeLicense.text(),
);
await import("./notices.mjs");

await mkdir("public/codecs", { recursive: true });
for (const codec of ["avif", "jxl", "webp"])
  for (const direction of ["enc", "dec"])
    for (const name of await readdir(
      `node_modules/@jsquash/${codec}/codec/${direction}`,
    ))
      if (/^(avif|jxl|webp)_(enc|dec)\.wasm$/.test(name))
        await copyFile(
          `node_modules/@jsquash/${codec}/codec/${direction}/${name}`,
          `public/codecs/${name}`,
        );

await import("./codec-notices.mjs");

await import("./general-models.mjs");

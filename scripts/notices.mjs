import { readFile, writeFile } from "node:fs/promises";
const packages = [
  "next",
  "react",
  "react-dom",
  "lucide-react",
  "onnxruntime-web",
  "onnxruntime-common",
  "flatbuffers",
  "long",
  "protobufjs",
  "guid-typescript",
  "platform",
  "scheduler",
  "tailwindcss",
  "utif",
  "pako",
  "gifenc",
  "jspdf",
  "ag-psd",
  "@jsquash/avif",
  "@jsquash/jxl",
  "wasm-feature-detect",
  "@babel/runtime",
  "fflate",
  "fast-png",
  "iobuffer",
  "base64-js",
  "ag-psd/node_modules/pako",
  "utif/node_modules/pako",
  "canvg",
  "core-js",
  "dompurify",
  "html2canvas",
  "raf",
  "regenerator-runtime",
  "rgbcolor",
  "stackblur-canvas",
  "svg-pathdata",
  "css-line-break",
  "text-segmentation",
  "utrie",
  "base64-arraybuffer",
  "performance-now",
  "tslib",
];
let output =
  "UnCanva — third-party notices\n\nMODNet weights: Apache-2.0; see /models/LICENSE-MODNet.txt and /models/manifest.json.\nMODNet authors: Zhanghan Ke, Kaican Li, Yurou Zhou, Qiuhua Wu, Xiaoyan Mao, Qiong Yan, Rynson W.H. Lau. ONNX conversion: Xenova.\n\n";
for (const name of packages) {
  try {
    const p = JSON.parse(
      await readFile(`node_modules/${name}/package.json`, "utf8"),
    );
    output += `\n--- ${name} ${p.version} (${typeof p.license === "string" ? p.license : JSON.stringify(p.license)}) ---\n`;
    let found = false;
    for (const file of [
      "LICENSE",
      "LICENSE.md",
      "LICENSE.txt",
      "license.md",
      "LICENSE-MIT",
      "LICENSE-MIT.txt",
      "LICENSE.BSD",
      "LICENSE-MIT.md",
      "LICENSE-MIT",
      "LICENSE-MIT.txt",
      "COPYING",
    ]) {
      try {
        output += await readFile(`node_modules/${name}/${file}`, "utf8");
        found = true;
        break;
      } catch {
        /* Try the next conventional licence filename. */
      }
    }
    if (!found && name.startsWith("onnxruntime"))
      output += await readFile(
        "public/models/LICENSE-ONNX-RUNTIME.txt",
        "utf8",
      );
    output += "\n";
  } catch (error) {
    throw new Error(`Cannot collect licence for ${name}: ${error.message}`);
  }
}
await writeFile("public/THIRD_PARTY_NOTICES.txt", output);
console.log("Third-party notices saved");

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
const specs = [
  {
    name: "U2NetP",
    repo: "edgetools/u2netp",
    revision: "25dee37ab19c5b6ad64ba6578eba63f1ae07720c",
    remote: "u2netp.onnx",
    file: "u2netp.onnx",
    license: "Apache-2.0",
    licenseURL:
      "https://raw.githubusercontent.com/xuebinqin/U-2-Net/master/LICENSE",
    sha256: "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8",
  },
  {
    name: "BiRefNet",
    repo: "studioludens/birefnet-lite-512",
    revision: "4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7",
    remote: "onnx/model.onnx",
    file: "birefnet.onnx",
    license: "MIT",
    licenseURL:
      "https://raw.githubusercontent.com/ZhengPeng7/BiRefNet/main/LICENSE",
    sha256: "1cb0fb360dadd15af77c639085d77a9df67db0c64315560c3de005f676345ac2",
  },
];
for (const spec of specs) {
  const url = `https://huggingface.co/${spec.repo}/resolve/${spec.revision}/${spec.remote}`;
  const local =
    spec.name === "BiRefNet"
      ? `tmp/models/${spec.file}`
      : `public/models/${spec.file}`;
  let bytes;
  try {
    bytes = await readFile(local);
  } catch {
    /* First installation downloads the pinned asset. */
  }
  if (
    !bytes ||
    createHash("sha256").update(bytes).digest("hex") !== spec.sha256
  ) {
    console.log(`Downloading ${spec.name} from pinned revision`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash("sha256").update(bytes).digest("hex") !== spec.sha256)
    throw new Error(`${spec.name} checksum mismatch`);
  await mkdir("tmp/models", { recursive: true });
  await writeFile(local, bytes);
  if (spec.name === "BiRefNet") {
    await mkdir("public/models/birefnet", { recursive: true });
    for (let i = 0; i < 8; i++)
      await writeFile(
        `public/models/birefnet/part-${i}.bin`,
        bytes.subarray(i * 24 * 1048576, (i + 1) * 24 * 1048576),
      );
    await rm("public/models/birefnet.onnx", { force: true });
  }
  const licence = await fetch(spec.licenseURL);
  if (!licence.ok) throw new Error("Model licence missing");
  await writeFile(
    `public/models/LICENSE-${spec.name}.txt`,
    await licence.text(),
  );
  await writeFile(
    `public/models/${spec.name}-manifest.json`,
    JSON.stringify({ ...spec, url, bytes: bytes.length }, null, 2),
  );
  console.log(`${spec.name} ready: ${bytes.length} bytes`);
}

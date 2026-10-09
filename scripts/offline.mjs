import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const list = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) list.push(...(await walk(path)));
    else list.push(path);
  }
  return list;
}
const files = (await walk("out")).filter(
  (p) =>
    p.startsWith("out/_next/") ||
    /\.html$/.test(p) ||
    p.startsWith("out/editor/") ||
    /out\/__next/.test(p),
);
const urls = ["/", "/editor", "/editor/", ...files.map((p) => p.slice(3))];
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(file));
hash.update(await readFile("public/sw.js"));
const id = hash.digest("hex").slice(0, 16);
await writeFile("out/offline-shell.json", JSON.stringify(urls));
await writeFile(
  "out/sw.js",
  (await readFile("public/sw.js", "utf8")).replace("__BUILD__", id),
);
console.log(`Offline shell: ${urls.length} assets, build ${id}`);

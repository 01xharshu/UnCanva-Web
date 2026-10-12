import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
await mkdir('public/codecs/raw', {recursive:true});
for (const name of ['index.js','worker.js','libraw.js','libraw.wasm']) await copyFile(`node_modules/libraw-wasm/dist/${name}`, `public/codecs/raw/${name}`);
await copyFile('node_modules/libheif-js/libheif/libheif.js','public/codecs/heif.js');
await writeFile('public/codecs/heif.js',(await readFile('public/codecs/heif.js','utf8'))+'\nglobalThis.__uncanvaHeif = libheif;\n');
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/codecs/pdf.worker.mjs');
await copyFile('node_modules/libheif-js/LICENSE','public/codecs/LICENSE-HEIF.txt');
await copyFile('node_modules/pdfjs-dist/LICENSE','public/codecs/LICENSE-PDFJS.txt');
const sources = [
 ['LICENSE-LibRaw.txt','https://raw.githubusercontent.com/LibRaw/LibRaw/0.22.1/LICENSE.LGPL'],
 ['LICENSE-LCMS.txt','https://raw.githubusercontent.com/mm2/Little-CMS/lcms2.19.1/LICENSE'],
];
for (const [name,url] of sources) { const response = await fetch(url); if (!response.ok) throw new Error(`Licence unavailable: ${url}`); await writeFile(`public/codecs/${name}`,await response.text()); }
await writeFile('public/codecs/ADVANCED-SOURCES.txt',`Pinned redistributable decoder sources and rebuild instructions:\nLibRaw WASM wrapper ISC: https://github.com/ybouane/LibRaw-Wasm/tree/v1.6.0 (npm package libraw-wasm 1.6.0); compileLibraw.sh with Emscripten 5.0.7.\nLibRaw 0.22.1 LGPL-2.1: https://github.com/LibRaw/LibRaw/tree/0.22.1\nLittleCMS 2.19.1 MIT: https://github.com/mm2/Little-CMS/tree/lcms2.19.1\nlibheif-js 1.23.5 LGPL-3.0: https://github.com/catdad-experiments/libheif-js/tree/v1.23.5 (scripts/build.sh and build provenance in package README). Upstream libheif https://github.com/strukturag/libheif and libde265 https://github.com/strukturag/libde265.\nMozilla PDF.js 6.4.299 Apache-2.0: https://github.com/mozilla/pdf.js\nUnmodified decoders served as replaceable separate files under /codecs/. No restriction on replacing or reverse engineering these libraries for debugging modifications.\n`);

await writeFile('public/codecs/LICENSE-RAW-wrapper.txt',`libraw-wasm 1.6.0 declares ISC in its npm package metadata, author ybouane. Upstream does not ship a standalone wrapper LICENSE file. ISC permission terms:
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED AS IS AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`);
for (const name of ['lcms.min.js','lcms.wasm']) await copyFile(`node_modules/lcms-wasm/dist/${name}`,`public/codecs/${name}`);
await copyFile('node_modules/lcms-wasm/LICENSE.md','public/codecs/LICENSE-LCMS-wrapper.txt');
await import('./decoder-sources.mjs');

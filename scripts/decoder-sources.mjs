import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Corresponding source is published beside replaceable LGPL binaries, including native dependencies.
const sources = [
 ['libraw-wrapper','https://codeload.github.com/ybouane/LibRaw-Wasm/tar.gz/32fd36a9883a10c1632bc20073f1ea88cc60487a'],
 ['libraw','https://codeload.github.com/LibRaw/LibRaw/tar.gz/0.22.1'],
 ['littlecms-wrapper','https://codeload.github.com/mattdesl/lcms-wasm/tar.gz/762214c66e907674c8a5538223c624291f5039dd'],
 ['littlecms','https://codeload.github.com/mm2/Little-CMS/tar.gz/lcms2.19.1'],
 ['heif-wrapper','https://codeload.github.com/catdad-experiments/libheif-js/tar.gz/d8ec4bc3bc5bf8055975577bccbbc7e1d7313c2d'],
 ['heif-build','https://codeload.github.com/catdad-experiments/libheif-emscripten/tar.gz/v1.23.5'],
 ['libheif','https://codeload.github.com/strukturag/libheif/tar.gz/413e2a87e6a70b3eccc3a3adc5801179dd2d9e00'],
 ['libde265','https://codeload.github.com/strukturag/libde265/tar.gz/v1.0.15'],
];
await mkdir('public/codecs/sources',{recursive:true});
const manifest=[];
for(const [name,url] of sources) {
 const path=`public/codecs/sources/${name}.tar.gz`;
 let bytes;try{bytes=await readFile(path);}catch{const response=await fetch(url);if(!response.ok)throw new Error(`Source download failed ${url}`);bytes=Buffer.from(await response.arrayBuffer());await writeFile(path,bytes);}
 manifest.push({name,url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile('public/codecs/sources/manifest.json',JSON.stringify(manifest,null,2));

# UnCanva

A local-first image studio with a public landing page and a real layered editor. Built with Next.js App Router, strict TypeScript, React, Tailwind CSS, Lucide, Canvas 2D, IndexedDB, Web Workers and ONNX Runtime Web. No accounts, backend, uploads, paid APIs or analytics.

- `/` — responsive landing page.
- `/editor/` — working local editor.

## Run locally

Use **Node 24 LTS** (Node 22.13+ is also supported). The original machine's Node 23 is outside the current test-tool support range.

```sh
npm ci
npm run assets
npm run dev
```

Open `http://localhost:3000/` or `http://localhost:3000/editor/`. The service worker intentionally registers only in production, so development changes remain visible.

For a production preview with offline support:

```sh
npm run build
npm run serve
```

`npm start` also serves the static build. This preview server serves files only; it does not process images or store projects. Stop an existing server on port 3000 before starting another.

## Self-hosted AI assets and licensing

```sh
npm run assets
```

This installation-time script downloads Apache-2.0 **Xenova/MODNet** fp32 ONNX weights at revision `fa2fa546052fba4c08921230a26cc69a333fca12`, verifies the SHA-256 below, and copies the matching **ONNX Runtime Web 1.30.0** `asyncify` module/WASM pair from the installed package. Generated binary files are ignored by Git and must be obtained before deployment.

- Weights: `public/models/modnet.onnx` (25,888,640 bytes).
- Expected SHA-256: `07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9`.
- Model provenance: `public/models/manifest.json`.
- Model licence: `public/models/LICENSE-MODNet.txt`.
- Runtime: `public/runtime/ort-wasm-simd-threaded.asyncify.{mjs,wasm}`.
- Image codecs: `public/codecs/*.wasm`, copied from the lockfile-pinned Apache-2.0 jSquash packages. MIT-licensed UTIF, gifenc, ag-psd and jsPDF provide other local codecs. Distributed notices are in `public/THIRD_PARTY_NOTICES.txt` and `public/codecs/LICENSES.txt`. The latter includes native libavif/libaom/libwebp/libjxl/Brotli/Highway/skcms notices and the AOM patent grant. [jSquash](https://github.com/jamsinclair/jSquash) uses browser/Web Worker WASM codecs derived from Squoosh.

Primary references: [MODNet upstream and Apache licence](https://github.com/ZHKKKe/MODNet), [ONNX model card](https://huggingface.co/Xenova/modnet), [ONNX Runtime Web deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html), [ONNX Runtime MIT licence](https://github.com/microsoft/onnxruntime/blob/main/LICENSE).

The browser fetches these assets **only from this website's origin**. User image blobs are passed directly to a dedicated local worker and never sent in a network request. Model download progress reflects actual received bytes; inference shows its actual stage rather than a made-up percentage. Cancel terminates the AI worker. WebGPU is attempted first; session creation falls back to WASM/CPU. Aspect-preserving letterboxing feeds a 512 px inference image, and the resulting matte is resampled to the original image dimensions. Original alpha is preserved in final compositing.

**MODNet is a portrait-matting model.** It works best for people; it is not a universal product/object segmentation model and does not guarantee perfect hair or complex edges. Manual erase and restore brushes are provided. AI output is a separate mask; original pixels remain unchanged.

## Editing

- Import multiple images through file selection, drag/drop, or image clipboard paste. PNG alpha is preserved. Import PNG, JPEG/JFIF, WebP, AVIF, GIF, BMP, ICO, SVG, TIFF, PSD, JPEG XL, TGA, PPM and QOI. Browser decoders handle common formats; local worker/WASM decoders handle additional formats. Animated/multipage inputs become a single still frame/page; PSD imports its raster composite. SVG is sanitized and rasterized (scripts, external resources and styles are removed). HEIC/HEIF works only when the browser provides a decoder; unsupported files receive an explicit error. Camera RAW is not supported.
- Images remain independent layers. Add multiline text, rectangles and ellipses; change fill, text, font size, visibility, lock, order, opacity, position, size and rotation.
- Create, name, duplicate, delete and reorder artboards. Use presets, custom dimensions, transparent or solid backgrounds, or crop by dragging a rectangle. Cropping changes the artboard bounds and layer offsets without deleting source pixels.
- Drag layers to move. Resize from any corner, hold Shift for proportions, or use numeric properties. Rotate using the top selection handle. Pan with the hand tool or wheel. Use the zoom controls or Ctrl/Cmd + wheel.
- Erase and restore masks with size, hardness, opacity and feathering. Brush coordinates map through zoom and inverse layer transforms to original image coordinates. Opacity applies per stroke, not per overlapping dab. Paint creates an independently editable color/mask layer.
- Adjust brightness, contrast, saturation, exposure, temperature, tint, highlights, shadows, whites, blacks, grayscale, gamma, vibrance, sharpness, blur, vignette, red/green/blue channel offsets, hue and a five-point master RGB tone curve. Reset any image to default settings.
- Exposure scales linear-light RGB by powers of two; display-space contrast, luma-based saturation/tonal controls, gamma, piecewise-linear curves, sharpening and Canvas Gaussian blur then feed the shared renderer. These are SDR creative controls, not RAW development or ICC-managed color processing.
- Undo/redo covers document edits, transforms, strokes, masks and artboards. History holds at most 60 document states, referencing original/mask assets by ID rather than copying full images. History is session-local; the current document is persistent.

Shortcuts: **V** select, **H** hand, **C** crop, **B** paint, **E** erase, **R** restore, **T** text placement, **S** shape placement, **Z** zoom. Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z redoes; Delete/Backspace deletes unlocked selected layers. Text fields retain their native editing shortcuts.

## Export, local saves and backups

- PNG is lossless with transparency. No ineffective PNG quality slider is shown.
- JPEG uses a white background and actual encoder quality. WebP supports alpha and actual encoder quality where available.
- Additional real encoders: **AVIF, JPEG XL, GIF, TIFF, BMP, ICO, SVG, PSD, TGA, PPM, QOI and PDF**. AVIF and JPEG XL expose actual codec quality. GIF is a single frame with 256 colors and one-bit alpha. TIFF/TGA preserve RGBA; BMP/PPM flatten to white. ICO fits the image into a square up to 256 px. QOI is lossless RGBA with a simple, larger encoding. SVG embeds the rendered PNG rather than editable vector paths. PSD contains the rendered raster composite; use `.uncanva` to preserve editable layers. PDF embeds rendered raster artboards at 96 dpi; all-artboard export produces one multipage PDF with independent page sizes. PDF import is not supported.
- Export the current artboard or all artboards, at 0.5×, 1×, 2× or custom output dimensions. Custom width and height scale independently.
- **Copy PNG** renders the edited artboard and writes an `image/png` clipboard item. It requires a secure context and browser clipboard support/permission. Export PNG is the fallback when unavailable.
- Autosave is debounced by 600 ms and serialised through IndexedDB transactions. Save status reflects successful completion. Quota/open/save failures are surfaced.
- **Canvas → Download project backup** saves a portable `.uncanva` JSON file containing the document and base64 image/mask assets. **Open project backup** restores it. Keep backups: browser storage can be cleared, denied or evicted.
- One active project is automatically restored on this origin. Use backups to keep multiple projects. Concurrent editing of the same project in multiple tabs is not supported.

Raster limits are 1–8192 px per edge, at most 32 megapixels per raster, 50 MB per imported file and 250 MB per backup. PDFs are capped at 64 megapixels across all pages. These are memory safeguards. Many full-size layers, filters and long mask histories can still use substantial memory; smaller artboards/images are preferable on tablets.

## Offline use

The build generates a content-versioned service worker and a manifest of the full static app shell, including worker chunks. The shell is cached when the production editor first opens. Model assets are cached when used; **Canvas → Download AI for offline use** explicitly caches the model and matching runtime before disconnecting. AVIF/JPEG XL WASM assets are cached on first use; use those codecs online once before exporting with them offline. Other image codecs and PDF chunks are included in the cached app shell. Browser Cache Storage and IndexedDB remain on the device.

Offline support requires HTTPS (or localhost) and a browser supporting service workers. Wait for the download to finish before disconnecting. Clearing site data removes both projects and cached models. New releases replace the old shell cache while retaining AI assets; after an update, reload to use the new shell. Do not deploy changed runtime files under the same URL without updating the AI cache version in `offline.ts` and `ai.worker.ts`.

## Static deployment

```sh
npm ci
npm run assets
npm run build
```

Publish the **contents of `out/`** to any static HTTPS host. `out/index.html` is the landing page; `out/editor/index.html` is the editor. Serve directory indexes, `.mjs` as JavaScript and `.wasm` as `application/wasm`. No Next.js server, database, function or secret is needed. Include `sw.js`, `offline-shell.json`, `_next/`, `models/`, `runtime/` and `codecs/`, plus `THIRD_PARTY_NOTICES.txt`.

This build targets a domain root. Deployment under a subdirectory needs coordinated `basePath`, asset URLs, service worker scope and offline manifest changes. Use a root domain or subdomain as configured.

The local preview server demonstrates a same-origin Content Security Policy that disallows remote connections. Adopt equivalent host response headers for production; allow local scripts/Next inline bootstrap, workers, WASM, blob/data images and inline styles. Do not add analytics or external processing services.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/app/page.tsx`, `landing.css` | Responsive marketing page with original CSS/vector illustrations |
| `src/app/editor/page.tsx` | Client editor route |
| `src/components/editor.tsx` | Editing orchestration, import/clipboard, history, canvas gestures, AI and export |
| `src/components/pages-panel.tsx` | Artboards and layers UI |
| `src/components/properties-panel.tsx` | Image/brush/layer/canvas properties, backups and offline downloads |
| `src/components/editor-ui.tsx`, `types.ts` | Shared controls, live thumbnails and tool types |
| `src/lib/document.ts` | Versioned document types, defaults, bounded history and transform math |
| `src/lib/storage.ts` | IndexedDB transactions, asset blobs, portable backups |
| `src/lib/render.ts`, `mask.ts` | Shared preview/export renderer, bounded raster caches and stroke compositing |
| `src/lib/pixels.ts`, `adjust.worker.ts` | Reversible image calculations in a worker |
| `src/lib/formats.ts`, `codecs.ts`, `codec-client.ts`, `codec.worker.ts`, `binary-codecs.ts` | Format definitions, safe import and local image codec workers |
| `src/lib/pdf-export.ts` | Shared artboard rendering and multipage PDF generation |
| `src/lib/ai.worker.ts` | Local ONNX inference, provider fallback and alpha matte |
| `src/lib/offline.ts`, `public/sw.js` | Explicit AI cache and offline request handling |
| `scripts/assets.mjs`, `offline.mjs` | Licensed assets/checksum and versioned static shell generation |
| `scripts/serve.mjs` | Local static production preview only |

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Playwright starts the static preview if port 3000 is free. Tests require a built `out/` with self-hosted assets. Unit tests use fake IndexedDB; browser tests use actual IndexedDB, Canvas, ONNX inference, Clipboard API, downloads and service-worker offline operation. Final executed results are recorded in `CODEX_HANDOFF.md`. Screenshots are written to `test-results/`.

## Practical boundaries

This is an SDR raster editor, not a replacement for every Photoshop/Canva feature. There is no camera RAW decoder, editable PSD interchange, universal HEIC decoder, PDF import, CMYK/ICC pipeline, blend-mode library, vector path editor, font library, batch queue, multi-project gallery or real-time collaboration. Preview/export share the same processing code. Browser encoders, color handling, font rasterisation and clipboard permissions still differ by browser. Full-resolution filter and mask processing can be expensive even with worker adjustments and bounded caches; no universal frame-rate or memory guarantee is claimed. Browser verification is reported for the actual tested engine/device, not as blanket cross-browser certification.

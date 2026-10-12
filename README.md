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

The build-time script fetches pinned, permissively licensed ONNX weights, verifies SHA-256 checksums, and copies **ONNX Runtime Web 1.30.0** plus local WASM image codecs from the lockfile-pinned packages. Generated binary files are ignored by Git; Vercel runs this script automatically during its build.

| Mode | Model | Download | Licence | Use |
| --- | --- | --- | --- | --- |
| General subjects · fast | U2NetP | 4.6 MB | Apache-2.0 | People, products, animals and salient objects; modest edge detail |
| Portraits · fine hair | MODNet | 25.9 MB | Apache-2.0 | People and soft portrait boundaries |
| General subjects · detailed | BiRefNet Lite 512 fp32 | 191.9 MB | MIT | More detailed object boundaries; greater memory/processing cost |

Detailed general mode is the default for quality; an explicitly chosen mode is remembered on this device. Only the selected model downloads to the browser when requested. BiRefNet is served as eight parts of at most 24 MiB; the worker joins the parts locally. Its complete ONNX file is not published as a single large static asset. Descriptors are in `src/lib/ai-models.ts`; exact revisions, source URLs, bytes and checksums are in `public/models/{manifest,U2NetP-manifest,BiRefNet-manifest}.json`. Model licences are distributed beside the weights. Runtime assets are `public/runtime/ort-wasm-simd-threaded.asyncify.{mjs,wasm}`. Codec licences, native codec notices and the AOM patent grant are in `public/THIRD_PARTY_NOTICES.txt` and `public/codecs/LICENSES.txt`.

Primary references: [U2Net and Apache licence](https://github.com/xuebinqin/U-2-Net), [MODNet upstream](https://github.com/ZHKKKe/MODNet), [MODNet conversion](https://huggingface.co/Xenova/modnet), [BiRefNet MIT licence](https://github.com/ZhengPeng7/BiRefNet/blob/main/LICENSE), [BiRefNet Lite conversion](https://huggingface.co/studioludens/birefnet-lite-512), [ONNX Runtime deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html), [jSquash browser codecs](https://github.com/jamsinclair/jSquash).

Assets are fetched **only from this website's origin**. User image bytes go directly to a local worker and never enter a network request. Download progress reflects actual received bytes; inference displays its stage without a fabricated percentage. Cancel terminates the worker. WebGPU is attempted first; session creation **or inference** failure retries WASM/CPU. No GPU, extension or experimental browser flag is required. Portrait preprocessing uses aspect-preserving letterboxing; general models use their trained square/ImageNet preprocessing. Mattes are resampled to original dimensions and preserve original alpha when composited.

These models cannot promise perfect results for every image. Manual erase/restore tools refine the non-destructive mask while original pixels remain unchanged. Detailed mode uses substantially more memory; use fast mode if a device cannot load it. Empty, solid or invalid model outputs are rejected, preserving the previous mask. This safeguard does not detect every poor cutout: complex graphics can still need a selected input area or manual edge correction.

## Editing

- Import multiple images through file selection, drag/drop, or image clipboard paste. PNG alpha is preserved. Import PNG, JPEG/JFIF, WebP, AVIF, GIF, BMP, ICO, SVG, TIFF, PSD, JPEG XL, TGA, PPM and QOI. Browser decoders handle common formats; local worker/WASM decoders handle additional formats. Animated/multipage inputs become a single still frame/page; PDF imports each page as a raster layer/artboard (up to 50 pages, locally rendered at up to 2x scale). PSD imports separate pixel layers and masks when readable; unsupported text/effects/blends are rasterized with a notice. UnCanva-authored PSD/SVG include local editable project metadata for lossless UnCanva round trips. SVG imports a safe basic subset (rectangles, ellipses, paths and text), while unsupported filters, gradients and transforms fall back to sanitized raster content. HEIC/HEIF uses a self-hosted LGPL codec. Common camera RAW files (DNG, CR2/CR3, NEF, ARW, RAF, ORF, RW2, PEF and others) use a self-hosted LibRaw WASM decoder and open at half size by default for memory safety; camera white balance, automatic white balance, exposure, denoising and full resolution are adjustable. The original RAW is retained in the local project so you can redevelop without reimporting. Some proprietary/new camera compression variants may not decode.
- Images remain independent layers. Add multiline text, rectangles and ellipses; change fill, text, font size, visibility, lock, order, opacity, position, size and rotation.
- Create, name, duplicate, delete and reorder artboards. Use presets, custom dimensions, transparent or solid backgrounds, or crop by dragging a rectangle. Cropping changes the artboard bounds and layer offsets without deleting source pixels.
- Drag layers to move. Resize from any corner, hold Shift for proportions, or use numeric properties. Rotate using the top selection handle. Pan with the hand tool or wheel. Use the zoom controls or Ctrl/Cmd + wheel.
- **Area selection (A)** draws a rectangle on an image layer. Use **Erase selected area**, **Keep only selected area** or **Restore selected area**; Delete/Backspace erases an active selection, and Escape clears it. Original pixels remain unchanged. Selections use layer-local coordinates, including rotation/resizing, and the resulting mask survives exports, backups and reload. Use **Select image area** in Adjust to limit AI to a subject within a screenshot/collage; pixels outside that area become transparent. **Use whole image** clears the area restriction. This is a rectangular selection, not a lasso or semantic object selector.
- Erase and restore masks with size, hardness, opacity and feathering. Brush coordinates map through zoom and inverse layer transforms to original image coordinates. Opacity applies per stroke, not per overlapping dab. Paint creates an independently editable color/mask layer.
- Adjust brightness, contrast, saturation, exposure, temperature, tint, highlights, shadows, whites, blacks, grayscale, gamma, vibrance, sharpness, blur, vignette, red/green/blue channel offsets, hue, six-band HSL and five-point master/red/green/blue tone curves. Reset any image to default settings.
- Exposure scales linear-light RGB by powers of two; display-space contrast, luma-based saturation/tonal controls, gamma, piecewise-linear curves, sharpening and Gaussian blur (native Canvas where supported, premultiplied three-box approximation in the worker otherwise) then feed the shared renderer. These are SDR creative controls, not RAW development or ICC-managed color processing.
- Undo/redo covers document edits, transforms, strokes, masks and artboards. History holds at most 60 document states, referencing original/mask assets by ID rather than copying full images. History is session-local; the current document is persistent.

Shortcuts: **V** select, **H** hand, **C** crop, **A** area selection, **B** paint, **E** erase, **R** restore, **T** text placement, **S** shape placement, **Z** zoom. Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z redoes; Delete/Backspace erases an active image-area selection, otherwise it deletes an unlocked selected layer. Escape clears an image-area selection. Text fields retain their native editing shortcuts.

## Export, local saves and backups

- PNG is lossless with transparency. No ineffective PNG quality slider is shown.
- JPEG uses a white background and actual encoder quality. WebP supports alpha and actual encoder quality, with a local WASM encoder fallback when the browser cannot encode it.
- Additional real encoders: **AVIF, JPEG XL, GIF, TIFF, BMP, ICO, SVG, layered PSD, TGA, PPM, QOI and PDF**. AVIF and JPEG XL expose actual codec quality. GIF is a single frame with 256 colors and one-bit alpha. TIFF/TGA preserve RGBA; BMP/PPM flatten to white. ICO fits the image into a square up to 256 px. QOI is lossless RGBA with a simple, larger encoding. SVG preserves editable basic geometry, text, and paths while embedding image layers as PNG. PSD exports separate pixel layers and editable text, with metadata for exact UnCanva round trips; use `.uncanva` for the primary full-fidelity archive. PDF embeds rendered raster artboards at 96 dpi; all-artboard export produces one multipage PDF with independent page sizes. PDF import creates raster artboards locally. CMYK/ICC tools provide colorimetric transform, preview, and 8-bit profiled CMYK TIFF export; specialized prepress remains unsupported.
- Export the current artboard or all artboards, at 0.5×, 1×, 2× or custom output dimensions. Custom width and height scale independently.
- **Copy PNG** renders the edited artboard and writes an `image/png` clipboard item. It requires a secure context and browser clipboard support/permission. Export PNG is the fallback when unavailable.
- Autosave is debounced by 600 ms and serialised through IndexedDB transactions. Save status reflects successful completion. Quota/open/save failures are surfaced.
- **Canvas → Download project backup** saves a portable `.uncanva` JSON file containing the document and base64 image/mask assets. **Open project backup** restores it. Keep backups: browser storage can be cleared, denied or evicted.
- **Projects** opens the local project gallery: create, open and delete independent projects. The active project restores on reload. Where Web Locks is supported, a second editor tab becomes read-only to prevent competing saves. Close the editing tab and reload the other to take over. Browsers without Web Locks should use one editor tab. **Canvas → Remove unused local assets** explicitly reclaims unreferenced images while protecting every saved project and the live undo/redo history. Assets are stored as byte buffers plus MIME, with backward compatibility for older Blob records.

Raster limits are 1–8192 px per edge, at most 32 megapixels per raster, 50 MB per imported file and 250 MB per backup. PDFs are capped at 64 megapixels across all pages. These are memory safeguards. Many full-size layers, filters and long mask histories can still use substantial memory; smaller artboards/images are preferable on tablets.

## Offline use

The build generates a content-versioned service worker and a manifest of the full static app shell, including worker chunks. The shell is cached when the production editor first opens. Model assets are cached when used; **Canvas → Download AI for offline use** explicitly caches the currently selected model and matching runtime before disconnecting. AVIF/JPEG XL/WebP fallback WASM assets are cached on first use; use those codecs online once before exporting with them offline. Other image codecs and PDF chunks are included in the cached app shell. Browser Cache Storage and IndexedDB remain on the device.

Offline support requires HTTPS (or localhost) and a browser supporting service workers. Wait for the download to finish before disconnecting. Clearing site data removes both projects and cached models. Online navigation checks for current HTML; offline navigation falls back to the cached shell. A **Save and update** notice appears when a newer worker takes control, and saves the current project before reloading. One previous shell is retained for already-open tabs until a subsequent release. Model/runtime assets share a dedicated cache with the AI worker, avoiding duplicate large models in shell caches. Cache-write failures do not prevent online asset loading. Older editor versions without the notice may need another reload after the new worker installs. Do not deploy changed runtime files under the same URL without updating the AI cache version in `offline.ts` and `ai-models.ts`.

## Static deployment

```sh
npm ci
npm run assets
npm run build
```

Publish the **contents of `out/`** to any static HTTPS host. `out/index.html` is the landing page; `out/editor/index.html` is the editor. Serve directory indexes, `.mjs` as JavaScript and `.wasm` as `application/wasm`. No Next.js server, database, function or secret is needed. Include `sw.js`, `offline-shell.json`, `_next/`, `models/`, `runtime/` and `codecs/`, plus `THIRD_PARTY_NOTICES.txt`.

This build targets a domain root. Deployment under a subdirectory needs coordinated `basePath`, asset URLs, service worker scope and offline manifest changes. Use a root domain or subdomain as configured.

The local preview server demonstrates a same-origin Content Security Policy that disallows remote connections. Adopt equivalent host response headers for production; allow local scripts/Next inline bootstrap, workers, WASM, blob/data images and inline styles. Do not add analytics or external processing services.

## Vercel deployment

Import this Git repository into Vercel. Use **Node 24** in Project Settings. The checked-in `vercel.json` selects a static deployment, runs `npm ci`, then `npm run assets && npm run build`, and publishes `out/`. If the dashboard asks for a framework preset, use **Other** and retain the repository build/output settings. No environment variables, API keys, server functions or image processing backend are required.

The configuration includes same-origin CSP, WASM/module content types, a non-cached service worker and root scope. Model downloads happen during the build; the resulting files are self-hosted on your deployment. Build failures from unavailable model mirrors or mismatched checksums stop deployment rather than silently selecting different weights. Commit the source/manifests, not generated model binaries. `npm run verify:release` validates static routes, model checksums and parts, runtime/codecs, licences and required headers before publishing. Public Vercel hosting has not been exercised from this workspace; verify the deployed `/editor/`, a model download and offline reload on the actual HTTPS URL after your first deployment.

## Device settings and performance

The editor works with CPU processing and ordinary browser settings. A non-blocking first-use suggestion and the **Device setup** button report actual WebGPU availability, storage persistence and quota. Users can request persistent local storage with a click; the browser may decline, in which case `.uncanva` backups remain available. When GPU acceleration is unavailable, the dialog suggests updating the browser/driver and optionally enabling Chrome/Edge **Settings → System → hardware acceleration**, then restarting. It never asks users to enable experimental flags. Low-memory devices receive smaller-image/fast-model guidance. Clipboard access is requested only when copying; denied access produces an export fallback.

Previews use at most 2048 px per edge (1024 on browsers reporting 4 GB or less), with smaller thumbnails, bounded raster caches and coalesced adjustment previews. Exports render at the requested full resolution. Brush coordinates remain in original image space; preview strokes are scaled when rendered. Pixel adjustments, codecs and AI execute in workers. A downsampled preview and approximate blur can differ slightly from full-resolution edges; export uses the same adjustment definitions and full source pixels. Large detailed AI models/full-resolution filters still consume memory and time; no universal frame-rate guarantee is claimed.

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
| `src/lib/storage.ts`, `project-gallery.tsx`, `use-editor-lock.ts` | IndexedDB migration, projects, asset byte buffers, cleanup, backups and tab protection |
| `src/lib/render.ts`, `mask.ts` | Shared preview/export renderer, bounded raster caches and stroke compositing |
| `src/lib/pixels.ts`, `adjust.worker.ts` | Reversible image calculations in a worker |
| `src/lib/formats.ts`, `codecs.ts`, `codec-client.ts`, `codec.worker.ts`, `binary-codecs.ts` | Format definitions, safe import and local image codec workers |
| `src/lib/interchange.ts` | Editable SVG and layered PSD import/export |
| `src/lib/advanced-import.ts` | PDF and local camera RAW import |
| `src/lib/color.worker.ts` | ICC color conversion and CMYK soft proof |
| `src/lib/pdf-export.ts` | Shared artboard rendering and multipage PDF generation |
| `src/lib/ai.worker.ts`, `ai-models.ts`, `ai-math.ts`, `ai-region.ts` | Three local ONNX models, provider fallback, validated alpha mattes and original-coordinate input areas |
| `src/lib/hsl.ts`, `blur.ts`, `device.ts`, `device-setup.tsx` | Colour math, blur fallback, bounded previews and browser capability guidance |
| `src/lib/offline.ts`, `public/sw.js` | Explicit AI cache and offline request handling |
| `scripts/assets.mjs`, `offline.mjs` | Licensed assets/checksum and versioned static shell generation |
| `scripts/serve.mjs` | Local static production preview only |

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
npm audit
npm run verify:release
```

Playwright starts the static preview if port 3000 is free. Tests require a built `out/` with self-hosted assets. Unit tests use fake IndexedDB; browser tests use actual IndexedDB, Canvas, ONNX inference, Clipboard API, downloads and service-worker offline operation. Executed results are recorded in `CODEX_HANDOFF.md`. On this Mac, Chromium and WebKit workflows pass; actual Apple Metal WebGPU and CPU inference were exercised. Firefox binaries failed at browser startup, before loading the app. To reproduce the verified subset on this affected host use `SKIP_FIREFOX_QA=1 npm run test:e2e`; this explicitly reports Firefox as skipped, not passed. Keep the default full command on a host where Firefox starts. Screenshots are written to `test-results/`.

## Practical boundaries

The working canvas uses sRGB SDR pixels. Local ICC tools can reinterpret untagged RGB sources, preview a CMYK printer proof, and export a profiled, flattened 8-bit CMYK TIFF. This is not a complete print prepress pipeline: no 16-bit/spot-color output, soft-proof gamut warnings, tagged-SVG conversion or universal embedded-profile handling. Editable paths support common SVG path commands; SVG fills, images and simple geometry import, while CSS, gradients, filters, clip paths, strokes and arbitrary group transforms rasterize. External PSD masks/effects/blending and font appearance vary; native PSD authoring is not identical to Photoshop, and the .uncanva backup remains the full-fidelity archive. Preview/export share the same processing code. Browser encoders, color handling, font rasterisation and clipboard permissions still differ by browser. Full-resolution filter and mask processing can be expensive even with worker adjustments and bounded caches; no universal frame-rate or memory guarantee is claimed. Browser verification is reported for the actual tested engine/device, not as blanket cross-browser certification.

# UnCanva implementation ledger

## Local-first editor — /root
- Updated: 2026-10-08 16:59:41 Asia/Kolkata
- Status: COMPLETE
- Objective: Build and verify a static Next.js layered local image editor, local AI, masks, adjustments, persistence, exports and offline operation.
- Inspection: Repository contains only .git, no commits, application, dependencies or applicable AGENTS.md. User global instructions apply. Memory search had no relevant matches.
- Completed: Implemented and verified the layered editor, responsive landing, local MODNet inference/masking, adjustments, history, IndexedDB/backups, 15 export options including multipage PDF, and offline shell/model/codec support. See final evidence below.
- Changed: This ledger.
- Evidence: node v23.11.0; npm 11.6.2; git status clean before creation.
- Blockers: None yet. Production readiness requires real browser and AI evidence.
- Next: No required implementation step remains in the delivered feasible scope. For future work, start with the limitations below and preserve current verified behavior.

### Foundation milestone
- Updated: 2026-10-08 Asia/Kolkata; IN_PROGRESS.
- Added package/build/strict TypeScript/lint configuration; document.ts, storage.ts, pixels.ts, adjust.worker.ts, render.ts.
- Implemented reference-based bounded history, layered transforms, alpha masks with restore strokes, shared preview/export rendering, worker adjustments, IndexedDB and portable backups.
- Installation running; no verification claim yet. Next: AI asset setup/worker and editor UI, then typecheck/build/tests.

### Editor and AI milestone
- Updated: 2026-10-08 Asia/Kolkata; IN_PROGRESS.
- Added editor.tsx, global UI styles, Next app shell, model download script, AI worker, service worker, static preview server, unit/storage tests and Playwright workflows.
- Model downloaded: 25,888,640-byte MODNet fp32, pinned fa2fa546052fba4c08921230a26cc69a333fca12. Assets self-hosted in public/models and public/runtime, ignored generated binaries; manifest and Apache licence retained.
- First TypeScript check passed. Initial lint identified logo anchor issue (fixed). Initial npm audit found advisories; package upgrades running before production verification.
- Next: finish dependency upgrades, run typecheck/lint/unit/build, browser workflows including real inference and offline. Investigate any failures before claiming working.

### First verification results
- Updated: 2026-10-08 16:32 Asia/Kolkata; IN_PROGRESS.
- Static Next 16.4 production build PASS; strict typecheck PASS; 11 unit/storage tests PASS after fixing identity tone-curve interpolation.
- Removed advisory-bearing lint preset dependency; explicit TypeScript/React-hooks lint configuration. npm audit: zero vulnerabilities (all dependencies).
- Browser visual inspected via Codex IAB. Playwright Chromium installed. First E2E failures traced to invalid test PNG and paste dispatched before application hydration; fixtures/readiness corrected, rerun active.
- Current static preview: npm run serve, localhost:3000. Generated output out/.
- Next: inspect rerun, verify actual inference/output alpha/mask undo/persistence/exports/offline, strengthen pixel evidence; improve processing cache and transform controls.

### Added user scope: landing page
- Updated: 2026-10-08 16:35 Asia/Kolkata; IN_PROGRESS.
- User requested landing page as well. Implemented marketing homepage at / with original CSS/vector artwork, product explanation, privacy/offline caveats and working editor CTAs. Editor moved to /editor. Updated static server and offline routes; browser tests target /editor.
- Changed src/app/page.tsx, landing.css, src/app/editor/page.tsx, public/sw.js, scripts/serve.mjs, tests/e2e/editor.spec.ts.
- Next: rebuild static site and verify landing desktop/tablet/mobile plus ongoing editor workflows.

### Browser verification and hardening milestone
- Updated: 2026-10-08 16:38 Asia/Kolkata; IN_PROGRESS.
- All 3 Playwright workflows PASS (12.8s): import/edit/layers/history/reload/PNG-JPEG-WebP/copy/backup; actual ONNX inference/mask stroke/offline reload; landing desktop/tablet/mobile and real editor CTA.
- Screenshots: test-results/landing-desktop.png, landing-tablet.png, landing-mobile.png, editor-desktop.png, editor-offline.png. Desktop/mobile landing pixels inspected.
- Fixed static preview handling of Next route directories containing RSC files; export test uses accessible combobox role; clipboard fixture dispatches on document body.
- Current hardening edits (require rebuild/retest): all four anchored rotated resize handles; higher text contrast; shell manifest precaching and build-based SW cache revision; model cache with actual byte progress/checksum and aspect-preserving preprocessing.
- Next: pixel-level mask/export assertions, cache optimisation, UI module extraction, final build/type/lint/tests/docs.

### Pixel evidence milestone
- Updated: 2026-10-08 16:43 Asia/Kolkata; IN_PROGRESS.
- 5 E2E tests PASS (15.6s) including exact original/restored RGBA, 150% zoom at 2x DPR, mask undo/redo, actual clipboard PNG alpha, decoded PNG/JPEG/WebP dimensions and transparency, portable backup import/reload, moves/rotation/crop and paint controls.
- Unit/storage tests now 13 PASS; strict typecheck/lint and static build PASS before the latest paint transaction change.
- Hardened brush opacity per stroke, non-uniform image scale mask aspect, decoded/processed canvas cache budgets, linear-light exposure, falsey history states, and generated offline shell precaching.
- Latest edit: paint stroke creation is now one undo transaction and retains points during asynchronous asset creation; requires final verification.
- Next: final supported Node 24 checks, browser real clipboard paste, offline AI rerun/cache evidence, README and final durable status.

### Expanded format scope requested
- Updated: 2026-10-08 16:52 Asia/Kolkata; IN_PROGRESS.
- User requested broad image import/export and PDF. Implementing local codec workers for TIFF, GIF, BMP, ICO, SVG raster wrapper, AVIF, JPEG XL, PSD raster composite, TGA, PPM, QOI and selected/all-artboard PDF.
- Added MIT/Apache dependencies: utif, gifenc, jspdf, ag-psd, @jsquash/avif and @jsquash/jxl; audit remains zero. HEIC/RAW cannot be universally promised; native decoding will be attempted with explicit fallback errors.
- PDF skill read; required artifact-start marker succeeded once. Will render exported sample PDF using bundled Poppler and inspect pages.
- Last full browser verification before format scope: 6 tests PASS (12.3s), including real browser clipboard paste, offline second AI inference; confirmed backend WASM/CPU. WebGPU implemented but not verified on physical GPU.
- Next: codec implementation, export modal format descriptions, format round trips and PDF page verification, then final full checks/docs.

### Codec implementation milestone
- Updated: 2026-10-08 16:55 Asia/Kolkata; IN_PROGRESS.
- Added formats.ts, binary-codecs.ts, codec-client.ts, codecs.ts, codec.worker.ts and pdf-export.ts. Fifteen export options, fourteen image round-trip import paths, sanitized SVG import, native HEIC attempt and local multipage PDF.
- Expanded assets/notices generation and service-worker codec caching. Single-thread WASM codec factories avoid unnecessary cross-origin isolation and webpack worker warnings. Separated PDF rendering from codec imports to remove circular chunks.
- Node 24 strict typecheck/lint PASS, 21 unit/storage/codec tests PASS, warning-free production build PASS (63 shell assets).
- Current operation: Playwright formats.spec.ts export signatures/round-trip dimensions and two-page PDF. Next: fix any format failures, render PDF pages and inspect, update README, rerun complete browser suite and audit.

### Expanded formats verified
- Updated: 2026-10-08 16:57 Asia/Kolkata; IN_PROGRESS.
- Browser round trips PASS for PNG/JPEG/WebP/AVIF/JXL/GIF/TIFF/BMP/ICO/SVG/PSD/TGA/PPM/QOI; alpha assertions pass where supported. Actual quality file-size differences verified for JPEG/WebP/AVIF/JXL. Offline PDF and AVIF/JXL export PASS.
- PDF output/pdf/format-sample.pdf: two pages, 90x60 and 60x75 pt; pypdf assertions and pdfinfo PASS. Rendered with bundled Poppler to tmp/pdfs/format-page-{1,2}.png; both inspected, correct gradient/transparency and rectangle/page layout.
- README updated with exact codec capabilities and limitations. Landing now mentions SVG/PDF exports.
- npm ls identified extraneous optional WASM sharp packages left by incremental installs (not app runtime failures). Next: npm ci from lockfile to verify reproducible installation; broaden licence notices, final build/full tests/audit.

### Final regression running
- Updated: 2026-10-08 17:00 Asia/Kolkata; IN_PROGRESS.
- npm ci PASS (272 installed, zero vulnerabilities). npm ls --depth=0 succeeds; npm reports two extraneous optional native sharp/WASI packages despite clean install/prune. These build-only packages are not used by static browser rendering; no dependency missing in runtime bundle. Full-depth npm ls flags the optional sharp-WASM runtime metadata. Do not mistake this for app processing on a server.
- Added scripts/codec-notices.mjs and public/codecs/LICENSES.txt with permissive upstream native codec licences and AOM patent grant; broadened JavaScript notices. Asset script includes them and copies only required single-thread codec WASM names.
- Hardened malformed PPM/QOI validation; additional unit test. Final pipeline active: npm run assets && npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e && npm audit, supported Node 24.
- Next: inspect results; fix regressions if any, verify current UI screenshots, refresh final ledger and deliver commands/limits.

### Final delivered status
- Updated: 2026-10-08 16:59:41 Asia/Kolkata; COMPLETE (implemented feasible scope; practical boundaries explicit).
- Routes: / landing; /editor/ local editor. Static preview continues at http://localhost:3000 via scripts/serve.mjs (files only). Production artifact out/ about 66 MB including self-hosted model/runtime/codecs.
- Final commands PASS under bundled Node 24: npm ci; npm run assets; npm run typecheck; npm run lint; npm test (22 tests); npm run build; npm run test:e2e (7 tests, 23.5s); npm audit (0 vulnerabilities). Build re-run after removing only three unused generated multithread codec WASMs; PASS, 63 shell assets, b3937588b822e426. No application source changed after the passing full browser suite.
- Browser evidence: Chromium on this Mac. Real Clipboard API paste/copy; alpha pixel assertions and zoom/DPR2 mask restore/undo; adjustments/blur and transformations; independent artboards/layers, crop/paint; IndexedDB reload and portable backup restore; all 14 image encoder/import round trips; quality differences for four lossy codecs; two-page PDF; local AI WASM/CPU online and offline; offline PDF/AVIF/JXL; no outbound image/content requests; landing desktop/tablet/mobile and CTAs.
- Screenshots inspected: test-results/landing-desktop.png, landing-mobile.png, editor-desktop.png. PDF output/pdf/format-sample.pdf inspected via Poppler tmp/pdfs/format-page-{1,2}.png; pypdf verifies two independent page sizes. Generated test evidence is ignored by Git.
- Important files: src/components/editor.tsx, pages-panel.tsx, properties-panel.tsx; src/lib/document.ts, storage.ts, render.ts, mask.ts, pixels.ts, adjust.worker.ts, ai.worker.ts, formats.ts, codecs.ts, codec-client.ts, codec.worker.ts, binary-codecs.ts, pdf-export.ts, offline.ts; src/app/page.tsx and landing.css; public/sw.js; scripts/assets.mjs, codec-notices.mjs, notices.mjs, offline.mjs, serve.mjs; README.md; tests/.
- Genuine limits: MODNet targets portraits, not universal objects; WebGPU fallback implemented but actual tested inference was WASM/CPU; HEIC/HEIF requires a browser decoder, camera RAW and PDF import absent; GIF/multipage inputs import one still image; PSD is raster-composite interchange, SVG export embeds raster; no CMYK/ICC/RAW workflow or editable vector paths; master RGB curve/channel offsets rather than separate per-channel spline editors; one active local project/no multi-tab conflict resolution; full-resolution processing can be expensive; browser verification covers Chromium, not cross-browser/hardware certification. Other optional npm native sharp/WASI metadata observation remains build-only as recorded above.
- Next action for a future task: Read README.md and this ledger, inspect git status; npm ci && npm run assets && npm run build before testing. No remote deployment or git commit was requested or performed. All project source is currently untracked because repository initially had no commits.

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

## Remaining work continuation — /root
- Updated: 2026-10-09 Asia/Kolkata; IN_PROGRESS.
- Objective: Address remaining general-subject AI, cross-engine compatibility, large-image evidence, richer color controls, project gallery/storage hygiene, accessibility and release preparation. Preserve current tested local-only architecture.
- Reconciled: Worktree now clean and prior implementation is committed by intervening work. Historical untracked status above is stale. Prior 22 unit/7 Chromium checks are recorded evidence, not yet rerun today.
- Completed: Read handoff, package/document/AI/storage UI architecture. No applicable parent AGENTS.md or relevant memory hits. Researching permissively licensed browser-ready general segmentation models (BiRefNet MIT and U2Net Apache-2.0).
- Blockers: Native Safari/physical GPU and public host credentials are not yet established. No remote publication will be claimed without real host verification.
- Next: Implement model selection and pinned self-hosted general model assets, validate actual inference, then storage/adjustments/accessibility and cross-engine/performance tests.

### General AI, storage and Vercel implementation
- Updated: 2026-10-09 11:10 Asia/Kolkata; IN_PROGRESS.
- User clarified Vercel deployment, optimisation across computers and prompts for helpful browser settings. Added vercel.json for pure static out/ deployment, same-origin CSP and WASM/module headers. No publication yet.
- Added selectable U2NetP (4.6 MB), MODNet portrait and BiRefNet Lite 512 fp32 (191.9 MB) workers; actual WebGPU run failures now retry CPU. Pinned models verified against HF LFS SHA-256 (CDN Xet ETags differ). BiRefNet split into eight <=24 MB static parts, lazy loaded only for detailed mode. Licence/provenance manifests included.
- Implemented IndexedDB v2 multi-project migration/gallery, atomic active project save, explicit orphan asset cleanup protecting persisted projects/live history, and Web Locks editing protection. Bounded canvas preview/thumbnail size while exports retain full resolution.
- Installed Playwright Firefox and WebKit. Verification pipeline active; no inference/cross-engine success claimed yet for new code.
- Next: resolve pipeline findings, implement device setup/persistent storage prompt, real-photo/general inference and cross-engine workflows; colour controls and memory/performance evidence; final Vercel docs/checks.

### Device setup, colour and performance milestone
- Updated: 2026-10-09 11:20 Asia/Kolkata; IN_PROGRESS.
- Added non-blocking device capability prompt and Device setup dialog: actual WebGPU adapter availability, persistent-storage request on user gesture, usage/quota, optional hardware acceleration guidance and low-memory advice. No experimental browser flags or GPU requirement.
- Added master/per-channel curves and six-band HSL with old-project migration; bounded preview source raster processing, scaled stroke coordinates, native Canvas blur plus O(pixels) premultiplied Gaussian approximation fallback in worker.
- Added focus-visible styles, modal focus/Tab trapping/Escape restore, toolbar pressed states. Added 7 meaningful storage/migration/HSL/AI-math/blur/preview unit tests and new real-photo/cross-engine/project-lock/performance E2E workflows. CC0/public-domain fixtures from scikit-image carry attribution in tests/fixtures/LICENSES.md.
- Earlier new fast-model Chromium suite: 7 PASS (18.7s). Current new pipeline initially caught unused preview parameter and Chromium import; fixed. New unit/build/E2E pipeline running. No detailed-model/physical-GPU/Firefox/WebKit claims yet.
- Next: inspect results, visually review masks and failure cases, fix cross-engine differences, finish docs/Vercel validation.
- New test finding: inference completion toast preceded asynchronous canvas mask rendering, so immediate pixel assertions sampled the prior mask. AI completion now waits for prepared preview and a paint frame; tests poll actual matte. Gallery test also needed the Layer tab before adding a rectangle. Fixes require rebuild/retest; current cross-engine run continues independently.
- First new run: 29 unit tests PASS; 12 MP bounded preview/full-resolution PNG PASS (about 1.4s import/adjust/save, 3.0s including export on this Mac). Headed Chromium general AI actually used WebGPU without added flags; adapter info serialization was empty and is being corrected before claiming physical hardware identity.
- Real-photo masks require paint synchronization (fixed). Cross-engine harness found Firefox cannot use temporary profile path on this machine, and WebKit rejects inherited clipboard-write permission. Retrying Firefox with a repository-local persistent profile and explicit empty permission sets. Gallery test corrected to open Layer tab. New rerun active.

### Actual general model and hardware evidence
- Updated: 2026-10-09 11:27 Asia/Kolkata; IN_PROGRESS.
- Corrected test locator scope: getByText regex could match old success toast plus a later busy-stage model label in an ancestor, prematurely ending inference tests. Scoped .toast checks now wait for the specific finished model.
- Direct actual mask inspection: U2NetP coffee clear/opaque/soft = 123461/111964/4575; BiRefNet = 125052/112570/2378 over 240000 pixels, distinct saved mask IDs and matching displayed pixels. No fake model output.
- Headed Chromium adapter info: vendor apple, architecture metal-3. Actual U2NetP inference backend WebGPU without additional experimental flags. This establishes this Mac hardware path, not universal GPU support.
- Project gallery, cleanup, read-only second tab and 12 MP full export PASS. WebKit import exposed IndexedDB Blob transaction failure; changed asset records to ArrayBuffer plus MIME with backward Blob compatibility. Adding native-WebP fallback worker encoder next.
- Firefox 157 Playwright binary fails with profile-folder error even outside Playwright using an existing /tmp profile. Installing an older official Playwright Firefox for independent compatibility evidence; no app change is being made to conceal this environment issue.
- Next: complete WebKit/Firefox and actual detail/portrait reruns; inspect mask visuals; add final Vercel/documentation validation and full regression.

### Safari compatibility and real-photo verification
- Updated: 2026-10-09 11:58 Asia/Kolkata; IN_PROGRESS.
- Latest lint, 29 unit tests and production build PASS. Real-photo U2NetP/BiRefNet and MODNet portrait workflow PASS (11.3s); inspected coffee detailed screenshot with clean cup/saucer boundaries. Safari-engine import, adjustments, mask, PNG/JPEG/WebP/AVIF/JXL/PDF exports and reload progressed successfully; final AI step waited on unselected restored layer. Corrected test to select restored image before AI; rerun required.
- WebKit IndexedDB ArrayBuffer asset storage works; native WebP fallback uses local jSquash codec. All old Blob records remain readable.
- Both Firefox 157 and matched older Firefox 141 runtimes fail before opening app on this Mac (profile startup/sandbox graphics errors). This is a test-environment blocker, not certified Firefox behavior.
- Next: Safari AI rerun, final full checks, fresh Vercel/readme release documentation and artifact validation.
- Added 75 ms adjustment preview coalescing and 100 ms thumbnail coalescing, retaining immediate transform/brush rendering. Typecheck/lint/29 unit/build PASS after edits. Release validator checks model checksums, static routes, runtime/codec files and headers. Corrected its chunk ceiling from decimal 24 MB to actual 24 MiB (25,165,824 bytes); full regression next.
- WebKit complete import/filter/mask/six-format export/reload/local AI workflow PASS (5.3s). README now documents three-model assets, multi-project storage, Vercel setup, device suggestions, performance tradeoffs and exact unsupported formats. Firefox startup remains explicitly blocked; affected-host regression uses SKIP_FIREFOX_QA=1 and reports skip.

### Verified regression and release artifact
- Updated: 2026-10-09 12:03 Asia/Kolkata; IN_PROGRESS.
- Static artifact validator PASS (routes, checksum-verified three-model assets, <=24 MiB detail parts, self-hosted runtime/codecs/licences and Vercel headers). Full existing/new suite: 12 PASS, 1 explicit Firefox startup-blocked skip (51.3s); separate tablet/dialog focus/Escape test PASS. Zero audit vulnerabilities.
- New bounded/coalesced preview: 12 MP 4096x3072 import/adjust/save 1297 ms and full PNG export total 2595 ms on this Mac. Actual hardware adapter apple/metal-3 and WebGPU AI PASS; real-photo detailed and portrait modes PASS; WebKit six format exports, mask/filter/reload/CPU AI PASS.
- Final step: clean npm ci/assets/typecheck/lint/unit/build/release and unified 14-test suite, then inspect final desktop/tablet/photo screenshots and refresh completion scope. Firefox, RAW/universal HEIC/PDF import, external Vercel deployment and universal hardware certification remain honest boundaries.
- Tablet screenshot review identified initially clipped imported image at 820 px width; adjusted import zoom to available workspace bounds and reset pan. Added actual canvas/workspace geometry assertion to tablet workflow. A final rebuild/regression after this small edit is required; current clean-install suite is checking the prior build.

### Final continuation delivery
- Updated: 2026-10-09 12:05:34 Asia/Kolkata; implementation COMPLETE for feasible requested scope; external/browser verification gates remain OPEN.
- Clean npm ci, npm run assets, typecheck, lint, 29 unit/storage/calculation tests, production build, release validator and audit PASS (0 vulnerabilities). Final build after tablet fit fix: c7663b64d055a4d6, 68 offline shell assets, static out/ 262 MiB. Final unified Playwright: 13 PASS, 1 explicit Firefox startup-blocked skip in 50.0s (SKIP_FIREFOX_QA=1 npm run test:e2e). No runtime source changed after this passing run.
- Fresh screenshots inspected: test-results/editor-tablet.png (820 px artboard fits workspace and focus visible), test-results/ai/coffee-detail.png and portrait.png (real transparent object/portrait masks), desktop UI via AI screenshots. Final 12 MP workflow 1306 ms import/adjust/save, 2583 ms including full-resolution export, device-specific. Actual apple/metal-3 WebGPU and WASM/CPU model inference PASS; WebKit full workflow PASS.
- Important additions: vercel.json; scripts/general-models.mjs and verify-release.mjs; three licensed model manifests; ai-models/ai-math/ai.worker; storage v2/project-gallery/use-editor-lock; HSL/per-channel curves/blur fallback; bounded/coalesced previews; device-setup/device capability prompts; tests/remaining.test.ts and tests/e2e/remaining.spec.ts. README has exact installation, self-hosting, Vercel, settings and scope instructions. All changes remain uncommitted for user review.
- Genuine boundaries: Firefox test runtimes fail before app launch on this Mac (three independent startup attempts including older matched driver); native Safari and other computers not individually certified. No public Vercel deployment performed. Camera RAW, universal HEIC/HEIF decoding, PDF import, editable vector SVG/PSD interchange and CMYK/ICC workflow remain unsupported; still-frame GIF and raster PDF exports are implemented. Detailed model needs substantial memory; automatic CPU fallback does not eliminate memory limits.
- Exact next verification action: on a host where Firefox starts run npm ci && npm run assets && npm run build && npx playwright install chromium firefox webkit && npm run test:e2e (without SKIP_FIREFOX_QA). After user deploys repository on Vercel with Node 24/Other/out settings, verify landing, /editor/, self-hosted model downloads and offline reload on actual HTTPS URL. These open checks do not imply they have already passed.
- Local production preview running at http://localhost:3000 via npm run serve (session 13078). Landing and editor are available without a Next/server processing backend.

## Background removal quality repair — /root
- Updated: 2026-10-09 Asia/Kolkata; IN_PROGRESS.
- User reports poor background removal. Actual in-app screenshot shows holes through a person in a GIF/graphic and retained frame/text fragments. User tab visibly runs old portrait-only editor (no model selector/projects/device setup), despite new static build; update delivery is part of the defect.
- Preserve user's saved project and original. Next: refresh saved tab into current build, rerun same image with detailed general model, inspect result; improve defaults and update notification, add quality/failure safeguards and regression evidence.
- User additionally requested selection removal. Extend the image-area selection with non-destructive Erase selected area / Keep only selected area / Restore selected area, preserving original alpha and undo/redo. AI can process the same ROI independently of artboard crop.
### Selection and quality repair implemented
- Updated: 2026-10-09 12:34 Asia/Kolkata; IN_PROGRESS.
- Detailed general model is default; explicitly chosen modes persist. Added image-area rectangle selection in layer-local normalized coordinates, inverse-transform aware; AI crops original pixels to this ROI and writes a full-size transparent mask outside it. Added Erase / Keep only / Restore selected area operations compositing existing mask and brush strokes into a new mask asset; original pixels and undo/redo remain intact.
- Added empty/solid/invalid mask rejection preserving previous edit. Service-worker navigations now prefer current HTML online; one previous shell retained for already-open tabs; update notice saves before reload; SW source participates in build cache hash.
- Typecheck/lint/31 unit tests/build PASS, build 6e505f41e6ae368c. New region/mask safeguards unit tests pass. Added real-photo composite ROI/selection/undo/export/reload E2E and changed synthetic AI clipboard fixture to a real photo. Actual user image detailed rerun improves subject but still retains some surrounding frame; focused rerun and visual evidence next.

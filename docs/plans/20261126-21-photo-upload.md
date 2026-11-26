---
issue: 21
title: Allow editors to upload user photos (converted to PNG, stored in Postgres)
type: feature
branch: feature/21-photo-upload
status: implementing
created: 2026-11-26
pr: ""
---

# Allow editors to upload user photos (converted to PNG, stored in Postgres)

Issue: #21

## Goal

An editor can paste (including images straight from the clipboard), drag-drop, or file-pick a photo into the inline editor. **The browser** decodes it, applies EXIF orientation, downscales it to at most 2048 px on the longest side and re-encodes it as PNG (canvas re-encode drops all metadata). The server accepts only that PNG: it validates and sanitizes it structurally (no image decoding, no native dependency), stores the bytes in the existing Postgres `media` table (`bytea`), and returns `/media/{id}`. The editor inserts `![name](/media/{id})` at the caret; both surfaces already render that token. Postgres stays the only storage backend (no S3/R2/disk). The server cap of 15 MiB applies to the **converted** PNG. The conversion step is a self-contained client module and the server side is a generic "validate bytes -> store" path, so later attachment types (PDF, ...) add a pipeline instead of reworking storage.

## Non-goals

- Any object storage / disk storage / CDN. Bytes stay in Postgres.
- Server-side image decoding or resizing, and any native image dependency (`sharp` etc.).
- Non-image attachments (PDF), animated GIF/APNG preservation, SVG input, HEIC where the browser cannot decode it. Future issues; this plan only keeps the seam open (see Design -> Extension seam).
- Changing `POST /api/media` (favicon flow keeps storing ICO/GIF/etc. as received, 2 MiB cap).
- A schema migration: `media.media_type` already allows `image/png`, `data` is already `BYTEA`.
- Stored `filename`, per-user ownership/ACLs, quotas, orphan garbage collection, a gallery/management UI, thumbnails, alt-text editing UI, upload progress bars, a Web Worker for conversion.
- Changing who can read media: `/media/{id}` remains public, enumerable by sequential id, gated only by `requireLogin` (existing documented posture).
- Uploading from the anonymous reader or the `?cm6=1` spike.

## Context

- **Storage already exists.** `migrations/004_media.sql` (`media`: `BIGSERIAL id`, `media_type` CHECK incl. `image/png`, `width`, `height`, `size_bytes`, `data BYTEA`, `created_by`); `src/server/db/media-repository.ts` (contract), `media-pg.ts`, `media-memory.ts`. Rows are immutable; `/media/{id}` is `public, max-age=31536000, immutable`.
- **Upload route** `src/server/routes/media.ts`: `POST /api/media` with `onRequest: [requireSameOrigin, requireRole('editor','admin')]`, reads one multipart part, `probeMedia` (`src/server/media-types.ts`: magic-byte sniff + header dimensions, caps `MAX_MEDIA_SIDE=8192`, `MAX_MEDIA_PIXELS=40M`), stores bytes unchanged. Limit/format errors map via `limitError` (413/415/400).
- **Multipart limits are global** in `src/server/app.ts` (`fileSize: MEDIA_MAX_BYTES` (2 MiB), `files:1, fields:0, parts:1`). `@fastify/multipart` accepts per-call `req.file({ limits: { fileSize } })` (README), so photos get a bigger ceiling without touching the favicon flow.
- **Config:** `src/server/config.ts` zod env (`MEDIA_MAX_BYTES`, comment already says "raise for photos"); `.env.example`; env list in `docs/api.md` (~line 480).
- **Rendering is done.** `src/core/plugins/image.ts` (`![alt](src)`; same-origin `/media/N` passes `isSafeImageUrl` in `src/shared/url-policy.ts`), `.wn-image-img { max-width: 100% }` in `src/core/styles.ts`. Alt grammar is `[^\]]*`, src `[^)\s]+`.
- **No decoder needed.** `zlib.crc32` (Node >= 22.2 / 20.15) exists in the runtime we ship (Dockerfile `node:22-slim`, CI Node 22, local v22.21.1) and in `@types/node`; the PNG structural check needs nothing else. `src/server/__tests__/helpers/media-fixtures.ts` already builds PNGs chunk by chunk (`pngBytes`, `pngBombBytes`).
- **Editor hook points:** `src/core/editor-lifecycle.ts` owns the `paste` handler (reads `text/plain`, then `text/uri-list`; an image-only clipboard returns silently today), `selectionchange`, `notifications.notify(ToastOptions)`; commits go through `commitModelEdit` (`editor-commit.ts`: one undo step, render, selection restore, autosave). `selectionInBlock` (`caret-offset.ts`) detects fence/table regions. `EditorOptions` (`src/core/types.ts`) is how `src/client/main.ts` injects transport (`pageStore`); core stays transport-agnostic (AGENTS.md).
- **Client code** lives in `src/client/` (`api-page-store.ts` fetch patterns, injectable `fetchImpl` precedent in `link-existence.ts`/`page-titles.ts`). happy-dom has no real canvas/`createImageBitmap`, so browser-only pieces are tested through injected stubs and verified manually in real browsers.
- **Concurrent work:** #20 (editor toolbar, `feature/20-editor-toolbar`, status `implementing`) creates `src/core/editor-toolbar.ts` mounted in the existing `wn-toolbar` slot and edits `editor-lifecycle.ts`/`editor-keymap.ts`; its plan lists "image" as a non-goal. The picker button here needs that toolbar.
- **Tests:** vitest dom + node projects; `src/server/__tests__/media.test.ts` (route via `app.inject`), `media-pg.integration.test.ts` (`WN_TEST_PG_URL`), `src/core/__tests__/editor-clipboard.test.ts` (paste event helper `clip()`). `test_command: npm test`.

## Decisions

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | **Convert in the browser** (canvas), not on the server. | Server `sharp` (previous draft); pure-JS server decoders. | User decision: offloads CPU/memory from the server and removes a native dependency (and its Docker/platform risk, decode-concurrency limiter, EXIF/ICC test burden). |
| 2 | **The server never trusts the client's conversion.** `POST /api/media/photos` accepts only a PNG, structurally sanitizes it (Decision 6) and enforces the dimension and size caps itself. | Trust the client output. | Any authenticated editor (or script) can call the API directly; the server must guarantee what lands in Postgres and is served publicly. |
| 3 | **Downscale to 2048 px max side**, aspect kept, never enlarged. One constant `PHOTO_MAX_SIDE = 2048` in `src/shared/` is used by the client resizer **and** the server's dimension check (server rejects PNGs with a side > 2048). | Server cap at the existing 8192 px / 40 MP; 1600/4096. | User decision on 2048; a shared constant keeps the two sides from drifting and bounds what every reader's decoder pays. |
| 4 | **15 MiB (`PHOTO_MAX_BYTES`, new env, default 15728640) is the cap on the converted PNG**, applied per request via `req.file({ limits })`. The client does not pre-check it (it is configurable and not in the shell config); the server's 413 message states the limit and the client shows it. | Cap the raw input; plumb the limit through `EditorShellConfig`. | User clarified the 15 MiB is post-processing. Raw input needs no server cap now because it never reaches the server; avoiding config plumbing keeps the change small. |
| 5 | **New route `POST /api/media/photos`**, same guards as `POST /api/media` (`requireSameOrigin`, `requireRole('editor','admin')` at `onRequest`, before the multipart parser). PNG only; always stores `image/png`. Favicon route untouched. Serving stays `GET /media/{id}`. | One route for everything; `?convert=` flag. | ICO favicons and the admin flow must stay byte-exact; separate route makes the contract unambiguous. No new reserved slug prefix (`/api/*` already reserved). |
| 6 | **Server PNG sanitizer** (`src/server/png-sanitize.ts`, DOM-free, no decode): verify the 8-byte signature; walk chunks with length bounds and `zlib.crc32` CRC verification; require `IHDR` first (width/height 1..2048, valid bit depth/colour type/interlace), at least one `IDAT`, and `IEND` last; **rewrite the file keeping only an allowlist** (`IHDR PLTE IDAT IEND tRNS gAMA cHRM sRGB iCCP`), dropping `tEXt zTXt iTXt eXIf tIME pHYs acTL fcTL fdAT` and anything unknown, plus all bytes after `IEND`. | Store as received; decode with a library to validate. | Guarantees metadata (EXIF/GPS, text) never reaches public storage even from API callers or pass-through PNGs; kills polyglot trailing data; APNGs degrade to their default frame. No decoder, so no native dependency. |
| 7 | **Client accepts any file the browser can decode** among `image/jpeg`, `image/png`, `image/webp`, `image/gif` (first frame), `image/bmp`, `image/avif`; `image/svg+xml` and non-images are refused before decoding; decoding is the real test (`createImageBitmap` rejects -> "could not read this image"). | A fixed JPEG/PNG/WebP-only list. | Browsers already decode BMP for free (the issue mentions BMP as a future type); HEIC works only where the browser decodes it (Safari). SVG is script-bearing vector, excluded per the existing policy in `media-types.ts`. |
| 8 | **Conversion recipe** (`src/client/photo-convert.ts`): `createImageBitmap(file, { imageOrientation: 'from-image' })`; target size from `fit: inside` 2048; draw to a canvas of the target size (high-quality smoothing) and `toBlob('image/png')`. **PNG pass-through:** if the input is already a PNG (signature check on the first bytes) with both sides <= 2048, upload the original bytes (no re-encode: keeps 16-bit/palette/optimized compression; browser canvas PNGs can be larger). Everything else is re-encoded. | Always re-encode; always send the original. | Re-encoding drops metadata and applies orientation/sRGB; pass-through avoids pointless quality/size loss for the common screenshot case (the server sanitizer still strips metadata). `toBlob`/`createImageBitmap` run off the main thread in current browsers, so no Worker. |
| 9 | **Core stays transport-agnostic:** `EditorOptions.imageUploader?: (file: File) => Promise<{ url: string }>` receives the raw `File`; the client's uploader does convert + POST. Without the option (memory/embedded editors) paste/drop behave as today and the picker is not rendered. | Core calls canvas/fetch itself. | Core runs in node-smoke tests and embeds; `PageStore` precedent. |
| 10 | **Clipboard rule** (the paste handler is the one place that already owns paste): look at `clipboardData.files`, falling back to `items` with `kind === 'file'` (`getAsFile()`), for `image/*`. **Image wins unless the clipboard also carries both `text/plain` and `text/html`** (Word/Excel/rich-text copies attach a rendered PNG next to real text; text must keep winning there). This covers screenshots (image only), "Copy image" in browsers (html + image, no plain), and Finder/file-manager copies (plain filename + file, no html). Pasted clipboard images usually arrive named `image.png`; alt falls back to `photo` for the generic names `image`/`blob`/empty. | Text always wins; image always wins. | User asked for clipboard paste explicitly; the rule has to work for screenshots and Copy-image without breaking spreadsheet/Word pastes. |
| 11 | **Inserted source is `![alt](/media/{id})`**: alt = filename without extension with `[`, `]`, newlines removed and whitespace collapsed; empty/generic -> `photo`. Inserted at the **start of the current selection without deleting anything**. Several files: converted+uploaded sequentially (max 10 per gesture; extras skipped with a notice), each after the first prefixed with `\n`. One `commitModelEdit` per image = one undo step each, autosave scheduled. | Replace the selection; parallel uploads; buffer placeholder text. | Never destroys text the user selected while the upload ran; sequential keeps order and memory bounded (each full-size decode is released before the next); no placeholder avoids a half-state the autosave could persist. |
| 12 | **Insert guards:** refused before any work when the caret is inside a fence/table (`selectionInBlock`), with an error toast; if the page changed (navigation) or the caret is in a block when the upload completes, nothing is inserted and a toast reports `Uploaded /media/{id} but could not insert it`. If the DOM selection is unmappable at completion, the offset captured at start is used, clamped to the text length. | Insert into the original page's buffer; insert inside code. | Matches the toolbar's inert-in-blocks rule; cross-page insertion needs a buffer API we don't have. |
| 13 | **Drop** places the caret at the drop point when the browser can resolve it (`caretPositionFromPoint`/`caretRangeFromPoint`), else uses the current caret. Only image files are intercepted; non-image files in the same drop are skipped with a notice; a drop with no image files is left to the browser. | Intercept all file drops. | Don't change behavior we don't handle. |
| 14 | **Feedback:** info toast ("Preparing photo..." / "Uploading...") while in flight, dismissed on settle; error toast with the message on failure (server `error` text for 413/415/422, a fixed client message for decode failures). | Silent; progress bar. | Smallest honest UX; progress bars are a non-goal. |
| 15 | **Picker button waits for #20.** Steps 1-5 are independent of #20; step 6 adds an `Image` button to the toolbar from `src/core/editor-toolbar.ts` (a hidden `<input type="file" accept="image/*" multiple>`, opened from the button's click handler). Before step 6, `main` has #20 merged and this branch is rebased. | One-off button outside the toolbar slot. | User decision; avoids a second button UI. |

## Design

### Shared

`src/shared/media-policy.ts` (new, env-agnostic): `export const PHOTO_MAX_SIDE = 2048`.

### Server

`src/server/png-sanitize.ts` (new, DOM-free, uses `node:zlib` `crc32`):

```ts
export type PngSanitizeResult =
  | { ok: true; png: Buffer; width: number; height: number }
  | { ok: false; reason: 'not-png' | 'invalid-png' | 'over-dimension' }
export function sanitizePng(input: Buffer): PngSanitizeResult
```

Walk: signature (`not-png` if absent) -> loop chunks (`len` <= remaining, type 4 ASCII letters, CRC verified over type+data; any violation -> `invalid-png`) -> first chunk must be `IHDR` (13 bytes, dims > 0, interlace 0/1, valid depth/colour-type pair) -> dims > `PHOTO_MAX_SIDE` -> `over-dimension` -> collect allowlisted chunks in order (`IDAT` run kept contiguous as the spec requires; non-contiguous IDAT -> `invalid-png`) -> `IEND` required, everything after it ignored. Output = signature + kept chunks (original CRCs reused, so no re-encoding of data). The IDAT zlib stream is **not** inflated.

`src/server/routes/media.ts`: the multipart-reading block of `POST /api/media` (parse one part, map limit errors, drain extras) moves into a shared local helper `readUpload(req, reply, fileSizeLimit?)` (pure refactor; existing `media.test.ts` stays green). New handler:

```
POST /api/media/photos   onRequest: [requireSameOrigin, requireRole('editor','admin')]
  buf = readUpload(..., photoMaxBytes)              // 413 'PNG exceeds the upload size limit (15 MiB)', 415/400 as today
  r = sanitizePng(buf)
  not-png       -> 415 {error:'expected a PNG image'}
  invalid-png   -> 422 {error:'invalid PNG'}
  over-dimension-> 422 {error:'image is larger than 2048 px on a side'}
  { id } = media.insert({ mediaType:'image/png', width, height, data: r.png, by: req.user?.sub })
  201 { id, url:'/media/{id}', mediaType:'image/png', sizeBytes: r.png.length, width, height }
```

`MediaDeps` gains `photoMaxBytes`, passed by `app.ts`. Config: `PHOTO_MAX_BYTES: z.coerce.number().int().positive().default(15_728_640)`.

### Extension seam (documented, not built)

`media` stays a generic `(media_type, bytes)` store and `GET /media/{id}` serves the stored type. A future attachment type adds: (a) a migration widening the `media_type` CHECK (and, if wanted, `filename`), (b) a server validator like `sanitizePng` (PDF: `%PDF-` sniff + size cap) and, where conversion is wanted, a client converter like `photo-convert.ts`, (c) its route (or a widened one). PDFs will need the serve headers revisited (`CSP default-src 'none'` blocks in-browser PDF viewing; `Content-Disposition`). Future work, noted in `docs/architecture.md`.

### Client

`src/client/photo-convert.ts` (new):

```ts
export function fitInside(w: number, h: number, max: number): { width: number; height: number }  // pure
export function pngDimensions(head: Uint8Array): { width: number; height: number } | null       // pure, signature + IHDR
export async function convertToPng(file: File, env?: ConvertEnv): Promise<Blob>
```

`convertToPng`: refuse `image/svg+xml` and non-`image/*` types; read the first 24 bytes — PNG with both sides <= `PHOTO_MAX_SIDE` -> return `file` unchanged (pass-through). Else `createImageBitmap(file, { imageOrientation: 'from-image' })` (rejection -> `Error('Could not read this image')`), `fitInside`, draw to a canvas (`OffscreenCanvas` when available, else `document.createElement('canvas')`), `toBlob('image/png')` / `convertToBlob`, `bitmap.close()` in `finally`. `ConvertEnv` injects `createImageBitmap` and canvas factory for tests.

`src/client/media-upload.ts` (new): `createMediaUploader(deps?: { fetchImpl?, convert? }): ImageUploader` = `convertToPng` then `FormData` with one `file` part (`photo.png`) POSTed to `/api/media/photos`; `201` -> `{ url }`; non-2xx -> `throw new Error(body.error ?? 'Upload failed (HTTP n)')`; network failure -> `Error('Upload failed: network error')`. Passed from `main.ts` into `createEditor`.

### Core

- `src/core/types.ts`: `EditorOptions.imageUploader?: ImageUploader`, `type ImageUploader = (file: File) => Promise<{ url: string }>`; exported from `core/index.ts`.
- `src/core/editor-image.ts` (new): pure `imageAltFromFilename`, `imageMarkdown`, `clipboardImageFiles(data: DataTransfer)` (Decision 10 rule), and `insertImages(files, ctx)` orchestration (guards, sequential uploads, toasts, one `commitModelEdit` per image) over the commit deps, selection offsets, `selectionInBlock`, current page and `notifications`. `editor-lifecycle.ts` wires `paste` (image branch before the text path), `dragover`/`drop`, and exposes `uploadAndInsert(files)` for the toolbar picker.

### Error/edge matrix

| Case | Result |
| ---- | ------ |
| SVG / non-image / undecodable file | client error toast, no request sent |
| BMP, WebP, AVIF the browser decodes | converted to PNG client-side |
| Animated GIF | first frame |
| PNG <= 2048 px | uploaded as-is (pass-through), metadata stripped by the server |
| Photo > 2048 px | downscaled to <= 2048, orientation applied |
| API caller sends JPEG / non-PNG | 415 |
| PNG with a bad CRC, missing IEND, non-contiguous IDAT | 422 `invalid PNG` |
| PNG > 2048 px on a side | 422 |
| PNG > `PHOTO_MAX_BYTES` | 413 with the limit in the message; favicon route still 2 MiB |
| PNG with eXIf/tEXt/trailing bytes | stored without them (sanitized) |
| Anonymous / cross-origin POST | 401/403 before the multipart parser runs |
| Caret in fence/table at start | refused before conversion |
| Page navigated away during upload | row stays in DB (accepted orphan), toast, no insert |
| Autosave conflict while uploading | insert goes through `commitModelEdit`; existing conflict flow applies |
| Clipboard: Word/Excel (html + plain + image) | text pasted as today |

## Testing

- **`png-sanitize.test.ts` (node):** fixtures built chunk by chunk (extend `media-fixtures.ts` with a `pngWithChunks(...)` builder): valid minimal PNG round-trips with identical IHDR/IDAT bytes; `eXIf`/`tEXt`/`iTXt`/`tIME`/`pHYs`/unknown ancillary chunks removed; allowlisted `tRNS`/`PLTE`/`sRGB`/`gAMA` kept; trailing bytes after `IEND` dropped (polyglot); bad CRC, truncated chunk length, missing IHDR-first, missing IEND, zero IDAT, non-contiguous IDAT, invalid colour-type/depth pair -> `invalid-png`; JPEG/GIF/random/empty -> `not-png`; 2049-wide and 1x2049 -> `over-dimension`, exactly 2048 accepted; APNG (`acTL`/`fcTL`/`fdAT`) degrades to its default image.
- **`media.test.ts` additions (node, `app.inject`):** `POST /api/media/photos` success (201 body shape, row stored as `image/png` with sanitized bytes, `GET /media/{id}` serves it with immutable headers); 3 MiB PNG accepted although `MEDIA_MAX_BYTES` is 2 MiB; 413 over `PHOTO_MAX_BYTES` (small override) with the limit in the message; anonymous 401 and bad `Origin` 403 before parsing; 415 for JPEG/ICO/SVG; 422 for corrupt and over-dimension; extra parts 400; `POST /api/media` behavior unchanged (existing tests).
- **`media-pg.integration.test.ts`:** a multi-MB PNG `bytea` round-trip (needs `WN_TEST_PG_URL`).
- **`config.test.ts`:** `PHOTO_MAX_BYTES` default and override.
- **Client (dom): `photo-convert.test.ts`** — `fitInside` table (landscape/portrait/square, <= max unchanged, 1px extremes), `pngDimensions` (valid/short/non-PNG), pass-through returns the same `File` for a small PNG, large PNG and non-PNG go through the stubbed `createImageBitmap`/canvas with the expected target size and `imageOrientation: 'from-image'`, `bitmap.close()` called on success and on failure, SVG and non-image refused without decoding, decode rejection mapped to the fixed message. **`media-upload.test.ts`** — FormData has one `file` part, 201 parsing, server error text surfaced, non-JSON error body, network failure, convert failure short-circuits the POST.
- **Core (dom): `editor-image.test.ts`** (alt/markdown: brackets, newlines, unicode, empty, generic `image.png`; `clipboardImageFiles` truth table: image only, image+html, image+plain, image+plain+html (-> none), `items`-only `getAsFile`, non-image files) and `editor-image-insert.test.ts` on the real editor with a fake uploader: image paste inserts `![name](url)` at the caret, one undo step reverts it, autosave scheduled; text paste unchanged; two files insert sequentially on separate lines in order; insert point is the selection start and selected text survives; caret in fence/table -> refused, uploader not called; page changed mid-flight -> no insert + toast; uploader rejection -> error toast; image drop inserts, non-image-only drop not intercepted; no uploader option -> paste/drop unchanged.
- **Picker (step 6): `editor-toolbar` test additions:** Image button present only with an uploader, click opens the hidden input (`input.click` spy), `change` with files calls the same insert path, input value reset so the same file can be picked twice.
- **Not unit-testable in happy-dom:** real canvas/`createImageBitmap`, EXIF orientation, real clipboard and drag-drop, file dialog, `caretPositionFromPoint`. Manual below.
- **Manual (`npm run dev`, needs Postgres), Chrome and Firefox (Safari if available):** screenshot -> paste (clipboard image-only); right-click "Copy image" on a web image -> paste; copy a file in the file manager -> paste; paste from Word/Excel/rich text (text must still win); drag a 12 MP phone JPEG with orientation 6 (upright result, dims <= 2048, `size_bytes` sane, `exiftool` shows no EXIF/GPS on the served `/media/{id}`); WebP, BMP, animated GIF (first frame); a small PNG (pass-through) and a 4000 px PNG (downscaled); pick several files; drop a PDF with a JPEG; paste into a fenced block; upload while offline; `curl` a JPEG and a tEXt-laden PNG at `/api/media/photos` with a session cookie (415 / sanitized); view the page anonymously (image renders, immutable cache headers).
- **Gate before filing:** `npm run typecheck && npm run lint && WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm run test:coverage && npm run build`.

## Steps

- [x] 1. `src/shared/media-policy.ts` (`PHOTO_MAX_SIDE`); `src/server/png-sanitize.ts` + `media-fixtures` chunk builder + `png-sanitize.test.ts` (full matrix above).
- [x] 2. Config + refactor: `PHOTO_MAX_BYTES` in `config.ts`, `.env.example`, `config.test.ts`; extract `readUpload` in `routes/media.ts` (no behavior change; existing media tests pass); `MediaDeps.photoMaxBytes` wired from `app.ts`.
- [x] 3. `POST /api/media/photos` route + tests (incl. pg bytea round-trip); `docs/api.md` (route, error table, `PHOTO_MAX_BYTES` in the env list); refresh the stale "editor images later" comments in `media.ts`/`media-types.ts`.
- [ ] 4. Client converter + uploader: `src/client/photo-convert.ts`, `src/client/media-upload.ts`, tests with stubbed browser APIs. Not wired yet.
- [ ] 5. Core insertion + wiring: `EditorOptions.imageUploader`, `src/core/editor-image.ts`, clipboard (Decision 10)/dragover/drop in `editor-lifecycle.ts`, `main.ts` passes `createMediaUploader()`; tests; `docs/architecture.md` (route in the diagram, module notes, Extension seam).
- [ ] 6. Picker button (precondition: #20 merged, branch rebased onto `main`): `Image` button + hidden file input in `editor-toolbar.ts`, hidden when no uploader; tests; `docs/theming.md` only if a new class/token is introduced.

## Risks & open questions

- *Accepted:* Browser-side conversion cannot be exercised in happy-dom. Orientation, canvas colour handling and clipboard behavior are verified manually in real browsers; older Safari may mishandle `imageOrientation: 'from-image'`.
- *Accepted:* The server does not decode the image. A structurally valid PNG with a corrupt compressed stream is stored and renders as a broken image (harmless; served with `nosniff` + `CSP default-src 'none'`).
- *Accepted:* Canvas-encoded PNGs of noisy photos can be large (a 2048 px photo is typically 3-10 MB); DB/backup size grows with every upload; no quota or GC. Orphaned uploads (never referenced, page deleted, navigated away mid-upload) are never cleaned up; follow-up issue if it matters.
- *Accepted:* Decoding a very large source image uses browser memory proportional to its pixel count on the user's machine; a failing decode surfaces as the "could not read this image" toast.
- *Accepted:* Which source formats work depends on the browser (HEIC only in Safari; AVIF/BMP vary by version). Errors name the problem; no server-side fallback.
- *Accepted:* Media remains public and enumerable by sequential id (existing posture); server-enforced metadata stripping is the mitigation this plan adds.
- *Accepted:* Animated GIF/APNG lose animation.
- *Accepted:* Step 6 is blocked on #20 merging; `editor-lifecycle.ts` will conflict-merge with #20's changes, resolved by rebasing before step 5 or step 6 (whichever comes after #20 lands).

## Implementation notes

## Review

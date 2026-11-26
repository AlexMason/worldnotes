---
issue: 21
title: Allow editors to upload user photos (converted to PNG, stored in Postgres)
type: feature
branch: feature/21-photo-upload
status: draft
created: 2026-11-26
pr: ""
---

# Allow editors to upload user photos (converted to PNG, stored in Postgres)

Issue: #21

## Goal

An editor can paste, drag-drop, or file-pick a photo into the inline editor. The server decodes it (JPEG/PNG/WebP/GIF), applies EXIF orientation, strips all metadata (GPS included), downscales it to at most 2048 px on the longest side, re-encodes it as PNG, stores the PNG bytes in the existing Postgres `media` table (`bytea`), and returns `/media/{id}`. The editor inserts `![name](/media/{id})` at the caret; both surfaces already render that token. Postgres stays the only storage backend (no S3/R2/disk), and the conversion step is a self-contained module so later attachment types (PDF, BMP, …) add a pipeline instead of reworking storage.

## Non-goals

- Any object storage / disk storage / CDN. Bytes stay in Postgres.
- Non-image attachments (PDF), BMP/HEIC/AVIF input, animated GIF preservation. Those are future issues; this plan only keeps the seam open (see Design → Extension seam).
- Changing `POST /api/media` (favicon flow keeps storing ICO/GIF/etc. as received, 2 MiB cap).
- A schema migration: `media.media_type` already allows `image/png`, `data` is already `BYTEA`.
- Stored `filename`, per-user ownership/ACLs, quotas, orphan garbage collection, an image gallery/management UI, resize variants/thumbnails, alt-text editing UI, upload progress bars.
- Changing who can read media: `/media/{id}` remains public, enumerable by sequential id, gated only by `requireLogin` (existing documented posture).
- Uploading from the anonymous reader or the `?cm6=1` spike.

## Context

- **Storage already exists.** `migrations/004_media.sql` (`media`: `BIGSERIAL id`, `media_type` CHECK incl. `image/png`, `width`, `height`, `size_bytes`, `data BYTEA`, `created_by`); `src/server/db/media-repository.ts` (contract), `media-pg.ts`, `media-memory.ts`. Rows are immutable; `/media/{id}` is `public, max-age=31536000, immutable`.
- **Upload route** `src/server/routes/media.ts`: `POST /api/media` with `onRequest: [requireSameOrigin, requireRole('editor','admin')]`, reads one multipart part, `probeMedia` (`src/server/media-types.ts`: magic-byte sniff of PNG/GIF/WebP/JPEG/ICO + header dimensions, caps `MAX_MEDIA_SIDE=8192`, `MAX_MEDIA_PIXELS=40M`), stores bytes unchanged. Limit/format errors map via `limitError` (413/415/400).
- **Multipart limits are global** in `src/server/app.ts` (`fileSize: MEDIA_MAX_BYTES` (2 MiB), `files:1, fields:0, parts:1`). `@fastify/multipart` accepts per-call `req.file({ limits: { fileSize } })` (documented in its README), so photos can have a bigger ceiling without touching the favicon flow.
- **Config:** `src/server/config.ts` zod env (`MEDIA_MAX_BYTES`, comment already says "raise for photos"); `.env.example`; env list in `docs/api.md` (~line 480).
- **Rendering is done.** `src/core/plugins/image.ts` (`![alt](src)`, same-origin `/media/N` passes `isSafeImageUrl` in `src/shared/url-policy.ts`), `.wn-image-img { max-width: 100% }` in `src/core/styles.ts`. Alt grammar is `[^\]]*`, src `[^)\s]+`.
- **No decoder dependency** in `package.json`; Dockerfile is `node:22-slim` (glibc, `npm ci --omit=dev`), so `sharp`'s prebuilt `@img/sharp-linux-*` binaries install normally; `sharp` latest 0.35.5, node >= 20.9.
- **Editor hook points:** `src/core/editor-lifecycle.ts` owns `paste` (text-only today; an image paste with no text returns silently), `selectionchange`, `notifications.notify(ToastOptions)`; commits go through `commitModelEdit` (`editor-commit.ts`: one undo step, render, selection restore, autosave). `selectionInBlock` (`caret-offset.ts`) detects fence/table regions. `EditorOptions` (`src/core/types.ts`) is how `src/client/main.ts` injects transport (`pageStore`); core stays transport-agnostic (AGENTS.md).
- **Concurrent work:** #20 (editor toolbar, `feature/20-editor-toolbar`, status `implementing`) creates `src/core/editor-toolbar.ts` mounted in the existing `wn-toolbar` slot and edits `editor-lifecycle.ts`/`editor-keymap.ts`; its plan lists "image" as a non-goal. The picker button here needs that toolbar.
- **Tests:** vitest dom + node projects; `src/server/__tests__/media.test.ts` (route via `app.inject`, fixtures in `helpers/media-fixtures.ts`), `media-pg.integration.test.ts` (`WN_TEST_PG_URL`), `src/core/__tests__/editor-clipboard.test.ts` (paste event helper `clip()` for the editor). `test_command: npm test`.

## Decisions

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | Convert **server-side with `sharp`**. | Pure-JS decoders; browser canvas conversion. | User decision. Server stays the authority (the stored bytes are always what we encoded, never client output); fast, low memory; handles EXIF rotate and metadata stripping; prebuilt binaries cover the Docker image. |
| 2 | **Downscale to 2048 px max side**, aspect kept, never enlarged (`fit: 'inside'`, `withoutEnlargement`). Constant `PHOTO_MAX_SIDE` in `media-types.ts`, not an env var. | 1600, 4096, no resize. | User decision. PNG is lossless: an unresized 12 MP photo is 15-25 MB of `bytea`; 2048 px keeps rows in the low single-digit MB. |
| 3 | **New route `POST /api/media/photos`**, same guards as `POST /api/media`; favicon route untouched. Always stores `image/png`. | One route that converts everything; `?convert=png` query flag. | User decision. ICO favicons and the admin flow must keep working byte-exact; a separate route makes "this path always converts" unambiguous. Serving stays `GET /media/{id}` (no new reserved slug prefix; `/api/*` is already reserved). |
| 4 | **Accepted input:** JPEG, PNG, WebP, GIF (first frame only). ICO, SVG, BMP, HEIC/AVIF, everything else -> 415. Sniffing via existing `probeMedia` (client `Content-Type` is ignored); ICO rejected explicitly because `probeMedia` allows it. | Accept whatever libvips can open. | `probeMedia` is the established content gate; libvips's loaders widen the attack surface (and its prebuilt has no BMP/HEIC anyway). |
| 5 | **Raw upload cap `PHOTO_MAX_BYTES`** (default 15 MiB, new env), applied per request via `req.file({ limits })`. Pixel guard reuses `MAX_MEDIA_SIDE`/`MAX_MEDIA_PIXELS` from header probing, and `sharp(..., { limitInputPixels: MAX_MEDIA_PIXELS, failOn: 'error' })` as a second wall. | Raise `MEDIA_MAX_BYTES` globally. | User decision on 15 MiB. Raising the global would loosen the favicon route. |
| 6 | **Metadata is stripped and color is normalized to sRGB** (sharp default behavior; a test asserts it, including that EXIF GPS does not survive). `.rotate()` bakes EXIF orientation before the strip. | Keep metadata (`withMetadata`). | Privacy (GPS in public, enumerable images) and correct orientation after the EXIF is gone. |
| 7 | **Decode concurrency is capped at 2** by a small in-process limiter around the conversion. | Unbounded. | A 40 MP RGBA decode is ~160 MB; several concurrent uploads could OOM the process. |
| 8 | **Stored row:** `media_type='image/png'`, `width`/`height` = post-resize dims, `size_bytes` = PNG length, `created_by` = user `sub`. No migration. | Add columns now (`filename`, `original_type`). | Nothing reads them yet; the first attachment issue that needs them adds the migration. |
| 9 | **Editor entry points: paste, drop, and a file-picker button**, all calling one core `imageUploader` port, injected through `EditorOptions` (`imageUploader?: (file: File) => Promise<{ url: string }>`); `src/client/media-upload.ts` implements it with `fetch('/api/media/photos')`. Without the option (memory/embedded editors) paste/drop behave as today and the picker button is not rendered. | Core calls `fetch` directly. | Core is transport-agnostic (`PageStore` precedent). |
| 10 | **Inserted source is `![alt](/media/{id})`** where `alt` = filename without extension, with `[`, `]`, and newlines removed and whitespace collapsed; empty -> `photo`. Inserted at the **start of the current selection without deleting anything**. Several files: uploaded sequentially (max 10 per gesture; extras skipped with a notice), each after the first prefixed with `\n`. One `commitModelEdit` per image = one undo step each, autosave scheduled. | Replace the selection; parallel uploads; placeholder text in the buffer. | Never destroys text the user selected while the upload ran; sequential keeps document order and server load predictable; no placeholder avoids a half-state the autosave could persist. |
| 11 | **Insert guards:** refused before uploading when the caret is inside a fence/table (`selectionInBlock`), with an error toast; if the page changed (navigation) or the caret is in a block when the upload completes, nothing is inserted and a toast reports `Uploaded /media/{id} but could not insert it`. If the DOM selection is unmappable at completion, the offset captured at start is used, clamped to the text length. | Insert into the original page's buffer after navigating; insert inside code. | Matches the toolbar's inert-in-blocks rule; cross-page insertion would need a buffer API we don't have. |
| 12 | **Drop** places the caret at the drop point when the browser can resolve it (`caretPositionFromPoint`/`caretRangeFromPoint`), else uses the current caret. Only image files are intercepted; non-image files in the same drop are skipped with a notice; a drop with no image files is left to the browser. | Intercept all file drops. | Don't change behavior for drops we do not handle. |
| 13 | **Feedback:** info toast while a photo is uploading (dismissed on settle); error toast with the server's `error` message on failure (413 -> size limit text, 415 -> unsupported type, 422 -> could not decode / dimensions). | Silent; progress bar. | Smallest honest UX; progress bars are a non-goal. |
| 14 | **Picker button waits for #20.** Steps 1-5 are independent of #20; step 6 adds an `Image` button to the toolbar from `src/core/editor-toolbar.ts` (a hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple>` opened from the button's click handler). Before step 6, `main` has #20 merged and this branch is rebased. | Build a one-off button outside the toolbar slot. | User decision; avoids a second button UI. |

## Design

### Server

`src/server/photo-pipeline.ts` (new, DOM-free):

```ts
export const PHOTO_MAX_SIDE = 2048            // exported from media-types.ts
export type PhotoResult =
  | { ok: true; png: Buffer; width: number; height: number }
  | { ok: false; reason: 'unsupported-type' | 'over-dimension' | 'decode-failed' }
export function convertPhotoToPng(input: Buffer): Promise<PhotoResult>
```

1. `probeMedia(input)`; reject `unsupported-type`/`over-dimension` as returned, and reject `image/vnd.microsoft.icon`.
2. Inside a 2-slot limiter: `sharp(input, { limitInputPixels: MAX_MEDIA_PIXELS, failOn: 'error', sequentialRead: true }).rotate().resize({ width: PHOTO_MAX_SIDE, height: PHOTO_MAX_SIDE, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true })`.
3. Any sharp exception -> `decode-failed` (message never leaks to the client beyond the fixed reason; details logged by the route at `warn`).
4. Return `info.width`/`info.height` (post-resize).

`src/server/routes/media.ts`: the multipart-reading block of the `POST /api/media` handler (parse one part, map limit errors, drain extras) moves into a local helper `readUpload(req, reply, fileSizeLimit?)` shared by both routes (pure refactor, existing `media.test.ts` stays green). New handler:

```
POST /api/media/photos   onRequest: [requireSameOrigin, requireRole('editor','admin')]
  buf = readUpload(..., config.PHOTO_MAX_BYTES)          // 413/415/400 as today
  r = convertPhotoToPng(buf)
  !ok: unsupported-type -> 415 {error:'unsupported image type (JPEG, PNG, WebP, GIF only)'}
       over-dimension   -> 422 {error:'image dimensions exceed the limit'}
       decode-failed    -> 422 {error:'could not decode image'}
  { id } = media.insert({ mediaType:'image/png', width, height, data: png, by: req.user?.sub })
  201 { id, url:'/media/{id}', mediaType:'image/png', sizeBytes, width, height }
```

The route needs `config` (for `PHOTO_MAX_BYTES`); `MediaDeps` gains `photoMaxBytes: number`, passed by `app.ts`. Config: `PHOTO_MAX_BYTES: z.coerce.number().int().positive().default(15_728_640)`.

### Extension seam (documented, not built)

`media` stays a generic `(media_type, bytes)` store and `GET /media/{id}` serves the stored type. A future attachment type adds: (a) a migration widening the `media_type` CHECK (and, if wanted, `filename`), (b) its own pipeline module with `unknown bytes -> { type, bytes } | rejection` (BMP -> decode + PNG; PDF -> `%PDF-` sniff + passthrough), (c) its own route or a widened `photos` route. PDFs will need the serve headers revisited (`CSP default-src 'none'` blocks in-browser PDF viewing; `Content-Disposition`). That is future work and noted in `docs/architecture.md`.

### Core / client

- `src/core/types.ts`: `EditorOptions.imageUploader?: ImageUploader` with `type ImageUploader = (file: File) => Promise<{ url: string }>` (rejects with an `Error` whose message is shown to the user).
- `src/core/editor-image.ts` (new, small): pure `imageAltFromFilename(name)`, `imageMarkdown(alt, url)`, and `insertImages(files, ctx)` orchestration (guards, sequential uploads, toasts, one `commitModelEdit` per image) taking the commit deps, `getSelectionOffsets`, `selectionInBlock`, `state.getCurrentPage`, `notifications` it needs. `editor-lifecycle.ts` wires:
  - `paste`: if `clipboardData.files` contains `image/*` and an uploader exists -> `preventDefault`, `insertImages`. If the clipboard also has `text/plain`, the text path runs as today and the image is ignored (Word/Excel put both; text wins).
  - `dragover` (preventDefault when the drag carries image files) and `drop` (Decision 12).
  - A `uploadAndInsert(files)` handle exposed to the toolbar for the picker.
- `src/client/media-upload.ts`: `createMediaUploader(fetchImpl = fetch): ImageUploader`. `FormData` with a single `file` part; `201` -> `{ url }`; non-2xx -> `throw new Error(body.error ?? 'Upload failed (HTTP n)')`; network failure -> `Error('Upload failed: network error')`. Passed from `main.ts` into `createEditor`.

### Error/edge matrix

| Case | Result |
| ---- | ------ |
| Non-image / SVG / ICO / BMP upload | 415, error toast, nothing inserted |
| Truncated or corrupt JPEG | 422 `could not decode image` |
| 9000x100 PNG header | 422 dimensions (header check, never decoded) |
| 16 MiB file | 413 (limit is per request; favicon route still 2 MiB) |
| Anonymous / cross-origin POST | 401/403 before the multipart parser runs |
| Animated GIF | first frame |
| Photo already <= 2048 px | not enlarged, only re-encoded |
| Caret in fence/table at start | refused before upload |
| Page navigated away during upload | row stays in DB (accepted orphan), toast, no insert |
| Autosave conflict while uploading | insert goes through `commitModelEdit`; existing conflict flow applies |

## Testing

- **`photo-pipeline.test.ts` (node):** fixtures generated with `sharp` itself (`sharp({create}).jpeg()/.webp()/.gif()/.png()`): JPEG/WebP/GIF/PNG in -> valid PNG out (magic bytes, dims); 4000x3000 -> 2048x1536; 800x600 not enlarged; EXIF orientation 6 produces a rotated output (dimension swap); EXIF GPS is absent from the output; ICC/Display-P3 input comes out sRGB-tagged or untagged but pixel-correct (assert a known-color pixel); ICO and random bytes -> `unsupported-type`; 8193 px side and >40 MP -> `over-dimension`; truncated JPEG -> `decode-failed`; limiter never exceeds 2 in-flight conversions (injected counting wrapper).
- **`media.test.ts` additions (node, `app.inject`):** `POST /api/media/photos` success (201 body shape, row stored as `image/png`, `GET /media/{id}` serves it with the immutable headers); anonymous 401 and bad `Origin` 403 before parsing; 413 over `PHOTO_MAX_BYTES` while a 3 MiB file is accepted although `MEDIA_MAX_BYTES` is 2 MiB; 415 for ICO/text/SVG; 422 for corrupt and oversized-dimension images; multi-part request 400; `POST /api/media` behavior unchanged (existing tests).
- **`media-pg.integration.test.ts`:** a multi-MB PNG `bytea` round-trip (needs `WN_TEST_PG_URL`).
- **`config.test.ts`:** `PHOTO_MAX_BYTES` default and override.
- **Core (dom): `editor-image.test.ts`** (pure alt/markdown cases: brackets, newlines, empty, unicode) and `editor-image-insert.test.ts` on the real editor with a fake uploader: paste of an image file inserts `![name](url)` at the caret, one undo step reverts it, autosave scheduled; paste with `text/plain` + image uses text; two files insert sequentially on separate lines in order; insert point is the selection start and the selected text survives; caret in fence/table -> refused, uploader not called; page changed mid-flight -> no insert, toast; uploader rejection -> error toast with message; drop of an image file inserts, drop of only non-images is not intercepted; no uploader option -> paste/drop unchanged.
- **Client (dom): `media-upload.test.ts`:** FormData has one `file` part, 201 parsing, error body surfaced, non-JSON error body, network failure.
- **Picker (step 6): `editor-toolbar` test additions:** Image button present only with an uploader, click opens the hidden input (`input.click` spy), `change` with files calls the same insert path, input reset afterwards so the same file can be picked twice.
- **Not unit-testable in happy-dom:** real clipboard/drag-drop from the OS, `caretPositionFromPoint` at the drop point, file dialog, rendering of a large photo. Manual below.
- **Manual (`npm run dev`, needs Postgres):** in Chrome and Firefox: take a screenshot and paste it; drag a 12 MP phone JPEG (check Postgres `size_bytes`, dims <= 2048, no EXIF via `exiftool`); pick several files; drop a PDF and a JPEG together; paste into a fenced block; upload while offline; view the page anonymously (image renders, `/media/{id}` cached/immutable); `docker build .` succeeds and the container converts a photo (native `sharp` binary loads on `node:22-slim`).
- **Gate before filing:** `npm run typecheck && npm run lint && WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm run test:coverage && npm run build`.

## Steps

- [ ] 1. Add `sharp`; `src/server/photo-pipeline.ts` (probe, ICO reject, rotate/resize/png, error mapping, 2-slot limiter), `PHOTO_MAX_SIDE` in `media-types.ts`; `photo-pipeline.test.ts` incl. EXIF/GPS/orientation/ICC/bomb/corrupt cases.
- [ ] 2. Config + refactor: `PHOTO_MAX_BYTES` in `config.ts`, `.env.example`, `config.test.ts`; extract `readUpload` in `routes/media.ts` (no behavior change; existing media tests pass); `MediaDeps.photoMaxBytes` wired from `app.ts`.
- [ ] 3. `POST /api/media/photos` route + tests (incl. pg bytea round-trip); `docs/api.md` (route, error table, `PHOTO_MAX_BYTES` in env list); update stale "editor images later" comments in `media.ts`/`media-types.ts`/`004` reference docs only (no migration change).
- [ ] 4. Core insertion: `EditorOptions.imageUploader`, `src/core/editor-image.ts`, paste + dragover/drop wiring in `editor-lifecycle.ts`, tests with a fake uploader; export the type from `core/index.ts`.
- [ ] 5. Client uploader: `src/client/media-upload.ts` + tests, wired in `main.ts`; `docs/architecture.md` (route in the diagram, module notes, Extension seam paragraph).
- [ ] 6. Picker button (precondition: #20 merged, branch rebased onto `main`): `Image` button + hidden file input in `editor-toolbar.ts`, hidden when no uploader; tests; `docs/theming.md` only if a new class/token is introduced.

## Risks & open questions

- *Accepted:* PNG rows are still large for noisy photos (a 2048 px photo is typically 3-10 MB) and DB/backup size grows with every upload; no quota or GC. Orphaned uploads (never referenced, page deleted, navigated away mid-upload) are never cleaned up; a GC/quota issue is a follow-up if it matters.
- *Accepted:* `sharp` is a native dependency. If its binary fails to load on a platform, `npm start` fails at import. Mitigated by prebuilt glibc/musl binaries and the manual `docker build` check; not lazy-loaded.
- *Accepted:* Media remains public and enumerable by sequential id (existing posture, `docs/api.md`); stripping EXIF/GPS is the mitigation this plan adds.
- *Accepted:* Animated GIFs lose animation; BMP/HEIC/AVIF are rejected now. BMP and PDF are future pipelines.
- *Accepted:* Step 6 is blocked on #20 merging; `editor-lifecycle.ts` will conflict-merge with #20's changes, resolved by rebasing before step 4 or step 6 (whichever comes after #20 lands).
- *Accepted:* Clipboard/drag-drop/file-dialog behavior in real browsers is manual-only (happy-dom cannot model it).
- *Accepted:* Sharp's default metadata/colour handling is asserted by tests in step 1; if an assertion fails, the pipeline gets explicit `.toColourspace('srgb')` / metadata options in that step (no plan change).

## Implementation notes

## Review

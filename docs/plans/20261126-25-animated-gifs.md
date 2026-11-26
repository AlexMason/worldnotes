---
issue: 25
title: Keep animated GIFs animated when uploading photos (incl. Copy image from the web)
type: fix
branch: fix/25-animated-gifs
status: filed
created: 2026-11-26
pr: ""
---

# Keep animated GIFs animated when uploading photos (incl. Copy image from the web)

Issue: #25

## Goal

An animated GIF pasted, dropped or picked in the editor is stored as an `image/gif` row in the existing Postgres `media` table and renders animated on both surfaces through the existing `![alt](/media/{id})`. Right-click **Copy image** on a GIF in the browser (giphy.com in Brave is the acceptance case) pastes the animated GIF, not a still. GIFs get the same server-side guarantees as PNGs: validated structurally (no decoding), metadata and trailing bytes stripped, dimension/size/frame caps. All other photos, and single-frame GIFs, keep today's browser-side PNG conversion.

## Non-goals

- Resizing or re-encoding animated GIFs (no encoder library, no server decoding). An animated GIF over 2048 px is not made smaller; it falls back to a still PNG with a notice (Decision 6).
- Animated WebP/APNG/AVIF preservation (WebP and AVIF stay first-frame PNG; an APNG pasted as a file also flattens).
- Fetching originals for non-GIF "Copy image" pastes, or from `<img>` URLs that do not end in `.gif`.
- Any server-side image fetching (the browser fetches the original; the server never fetches a URL).
- A schema migration: `media.media_type` already allows `image/gif`.
- Changing `POST /api/media` (favicon flow) or who can read media.

## Context

- **Why Copy image pastes a still.** Chrome/Brave "Copy image" puts a decoded still `image/png` on the clipboard plus `text/html` containing `<img src="https://…/giphy.gif">`; the original animated bytes are not on the clipboard. `clipboardImageFiles` (`src/core/editor-image.ts`) only reads `files`/`items`, so the URL in the HTML is ignored. [INFERENCE for the exact Brave flavors; the user's repro (a still comes through) is consistent with it. Step 4 includes a manual check.]
- **The original is fetchable from Giphy.** Verified with `curl -I` (Origin header): `https://media.giphy.com/…/giphy.gif` answers `content-type: image/gif`, `access-control-allow-origin: *`. The editor page sets no CSP (`grep content-security-policy src/server`: only the media route's own `default-src 'none'`), so `fetch` from the editor is not blocked by us. Hosts without CORS headers cannot be fetched from the browser.
- **GIF flattening today.** `src/client/photo-convert.ts` `convertToPng` passes through only PNGs that fit; everything else (incl. GIF) goes `createImageBitmap` -> canvas -> PNG, which yields the first frame. `src/client/media-upload.ts` posts to `POST /api/media/photos`, whose handler (`src/server/routes/media.ts`) accepts PNG only via `sanitizePng` (`src/server/png-sanitize.ts`; `PHOTO_MAX_SIDE` in `src/shared/media-policy.ts`; per-request `PHOTO_MAX_BYTES`).
- **Storage and serving need no change.** `migrations/004_media.sql` CHECK includes `image/gif`; `StoredMediaType` includes it; `GET /media/{id}` serves the stored type with immutable cache + `nosniff` + `CSP default-src 'none'`. `src/core/plugins/image.ts` renders `<img>` (browsers animate GIFs natively).
- **GIF structure** (no decoder needed): `GIF87a|GIF89a`, logical screen descriptor (u16le width/height, packed byte with global-color-table flag/size), then blocks: `0x21` extensions (graphic control `0xF9`, application `0xFF` incl. `NETSCAPE2.0` loop count, comment `0xFE`, plain text `0x01`), `0x2C` image descriptor (+ optional local color table, LZW min code size, data sub-blocks), `0x3B` trailer. Existing helpers: `sniffGif` in `src/server/media-types.ts` (header only) and the 1x1 `GIF_BYTES` fixture in `src/server/__tests__/helpers/media-fixtures.ts`.
- **Editor paste path** from #21: `editor-lifecycle.ts` paste/drop -> `insertImages(files, ctx)` in `editor-image.ts` -> `ctx.upload(file)` (`ImageUploader = (file) => Promise<{ url }>`, `src/core/types.ts`; client impl `createMediaUploader`). Clipboard rule: image wins unless `text/plain` and `text/html` are both present.
- **`src/shared/`** must stay environment-agnostic (AGENTS.md): a `Uint8Array`-based GIF module there can serve both the browser and the server.
- **Tests:** vitest dom + node projects; `media.test.ts` (route), `png-sanitize.test.ts` (style to copy), `photo-convert.test.ts`/`media-upload.test.ts` (stubbed browser APIs), `editor-image*.test.ts` (paste on a real editor mount with a fake uploader). `test_command: npm test`.

## Decisions

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | **Animated GIFs are stored as `image/gif`, not converted.** A GIF with more than one frame is uploaded byte-for-byte after server sanitization; a GIF with exactly one frame is converted to PNG like every other photo. | Keep all GIFs as GIF; convert everything to PNG. | User decision (animated stays GIF; static -> PNG keeps the original "PNG storage" ask and the smaller file). PNG cannot animate (APNG support is uneven and cannot be produced in the browser without an encoder). |
| 2 | **One shared, DOM-free GIF module `src/shared/gif.ts`** (`Uint8Array` in, no Node/DOM APIs): `parseGif(bytes) -> { width, height, frames } | error` and `sanitizeGif(bytes) -> { gif, width, height, frames } | error`. The browser uses `parseGif` (is it animated? dimensions); the server uses `sanitizeGif`. | Separate client and server parsers; library. | One grammar implementation cannot disagree with itself; same pattern as `png-sanitize.ts`; no dependency. |
| 3 | **Server sanitizer rewrites the GIF keeping an allowlist:** header, logical screen descriptor, global color table, graphic control extensions (`0xF9`), the `NETSCAPE2.0` application extension (loop count), image descriptors with their local color tables and LZW data, then a single `0x3B` trailer. Dropped: comment, plain-text and every other application extension (XMP, ICC), unknown extensions, and all bytes after the trailer. A missing trailer is accepted only when the data ends exactly on a block boundary (the output always gets one); any truncated block -> invalid. LZW streams are not decoded. | Store as received; decode to validate. | Metadata (comments, XMP) and polyglot trailing bytes never reach public storage; no decoder, no native dependency. A GIF with a corrupt LZW stream is stored and renders broken (same accepted trade-off as PNG). |
| 4 | **Server caps for GIF:** each side of the logical screen <= `PHOTO_MAX_SIDE` (2048); at most **500 frames**; **frames x width x height <= 400 000 000 px** ("pixel-frames" budget, so a 15 MiB file cannot expand into billions of decoded pixels); size <= `PHOTO_MAX_BYTES` (existing per-request limit). Constants live beside `PHOTO_MAX_SIDE` in `src/shared/media-policy.ts`. | Dimension cap only. | LZW compresses blank frames ~1000:1, so file size alone does not bound decoder work in every reader's browser, forever (immutable cache). A typical 480x270, 200-frame GIF is 26 M pixel-frames. |
| 5 | **`POST /api/media/photos` accepts PNG or GIF**, chosen by magic bytes (never the declared type): PNG signature -> `sanitizePng`; `GIF87a/GIF89a` -> `sanitizeGif`; anything else -> 415 `expected a PNG or GIF image`. The 201 body reports the stored `mediaType` (`image/png` or `image/gif`). GIF failures: `422 invalid GIF`, `422 image is larger than 2048 px on a side`, `422 GIF has too many frames`. | A sibling `/api/media/gifs` route. | Same guards, same limits, one client call; the route's contract becomes "browser-prepared photo: PNG or GIF". |
| 6 | **Client conversion (`photo-convert.ts`) gains GIF handling.** Read the file and `parseGif`: invalid/over-cap -> let the server report it for animated candidates, but never re-encode; `frames > 1` and both sides <= 2048 -> **pass through unchanged**; `frames > 1` and a side > 2048 -> **fall back to a still PNG** (existing canvas path, downscaled) and return a `notice`; `frames === 1` or unparseable -> existing PNG conversion. `ImageUploader`'s result becomes `{ url: string; notice?: string }`; `insertImages` shows the notice as a warning toast after inserting. | Reject big animated GIFs; downscale animated GIFs. | User decision (still fallback for > 2048). Downscaling frames needs an encoder (non-goal). |
| 7 | **Copy image gets the original GIF.** For a paste whose clipboard is the image kind (Decision 10 of #21 unchanged: image wins unless `text/plain` **and** `text/html` are both present), parse `text/html` with `DOMParser`, take the first `<img src>` whose URL is absolute `https:` and whose path ends in `.gif` (case-insensitive, query/hash ignored). When one exists, that URL is attached to the pasted image (`{ file, originalUrl }`). A clipboard with a `.gif` `<img>` and no image file still yields an item (no still to fall back to). | Fetch every `<img src>`; sniff after fetching; read `image/gif` files only. | Avoids a third-party request on every Copy image; Giphy/Tenor-style URLs end in `.gif`; Brave/Chrome only put a PNG still in `files`. |
| 8 | **Fetching is injected, not done in core:** `EditorOptions.imageFetcher?: (url: string) => Promise<File>` (core stays transport-agnostic; client supplies a `fetch`-based one in `src/client/media-fetch.ts`: `mode: 'cors'`, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, 15 s timeout, `Content-Length`/blob size <= 64 MiB, body must start with `GIF8`, returned `File` named from the URL path with type `image/gif`). Without a fetcher, `originalUrl` is ignored and the still file is used as today. | Core calls `fetch`; server-side fetch/proxy. | A server proxy would be an SSRF surface and defeat "the browser does the work". Privacy cost (the third-party host sees the editor's IP once) is the same as viewing the page that hosted the GIF. |
| 9 | **Failure of the original is an error, not a silent still** (user decision): CORS-blocked/failed fetch, timeout, non-GIF body, > 64 MiB -> error toast, nothing inserted, message `Couldn't fetch the original GIF (the site may block it). Save the file and drop it into the editor instead.` The same applies when the animated GIF exceeds `PHOTO_MAX_BYTES` (server 413 text, which names the limit). The still-PNG fallback applies only to > 2048 px (Decision 6). | Fall back to the still with a warning. | User decision. Note the behavior change: Copy image from a GIF on a host without CORS headers used to paste a still and now shows this error (documented under risks). |
| 10 | **`.gif` files dropped or picked** use the same prepare step (Decision 6) and the same upload route; no new UI. | Separate GIF button. | Picker/drop already pass raw `File`s to the uploader. |

## Design

### Shared: `src/shared/gif.ts`

```ts
export type GifResult =
  | { ok: true; width: number; height: number; frames: number }
  | { ok: false; reason: 'not-gif' | 'invalid-gif' | 'over-dimension' | 'too-many-frames' }
export function parseGif(bytes: Uint8Array): GifResult
export type GifSanitizeResult =
  | { ok: true; gif: Uint8Array; width: number; height: number; frames: number }
  | { ok: false; reason: 'not-gif' | 'invalid-gif' | 'over-dimension' | 'too-many-frames' }
export function sanitizeGif(bytes: Uint8Array): GifSanitizeResult
```

One internal walker produces the kept byte ranges; `parseGif` ignores them, `sanitizeGif` concatenates them (+ trailer). Walk: signature (`not-gif`); LSD (needs 13 bytes; width/height 0 -> invalid; > `PHOTO_MAX_SIDE` -> `over-dimension`, checked before any frame); skip global color table (`3 * 2^(n+1)` bytes, bounds-checked); loop on block introducer: `0x21` -> label, sub-block chain (each `size` byte then `size` bytes, terminated by 0; bounds-checked); keep `0xF9` and `0xFF` blocks whose first sub-block is exactly `NETSCAPE2.0`; `0x2C` -> 9-byte descriptor, optional local color table, LZW min-code-size byte (2..8), sub-block chain; count a frame; abort with `too-many-frames` past 500 and when `frames * width * height` would pass the pixel-frames budget; `0x3B` -> done; end of input exactly on a block boundary after at least one frame -> done; anything else -> `invalid-gif`. Requires >= 1 frame. Sub-block data is never inspected.

### Server (`routes/media.ts`)

`/api/media/photos`: after `readUpload`, dispatch on magic bytes (PNG signature vs `GIF87a`/`GIF89a`), insert with the matching `mediaType`, return it in the 201 body. Messages per Decision 5. `StoredMediaType` already covers both.

### Client

- `photo-convert.ts`: new `preparePhoto(file, env?) -> Promise<{ blob: Blob; notice?: string }>`; `convertToPng` stays the internal PNG path. GIF branch per Decision 6 (reads the file into memory once for `parseGif`; PNG branch unchanged and still reads only 24 bytes). `PhotoConvertError` messages unchanged.
- `media-upload.ts`: `createMediaUploader` calls `preparePhoto`, posts the blob (`photo.gif` or `photo.png` filename by type), returns `{ url, notice? }`.
- `media-fetch.ts` (new): `createImageFetcher(fetchImpl?) -> (url) => Promise<File>` per Decision 8; `main.ts` passes `imageFetcher: createImageFetcher()`.

### Core

- `types.ts`: `ImageUploader` result `{ url: string; notice?: string }`; `EditorOptions.imageFetcher?`.
- `editor-image.ts`: `clipboardImageFiles` is replaced by `clipboardImages(data): ImageItem[]` where `ImageItem = { file: File | null; originalUrl?: string }`-style (exact shape settled in step 4: the invariant is "a still file, an original URL, or both"); the Decision 10-of-#21 rule is unchanged; `gifUrlFromClipboardHtml(html)` is a pure function (DOMParser, `https:`, `.gif` path). `insertImages(items, ctx)` resolves each item: if `originalUrl` and `ctx.fetchOriginal` exist, fetch it (progress toast `Fetching GIF...`), use that file; on failure show the Decision 9 error and skip the item; else use the still file. Upload as before; after inserting, a `notice` from the uploader is shown as a warning toast. Picker/drop callers pass plain files (wrapped).
- `editor-lifecycle.ts`: builds `fetchOriginal` from `options.imageFetcher`; paste handler uses `clipboardImages`.

### Edge cases

| Case | Result |
| ---- | ------ |
| Copy image on giphy.com, paste | original GIF fetched, animated GIF stored and inserted |
| Same on a host without CORS | error toast (Decision 9), nothing inserted |
| Animated GIF file, 480x270 | uploaded unchanged, sanitized server-side, stored `image/gif` |
| Animated GIF 3000x2000 | still PNG (downscaled first frame) + warning toast |
| Animated GIF > `PHOTO_MAX_BYTES` | server 413 (limit named), error toast |
| Static GIF (1 frame) | converted to PNG as before |
| GIF with comment/XMP/trailing bytes | stored without them |
| Truncated/corrupt GIF | 422 `invalid GIF` |
| 501 frames, or frames x w x h over the budget | 422 `GIF has too many frames` |
| JPEG/WebP/PNG | unchanged |
| Clipboard with text/plain + text/html + image (Word) | text paste, nothing fetched |

## Testing

- **`src/shared/__tests__/gif.test.ts` (node project):** programmatic GIF builder (header, LSD with optional global color table, GCE, NETSCAPE loop block, comment, XMP application block, N frames using the minimal LZW payload from `GIF_BYTES`, trailer, trailing junk). `parseGif`: dims/frame count (1 and many), `GIF87a` and `GIF89a`; `sanitizeGif`: comment/plain-text/XMP/unknown extensions removed, trailing bytes removed, graphic control + NETSCAPE kept, frame order and local color tables preserved byte-exact, missing trailer at a clean boundary accepted and re-added; rejects: non-GIF, signature only, truncated mid-block, sub-block running past the end, bad LZW min code size, zero frames, zero/oversized dimensions (2049), 501 frames, pixel-frames budget exceeded, extension chain without terminator.
- **`media.test.ts` (route):** PNG still works; animated GIF (3 frames) -> 201 `image/gif`, stored bytes sanitized (no comment/trailing), `GET /media/{id}` serves `image/gif`; 413 over `PHOTO_MAX_BYTES` for a GIF; 415 for JPEG/ICO/SVG now says `expected a PNG or GIF image` (update the existing assertion and drop `GIF_BYTES` from the non-PNG list); 422s for invalid/oversized/too-many-frames; `POST /api/media` unchanged.
- **Client (dom): `photo-convert.test.ts`** — animated GIF <= 2048 passes through (same `File`/bytes, no decode); animated > 2048 -> decode+encode path with the fitted size and a `notice`; static GIF -> PNG path; unparseable "GIF" -> PNG path (decoder decides); other types unchanged. **`media-upload.test.ts`** — blob type decides the filename; `notice` passed through; errors unchanged. **`media-fetch.test.ts`** — success (type forced to `image/gif`, name from URL), non-GIF body rejected, oversized `Content-Length` rejected, non-2xx, network failure, timeout (fake timers); request options (`credentials: 'omit'`, no referrer).
- **Core (dom):** `editor-image.test.ts` — `gifUrlFromClipboardHtml` (Chrome-style `<meta><img src>`, uppercase `.GIF`, query string, `http:` and relative and `data:` rejected, non-gif URL, no img, multiple imgs -> first) and the `clipboardImages` truth table incl. the unchanged Word rule; `editor-image-insert.test.ts` on a real mount with fake uploader+fetcher — Copy-image paste (still png + html gif url) uploads the fetched GIF file not the still; fetch failure -> error toast, uploader not called, nothing inserted; no fetcher configured -> still uploaded as before; uploader `notice` shown as a warning after insertion; Word-style paste still text.
- **Not unit-testable in happy-dom:** the real Brave clipboard flavors, real cross-origin CORS behavior, animated rendering. Manual below.
- **Manual (`npm run dev`, needs Postgres; `AUTH_DISABLED=1`):** in Brave: right-click Copy image on a giphy.com GIF -> paste (animates in the editor and anonymously on the reader; `/media/{id}` is `image/gif`, size matches the original within sanitizer removals); drag a saved `.gif` in; pick one via the toolbar Image button; a > 2048 px animated GIF (warning toast, still PNG); Copy image from a non-CORS host (error toast with the save-and-drop advice); a static GIF becomes PNG; Firefox if available; console-log `clipboardData.types` once to confirm the flavors assumption behind Decision 7.
- **Gate before filing:** `npm run typecheck && npm run lint && WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm run test:coverage && npm run build`.

## Steps

- [x] 1. `src/shared/gif.ts` (`parseGif`, `sanitizeGif`) + caps in `media-policy.ts` + `gif.test.ts` with the GIF builder (full matrix above).
- [x] 2. Server: `POST /api/media/photos` accepts PNG or GIF (magic-byte dispatch, error mapping, `mediaType` in the response); `media.test.ts` updates/additions; `docs/api.md` (route table, error list, GIF validation paragraph).
- [x] 3. Client prepare step: `preparePhoto` with the GIF branch and `notice`, `createMediaUploader` returns `{ url, notice? }`, `ImageUploader` type change, `insertImages` shows `notice` as a warning toast; tests.
- [x] 4. Copy-image originals: `gifUrlFromClipboardHtml`, `clipboardImages`, `EditorOptions.imageFetcher`, `insertImages` original resolution and the Decision 9 error, `src/client/media-fetch.ts` wired in `main.ts`; tests; `docs/architecture.md` (photos paragraph: GIF path, fetch, privacy note).

## Risks & open questions

- *Accepted:* Behavior change for Copy image of a GIF on hosts that send no CORS headers: it used to paste a still, now it shows an error telling the user to save and drop the file (user decision, Decision 9). Hosts with CORS (Giphy) work.
- *Accepted:* The browser makes a cross-origin request to the GIF's host on paste (`credentials: 'omit'`, `referrerPolicy: 'no-referrer'`); that host sees the editor's IP, like viewing the original page did.
- *Accepted:* Animated GIFs stay as large as they arrive (<= `PHOTO_MAX_BYTES`, default 15 MiB) in Postgres; no re-compression. Quotas/GC remain out of scope as in #21.
- *Accepted:* LZW data is not decoded, so a structurally valid GIF with corrupt pixel data is stored and renders broken (harmless: `nosniff` + `CSP default-src 'none'`). The frame and pixel-frame caps (Decision 4) bound decoder work for readers.
- *Accepted:* The exact clipboard flavors Brave puts on "Copy image" are inferred, not observed; step 4's manual check confirms them. If Brave also exposes the original GIF as a file, the fetch is simply unnecessary there and nothing breaks.
- *Accepted:* Animated WebP/APNG and animated AVIF still flatten to a still PNG.
- *Accepted:* GIFs that omit the trailer and end mid-block are rejected as invalid (rare, files are re-saveable).
- *Accepted:* The Copy-image fetch can send an unauthenticated GET to any `https:` host named in clipboard HTML (including intranet addresses); the response is opaque to the page unless CORS allows it, and nothing is sent to our server (review finding C4).
- *Accepted:* The client's remote-GIF cap (64 MiB, Decision 8) is larger than the default `PHOTO_MAX_BYTES` (15 MiB): a huge original costs the user a download before the server's 413 (review finding C3).

## Implementation notes

Deviations from the plan as written (none changes a decision's intent; all found while implementing or in review):

- 2026-11-26: **Over-dimension is reported after the walk**, not "before any frame" (Design, `shared/gif.ts`). Decision 6 needs the frame count of an oversize GIF to choose between the still-PNG fallback (animated) and the PNG path (static), so `GifOverDimension` carries `{ width, height, frames }` and oversize GIFs skip the frame/pixel caps; they must still be well-formed.
- 2026-11-26: **The pixel budget charges each frame's own declared area**, not `frames × screen width × height` (Decision 4), and every frame side must be <= 2048. The screen-based figure let a 1x1 screen with 65535x65535 frames bypass the budget (review finding C1, major). Typical GIFs (frames equal the screen) are unaffected.
- 2026-11-26: **The sanitizer keeps at most one `NETSCAPE2.0` block and one graphic control (block size 4) per image** (Decision 3), bounding the output and the walker's allocation against junk-extension amplification (review finding C2, major).
- 2026-11-26: `clipboardImages(data, withOriginals)` takes a flag and attaches the URL only when at most one file is pasted (Decision 7/8: without a fetcher the old behavior must stay; several pasted files are not a "Copy image"). `gifUrlFromClipboardHtml` inspects only the **first** `<img>` (Decision 7 is ambiguous between "first img" and "first GIF img"; a leading non-GIF image makes the paste fall back to the still). The route's rejection mapping lives in one exhaustive record (`PHOTO_REJECTIONS`).
- Known limitation: a graphic control extension that preceded a (dropped) plain-text extension attaches to the next image after sanitizing; only GIFs using plain-text extensions are affected (review finding A4).

## Review

Mode: sub-agents

Reviewed by three fresh-context sub-agents (A plan conformance & correctness, B code quality, C security & scalability). Their results were reconciled by reading the cited code; blockers: none.

| # | Lens | Severity | Finding | Classification | Outcome |
| - | ---- | -------- | ------- | -------------- | ------- |
| C1 | C | major | GIF decode budget used the logical screen, not each frame's own rect (`gif.ts` image branch) | Related, verified | Fixed `c169ea2`: per-frame area budget, frame sides <= 2048, tests incl. 1x1 screen + 65535x65535 frame |
| C2 | C | major | Kept graphic-control/NETSCAPE blocks unbounded (allocation + stored junk amplification) | Related, verified | Fixed `c169ea2`: one loop block, one size-4 GCE per image; tests with 2000 junk pairs |
| B1 | B | minor | Route's PNG-then-GIF cascade lost exhaustiveness | Related | Fixed `302ead3`: `sanitizePhoto` + `Record<PhotoFailure, ...>` |
| B5 | B | minor | Fetcher discarded the cause; nothing in the console for the CORS/timeout case | Related | Fixed `a376357`: `console.warn` with origin only (URLs carry tracking params), tested |
| A1-A3 | A | minor/nit | First-`<img>` reading, over-dimension timing, `clipboardImages` flag undocumented | Related | Recorded under Implementation notes (deviations) |
| A4 | A | nit | Graphic control before a dropped plain-text block shifts to the next frame | Related, rare | Accepted: known limitation noted above |
| C3 | C | minor | 64 MiB client cap vs 15 MiB server cap | Dismissed | Plan Decision 8 chose the cap deliberately; client-only cost; recorded as accepted risk |
| C4 | C | nit | Fetch may GET any `https:` host from clipboard HTML | Dismissed | Plan Decision 8 accepts the privacy/network cost; `credentials: 'omit'`, no referrer; recorded as accepted risk |
| B2, B3, B4, B7, B8, B9 | B | minor/nit | `walk` complexity, GIF signature check repeated in 4 places, redundant `assertImageFile`/head reads in `preparePhoto`, wider `ImageInput` model, `insertImages` length, `kept` allocation for `parseGif` | Dismissed | Optional refactors with no behavior impact; not worth widening this fix. No issue opened (user did not ask) |
| B6 | B | nit | GIF rejections not logged server-side | Dismissed | Matches existing PNG behavior |

No unrelated pre-existing issues were found.

Manual review: the user asked for review, file and merge in one go, so the manual-review pause was waived at their request. Before this review the Copy-image path (simulated paste with Giphy HTML), the CORS-failure path and stored-GIF integrity (75 frames, 239,321 bytes, identical to the original) were verified in Brave against a local dev server.

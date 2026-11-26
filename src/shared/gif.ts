// ─── GIF structural parsing & sanitizing ─────────────────────────────────────
// Env-agnostic (Uint8Array only) so the browser can ask "is this animated, and
// how big?" and the server can validate and REWRITE uploads with the same
// grammar. Nothing is decoded: the walker follows the block structure and
// never inspects LZW data, so a structurally valid GIF with corrupt pixel data
// is accepted (it renders broken; harmless under nosniff + CSP none).
//
// Sanitizing keeps only: header, logical screen descriptor, global color
// table, graphic control extensions, the NETSCAPE2.0 loop-count extension and
// the image blocks (descriptor, local color table, LZW data), then writes one
// trailer. Comments, plain-text, every other application extension (XMP, ICC),
// unknown extensions and all bytes after the trailer are dropped, so metadata
// and polyglot payloads never reach public storage.

import { GIF_MAX_FRAMES, GIF_MAX_PIXEL_FRAMES, PHOTO_MAX_SIDE } from './media-policy'

export type GifFailure = 'not-gif' | 'invalid-gif' | 'over-dimension' | 'too-many-frames'

/** An otherwise well-formed GIF whose screen exceeds PHOTO_MAX_SIDE. It
 *  carries what the walk learned so callers can tell an animated oversize GIF
 *  (the browser's still-PNG fallback + notice) from a static one. */
export interface GifOverDimension {
  ok: false
  reason: 'over-dimension'
  width: number
  height: number
  frames: number
}

export type GifFailureResult =
  | { ok: false; reason: Exclude<GifFailure, 'over-dimension'> }
  | GifOverDimension

export type GifResult =
  | { ok: true; width: number; height: number; frames: number }
  | GifFailureResult

export type GifSanitizeResult =
  | { ok: true; gif: Uint8Array; width: number; height: number; frames: number }
  | GifFailureResult

type Range = readonly [start: number, end: number]

type Walked =
  | { ok: true; width: number; height: number; frames: number; kept: Range[] }
  | GifFailureResult

const INVALID = { ok: false, reason: 'invalid-gif' } as const
const NETSCAPE = 'NETSCAPE2.0'

const EXTENSION = 0x21
const IMAGE = 0x2c
const TRAILER = 0x3b
const GRAPHIC_CONTROL = 0xf9
const APPLICATION = 0xff

/** Index just past the sub-block chain starting at `pos` (its 0-length
 *  terminator included), or -1 when the chain runs off the end. */
function skipSubBlocks(b: Uint8Array, pos: number): number {
  for (;;) {
    if (pos >= b.length) return -1
    const size = b[pos]
    pos += 1
    if (size === 0) return pos
    pos += size
    if (pos > b.length) return -1
  }
}

/** True when the application extension whose first sub-block starts at
 *  `first` is NETSCAPE2.0 (size byte 11 + the 11-byte identifier). */
function isNetscape(b: Uint8Array, first: number): boolean {
  if (first + 12 > b.length || b[first] !== 11) return false
  for (let i = 0; i < NETSCAPE.length; i++) {
    if (b[first + 1 + i] !== NETSCAPE.charCodeAt(i)) return false
  }
  return true
}

/** Size in bytes of a color table whose packed-field size bits are `n`. */
const colorTableBytes = (packed: number): number => 3 * (1 << ((packed & 7) + 1))

function walk(b: Uint8Array): Walked {
  if (b.length < 6) return { ok: false, reason: 'not-gif' }
  const sig = String.fromCharCode(b[0], b[1], b[2], b[3], b[4], b[5])
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return { ok: false, reason: 'not-gif' }
  if (b.length < 13) return INVALID

  const width = b[6] | (b[7] << 8)
  const height = b[8] | (b[9] << 8)
  if (width === 0 || height === 0) return INVALID
  // An oversize screen is still walked (frames counted, structure checked) and
  // reported at the end; the frame/pixel caps only guard in-range GIFs.
  const oversize = width > PHOTO_MAX_SIDE || height > PHOTO_MAX_SIDE

  const screenPacked = b[10]
  let pos = 13
  if (screenPacked & 0x80) pos += colorTableBytes(screenPacked)
  if (pos > b.length) return INVALID

  const kept: Range[] = [[0, pos]]
  let frames = 0

  for (;;) {
    if (pos === b.length) break // no trailer, but a clean block boundary
    const introducer = b[pos]
    if (introducer === TRAILER) break // anything after it is discarded

    if (introducer === EXTENSION) {
      if (pos + 2 > b.length) return INVALID
      const label = b[pos + 1]
      const start = pos
      const first = pos + 2
      const end = skipSubBlocks(b, first)
      if (end < 0) return INVALID
      if (label === GRAPHIC_CONTROL || (label === APPLICATION && isNetscape(b, first))) {
        kept.push([start, end])
      }
      pos = end
      continue
    }

    if (introducer === IMAGE) {
      const start = pos
      if (pos + 10 > b.length) return INVALID
      const localPacked = b[pos + 9]
      pos += 10
      if (localPacked & 0x80) pos += colorTableBytes(localPacked)
      if (pos >= b.length) return INVALID
      const minCodeSize = b[pos]
      if (minCodeSize < 2 || minCodeSize > 8) return INVALID
      const end = skipSubBlocks(b, pos + 1)
      if (end < 0) return INVALID
      frames++
      if (
        !oversize &&
        (frames > GIF_MAX_FRAMES || frames * width * height > GIF_MAX_PIXEL_FRAMES)
      ) {
        return { ok: false, reason: 'too-many-frames' }
      }
      kept.push([start, end])
      pos = end
      continue
    }

    return INVALID
  }

  if (frames === 0) return INVALID
  if (oversize) return { ok: false, reason: 'over-dimension', width, height, frames }
  return { ok: true, width, height, frames, kept }
}

/** Dimensions and frame count of a valid GIF (the sanitizer's checks, no output). */
export function parseGif(bytes: Uint8Array): GifResult {
  const walked = walk(bytes)
  if (!walked.ok) return walked
  return { ok: true, width: walked.width, height: walked.height, frames: walked.frames }
}

/** The GIF rewritten with only the allowlisted blocks (see file header). */
export function sanitizeGif(bytes: Uint8Array): GifSanitizeResult {
  const walked = walk(bytes)
  if (!walked.ok) return walked
  let length = 1 // trailer
  for (const [start, end] of walked.kept) length += end - start
  const gif = new Uint8Array(length)
  let at = 0
  for (const [start, end] of walked.kept) {
    gif.set(bytes.subarray(start, end), at)
    at += end - start
  }
  gif[at] = TRAILER
  return { ok: true, gif, width: walked.width, height: walked.height, frames: walked.frames }
}

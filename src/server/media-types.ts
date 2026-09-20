// ─── Upload type & dimension policy ──────────────────────────────────────────
// The upload route's content gate. Client-declared content types are advice,
// not truth: a row's media_type comes from magic-byte sniffing ONLY. Raster
// images only — no SVG (script-in-content vector). Declared dimensions are
// parsed from the header and capped, because a ≤2 MiB file can claim a
// 50000×50000 canvas and every reader's decoder would pay for it, forever,
// behind an immutable cache header.

import type { StoredMediaType } from './db/media-repository'

/** Hard ceiling per side and total pixels; 8192² ≈ 67 MP headroom for the
 *  future editor-image iteration while still rejecting any bomb. */
export const MAX_MEDIA_SIDE = 8192
export const MAX_MEDIA_PIXELS = 40_000_000

export interface MediaProbe {
  mediaType: StoredMediaType
  width: number
  height: number
}

export type MediaRejection =
  | { ok: false; reason: 'unsupported-type' }
  | { ok: false; reason: 'over-dimension'; width: number; height: number }

export type MediaProbeResult = { ok: true; media: MediaProbe } | MediaRejection

/**
 * Identify bytes by header and read declared dimensions. Returns
 * `unsupported-type` for anything outside the allowlist (including SVG,
 * HTML and executables) — the caller maps rejections to 415.
 */
export function probeMedia(buf: Buffer): MediaProbeResult {
  const dims = sniffPng(buf) ?? sniffGif(buf) ?? sniffWebp(buf) ?? sniffJpeg(buf) ?? sniffIco(buf)
  if (!dims) return { ok: false, reason: 'unsupported-type' }
  const { mediaType, width, height } = dims
  if (width > MAX_MEDIA_SIDE || height > MAX_MEDIA_SIDE || width * height > MAX_MEDIA_PIXELS) {
    return { ok: false, reason: 'over-dimension', width, height }
  }
  return { ok: true, media: { mediaType, width, height } }
}

function sniffPng(buf: Buffer): (MediaProbe & { mediaType: 'image/png' }) | null {
  if (buf.length < 24) return null
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null
  return { mediaType: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function sniffGif(buf: Buffer): (MediaProbe & { mediaType: 'image/gif' }) | null {
  const sig = buf.toString('ascii', 0, 6)
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null
  if (buf.length < 10) return null
  return { mediaType: 'image/gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
}

function sniffWebp(buf: Buffer): (MediaProbe & { mediaType: 'image/webp' }) | null {
  if (buf.length < 16) return null
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = buf.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') {
    // lossy: frame tag (10 bytes) then 0x9d 0x01 0x2a, 14-bit (w-1),(h-1)
    if (buf.length < 30) return null
    const marker = buf.toString('hex', 23, 26)
    if (marker !== '9d012a') return null
    return {
      mediaType: 'image/webp',
      width: (buf.readUInt16LE(26) & 0x3fff) + 1,
      height: (buf.readUInt16LE(28) & 0x3fff) + 1,
    }
  }
  if (chunk === 'VP8L') {
    // lossless: 0x2f then 14-bit (w-1),(h-1) packed in 4 bytes
    if (buf.length < 25) return null
    if (buf[20] !== 0x2f) return null
    const bits = buf.readUInt32LE(21)
    return {
      mediaType: 'image/webp',
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  if (chunk === 'VP8X') {
    // extended: 10-byte chunk body, 24-bit (w-1),(h-1) at offsets 4,7 (rel 24)
    if (buf.length < 34) return null
    return {
      mediaType: 'image/webp',
      width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
      height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
    }
  }
  return null
}

/** JPEG: walk marker segments from SOI looking for a baseline/progressive
 *  SOFn. Stops at SOS (compressed data begins) and on malformed input. */
function sniffJpeg(buf: Buffer): (MediaProbe & { mediaType: 'image/jpeg' }) | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null
  let pos = 2
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) {
      pos++
      continue
    }
    const marker = buf[pos + 1]
    if (marker === 0xd9 || marker === 0xda) return null // EOI / SOS: no SOF found
    // Standalone markers (TEM, RSTn, SOI) carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2
      continue
    }
    const len = buf.readUInt16BE(pos + 2)
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof && pos + 9 <= buf.length) {
      return {
        mediaType: 'image/jpeg',
        height: buf.readUInt16BE(pos + 5),
        width: buf.readUInt16BE(pos + 7),
      }
    }
    if (len < 2) return null
    pos += 2 + len
  }
  return null
}

/** ICO: reserved=0, type=1; first entry's w/h at 6/7 (0 means 256). */
function sniffIco(buf: Buffer): (MediaProbe & { mediaType: 'image/vnd.microsoft.icon' }) | null {
  if (buf.length < 8) return null
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null
  if (buf.readUInt16LE(4) < 1) return null // at least one image
  const width = buf[6] === 0 ? 256 : buf[6]
  const height = buf[7] === 0 ? 256 : buf[7]
  return { mediaType: 'image/vnd.microsoft.icon', width, height }
}

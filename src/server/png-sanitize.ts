// ─── PNG structural validation & metadata stripping ──────────────────────────
// The photo upload route accepts ONLY a PNG (the browser converts photos before
// upload) but must not trust the client: any editor can call the API directly,
// and the stored bytes are served publicly. This walks the chunk structure —
// no pixel decoding, no native dependency — verifying every CRC, enforcing the
// dimension cap, and REWRITING the file with an allowlist of chunks. EXIF
// (`eXIf`), text (`tEXt`/`zTXt`/`iTXt`), timestamps, APNG animation chunks,
// unknown chunks and any bytes after `IEND` (polyglot payloads) never reach
// storage. The IDAT zlib stream is NOT inflated: a structurally valid PNG with
// corrupt pixel data is stored and renders broken, which is harmless (the
// bytes are served `nosniff` under `CSP default-src 'none'`).

import { crc32 } from 'node:zlib'
import { PHOTO_MAX_SIDE } from '../shared/media-policy'

export type PngSanitizeResult =
  | { ok: true; png: Buffer; width: number; height: number }
  | { ok: false; reason: 'not-png' | 'invalid-png' | 'over-dimension' }

const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex')

/** Critical chunks plus the ancillary ones that affect how pixels display
 *  (transparency, gamma/colour space). Everything else is dropped. */
const KEEP: Readonly<Record<string, true>> = {
  IHDR: true,
  PLTE: true,
  IDAT: true,
  IEND: true,
  tRNS: true,
  gAMA: true,
  cHRM: true,
  sRGB: true,
  iCCP: true,
}

/** Legal bit depths per PNG colour type (PNG spec table 11.1). */
const DEPTHS: Readonly<Record<number, readonly number[]>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
}

const INVALID = { ok: false, reason: 'invalid-png' } as const

export function sanitizePng(input: Buffer): PngSanitizeResult {
  if (input.length < SIGNATURE.length || !input.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
    return { ok: false, reason: 'not-png' }
  }

  const kept: Buffer[] = [SIGNATURE]
  let pos = SIGNATURE.length
  let width = 0
  let height = 0
  let colorType = 0
  let first = true
  let sawPlte = false
  let sawIdat = false
  let inIdatRun = false
  let idatRunEnded = false
  let sawIend = false

  while (pos + 12 <= input.length) {
    const len = input.readUInt32BE(pos)
    const end = pos + 12 + len
    if (len > 0x7fffffff || end > input.length) return INVALID

    const type = input.toString('latin1', pos + 4, pos + 8)
    if (!/^[A-Za-z]{4}$/.test(type)) return INVALID
    // CRC covers type + data.
    if (crc32(input.subarray(pos + 4, pos + 8 + len)) !== input.readUInt32BE(pos + 8 + len)) {
      return INVALID
    }

    if (first) {
      if (type !== 'IHDR' || len !== 13) return INVALID
      width = input.readUInt32BE(pos + 8)
      height = input.readUInt32BE(pos + 12)
      const depth = input[pos + 16]
      colorType = input[pos + 17]
      const compression = input[pos + 18]
      const filter = input[pos + 19]
      const interlace = input[pos + 20]
      if (width === 0 || height === 0) return INVALID
      if (compression !== 0 || filter !== 0 || interlace > 1) return INVALID
      if (!DEPTHS[colorType]?.includes(depth)) return INVALID
      if (width > PHOTO_MAX_SIDE || height > PHOTO_MAX_SIDE) {
        return { ok: false, reason: 'over-dimension' }
      }
      first = false
    } else if (type === 'IHDR') {
      return INVALID
    }

    // IDAT chunks must be one contiguous run (kept or dropped neighbours
    // between them are both a structural error).
    if (type === 'IDAT') {
      if (idatRunEnded) return INVALID
      inIdatRun = true
      sawIdat = true
    } else if (inIdatRun) {
      inIdatRun = false
      idatRunEnded = true
    }

    if (type === 'PLTE') sawPlte = true

    if (type === 'IEND') {
      if (len !== 0) return INVALID
      kept.push(input.subarray(pos, end))
      sawIend = true
      break // bytes after IEND are discarded
    }

    if (KEEP[type] === true) kept.push(input.subarray(pos, end))
    pos = end
  }

  if (!sawIend || !sawIdat) return INVALID
  if (colorType === 3 && !sawPlte) return INVALID

  return { ok: true, png: Buffer.concat(kept), width, height }
}

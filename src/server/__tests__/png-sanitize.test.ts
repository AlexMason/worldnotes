import { describe, it, expect } from 'vitest'
import { sanitizePng } from '../png-sanitize'
import { PHOTO_MAX_SIDE } from '../../shared/media-policy'
import {
  IDAT_DATA,
  PNG_SIGNATURE,
  buildPng,
  ihdrData,
  pngBytes,
  pngChunk,
  GIF_BYTES,
  JPEG_BYTES,
} from './helpers/media-fixtures'

const IHDR = (w = 4, h = 3) => pngChunk('IHDR', ihdrData(w, h))
const IDAT = () => pngChunk('IDAT', IDAT_DATA)
const IEND = () => pngChunk('IEND', Buffer.alloc(0))

/** Chunk types in a PNG, in order (test-side parser, independent of the SUT). */
function chunkTypes(png: Buffer): string[] {
  const types: string[] = []
  let pos = 8
  while (pos + 12 <= png.length) {
    types.push(png.toString('latin1', pos + 4, pos + 8))
    pos += 12 + png.readUInt32BE(pos)
  }
  return types
}

describe('sanitizePng', () => {
  it('passes a minimal PNG through byte-identically', () => {
    const input = pngBytes(4, 3)
    const res = sanitizePng(input)
    expect(res).toMatchObject({ ok: true, width: 4, height: 3 })
    if (res.ok) expect(res.png.equals(input)).toBe(true)
  })

  it('accepts exactly PHOTO_MAX_SIDE on either axis', () => {
    expect(sanitizePng(pngBytes(PHOTO_MAX_SIDE, 1))).toMatchObject({ ok: true })
    expect(sanitizePng(pngBytes(1, PHOTO_MAX_SIDE))).toMatchObject({ ok: true })
  })

  it('rejects a side over PHOTO_MAX_SIDE as over-dimension', () => {
    expect(sanitizePng(pngBytes(PHOTO_MAX_SIDE + 1, 1))).toEqual({
      ok: false,
      reason: 'over-dimension',
    })
    expect(sanitizePng(pngBytes(1, PHOTO_MAX_SIDE + 1))).toEqual({
      ok: false,
      reason: 'over-dimension',
    })
  })

  it('drops metadata, text, timestamp and unknown chunks', () => {
    const input = buildPng([
      IHDR(),
      pngChunk('eXIf', Buffer.from('GPS!')),
      pngChunk('tEXt', Buffer.from('Comment\0secret')),
      pngChunk('iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0<x/>')),
      pngChunk('zTXt', Buffer.from('k\0\0zz')),
      pngChunk('tIME', Buffer.alloc(7)),
      pngChunk('pHYs', Buffer.alloc(9)),
      pngChunk('vpAg', Buffer.alloc(9)), // unknown ancillary
      IDAT(),
      IEND(),
    ])
    const res = sanitizePng(input)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(chunkTypes(res.png)).toEqual(['IHDR', 'IDAT', 'IEND'])
    expect(res.png.includes(Buffer.from('GPS!'))).toBe(false)
    expect(res.png.includes(Buffer.from('secret'))).toBe(false)
  })

  it('keeps display-affecting chunks in order', () => {
    const input = buildPng([
      IHDR(),
      pngChunk('gAMA', Buffer.alloc(4)),
      pngChunk('sRGB', Buffer.alloc(1)),
      pngChunk('cHRM', Buffer.alloc(32)),
      pngChunk('tRNS', Buffer.alloc(2)),
      IDAT(),
      IEND(),
    ])
    const res = sanitizePng(input)
    expect(res.ok).toBe(true)
    if (res.ok)
      expect(chunkTypes(res.png)).toEqual(['IHDR', 'gAMA', 'sRGB', 'cHRM', 'tRNS', 'IDAT', 'IEND'])
  })

  it('keeps a palette for indexed images and requires it', () => {
    const indexed = (withPlte: boolean) =>
      buildPng([
        pngChunk('IHDR', ihdrData(2, 2, { colorType: 3, depth: 8 })),
        ...(withPlte ? [pngChunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255]))] : []),
        IDAT(),
        IEND(),
      ])
    const ok = sanitizePng(indexed(true))
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(chunkTypes(ok.png)).toContain('PLTE')
    expect(sanitizePng(indexed(false))).toEqual({ ok: false, reason: 'invalid-png' })
  })

  it('discards everything after IEND (polyglot payloads)', () => {
    const input = Buffer.concat([pngBytes(4, 3), Buffer.from('<?php system($_GET[0]); ?>')])
    const res = sanitizePng(input)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.png.equals(pngBytes(4, 3))).toBe(true)
  })

  it('degrades an APNG to its default image', () => {
    const input = buildPng([
      IHDR(),
      pngChunk('acTL', Buffer.alloc(8)),
      pngChunk('fcTL', Buffer.alloc(26)),
      IDAT(),
      pngChunk('fcTL', Buffer.alloc(26)),
      pngChunk('fdAT', Buffer.alloc(8)),
      IEND(),
    ])
    const res = sanitizePng(input)
    expect(res.ok).toBe(true)
    if (res.ok) expect(chunkTypes(res.png)).toEqual(['IHDR', 'IDAT', 'IEND'])
  })

  it('accepts several contiguous IDAT chunks', () => {
    const res = sanitizePng(buildPng([IHDR(), IDAT(), IDAT(), IEND()]))
    expect(res.ok).toBe(true)
    if (res.ok) expect(chunkTypes(res.png)).toEqual(['IHDR', 'IDAT', 'IDAT', 'IEND'])
  })

  it('rejects non-PNG bytes as not-png', () => {
    for (const bytes of [
      GIF_BYTES,
      JPEG_BYTES,
      Buffer.alloc(0),
      Buffer.from('hello world, not a png'),
    ]) {
      expect(sanitizePng(bytes)).toEqual({ ok: false, reason: 'not-png' })
    }
  })

  describe('invalid-png', () => {
    const invalid = { ok: false, reason: 'invalid-png' }

    it('signature only', () => {
      expect(sanitizePng(PNG_SIGNATURE)).toEqual(invalid)
    })

    it('bad CRC', () => {
      const png = Buffer.from(pngBytes(4, 3))
      png[png.length - 20] ^= 0xff // inside IDAT payload/CRC region
      expect(sanitizePng(png)).toEqual(invalid)
    })

    it('chunk length running past the end of the file', () => {
      const png = pngBytes(4, 3)
      expect(sanitizePng(png.subarray(0, png.length - 20))).toEqual(invalid)
      const huge = Buffer.from(png)
      huge.writeUInt32BE(0xffffffff, 8) // IHDR length
      expect(sanitizePng(huge)).toEqual(invalid)
    })

    it('first chunk is not IHDR', () => {
      expect(sanitizePng(buildPng([IDAT(), IHDR(), IEND()]))).toEqual(invalid)
    })

    it('IHDR with the wrong length or a duplicate IHDR', () => {
      expect(sanitizePng(buildPng([pngChunk('IHDR', Buffer.alloc(12)), IDAT(), IEND()]))).toEqual(
        invalid,
      )
      expect(sanitizePng(buildPng([IHDR(), IHDR(), IDAT(), IEND()]))).toEqual(invalid)
    })

    it('zero dimensions', () => {
      expect(sanitizePng(buildPng([IHDR(0, 3), IDAT(), IEND()]))).toEqual(invalid)
      expect(sanitizePng(buildPng([IHDR(3, 0), IDAT(), IEND()]))).toEqual(invalid)
    })

    it('illegal colour type / depth combination, compression, filter, interlace', () => {
      const withIhdr = (data: Buffer) => buildPng([pngChunk('IHDR', data), IDAT(), IEND()])
      expect(sanitizePng(withIhdr(ihdrData(2, 2, { colorType: 2, depth: 4 })))).toEqual(invalid)
      expect(sanitizePng(withIhdr(ihdrData(2, 2, { colorType: 1 })))).toEqual(invalid)
      expect(sanitizePng(withIhdr(ihdrData(2, 2, { interlace: 2 })))).toEqual(invalid)
      const badCompression = ihdrData(2, 2)
      badCompression[10] = 1
      expect(sanitizePng(withIhdr(badCompression))).toEqual(invalid)
      const badFilter = ihdrData(2, 2)
      badFilter[11] = 1
      expect(sanitizePng(withIhdr(badFilter))).toEqual(invalid)
    })

    it('missing IDAT or missing IEND', () => {
      expect(sanitizePng(buildPng([IHDR(), IEND()]))).toEqual(invalid)
      expect(sanitizePng(buildPng([IHDR(), IDAT()]))).toEqual(invalid)
    })

    it('IEND with a payload', () => {
      expect(sanitizePng(buildPng([IHDR(), IDAT(), pngChunk('IEND', Buffer.alloc(1))]))).toEqual(
        invalid,
      )
    })

    it('non-contiguous IDAT, whether the separator is kept or dropped', () => {
      expect(
        sanitizePng(buildPng([IHDR(), IDAT(), pngChunk('gAMA', Buffer.alloc(4)), IDAT(), IEND()])),
      ).toEqual(invalid)
      expect(
        sanitizePng(
          buildPng([IHDR(), IDAT(), pngChunk('tEXt', Buffer.from('a\0b')), IDAT(), IEND()]),
        ),
      ).toEqual(invalid)
    })

    it('a chunk type that is not four ASCII letters', () => {
      expect(
        sanitizePng(buildPng([IHDR(), pngChunk('ID4T', Buffer.alloc(1)), IDAT(), IEND()])),
      ).toEqual(invalid)
    })
  })
})

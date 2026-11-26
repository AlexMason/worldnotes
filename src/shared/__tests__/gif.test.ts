import { describe, it, expect } from 'vitest'
import { parseGif, sanitizeGif } from '../gif'
import { GIF_MAX_FRAMES, PHOTO_MAX_SIDE } from '../media-policy'
import {
  GIF_GCE,
  GIF_NETSCAPE,
  GIF_PLAIN_TEXT,
  GIF_TRAILER,
  animatedGif,
  bytes,
  gifComment,
  gifFrame,
  gifHeader,
  gifXmp,
} from './gif-fixtures'

const text = (u: Uint8Array) => new TextDecoder('latin1').decode(u)
const enc = (s: string) => new TextEncoder().encode(s)
const same = (a: Uint8Array, b: Uint8Array) => expect(Array.from(a)).toEqual(Array.from(b))

describe('parseGif', () => {
  it('reads dimensions and counts frames', () => {
    expect(parseGif(animatedGif(1, 40, 30))).toEqual({ ok: true, width: 40, height: 30, frames: 1 })
    expect(parseGif(animatedGif(7, 40, 30))).toEqual({ ok: true, width: 40, height: 30, frames: 7 })
  })

  it('accepts GIF87a and a file without a global color table', () => {
    const g87 = bytes(
      gifHeader(2, 2, { version: 'GIF87a', gct: false }),
      gifFrame(2, 2),
      GIF_TRAILER,
    )
    expect(parseGif(g87)).toMatchObject({ ok: true, width: 2, height: 2, frames: 1 })
  })

  it('accepts local color tables', () => {
    const gif = bytes(gifHeader(), gifFrame(1, 1, { lct: true }), GIF_TRAILER)
    expect(parseGif(gif)).toMatchObject({ ok: true, frames: 1 })
  })

  it('accepts exactly the frame cap and PHOTO_MAX_SIDE', () => {
    expect(parseGif(animatedGif(GIF_MAX_FRAMES))).toMatchObject({
      ok: true,
      frames: GIF_MAX_FRAMES,
    })
    expect(parseGif(bytes(gifHeader(PHOTO_MAX_SIDE, 1), gifFrame(), GIF_TRAILER))).toMatchObject({
      ok: true,
    })
  })

  it('rejects non-GIF bytes as not-gif', () => {
    for (const input of [
      new Uint8Array(0),
      Uint8Array.from([0x47, 0x49, 0x46]),
      enc('PNG? definitely not a gif'),
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ]) {
      expect(parseGif(input)).toEqual({ ok: false, reason: 'not-gif' })
    }
  })

  describe('invalid-gif', () => {
    const invalid = { ok: false, reason: 'invalid-gif' }

    it('signature only / short screen descriptor', () => {
      expect(parseGif(enc('GIF89a'))).toEqual(invalid)
      expect(parseGif(Uint8Array.from(gifHeader().slice(0, 10)))).toEqual(invalid)
    })

    it('global color table running past the end', () => {
      const truncated = gifHeader().slice(0, 14) // GCT flagged but only 1 of 6 bytes present
      expect(parseGif(Uint8Array.from(truncated))).toEqual(invalid)
    })

    it('zero width or height', () => {
      expect(parseGif(bytes(gifHeader(0, 1), gifFrame(), GIF_TRAILER))).toEqual(invalid)
      expect(parseGif(bytes(gifHeader(1, 0), gifFrame(), GIF_TRAILER))).toEqual(invalid)
    })

    it('a file with no image blocks', () => {
      expect(parseGif(bytes(gifHeader(), GIF_TRAILER))).toEqual(invalid)
      expect(parseGif(bytes(gifHeader(), GIF_GCE, GIF_TRAILER))).toEqual(invalid)
      expect(parseGif(bytes(gifHeader()))).toEqual(invalid)
    })

    it('truncated inside an image block, extension, or sub-block', () => {
      const full = bytes(gifHeader(), gifFrame(), GIF_TRAILER)
      expect(parseGif(full.subarray(0, full.length - 4))).toEqual(invalid) // mid LZW data
      expect(parseGif(full.subarray(0, gifHeader().length + 5))).toEqual(invalid) // mid descriptor
      const ext = bytes(gifHeader(), GIF_NETSCAPE.slice(0, 8))
      expect(parseGif(ext)).toEqual(invalid)
      const subRunsOff = bytes(gifHeader(), [0x21, 0xfe, 0xff, 1, 2, 3])
      expect(parseGif(subRunsOff)).toEqual(invalid)
    })

    it('an extension whose sub-block chain never terminates', () => {
      expect(
        parseGif(bytes(gifHeader(), [0x21, 0xfe, 0x02, 0x61, 0x62], gifFrame(), GIF_TRAILER)),
      ).toEqual(invalid)
    })

    it('illegal LZW minimum code size', () => {
      for (const bad of [0, 1, 9, 12]) {
        const frame = gifFrame()
        frame[frame.length - 5] = bad // LZW min code size byte
        expect(parseGif(bytes(gifHeader(), frame, GIF_TRAILER))).toEqual(invalid)
      }
    })

    it('an unknown block introducer', () => {
      expect(parseGif(bytes(gifHeader(), [0x99, 0x00], gifFrame(), GIF_TRAILER))).toEqual(invalid)
    })
  })

  it('over-dimension past PHOTO_MAX_SIDE, reporting size and frame count', () => {
    const wide = bytes(gifHeader(PHOTO_MAX_SIDE + 1, 1), gifFrame(), GIF_TRAILER)
    expect(parseGif(wide)).toEqual({
      ok: false,
      reason: 'over-dimension',
      width: PHOTO_MAX_SIDE + 1,
      height: 1,
      frames: 1,
    })
    expect(parseGif(animatedGif(4, 1, PHOTO_MAX_SIDE + 1))).toEqual({
      ok: false,
      reason: 'over-dimension',
      width: 1,
      height: PHOTO_MAX_SIDE + 1,
      frames: 4,
    })
  })

  it('an oversize GIF is not held to the frame caps, but must still be well-formed', () => {
    expect(parseGif(animatedGif(GIF_MAX_FRAMES + 5, 3000, 3000))).toMatchObject({
      reason: 'over-dimension',
      frames: GIF_MAX_FRAMES + 5,
    })
    expect(parseGif(bytes(gifHeader(3000, 3000)))).toEqual({ ok: false, reason: 'invalid-gif' })
    expect(parseGif(animatedGif(2, 3000, 3000).subarray(0, 40))).toEqual({
      ok: false,
      reason: 'invalid-gif',
    })
  })

  it('too-many-frames past the frame cap', () => {
    expect(parseGif(animatedGif(GIF_MAX_FRAMES + 1))).toEqual({
      ok: false,
      reason: 'too-many-frames',
    })
  })

  it('too-many-frames when frames × width × height exceeds the pixel budget', () => {
    // 2048² = 4.19 M px: 95 frames = 398 M (ok), 96 = 402 M (over 400 M).
    expect(parseGif(animatedGif(95, 2048, 2048))).toMatchObject({ ok: true, frames: 95 })
    expect(parseGif(animatedGif(96, 2048, 2048))).toEqual({ ok: false, reason: 'too-many-frames' })
  })
})

describe('sanitizeGif', () => {
  it('passes a clean animated GIF through byte-identically', () => {
    const input = animatedGif(3, 8, 6)
    const res = sanitizeGif(input)
    expect(res).toMatchObject({ ok: true, width: 8, height: 6, frames: 3 })
    if (res.ok) same(res.gif, input)
  })

  it('drops comment, plain-text, XMP and unknown extensions but keeps graphic control + loop count', () => {
    const input = bytes(
      gifHeader(4, 4),
      gifComment('secret-comment'),
      GIF_NETSCAPE,
      gifXmp('xmp-payload'),
      GIF_GCE,
      GIF_PLAIN_TEXT,
      [0x21, 0x77, 0x02, 0x61, 0x62, 0x00], // unknown extension label
      gifFrame(4, 4),
      GIF_GCE,
      gifFrame(4, 4),
      GIF_TRAILER,
    )
    const res = sanitizeGif(input)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.frames).toBe(2)
    const out = text(res.gif)
    expect(out).not.toContain('secret-comment')
    expect(out).not.toContain('xmp-payload')
    expect(out).not.toContain('XMP Data')
    expect(out).toContain('NETSCAPE2.0')
    same(res.gif, animatedGif(2, 4, 4))
  })

  it('drops everything after the trailer (polyglot payloads)', () => {
    const input = bytes(Array.from(animatedGif(2)), Array.from(enc('<?php evil ?>')))
    const res = sanitizeGif(input)
    expect(res.ok).toBe(true)
    if (res.ok) same(res.gif, animatedGif(2))
  })

  it('preserves frame order and local color tables byte-exact', () => {
    const input = bytes(
      gifHeader(),
      gifFrame(1, 1, { lct: true }),
      gifFrame(1, 1),
      gifFrame(1, 1, { lct: true }),
      GIF_TRAILER,
    )
    const res = sanitizeGif(input)
    expect(res.ok).toBe(true)
    if (res.ok) same(res.gif, input)
  })

  it('accepts a missing trailer at a clean block boundary and writes one', () => {
    const noTrailer = animatedGif(2).slice(0, -1)
    const res = sanitizeGif(noTrailer)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.gif[res.gif.length - 1]).toBe(0x3b)
      same(res.gif, animatedGif(2))
    }
  })

  it('propagates every parse failure', () => {
    expect(sanitizeGif(enc('nope'))).toEqual({
      ok: false,
      reason: 'not-gif',
    })
    expect(sanitizeGif(animatedGif(1).subarray(0, 20))).toEqual({
      ok: false,
      reason: 'invalid-gif',
    })
    expect(sanitizeGif(animatedGif(1, 2049, 1))).toMatchObject({
      ok: false,
      reason: 'over-dimension',
    })
    expect(sanitizeGif(animatedGif(GIF_MAX_FRAMES + 1))).toEqual({
      ok: false,
      reason: 'too-many-frames',
    })
  })

  it('does not mutate its input', () => {
    const input = bytes(Array.from(animatedGif(2)), [1, 2, 3])
    const copy = Uint8Array.from(input)
    sanitizeGif(input)
    expect(input).toEqual(copy)
  })
})

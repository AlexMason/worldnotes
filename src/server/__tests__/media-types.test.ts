import { describe, it, expect } from 'vitest'
import { probeMedia, MAX_MEDIA_SIDE } from '../media-types'
import {
  pngBytes,
  pngBombBytes,
  GIF_BYTES,
  ICO_BYTES,
  WEBP_BYTES,
  JPEG_BYTES,
  SVG_BYTES,
} from './helpers/media-fixtures'

describe('probeMedia', () => {
  it('sniffs PNG with dimensions', () => {
    const res = probeMedia(pngBytes(64, 32))
    expect(res).toEqual({ ok: true, media: { mediaType: 'image/png', width: 64, height: 32 } })
  })

  it('sniffs GIF, ICO, WebP, JPEG', () => {
    expect(probeMedia(GIF_BYTES)).toMatchObject({ ok: true, media: { mediaType: 'image/gif' } })
    expect(probeMedia(ICO_BYTES)).toMatchObject({
      ok: true,
      media: { mediaType: 'image/vnd.microsoft.icon', width: 1, height: 1 },
    })
    expect(probeMedia(WEBP_BYTES)).toMatchObject({
      ok: true,
      media: { mediaType: 'image/webp', width: 1, height: 1 },
    })
    expect(probeMedia(JPEG_BYTES)).toMatchObject({
      ok: true,
      media: { mediaType: 'image/jpeg', width: 1, height: 1 },
    })
  })

  it('rejects SVG, HTML, executables and truncated junk', () => {
    for (const junk of [
      SVG_BYTES,
      Buffer.from('<!doctype html><script>alert(1)</script>'),
      Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // MZ/PE
      Buffer.from('89504e470d0a', 'hex'), // truncated PNG header
      Buffer.alloc(0),
    ]) {
      expect(probeMedia(junk)).toEqual({ ok: false, reason: 'unsupported-type' })
    }
  })

  it('rejects decompression-bomb headers beyond the side cap', () => {
    expect(probeMedia(pngBombBytes())).toMatchObject({ ok: false, reason: 'over-dimension' })
    const edge = probeMedia(pngBytes(MAX_MEDIA_SIDE, 1))
    expect(edge.ok).toBe(true)
  })

  it('rejects over-total-pixel claims even within the side cap', () => {
    // 8000 x 8000 = 64 MP > 40 MP cap, each side under MAX_MEDIA_SIDE
    expect(probeMedia(pngBytes(8000, 8000))).toMatchObject({
      ok: false,
      reason: 'over-dimension',
    })
  })
})

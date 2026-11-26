import { describe, it, expect, vi } from 'vitest'
import {
  PhotoConvertError,
  convertToPng,
  fitInside,
  pngDimensions,
  type ConvertEnv,
  type DecodedImage,
} from '../photo-convert'

/** 24-byte PNG prefix (signature + IHDR header) followed by padding. */
function pngHead(width: number, height: number): Uint8Array {
  const head = new Uint8Array(32)
  head.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  head.set([0, 0, 0, 13], 8)
  head.set([0x49, 0x48, 0x44, 0x52], 12) // IHDR
  const view = new DataView(head.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return head
}

const file = (bytes: Uint8Array | string, type: string, name = 'x') =>
  new File([bytes as BlobPart], name, { type })

function fakeEnv(source: { width: number; height: number }, opts: { failDecode?: boolean } = {}) {
  const close = vi.fn()
  const image: DecodedImage = { ...source, close }
  const out = new Blob(['png-out'], { type: 'image/png' })
  const decode = vi.fn(async () => {
    if (opts.failDecode) throw new Error('bad data')
    return image
  })
  const encode = vi.fn(async () => out)
  const env: ConvertEnv = { decode, encode }
  return { env, decode, encode, close, out }
}

describe('fitInside', () => {
  it.each([
    [4000, 3000, 2048, { width: 2048, height: 1536 }],
    [3000, 4000, 2048, { width: 1536, height: 2048 }],
    [5000, 5000, 2048, { width: 2048, height: 2048 }],
    [800, 600, 2048, { width: 800, height: 600 }],
    [2048, 2048, 2048, { width: 2048, height: 2048 }],
    [2049, 1, 2048, { width: 2048, height: 1 }], // thin images never collapse to 0
    [1, 9000, 2048, { width: 1, height: 2048 }],
  ])('%ix%i within %i -> %o', (w, h, max, expected) => {
    expect(fitInside(w, h, max)).toEqual(expected)
  })
})

describe('pngDimensions', () => {
  it('reads dimensions from signature + IHDR', () => {
    expect(pngDimensions(pngHead(640, 480))).toEqual({ width: 640, height: 480 })
  })

  it('returns null for short input, a wrong signature, or a missing IHDR', () => {
    expect(pngDimensions(new Uint8Array(10))).toBeNull()
    expect(pngDimensions(new Uint8Array(32))).toBeNull()
    const noIhdr = pngHead(1, 1)
    noIhdr[12] = 0x58
    expect(pngDimensions(noIhdr)).toBeNull()
  })
})

describe('convertToPng', () => {
  it('passes a PNG that already fits through untouched (same File, no decode)', async () => {
    const png = file(pngHead(2048, 100), 'image/png', 'shot.png')
    const { env, decode } = fakeEnv({ width: 1, height: 1 })
    expect(await convertToPng(png, env)).toBe(png)
    expect(decode).not.toHaveBeenCalled()
  })

  it('also passes through a PNG that arrives with an empty type', async () => {
    const png = file(pngHead(10, 10), '', 'clip')
    const { env, decode } = fakeEnv({ width: 1, height: 1 })
    expect(await convertToPng(png, env)).toBe(png)
    expect(decode).not.toHaveBeenCalled()
  })

  it('downscales an oversized PNG through decode/encode', async () => {
    const png = file(pngHead(4000, 3000), 'image/png')
    const { env, decode, encode, out } = fakeEnv({ width: 4000, height: 3000 })
    expect(await convertToPng(png, env)).toBe(out)
    expect(decode).toHaveBeenCalledWith(png)
    expect(encode).toHaveBeenCalledWith(expect.objectContaining({ width: 4000 }), 2048, 1536)
  })

  it('re-encodes a non-PNG at its own size when it already fits', async () => {
    const jpg = file('\xff\xd8\xff', 'image/jpeg')
    const { env, encode, out } = fakeEnv({ width: 800, height: 600 })
    expect(await convertToPng(jpg, env)).toBe(out)
    expect(encode).toHaveBeenCalledWith(expect.anything(), 800, 600)
  })

  it('downscales a large JPEG and releases the decoded image', async () => {
    const jpg = file('\xff\xd8\xff', 'image/jpeg')
    const { env, encode, close } = fakeEnv({ width: 6000, height: 4000 })
    await convertToPng(jpg, env)
    expect(encode).toHaveBeenCalledWith(expect.anything(), 2048, 1365)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('releases the decoded image when encoding fails', async () => {
    const jpg = file('\xff\xd8\xff', 'image/jpeg')
    const { env, close } = fakeEnv({ width: 10, height: 10 })
    env.encode = async () => {
      throw new Error('canvas exploded')
    }
    await expect(convertToPng(jpg, env)).rejects.toThrow('canvas exploded')
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('refuses SVG and non-image files without decoding', async () => {
    const { env, decode } = fakeEnv({ width: 1, height: 1 })
    await expect(convertToPng(file('<svg/>', 'image/svg+xml'), env)).rejects.toThrow(
      'SVG images are not supported',
    )
    await expect(convertToPng(file('%PDF-', 'application/pdf'), env)).rejects.toThrow(
      'This file is not an image',
    )
    expect(decode).not.toHaveBeenCalled()
  })

  it('maps a decode failure to a fixed user-facing message', async () => {
    const { env } = fakeEnv({ width: 1, height: 1 }, { failDecode: true })
    const err = await convertToPng(file('garbage', 'image/jpeg'), env).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PhotoConvertError)
    expect((err as Error).message).toBe('Could not read this image')
  })
})

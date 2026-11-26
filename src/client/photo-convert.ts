// ─── Browser-side photo → PNG conversion ─────────────────────────────────────
// The server stores only PNGs no larger than PHOTO_MAX_SIDE on a side, so the
// browser does the decoding, EXIF orientation, downscaling and PNG encoding
// (offloading that work from the server). Re-encoding through a canvas also
// drops every metadata block (EXIF/GPS) as a side effect; the server still
// sanitizes whatever arrives, because the API can be called directly.
//
// A PNG that already fits is sent unchanged (no re-encode): canvas PNG output
// is often larger than an optimized original and can lose 16-bit/palette
// data, and the server strips its metadata anyway.
//
// createImageBitmap/canvas are injectable (`ConvertEnv`) because happy-dom has
// no real implementations; the browser defaults are exercised manually.

import { PHOTO_MAX_SIDE } from '../shared/media-policy'
import { parseGif } from '../shared/gif'

/** The slice of ImageBitmap the converter needs (ImageBitmap satisfies it). */
export interface DecodedImage {
  width: number
  height: number
  close(): void
}

export interface ConvertEnv {
  /** Decode honouring EXIF orientation; rejects when undecodable. */
  decode(file: Blob): Promise<DecodedImage>
  /** Draw the image scaled to width×height and encode it as PNG. */
  encode(image: DecodedImage, width: number, height: number): Promise<Blob>
}

export class PhotoConvertError extends Error {}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Scale (w,h) down so the longest side is at most `max`; never enlarges. */
export function fitInside(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Dimensions from a PNG's signature + IHDR (first 24 bytes); null if not PNG. */
export function pngDimensions(head: Uint8Array): { width: number; height: number } | null {
  if (head.length < 24) return null
  for (let i = 0; i < PNG_SIGNATURE.length; i++) if (head[i] !== PNG_SIGNATURE[i]) return null
  if (String.fromCharCode(head[12], head[13], head[14], head[15]) !== 'IHDR') return null
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

const browserEnv: ConvertEnv = {
  decode: (file) => createImageBitmap(file, { imageOrientation: 'from-image' }),
  async encode(image, width, height) {
    const bitmap = image as ImageBitmap
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new PhotoConvertError('Could not convert this image')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, width, height)
      return canvas.convertToBlob({ type: 'image/png' })
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PhotoConvertError('Could not convert this image')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new PhotoConvertError('Could not convert this image'))
      }, 'image/png')
    })
  },
}

/** What to upload for a picked/pasted/dropped file. */
export interface PreparedPhoto {
  blob: Blob
  /** Multipart filename (the server ignores it; it keeps the type obvious). */
  filename: 'photo.png' | 'photo.gif'
  /** Shown to the user after a successful upload (something was lost). */
  notice?: string
}

const GIF_STILL_NOTICE =
  'Only the first frame was kept: animated GIFs larger than 2048 px cannot stay animated.'

/**
 * Decide how `file` is uploaded. An animated GIF (more than one frame) within
 * the server's caps is sent byte-for-byte so it stays animated; an animated
 * GIF over PHOTO_MAX_SIDE cannot be downscaled without an encoder, so it falls
 * back to a still PNG with a notice; everything else (single-frame GIFs
 * included) takes the PNG conversion path. A GIF the server will refuse
 * (too many frames) is still sent as-is so the user sees the server's reason
 * instead of silently getting a still.
 */
export async function preparePhoto(
  file: File,
  env: ConvertEnv = browserEnv,
): Promise<PreparedPhoto> {
  assertImageFile(file)

  const sig = new TextDecoder('latin1').decode(await file.slice(0, 6).arrayBuffer())
  if (sig === 'GIF87a' || sig === 'GIF89a') {
    const gif = parseGif(new Uint8Array(await file.arrayBuffer()))
    if (gif.ok && gif.frames > 1) return { blob: file, filename: 'photo.gif' }
    if (!gif.ok && gif.reason === 'too-many-frames') return { blob: file, filename: 'photo.gif' }
    if (!gif.ok && gif.reason === 'over-dimension' && gif.frames > 1) {
      return {
        blob: await convertToPng(file, env),
        filename: 'photo.png',
        notice: GIF_STILL_NOTICE,
      }
    }
  }
  return { blob: await convertToPng(file, env), filename: 'photo.png' }
}

function assertImageFile(file: File): void {
  if (file.type === 'image/svg+xml') throw new PhotoConvertError('SVG images are not supported')
  // Some clipboards hand over files with an empty type; the decoder decides.
  if (file.type !== '' && !file.type.startsWith('image/')) {
    throw new PhotoConvertError('This file is not an image')
  }
}

/**
 * Produce the PNG to upload for `file`. Throws `PhotoConvertError` (message is
 * user-presentable) for non-images, SVG and undecodable input.
 */
export async function convertToPng(file: File, env: ConvertEnv = browserEnv): Promise<Blob> {
  assertImageFile(file)

  const head = new Uint8Array(await file.slice(0, 24).arrayBuffer())
  const png = pngDimensions(head)
  if (png && png.width <= PHOTO_MAX_SIDE && png.height <= PHOTO_MAX_SIDE) return file

  let image: DecodedImage
  try {
    image = await env.decode(file)
  } catch {
    throw new PhotoConvertError('Could not read this image')
  }
  try {
    const { width, height } = fitInside(image.width, image.height, PHOTO_MAX_SIDE)
    return await env.encode(image, width, height)
  } finally {
    image.close()
  }
}

// ─── Minimal media fixtures ──────────────────────────────────────────────────
// Valid headers with tiny payloads, built programmatically (correct CRCs/IDAT)
// so sniffing, dimension parsing and DB round-trips all see real bytes.

function crc32(buf: Buffer): number {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length - 4)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 1x1 transparent PNG built with correct chunks; header dims = size x size. */
export function pngBytes(width = 1, height = 1): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', Buffer.from('e9030000000002', 'hex')), // placeholder scanline payload
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** PNG claiming absurd dimensions (decompression bomb header) — valid chunks,
 *  tiny payload: the sniff/dimension guard is what must reject it. */
export function pngBombBytes(): Buffer {
  return pngBytes(50000, 50000)
}

export const GIF_BYTES = Buffer.from(
  '4749463839610100010080000000000021f90401000000002c00000000010001000002024c01003b',
  'hex',
)

export const ICO_BYTES = (() => {
  const header = Buffer.alloc(6 + 16)
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(1, 4) // one image
  header[6] = 1 // width
  header[7] = 1 // height
  header.writeUInt16LE(32, 14) // bpp
  return header
})()

/** Minimal lossy WebP: RIFF/WEBP + VP8 chunk declaring 1x1. Real bitstream
 *  layout: 3-byte frame tag, 0x9d 0x01 0x2a sync code, 14-bit (w-1),(h-1). */
export const WEBP_BYTES = (() => {
  const body = Buffer.alloc(3 + 7)
  body.writeUInt8(0x9d, 3)
  body.writeUInt8(0x01, 4)
  body.writeUInt8(0x2a, 5)
  body.writeUInt16LE(0, 6) // width - 1
  body.writeUInt16LE(0, 8) // height - 1
  const chunk = Buffer.concat([Buffer.from('VP8 ', 'ascii'), u32(body.length), body])
  const riff = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    u32(4 + chunk.length),
    Buffer.from('WEBP', 'ascii'),
    chunk,
  ])
  return riff
})()

function u32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}

/** JPEG: SOI + SOF0 declaring 1x1 + EOI (enough for sniff + dims parsing). */
export const JPEG_BYTES = (() => {
  // SOF0 segment: marker, length(2), precision, height(2), width(2), ncomp, comp data
  const sof = Buffer.alloc(2 + 2 + 1 + 2 + 2 + 1 + 3)
  sof.write('ffc0', 'hex')
  sof.writeUInt16BE(8 + 3, 2) // segment length covers type+payload
  sof.writeUInt8(8, 4) // precision
  sof.writeUInt16BE(1, 5) // height
  sof.writeUInt16BE(1, 7) // width
  sof.writeUInt8(1, 9) // component count
  return Buffer.concat([Buffer.from('ffd8', 'hex'), sof, Buffer.from('ffd9', 'hex')])
})()

export const SVG_BYTES = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
)

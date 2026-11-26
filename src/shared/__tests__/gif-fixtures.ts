// ─── Programmatic GIF fixtures ───────────────────────────────────────────────
// Block-level builders (no encoder): valid structure with a minimal LZW payload,
// plus the extension blocks the sanitizer must keep or drop. Shared by the
// shared-module tests and the server route tests.

const ascii = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0))
const u16 = (n: number): number[] => [n & 0xff, (n >> 8) & 0xff]

/** Header + logical screen descriptor (+ a 2-colour global table). */
export function gifHeader(
  width = 1,
  height = 1,
  opts: { gct?: boolean; version?: string } = {},
): number[] {
  const gct = opts.gct ?? true
  return [
    ...ascii(opts.version ?? 'GIF89a'),
    ...u16(width),
    ...u16(height),
    gct ? 0x80 : 0x00, // packed: global color table flag, 2 colours
    0, // background colour index
    0, // pixel aspect ratio
    ...(gct ? [0, 0, 0, 255, 255, 255] : []),
  ]
}

/** One image block with a minimal LZW payload (min code 2, one 2-byte sub-block). */
export function gifFrame(width = 1, height = 1, opts: { lct?: boolean } = {}): number[] {
  return [
    0x2c,
    ...u16(0),
    ...u16(0),
    ...u16(width),
    ...u16(height),
    opts.lct ? 0x80 : 0x00,
    ...(opts.lct ? [9, 9, 9, 200, 200, 200] : []),
    0x02, // LZW minimum code size
    0x02,
    0x4c,
    0x01, // data sub-block
    0x00, // terminator
  ]
}

/** Graphic control extension (delay 10cs, no transparency). */
export const GIF_GCE = [0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00]

/** NETSCAPE2.0 loop-count application extension (loop forever). */
export const GIF_NETSCAPE = [
  0x21,
  0xff,
  0x0b,
  ...ascii('NETSCAPE2.0'),
  0x03,
  0x01,
  0x00,
  0x00,
  0x00,
]

/** Comment extension carrying `text`. */
export const gifComment = (text: string): number[] => [
  0x21,
  0xfe,
  text.length,
  ...ascii(text),
  0x00,
]

/** A non-NETSCAPE application extension (XMP-style payload). */
export const gifXmp = (text: string): number[] => [
  0x21,
  0xff,
  0x0b,
  ...ascii('XMP DataXMP'),
  text.length,
  ...ascii(text),
  0x00,
]

/** Plain-text extension (dropped by the sanitizer). */
export const GIF_PLAIN_TEXT = [0x21, 0x01, 0x03, 1, 2, 3, 0x00]

export const GIF_TRAILER = [0x3b]

/** Animated GIF: header, loop block, then `frames` × (GCE + image), trailer. */
export function animatedGif(frames: number, width = 1, height = 1): Uint8Array {
  const out: number[] = [...gifHeader(width, height), ...GIF_NETSCAPE]
  for (let i = 0; i < frames; i++) out.push(...GIF_GCE, ...gifFrame(width, height))
  out.push(...GIF_TRAILER)
  return Uint8Array.from(out)
}

export const bytes = (...parts: number[][]): Uint8Array => Uint8Array.from(parts.flat())

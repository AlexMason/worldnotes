// ─── Photo upload policy ─────────────────────────────────────────────────────
// Shared by the browser (which downscales before upload) and the server (which
// rejects anything larger), so the two sides cannot drift: a stored photo is
// never more than this many pixels on its longest side.

export const PHOTO_MAX_SIDE = 2048

/** Animated GIFs are stored as received (after sanitizing), so their decode
 *  cost is bounded here instead: frame count, and frames × width × height
 *  ("pixel-frames"). LZW compresses blank frames ~1000:1, so file size alone
 *  does not bound what every reader's browser must decode. A typical
 *  480×270 × 200-frame GIF is ~26 M pixel-frames. */
export const GIF_MAX_FRAMES = 500
export const GIF_MAX_PIXEL_FRAMES = 400_000_000

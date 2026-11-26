// ─── Photo upload policy ─────────────────────────────────────────────────────
// Shared by the browser (which downscales before upload) and the server (which
// rejects anything larger), so the two sides cannot drift: a stored photo is
// never more than this many pixels on its longest side.

export const PHOTO_MAX_SIDE = 2048

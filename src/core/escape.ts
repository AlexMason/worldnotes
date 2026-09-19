// ─── HTML escaping helpers (single source of truth) ──────────────────────────
// Text-position interpolation uses `escapeHTML`; ANY `"`-delimited attribute
// value (`href`, `data-*`, …) MUST use `escapeAttr` — `escapeHTML` does not
// escape quotes, so using it inside an attribute is an injection bug
// (e.g. `- x" onclick="…` breaking out of `data-raw`).

/** Escape text for HTML character data (`&`, `<`, `>`). */
export function escapeHTML(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Escape text for a double-quoted HTML attribute value. */
export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

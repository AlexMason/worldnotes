// ─── Editor format ops — pure markdown wrapping for keyboard shortcuts ──────
//
// Ctrl+B / Ctrl+I / Ctrl+K semantics over raw document text with a raw-space
// selection (see editor-text-ops' offset conventions). Every function returns
// the new text plus the successor selection; the keymap owns commit + caret
// restore. No DOM here either.

export interface FormatResult {
  text: string
  start: number
  end: number
}

/**
 * Toggle `marker` around the selection [start, end), VS Code-markdown style.
 *
 * Unwrap is checked from the INSIDE out:
 *  1. the selection itself begins/ends with the marker → strip within;
 *  2. the marker sits in the text immediately outside the selection → strip
 *     around (this is the state a previous wrap leaves the caret in);
 *  3. collapsed caret sitting exactly between a marker pair (`**|**`) →
 *     unwrap to an empty line.
 * Otherwise wrap and return the selection over the INNER content, so a
 * second press hits rule 2 and unwraps (true toggle).
 *
 * Exact-match only: near-misses (e.g. wrapping a range inside an existing
 * bold span) produce nested markers rather than heuristic surgery — one
 * Ctrl+Z reverts any surprise, matching the undo-granularity guarantee.
 */
export function toggleWrap(text: string, start: number, end: number, marker: string): FormatResult {
  const m = marker.length
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))

  // Rule 2/3 first at the caret: outside markers around a (possibly empty)
  // selection. Checking before rule 1 makes `**|**` unwrap rather than
  // produce `**` + marker + `**`.
  if (
    s - m >= 0 &&
    e + m <= text.length &&
    text.slice(s - m, s) === marker &&
    text.slice(e, e + m) === marker
  ) {
    const next = text.slice(0, s - m) + text.slice(s, e) + text.slice(e + m)
    return { text: next, start: s - m, end: e - m }
  }

  // Rule 1: selection carries the markers itself.
  if (e - s >= 2 * m && text.slice(s, s + m) === marker && text.slice(e - m, e) === marker) {
    const next = text.slice(0, s) + text.slice(s + m, e - m) + text.slice(e)
    return { text: next, start: s, end: Math.max(s, e - 2 * m) }
  }

  // Wrap (also handles the bare collapsed caret: `****` with caret between).
  const next = text.slice(0, s) + marker + text.slice(s, e) + marker + text.slice(e)
  return { text: next, start: s + m, end: e + m }
}

const LINK_RE = /^\[([^\]]*)\]\(([^)]*)\)$/

/**
 * Wrap the selection as `[selection](url)` and return the selection over the
 * URL slot (type-over, VS Code style). A selection that is ALREADY a link
 * literal just gets its URL slot re-selected instead of double-wrapping.
 * Collapsed caret → `[]()` with the caret inside the parens.
 */
export function wrapLink(text: string, start: number, end: number): FormatResult {
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))

  const selected = text.slice(s, e)
  const existing = LINK_RE.exec(selected)
  if (existing) {
    // Selection is `[label](url)` — place the selection on its url part.
    const urlStart = s + 1 + existing[1]!.length + 2
    return { text, start: urlStart, end: urlStart + existing[2]!.length }
  }

  const inserted = `[${selected}]()`
  const next = text.slice(0, s) + inserted + text.slice(e)
  const urlSlot = s + inserted.length - 1 // between '(' and ')'
  return { text: next, start: urlSlot, end: urlSlot }
}

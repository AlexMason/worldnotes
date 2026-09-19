// ─── Link URL policy (shared: editor core plugins + SSR read path) ───────────
// Defense in depth against stored XSS for anonymous readers: only benign
// schemes may become hrefs. Relative + same-origin absolute paths are fine —
// they can never leave the app. Consumed by src/core/plugins/link.ts (and the
// DOM editor surface) wherever an author-supplied URL becomes an `href`.

const ALLOWED_ABSOLUTE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * True when `url` is safe to emit inside an href.
 * Relative URLs (no scheme, not protocol-relative `//…`) are allowed.
 */
export function isSafeHref(url: string): boolean {
  const trimmed = url.trim()
  if (trimmed === '') return false
  if (trimmed.startsWith('//')) return false // protocol-relative — could escape origin
  if (trimmed.startsWith('/')) return true // same-origin absolute
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    try {
      return ALLOWED_ABSOLUTE_PROTOCOLS.has(new URL(trimmed).protocol)
    } catch {
      return false
    }
  }
  return true // relative path/query/fragment
}

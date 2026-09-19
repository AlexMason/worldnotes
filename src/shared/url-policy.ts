// ─── Link URL policy (shared: editor client + SSR read path) ─────────────────
// Defense in depth against stored XSS for anonymous readers: only benign
// schemes may become hrefs. Relative + same-origin absolute paths are fine —
// they can never leave the app.

const ALLOWED_ABSOLUTE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * True when `url` is safe to emit inside an href.
 * Relative URLs (no scheme, not protocol-relative `//…`) are allowed:
 * markdown-it only calls the validator for non-relative forms, but we
 * double-check here so the helper is safe to use standalone.
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

/** markdown-it validateLink adapter. */
export function validateLink(url: string): boolean {
  return isSafeHref(url)
}

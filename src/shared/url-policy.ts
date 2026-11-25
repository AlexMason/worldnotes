// ─── Link URL policy (shared: editor core plugins + SSR read path) ───────────
// Defense in depth against stored XSS for anonymous readers: only benign
// schemes may become hrefs/srcs. Relative + same-origin absolute paths are
// fine — they can never leave the app. Consumed by src/core/plugins/link.ts
// and src/core/plugins/image.ts (and the DOM editor surface) wherever an
// author-supplied URL becomes a navigable/embeddable attribute.
//
// TWO DELIBERATELY DIFFERENT CONTRACTS: hrefs may carry mailto:, image srcs
// may not; neither may carry data:. Do not "simplify" these back into one
// function.

const HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const IMAGE_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Fake-but-stable base used to RESOLVE relative URLs for the origin-escape
 * check: comparing `new URL(v, RESOLVE_BASE).origin` against the base origin
 * catches every form that leaves the app — protocol-relative `//host/…` AND
 * backslash references like `\evil.com\x.png`, which browsers (WHATWG URL,
 * special schemes) treat as `//evil.com/x.png`. Prefix tests on `//` alone
 * miss the backslash vector — and resolution ALONE can't be trusted either:
 * Node's URL parser keeps single-backslash refs on-base while browsers
 * escape, so backslashes are rejected outright before resolution.
 */
const RESOLVE_BASE = 'http://wn.invalid/'
const RESOLVE_ORIGIN = new URL(RESOLVE_BASE).origin

/** True for anything scheme-shaped at the front of a URL. */
function hasScheme(v: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(v)
}

/** Resolve `v` against the fake base; true when it stays on-base origin. */
function staysOnOrigin(v: string): boolean {
  // Backslashes are rejected BEFORE resolution: URL parsers DIVERGE on them
  // (Node resolves `\evil.com\x` to an on-base PATH while browsers, per
  // WHATWG, treat `\` as `/` for special schemes and escape the ORIGIN).
  // The threat model is the browser rendering the page, and wiki assets
  // never legitimately contain backslashes — reject rather than gamble on
  // which parser agrees.
  if (v.includes('\\')) return false
  try {
    return new URL(v, RESOLVE_BASE).origin === RESOLVE_ORIGIN
  } catch {
    return false
  }
}

/**
 * True when `url` is safe to emit inside an href.
 * Relative URLs (no scheme) must resolve on-origin; absolute URLs must use
 * an allowed protocol.
 */
export function isSafeHref(url: string): boolean {
  const trimmed = url.trim()
  if (trimmed === '') return false
  if (hasScheme(trimmed)) {
    try {
      return HREF_PROTOCOLS.has(new URL(trimmed).protocol)
    } catch {
      return false
    }
  }
  return staysOnOrigin(trimmed)
}

/**
 * True when `url` is safe to emit inside an <img src>.
 * NARROWER than isSafeHref: no mailto: (nonsense), no data: (author-supplied
 * document URIs are an XSS primitive).
 */
export function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (trimmed === '') return false
  if (hasScheme(trimmed)) {
    try {
      return IMAGE_PROTOCOLS.has(new URL(trimmed).protocol)
    } catch {
      return false
    }
  }
  return staysOnOrigin(trimmed)
}

/**
 * Classify a link target by URL shape. Scheme-based — NOT the old
 * `includes('://')` heuristic, which misrouted `mailto:`, `javascript:` and
 * `#fragments` into the internal branch.
 *
 * - `external`: carries a scheme (`https:`, `javascript:`, …) or is
 *   protocol-relative (`//host/…`) → gated by `isSafeHref` at emit time.
 * - `same-doc`: leading `#` or `?` → origin-safe relative anchor, emitted as-is.
 * - `internal`: everything else → a page address, folded to a slug; safety of
 *   the resulting href rides on `validateSlug`'s `[a-z0-9-]`-segment charset
 *   (AGENTS.md slug policy — loosening SEGMENT_RE would delete this guard).
 */
export type LinkTarget = 'external' | 'same-doc' | 'internal'

export function classifyLinkTarget(url: string): LinkTarget {
  if (hasScheme(url) || url.startsWith('//')) return 'external'
  if (url.startsWith('#') || url.startsWith('?')) return 'same-doc'
  return 'internal'
}

// ─── URL helpers shared by client and server ─────────────────────────────────

/** Turn a validated slug into a viewable root-relative path. */
export function pageUrlPath(slug: string): string {
  return `/${slug.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Extract a page slug from a `/{slug}` location pathname.
 * `/` maps to `home`; trailing slashes are ignored.
 */
export function slugFromPath(pathname: string): string {
  const rest = pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  return decodeURIComponent(rest) || 'home'
}

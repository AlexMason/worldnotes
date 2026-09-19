// ─── URL helpers shared by client and server ─────────────────────────────────

/** Turn a validated slug into a viewable root-relative path. */
export function pageUrlPath(slug: string): string {
  return `/${slug.split('/').map(encodeURIComponent).join('/')}`
}

/** Turn a validated slug into the edit-shell path. */
export function editUrlPath(slug: string): string {
  return `/edit/${slug.split('/').map(encodeURIComponent).join('/')}`
}

/** Extract the slug from an /edit/... location pathname. */
export function slugFromEditPath(pathname: string): string {
  const rest = pathname.startsWith('/edit/')
    ? pathname.slice('/edit/'.length)
    : pathname === '/edit'
      ? 'home'
      : ''
  return decodeURIComponent(rest.replace(/\/+$/, '') || 'home')
}

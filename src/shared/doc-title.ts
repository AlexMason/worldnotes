// ─── Document title composition ──────────────────────────────────────────────
// One rule for every surface (reader layout, editor shell, editor client):
// the site name decorates the tab title as `Page — Site`, except when the
// page title already IS the site name (the home/index page) or no site name
// is configured (no suffix, byte-identical to the pre-branding behavior).

/** Compose the `<title>`/`document.title` for a page under `siteName`. */
export function composeDocTitle(title: string, siteName: string): string {
  if (!siteName || title === siteName) return title
  return `${title} — ${siteName}`
}

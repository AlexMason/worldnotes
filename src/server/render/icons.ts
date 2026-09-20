// ─── Favicon / icon <link> tags ──────────────────────────────────────────────
// Single source of the icon chrome emitted in BOTH the reader layout and the
// editor shell heads (replacing the old blank `href="data:,"` stub).
//
// Two states:
// - No override (settings.faviconMediaId === null): the bundled default set
//   served from /icons/* (public/icons/ in the image).
// - Override (a media id): exactly two tags — plain `<link rel="icon">` and
//   `<link rel="apple-touch-icon">` — pointing at the extensionless immutable
//   /media/{id} URL. No type/sizes (the render path is a pure sync function
//   of settings and cannot know the stored image's format or dimensions;
//   browsers cope), no manifest link (an already-installed PWA keeps the
//   bundled icons until the override is cleared — accepted caveat).
//
// A dangling override (row gone: crashed two-step upload / partial restore)
// emits a dead link — browsers fall back to their default icon, and the
// /favicon.ico blind route self-heals to the bundled set (routes/media.ts).
// No render-path existence check: that would put a DB hit behind every page.

export function iconTagsHtml(faviconMediaId: number | null): string {
  if (faviconMediaId !== null) {
    const href = `/media/${faviconMediaId}`
    return `<link rel="icon" href="${href}">\n<link rel="apple-touch-icon" href="${href}">`
  }
  return (
    '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">\n' +
    '<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">\n' +
    '<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">\n' +
    '<link rel="manifest" href="/icons/site.webmanifest">'
  )
}

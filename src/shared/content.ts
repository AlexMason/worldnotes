// ─── Page-content policy ─────────────────────────────────────────────────────
// The no-blank-pages invariant lives in the routes, but client and server
// must agree on what "blank" means — one predicate, shared (same precedent as
// slug.ts). A page whose content is blank has had all its content deleted;
// saving it removes the page instead of storing it empty.

/** True when a page's content holds nothing but whitespace. */
export function isBlankContent(content: string): boolean {
  return content.trim() === ''
}

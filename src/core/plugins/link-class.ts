import { wikiTargetToSlug } from '../../shared/slug'
import type { PageExists } from '../types'

/** Added to `wn-wiki-link` when the target page is known NOT to exist. */
export const MISSING_LINK_CLASS = 'wn-link-missing'

/**
 * Class list for an internal page link, shared by both link plugins and both
 * surfaces (reader HTML + editor DOM) so they cannot drift. UNKNOWN existence
 * (no resolver, pending, failed lookup) deliberately yields the plain
 * existing-page look — a false "missing" marker is worse than a missed one.
 * Targets that cannot fold to a slug are never marked (they render literal
 * on the reader).
 */
export function wikiLinkClass(target: string, pageExists: PageExists | undefined): string {
  if (!pageExists) return 'wn-wiki-link'
  const slug = wikiTargetToSlug(target)
  return slug !== null && pageExists(slug) === false
    ? `wn-wiki-link ${MISSING_LINK_CLASS}`
    : 'wn-wiki-link'
}

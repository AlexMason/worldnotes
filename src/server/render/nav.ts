// ─── Nav-page link extraction ────────────────────────────────────────────────
// The admin can designate a page whose top-level list items turn into site-nav
// links in the header chrome (reader + editor). Extraction rides the ONE
// engine — `buildDocument` + the shared inline scan — so list-marker grammar
// (bullet/alpha/roman), fence/table region exclusion, and image-before-link
// precedence can never drift from what readers actually see rendered. Only
// INTERNAL, slug-resolvable links survive: the same `wikiTargetToSlug` /
// `validateSlug` fold the wiki-link plugins use, which keeps emitted hrefs
// inside the injection-safe `[a-z0-9-]` charset (AGENTS.md slug policy).
// Anything else (external URLs, anchors, plain text, nested items) is skipped.

import { buildDocument } from '../../core/document'
import { scanInline } from '../../core/tokenizer'
import { defaultPlugins } from '../../core/plugins/defaults'
import { classifyLinkTarget } from '../../core/plugins/link'
import { parseWikiLink } from '../../core/navigation'
import { wikiTargetToSlug, slugDisplayName } from '../../shared/slug'
import { pageUrlPath } from '../../shared/url-helpers'
import type { NavLink } from '../../shared/dto'
import type { PagesRepository } from '../db/repository'
import type { SettingsService } from '../settings'
import type { RenderCache } from '../cache'

/** Hard ceiling: nav items are arbitrary page content; chrome stays sane. */
export const NAV_MAX_ITEMS = 8
/** Display labels longer than this are truncated with an ellipsis. */
export const NAV_LABEL_MAX = 40

/** Line-level defs start with `^` (mirrors document.ts's own split). */
const INLINE_DEFS = defaultPlugins
  .flatMap((p) => p.tokens)
  .filter((d) => !d.pattern.source.startsWith('^'))

/**
 * Emphasis/strikethrough/code markers are grammar the chrome cannot render;
 * strip the chars this engine actually treats as inline markup (`*`, `~~`,
 * backticks — underscores are NOT emphasis here).
 */
function cleanLabel(raw: string): string {
  const cleaned = raw
    .replace(/[*~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > NAV_LABEL_MAX ? cleaned.slice(0, NAV_LABEL_MAX - 1) + '\u2026' : cleaned
}

/** Resolve one inline token to a nav link, or null when not nav-worthy. */
function linkFromToken(type: string, groups: string[]): NavLink | null {
  if (type === 'wiki-link') {
    const { page, display } = parseWikiLink(groups[0] ?? '')
    const slug = wikiTargetToSlug(page)
    if (slug === null) return null
    return { slug, href: pageUrlPath(slug), label: cleanLabel(display) || slugDisplayName(slug) }
  }
  if (type === 'link') {
    const text = groups[0] ?? ''
    const url = groups[1] ?? ''
    // Internal-only decision (locked): external/same-doc targets never become
    // chrome. Internal fold matches plugins/link.ts renderToHTML exactly.
    if (classifyLinkTarget(url) !== 'internal') return null
    const slug = wikiTargetToSlug(url)
    if (slug === null) return null
    return { slug, href: pageUrlPath(slug), label: cleanLabel(text) || slugDisplayName(slug) }
  }
  return null
}

/** Parse a nav page's markdown into header links (order-preserving, capped). */
export function extractNavLinks(content: string): NavLink[] {
  const links: NavLink[] = []
  const model = buildDocument(content, defaultPlugins)
  for (const line of model.lines) {
    if (links.length >= NAV_MAX_ITEMS) break
    const [token] = line
    // A list-item line tokenizes to exactly one line token (groups:
    // indent/marker/content); region lines (fences, tables) never do.
    if (!token || token.type !== 'list-item' || line.length !== 1) continue
    if ((token.groups[0] ?? '') !== '') continue // indented → nested, not top-level
    const link = firstLinkIn(token.groups[2] ?? '')
    if (link) links.push(link)
  }
  return links
}

/** First nav-worthy link in a content string, descending through the
 *  inline wrappers (bold/italic/…) whose matched text may contain one. */
function firstLinkIn(text: string): NavLink | null {
  const tokens = scanInline(text, INLINE_DEFS)
  for (const t of tokens) {
    const direct = linkFromToken(t.type, t.groups)
    if (direct) return direct
    // Wrapper tokens (bold `**…**`, italic, code…) carry the matched TEXT in
    // their last group — a link inside emphasis is still the item's link.
    if (t.type !== 'text' && t.groups.length) {
      for (const group of t.groups) {
        if (group === t.raw) continue // whole-match group = markup included
        const nested = firstLinkIn(group)
        if (nested) return nested
      }
    }
  }
  return null
}

export interface NavLinksService {
  /** Current nav links for the configured nav page (never throws). */
  links(): Promise<NavLink[]>
  /** Drop the cached parse when a page is written (same hook that evicts the
   *  article cache — an edit to the nav page IS a chrome edit). */
  onPageWrite(slug: string): void
}

/**
 * Memoizing wrapper over `extractNavLinks`: parses once per nav-page version,
 * cached in the shared render cache under `nav:{slug}` (a `nav_slug` change is
 * self-busting — a different key — and already bumps the settings revision).
 * Store failures never break the read path: the last good parse (or empty)
 * keeps serving, mirroring the settings-service doctrine.
 */
export function createNavLinksService(deps: {
  pages: Pick<PagesRepository, 'get'>
  settings: SettingsService
  cache: RenderCache
}): NavLinksService {
  let lastGood: { navSlug: string; links: NavLink[] } | null = null

  return {
    async links() {
      const navSlug = deps.settings.get().navSlug
      if (!navSlug) {
        lastGood = null
        return []
      }
      const key = `nav:${navSlug}`
      const hit = deps.cache.get<NavLink[]>(key)
      if (hit) {
        lastGood = { navSlug, links: hit.value }
        return hit.value
      }
      try {
        const page = await deps.pages.get(navSlug)
        const links = page ? extractNavLinks(page.content) : []
        deps.cache.set(key, {
          value: links,
          etag: JSON.stringify(links),
          storedAt: Date.now(),
        })
        lastGood = { navSlug, links }
        return links
      } catch {
        return lastGood && lastGood.navSlug === navSlug ? lastGood.links : []
      }
    },

    onPageWrite(slug: string) {
      deps.cache.invalidate(`nav:${slug}`)
    },
  }
}

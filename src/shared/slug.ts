// ─── Slug policy (shared by server and client) ───────────────────────────────
// Pages live at nested slugs: `blog/post-name`. Slugs are lowercase,
// hyphen-separated segments; titles keep their own casing elsewhere.

import { classifyLinkTarget } from './url-policy'

export const SLUG_MAX_LENGTH = 255

/** First path segments reserved for app routes; pages may not start with them. */
export const RESERVED_FIRST_SEGMENTS: readonly string[] = [
  'api',
  'oidc',
  'edit',
  'search',
  'assets',
  'static',
  'healthz',
  'favicon.ico',
  'icons',
  'media',
  'all',
  'admin',
]

const SEGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Fold free text (a title or wiki-link target) into a slug.
 * - NFKD-normalize, strip diacritics
 * - `/`-separated path parts are preserved; each part is slugified per-segment
 * - non-alphanumerics collapse to single hyphens; leading/trailing hyphens trimmed
 * Returns '' when nothing survives folding (e.g. pure emoji/CJK input).
 */
export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  const parts = normalized
    .split('/')
    .map((part) =>
      part
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter((part) => part.length > 0)

  return parts.join('/')
}

export type SlugValidation = { ok: true; slug: string } | { ok: false; error: string }

/**
 * Validate + normalize a full slug coming from a URL or the create flow.
 * Rejects absolute URLs, traversal, empty/over-long slugs, invalid charset,
 * and reserved first segments.
 */
export function validateSlug(raw: string): SlugValidation {
  let slug = raw
  if (slug.startsWith('/')) slug = slug.slice(1)
  if (slug.endsWith('/')) slug = slug.slice(0, -1)
  slug = slug.replace(/\/{2,}/g, '/')

  if (slug.length === 0) return { ok: false, error: 'Slug must not be empty' }
  if (slug.length > SLUG_MAX_LENGTH)
    return { ok: false, error: `Slug must be at most ${SLUG_MAX_LENGTH} characters` }
  if (slug.includes('\\') || /[\s\p{Cc}\p{Cf}]/u.test(slug))
    return { ok: false, error: 'Slug contains illegal characters' }
  if (slug.split('/').some((seg) => seg === '.' || seg === '..'))
    return { ok: false, error: 'Slug must not contain . or .. segments' }
  if (!slug.split('/').every((seg) => SEGMENT_RE.test(seg)))
    return { ok: false, error: 'Slug segments must be lowercase alphanumeric, hyphen-separated' }

  const first = slug.split('/')[0] as string
  if (RESERVED_FIRST_SEGMENTS.includes(first))
    return { ok: false, error: `Slug must not start with reserved segment "${first}"` }

  return { ok: true, slug }
}

/**
 * Resolve a wiki-link target ([[Some/Page]]) to a slug.
 * @returns null when the fold yields an invalid/empty slug (caller decides:
 * through a manual slug entry at creation time).
 */
export function wikiTargetToSlug(target: string): string | null {
  const folded = slugify(target)
  const result = validateSlug(folded)
  return result.ok ? result.slug : null
}

/**
 * THE client-side fold for navigation targets (wiki-link text, relative link
 * hrefs, breadcrumb/page names typed by users): returns the canonical slug or
 * null when the target cannot address a page (empty, non-latin-only, reserved
 * route segments…). Callers must REFUSE a null rather than fall back to the
 * raw string — a raw key would desync buffers, trail, URL, and saves, opening
 * a phantom page that can never persist (the reader shows such targets as
 * literal text; navigation must not disagree).
 */
export function navTargetToSlug(target: string): string | null {
  return wikiTargetToSlug(target)
}

/**
 * Base that relative wiki links on page `pageSlug` resolve under: the page
 * itself, or null (= site root) for the configured home page — it is served
 * at `/`, so `[[beta]]` there means `/beta`. With no home configured there is
 * no special case (a page slugged `home` is an ordinary page).
 */
export function wikiLinkBase(pageSlug: string, homeSlug: string | null | undefined): string | null {
  return !pageSlug || pageSlug === homeSlug ? null : pageSlug
}

/**
 * Root-absolute navigation address of a wiki-link target written on a page
 * whose link base is `base` (see wikiLinkBase). `[[/x]]` and base-less
 * targets keep root semantics and are returned as-is; relative targets become
 * `/{base}/{target}`, which every root-semantics consumer (navTargetToSlug,
 * link classes, existence sync) folds unchanged. Returned as-is so they stay
 * unresolvable or refused exactly as at the root: a target that folds to
 * nothing (prefixing the base must never turn `[[!!!]]` into a self-link)
 * and a target that is not a page address at all (`https://…`, `//host`,
 * `#frag` — navigation refuses those; a prefix would hide them as
 * `/{base}/https://…` and fold them into a junk page).
 */
export function wikiLinkAddress(target: string, base: string | null | undefined): string {
  const trimmed = target.trim()
  if (!base || trimmed.startsWith('/') || slugify(trimmed) === '') return trimmed
  if (classifyLinkTarget(trimmed) !== 'internal') return trimmed
  return `/${base}/${trimmed}`
}

/** Derive the breadcrumb trail root label from a slug's last segment. */
export function slugDisplayName(slug: string): string {
  const segments = slug.split('/')
  const last = segments[segments.length - 1] ?? slug
  return last
    .split('-')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ')
}

// ─── Page moves ──────────────────────────────────────────────────────────────
// A move relocates a page AND its subtree (`alpha` → `gamma` also moves
// `alpha/x` → `gamma/x`); links that pointed at moved pages are rewritten in
// the style their author wrote them (see plugins' `rewriteLink`).

/**
 * `slug` relocated by moving `from` → `to`, or null when `slug` is outside
 * `from`'s subtree. Prefix matching is segment-aware: moving `alpha` never
 * touches `alpha-x`.
 */
export function relocateSlug(slug: string, from: string, to: string): string | null {
  if (slug === from) return to
  if (slug.startsWith(`${from}/`)) return `${to}${slug.slice(from.length)}`
  return null
}

/**
 * `slugPath` written in the style of the link text `original`: a slug-cased
 * original (`projects/acme`) gets the slug itself; anything else
 * (`Projects/Acme`) gets humanized segments (`Clients/Acme Corp`) — only when
 * they fold back to exactly `slugPath`, so a rewritten link can never point
 * somewhere else than intended.
 */
export function styleLinkPath(original: string, slugPath: string): string {
  const segments = original.trim().split('/').filter(Boolean)
  const last = segments[segments.length - 1] ?? ''
  if (last === '' || last === slugify(last)) return slugPath
  const humanized = slugPath.split('/').map(slugDisplayName).join('/')
  return slugify(humanized) === slugPath ? humanized : slugPath
}

/**
 * Wiki-link target text for a link (originally `original`) whose page now
 * lives at `newSlug`, written on a page whose link base is `newBase` (see
 * wikiLinkBase). A relative original stays relative while the target is still
 * under the base; otherwise — and for absolute originals — it becomes
 * root-absolute `/…`.
 */
export function rewriteWikiTarget(
  original: string,
  newSlug: string,
  newBase: string | null,
): string {
  const relative = !original.trim().startsWith('/')
  if (relative && newBase === null) return styleLinkPath(original, newSlug)
  if (relative && newBase !== null && newSlug.startsWith(`${newBase}/`)) {
    return styleLinkPath(original, newSlug.slice(newBase.length + 1))
  }
  return `/${styleLinkPath(original, newSlug)}`
}

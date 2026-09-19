// ─── Slug policy (shared by server and client) ───────────────────────────────
// Pages live at nested slugs: `blog/post-name`. Slugs are lowercase,
// hyphen-separated segments; titles keep their own casing elsewhere.

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

/** Derive the breadcrumb trail root label from a slug's last segment. */
export function slugDisplayName(slug: string): string {
  const segments = slug.split('/')
  const last = segments[segments.length - 1] ?? slug
  return last
    .split('-')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ')
}

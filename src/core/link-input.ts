// ─── Link input — pure classification and construction for the link field ───
//
// Turns what the user typed into the toolbar's link field (or Ctrl+K) into
// markdown: a wiki link `[[target|label]]` or an external `[label](url)`.
// DOM-free, like editor-format. Everything the reader would refuse to render
// as a link (unsafe schemes, unfoldable page names, syntax-breaking
// characters) is rejected HERE with a message, so the field can never write
// text that silently degrades to literal source.

import type { PageSuggestion, TokenDef } from './types'
import { coveringTokens, type FormatResult } from './editor-format'
import { pageDisplayName, parseWikiLink } from './navigation'
import { isSafeHref } from '../shared/url-policy'
import { navTargetToSlug, wikiLinkAddress } from '../shared/slug'

export type ValidLinkInput =
  | { kind: 'url'; url: string }
  | { kind: 'wiki'; target: string; slug: string }

export type LinkInput = ValidLinkInput | { kind: 'error'; message: string }

/** A single whitespace-free token that is URL-shaped: scheme, `//`, `#frag`,
 *  `?query`, `www.`, or a hostname (a dot never occurs in a page slug, so a
 *  dotted word is unambiguous). */
const URL_SHAPED = /^(?:[a-z][a-z0-9+.-]*:\S*|\/\/\S*|[#?]\S*|www\.\S+|[^\s/]+\.\S+)$/i
const HAS_SCHEME_OR_SLASHES = /^(?:[a-z][a-z0-9+.-]*:|\/\/|[#?])/i

/**
 * Classify the field's text. URL → normalized href (bare hosts get
 * `https://`, `)` is percent-encoded because the link token ends at the first
 * `)`); anything else is a wiki target checked against the slug fold, with
 * the current page's link base applied the way the reader will resolve it.
 */
export function classifyLinkInput(raw: string, linkBase: string | null = null): LinkInput {
  const value = raw.trim()
  if (value === '') return { kind: 'error', message: 'Enter a page name or a URL' }

  if (/^(?:https?:\/\/|www\.)/i.test(value) && /\s/.test(value)) {
    return { kind: 'error', message: 'A URL cannot contain spaces' }
  }

  if (URL_SHAPED.test(value)) {
    const href = (HAS_SCHEME_OR_SLASHES.test(value) ? value : `https://${value}`).replace(
      /\)/g,
      '%29',
    )
    if (!isSafeHref(href)) return { kind: 'error', message: 'That kind of link is not allowed' }
    return { kind: 'url', url: href }
  }

  if (/[\]|]/.test(value)) {
    return { kind: 'error', message: 'A page name cannot contain ] or |' }
  }
  const slug = navTargetToSlug(wikiLinkAddress(value, linkBase))
  if (slug === null) return { kind: 'error', message: 'Not a valid page name' }
  return { kind: 'wiki', target: value, slug }
}

/**
 * The wiki target to write for a suggested page `slug` from a page whose link
 * base is `linkBase`: the base-relative remainder when the page lives under
 * the base, `/slug` (root-absolute) when it does not, the bare slug at root.
 */
export function suggestionTarget(slug: string, linkBase: string | null): string {
  if (!linkBase) return slug
  if (slug.startsWith(`${linkBase}/`)) return slug.slice(linkBase.length + 1)
  return `/${slug}`
}

export interface ExistingLink {
  kind: 'wiki' | 'url'
  /** Raw document offsets of the whole link token. */
  from: number
  to: number
  /** The target as written (wiki target, or the URL). */
  target: string
  /** Visible text: the explicit label, else a wiki link's derived display. */
  label: string
  /** Wiki link written without `|label` (its text follows the target). */
  implicitLabel: boolean
}

/**
 * The `[label](url)` / `[[target|label]]` token the (single-line) selection
 * sits in, found with the registry's own token defs so precedence (wiki
 * before link, images excluded) can never drift from the renderer.
 */
export function findLinkAt(
  text: string,
  start: number,
  end: number,
  defs: readonly TokenDef[],
): ExistingLink | null {
  const token = coveringTokens(text, start, end, defs).find(
    (t) => t.type === 'link' || t.type === 'wiki-link',
  )
  if (!token) return null
  if (token.type === 'link') {
    return {
      kind: 'url',
      from: token.from,
      to: token.to,
      target: token.groups[1] ?? '',
      label: token.groups[0] ?? '',
      implicitLabel: false,
    }
  }
  const inner = token.groups[0] ?? ''
  const { page, display } = parseWikiLink(inner)
  return {
    kind: 'wiki',
    from: token.from,
    to: token.to,
    target: page,
    label: display,
    implicitLabel: !inner.includes('|'),
  }
}

function wikiLiteral(target: string, label: string): string {
  return label === '' || label === pageDisplayName(target)
    ? `[[${target}]]`
    : `[[${target}|${label}]]`
}

/**
 * Build the link for `input` around the selection and return the new text
 * with the caret just after it. A selection inside an existing link rewrites
 * that link (keeping its visible text, switching kind if needed); otherwise
 * the selection becomes the label (no selection: the page name / URL itself
 * shows). Refuses what the link grammar cannot hold: a multi-line selection
 * or a label containing `]`.
 */
export function applyLink(
  text: string,
  start: number,
  end: number,
  input: ValidLinkInput,
  defs: readonly TokenDef[],
): FormatResult | { error: string } {
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))
  const existing = findLinkAt(text, s, e, defs)

  let from = s
  let to = e
  let label = text.slice(s, e)
  if (existing) {
    from = existing.from
    to = existing.to
    label = existing.label
  } else if (label.includes('\n')) {
    return { error: 'Select text on a single line to turn it into a link' }
  }
  if (label.includes(']')) return { error: 'The link text cannot contain ]' }

  const link =
    input.kind === 'url'
      ? `[${label || input.url}](${input.url})`
      : wikiLiteral(input.target, existing?.implicitLabel ? '' : label)
  const caret = from + link.length
  return { text: text.slice(0, from) + link + text.slice(to), start: caret, end: caret }
}

/**
 * Order suggestions for `query`: exact slug/title matches first, then names
 * (title, slug, or last slug segment) that START with the query, then the
 * rest — each group keeps the server's order (newest first).
 */
export function rankSuggestions<T extends PageSuggestion>(query: string, items: readonly T[]): T[] {
  const q = query.trim().toLowerCase().replace(/^\/+/, '')
  const score = (item: T): number => {
    const slug = item.slug.toLowerCase()
    const title = item.title.toLowerCase()
    if (slug === q || title === q) return 0
    const last = slug.slice(slug.lastIndexOf('/') + 1)
    if (slug.startsWith(q) || last.startsWith(q) || title.startsWith(q)) return 1
    return 2
  }
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ item }) => item)
}

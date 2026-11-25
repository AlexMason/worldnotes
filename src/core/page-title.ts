// ─── Page title ──────────────────────────────────────────────────────────────
// One rule for every surface (stored title, reader + editor tab titles and
// breadcrumbs): a page is named by its first H1, else by its humanized slug.
// Runs over the block pass, so a `# x` line inside a code fence is not a
// title. DOM-free (the server derives stored titles with it).
//
// `pageTitle` parses with the plugins' line-level grammar and block regions
// only: inline tokens never decide a title, and inline scanning is the
// expensive part of the pass (pathological one-line content makes it
// quadratic) — it must not run on every autosave or in the boot backfill.

import type { ContentPlugin, DocModel } from './types'
import { buildDocument } from './document'
import { defaultPlugins } from './plugins/defaults'
import { slugDisplayName } from '../shared/slug'

/** Trimmed text of the first non-empty H1 line in `doc`, or null. */
export function titleFromDoc(doc: DocModel): string | null {
  for (const tokens of doc.lines) {
    const only = tokens.length === 1 ? tokens[0] : undefined
    if (only?.type !== 'h1') continue
    const text = (only.groups[0] ?? '').trim()
    if (text) return text
  }
  return null
}

/** `doc`'s title as page `slug`: its first H1, else the slug's label. */
export function titleOfDoc(doc: DocModel, slug: string): string {
  return titleFromDoc(doc) ?? slugDisplayName(slug)
}

const titleGrammars = new WeakMap<ContentPlugin[], ContentPlugin[]>()

/** `plugins` without their inline token defs (memoized per plugin list). */
function titleGrammar(plugins: ContentPlugin[]): ContentPlugin[] {
  let grammar = titleGrammars.get(plugins)
  if (!grammar) {
    grammar = plugins.map((p) => ({
      ...p,
      tokens: p.tokens.filter((d) => d.pattern.source.startsWith('^')),
    }))
    titleGrammars.set(plugins, grammar)
  }
  return grammar
}

/** The title of page `slug` holding `content`: first H1, else the slug's label. */
export function pageTitle(
  content: string,
  slug: string,
  plugins: ContentPlugin[] = defaultPlugins,
): string {
  return titleOfDoc(buildDocument(content, titleGrammar(plugins)), slug)
}

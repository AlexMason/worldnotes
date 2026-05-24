import type { ContentPlugin } from '../types'
import { wikiLinkPlugin } from './wikiLink'
import { headingsPlugin } from './headings'
import { boldPlugin, italicPlugin, inlineCodePlugin, blockquotePlugin, hrPlugin } from './inline'
import { linkPlugin } from './link'
import { strikethroughPlugin } from './strikethrough'

/**
 * The default plugin set loaded by createEditor() when no plugins are specified.
 *
 * Includes: wiki links, headings (h1/h2/h3), bold, italic,
 * inline code, blockquotes, and horizontal rules.
 */
export const defaultPlugins: ContentPlugin[] = [
  headingsPlugin, // line-level — must come before inline plugins
  hrPlugin, // line-level
  blockquotePlugin, // line-level
  wikiLinkPlugin, // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  linkPlugin, // inline — [text](url) after [[...]]
  boldPlugin, // inline — ** before * to avoid partial match
  italicPlugin, // inline
  strikethroughPlugin, // inline — ~~text~~ (no conflict with * patterns)
  inlineCodePlugin, // inline
]

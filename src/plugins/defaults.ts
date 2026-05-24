import type { Plugin } from '../types'
import { wikiLinkPlugin } from './wikiLink'
import { headingsPlugin } from './headings'
import { boldPlugin, italicPlugin, inlineCodePlugin, blockquotePlugin, hrPlugin } from './inline'

/**
 * The default plugin set loaded by createEditor() when no plugins are specified.
 *
 * Includes: wiki links, headings (h1/h2/h3), bold, italic,
 * inline code, blockquotes, and horizontal rules.
 */
export const defaultPlugins: Plugin[] = [
  headingsPlugin, // line-level — must come before inline plugins
  hrPlugin, // line-level
  blockquotePlugin, // line-level
  wikiLinkPlugin, // inline
  boldPlugin, // inline — ** before * to avoid partial match
  italicPlugin, // inline
  inlineCodePlugin, // inline
]

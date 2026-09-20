import type { ContentPlugin } from '../types'
import { wikiLinkPlugin } from './wikiLink'
import { headingsPlugin } from './headings'
import { boldPlugin, italicPlugin, inlineCodePlugin, blockquotePlugin, hrPlugin } from './inline'
import { linkPlugin } from './link'
import { imagePlugin } from './image'
import { strikethroughPlugin } from './strikethrough'
import { listItemPlugin } from './listItem'
import { codeBlockPlugin } from './codeBlock'
import { tablePlugin } from './table'

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
  listItemPlugin, // line-level
  codeBlockPlugin, // BLOCK — fenced ``` regions; registered before any other
  // block def so earliest-start ties resolve fences first (document.ts)
  tablePlugin, // BLOCK — pipe tables; header+separator detection, flex rows
  wikiLinkPlugin, // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  imagePlugin, // inline — ![alt](src) before [text](url): the `!` match binds
  // at scan index 0, so the link pattern never claims the inner text (see
  // defaults ordering note in docs/architecture.md)
  linkPlugin, // inline — [text](url) after [[...]] and ![...](...)
  boldPlugin, // inline — ** before * to avoid partial match
  italicPlugin, // inline
  strikethroughPlugin, // inline — ~~text~~ (no conflict with * patterns)
  inlineCodePlugin, // inline
]

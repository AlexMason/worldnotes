// ─── Viewer (read path) renderer ─────────────────────────────────────────────
// markdown-it (CommonMark + default extras: tables, ~~strike~~) with html:false
// so author-written HTML is escaped, our URL policy for hrefs, a [[wiki-link]]
// inline rule that emits real nested-slug links, and task-list checkboxes.
// NOTE: deliberately separate from the editor's edit-preview renderToHTML.

import markdownit from 'markdown-it'
import type { MarkdownIt, StateCore, StateInline, Token as MdToken } from 'markdown-it'
import { isSafeHref } from '../../shared/url-policy'
import { wikiTargetToSlug } from '../../shared/slug'

export type WikiLinkResolver = (target: string) => string | null

const CHECKBOX_RE = /^\[([ xX])\][ \t]+/

function taskCheckboxes(state: StateCore): void {
  for (const inline of state.tokens) {
    if (inline.type !== 'inline') continue
    const children = inline.children
    if (!children || children.length === 0) continue
    const first = children[0]!
    if (first.type !== 'text') continue
    const match = CHECKBOX_RE.exec(first.content)
    if (!match) continue
    const checked = match[1] !== ' '
    const rest = first.content.slice(match[0].length)

    const input: MdToken = new state.Token('html_inline', '', 0)
    input.content = `<input type="checkbox" class="wn-task" disabled${checked ? ' checked' : ''}>`
    const spacer: MdToken = new state.Token('text', '', 0)
    spacer.content = ' '

    if (rest === '') children.splice(0, 1, input, spacer)
    else {
      first.content = rest
      children.splice(0, 0, input, spacer)
    }
  }
}

function wikiLink(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x5b || src.charCodeAt(start + 1) !== 0x5b) return false

  const closeIdx = src.indexOf(']]', start + 2)
  if (closeIdx === -1) return false

  const inner = src.slice(start + 2, closeIdx)
  if (inner.length === 0 || inner.includes('[')) return false

  const pipe = inner.indexOf('|')
  const target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim()
  const display = (pipe === -1 ? target : inner.slice(pipe + 1).trim()) || target
  const href = wikiTargetToSlug(target)
  if (href === null) return false // non-foldable target stays literal text

  if (!silent) {
    const open = state.push('link_open', 'a', 1)
    open.attrs = [['href', `/${href}`], ['class', 'wn-wiki-link']]
    open.markup = '[['
    const text = state.push('text', '', 0)
    text.content = display
    const close = state.push('link_close', 'a', -1)
    close.markup = ']]'
  }
  state.pos = closeIdx + 2
  return true
}

export function createViewerRenderer(): MarkdownIt {
  const md = markdownit({
    html: false, // author HTML is escaped — readers can never execute author markup
    linkify: true,
    breaks: true, // the editor is line-oriented; keep single newlines as <br>
  })
  // v15 exposes link scheme policy as an overridable instance method
  const baseValidate = md.validateLink.bind(md)
  md.validateLink = (url: string): boolean => baseValidate(url) && isSafeHref(url)

  md.inline.ruler.before('link', 'worldnotes_wiki', wikiLink)
  md.core.ruler.after('inline', 'worldnotes_tasks', taskCheckboxes)

  // External links get noopener; internal ones stay plain.
  const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx].attrGet('href') ?? '')
    if (/^https?:/i.test(href)) {
      tokens[idx].attrSet('rel', 'noopener noreferrer nofollow')
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  return md
}

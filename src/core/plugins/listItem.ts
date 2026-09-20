import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import {
  parseListItem,
  indentLine,
  dedentLine,
  LIST_ITEM_RE,
  isBulletMarker,
} from '../editor-indentation'
import { getLineOffset } from '../caret-offset'

import { escapeHTML, escapeAttr } from '../escape'

function renderListItem(token: Token, context: EditorContext): HTMLElement {
  const indent = token.groups[0] ?? ''
  const marker = token.groups[1] ?? '-'
  const contentText = token.groups[2] ?? ''

  const wrapper = document.createElement('span')
  wrapper.className = 'wn-list-item'
  wrapper.dataset.raw = token.raw

  if (indent) {
    const indentSpan = document.createElement('span')
    indentSpan.className = 'wn-list-item-indent'
    indentSpan.setAttribute('aria-hidden', 'true')
    indentSpan.textContent = indent
    wrapper.appendChild(indentSpan)
  }

  const markerSpan = document.createElement('span')
  markerSpan.className = 'wn-list-item-marker'
  markerSpan.setAttribute('aria-hidden', 'true')
  // D2: bullet markers display •; ordered markers display as typed (D1).
  // Source fidelity lives in the wrapper's data-raw, not in this glyph.
  markerSpan.textContent = (isBulletMarker(marker) ? '•' : marker) + ' '
  wrapper.appendChild(markerSpan)

  const contentSpan = document.createElement('span')
  contentSpan.className = 'wn-list-item-content'

  if (context.renderInline) {
    contentSpan.appendChild(context.renderInline(contentText))
  } else {
    contentSpan.textContent = contentText
  }

  wrapper.appendChild(contentSpan)
  return wrapper
}

export const listItemPlugin: ContentPlugin = {
  name: 'list-item',
  version: '1.0.0',
  kind: 'content',

  tokens: [{ type: 'list-item', pattern: LIST_ITEM_RE }],

  render(token: Token, context: EditorContext): HTMLElement {
    return renderListItem(token, context)
  },

  renderToHTML(token: Token, context: StaticRenderContext): string {
    const indent = token.groups[0] ?? ''
    const marker = token.groups[1] ?? '-'
    const contentText = token.groups[2] ?? ''
    const inner = context.renderInline(contentText)

    let html = `<span class="wn-list-item" data-raw="${escapeAttr(token.raw)}">`
    if (indent) {
      html += `<span class="wn-list-item-indent" aria-hidden="true">${escapeHTML(indent)}</span>`
    }
    // Same display rule as the DOM path: • for bullets, typed marker for
    // ordered items (single-renderer — one grammar, one display).
    const displayMarker = isBulletMarker(marker) ? '•' : marker
    html += `<span class="wn-list-item-marker" aria-hidden="true">${escapeHTML(displayMarker)} </span>`
    html += `<span class="wn-list-item-content">${inner}</span>`
    html += '</span>'
    return html
  },

  onKeydown(event: KeyboardEvent, context: EditorContext): { cursorOffset: number } | false | void {
    if (event.key === 'Tab' && !event.shiftKey) {
      return handleTab(context)
    }
    if (event.key === 'Tab' && event.shiftKey) {
      return handleShiftTab(context)
    }
    if (event.key === 'Enter') {
      return handleEnter(context)
    }
  },
}

// ── Keydown handlers ───────────────────────────────────────────────────────────

/**
 * Shared keydown preamble: resolve the caret's line, editor root, and list
 * parse — or bail.
 *
 * Bails INSIDE block regions (region line divs carry data-block): a fenced
 * shell sample `1. install pkg` is NOT a list item, and Tab/Enter must never
 * splice markers into or dedent real code (review B5).
 *
 * Walks to the [contenteditable] root instead of `parentElement`: with block
 * wrappers a line div's parent is no longer the editor root, and the old
 * assumption silently region-scoped the caret offset.
 */
interface ListLineTarget {
  editorEl: HTMLElement
  lineIndex: number
  cursorOffset: number
  lineText: string
  raw: string
  parsed: NonNullable<ReturnType<typeof parseListItem>>
}

function resolveListLine(context: EditorContext): ListLineTarget | null {
  const page = context.getCurrentPage()
  if (!(page in context.getWorld())) return null

  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }
  if (!node || !(node instanceof HTMLElement)) return null
  if (node.dataset.block !== undefined) return null // inside a block region

  const editorEl = node.closest('[contenteditable="true"]') as HTMLElement | null
  if (!editorEl) return null

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const cursorOffset = getLineOffset(editorEl)

  const raw = context.getPageText(page)
  const lineText = raw.split('\n')[lineIndex] ?? ''
  const parsed = parseListItem(lineText)
  if (!parsed) return null

  return { editorEl, lineIndex, cursorOffset, lineText, raw, parsed }
}

function handleTab(context: EditorContext): { cursorOffset: number } | false {
  const target = resolveListLine(context)
  if (!target) return false
  const { lineIndex, cursorOffset } = target

  const page = context.getCurrentPage()
  const lines = target.raw.split('\n')
  lines[lineIndex] = indentLine(lines[lineIndex] ?? '')
  context.setPageText(page, lines.join('\n'))

  return { cursorOffset: cursorOffset + 2 }
}

function handleShiftTab(context: EditorContext): { cursorOffset: number } | false {
  const target = resolveListLine(context)
  if (!target) return false
  const { lineIndex, cursorOffset, raw } = target

  const page = context.getCurrentPage()
  const lines = raw.split('\n')
  const dedented = dedentLine(lines[lineIndex] ?? '')
  if (dedented === null) return { cursorOffset }

  lines[lineIndex] = dedented
  context.setPageText(page, lines.join('\n'))

  const lineStart = getLineStart(raw, lineIndex)
  return { cursorOffset: Math.max(lineStart, cursorOffset - 2) }
}

function handleEnter(context: EditorContext): { cursorOffset: number } | false {
  const target = resolveListLine(context)
  if (!target) return false
  const { lineIndex, cursorOffset, lineText, raw, parsed } = target

  const page = context.getCurrentPage()
  const lines = raw.split('\n')

  const lineStart = getLineStart(raw, lineIndex)
  const cursorPosInLine = cursorOffset - lineStart
  const clamped = Math.max(0, Math.min(cursorPosInLine, lineText.length))

  const prefix = parsed.indent + parsed.marker + ' '

  if (parsed.content.trim() === '') {
    lines.splice(lineIndex, 1, '')
    context.setPageText(page, lines.join('\n'))
    return { cursorOffset: lineStart }
  }

  const contentOffset = Math.max(0, clamped - prefix.length)
  const leftContent = parsed.content.slice(0, contentOffset)
  const rightContent = parsed.content.slice(contentOffset)
  const newFirstLine = prefix + leftContent
  const newSecondLine = prefix + rightContent

  lines.splice(lineIndex, 1, newFirstLine, newSecondLine)
  const newRaw = lines.join('\n')
  context.setPageText(page, newRaw)

  const newLineStart = getLineStart(newRaw, lineIndex + 1)
  return { cursorOffset: newLineStart + newSecondLine.length }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLineStart(text: string, lineIndex: number): number {
  if (lineIndex === 0) return 0
  let count = 0
  let pos = 0
  while (count < lineIndex) {
    pos = text.indexOf('\n', pos)
    if (pos === -1) return text.length
    pos++
    count++
  }
  return pos
}

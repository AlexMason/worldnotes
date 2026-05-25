import type * as Y from 'yjs'
import type {
  ContentPlugin,
  Token,
  EditorContext,
  StaticRenderContext,
} from '../types'
import {
  parseListItem,
  indentLine,
  dedentLine,
} from '../editor-indentation'
import { getLineOffset } from '../awareness-cursor'

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderListItem(
  token: Token,
  context: EditorContext,
): HTMLElement {
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
  markerSpan.textContent = marker + ' '
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

  tokens: [{ type: 'list-item', pattern: /^(\s*)([-*+])\s(.*)$/ }],

  render(token: Token, context: EditorContext): HTMLElement {
    return renderListItem(token, context)
  },

  renderToHTML(token: Token, context: StaticRenderContext): string {
    const indent = token.groups[0] ?? ''
    const marker = token.groups[1] ?? '-'
    const contentText = token.groups[2] ?? ''
    const inner = context.renderInline(contentText)

    let html = `<span class="wn-list-item" data-raw="${escapeHTML(token.raw)}">`
    if (indent) {
      html += `<span class="wn-list-item-indent" aria-hidden="true">${escapeHTML(indent)}</span>`
    }
    html += `<span class="wn-list-item-marker" aria-hidden="true">${escapeHTML(marker)} </span>`
    html += `<span class="wn-list-item-content">${inner}</span>`
    html += '</span>'
    return html
  },

  onKeydown(
    event: KeyboardEvent,
    context: EditorContext,
  ): { cursorOffset: number } | false | void {
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

function handleTab(context: EditorContext): { cursorOffset: number } | false {
  const doc = context.getDoc()
  const trail = context.getTrail()
  const page = trail[trail.length - 1]
  const pages = doc.getMap<Y.Text>('pages')

  const ytext = pages.get(page)
  if (!ytext) return false

  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }
  if (!node || !(node instanceof HTMLElement)) return false

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const editorEl = node.parentElement
  if (!editorEl) return false
  const cursorOffset = getLineOffset(editorEl as HTMLElement)

  const result = doc.transact(() => {
    const raw = ytext.toString()
    const lines = raw.split('\n')
    const lineText = lines[lineIndex] ?? ''
    const parsed = parseListItem(lineText)
    if (!parsed) return null

    const newLine = indentLine(lineText)
    lines[lineIndex] = newLine
    const newRaw = lines.join('\n')

    ytext.delete(0, raw.length)
    ytext.insert(0, newRaw)

    return cursorOffset + 2
  })

  if (result === null) return false
  return { cursorOffset: result }
}

function handleShiftTab(context: EditorContext): { cursorOffset: number } | false {
  const doc = context.getDoc()
  const trail = context.getTrail()
  const page = trail[trail.length - 1]
  const pages = doc.getMap<Y.Text>('pages')

  const ytext = pages.get(page)
  if (!ytext) return false

  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }
  if (!node || !(node instanceof HTMLElement)) return false

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const editorEl = node.parentElement
  if (!editorEl) return false
  const cursorOffset = getLineOffset(editorEl as HTMLElement)

  const result = doc.transact(() => {
    const raw = ytext.toString()
    const lines = raw.split('\n')
    const lineText = lines[lineIndex] ?? ''
    const parsed = parseListItem(lineText)
    if (!parsed) return null

    const dedented = dedentLine(lineText)
    if (dedented === null) return cursorOffset

    lines[lineIndex] = dedented
    const newRaw = lines.join('\n')

    ytext.delete(0, raw.length)
    ytext.insert(0, newRaw)

    const lineStart = getLineStart(raw, lineIndex)
    return Math.max(lineStart, cursorOffset - 2)
  })

  if (result === null) return false
  return { cursorOffset: result }
}

function handleEnter(context: EditorContext): { cursorOffset: number } | false {
  const doc = context.getDoc()
  const trail = context.getTrail()
  const page = trail[trail.length - 1]
  const pages = doc.getMap<Y.Text>('pages')

  const ytext = pages.get(page)
  if (!ytext) return false

  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }
  if (!node || !(node instanceof HTMLElement)) return false

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const editorEl = node.parentElement
  if (!editorEl) return false
  const cursorOffset = getLineOffset(editorEl as HTMLElement)

  const result = doc.transact(() => {
    const raw = ytext.toString()
    const lines = raw.split('\n')
    const lineText = lines[lineIndex] ?? ''
    const parsed = parseListItem(lineText)
    if (!parsed) return null

    const lineStart = getLineStart(raw, lineIndex)
    const cursorPosInLine = cursorOffset - lineStart
    const clamped = Math.max(0, Math.min(cursorPosInLine, lineText.length))

    const prefix = parsed.indent + parsed.marker + ' '
    const totalContent = parsed.content

    if (totalContent.trim() === '') {
      lines.splice(lineIndex, 1, '')
      const newRaw = lines.join('\n')
      ytext.delete(0, raw.length)
      ytext.insert(0, newRaw)
      return lineStart
    }

    const contentOffset = Math.max(0, clamped - prefix.length)
    const leftContent = parsed.content.slice(0, contentOffset)
    const rightContent = parsed.content.slice(contentOffset)
    const newFirstLine = prefix + leftContent
    const newSecondLine = prefix + rightContent

    lines.splice(lineIndex, 1, newFirstLine, newSecondLine)
    const newRaw = lines.join('\n')
    ytext.delete(0, raw.length)
    ytext.insert(0, newRaw)

    const newLineStart = getLineStart(newRaw, lineIndex + 1)
    return newLineStart + newSecondLine.length
  })

  if (result === null) return false
  return { cursorOffset: result }
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

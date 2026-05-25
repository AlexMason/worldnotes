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

    let html = '<span class="wn-list-item">'
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

  const raw = ytext.toString()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }

  if (!node || !(node instanceof HTMLElement)) return false

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const lines = raw.split('\n')
  const lineText = lines[lineIndex] ?? ''

  const parsed = parseListItem(lineText)
  if (!parsed) return false

  const cursorOffset = getCursorOffsetInRaw(sel)
  const newLine = indentLine(lineText)
  lines[lineIndex] = newLine
  const newRaw = lines.join('\n')

  const newOffset = cursorOffset + 2

  doc.transact(() => {
    ytext.delete(0, raw.length)
    ytext.insert(0, newRaw)
  })

  return { cursorOffset: newOffset }
}

function handleShiftTab(context: EditorContext): { cursorOffset: number } | false {
  const doc = context.getDoc()
  const trail = context.getTrail()
  const page = trail[trail.length - 1]
  const pages = doc.getMap<Y.Text>('pages')

  const ytext = pages.get(page)
  if (!ytext) return false

  const raw = ytext.toString()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }

  if (!node || !(node instanceof HTMLElement)) return false

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const lines = raw.split('\n')
  const lineText = lines[lineIndex] ?? ''

  const parsed = parseListItem(lineText)
  if (!parsed) return false

  const dedented = dedentLine(lineText)
  if (dedented === null) {
    const cursorOffset = getCursorOffsetInRaw(sel)
    return { cursorOffset }
  }

  lines[lineIndex] = dedented
  const newRaw = lines.join('\n')

  const cursorOffset = getCursorOffsetInRaw(sel)
  const lineStart = getLineStart(raw, lineIndex)
  const newOffset = Math.max(lineStart, cursorOffset - 2)

  doc.transact(() => {
    ytext.delete(0, raw.length)
    ytext.insert(0, newRaw)
  })

  return { cursorOffset: newOffset }
}

function handleEnter(context: EditorContext): { cursorOffset: number } | false {
  const doc = context.getDoc()
  const trail = context.getTrail()
  const page = trail[trail.length - 1]
  const pages = doc.getMap<Y.Text>('pages')

  const ytext = pages.get(page)
  if (!ytext) return false

  const raw = ytext.toString()
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false

  const range = sel.getRangeAt(0)
  let node: Node | null = range.startContainer
  while (node && !(node instanceof HTMLElement && node.dataset.line !== undefined)) {
    node = node.parentNode
  }

  if (!node || !(node instanceof HTMLElement)) return false

  const lineIndex = parseInt(node.dataset.line ?? '0', 10)
  const lines = raw.split('\n')
  const lineText = lines[lineIndex] ?? ''

  const parsed = parseListItem(lineText)
  if (!parsed) return false

  const lineStart = getLineStart(raw, lineIndex)
  const cursorOffset = getCursorOffsetInRaw(sel)
  const cursorPosInLine = cursorOffset - lineStart
  const clamped = Math.max(0, Math.min(cursorPosInLine, lineText.length))

  const leftOfCursor = lineText.slice(0, clamped)
  const rightOfCursor = lineText.slice(clamped)

  const prefix = parsed.indent + parsed.marker + ' '
  const totalContent = parsed.content

  if (totalContent.trim() === '') {
    lines.splice(lineIndex, 1, '')
    const newRaw = lines.join('\n')
    const newOffset = lineStart

    doc.transact(() => {
      ytext.delete(0, raw.length)
      ytext.insert(0, newRaw)
    })

    return { cursorOffset: newOffset }
  }

  const newFirstLine = prefix + leftOfCursor.slice(prefix.length)
  const newSecondLine = prefix + rightOfCursor.slice(prefix.length)

  lines.splice(lineIndex, 1, newFirstLine, newSecondLine)
  const newRaw = lines.join('\n')

  const newLineStart = getLineStart(newRaw, lineIndex + 1)
  const newOffset = newLineStart + newSecondLine.length

  doc.transact(() => {
    ytext.delete(0, raw.length)
    ytext.insert(0, newRaw)
  })

  return { cursorOffset: newOffset }
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

function getCursorOffsetInRaw(sel: Selection): number {
  if (!sel.rangeCount) return 0
  const range = sel.getRangeAt(0)
  const container = range.startContainer

  const lineEls = Array.from(
    document.querySelectorAll('[data-line]'),
  ) as HTMLElement[]
  lineEls.sort((a, b) => {
    return (
      parseInt(a.dataset.line ?? '0', 10) -
      parseInt(b.dataset.line ?? '0', 10)
    )
  })

  let rawOffset = 0

  for (const lineEl of lineEls) {
    const lineLen = rawLineLength(lineEl)

    if (lineEl.contains(container) || lineEl === container) {
      rawOffset += rawOffsetInLine(lineEl, container, range.startOffset)
      return rawOffset
    }

    rawOffset += lineLen + 1
  }

  return rawOffset
}

function rawLineLength(el: HTMLElement): number {
  let len = 0
  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      len += (node as Text).length
    } else if (node instanceof HTMLElement) {
      if (node.dataset.raw !== undefined) {
        len += node.dataset.raw.length
      } else {
        node.childNodes.forEach(walk)
      }
    }
  }
  walk(el)
  return len
}

function rawOffsetInLine(
  lineEl: HTMLElement,
  target: Node,
  offsetInNode: number,
): number {
  let offset = 0

  function walk(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node === target) {
        offset += Math.min(offsetInNode, (node as Text).length)
        return true
      }
      offset += (node as Text).length
      return false
    }
    if (node instanceof HTMLElement && node.dataset.raw !== undefined) {
      const rawLen = node.dataset.raw.length
      if (node === target || node.contains(target)) {
        let childOff = 0
        let found = false
        function walkChild(child: Node): void {
          if (found) return
          if (child.nodeType === Node.TEXT_NODE) {
            if (child === target) {
              childOff += Math.min(offsetInNode, (child as Text).length)
              found = true
              return
            }
            childOff += (child as Text).length
            return
          }
          child.childNodes.forEach(walkChild)
        }
        node.childNodes.forEach(walkChild)
        offset += Math.min(childOff, rawLen)
        return true
      }
      offset += rawLen
      return false
    }
    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true
    }
    return false
  }

  walk(lineEl)
  return offset
}

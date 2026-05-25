# ListItem Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a listItem content plugin for unordered markdown lists (`-`, `*`, `+`) with Tab/Shift+Tab indentation and Enter auto-continuation.

**Architecture:** Add an `onKeydown` hook to the ContentPlugin interface that lets plugins intercept keyboard events. The listItem plugin tokenizes list-item lines, renders them with dimmed markers, and handles Tab/Shift+Tab/Enter via the new hook. Indentation utilities are pure text functions in a separate module.

**Tech Stack:** TypeScript, Yjs CRDT, happy-dom for tests, Vitest

**Spec:** `docs/superpowers/specs/2026-05-25-listitem-plugin-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types.ts` | Add `onKeydown` hook signature to `ContentPlugin` |
| `src/editor-lifecycle.ts` | Add plugin keydown dispatch loop before existing Tab/Enter/Backspace handlers |
| `src/editor-render.ts` | Accept optional cursor offset override in `render()` |
| `src/editor-indentation.ts` | **New** — Pure text indentation utilities (parseListItem, indentLine, dedentLine, getLineAtOffset) |
| `src/plugins/listItem.ts` | **New** — listItem content plugin (token, render, renderToHTML, onKeydown) |
| `src/editor-dom.ts` | Add list-item CSS rules to DEFAULT_CSS |
| `src/plugins/defaults.ts` | Register `listItemPlugin` in `defaultPlugins` |
| `src/plugins/index.ts` | Re-export `listItemPlugin` |
| `src/__tests__/editor-indentation.test.ts` | **New** — Tests for indentation utilities |
| `src/__tests__/listItem.test.ts` | **New** — Tests for plugin tokenization, rendering, keydown behavior |

---

### Task 1: Add `onKeydown` hook to ContentPlugin

**Files:**
- Modify: `src/types.ts`
- Modify: `src/editor-render.ts`
- Modify: `src/editor-lifecycle.ts`

- [ ] **Step 1: Add `onKeydown` to the ContentPlugin interface**

```typescript
// src/types.ts — add after the onUpdate? line inside ContentPlugin
  /**
   * Optional: intercept keyboard events before default handling.
   * Called for each content plugin (in registration order) on keydown.
   * Return { cursorOffset: number } to signal the event was consumed and
   * provide the new cursor position after the operation.
   * Return false/void to let the next plugin or default handler run.
   *
   * @param event   - The raw KeyboardEvent
   * @param context - EditorContext for document access
   */
  onKeydown?(
    event: KeyboardEvent,
    context: EditorContext,
  ): { cursorOffset: number } | false | void
```

- [ ] **Step 2: Add optional cursor offset override to render()**

The `render()` function in `editor-render.ts` currently captures cursor offset from the DOM before the render, then restores it after. We need a way to pass an explicit offset for when the Y.Text was modified directly (not through DOM input).

```typescript
// src/editor-render.ts — modify EditorRenderAPI interface
export interface EditorRenderAPI {
  render(force?: boolean, cursorOffset?: number): void
  renderBreadcrumb(): void
  syncUrlToTrail(): void
  checkSelectChange(): void
}

// In the render() function body, modify the offset capture:
function render(_force = false, cursorOffset?: number): void {
    const offset = cursorOffset ?? getLineOffset(editorDiv)
    // ... rest of function uses `offset` as before
```

The existing line `const offset = getLineOffset(editorDiv)` changes to:
```typescript
const offset = cursorOffset ?? getLineOffset(editorDiv)
```

- [ ] **Step 3: Add plugin keydown dispatch in editor-lifecycle.ts**

In the `keydown` event listener, BEFORE the existing Undo/Redo/Tab/Enter/Backspace handlers, insert the plugin dispatch loop. Place it right after the undo/redo checks (after line 226) and before the Tab handler (line 228).

```typescript
// src/editor-lifecycle.ts — insert before existing Tab handler (line 228)

      // ── Plugin keydown dispatch ─────────────────────────────────────
      // Give content plugins first crack at keyboard events so they can
      // implement custom behaviors (list indentation, etc.).
      // First plugin to return { cursorOffset } wins.
      {
        const trail = state.getTrail()
        const page = trail[trail.length - 1]
        const ytext = yDocState.getPage(page)
        const rawBefore = ytext.toString()

        const context: EditorContext = {
          navigate: (p: string) => { void navigation.navigateToPage(p) },
          getTrail: () => state.getTrail(),
          getWorld: () => yDocState.getWorld(),
          getDoc: () => yDocState.doc,
        }

        for (const plugin of contentPlugins) {
          if (!plugin.onKeydown) continue
          const result = plugin.onKeydown(e, context)
          if (result && typeof result === 'object' && 'cursorOffset' in result) {
            e.preventDefault()
            render.render(true, result.cursorOffset)
            saveDebounced()
            return
          }
        }
      }

      // existing Tab handler:
      if (e.key === 'Tab') {
```

- [ ] **Step 4: Run typecheck to verify no type errors**

Run: `npm run typecheck`
Expected: PASS (no errors related to the new onKeydown field or render signature change)

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/editor-render.ts src/editor-lifecycle.ts
git commit -m "feat: add onKeydown hook to ContentPlugin and render cursor override"
```

---

### Task 2: Create indentation utilities

**Files:**
- Create: `src/editor-indentation.ts`

- [ ] **Step 1: Write the utility module**

```typescript
// src/editor-indentation.ts

/**
 * Extract the parts of a list-item line.
 * Returns null if the line doesn't match the list-item pattern.
 *
 * Pattern: ^(\s*)([-*+])\s(.*)$
 */
export interface ListItemParts {
  indent: string   // leading spaces ("" for level 0)
  marker: string   // "-", "*", or "+"
  content: string  // text after marker + space
}

const LIST_ITEM_RE = /^(\s*)([-*+])\s(.*)$/

export function parseListItem(line: string): ListItemParts | null {
  const m = line.match(LIST_ITEM_RE)
  if (!m) return null
  return {
    indent: m[1] ?? '',
    marker: m[2] ?? '-',
    content: m[3] ?? '',
  }
}

/** Add 2 spaces to the start of a line. */
export function indentLine(line: string): string {
  return '  ' + line
}

/**
 * Remove 2 leading spaces from a line.
 * Returns null if the line has fewer than 2 leading spaces.
 */
export function dedentLine(line: string): string | null {
  if (!line.startsWith('  ')) return null
  return line.slice(2)
}

/**
 * Given full document text and a cursor offset, find the line containing
 * the cursor and its positional metadata.
 */
export interface LineOffset {
  lineIndex: number   // 0-based line index
  lineStart: number   // character offset where this line starts
  lineText: string    // the full line text (without trailing newline)
}

export function getLineAtOffset(text: string, offset: number): LineOffset {
  // Clamp offset to valid range
  const clamped = Math.max(0, Math.min(offset, text.length))

  let lineIndex = 0
  let lineStart = 0

  for (let i = 0; i < clamped; i++) {
    if (text[i] === '\n') {
      lineIndex++
      lineStart = i + 1
    }
  }

  // Find end of line
  let lineEnd = text.indexOf('\n', lineStart)
  if (lineEnd === -1) lineEnd = text.length

  return {
    lineIndex,
    lineStart,
    lineText: text.slice(lineStart, lineEnd),
  }
}

/**
 * Replace a single line in a multi-line text string.
 */
export function replaceLine(
  text: string,
  lineIndex: number,
  newLine: string,
): string {
  const lines = text.split('\n')
  lines[lineIndex] = newLine
  return lines.join('\n')
}

/**
 * Insert text at a specific raw offset within a full document string.
 */
export function insertAtOffset(
  text: string,
  offset: number,
  insertion: string,
): string {
  return text.slice(0, offset) + insertion + text.slice(offset)
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/editor-indentation.test.ts`:

```typescript
// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import {
  parseListItem,
  indentLine,
  dedentLine,
  getLineAtOffset,
  replaceLine,
  insertAtOffset,
} from '../editor-indentation'

describe('parseListItem', () => {
  it('parses a dash list item', () => {
    const result = parseListItem('- milk')
    expect(result).toEqual({ indent: '', marker: '-', content: 'milk' })
  })

  it('parses an asterisk list item', () => {
    const result = parseListItem('* eggs')
    expect(result).toEqual({ indent: '', marker: '*', content: 'eggs' })
  })

  it('parses a plus list item', () => {
    const result = parseListItem('+ butter')
    expect(result).toEqual({ indent: '', marker: '+', content: 'butter' })
  })

  it('parses an indented list item', () => {
    const result = parseListItem('  - nested')
    expect(result).toEqual({ indent: '  ', marker: '-', content: 'nested' })
  })

  it('parses a deeply indented list item', () => {
    const result = parseListItem('    * deep')
    expect(result).toEqual({ indent: '    ', marker: '*', content: 'deep' })
  })

  it('returns null for non-list lines', () => {
    expect(parseListItem('plain text')).toBeNull()
    expect(parseListItem('# heading')).toBeNull()
    expect(parseListItem('> quote')).toBeNull()
    expect(parseListItem('')).toBeNull()
  })

  it('returns null for marker without space', () => {
    expect(parseListItem('-no-space')).toBeNull()
  })

  it('returns null for marker with only space and no content', () => {
    // "- " is a valid list item with empty content
    const result = parseListItem('- ')
    expect(result).not.toBeNull()
    expect(result!.content).toBe('')
  })

  it('handles multiple spaces after marker', () => {
    // Regex requires exactly one space after marker: \s matches one space
    const result = parseListItem('-   extra spaces')
    expect(result).toEqual({ indent: '', marker: '-', content: '  extra spaces' })
  })
})

describe('indentLine', () => {
  it('adds two spaces to a line', () => {
    expect(indentLine('- item')).toBe('  - item')
  })

  it('adds two spaces to an already indented line', () => {
    expect(indentLine('  - item')).toBe('    - item')
  })

  it('handles empty string', () => {
    expect(indentLine('')).toBe('  ')
  })
})

describe('dedentLine', () => {
  it('removes two leading spaces', () => {
    expect(dedentLine('  - item')).toBe('- item')
  })

  it('removes two spaces from deeply indented line', () => {
    expect(dedentLine('    - item')).toBe('  - item')
  })

  it('returns null when fewer than 2 leading spaces', () => {
    expect(dedentLine('- item')).toBeNull()
    expect(dedentLine(' - item')).toBeNull()
    expect(dedentLine('')).toBeNull()
  })
})

describe('getLineAtOffset', () => {
  it('finds the first line', () => {
    const result = getLineAtOffset('- milk\n- eggs\n- bread', 0)
    expect(result.lineIndex).toBe(0)
    expect(result.lineStart).toBe(0)
    expect(result.lineText).toBe('- milk')
  })

  it('finds a middle line', () => {
    const result = getLineAtOffset('- milk\n- eggs\n- bread', 10)
    expect(result.lineIndex).toBe(1)
    expect(result.lineText).toBe('- eggs')
  })

  it('finds the last line', () => {
    const result = getLineAtOffset('- milk\n- eggs\n- bread', 20)
    expect(result.lineIndex).toBe(2)
    expect(result.lineText).toBe('- bread')
  })

  it('handles offset at newline character', () => {
    // Offset 6 is the '\n' after "- milk"
    const result = getLineAtOffset('- milk\n- eggs', 6)
    expect(result.lineIndex).toBe(1)
    expect(result.lineText).toBe('- eggs')
  })

  it('clamps offset beyond text length', () => {
    const result = getLineAtOffset('hello', 100)
    expect(result.lineIndex).toBe(0)
    expect(result.lineText).toBe('hello')
  })
})

describe('replaceLine', () => {
  it('replaces a line by index', () => {
    const result = replaceLine('a\nb\nc', 1, 'X')
    expect(result).toBe('a\nX\nc')
  })

  it('replaces the first line', () => {
    const result = replaceLine('a\nb\nc', 0, 'X')
    expect(result).toBe('X\nb\nc')
  })

  it('replaces the last line', () => {
    const result = replaceLine('a\nb\nc', 2, 'X')
    expect(result).toBe('a\nb\nX')
  })
})

describe('insertAtOffset', () => {
  it('inserts text at the beginning', () => {
    expect(insertAtOffset('world', 0, 'hello ')).toBe('hello world')
  })

  it('inserts text in the middle', () => {
    expect(insertAtOffset('hello world', 6, 'beautiful ')).toBe('hello beautiful world')
  })

  it('inserts text at the end', () => {
    expect(insertAtOffset('hello', 5, ' world')).toBe('hello world')
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- src/__tests__/editor-indentation.test.ts`
Expected: 23 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/editor-indentation.ts src/__tests__/editor-indentation.test.ts
git commit -m "feat: add editor indentation utilities"
```

---

### Task 3: Create the listItem plugin module

**Files:**
- Create: `src/plugins/listItem.ts`

- [ ] **Step 1: Write the plugin**

```typescript
// src/plugins/listItem.ts

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
  getLineAtOffset,
  replaceLine,
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
  const pages = doc.getMap('pages') as unknown as Map<string, { toString(): string; delete(start: number, length: number): void; insert(start: number, text: string): void }>

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

  // Cursor shifts right by 2 since chars were prepended
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
  const pages = doc.getMap('pages') as unknown as Map<string, { toString(): string; delete(start: number, length: number): void; insert(start: number, text: string): void }>

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
    // Already at minimum indent — consume the event as a no-op so
    // the default Tab handler (which doesn't check shiftKey) won't
    // insert 2 spaces.
    const cursorOffset = getCursorOffsetInRaw(sel)
    return { cursorOffset }
  }

  lines[lineIndex] = dedented
  const newRaw = lines.join('\n')

  const cursorOffset = getCursorOffsetInRaw(sel)
  const lineStart = getLineStart(raw, lineIndex)
  // Cursor shifts left by 2, but not before the line start
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
  const pages = doc.getMap('pages') as unknown as Map<string, { toString(): string; delete(start: number, length: number): void; insert(start: number, text: string): void }>

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

  // Compute cursor position within this line
  const lineStart = getLineStart(raw, lineIndex)
  const cursorOffset = getCursorOffsetInRaw(sel)
  const cursorPosInLine = cursorOffset - lineStart
  // Cursor in raw text must be inside this line (or at its end)
  const clamped = Math.max(0, Math.min(cursorPosInLine, lineText.length))

  const leftOfCursor = lineText.slice(0, clamped)
  const rightOfCursor = lineText.slice(clamped)

  // Check if the content portion (after indent + marker + space) is empty
  // The prefix is: indent + marker + " "
  const prefix = parsed.indent + parsed.marker + ' '
  const contentLeft = leftOfCursor.slice(prefix.length)
  const contentRight = rightOfCursor.slice(prefix.length)
  const totalContent = parsed.content

  // If the full content is empty (just "- " with nothing after),
  // exit the list: replace the line with a plain newline
  if (totalContent.trim() === '') {
    // Replace this line with empty, effectively removing the list item
    lines.splice(lineIndex, 1, '')
    const newRaw = lines.join('\n')
    // Cursor lands at the start of the (now empty) line
    const newOffset = lineStart

    doc.transact(() => {
      ytext.delete(0, raw.length)
      ytext.insert(0, newRaw)
    })

    return { cursorOffset: newOffset }
  }

  // Non-empty: split and auto-continue
  // New first line: indent + marker + " " + leftOfCursor (after prefix)
  // New second line: indent + marker + " " + rightOfCursor (after prefix)
  const newFirstLine = prefix + contentLeft
  const newSecondLine = prefix + contentRight

  lines.splice(lineIndex, 1, newFirstLine, newSecondLine)
  const newRaw = lines.join('\n')

  // Cursor lands at end of new second line's prefix (after marker + space)
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
  // Walk DOM backwards from selection to find [data-line] containers
  // and accumulate raw text lengths
  if (!sel.rangeCount) return 0
  const range = sel.getRangeAt(0)
  const container = range.startContainer

  // Find all [data-line] containers
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
      // Cursor is inside this line
      rawOffset += rawOffsetInLine(lineEl, container, range.startOffset)
      return rawOffset
    }

    rawOffset += lineLen + 1 // +1 for newline
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
```

- [ ] **Step 2: Commit**

```bash
git add src/plugins/listItem.ts
git commit -m "feat: add listItem content plugin"
```

---

### Task 4: Register the plugin and add CSS

**Files:**
- Modify: `src/plugins/defaults.ts`
- Modify: `src/plugins/index.ts`
- Modify: `src/editor-dom.ts`

- [ ] **Step 1: Register in defaults**

```typescript
// src/plugins/defaults.ts — add import and register

import { listItemPlugin } from './listItem'

export const defaultPlugins: ContentPlugin[] = [
  headingsPlugin,
  hrPlugin,
  blockquotePlugin,
  listItemPlugin,            // NEW — line-level, after blockquote
  wikiLinkPlugin,
  linkPlugin,
  boldPlugin,
  italicPlugin,
  strikethroughPlugin,
  inlineCodePlugin,
]
```

- [ ] **Step 2: Re-export in index**

```typescript
// src/plugins/index.ts — add export

export { listItemPlugin } from './listItem'
```

- [ ] **Step 3: Add CSS to editor-dom.ts**

In `src/editor-dom.ts`, add the following CSS rules to the `DEFAULT_CSS` string, after the blockquote rules (after line 176, before the `/* HR */` comment):

```css
/* List items */
.wn-list-item {
  display: block;
}
.wn-list-item-indent {
  color: transparent;
  white-space: pre;
  user-select: none;
}
.wn-list-item-marker {
  color: var(--wn-color-punct, #2e2e44);
  user-select: none;
}
.wn-list-item-content {
  color: var(--wn-color-fg, #c9c9d0);
}
```

The insertion point is after the blockquote CSS block ending with `}` (after line 176 in the original file). Insert the new CSS rules there, before the `/* HR */` comment.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/plugins/defaults.ts src/plugins/index.ts src/editor-dom.ts
git commit -m "feat: register listItem plugin and add CSS"
```

---

### Task 5: Write plugin tests

**Files:**
- Create: `src/__tests__/listItem.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// @vitest-environment happy-dom

import * as Y from 'yjs'
import { describe, it, expect, vi } from 'vitest'
import { listItemPlugin } from '../plugins/listItem'
import type { Token, EditorContext } from '../types'

const mockDoc = new Y.Doc()

function createToken(type: string, raw: string, groups: string[]): Token {
  return { type, raw, groups }
}

function createContext(overrides: Partial<EditorContext> = {}): EditorContext {
  return {
    navigate: () => {},
    getTrail: () => ['home'],
    getWorld: () => ({}),
    getDoc: () => mockDoc,
    ...overrides,
  }
}

function renderPlugin(
  plugin: { render: (token: Token, context: EditorContext) => HTMLElement | Text },
  token: Token,
  context: EditorContext,
): HTMLElement {
  return plugin.render(token, context) as HTMLElement
}

// ─── Tokenization ──────────────────────────────────────────────────────────────

describe('listItemPlugin tokenization', () => {
  const pattern = listItemPlugin.tokens[0].pattern

  it('matches dash list item', () => {
    const m = '- milk'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('')
    expect(m![2]).toBe('-')
    expect(m![3]).toBe('milk')
  })

  it('matches asterisk list item', () => {
    const m = '* eggs'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![2]).toBe('*')
    expect(m![3]).toBe('eggs')
  })

  it('matches plus list item', () => {
    const m = '+ butter'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![2]).toBe('+')
  })

  it('matches indented list item', () => {
    const m = '  - nested'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('  ')
    expect(m![2]).toBe('-')
    expect(m![3]).toBe('nested')
  })

  it('matches deeply indented list item', () => {
    const m = '    * deep'.match(pattern)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('    ')
  })

  it('does not match plain text', () => {
    expect('hello'.match(pattern)).toBeNull()
  })

  it('does not match heading', () => {
    expect('# heading'.match(pattern)).toBeNull()
  })

  it('does not match marker without space', () => {
    expect('-no-space'.match(pattern)).toBeNull()
  })

  it('matches empty content after marker', () => {
    const m = '- '.match(pattern)
    expect(m).not.toBeNull()
    expect(m![3]).toBe('')
  })
})

// ─── Rendering ─────────────────────────────────────────────────────────────────

describe('listItemPlugin rendering', () => {
  it('renders a basic list item', () => {
    const token = createToken('list-item', '- milk', ['', '-', 'milk'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.className).toBe('wn-list-item')
    expect(el.dataset.raw).toBe('- milk')

    // Should have 2 children: marker span, content span (no indent)
    expect(el.children).toHaveLength(2)

    expect(el.children[0].className).toBe('wn-list-item-marker')
    expect(el.children[0].textContent).toBe('- ')

    expect(el.children[1].className).toBe('wn-list-item-content')
    expect(el.children[1].textContent).toBe('milk')
  })

  it('renders an indented list item with indent span', () => {
    const token = createToken('list-item', '  - nested', ['  ', '-', 'nested'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.className).toBe('wn-list-item')
    expect(el.dataset.raw).toBe('  - nested')

    // Should have 3 children: indent span, marker span, content span
    expect(el.children).toHaveLength(3)

    expect(el.children[0].className).toBe('wn-list-item-indent')
    expect(el.children[0].textContent).toBe('  ')

    expect(el.children[1].className).toBe('wn-list-item-marker')
    expect(el.children[1].textContent).toBe('- ')

    expect(el.children[2].className).toBe('wn-list-item-content')
    expect(el.children[2].textContent).toBe('nested')
  })

  it('renders asterisk list item', () => {
    const token = createToken('list-item', '* item', ['', '*', 'item'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.classList.contains('wn-list-item')).toBe(true)
    expect(el.children[0].textContent).toBe('* ')
  })

  it('renders plus list item', () => {
    const token = createToken('list-item', '+ item', ['', '+', 'item'])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.children[0].textContent).toBe('+ ')
  })

  it('renders empty content', () => {
    const token = createToken('list-item', '- ', ['', '-', ''])
    const el = renderPlugin(listItemPlugin, token, createContext())

    expect(el.children[1].className).toBe('wn-list-item-content')
    expect(el.children[1].textContent).toBe('')
  })

  it('renders inline markdown within content when renderInline is provided', () => {
    const token = createToken('list-item', '- **bold** text', ['', '-', '**bold** text'])
    const inlineFragment = document.createDocumentFragment()
    const boldEl = document.createElement('span')
    boldEl.className = 'wn-bold'
    boldEl.textContent = 'bold'
    inlineFragment.appendChild(boldEl)

    const context = createContext({
      renderInline: (_text: string) => inlineFragment,
    })

    const el = renderPlugin(listItemPlugin, token, context)

    expect(el.children[1].className).toBe('wn-list-item-content')
    expect(el.children[1].childNodes).toHaveLength(1)
    expect(el.children[1].childNodes[0]).toBe(boldEl)
  })
})

// ─── Static HTML ───────────────────────────────────────────────────────────────

describe('listItemPlugin renderToHTML', () => {
  it('renders basic list item as HTML string', () => {
    const token = createToken('list-item', '- milk', ['', '-', 'milk'])
    const html = listItemPlugin.renderToHTML!(token, {
      renderInline: (t: string) => t,
    })

    expect(html).toContain('class="wn-list-item"')
    expect(html).toContain('class="wn-list-item-marker"')
    expect(html).toContain('- ')
    expect(html).toContain('class="wn-list-item-content"')
    expect(html).toContain('milk')
  })

  it('renders indented list item with indent span', () => {
    const token = createToken('list-item', '  * nested', ['  ', '*', 'nested'])
    const html = listItemPlugin.renderToHTML!(token, {
      renderInline: (t: string) => t,
    })

    expect(html).toContain('class="wn-list-item-indent"')
    expect(html).toContain('  ')
    expect(html).not.toContain('undefined')
  })

  it('falls back to empty string for empty groups', () => {
    const token = createToken('list-item', '- ', [])
    const html = listItemPlugin.renderToHTML!(token, {
      renderInline: (t: string) => t,
    })
    expect(html).not.toContain('undefined')
  })
})

// ─── onKeydown Tab ─────────────────────────────────────────────────────────────

describe('listItemPlugin onKeydown', () => {
  it('returns false for non-list-item line on Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('hello world')
    pages.set('home', ytext)

    // Set up DOM with data-line for plugin to read
    document.body.innerHTML =
      '<div data-line="0">hello world</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).toBeFalsy()
  })

  it('indents a list item on Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- milk\n- eggs')
    pages.set('home', ytext)

    document.body.innerHTML =
      '<div data-line="0">- milk</div><div data-line="1">- eggs</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 4) // after '- mi'
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    expect(typeof result).toBe('object')
    const keydownResult = result as { cursorOffset: number }
    expect(keydownResult.cursorOffset).toBeGreaterThan(0)

    const newRaw = (pages.get('home') as Y.Text).toString()
    expect(newRaw).toContain('  - milk')
  })

  it('dedents a list item on Shift+Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('  - milk\n- eggs')
    pages.set('home', ytext)

    document.body.innerHTML =
      '<div data-line="0">  - milk</div><div data-line="1">- eggs</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 6)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    expect(newRaw).toContain('- milk')
    expect(newRaw).not.toContain('  - milk')
  })

  it('does not dedent a list item at level 0 on Shift+Tab', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- milk')
    pages.set('home', ytext)

    document.body.innerHTML =
      '<div data-line="0">- milk</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 2)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
    const result = listItemPlugin.onKeydown!(event, context)

    // Should consume the event even though no change is made, to prevent
    // the default Tab handler from inserting 2 spaces.
    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    expect(newRaw).toBe('- milk') // unchanged
  })

  // ── Enter key ───────────────────────────────────────────────────────────

  it('auto-continues list item on Enter', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- milk\nplain')
    pages.set('home', ytext)

    document.body.innerHTML =
      '<div data-line="0">- milk</div><div data-line="1">plain</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 6) // end of "- milk"
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    const lines = newRaw.split('\n')
    expect(lines[0]).toBe('- milk')
    expect(lines[1]).toBe('- ')
    expect(lines[2]).toBe('plain')
  })

  it('removes empty list item on Enter (exits list)', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('- \nplain')
    pages.set('home', ytext)

    document.body.innerHTML =
      '<div data-line="0">- </div><div data-line="1">plain</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 2) // after "- "
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).not.toBeFalsy()
    const newRaw = (pages.get('home') as Y.Text).toString()
    const lines = newRaw.split('\n')
    expect(lines[0]).toBe('')
    expect(lines[1]).toBe('plain')
  })

  it('returns false for non-list-item line on Enter', () => {
    const context = createContext()
    const doc = context.getDoc()
    const pages = doc.getMap('pages') as Y.Map<Y.Text>
    const ytext = new Y.Text('hello world')
    pages.set('home', ytext)

    document.body.innerHTML =
      '<div data-line="0">hello world</div>'
    const range = document.createRange()
    const textNode = document.body.querySelector('[data-line="0"]')!.firstChild!
    range.setStart(textNode, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const result = listItemPlugin.onKeydown!(event, context)

    expect(result).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npm test -- src/__tests__/listItem.test.ts`
Expected: Some tests may PASS (tokenization, rendering), some may FAIL (onKeydown tests need the plugin code to work correctly)

- [ ] **Step 3: Debug and fix any issues**

Run tests again after fixes:
Run: `npm test -- src/__tests__/listItem.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/listItem.test.ts
git commit -m "test: add listItem plugin tests"
```

---

### Task 6: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS, no regressions

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (no new errors)

- [ ] **Step 4: Run test coverage**

Run: `npm run test:coverage`
Expected: coverage meets 80% thresholds

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds, dist/ output updated

---

### Task 7: Update documentation

**Files:**
- Modify: `docs/api.md`

- [ ] **Step 1: Document the new `onKeydown` hook**

In `docs/api.md`, in the "ContentPlugin" section, add documentation for the `onKeydown` hook:

```markdown
### `onKeydown?(event: KeyboardEvent, context: EditorContext): { cursorOffset: number } | false | void`

Optional lifecycle hook called for each content plugin on `keydown` events,
in registration order. The first plugin to return `{ cursorOffset: number }`
consumes the event.

- Return `{ cursorOffset: number }` to signal the event was handled and
  provide the new cursor position after the operation.
- Return `false` or `void` to let the next plugin or default handler run.
```

- [ ] **Step 2: Document the listItem plugin**

In `docs/api.md`, add a new section for the listItem plugin:

```markdown
### `listItemPlugin`

Content plugin for unordered markdown list items.

**Token type:** `list-item`
**Pattern:** `^(\s*)([-*+])\s(.*)$`

Renders items with dimmed markers (`-`, `*`, `+`) and supports:

- **Tab** — indent the list item by 2 spaces
- **Shift+Tab** — dedent the list item by 2 spaces (minimum indent: level 0)
- **Enter** — auto-continue list with a new item at the same indent level.
  Pressing Enter on an empty list item (just the marker) removes the item
  and exits the list.
```

- [ ] **Step 3: Commit**

```bash
git add docs/api.md
git commit -m "docs: document onKeydown hook and listItem plugin"
```

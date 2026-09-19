/**
 * Cursor tracking that understands the [data-line] container structure
 * AND elements with data-raw attributes (wiki links, rendered tokens).
 *
 * Offsets are ALWAYS in "raw text" space — matching what extractContentText
 * produces and what Y.Text stores.  Elements with data-raw contribute their
 * raw length (e.g. 9 for "[[hello]]") rather than their DOM text length
 * (e.g. 5 for "hello").  [data-line] containers nested inside block wrappers
 * count one newline separator between consecutive lines (see content-text).
 */

import { rawNodeLength } from './content-text'

/** Compute the raw-text length of a DOM subtree. */
function rawSubtreeLength(node: Node): number {
  return rawNodeLength(node)
}

/** Raw-text length of one [data-line] container (respects data-raw). */
export function rawLineLength(lineEl: HTMLElement): number {
  return rawSubtreeLength(lineEl)
}

function getOffsetBeforeLine(el: HTMLElement, lineIndex: number): number {
  let offset = 0
  const allLines = Array.from(el.querySelectorAll('[data-line]')) as HTMLElement[]
  allLines.sort((a, b) => {
    return parseInt(a.dataset.line ?? '0', 10) - parseInt(b.dataset.line ?? '0', 10)
  })

  for (const line of allLines) {
    const idx = parseInt(line.dataset.line ?? '0', 10)
    if (idx >= lineIndex) break
    offset += rawLineLength(line) + 1 // +1 for newline
  }
  return offset
}

export function getLineOffset(el: HTMLElement): number {
  return tryGetLineOffset(el) ?? 0
}

/**
 * The caret's raw-text offset, or null when the current selection cannot be
 * recognized: no selection/ranges, selection anchored outside this editor,
 * or an unmappable DOM position. Callers MUST treat null as "ignore this
 * selection" — silently mapping it to offset 0 would yank the caret to line
 * 0 on any stray selectionchange (e.g. selecting text in page chrome).
 */
export function tryGetLineOffset(el: HTMLElement): number | null {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null

  const range = sel.getRangeAt(0)
  const container = range.startContainer
  if (container !== el && !el.contains(container)) return null

  // Walk up to find the [data-line] parent
  let lineEl = container as Node | null
  while (lineEl && !(lineEl instanceof HTMLElement && lineEl.dataset.line !== undefined)) {
    lineEl = lineEl.parentNode
  }

  if (!lineEl || !(lineEl instanceof HTMLElement)) {
    // Selection anchored on the editor root itself (e.g. a click in the
    // padding between lines, or select-all placement): map to the raw offset
    // at the boundary just before the child at that DOM offset.
    if (container === el) {
      const kids = Array.from(el.children) as HTMLElement[]
      const upto = Math.min(range.startOffset, kids.length)
      let boundary = 0
      for (let i = 0; i < upto; i++) boundary += rawLineLength(kids[i]!) + 1
      return boundary
    }
    // Selection anchored directly on a block wrapper (caret between its line
    // children): map to the START of the wrapper's first line — deterministic
    // and lands the caret inside the block, which is the expand trigger.
    if (container instanceof HTMLElement) {
      const inner = container.querySelector('[data-line]')
      if (inner instanceof HTMLElement && inner.dataset.line !== undefined) {
        return getOffsetBeforeLine(el, parseInt(inner.dataset.line ?? '0', 10))
      }
    }
    // Cursor is in a \n text node between containers.
    let prev = container.previousSibling
    while (prev && !(prev instanceof HTMLElement && prev.dataset.line !== undefined)) {
      prev = prev.previousSibling
    }
    if (prev instanceof HTMLElement && prev.dataset.line !== undefined) {
      const idx = parseInt(prev.dataset.line ?? '0', 10)
      return getOffsetBeforeLine(el, idx) + rawLineLength(prev) + 1
    }
    return null
  }

  const lineIndex = parseInt(lineEl.dataset.line ?? '0', 10)
  const offset = getOffsetBeforeLine(el, lineIndex)

  // Walk nodes within the line, accumulating raw-text lengths
  let lineOffset = 0
  let found = false

  function walkLineNodes(node: Node): void {
    if (found) return

    // Caret anchored on an ELEMENT (e.g. range.setStart(lineEl, 0) from
    // page-load or empty-line placement): offset counts child NODES, so the
    // raw position is the summed raw length of the first `startOffset` kids.
    if (node === container && node instanceof HTMLElement) {
      const kids = Array.from(node.childNodes)
      const upto = Math.min(range.startOffset, kids.length)
      for (let i = 0; i < upto; i++) lineOffset += rawSubtreeLength(kids[i]!)
      found = true
      return
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node as Text).length
      if (node === container) {
        lineOffset += Math.min(range.startOffset, length)
        found = true
        return
      }
      lineOffset += length
      return
    }

    if (node instanceof HTMLElement && node.dataset.raw !== undefined) {
      const rawLen = node.dataset.raw.length
      // Is the cursor inside this data-raw element?
      if (node === container || node.contains(container)) {
        // Walk the element's own subtree (DOM-text space) to find the
        // local offset, then clamp to rawLen.
        let childOff = 0
        let childFound = false
        function walkChild(child: Node): void {
          if (childFound) return
          if (child.nodeType === Node.TEXT_NODE) {
            const clen = (child as Text).length
            if (child === container) {
              childOff += Math.min(range.startOffset, clen)
              childFound = true
              return
            }
            childOff += clen
            return
          }
          child.childNodes.forEach(walkChild)
        }
        node.childNodes.forEach(walkChild)
        lineOffset += Math.min(childOff, rawLen)
        found = true
        return
      }
      // Cursor not inside — add raw length
      lineOffset += rawLen
      return
    }

    node.childNodes.forEach(walkLineNodes)
  }

  walkLineNodes(lineEl)

  return found ? offset + lineOffset : null
}

export function setLineOffset(el: HTMLElement, targetOffset: number): void {
  let remaining = targetOffset

  const allLines = Array.from(el.querySelectorAll('[data-line]')) as HTMLElement[]
  allLines.sort((a, b) => {
    return parseInt(a.dataset.line ?? '0', 10) - parseInt(b.dataset.line ?? '0', 10)
  })

  for (const lineEl of allLines) {
    const lineLen = rawLineLength(lineEl)

    if (remaining <= lineLen) {
      const result = findTextInNode(lineEl, remaining)
      if (result) {
        const sel = window.getSelection()
        if (!sel) return
        const range = document.createRange()
        range.setStart(result.node, result.offset)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      } else if (lineLen === 0) {
        // Empty line (has <br> placeholder, no text nodes): caret at start.
        const sel = window.getSelection()
        if (sel) {
          const range = document.createRange()
          range.setStart(lineEl, 0)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      } else {
        // Offset lands at the line's exact end (no text node covers it —
        // e.g. a line ending in a data-raw span, or an empty line with just
        // a <br>): anchor past all children, which getLineOffset maps back
        // to the line's full raw length.
        const sel = window.getSelection()
        if (sel) {
          const range = document.createRange()
          range.setStart(lineEl, lineEl.childNodes.length)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
      return
    }

    remaining -= lineLen + 1 // +1 for newline
  }

  // Fallback: end of last line
  const lastLine = allLines[allLines.length - 1]
  if (lastLine) {
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    const lastText = findLastTextNode(lastLine)
    if (lastText) {
      range.setStart(lastText, lastText.length)
    } else {
      range.selectNodeContents(lastLine)
    }
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

function findTextInNode(el: HTMLElement, offset: number): { node: Text; offset: number } | null {
  let remaining = offset

  function walk(node: Node): { node: Text; offset: number } | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node as Text).length
      if (remaining <= len) {
        return { node: node as Text, offset: remaining }
      }
      remaining -= len
      return null
    }

    if (node instanceof HTMLElement && node.dataset.raw !== undefined) {
      const rawLen = node.dataset.raw.length
      if (remaining < rawLen) {
        // The target offset falls inside this data-raw element.
        // Map to a DOM-text offset by walking the element's subtree.
        function walkChild(child: Node): { node: Text; offset: number } | null {
          if (child.nodeType === Node.TEXT_NODE) {
            const clen = (child as Text).length
            if (remaining < clen) {
              return { node: child as Text, offset: remaining }
            }
            remaining -= clen
            return null
          }
          for (const c of Array.from(child.childNodes)) {
            const r = walkChild(c)
            if (r) return r
          }
          return null
        }
        return walkChild(node)
      }
      remaining -= rawLen
      return null
    }

    for (const child of Array.from(node.childNodes)) {
      const result = walk(child)
      if (result) return result
    }
    return null
  }

  return walk(el)
}

function findLastTextNode(el: HTMLElement): Text | null {
  let last: Text | null = null
  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      last = node as Text
      return
    }
    for (const child of Array.from(node.childNodes)) {
      walk(child)
    }
  }
  walk(el)
  return last
}

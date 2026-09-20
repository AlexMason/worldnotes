/**
 * Cursor tracking that understands the [data-line] container structure
 * AND elements with data-raw attributes (wiki links, rendered tokens).
 *
 * Offsets are ALWAYS in "raw text" space — matching what extractContentText
 * produces and what Y.Text stores.  Elements with data-raw contribute their
 * raw length (e.g. 9 for "[[hello]]") rather than their DOM text length
 * (e.g. 5 for "hello").  [data-line] containers nested inside block wrappers
 * count one newline separator between consecutive lines (see content-text).
 *
 * Selections are mapped boundary-by-boundary through `mapBoundary`, which is
 * DIRECTION-BIASED: a caret/selection boundary living between two lines can
 * read as either "start of line k" or "end of line k−1" depending on whether
 * it is the start or the end of a range. Collapsed-caret callers use the
 * 'start' reading (unchanged legacy behavior); `getSelectionOffsets` maps
 * each end with its own bias so a non-collapsed range maps to exactly the
 * text it covers — a start-biased end mapping (or normalization tricks)
 * would silently operate on the wrong text.
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

/** Every [data-line] container in the editor, in document line order. */
function getLineEls(el: HTMLElement): HTMLElement[] {
  const allLines = Array.from(el.querySelectorAll('[data-line]')) as HTMLElement[]
  allLines.sort((a, b) => {
    return parseInt(a.dataset.line ?? '0', 10) - parseInt(b.dataset.line ?? '0', 10)
  })
  return allLines
}

function getOffsetBeforeLine(el: HTMLElement, lineIndex: number): number {
  let offset = 0
  for (const line of getLineEls(el)) {
    const idx = parseInt(line.dataset.line ?? '0', 10)
    if (idx >= lineIndex) break
    offset += rawLineLength(line) + 1 // +1 for newline
  }
  return offset
}

// ─── DOM → raw offset (boundary mapping) ────────────────────────────────────

export function getLineOffset(el: HTMLElement): number {
  return tryGetLineOffset(el) ?? 0
}

/**
 * How a boundary between two lines should read: the 'start' bias takes the
 * "start of line k" side, the 'end' bias the "end of line k−1" side. Only
 * the ancestor-container fallbacks are ambiguous; inside a line the DOM
 * offset space is exact and the bias never applies.
 */
type BoundaryBias = 'start' | 'end'

/**
 * The raw-text offset of one Range boundary, or null when it cannot be
 * recognized (outside this editor, or an unmappable DOM position).
 */
function mapBoundary(
  el: HTMLElement,
  container: Node,
  offset: number,
  bias: BoundaryBias,
): number | null {
  if (container !== el && !el.contains(container)) return null

  // Walk up to find the [data-line] parent
  let lineEl: Node | null = container
  while (lineEl && !(lineEl instanceof HTMLElement && lineEl.dataset.line !== undefined)) {
    lineEl = lineEl.parentNode
  }

  if (!lineEl || !(lineEl instanceof HTMLElement)) {
    // Selection anchored on the editor root itself (e.g. a click in the
    // padding between lines, or select-all placement): map to the raw offset
    // at the boundary just before the child at that DOM offset.
    if (container === el) {
      const kids = Array.from(el.children) as HTMLElement[]
      const upto = Math.min(offset, kids.length)
      let boundary = 0
      for (let i = 0; i < upto; i++) boundary += rawLineLength(kids[i]!) + 1
      // An *ending* boundary before child k covers up to the end of child
      // block k−1 — the +1 above is the separator itself, not covered text.
      if (bias === 'end' && upto > 0) boundary -= 1
      return Math.max(0, boundary)
    }
    // Selection anchored directly on a block wrapper (caret between its line
    // children). Start bias: the wrapper's first line — deterministic and
    // lands the caret inside the block, which is the expand trigger. End
    // bias: the end of the last line child the selection covers.
    if (container instanceof HTMLElement) {
      const first = container.querySelector('[data-line]')
      if (first instanceof HTMLElement && first.dataset.line !== undefined) {
        const firstIdx = parseInt(first.dataset.line ?? '0', 10)
        if (bias === 'start') return getOffsetBeforeLine(el, firstIdx)
        const kids = Array.from(container.children) as HTMLElement[]
        const upto = Math.min(offset, kids.length)
        const lastCovered = upto > 0 ? kids[upto - 1] : first
        if (lastCovered instanceof HTMLElement && lastCovered.dataset.line !== undefined) {
          const idx = parseInt(lastCovered.dataset.line ?? '0', 10)
          return getOffsetBeforeLine(el, idx) + rawLineLength(lastCovered)
        }
        return getOffsetBeforeLine(el, firstIdx)
      }
    }
    // Cursor is in a \n text node between containers. Start bias reads the
    // separator as the next line's start (pinned legacy behavior); end bias
    // reads it as the end of the line the selection covers.
    let prev = container.previousSibling
    while (prev && !(prev instanceof HTMLElement && prev.dataset.line !== undefined)) {
      prev = prev.previousSibling
    }
    if (prev instanceof HTMLElement && prev.dataset.line !== undefined) {
      const idx = parseInt(prev.dataset.line ?? '0', 10)
      const prevEnd = getOffsetBeforeLine(el, idx) + rawLineLength(prev)
      return bias === 'start' ? prevEnd + 1 : prevEnd
    }
    return null
  }

  const lineIndex = parseInt(lineEl.dataset.line ?? '0', 10)
  const lineStart = getOffsetBeforeLine(el, lineIndex)

  // Walk nodes within the line, accumulating raw-text lengths
  let lineOffset = 0
  let found = false

  function walkLineNodes(node: Node): void {
    if (found) return

    // Caret anchored on an ELEMENT (e.g. range.setStart(lineEl, 0) from
    // page-load or empty-line placement): offset counts child NODES, so the
    // raw position is the summed raw length of the first `offset` kids.
    if (node === container && node instanceof HTMLElement) {
      const kids = Array.from(node.childNodes)
      const upto = Math.min(offset, kids.length)
      for (let i = 0; i < upto; i++) lineOffset += rawSubtreeLength(kids[i]!)
      found = true
      return
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node as Text).length
      if (node === container) {
        lineOffset += Math.min(offset, length)
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
              childOff += Math.min(offset, clen)
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

  return found ? lineStart + lineOffset : null
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
  return mapBoundary(el, range.startContainer, range.startOffset, 'start')
}

/**
 * The current selection's raw-text range, or null when either boundary is
 * un-mappable or the range reaches outside this editor. Callers MUST treat
 * null as "ignore this selection".
 *
 * Mapped with per-boundary bias, so a selection ending at a line boundary
 * maps to the covered text's true end (not the next line's start). The
 * min/max below is a sanity assertion, not a mismapping absorber: with the
 * biases applied, start ≤ end holds by construction.
 */
export function getSelectionOffsets(el: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null

  const range = sel.getRangeAt(0)
  const sc = range.startContainer
  const ec = range.endContainer
  if (sc !== el && !el.contains(sc)) return null
  if (ec !== el && !el.contains(ec)) return null

  const a = mapBoundary(el, sc, range.startOffset, 'start')
  const b = mapBoundary(el, ec, range.endOffset, 'end')
  if (a === null || b === null) return null
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

// ─── raw offset → DOM (placement) ───────────────────────────────────────────

interface DomPosition {
  node: Node
  offset: number
}

/**
 * Resolve a raw-text offset to a DOM boundary. Line-boundary offsets land at
 * the START of the next line (monotone: every reachable placement maps back
 * through mapBoundary's 'start' bias to the same offset).
 */
function placePosition(el: HTMLElement, targetOffset: number): DomPosition | null {
  let remaining = targetOffset

  const allLines = getLineEls(el)

  for (const lineEl of allLines) {
    const lineLen = rawLineLength(lineEl)

    if (remaining <= lineLen) {
      const result = findTextInNode(lineEl, remaining)
      if (result) return result
      if (lineLen === 0) {
        // Empty line (has <br> placeholder, no text nodes): caret at start.
        return { node: lineEl, offset: 0 }
      }
      // Offset lands at the line's exact end (no text node covers it —
      // e.g. a line ending in a data-raw span, or an empty line with just
      // a <br>): anchor past all children, which getLineOffset maps back
      // to the line's full raw length.
      return { node: lineEl, offset: lineEl.childNodes.length }
    }

    remaining -= lineLen + 1 // +1 for newline
  }

  // Fallback: end of last line
  const lastLine = allLines[allLines.length - 1]
  if (!lastLine) return null
  const lastText = findLastTextNode(lastLine)
  if (lastText) return { node: lastText, offset: lastText.length }
  return { node: lastLine, offset: lastLine.childNodes.length }
}

export function setLineOffset(el: HTMLElement, targetOffset: number): void {
  const pos = placePosition(el, targetOffset)
  if (!pos) return
  const sel = window.getSelection()
  if (!sel) return
  // removeAllRanges first: happy-dom silently ignores addRange while a
  // range already exists, and browsers re-normalize anyway.
  sel.removeAllRanges()
  const range = document.createRange()
  range.setStart(pos.node, pos.offset)
  range.collapse(true)
  sel.addRange(range)
}

/**
 * Restore a raw-text selection [start, end) on the DOM (clamps end to start
 * when end <= start, i.e. a collapsed caret). The restored selection is
 * forward-oriented (anchor at the earlier boundary); callers that care about
 * anchor/focus direction are keymap-internal and rebuild it themselves.
 */
export function setSelectionOffsets(el: HTMLElement, start: number, end: number): void {
  const sel = window.getSelection()
  if (!sel) return
  const s = placePosition(el, start)
  if (!s) return
  sel.removeAllRanges()
  const range = document.createRange()
  if (end <= start) {
    range.setStart(s.node, s.offset)
    range.collapse(true)
  } else {
    const e = placePosition(el, end) ?? s
    range.setStart(s.node, s.offset)
    range.setEnd(e.node, e.offset)
  }
  sel.addRange(range)
}

/**
 * Which end of a NORMALIZED selection carries the focus (the moving end of
 * a Shift+arrow extension). 'end' when the caret/selection reads
 * left-to-right (the common case, incl. collapsed), 'start' when the user
 * dragged right-to-left. Returns null when the selection is unmappable.
 */
export function getSelectionFocusEnd(el: HTMLElement): 'start' | 'end' | null {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  const sc = range.startContainer
  if (sc !== el && !el.contains(sc)) return null
  if (range.collapsed) return 'end'
  // DOM ranges are always start≤end ordered; anchor/focus carry direction.
  const focusAtEnd = range.endContainer === sel.focusNode && range.endOffset === sel.focusOffset
  const focusAtStart =
    range.startContainer === sel.focusNode && range.startOffset === sel.focusOffset
  return focusAtEnd ? 'end' : focusAtStart ? 'start' : null
}

/**
 * True when the current selection's start sits inside a block region (fenced
 * code, table): the nearest [data-line] ancestor carries data-block.
 * Formatting shortcuts no-op there so markers never splice into real code.
 */
export function selectionInBlock(el: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false
  let node: Node | null = sel.getRangeAt(0).startContainer
  while (node) {
    if (node instanceof HTMLElement) {
      if (node.dataset.block !== undefined) return true
      if (node.dataset.line !== undefined) return false
      if (node === el) return false
    }
    node = node.parentNode
  }
  return false
}

function findTextInNode(el: HTMLElement, offset: number): { node: Node; offset: number } | null {
  let remaining = offset

  function walk(node: Node): { node: Node; offset: number } | null {
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
        function walkChild(child: Node): { node: Node; offset: number } | null {
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
        const inner = walkChild(node)
        if (inner) return inner
        // DEAD ZONE: the offset points into this span's trailing raw-only
        // characters (e.g. the `]]` of a rendered `[[wiki]]` link — glyph
        // substitution makes those raw offsets unrepresentable in the DOM).
        // Clamp just past the last DOM character inside the span; the caret
        // math's min(childOff, rawLen) clamp maps it back deterministically.
        const lastText = findLastTextNode(node)
        if (lastText) return { node: lastText, offset: lastText.length }
        return { node, offset: node.childNodes.length }
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

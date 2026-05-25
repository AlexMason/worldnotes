/**
 * Cursor tracking that understands the [data-line] container structure
 * AND elements with data-raw attributes (wiki links, rendered tokens).
 *
 * Offsets are ALWAYS in "raw text" space — matching what extractContentText
 * produces and what Y.Text stores.  Elements with data-raw contribute their
 * raw length (e.g. 9 for "[[hello]]") rather than their DOM text length
 * (e.g. 5 for "hello").
 */

/** Compute the raw-text length of a DOM subtree. */
function rawSubtreeLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node as Text).length
  }
  if (node instanceof HTMLElement) {
    if (node.dataset.raw !== undefined) {
      return node.dataset.raw.length
    }
    let len = 0
    node.childNodes.forEach((child) => {
      len += rawSubtreeLength(child)
    })
    return len
  }
  return 0
}

/** Raw-text length of one [data-line] container (respects data-raw). */
export function rawLineLength(lineEl: HTMLElement): number {
  return rawSubtreeLength(lineEl)
}

function getOffsetBeforeLine(el: HTMLElement, lineIndex: number): number {
  let offset = 0
  const allLines = Array.from(
    el.querySelectorAll('[data-line]'),
  ) as HTMLElement[]
  allLines.sort((a, b) => {
    return (
      parseInt(a.dataset.line ?? '0', 10) -
      parseInt(b.dataset.line ?? '0', 10)
    )
  })

  for (const line of allLines) {
    const idx = parseInt(line.dataset.line ?? '0', 10)
    if (idx >= lineIndex) break
    offset += rawLineLength(line) + 1 // +1 for newline
  }
  return offset
}

export function getLineOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return 0

  const range = sel.getRangeAt(0)
  const container = range.startContainer

  // Walk up to find the [data-line] parent
  let lineEl = container as Node | null
  while (
    lineEl &&
    !(
      lineEl instanceof HTMLElement &&
      lineEl.dataset.line !== undefined
    )
  ) {
    lineEl = lineEl.parentNode
  }

  if (!lineEl || !(lineEl instanceof HTMLElement)) {
    // Cursor is in a \n text node between containers.
    let prev = container.previousSibling
    while (
      prev &&
      !(prev instanceof HTMLElement && prev.dataset.line !== undefined)
    ) {
      prev = prev.previousSibling
    }
    if (prev instanceof HTMLElement && prev.dataset.line !== undefined) {
      const idx = parseInt(prev.dataset.line ?? '0', 10)
      return getOffsetBeforeLine(el, idx) + rawLineLength(prev) + 1
    }
    return 0
  }

  const lineIndex = parseInt(lineEl.dataset.line ?? '0', 10)
  const offset = getOffsetBeforeLine(el, lineIndex)

  // Walk nodes within the line, accumulating raw-text lengths
  let lineOffset = 0
  let found = false

  function walkLineNodes(node: Node): void {
    if (found) return

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

  return offset + lineOffset
}

export function setLineOffset(el: HTMLElement, targetOffset: number): void {
  let remaining = targetOffset

  const allLines = Array.from(
    el.querySelectorAll('[data-line]'),
  ) as HTMLElement[]
  allLines.sort((a, b) => {
    return (
      parseInt(a.dataset.line ?? '0', 10) -
      parseInt(b.dataset.line ?? '0', 10)
    )
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
      } else {
        // Empty line (has <br> placeholder, no text nodes)
        const sel = window.getSelection()
        if (sel) {
          const range = document.createRange()
          range.setStart(lineEl, 0)
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

function findTextInNode(
  el: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
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

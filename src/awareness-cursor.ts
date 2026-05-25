/**
 * Cursor tracking that understands the [data-line] container structure.
 *
 * Unlike the legacy cursor.ts which walks arbitrary contentEditable DOM,
 * these functions exploit the stable line-container format produced by
 * line-renderer.ts to compute offsets and restore cursors reliably.
 */

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
    offset += (line.textContent ?? '').length + 1 // +1 for newline
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
    // Walk to the preceding sibling container.
    let prev = container.previousSibling
    while (
      prev &&
      !(prev instanceof HTMLElement && prev.dataset.line !== undefined)
    ) {
      prev = prev.previousSibling
    }
    if (prev instanceof HTMLElement && prev.dataset.line !== undefined) {
      const idx = parseInt(prev.dataset.line ?? '0', 10)
      // Offset is after the entire preceding line + the \n
      return getOffsetBeforeLine(el, idx) +
        (prev.textContent ?? '').length + 1
    }
    return 0
  }

  const lineIndex = parseInt(lineEl.dataset.line ?? '0', 10)

  // Count characters in all lines before this one (+1 per line for newline)
  const offset = getOffsetBeforeLine(el, lineIndex)

  // Offset within the current line's text nodes
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
    const lineLen = (lineEl.textContent ?? '').length

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
    range.collapse(false)
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

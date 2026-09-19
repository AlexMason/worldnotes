/**
 * Get the caret's character offset from the start of a contenteditable element.
 * Walks all text nodes to compute an absolute character position.
 *
 * @param el - The contenteditable root element
 * @returns  - Character offset, or 0 if there is no selection
 */
export function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return 0

  const range = sel.getRangeAt(0)
  return getTextOffset(el, range.endContainer, range.endOffset).offset
}

/**
 * Restore the caret to a specific character offset inside a contenteditable element.
 * Walks text nodes until the offset is consumed, then places the cursor there.
 * Falls back to end-of-element if the offset exceeds total text length.
 *
 * @param el     - The contenteditable root element
 * @param offset - Character offset to restore to
 */
export function setCaretOffset(el: HTMLElement, offset: number): void {
  const target = findTextPosition(el, offset)
  const range = document.createRange()
  const sel = window.getSelection()
  if (!sel) return

  if (target) {
    range.setStart(target.node, target.offset)
    range.collapse(true)
  } else {
    // Fallback: place cursor at end of element
    range.selectNodeContents(el)
    range.collapse(false)
  }

  sel.removeAllRanges()
  sel.addRange(range)
}

const BLOCK_ELEMENTS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
])

function isBlockElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_ELEMENTS.has((node as Element).nodeName)
}

/**
 * Extract plain text from a contenteditable element, converting <br> elements
 * back to newline characters. Recursively walks all child nodes.
 *
 * @param el - Any DOM element
 * @returns  - Plain text string with \n for each <br>
 */
export function extractText(el: HTMLElement): string {
  return getTextOffset(el, null, 0).text
}

export function getTextOffset(
  root: Node,
  targetNode: Node | null,
  targetOffset: number,
): { text: string; offset: number } {
  let text = ''
  let offset = 0
  let foundOffset = targetNode === null

  function append(value: string): void {
    if (!foundOffset) offset += value.length
    text += value
  }

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = (node as Text).textContent ?? ''
      if (node === targetNode && !foundOffset) {
        offset += Math.min(targetOffset, value.length)
        foundOffset = true
        text += value
      } else {
        append(value)
      }
    } else if ((node as HTMLElement).dataset?.raw !== undefined) {
      const raw = (node as HTMLElement).dataset.raw ?? ''
      if (node === targetNode && !foundOffset) {
        offset += targetOffset <= 0 ? 0 : raw.length
        foundOffset = true
      } else if (containsNode(node, targetNode) && !foundOffset) {
        getPreviewOffset(node, targetNode, targetOffset)
        offset += Math.min(getPreviewOffset(node, targetNode, targetOffset), raw.length)
        foundOffset = true
      } else {
        append(raw)
      }
    } else if ((node as Element).nodeName === 'BR') {
      append('\n')
    } else if (isBlockElement(node)) {
      if (text && !text.endsWith('\n')) append('\n')
      walkChildren(node)
    } else {
      walkChildren(node)
    }
  }

  function walkChildren(node: Node): void {
    node.childNodes.forEach((child, i) => {
      if (node === targetNode && i === targetOffset && !foundOffset) {
        foundOffset = true
      }
      walk(child)
    })
    if (node === targetNode && node.childNodes.length === targetOffset && !foundOffset) {
      foundOffset = true
    }
  }

  walkChildren(root)
  return { text, offset }
}

function containsNode(root: Node, target: Node | null): boolean {
  if (!target) return false
  let node: Node | null = target
  while (node) {
    if (node === root) return true
    node = node.parentNode
  }
  return false
}

function getPreviewOffset(root: Node, targetNode: Node | null, targetOffset: number): number {
  let offset = 0
  let found = false

  function walk(node: Node): void {
    if (found) return
    if (node.nodeType === Node.TEXT_NODE) {
      const value = (node as Text).textContent ?? ''
      if (node === targetNode) {
        offset += Math.min(targetOffset, value.length)
        found = true
      } else {
        offset += value.length
      }
      return
    }

    node.childNodes.forEach((child, i) => {
      if (node === targetNode && i === targetOffset && !found) found = true
      if (!found) walk(child)
    })
    if (node === targetNode && node.childNodes.length === targetOffset && !found) found = true
  }

  walk(root)
  return offset
}

function findTextPosition(root: Node, targetOffset: number): { node: Text; offset: number } | null {
  let remaining = targetOffset
  let result: { node: Text; offset: number } | null = null

  function walk(node: Node): void {
    if (result) return
    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node as Text).length
      if (remaining <= length) {
        result = { node: node as Text, offset: remaining }
        return
      }
      remaining -= length
      return
    }

    const raw = (node as HTMLElement).dataset?.raw
    if (raw !== undefined) {
      remaining -= raw.length
      return
    }

    if ((node as Element).nodeName === 'BR') {
      remaining -= 1
      return
    }

    node.childNodes.forEach(walk)
  }

  walk(root)
  return result
}

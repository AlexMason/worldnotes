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

  for (let i = 0; i <= clamped; i++) {
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

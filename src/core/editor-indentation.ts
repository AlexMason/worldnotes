// src/editor-indentation.ts

/**
 * Extract the parts of a list-item line.
 * Returns null if the line doesn't match the list-item pattern.
 *
 * Pattern: ^(\s*)([-*+]|\d+\.|[a-z]\.|[A-Z]\.|[ivxlcdm]+\.|[IVXLCDM]+\.)\s(.*)$
 * Markers are rendered AS TYPED (D1): bullets, numeric, alpha (both cases),
 * and roman runs. The single shared LIST_ITEM_RE below is the ONE source of
 * truth — the tokenizer pattern in plugins/listItem.ts imports it, so keydown
 * continuation and tokenization can never drift apart.
 */
export interface ListItemParts {
  indent: string // leading spaces ("" for level 0)
  marker: string // "-", "*", "+", "1.", "a.", "A.", "II.", …
  content: string // text after marker + space
}

export const LIST_ITEM_RE = /^(\s*)([-*+]|\d+\.|[a-z]\.|[A-Z]\.|[ivxlcdm]+\.|[IVXLCDM]+\.)\s(.*)$/

/** True for bullet markers (- * +) — displayed as • (D2). */
export function isBulletMarker(marker: string): boolean {
  return marker === '-' || marker === '*' || marker === '+'
}

// ── Ordered marker continuation (Enter) ───────────────────────────────────

const ROMAN_VALUES: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
const ROMAN_TABLE: [number, string][] = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

function romanToInt(s: string): number {
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN_VALUES[s[i]!]!
    const next = i + 1 < s.length ? ROMAN_VALUES[s[i + 1]!] : 0
    total += v < next ? -v : v
  }
  return total
}

function intToRoman(n: number): string {
  let out = ''
  for (const [value, sym] of ROMAN_TABLE) {
    while (n >= value) {
      out += sym
      n -= value
    }
  }
  return out
}

function isRomanRun(body: string): boolean {
  return body.length > 0 && [...body].every((c) => c in ROMAN_VALUES)
}

/**
 * The marker a NEW line gets when Enter splits/continues an ordered item
 * (feedback: `1.` → `2.`, `a.` → `b.`, `iv.` → `v.`). Bullets return
 * unchanged. Case of the typed form is preserved.
 *
 * Ambiguity rule: single letters `i`/`v`/`x` (in either case) count as
 * ROMAN starts — roman lists begin at I, while alpha lists begin at a/b —
 * so `i.` → `ii.`; `c`/`d`/`l`/`m` continue the ALPHABET (`b.` → `c.` →
 * `d.` stays alpha because b/e/f… are not roman-eligible starts). Multi-
 * character roman runs (`ii.`, `iv.`) always increment as roman. Alpha
 * overflow (`z.`) repeats the marker (a `aa.` style would fall out of the
 * marker grammar anyway).
 */
export function nextMarker(marker: string): string {
  if (isBulletMarker(marker)) return marker
  const body = marker.slice(0, -1) // drop trailing '.'
  // Case follows the ORIGINAL typed marker, not the freshly generated text.
  const keepCase = (s: string): string => (/[A-Z]/.test(body[0] ?? '') ? s.toUpperCase() : s)

  const num = Number(body)
  if (Number.isInteger(num) && /^\d+$/.test(body)) return `${num + 1}.`

  if (body.length === 1 && 'ivxIVX'.includes(body)) {
    return keepCase(intToRoman(romanToInt(body.toLowerCase()) + 1)) + '.'
  }
  if (body.length > 1 && isRomanRun(body.toLowerCase())) {
    return keepCase(intToRoman(romanToInt(body.toLowerCase()) + 1)) + '.'
  }
  if (body.length === 1 && /[a-z]/i.test(body)) {
    const next = String.fromCharCode(body.toLowerCase().charCodeAt(0) + 1)
    if (next > 'z') return marker // alpha overflow: repeat
    return keepCase(next) + '.'
  }
  return marker
}

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
  lineIndex: number // 0-based line index
  lineStart: number // character offset where this line starts
  lineText: string // the full line text (without trailing newline)
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
export function replaceLine(text: string, lineIndex: number, newLine: string): string {
  const lines = text.split('\n')
  lines[lineIndex] = newLine
  return lines.join('\n')
}

/**
 * Insert text at a specific raw offset within a full document string.
 */
export function insertAtOffset(text: string, offset: number, insertion: string): string {
  return text.slice(0, offset) + insertion + text.slice(offset)
}

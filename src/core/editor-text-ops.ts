// ─── Editor text ops — pure document-string edits for keyboard shortcuts ───
//
// No DOM: every function takes the full raw page text and a selection in
// raw-offset space (as produced by caret-offset.getSelectionOffsets) and
// returns a NEW text plus successor selection. The keymap layer
// (editor-keymap.ts) owns DOM mapping and commit; keeping the semantics here
// makes them unit-testable without a browser.
//
// Offset-space notes (pinned by caret-offset's mapping):
// - Raw offsets span the whole document INCLUDING '\n' separators; a line
//   occupies [lineStart, lineStart + lineLen] and the separator is the
//   character right after it.
// - Selections are half-open [start, end): an end landing exactly on a line
//   start does NOT touch that line (VS Code's boundary rule).

export interface LineRange {
  firstLine: number
  lastLine: number
  /** Caret column within the first touched line (clamped to its length). */
  startCol: number
  /** Caret column within the last touched line (clamped to its length). */
  endCol: number
}

export interface LineOpResult {
  text: string
  start: number
  end: number
}

function lineStartAt(text: string, lineIndex: number): number {
  if (lineIndex <= 0) return 0
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

function lineOfOffset(text: string, offset: number): number {
  let line = 0
  const clamped = Math.max(0, Math.min(offset, text.length))
  for (let i = 0; i < clamped; i++) if (text[i] === '\n') line++
  return line
}

function lineTextAt(text: string, lineIndex: number): string {
  const start = lineStartAt(text, lineIndex)
  const end = text.indexOf('\n', start)
  return text.slice(start, end === -1 ? text.length : end)
}

/**
 * Normalize a half-open selection to the inclusive lines it touches plus the
 * caret columns on the bound lines. Boundary rule: a selection ending
 * exactly on a line start does not touch that line (the trailing separator
 * is pulled back first).
 */
export function selectedLineRange(text: string, start: number, end: number): LineRange {
  const s = Math.max(0, Math.min(start, text.length))
  let e = Math.max(0, Math.min(end, text.length))
  if (e > s && text[e - 1] === '\n') e--
  const firstLine = lineOfOffset(text, s)
  const lastLine = lineOfOffset(text, e)
  return {
    firstLine,
    lastLine,
    startCol: Math.min(s - lineStartAt(text, firstLine), lineTextAt(text, firstLine).length),
    endCol: Math.min(e - lineStartAt(text, lastLine), lineTextAt(text, lastLine).length),
  }
}

/**
 * Swap the selected line block with the adjacent line (delta = -1 up, +1
 * down). Returns null when the block cannot move (document edge) — callers
 * treat null as consume-and-noop. The successor selection covers the MOVED
 * block at its new position with identical columns.
 */
export function moveLines(
  text: string,
  start: number,
  end: number,
  delta: -1 | 1,
): LineOpResult | null {
  const range = selectedLineRange(text, start, end)
  const { firstLine, lastLine, startCol, endCol } = range
  const lines = text.split('\n')
  const target = delta === -1 ? firstLine - 1 : lastLine + 1
  if (target < 0 || target >= lines.length) return null

  const block = lines.splice(firstLine, lastLine - firstLine + 1)
  lines.splice(target, 0, ...block)
  const next = lines.join('\n')

  const newFirst = delta === -1 ? target : target - block.length + 1
  const newLast = newFirst + block.length - 1
  const selStart = lineStartAt(next, newFirst) + startCol
  const selEnd = lineStartAt(next, newLast) + endCol
  return { text: next, start: selStart, end: Math.max(selStart, selEnd) }
}

/** Duplicate the selected line block below; the selection lands on the copy. */
export function duplicateLines(text: string, start: number, end: number): LineOpResult {
  const range = selectedLineRange(text, start, end)
  const { firstLine, lastLine, startCol, endCol } = range
  const lines = text.split('\n')
  const block = lines.slice(firstLine, lastLine + 1)
  lines.splice(lastLine + 1, 0, ...block)
  const next = lines.join('\n')

  const newFirst = lastLine + 1
  const newLast = newFirst + block.length - 1
  const selStart = lineStartAt(next, newFirst) + startCol
  const selEnd = lineStartAt(next, newLast) + endCol
  return { text: next, start: selStart, end: Math.max(selStart, selEnd) }
}

/**
 * Delete the selected line block. The caret lands at the start of the line
 * that replaces the block (clamped into the document); deleting everything
 * leaves one empty line.
 */
export function deleteLines(text: string, start: number, end: number): LineOpResult {
  const { firstLine, lastLine } = selectedLineRange(text, start, end)
  const lines = text.split('\n')
  lines.splice(firstLine, lastLine - firstLine + 1)
  if (lines.length === 0) lines.push('')
  const next = lines.join('\n')
  const caret = lineStartAt(next, Math.min(firstLine, lines.length - 1))
  return { text: next, start: caret, end: caret }
}

// ─── Word math ──────────────────────────────────────────────────────────────

/**
 * Three character classes, VS Code-style word boundaries:
 * word ([A-Za-z0-9_]), space (whitespace incl. '\n'), other (punctuation).
 * ASCII-only word chars are a deliberate v1 simplification (deterministic,
 * matches the corpus grammar's bias).
 */
function charClass(ch: string): 'word' | 'space' | 'other' {
  if (/\s/.test(ch)) return 'space'
  if (/[A-Za-z0-9_]/.test(ch)) return 'word'
  return 'other'
}

/**
 * Delete the word left of `offset` (Ctrl+Backspace), LINE-SCOPED:
 * - caret exactly at a line start (document start excluded) → delete the
 *   preceding '\n' (join with the previous line);
 * - else the whitespace run directly left, stopping at the line start;
 * - else the same-class run (word chars, or punctuation as one class)
 *   leftward, never crossing the line start.
 * Callers delete non-collapsed selections before reaching here.
 */
export function deleteWordLeft(text: string, offset: number): { text: string; offset: number } {
  const o = Math.max(0, Math.min(offset, text.length))
  if (o === 0) return { text, offset: 0 }

  const lineStart = lineStartAt(text, lineOfOffset(text, o))

  if (o === lineStart) {
    const from = lineStart - 1 // the preceding '\n' — join lines
    return { text: text.slice(0, from) + text.slice(o), offset: from }
  }

  const cls = charClass(text[o - 1]!)
  let from = o - 1
  while (from > lineStart) {
    const c = text[from - 1]!
    if (c === '\n') break // defensive: never cross a line break
    if (charClass(c) !== cls) break
    from--
  }
  return { text: text.slice(0, from) + text.slice(o), offset: from }
}

/**
 * New caret offset after moving one word from `offset`. DOCUMENT-scoped (the
 * mirror decision of line-scoped deletion): whitespace runs include '\n', so
 * `Ctrl+→` at end of line advances onto the next line's content.
 * From mid-run the caret first lands on the edge of the current run, then
 * any separating whitespace, i.e. word → word with punctuation skipping.
 */
export function moveWord(text: string, offset: number, dir: 'backward' | 'forward'): number {
  const len = text.length
  if (len === 0) return 0
  let o = Math.max(0, Math.min(offset, len))

  if (dir === 'backward') {
    // bash-readline style: if attached to whitespace, jump to the previous
    // run's end first, then consume that run — landing on a WORD START
    // (never mid-whitespace).
    if (o > 0 && charClass(text[o - 1]!) === 'space') {
      while (o > 0 && charClass(text[o - 1]!) === 'space') o--
    }
    if (o > 0) {
      const cls = charClass(text[o - 1]!)
      while (o > 0 && charClass(text[o - 1]!) === cls) o--
    }
    return o
  }

  if (o < len) {
    const cls = charClass(text[o]!)
    while (o < len && charClass(text[o]!) === cls) o++
    while (o < len && charClass(text[o]!) === 'space') o++
  }
  return o
}

/**
 * Extend or shrink a selection by one word from its FOCUS end.
 * `focusEnd` names which normalized end carries the live selection's focus;
 * the anchor stays put. Returns the new normalized [min, max] pair.
 */
export function wordExtend(
  text: string,
  start: number,
  end: number,
  focusEnd: 'start' | 'end',
  dir: 'backward' | 'forward',
): { start: number; end: number } {
  const anchor = focusEnd === 'end' ? start : end
  const focus = focusEnd === 'end' ? end : start
  const newFocus = moveWord(text, focus, dir)
  return { start: Math.min(anchor, newFocus), end: Math.max(anchor, newFocus) }
}

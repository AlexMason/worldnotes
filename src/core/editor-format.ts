// ─── Editor format ops — pure markdown formatting for shortcuts + toolbar ───
//
// Ctrl+B / Ctrl+I / Ctrl+U / Ctrl+K and the toolbar buttons share these over
// raw document text with a raw-space selection (see editor-text-ops' offset
// conventions). Every function returns the new text plus the successor
// selection; the keymap owns commit + caret restore. No DOM here either.

import { selectedLineRange } from './editor-text-ops'
import { LIST_ITEM_RE, isBulletMarker } from './editor-indentation'
import { scanInline } from './tokenizer'
import type { TokenDef } from './types'

export interface FormatResult {
  text: string
  start: number
  end: number
}

/**
 * Toggle `open`…`close` (default: the same marker both sides) around the
 * selection [start, end), VS Code-markdown style. `<u>`/`</u>` is the one
 * asymmetric pair; bold/italic pass a single marker.
 *
 * Unwrap is checked from the INSIDE out:
 *  1. the selection itself begins/ends with the markers → strip within;
 *  2. the markers sit in the text immediately outside the selection → strip
 *     around (this is the state a previous wrap leaves the caret in);
 *  3. collapsed caret sitting exactly between a marker pair (`**|**`) →
 *     unwrap to an empty line.
 * Otherwise wrap and return the selection over the INNER content, so a
 * second press hits rule 2 and unwraps (true toggle).
 *
 * Exact-match only: near-misses (e.g. wrapping a range inside an existing
 * bold span) produce nested markers rather than heuristic surgery — one
 * Ctrl+Z reverts any surprise, matching the undo-granularity guarantee.
 */
export function toggleWrap(
  text: string,
  start: number,
  end: number,
  open: string,
  close: string = open,
): FormatResult {
  const o = open.length
  const c = close.length
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))

  // Rule 2/3 first at the caret: outside markers around a (possibly empty)
  // selection. Checking before rule 1 makes `**|**` unwrap rather than
  // produce `**` + marker + `**`.
  if (
    s - o >= 0 &&
    e + c <= text.length &&
    text.slice(s - o, s) === open &&
    text.slice(e, e + c) === close
  ) {
    const next = text.slice(0, s - o) + text.slice(s, e) + text.slice(e + c)
    return { text: next, start: s - o, end: e - o }
  }

  // Rule 1: selection carries the markers itself.
  if (e - s >= o + c && text.slice(s, s + o) === open && text.slice(e - c, e) === close) {
    const next = text.slice(0, s) + text.slice(s + o, e - c) + text.slice(e)
    return { text: next, start: s, end: Math.max(s, e - o - c) }
  }

  // Wrap (also handles the bare collapsed caret: `****` with caret between).
  const next = text.slice(0, s) + open + text.slice(s, e) + close + text.slice(e)
  return { text: next, start: s + o, end: e + o }
}

function lineStartOffsets(lines: readonly string[]): number[] {
  const starts: number[] = []
  let pos = 0
  for (const line of lines) {
    starts.push(pos)
    pos += line.length + 1
  }
  return starts
}

interface ListTarget {
  index: number
  /** LIST_ITEM_RE match, or null for a plain line. */
  match: RegExpExecArray | null
}

/**
 * The lines a list toggle acts on: non-blank, outside `skip` (block-region
 * lines — a selection straddling a fence must never get `- ` spliced into
 * code). toggleList and the toolbar's pressed state both read THIS, so the
 * button can never light up for a state its press would not remove.
 */
function listTargets(
  lines: readonly string[],
  firstLine: number,
  lastLine: number,
  skip: ReadonlySet<number>,
): ListTarget[] {
  const targets: ListTarget[] = []
  for (let i = firstLine; i <= lastLine; i++) {
    if (!skip.has(i) && lines[i]!.trim() !== '') {
      targets.push({ index: i, match: LIST_ITEM_RE.exec(lines[i]!) })
    }
  }
  return targets
}

const allBullets = (targets: readonly ListTarget[]): boolean =>
  targets.length > 0 && targets.every((t) => t.match !== null && isBulletMarker(t.match[2]!))

/**
 * Bullet-list toggle over the lines the selection touches.
 *
 * Targets are the non-blank lines outside `skip` (block-region lines: a
 * selection straddling a fence must never get `- ` spliced into code). If
 * EVERY target is already a bullet item the markers are removed; otherwise
 * every target becomes a bullet item (numbered/lettered items swap their
 * marker for `- `, plain lines get `- ` after their indent, existing bullets
 * are left alone). Returns null when there is nothing to change.
 *
 * Selection: a collapsed caret keeps its place relative to its text; a range
 * becomes the whole touched line block.
 */
export function toggleList(
  text: string,
  start: number,
  end: number,
  skip: ReadonlySet<number> = new Set(),
): FormatResult | null {
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))
  const { firstLine, lastLine } = selectedLineRange(text, s, e)
  const lines = text.split('\n')

  const targets = listTargets(lines, firstLine, lastLine, skip)
  if (targets.length === 0) return null

  const remove = allBullets(targets)
  const next = lines.slice()
  for (const { index: i, match: m } of targets) {
    if (m === null) {
      const indent = /^\s*/.exec(lines[i]!)![0]
      next[i] = indent + '- ' + lines[i]!.slice(indent.length)
    } else if (remove) {
      next[i] = m[1]! + m[3]!
    } else if (!isBulletMarker(m[2]!)) {
      next[i] = m[1]! + '- ' + m[3]!
    }
  }

  const out = next.join('\n')
  if (out === text) return null

  const oldStarts = lineStartOffsets(lines)
  const newStarts = lineStartOffsets(next)
  if (s === e) {
    const delta = next[firstLine]!.length - lines[firstLine]!.length
    const indentLen = /^\s*/.exec(lines[firstLine]!)![0].length
    const col = Math.min(
      Math.max(s - oldStarts[firstLine]! + delta, indentLen),
      next[firstLine]!.length,
    )
    const caret = newStarts[firstLine]! + col
    return { text: out, start: caret, end: caret }
  }
  return {
    text: out,
    start: newStarts[firstLine]!,
    end: newStarts[lastLine]! + next[lastLine]!.length,
  }
}

export interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  link: boolean
  list: boolean
}

export interface CoveringToken {
  type: string
  raw: string
  groups: string[]
  /** Raw document offsets of the token's source span. */
  from: number
  to: number
}

/**
 * The inline tokens a SINGLE-LINE selection sits in, derived from the markdown
 * source (never from DOM styling). A collapsed caret is "in" a token when it
 * is strictly inside its raw span (markers included, outer edges excluded); a
 * range when it lies within it. A list line's content is re-scanned with the
 * inline defs, mirroring how the list plugin renders it. Multi-line
 * selections cover nothing.
 */
export function coveringTokens(
  text: string,
  start: number,
  end: number,
  defs: readonly TokenDef[],
): CoveringToken[] {
  return coveringOnLine(text.split('\n'), text, start, end, defs)
}

function coveringOnLine(
  lines: readonly string[],
  text: string,
  start: number,
  end: number,
  defs: readonly TokenDef[],
): CoveringToken[] {
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))
  const { firstLine, lastLine } = selectedLineRange(text, s, e)
  if (firstLine !== lastLine) return []

  const line = lines[firstLine]!
  const lineStart = lineStartOffsets(lines)[firstLine]!
  const cs = s - lineStart
  const ce = e - lineStart
  const item = LIST_ITEM_RE.exec(line)
  const content = item ? item[3]! : line
  let pos = item ? line.length - content.length : 0

  const covering: CoveringToken[] = []
  const inlineDefs = defs.filter((d) => !d.pattern.source.startsWith('^'))
  for (const token of scanInline(content, inlineDefs)) {
    const len = token.raw.length
    const inside = cs === ce ? pos < cs && cs < pos + len : pos <= cs && ce <= pos + len
    if (inside) {
      covering.push({ ...token, from: lineStart + pos, to: lineStart + pos + len })
    }
    pos += len
  }
  return covering
}

/**
 * Which formats the selection sits in (see coveringTokens for the token
 * rule). `list` is true exactly when toggleList (given the same `skip`) would
 * REMOVE bullets. Multi-line selections report only `list`.
 */
export function activeFormats(
  text: string,
  start: number,
  end: number,
  defs: readonly TokenDef[],
  skip: ReadonlySet<number> = new Set(),
): ActiveFormats {
  const s = Math.max(0, Math.min(start, text.length))
  const e = Math.max(s, Math.min(end, text.length))
  const lines = text.split('\n')
  const { firstLine, lastLine } = selectedLineRange(text, s, e)
  const result: ActiveFormats = {
    bold: false,
    italic: false,
    underline: false,
    link: false,
    list: allBullets(listTargets(lines, firstLine, lastLine, skip)),
  }
  for (const token of coveringOnLine(lines, text, s, e, defs)) {
    if (token.type === 'bold') result.bold = true
    else if (token.type === 'italic') result.italic = true
    else if (token.type === 'underline') result.underline = true
    else if (token.type === 'link' || token.type === 'wiki-link') result.link = true
  }
  return result
}

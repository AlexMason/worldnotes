// ─── Table plugin — pipe tables with alignment ───────────────────────────────
// The token-mode BlockDef consumer. ONE parse (in match/parseLine, DOM-free)
// produces the cell map + alignments that BOTH renderers read — parity for
// tables is structural, not "two hand-written implementations that happen to
// match" (plan M2/B1).
//
// Rendering: each claimed row becomes a single 'table-row' token; its render
// pair emits pipe punct spans + per-cell spans. Text fidelity holds — split
// on '|' and rejoined with '|' is the exact source line, and cell content
// goes through renderInline (the punct convention keeps every character).
//
// Layout is FLEX, not display:table, deliberately (docs/architecture.md):
// expanded rows (raw text) and collapsed rows (cells) both degrade
// gracefully to block flow; anonymous-table-cell jumps are impossible.
// Pipes are hidden by CSS only — the text nodes stay for caret math.
//
// Detection safety (review B2/M9): the central isPlainLine gate keeps a
// region from STARTING on heading/hr/quote/list lines; the separator must
// contain a literal '|' with every cell matching ^:?-{1,}:?$ (bare '---' is
// an hr, never a separator); body rows stop at the first non-'|' line, a
// line-level construct, or EOF.

import type {
  ContentPlugin,
  Token,
  EditorContext,
  StaticRenderContext,
  BlockDef,
  BlockHelpers,
} from '../types'
import { escapeHTML } from '../escape'

type Align = 'left' | 'center' | 'right' | null

interface TableState {
  lines: string[]
  /** Absolute index of the separator line. */
  sepIndex: number
  /** Absolute index of the header line (= region start). */
  headIndex: number
  alignments: Align[]
}

interface RowMeta {
  alignments: Align[]
  /** Original segment index where column 0 lives (1 when a leading outer pipe). */
  cellStart: number
  /** True when the row ended in a pipe (trailing outer segment). */
  outerEnd: boolean
  /** Column count of the table (alignment lookup bound). */
  columns: number
}

const SEP_CELL = /^:?-{1,}:?$/
const ALIGN_CLASS: Record<Exclude<Align, null>, string> = {
  left: 'wn-align-left',
  center: 'wn-align-center',
  right: 'wn-align-right',
}

/** '|' positions for alignment/colons only — cells keep surrounding spaces. */
function parseAlign(cell: string): Align {
  const c = cell.trim()
  const l = c.startsWith(':')
  const r = c.endsWith(':')
  if (l && r) return 'center'
  if (r) return 'right'
  if (l) return 'left'
  return null
}

/** One optional leading + trailing pipe stripped (GFM outer-pipe rule). */
function stripOuter(line: string): { segs: string[]; cellStart: number; outerEnd: boolean } {
  const segs = line.split('|')
  let cellStart = 0
  let outerEnd = false
  if (segs.length > 1 && segs[0]!.trim() === '') {
    segs.shift()
    cellStart = 1
  }
  if (segs.length > 1 && segs[segs.length - 1]!.trim() === '') {
    segs.pop()
    outerEnd = true
  }
  return { segs, cellStart, outerEnd }
}

const tableDef: BlockDef = {
  type: 'table',
  lineTokenType: 'table-row',

  match(lines: string[], start: number, helpers: BlockHelpers) {
    const header = lines[start]
    const sep = lines[start + 1]
    if (sep === undefined || !header.includes('|') || !sep.includes('|')) return null

    const h = stripOuter(header)
    const s = stripOuter(sep)
    if (s.segs.length < 1 || h.segs.length !== s.segs.length) return null

    const alignments: Align[] = []
    for (const cell of s.segs) {
      if (!SEP_CELL.test(cell.trim())) return null
      alignments.push(parseAlign(cell))
    }

    let end = start + 1
    while (
      end + 1 < lines.length &&
      lines[end + 1].includes('|') &&
      helpers.isPlainLine(lines[end + 1])
    ) {
      end++
    }
    const state: TableState = {
      lines,
      headIndex: start,
      sepIndex: start + 1,
      alignments,
    }
    return { endLine: end, state }
  },

  lineMode(index: number, state?: unknown): 'verbatim' | 'token' {
    const s = state as TableState
    // The separator's dashes are pure grammar: verbatim, styled away by CSS.
    return index === s.sepIndex ? 'verbatim' : 'token'
  },

  parseLine(index: number, state?: unknown): Token[] {
    const s = state as TableState
    const line = s.lines[index]
    const { cellStart, outerEnd } = stripOuter(line)
    const meta: RowMeta = {
      alignments: s.alignments,
      cellStart,
      outerEnd,
      columns: s.alignments.length,
    }
    return [{ type: 'table-row', raw: line, groups: [line], meta }]
  },

  wrapperClass: 'wn-table',

  lineClass(index: number, state?: unknown): string {
    const s = state as TableState
    if (index === s.sepIndex) return 'wn-table-sep'
    if (index === s.headIndex) return 'wn-table-row wn-table-head'
    return 'wn-table-row'
  },
}

/**
 * Row reconstruction is `segs.join('|')` BY CONSTRUCTION: every original
 * segment is emitted (outer empty segments as plain wn-table-edge spans —
 * borderless, invisible), each pair separated by a wn-punct pipe span, and
 * cell content goes through renderInline (punct convention preserves every
 * character). split-then-join is the identity, so DOM text == source line
 * for ANY row, ragged included.
 */
function rowParts(
  raw: string,
  meta: RowMeta,
  makePunct: () => string,
  makeCell: (seg: string, col: number) => string,
): string[] {
  const segs = raw.split('|')
  const last = segs.length - 1
  const out: string[] = []
  segs.forEach((seg, i) => {
    if (i > 0) out.push(makePunct())
    const isOuter = (i === 0 && meta.cellStart === 1) || (i === last && meta.outerEnd && last > 0)
    const col = i - meta.cellStart
    out.push(isOuter ? `<span class="wn-table-edge">${escapeHTML(seg)}</span>` : makeCell(seg, col))
  })
  return out
}

function alignClasses(align: Align): string {
  return align ? `wn-table-cell ${ALIGN_CLASS[align]}` : 'wn-table-cell'
}

export const tablePlugin: ContentPlugin = {
  name: 'table',
  version: '1.0.0',
  kind: 'content',
  tokens: [],
  blocks: [tableDef],

  /**
   * DOM mirror of rowParts(): segs.join('|') reconstruction — every segment
   * emitted, pipes as wn-punct spans between them, outer empty segments as
   * borderless wn-table-edge spans, cells inline-rendered.
   */
  render(token: Token, context: EditorContext): HTMLElement {
    const meta = token.meta as RowMeta
    const row = document.createElement('span')
    row.className = 'wn-table-cells' // display: contents — see styles.ts
    const span = (cls: string): HTMLElement => {
      const s = document.createElement('span')
      s.className = cls
      return s
    }
    const segs = token.raw.split('|')
    const last = segs.length - 1
    segs.forEach((seg, i) => {
      if (i > 0) {
        const p = span('wn-punct')
        p.textContent = '|'
        row.appendChild(p)
      }
      const isOuter = (i === 0 && meta.cellStart === 1) || (i === last && meta.outerEnd && last > 0)
      if (isOuter) {
        const e = span('wn-table-edge')
        e.textContent = seg
        row.appendChild(e)
        return
      }
      const col = i - meta.cellStart
      const align = col >= 0 && col < meta.columns ? meta.alignments[col] : null
      const cell = span(alignClasses(align))
      if (context.renderInline) cell.appendChild(context.renderInline(seg))
      else cell.textContent = seg
      row.appendChild(cell)
    })
    return row
  },

  renderToHTML(token: Token, context: StaticRenderContext): string {
    const meta = token.meta as RowMeta
    const parts = rowParts(
      token.raw,
      meta,
      () => '<span class="wn-punct">|</span>',
      (seg, col) => {
        const align = col >= 0 && col < meta.columns ? meta.alignments[col] : null
        return `<span class="${alignClasses(align)}">${context.renderInline(seg)}</span>`
      },
    )
    return `<span class="wn-table-cells">${parts.join('')}</span>`
  },
}

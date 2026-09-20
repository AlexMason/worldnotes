// ─── Code block plugin — fenced ``` ``` ``` ``` ``` ``` ``` ``` ``` ``` ───────
// The first consumer of the block pass (document.ts). Purely DECLARATIVE:
// detection + verbatim line mode + classes. There is no render() work —
// region lines are single text tokens the existing renderers emit verbatim
// (escapeHTML on the static path, TextNode in the DOM). That IS the grammar:
// nothing inside a fence is parsed, so `**bold**`, [[wiki]], |tables| and
// <script> survive as literal source on BOTH surfaces.
//
// Fidelity: fence characters and the language label stay in the DOM text
// (dimmed via wn-code-fence), so extractContentText round-trips without any
// data-raw (block-region lines never use data-raw — see content-text.ts).
//
// GFM-compat: an unclosed fence runs to EOF.

import type { ContentPlugin, Token, EditorContext, BlockDef } from '../types'

const FENCE_OPEN = /^```/
const FENCE_CLOSE = /^\s*```\s*$/

interface FenceState {
  /** Absolute index of the opening fence line. */
  open: number
  /** Absolute index of the closing fence line, or -1 when unclosed-to-EOF. */
  close: number
}

const codeBlockDef: BlockDef = {
  type: 'code-block',
  match(lines: string[], start: number): { endLine: number; state: FenceState } | null {
    if (!FENCE_OPEN.test(lines[start])) return null
    for (let i = start + 1; i < lines.length; i++) {
      if (FENCE_CLOSE.test(lines[i])) return { endLine: i, state: { open: start, close: i } }
    }
    return { endLine: lines.length - 1, state: { open: start, close: -1 } }
  },
  lineMode(): 'verbatim' {
    return 'verbatim'
  },
  wrapperClass: 'wn-code-block',
  lineClass(index: number, state?: unknown): string {
    const s = state as FenceState
    return index === s.open || index === s.close ? 'wn-code-fence' : 'wn-code-line'
  },
}

export const codeBlockPlugin: ContentPlugin = {
  name: 'code-block',
  version: '1.0.0',
  kind: 'content',
  tokens: [],
  blocks: [codeBlockDef],

  /** Block-only plugin: its lines are verbatim text tokens; nothing here
   *  ever reaches render() unless a token type leaks (it can't). */
  render(_token: Token, _context: EditorContext): HTMLElement {
    return document.createElement('span')
  },
}

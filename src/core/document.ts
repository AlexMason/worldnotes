// ─── Document model — the block pass that runs BEFORE line tokenization ─────
// The tokenizer is strictly line-local; fenced code and pipe tables span
// lines. buildDocument resolves them declaratively through plugin BlockDefs,
// then tokenizes every line exactly as tokenizer.ts does — with region lines
// produced by the block itself instead:
//
//   • 'verbatim' lines become a single text token (no inline parsing —
//     `**bold**` inside a fence stays literal on BOTH surfaces);
//   • 'token' lines (table rows) come from the plugin's parseLine, whose
//     token raws must concatenate byte-exact to the source line.
//
// DOM-free by construction (same rule as static-renderer.ts). Precedence:
// earliest startLine wins, ties broken by registration order (defaults
// registers fences before tables). Region starts must be plain lines —
// `helpers.isPlainLine` guarantees the block pass never swallows heading /
// hr / blockquote / list grammar that line tokenization would claim.

import type {
  BlockDef,
  BlockRegion,
  BlockHelpers,
  ContentPlugin,
  DocModel,
  Token,
  TokenDef,
} from './types'
import { scanInline } from './tokenizer'

/**
 * Build the document model for `text`: block regions resolved first, then
 * per-line tokens (region lines tokenized through their block def).
 *
 * @param text    - Full raw document text
 * @param plugins - All registered content plugins (defs and blocks in order)
 */
export function buildDocument(text: string, plugins: ContentPlugin[]): DocModel {
  const defs = plugins.flatMap((p) => p.tokens)
  const lineDefs = defs.filter((d) => d.pattern.source.startsWith('^'))
  const inlineDefs = defs.filter((d) => !d.pattern.source.startsWith('^'))

  const blockEntries: { def: BlockDef; plugin: ContentPlugin }[] = plugins.flatMap((p) =>
    (p.blocks ?? []).map((def) => ({ def, plugin: p })),
  )

  const sourceLines = text.split('\n')
  const helpers: BlockHelpers = {
    isPlainLine: (line: string): boolean => !lineDefs.some((d) => d.pattern.test(line)),
  }

  // ── Region scan: earliest start wins, ties by registration order ─────────
  const blocks: BlockRegion[] = []
  const owner = new Map<number, BlockRegion>() // line index → claiming region
  for (let i = 0; i < sourceLines.length; i++) {
    if (owner.has(i)) continue
    if (!helpers.isPlainLine(sourceLines[i])) continue // B2: regions never START on heading/hr/quote/list lines
    for (const { def, plugin } of blockEntries) {
      const hit = def.match(sourceLines, i, helpers)
      if (hit === null) continue
      const endLine = Math.min(hit.endLine, sourceLines.length - 1)
      if (endLine < i) continue
      const region: BlockRegion = {
        type: def.type,
        def,
        plugin,
        startLine: i,
        endLine,
        state: hit.state,
      }
      blocks.push(region)
      for (let l = i; l <= endLine; l++) owner.set(l, region)
      i = endLine
      break
    }
  }

  // ── Line tokenization: plain lines via tokenizeLine, region lines via def
  const lines: Token[][] = []
  for (let i = 0; i < sourceLines.length; i++) {
    const region = owner.get(i)
    if (!region) {
      lines.push(tokenizeLineLocal(sourceLines[i], lineDefs, inlineDefs))
      continue
    }
    if (region.def.lineMode(i, region.state) === 'verbatim') {
      lines.push(verbatimTokens(sourceLines[i]))
    } else {
      const parsed = region.def.parseLine ? region.def.parseLine(i, region.state) : []
      // Fidelity contract (pinned by document/table tests): token raws must
      // rebuild the source line byte-exact. A parseLine that drops source
      // characters would silently corrupt extractContentText round-tripping.
      if (!parsed.length || joinRaws(parsed) !== sourceLines[i]) {
        // Fail safe, never fail lost: degrade the line to verbatim text.
        lines.push(verbatimTokens(sourceLines[i]))
      } else {
        lines.push(parsed)
      }
    }
  }

  return { lines, blocks }
}

function verbatimTokens(line: string): Token[] {
  return [{ type: 'text', raw: line, groups: [line] }]
}

function joinRaws(tokens: Token[]): string {
  return tokens.map((t) => t.raw).join('')
}

/** Same contract as tokenizeLine, against pre-split def lists. */
function tokenizeLineLocal(line: string, lineDefs: TokenDef[], inlineDefs: TokenDef[]): Token[] {
  for (const def of lineDefs) {
    const m = line.match(def.pattern)
    if (m) {
      return [{ type: def.type, raw: m[0], groups: m.slice(1).map((g) => g ?? '') }]
    }
  }
  return scanInline(line, inlineDefs)
}

/**
 * Inclusive block region covering `lineIndex`, if any. The editor uses this
 * to expand EVERY line of a block when the cursor sits on any of them (D3).
 */
export function regionAt(blocks: BlockRegion[], lineIndex: number): BlockRegion | null {
  for (const b of blocks) {
    if (lineIndex >= b.startLine && lineIndex <= b.endLine) return b
  }
  return null
}

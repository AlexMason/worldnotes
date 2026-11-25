// ─── Grammar spans — the DOM-free bridge from the plugin grammar to CM6 ──────
// SPIKE (GH-4 / issue #5). Walks the SAME `buildDocument` model the reader
// consumes (tokenizer + BlockDef block pass + plugin token defs) and emits
// flat, offset-addressed "spans" describing what a live-preview surface should
// do with each source range. Nothing here knows about CodeMirror or the DOM:
// `live-preview.ts` turns spans into `Decoration`s, and the parity test
// compares spans against the reader's `renderDocModelToHTML` output.
//
// Replaces, per surface, what `plugin.render()` does for the editor DOM: the
// document string stays the exact markdown source, spans only say which source
// ranges to dim/hide/style. The reader's `renderToHTML` is untouched.
//
// KNOWN LIMITATION (see docs/research/cm6-spike-findings.md): the per-token
// decisions below (link safety, wiki slug folding, image safety) duplicate
// what each plugin's render()/renderToHTML() decide. A real port needs a
// plugin-side `decorate(token)` hook so there is ONE decision site per token.

import type { BlockRegion, ContentPlugin, Token, TokenDef } from '../types'
import { buildDocument } from '../document'
import { scanInline } from '../tokenizer'
import { parseWikiLink } from '../navigation'
import { isBulletMarker } from '../editor-indentation'
import { classifyLinkTarget, isSafeHref, isSafeImageUrl } from '../../shared/url-policy'
import { wikiTargetToSlug } from '../../shared/slug'

/**
 * - `line`    — class on the whole line (`from` = line start, zero width).
 * - `mark`    — class/attrs on a source range, always visible.
 * - `hide`    — grammar punctuation: removed while the line is collapsed,
 *               dimmed (`wn-punct`) while the line is being edited.
 * - `replace` — like `hide`, but collapsed state shows `text` instead
 *               (bullet `-` → `•`).
 * - `image`   — zero-width; collapsed state shows an `<img>` widget at `from`.
 */
export type SpanKind = 'line' | 'mark' | 'hide' | 'replace' | 'image'

export interface GrammarSpan {
  kind: SpanKind
  from: number
  to: number
  /** 0-based source line index — the unit of per-line activation. */
  line: number
  /** Class always applied (mark/line) or on the replacement widget. */
  cls?: string
  /** Class applied to `line` spans only while the line is collapsed. */
  inactiveCls?: string
  attrs?: Record<string, string>
  /** `replace`: collapsed-state text. */
  text?: string
  /** `image`: safe image source + alt. */
  src?: string
  alt?: string
}

export interface GrammarSpans {
  spans: GrammarSpan[]
  blocks: BlockRegion[]
  /** Absolute offset of each source line start (split('\n') semantics). */
  lineStarts: number[]
}

type Out = GrammarSpan[]

/**
 * Compute every span for `text` under `plugins`. Pure; O(document) — the
 * tokenizer is whole-document by design (known issue for large pages).
 */
export function grammarSpans(text: string, plugins: ContentPlugin[]): GrammarSpans {
  const doc = buildDocument(text, plugins)
  const inlineDefs = plugins
    .flatMap((p) => p.tokens)
    .filter((d) => !d.pattern.source.startsWith('^'))
  const spans: Out = []
  const lineStarts: number[] = []

  const owner = new Map<number, BlockRegion>()
  for (const region of doc.blocks) {
    for (let l = region.startLine; l <= region.endLine; l++) owner.set(l, region)
  }

  let pos = 0
  for (let i = 0; i < doc.lines.length; i++) {
    lineStarts.push(pos)
    const tokens = doc.lines[i]
    const lineLen = tokens.reduce((n, t) => n + t.raw.length, 0)
    const region = owner.get(i)

    if (region) {
      regionLineSpans(region, i, pos, tokens, spans)
    } else {
      let offset = pos
      for (const tok of tokens) {
        tokenSpans(tok, offset, pos, i, inlineDefs, spans)
        offset += tok.raw.length
      }
    }
    pos += lineLen + 1
  }

  return { spans, blocks: doc.blocks, lineStarts }
}

// ─── Block regions (fences, tables) ──────────────────────────────────────────

function regionLineSpans(
  region: BlockRegion,
  line: number,
  lineStart: number,
  tokens: Token[],
  out: Out,
): void {
  const cls = [
    region.def.wrapperClass,
    region.def.lineClass?.(line, region.state),
    line === region.startLine ? 'wn-region-first' : '',
    line === region.endLine ? 'wn-region-last' : '',
  ]
    .filter(Boolean)
    .join(' ')
  out.push({ kind: 'line', from: lineStart, to: lineStart, line, cls })

  // Table rows: pipes are grammar. Verbatim lines (fences, separators) stay
  // byte-exact text — NO inline parsing inside a fence, same as the reader.
  if (region.def.lineMode(line, region.state) === 'token') {
    for (const tok of tokens) {
      for (let k = 0; k < tok.raw.length; k++) {
        if (tok.raw[k] === '|') {
          out.push({
            kind: 'mark',
            from: lineStart + k,
            to: lineStart + k + 1,
            line,
            cls: 'wn-punct',
          })
        }
      }
    }
  }
}

// ─── Token → spans ───────────────────────────────────────────────────────────

function inline(
  text: string,
  start: number,
  lineStart: number,
  line: number,
  defs: TokenDef[],
  out: Out,
): void {
  let offset = start
  for (const tok of scanInline(text, defs)) {
    tokenSpans(tok, offset, lineStart, line, defs, out)
    offset += tok.raw.length
  }
}

function tokenSpans(
  tok: Token,
  s: number,
  lineStart: number,
  line: number,
  defs: TokenDef[],
  out: Out,
): void {
  const e = s + tok.raw.length
  const g0 = tok.groups[0] ?? ''
  const g1 = tok.groups[1] ?? ''

  switch (tok.type) {
    case 'h1':
    case 'h2':
    case 'h3': {
      const prefix = tok.raw.length - g0.length
      out.push({ kind: 'line', from: lineStart, to: lineStart, line, cls: `wn-${tok.type}` })
      out.push({ kind: 'hide', from: s, to: s + prefix, line })
      inline(g0, s + prefix, lineStart, line, defs, out)
      return
    }
    case 'blockquote': {
      out.push({ kind: 'line', from: lineStart, to: lineStart, line, cls: 'wn-blockquote' })
      out.push({ kind: 'hide', from: s, to: s + g0.length, line })
      inline(g1, s + g0.length, lineStart, line, defs, out)
      return
    }
    case 'hr': {
      // Reader CSS styles `.wn-hr` as a collapsed rule; while editing the
      // source `---` must read as text, so the class is collapsed-only.
      out.push({ kind: 'line', from: lineStart, to: lineStart, line, inactiveCls: 'wn-hr' })
      return
    }
    case 'list-item': {
      const indent = g0
      const marker = g1
      const content = tok.groups[2] ?? ''
      const markerFrom = s + indent.length
      const markerTo = markerFrom + marker.length + 1 // marker + the single \s
      if (indent) {
        out.push({
          kind: 'mark',
          from: s,
          to: markerFrom,
          line,
          cls: 'wn-list-item-indent',
        })
      }
      if (isBulletMarker(marker)) {
        out.push({
          kind: 'replace',
          from: markerFrom,
          to: markerTo,
          line,
          text: '• ',
          cls: 'wn-list-item-marker',
        })
      } else {
        out.push({
          kind: 'mark',
          from: markerFrom,
          to: markerTo,
          line,
          cls: 'wn-list-item-marker',
        })
      }
      inline(content, e - content.length, lineStart, line, defs, out)
      return
    }
    case 'bold':
      return wrapped(s, e, line, 2, 'wn-bold', out)
    case 'italic':
      return wrapped(s, e, line, 1, 'wn-italic', out)
    case 'strikethrough':
      return wrapped(s, e, line, 2, 'wn-strikethrough', out)
    case 'inline-code':
      return wrapped(s, e, line, 1, 'wn-inline-code wn-code-text', out)
    case 'wiki-link': {
      if (wikiTargetToSlug(parseWikiLink(g0).page) === null) return // literal source
      const { page, display } = parseWikiLink(g0)
      const at = g0.lastIndexOf(display)
      const from = s + 2 // after [[
      const to = e - 2 // before ]]
      if (at < 0) {
        out.push({
          kind: 'mark',
          from,
          to,
          line,
          cls: 'wn-wiki-link',
          attrs: { 'data-page': page },
        })
      } else {
        out.push({ kind: 'hide', from: s, to: from + at, line })
        out.push({
          kind: 'mark',
          from: from + at,
          to: from + at + display.length,
          line,
          cls: 'wn-wiki-link',
          attrs: { 'data-page': page },
        })
        out.push({ kind: 'hide', from: from + at + display.length, to: e, line })
      }
      return
    }
    case 'link': {
      const kind = classifyLinkTarget(g1)
      let cls = 'wn-link'
      let attrs: Record<string, string> | undefined
      if (kind === 'external') {
        if (!isSafeHref(g1)) return // literal source
        attrs = { 'data-href': g1 }
        if (/^https?:/i.test(g1)) attrs.target = '_blank'
      } else if (kind === 'internal') {
        if (wikiTargetToSlug(g1) === null) return // literal source
        cls = 'wn-wiki-link'
        attrs = { 'data-page': g1 }
      }
      out.push({ kind: 'hide', from: s, to: s + 1, line })
      out.push({ kind: 'mark', from: s + 1, to: s + 1 + g0.length, line, cls, attrs })
      out.push({ kind: 'hide', from: s + 1 + g0.length, to: e, line })
      return
    }
    case 'image': {
      if (!isSafeImageUrl(g1)) return // literal source
      // Collapsed: source gone, picture only (reader CSS hides punct/alt/src).
      out.push({ kind: 'hide', from: s, to: e, line })
      out.push({ kind: 'image', from: e, to: e, line, src: g1, alt: g0 })
      return
    }
    default:
      return // 'text' and unknown token types: plain source
  }
}

function wrapped(s: number, e: number, line: number, marker: number, cls: string, out: Out): void {
  out.push({ kind: 'hide', from: s, to: s + marker, line })
  out.push({ kind: 'mark', from: s + marker, to: e - marker, line, cls })
  out.push({ kind: 'hide', from: e - marker, to: e, line })
}

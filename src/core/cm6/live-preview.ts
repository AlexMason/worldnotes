// ─── Live preview — CM6 decoration layer over the plugin grammar ─────────────
// SPIKE (GH-4 / issue #5). The document is ALWAYS the exact markdown source.
// `grammarSpans` (tokenizer + BlockDefs + plugin defs — the reader's grammar)
// says what each source range means; this ViewPlugin turns that into CM6
// decorations, collapsing grammar punctuation on every line the selection
// does not touch. Same per-line activation UX as `activeLines` in
// editor-render.ts, including block-expand (every line of a fence/table
// expands when the caret is on any of them).

import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view'
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import type { EditorState, Extension, Range } from '@codemirror/state'
import type { BlockRegion, ContentPlugin } from '../types'
import { grammarSpans } from './grammar-spans'
import type { GrammarSpan } from './grammar-spans'

/** Source line indices (0-based) the selection touches, block-expanded. */
export function activeLineSet(state: EditorState, blocks: BlockRegion[]): Set<number> {
  const active = new Set<number>()
  for (const r of state.selection.ranges) {
    const first = state.doc.lineAt(r.from).number - 1
    const last = state.doc.lineAt(r.to).number - 1
    for (let l = first; l <= last; l++) active.add(l)
  }
  for (const region of blocks) {
    for (let l = region.startLine; l <= region.endLine; l++) {
      if (!active.has(l)) continue
      for (let k = region.startLine; k <= region.endLine; k++) active.add(k)
      break
    }
  }
  return active
}

class TextWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly cls: string,
  ) {
    super()
  }
  eq(other: TextWidget): boolean {
    return other.text === this.text && other.cls === this.cls
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = this.cls
    el.textContent = this.text
    return el
  }
}

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
  ) {
    super()
  }
  eq(other: ImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt
  }
  toDOM(): HTMLElement {
    const img = document.createElement('img')
    img.className = 'wn-image-img'
    img.setAttribute('src', this.src)
    img.setAttribute('alt', this.alt)
    img.setAttribute('loading', 'lazy')
    img.setAttribute('referrerpolicy', 'no-referrer')
    return img
  }
}

const hideDeco = Decoration.replace({})
const punctDeco = Decoration.mark({ class: 'wn-punct' })
const activeLineDeco = Decoration.line({ class: 'wn-line-active' })

/** Pure span → decoration mapping; exported for tests. */
export function buildDecorations(
  state: EditorState,
  plugins: ContentPlugin[],
): { decorations: DecorationSet; spans: GrammarSpan[]; active: Set<number> } {
  const { spans, blocks } = grammarSpans(state.doc.toString(), plugins)
  const active = activeLineSet(state, blocks)
  const ranges: Range<Decoration>[] = []

  for (const l of active) {
    ranges.push(activeLineDeco.range(state.doc.line(l + 1).from))
  }

  for (const sp of spans) {
    const isActive = active.has(sp.line)
    switch (sp.kind) {
      case 'line': {
        const cls = [sp.cls, isActive ? '' : sp.inactiveCls].filter(Boolean).join(' ')
        if (cls) ranges.push(Decoration.line({ class: cls }).range(sp.from))
        break
      }
      case 'mark':
        if (sp.to > sp.from) {
          ranges.push(
            Decoration.mark({ class: sp.cls, attributes: sp.attrs }).range(sp.from, sp.to),
          )
        }
        break
      case 'hide':
        if (sp.to > sp.from) ranges.push((isActive ? punctDeco : hideDeco).range(sp.from, sp.to))
        break
      case 'replace':
        if (sp.to > sp.from) {
          ranges.push(
            (isActive
              ? punctDeco
              : Decoration.replace({ widget: new TextWidget(sp.text ?? '', sp.cls ?? '') })
            ).range(sp.from, sp.to),
          )
        }
        break
      case 'image':
        if (!isActive) {
          ranges.push(
            Decoration.widget({
              widget: new ImageWidget(sp.src ?? '', sp.alt ?? ''),
              side: 1,
            }).range(sp.from),
          )
        }
        break
    }
  }

  return { decorations: Decoration.set(ranges, true), spans, active }
}

export interface LivePreview {
  extension: Extension
  /** True when the line is currently expanded (selection-touched). */
  isLineActive(view: EditorView, lineIndex: number): boolean
}

/**
 * The live-preview extension. Rebuilds on doc/selection change; whole-document
 * (the grammar's block pass is not incremental — a known issue, see findings).
 */
export function livePreview(plugins: ContentPlugin[]): LivePreview {
  const vp = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      active: Set<number>
      constructor(view: EditorView) {
        const built = buildDecorations(view.state, plugins)
        this.decorations = built.decorations
        this.active = built.active
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.selectionSet) {
          const built = buildDecorations(u.state, plugins)
          this.decorations = built.decorations
          this.active = built.active
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
  return { extension: vp, isLineActive: (view, i) => view.plugin(vp)?.active.has(i) ?? false }
}

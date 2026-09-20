// @vitest-environment happy-dom

// ─── Cross-surface parity ─────────────────────────────────────────────────────
// "Single renderer" means the interactive editor DOM and the static reader
// HTML must be the same tree for the same document. This test renders the
// fixture through BOTH plugin paths (render() DOM vs renderToHTML() string)
// and structurally compares the results.
//
// One documented divergence: internal links. The editor surface emits
// <span class="wn-wiki-link" data-page> (clicks intercepted via onNavigate);
// the reader emits <a class="wn-wiki-link" href="/{slug}" data-page> so the
// zero-JS page can navigate. The comparator treats a reader anchor == editor
// span when all other attrs/children match (the "anchor exception").

import { describe, it, expect } from 'vitest'
import { renderInlineContent } from '../renderer'
import { renderLines } from '../line-renderer'
import { renderDocumentHtml } from '../static-renderer'
import { defaultPlugins } from '../plugins/defaults'
import type { ContentPlugin, EditorContext } from '../types'

const plugins: ContentPlugin[] = defaultPlugins

const FIXTURE = [
  '# Heading one',
  '',
  'Some **bold**, *italic*, ~~struck~~, and `code`.',
  '> a quoted **line**',
  '- plain item',
  '  - indented item with [[Some/Page]]',
  '1. ordered item',
  'iv. lower roman item',
  '---',
  'link [Example](https://example.com) and [us](mailto:a@b.c)',
  'image ![Diagram](https://x.test/a.png) inline',
  'unsafe ![a](data:text/html,x) stays literal',
  'wiki [[projects/acme|Client Portal]] and [[plain-page]]',
  'unsafe [nope](javascript:alert(1)) stays literal',
  '```js',
  'const **not-bold** = 1',
  '',
  '```',
  '| h1 | h2 |',
  '|:---|---:|',
  '| a | **b** |',
  '  leading spaces preserved',
].join('\n')

interface NodeSpec {
  tag: string
  attrs: [string, string][]
  children: (NodeSpec | string)[]
}

function snapshot(node: Node, root: boolean): NodeSpec {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    // a trailing newline between line divs is serialization noise only at
    // document level; inside content it is significant — keep it verbatim
    if (root) throw new Error('unexpected text node at document root')
    return { tag: '#text', attrs: [], children: [text] }
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    if (root) throw new Error('unexpected non-element at document root')
    return { tag: `#comment:${node.textContent ?? ''}`, attrs: [], children: [] }
  }
  const el = node as Element
  const attrs = Array.from(el.attributes)
    .map((a) => [a.name, a.value] as [string, string])
    .sort((x, y) => x[0].localeCompare(y[0]))
  const children: (NodeSpec | string)[] = []
  const pushChild = (c: NodeSpec | string): void => {
    // coalesce adjacent text: the HTML parser merges what the DOM builds as
    // separate text nodes (e.g. literal-source fallbacks)
    const last = children[children.length - 1]
    if (typeof c === 'string' && typeof last === 'string') {
      children[children.length - 1] = last + c
    } else {
      children.push(c)
    }
  }
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent ?? ''
      if (t !== '') pushChild(t)
    } else {
      pushChild(snapshot(child, false))
    }
  }
  return { tag: el.tagName.toUpperCase(), attrs, children }
}

function editorRoot(): HTMLElement {
  const ctx: EditorContext = {
    navigate: () => undefined,
    getTrail: () => [],
    getCurrentPage: () => 'page',
    getWorld: () => ({ page: FIXTURE }),
    getPageText: () => FIXTURE,
    setPageText: () => undefined,
  }
  ctx.renderInline = (t: string) => renderInlineContent(t, plugins, ctx)

  // Drive the REAL editor pipeline (no hand-rolled line loop): whatever
  // structure renderLines produces — flat divs today, block wrappers once
  // the block pass lands — is what parity compares.
  const root = document.createElement('div')
  renderLines(FIXTURE, plugins, ctx, root)
  return root
}

function readerRoot(): Document {
  // Drive the REAL reader pipeline (renderDocumentHtml → buildDocument →
  // model-aware static rendering), so block wrappers appear on both sides.
  const html = renderDocumentHtml(FIXTURE, plugins)
  return new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
}

/** True when reader node is the anchor-ized form of the editor's span. */
function isAnchorException(e: NodeSpec, r: NodeSpec): boolean {
  if (e.tag !== 'SPAN' || r.tag !== 'A') return false
  if (!r.attrs.some(([k, v]) => k === 'class' && v.includes('wn-wiki-link'))) return false
  const rWithoutHref = r.attrs.filter(([k]) => k !== 'href')
  return (
    JSON.stringify(rWithoutHref) === JSON.stringify(e.attrs) &&
    JSON.stringify(r.children) === JSON.stringify(e.children)
  )
}

function diff(e: NodeSpec, r: NodeSpec, path: string, out: string[]): void {
  if (isAnchorException(e, r)) {
    // compare inner children anyway (text etc.)
    return
  }
  if (e.tag !== r.tag) out.push(`${path}: tag ${e.tag} vs ${r.tag}`)
  const ea = JSON.stringify(e.attrs)
  const ra = JSON.stringify(r.attrs)
  if (ea !== ra) out.push(`${path}: attrs ${ea} vs ${ra}`)
  const max = Math.max(e.children.length, r.children.length)
  for (let i = 0; i < max; i++) {
    const ec = e.children[i]
    const rc = r.children[i]
    if (typeof ec === 'string' && typeof rc === 'string') {
      if (ec !== rc) out.push(`${path}>${i}: text ${JSON.stringify(ec)} vs ${JSON.stringify(rc)}`)
    } else if (ec && rc && typeof ec !== 'string' && typeof rc !== 'string') {
      diff(ec, rc, `${path}>${ec.tag}[${i}]`, out)
    } else {
      out.push(`${path}>${i}: shape mismatch ${JSON.stringify(ec)} vs ${JSON.stringify(rc)}`)
    }
  }
}

describe('editor DOM and reader static HTML are the same tree', () => {
  it('parity across all default plugins (one documented anchor exception)', () => {
    const eRoot = editorRoot()
    const rBody = readerRoot().querySelector('div')
    expect(rBody).not.toBeNull()

    const eSnap = snapshot(eRoot, true).children as NodeSpec[]
    const rSnap = snapshot(rBody as unknown as Node, true).children as NodeSpec[]
    expect(rSnap.length).toBe(eSnap.length)

    const out: string[] = []
    eSnap.forEach((e, i) => diff(e, rSnap[i], `line${i}`, out))
    expect(out, out.join('\n')).toEqual([])
  })
})

// @vitest-environment happy-dom

// ─── Block rendering machinery (step 3) ──────────────────────────────────────
// Generic wrapper grouping in BOTH renderers, cursor-in-block expansion (D3),
// and the keydown block bail (B5) — driven by SYNTHETIC in-test BlockDefs.
// The real fence/table plugins land in steps 4-5 with their own suites.

import { describe, it, expect } from 'vitest'
import { buildDocument } from '../document'
import { renderDocModelToHTML } from '../static-renderer'
import { renderLines } from '../line-renderer'
import { createEditorRender } from '../editor-render'
import { createEditorState } from '../editor-state'
import { defaultPlugins } from '../plugins/defaults'
import { listItemPlugin } from '../plugins/listItem'
import type { BlockDef, ContentPlugin, EditorContext } from '../types'
import type { EditorDOM } from '../editor-dom'

// Synthetic block: starts on a plain '>>' line, ends on '<<' (or EOF).
const verbatimDef: BlockDef = {
  type: 'test-verbatim',
  match: (lines, start, helpers) => {
    if (!helpers.isPlainLine(lines[start]) || !lines[start].startsWith('>>')) return null
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].startsWith('<<')) return { endLine: i }
    }
    return { endLine: lines.length - 1 }
  },
  lineMode: () => 'verbatim',
  wrapperClass: 'wn-test-verbatim',
  lineClass: () => 'wn-test-inner',
}

function syntheticPlugin(): ContentPlugin {
  return {
    name: 'test-verbatim-block',
    version: '1.0.0',
    kind: 'content',
    tokens: [],
    blocks: [verbatimDef],
    render: () => document.createElement('span'),
  }
}

const plugins = [...defaultPlugins, syntheticPlugin()]
const DOC = 'top\n>> one\ntwo **bold**\n<<\nend'

function editorCtx(): EditorContext {
  const ctx: EditorContext = {
    navigate: () => undefined,
    getTrail: () => [],
    getCurrentPage: () => 'page',
    getWorld: () => ({ page: DOC }),
    getPageText: () => DOC,
    setPageText: () => undefined,
  }
  return ctx
}

describe('static block grouping', () => {
  it('wraps region lines; joins with NO whitespace text nodes', () => {
    const html = renderDocModelToHTML(buildDocument(DOC, plugins), plugins)
    expect(html).toContain('<div class="wn-test-verbatim" data-block="test-verbatim">')
    expect(html).toContain('<div data-line="1" data-block="test-verbatim" class="wn-test-inner">')
    expect(html).toContain('data-block="test-verbatim" class="wn-test-inner">two **bold**</div>')
    expect(html).not.toMatch(/<\/div>\s+<div/) // zero whitespace between divs
    // verbatim suppression: ** did NOT become bold inside the region
    expect(html).not.toContain('wn-bold')
  })

  it('non-region lines are never wrapped', () => {
    const html = renderDocModelToHTML(buildDocument(DOC, plugins), plugins)
    expect(html).toContain('<div data-line="0">top</div>')
    expect(html).toContain('<div data-line="4">end</div>')
  })
})

describe('DOM block grouping — byte-exact mirror of the static output', () => {
  it('renderLines produces the same serialized tree as the reader', () => {
    const root = document.createElement('div')
    renderLines(DOC, plugins, editorCtx(), root)
    expect(root.innerHTML).toBe(renderDocModelToHTML(buildDocument(DOC, plugins), plugins))
  })

  it('every line inside a region carries data-block and wrapper structure', () => {
    const root = document.createElement('div')
    renderLines(DOC, plugins, editorCtx(), root)
    const wrapper = root.querySelector('.wn-test-verbatim')!
    expect(wrapper.getAttribute('data-block')).toBe('test-verbatim')
    const lines = wrapper.querySelectorAll('[data-line]')
    expect(lines).toHaveLength(3) // region = lines 1..3 only
    expect(root.children).toHaveLength(3) // flat: top, wrapper, end
  })
})

describe('cursor-in-block expansion (D3)', () => {
  function testDOM(): EditorDOM {
    const container = document.createElement('div')
    const editorDiv = document.createElement('div')
    editorDiv.className = 'wn-editor'
    editorDiv.contentEditable = 'true'
    container.appendChild(editorDiv)
    return {
      container,
      editorDiv,
      breadcrumb: document.createElement('div'),
      placeholder: document.createElement('div'),
      toolbar: document.createElement('div'),
      editorWrap: document.createElement('div'),
      overlay: document.createElement('div'),
      header: document.createElement('div'),
      body: document.createElement('div'),
      footer: document.createElement('div'),
      leftSidepanel: document.createElement('div'),
      rightSidepanel: document.createElement('div'),
      actions: document.createElement('div'),
    } as EditorDOM
  }

  function renderWithCursorOnLine(offset: number) {
    const dom = testDOM()
    document.body.appendChild(dom.container)
    const state = createEditorState({ initialPage: 'page' })
    state.getPageBuffers().setPageText('page', DOC)
    const render = createEditorRender(dom, plugins, state, {})
    render.render(true, offset)
    return dom
  }

  // raw offsets: 'top\n'=4, '>> one\n'=11, 'two **bold**\n'=25
  it('cursor inside the region renders EVERY region line as plain text', () => {
    const dom = renderWithCursorOnLine(15) // line 2 ('two **bold**')
    const lines = dom.editorDiv.querySelectorAll('[data-line]')
    const l1 = dom.editorDiv.querySelector('[data-line="1"]')!
    const l2 = dom.editorDiv.querySelector('[data-line="2"]')!
    const l3 = dom.editorDiv.querySelector('[data-line="3"]')!
    expect(l2.textContent).toBe('two **bold**') // raw, expanded
    expect(l1.textContent).toBe('>> one') // sibling expanded too
    expect(l3.textContent).toBe('<<')
    // and the region keeps its wrapper while expanded
    expect(l2.parentElement!.className).toBe('wn-test-verbatim')
    // the wrapper is marked expanded (CSS hook for zero-height region parts,
    // e.g. the table separator — user feedback)
    expect((l2.parentElement as HTMLElement).dataset.expanded).toBe('true')
    expect(lines.length).toBe(5)
    dom.container.remove()
  })

  it('cursor outside renders the block collapsed (styled) and the line raw only for the cursor line', () => {
    const dom = renderWithCursorOnLine(0) // line 0
    const l2 = dom.editorDiv.querySelector('[data-line="2"]')!
    // collapsed: line content came from the block's verbatim token — for
    // THIS synthetic def identical text, but the cursor line is line 0:
    expect(dom.editorDiv.querySelector('[data-line="0"]')!.textContent).toBe('top')
    expect(l2.closest('.wn-test-verbatim')).not.toBeNull()
    // NOT marked expanded while the cursor is outside the region
    expect((l2.closest('.wn-test-verbatim') as HTMLElement).dataset.expanded).toBeUndefined()
    dom.container.remove()
  })
})

describe('keydown block bail (B5)', () => {
  function setup(
    html: string,
    raw: string,
    line: string,
    caret = 2,
  ): { ctx: EditorContext; cleanup: () => void } {
    const editorDiv = document.createElement('div')
    editorDiv.contentEditable = 'true'
    editorDiv.innerHTML = html
    document.body.appendChild(editorDiv)
    const lineEl = editorDiv.querySelector(`[data-line="${line}"]`) as HTMLElement
    const range = document.createRange()
    range.setStart(lineEl.firstChild as Text, caret)
    range.collapse(true)
    const sel = window.getSelection()
    sel!.removeAllRanges()
    sel!.addRange(range)

    const buffers = new Map<string, string>([['home', raw]])
    const ctx: EditorContext = {
      navigate: () => undefined,
      getTrail: () => [],
      getCurrentPage: () => 'home',
      getWorld: () => Object.fromEntries(buffers),
      getPageText: (p) => buffers.get(p) ?? '',
      setPageText: (p, c) => void buffers.set(p, c),
    }
    return { ctx, cleanup: () => editorDiv.remove() }
  }

  it('Enter on a list-looking line INSIDE a block region is ignored', () => {
    // '- milk' as an expanded fence line (data-block) must not be spliced
    const { ctx, cleanup } = setup(
      '<div data-line="0">x</div><div class="w"><div data-line="1" data-block="test-verbatim">- milk</div></div>',
      'x\n- milk',
      '1',
    )
    const result = listItemPlugin.onKeydown!(new KeyboardEvent('keydown', { key: 'Enter' }), ctx)
    expect(result).toBeFalsy()
    expect(ctx.getPageText('home')).toBe('x\n- milk') // untouched
    cleanup()
  })

  it('Enter on a normal list line still works (no regression)', () => {
    const { ctx, cleanup } = setup('<div data-line="0">- milk</div>', '- milk', '0')
    const result = listItemPlugin.onKeydown!(new KeyboardEvent('keydown', { key: 'Enter' }), ctx)
    expect(result).not.toBeFalsy()
    expect(ctx.getPageText('home')).toContain('- ')
    cleanup()
  })
})

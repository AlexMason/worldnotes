// @vitest-environment happy-dom

// ─── Shared raw-text model ───────────────────────────────────────────────────
// content-text.ts is the SINGLE mapping between rendered editor DOM and raw
// markdown source, consumed by both input serialization (editor-lifecycle)
// and caret math (caret-offset). These tests pin its rules — including the
// nesting rules that block wrappers (code fences, tables) will rely on:
//   • a wrapper's raw length is Σ inner lines + (n − 1) newline separators;
//   • extractContentText and rawNodeLength must AGREE on every tree;
//   • setLineOffset → tryGetLineOffset round-trips EVERY offset through a
//     wrapper-nested tree (the drift that a flat-only model would corrupt).

import { describe, it, expect } from 'vitest'
import { extractContentText, rawNodeLength } from '../content-text'
import { getLineOffset, setLineOffset, tryGetLineOffset } from '../caret-offset'
import { renderLines } from '../line-renderer'
import { defaultPlugins } from '../plugins/defaults'
import { renderInlineContent } from '../renderer'
import type { EditorContext } from '../types'

function line(text: string, index: number): HTMLElement {
  const el = document.createElement('div')
  el.dataset.line = String(index)
  if (text === '') {
    el.appendChild(document.createElement('br'))
  } else {
    el.textContent = text
  }
  return el
}

function wrapper(children: HTMLElement[]): HTMLElement {
  const w = document.createElement('div')
  w.className = 'wn-block'
  children.forEach((c) => w.appendChild(c))
  return w
}

function setCaretAt(node: Node, offset: number): void {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()
  sel!.removeAllRanges()
  sel!.addRange(range)
}

describe('extractContentText', () => {
  it('joins flat data-line divs with newlines', () => {
    const root = document.createElement('div')
    root.appendChild(line('abc', 0))
    root.appendChild(line('', 1))
    root.appendChild(line('de', 2))
    expect(extractContentText(root)).toBe('abc\n\nde')
  })

  it('counts newlines across nested block wrappers', () => {
    const root = document.createElement('div')
    root.appendChild(line('a', 0))
    root.appendChild(wrapper([line('b', 1), line('c', 2)]))
    root.appendChild(line('d', 3))
    expect(extractContentText(root)).toBe('a\nb\nc\nd')
  })

  it('prefers data-raw over the subtree (token spans)', () => {
    const root = document.createElement('div')
    const l = line('', 0)
    const tok = document.createElement('span')
    tok.dataset.raw = '[[Page]]'
    tok.textContent = 'display'
    l.appendChild(tok)
    root.appendChild(l)
    expect(extractContentText(root)).toBe('[[Page]]')
  })
})

describe('rawNodeLength', () => {
  it('matches extractContentText length on flat trees', () => {
    const root = document.createElement('div')
    root.appendChild(line('hello', 0))
    root.appendChild(line('world!!'.slice(0, 5), 1))
    expect(rawNodeLength(root)).toBe(extractContentText(root).length)
  })

  it('matches extractContentText length on wrapper-nested trees', () => {
    const root = document.createElement('div')
    root.appendChild(line('abc', 0))
    root.appendChild(wrapper([line('de', 1), line('', 2), line('f', 3)]))
    root.appendChild(line('gh', 4))
    expect(rawNodeLength(root)).toBe(extractContentText(root).length)
    expect(rawNodeLength(root)).toBe('abc\nde\n\nf\ngh'.length)
  })

  it('counts a two-line wrapper as Σ inner + 1', () => {
    const w = wrapper([line('fg', 1), line('h', 2)])
    expect(rawNodeLength(w)).toBe('fg\nh'.length)
  })

  it('resets separator accounting per call (no cross-call leakage)', () => {
    const w = wrapper([line('fg', 1), line('h', 2)])
    expect(rawNodeLength(w)).toBe(4) // 'fg\nh'
    expect(rawNodeLength(w)).toBe(4) // again — fresh walk state
  })

  it('respects data-raw inside lines', () => {
    const l = line('', 0)
    const tok = document.createElement('span')
    tok.dataset.raw = '[[Page]]'
    tok.textContent = 'display'
    l.appendChild(tok)
    expect(rawNodeLength(l)).toBe(8)
  })
})

describe('caret math through nested block wrappers', () => {
  // root: [ "abc" ] [ wrapper: "de", "", "f" ] [ "gh" ]  → raw "abc\nde\n\nf\ngh"
  function buildNestedEditor(): { root: HTMLElement; w: HTMLElement; text: string } {
    const root = document.createElement('div')
    const w = wrapper([line('de', 1), line('', 2), line('f', 3)])
    root.appendChild(line('abc', 0))
    root.appendChild(w)
    root.appendChild(line('gh', 4))
    return { root, w, text: 'abc\nde\n\nf\ngh' }
  }

  it('round-trips EVERY offset through a wrapper-nested tree', () => {
    const { root, text } = buildNestedEditor()
    for (let offset = 0; offset <= text.length; offset++) {
      setLineOffset(root, offset)
      const back = tryGetLineOffset(root)
      expect(back, `offset ${offset} of "${text}"`).toBe(offset)
    }
  })

  it('maps a caret anchored on the wrapper to the wrapper start', () => {
    const { root, w } = buildNestedEditor()
    // caret between wrapper children: maps to the wrapper's first line start
    // (deterministic; lands the caret inside the block = expand trigger)
    setCaretAt(w, 1)
    expect(tryGetLineOffset(root)).toBe(4) // "abc\n" consumed → line 1 start
    // caret past the end of the whole root maps to the Σ(line+1) boundary
    // (existing semantics: every child counted, wrapper contributes 5+1)
    setCaretAt(root, 3)
    expect(tryGetLineOffset(root)).toBe(4 + 6 + 3)
  })

  it('getLineOffset reaches lines inside the wrapper from a text position', () => {
    const { root, w } = buildNestedEditor()
    const inner = w.children[2] as HTMLElement // line "f" (index 3)
    setCaretAt(inner.firstChild!, 1)
    expect(getLineOffset(root)).toBe('abc\nde\n\n'.length + 1)
  })
})

// ─── Corpus property: render → extract must be the identity ────────────────
// The load-bearing invariant for the block pass: whatever the editor DOM
// looks like (wrappers, verbatim lines, table cells, hidden punct),
// extractContentText must return the EXACT source text, and rawNodeLength
// must agree with its length. Fences, tables, images, lists — all included.

describe('extractContentText round-trips the rendered corpus', () => {
  const CORPUS: string[] = [
    '# Heading\n\ntext with **bold**, *it*, `code`, ~~struck~~',
    '- bullet\n  - nested\n1. ordered\niv. roman\n* plus? + star',
    '> quote [[Page]]\n\n---\n\nplain',
    'link [Example](https://x.test) mail [m](mailto:a@b.c)',
    'inline ![alt](/assets/i.png) image and ![bad](data:text/html,x) literal',
    '```js\nconst **x** = `<i>` 1\n\nclose me\n```',
    '```\nunclosed to EOF with | pipe | chars',
    '| a | b |\n|:--|--:|\n| **x** | 2 |\n| ragged |',
    'a | b\n--- | ---\n1 | ![img](/i.png)',
    '  leading-space preserved\n\ttabs too',
    'mixed: - item then ```\n| not | a | table |\n``` then | 1 | 2 |\n|---|---|',
    '', // empty document
    '\n\n', // pure blank lines
  ]

  for (const [i, text] of CORPUS.entries()) {
    it(`corpus[${i}] renders losslessly through the block pass`, () => {
      const ctx: EditorContext = {
        navigate: () => undefined,
        getTrail: () => [],
        getCurrentPage: () => 'p',
        getWorld: () => ({ p: text }),
        getPageText: () => text,
        setPageText: () => undefined,
      }
      ctx.renderInline = (t: string) => renderInlineContent(t, defaultPlugins, ctx)
      const root = document.createElement('div')
      renderLines(text, defaultPlugins, ctx, root)
      expect(extractContentText(root), JSON.stringify(text)).toBe(text)
      expect(rawNodeLength(root)).toBe(text.length)
    })
  }
})

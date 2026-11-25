// @vitest-environment happy-dom

// ─── Relative wiki links in the editor ───────────────────────────────────────
// Real editor mount: `[[beta]]` on page `alpha` must navigate to `alpha/beta`
// (and ask existence for that slug), `[[/beta]]` to `beta`, and on the
// configured home page relative links resolve from the site root. The link
// line is not the caret line (line 0), so links render as spans.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import type { EditorInstance, PageExistenceResolver } from '../types'

const DOC = 'first line\nsee [[beta]] and [[/gamma|Gamma]]'

async function mount(
  initialPage: string,
  requested: string[] = [],
  homeSlug: string | null = 'start',
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const pageExists: PageExistenceResolver = {
    exists: () => undefined,
    request: (slugs) => {
      requested.push(...slugs)
    },
    onChange: () => () => undefined,
  }
  const instance = await createEditor(container, {
    pageStore: createMemoryPageStore({
      alpha: DOC,
      start: DOC,
      home: DOC,
      urls: 'first line\nsee [[https://x.com/y|ext]] and [[#frag|frag]]',
    }),
    saveDebounceMs: 5000,
    initialPage,
    homeSlug,
    pageExists,
  }).mount()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return { instance, editorDiv }
}

function clickLink(root: HTMLElement, label: string): void {
  const el = Array.from(root.querySelectorAll<HTMLElement>('.wn-wiki-link')).find(
    (n) => n.textContent === label,
  )
  if (!el) throw new Error(`no link ${label}`)
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
}

async function landsOn(instance: EditorInstance, page: string): Promise<void> {
  await vi.waitFor(() => expect(instance.getCurrentPage()).toBe(page))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('relative wiki links in the editor', () => {
  it('[[beta]] on alpha opens alpha/beta', async () => {
    const { instance, editorDiv } = await mount('alpha')
    clickLink(editorDiv, 'beta')
    await landsOn(instance, 'alpha/beta')
    expect(instance.getTrail()).toEqual(['start', 'alpha', 'beta'])
  })

  it('[[/gamma]] on alpha opens the root page gamma', async () => {
    const { instance, editorDiv } = await mount('alpha')
    clickLink(editorDiv, 'Gamma')
    await landsOn(instance, 'gamma')
  })

  it('on the configured home page relative links resolve from the root', async () => {
    const { instance, editorDiv } = await mount('start')
    clickLink(editorDiv, 'beta')
    await landsOn(instance, 'beta')
  })

  it('without a configured home, a page slugged home is an ordinary page', async () => {
    // Matches the reader: wikiLinkBase uses the RAW setting, not the
    // editor's 'home' trail-root fallback.
    const { instance, editorDiv } = await mount('home', [], null)
    clickLink(editorDiv, 'beta')
    await landsOn(instance, 'home/beta')
  })

  it('URL-shaped targets on a nested page are refused, not opened as junk pages', async () => {
    const { instance, editorDiv } = await mount('urls')
    for (const label of ['ext', 'frag']) {
      clickLink(editorDiv, label)
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(instance.getCurrentPage()).toBe('urls')
    }
    expect(document.body.textContent).toContain('is not a valid page address')
  })

  it('asks existence for the resolved slugs', async () => {
    const requested: string[] = []
    await mount('alpha', requested)
    expect(requested).toContain('alpha/beta')
    expect(requested).toContain('gamma')
    expect(requested).not.toContain('beta')
  })
})

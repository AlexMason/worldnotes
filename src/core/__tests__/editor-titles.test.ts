// @vitest-environment happy-dom

// ─── Page titles in the editor breadcrumb + onTitleChange ────────────────────
// Real editor mount with a fake PageTitleResolver: loaded pages are named from
// their buffer (live), unloaded ancestors from the resolver, else their slug.

import { describe, it, expect, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import type { PageTitleResolver } from '../types'

function fakeTitles(initial: Record<string, string>) {
  const answers = new Map(Object.entries(initial))
  const listeners = new Set<() => void>()
  const requested: string[] = []
  const resolver: PageTitleResolver = {
    title: (slug) => answers.get(slug),
    request: (slugs) => {
      requested.push(...slugs)
    },
    onChange: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    resolver,
    requested,
    answer(slug: string, title: string) {
      answers.set(slug, title)
      for (const listener of [...listeners]) listener()
    },
  }
}

async function mount(fake: ReturnType<typeof fakeTitles>, pages: Record<string, string>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const titles: string[] = []
  const trails: string[][] = []
  const instance = await createEditor(container, {
    pageStore: createMemoryPageStore(pages),
    saveDebounceMs: 5000,
    initialPage: 'lore/gods/old',
    homeSlug: 'home',
    pageTitles: fake.resolver,
    onTitleChange: (title) => titles.push(title),
    onTrailChange: (trail) => trails.push(trail),
  }).mount()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  const crumbs = (): string[] =>
    Array.from(container.querySelectorAll('.wn-breadcrumb .wn-crumb')).map((c) => c.textContent!)
  return { instance, editorDiv, crumbs, titles, trails }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('editor page titles', () => {
  it('labels crumbs: buffer title, then resolver answer, then humanized slug', async () => {
    const fake = fakeTitles({ lore: 'Lore of Ashfall' })
    const { crumbs, titles } = await mount(fake, { 'lore/gods/old': '# Old Ones\n\nbody' })

    expect(crumbs()).toEqual(['Home', 'Lore of Ashfall', 'Gods', 'Old Ones'])
    expect(fake.requested).toContain('lore/gods')
    expect(fake.requested).not.toContain('lore')
    expect(titles).toEqual(['Old Ones'])

    // An answer arriving later relabels in place.
    fake.answer('lore/gods', 'The Gods')
    expect(crumbs()).toEqual(['Home', 'Lore of Ashfall', 'The Gods', 'Old Ones'])
    expect(titles).toEqual(['Old Ones'])
  })

  it('follows the H1 live while typing, falling back to the slug without one', async () => {
    const fake = fakeTitles({})
    const { editorDiv, crumbs, titles, trails } = await mount(fake, {
      'lore/gods/old': '# Old Ones\n\nbody',
    })
    const trailPaints = trails.length

    editorDiv.textContent = '# Older Ones\n\nbody'
    editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
    expect(crumbs().at(-1)).toBe('Older Ones')
    expect(titles.at(-1)).toBe('Older Ones')

    editorDiv.textContent = 'no heading\n\nbody'
    editorDiv.dispatchEvent(new Event('input', { bubbles: true }))
    expect(crumbs().at(-1)).toBe('Old')
    expect(titles).toEqual(['Old Ones', 'Older Ones', 'Old'])
    // Title repaints are not trail changes.
    expect(trails.length).toBe(trailPaints)
  })
})

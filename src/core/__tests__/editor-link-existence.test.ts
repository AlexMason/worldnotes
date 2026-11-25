// @vitest-environment happy-dom

// ─── Missing-page link styling in the editor DOM ─────────────────────────────
// Real editor mount with a fake PageExistenceResolver. The link line is not the
// caret line (line 0), so links render as spans.

import { describe, it, expect, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { extractContentText } from '../content-text'
import type { PageExistenceResolver } from '../types'

const DOC = 'first line\nsee [[here]] and [[gone]] and [[later]] and [x](gone-too)'

interface FakeResolver {
  resolver: PageExistenceResolver
  requested: string[]
  listeners: Set<() => void>
  answer(slug: string, exists: boolean): void
}

function fakeResolver(initial: Record<string, boolean>): FakeResolver {
  const answers = new Map(Object.entries(initial))
  const listeners = new Set<() => void>()
  const requested: string[] = []
  return {
    requested,
    listeners,
    resolver: {
      exists: (slug) => answers.get(slug),
      request: (slugs) => {
        requested.push(...slugs)
      },
      onChange: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    answer(slug, exists) {
      answers.set(slug, exists)
      for (const listener of [...listeners]) listener()
    },
  }
}

async function mount(fake: FakeResolver) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = await createEditor(container, {
    pageStore: createMemoryPageStore({ home: DOC }),
    saveDebounceMs: 5000,
    initialPage: 'home',
    pageExists: fake.resolver,
  }).mount()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return { instance, editorDiv }
}

const link = (root: HTMLElement, label: string): HTMLElement => {
  const el = Array.from(root.querySelectorAll<HTMLElement>('.wn-wiki-link')).find(
    (n) => n.textContent === label,
  )
  if (!el) throw new Error(`no link ${label}`)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('editor link state', () => {
  it('marks only links the resolver reports missing, and asks about unknown ones', async () => {
    const fake = fakeResolver({ here: true, gone: false, 'gone-too': false })
    const { editorDiv } = await mount(fake)

    expect(link(editorDiv, 'here').classList.contains('wn-link-missing')).toBe(false)
    expect(link(editorDiv, 'gone').classList.contains('wn-link-missing')).toBe(true)
    expect(link(editorDiv, 'x').classList.contains('wn-link-missing')).toBe(true)
    // unknown → plain look, but requested
    expect(link(editorDiv, 'later').classList.contains('wn-link-missing')).toBe(false)
    expect(fake.requested).toContain('later')
  })

  it('re-classes links in place when an answer arrives (no re-render, text untouched)', async () => {
    const fake = fakeResolver({ here: true, gone: false })
    const { editorDiv } = await mount(fake)
    const later = link(editorDiv, 'later')
    const textBefore = extractContentText(editorDiv)

    fake.answer('later', false)
    expect(link(editorDiv, 'later')).toBe(later) // same node
    expect(later.classList.contains('wn-link-missing')).toBe(true)

    fake.answer('gone', true) // a missing page got created
    expect(link(editorDiv, 'gone').classList.contains('wn-link-missing')).toBe(false)
    expect(extractContentText(editorDiv)).toBe(textBefore)
  })

  it('unsubscribes from the resolver on destroy', async () => {
    const fake = fakeResolver({})
    const { instance } = await mount(fake)
    expect(fake.listeners.size).toBe(1)
    instance.destroy()
    expect(fake.listeners.size).toBe(0)
  })
})

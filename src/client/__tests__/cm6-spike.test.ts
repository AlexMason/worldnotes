// @vitest-environment happy-dom

// Regression: the ?cm6=1 surface must carry the SAME chrome and navigation as
// the production editor (header nav, breadcrumb trail, site bands, toasts) —
// it originally mounted a bare EditorView with none of it.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mountCm6Spike } from '../cm6-spike'
import type { Cm6Editor } from '../../core/cm6/editor'
import type { EditorShellConfig } from '../../shared/dto'

const CFG: EditorShellConfig = {
  slug: 'home',
  autosaveMs: 600_000, // the debounce never fires in-test; navigation flushes explicitly
  searchEnabled: true,
  allPagesEnabled: true,
  homeSlug: null,
  siteName: 'WN',
  headerHtml: '<b id="band-h">hdr</b>',
  footerHtml: '',
  userName: 'dev',
  authDisabled: true,
  userRole: 'admin',
  navLinks: [
    { label: 'About', href: '/about', slug: 'about' },
    { label: 'Bad', href: '/bad', slug: 'https://evil.test/x' },
  ],
}

let pages: Record<string, { content: string; version: number }>
let editor: Cm6Editor | null = null
let container: HTMLElement
let puts: { url: string; body: string; ifMatch: string | null }[]

beforeEach(() => {
  pages = {
    home: { content: 'welcome [[Some Page]]', version: 1 },
    'some-page': { content: '# Some Page\nbody', version: 4 },
  }
  puts = []
  container = document.createElement('div')
  document.body.appendChild(container)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const slug = decodeURIComponent(String(url).replace('/api/pages/', ''))
      if (init?.method === 'PUT') {
        const headers = init.headers as Record<string, string>
        puts.push({
          url: String(url),
          body: String(init.body),
          ifMatch: headers['if-match'] ?? null,
        })
        const body: { content: string } = JSON.parse(String(init.body))
        const next = { content: body.content, version: (pages[slug]?.version ?? 0) + 1 }
        pages[slug] = next
        return new Response(JSON.stringify({ slug, title: slug, ...next }), { status: 200 })
      }
      const p = pages[slug]
      return p
        ? new Response(JSON.stringify({ slug, title: slug, ...p }), { status: 200 })
        : new Response('', { status: 404 })
    }),
  )
})

afterEach(() => {
  editor?.destroy()
  container.remove()
  document.head.querySelectorAll('style').forEach((s) => s.remove())
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
})

function mount(): Cm6Editor {
  window.history.replaceState(null, '', '/home?cm6=1')
  editor = mountCm6Spike(container, CFG, { slug: 'home', ...pages.home!, exists: true })
  return editor
}

const crumbs = (): string[] =>
  Array.from(container.querySelectorAll('.wn-breadcrumb .wn-crumb')).map((c) => c.textContent ?? '')
const navLink = (label: string): HTMLElement =>
  Array.from(container.querySelectorAll<HTMLElement>('.wn-nav-link')).find(
    (a) => a.textContent === label,
  )!

describe('cm6 surface chrome', () => {
  it('renders the shared header: breadcrumb root, nav links, Search/All/Admin, dev name, site band', () => {
    mount()
    expect(crumbs()).toEqual(['WN'])
    const actions = container.querySelector('.wn-actions')!
    expect(Array.from(actions.children).map((c) => c.textContent)).toEqual([
      'About',
      'Bad',
      'Search',
      'All pages',
      'Admin settings',
      'dev',
    ])
    expect(container.querySelector('#band-h')).not.toBeNull()
  })

  it('a header nav link navigates in-surface, extends the trail and keeps ?cm6=1', async () => {
    const e = mount()
    navLink('About').click()
    // "about" does not exist → opens as a seeded new page, like production
    await vi.waitFor(() => expect(e.getText()).toBe('# About\n\n'))
    expect(crumbs()).toEqual(['WN', 'About'])
    expect(window.location.pathname + window.location.search).toBe('/about?cm6=1')
  })

  it('wiki-link click navigates; breadcrumb click returns to the earlier page', async () => {
    const e = mount()
    // caret sits on the link's own line → Ctrl-click navigates
    container
      .querySelector('.wn-wiki-link')!
      .dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, ctrlKey: true }),
      )
    await vi.waitFor(() => expect(e.getText()).toBe(pages['some-page']!.content))
    expect(crumbs()).toEqual(['WN', 'Some Page'])
    ;(container.querySelectorAll('.wn-breadcrumb .wn-crumb')[0] as HTMLElement).click()
    await vi.waitFor(() => expect(e.getText()).toBe('welcome [[Some Page]]'))
    expect(crumbs()).toEqual(['WN'])
    expect(window.location.pathname).toBe('/home')
  })

  it('flushes pending edits (with If-Match) before navigating away', async () => {
    const e = mount()
    e.view.dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input' })
    navLink('About').click()
    await vi.waitFor(() => expect(crumbs()).toEqual(['WN', 'About']))
    expect(puts).toHaveLength(1)
    expect(puts[0]).toMatchObject({ url: '/api/pages/home', ifMatch: '"1"' })
    expect(JSON.parse(puts[0]!.body).content).toBe('Xwelcome [[Some Page]]')
  })

  it('refuses a non-page target with a toast and leaves page and trail alone', async () => {
    const e = mount()
    navLink('Bad').click()
    await vi.waitFor(() =>
      expect(container.querySelector('.wn-toast')?.textContent).toContain(
        'is not a valid page address',
      ),
    )
    expect(e.getText()).toBe('welcome [[Some Page]]')
    expect(crumbs()).toEqual(['WN'])
  })
})

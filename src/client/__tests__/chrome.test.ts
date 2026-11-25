// @vitest-environment happy-dom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountHeaderActions, bindPopstate, createStoreEvents } from '../chrome'
import type { EditorShellConfig } from '../../shared/dto'
import type { ToastOptions } from '../../core/types'

const BASE: EditorShellConfig = {
  slug: 'home',
  autosaveMs: 1500,
  searchEnabled: false,
  allPagesEnabled: false,
  homeSlug: null,
  siteName: 'WN',
  headerHtml: '',
  footerHtml: '',
  userName: 'ada',
  authDisabled: false,
  userRole: 'editor',
}

function actionsFor(cfg: Partial<EditorShellConfig>, navigate = vi.fn()): HTMLElement {
  const container = document.createElement('div')
  const actions = document.createElement('div')
  actions.className = 'wn-actions'
  container.appendChild(actions)
  mountHeaderActions(container, { ...BASE, ...cfg }, navigate)
  return actions
}

describe('mountHeaderActions', () => {
  it('gates Admin on the admin role and shows sign-out when auth is on', () => {
    expect(
      Array.from(actionsFor({ userRole: 'editor' }).children).map((c) => c.textContent),
    ).toEqual(['Sign out (ada)'])
    expect(
      Array.from(actionsFor({ userRole: 'admin' }).children).map((c) => c.textContent),
    ).toEqual(['Admin settings', 'Sign out (ada)'])
  })

  it('internal nav links navigate via the callback instead of following href', () => {
    const navigate = vi.fn()
    const actions = actionsFor(
      { navLinks: [{ label: 'About', href: '/about', slug: 'about' }] },
      navigate,
    )
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    actions.querySelector('a')!.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    expect(navigate).toHaveBeenCalledExactlyOnceWith('about')
  })

  it('offers "Move page…" only with a move handler, which it calls without navigating', () => {
    expect(Array.from(actionsFor({}).children).map((c) => c.textContent)).not.toContain(
      'Move page…',
    )
    const container = document.createElement('div')
    const actions = document.createElement('div')
    actions.className = 'wn-actions'
    container.appendChild(actions)
    const onMovePage = vi.fn()
    mountHeaderActions(container, { ...BASE, userRole: 'admin' }, vi.fn(), onMovePage)
    expect(Array.from(actions.children).map((c) => c.textContent)).toEqual([
      'Move page…',
      'Admin settings',
      'Sign out (ada)',
    ])
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    actions.querySelector('.wn-action-move')!.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    expect(onMovePage).toHaveBeenCalledTimes(1)
  })
})

describe('bindPopstate', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('navigates only when the URL slug differs from the current page, recording it first', () => {
    let current = 'home'
    const navigate = vi.fn()
    bindPopstate(
      () => current,
      (s) => {
        current = s
      },
      navigate,
    )
    window.history.replaceState(null, '', '/home')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(navigate).not.toHaveBeenCalled()

    window.history.replaceState(null, '', '/blog/post')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('blog/post')
    expect(current).toBe('blog/post')
  })
})

describe('createStoreEvents', () => {
  it('a conflict offers "Load theirs", which loads server content and confirms', () => {
    const notify = vi.fn((_options: ToastOptions) => 'id')
    const loadServerContent = vi.fn()
    const events = createStoreEvents(() => ({ notify, dismiss: vi.fn() }), {
      onSaved: vi.fn(),
      loadServerContent,
    })
    events.onConflict('home', { slug: 'home', title: 'Home', content: 'theirs', version: 9 })
    notify.mock.calls[0]![0].action!.onClick()
    expect(loadServerContent).toHaveBeenCalledExactlyOnceWith('theirs')
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'wn-conflict-done' }))
  })

  it('drops events that fire before a host exists', () => {
    const onSaved = vi.fn()
    const events = createStoreEvents(() => null, { onSaved, loadServerContent: vi.fn() })
    expect(() => events.onConflict('home', null)).not.toThrow()
    events.onSaved?.('home', 'x')
    expect(onSaved).toHaveBeenCalledWith('home')
  })

  it('a blank-save delete toasts, then tells the surface which page went away', () => {
    const notify = vi.fn((_options: ToastOptions) => 'id')
    const dismiss = vi.fn()
    const onDeleted = vi.fn()
    const events = createStoreEvents(() => ({ notify, dismiss }), {
      onSaved: vi.fn(),
      loadServerContent: vi.fn(),
      onDeleted,
    })
    events.onDeleted?.('blog/post')
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Page deleted' }))
    expect(onDeleted).toHaveBeenCalledExactlyOnceWith('blog/post')
  })
})

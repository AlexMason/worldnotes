// @vitest-environment happy-dom

// ─── Editor page moves (core flow) ───────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createPageMover } from '../editor-page-move'
import { createEditorState } from '../editor-state'
import { createPageBuffers } from '../page-buffers'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import type { EditorOptions, PageMoveResult, PageStore } from '../types'
import type { EditorRenderAPI } from '../editor-render'
import type { NotificationSystem } from '../notifications'

function setup(opts: {
  move?: PageStore['move']
  load?: PageStore['load']
  initialPage?: string
  onPageMoved?: EditorOptions['onPageMoved']
  flushSaves?: () => Promise<void>
}) {
  const options: EditorOptions = {
    initialPage: opts.initialPage ?? 'projects/acme',
    homeSlug: 'home',
    onPageMoved: opts.onPageMoved,
  }
  const buffers = createPageBuffers()
  const state = createEditorState(options, buffers)
  const events: string[] = []
  const render: EditorRenderAPI = {
    render: vi.fn(() => events.push('render')),
    renderBreadcrumb: vi.fn(() => events.push('breadcrumb')),
    checkSelectChange: () => false,
  }
  const notify = vi.fn(() => 'id')
  const notifications = {
    notify,
    dismiss: vi.fn(),
    destroy: vi.fn(),
  } as unknown as NotificationSystem
  const pageStore: PageStore = {
    load: opts.load ?? (async () => null),
    save: async () => undefined,
    ...(opts.move ? { move: opts.move } : {}),
  }
  const mover = createPageMover({
    state,
    pageStore,
    render,
    notifications,
    options,
    flushSaves: opts.flushSaves ?? (async () => undefined),
  })
  return { mover, state, buffers, render, notify, events }
}

const okResult = (moved: [string, string][], rewritten: string[] = []): PageMoveResult => ({
  ok: true,
  moved: moved.map(([from, to]) => ({ from, to })),
  rewritten,
})

describe('createPageMover', () => {
  it('flushes pending saves BEFORE asking the store to move', async () => {
    const order: string[] = []
    const { mover } = setup({
      flushSaves: async () => {
        order.push('flush')
      },
      move: async () => {
        order.push('move')
        return okResult([['projects/acme', 'clients/acme']])
      },
    })
    await mover.movePage('clients/acme')
    expect(order).toEqual(['flush', 'move'])
  })

  it('re-keys moved buffers (history kept), moves the trail, then repaints', async () => {
    const onPageMoved = vi.fn()
    const { mover, state, buffers, events } = setup({
      onPageMoved: (...args) => {
        events.push('onPageMoved')
        onPageMoved(...args)
      },
      move: async () =>
        okResult([
          ['projects/acme', 'clients/acme'],
          ['projects/acme/notes', 'clients/acme/notes'],
        ]),
    })
    buffers.setPageText('projects/acme', 'v1')
    buffers.setPageText('projects/acme', 'v2')
    buffers.setPageText('projects/acme/notes', 'n')

    await expect(mover.movePage('clients/acme')).resolves.toBeNull()

    expect(state.getCurrentPage()).toBe('clients/acme')
    expect(state.getTrail()).toEqual(['home', 'clients', 'acme'])
    expect(buffers.hasPage('projects/acme')).toBe(false)
    expect(buffers.getPageText('clients/acme')).toBe('v2')
    expect(buffers.undo('clients/acme')).toBe('v1')
    expect(buffers.getPageText('clients/acme/notes')).toBe('n')
    expect(onPageMoved).toHaveBeenCalledWith(
      'projects/acme',
      'clients/acme',
      expect.objectContaining({ ok: true }),
    )
    // The host hears about the move before the breadcrumb (onTrailChange) repaints.
    expect(events).toEqual(['onPageMoved', 'render', 'breadcrumb'])
  })

  it('drops rewritten buffers and reloads the current page when its own text changed', async () => {
    const load = vi.fn(async () => 'server text')
    const { mover, buffers, notify } = setup({
      load,
      move: async () =>
        okResult([['projects/acme', 'clients/acme']], ['clients/acme', 'linker', 'other']),
    })
    buffers.setPageText('projects/acme', 'mine')
    buffers.setPageText('linker', 'stale [[/projects/acme]]')

    await mover.movePage('clients/acme')

    expect(load).toHaveBeenCalledWith('clients/acme')
    expect(buffers.getPageText('clients/acme')).toBe('server text')
    expect(buffers.canUndo('clients/acme')).toBe(false)
    expect(buffers.hasPage('linker')).toBe(false)
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Moved to /clients/acme · links updated in 2 pages' }),
    )
  })

  it('reports store errors and leaves the editor untouched', async () => {
    const { mover, state, buffers, render } = setup({
      move: async () => ({ ok: false, error: 'a page already exists at /x' }),
    })
    buffers.setPageText('projects/acme', 'mine')
    await expect(mover.movePage('x')).resolves.toBe('a page already exists at /x')
    expect(state.getCurrentPage()).toBe('projects/acme')
    expect(buffers.getPageText('projects/acme')).toBe('mine')
    expect(render.render).not.toHaveBeenCalled()

    const offline = setup({
      move: async () => {
        throw new Error('network')
      },
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(offline.mover.movePage('x')).resolves.toMatch(/not moved/)
  })

  it('without store support there is nothing to move', async () => {
    const { mover } = setup({})
    expect(mover.canMove()).toBe(false)
    await expect(mover.movePage('x')).resolves.toMatch(/not supported/)
  })

  it('pageMoved re-keys a page moved elsewhere and follows it when current', () => {
    const onPageMoved = vi.fn()
    const { mover, state, buffers, notify } = setup({ onPageMoved })
    buffers.setPageText('projects/acme', 'mine')
    buffers.setPageText('elsewhere', 'e')

    mover.pageMoved('elsewhere', 'moved/elsewhere')
    expect(buffers.getPageText('moved/elsewhere')).toBe('e')
    expect(state.getCurrentPage()).toBe('projects/acme')
    expect(onPageMoved).not.toHaveBeenCalled()

    mover.pageMoved('projects/acme', 'clients/acme')
    expect(state.getCurrentPage()).toBe('clients/acme')
    expect(buffers.getPageText('clients/acme')).toBe('mine')
    expect(onPageMoved).toHaveBeenCalledWith('projects/acme', 'clients/acme', undefined)
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'This page was moved to /clients/acme' }),
    )
  })
})

describe('editor instance + moves', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('navigating to a former slug lands on the page where it lives now', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const base = createMemoryPageStore({ start: 'go', 'clients/acme': 'acme body' })
    const store: PageStore = {
      load: (page) => base.load(page === 'projects/acme' ? 'clients/acme' : page),
      save: (page, content) => base.save(page, content),
      canonicalOf: (page) => (page === 'projects/acme' ? 'clients/acme' : page),
    }
    const instance = await createEditor(container, {
      pageStore: store,
      initialPage: 'start',
      homeSlug: 'start',
      saveDebounceMs: 5000,
    }).mount()

    instance.navigate('projects/acme')
    await vi.waitFor(() => expect(instance.getCurrentPage()).toBe('clients/acme'))
    expect(instance.getContent()).toBe('acme body')
    expect(container.textContent).toContain('/projects/acme moved to /clients/acme')
  })

  it('pageMoved on the instance follows the current page', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const trails: string[][] = []
    const instance = await createEditor(container, {
      pageStore: createMemoryPageStore({ 'a/b': 'body' }),
      initialPage: 'a/b',
      homeSlug: 'home',
      saveDebounceMs: 5000,
      onTrailChange: (trail) => trails.push(trail),
    }).mount()

    instance.pageMoved('a/b', 'c/d')
    expect(instance.getCurrentPage()).toBe('c/d')
    expect(instance.getContent()).toBe('body')
    expect(trails.at(-1)).toEqual(['home', 'c', 'd'])
  })
})

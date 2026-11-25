// @vitest-environment happy-dom

// ─── Inline page-move field (real editor mount) ─────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { renderBreadcrumb } from '../breadcrumb'
import type { PageMoveResult, PageStore } from '../types'

async function mount(opts: { initialPage?: string; move?: PageStore['move']; calls?: string[] }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const base = createMemoryPageStore({ 'projects/acme': 'acme body', home: 'home' })
  const calls = opts.calls ?? []
  const store: PageStore = {
    load: (page) => base.load(page),
    save: async (page, content) => {
      calls.push(`save:${page}`)
      await base.save(page, content)
    },
    ...(opts.move ? { move: opts.move } : {}),
  }
  const instance = await createEditor(container, {
    pageStore: store,
    initialPage: opts.initialPage ?? 'projects/acme',
    homeSlug: 'home',
    saveDebounceMs: 5000,
  }).mount()
  const breadcrumb = container.querySelector('.wn-breadcrumb') as HTMLElement
  return { container, instance, breadcrumb, calls }
}

const activeCrumb = (root: HTMLElement) => root.querySelector('.wn-crumb--active') as HTMLElement
const fieldInput = (root: HTMLElement) =>
  root.querySelector('.wn-move-input') as HTMLInputElement | null
const message = (root: HTMLElement) => root.querySelector('.wn-move-msg')?.textContent ?? ''

function type(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
function press(input: HTMLInputElement, key: string): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

const moved = (from: string, to: string): PageMoveResult => ({
  ok: true,
  moved: [{ from, to }],
  rewritten: [],
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('breadcrumb active crumb', () => {
  it('stays inert without a move-capable store', async () => {
    const { breadcrumb } = await mount({})
    const crumb = activeCrumb(breadcrumb)
    expect(crumb.classList.contains('wn-crumb--editable')).toBe(false)
    crumb.click()
    expect(fieldInput(breadcrumb)).toBeNull()
  })

  it('is editable in the collapsed (deep) trail layout too', () => {
    const host = document.createElement('div')
    const onEditActive = vi.fn()
    renderBreadcrumb(host, host, ['home', 'a', 'b', 'c', 'd', 'e'], {
      onCrumb: vi.fn(),
      onEditActive,
    })
    const crumb = host.querySelector('.wn-crumb--active') as HTMLElement
    expect(crumb.getAttribute('role')).toBe('button')
    crumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onEditActive).toHaveBeenCalledTimes(1)
  })
})

describe('inline move field', () => {
  it('opens prefilled from the active crumb, previews the fold and validates inline', async () => {
    const { breadcrumb } = await mount({ move: async () => moved('projects/acme', 'x') })
    activeCrumb(breadcrumb).click()
    const input = fieldInput(breadcrumb)!
    expect(input.value).toBe('projects/acme')
    expect(input.selectionStart).toBe('projects/'.length)

    type(input, 'Clients/Acme Corp')
    expect(message(breadcrumb)).toBe('→ /clients/acme-corp')

    type(input, 'api/thing')
    expect(message(breadcrumb)).toMatch(/reserved/)
    expect(input.getAttribute('aria-invalid')).toBe('true')

    type(input, 'projects/acme/inner')
    expect(message(breadcrumb)).toBe('A page cannot move inside itself')
  })

  it('Escape (or leaving the field) restores the breadcrumb without moving', async () => {
    const move = vi.fn(async () => moved('projects/acme', 'x'))
    const { breadcrumb, instance } = await mount({ move })
    activeCrumb(breadcrumb).click()
    press(fieldInput(breadcrumb)!, 'Escape')
    expect(fieldInput(breadcrumb)).toBeNull()
    expect(activeCrumb(breadcrumb).textContent).toBe('Acme')

    instance.beginMovePage()
    fieldInput(breadcrumb)!.dispatchEvent(new FocusEvent('blur'))
    expect(fieldInput(breadcrumb)).toBeNull()
    expect(move).not.toHaveBeenCalled()
  })

  it('Enter flushes the pending save, moves, and lands on the new address', async () => {
    const calls: string[] = []
    const move = vi.fn(async (from: string, to: string) => {
      calls.push(`move:${from}->${to}`)
      return moved(from, to)
    })
    const { breadcrumb, instance } = await mount({ move, calls })
    instance.insertText('typed ') // schedules a debounced save (5 s)

    instance.beginMovePage()
    const input = fieldInput(breadcrumb)!
    type(input, 'clients/acme-corp')
    press(input, 'Enter')

    await vi.waitFor(() => expect(instance.getCurrentPage()).toBe('clients/acme-corp'))
    expect(calls).toEqual(['save:projects/acme', 'move:projects/acme->clients/acme-corp'])
    expect(fieldInput(breadcrumb)).toBeNull()
    expect(activeCrumb(breadcrumb).textContent).toBe('Acme Corp')
    expect(instance.getContent()).toContain('acme body')
  })

  it('shows the server refusal inline and keeps the field open', async () => {
    const { breadcrumb, instance } = await mount({
      move: async () => ({ ok: false, error: 'a page already exists at /taken' }),
    })
    instance.beginMovePage()
    const input = fieldInput(breadcrumb)!
    type(input, 'taken')
    press(input, 'Enter')
    await vi.waitFor(() => expect(message(breadcrumb)).toBe('a page already exists at /taken'))
    expect(fieldInput(breadcrumb)).not.toBeNull()
    expect(input.readOnly).toBe(false)
    expect(instance.getCurrentPage()).toBe('projects/acme')
  })

  it('Enter on the unchanged address just closes', async () => {
    const move = vi.fn(async () => moved('projects/acme', 'x'))
    const { breadcrumb, instance } = await mount({ move })
    instance.beginMovePage()
    press(fieldInput(breadcrumb)!, 'Enter')
    expect(fieldInput(breadcrumb)).toBeNull()
    expect(move).not.toHaveBeenCalled()
  })
})

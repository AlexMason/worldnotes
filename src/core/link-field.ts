// ─── Inline link field (toolbar row) ─────────────────────────────────────────
// What the Link button and Ctrl+K open: a single input that takes a page name
// OR a URL (classified by link-input.ts, with a live "Wiki link → /a/b" /
// "URL" hint), plus an ARIA combobox of matching page names for wiki targets.
// Modeled on page-move-field.ts: Enter applies, Escape cancels, leaving the
// field cancels, errors stay inline and nothing is written until the input is
// valid. The field owns only its DOM and the typing/suggestion UX — the
// selection capture and the actual edit live in editor-link.ts.

import type { PageSuggestion } from './types'
import {
  classifyLinkInput,
  rankSuggestions,
  suggestionTarget,
  type ValidLinkInput,
} from './link-input'

export type LinkFieldCloseReason = 'applied' | 'cancel' | 'blur'

export interface LinkFieldOptions {
  /** Prefill (an existing link's target); empty for a new link. */
  initial: string
  /** The current page's wiki link base (see wikiLinkBase). */
  linkBase: string | null
  /** Page-name search; absent → no suggestions. */
  suggest?(query: string, limit: number): Promise<PageSuggestion[]>
  /** Apply a valid input. An error string keeps the field open and is shown;
   *  null means done (applied, or deliberately dropped). */
  apply(input: ValidLinkInput): string | null
  /** The field is gone (applied, cancelled, or lost focus). */
  close(reason: LinkFieldCloseReason): void
}

export interface LinkField {
  /** Remove the field without calling `close`. */
  destroy(): void
  focus(): void
}

const SUGGESTION_LIMIT = 8
const SUGGESTION_DEBOUNCE_MS = 150
let fieldCounter = 0

export function openLinkField(host: HTMLElement, options: LinkFieldOptions): LinkField {
  const id = `wn-link-field-${++fieldCounter}`

  const field = document.createElement('div')
  field.className = 'wn-link-field'

  const input = document.createElement('input')
  input.className = 'wn-link-field-input'
  input.type = 'text'
  input.value = options.initial
  input.placeholder = 'Page name or URL'
  input.spellcheck = false
  input.autocomplete = 'off'
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('aria-label', 'Link to a page or URL')
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-expanded', 'false')
  input.setAttribute('aria-controls', `${id}-list`)

  const msg = document.createElement('span')
  msg.className = 'wn-link-field-msg'
  msg.setAttribute('role', 'status')
  msg.setAttribute('aria-live', 'polite')

  const list = document.createElement('ul')
  list.className = 'wn-link-field-list'
  list.id = `${id}-list`
  list.setAttribute('role', 'listbox')
  list.hidden = true
  // Pressing a suggestion must not blur the input (blur cancels the field).
  list.addEventListener('mousedown', (e) => e.preventDefault())

  field.append(input, msg, list)
  host.appendChild(field)

  let closed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0
  let items: PageSuggestion[] = []
  let active = -1

  const show = (text: string, error = false): void => {
    msg.textContent = text
    msg.classList.toggle('wn-link-field-msg--error', error)
    input.setAttribute('aria-invalid', error ? 'true' : 'false')
  }

  const finish = (reason: LinkFieldCloseReason): void => {
    if (closed) return
    closed = true
    clearTimeout(timer)
    seq++
    field.remove()
    options.close(reason)
  }

  const setActive = (index: number): void => {
    active = index
    list.querySelectorAll('li').forEach((li, i) => {
      li.setAttribute('aria-selected', i === index ? 'true' : 'false')
    })
    if (index >= 0) input.setAttribute('aria-activedescendant', `${id}-opt-${index}`)
    else input.removeAttribute('aria-activedescendant')
  }

  const renderList = (next: PageSuggestion[]): void => {
    items = next
    list.replaceChildren(
      ...next.map((item, i) => {
        const li = document.createElement('li')
        li.id = `${id}-opt-${i}`
        li.className = 'wn-link-field-option'
        li.setAttribute('role', 'option')
        li.setAttribute('aria-selected', 'false')
        const title = document.createElement('span')
        title.className = 'wn-link-field-option-title'
        title.textContent = item.title
        const slug = document.createElement('span')
        slug.className = 'wn-link-field-option-slug'
        slug.textContent = `/${item.slug}`
        li.append(title, slug)
        li.addEventListener('click', () => pick(i))
        return li
      }),
    )
    list.hidden = next.length === 0
    input.setAttribute('aria-expanded', next.length === 0 ? 'false' : 'true')
    setActive(-1)
  }

  const commit = (value: ValidLinkInput): void => {
    const error = options.apply(value)
    if (error === null) finish('applied')
    else show(error, true)
  }

  function pick(index: number): void {
    const item = items[index]
    if (!item) return
    commit({
      kind: 'wiki',
      target: suggestionTarget(item.slug, options.linkBase),
      slug: item.slug,
    })
  }

  const refresh = (): void => {
    const value = input.value
    const result = classifyLinkInput(value, options.linkBase)
    if (value.trim() === '') {
      show('')
    } else if (result.kind === 'error') {
      show(result.message, true)
    } else if (result.kind === 'url') {
      show('URL')
    } else {
      show(`Wiki link → /${result.slug}`)
    }

    clearTimeout(timer)
    seq++
    const query = value.trim()
    if (!options.suggest || query === '' || result.kind === 'url') {
      renderList([])
      return
    }
    const mine = seq
    timer = setTimeout(() => {
      void options.suggest!(query, SUGGESTION_LIMIT).then(
        (found) => {
          if (!closed && mine === seq) renderList(rankSuggestions(query, found))
        },
        () => undefined, // a typing aid: failures are just "no suggestions"
      )
    }, SUGGESTION_DEBOUNCE_MS)
  }

  input.addEventListener('input', refresh)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      finish('cancel')
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length > 0) {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((active + step + items.length) % items.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0) return pick(active)
      const result = classifyLinkInput(input.value, options.linkBase)
      if (result.kind === 'error') show(result.message, true)
      else commit(result)
    }
  })
  input.addEventListener('blur', () => finish('blur'))

  input.focus()
  input.select()
  refresh()

  return {
    focus: () => input.focus(),
    destroy() {
      closed = true
      clearTimeout(timer)
      seq++
      field.remove()
    },
  }
}

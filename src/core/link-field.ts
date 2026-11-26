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
/** Fetched per query, then ranked and cut to SUGGESTION_LIMIT: the server
 *  answers newest-first, so prefix/exact matches must be ranked from a wider
 *  window than what is shown. */
const SUGGESTION_FETCH = 30
const SUGGESTION_DEBOUNCE_MS = 150
/** A link target is a short string; this only bounds pasted junk. */
const MAX_INPUT_LENGTH = 2048
let fieldCounter = 0

interface SuggestionList {
  element: HTMLUListElement
  hasItems(): boolean
  show(items: PageSuggestion[]): void
  clear(): void
  /** Move the highlight (wrapping) — only meaningful when items exist. */
  move(step: 1 | -1): void
  /** Pick the highlighted item; false when none is highlighted. */
  pickHighlighted(): boolean
}

/** The listbox half of the combobox: rendering, highlight, ARIA wiring. */
function createSuggestionList(
  id: string,
  input: HTMLInputElement,
  onPick: (item: PageSuggestion) => void,
): SuggestionList {
  const element = document.createElement('ul')
  element.className = 'wn-link-field-list'
  element.id = `${id}-list`
  element.setAttribute('role', 'listbox')
  element.hidden = true
  // Pressing a suggestion must not blur the input (blur cancels the field).
  element.addEventListener('mousedown', (e) => e.preventDefault())

  let items: PageSuggestion[] = []
  let active = -1

  const highlight = (index: number): void => {
    active = index
    element.querySelectorAll('li').forEach((li, i) => {
      li.setAttribute('aria-selected', i === index ? 'true' : 'false')
    })
    if (index >= 0) input.setAttribute('aria-activedescendant', `${id}-opt-${index}`)
    else input.removeAttribute('aria-activedescendant')
  }

  const show = (next: PageSuggestion[]): void => {
    items = next
    element.replaceChildren(
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
        li.addEventListener('click', () => onPick(item))
        return li
      }),
    )
    element.hidden = next.length === 0
    input.setAttribute('aria-expanded', next.length === 0 ? 'false' : 'true')
    highlight(-1)
  }

  return {
    element,
    hasItems: () => items.length > 0,
    show,
    clear: () => show([]),
    move: (step) => highlight((active + step + items.length) % items.length),
    pickHighlighted() {
      const item = items[active]
      if (item) onPick(item)
      return item !== undefined
    },
  }
}

/** The debounced, sequence-guarded search: an older, slower answer can never
 *  replace a newer one, and nothing lands after cancel(). */
function createSuggestionSearch(
  suggest: NonNullable<LinkFieldOptions['suggest']>,
  onResults: (items: PageSuggestion[]) => void,
): { query(text: string): void; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  let seq = 0

  const cancel = (): void => {
    clearTimeout(timer)
    seq++
  }
  return {
    cancel,
    query(text) {
      cancel()
      const mine = seq
      timer = setTimeout(() => {
        void suggest(text, SUGGESTION_FETCH).then(
          (found) => {
            if (mine === seq) onResults(rankSuggestions(text, found).slice(0, SUGGESTION_LIMIT))
          },
          () => undefined, // a typing aid: failures are just "no suggestions"
        )
      }, SUGGESTION_DEBOUNCE_MS)
    },
  }
}

export function openLinkField(host: HTMLElement, options: LinkFieldOptions): LinkField {
  const id = `wn-link-field-${++fieldCounter}`

  const field = document.createElement('div')
  field.className = 'wn-link-field'

  const input = document.createElement('input')
  input.className = 'wn-link-field-input'
  input.type = 'text'
  input.name = 'link-target'
  input.value = options.initial
  input.maxLength = MAX_INPUT_LENGTH
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

  let closed = false

  const show = (text: string, error = false): void => {
    msg.textContent = text
    msg.classList.toggle('wn-link-field-msg--error', error)
    input.setAttribute('aria-invalid', error ? 'true' : 'false')
  }

  const commit = (value: ValidLinkInput): void => {
    const error = options.apply(value)
    if (error === null) finish('applied')
    else show(error, true)
  }

  const list = createSuggestionList(id, input, (item) => {
    // A suggestion comes from the server, so it takes the same validation as
    // typed text before anything is written.
    const target = suggestionTarget(item.slug, options.linkBase)
    const checked = classifyLinkInput(target, options.linkBase)
    if (checked.kind === 'wiki') commit(checked)
    else show(checked.kind === 'error' ? checked.message : 'Not a page', true)
  })
  const search = options.suggest
    ? createSuggestionSearch(options.suggest, (found) => {
        if (!closed) list.show(found)
      })
    : null

  function finish(reason: LinkFieldCloseReason): void {
    if (closed) return
    closed = true
    search?.cancel()
    field.remove()
    options.close(reason)
  }

  const refresh = (): void => {
    const value = input.value
    const result = classifyLinkInput(value, options.linkBase)
    if (value.trim() === '') show('')
    else if (result.kind === 'error') show(result.message, true)
    else if (result.kind === 'url') show('URL')
    else show(`Wiki link → /${result.slug}`)

    search?.cancel()
    const query = value.trim()
    if (search && query !== '' && result.kind !== 'url') search.query(query)
    else list.clear()
  }

  input.addEventListener('input', refresh)
  input.addEventListener('keydown', (e) => {
    // Enter/arrows during IME composition belong to the IME, not to us.
    if (e.isComposing) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      finish('cancel')
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && list.hasItems()) {
      e.preventDefault()
      list.move(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (list.pickHighlighted()) return
      const result = classifyLinkInput(input.value, options.linkBase)
      if (result.kind === 'error') show(result.message, true)
      else commit(result)
    }
  })
  input.addEventListener('blur', () => finish('blur'))

  field.append(input, msg, list.element)
  host.appendChild(field)
  input.focus()
  input.select()
  refresh()

  return {
    focus: () => input.focus(),
    destroy() {
      closed = true
      search?.cancel()
      field.remove()
    },
  }
}

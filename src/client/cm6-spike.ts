// ─── CM6 spike client — GH-4 / issue #5 ──────────────────────────────────────
// Opt-in via `?cm6=1` on /{slug} (see main.ts). Same chrome and navigation as
// the production editor — shell DOM (createEditorDOM), breadcrumb trail, header
// actions, site bands, admin theme, toasts, popstate — with the editing surface
// swapped for a CodeMirror 6 EditorView driven by the existing grammar. Only
// the surface differs; shared pieces are imported, not copied.

import { createCm6Editor } from '../core/cm6/editor'
import type { Cm6Editor } from '../core/cm6/editor'
import { CM6_CSS } from '../core/cm6/theme'
import { renderBreadcrumb } from '../core/breadcrumb'
import { createEditorDOM, insertSiteBands } from '../core/editor-dom'
import { createEditorState } from '../core/editor-state'
import { applyTrailNavigation, pageAddressToSlug, seedContentFor } from '../core/editor-navigation'
import { createNotificationSystem } from '../core/notifications'
import { defaultPlugins } from '../core/plugins/defaults'
import { createApiPageStore } from './api-page-store'
import { bindPopstate, createStoreEvents, mountHeaderActions } from './chrome'
import { slugDisplayName } from '../shared/slug'
import { pageUrlPath } from '../shared/url-helpers'
import { composeDocTitle } from '../shared/doc-title'
import type { EditorShellConfig } from '../shared/dto'

export interface Cm6SpikePage {
  slug: string
  content: string | null
  version: number | null
  exists: boolean
}

export function mountCm6Spike(
  container: HTMLElement,
  cfg: EditorShellConfig,
  embed: Cm6SpikePage | null,
): Cm6Editor {
  const seeded = embed !== null && embed.exists && embed.version !== null
  const state = createEditorState({ initialPage: cfg.slug, homeSlug: cfg.homeSlug })
  const dom = createEditorDOM(container, undefined, cfg.themeCss || undefined)
  const notifications = createNotificationSystem(dom.container)

  const style = document.createElement('style')
  style.textContent = CM6_CSS
  document.head.appendChild(style)

  // The CM6 view replaces the contenteditable surface inside the shared column.
  const host = document.createElement('div')
  host.className = 'wn-cm-host'
  dom.editorDiv.replaceWith(host)

  let currentSlug = cfg.slug
  let editor: Cm6Editor | null = null

  const store = createApiPageStore(
    createStoreEvents(() => notifications, {
      onSaved: (page) => {
        document.title = composeDocTitle(slugDisplayName(page), cfg.siteName)
      },
      loadServerContent: (content) => editor?.setText(content),
    }),
    // Seed the store version from the SSR embed so the first autosave sends
    // the correct If-Match.
    seeded ? [{ slug: cfg.slug, version: embed.version! }] : [],
  )

  const paintBreadcrumb = (): void =>
    renderBreadcrumb(dom.breadcrumb, dom.container, state.getTrail(), {
      homeLabel: cfg.siteName || undefined,
      // Crumb click: trail is truncated, the (already-known) page re-shown.
      onCrumb: (i) => {
        state.truncateTrail(i)
        void show(state.getCurrentPage()).catch(reportLoadFailure)
      },
    })

  // Debounced autosave — same cadence/contract as the production editor. Only
  // dirty buffers are written, so flushing before navigation never re-PUTs.
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false
  const flush = async (): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    if (!editor || !dirty) return
    dirty = false
    try {
      await store.save(currentSlug, editor.getText())
    } catch (err) {
      dirty = true
      console.error('worldnotes: save failed', err)
      notifications.notify({
        id: 'wn-save',
        message: 'Save failed — your edits are still in the editor.',
        type: 'error',
        duration: 0,
      })
    }
  }
  const schedule = (): void => {
    dirty = true
    dom.placeholder.style.display = editor && editor.getText().length ? 'none' : 'block'
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), cfg.autosaveMs)
  }

  const reportLoadFailure = (err: unknown): void => {
    console.error('worldnotes: navigation failed', err)
    notifications.notify({
      id: 'wn-nav',
      message: 'Failed to load the page — you are still on the previous one.',
      type: 'error',
      duration: 3000,
    })
  }

  /** Flush pending edits, then swap `slug`'s content (or its seed) into the view. */
  async function show(slug: string, content?: string): Promise<void> {
    await flush()
    const text = content ?? (await store.load(slug)) ?? seedContentFor(slug, cfg.homeSlug)
    if (slug !== currentSlug) {
      currentSlug = slug
      window.history.pushState(null, '', `${pageUrlPath(slug)}${window.location.search}`)
    }
    document.title = composeDocTitle(slugDisplayName(slug), cfg.siteName)
    editor?.setText(text)
    dom.placeholder.style.display = text.length ? 'none' : 'block'
    paintBreadcrumb()
    // A navigation happened — do not leave an open menu hovering over the new
    // page on mobile.
    container.querySelector('details[open]')?.removeAttribute('open')
  }

  /** Link / nav / popstate target → canonical slug → trail + page. */
  const navigate = async (target: string): Promise<void> => {
    const slug = pageAddressToSlug(target)
    if (slug === null) {
      notifications.notify({
        id: 'wn-nav',
        message: `"${target}" is not a valid page address.`,
        type: 'warning',
        duration: 3000,
      })
      return
    }
    // Load BEFORE touching the trail: a rejecting store leaves chrome and view
    // consistent with the page the user is still on.
    await flush()
    const content = (await store.load(slug)) ?? seedContentFor(slug, cfg.homeSlug)
    applyTrailNavigation(state, slug)
    await show(state.getCurrentPage(), content)
  }
  const navigateSafe = (target: string): void => void navigate(target).catch(reportLoadFailure)

  editor = createCm6Editor(host, {
    doc: embed ? (seeded ? (embed.content ?? '') : seedContentFor(cfg.slug, cfg.homeSlug)) : '',
    plugins: defaultPlugins,
    onChange: schedule,
    onNavigate: navigateSafe,
    onSave: () => void flush(),
  })
  dom.placeholder.style.display = editor.getText().length ? 'none' : 'block'

  // No SSR embed (older server / parse failure): fall back to fetching.
  if (!embed) void show(cfg.slug).catch(reportLoadFailure)
  paintBreadcrumb()
  insertSiteBands(dom.editorWrap, cfg.headerHtml, cfg.footerHtml)
  mountHeaderActions(container, cfg, navigateSafe)
  bindPopstate(
    () => currentSlug,
    (slug) => {
      currentSlug = slug
    },
    navigateSafe,
  )

  return editor
}

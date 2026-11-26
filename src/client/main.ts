// ─── WorldNotes edit client ──────────────────────────────────────────────────
// Bootstrap for /{slug}: mounts the inline editor over the pages API
// with debounced autosave, conflict UX, and real-path navigation.

import { createEditor } from '../core/editor'
import type { EditorInstance } from '../core/types'
import { insertSiteBands } from '../core/editor-dom'
import { createApiPageStore } from './api-page-store'
import { createLinkExistence } from './link-existence'
import { createPageTitles } from './page-titles'
import { createMediaUploader } from './media-upload'
import { mountHeaderActions, bindPopstate, createStoreEvents } from './chrome'
import { slugFromPath, pageUrlPath } from '../shared/url-helpers'
import { navTargetToSlug } from '../shared/slug'
import { composeDocTitle } from '../shared/doc-title'
import type { EditorShellConfig } from '../shared/dto'

type ShellConfig = EditorShellConfig

interface PageEmbed {
  slug: string
  content: string | null
  version: number | null
  exists: boolean
  /** Existence of the pages this page links to (SSR-computed). */
  linkExists?: Record<string, boolean>
  /** Stored titles of the page and its existing ancestors (SSR-computed). */
  titles?: Record<string, string>
}

function readShellConfig(): ShellConfig {
  const el = document.getElementById('wn-config')
  if (el?.textContent) {
    try {
      return JSON.parse(JSON.parse(el.textContent) as string) as ShellConfig
    } catch {
      /* fall through */
    }
  }
  return {
    slug: slugFromPath(window.location.pathname),
    autosaveMs: 1500,
    searchEnabled: true,
    allPagesEnabled: true,
    homeSlug: null,
    siteName: 'WorldNotes',
    headerHtml: '',
    footerHtml: '',
    userName: null,
    authDisabled: false,
  }
}

/**
 * The SSR-embedded page record (Task 1). `null` when the shell has no
 * `wn-page` script (fresh page, older server, or parse failure) — the editor
 * then falls back to fetching via the store as before.
 */
function readPageEmbed(): PageEmbed | null {
  const el = document.getElementById('wn-page')
  if (!el?.textContent) return null
  try {
    return JSON.parse(el.textContent) as PageEmbed
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const container = document.getElementById('wn-app')
  if (!container) return
  const cfg = readShellConfig()
  const embed = readPageEmbed()

  // GH-4 spike: opt-in CodeMirror 6 editing surface (dynamic import keeps it
  // out of the default bundle). Everything below is the production editor.
  if (new URLSearchParams(window.location.search).has('cm6')) {
    const { mountCm6Spike } = await import('./cm6-spike')
    mountCm6Spike(container, cfg, embed)
    return
  }
  const seeded = embed && embed.exists && embed.version !== null

  let instance: EditorInstance | null = null
  let currentSlug = cfg.slug

  // Link-state answers: seeded from the SSR embed (no first-paint flash),
  // then fetched on demand and updated by this editor's own saves/deletes.
  const linkExistence = createLinkExistence(embed?.linkExists)
  // Breadcrumb labels of pages this editor has not loaded (ancestors).
  const pageTitles = createPageTitles(embed?.titles)

  const store = createApiPageStore(
    createStoreEvents(() => instance, {
      onSaved: (page) => {
        // A landed save means the page exists (it may have just been created).
        const slug = navTargetToSlug(page)
        if (slug !== null) linkExistence.set(slug, true)
      },
      onDeleted: (page) => {
        const slug = navTargetToSlug(page)
        if (slug !== null) linkExistence.set(slug, false)
      },
      // Another tab/editor moved this page; a save followed it — re-key.
      onMoved: (from, to) => instance?.pageMoved(from, to),
      loadServerContent: (content) => instance?.setContent(content),
    }),
    // Seed the store version from the SSR embed so the first autosave sends
    // the correct If-Match (avoids a needless 428 → refetch → retry).
    seeded ? [{ slug: cfg.slug, version: embed.version! }] : [],
  )

  const editor = createEditor(container, {
    pageStore: store,
    imageUploader: createMediaUploader(),
    pageExists: linkExistence,
    pageTitles,
    initialPage: cfg.slug,
    // Seed the buffer from the embed so first paint is synchronous.
    initialContent: seeded ? (embed.content ?? '') : undefined,
    homeSlug: cfg.homeSlug,
    homeLabel: cfg.siteName || undefined,
    saveDebounceMs: cfg.autosaveMs,
    // Admin theme: appended after the default stylesheet (defaults stay).
    themeAppend: cfg.themeCss || undefined,
    onTrailChange: (trail) => {
      // Trail segments are always canonical slugs: navigateToPage folds every
      // click target via navTargetToSlug, and the initial trail is seeded from
      // the server-validated URL. So the joined page IS the slug.
      const page = trail.length <= 1 ? (trail[0] ?? 'home') : trail.slice(1).join('/')
      if (page !== currentSlug) {
        currentSlug = page
        window.history.pushState(null, '', pageUrlPath(page))
      }
      // A navigation happened (any way) — do not leave an open menu hovering
      // over the new page on mobile.
      container.querySelector('details[open]')?.removeAttribute('open')
    },
    // The page's first H1 (else its slug label) — live while it is edited.
    onTitleChange: (title) => {
      document.title = composeDocTitle(title, cfg.siteName)
    },
    onPageMoved: (from, to, result) => {
      const pairs = result?.ok ? result.moved : [{ from, to }]
      // Former slugs redirect, so links to them still work (not "missing").
      for (const pair of pairs) {
        linkExistence.set(pair.from, true)
        linkExistence.set(pair.to, true)
      }
      // The home page moved: the editor's homeSlug option (link base, seeds,
      // trail root) is now stale — reload at the new address instead.
      if (cfg.homeSlug !== null && pairs.some((pair) => pair.from === cfg.homeSlug)) {
        window.location.replace(pageUrlPath(to))
        return
      }
      // Replace, never push: the old URL now redirects here.
      currentSlug = to
      window.history.replaceState(null, '', pageUrlPath(to))
    },
  })

  instance = await editor.mount()

  // Site header/footer bands (admin-authored raw HTML) around the content
  // column, mirroring the reader's placement inside <main>.
  const editorWrap = container.querySelector<HTMLElement>('.wn-editor-wrap')
  if (editorWrap) insertSiteBands(editorWrap, cfg.headerHtml, cfg.footerHtml)

  mountHeaderActions(
    container,
    cfg,
    (slug) => instance?.navigate(slug),
    () => instance?.beginMovePage(),
  )
  bindPopstate(
    () => currentSlug,
    (slug) => {
      currentSlug = slug
    },
    (slug) => instance?.navigate(slug),
  )

  // Ctrl+S is owned by the editor keymap (saveNow flush through the store's
  // full save path — onError toast + onSave callback included). The old
  // window-level handler here was removed: it double-fired with the keymap
  // and bypassed onSave by calling store.save directly.
}

void main().catch((err) => {
  console.error('WorldNotes client failed to start:', err)
  const el = document.getElementById('wn-app')
  if (el) el.textContent = 'Editor failed to load. Reload the page or log in again.'
})

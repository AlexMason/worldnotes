// ─── CM6 spike client — GH-4 / issue #5 ──────────────────────────────────────
// Opt-in via `?cm6=1` on /{slug} (see main.ts). Edits ONE page in a CodeMirror
// 6 EditorView with live-preview hiding driven by the existing tokenizer +
// BlockDef grammar. Save / If-Match flow is the unchanged ApiPageStore +
// debounced autosave; chrome (breadcrumbs, toolbar, panels) is NOT ported —
// see docs/research/cm6-spike-findings.md.

import { createCm6Editor } from '../core/cm6/editor'
import type { Cm6Editor } from '../core/cm6/editor'
import { CM6_CSS } from '../core/cm6/theme'
import { defaultPlugins } from '../core/plugins/defaults'
import { EDITOR_TOKENS_CSS, EDITOR_CONTENT_CSS } from '../core/styles'
import { createApiPageStore } from './api-page-store'
import { navTargetToSlug, slugDisplayName } from '../shared/slug'
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
  const style = document.createElement('style')
  style.textContent = EDITOR_TOKENS_CSS + EDITOR_CONTENT_CSS + CM6_CSS
  document.head.appendChild(style)

  container.innerHTML = ''
  container.className = 'wn-root'
  container.style.background = 'var(--wn-color-bg)'
  container.style.overflow = 'auto'

  const status = document.createElement('div')
  status.style.cssText =
    'position:sticky;top:0;padding:.4rem 1rem;font:13px system-ui;color:var(--wn-color-fg-muted);' +
    'background:var(--wn-color-surface);border-bottom:1px solid var(--wn-color-border)'
  const host = document.createElement('div')
  host.className = 'wn-cm-host'
  container.append(status, host)

  let currentSlug = cfg.slug
  let editor: Cm6Editor | null = null
  const setStatus = (msg: string, action?: { label: string; run(): void }): void => {
    status.textContent = `CM6 spike · ${currentSlug} · ${msg}`
    if (action) {
      const b = document.createElement('button')
      b.textContent = action.label
      b.style.marginLeft = '.6rem'
      b.addEventListener('click', action.run)
      status.appendChild(b)
    }
  }

  const store = createApiPageStore(
    {
      onSaved: () => setStatus('saved'),
      onDeleted: () => setStatus('page deleted (blank save)'),
      onAuthLost: () => setStatus('session expired — log in again'),
      onForbidden: () => setStatus('edit access revoked'),
      onConflict(_page, server) {
        if (!server) return setStatus('page deleted elsewhere; next save recreates it')
        setStatus('someone saved a newer version', {
          label: 'Load theirs',
          run: () => {
            editor?.setText(server.content)
            setStatus('loaded server version')
          },
        })
      },
    },
    embed && embed.exists && embed.version !== null
      ? [{ slug: cfg.slug, version: embed.version }]
      : [],
  )

  // Debounced autosave — same cadence/contract as the production editor.
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = async (): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    if (!editor) return
    setStatus('saving…')
    try {
      await store.save(currentSlug, editor.getText())
    } catch (err) {
      setStatus(`save failed: ${(err as Error).message}`)
    }
  }
  const schedule = (): void => {
    setStatus('unsaved')
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), cfg.autosaveMs)
  }

  const navigate = async (target: string): Promise<void> => {
    const slug = navTargetToSlug(target)
    if (slug === null || slug === currentSlug) return
    if (timer) await flush()
    const content = await store.load(slug)
    currentSlug = slug
    window.history.pushState(null, '', `${pageUrlPath(slug)}?cm6=1`)
    document.title = composeDocTitle(slugDisplayName(slug), cfg.siteName)
    editor?.setText(content ?? '')
    setStatus(content === null ? 'new page' : 'loaded')
  }

  editor = createCm6Editor(host, {
    doc: embed?.content ?? '',
    plugins: defaultPlugins,
    onChange: schedule,
    onNavigate: (page) => void navigate(page),
  })
  setStatus('ready')
  return editor
}

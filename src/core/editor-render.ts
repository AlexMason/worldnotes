// ─── Editor Render ───────────────────────────────────────────────────────────

import type { ContentPlugin, EditorContext } from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { NotificationSystem } from './notifications'
import { setLineOffset, tryGetLineOffset } from './caret-offset'
import { renderDocLines } from './line-renderer'
import { buildDocument, regionAt } from './document'
import { renderInlineContent } from './renderer'
import { slugDisplayName } from '../shared/slug'

export interface EditorRenderAPI {
  render(force?: boolean, cursorOffset?: number): void
  renderBreadcrumb(): void
  checkSelectChange(): void
}

export interface EditorRenderOptions {
  onBreadcrumbNavigate?: (page: string) => void
  onTrailChange?: (trail: string[]) => void
  navigateFn?: (page: string) => void
  statusPages?: Record<number, string>
  showCreateOverlay?: boolean
  notifications?: NotificationSystem
}

function determineActiveLine(raw: string, offset: number): number {
  let line = 0
  for (let i = 0; i < Math.min(offset, raw.length); i++) {
    if (raw[i] === '\n') line++
  }
  return line
}

/** Character offset where `line` starts within `raw`. */
function lineStartOffset(raw: string, line: number): number {
  let offset = 0
  for (let i = 0; i < line; i++) {
    const next = raw.indexOf('\n', offset)
    if (next === -1) return raw.length
    offset = next + 1
  }
  return Math.min(offset, raw.length)
}

export function createEditorRender(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  state: EditorStateAPI,
  options: EditorRenderOptions = {},
): EditorRenderAPI {
  const { editorDiv, placeholder, breadcrumb } = dom
  const { notifications } = options

  let activeLine = -1

  // ── Full render pipeline ──────────────────────────────────────────────────

  function render(_force = false, cursorOffset?: number): void {
    const buffers = state.getPageBuffers()
    const page = state.getCurrentPage()
    const raw = buffers.getPageText(page)

    // An unrecognizable selection (tryGetLineOffset → null: ranges lost to a
    // DOM swap, selection anchored outside this editor) must NOT snap the
    // caret to line 0 — keep it at the current active line. Only forced
    // renders (page load/switch) or a never-placed caret start at the top.
    const offset =
      cursorOffset ??
      tryGetLineOffset(editorDiv) ??
      (_force || activeLine < 0 ? 0 : lineStartOffset(raw, activeLine))

    activeLine = determineActiveLine(raw, offset)

    // D3: the cursor's line is raw-rendered — and when it sits INSIDE a
    // multi-line block region (fence, table), EVERY line of the region joins
    // activeLines so the whole block expands to plain source text.
    const doc = buildDocument(raw, contentPlugins)
    const activeLines = new Set<number>([activeLine])
    const region = regionAt(doc.blocks, activeLine)
    if (region) {
      for (let l = region.startLine; l <= region.endLine; l++) activeLines.add(l)
    }

    const context: EditorContext = state.toContext(
      options.navigateFn ??
        ((_p: string): void => {
          /* noop */
        }),
    )

    context.renderInline = (text: string): DocumentFragment => {
      return renderInlineContent(text, contentPlugins, context)
    }

    renderDocLines(doc, contentPlugins, context, editorDiv, activeLines)

    placeholder.style.display = raw.length ? 'none' : 'block'

    try {
      setLineOffset(editorDiv, offset)
    } catch {
      /* noop */
    }

    // ── 404 toast (via notification system) ────────────────────────────────

    if (notifications) {
      const statusPages = options.statusPages ?? {}
      const notFoundPage = statusPages[404] ?? '404'
      const currentPage = state.getCurrentPage()
      const requestedPage = state.getPendingRequestedPage()
      const showOverlay = options.showCreateOverlay !== false

      if (currentPage === notFoundPage && requestedPage && showOverlay) {
        const navigateFn = options.navigateFn
        notifications.notify({
          id: 'wn-404',
          message: `Page "${requestedPage}" not found.`,
          type: 'info',
          duration: 0,
          action: {
            label: 'Create',
            onClick: () => {
              const page = requestedPage
              const buffers = state.getPageBuffers()
              if (buffers.getPageText(page) === '') {
                buffers.setPageText(page, `# ${page}\n\n`)
              }
              state.setPendingRequestedPage(null)
              if (navigateFn) {
                navigateFn(page)
              }
              notifications.dismiss('wn-404')
            },
          },
        })
      } else {
        notifications.dismiss('wn-404')
      }
    }
  }

  function checkSelectChange(): void {
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return

    // Ignore selections we can't map (outside the editor, or transiently
    // empty during a rebuild) — acting on them would jump the caret to line 0.
    const offset = tryGetLineOffset(editorDiv)
    if (offset === null) return

    const buffers = state.getPageBuffers()
    const page = state.getCurrentPage()
    const raw = buffers.getPageText(page)
    const newLine = determineActiveLine(raw, offset)

    if (newLine !== activeLine) {
      render()
    }
  }

  // ── Breadcrumb rendering ──────────────────────────────────────────────────

  function renderBreadcrumb(): void {
    breadcrumb.innerHTML = ''
    const trail = state.getTrail()

    trail.forEach((page, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'wn-crumb-sep'
        sep.textContent = '/'
        breadcrumb.appendChild(sep)
      }
      const crumb = document.createElement('span')
      crumb.className = 'wn-crumb' + (i === trail.length - 1 ? ' wn-crumb--active' : '')
      // Root crumb is always the wiki home (labelled "Home"); path segments
      // are humanized slugs, matching the viewer's breadcrumb chrome.
      crumb.textContent = i === 0 ? 'Home' : slugDisplayName(page)
      if (i < trail.length - 1) {
        crumb.addEventListener('click', () => {
          state.truncateTrail(i)
          const newTrail = state.getTrail()
          const targetPage = newTrail.length <= 1 ? newTrail[0] : newTrail.slice(1).join('/')
          options.onBreadcrumbNavigate?.(targetPage)
        })
      }
      breadcrumb.appendChild(crumb)
    })

    options.onTrailChange?.(state.getTrail())
  }

  return { render, renderBreadcrumb, checkSelectChange }
}

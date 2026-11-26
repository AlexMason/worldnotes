// ─── Editor Lifecycle ──────────────────────────────────────────────────────────

import type {
  ContentPlugin,
  UIPlugin,
  PageStore,
  EditorOptions,
  EditorInstance,
  EditorContext,
} from './types'
import type { EditorStateAPI } from './editor-state'
import type { EditorDOM } from './editor-dom'
import type { EditorRenderAPI } from './editor-render'
import type { EditorNavigationAPI } from './editor-navigation'
import { getSelectionOffsets } from './caret-offset'
import { createEditingKeymap } from './editor-keymap'
import { commitModelEdit, replaceSelection, type ModelCommitDeps } from './editor-commit'
import { extractContentText } from './content-text'
import { buildDocument } from './document'
import { renderInlineContent } from './renderer'
import type { NotificationSystem } from './notifications'
import type { ToastOptions } from './types'
import { syncLinkExistence } from './link-existence-sync'
import { createPageMover } from './editor-page-move'
import { createEditorToolbar } from './editor-toolbar'
import { classifyLinkTarget, isSafeHref } from '../shared/url-policy'

export interface EditorLifecycleAPI {
  mount(): Promise<EditorInstance>
}

/** What a copy/cut puts on the clipboard, and the buffer range a cut removes. */
interface ClipboardSource {
  text: string
  /** Empty-selection copy: the caret's whole line, line break included. */
  linewise: boolean
  cut: { start: number; end: number }
}

export function createEditorLifecycle(
  dom: EditorDOM,
  contentPlugins: ContentPlugin[],
  uiPlugins: UIPlugin[],
  state: EditorStateAPI,
  render: EditorRenderAPI,
  navigation: EditorNavigationAPI,
  pageStore: PageStore,
  options: EditorOptions,
  notifications: NotificationSystem,
): EditorLifecycleAPI {
  async function mount(): Promise<EditorInstance> {
    const saveDebounce = options.saveDebounceMs ?? 600
    const buffers = state.getPageBuffers()

    // Save bookkeeping for flushSaves (page moves must not race a save):
    // the page a pending debounce will save, and every save still in flight
    // (each resolving to whether it succeeded).
    let pendingSavePage: string | null = null
    const inflightSaves = new Set<Promise<boolean>>()

    /**
     * Immediate save (Ctrl+S path) + the debounced timer's body. `page` is
     * passed by the debounce scheduler (captured at SCHEDULE time); omitting
     * it saves the page under the cursor. Resolves false when the save failed.
     */
    async function saveNow(page?: string): Promise<boolean> {
      state.clearSaveTimer()
      pendingSavePage = null
      const target = page ?? state.getCurrentPage()
      // A page the editor no longer holds (re-keyed by a move) has nothing to
      // save — and its '' would read as a blank save, which DELETES the page.
      if (!buffers.hasPage(target)) return true
      const content = buffers.getPageText(target)
      const run = (async () => {
        try {
          await pageStore.save(target, content)
          options.onSave?.(target, content)
          return true
        } catch (e) {
          console.error('worldnotes: page save failed', e)
          notifications.notify({ message: 'Failed to save page', type: 'error' })
          return false
        }
      })()
      inflightSaves.add(run)
      try {
        return await run
      } finally {
        inflightSaves.delete(run)
      }
    }

    function scheduleSave(page: string): void {
      state.clearSaveTimer()
      pendingSavePage = page
      const timer = setTimeout(() => void saveNow(page), saveDebounce)
      state.setSaveTimer(timer)
    }

    // Capture the page at SCHEDULE time: the timer may fire after the user
    // has navigated (a link click ~500ms after typing). Reading
    // getCurrentPage() at FIRE time would persist the destination page's
    // seeded buffer — creating a page the user never typed into — and the
    // originating page's edits would never be saved.
    const saveDebounced = (): void => scheduleSave(state.getCurrentPage())

    /**
     * Run a pending debounced save now, then wait for every save in flight.
     * Resolves false when any of them failed (unsaved edits remain).
     */
    async function flushSaves(): Promise<boolean> {
      let ok = pendingSavePage === null || (await saveNow(pendingSavePage))
      while (inflightSaves.size > 0) {
        const results = await Promise.all([...inflightSaves])
        ok = ok && results.every(Boolean)
      }
      return ok
    }

    /** A page was re-keyed by a move: a save still pending for it follows. */
    function retargetSave(from: string, to: string): void {
      if (pendingSavePage === from) scheduleSave(to)
    }

    const mover = createPageMover({
      state,
      pageStore,
      render,
      notifications,
      options,
      flushSaves,
      retargetSave,
    })
    if (mover.canMove()) render.setMoveHandler((to) => mover.movePage(to))

    // ── Model commits (keymap ops, selection edits, plain-key fallbacks) ──
    // Plugins' onUpdate follows every commit render, like the input path.

    const commitDeps: ModelCommitDeps = {
      editorEl: dom.editorDiv,
      getCurrentPage: () => state.getCurrentPage(),
      pageExists: (page) => buffers.hasPage(page),
      getPageText: (page) => buffers.getPageText(page),
      setPageText: (page, text) => buffers.setPageText(page, text),
      render: (offset) => {
        render.render(true, offset)
        for (const plugin of contentPlugins) plugin.onUpdate?.()
      },
      scheduleSave: saveDebounced,
    }

    /** Replace the selection with `text` through the buffer (never DOM
     *  surgery); an unmappable selection changes nothing. */
    const insertTextAtSelection = (text: string): void => {
      replaceSelection(commitDeps, text)
    }

    /** Delete the selection, else one code point before (-1) / after (+1)
     *  the caret — a surrogate pair goes as a unit. */
    const deleteAtCaret = (dir: -1 | 1): void => {
      const sel = getSelectionOffsets(dom.editorDiv)
      if (!sel) return
      if (sel.end > sel.start) {
        insertTextAtSelection('')
        return
      }
      const page = state.getCurrentPage()
      const raw = buffers.getPageText(page)
      let from = dir < 0 ? sel.start - 1 : sel.start
      if (from < 0 || from >= raw.length) return
      let len = 1
      if (dir < 0 && from > 0 && raw.codePointAt(from - 1)! > 0xffff) from -= 1
      if (raw.codePointAt(from)! > 0xffff) len = 2
      commitModelEdit(commitDeps, page, {
        text: raw.slice(0, from) + raw.slice(from + len),
        start: from,
        end: from,
      })
    }

    // ── Editing keymap (line ops, word ops, formatting, Ctrl+S) ────────

    const keymap = createEditingKeymap({
      ...commitDeps,
      saveNow: () => void saveNow(),
      blockLines: (text) => {
        const lines = new Set<number>()
        for (const block of buildDocument(text, contentPlugins).blocks) {
          for (let i = block.startLine; i <= block.endLine; i++) lines.add(i)
        }
        return lines
      },
    })

    // ── Input handler ──────────────────────────────────────────────────────

    let handlingInput = false

    // extractContentText lives in content-text.ts — the SINGLE raw-text model
    // shared with caret-offset.ts (both directions of the DOM ↔ source
    // mapping must agree node-for-node, forever; two implementations drifting
    // apart is a silent data-loss bug).

    dom.editorDiv.addEventListener('input', () => {
      if (state.isNavigating()) return
      if (handlingInput) return
      handlingInput = true

      const page = state.getCurrentPage()

      // Use extractContentText to preserve data-raw token boundaries
      // (e.g. [[wiki links]]) instead of plain textContent which loses them.
      const raw = extractContentText(dom.editorDiv)
      if (raw !== buffers.getPageText(page)) {
        buffers.setPageText(page, raw)
      }

      render.render()

      for (const plugin of contentPlugins) {
        plugin.onUpdate?.()
      }

      saveDebounced()

      handlingInput = false
    })

    // ── Ctrl/Cmd+Click opens external links ─────────────────────────────
    // A contenteditable root swallows link activation (caret placement
    // wins), so a plain click keeps entering edit mode and the modifier
    // click is the explicit "open" gesture. mousedown is cancelled to keep
    // the caret (and line activation) where it was; the open happens on
    // click, which also cancels any native activation so a browser that
    // does honour modifier clicks inside editable content cannot open the
    // link twice. The href is re-gated here: the plugin already refuses to
    // mint unsafe anchors, but this handler must not trust the DOM.
    // Internal links render as spans and keep their onNavigate path.

    const modifiedExternalLink = (e: MouseEvent): string | null => {
      if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return null
      const anchor = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!anchor || !dom.editorDiv.contains(anchor)) return null
      const href = anchor.getAttribute('href') ?? ''
      if (classifyLinkTarget(href) !== 'external' || !isSafeHref(href)) return null
      return href
    }

    dom.editorDiv.addEventListener('mousedown', (e: MouseEvent) => {
      if (modifiedExternalLink(e) !== null) e.preventDefault()
    })

    dom.editorDiv.addEventListener('click', (e: MouseEvent) => {
      const href = modifiedExternalLink(e)
      if (href === null) return
      e.preventDefault()
      window.open(href, '_blank', 'noopener,noreferrer')
    })

    // ── Clipboard: source markdown out, source markdown in ──────────────
    // The rendered DOM deliberately differs from the source (wiki links show
    // their label, bullets a glyph, table pipes and image URLs are hidden),
    // so the browser's own copy serializer produces wrong markdown. Copy and
    // cut slice the BUFFER at the selection's raw offsets; paste commits
    // through the model. An unmappable selection (outside the editor) is
    // left to the browser. An empty selection copies/cuts the caret's whole
    // line (VS Code / CodeMirror); pasting exactly that text back with a
    // collapsed caret inserts it as a line above the caret's line.

    let lastLinewiseCopy: string | null = null

    /** What copy/cut take: the selected source, or the caret line (with its
     *  line break) when the selection is empty. `cut` is the buffer range a
     *  cut removes — a trailing last line takes the break before it. */
    const clipboardSource = (): ClipboardSource | null => {
      const page = state.getCurrentPage()
      if (!buffers.hasPage(page)) return null
      const sel = getSelectionOffsets(dom.editorDiv)
      if (!sel) return null
      const raw = buffers.getPageText(page)
      if (sel.end > sel.start) {
        return { text: raw.slice(sel.start, sel.end), linewise: false, cut: sel }
      }
      const lineStart = raw.lastIndexOf('\n', sel.start - 1) + 1
      const lineBreak = raw.indexOf('\n', sel.start)
      if (lineBreak !== -1) {
        const end = lineBreak + 1
        return { text: raw.slice(lineStart, end), linewise: true, cut: { start: lineStart, end } }
      }
      return {
        text: raw.slice(lineStart) + '\n',
        linewise: true,
        cut: { start: Math.max(0, lineStart - 1), end: raw.length },
      }
    }

    const writeClipboard = (e: ClipboardEvent): ClipboardSource | null => {
      const src = clipboardSource()
      if (!src || !e.clipboardData) return null
      e.preventDefault()
      e.clipboardData.setData('text/plain', src.text)
      lastLinewiseCopy = src.linewise ? src.text : null
      return src
    }

    dom.editorDiv.addEventListener('copy', (e: ClipboardEvent) => {
      writeClipboard(e)
    })

    dom.editorDiv.addEventListener('cut', (e: ClipboardEvent) => {
      const src = writeClipboard(e)
      if (!src) return
      const page = state.getCurrentPage()
      const raw = buffers.getPageText(page)
      commitModelEdit(commitDeps, page, {
        text: raw.slice(0, src.cut.start) + raw.slice(src.cut.end),
        start: src.cut.start,
        end: src.cut.start,
      })
    })

    dom.editorDiv.addEventListener('paste', (e: ClipboardEvent) => {
      e.preventDefault()
      const data = e.clipboardData
      // text/plain, else a uri-list (file managers): one URI per line, `#`
      // lines are comments (RFC 2483). CRLF/CR never reach the buffer.
      let text = data?.getData('text/plain') ?? ''
      if (!text) {
        text = (data?.getData('text/uri-list') ?? '')
          .split(/\r?\n/)
          .filter((line) => line && !line.startsWith('#'))
          .join('\n')
      }
      if (!text) return
      text = text.replace(/\r\n?/g, '\n')

      const sel = getSelectionOffsets(dom.editorDiv)
      const page = state.getCurrentPage()
      if (sel && sel.start === sel.end && text === lastLinewiseCopy && buffers.hasPage(page)) {
        const raw = buffers.getPageText(page)
        const lineStart = raw.lastIndexOf('\n', sel.start - 1) + 1
        const caret = sel.start + text.length
        commitModelEdit(commitDeps, page, {
          text: raw.slice(0, lineStart) + text + raw.slice(lineStart),
          start: caret,
          end: caret,
        })
        return
      }
      insertTextAtSelection(text)
    })

    // ── Keydown handler ────────────────────────────────────────────────────

    dom.editorDiv.addEventListener('keydown', (e: KeyboardEvent) => {
      trackVerticalMove(e)

      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const page = state.getCurrentPage()
        if (buffers.undo(page) !== null) {
          render.render(true)
          saveDebounced()
        }
        return
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        const page = state.getCurrentPage()
        if (buffers.redo(page) !== null) {
          render.render(true)
          saveDebounced()
        }
        return
      }

      // Ctrl+Y — redo (Windows alternative)
      if (e.ctrlKey && !e.shiftKey && e.key === 'y') {
        e.preventDefault()
        const page = state.getCurrentPage()
        if (buffers.redo(page) !== null) {
          render.render(true)
          saveDebounced()
        }
        return
      }

      // ── Editing keymap ──────────────────────────────────────────────
      // Line/word/format ops and Ctrl+S. Consumed events never reach plugin
      // dispatch or the plain-key fallbacks below.
      if (keymap.handle(e)) return

      // ── Plugin keydown dispatch ─────────────────────────────────────
      // Give content plugins first crack at keyboard events so they can
      // implement custom behaviors (list indentation, etc.).
      // First plugin to return { cursorOffset } wins.
      {
        const context: EditorContext = {
          navigate: (p: string) => {
            void navigation.navigateToPage(p)
          },
          getTrail: () => state.getTrail(),
          getCurrentPage: () => state.getCurrentPage(),
          getWorld: () => buffers.getWorld(),
          getPageText: (p: string) => buffers.getPageText(p),
          setPageText: (p: string, content: string) => buffers.setPageText(p, content),
        }
        context.renderInline = (text: string): DocumentFragment => {
          return renderInlineContent(text, contentPlugins, context)
        }

        for (const plugin of contentPlugins) {
          if (!plugin.onKeydown) continue
          const result = plugin.onKeydown(e, context)
          if (result !== undefined && result !== false && 'cursorOffset' in result) {
            e.preventDefault()
            render.render(true, result.cursorOffset)

            saveDebounced()
            return
          }
        }
      }

      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        insertTextAtSelection('  ')
      } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        insertTextAtSelection('\n')
      } else if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        deleteAtCaret(-1)
      }
    })

    // ── Range-selection edits through the model ─────────────────────────
    // Typing over / deleting a NON-collapsed selection is computed on the
    // buffer: the browser's own version removes the text but keeps the
    // emptied div[data-line] shells (the deleted lines come back as blank
    // lines), and a range cutting into a data-raw token span loses the edit
    // outright. Collapsed carets keep the native fast path (spellcheck,
    // autocorrect); composition and spellcheck replacements
    // (insertReplacementText targets its own range) are never intercepted.

    const RANGE_EDITS: Record<string, string> = {
      insertParagraph: '\n',
      insertLineBreak: '\n',
      deleteContent: '',
      deleteContentBackward: '',
      deleteContentForward: '',
      deleteWordBackward: '',
      deleteWordForward: '',
      deleteSoftLineBackward: '',
      deleteSoftLineForward: '',
      deleteHardLineBackward: '',
      deleteHardLineForward: '',
      deleteByCut: '',
    }

    dom.editorDiv.addEventListener('beforeinput', (e: InputEvent) => {
      if (e.isComposing || state.isNavigating()) return
      const insert = e.inputType === 'insertText' ? e.data : RANGE_EDITS[e.inputType]
      if (insert === undefined || insert === null) return
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount || sel.isCollapsed) return
      // Unmappable (reaches outside the editor): refuse rather than let the
      // browser mutate DOM the buffer cannot account for.
      e.preventDefault()
      insertTextAtSelection(insert)
    })

    // ── Selection change — re-render when cursor moves to a different line ──
    // Mouse-freeze guard: while the primary button is down, line activation
    // waits. Rebuilding the DOM at drag start (the collapsed mousedown caret
    // moves lines) detaches the browser's drag anchor — the selection dies
    // or snaps to one line. One check runs at mouseup instead.

    let pointerSelecting = false
    let selectChangePending = false

    const scheduleSelectCheck = (): void => {
      if (selectChangePending) return
      selectChangePending = true
      requestAnimationFrame(() => {
        selectChangePending = false
        const moved = pendingVertical
        pendingVertical = false
        if (render.checkSelectChange() && moved) restoreGoalColumn()
      })
    }

    document.addEventListener('selectionchange', () => {
      if (handlingInput || pointerSelecting || state.isNavigating()) return
      scheduleSelectCheck()
    })

    dom.editorDiv.addEventListener('mousedown', (e: MouseEvent) => {
      goalX = null
      if (e.button === 0 && !e.defaultPrevented) pointerSelecting = true
    })

    const endPointerSelect = (): void => {
      if (!pointerSelecting) return
      pointerSelecting = false
      if (!state.isNavigating()) scheduleSelectCheck()
    }
    window.addEventListener('mouseup', endPointerSelect)
    window.addEventListener('blur', endPointerSelect)

    // ── Vertical goal column ─────────────────────────────────────────────
    // The browser remembers the caret's x across ArrowUp/Down, but a line-
    // activation rebuild re-places the caret programmatically and resets
    // that memory — across ragged lines the caret would drift left for good.
    // Keep the x of the first vertical move and re-apply it on each line the
    // chain lands on; any other key or a click ends the chain.

    let goalX: number | null = null
    let pendingVertical = false

    function trackVerticalMove(e: KeyboardEvent): void {
      const vertical =
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      if (!vertical) {
        goalX = null
        pendingVertical = false
        return
      }
      goalX ??= caretRect()?.left ?? null
      pendingVertical = goalX !== null
    }

    function caretRect(): DOMRect | null {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return null
      const range = sel.getRangeAt(0)
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect()
      return rect.height > 0 ? rect : null
    }

    function restoreGoalColumn(): void {
      const rect = caretRect()
      const sel = window.getSelection()
      if (goalX === null || !rect || !sel?.focusNode) return
      const line = (
        sel.focusNode instanceof Element ? sel.focusNode : sel.focusNode.parentElement
      )?.closest('[data-line]')
      const pos = caretPositionAt(goalX, rect.top + rect.height / 2)
      if (!line || !pos || !line.contains(pos.node)) return
      sel.collapse(pos.node, pos.offset)
    }

    function caretPositionAt(x: number, y: number): { node: Node; offset: number } | null {
      if (typeof document.caretPositionFromPoint === 'function') {
        const p = document.caretPositionFromPoint(x, y)
        return p ? { node: p.offsetNode, offset: p.offset } : null
      }
      if (typeof document.caretRangeFromPoint === 'function') {
        const r = document.caretRangeFromPoint(x, y)
        return r ? { node: r.startContainer, offset: r.startOffset } : null
      }
      return null
    }

    // ── Load initial page ──────────────────────────────────────────────────

    const initialPage = state.getCurrentPage()

    await navigation.loadPage(initialPage)

    // ── Mount UI plugins ───────────────────────────────────────────────────

    const slotElements: Record<string, HTMLElement> = {
      'wn-header': dom.header,
      'wn-toolbar': dom.toolbar,
      'wn-overlay': dom.overlay,
      'wn-left-sidepanel': dom.leftSidepanel,
      'wn-right-sidepanel': dom.rightSidepanel,
      'wn-footer': dom.footer,
    }
    for (const plugin of uiPlugins) {
      for (const slot of plugin.slots) {
        const el = slotElements[slot]
        if (el) {
          plugin.onMount(el)
        }
      }
    }

    // ── Formatting toolbar (first in the wn-toolbar row) ───────────────────

    const toolbar = createEditorToolbar({
      host: dom.toolbar,
      editorEl: dom.editorDiv,
      defs: contentPlugins.flatMap((p) => p.tokens),
      getCurrentPage: () => state.getCurrentPage(),
      pageExists: (page) => buffers.hasPage(page),
      getPageText: (page) => buffers.getPageText(page),
      format: (action) => keymap.format(action),
    })

    // ── Link state: re-class links in place when existence answers arrive ──

    const existence = options.pageExists
    const stopExistenceSync = existence?.onChange(() => syncLinkExistence(dom.editorDiv, existence))
    // Crumb labels: repaint when stored-title answers arrive.
    const stopTitleSync = options.pageTitles?.onChange(() => render.refreshTitles())

    // ── Public instance ────────────────────────────────────────────────────

    return {
      destroy() {
        stopExistenceSync?.()
        toolbar.destroy()
        stopTitleSync?.()
        state.clearSaveTimer()
        notifications.destroy()
        for (const plugin of contentPlugins) {
          try {
            plugin.onDestroy?.()
          } catch (e) {
            console.error(`Plugin "${plugin.name}" onDestroy failed:`, e)
          }
        }
        for (const plugin of uiPlugins) {
          try {
            plugin.onDestroy?.()
          } catch (e) {
            console.error(`UI plugin "${plugin.name}" onDestroy failed:`, e)
          }
        }
        dom.container.innerHTML = ''
      },

      navigate(page: string): void {
        void navigation.navigateToPage(page)
      },

      getCurrentPage(): string {
        return state.getCurrentPage()
      },

      getTrail(): string[] {
        return state.getTrail()
      },

      getContent(): string {
        const page = state.getCurrentPage()
        return buffers.getPageText(page)
      },

      setContent(content: string): void {
        const page = state.getCurrentPage()
        buffers.setPageText(page, content)
        render.render(true)
      },

      undo(): boolean {
        const page = state.getCurrentPage()
        if (buffers.undo(page) === null) return false
        render.render(true)
        saveDebounced()
        return true
      },

      redo(): boolean {
        const page = state.getCurrentPage()
        if (buffers.redo(page) === null) return false
        render.render(true)
        saveDebounced()
        return true
      },

      canUndo(): boolean {
        return buffers.canUndo(state.getCurrentPage())
      },

      canRedo(): boolean {
        return buffers.canRedo(state.getCurrentPage())
      },

      insertText(text: string): void {
        insertTextAtSelection(text)
      },

      deleteForward(): void {
        deleteAtCaret(1)
      },

      deleteBackward(): void {
        deleteAtCaret(-1)
      },

      getSelection(): { text: string; start: number; end: number } | null {
        // Raw-offset selection via the two-ended map (replaces the old
        // start + DOM-string-length math, which was wrong for multi-line and
        // data-raw token spans); null when unmappable, like tryGetLineOffset.
        const off = getSelectionOffsets(dom.editorDiv)
        if (!off) return null
        const page = state.getCurrentPage()
        const raw = buffers.getPageText(page)
        return { text: raw.slice(off.start, off.end), start: off.start, end: off.end }
      },

      notify(opts: ToastOptions): string {
        return notifications.notify(opts)
      },

      dismiss(toastId: string): void {
        notifications.dismiss(toastId)
      },

      pageMoved(from: string, to: string): void {
        mover.pageMoved(from, to)
      },

      beginMovePage(): void {
        render.openMoveField()
      },
    }
  }

  return { mount }
}

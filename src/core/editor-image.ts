// ─── Photo insertion (paste / drop / picker) ─────────────────────────────────
// Core never touches the network: the host supplies an `ImageUploader`
// (client: convert to PNG + POST). This module decides WHEN a gesture is an
// image upload (clipboard rule), guards where an image may land, and commits
// `![alt](url)` through the model commit path (one undo step per image,
// autosave scheduled) once the upload settles.

import { getSelectionOffsets, selectionInBlock } from './caret-offset'
import { commitModelEdit, type ModelCommitDeps } from './editor-commit'
import type { ImageUploader, ToastOptions } from './types'

/** Images accepted per paste/drop/pick gesture; extras are skipped with a notice. */
export const MAX_IMAGES_PER_GESTURE = 10

/** Names clipboards invent for pasted images; useless as alt text. */
const GENERIC_NAMES: Readonly<Record<string, true>> = {
  '': true,
  image: true,
  blob: true,
  photo: true,
}

/** Alt text for an inserted image: the filename without its extension, made
 *  safe for the `![alt](…)` grammar (`[^\]]*`), `photo` when nothing useful. */
export function imageAltFromFilename(name: string): string {
  const base = name.replace(/\.[^./\\]*$/, '')
  const alt = base.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim()
  return GENERIC_NAMES[alt.toLowerCase()] === true ? 'photo' : alt
}

export function imageMarkdown(alt: string, url: string): string {
  return `![${alt}](${url})`
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/** What the paste handler reads from a ClipboardEvent's `clipboardData`. */
export interface ClipboardLike {
  types: readonly string[]
  files: ArrayLike<File>
  items?: ArrayLike<{ kind: string; type: string; getAsFile(): File | null }>
}

/**
 * Image files a paste should upload, or [] when the paste is a text paste.
 *
 * Image wins UNLESS the clipboard carries both `text/plain` and `text/html`:
 * Word/Excel/rich-text copies attach a rendered PNG next to real text and the
 * text must keep winning. This still covers screenshots (image only), a
 * browser's "Copy image" (html + image, no plain text) and file-manager
 * copies (plain filename + file, no html). `files` is read first; some
 * browsers only expose pasted images through `items`.
 */
export function clipboardImageFiles(data: ClipboardLike | null | undefined): File[] {
  if (!data) return []
  if (data.types.includes('text/plain') && data.types.includes('text/html')) return []

  const fromFiles = Array.from(data.files).filter(isImageFile)
  if (fromFiles.length > 0) return fromFiles

  const fromItems: File[] = []
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) fromItems.push(file)
  }
  return fromItems
}

/** Best-effort: put the caret where a file was dropped. False when the
 *  browser cannot resolve the point or it is outside the editor. */
export function placeCaretAtPoint(editorEl: HTMLElement, x: number, y: number): boolean {
  let node: Node | null = null
  let offset = 0
  if (typeof document.caretPositionFromPoint === 'function') {
    const pos = document.caretPositionFromPoint(x, y)
    if (pos) {
      node = pos.offsetNode
      offset = pos.offset
    }
  } else if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y)
    if (range) {
      node = range.startContainer
      offset = range.startOffset
    }
  }
  if (!node || !editorEl.contains(node)) return false
  window.getSelection()?.collapse(node, offset)
  return true
}

export interface ImageInsertContext {
  upload: ImageUploader
  commit: ModelCommitDeps
  notify(options: ToastOptions): string
  dismiss(toastId: string): void
}

/** `![alt](src)` takes src as `[^)\s]+`; anything else would not parse back. */
const SAFE_URL = /^[^)\s]+$/

/**
 * Upload `files` one after another and insert each as `![name](url)` at the
 * caret (start of the selection, nothing is deleted), later images on their
 * own line. Refuses up front inside fenced code/tables; stops when the page
 * changes or the caret enters a block while uploads are in flight (the
 * uploaded row stays in storage; the toast names its URL).
 */
export async function insertImages(files: readonly File[], ctx: ImageInsertContext): Promise<void> {
  if (files.length === 0) return
  const { commit, notify, dismiss } = ctx
  const page = commit.getCurrentPage()
  if (!commit.pageExists(page)) return

  if (selectionInBlock(commit.editorEl)) {
    notify({ message: 'Images cannot be inserted inside code or a table', type: 'error' })
    return
  }

  const batch = files.slice(0, MAX_IMAGES_PER_GESTURE)
  if (files.length > batch.length) {
    notify({
      message: `Only the first ${MAX_IMAGES_PER_GESTURE} images were uploaded`,
      type: 'warning',
    })
  }

  // Offset to fall back on when the DOM selection is unmappable at completion
  // (the editor lost focus to a file dialog).
  const start = getSelectionOffsets(commit.editorEl)
  let fallback = start ? start.start : commit.getPageText(page).length

  const canInsert = (): boolean =>
    commit.getCurrentPage() === page &&
    commit.pageExists(page) &&
    !selectionInBlock(commit.editorEl)

  let inserted = 0
  for (const file of batch) {
    if (inserted > 0 && !canInsert()) {
      notify({
        message: 'Stopped uploading: the caret moved somewhere images cannot go',
        type: 'warning',
      })
      return
    }

    const progress = notify({ message: `Uploading ${file.name || 'photo'}...`, duration: 0 })
    let url: string
    try {
      url = (await ctx.upload(file)).url
      if (!SAFE_URL.test(url)) throw new Error('Upload failed: unexpected response')
    } catch (e) {
      dismiss(progress)
      notify({ message: e instanceof Error ? e.message : 'Upload failed', type: 'error' })
      continue
    }
    dismiss(progress)

    if (!canInsert()) {
      notify({ message: `Uploaded ${url} but could not insert it`, type: 'warning' })
      return
    }

    const raw = commit.getPageText(page)
    const sel = getSelectionOffsets(commit.editorEl)
    const at = Math.min(sel ? sel.start : fallback, raw.length)
    const text = (inserted > 0 ? '\n' : '') + imageMarkdown(imageAltFromFilename(file.name), url)
    const caret = at + text.length
    commitModelEdit(commit, page, {
      text: raw.slice(0, at) + text + raw.slice(at),
      start: caret,
      end: caret,
    })
    fallback = caret
    inserted++
  }
}

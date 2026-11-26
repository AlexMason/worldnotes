// @vitest-environment happy-dom

// ─── Photo paste / drop / insertImages on a real editor mount ───────────────
// The uploader is a fake; conversion and HTTP are covered in the client tests.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createEditor } from '../editor'
import { createMemoryPageStore } from '../memory-page-store'
import { setSelectionOffsets } from '../caret-offset'
import type { ImageUploader } from '../types'

const png = (name = 'shot.png') => new File(['x'], name, { type: 'image/png' })

async function mount(opts: { content?: string; uploader?: ImageUploader | null } = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const store = createMemoryPageStore({ home: opts.content ?? 'hello world', other: 'elsewhere' })
  const save = vi.spyOn(store, 'save')
  const uploader =
    opts.uploader === null ? undefined : (opts.uploader ?? vi.fn(async () => ({ url: '/media/9' })))
  const instance = await createEditor(container, {
    pageStore: store,
    saveDebounceMs: 20,
    initialPage: 'home',
    imageUploader: uploader,
  }).mount()
  const editorDiv = container.querySelector('.wn-editor') as HTMLElement
  return { instance, editorDiv, uploader, save }
}

function pasteFiles(
  el: HTMLElement,
  files: File[],
  types: string[] = ['Files'],
  text: Record<string, string> = {},
): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { types, files, getData: (t: string) => text[t] ?? '' },
  })
  el.dispatchEvent(event)
  return event
}

function dropFiles(el: HTMLElement, files: File[]): Event {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } })
  el.dispatchEvent(event)
  return event
}

const toasts = () =>
  Array.from(document.querySelectorAll('.wn-toast__message')).map((n) => n.textContent)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('image paste', () => {
  it('uploads and inserts ![name](url) at the caret as one undo step, then autosaves', async () => {
    const { instance, editorDiv, uploader, save } = await mount()
    setSelectionOffsets(editorDiv, 5, 5)

    const event = pasteFiles(editorDiv, [png('shot.png')])
    expect(event.defaultPrevented).toBe(true)

    await vi.waitFor(() => expect(instance.getContent()).toBe('hello![shot](/media/9) world'))
    expect(uploader).toHaveBeenCalledTimes(1)
    expect(instance.getSelection()).toMatchObject({ start: 22, end: 22 })

    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(save).toHaveBeenLastCalledWith('home', 'hello![shot](/media/9) world')

    expect(instance.undo()).toBe(true)
    expect(instance.getContent()).toBe('hello world')
  })

  it('clipboard images named "image.png" get the alt text "photo"', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 0, 0)
    pasteFiles(editorDiv, [png('image.png')])
    await vi.waitFor(() => expect(instance.getContent()).toBe('![photo](/media/9)hello world'))
  })

  it('leaves a Word/Excel-style paste (plain + html + image) to the text path', async () => {
    const { instance, editorDiv, uploader } = await mount()
    setSelectionOffsets(editorDiv, 5, 5)
    pasteFiles(editorDiv, [png()], ['text/plain', 'text/html', 'Files'], {
      'text/plain': ' TEXT',
      'text/html': '<b>TEXT</b>',
    })
    expect(instance.getContent()).toBe('hello TEXT world')
    expect(uploader).not.toHaveBeenCalled()
  })

  it('a text-only paste is unchanged when an uploader is configured', async () => {
    const { instance, editorDiv, uploader } = await mount()
    setSelectionOffsets(editorDiv, 0, 0)
    pasteFiles(editorDiv, [], ['text/plain'], { 'text/plain': 'abc ' })
    expect(instance.getContent()).toBe('abc hello world')
    expect(uploader).not.toHaveBeenCalled()
  })

  it('does nothing for an image paste when no uploader is configured', async () => {
    const { instance, editorDiv } = await mount({ uploader: null })
    setSelectionOffsets(editorDiv, 5, 5)
    pasteFiles(editorDiv, [png()])
    expect(instance.getContent()).toBe('hello world')
    expect(toasts()).toEqual([])
  })

  it('inserts at the START of a selection and keeps the selected text', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 6, 11) // "world"
    pasteFiles(editorDiv, [png()])
    await vi.waitFor(() => expect(instance.getContent()).toBe('hello ![shot](/media/9)world'))
  })

  it('uploads several files in order, each later one on its own line', async () => {
    const calls: string[] = []
    const uploader: ImageUploader = async (f) => {
      calls.push(f.name)
      return { url: `/media/${calls.length}` }
    }
    const { instance, editorDiv } = await mount({ content: '', uploader })
    setSelectionOffsets(editorDiv, 0, 0)
    pasteFiles(editorDiv, [png('a.png'), png('b.png'), png('c.png')])
    await vi.waitFor(() =>
      expect(instance.getContent()).toBe('![a](/media/1)\n![b](/media/2)\n![c](/media/3)'),
    )
    expect(calls).toEqual(['a.png', 'b.png', 'c.png'])
  })

  it('uploads at most 10 images per gesture and says so', async () => {
    const uploader = vi.fn(async () => ({ url: '/media/1' }))
    const { instance, editorDiv } = await mount({ content: '', uploader })
    setSelectionOffsets(editorDiv, 0, 0)
    pasteFiles(
      editorDiv,
      Array.from({ length: 12 }, (_, i) => png(`p${i}.png`)),
    )
    // The notice is raised synchronously, before the first upload settles
    // (later "Uploading…" toasts evict it from the 5-toast stack).
    expect(toasts()).toContain('Only the first 10 images were uploaded')
    await vi.waitFor(() => expect(uploader).toHaveBeenCalledTimes(10))
    await vi.waitFor(() => expect(instance.getContent().split('\n')).toHaveLength(10))
  })

  it('refuses before uploading when the caret is inside a fenced block', async () => {
    const { instance, editorDiv, uploader } = await mount({ content: '```\ncode\n```' })
    setSelectionOffsets(editorDiv, 6, 6) // inside "code"
    pasteFiles(editorDiv, [png()])
    await vi.waitFor(() =>
      expect(toasts()).toContain('Images cannot be inserted inside code or a table'),
    )
    expect(uploader).not.toHaveBeenCalled()
    expect(instance.getContent()).toBe('```\ncode\n```')
  })

  it('shows the uploader error and leaves the page untouched', async () => {
    const uploader: ImageUploader = async () => {
      throw new Error('file exceeds the upload size limit (15 MiB)')
    }
    const { instance, editorDiv } = await mount({ uploader })
    setSelectionOffsets(editorDiv, 5, 5)
    pasteFiles(editorDiv, [png()])
    await vi.waitFor(() =>
      expect(toasts()).toContain('file exceeds the upload size limit (15 MiB)'),
    )
    expect(instance.getContent()).toBe('hello world')
    await vi.waitFor(() => expect(toasts().some((t) => t?.startsWith('Uploading'))).toBe(false))
  })

  it('does not insert a url that would break the image grammar', async () => {
    const uploader: ImageUploader = async () => ({ url: '/media/1) injected(' })
    const { instance, editorDiv } = await mount({ uploader })
    setSelectionOffsets(editorDiv, 5, 5)
    pasteFiles(editorDiv, [png()])
    await vi.waitFor(() => expect(toasts()).toContain('Upload failed: unexpected response'))
    expect(instance.getContent()).toBe('hello world')
  })

  it('does not insert into another page when the user navigated away mid-upload', async () => {
    let finish!: (v: { url: string }) => void
    const uploader: ImageUploader = () => new Promise((resolve) => (finish = resolve))
    const { instance, editorDiv } = await mount({ uploader })
    setSelectionOffsets(editorDiv, 5, 5)
    pasteFiles(editorDiv, [png()])
    await vi.waitFor(() => expect(toasts()).toContain('Uploading shot.png...'))

    await instance.navigate('other')
    expect(instance.getCurrentPage()).toBe('other')
    finish({ url: '/media/42' })

    await vi.waitFor(() => expect(toasts()).toContain('Uploaded /media/42 but could not insert it'))
    expect(instance.getContent()).toBe('elsewhere')
  })
})

describe('image drop', () => {
  it('uploads dropped images and prevents the browser default', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 11, 11)
    const event = dropFiles(editorDiv, [png('pic.png')])
    expect(event.defaultPrevented).toBe(true)
    await vi.waitFor(() => expect(instance.getContent()).toBe('hello world![pic](/media/9)'))
  })

  it('skips non-image files in a mixed drop with a notice', async () => {
    const { instance, editorDiv, uploader } = await mount()
    setSelectionOffsets(editorDiv, 0, 0)
    dropFiles(editorDiv, [
      new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }),
      png('pic.png'),
    ])
    await vi.waitFor(() => expect(instance.getContent()).toContain('![pic](/media/9)'))
    expect(uploader).toHaveBeenCalledTimes(1)
    expect(toasts()).toContain('Skipped files that are not images')
  })

  it('leaves a drop with no images to the browser', async () => {
    const { uploader, editorDiv } = await mount()
    const event = dropFiles(editorDiv, [new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' })])
    expect(event.defaultPrevented).toBe(false)
    expect(uploader).not.toHaveBeenCalled()
  })

  it('makes the editor a drop target for files only when an uploader exists', async () => {
    const withUploader = await mount()
    const over = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(over, 'dataTransfer', { value: { types: ['Files'], files: [] } })
    withUploader.editorDiv.dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)

    const textDrag = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(textDrag, 'dataTransfer', { value: { types: ['text/plain'], files: [] } })
    withUploader.editorDiv.dispatchEvent(textDrag)
    expect(textDrag.defaultPrevented).toBe(false)
    document.body.innerHTML = ''

    const without = await mount({ uploader: null })
    const over2 = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(over2, 'dataTransfer', { value: { types: ['Files'], files: [] } })
    without.editorDiv.dispatchEvent(over2)
    expect(over2.defaultPrevented).toBe(false)
  })
})

describe('instance.insertImages (picker path)', () => {
  it('inserts at the caret like a paste', async () => {
    const { instance, editorDiv } = await mount()
    setSelectionOffsets(editorDiv, 5, 5)
    await instance.insertImages([png('pick.png')])
    expect(instance.getContent()).toBe('hello![pick](/media/9) world')
  })

  it('tells the user when no uploader is configured', async () => {
    const { instance } = await mount({ uploader: null })
    await instance.insertImages([png()])
    expect(toasts()).toContain('Image upload is not available')
    expect(instance.getContent()).toBe('hello world')
  })
})

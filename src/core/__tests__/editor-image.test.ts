import { describe, it, expect } from 'vitest'
import {
  clipboardImageFiles,
  imageAltFromFilename,
  imageMarkdown,
  isImageFile,
  type ClipboardLike,
} from '../editor-image'

const png = new File(['x'], 'shot.png', { type: 'image/png' })
const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

const clip = (over: Partial<ClipboardLike> & { types: string[] }): ClipboardLike => ({
  files: [],
  ...over,
})

describe('imageAltFromFilename', () => {
  it.each([
    ['IMG_1234.JPG', 'IMG_1234'],
    ['holiday photo.png', 'holiday photo'],
    ['a.b.c.webp', 'a.b.c'],
    ['no-extension', 'no-extension'],
    ['[evil](x).png', 'evil(x)'],
    ['multi\nline  name.png', 'multi line name'],
    ['日本語.png', '日本語'],
    ['.hidden', 'photo'],
  ])('%s -> %s', (name, alt) => {
    expect(imageAltFromFilename(name)).toBe(alt)
  })

  it.each(['image.png', 'Image.PNG', 'blob', 'blob.png', '', '   .png', 'photo.jpg'])(
    'generic or empty name %j falls back to "photo"',
    (name) => {
      expect(imageAltFromFilename(name)).toBe('photo')
    },
  )

  it('never yields characters that would break the ![alt](src) grammar', () => {
    const alt = imageAltFromFilename('[a]\n[b].png')
    expect(alt).not.toMatch(/[\]\n]/)
  })
})

describe('imageMarkdown / isImageFile', () => {
  it('builds the image token', () => {
    expect(imageMarkdown('shot', '/media/7')).toBe('![shot](/media/7)')
  })

  it('isImageFile goes by the file type', () => {
    expect(isImageFile(png)).toBe(true)
    expect(isImageFile(pdf)).toBe(false)
    expect(isImageFile(new File(['x'], 'x', { type: '' }))).toBe(false)
  })
})

describe('clipboardImageFiles', () => {
  it('returns [] without clipboard data', () => {
    expect(clipboardImageFiles(null)).toEqual([])
    expect(clipboardImageFiles(undefined)).toEqual([])
  })

  it('screenshot: image file only -> image', () => {
    expect(clipboardImageFiles(clip({ types: ['Files'], files: [png] }))).toEqual([png])
  })

  it('browser "Copy image": html + image, no plain text -> image', () => {
    expect(clipboardImageFiles(clip({ types: ['text/html', 'Files'], files: [png] }))).toEqual([
      png,
    ])
  })

  it('file manager copy: plain filename + file, no html -> image', () => {
    expect(clipboardImageFiles(clip({ types: ['text/plain', 'Files'], files: [png] }))).toEqual([
      png,
    ])
  })

  it('Word/Excel: plain + html + rendered image -> text wins (no files)', () => {
    expect(
      clipboardImageFiles(clip({ types: ['text/plain', 'text/html', 'Files'], files: [png] })),
    ).toEqual([])
  })

  it('plain text only -> []', () => {
    expect(clipboardImageFiles(clip({ types: ['text/plain'] }))).toEqual([])
  })

  it('ignores non-image files', () => {
    expect(clipboardImageFiles(clip({ types: ['Files'], files: [pdf] }))).toEqual([])
    expect(clipboardImageFiles(clip({ types: ['Files'], files: [pdf, png] }))).toEqual([png])
  })

  it('falls back to items when files is empty', () => {
    const items = [
      { kind: 'string', type: 'text/uri-list', getAsFile: () => null },
      { kind: 'file', type: 'image/png', getAsFile: () => png },
      { kind: 'file', type: 'application/pdf', getAsFile: () => pdf },
      { kind: 'file', type: 'image/gif', getAsFile: () => null },
    ]
    expect(clipboardImageFiles(clip({ types: ['Files'], items }))).toEqual([png])
  })

  it('prefers files over items (no duplicates)', () => {
    const items = [{ kind: 'file', type: 'image/png', getAsFile: () => png }]
    expect(clipboardImageFiles(clip({ types: ['Files'], files: [png], items }))).toEqual([png])
  })
})

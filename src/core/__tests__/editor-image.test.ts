import { describe, it, expect } from 'vitest'
import {
  clipboardImageFiles,
  clipboardImages,
  gifUrlFromClipboardHtml,
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

describe('gifUrlFromClipboardHtml', () => {
  const GIF = 'https://media0.giphy.com/media/v1.Y2lk/abc/giphy.gif?cid=1&ep=v1'
  it.each([
    [`<meta charset='utf-8'><img src="${GIF}">`, GIF],
    ['<img src="https://tenor.com/x/y.GIF">', 'https://tenor.com/x/y.GIF'],
    ['<img src="https://a.test/p/anim.gif#frag">', 'https://a.test/p/anim.gif#frag'],
    [`<p>caption</p><img alt="x" src='${GIF}' width=3><img src="https://a.test/second.gif">`, GIF],
  ])('finds the animated source in %s', (html, url) => {
    expect(gifUrlFromClipboardHtml(html)).toBe(url)
  })

  it.each([
    ['', 'empty'],
    ['<p>no image here</p>', 'no img'],
    ['<img src="https://example.com/photo.png">', 'not a .gif path'],
    ['<img src="https://example.com/giphy.gif.png">', '.gif only mid-name'],
    ['<img src="https://example.com/download?file=a.gif">', '.gif only in the query'],
    ['<img src="http://example.com/a.gif">', 'plain http (mixed content)'],
    ['<img src="/relative/a.gif">', 'relative'],
    ['<img src="data:image/gif;base64,R0lGODlh">', 'data URI'],
    ['<img src="javascript:alert(1).gif">', 'javascript URI'],
    ['<img src="">', 'empty src'],
    ['<img>', 'no src'],
  ])('ignores %s (%s)', (html) => {
    expect(gifUrlFromClipboardHtml(html)).toBeNull()
  })

  it('only looks at the first image', () => {
    expect(
      gifUrlFromClipboardHtml(
        '<img src="https://a.test/first.png"><img src="https://a.test/second.gif">',
      ),
    ).toBeNull()
  })
})

describe('clipboardImages', () => {
  const html = '<img src="https://media.giphy.com/a/giphy.gif">'
  const withHtml = (over: Partial<ClipboardLike> & { types: string[] }) =>
    clip({ getData: (t) => (t === 'text/html' ? html : ''), ...over })

  it('behaves like clipboardImageFiles without originals (the default)', () => {
    const data = withHtml({ types: ['text/html', 'Files'], files: [png] })
    expect(clipboardImages(data)).toEqual([png])
    expect(clipboardImages(clip({ types: ['text/plain'] }))).toEqual([])
    expect(clipboardImages(null)).toEqual([])
  })

  it('Copy image: attaches the GIF url to the single still', () => {
    const data = withHtml({ types: ['text/html', 'Files'], files: [png] })
    expect(clipboardImages(data, true)).toEqual([
      { file: png, originalUrl: 'https://media.giphy.com/a/giphy.gif' },
    ])
  })

  it('a GIF url alone is enough when the clipboard has no still', () => {
    const data = withHtml({ types: ['text/html'] })
    expect(clipboardImages(data, true)).toEqual([
      { file: undefined, originalUrl: 'https://media.giphy.com/a/giphy.gif' },
    ])
  })

  it('keeps the Word/Excel rule: plain + html wins as text even with a gif img', () => {
    const data = withHtml({ types: ['text/plain', 'text/html', 'Files'], files: [png] })
    expect(clipboardImages(data, true)).toEqual([])
  })

  it('ignores the url when several files are pasted', () => {
    const second = new File(['y'], 'b.png', { type: 'image/png' })
    const data = withHtml({ types: ['text/html', 'Files'], files: [png, second] })
    expect(clipboardImages(data, true)).toEqual([png, second])
  })

  it('does nothing special for a non-gif source or an html-less clipboard', () => {
    const data = clip({
      types: ['text/html', 'Files'],
      files: [png],
      getData: () => '<img src="https://a.test/p.png">',
    })
    expect(clipboardImages(data, true)).toEqual([png])
    expect(clipboardImages(clip({ types: ['Files'], files: [png] }), true)).toEqual([png])
  })
})

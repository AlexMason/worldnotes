import type { ContentPlugin, EditorContext } from './types'
import { tokenizeDocument } from './tokenizer'
import { renderLine } from './renderer'

export function renderLines(
  text: string,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  cache: Map<number, string>,
  editorDiv: HTMLElement,
): { lineCount: number; lineLengths: number[] } {
  const lines = tokenizeDocument(
    text,
    contentPlugins.flatMap((p) => p.tokens),
  )
  const lineLengths: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].map((t) => t.raw).join('')
    lineLengths.push(lineText.length)

    if (cache.get(i) === lineText) continue

    cache.set(i, lineText)

    const fragment = renderLine(lines[i], contentPlugins, context)

    let container = editorDiv.querySelector(
      `[data-line="${i}"]`,
    ) as HTMLElement | null
    if (container) {
      container.innerHTML = ''
      if (fragment.childNodes.length) {
        container.appendChild(fragment)
      } else {
        container.appendChild(document.createElement('br'))
      }
    } else {
      container = document.createElement('div')
      container.dataset.line = String(i)
      if (fragment.childNodes.length) {
        container.appendChild(fragment)
      } else {
        container.appendChild(document.createElement('br'))
      }
      editorDiv.appendChild(container)
    }
  }

  // Remove excess line containers beyond current line count
  const allContainers = Array.from(editorDiv.querySelectorAll('[data-line]')) as HTMLElement[]
  for (const el of allContainers) {
    const idx = parseInt(el.dataset.line ?? '-1', 10)
    if (idx >= lines.length || idx < 0) {
      el.remove()
    }
  }

  // Clean stale cache entries beyond current line count
  for (const key of cache.keys()) {
    if (key >= lines.length) cache.delete(key)
  }

  return { lineCount: lines.length, lineLengths }
}

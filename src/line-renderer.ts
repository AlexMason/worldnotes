import type { ContentPlugin, EditorContext } from './types'
import { tokenizeDocument } from './tokenizer'
import { renderLine } from './renderer'

export function renderLines(
  text: string,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  editorDiv: HTMLElement,
  activeLine?: number,
): { lineCount: number; lineLengths: number[] } {
  const lines = tokenizeDocument(
    text,
    contentPlugins.flatMap((p) => p.tokens),
  )
  const lineLengths: number[] = []

  // Build fresh containers for every line
  editorDiv.innerHTML = ''

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].map((t) => t.raw).join('')
    lineLengths.push(lineText.length)

    const container = document.createElement('div')
    container.dataset.line = String(i)

    if (i === activeLine) {
      // Render raw text for the line the user is actively editing
      container.textContent = lineText
      if (!lineText) {
        container.appendChild(document.createElement('br'))
      }
    } else {
      const fragment = renderLine(lines[i], contentPlugins, context)
      if (fragment.childNodes.length) {
        container.appendChild(fragment)
      } else {
        container.appendChild(document.createElement('br'))
      }
    }
    editorDiv.appendChild(container)

    // Add \n text node between lines so textContent naturally
    // includes newline separators
    if (i < lines.length - 1) {
      editorDiv.appendChild(document.createTextNode('\n'))
    }
  }

  return { lineCount: lines.length, lineLengths }
}

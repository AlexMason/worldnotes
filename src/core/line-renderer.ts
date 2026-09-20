// ─── Editor line renderer — DOM twin of renderDocModelToHTML ────────────────
// Consumes the SAME DocModel the static reader consumes (document.ts block
// pass) and emits the SAME tree: per-line div[data-line], block regions
// wrapped in div.{wrapperClass}[data-block] with data-block + lineClass
// mirrored onto each region line div. data-line/<br>/index emission lives
// ONLY here and in static-renderer.ts — block plugins never touch it.

import type { BlockRegion, DocModel, ContentPlugin, EditorContext } from './types'
import { buildDocument } from './document'
import { renderLine } from './renderer'

export interface RenderedLines {
  lineCount: number
  lineLengths: number[]
  /** Regions resolved by the block pass — caller expands cursor-in-block. */
  blocks: BlockRegion[]
}

export function renderLines(
  text: string,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  editorDiv: HTMLElement,
  activeLines?: Set<number>,
): RenderedLines {
  return renderDocLines(
    buildDocument(text, contentPlugins),
    contentPlugins,
    context,
    editorDiv,
    activeLines,
  )
}

/**
 * Render a pre-built DocModel into `editorDiv`. Same output as renderLines;
 * lets editor-render build the document once (to expand the cursor's block
 * region) without paying for a second block pass.
 */
export function renderDocLines(
  doc: DocModel,
  contentPlugins: ContentPlugin[],
  context: EditorContext,
  editorDiv: HTMLElement,
  activeLines?: Set<number>,
): RenderedLines {
  const lineLengths: number[] = []

  // Build fresh containers for every line
  editorDiv.innerHTML = ''

  const owner = new Map<number, BlockRegion>()
  for (const region of doc.blocks) {
    for (let l = region.startLine; l <= region.endLine; l++) owner.set(l, region)
  }

  let wrapper: HTMLElement | null = null
  let openRegion: BlockRegion | null = null

  for (let i = 0; i < doc.lines.length; i++) {
    const region = owner.get(i) ?? null

    if (openRegion && region !== openRegion) {
      wrapper = null
      openRegion = null
    }
    if (region && region !== openRegion) {
      wrapper = document.createElement('div')
      wrapper.className = region.def.wrapperClass
      wrapper.dataset.block = region.type
      editorDiv.appendChild(wrapper)
      openRegion = region
    }

    const lineText = doc.lines[i].map((t) => t.raw).join('')
    lineLengths.push(lineText.length)

    const container = document.createElement('div')
    container.dataset.line = String(i)
    if (region) {
      container.dataset.block = region.type
      const lineClass = region.def.lineClass?.(i, region.state)
      if (lineClass) container.className = lineClass
    }

    if (activeLines?.has(i)) {
      // Render raw text for the line the user is actively editing (and,
      // block-expand, every line of the cursor's region — D3)
      container.textContent = lineText
      if (!lineText) {
        container.appendChild(document.createElement('br'))
      }
    } else {
      const fragment = renderLine(doc.lines[i], contentPlugins, context)
      if (fragment.childNodes.length) {
        container.appendChild(fragment)
      } else {
        container.appendChild(document.createElement('br'))
      }
    }
    ;(wrapper ?? editorDiv).appendChild(container)
  }

  return { lineCount: doc.lines.length, lineLengths, blocks: doc.blocks }
}

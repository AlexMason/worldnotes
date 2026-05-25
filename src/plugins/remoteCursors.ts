import type { UIPlugin } from '../types'

const COLORS = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#8bc34a',
  '#ffeb3b',
  '#ff9800',
  '#ff5722',
]

function colorForClient(clientId: number): string {
  return COLORS[clientId % COLORS.length] ?? '#888'
}

export const remoteCursorsPlugin: UIPlugin = {
  name: 'remote-cursors',
  version: '1.0.0',
  kind: 'ui',
  slots: ['wn-overlay'],
  priority: 0,
  onMount(slotEl: HTMLElement) {
    // The awareness instance is set on the YDocState after mount.
    // We poll for it via a custom event or expose it from the editor instance.
    // For now, render a placeholder; actual binding happens in lifecycle.
    slotEl.style.position = 'absolute'
    slotEl.style.top = '0'
    slotEl.style.left = '0'
    slotEl.style.pointerEvents = 'none'
    slotEl.style.zIndex = '10'
  },
}

/**
 * Render remote cursors in an overlay element based on awareness state.
 *
 * @param overlayEl - The overlay container element
 * @param awareness - Yjs Awareness instance (or null)
 * @param editorDiv - The contentEditable editor (used for coordinate mapping)
 * @param localClientId - The local client's ID to skip rendering self
 */
export function renderRemoteCursors(
  overlayEl: HTMLElement,
  awareness: {
    getStates: () => Map<
      number,
      {
        cursor?: { offset: number; page: string }
        user?: { name: string; color: string }
      }
    >
    clientID: number
  } | null,
  editorDiv: HTMLElement,
  localClientId: number,
): void {
  overlayEl.innerHTML = ''

  if (!awareness) return

  const states = awareness.getStates()

  for (const [clientId, state] of states.entries()) {
    if (clientId === localClientId) continue
    if (!state.cursor) continue

    const color = state.user?.color ?? colorForClient(clientId)
    const name = state.user?.name ?? `User ${clientId}`

    const cursorEl = document.createElement('div')
    cursorEl.className = 'wn-remote-cursor'

    const caretEl = document.createElement('span')
    caretEl.className = 'wn-remote-cursor-caret'
    caretEl.style.backgroundColor = color

    const labelEl = document.createElement('span')
    labelEl.className = 'wn-remote-cursor-label'
    labelEl.style.backgroundColor = color
    labelEl.textContent = name

    cursorEl.appendChild(caretEl)
    cursorEl.appendChild(labelEl)

    // Position cursor based on offset
    const pos = offsetToPixelPosition(editorDiv, state.cursor.offset)
    if (pos) {
      cursorEl.style.left = `${pos.left}px`
      cursorEl.style.top = `${pos.top}px`
    }

    overlayEl.appendChild(cursorEl)
  }
}

/**
 * Convert a raw-text character offset to pixel coordinates
 * within the editor div.
 */
function offsetToPixelPosition(
  editorDiv: HTMLElement,
  offset: number,
): { left: number; top: number } | null {
  let remaining = offset

  const allLines = Array.from(
    editorDiv.querySelectorAll('[data-line]'),
  ) as HTMLElement[]
  allLines.sort((a, b) => {
    return (
      parseInt(a.dataset.line ?? '0', 10) -
      parseInt(b.dataset.line ?? '0', 10)
    )
  })

  for (const lineEl of allLines) {
    const lineLen = (lineEl.textContent ?? '').length

    if (remaining <= lineLen) {
      // Found the line — estimate position using first text node
      const rect = lineEl.getBoundingClientRect()
      return {
        left: rect.left + (remaining * 8), // rough char-width estimate
        top: rect.top,
      }
    }

    remaining -= lineLen + 1 // +1 for newline
  }

  // End of document
  const lastLine = allLines[allLines.length - 1]
  if (lastLine) {
    const rect = lastLine.getBoundingClientRect()
    return {
      left: rect.left + (lastLine.textContent ?? '').length * 8,
      top: rect.top,
    }
  }

  return null
}

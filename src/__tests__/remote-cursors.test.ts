import { describe, it, expect } from 'vitest'
import { renderRemoteCursors, remoteCursorsPlugin } from '../plugins/remoteCursors'

describe('remoteCursorsPlugin', () => {
  it('is a valid UI plugin with name and version', () => {
    expect(remoteCursorsPlugin.name).toBe('remote-cursors')
    expect(remoteCursorsPlugin.version).toBe('1.0.0')
    expect(remoteCursorsPlugin.kind).toBe('ui')
  })

  it('claims the wn-overlay slot', () => {
    expect(remoteCursorsPlugin.slots).toContain('wn-overlay')
  })

  it('onMount sets up the overlay element', () => {
    const el = document.createElement('div')
    remoteCursorsPlugin.onMount(el)
    expect(el.style.position).toBe('absolute')
    expect(el.style.top).toBe('0px')
    expect(el.style.pointerEvents).toBe('none')
  })
})

describe('renderRemoteCursors', () => {
  it('clears overlay when awareness is null', () => {
    const overlay = document.createElement('div')
    overlay.innerHTML = '<span>old</span>'
    renderRemoteCursors(overlay, null, document.createElement('div'), 1)
    expect(overlay.innerHTML).toBe('')
  })

  it('renders remote cursors from awareness state', () => {
    const overlay = document.createElement('div')
    const editorDiv = document.createElement('div')

    // Create a mock line container for position calculation
    const lineEl = document.createElement('div')
    lineEl.dataset.line = '0'
    lineEl.textContent = 'hello world'
    editorDiv.appendChild(lineEl)

    // Mock getBoundingClientRect
    lineEl.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 200,
      bottom: 40,
      width: 190,
      height: 20,
      x: 10,
      y: 20,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    })

    const mockAwareness = {
      clientID: 1,
      getStates: () =>
        new Map([
          [2, { cursor: { offset: 3, page: 'home' }, user: { name: 'Alice', color: '#ff0000' } }],
        ]),
    }

    renderRemoteCursors(
      overlay,
      mockAwareness as Parameters<typeof renderRemoteCursors>[1],
      editorDiv,
      1,
    )

    const cursors = overlay.querySelectorAll('.wn-remote-cursor')
    expect(cursors.length).toBe(1)

    const label = overlay.querySelector('.wn-remote-cursor-label')
    expect(label?.textContent).toBe('Alice')
    expect((label as HTMLElement)?.style.backgroundColor).toBe('#ff0000')
  })

  it('skips the local client cursor', () => {
    const overlay = document.createElement('div')
    const editorDiv = document.createElement('div')
    const lineEl = document.createElement('div')
    lineEl.dataset.line = '0'
    lineEl.textContent = 'hello world'
    lineEl.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 200,
      bottom: 40,
      width: 190,
      height: 20,
      x: 10,
      y: 20,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    })
    editorDiv.appendChild(lineEl)

    const mockAwareness = {
      clientID: 1,
      getStates: () =>
        new Map([
          [1, { cursor: { offset: 3, page: 'home' } }], // local client
          [2, { cursor: { offset: 5, page: 'home' }, user: { name: 'Bob', color: '#00ff00' } }],
        ]),
    }

    renderRemoteCursors(
      overlay,
      mockAwareness as Parameters<typeof renderRemoteCursors>[1],
      editorDiv,
      1,
    )

    // Only Bob's cursor should render, not local client 1
    const labels = overlay.querySelectorAll('.wn-remote-cursor-label')
    expect(labels.length).toBe(1)
    expect(labels[0]?.textContent).toBe('Bob')
  })

  it('renders default color for users without color set', () => {
    const overlay = document.createElement('div')
    const editorDiv = document.createElement('div')
    const lineEl = document.createElement('div')
    lineEl.dataset.line = '0'
    lineEl.textContent = 'hello world'
    lineEl.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 200,
      bottom: 40,
      width: 190,
      height: 20,
      x: 10,
      y: 20,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    })
    editorDiv.appendChild(lineEl)

    const mockAwareness = {
      clientID: 1,
      getStates: () =>
        new Map([[3, { cursor: { offset: 1, page: 'home' } }]]),
    }

    renderRemoteCursors(
      overlay,
      mockAwareness as Parameters<typeof renderRemoteCursors>[1],
      editorDiv,
      1,
    )

    const carets = overlay.querySelectorAll('.wn-remote-cursor-caret')
    expect(carets.length).toBe(1)
    // Should have some background color set
    expect((carets[0] as HTMLElement).style.backgroundColor).toBeTruthy()
  })

  it('skips awareness entries without cursor data', () => {
    const overlay = document.createElement('div')
    const editorDiv = document.createElement('div')
    const lineEl = document.createElement('div')
    lineEl.dataset.line = '0'
    lineEl.textContent = 'hello world'
    lineEl.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 200,
      bottom: 40,
      width: 190,
      height: 20,
      x: 10,
      y: 20,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    })
    editorDiv.appendChild(lineEl)

    const mockAwareness = {
      clientID: 1,
      getStates: () =>
        new Map([
          [2, { user: { name: 'NoCursor', color: '#ff0000' } }],
          [3, { cursor: { offset: 0, page: 'home' }, user: { name: 'HasCursor', color: '#0000ff' } }],
        ]),
    }

    renderRemoteCursors(
      overlay,
      mockAwareness as Parameters<typeof renderRemoteCursors>[1],
      editorDiv,
      1,
    )

    const labels = overlay.querySelectorAll('.wn-remote-cursor-label')
    expect(labels.length).toBe(1)
    expect(labels[0]?.textContent).toBe('HasCursor')
  })

  it('handles cursor offset beyond text length (end of document)', () => {
    const overlay = document.createElement('div')
    const editorDiv = document.createElement('div')
    const lineEl = document.createElement('div')
    lineEl.dataset.line = '0'
    lineEl.textContent = 'ab'
    lineEl.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 30,
      bottom: 40,
      width: 20,
      height: 20,
      x: 10,
      y: 20,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    })
    editorDiv.appendChild(lineEl)

    const mockAwareness = {
      clientID: 1,
      getStates: () =>
        new Map([[2, { cursor: { offset: 100, page: 'home' }, user: { name: 'FarAway', color: '#ff0000' } }]]),
    }

    renderRemoteCursors(
      overlay,
      mockAwareness as Parameters<typeof renderRemoteCursors>[1],
      editorDiv,
      1,
    )

    const cursors = overlay.querySelectorAll('.wn-remote-cursor')
    expect(cursors.length).toBe(1)
  })

  it('shows fallback name for users without name', () => {
    const overlay = document.createElement('div')
    const editorDiv = document.createElement('div')
    const lineEl = document.createElement('div')
    lineEl.dataset.line = '0'
    lineEl.textContent = 'hello'
    lineEl.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 200,
      bottom: 40,
      width: 190,
      height: 20,
      x: 10,
      y: 20,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => {},
    })
    editorDiv.appendChild(lineEl)

    const mockAwareness = {
      clientID: 1,
      getStates: () =>
        new Map([[5, { cursor: { offset: 1, page: 'home' } }]]),
    }

    renderRemoteCursors(
      overlay,
      mockAwareness as Parameters<typeof renderRemoteCursors>[1],
      editorDiv,
      1,
    )

    const label = overlay.querySelector('.wn-remote-cursor-label')
    expect(label?.textContent).toBe('User 5')
  })
})

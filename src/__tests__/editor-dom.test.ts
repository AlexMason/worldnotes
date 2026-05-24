// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { createEditorDOM } from '../editor-dom'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInjectedStyle(): HTMLStyleElement | null {
  return document.querySelector('#worldnotes-styles')
}

function getStyleText(): string {
  const style = getInjectedStyle()
  return style?.textContent ?? ''
}

// ─── Design tokens (Task 1) ────────────────────────────────────────────────────

describe('DEFAULT_TOKENS (--wn-* CSS custom properties)', () => {
  let container: HTMLElement

  beforeEach(() => {
    // Clean up any previously-injected style from other tests
    const existing = document.getElementById('worldnotes-styles')
    if (existing) existing.remove()

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('injects CSS that defines --wn-color-bg token scoped to .wn-root', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('.wn-root')
    expect(text).toContain('--wn-color-bg')
  })

  it('injects CSS that defines color tokens (surface, fg, accent, border)', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('--wn-color-surface')
    expect(text).toContain('--wn-color-fg')
    expect(text).toContain('--wn-color-accent')
    expect(text).toContain('--wn-color-border')
  })

  it('injects CSS that defines heading color tokens (h1, h2, h3)', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('--wn-color-heading-h1')
    expect(text).toContain('--wn-color-heading-h2')
    expect(text).toContain('--wn-color-heading-h3')
  })

  it('injects CSS that defines typography tokens', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('--wn-font-family')
    expect(text).toContain('--wn-font-mono')
    expect(text).toContain('--wn-font-size-body')
    expect(text).toContain('--wn-line-height')
  })

  it('injects CSS that defines spacing tokens', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('--wn-padding-editor-y')
    expect(text).toContain('--wn-padding-editor-x')
    expect(text).toContain('--wn-padding-topbar-y')
    expect(text).toContain('--wn-padding-topbar-x')
  })

  it('injects CSS that defines radius tokens', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('--wn-radius-crumb')
    expect(text).toContain('--wn-radius-code')
    expect(text).toContain('--wn-radius-wiki-link')
  })

  it('injects CSS that defines misc tokens (caret, bold weight)', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('--wn-caret-color')
    expect(text).toContain('--wn-font-weight-bold')
  })

  it('DEFAULT_TOKENS groups tokens by category with comment headers', () => {
    createEditorDOM(container)
    const text = getStyleText()

    // Category comment headers should exist in the token section
    expect(text).toMatch(/Colors/i)
    expect(text).toMatch(/Typography/i)
    expect(text).toMatch(/Spacing/i)
    expect(text).toMatch(/Radii/i)
  })
})

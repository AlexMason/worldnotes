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

// ─── Token-driven stylesheet (Task 2) ──────────────────────────────────────────

describe('DEFAULT_CSS (var(--wn-*) references)', () => {
  let container: HTMLElement

  beforeEach(() => {
    const existing = document.getElementById('worldnotes-styles')
    if (existing) existing.remove()

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('uses var(--wn-color-bg) for .wn-root background', () => {
    createEditorDOM(container)
    const text = getStyleText()

    // var() usage (not just token definition)
    expect(text).toContain('var(--wn-color-bg')
  })

  it('uses var() references for typography values on .wn-editor', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-font-mono')
    expect(text).toContain('var(--wn-font-size-body')
    expect(text).toContain('var(--wn-line-height')
  })

  it('uses var() references for heading font sizes', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-font-size-h1')
    expect(text).toContain('var(--wn-font-size-h2')
    expect(text).toContain('var(--wn-font-size-h3')
  })

  it('uses var() references for spacing on .wn-editor-wrap', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-padding-editor-y')
    expect(text).toContain('var(--wn-padding-editor-x')
  })

  it('uses var() references for color properties on headings', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-color-heading-h1')
    expect(text).toContain('var(--wn-color-heading-h2')
    expect(text).toContain('var(--wn-color-heading-h3')
  })

  it('uses var() references for wiki link colors', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-color-wiki-link')
    expect(text).toContain('var(--wn-color-wiki-link-bg')
  })

  it('uses var(--wn-caret-color) on .wn-editor', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-caret-color')
  })

  it('uses var(--wn-transition-color) for transitions', () => {
    createEditorDOM(container)
    const text = getStyleText()

    expect(text).toContain('var(--wn-transition-color')
    expect(text).toContain('var(--wn-transition-bg')
  })

  it('preserves all wn-* class selectors unchanged', () => {
    createEditorDOM(container)
    const text = getStyleText()

    // All existing class selectors must remain
    expect(text).toContain('.wn-root')
    expect(text).toContain('.wn-topbar')
    expect(text).toContain('.wn-breadcrumb')
    expect(text).toContain('.wn-crumb')
    expect(text).toContain('.wn-crumb--active')
    expect(text).toContain('.wn-crumb-sep')
    expect(text).toContain('.wn-editor-wrap')
    expect(text).toContain('.wn-editor')
    expect(text).toContain('.wn-placeholder')
    expect(text).toContain('.wn-punct')
    expect(text).toContain('.wn-h1')
    expect(text).toContain('.wn-h2')
    expect(text).toContain('.wn-h3')
    expect(text).toContain('.wn-bold')
    expect(text).toContain('.wn-italic')
    expect(text).toContain('.wn-inline-code')
    expect(text).toContain('.wn-code-text')
    expect(text).toContain('.wn-blockquote')
    expect(text).toContain('.wn-hr')
    expect(text).toContain('.wn-wiki-link')
    expect(text).toContain('.wn-strikethrough')
    expect(text).toContain('.wn-link')
  })
})

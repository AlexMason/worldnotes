// ─── Image plugin — ![alt](src) ──────────────────────────────────────────────
// Inline token. BOTH surfaces render the same tree (single renderer):
// punct-fidelity spans (the source `![`, `](`, `)` stay as real text nodes,
// dimmed like every other marker) followed by the actual <img>.
//
// WHY punct-fidelity instead of the wiki-link `data-raw` pattern: a
// `data-raw` span whose DOM text is empty (img-only) breaks caret mapping
// (findTextInNode cannot land an offset inside zero text — the model offset
// and the visible caret desync, making the next Backspace destructive).
// With DOM text == raw source, every existing text-node path works
// untouched and this token needs NO data-raw at all — image fidelity rides
// on the same rule every other punct marker uses.
// The reader hides the punctuation through `.wn-article`-scoped CSS — a
// sanctioned display divergence (see docs/theming.md; parity compares trees,
// not computed styles).

import type { ContentPlugin, Token, EditorContext, StaticRenderContext } from '../types'
import { escapeHTML, escapeAttr } from '../escape'
import { isSafeImageUrl } from '../../shared/url-policy'

/**
 * Build the rendered children for a safe image token.
 * `emitImg` receives (src, alt) already in surface form (attribute-escaped
 * string / plain DOM attributes).
 */
function imageParts(token: Token): {
  punct1: string
  alt: string
  punct2: string
  src: string
  punct3: string
} {
  return {
    punct1: '![',
    alt: token.groups[0] ?? '',
    punct2: '](',
    src: token.groups[1] ?? '',
    punct3: ')',
  }
}

export const imagePlugin: ContentPlugin = {
  name: 'image',
  version: '1.0.0',
  kind: 'content',

  // src excludes whitespace and ')' — mirrors the link plugin's minimal
  // grammar (titles are on the shared degradation list). Registered BEFORE
  // linkPlugin in defaults so the leading `!` binds first at scan index 0.
  tokens: [{ type: 'image', pattern: /!\[([^\]]*)\]\(([^)\s]+)\)/ }],

  render(token: Token, _context: EditorContext): HTMLElement | Text {
    if (!isSafeImageUrl(token.groups[1] ?? '')) {
      // Unsafe src → the whole token stays visible literal source (link.ts
      // precedent), identical on both surfaces.
      return document.createTextNode(token.raw)
    }

    const parts = imageParts(token)
    const wrap = document.createElement('span')
    wrap.className = 'wn-image'

    const punct = (t: string) => {
      const s = document.createElement('span')
      s.className = 'wn-punct'
      s.textContent = t
      return s
    }
    const textSpan = (cls: string, t: string) => {
      const s = document.createElement('span')
      s.className = cls
      s.textContent = t
      return s
    }

    wrap.appendChild(punct(parts.punct1))
    wrap.appendChild(textSpan('wn-image-alt', parts.alt))
    wrap.appendChild(punct(parts.punct2))
    wrap.appendChild(textSpan('wn-image-src', parts.src))
    wrap.appendChild(punct(parts.punct3))

    const img = document.createElement('img')
    img.className = 'wn-image-img'
    img.setAttribute('src', parts.src)
    img.setAttribute('alt', parts.alt)
    img.setAttribute('loading', 'lazy')
    img.setAttribute('referrerpolicy', 'no-referrer')
    wrap.appendChild(img)

    return wrap
  },

  renderToHTML(token: Token, _context: StaticRenderContext): string {
    if (!isSafeImageUrl(token.groups[1] ?? '')) {
      return escapeHTML(token.raw)
    }

    const parts = imageParts(token)
    return (
      `<span class="wn-image">` +
      `<span class="wn-punct">${escapeHTML(parts.punct1)}</span>` +
      `<span class="wn-image-alt">${escapeHTML(parts.alt)}</span>` +
      `<span class="wn-punct">${escapeHTML(parts.punct2)}</span>` +
      `<span class="wn-image-src">${escapeHTML(parts.src)}</span>` +
      `<span class="wn-punct">${escapeHTML(parts.punct3)}</span>` +
      `<img class="wn-image-img" src="${escapeAttr(parts.src)}" alt="${escapeAttr(parts.alt)}"` +
      ` loading="lazy" referrerpolicy="no-referrer">` +
      `</span>`
    )
  },
}

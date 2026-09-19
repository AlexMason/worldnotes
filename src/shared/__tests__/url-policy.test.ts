// ─── URL scheme policy ───────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { isSafeHref, isSafeImageUrl } from '../url-policy'

describe('isSafeHref (url policy)', () => {
  it.each([
    ['https://ok.test/x', true],
    ['http://ok.test', true],
    ['mailto:a@b.c', true],
    ['/relative/path', true],
    ['blog/post', true],
    ['javascript:alert(1)', false],
    ['JaVaScRiPt:alert(1)', false],
    ['data:text/html,<script>', false],
    ['vbscript:x', false],
    ['//evil.test/x', false],
    ['', false],
  ])('%s → %s', (url, safe) => {
    expect(isSafeHref(url)).toBe(safe)
  })

  it('rejects backslash origin-escape forms (prefix tests miss these)', () => {
    // WHATWG treats `\` as `/` for special-scheme resolution: `\evil.com\x`
    // becomes http://evil.com/x in browsers. Proven:
    //   new URL('\\evil.com\x.png', 'http://wn.invalid/').href
    //   → 'http://evil.com/x.png'
    expect(isSafeHref('\\evil.com\\x')).toBe(false)
    expect(isSafeHref('//evil.com\\x')).toBe(false)
    expect(isSafeHref('\\\\\\\\evil.com')).toBe(false)
  })
})

describe('isSafeImageUrl (narrower contract)', () => {
  it.each([
    ['https://ok.test/a.png', true],
    ['http://ok.test/a.png', true],
    ['/assets/a.png', true],
    ['diagram.png', true],
    ['a/b.png?ver=2#x', true],
    // nonsense or dangerous for src — must stay literal:
    ['mailto:a@b.c', false],
    ['data:image/svg+xml,<svg/>', false],
    ['data:text/html,<script>alert(1)</script>', false],
    ['javascript:alert(1)', false],
    ['vbscript:x', false],
    ['//evil.test/x.png', false],
    ['\\evil.com\\x.png', false],
    ['', false],
    ['   ', false],
  ])('%s → %s', (url, safe) => {
    expect(isSafeImageUrl(url)).toBe(safe)
  })
})

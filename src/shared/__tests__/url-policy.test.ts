// ─── URL scheme policy ───────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { isSafeHref } from '../url-policy'

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
})

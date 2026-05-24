import { describe, it, expect } from 'vitest'
import { tokenizeLine, tokenizeDocument } from '../tokenizer'
import type { TokenDef } from '../types'

// ─── Test token definitions (mirror built-in plugins) ────────────────────────

const headingDefs: TokenDef[] = [
  { type: 'h1', pattern: /^# (.*)$/ },
  { type: 'h2', pattern: /^## (.*)$/ },
  { type: 'h3', pattern: /^### (.*)$/ },
]

const inlineDefs: TokenDef[] = [
  { type: 'wiki-link', pattern: /\[\[([^\]]+)\]\]/ },
  { type: 'link', pattern: /\[([^\]]+)\]\(([^)]+)\)/ },
  { type: 'bold', pattern: /\*\*([^*]+)\*\*/ },
  { type: 'italic', pattern: /\*([^*]+)\*/ },
  { type: 'strikethrough', pattern: /~~([^~]+)~~/ },
  { type: 'inline-code', pattern: /`([^`]+)`/ },
  { type: 'blockquote', pattern: /^(> )(.*)$/ },
  { type: 'hr', pattern: /^---+$/ },
]

// All defs together — line-level defs tested first
const allDefs: TokenDef[] = [...headingDefs, ...inlineDefs]

// ─── tokenizeLine — Line-Level Patterns ──────────────────────────────────────

describe('tokenizeLine', () => {
  describe('line-level patterns', () => {
    it('matches h1 heading (# Title)', () => {
      const result = tokenizeLine('# Title', allDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('h1')
      expect(result[0].raw).toBe('# Title')
      expect(result[0].groups).toEqual(['Title'])
    })

    it('matches h2 heading (## Section)', () => {
      const result = tokenizeLine('## Section', allDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('h2')
      expect(result[0].raw).toBe('## Section')
      expect(result[0].groups).toEqual(['Section'])
    })

    it('matches h3 heading (### Subsection)', () => {
      const result = tokenizeLine('### Subsection', allDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('h3')
      expect(result[0].raw).toBe('### Subsection')
      expect(result[0].groups).toEqual(['Subsection'])
    })

    it('matches blockquote (> quote)', () => {
      const result = tokenizeLine('> quote', allDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('blockquote')
      expect(result[0].raw).toBe('> quote')
      expect(result[0].groups).toEqual(['> ', 'quote'])
    })

    it('matches horizontal rule (---)', () => {
      const result = tokenizeLine('---', allDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('hr')
      expect(result[0].raw).toBe('---')
      expect(result[0].groups).toEqual([])
    })

    it('line-level pattern takes priority over inline patterns', () => {
      // "# **bold**" should match as h1, consuming the whole line before
      // inline scanning ever sees the bold markers
      const result = tokenizeLine('# **bold**', allDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('h1')
      expect(result[0].raw).toBe('# **bold**')
      expect(result[0].groups).toEqual(['**bold**'])
    })
  })

  // ─── tokenizeLine — Inline Patterns ────────────────────────────────────────

  describe('inline patterns', () => {
    it('matches bold (**text**) with correct token shape', () => {
      const result = tokenizeLine('**text**', inlineDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('bold')
      expect(result[0].raw).toBe('**text**')
      expect(result[0].groups).toEqual(['text'])
    })

    it('matches italic (*text*) with correct token shape', () => {
      const result = tokenizeLine('*text*', inlineDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('italic')
      expect(result[0].raw).toBe('*text*')
      expect(result[0].groups).toEqual(['text'])
    })

    it('matches inline code (`code`) with correct token shape', () => {
      const result = tokenizeLine('`code`', inlineDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('inline-code')
      expect(result[0].raw).toBe('`code`')
      expect(result[0].groups).toEqual(['code'])
    })

    it('matches wiki link ([[page]]) with correct token shape', () => {
      const result = tokenizeLine('[[page]]', inlineDefs)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('wiki-link')
      expect(result[0].raw).toBe('[[page]]')
      expect(result[0].groups).toEqual(['page'])
    })

    it('tokenizes mixed text and inline tokens on one line', () => {
      const result = tokenizeLine('hello **world** end', inlineDefs)
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('text')
      expect(result[0].raw).toBe('hello ')
      expect(result[1].type).toBe('bold')
      expect(result[1].raw).toBe('**world**')
      expect(result[1].groups).toEqual(['world'])
      expect(result[2].type).toBe('text')
      expect(result[2].raw).toBe(' end')
    })

    it('scans left-to-right, earliest match wins', () => {
      const result = tokenizeLine('**bold** and *italic*', inlineDefs)
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('bold')
      expect(result[0].raw).toBe('**bold**')
      expect(result[1].type).toBe('text')
      expect(result[1].raw).toBe(' and ')
      expect(result[2].type).toBe('italic')
      expect(result[2].raw).toBe('*italic*')
    })
  })
})

// ─── tokenizeLine — Edge Cases ───────────────────────────────────────────────

describe('tokenizeLine edge cases', () => {
  it('returns empty array for empty string input', () => {
    const result = tokenizeLine('', allDefs)
    expect(result).toEqual([])
  })

  it('returns single text token for plain text with no pattern matches', () => {
    const result = tokenizeLine('just text', allDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('text')
    expect(result[0].raw).toBe('just text')
    expect(result[0].groups).toEqual(['just text'])
  })

  it('treats all input as text when token defs array is empty', () => {
    const result = tokenizeLine('**bold** and `code`', [])
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('text')
    expect(result[0].raw).toBe('**bold** and `code`')
  })

  it('treats unclosed bold marker as plain text', () => {
    // "**text" — no closing **, pattern fails to match
    const result = tokenizeLine('**text', inlineDefs)
    // No inline pattern matches, falls through to text
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('text')
    expect(result[0].raw).toBe('**text')
  })

  it('bold matches before italic when both could match', () => {
    // "***bold-italic***" — bold at index 1 wins over italic at index 2.
    // The leading and trailing lone '*' chars become text tokens since
    // no inline pattern matches a single '*'.
    const result = tokenizeLine('***bold-italic***', inlineDefs)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('text')
    expect(result[0].raw).toBe('*')
    expect(result[1].type).toBe('bold')
    expect(result[1].raw).toBe('**bold-italic**')
    expect(result[1].groups).toEqual(['bold-italic'])
    expect(result[2].type).toBe('text')
    expect(result[2].raw).toBe('*')
  })
})

// ─── Strikethrough Tokenization ───────────────────────────────────────────────

describe('strikethrough tokenization', () => {
  it('matches strikethrough pattern with correct token shape', () => {
    const result = tokenizeLine('~~deleted text~~', inlineDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('strikethrough')
    expect(result[0].raw).toBe('~~deleted text~~')
    expect(result[0].groups).toEqual(['deleted text'])
  })

  it('does not match single tilde ~text~', () => {
    const result = tokenizeLine('~not strikethrough~', inlineDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('text')
  })

  it('does not match triple tilde ~~~', () => {
    const result = tokenizeLine('~~~', inlineDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('text')
  })

  it('tokenizes strikethrough inline with surrounding text', () => {
    const result = tokenizeLine('keep ~~remove~~ done', inlineDefs)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('text')
    expect(result[0].raw).toBe('keep ')
    expect(result[1].type).toBe('strikethrough')
    expect(result[1].raw).toBe('~~remove~~')
    expect(result[2].type).toBe('text')
    expect(result[2].raw).toBe(' done')
  })
})

// ─── Link Tokenization ────────────────────────────────────────────────────────

describe('link tokenization', () => {
  it('matches external link pattern with correct token shape', () => {
    const result = tokenizeLine('[Example](https://example.com)', inlineDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('link')
    expect(result[0].raw).toBe('[Example](https://example.com)')
    expect(result[0].groups).toEqual(['Example', 'https://example.com'])
  })

  it('matches internal page link pattern', () => {
    const result = tokenizeLine('[Projects](projects/acme)', inlineDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('link')
    expect(result[0].raw).toBe('[Projects](projects/acme)')
    expect(result[0].groups).toEqual(['Projects', 'projects/acme'])
  })

  it('wiki-link pattern takes priority over link pattern for [[page]]', () => {
    // Per Pitfall 1: [[page]] must match wiki-link, not link
    const result = tokenizeLine('[[projects/acme]]', inlineDefs)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('wiki-link')
    expect(result[0].raw).toBe('[[projects/acme]]')
  })

  it('tokenizes link inline with surrounding text', () => {
    const result = tokenizeLine('see [docs](https://docs.example.com) for more', inlineDefs)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('text')
    expect(result[1].type).toBe('link')
    expect(result[1].raw).toBe('[docs](https://docs.example.com)')
    expect(result[2].type).toBe('text')
  })
})

// ─── tokenizeDocument ────────────────────────────────────────────────────────

describe('tokenizeDocument', () => {
  it('returns single-element array for a one-line document', () => {
    const result = tokenizeDocument('# Title', allDefs)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
    expect(result[0][0].type).toBe('h1')
  })

  it('tokenizes each line independently in a multi-line document', () => {
    const result = tokenizeDocument('# Title\ncontent', allDefs)
    expect(result).toHaveLength(2)
    // Line 1: heading
    expect(result[0]).toHaveLength(1)
    expect(result[0][0].type).toBe('h1')
    expect(result[0][0].raw).toBe('# Title')
    // Line 2: plain text
    expect(result[1]).toHaveLength(1)
    expect(result[1][0].type).toBe('text')
    expect(result[1][0].raw).toBe('content')
  })

  it('returns empty-line array for empty document string', () => {
    const result = tokenizeDocument('', allDefs)
    // ''.split('\n') → [''], tokenizeLine('') → []
    expect(result).toEqual([[]])
  })
})

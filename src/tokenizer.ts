import type { Token, TokenDef } from './types'

/**
 * A plain-text token representing a literal run of text with no special meaning.
 *
 * @param raw - The literal text content
 */
function textToken(raw: string): Token {
  return { type: 'text', raw, groups: [raw] }
}

/**
 * Tokenize a single line of raw text using the provided token definitions.
 *
 * Scans left-to-right, always consuming the earliest match. Unmatched
 * text between/before/after matches is emitted as 'text' tokens.
 * Line-level definitions (headings, blockquotes, hr) are tested first
 * before falling back to inline scanning.
 *
 * @param line    - A single line of raw markdown text (no newline character)
 * @param defs    - All registered TokenDef entries from loaded plugins
 * @returns       - Ordered array of Tokens for this line
 */
export function tokenizeLine(line: string, defs: TokenDef[]): Token[] {
  // Separate line-level patterns (anchored at ^) from inline patterns
  const lineDefs  = defs.filter(d => d.pattern.source.startsWith('^'))
  const inlineDefs = defs.filter(d => !d.pattern.source.startsWith('^'))

  // Test line-level patterns first — they consume the whole line
  for (const def of lineDefs) {
    const m = line.match(def.pattern)
    if (m) {
      return [{ type: def.type, raw: m[0], groups: m.slice(1).map(g => g ?? '') }]
    }
  }

  // Inline scan: find earliest match across all inline defs
  return scanInline(line, inlineDefs)
}

/**
 * Scan a string left-to-right, emitting tokens for the earliest regex match
 * at each position and 'text' tokens for everything in between.
 *
 * @param input - The string to scan
 * @param defs  - Inline-level TokenDef entries (non-anchored patterns)
 * @returns     - Flat ordered array of Token objects
 */
function scanInline(input: string, defs: TokenDef[]): Token[] {
  const tokens: Token[] = []
  let remaining = input

  while (remaining.length > 0) {
    let earliest: { index: number; match: RegExpMatchArray; def: TokenDef } | null = null

    for (const def of defs) {
      const m = remaining.match(def.pattern)
      if (!m || m.index === undefined) continue
      if (earliest === null || m.index < earliest.index) {
        earliest = { index: m.index, match: m, def }
      }
    }

    if (!earliest) {
      // No more tokens — remainder is plain text
      tokens.push(textToken(remaining))
      break
    }

    // Emit any plain text before the match
    if (earliest.index > 0) {
      tokens.push(textToken(remaining.slice(0, earliest.index)))
    }

    tokens.push({
      type: earliest.def.type,
      raw: earliest.match[0],
      groups: earliest.match.slice(1).map(g => g ?? ''),
    })

    remaining = remaining.slice(earliest.index + earliest.match[0].length)
  }

  return tokens
}

/**
 * Tokenize a full multi-line document string into an array of line token arrays.
 * Each inner array represents one line. Newlines are not included in tokens.
 *
 * @param text - Full raw document text
 * @param defs - All registered TokenDef entries
 * @returns    - Array of per-line token arrays
 */
export function tokenizeDocument(text: string, defs: TokenDef[]): Token[][] {
  return text.split('\n').map(line => tokenizeLine(line, defs))
}

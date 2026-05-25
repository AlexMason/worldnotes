import { Token, TokenDef } from './types';
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
export declare function tokenizeLine(line: string, defs: TokenDef[]): Token[];
/**
 * Scan a string left-to-right, emitting tokens for the earliest regex match
 * at each position and 'text' tokens for everything in between.
 *
 * @param input - The string to scan
 * @param defs  - Inline-level TokenDef entries (non-anchored patterns)
 * @returns     - Flat ordered array of Token objects
 */
export declare function scanInline(input: string, defs: TokenDef[]): Token[];
/**
 * Tokenize a full multi-line document string into an array of line token arrays.
 * Each inner array represents one line. Newlines are not included in tokens.
 *
 * @param text - Full raw document text
 * @param defs - All registered TokenDef entries
 * @returns    - Array of per-line token arrays
 */
export declare function tokenizeDocument(text: string, defs: TokenDef[]): Token[][];

import { Token, ContentPlugin, EditorContext } from './types';
/**
 * Build a decorated DOM fragment for a single line of tokens.
 * Each token is handed to the plugin that owns its type; unrecognised
 * tokens (including the built-in 'text' type) fall back to a plain TextNode.
 *
 * @param tokens          - Ordered token array for one line
 * @param contentPlugins  - All registered ContentPlugin instances
 * @param context         - Live EditorContext passed through to plugin renderers
 * @returns               - DocumentFragment containing the rendered line nodes
 */
export declare function renderLine(tokens: Token[], contentPlugins: ContentPlugin[], context: EditorContext, activeOffset?: number): DocumentFragment;
/**
 * Render a full tokenized document (array of per-line token arrays) into
 * an array of DocumentFragments, one per line. The caller is responsible
 * for joining them with <br> elements or block wrappers.
 *
 * @param lines          - Per-line token arrays from the tokenizer
 * @param contentPlugins - All registered ContentPlugin instances
 * @param context        - Live EditorContext
 * @returns              - Array of DocumentFragments, one per source line
 */
export declare function renderDocument(lines: Token[][], contentPlugins: ContentPlugin[], context: EditorContext, activeOffset?: number): DocumentFragment[];
/**
 * Tokenize raw text using only inline-level token definitions and render
 * through the corresponding content plugins. This allows line-level plugins
 * (headings, blockquotes) to render inline markdown within their content.
 *
 * @param text            - Raw text to render as inline markdown
 * @param contentPlugins  - All registered ContentPlugin instances
 * @param context         - EditorContext passed through to plugin renderers
 * @returns               - DocumentFragment containing rendered inline nodes
 */
export declare function renderInlineContent(text: string, contentPlugins: ContentPlugin[], context: EditorContext): DocumentFragment;

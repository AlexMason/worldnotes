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

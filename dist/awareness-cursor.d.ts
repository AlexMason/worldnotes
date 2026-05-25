/**
 * Cursor tracking that understands the [data-line] container structure.
 *
 * Unlike the legacy cursor.ts which walks arbitrary contentEditable DOM,
 * these functions exploit the stable line-container format produced by
 * line-renderer.ts to compute offsets and restore cursors reliably.
 */
export declare function getLineOffset(el: HTMLElement): number;
export declare function setLineOffset(el: HTMLElement, targetOffset: number): void;

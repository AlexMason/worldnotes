/**
 * Cursor tracking that understands the [data-line] container structure
 * AND elements with data-raw attributes (wiki links, rendered tokens).
 *
 * Offsets are ALWAYS in "raw text" space — matching what extractContentText
 * produces and what Y.Text stores.  Elements with data-raw contribute their
 * raw length (e.g. 9 for "[[hello]]") rather than their DOM text length
 * (e.g. 5 for "hello").
 */
/** Raw-text length of one [data-line] container (respects data-raw). */
export declare function rawLineLength(lineEl: HTMLElement): number;
export declare function getLineOffset(el: HTMLElement): number;
export declare function setLineOffset(el: HTMLElement, targetOffset: number): void;

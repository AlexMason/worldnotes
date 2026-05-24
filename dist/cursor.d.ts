/**
 * Get the caret's character offset from the start of a contenteditable element.
 * Walks all text nodes to compute an absolute character position.
 *
 * @param el - The contenteditable root element
 * @returns  - Character offset, or 0 if there is no selection
 */
export declare function getCaretOffset(el: HTMLElement): number;
/**
 * Restore the caret to a specific character offset inside a contenteditable element.
 * Walks text nodes until the offset is consumed, then places the cursor there.
 * Falls back to end-of-element if the offset exceeds total text length.
 *
 * @param el     - The contenteditable root element
 * @param offset - Character offset to restore to
 */
export declare function setCaretOffset(el: HTMLElement, offset: number): void;
/**
 * Extract plain text from a contenteditable element, converting <br> elements
 * back to newline characters. Recursively walks all child nodes.
 *
 * @param el - Any DOM element
 * @returns  - Plain text string with \n for each <br>
 */
export declare function extractText(el: HTMLElement): string;
export declare function getTextOffset(root: Node, targetNode: Node | null, targetOffset: number): {
    text: string;
    offset: number;
};

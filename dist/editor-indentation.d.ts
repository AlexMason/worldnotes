/**
 * Extract the parts of a list-item line.
 * Returns null if the line doesn't match the list-item pattern.
 *
 * Pattern: ^(\s*)([-*+])\s(.*)$
 */
export interface ListItemParts {
    indent: string;
    marker: string;
    content: string;
}
export declare function parseListItem(line: string): ListItemParts | null;
/** Add 2 spaces to the start of a line. */
export declare function indentLine(line: string): string;
/**
 * Remove 2 leading spaces from a line.
 * Returns null if the line has fewer than 2 leading spaces.
 */
export declare function dedentLine(line: string): string | null;
/**
 * Given full document text and a cursor offset, find the line containing
 * the cursor and its positional metadata.
 */
export interface LineOffset {
    lineIndex: number;
    lineStart: number;
    lineText: string;
}
export declare function getLineAtOffset(text: string, offset: number): LineOffset;
/**
 * Replace a single line in a multi-line text string.
 */
export declare function replaceLine(text: string, lineIndex: number, newLine: string): string;
/**
 * Insert text at a specific raw offset within a full document string.
 */
export declare function insertAtOffset(text: string, offset: number, insertion: string): string;

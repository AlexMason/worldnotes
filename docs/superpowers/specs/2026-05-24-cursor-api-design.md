# Cursor API — Programmatic Insert/Delete/Selection

**Date:** 2026-05-24
**Status:** Design approved, pending implementation

## Motivation

The `EditorInstance` exposes `getContent()` and `setContent()` for full-page read/write, but
has no programmatic way to insert or delete text at the current cursor position. This blocks
plugins that need to modify content without taking focus (e.g., toolbar buttons for bold,
italic, link insertion). The internal `insertTextAtSelection` function already exists in
`editor-lifecycle.ts` but is not exposed publicly.

## Design

Add four methods to `EditorInstance`, implemented via DOM-level manipulation (same patterns
as the existing Tab/Enter/paste handlers):

```ts
interface EditorInstance {
  // …existing methods…

  /** Insert text at cursor, replacing any selection. Fires input event for re-render. */
  insertText(text: string): void

  /** Delete one character after the cursor (like Delete key). */
  deleteForward(): void

  /** Delete one character before the cursor (like Backspace key). */
  deleteBackward(): void

  /** Get the current selection range. Returns null if no selection/caret. */
  getSelection(): { text: string; start: number; end: number } | null
}
```

### `insertText(text)`

Expose the existing private `insertTextAtSelection`. DOM-level:
`range.deleteContents()` → `range.insertNode(textNode)` → `setStart`/`collapse` →
dispatch `input` event. The existing render pipeline picks up the `input` event and
re-renders with history tracking and debounced save.

### `deleteForward()` / `deleteBackward()`

Use `Selection.modify('extend', 'forward'|'backward', 'character')` to extend the
current range by one character, then `range.deleteContents()`, dispatch `input`.
If `Selection.modify` is unavailable (some test environments), fall back to
content-level: extract raw text, compute offset, splice the character, set content,
restore cursor.

### `getSelection()`

Combine `window.getSelection().toString()` for the selected text with
`getCaretOffset()` and anchor/focus offset calculations to report `{ text, start, end }`.
Returns `null` when there is no selection or the editor is not focused.

Returns character offsets relative to the raw source text (accounting for `data-raw`
attributes) — same coordinate system as `getCaretOffset()`.

## Render Fix: End-of-file empty line

When the cursor is at the end of text and Enter is pressed, a `\n` is inserted. The
tokenizer produces an empty final line `[""]`, and the renderer produces an empty
`DocumentFragment` for it. Because the fragment has no text nodes or `<br>`, the
browser has no target for arrow-key navigation into that line.

**Fix:** In `editor-render.ts`, when a rendered line fragment is empty, insert a
`<br>` element into it before appending. This gives the contenteditable div a
cursor target for empty final lines.

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `insertText`, `deleteForward`, `deleteBackward`, `getSelection` to `EditorInstance` |
| `src/editor-lifecycle.ts` | Implement four new methods; expose `insertTextAtSelection` publicly |
| `src/editor-render.ts` | Insert `<br>` into empty line fragments |
| `src/__tests__/editor-lifecycle.test.ts` | Add tests for cursor API methods |
| `docs/api.md` | Document new methods |

## Out of Scope

- Multi-character delete (e.g., delete word)
- Range/selection restore utilities
- Content-plugin-specific insertion (e.g., `insertToken`)

## Edge Cases

- **No selection/caret:** `insertText` and delete methods are no-ops.
- **Collapsed selection (just a caret):** `insertText` inserts at caret position;
  delete removes adjacent character. `getSelection` reports text as empty string
  with `start === end`.
- **Range selection:** `insertText` replaces selected text and collapses the
  selection. Delete removes the selected range. `getSelection` reports the full
  selected text.
- **Raw/decorated text:** All offsets are in raw-text coordinates (same as
  `getCaretOffset`/`setCaretOffset`), not visible DOM coordinates. Plugins
  using `data-raw` are handled transparently.
- **History tracking:** All mutations dispatch `input` events, which the existing
  input handler pushes into `EditorHistory` before re-rendering.

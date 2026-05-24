# Undo/Redo Feature Design

**Date:** 2026-05-24
**Status:** Approved

## Overview

Add snapshot-based undo/redo to the editor so users can undo text changes with Ctrl+Z / Cmd+Z and redo with Ctrl+Shift+Z / Cmd+Shift+Z. Each page gets independent history; navigating to a new page clears the history for the destination page.

## Architecture

New module: `src/editor-history.ts` — a standalone `EditorHistory` class with zero dependencies on other editor modules:

```
src/editor-history.ts          ← standalone history manager (pure data, no DOM)
src/editor-lifecycle.ts        ← integration point (keydown handler, input lifecycle)
src/editor-state.ts            ← history is created here alongside other state
src/editor.ts                  ← passes historyDepth option through
```

The history module knows nothing about the editor pipeline. It is a simple stack manager consumed by the lifecycle module.

## Module: `src/editor-history.ts`

### Exports

```ts
export interface EditorHistoryOptions {
  maxDepth: number  // default 50
}

export class EditorHistory {
  constructor(options?: Partial<EditorHistoryOptions>)
  push(content: string): void
  undo(currentContent: string): string | null
  redo(currentContent: string): string | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}
```

### Behavior

**`push(content)`:** Push `content` onto the `undoStack`. Clear the `redoStack` (standard branching semantics — a new edit invalidates any redo future). If `content === undoStack[undoStack.length - 1]`, skip the push (coalescing). If `undoStack.length > maxDepth`, shift the oldest entry.

**`undo(currentContent)`:** Push `currentContent` onto `redoStack`. Pop from `undoStack` and return the popped value. If `undoStack` is empty, return `null`.

**`redo(currentContent)`:** Push `currentContent` onto `undoStack`. Pop from `redoStack` and return the popped value. If `redoStack` is empty, return `null`.

**`clear()`:** Reset both stacks to `[]`. Called on page navigation.

## Integration Points

All integration happens in `src/editor-lifecycle.ts`:

### 1. History snapshot on input

In the `'input'` event handler, before calling `render.render()`:

```ts
history.push(editorDiv.textContent) // capture pre-edit state
```

This covers both native `contentEditable` edits and programmatic insertions via `insertTextAtSelection()` (which dispatches a synthetic `'input'` event).

### 2. Keydown handler for Ctrl+Z / Ctrl+Shift+Z

In the existing `'keydown'` listener (which already handles Tab and Enter):

```
Ctrl+Z (or Cmd+Z on Mac):
  1. editorDiv.blur()
  2. undoContent = history.undo(editorDiv.textContent)
  3. if undoContent !== null: editorDiv.textContent = undoContent; render(); focus; set caret to end
  4. e.preventDefault()

Ctrl+Shift+Z (or Cmd+Shift+Z on Mac):
  1. editorDiv.blur()
  2. redoContent = history.redo(editorDiv.textContent)
  3. if redoContent !== null: editorDiv.textContent = redoContent; render(); focus; set caret to end
  4. e.preventDefault()
```

The `.blur()` / `.focus()` cycle ensures any pending `compositionend` events complete before we manipulate content.

### 3. Clear on navigation

In `loadPage()`, call `history.clear()` after setting the new page content. The history manager does not track cross-page operations.

### 4. Capture on `setContent()`

In the `setContent()` implementation, push the current content to history before replacing it so `setContent()` is undoable.

## State Creation

In `src/editor-state.ts`, add `history: EditorHistory` to the state object returned by `createEditorState()`. Accept `historyDepth` from `EditorOptions` (default 50).

## Public API

Added to the `EditorInstance` interface and the lifecycle's public API return:

```ts
interface EditorInstance {
  // ... existing methods ...
  undo(): boolean    // returns true if an undo was performed
  redo(): boolean    // returns true if a redo was performed
  canUndo(): boolean
  canRedo(): boolean
}
```

## Options

Added to `EditorOptions` in `src/types.ts`:

```ts
interface EditorOptions {
  // ... existing options ...
  historyDepth?: number  // default 50, max undo states per page
}
```

## Edge Cases

- **Navigation:** History clears on `loadPage()`. Each page has independent undo. Undoing across page boundaries is not supported.
- **setContent():** Pushes current content to history before replacing, making it undoable.
- **Empty content:** Undo/redo works fine with empty strings.
- **Rapid typing:** Each `input` event captures a snapshot. The `push` method coalesces duplicate content (e.g., if the user types and immediately backspaces, identical states don't stack).
- **Mac vs. Windows:** The keydown handler checks both `ctrlKey` and `metaKey`.
- **Memory:** At 50 snapshots of a typical markup page (~10KB), memory usage is ~500KB per page. Acceptable.
- **No plugin involvement:** Undo/redo operates before tokenization and rendering, so plugins never see stale intermediate states.

## Testing

### `src/__tests__/editor-history.test.ts`

- `push` adds to undo stack
- `push` coalesces duplicate consecutive content
- `push` clears redo stack
- `push` respects maxDepth (evicts oldest)
- `undo` returns previous state and pushes current to redo
- `undo` returns null when stack is empty
- `redo` returns next state and pushes current to undo
- `redo` returns null when stack is empty
- `clear` resets both stacks
- Full undo-then-redo cycle returns to original state
- Multiple pushes followed by undo then new push (branching): redo stack is cleared

### `src/__tests__/undo-redo-integration.test.ts`

- Ctrl+Z undoes the last change
- Ctrl+Shift+Z redoes an undone change
- Navigation clears history
- setContent is undoable
- canUndo / canRedo reflect stack state
- Max depth is respected under load

## Exports Added to `src/index.ts`

```ts
export { EditorHistory } from './editor-history'
export type { EditorHistoryOptions } from './editor-history'
```

## Documentation

Update `docs/api.md` to document:
- `undo()`, `redo()`, `canUndo()`, `canRedo()` on `EditorInstance`
- `historyDepth` option on `EditorOptions`
- Ctrl+Z / Ctrl+Shift+Z keybindings

# ListItem Plugin Design

## Overview

Add a `listItem` content plugin that tokenizes and renders unordered Markdown
list items (`-`, `*`, `+`). Extend the plugin system with an `onKeydown` hook so
the plugin can handle Tab/Shift+Tab indentation and Enter auto-continuation.

## Requirements

| ID | Requirement |
|----|-------------|
| R1 | Tokenize unordered list items: leading spaces + marker (`-`, `*`, `+`) + space + content |
| R2 | Render list items with dimmed marker punctuation and inline-markdown-aware content |
| R3 | Tab on a list-item line adds 2 spaces of indentation; cursor moves right by 2 |
| R4 | Shift+Tab on a list-item line removes 2 leading spaces; cursor moves left by 2 (clamped at level 0) |
| R5 | Enter at end of a non-empty list item auto-creates a new item at same indent with same marker |
| R6 | Enter on an empty list item removes the marker and exits the list (plain newline) |
| R7 | Indent/dedent preserve the user's chosen marker character |
| R8 | Plugin system gains an `onKeydown` hook so plugins can participate in keyboard dispatch |
| R9 | Render produces `data-raw` attributes for cursor fidelity |
| R10 | Static HTML output via `renderToHTML` mirrors the live DOM |
| R11 | CSS uses `--wn-*` design tokens for theming consistency |

## Plugin System Extension

### `onKeydown` Hook

```typescript
// src/types.ts — add to ContentPlugin interface
onKeydown?(event: KeyboardEvent, context: EditorContext): boolean | void;
```

Signature: receives the raw `KeyboardEvent` and the editor context. Returns:
- `true` — event consumed; stop propagation and prevent default
- `void` / `false` — not handled; continue to next plugin or default behavior

### Dispatch Logic (in `editor-lifecycle.ts` keydown handler)

```
For each content plugin (in registration order):
  if plugin.onKeydown exists:
    call plugin.onKeydown(event, context)
    if returnValue === true:
      return (event consumed)
Fall through to existing Tab/Enter/Backspace/Undo handling
```

The existing Tab handler (inserts 2 spaces) remains as the fallback when no
plugin consumes the event. This keeps backward compatibility for non-list lines.

## Token Definition

```typescript
// Group 1: indent prefix (optional spaces)
// Group 2: marker (-, *, +)
// Group 3: content after marker
{ type: 'list-item', pattern: /^(\s*)([-*+])\s(.*)$/ }
```

A line must have a marker followed by a space. Examples:
- `- milk` → match (group1: `""`, group2: `"-"`, group3: `"milk"`)
- `  * eggs` → match (group1: `"  "`, group2: `"*"`, group3: `"eggs"`)
- `    + butter` → match (group1: `"    "`, group2: `"+"`, group3: `"butter"`)
- `plain text` → no match
- `-` (no space) → no match

## Rendering

### Live DOM (`render`)

```html
<span class="wn-list-item" data-raw="  - milk">
  <span class="wn-list-item-indent" aria-hidden="true">  </span>
  <span class="wn-list-item-marker" aria-hidden="true">- </span>
  <span class="wn-list-item-content"><!-- inline-rendered content --></span>
</span>
```

- `.wn-list-item-indent` contains leading spaces (empty for level 0)
- `.wn-list-item-marker` contains the marker and trailing space, dimmed
- `.wn-list-item-content` contains inline markdown rendered via `context.renderInline()`
- `data-raw` on the outermost element for cursor fidelity

### Static HTML (`renderToHTML`)

Mirrors the live DOM using `withPunctHTML` helpers. Produces equivalent
structure for export/print scenarios.

## Keydown Behavior

### Tab (R3)

Tab operates on the line's indent prefix regardless of cursor position within
the content. Multi-line selections are not handled in the initial implementation
(later enhancement).

```
1. Get current line from Y.Text via cursor offset
2. If line matches list-item pattern:
   a. Prepend "  " (two spaces) at start of line in Y.Text
   b. Move cursor right by 2
   c. Return true (consumed)
3. Fall through to default Tab handler (inserts "  " at cursor)
```

### Shift+Tab (R4)

Like Tab, Shift+Tab operates on the line's indent prefix regardless of cursor
position within the content, and only affects a single line.

```
1. Get current line from Y.Text via cursor offset
2. If line matches list-item pattern AND starts with >= 2 spaces:
   a. Remove 2 leading spaces from start of line in Y.Text
   b. Move cursor left by 2 (clamped to not go before marker)
   c. Return true (consumed)
3. If line matches but has < 2 leading spaces:
   a. Do nothing (already at minimum indent). Return true (consumed, no-op).
4. Not a list item: fall through (currently Shift+Tab does nothing by default)
```

### Enter (R5, R6)

Enter behavior splits the line at the cursor and auto-continues the list item
on the new line. If the cursor is in the middle of content, the text after the
cursor moves to the new line.

```
1. Get current line from Y.Text via cursor offset
2. If line matches list-item pattern:
   a. Get indent prefix, marker, and content
   b. Split content at cursor position: cursorPosInLine = offset - lineStart
      - leftOfCursor = content before cursor
      - rightOfCursor = content after cursor
   c. If the line has non-empty content (leftOfCursor.trim() !== "" or rightOfCursor !== ""):
      - Replace current line: indent + marker + " " + leftOfCursor + "\n" + indent + marker + " " + rightOfCursor
      - Cursor lands after the new marker+space on the new line
   d. If the content IS empty (literally just the marker, e.g. "- "):
      - Replace the current line with "\n" (remove the list item)
      - Cursor lands at start of the new empty line
   e. Return true (consumed)
3. Not a list item: fall through to default Enter handler (inserts "\n")
```

The empty-item check (step d) only triggers when the ENTIRE content after
the marker is empty/whitespace-only — currently just "". If the user types
"- " then Enter immediately without any content, the list exits.

## Indentation Utilities

Add `src/editor-indentation.ts` with pure functions:

```typescript
/** Parse a full document text into lines */
function splitLines(text: string): string[];

/** Given text and cursor offset, return the line index and line text */
function getLineAtOffset(text: string, offset: number): { lineIndex: number; lineStart: number; lineText: string };

/** Indent a line: prepend 2 spaces */
function indentLine(line: string): string;

/** Dedent a line: remove 2 leading spaces if present */
function dedentLine(line: string): string | null; // null if not dedentable

/** Given a list-item line, extract { indent, marker, content } */
function parseListItem(line: string): { indent: string; marker: string; content: string } | null;
```

These are pure/text utilities, not DOM-aware. The plugin's `onKeydown` handler
wires them together with `editor.doc.transact()`.

## CSS / Theming

New CSS classes in `editor-dom.ts`:

```css
.wn-list-item {
  display: block;
  line-height: var(--wn-line-height, 1.6);
}

.wn-list-item-indent {
  white-space: pre;
  color: transparent;
}

.wn-list-item-marker {
  color: var(--wn-punct-color);
  user-select: none;
}

.wn-list-item-content {
  color: var(--wn-text-color);
}
```

Reuses existing `--wn-punct-color` token for the dimmed marker. No new design
tokens needed.

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `onKeydown?` to `ContentPlugin` |
| `src/editor-lifecycle.ts` | Add plugin keydown dispatch loop |
| `src/plugins/listItem.ts` | **New** — listItem content plugin |
| `src/editor-indentation.ts` | **New** — indentation utility functions |
| `src/editor-dom.ts` | Add list-item CSS rules |
| `src/plugins/defaults.ts` | Register `listItemPlugin` in `defaultPlugins` |
| `src/plugins/index.ts` | Re-export `listItemPlugin` |
| `src/__tests__/editor-indentation.test.ts` | **New** — tests for indentation utilities |
| `src/__tests__/listItem.test.ts` | **New** — tests for plugin tokenization, rendering, keydown |

## Testing

### Indentation Utilities

- `parseListItem` returns null for non-list lines
- `parseListItem` extracts indent/marker/content correctly for all three markers
- `indentLine` adds 2 spaces
- `dedentLine` removes 2 spaces; returns null with <2 leading spaces
- `getLineAtOffset` returns correct line for various cursor positions

### Plugin

- Token matches/doesn't match expected inputs
- Render produces correct DOM with `data-raw`
- `renderToHTML` produces correct HTML string
- Enter auto-continues list items
- Enter exits empty list items
- Tab indents list items
- Shift+Tab dedents list items
- Tab/Shift+Tab are no-ops on non-list lines (fall through to defaults)

## Dependencies

None. All behavior is self-contained within the plugin and utility functions
using existing APIs (`Y.Text`, `editor.doc.transact()`, `context.renderInline()`).

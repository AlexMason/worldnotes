# Keyboard Shortcuts

The inline editor (authenticated edit surface) supports VS Code-style
editing shortcuts. The authoritative list lives in
`SHORTCUT_BINDINGS` (`src/core/editor-keymap.ts`) — the in-editor help
overlay renders from it, and this page mirrors it. Ctrl means **Ctrl or
Cmd** throughout; Alt means **Alt/Option**.

## Reference

### Lines

| Keys | Action |
| --- | --- |
| `Alt+↑` / `Alt+↓` | Move the caret line — or every line the selection touches — up/down. The selection follows the block; no-ops at document edges |
| `Ctrl+Shift+D` | Duplicate the selected line(s); the selection lands on the copy |
| `Ctrl+Shift+K` | Delete the selected line(s); the caret lands on the line that replaces them |

### Words

| Keys | Action |
| --- | --- |
| `Ctrl+Backspace` (also `Alt+Backspace`) | Delete the word to the left (line-scoped). Whitespace/punctuation/word classes run independently; at a line start it joins with the previous line; a live selection is simply deleted |
| `Ctrl+←` / `Ctrl+→` (also `Alt+←/→`) | Jump the caret by word. Motion is document-scoped, so it crosses line breaks |
| `Ctrl+Shift+←` / `Ctrl+Shift+→` | Extend/shrink the selection by word (the Alt aliases work too) |

### Formatting

| Keys | Action |
| --- | --- |
| `Ctrl+B` | Toggle `**bold**` around the selection. Collapsed caret: inserts `****` with the caret between. Press again to unwrap |
| `Ctrl+I` | Same for `*italic*` |
| `Ctrl+K` | Wrap the selection as `[selection]()`, with the URL slot selected for type-over. An already-linked selection just gets its URL re-selected |

Formatting chords are inert **inside fenced code and tables** (the key
event is consumed, nothing changes) so markdown markers can never splice
into real code.

### Document

| Keys | Action |
| --- | --- |
| `Ctrl+S` | Save immediately (flushes the debounced autosave; no browser save dialog) |
| `Ctrl+/` | Show / hide the in-editor shortcuts overlay (`Escape` also closes) |

## Behavior notes

- **Undo:** every shortcut that changes text records exactly ONE undo step
  (`Ctrl+Z` reverts the whole line move / wrap in one press). Pure motion
  shortcuts never touch the document or the undo stack.
- **Autosave:** text-changing shortcuts schedule the same debounced save as
  typing — nothing waits for the next keystroke.
- **Word classes:** `[A-Za-z0-9_]` = word characters, whitespace, and
  everything else (punctuation/glyphs) as a third class. Deletion is
  line-scoped (it never eats across a line break except the explicit
  join-at-line-start case); motion is document-scoped.
- **Existing chords unchanged:** `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`
  (undo/redo), `Tab` / `Shift+Tab` (list indent/outdent; plain Tab outside a
  list inserts two spaces) and `Enter` (list continuation) keep working.
  Chords with modifiers on Tab/Enter/Backspace are now routed to the
  shortcuts layer instead of leaking browser defaults.
- **Ctrl+S requires focus in the editor** (the keymap listens on the edit
  surface). The former window-level handler in the client bootstrap was
  removed to avoid double-saving.

## Browser & platform caveats

Verified against browser behavior documentation and public web-app
precedent (not instrumented live — the hard list below is stable):

| Chord | Status |
| --- | --- |
| `Ctrl+S` | Preventable in all major browsers ✓ |
| `Ctrl+B` / `Ctrl+K` / `Ctrl+I` | Reach pages and `preventDefault` wins (Google Docs bold, GitHub command palette, MDN search all rely on this in Firefox AND Chrome). Chrome additionally toggles the bookmark bar with `Ctrl+B` only when focus is NOT in editable content |
| `Ctrl+/` | Not browser-reserved ✓ |
| `Alt+↑/↓` | Not browser-reserved in Firefox/Chrome ✓ |
| `Alt+←/→` | Firefox/Chrome use Alt+←/→ for back/forward navigation; while focus is in the editor the page receives the event and `preventDefault` wins, so the alias only shadows navigation there. `Ctrl+←/→` stays the primary binding |
| `Ctrl+Shift+K` | ⚠️ Firefox registers the Web Console (DevTools) toggle on this chord; depending on DevTools state the page may not see the event, or the console opens alongside the line delete. Chrome/Edge do not reserve it. If it misbehaves in Firefox, unbind it via `devtools.*` keybinding prefs in `about:config` |
| `Ctrl+←/→` on macOS | ⚠️ macOS Mission Control may swallow these; use the `Alt+←/→` alias (Option+arrows) |
| Linux | Some window managers grab `Ctrl+Alt+←/→` (workspace switching); plain `Alt+←/→` is usually free |

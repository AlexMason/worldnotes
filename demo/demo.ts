import { createEditor, createImportExportPlugin, LocalStorageAdapter } from '../src/index'
import type { Token, EditorContext, ContentPlugin } from '../src/types'

// ─── Example custom plugin: @mentions ─────────────────────────────────────────
//
// Demonstrates how to add a new token type without touching the library.
// @username renders as a styled highlight; clicking fires a custom handler.

const mentionPlugin: ContentPlugin = {
  name: 'mention',
  version: "0.0.1",
  kind: "content",
  tokens: [
    {
      type: 'mention',
      // Matches @word — word chars only, stops at whitespace/punctuation
      pattern: /@(\w+)/,
    },
  ],

  render(token: Token, _context: EditorContext): HTMLElement {
    const el = document.createElement('span')
    el.className = 'wn-mention'
    el.textContent = `@${token.groups[0] ?? ''}`
    return el
  },

  onNavigate(token: Token, _context: EditorContext): true {
    console.log(`Mention clicked: @${token.groups[0]}`)
    // Could open a user profile, filter by tag, etc.
    return true
  },
}

// ─── Additional CSS for the mention plugin ────────────────────────────────────

const style = document.createElement('style')
style.textContent = `
  .wn-mention {
    color: #5aa6e8;
    background: #0e1e30;
    border: 0.5px solid #1e3a56;
    padding: 0 4px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.12s;
  }
  .wn-mention:hover { background: #162a40; }
`
document.head.appendChild(style)

// ─── Shared storage adapter (so the import/export plugin can access the same data) ──

const storage = new LocalStorageAdapter()

// ─── Mount ────────────────────────────────────────────────────────────────────

const app = document.getElementById('app')!

const editor = createEditor(app, {
  storage,
  initialPage: 'home',
  saveDebounceMs: 600,
  onTrailChange: (trail) => {
    document.title = trail[trail.length - 1] + ' — WorldNotes'
  },
  onSave: (page, _content) => {
    console.log(`[worldnotes] saved: ${page}`)
  },
})
  .use(mentionPlugin) // add @mention on top of defaults
  .use(createImportExportPlugin({
    storage,
    onImportComplete: () => editor.navigate(editor.getCurrentPage()),
  }))
  .mount()

// Expose on window for console experimentation
;(window as unknown as Record<string, unknown>).editor = editor

import { createEditor } from '../src/index'

// ─── Example custom plugin: @mentions ─────────────────────────────────────────
//
// Demonstrates how to add a new token type without touching the library.
// @username renders as a styled highlight; clicking fires a custom handler.

const mentionPlugin = {
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

  render(token, _context) {
    const el = document.createElement('span')
    el.className = 'wn-mention'
    el.textContent = `@${token.groups[0] ?? ''}`
    return el
  },

  onNavigate(token, _context) {
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

// ─── Mount ────────────────────────────────────────────────────────────────────

const app = document.getElementById('app')

const editor = createEditor(app, {
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
  .mount()

// Expose on window for console experimentation
;(window).editor = editor

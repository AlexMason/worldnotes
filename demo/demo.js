import { createEditor, createImportExportPlugin, LocalStorageAdapter } from '../dist/worldnotes.js'

// ─── Example custom plugin: @mentions ─────────────────────────────────────────

const mentionPlugin = {
  name: 'mention',
  version: "0.0.1",
  kind: "content",
  tokens: [
    {
      type: 'mention',
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

// ─── Shared storage adapter ───────────────────────────────────────────────────

const storage = new LocalStorageAdapter()

// ─── Mount ────────────────────────────────────────────────────────────────────

const app = document.getElementById('app')

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
  .use(mentionPlugin)
  .use(createImportExportPlugin({
    storage,
    onImportComplete: async () => {
      const current = editor.getCurrentPage()
      const content = await storage.get(current)
      if (content !== null) editor.setContent(content)
    },
  }))
  .mount()

;(window).editor = editor

# Feature Research

**Domain:** Inline WYSIWYG Markdown Editor Library with Plugin-Based Extensibility
**Researched:** 2026-05-23
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. Every production editor (TipTap, ProseMirror, Milkdown, Notion, Obsidian) has these.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bold / Italic / Strikethrough** | Universal formatting. Partially exists (`boldPlugin`, `italicPlugin`). Missing strikethrough (`~~...~~`). | LOW | Add `strikethroughPlugin` to `inline.ts`; ~10 lines. |
| **Inline Code** | Every editor has `` `code` ``. Already exists. | — | ✅ Exists. |
| **Headings (H1-H6)** | Foundation of document structure. Already exists (`headingsPlugin`). | — | ✅ Exists. |
| **Blockquotes & Horizontal Rules** | Basic document structure. Already exists (`blockquotePlugin`, `hrPlugin`). | — | ✅ Exists. |
| **URL Links** | `[text](url)` pattern. Does NOT exist. Every competitor has this. | MEDIUM | New plugin: `linkPlugin` detecting `[text](url)`. Navigation-aware (internal vs external). Must handle raw text vs rendered URL — similar `data-raw` pattern as wiki links. |
| **Bulleted & Numbered Lists** | Every editor offers lists. Does NOT exist. TipTap has dedicated `BulletList`/`OrderedList` nodes. Notion has `-` + space trigger. | HIGH | Requires block-level parsing changes. Lists span multiple lines with nesting. Tokenizer currently treats each line independently. Needs: list detection, nesting support, `*`/`-`/`+` and `1.` triggers. Could be MVP-deferred but critically missing. |
| **Undo / Redo** | Users expect Ctrl+Z/Ctrl+Y (or Cmd). Does NOT exist. Every editor (ProseMirror, TipTap, Milkdown) has this via `prosemirror-history`. | MEDIUM | Requires state history tracking. Can implement as a plugin that snapshots content before mutations, or adopt `prosemirror-history` pattern. CAREFUL: `contentEditable` doesn't provide undo natively when re-rendering. |
| **Keyboard Shortcuts** | Cmd+B/I/K for formatting, Tab for indent, Enter for newline. Partially exists (Tab inserts spaces, Enter inserts newline). Missing Cmd+B/I/K for toggling formatting. | MEDIUM | Plugin receiving keyboard events. Observing patterns from TipTap's `addKeyboardShortcuts`. Shortcuts need to insert raw markdown (e.g., `**` around selection) and trigger re-render. |
| **Copy / Paste with Cleanup** | pasting from Word/Google Docs/HTML destroys formatting and injects cruft. TipTap has `PasteHandler` extension; Notion strips formatting. Currently pastes plain text only (line 272-278 in editor.ts). | LOW | ✅ Already stripped. Verify edge cases (newlines, smart quotes, emoji). |
| **Placeholder Text** | Empty editor should show "Start writing..." or similar. TipTap has `Placeholder` extension. Does NOT exist. | LOW | CSS `:empty` pseudo-class on `contentEditable`, or a plugin that inserts placeholder div. ~20 lines. |
| **Content Persistence** | Save/load must work reliably. Already exists via `StorageAdapter` (localStorage, IndexedDB). | — | ✅ Exists. Needs `delete` method (noted in CONCERNS.md). |
| **TypeScript Types** | Library consumers expect full type safety. Already exists (`src/types.ts`). | — | ✅ Exists. Needs expansion for new plugin categories. |
| **Error Resilience** | Editor must not crash on malformed input, invalid caret positions, storage failures. Partially exists (try/catch on caret, fallback defaults for storage). | LOW | Expand try/catch coverage. Add error boundary that restores last known good state. |
| **Responsive to Container** | Editor must fill its container and not overflow. Already exists (contentEditable fills container). | — | ✅ Exists. |
| **Accessibility (basic)** | Keyboard nav, screen reader basics, focus management. Partially exists (Tab/Enter handling, focus on mount). Missing: ARIA roles, focus ring styling. | MEDIUM | `role="textbox"`, `aria-multiline="true"`. Focus ring via CSS. Can add incrementally. |
| **Page Listing / Autocomplete** | Wiki users need to discover and link to pages. Obsidian has `[[` autocomplete popup. Notion has `@` mentions. Noted as missing in CONCERNS.md. | MEDIUM | `SuggestPlugin` that fires when `[[` is typed. Queries `storage.keys()` for completions. Renders dropdown overlay. Depends on storage adapter having `keys()`. This is partially a UI overlay feature (differentiator). |

### Differentiators (Competitive Advantage)

Features that set WorldNotes apart. Not required, but valuable. Aligned with Core Value: "plugin surface is the product."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Declarative Plugin Manifest System** | Lower barrier than TipTap's class-based extensions. Plugins declare capabilities, not hunt for hooks. Three categories: blocks, UI overlays/panels, storage backends. Notion/Obsidian have no equivalent in-library — their plugins are app-level. | HIGH | The centerpiece. Requires: `PluginManifest` interface with capability declarations, plugin lifecycle (init/activate/deactivate), validation at registration time, capability conflict detection (e.g., two panels claiming same position). Build on existing `Plugin` interface but expand significantly. |
| **Wiki-Style [[page]] Links + Breadcrumb Trail** | Unique among editor libraries. TipTap/ProseMirror have no wiki link concept. Obsidian has it as app feature, not library. Already exists. | — | ✅ Exists. Can be enhanced: autocomplete suggestions (differentiator), backlinks display (future), graph view (out of scope). |
| **Token → Plugin Dispatch Pipeline** | Existing tokenizer/renderer pipeline where plugins register regex patterns. Unique approach — most editors use schema-based parsing (ProseMirror) or input rules (TipTap). Simpler model, especially for inline formatting. | — | ✅ Exists. Differentiates from ProseMirror's complexity. |
| **Design Token System (CSS Custom Properties)** | Obsidian-level theming on the web. 80% of customization via CSS variables, 20% via full theme replacement. TipTap is headless but doesn't provide a token system. Obsidian uses CSS variables extensively. | MEDIUM | Define ~50 tokens: colors (fg, bg, accent, border), typography (font-family, font-size, line-height), spacing, radii, shadows. Document in `docs/theming.md`. Namespace under `--wn-*`. |
| **Full Theme Replacement Escape Hatch** | For the 20% case where tokens aren't enough. Complete CSS swap — consumers ship their own stylesheet. Milkdown is headless; Obsidian themes replace the entire CSS file. TipTap requires per-extension `renderHTML` overrides. | MEDIUM | Two-tier approach: stylesheet injection with `id="worldnotes-theme"`. `EditorOptions.theme` can be `'default'` or a CSS string. Plugin that registers a theme can replace the injected stylesheet wholesale. |
| **Storage Adapters as Plugin Type** | Plugins can provide persistence backends. Notion/Obsidian/TipTap have fixed storage (or delegate to app). Unique: SQLite, IndexedDB, REST API, filesystem — all as plugins. | MEDIUM | `StoragePlugin` interface extending `StorageAdapter` with plugin metadata. Plugin manifest declares `kind: 'storage'`. Editor discovers storage plugins and lets consumer select. |
| **UI Overlays / Panels from Plugins** | Plugins can inject UI into the editor container. Similar to Obsidian's `addRibbonIcon`, `addStatusBarItem`, `registerView`. TipTap has `BubbleMenu`/`FloatingMenu` extensions. | HIGH | Needs DOM slot system: `slots` array in plugin manifest (e.g., `'toolbar'`, `'sidebar-left'`, `'sidebar-right'`, `'status-bar'`). Editor renders registered UI into slot containers. Conflicts: two plugins claiming same slot position — resolve by priority or `appendPrepend`. |
| **Zero Runtime Dependencies** | Self-contained library. TipTap has 10+ ProseMirror deps. Milkdown has Remark + ProseMirror. WorldNotes has zero. | — | ✅ Exists. Must be defended — no new runtime deps. |
| **Vanilla TypeScript (No Framework)** | Works with any framework. TipTap/ProseMirror support all frameworks but require per-framework integration packages. Milkdown has framework wrappers. | — | ✅ Exists. Pure DOM API. |
| **Fluent Builder API** | `createEditor(el).use(plugin).mount()`. Clean, LLM-friendly. Similar to TipTap's `new Editor({ extensions })` but more explicit. | — | ✅ Exists. Needs expansion for plugin categories (`.useStorage()`, `.useUI()`). |
| **Custom Block Types** | Plugin authors can define new block-level content types beyond headings/blockquotes — callouts, admonitions, code blocks with syntax highlighting, todo checkboxes, collapsible sections. Competitors: TipTap nodes, ProseMirror custom nodes, Notion block types. | HIGH | Requires: block-level plugin registration, nesting rules, keyboard shortcuts for insertion, serialization. Heavily depends on the declarative manifest system and list support. |
| **Autocomplete / Suggestion Engine** | `[[` triggers page completion; `@` triggers mention; `/` triggers slash commands. Notion popularized `/`; Obsidian has `[[`. No editor library does suggestions inline as a composable system. | MEDIUM | `SuggestPlugin` as built-in. Triggers configurable per plugin. Position-aware dropdown overlay. Keyboard-navigable (arrow keys, Enter, Escape). |
| **Content Serialization (Plugin-Aware)** | Export/import content as structured data. Plugin tokens need serializable representation. TipTap uses JSON schema. ProseMirror has `toJSON`. WorldNotes needs plugin-aware serialization so custom blocks survive export/import. | MEDIUM | `serialize()`/`deserialize()` on Plugin manifest. Default: raw markdown round-trip. JSON format for structured data. |
| **Programmatic API** | `editor.getContent()`, `editor.setContent()`, `editor.navigate()`, `editor.getPages()`, `editor.deletePage()`. Already partially exists. Missing page CRUD. | MEDIUM | ✅ Partially exists. Needs: `deletePage()`, `renamePage()`, `listPages()`. |
| **Developer-First Documentation** | Obsidian's developer docs are excellent. TipTap's are comprehensive. WorldNotes needs: API docs, plugin authoring guide, theme authoring guide, migration guide. | LOW | Write-as-you-build. `docs/api.md` exists. Need `docs/plugins.md`, `docs/theming.md`. |
| **UI Overlay Suggestions** | Plugin-defined autocomplete dropdowns anchored at cursor position ([[ page links]], @mentions, /commands, emoji picker). | MEDIUM | `SuggestPlugin` infrastructure (shared by autocomplete differentiator above). Built-in triggers: `[[` (pages), `@` (mentions, placeholder for future), `/` (commands/blocks). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Aligned with Out of Scope in PROJECT.md.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Built-in Rich Text Toolbar** | Users expect formatting buttons. | Toolbar is UI opinion, not library concern. TipTap learned this — their default is headless. Toolbar forces design decisions (floating vs fixed, icon set, mobile behavior). Pollution of core. | Plugin territory. Ship a `toolbarPlugin` as an example plugin (like Obsidian's `command-palette`), not built-in. Consumers build their own or use community plugins. |
| **Real-Time Collaboration (CRDT/Yjs)** | Obsidian isn't collaborative. Notion's biggest differentiator. TipTap offers it as paid add-on. | Massive complexity: OT/CRDT algorithms, conflict resolution, presence indicators, offline support, server infrastructure. Would dominate the roadmap. PROJECT.md explicitly defers this. | Deferred to product phase. Library stays single-user. When collaboration comes, it's a product built on top of the library. |
| **Framework Wrappers (React/Vue/Svelte)** | Developers want `useWorldNotes()` or `<WorldNotes />`. | Fragments maintenance across 3+ frameworks. TipTap maintains 7+ framework packages — significant burden. API surface must be stable before wrapping. PROJECT.md explicitly defers. | Vanilla-first. Document integration patterns. Framework wrappers can be community plugins when plugin ecosystem matures. |
| **Plugin Registry / Marketplace** | Discoverability for plugins. Obsidian's community plugin directory is a major value driver. | Premature. No plugins to list yet. Marketplace is product infrastructure, not library. Requires: hosting, review process, version management, security scanning. PROJECT.md defers this. | Ship with zero plugins beyond defaults. Registry comes after stable API and 3+ community plugins exist. |
| **WYSIWYG Mode Toggle (Edit/Preview)** | Some users want to toggle between editing and rendered view. | editorial complexity: two rendering paths, sync issues, state management. WorldNotes is already inline WYSIWYG — toggle goes against the core design. Milkdown and TipTap focus on WYSIWYG-only. | Inline WYSIWYG IS the preview. No toggle needed. If users want split-pane, it's an app concern, not library. |
| **Image / Media Embedding** | Users paste images into editors. Notion/Notion handles images well. | Media handling opens Pandora's box: upload to where? resize? storage cost? bandwidth? alt text? different hosting strategies. Editor library shouldn't own this. | Plugin territory. `imagePlugin` as community plugin. Core ships with zero media support. |
| **Markdown Export (static site gen)** | "Export all pages as .md files". Useful for SSG integration. | Storage format is already Markdown (raw text). Export is a read-and-write operation on storage — consumers can do this with the API. Adding it to core pollutes. | Consumer concern. `storage.keys()` + `storage.get()` in a loop = export. Document pattern, don't build feature. |
| **Mobile-Specific Optimizations** | Users want editor to work on phones. | Browser library, not a mobile app. `contentEditable` works on mobile but virtual keyboards, autocorrect, and touch selection are OS/browser concerns. Library can't fix these. | Test on mobile, document known limitations. Don't build mobile-specific code. |
| **AI Features (text generation, summarization)** | Every product is adding AI now. TipTap has `AI Generation`/`AI Toolkit` extensions. | AI features are product-level, rapidly changing, and depend on external services. Core library should not have AI opinions. | Deferred to product phase or community plugins. The suggestion engine (differentiator) can be repurposed for AI completions. |
| **File Attachments / Uploads** | Drag-and-drop files into editor. Notion supports this. | Same category as images. Where do files go? What's the storage backend? Permissions? Library shouldn't decide. | Plugin territory. `filePlugin` as community plugin. Core ships with zero file handling. |
| **Spell Check** | Users expect red squiggly underlines. | Browser-native `spellcheck` attribute on `contentEditable` handles this. No library code needed. Notion and Obsidian rely on browser/OS spell check. | Set `spellcheck="true"` on contentEditable div. Done. No custom spell-check engine. |
| **Multi-Cursor / Block Selection** | Notion's block handle drag. Pro-level editing feature. | `contentEditable` with re-render pipeline makes multi-cursor extremely complex. Single-cursor model is simpler and sufficient. | Future consideration. Not in MVP scope. |

## Feature Dependencies

```
[DECLARATIVE PLUGIN MANIFEST]
    ├──requires──> [Plugin Lifecycle: init/activate/deactivate]
    ├──requires──> [Plugin Category Types: blocks, UI, storage]
    └──requires──> [Plugin Capability Conflict Detection]

[UI OVERLAYS / PANELS]
    ├──requires──> [DECLARATIVE PLUGIN MANIFEST]
    ├──requires──> [DOM Slot System: toolbar, sidebar, status-bar]
    └──enhances──> [BREAKTHROUGH: SUGGESTION ENGINE]

[CUSTOM BLOCK TYPES]
    ├──requires──> [DECLARATIVE PLUGIN MANIFEST]
    ├──requires──> [BULLETED/NUMBERED LISTS] (block nesting model)
    └──requires──> [Block-Level Plugin Registration]

[DESIGN TOKEN SYSTEM]
    ├──blocks──> [Full Theme Replacement] (build tokens first, then escape hatch)
    └──enhances──> [All UI rendering] (panels, overlays, editor chrome use tokens)

[STORAGE ADAPTERS AS PLUGINS]
    ├──requires──> [DECLARATIVE PLUGIN MANIFEST]
    ├──requires──> [StorageAdapter.delete() API] — noted in CONCERNS.md
    └──enhances──> [Content Persistence]

[SUGGESTION ENGINE]
    ├──requires──> [DOM Slot System] (overlay positioning)
    ├──requires──> [StorageAdapter.keys() API]
    └──enhances──> [Wiki [[Page]] Autocomplete]

[UNDO / REDO]
    ├──requires──> [State history tracking infrastructure]
    └──conflicts──> [Full DOM Rebuild on Every Keystroke] — current behavior makes undo complex

[BULLETED / NUMBERED LISTS]
    ├──requires──> [Multi-line tokenization] — tokenizer currently processes line-by-line
    └──blocks──> [CUSTOM BLOCK TYPES] — blocks need the nesting model lists establish
```

### Dependency Notes

- **Declarative Plugin Manifest is the lynchpin:** UI overlays, custom blocks, and storage-as-plugins all depend on it. This must be Phase 1 of the new milestone.
- **List support blocks custom blocks:** Until multi-line tokenization and nesting work, custom block types can't be built. List support is the proving ground for the block model.
- **UI overlays enable suggestions:** The DOM slot system for panels/overlays is needed before autocomplete dropdowns can render.
- **Theme tokens precede full theme replacement:** Design tokens must be the first theming deliverable — they define the CSS variable contract that full themes replace.
- **Undo conflicts with current render approach:** Full DOM rebuild on every keystroke destroys browser native undo. Either implement custom undo history or (better) move toward incremental rendering before adding undo.

## MVP Definition

### Launch With (v1.0 — this milestone)

Minimum viable product — what's needed to ship a compelling library.

- [x] **Inline formatting** (bold, italic, code, headings, blockquote, hr) — **ALREADY EXISTS**
- [x] **Wiki [[page]] links + breadcrumb trail** — **ALREADY EXISTS**
- [x] **Storage adapters (localStorage, IndexedDB)** — **ALREADY EXISTS**
- [x] **Fluent builder API** — **ALREADY EXISTS**
- [x] **Zero runtime dependencies** — **ALREADY EXISTS**
- [ ] **Declarative plugin manifest system** — THE core differentiator. Three categories: blocks, UI, storage
- [ ] **Design token system** (CSS custom properties) — enables theming
- [ ] **Strikethrough formatting** (`~~...~~`) — table stakes, ~10 lines
- [ ] **URL links** (`[text](url)`) — table stakes, missing
- [ ] **Undo / Redo** — table stakes, missing
- [ ] **Keyboard shortcuts** (Cmd+B/I/K, Tab, Enter) — table stakes, partially missing
- [ ] **Placeholder text** — table stakes, missing
- [ ] **Page listing API** (`listPages()`) — needed for autocomplete consumers
- [ ] **StorageAdapter.delete() API** — table stakes gap
- [ ] **Accessibility basics** (ARIA roles, focus ring) — table stakes
- [ ] **UI overlay / panel slot system** — differentiator
- [ ] **Full theme replacement escape hatch** — differentiator
- [ ] **Editor architecture refactored** (de-monolith editor.ts) — prerequisite for extensibility
- [ ] **Production infrastructure** (Vitest, ESLint, CI, coverage) — professionalism

### Add After Validation (v1.1+)

- [ ] **Autocomplete / suggestion engine** (`[[`, `/`, `@` triggers) — differentiator, depends on UI overlay slots
- [ ] **Custom block type registration** (callouts, todo checkboxes, code blocks) — differentiator, depends on plugin manifest + list support
- [ ] **Content serialization** (plugin-aware export/import) — differentiator
- [ ] **Bulleted / numbered lists** — table stakes but HIGH complexity. May need to be v1.1 if tokenizer changes are too invasive.
- [ ] **Storage adapter as plugin type** — differentiator, depends on plugin manifest
- [ ] **Example plugins** (toolbar plugin, suggestion plugin, callout plugin) — demonstrates extensibility

### Future Consideration (v2+)

- [ ] **Collaborative editing** — deferred to product phase per PROJECT.md
- [ ] **Plugin registry / marketplace** — deferred per PROJECT.md
- [ ] **Framework wrappers (React, Vue, Svelte)** — community-first, deferred per PROJECT.md
- [ ] **Backlinks / graph view** — Obsidian-level features for knowledge management
- [ ] **Incremental rendering** — address full-DOM-rebuild performance concern from CONCERNS.md
- [ ] **Mobile-optimized interactions** — deferred per PROJECT.md

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Editor architecture refactoring | HIGH | MEDIUM | P1 | Phase 1 (prerequisite) |
| Declarative plugin manifest system | HIGH | HIGH | P1 | Phase 1 |
| Design token system (CSS variables) | HIGH | MEDIUM | P1 | Phase 1 |
| UI overlay / panel slot system | HIGH | HIGH | P1 | Phase 2 |
| Full theme replacement escape hatch | MEDIUM | MEDIUM | P1 | Phase 2 |
| Strikethrough (`~~...~~`) | MEDIUM | LOW | P1 | Phase 1 (quick win) |
| URL links (`[text](url)`) | HIGH | MEDIUM | P1 | Phase 1 |
| Undo / Redo | HIGH | MEDIUM | P1 | Phase 2 |
| Keyboard shortcuts (Cmd+B/I/K) | MEDIUM | MEDIUM | P2 | Phase 2 |
| Placeholder text | MEDIUM | LOW | P2 | Phase 2 (quick win) |
| StorageAdapter.delete() API | MEDIUM | LOW | P2 | Phase 2 |
| Page listing API (listPages) | MEDIUM | LOW | P2 | Phase 2 |
| Accessibility basics (ARIA, focus) | MEDIUM | MEDIUM | P2 | Phase 3 |
| Autocomplete / suggestion engine | HIGH | MEDIUM | P2 | Phase 3 |
| Custom block type registration | HIGH | HIGH | P2 | Phase 3 |
| Bulleted / numbered lists | HIGH | HIGH | P2 | Phase 3 |
| Content serialization (plugin-aware) | MEDIUM | MEDIUM | P3 | Phase 4 |
| Storage adapter as plugin type | MEDIUM | MEDIUM | P3 | Phase 4 |
| Production infra (Vitest/ESLint/CI) | HIGH | MEDIUM | P1 | Phase 1 |

**Priority key:**
- P1: Must have for v1.0 launch
- P2: Should have, add when possible
- P3: Nice to have, v1.1+ consideration

## Competitor Feature Analysis

| Feature | TipTap | ProseMirror | Milkdown | Obsidian | Notion | Our Approach |
|---------|--------|-------------|----------|----------|--------|--------------|
| Extensibility model | Extension classes (Node/Mark/Extension) | Plugin system (PluginSpec) | Everything is a plugin (syntax/theme/UI) | Manifest-based community plugins | No extensions | Declarative plugin manifest with capability types (blocks/UI/storage) |
| Theming | Headless (no styles) | No styling opinion | Headless (no styles) | CSS variables + full theme CSS files | Limited (3 fonts, few colors) | Two-tier: design tokens (80%) + full theme replacement (20%) |
| Inline formatting | Marks (toggleMark) | Marks with schema | ProseMirror marks | Markdown rendering | Markdown shortcuts | Tokenizer/renderer pipeline with regex patterns |
| Custom blocks | Nodes with NodeViews | Custom node types | ProseMirror nodes | Code blocks, callouts (plugins) | 20+ built-in block types | Plugin-registered block types with regex detection |
| Keyboard shortcuts | addKeyboardShortcuts | keymap plugin | ProseMirror keymap | Hotkeys in plugin | Built-in only | Plugin-declared shortcuts |
| Undo/Redo | Built-in (prosemirror-history) | history plugin | ProseMirror history | Built-in | Built-in | Custom history tracking (no ProseMirror dep) |
| Autocomplete | Suggestion utility | Manual | No built-in | `[[` page completion, `/` commands | `/` commands, `@` mentions | `SuggestPlugin` with configurable triggers |
| Wiki links | No | No | No | `[[page]]` core feature | `@` page mention | `[[page]]` core feature (existing, unique) |
| Storage | Consumer-managed | Consumer-managed | Consumer-managed | Built-in (local vault) | Built-in (cloud) | StorageAdapter interface, swappable backends |
| Collaboration | Paid add-on (Hocuspocus) | prosemirror-collab | Y.js support | No | Core feature | Deferred to product phase |
| Slash commands | No built-in | No built-in | No built-in | `/` via plugin | `/` for blocks | Plugin territory (suggestion engine powers `/`) |
| Framework support | React/Vue/Svelte/vanilla/Next/Nuxt | Vanilla JS | React/Vue/vanilla | Electron app | Electron/Web app | Vanilla TypeScript only (framework agnostic) |
| Zero deps | No (~10 deps) | No (~10 deps) | No (ProseMirror + Remark) | N/A (app) | N/A (app) | YES — zero runtime dependencies |

## Sources

- **TipTap:** Extension catalog (https://tiptap.dev/docs/editor/extensions/overview), Extension API (https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension), Styling guide (https://tiptap.dev/docs/editor/getting-started/style-editor), README (https://github.com/ueberdosis/tiptap). Confidence: HIGH (official docs, comprehensive).
- **ProseMirror:** Guide (https://prosemirror.net/docs/guide/), Reference manual (https://prosemirror.net/docs/ref/). Confidence: HIGH (official docs).
- **Milkdown:** Homepage (https://milkdown.dev/), README (https://github.com/Saul-Mirone/milkdown). Confidence: MEDIUM (official site but JS-heavy, couldn't render all sub-pages).
- **Obsidian:** Developer docs (https://docs.obsidian.md/), Help articles (https://help.obsidian.md/). Confidence: MEDIUM (official docs are JS-heavy and didn't render via webfetch; inferred from community knowledge and README patterns).
- **Notion:** Help Center (https://www.notion.so/help/writing-and-editing-basics). Confidence: HIGH (official documentation, comprehensive feature list for blocks, inline formatting, shortcuts).
- **WorldNotes Codebase:** `src/types.ts`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`. Confidence: HIGH (actual codebase).

---

*Feature research for: worldnotes — inline WYSIWYG Markdown editor library*
*Researched: 2026-05-23*

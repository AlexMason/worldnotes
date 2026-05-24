# Pitfalls Research

**Domain:** Browser-based inline Markdown/WYSIWYG editor library with plugin extensibility
**Researched:** 2026-05-23
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Full DOM Rebuild on Every Keystroke

**What goes wrong:**
The current v0.1.0 codebase rebuilds the entire editor DOM on every `input` event: `editorDiv.innerHTML = ''`, full re-tokenization of all text, full re-render of all lines, then a best-effort caret restoration. This works for small documents but degrades to unusable for documents beyond ~300 lines. Every third-party editor framework that started this way (early Slate, early Quill, early Draft.js) had to rewrite their rendering to be incremental.

**Why it happens:**
It's the simplest implementation path. Tokenize everything, render everything, done. The alternative—tracking dirty lines, patching only changed DOM nodes, preserving selection through incremental updates—is an order of magnitude harder, especially with `contentEditable` where the browser itself can mutate the DOM (IME composition, spell check, drag/drop).

**How to avoid:**
Three tiers of incremental improvement, in order:
1. **Immediate (cache plugin map):** `buildPluginMap()` is rebuilt on every render cycle but only changes when plugins change. Cache it. Low effort, immediate win.
2. **Medium (line-level dirty tracking):** Track which `textContent` lines changed between keystrokes. Only re-tokenize and re-render those lines. Re-splice line DOM nodes rather than rebuilding all siblings. This is what ProseMirror does with its `Decoration` system — it computes which ranges changed and only touches those.
3. **Deep (virtual DOM or position mapping):** ProseMirror's approach: maintain an internal document model, diff it against the previous state, compute a minimal set of DOM mutations. The DOM is treated as a projection, not the source of truth. This is the endgame but a significant architectural commitment.

**Warning signs:**
- Typing lag becomes noticeable at 200+ lines with inline formatting
- Caret position jumps or resets on slower devices
- `requestAnimationFrame` budgets exceeded on every keystroke
- Performance profiles showing >16ms in `render()` for moderate documents

**Phase to address:**
Refactor phase (editor module decomposition). The CSS extraction and module splitting creates the boundary lines needed to later swap in per-line rendering. The rendering module should expose a `renderLine(lineIndex)` function alongside `renderDocument()` so the input handler can call targeted updates.

---

### Pitfall 2: contentEditable Produces Browser-Specific DOM

**What goes wrong:**
Different browsers handle the same user action differently inside a `contentEditable` element:
- **Enter key:** Chrome inserts `<div><br></div>`; Firefox inserts `<br>`; Safari inserts `<div>` with a `<br>`
- **Backspace at block boundary:** Chrome merges blocks; Firefox deletes the preceding block's content node
- **IME composition:** Each browser fires `compositionstart`/`compositionend` with different event ordering relative to `input`
- **Spell check correction:** No `beforeinput` event — browser mutates DOM directly and fires only `input`
- **Triple-click:** Chrome selects the paragraph; Firefox selects the line; Safari behavior differs by version

ProseMirror's creator Marijn Haverbeke explicitly called this out: "Many [editors] are firmly rooted in the old paradigm of relying on `contentEditable` elements and then trying to sort of clean up the resulting mess. This gives us very little control over what the user and the browser are doing to our document."

**Why it happens:**
The `contentEditable` specification was never fully standardized across browsers. Each engine implements editing behaviors independently. Authors who treat `contentEditable` as "textarea with formatting" discover that the abstraction leaks in dozens of ways.

**How to avoid:**
1. **Intercept before DOM mutation:** Use `beforeinput` events (supported in all modern browsers) to capture user intent before the browser acts. Call `preventDefault()` and perform the DOM mutation yourself. This is what ProseMirror, TipTap, and Slate do.
2. **Handle `input` as a fallback only:** Treat the `input` event as a "reconciliation needed" signal for the cases `beforeinput` doesn't cover (spell check, IME finalization). Compare DOM state against your internal model and derive the delta.
3. **Strict paste handling:** Always `preventDefault()` on paste, extract plain text only (current code does this correctly), and re-render. Never let the browser insert formatted paste content.
4. **`contentEditable="plaintext-only"` consideration:** This newer attribute (Chrome/Safari) restricts formatting, but it limits the editing experience. Only consider if inline formatting is built entirely through your own rendering, never through browser-native bold/italic.

**Warning signs:**
- Cross-browser test failures where the same keystroke produces different raw text
- Caret restoration fails on specific browsers
- Paste produces unexpected formatting artifacts
- Backspace at block boundaries behaves differently in Firefox vs Chrome

**Phase to address:**
Refactor phase. When extracting input handling from `editor.ts`, implement `beforeinput` interception. The existing `input`-only approach is technically debt but works for basic cases — prioritize `beforeinput` for the Enter/Backspace/Delete paths that have the most browser divergence.

---

### Pitfall 3: Breaking Plugin API Contracts

**What goes wrong:**
The plugin interface (`Plugin`, `TokenDef`, `EditorContext`) is the public contract. Changing method signatures, return types, context shape, or registration semantics breaks every third-party plugin. Slate's history is a cautionary tale: the 0.47 → 0.50 rewrite broke every existing plugin, the 0.50 → 0.59+ era had at least 4 breaking changes to the command and plugin model, and the Mark → inline properties change required rewriting all text-formatting plugins.

**Why it happens:**
Internal refactoring needs leak into the public API. "We'll just change this one parameter" becomes a cascade. Plugin authors are downstream consumers with no migration tooling. The editor author owns the migration burden silently because plugin authors abandon broken plugins rather than rewrite them.

**How to avoid:**
1. **Version the plugin manifest:** Add a `manifestVersion: number` field to the plugin registration. Core checks compatibility before loading. Unknown versions produce a clear error, not a silent failure.
2. **Semantic versioning with strict semver for the plugin API:** The public types in `src/types.ts` define the contract. Patch bumps: additive only (new optional fields). Minor bumps: new required fields with defaults, new optional methods. Major bumps: removals or signature changes.
3. **Deprecation window:** When changing the plugin API, ship the old and new interfaces side-by-side for one minor version. Log deprecation warnings in dev mode. Remove only in the next major.
4. **Plugin validation at registration:** When a plugin is registered via `.use()`, validate that it implements the required interface (has `name`, `tokens` is array, `render` is function). Fail fast with a descriptive error.
5. **Stability guarantees documented:** Explicitly declare which parts of the API are stable (the `Plugin` interface, `EditorContext`, `StorageAdapter`) and which are internal/volatile (tokenizer internals, renderer DOM structure).

**Warning signs:**
- "Just one small change to Plugin interface" — every breaking change starts this way
- Plugin authors reporting silent failures after upgrade
- TypeScript errors in plugin code after updating the library version
- Internal refactors that "accidentally" change the shape of objects passed to plugin callbacks

**Phase to address:**
Plugin system design phase. Before shipping the new declarative manifest system, define the API stability policy. Add `manifestVersion` to the plugin registration. Write plugin validation that runs on `.use()`.

---

### Pitfall 4: Selection/Caret Loss During Re-render

**What goes wrong:**
The editor loses the user's cursor position after re-rendering. The caret jumps to the start or end of the document, or disappears entirely. This is the #1 reported issue in every contentEditable-based editor. The current codebase already has 221 lines of cursor management (`src/cursor.ts`) and still has fragile edge cases.

**Why it happens:**
When you replace `innerHTML`, the DOM nodes the browser's selection pointed to are destroyed. The browser selection is now invalid. You must capture the logical position (character offset or document path) before the DOM mutation, then restore it by walking the new DOM tree after mutation. This is easy to get wrong when:
- Render output differs from the raw text in length (wiki links show `acme` but are stored as `[[projects/acme]]`)
- The caret was inside a formatted token (bold, italic) — should you render raw text around the caret?
- The DOM structure changes between renders (different line element types, different nesting)

**Why it happens (root cause):**
There are two approaches, and mixing them causes bugs:

1. **Offset-based** (what worldnotes uses): Store a flat character offset. Restore by walking text nodes counting characters. Fragile when display text ≠ source text.
2. **Path-based** (ProseMirror's approach): Store a position as `[blockIndex, textOffset]` or a tree path. More robust but requires a stable document model separate from the DOM.

The current codebase uses `data-raw` to bridge the gap — wiki links store source text in the DOM attribute. This works but is fragile: if the renderer changes DOM structure, the cursor module's tree-walking assumptions break silently.

**How to avoid:**
1. **Separation of concerns:** The cursor module should operate on a logical document model, not walk raw DOM. `extractText()` should produce a position in the text string, not a DOM offset.
2. **Active token rendering:** Keep the current approach of passing `activeOffset` to the renderer so tokens containing the caret render as raw text. This is the right instinct — inline editors like Typora and Obsidian do the same.
3. **Cursor module tests first:** Before touching renderer internals, establish comprehensive cursor tests: caret at start/end/middle of document, inside bold, inside italic, inside wiki link, at block boundaries, after IME input, after paste. These are the regression safety net.
4. **Consider a position descriptor type:** Instead of a bare number, use `{ line: number, offset: number }` or `{ path: number[], offset: number }`. This survives line insertions/deletions better than a flat offset.

**Warning signs:**
- "Sometimes" caret jumps — inconsistency is the hallmark of edge cases
- Caret works in Chrome but not Firefox (different `Selection` API behavior)
- Regression every time the renderer adds a new element type
- `setCaretOffset` falling through to the `catch` block (already happens — line 176 of editor.ts)

**Phase to address:**
Test infrastructure phase and refactor phase. Add cursor position tests before changing the renderer or input handling. The cursor module should be extracted and tested independently before the renderer is made incremental.

---

### Pitfall 5: Plugin Ordering Is Implicit and Fragile

**What goes wrong:**
The current system requires plugins to be registered in a specific order (line-level first: headings → hr → blockquote; then inline: wikiLink → bold → italic → inlineCode). If a consumer registers them in the wrong order, `**text**` might be partially matched by `*text*` first, or `# heading` might be tokenized as inline bold. The order is documented but not enforced or validated.

**Why it happens:**
The tokenizer is greedy — it matches the first pattern that applies. Line-level patterns have priority over inline by implementation detail, not by explicit declaration. This means the plugin system's behavior depends on undocumented implicit ordering rules.

**How to avoid:**
1. **Explicit plugin categories in the manifest:**
   ```ts
   interface Plugin {
     category: 'block' | 'inline' | 'ui-panel' | 'storage';
     priority?: number; // Within category, lower = earlier match
     // ...
   }
   ```
   Block plugins always test before inline plugins. Within a category, `priority` determines order. No priority = appended with default ordering.

2. **Conflict detection:** When registering a plugin, check if any existing plugin's `TokenDef` regexes could match the same text. Flag potential conflicts at registration time (dev mode warning).

3. **Separate tokenizer passes:** Instead of a flat list, structure as:
   ```
   1. Block-level pass: test each line against block patterns
   2. Inline pass: for lines not consumed by blocks, test inline patterns
   ```
   This makes the two-pass behavior explicit rather than a side effect of list ordering.

4. **Plugin manifest validation:** Validate at `.use()` time. Warn if a block-level pattern doesn't anchor with `^`. Warn if two plugins have the same priority with overlapping patterns.

**Warning signs:**
- Plugin authors confused about why their plugin doesn't match
- GitHub issues: "My plugin works if I register it first"
- Seemingly random tokenization failures when plugin order changes

**Phase to address:**
Plugin system design phase. The new declarative manifest system must make categories and priority explicit. This is the right time to design this — before the plugin ecosystem grows.

---

### Pitfall 6: CSS Specificity Wars with Consumer Stylesheets

**What goes wrong:**
The editor's default styles (currently a 120-line `DEFAULT_CSS` string with `wn-*` class selectors) conflict with consumer application stylesheets. If the consumer's CSS has a rule like `.app p { margin: 0; }`, it can override the editor's paragraph spacing. Even worse, if the consumer uses a CSS reset or utility framework like Tailwind, the editor's styles may be partially overridden in unpredictable ways.

**Why it happens:**
The editor is injected into the consumer's page and participates in their CSS cascade. Class-based selectors (`.wn-editor`) have medium specificity and can be overridden by any rule with equal or higher specificity. The current system has no CSS custom properties (design tokens), no Shadow DOM isolation, and no mechanism for consumers to opt into or override specific style aspects.

**How to avoid:**
1. **Design tokens via CSS custom properties:** Define all editable style aspects as CSS custom properties on the editor root element. This gives consumers an 80% customization path without touching selectors:
   ```css
   .wn-root {
     --wn-font-size: 16px;
     --wn-line-height: 1.6;
     --wn-bold-weight: 700;
     --wn-heading-color: #1a1a2e;
     /* etc. */
   }
   ```
   This is the Obsidian model — themes override variables, not selectors.

2. **Full theme replacement escape hatch:** Allow consumers to replace the entire CSS string via `EditorOptions.theme`. The default theme ships as a separate CSS file/string, not embedded in the editor module. This is the 20% escape hatch for complete visual overhauls.

3. **Scoped styles via a unique container class:** All default styles target `.wn-root .wn-editor` (descendant selector from a unique root). This is higher specificity than a bare class but not Shadow DOM. Sufficient for most cases.

4. **DO NOT use Shadow DOM:** While Shadow DOM provides perfect isolation, it breaks `contentEditable` focus management, clipboard APIs, and `window.getSelection()`. The selection API doesn't cross shadow boundaries reliably. Every editor framework that tried this (early BlockNote experiments) abandoned it.

5. **All styles through CSS, never inline `style` attributes:** Inline styles are the highest specificity and impossible for consumers to override without `!important`. The renderer must never set inline styles on elements.

**Warning signs:**
- Consumer reports "your editor doesn't look right in my app"
- Consumer using `!important` to override editor styles
- Editor appearance differs between demo page and consumer integration
- Tailwind's preflight reset breaking editor layout

**Phase to address:**
Theming phase. Design tokens must be defined before the CSS is extracted from `editor.ts`. The token system is the foundation — full theme replacement builds on top.

---

### Pitfall 7: No Automated Regression Tests for Rendering and Cursor

**What goes wrong:**
A change to the renderer's DOM structure (adding a wrapper div, changing a class name) silently breaks cursor restoration. A change to a plugin's regex pattern silently breaks tokenization for edge cases. Without automated tests, these regressions are only discovered when a consumer reports a bug. The current codebase has 9 source modules with zero test coverage.

**Why it happens:**
Testing a contentEditable editor is hard. You need a DOM environment. You need to simulate typing, selection, and rendering. The current test setup uses manual `ts.transpileModule()` and hand-stubbed DOM APIs — this is painful enough that tests weren't written.

**How to avoid:**
1. **Unit tests for pure logic (no DOM needed):**
   - `tokenizeLine()` — pure string in, tokens out. Test every plugin's patterns. Test edge cases (empty string, overlapping patterns, unclosed delimiters).
   - `tokenizeDocument()` — pure string in, token arrays out.
   - `buildPluginMap()` — pure function, easy to test.
   - Navigation helpers (`parseWikiLink`, `encodePathSearch`, `decodePathSearch`).

2. **DOM tests with happy-dom or jsdom:**
   - Renderer tests: given tokens, verify DOM structure (element types, classes, `data-raw` attributes).
   - Cursor offset tests: given a DOM tree and an offset, verify `getCaretOffset()` returns the correct position.
   - Cursor restoration tests: render, set caret at known positions, re-render, verify caret is at expected position.

3. **Integration tests for editor lifecycle:**
   - Mount editor, verify DOM structure.
   - Simulate typing, extract text, verify tokenization.
   - Simulate wiki link navigation, verify page load and breadcrumbs.
   - Test plugin registration and replacement.

4. **Framework: Vitest with happy-dom.** Vitest is Vite-native, TypeScript-native, and supports watch mode. happy-dom is faster than jsdom and sufficient for contentEditable testing. Configuration is ~10 lines.

5. **Property-based testing for tokenization:** Use fast-check or similar to generate random markdown strings, tokenize them, render to DOM, extract text from DOM, verify round-trip fidelity. This catches edge cases that manual test cases miss.

**Warning signs:**
- "Let me just change this renderer output, it should be fine" — without tests, it won't be
- Cursor bugs reported for specific formatting combinations
- Tokenizer edge cases found months after shipping
- Fear of refactoring because "the cursor code is fragile"

**Phase to address:**
Test infrastructure phase (must be early — before refactoring begins). Tests are the safety net that enables safe refactoring of the 489-line editor monolith.

---

### Pitfall 8: Plugin Lifecycle Hooks Are Incomplete

**What goes wrong:**
The current plugin interface has no teardown, no initialization hook, and no validation step. Plugins register token patterns and a render function, but they have no way to:
- Clean up event listeners when removed
- Initialize state when the editor mounts
- React to editor lifecycle events (mount, unmount, page change)
- Validate their configuration before being used

A UI panel plugin that adds a toolbar button can't remove it when the plugin is replaced. A storage plugin can't close its database connection on editor destroy. A block plugin can't react to the page changing.

**Why it happens:**
The current `Plugin` interface was designed for the simplest case: token matching + render. As the system expands to three plugin categories (blocks, UI panels, storage), the lifecycle needs grow but the interface hasn't.

**How to avoid:**
Design lifecycle hooks by category, not one-size-fits-all:

```ts
// Block plugins (token + render)
interface BlockPlugin {
  name: string;
  tokens: TokenDef[];
  render(token: Token, ctx: EditorContext): HTMLElement | Text;
  onNavigate?(token: Token, ctx: EditorContext): boolean | void;
  onPageChange?(page: string, ctx: EditorContext): void; // NEW
}

// UI panel plugins
interface UIPanelPlugin {
  name: string;
  mount(container: HTMLElement, ctx: EditorContext): void;    // Called on editor mount
  update?(ctx: EditorContext): void;                           // Called on state change
  destroy(): void;                                             // Called on editor destroy or plugin removal
}

// Storage plugins
interface StoragePlugin {
  name: string;
  adapter: StorageAdapter;
  onInit?(): Promise<void>;                                    // Called once on editor mount
  onDestroy?(): Promise<void>;                                 // Called on editor destroy
}
```

Key principles:
- **Every `mount` has a `destroy`** — guaranteed cleanup
- **Lifecycle hooks receive `EditorContext`** — consistent with existing patterns
- **Category-specific, not universal** — blocks don't need `mount`, UI panels don't need `tokens`

**Warning signs:**
- Plugins leaking memory (event listeners not cleaned up)
- "Hot reload" of plugins not working because old state persists
- Plugin authors asking for lifecycle hooks in GitHub issues
- Editor `.destroy()` leaving side effects (DOM nodes, timers, storage connections)

**Phase to address:**
Plugin system design phase. Lifecycle hooks must be part of the initial plugin manifest design, not bolted on later. Every category gets its lifecycle from day one.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| CSS as a 120-line template string in editor.ts | Quick to write, no build step for CSS | No linting, no syntax highlighting, bloats editor module, hard to review style changes alongside logic | Never for production. Extract to `styles.ts` in phase 1. |
| `innerHTML = ''` then full rebuild on every keystroke | Simple mental model, always correct | O(n) per keystroke, unusable beyond ~300 lines | Only during initial prototyping. Must be replaced with incremental rendering before library goes to 1.0. |
| Hand-rolled test transpilation (no framework) | Zero config, no new dependencies | Tests are painful to write, slow, and limited. Contributes directly to zero test coverage | Never. Vitest is ~10 lines of config and unblocks all testing. |
| `demo.ts` in source tree compiled into dist/ | Quick demo setup during development | Leaks demo types into library output, confuses consumers | Never for published packages. Extract to `demo/` directory immediately. |
| No ESLint/Prettier configuration | No config bikeshedding | Inconsistent code style, no automated quality gates | Never. Even solo projects benefit from consistent formatting. |
| Caret offset as a bare `number` (not a structured position) | Simplest possible representation | Fragile to document structure changes. A number after line 3 has a different meaning if line 1 changes length. | Acceptable for initial prototype. Must become structured before incremental rendering. |
| World cache as mutable `Record<string, string>` | Simple, fast, no immutability overhead | No change tracking, no undo support, concurrent modification risk | Acceptable for single-user editor. Revisit if collaborative editing is added. |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Content Security Policy | Not testing with CSP enabled. Inline styles break under strict CSP. | All styles via injected `<style>` element with a nonce or hash. No `style=` attributes. Verify with `Content-Security-Policy: style-src 'self'` in demo. |
| IndexedDB storage adapter | Calling IndexedDB operations without transaction lifecycle management. Transactions auto-commit in some browsers. | Use explicit `IDBDatabase.transaction()` with proper `onsuccess`/`onerror` handling. Test in Firefox (stricter transaction semantics). |
| URL query parameter (breadcrumb trail) | Assuming query params are always available. URL length limits, encoding issues with special page names. | The `?path=` encoding must handle `/` in page names (already done with `encodeURIComponent`). Add a length cap or fallback to sessionStorage for very long trails. |
| Consumer bundler integration | Assuming consumers use Vite. Webpack, Rollup, esbuild handle ESM differently. Tree-shaking expectations. | Ship both ESM and UMD/CJS (already done). Test import in a vanilla webpack project. Document tree-shaking: consumer must import from `worldnotes/core` not `worldnotes` to avoid pulling in unused plugins. |
| Screen readers | Assuming `contentEditable` is accessible. Dynamic DOM changes confuse screen readers. | Use ARIA live regions for content changes. Ensure `role="textbox"` on the editor. Test with VoiceOver and NVDA. |
| Mobile browsers | Assuming desktop keyboard behavior. iOS Safari has different `contentEditable` quirks, virtual keyboard resizes viewport. | Test on iOS Safari and Chrome Android. Consider `inputmode` attribute. Handle `visualViewport` resize events. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full re-tokenization on every keystroke | Typing lag at 200+ lines. Each keystroke re-tokenizes the entire document. | Line-level dirty tracking. Only tokenize changed lines. Cache `buildPluginMap()`. | ~200-300 lines with moderate formatting. |
| Unbounded `world` cache | Memory grows with every page visited. No eviction. | Add LRU cache with configurable max size (e.g., 50 pages). Purge least-recently-used on insert. | 100+ pages visited in a single session. |
| `render()` creating new element trees every call | GC pressure from discarded DOM fragments. | Not the biggest concern for inline editors (documents are typically <1000 lines). Focus on incremental updates instead. | 1000+ lines with complex formatting. |
| Blocking `storage.set()` on every debounced save | Save blocks UI thread for IndexedDB writes. | Already debounced at 600ms. Consider moving storage writes to a microtask or `requestIdleCallback`. | Large documents (>100KB) on slow storage (IndexedDB on HDD). |
| Plugin token Defs with exponential backtracking in regex | Catastrophic backtracking on long lines with complex nested patterns. Tokens freeze the browser. | Audit all plugin `TokenDef` patterns for ReDoS vulnerabilities. Use atomic groups or limit pattern complexity. Test with 10KB lines. | A single long line (>5KB) with a vulnerable regex pattern. |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Plugin `render()` using `innerHTML` with user content | XSS via plugin-authored content. Plugin ecosystem is the attack surface. | Document that plugins MUST use `createElement`/`createTextNode`. Consider a lint rule or runtime check (`node.innerHTML` setter throws in dev mode). Add an XSS section to `docs/api.md` with examples of safe vs unsafe rendering. |
| Wiki link navigation without validation | Open redirect if page names come from untrusted sources. `[[javascript:alert(1)]]` or `[[../../etc/passwd]]`. | Validate page names against a whitelist pattern (alphanumeric, `/`, `-`, `_`). Reject protocol-relative and parent-path URLs. |
| Storage adapter reading/writing arbitrary keys | Storage pollution if page names are user-controlled. `home`, `../../localStorage-key`, etc. | Namespace all storage keys with a prefix. Validate key format before get/set. |
| `data-raw` attribute containing unsanitized input | Attackers could inject HTML via `data-raw="[[<img src=x onerror=alert(1)>]]"`. | `data-raw` is only read by `extractText()`, which reads `.getAttribute('data-raw')` and never sets `innerHTML` from it. Safe as implemented but document this invariant. |
| `history.replaceState` with user-controlled path | URL manipulation. A malicious page name `../../malicious` could manipulate the URL path. | Sanitize page names before encoding into URL. Already handled by `encodeURIComponent` but validate the input shape. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback for "this is an editor" | Users don't realize the area is editable. No cursor, no placeholder, no border on focus. | Placeholder text ("Start typing..."), focus ring on the editor, blinking cursor. The current code has a placeholder element but it disappears on first focus — make it return when the editor is empty. |
| Enter key inserting raw newline with no visual distinction from line wrap | Confusion between soft wrap and hard newline. No paragraph spacing. | Add `margin-bottom` between block-level elements (headings, paragraphs, blockquotes). |
| Wiki links rendering as plain text while editing | Users can't distinguish `[[page]]` source from rendered link. During editing inside a link, the raw text should show. | The current approach (render as raw text when caret is inside, rendered link otherwise) is correct. Ensure visual distinction (link color, underline, cursor:pointer). |
| No indication that a page doesn't exist yet | Users click a red link (or worse, a normal-looking link that auto-creates a page). Surprising behavior. | Wiki links to non-existent pages should render in a "missing page" style (red/dashed underline). Clicking creates the page with a confirmation or at least a visual transition. |
| Navigation destroying unsaved content | User types a long page, clicks a link, current content is lost. | Auto-save on navigation (already partially done via debounced save). Flush pending saves before navigating away. |
| Mobile keyboard covering the editor | On mobile, the virtual keyboard pushes the viewport up but the editor may be hidden behind the keyboard. | Handle `visualViewport` API. Ensure the editor scrolls into view when focused. Test on iOS Safari (worst behavior). |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Plugin system:** Looks done (plugins register and render). Often missing: plugin replacement semantics (same-name replacement), plugin teardown lifecycle, plugin validation errors, plugin dependency declarations, cross-plugin event bus.
- [ ] **Theming:** Looks done (CSS variables exist). Often missing: comprehensive token coverage (check every color, spacing, font property), dark mode support, high-contrast mode, `prefers-reduced-motion`, print styles, RTL support.
- [ ] **Cursor management:** Looks done (caret survives re-render). Often missing: IME composition cursor, multi-cursor (collaborative), selection across block boundaries, triple-click paragraph selection, Shift+click range selection, keyboard selection (Shift+Arrow).
- [ ] **Storage:** Looks done (save/load works). Often missing: error handling for quota exceeded, corrupted data recovery, migration between storage backends, page deletion, page renaming, conflict resolution.
- [ ] **Accessibility:** Looks done (contentEditable is inherently somewhat accessible). Often missing: ARIA labels, keyboard navigation between blocks, screen reader announcements for formatting changes, focus trapping for modals/toasts.
- [ ] **Build output:** Looks done (`dist/` exists). Often missing: source maps, tree-shaking verification, CommonJS compatibility, `package.json` exports map for subpath imports, TypeScript declaration maps.
- [ ] **Documentation:** Looks done (`docs/api.md` exists). Often missing: plugin authoring guide, theming guide, storage adapter implementation guide, migration guide for breaking changes, security guidance for plugin authors.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Full DOM rebuild becomes a performance problem | MEDIUM | Extract rendering module, implement line-level dirty tracking, add per-line render/replace. Can be done incrementally without full rewrite. |
| Breaking plugin API change | HIGH | Ship old and new APIs side-by-side. Deprecate with warnings. Provide migration guide. Accept that some plugins will be abandoned. |
| CSS specificity conflicts | LOW | Add design tokens. If already shipped, add `!important` strategically as a stopgap, then migrate to tokens. |
| Cursor position bugs | MEDIUM | Add comprehensive cursor test suite. Fix cases one by one. Consider switching to structured position type. |
| XSS via plugin renderer | CRITICAL | Emergency patch. Add runtime `innerHTML` detection. Audit all plugins. Ship a `sanitizeHTML()` utility. |
| IndexedDB corruption | HIGH | Ship a data export tool. Implement schema versioning in storage. Add repair/migration path. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Full DOM rebuild on every keystroke | Refactor phase (editor decomposition) | Profile render() duration: must be <8ms for 100-line documents. Add performance regression test. |
| Browser-specific contentEditable DOM | Refactor phase (input handling extraction) | Cross-browser test suite (Chrome, Firefox, Safari). Same keystrokes, same extracted text. |
| Breaking plugin API contracts | Plugin system design phase | Plugin API types are in dedicated file with strict semver policy. Manifest version field validated on registration. |
| Selection/caret loss during re-render | Test infrastructure phase + refactor phase | Cursor test suite before renderer changes. 50+ cursor position test cases. |
| Plugin ordering implicit and fragile | Plugin system design phase | Category and priority fields on plugin manifest. Validation at `.use()` time warns on conflicts. |
| CSS specificity wars | Theming phase | All styles use CSS custom properties. Visual regression test suite compares screenshot before/after theme changes. |
| No automated regression tests | Test infrastructure phase (must be early) | Coverage >80% on tokenizer, renderer, cursor modules. CI runs tests on Chrome/Firefox/Safari (via playwright or browserstack). |
| Incomplete plugin lifecycle hooks | Plugin system design phase | Every plugin category has mount/update/destroy. Tests verify cleanup on editor.destroy(). |
| Plugin XSS via innerHTML | Plugin system design phase + documentation | Runtime detection of innerHTML usage in dev mode. Security section in plugin authoring guide. |
| ReDoS in plugin token patterns | Plugin system design phase | Automated ReDoS check on all registered token patterns. Test with 10KB test strings. |
| IndexedDB transaction errors | Test infrastructure phase | Storage adapter tests with real IndexedDB (via happy-dom or playwright). Test Firefox specifically. |
| Mobile keyboard UX | UI/infrastructure phase | Manual test on iOS Safari + Chrome Android. visualViewport handling in editor mount. |

## Sources

- **ProseMirror architecture and design philosophy**: Official guide at https://prosemirror.net/docs/guide/ — HIGH confidence. The definitive reference for avoiding contentEditable pitfalls through immutable document models and transaction-based updates.
- **ProseMirror blog post by Marijn Haverbeke** (2015): https://marijnhaverbeke.nl/blog/prosemirror.html — HIGH confidence. First-hand account of why contentEditable alone is insufficient and how to build a controlled editing surface.
- **Slate changelog** (v0.47 through v0.61+): https://github.com/ianstormtaylor/slate/blob/main/docs/general/changelog.md — HIGH confidence. Documented history of breaking API changes and architectural pivots in a major editor framework.
- **Quill documentation — Why Quill**: https://www.quilljs.com/docs/why-quill/ — HIGH confidence. Rationale for API-driven design over DOM-driven design.
- **Context7 — ProseMirror docs**: /prosemirror/prosemirror, /prosemirror/prosemirror-view — HIGH confidence. Current API references for the most influential WYSIWYG editor framework.
- **Context7 — TipTap docs**: /websites/tiptap_dev — HIGH confidence. Extension system patterns from the most popular ProseMirror-based editor.
- **Context7 — Slate docs**: /ianstormtaylor/slate — HIGH confidence. Node-based editor patterns and transform API.
- **Worldnotes codebase analysis**: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md` — HIGH confidence. First-hand analysis of the specific codebase this research addresses.
- **Obsidian plugin model**: Industry knowledge — MEDIUM confidence. Obsidian's plugin system inspired this project but specific implementation details are based on community observation, not official documentation access.
- **General contentEditable pitfalls**: Synthesized from ProseMirror docs, Slate changelog, and community knowledge — MEDIUM confidence. Cross-referenced with multiple authoritative sources but some specific claims (IME event ordering, spellcheck behavior) are based on widely-documented browser quirks, not original research.

---

*Pitfalls research for: worldnotes browser-based inline Markdown editor*
*Researched: 2026-05-23*

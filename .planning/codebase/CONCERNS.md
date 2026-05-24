# Codebase Concerns

**Analysis Date:** 2026-05-23

## Technical Debt

**Fragile test infrastructure:**
- Issue: Tests use manual TypeScript transpilation via `typescript` module at runtime, writing temp CommonJS files to `tmpdir()`. No test framework (no Vitest, Jest, or Mocha). DOM APIs are hand-stubbed inline per test file.
- Files: `test/cursor.test.mjs` (lines 8-20), `test/navigation.test.mjs` (lines 8-20), `test/renderer.test.mjs` (lines 8-20)
- Impact: Tests are slow to write, slow to run, and difficult to extend. New contributors must understand the manual transpile-and-require pattern.
- Fix approach: Adopt Vitest with `@vitest/dom` or `happy-dom` for DOM stubbing. Replace raw `node:assert` with Vitest's richer assertions.

**`demo.ts` lives in the source tree:**
- Issue: `src/demo.ts` is demo/example code that gets compiled into the library output (`dist/demo.d.ts` generated). It imports from `'./index'` and sets up a browser demo, but the library bundles it as if it were library source.
- Files: `src/demo.ts`, `dist/demo.d.ts`, `vite.config.ts` (line 9: `include: ['src/**/*.ts']`)
- Impact: Consumers get an unintended `demo.d.ts` type declaration. The `tsc` build step compiles it. The `vite-plugin-dts` generates types for it.
- Fix approach: Move `demo.ts` to `demo/` directory, update `index.html` to point to `demo/demo.ts`, and exclude `demo/` from both `tsconfig.json` includes and `vite-plugin-dts` includes.

**Temp file accumulation from tests:**
- Issue: Each test file writes a temp file to `tmpdir()` using `Date.now()` in the filename (e.g., `worldnotes-cursor-{timestamp}.cjs`). These are never cleaned up.
- Files: `test/cursor.test.mjs` (line 18), `test/navigation.test.mjs` (line 18), `test/renderer.test.mjs` (line 18)
- Impact: Accumulated temp files in `/tmp` over repeated test runs. Low severity but sloppy.
- Fix approach: Delete temp files in a `finally` block, or switch to a test framework that handles this.

**Large monolithic editor module:**
- Issue: `src/editor.ts` is 489 lines, handling DOM construction, styles injection (120+ lines of inline CSS), context creation, rendering orchestration, breadcrumbs, navigation, input/keyboard/paste handling, save debouncing, caret management, and the public API — all in one file with deeply-nested closures.
- Files: `src/editor.ts`
- Impact: Hard to test individual pieces. Hard to reason about side effects. The `mountEditor` function alone is ~230 lines with many captured variables.
- Fix approach: Extract CSS to a separate `styles.ts` file. Extract rendering pipeline to its own module. Extract navigation/breadcrumb logic. Extract input handling.

**No way to delete pages:**
- Issue: The `StorageAdapter` interface has `get`, `set`, and `keys` but no `delete` method. The `EditorInstance` has no `deletePage()` method either.
- Files: `src/types.ts` (lines 40-44), `src/editor.ts` (lines 296-324)
- Impact: Once a page is created, it persists forever. No programmatic cleanup API. Users can't delete pages through the library.
- Fix approach: Add `delete(key: string): Promise<void>` to `StorageAdapter`, implement in both adapters, and expose on `EditorInstance`.

## Missing Infrastructure

**No ESLint configuration or installation:**
- Issue: `package.json` has `"lint": "eslint src --ext .ts"` but `eslint` is not listed in `devDependencies`. No `.eslintrc.*` or `eslint.config.*` file exists. Running `npm run lint` fails.
- Files: `package.json` (line 23)
- Impact: No automated code quality checks. Style inconsistencies go undetected.
- Fix approach: Install `eslint` and `typescript-eslint`, create an `eslint.config.mjs`, and verify `npm run lint` works.

**No code formatter:**
- Issue: No `.prettierrc`, `biome.json`, or other formatter config. No formatter in `devDependencies`.
- Impact: Inconsistent formatting across contributors. Code review noise.
- Fix approach: Add Prettier with a standard config and a `"format"` npm script.

**No CI/CD pipeline:**
- Issue: No `.github/workflows/` directory or CI configuration of any kind.
- Impact: No automated verification on push or PR. Type errors, test failures, and build breakage can be merged undetected.
- Fix approach: Add a GitHub Actions workflow running `npm run typecheck`, `npm test`, and `npm run build` on push/PR.

**No test framework or runner:**
- Issue: Tests are plain `.mjs` scripts run with `node test/cursor.test.mjs && node test/navigation.test.mjs && node test/renderer.test.mjs`. No watch mode, no isolated test selection, no coverage.
- Files: `package.json` (line 21)
- Impact: Brittle testing experience. No ability to run a single test. No coverage reports.
- Fix approach: Adopt Vitest. It provides `describe`/`it` semantics, watch mode, coverage via `v8`/`istanbul`, and is compatible with TypeScript out of the box.

**No coverage tooling:**
- Issue: `.gitignore` has entries for `coverage/` and `.nyc_output/` but no coverage tool is configured in package.json.
- Files: `.gitignore` (lines 16-17)
- Impact: No visibility into test coverage gaps. Untested code paths exist.
- Fix approach: Add `vitest` coverage configuration or `c8`.

**No CHANGELOG, LICENSE, or CONTRIBUTING files:**
- Issue: Repository is missing `CHANGELOG.md`, `LICENSE`, and `CONTRIBUTING.md`. The `package.json` has no `"license"` field either.
- Files: `package.json` (line 1-30, missing `"license"`)
- Impact: Unclear licensing terms for consumers. No contributor guide. No version history.
- Fix approach: Add `"license": "MIT"` (or appropriate) to `package.json`. Create `LICENSE`. Create `CHANGELOG.md` starting from 0.1.0. Add `CONTRIBUTING.md` with the contributor notes from `docs/architecture.md`.

## Security Concerns

**No XSS prevention guidance for custom plugins:**
- Issue: The editor core renders tokens safely (uses `createTextNode` and `createElement`, not `innerHTML`), but custom plugins can return arbitrary `HTMLElement` with any content. There is no documentation warning plugin authors about XSS risks.
- Files: `docs/api.md` (lines 62-82), `src/types.ts` (lines 74-79)
- Risk: Plugin authors might use `innerHTML` or insert user-controlled content unsafely.
- Current mitigation: Core renders safely. The public API contract (`Plugin.render` returns `HTMLElement | Text`) encourages DOM API usage.
- Recommendations: Add an XSS warning section to `docs/api.md` under the Plugin section. Consider adding a sanitization utility that plugins can use.

**No Content Security Policy:**
- Issue: `index.html` has no CSP meta tag. The demo page runs with no restrictions.
- Files: `index.html`
- Risk: No defense-in-depth against XSS if a vulnerability is introduced.
- Recommendations: Document CSP recommendations for production deployment of the library.

**Long URL trail edge case:**
- Issue: `encodePathSearch` serializes the entire trail into a single `path` query parameter. Very long trails could hit URL length limits (~2048 chars in some browsers).
- Files: `src/navigation.ts` (lines 19-28)
- Risk: URLs become unwieldy with many nested pages. Could exceed browser limits.
- Current mitigation: Practical trails are typically short (3-5 pages).
- Recommendations: Consider capping trail length or using a more compact encoding if deep navigation becomes common.

## Performance Bottlenecks

**Full DOM rebuild on every keystroke:**
- Issue: The editor's `input` handler calls `render()` on every keystroke, which: sets `editorDiv.innerHTML = ''`, calls `extractText()`, calls `tokenizeDocument()` (re-tokenizes all text), calls `renderDocument()` (re-renders all tokens), rebuilds all DOM nodes from scratch, then tries to restore caret position.
- Files: `src/editor.ts` (lines 260-272, 162-177)
- Cause: No incremental rendering. The entire document is rebuilt on every character typed.
- Improvement path: 

- **Low-hanging fruit**: Cache `buildPluginMap()` result (rebuilt every render cycle in `renderer.ts:99`). Only invalidate when plugins change.
- **Medium**: Track which lines changed and only retokenize/re-render those lines.
- **Deep**: Implement a virtual DOM or targeted DOM patching approach.

**Tokenization runs for entire document every keystroke:**
- Issue: `tokenizeDocument()` splits the full document text by `\n` and tokenizes every line, even if only one line changed.
- Files: `src/tokenizer.ts` (lines 95-97), `src/editor.ts` (line 165)
- Cause: `extractText(editorDiv)` extracts the full document every time.
- Improvement path: Track line-level dirty flags. Only retokenize lines whose content changed.

## Maintainability Issues

**CSS embedded as a 120-line template string in editor.ts:**
- Issue: The `DEFAULT_CSS` constant is a 120-line template string hardcoded in `src/editor.ts`. This makes style iteration difficult and bloats the editor module.
- Files: `src/editor.ts` (lines 369-489)
- Impact: No syntax highlighting, no linting for CSS, hard to review style changes alongside logic changes.
- Fix approach: Extract to `src/styles.ts` exporting the CSS string constant, or consider a CSS file import via Vite.

**Complex cursor caret management logic:**
- Issue: `src/cursor.ts` (221 lines) has deeply recursive tree-walking functions (`walk`, `walkChildren`, `getPreviewOffset`, `findTextPosition`) that are tightly coupled to the DOM structure produced by the renderer.
- Files: `src/cursor.ts`
- Impact: Bug-prone. Changes to renderer or DOM structure can break caret restoration silently. Tests cover some edge cases but not all.
- Safe modification: Be very careful when changing the DOM structure (what elements are created, how `data-raw` is used). Always run cursor tests before committing.

**No unit tests for core modules:**
- Issue: The following modules have NO tests:
  - `src/editor.ts` (core orchestration — untested)
  - `src/tokenizer.ts` (tokenization logic — untested)
  - `src/types.ts` (interfaces only — low risk)
  - `src/plugins/wikiLink.ts` (plugin — untested)
  - `src/plugins/headings.ts` (plugin — untested)
  - `src/plugins/inline.ts` (5 plugins — all untested)
  - `src/plugins/defaults.ts` (plugin list — low risk)
  - `src/storage/localStorage.ts` (storage adapter — untested)
  - `src/storage/indexedDB.ts` (storage adapter — untested)
- Files: All files in `test/` (only 3 test files exist)
- Risk: Regressions in tokenization, plugin rendering, storage, or editor orchestration go undetected. The editor module is entirely untested.
- Priority: High for `tokenizer.ts` (pure logic, easy to test). High for `editor.ts` (most complex module).
- Fix approach: Add `test/tokenizer.test.ts`, `test/editor.test.ts`, and `test/storage.test.ts` using Vitest with DOM stubbing.

## Missing Critical Features

**No page deletion API:**
- Problem: There is no way to delete a page through the public API or storage interface. Created pages exist forever.
- Blocks: Applications that need page management (delete, rename, move).
- Fix approach: Add `delete(key: string): Promise<void>` to `StorageAdapter` interface, implement in both adapters, add `deletePage(page: string)` to `EditorInstance`.

**No page listing/autocomplete:**
- Problem: The `EditorContext` and `StorageAdapter` provide `keys()` and `getWorld()` but there is no built-in autocomplete or page listing UI. Wiki link creation requires typing full page names without assistance.
- Blocks: Discoverability in larger wikis. Users must remember exact page names.
- Fix approach: Add an `onSuggestPages` callback to `EditorOptions` that fires when `[[` is typed, or expose a `getPages(): Promise<string[]>` method on `EditorInstance`.

**No mobile/responsive optimization:**
- Problem: The editor uses `contenteditable` with `white-space: pre-wrap` and `word-break: break-word`. No mobile-specific handling for virtual keyboards. No touch-friendly UI adaptations.
- Blocks: Mobile usage is unverified.
- Fix approach: Test on mobile browsers. Consider `inputmode` attributes, touch event handling, and viewport adjustments.

## Dependency Risks

**Zero external runtime dependencies:**
- Risk: The library is self-contained (no runtime deps). This is actually a strength, not a concern. However, it means all functionality (tokenization, rendering, storage, navigation) is hand-rolled and must be maintained.

**TypeScript `^5.4.0` — loose pinning:**
- Risk: The caret (`^`) allows minor version upgrades. TypeScript minor versions can introduce new strictness checks that break the build.
- Files: `package.json` (line 26)
- Impact: CI-less repo means no automated detection of breakage from dependency upgrades.
- Mitigation: The `package-lock.json` pins exact versions. But if lockfile is regenerated locally, breakage could occur.

**Vite `^5.2.0` and `vite-plugin-dts` `^3.9.0`:**
- Risk: `vite-plugin-dts` is a community plugin, not officially maintained by the Vite team.
- Files: `package.json` (lines 27-28)
- Impact: If `vite-plugin-dts` is abandoned or incompatible with future Vite versions, type generation breaks.
- Migration plan: Monitor the plugin's maintenance status. Vite 6+ may include native DTS generation.

## Test Coverage Gaps

**Untested module: `src/tokenizer.ts`:**
- What's not tested: `tokenizeLine()`, `scanInline()`, `tokenizeDocument()` — the entire tokenization pipeline.
- Files: `src/tokenizer.ts` (97 lines, pure logic, no DOM)
- Risk: Token pattern bugs (ordering, overlapping matches, edge cases) go undetected. High likelihood of regression when adding new plugins.
- Priority: High

**Untested module: `src/editor.ts`:**
- What's not tested: `createEditor()`, `EditorBuilder.mount()`, `mountEditor()` — the entire editor lifecycle, input handling, navigation, saving, breadcrumbs, DOM construction.
- Files: `src/editor.ts` (489 lines, most complex module)
- Risk: Any change to editor behavior has no automated regression protection.
- Priority: High (but requires significant test infrastructure investment)

**Untested module: `src/plugins/*`:**
- What's not tested: All built-in plugins (wikiLink, headings, bold, italic, inlineCode, blockquote, hr). Token pattern matching and rendering.
- Files: `src/plugins/wikiLink.ts`, `src/plugins/headings.ts`, `src/plugins/inline.ts`
- Risk: Plugin rendering bugs or pattern changes go undetected.
- Priority: Medium

**Untested module: `src/storage/*`:**
- What's not tested: `LocalStorageAdapter` and `IndexedDBAdapter` — the full persistence layer.
- Files: `src/storage/localStorage.ts`, `src/storage/indexedDB.ts`
- Risk: Storage bugs only discovered at runtime in browser. IndexedDB has complex async transaction semantics.
- Priority: Medium

## Improvement Opportunities

**Structural refactors:**
1. Extract CSS from `src/editor.ts` to `src/styles.ts` — reduces editor module by 120 lines and makes styles independently maintainable.
2. Extract breadcrumb logic from `src/editor.ts` to `src/breadcrumb.ts` — pure DOM-building logic, easy to test.
3. Extract input handling (paste, keyboard, Tab, Enter) from `src/editor.ts` to `src/input.ts`.
4. Move `src/demo.ts` to `demo/demo.ts` or `playground/demo.ts` — clean separation of library code and example code.

**Tooling improvements:**
1. Add Vitest + `happy-dom` for testing — enables proper `describe`/`it` tests with DOM support.
2. Add ESLint + `typescript-eslint` — enforce consistent style and catch common errors.
3. Add Prettier — automate formatting.
4. Add GitHub Actions CI — run `typecheck`, `test`, and `build` on push/PR.
5. Add coverage thresholds — enforce minimum coverage on critical modules.

**API enhancements:**
1. Add `StorageAdapter.delete(key: string): Promise<void>` — enable page deletion.
2. Add `EditorInstance.deletePage(page: string): Promise<void>` — public delete API.
3. Add `EditorInstance.listPages(): Promise<string[]>` — expose available pages via storage adapter.
4. Consider adding `StorageAdapter.rename(oldKey: string, newKey: string)` for page renaming.

**Performance optimization:**
1. Cache `buildPluginMap()` result in renderer, invalidating only when plugins change.
2. Implement line-level dirty tracking so only changed lines are retokenized and re-rendered.
3. Consider debouncing the render as well as the save (currently only save is debounced at 600ms).

---

*Concerns audit: 2026-05-23*

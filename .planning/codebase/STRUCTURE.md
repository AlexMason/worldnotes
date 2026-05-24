# Codebase Structure

**Analysis Date:** 2026-05-23

## Directory Layout

```
worldnotes/
├── .planning/           # GSD planning artifacts (codebase maps, phase docs)
│   └── codebase/        # Codebase analysis documents
├── dist/                # Build output (generated, committed)
├── docs/                # Library documentation
├── node_modules/        # Dependencies (not committed)
├── src/                 # Library source code
│   ├── plugins/         # Built-in token/renderer plugins
│   └── storage/         # Persistence adapter implementations
├── test/                # Test suite (plain .mjs, no bundler)
├── index.html           # Vite dev server entry (loads demo.ts)
├── package.json         # Package manifest, scripts, dependencies
├── tsconfig.json        # TypeScript compiler configuration
├── vite.config.ts       # Vite library build + dts plugin config
├── README.md            # Project overview, quickstart, API summary
└── AGENTS.md            # Agent instructions for development workflows
```

## Directory Purposes

**`src/`:**
- Purpose: All library source code. Compiled by `tsc` and bundled by Vite.
- Contains: TypeScript modules organized by concern (core pipeline, plugins, storage).
- Key files: `index.ts` (public API), `editor.ts` (orchestrator), `types.ts` (all interfaces).

**`src/plugins/`:**
- Purpose: Built-in plugin implementations. Each plugin defines token patterns, rendering, and optional navigation.
- Contains: Individual plugin modules + barrel file + defaults preset.
- Key files: `defaults.ts` (plugin ordering), `wikiLink.ts` (most complex plugin), `inline.ts` (bold/italic/code/blockquote/hr).

**`src/storage/`:**
- Purpose: Persistence adapter implementations conforming to the `StorageAdapter` interface.
- Contains: `localStorage.ts` and `indexedDB.ts` adapters + barrel file.
- Key files: `localStorage.ts` (default adapter), `indexedDB.ts` (higher-capacity alternative).

**`test/`:**
- Purpose: Test suite. Tests are plain `.mjs` files using Node's built-in `assert` module.
- Contains: Three test files covering cursor, renderer, and navigation modules.
- Key files: `cursor.test.mjs` (DOM simulation), `renderer.test.mjs` (fake DOM), `navigation.test.mjs` (pure functions).

**`docs/`:**
- Purpose: Library documentation for consumers and contributors.
- Contains: Three markdown files covering overview, API reference, and architecture.
- Key files: `overview.md` (getting started), `api.md` (full API surface), `architecture.md` (contributor guide).

**`dist/`:**
- Purpose: Build output directory. Committed to the repository because `package.json` points consumers at these files.
- Contains: `worldnotes.js` (ESM), `worldnotes.umd.cjs` (UMD/CJS), and `.d.ts` declaration files mirroring the `src/` directory structure.
- Generated: Yes — `tsc && vite build` populates this directory.
- Committed: Yes — intentional per project convention.

**`.planning/`:**
- Purpose: GSD workflow artifacts (codebase maps, implementation plans, milestone audits).
- Contains: `codebase/` subdirectory with architectural analysis documents.
- Generated: Yes — by `/gsd-map-codebase` and other GSD commands.
- Committed: Typically yes, as they are reference documents.

## Source Module Map (`src/`)

| Module | Path | Responsibility | Key Exports |
|--------|------|----------------|-------------|
| **Public API** | `src/index.ts` | Re-exports all public types, functions, plugins, and storage adapters | `createEditor`, `EditorBuilder`, all types, `defaultPlugins`, `LocalStorageAdapter`, `IndexedDBAdapter` |
| **Editor** | `src/editor.ts` | Orchestrator: mounts DOM, manages world/trail state, handles input events, debounced saves, navigation | `createEditor`, `EditorBuilder` (class) |
| **Types** | `src/types.ts` | All public TypeScript interfaces — the plugin contract | `Token`, `TokenDef`, `Plugin`, `StorageAdapter`, `EditorContext`, `EditorOptions`, `EditorInstance` |
| **Tokenizer** | `src/tokenizer.ts` | Converts raw text into per-line token arrays using plugin token definitions | `tokenizeDocument`, `tokenizeLine` |
| **Renderer** | `src/renderer.ts` | Converts token arrays into DOM fragments by dispatching to owning plugins | `renderDocument`, `renderLine` |
| **Cursor** | `src/cursor.ts` | Extracts plain text from contentEditable DOM and preserves/restores caret position across re-renders | `getCaretOffset`, `setCaretOffset`, `extractText`, `getTextOffset` |
| **Navigation** | `src/navigation.ts` | Parses wiki link syntax, derives display names, encodes/decodes breadcrumb trail in URL query params | `parseWikiLink`, `pageDisplayName`, `encodePathSearch`, `decodePathSearch` |
| **Demo** | `src/demo.ts` | Vite dev server entry point — demonstrates editor with a custom @mention plugin | (side-effect: mounts editor into `#app`) |
| **Plugins Barrel** | `src/plugins/index.ts` | Re-exports all built-in plugins and the `defaultPlugins` array | `wikiLinkPlugin`, `headingsPlugin`, `boldPlugin`, `italicPlugin`, `inlineCodePlugin`, `blockquotePlugin`, `hrPlugin`, `defaultPlugins` |
| **Defaults** | `src/plugins/defaults.ts` | The ordered array of default plugins used by `createEditor()` | `defaultPlugins` (Plugin[]) |
| **Wiki Link Plugin** | `src/plugins/wikiLink.ts` | `[[page]]` and `[[page|display]]` syntax; click to navigate, `data-raw` for cursor fidelity | `wikiLinkPlugin` |
| **Headings Plugin** | `src/plugins/headings.ts` | `#`, `##`, `###` heading syntax; line-level patterns | `headingsPlugin` |
| **Inline Plugins** | `src/plugins/inline.ts` | `**bold**`, `*italic*`, `` `code` ``, `> blockquote`, `---` hr; shared `withPunct` helper | `boldPlugin`, `italicPlugin`, `inlineCodePlugin`, `blockquotePlugin`, `hrPlugin` |
| **Storage Barrel** | `src/storage/index.ts` | Re-exports both storage adapters | `LocalStorageAdapter`, `IndexedDBAdapter` |
| **Local Storage** | `src/storage/localStorage.ts` | Default adapter; namespaced `localStorage` key/value store | `LocalStorageAdapter` (class) |
| **IndexedDB** | `src/storage/indexedDB.ts` | Higher-capacity adapter; IndexedDB object store with lazy `open()` | `IndexedDBAdapter` (class) |

## Test Organization (`test/`)

Tests are plain Node.js `.mjs` files using `node:assert/strict`. They do not use a test framework (no Jest, no Vitest). Each test file:

1. Reads the corresponding source TypeScript file via `node:fs/promises`
2. Compiles it on-the-fly with `ts.transpileModule()` to CommonJS
3. Writes the compiled code to a temp file
4. Requires the temp file and runs assertions

| Test File | Source Tested | What It Covers |
|-----------|---------------|----------------|
| `test/cursor.test.mjs` | `src/cursor.ts` | `getTextOffset` — DOM text extraction, `<br>` to newline, block element boundaries, `data-raw` resolution, caret offset mapping inside preview tokens |
| `test/renderer.test.mjs` | `src/renderer.ts` | `renderLine` — plugin rendering, raw text fallback when caret is inside a token (using fake DOM stubs for `HTMLElement`, `document`) |
| `test/navigation.test.mjs` | `src/navigation.ts` | `parseWikiLink`, `pageDisplayName`, `encodePathSearch`, `decodePathSearch` — pure function tests with no DOM dependencies |

Run with: `node test/cursor.test.mjs && node test/navigation.test.mjs && node test/renderer.test.mjs`

Tests print `{module} tests passed` on success and throw on failure (exiting with non-zero code).

## Documentation (`docs/`)

| Document | Audience | Contents |
|----------|----------|----------|
| `docs/overview.md` | Library consumers | What worldnotes is, when to use it, installation, core concepts, typical configuration, built-in features, next steps |
| `docs/api.md` | Library consumers | Full API surface: `createEditor`, `EditorBuilder`, `EditorInstance`, `Plugin` interface, `StorageAdapter`, exported types, plugin authoring guide |
| `docs/architecture.md` | Contributors | Module responsibilities table, editor lifecycle, rendering pipeline, navigation model, extension boundaries, contributor checklist |

## Build Output (`dist/`)

Generated by `tsc` (declarations) and `vite build` (bundles). The `package.json` `files` field includes only `dist/`.

| File | Purpose |
|------|---------|
| `dist/worldnotes.js` | ESM bundle (referenced by `"module"` and `"exports"."."."import"`) |
| `dist/worldnotes.umd.cjs` | UMD/CJS bundle (referenced by `"main"` and `"exports"."."."require"`) |
| `dist/index.d.ts` | Public API type declarations (referenced by `"types"`) |
| `dist/*.d.ts` | Per-module declaration files mirroring `src/` structure (`editor.d.ts`, `tokenizer.d.ts`, `renderer.d.ts`, `cursor.d.ts`, `navigation.d.ts`, `demo.d.ts`, `types.d.ts`, `plugins/*.d.ts`, `storage/*.d.ts`) |

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Package name (`worldnotes` v0.1.0), ES module type, dual ESM/CJS exports, test/build/dev scripts, devDependencies (typescript, vite, vite-plugin-dts) |
| `tsconfig.json` | TypeScript: ES2020 target, ESNext modules, bundler resolution, strict mode, declarations to `dist/`, root at `src/` |
| `vite.config.ts` | Vite library mode: entry is `src/index.ts`, outputs ESM + UMD, fully self-contained bundle (no externals), uses `vite-plugin-dts` for type generation |
| `.gitignore` | Excludes `node_modules/`, logs, env files, test/build caches (`coverage/`, `.vite/`, `.cache/`), editor/OS files, temp directories |
| `index.html` | Vite dev server entry — mounts demo at `#app`, loads `/src/demo.ts` as module, dark background styling |

## Naming Conventions

**Files:**
- Source: `camelCase.ts` (`tokenizer.ts`, `wikiLink.ts`, `localStorage.ts`)
- Entry points: `index.ts` (barrel files for `src/`, `plugins/`, `storage/`)
- Tests: `{module}.test.mjs` matching source module name
- Docs: `lowercase.md` (`api.md`, `overview.md`, `architecture.md`)

**CSS classes:**
- All library classes prefixed with `wn-` (`wn-root`, `wn-editor`, `wn-wiki-link`)
- BEM-like naming for variants: `wn-crumb--active`
- Punctation spans: `wn-punct`

**TypeScript:**
- Functions: `camelCase` (`createEditor`, `tokenizeDocument`, `parseWikiLink`)
- Types/Interfaces: `PascalCase` (`Plugin`, `StorageAdapter`, `EditorInstance`)
- Classes: `PascalCase` (`EditorBuilder`, `LocalStorageAdapter`, `IndexedDBAdapter`)
- Constants: `UPPER_SNAKE_CASE` (`DEFAULT_HOME`, `DEFAULT_CSS`, `DEFAULT_NAMESPACE`, `STORE_NAME`)
- Module-level plugin exports: `camelCase` suffixed with `Plugin` (`wikiLinkPlugin`, `boldPlugin`)

**Directories:**
- Lowercase, single-word: `src/`, `dist/`, `docs/`, `test/`
- Descriptive subdirectories: `plugins/`, `storage/`

## Where to Add New Code

**New built-in plugin:**
- Implementation: `src/plugins/{name}.ts`
- Export from: `src/plugins/index.ts`
- Register in: `src/plugins/defaults.ts` (add to `defaultPlugins` array in correct position)
- Export from: `src/index.ts` (add to built-in plugins section)
- Upload to docs: `docs/api.md` (add to plugin table), `README.md` (add to built-in plugins table)

**New storage adapter:**
- Implementation: `src/storage/{name}.ts` (implement `StorageAdapter` interface)
- Export from: `src/storage/index.ts`
- Export from: `src/index.ts` (add to storage adapters section)
- Upload to docs: `docs/api.md` (document the adapter)

**New public type:**
- Definition: `src/types.ts` (add interface)
- Export from: `src/index.ts` (add to types re-export)

**New test:**
- File: `test/{module}.test.mjs` following the existing pattern (read source, transpile with `ts.transpileModule`, write temp file, require, assert)
- Add to: `package.json` `"test"` script

**New documentation:**
- File: `docs/{name}.md`
- Link from: `docs/overview.md` and `README.md`

## Special Directories

**`dist/`:**
- Purpose: Build output consumed by package consumers
- Generated: Yes — `tsc && vite build`
- Committed: Yes — intentional; `package.json` `"files"` includes only `dist/`

**`.planning/`:**
- Purpose: GSD workflow artifacts
- Generated: Yes — by GSD commands
- Committed: Typically yes

---

*Structure analysis: 2026-05-23*

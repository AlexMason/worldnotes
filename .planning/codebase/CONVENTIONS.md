# Coding Conventions

**Analysis Date:** 2026-05-23

## Naming Conventions

**Files:**
- All files use **kebab-case**: `wikiLink.ts`, `localStorage.ts`, `indexedDB.ts`, `demo.ts`
- Barrel files are always named `index.ts` (e.g., `src/index.ts`, `src/plugins/index.ts`, `src/storage/index.ts`)

**Interfaces & Types:**
- Interfaces use **PascalCase** without `I` prefix: `Token`, `Plugin`, `StorageAdapter`, `EditorContext`, `EditorOptions`, `EditorInstance`, `WikiLinkTarget`
- All public contracts are defined as `interface` (not `type`), concentrated in `src/types.ts`

**Functions:**
- Functions use **camelCase**: `createEditor`, `tokenizeLine`, `renderLine`, `getCaretOffset`, `setCaretOffset`, `extractText`, `pageDisplayName`, `parseWikiLink`, `encodePathSearch`, `decodePathSearch`, `renderDocument`, `injectStyles`, `insertTextAtSelection`, `renderBreadcrumb`, `loadPage`, `navigateToPage`
- Helper functions (not exported) also use camelCase: `textToken`, `scanInline`, `buildPluginMap`, `containsNode`, `getPreviewOffset`, `findTextPosition`, `walk`, `walkChildren`, `renderHeading`, `withPunct`, `el`
- Unused parameters are prefixed with **underscore**: `_context`, `_ctx`, `_token`, `_content`

**Variables:**
- Local variables use **camelCase**: `saveTimer`, `isNavigating`, `editorDiv`, `breadcrumb`, `pluginMap`, `lineStart`, `remaining`, `earliest`
- Class instance properties: camelCase with optional `private readonly` prefix

**Constants:**
- Module-level constants use **UPPER_SNAKE_CASE**: `DEFAULT_HOME`, `BLOCK_ELEMENTS`, `DEFAULT_NAMESPACE`, `DEFAULT_DB_NAME`, `STORE_NAME`, `STYLE_ID`, `DEFAULT_CSS`

**Classes:**
- Classes use **PascalCase**: `EditorBuilder`, `LocalStorageAdapter`, `IndexedDBAdapter`
- Private members declared explicitly with `private` keyword

**Type parameters:**
- Not used in this codebase — generics are not employed for any public or internal types.

## Code Organization

**Section Dividers:**
Use em-dash comments to visually separate major sections within a file:

```typescript
// ─── Token ───────────────────────────────────────────────────────────────────

// ─── Internal mount ───────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
```

**Import Order:**
1. Type-only imports (`import type`) come first
2. Runtime value imports follow
3. Within each group, imports are sorted by path depth/alphabetical

```typescript
import type { Token, TokenDef } from './types'
import { LocalStorageAdapter } from './storage/localStorage'
import { defaultPlugins } from './plugins/defaults'
import { tokenizeDocument } from './tokenizer'
import { renderDocument } from './renderer'
```

**File Structure:**
1. Imports at top
2. Module-level constants and helper functions
3. Exported functions and classes
4. Private/internal functions

**Module Exports:**
- All exports are **named exports** — no default exports anywhere in the codebase
- The public API entry (`src/index.ts`) re-exports from sub-modules:

```typescript
export { createEditor, EditorBuilder } from './editor'
export type { Token, TokenDef, Plugin, /* ... */ } from './types'
export { LocalStorageAdapter } from './storage/localStorage'
```

**Barrel Files:**
- Every subdirectory has an `index.ts` that re-exports its contents
- `src/plugins/index.ts` — re-exports all plugin modules + `defaultPlugins`
- `src/storage/index.ts` — re-exports `LocalStorageAdapter` and `IndexedDBAdapter`

## TypeScript Patterns

**Strictness:**
- `"strict": true` in `tsconfig.json` — the strongest TypeScript strictness level
- `"skipLibCheck": true` — skips type-checking declaration files
- `"forceConsistentCasingInFileNames": true` — enforces case-sensitive imports

**Type-Only Imports:**
Always use `import type` for types to ensure they are erased at compile time:

```typescript
import type { Token, TokenDef } from './types'
```

**Interfaces over Type Aliases:**
All public contracts use `interface`, not `type`. This is consistent across the entire `types.ts` file.

**Non-Null Assertions:**
Used sparingly — only in `src/storage/indexedDB.ts`:

```typescript
private async ensureOpen(): Promise<IDBDatabase> {
  await this.open()
  return this.db!  // safe: open() sets this.db
}
```

**Optional Chaining & Nullish Coalescing:**
Used throughout for safe DOM access and default values:

```typescript
const handler = plugin.onNavigate.bind(plugin)
// ...
if (suppressed) e.preventDefault()

const saveDebounce = options.saveDebounceMs ?? 600
const raw = (node as HTMLElement).dataset?.raw
```

**Function Declarations:**
Functions within `editor.ts` are declared as `function` declarations inside `mountEditor()` closure — not assigned to `const`:

```typescript
function render(): void { /* ... */ }
function renderBreadcrumb(): void { /* ... */ }
async function navigateToPage(page: string): Promise<void> { /* ... */ }
```

**Discriminated Patterns:**
When distinguishing token types, a `switch` on `node.nodeType` is used with `Node.TEXT_NODE` / `Node.ELEMENT_NODE` constants rather than magic numbers.

## Error Handling

**Defensive Early Returns:**
Guard clauses return early when DOM APIs are unavailable:

```typescript
const sel = window.getSelection()
if (!sel || !sel.rangeCount) return 0
```

**Silent Catch Blocks:**
Empty `catch {}` blocks are used for non-critical operations (cursor restoration, initial focus):

```typescript
try { setCaretOffset(editorDiv, offset) } catch {}
try {
  range.setStart(editorDiv, 0)
  range.collapse(true)
  // ...
} catch {}
```

**Fallback Behavior:**
When cursor offset exceeds text length, the cursor falls back to end-of-element rather than throwing:

```typescript
if (target) {
  range.setStart(target.node, target.offset)
  range.collapse(true)
} else {
  // Fallback: place cursor at end of element
  range.selectNodeContents(el)
  range.collapse(false)
}
```

**No Custom Error Types:**
The codebase does not define or throw any custom error classes. Errors from storage adapters (e.g., IndexedDB failures) propagate as native promise rejections.

## Logging

**No Logging Framework:**
The library itself emits no log output. The only `console.log` calls exist in:
- `src/demo.ts` — demo-only `console.log` for mention plugin clicks and save events
- Test files — `console.log('cursor tests passed')` etc. as test completion markers

**No Debug/Trace Logging:**
Production code has no logging. Errors are silently swallowed or propagated as promise rejections.

## Comments

**JSDoc:**
All exported functions, classes, interfaces, and methods have JSDoc comments with `@param`, `@returns`, `@property`, `@method`, and `@example` tags:

```typescript
/**
 * Get the caret's character offset from the start of a contenteditable element.
 * Walks all text nodes to compute an absolute character position.
 *
 * @param el - The contenteditable root element
 * @returns  - Character offset, or 0 if there is no selection
 */
export function getCaretOffset(el: HTMLElement): number {
```

```typescript
/**
 * A single matched unit of content produced by the tokenizer.
 *
 * @property type   - Unique string identifying the token kind (e.g. 'bold', 'wiki-link')
 * @property raw    - The full original matched string from source text
 * @property groups - Regex capture groups; index 0 is the first capturing group
 */
export interface Token {
```

**Inline Comments:**
Used for non-obvious logic and section labels:

```typescript
// ** before * to avoid partial match
boldPlugin,

// World: in-memory cache of page content
const world: Record<string, string> = {}

// Separate line-level patterns (anchored at ^) from inline patterns
const lineDefs  = defs.filter(d => d.pattern.source.startsWith('^'))
```

**Comment Style:**
Inline comments use `//` with a space after the slashes. No block comments (`/* */`) found outside JSDoc.

## Code Style

**Formatting Tool:**
No ESLint, Prettier, or Biome configuration is present in the repository. The `lint` script in `package.json` references `eslint` but no eslint config file exists — the command would fail as configured.

**Indentation:**
2-space indentation throughout all source files.

**Quotes:**
Double quotes for all strings: `"text"`, not `'text'`. Consistent across source and test files.

**Semicolons:**
Mostly absent from source files. Test files use semicolons more consistently (mixing styles). The source code has no semicolons except in isolated cases (e.g., `index.html` inline styles, `vite.config.ts`).

**Trailing Commas:**
Used in multi-line arrays, objects, and parameter lists. Not used in single-line constructs.

**Line Length:**
No enforced limit. Lines occasionally exceed 100 characters, particularly imports with long paths and function signatures.

**Line Breaks:**
- Functions separated by a single blank line
- No blank lines between JSDoc and the function/interface it documents
- Opening braces on the same line as the declaration (K&R style)

**Spacing:**
- Spaces inside `{}` for single-line objects: `{ type: 'text', raw, groups: [raw] }`
- No space before `:` in object properties
- One space after `//` in comments
- Spaces around operators (`+`, `=`, `??`, `===`, etc.)

## Module Design

**Exports:**
- All exports are named exports. No default exports exist anywhere.
- Public API in `src/index.ts` re-exports everything consumers need
- Type exports use `export type { ... }` syntax

**Visibility:**
- Functions not exported are private to their module
- Class members use `private` keyword explicitly
- No `protected` or `public` keywords used (TypeScript defaults to public for class members)

---

*Convention analysis: 2026-05-23*

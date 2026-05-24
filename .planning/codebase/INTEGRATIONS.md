# External Integrations

**Analysis Date:** 2026-05-23

## APIs & External Services

**None.** `worldnotes` makes zero network calls. There are no HTTP requests, no WebSocket connections, no third-party SDKs, and no analytics/tracking. The library operates entirely within the browser's local context.

## Data Storage

**Databases:**
- **Browser `localStorage`** — default storage backend via `LocalStorageAdapter` (`src/storage/localStorage.ts`)
  - Keys are namespaced as `{namespace}::{pageName}` (default namespace: `worldnotes`)
  - No connection string; uses `window.localStorage` directly
- **Browser `IndexedDB`** — alternative storage backend via `IndexedDBAdapter` (`src/storage/indexedDB.ts`)
  - Database name: configurable (default: `worldnotes`)
  - Object store: `pages`
  - Lazily opens/creates the database on first access

**File Storage:**
- Not applicable — content is stored as string values in browser key-value stores.

**Caching:**
- In-memory `world` object (`Record<string, string>`) in `src/editor.ts` (line 122)
- Serves as a read cache to avoid async storage lookups on every render

## Authentication & Identity

**None.** The library has no concept of users, sessions, or authentication. It is a local-first editor with no remote backend. Identity concerns are the responsibility of the consuming application.

## Monitoring & Observability

**Error Tracking:**
- None integrated. Silent `try/catch` blocks in a few places (e.g., `src/editor.ts` lines 176, 243, 251) swallow errors without reporting.
- No `console.error` calls in production paths.

**Logs:**
- `console.log` used in `src/demo.ts` (demo only, lines 28, 63) — not in library code.

## CI/CD & Deployment

**Hosting:**
- Published as an npm package (`"name": "worldnotes"` at `v0.1.0` in `package.json`)
- `"files": ["dist"]` — only the build output directory is published

**CI Pipeline:**
- No CI configuration files detected (no `.github/`, `Jenkinsfile`, `.gitlab-ci.yml`, etc.)

## Environment Configuration

**Required env vars:**
- None. The library is configuration-free at the environment level.

**Secrets location:**
- Not applicable — no secrets, no API keys, no authentication tokens.

## Webhooks & Callbacks

**Incoming:**
- None. The library does not expose HTTP endpoints.

**Outgoing:**
- None. The library does not make outbound HTTP requests.

## Package Exports (Consumer Integration)

Consumers install `worldnotes` via npm and import from a single entry point:

```ts
import { createEditor, EditorBuilder } from 'worldnotes'
```

**Public API surface** (all exported from `src/index.ts`):

| Export | Kind | Purpose |
|--------|------|---------|
| `createEditor` | function | Entry point; returns an `EditorBuilder` |
| `EditorBuilder` | class | Fluent builder for plugin/storage configuration |
| `Token` | type | Matched token unit from the tokenizer |
| `TokenDef` | type | Regex-based token definition |
| `Plugin` | type | Interface for custom token/render/navigate plugins |
| `StorageAdapter` | type | Interface for custom persistence backends |
| `EditorContext` | type | Runtime context passed to plugin render/navigate |
| `EditorOptions` | type | Configuration passed to `createEditor()` |
| `EditorInstance` | type | Live editor returned by `.mount()` |
| `LocalStorageAdapter` | class | Default `localStorage`-backed storage |
| `IndexedDBAdapter` | class | `IndexedDB`-backed storage for larger worlds |
| `defaultPlugins` | Plugin[] | All built-in plugins pre-ordered |
| `wikiLinkPlugin` | Plugin | `[[page]]` navigation links |
| `headingsPlugin` | Plugin | `#`, `##`, `###` styled headings |
| `boldPlugin` | Plugin | `**text**` bold |
| `italicPlugin` | Plugin | `*text*` italic |
| `inlineCodePlugin` | Plugin | `` `code` `` inline code spans |
| `blockquotePlugin` | Plugin | `> text` blockquotes |
| `hrPlugin` | Plugin | `---` horizontal rules |

**Bundle formats:**
- ESM: `dist/worldnotes.js`
- UMD: `dist/worldnotes.umd.cjs` (global: `WorldNotes`)
- Types: `dist/index.d.ts`

## Data Flow Boundaries

```text
┌──────────────────────────────────────────────────────────┐
│  Browser (consumer app / demo page)                      │
│                                                          │
│  ┌─────────┐   createEditor(el)   ┌───────────────────┐  │
│  │  App    │ ──────────────────▶ │  worldnotes lib    │  │
│  │  Code   │ ◀───── EditorInstance│                   │  │
│  └─────────┘                    │  ┌── DOM (editable) │  │
│                                 │  │  ┌─ Tokenizer    │  │
│  ┌─────────┐  save callback     │  │  └─ Renderer     │  │
│  │ Storage │ ◀──────────────────│──┤                 │  │
│  │ (browser│                    │  └── URL (?path=)   │  │
│  │  APIs)  │                    └───────────────────┘  │
│  └─────────┘                                           │
└──────────────────────────────────────────────────────────┘
```

**Input boundaries (where data enters):**
1. **DOM input events** (`src/editor.ts` lines 260–288): `input`, `keydown`, `paste` on the `contentEditable` div
2. **URL query string** (`src/editor.ts` line 118, via `src/navigation.ts` `decodePathSearch`): `?path=` parameter restores the breadcrumb trail on page load
3. **Storage reads** (`src/editor.ts` lines 215, 227): `storage.get(page)` on navigation

**Output boundaries (where data exits):**
1. **Rendered DOM** (`src/editor.ts` lines 168–172): plugin-rendered `DocumentFragment`s injected into the editor container
2. **Storage writes** (`src/editor.ts` line 269): debounced `storage.set(page, content)` calls
3. **URL updates** (`src/editor.ts` line 207–209, via `src/navigation.ts` `encodePathSearch`): `window.history.replaceState` updates `?path=`
4. **User callbacks** (`src/editor.ts` lines 202, 253, 270): `onTrailChange`, `onPageLoad`, `onSave` invoked on the configured options object
5. **CSS injection** (`src/editor.ts` lines 359–367): Default `wn-*` styles appended to `document.head` on first mount

---

*Integration audit: 2026-05-23*

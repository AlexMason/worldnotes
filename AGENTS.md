# Agent Instructions

## Project Overview

`worldnotes` is a self-hosted markdown wiki server (TypeScript, Fastify,
PostgreSQL): anonymous visitors get cached, read-only server-rendered HTML at
`/{slug}` rendered by the SAME engine as the editor (single-renderer
constraint); OIDC-authenticated users get an inline markdown editor with
debounced autosave and If-Match conflict handling. Multiplayer/Yjs and npm
library packaging were removed in the server pivot — the editor lives in
`src/core/`, the client bootstrap in `src/client/`, the Fastify app in
`src/server/`, and env-agnostic code shared between them in `src/shared/`.
Docs: `docs/` (start with `architecture.md`); full pivot decisions in
`.pi/docs/plans/worldnotes-server-pivot.md`.

## Development Commands

Run these checks before reporting behavior changes as complete:

| Command | What it does |
|---------|-------------|
| `npm test` | Run all tests with Vitest (dom + node projects, single run) |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run test:coverage` | Run tests with v8 coverage report (threshold: 80% branches) |
| `npm run typecheck` | tsc across core/client/server configs (`tsconfig.*.json`) |
| `npm run lint` | ESLint static analysis on `src/` (errors fail, warnings allowed) |
| `npm run lint:fix` | Auto-fix ESLint errors where possible |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Check if source files match Prettier config (CI-friendly) |
| `npm run build` | Type-check then bundle edit client → `dist/client/` |
| `npm run dev` | Server with hot reload via `tsx watch` (needs Postgres) |
| `npm run dev:client` | Client bundle in watch mode |
| `npm start` | Run the server (`tsx src/server/index.ts`) |

**CI Pipeline:** Every push to `main` and every pull request triggers GitHub
Actions which runs: `typecheck → lint → test:coverage → build` against a
Postgres service container (`WN_TEST_PG_URL` enables the pg integration suite).
All steps must pass.

**Test infrastructure:**
- Framework: Vitest 4 with two projects — `dom` (happy-dom; core/client) and
  `node` (server/shared)
- Coverage: v8 provider, 80% branch/function/line/statement thresholds;
  server modules are covered, only bootstraps/type-only files excluded
- Tests are co-located: `src/<area>/__tests__/*.test.ts`

## Editing Guidelines

- Keep changes small and focused.
- `src/shared/` must stay environment-agnostic (no DOM, no Node APIs);
  `src/server/**` may import DOM-free parts of `src/core` (guarded by the
  node smoke test).
- **Single renderer:** the read path and the editor share one engine —
  `src/core/static-renderer.ts` (plugin `renderToHTML`) renders the reader,
  `src/core/renderer.ts` (plugin `render()`) renders the editor DOM, both
  over `src/core/tokenizer.ts` + `src/core/document.ts` (block pass for
  multi-line regions: fences, tables) + `src/core/plugins/`. There is no
  markdown-it. Any grammar change happens ONLY in `src/core/plugins/` and,
  for multi-line constructs, through a declarative `BlockDef` (detection +
  metadata; no structural render hooks — renderers group region lines
  generically). href/src safety
  (`isSafeHref`, `isSafeImageUrl`) lives inside the plugins because their
  string output is served to anonymous readers. The sanctioned divergences:
  internal links emit `<a href="/slug">` statically (zero-JS reader) but
  `<span data-page>` in the editable DOM (clicks intercepted via
  `onNavigate`), and reader CSS hides image punctuation — pinned by
  `src/core/__tests__/surface-parity.test.ts` (compares trees, not styles).
- **Text fidelity:** block-region lines render byte-exact DOM text (fences,
  pipes, dashes stay as dimmed/zero-sized text); `data-raw` belongs to
  token spans only (wiki links, list-item wrappers) and NEVER to a
  `div[data-line]` (the data-raw branch in content-text.ts swallows the line
  separator). `src/core/content-text.ts` is the single DOM↔source model
  shared by input serialization and caret math; the corpus property test
  must stay green with any grammar change.
- Slug policy lives in `src/shared/slug.ts` — change it, the DB `CHECK` in
  `migrations/001_init.sql`, and both route/SSR layers together. SECURITY:
  `SEGMENT_RE`'s charset is also what makes wiki-link `href="/{slug}"`
  injection-safe on the read path — loosening it deletes an XSS guard.
- Update `docs/api.md` when HTTP APIs or env configuration change;
  `docs/architecture.md` when module responsibilities or request flow change;
  `docs/theming.md` when editor `--wn-*` tokens or viewer CSS change.
- Do not commit `node_modules/`, `dist/`, `.env`, logs, or caches.

## Repository Notes

`dist/` holds the built edit client bundle and is not committed. The server
runs TypeScript directly via `tsx`; there is no server build artifact.

## Local Validation

The CI pipeline needs a GitHub remote to run. Until then validate locally
(with Postgres reachable for the integration suite):
```bash
npm run typecheck && npm run lint && WN_TEST_PG_URL=postgres://postgres@localhost:54432/worldnotes npm run test:coverage && npm run build
```

## Landmark settings

This repository uses the Landmark process. Agents read this block before any
phase. The process itself ships with the `landmark-*` skills; if those are not
installed, see https://github.com/alexmason/landmark.

```yaml
landmark:
  version: "0.1.0"
  branching: trunk              # gitflow (main + dev) | trunk (main only)
  default_branch: main          # production branch
  integration_branch: main      # under trunk: same value as default_branch
  issue_tracker: github         # github | file — decided once by landmark-init
  merge_strategy: squash        # squash | merge | rebase
  test_command: "npm test"      # e.g. "npm test"; empty means none configured
  coverage_command: "npm run test:coverage"  # optional, e.g. "npm run coverage"
  dev_environment: "npm run dev"  # (re)build + start local services, e.g. "docker compose up -d --build"
  manual_test_url: ""           # optional, e.g. http://localhost:3000
```

<!-- landmark:process:begin — managed by landmark-init; re-running it replaces everything up to the end marker. Put project instructions above the Landmark sections. -->

## Landmark process

This repository follows the Landmark process (https://github.com/alexmason/landmark). It applies to **every** change, however small, whether or not the user names a skill. The settings block above is authoritative.

**Before touching code**, find out where the work stands: run `landmark-status`, or read the frontmatter of `docs/plans/*.md`. Then follow the phase the work is in:

| State                                    | Do this                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| No issue for the request                 | `landmark-issue`                                            |
| Issue, no plan                           | `landmark-plan`                                             |
| Plan `draft`                             | Present it; the user approves in `landmark-plan`            |
| Plan `approved` / `implementing`         | `landmark-implement`                                        |
| Plan `implemented` / `in-review`         | `landmark-review`                                           |
| Plan `reviewed`                          | `landmark-file`                                             |
| Plan `filed`                             | Merge the PR if the user asks; then clean up                |

Rules that hold in every harness:

- **No code without an approved plan.** If the user asks for a change directly, name the phase that comes first and offer to start it; do not start coding. Never skip or reorder phases. A plan `status` that does not match the phase you are about to run is a stop-and-ask.
- **Humans gate the transitions:** plan approval, review sign-off, and the integration → production merge. Never approve, sign off, or merge to production on the user's behalf.
- **Branches and worktrees.** Work on `<type>/<n>-<slug>` branches off the integration branch, in a dedicated worktree at `../<repo>.worktrees/<type>-<n>-<slug>`. Implement, review, and file there; the main checkout stays on the integration branch. PRs target the integration branch.
- **One commit per plan step**, subject `<type>: <summary> (#<n> step <i>/<total>)`, with the ticked plan checkbox in the same commit.
- **The plan is the contract.** If it turns out to be wrong or incomplete, stop, propose an amendment, get agreement, update the plan, then continue.
- **GitHub goes through `gh`** whenever the repo has a GitHub remote (issues, PRs, comments); never `curl`, raw API calls, or browser steps.
- **Stop, don't improvise.** When a required tool is missing or a step cannot be done as written, say exactly what is missing and offer the documented alternative. Do not work around it without explicit approval.
- **State lives in the repository.** Resume from `docs/plans/` frontmatter and Git, never from memory of an earlier session.
- If the `landmark-*` skills are not installed, read the specification at https://github.com/alexmason/landmark/blob/main/docs/process.md and follow the matching phase there; do not proceed from memory.

<!-- landmark:process:end -->

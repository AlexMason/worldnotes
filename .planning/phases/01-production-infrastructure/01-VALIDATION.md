---
phase: 1
slug: production-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (Wave 1 Plan 01-01) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green with 80%+ branch coverage
- **Max feedback latency:** 15 seconds

---

## Per-task Verification Map

| task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01,03 | — | Lockfile pins exact versions | meta | `vitest run` / `eslint src` | ❌ W2 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFRA-04 | — | No secrets in CI | CI | `git push` → CI triggers | ❌ W2 | ⬜ pending |
| 01-01-03 | 01 | 1 | INFRA-03 | T-1-01 | ESLint errors block | lint | `eslint src` | ❌ W2 | ⬜ pending |
| 01-02-01 | 02 | 2 | INFRA-01,02 | — | Cursor module tested | unit | `vitest run cursor.test.ts` | ❌ W2 | ⬜ pending |
| 01-02-02 | 02 | 2 | INFRA-01,02 | — | Renderer tests converted | unit | `vitest run renderer.test.ts` | ❌ W2 | ⬜ pending |
| 01-03-01 | 03 | 2 | INFRA-01,02 | — | Navigation tests converted | unit | `vitest run navigation.test.ts` | ❌ W2 | ⬜ pending |
| 01-04-01 | 04 | 3 | INFRA-02 | T-1-02 | Tokenizer pure logic tested | unit | `vitest run tokenizer.test.ts` | ❌ W2 | ⬜ pending |
| 01-05-01 | 05 | 3 | INFRA-02 | — | Plugin modules tested | unit | `vitest run plugins.test.ts` | ❌ W2 | ⬜ pending |
| 01-05-02 | 05 | 3 | INFRA-02 | — | Storage adapters tested | unit | `vitest run storage.test.ts` | ❌ W2 | ⬜ pending |
| 01-05-03 | 05 | 3 | INFRA-02 | — | Editor module tested | unit | `vitest run editor.test.ts` | ❌ W2 | ⬜ pending |
| 01-06-01 | 06 | 4 | INFRA-05 | — | Branch coverage >= 80% | coverage | `vitest run --coverage` | ❌ W2 | ⬜ pending |
| 01-06-02 | 06 | 4 | INFRA-06 | — | Commands documented | documentation | `grep vitest AGENTS.md` | ❌ W2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with happy-dom environment and v8 coverage
- [ ] `eslint.config.mjs` — ESLint flat config with typescript-eslint + prettier
- [ ] `.prettierrc` — Prettier formatting configuration
- [ ] `.github/workflows/ci.yml` — GitHub Actions CI pipeline
- [ ] `src/__tests__/cursor.test.ts` — Converted cursor tests (covers INFRA-02 for cursor module)
- [ ] `src/__tests__/renderer.test.ts` — Converted renderer tests
- [ ] `src/__tests__/navigation.test.ts` — Converted navigation tests
- [ ] `src/__tests__/tokenizer.test.ts` — New tokenizer tests (highest gap priority)
- [ ] `src/__tests__/plugins.test.ts` — New plugin tests
- [ ] `src/__tests__/storage.test.ts` — New storage adapter tests
- [ ] All 8 npm packages installed (vitest, happy-dom, @vitest/coverage-v8, eslint, @eslint/js, typescript-eslint, prettier, eslint-config-prettier)
- [ ] Vite upgraded from 5 → 7, vite-plugin-dts upgraded from 3.9 → 5.0

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI workflow triggers on push | INFRA-04 | Requires GitHub remote push | Push to GitHub, verify Actions tab shows green workflow |
| Prettier formatting diff minimal | — | Subjective: check diff size | Run `npx prettier --check src/` and verify zero or minimal changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
issue: 26
title: Toolbar Link button loses the text selection on mobile, so no link is inserted
type: fix
branch: fix/26-mobile-toolbar-link
status: in-review
created: 2026-11-26
pr: ""
---

# Toolbar Link button loses the text selection on mobile, so no link is inserted

Issue: #26

## Goal

On touch devices (reported: Android Chrome), selecting text and tapping a toolbar button acts on that selection exactly as on desktop, and the link field can always be submitted: the Link field opens, a link is inserted around the selected text when the user confirms (soft-keyboard Enter/Go **or** a visible button), and a tap on a toolbar button never silently does nothing.

## Non-goals

- iOS Safari-specific behaviour beyond what the same fixes give for free (not reported; no device to verify).
- A new mobile-specific toolbar layout, floating selection toolbar, or long-press menus.
- Reworking the link grammar, suggestions, or the desktop flow (it keeps working unchanged: Enter submits, Escape cancels, blur on a mouse cancels).
- Reproducing a soft-keyboard IME in automated tests (not possible in happy-dom); the IME paths are covered by the browser events they ultimately produce (`submit`, `click`).

## Context

Reported flow (user, Android Chrome): select text → tap **Link** → the field appears → after confirming, **nothing is inserted**; the text looks unselected. Whether the other buttons work on mobile is untested.

Code on `main` (PR #23):

- `src/core/link-field.ts` (`openLinkField`): Enter is handled in an `input` `keydown` listener, and it **returns early on `e.isComposing`** (added in review for CJK IME). There is **no other way to submit**: no form, no button. `input.addEventListener('blur', () => finish('blur'))` cancels the field whenever the input loses focus.
- `src/core/editor-link.ts` (`open()`): captures `getSelectionOffsets(editorEl)` + page text when the button is pressed; `apply` → `commitModelEdit`. A `selectionchange` watcher closes the field when the page text changes.
- `src/core/editor-toolbar.ts`: cancels `mousedown` on buttons so the editor keeps focus and selection (verified working with a desktop mouse). `refresh()` runs on `selectionchange` and **disables every button when the live selection is outside the editor**; a disabled button does not fire `click`.
- Plan #20 verified desktop (Chromium, real mouse/keyboard) only; touch/mobile layout was explicitly left to manual review.

Suspected causes, ranked (all **[INFERENCE]** — the soft-keyboard behaviour cannot be reproduced here; desktop Chromium with touch emulation does not drive an IME):

1. **Enter never submits on Android.** Gboard and most Android soft keyboards report keystrokes in a text input as composition input (`keyCode 229`, `isComposing: true`) — including the Enter/Go key while the typed word is still the composing region. The `isComposing` guard added in review swallows exactly those events, and there is no other submit path. A native `<form>` submit is what Android keyboards' Go/Enter key triggers regardless of keydown quirks, and browsers do not fire implicit submission during a desktop IME composition either.
2. **Blur cancels the field.** Dismissing the keyboard, or tapping a suggestion/another control, blurs the input on touch devices and `finish('blur')` closes the field without a message.
3. **No visible submit/cancel affordance**, so (1) and (2) leave a touch user with no way to complete or abandon the field deliberately.
4. **Selection may already be gone at tap time.** Touch browsers dispatch the compat `mousedown` after the tap, so `preventDefault` there can be too late; the controller then captures a collapsed/absent selection (a link at the caret, or nothing), and the toolbar can disable its buttons between `touchstart` and `click`, swallowing the click.

## Decisions

| # | Decision | Alternative considered | Reason |
| - | -------- | ---------------------- | ------ |
| 1 | The link field becomes a native **`<form>`**: `submit` is the single commit path (typed text, or the highlighted suggestion when one is highlighted). The Enter `keydown` branch and the `isComposing` guard are removed; `Escape` stays on `keydown`. The input gets `enterkeyhint="go"`. | Keep `keydown` and relax the guard (`keyCode 229`). | Implicit form submission is what soft-keyboard Go/Enter triggers and is IME-correct on every platform (no submission mid-composition on desktop IMEs); sniffing key codes is fragile. |
| 2 | Add visible **Link** (submit) and **✕ Cancel** buttons in the field (all pointer types). They cancel `mousedown`/`pointerdown` defaults so pressing them never blurs the input first. | Buttons on touch only. | One UI; keyboard-less completion path; also gives a deliberate way out. |
| 3 | **Blur no longer cancels on coarse-pointer devices** (`matchMedia('(pointer: coarse)')`), and on any device ignores a blur whose `relatedTarget` is inside the field. Fine pointers keep today's blur-cancel. | Never cancel on blur; always cancel. | Soft keyboard dismissal/suggestion taps blur the input on touch; on desktop, clicking elsewhere should still dismiss. The stale-text guard and the Cancel button bound the open field's lifetime. |
| 4 | **Press snapshot** in the toolbar: on `pointerdown` on a button the toolbar records the editor selection offsets (+ page, text) and sets a "pressing" flag; the flag freezes `refresh()` (buttons cannot be disabled under a finger) until `click`/`pointerup`/`pointercancel`/a short timeout. On `click`, if the live selection is no longer the snapshot's (collapsed, moved, outside), the toolbar **restores the snapshot** (`setSelectionOffsets`, focus the editor) before running the action — only when page and text are unchanged since the snapshot. | Cancel `touchstart`/`pointerdown` defaults. | Cancelling touch defaults suppresses `click` and breaks scrolling/long-press semantics; restoring is local and defensive on every device. |
| 5 | All five buttons share the press path (scope chosen by the user: every button, not Link only). | Link only. | One code path; Bold/Italic/Underline/List have the same exposure. |
| 6 | A genuinely absent selection (the user is not in the editor) is unchanged: the buttons are disabled and `Ctrl+K` is a consumed no-op. | Open the field at the last-known caret anyway. | A link needs a place to go; with decision 4 a lost selection during a press is recovered, so an absent one really means "not editing". |

## Design

### Link field (`link-field.ts`)
- Root element becomes `<form class="wn-link-field" novalidate>` holding: the input (unchanged attributes plus `enterkeyhint="go"`), a submit `<button type="submit" class="wn-link-field-submit">Link</button>`, a `<button type="button" class="wn-link-field-cancel" aria-label="Cancel">✕</button>`, then the status message and (outside the flow, absolutely positioned) the suggestion list as today.
- `form` `submit`: `preventDefault()`; if a suggestion is highlighted → pick it, else `classifyLinkInput(input.value)` → error shows inline, valid → `commit`.
- `keydown`: `Escape` → cancel; ArrowUp/ArrowDown move the highlight; **no Enter handling**.
- `blur`: `if (relatedTarget inside field) return; if (coarsePointer()) return; finish('blur')`. `coarsePointer()` = `window.matchMedia?.('(pointer: coarse)').matches === true`.
- Cancel button click → `finish('cancel')`. Submit/cancel buttons and the list call `preventDefault()` on `mousedown` (list already does).
- CSS (`editor-dom.ts`): `.wn-link-field-submit`/`-cancel` styled like `.wn-toolbar-btn` (same tokens, `--wn-touch-target` on narrow screens); the field row may wrap on mobile.

### Toolbar (`editor-toolbar.ts`)
- State: `press: { page, start, end, text } | null` and a 1 s safety timer.
- `pointerdown` on a button (capture, on the group): snapshot via `getSelectionOffsets`; set `press` (null snapshot → no restore, but the freeze still applies).
- `refresh()` returns early while `press` is set.
- `click`: compute live `getSelectionOffsets`; if `press?.start` exists and (live is null or differs) and page/text unchanged → `setSelectionOffsets(editorEl, start, end)`; focus the editor; run the action; clear `press`; `refresh()`.
- `pointerup`/`pointercancel`/timeout: clear `press` (and `refresh()` if no click followed). Existing `mousedown` `preventDefault` stays (desktop behaviour unchanged).

### Docs
`docs/architecture.md` (link field: form submit, blur policy; toolbar press snapshot), `docs/theming.md` (`.wn-link-field-submit`, `.wn-link-field-cancel`, field is a `form`), `docs/shortcuts.md` untouched (chords unchanged; add one sentence that on touch devices the field's Link button/keyboard Go submits).

## Testing

- **Unit/e2e (happy-dom):**
  - Link field: `submit` event commits typed text; `submit` with a highlighted suggestion picks it; an Enter `keydown` (even `isComposing`) does **not** submit by itself (the form owns it); the Link button commits; ✕ cancels and restores the selection; `Escape` still cancels; blur cancels on a fine pointer but not on a coarse one (mock `matchMedia`) and not when `relatedTarget` is inside the field; mousedown on the buttons is default-prevented.
  - Toolbar: pointerdown snapshot → simulated selection loss (`removeAllRanges` + `selectionchange`) → `click` still applies bold/list to the original selection and Link opens with the original selection; buttons stay enabled while pressing; no restore when the text changed since the snapshot; state refresh resumes after the press; existing toolbar tests unchanged.
- **Not reproducible in automation:** Android Gboard composition behaviour; real-touch selection handling.
- **Manual on a real Android phone (required before merge; I can serve a dev build over the LAN):** `npm run dev` with `HOST=0.0.0.0` and `AUTH_DISABLED=1` against a throwaway DB; on the phone, select a word, tap each toolbar button (selection retained, edit applied); tap **Link**, type a page name or URL, confirm with (a) the keyboard Go/Enter key, (b) the on-screen **Link** button; tap a suggestion; dismiss the keyboard and confirm the field stays open until **✕**; confirm the link lands around the selected text. Re-check desktop Chromium (Enter submits, Escape/mouse-blur cancel).
- Gate: `npm run typecheck && npm run lint && WN_TEST_PG_URL=… npm run test:coverage && npm run build`.

## Steps

- [x] 1. Link field: native `<form>` submit (Enter/Go), visible Link/✕ buttons, blur policy (coarse pointer / inside-field), CSS; tests; docs (`architecture.md`, `theming.md`, `shortcuts.md`).
- [x] 2. Toolbar press path: `pointerdown` selection snapshot, refresh freeze, restore-before-action for every button; tests; `architecture.md` note.

## Risks & open questions

- *Accepted:* The root cause is inferred (causes 1–4 above); an Android soft keyboard cannot be reproduced in automation. Steps 1 and 2 cover all four candidates, so the fix does not depend on which one it was; the manual device check is the proof. If it still fails on the device, the next step is an instrumented build (log `keydown`/`beforeinput`/`submit`/`blur`/selection events) served over the LAN — we would amend this plan before changing more code.
- *Accepted:* Decision 6 leaves "button pressed with a genuinely absent selection" as a no-op (the buttons are disabled there).
- *Accepted:* On touch devices clicking elsewhere does not dismiss the link field; it closes via ✕, Link, Escape, page change, or navigation.
- *Accepted:* iOS Safari is unverified.

## Implementation notes

- 2026-11-26 — `main` gained an **Image** toolbar button (#21) after the plan was written. It rides the same press path (snapshot, freeze, restore, then `fileInput.click()` inside the click handler, so the picker still has its user activation); no design change.
- The branch was rebased onto `origin/main` (also picks up #25).
- 2026-11-26 (review) — The press-state design changed from the plan's "`pointerup`/`pointercancel`/1 s timeout clear the press" to: freeze lasts until `click`, `pointercancel`, **300 ms after `pointerup`** if no click follows, or 5 s for a press never released; keyboard activation (`keydown` on the group) drops the snapshot. Reason: a 1 s expiry would drop the snapshot for a slow tap or long-press (review finding), and `pointerup` itself must not clear it because the `click` follows it.
- Escape now listens on the whole form and focus-out replaces the input's `blur` (see Review): Tab can land on the new buttons.
- 2026-11-26 (user, after phone testing) — **Prefill:** opening the link field with text selected fills the input with that text (trimmed, single line, ≤ 200 chars) and selects it, so the user can type over it or just press **Link** (which links the selection to the page it names, or as a URL if it is one). An existing link's target still takes precedence. Implemented in `editor-link.ts` (`initial`); the field already selects its content on open and runs the hint and suggestions for it. Small scope extension agreed in conversation; docs and tests updated.

## Review

Mode: sub-agents

Three fresh-context reviewers (conformance & correctness, quality, security & scalability).

**Related — fixed:**

- *major* (A, B, C): the new Link/✕ buttons are tab stops, but Escape and blur-cancel were wired to the input only: Tab onto a button left the field open (toolbar hidden) with Escape and click-away dead — a desktop regression of the plan's "desktop unchanged" non-goal. Escape is now handled on the form and `focusout` on the form replaces the input `blur` (ignoring focus moves between the field's own controls, and keeping the coarse-pointer exemption). Tests: Tab to a button then Escape; focus leaving from a button cancels on a fine pointer.
- *minor* (A, B, C): the 1 s press expiry dropped the snapshot for a slow tap/long-press, and there was no `pointerup` handling (release-off-button kept the freeze up to 1 s). Redesigned as above; tests for long-press, release-without-click, safety timeout, keyboard activation, destroy mid-press.
- *minor* (B): stale `link-field.ts` header comment; inline coarse-pointer check; press state machine (three-state variable, mid-function interface/constant). Header reworded, `isCoarsePointer()` extracted, `SelectionSnapshot` shared with `seen`, constants at module scope, single `press` object.
- *minor* (B): theming table lacked the new button tokens and the mobile wrap. Added.
- *minor* (A, B): test gaps — Image button through the press path, press with no selection, page changed between press and click, pointerdown on a non-button target, destroy mid-press, fine-pointer blur made explicit. Added.
- *nit* (A): the always-present empty message span added a gap on narrow screens. `:empty { display: none }`.

**Dismissed:**

- *nit* (C, B): `submit` picks a highlighted suggestion before typed text, so tapping the Link button after an arrow-key highlight commits the suggestion. Same as Enter; the highlight only exists after an explicit ArrowUp/Down.
- *nit* (B): the `enter()` test helper "just calls submit". It documents what a browser does (implicit submission); happy-dom has none.
- *nit* (C): coarse-pointer devices never close the field on blur and a navigation without `selectionchange` leaves it open. Accepted in the plan; the submit-time stale check bounds it.
- *nit* (B): a silently ignored restore (text/page changed) gives no feedback. Consistent with the stale-text policy elsewhere; the user's tap then acts on whatever is current.

**Unrelated but important:** none found.

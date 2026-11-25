# Theming

WorldNotes has two visual surfaces that share **one** token set: the
**editor** (authenticated edit surface, browser) and the **viewer**
(server-rendered reading pages). Both ship the same warm-paper light theme
with an automatic dark variant via `prefers-color-scheme`, and both can be
re-skinned — chrome, article and editor content — with CSS custom properties
alone, from an admin-authored theme. No forking, no `!important`.

- [How a theme is applied](#how-a-theme-is-applied)
- [Quick start: a starter theme](#quick-start-a-starter-theme)
- [Token reference](#token-reference)
- [Selectors worth knowing](#selectors-worth-knowing)
- [Surfaces, source layout, fidelity](#surfaces-source-layout-fidelity)
- [Responsive](#responsive-mobile)

## How a theme is applied

1. Admins author themes in the **admin gallery** (`/admin`): create / edit
   a named stylesheet (up to **64 KB**), then **activate** one. Exactly one
   theme (or none) is active at a time. Admins can look at a theme before
   activating it with `/?previewTheme=<id>` (admin-only, never cached; the
   gallery links to it).
2. The active theme's CSS is emitted **inline**, as
   `<style id="worldnotes-theme">`, **after** the default stylesheet — and
   therefore after the built-in `prefers-color-scheme` block — on:
   - the **reader** (`renderLayout`, `LayoutOptions.themeCss`), and
   - the **editor** (config embedded in the edit shell; the client injects
     the style directly after `<style id="worldnotes-styles">` via
     `EditorOptions.themeAppend`).
3. **`/admin` never gets the theme.** A broken theme must not bury the form
   used to recover it (same anti-lockout rule as the header/footer bands).
4. Because the theme sits later in the cascade at equal specificity, it
   simply **overrides tokens**: declare them on `:root`. A theme owns both
   colour modes — set the palette once, and (optionally) add your own
   `@media (prefers-color-scheme: dark)` block, or force a single mode with
   `color-scheme: light`.
5. A syntactically broken theme degrades to the default look: every `var()`
   in the default CSS carries a literal fallback, and the unparsable part of a
   stylesheet is skipped by the browser.

Changing the active theme busts reader caches (it rides the settings
revision); no restart needed.

**Trust model.** Admin-authored CSS is the same privilege class as the
header/footer HTML bands (which already run arbitrary admin markup and script
for every reader — see [api.md](api.md)). Guardrails: 64 KB cap, control
characters rejected, and any `</style` is rejected (the only break-out of an
inline `<style>` sink). Non-admin theme authoring is out of scope.

**Embedding the editor core directly.** `createEditor(el, { theme })` still
**replaces** the whole default stylesheet (you then own all structural CSS).
`createEditor(el, { themeAppend })` is the override-layer equivalent: the
defaults stay and `themeAppend` is placed in its own
`<style id="worldnotes-theme">` directly after them (`''` removes it,
`undefined` leaves it untouched). `theme` and `themeAppend` compose.

## Quick start: a starter theme

Everything below is optional — delete what you do not want to change. Palette
primitives are the only values that need a dark twin; every semantic token
(`--wn-color-*`, toasts, shadows, …) follows them.

```css
/* ── Light palette ─────────────────────────────────────────────── */
:root {
  --wn-palette-bg: #fffdf8; /* page + editor background */
  --wn-palette-surface: #ffffff; /* toasts, shortcuts overlay */
  --wn-palette-fg: #1d2a26; /* body text */
  --wn-palette-fg-muted: #5f6f68; /* crumbs, markers, blockquotes */
  --wn-palette-accent: #0b7a5b; /* links, caret, focus ring */
  --wn-palette-accent-hover: #12a07a;
  --wn-palette-border: #dfe6e1; /* hairlines */
  --wn-palette-code-bg: #eef3ef; /* inline code + code blocks */
  --wn-palette-punct: #93a39b; /* dimmed markdown markers */
  --wn-palette-on-accent: #ffffff; /* text on an accent fill */
  --wn-palette-selection: rgb(11 122 91 / 22%);
  --wn-palette-success: #e6f4ec; /* toast tints */
  --wn-palette-warning: #fbf3dc;
  --wn-palette-danger: #fbe7e7;
  --wn-palette-shadow: rgb(16 40 30 / 14%);

  /* Typography + layout (semantic tokens — all optional) */
  --wn-font-family: 'Source Serif 4', ui-serif, Georgia, serif;
  --wn-font-heading: 'Inter', system-ui, sans-serif;
  --wn-font-size-body: 17px;
  --wn-measure: 42rem; /* article / editor column width */
  --wn-radius-control: 10px; /* inputs + buttons */
}

/* ── Dark palette (you own both modes: the theme is later in the cascade
      than the built-in dark block, so repeat all primitives you changed) ── */
@media (prefers-color-scheme: dark) {
  :root {
    --wn-palette-bg: #101714;
    --wn-palette-surface: #17211d;
    --wn-palette-fg: #dbe7e1;
    --wn-palette-fg-muted: #93a69d;
    --wn-palette-accent: #4cc9a0;
    --wn-palette-accent-hover: #7fe0be;
    --wn-palette-border: #26332d;
    --wn-palette-code-bg: #17211d;
    --wn-palette-punct: #5f7068;
    --wn-palette-on-accent: #101714;
    --wn-palette-selection: rgb(76 201 160 / 30%);
    --wn-palette-success: #15291f;
    --wn-palette-warning: #2b2614;
    --wn-palette-danger: #2d1a1a;
    --wn-palette-shadow: rgb(0 0 0 / 50%);
  }
}

/* ── Deep per-surface control (optional): tokens, not selectors ──────── */
:root {
  --wn-color-header-bg: var(--wn-palette-surface); /* top bar */
  --wn-color-heading-h1: var(--wn-palette-accent);
  --wn-color-code-block-bg: #0f1d18; /* fenced code only */
  --wn-color-table-head-bg: var(--wn-palette-code-bg);
}
```

Gotchas:

- **Declare on `:root`.** Semantic tokens are computed on `:root` from the
  palette, so `--wn-palette-*` set on `.wn-root` or any inner element does
  **not** reach the already-computed semantic tokens. (Setting a _semantic_
  token — e.g. `.wn-root { --wn-color-bg: … }` — on an inner element still
  works and wins locally, as before.)
- A token set to an invalid value makes the properties that read it invalid
  at computed-value time (they fall back to the property's initial value, not
  to the default literal); the per-`var()` fallbacks protect against tokens
  that are **missing**, not malformed.
- Set `color-scheme: light` (or `dark`) on `:root` if your theme is
  single-mode, so form controls and scrollbars match; the default reader
  declares `color-scheme: light dark`.

## Token reference

Tokens come in three tiers. All are plain CSS custom properties, namespaced
`--wn-*`, in `src/core/styles.ts` (`EDITOR_TOKENS_CSS`, declared once on
`:root` and shared by reader + editor).

1. **Palette primitives** `--wn-palette-*` — ~15 colours; the entire dark
   mode is a redeclaration of these.
2. **Semantic tokens** — colours (`--wn-color-*`), type, spacing, radii,
   shadows, layout constants and toast tokens. Each colour defaults to a
   palette primitive; the rest are literals. Declared on `:root`.
3. **Per-surface overrides** — `--wn-color-<surface>-*` tokens that are
   **not** declared by default. Every use site reads
   `var(--wn-color-<surface>, var(--wn-color-<semantic>, #literal))`, so they
   are inert until you set them, and unset they inherit from the semantic
   token (a restyled `--wn-color-border` still reaches every hairline).

### 1. Palette primitives

| Token                       | Light default          | Role                                    |
| --------------------------- | ---------------------- | --------------------------------------- |
| `--wn-palette-bg`           | `#fbfaf7`              | page / editor background                |
| `--wn-palette-surface`      | `#fbfaf7`              | toast + shortcuts overlay background    |
| `--wn-palette-fg`           | `#23211d`              | body text, headings, bold, code         |
| `--wn-palette-fg-muted`     | `#6f6a61`              | crumbs, list markers, blockquote        |
| `--wn-palette-accent`       | `#1a5fb4`              | links, wiki links, caret, focus ring    |
| `--wn-palette-accent-hover` | `#3f79c4`              | link hover                              |
| `--wn-palette-border`       | `#e3ded4`              | borders, hairlines, HR, table borders   |
| `--wn-palette-code-bg`      | `#f0ede6`              | inline code + code block background     |
| `--wn-palette-punct`        | `#a39b8d`              | dimmed markdown punctuation             |
| `--wn-palette-on-accent`    | `#fbfaf7`              | text on an accent fill                  |
| `--wn-palette-selection`    | `rgb(26 95 180 / 25%)` | `::selection` background                |
| `--wn-palette-success`      | `#eef6ee`              | success toast tint                      |
| `--wn-palette-warning`      | `#f7f2e4`              | warning toast tint                      |
| `--wn-palette-danger`       | `#f7e9e9`              | error toast tint                        |
| `--wn-palette-shadow`       | `rgb(0 0 0 / 12%)`     | shadow colour (dropdowns, menu, toasts) |

Built-in dark values live in the `@media (prefers-color-scheme: dark)` block
right after the light declarations.

### 2. Semantic tokens

**Colours** (each defaults to the palette primitive shown)

| Token                                      | Default from   | Used by                                                 |
| ------------------------------------------ | -------------- | ------------------------------------------------------- |
| `--wn-color-bg`                            | `bg`           | reader `body`, `.wn-root`, dropdown background          |
| `--wn-color-surface`                       | `surface`      | shortcuts overlay background                            |
| `--wn-color-fg`                            | `fg`           | body text, chrome foreground                            |
| `--wn-color-fg-muted`                      | `fg-muted`     | crumbs, nav links, list markers, placeholder            |
| `--wn-color-accent`                        | `accent`       | hover/open states, buttons, admin messages              |
| `--wn-color-accent-hover`                  | `accent-hover` | accent hover                                            |
| `--wn-color-on-accent`                     | `on-accent`    | text on hovered toast buttons                           |
| `--wn-color-border`                        | `border`       | every hairline (header, toolbar, panels, cells, inputs) |
| `--wn-color-code-bg`                       | `code-bg`      | inline code, code blocks, shortcut key caps             |
| `--wn-color-punct`                         | `punct`        | `.wn-punct`, code fences, image src                     |
| `--wn-color-heading-h1/-h2/-h3`            | `fg`           | heading text                                            |
| `--wn-color-bold` / `--wn-color-italic`    | `fg`           | emphasis text                                           |
| `--wn-color-code`                          | `fg`           | inline code + code-block text                           |
| `--wn-color-blockquote`                    | `fg-muted`     | blockquote text                                         |
| `--wn-color-hr`                            | `border`       | horizontal rule                                         |
| `--wn-color-wiki-link` / `--wn-color-link` | `accent`       | `[[wiki]]` + external links                             |
| `--wn-color-link-hover`                    | `accent-hover` | hover for both link kinds                               |
| `--wn-color-focus-ring`                    | `accent`       | `:focus-visible` outline                                |
| `--wn-color-selection-bg`                  | `selection`    | `::selection`                                           |
| `--wn-caret-color`                         | `accent`       | editor text cursor                                      |

**Typography**

| Token                                                | Default                                                    | Used by                                    |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `--wn-font-family`                                   | `ui-serif, Georgia, 'Times New Roman', serif`              | article/editor body text                   |
| `--wn-font-heading`                                  | `var(--wn-font-family)`                                    | headings, status-page `h1`                 |
| `--wn-font-mono`                                     | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | code, key caps, admin textarea             |
| `--wn-font-ui`                                       | `system-ui, sans-serif`                                    | chrome (header, nav, forms, toasts, bands) |
| `--wn-font-size-body`                                | `16px`                                                     | body text                                  |
| `--wn-font-size-h1/-h2/-h3`                          | `1.6rem / 1.3rem / 1.1rem`                                 | headings                                   |
| `--wn-font-size-small`                               | `14px`                                                     | chrome, code blocks, tables                |
| `--wn-font-size-xs` / `--wn-font-size-keys`          | `11px / 12px`                                              | shortcuts group labels / key caps          |
| `--wn-font-size-inline-code`                         | `.9em`                                                     | inline code                                |
| `--wn-line-height`                                   | `1.65`                                                     | body                                       |
| `--wn-line-height-heading` / `--wn-line-height-code` | `1.25 / 1.5`                                               | headings / code blocks                     |
| `--wn-font-weight-bold`                              | `700`                                                      | bold                                       |
| `--wn-font-weight-heading`                           | `700`                                                      | headings, table head, shortcuts title      |

**Spacing**

| Token                                                                 | Default                | Used by                                                                             |
| --------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| `--wn-padding-editor-y` / `-x`                                        | `2rem / 1.2rem`        | page padding (editor wrap **and** reader `main`)                                    |
| `--wn-padding-page-bottom`                                            | `5rem`                 | room below the document                                                             |
| `--wn-padding-header`                                                 | `.6rem 1.2rem`         | header bar (`.wn-view-bar`, `.wn-header`)                                           |
| `--wn-padding-toolbar`                                                | `.4rem 1.2rem`         | editor toolbar                                                                      |
| `--wn-padding-dropdown`                                               | `.4rem .7rem`          | breadcrumb dropdown                                                                 |
| `--wn-padding-input`                                                  | `.35em .6em`           | search + admin inputs                                                               |
| `--wn-padding-button`                                                 | `.4em 1.1em`           | admin form buttons                                                                  |
| `--wn-padding-code-block` / `--wn-margin-code-block`                  | `.6em .9em / .5em 0`   | fenced code blocks                                                                  |
| `--wn-padding-table-cell` / `--wn-margin-table`                       | `.15em .5em / .6em 0`  | pipe tables                                                                         |
| `--wn-padding-inline-code`                                            | `.1em .3em`            | inline code                                                                         |
| `--wn-margin-hr`                                                      | `1em 0`                | horizontal rule                                                                     |
| `--wn-block-padding-left`                                             | `1em`                  | blockquote                                                                          |
| `--wn-border-width-blockquote`                                        | `3px`                  | blockquote rule                                                                     |
| `--wn-list-indent`                                                    | `0.3em`                | extra tracking per list-indent space (presentation only; DOM text stays byte-exact) |
| `--wn-gap-breadcrumb`                                                 | `0`                    | breadcrumb items                                                                    |
| `--wn-gap-header`                                                     | `1rem`                 | crumbs ↔ nav                                                                        |
| `--wn-gap-nav`                                                        | `.8rem`                | nav links                                                                           |
| `--wn-gap-toolbar`                                                    | `6px`                  | toolbar items                                                                       |
| `--wn-band-gap-header` / `--wn-band-gap-footer` / `--wn-band-padding` | `1.5rem / 3rem / 1rem` | site header/footer bands                                                            |

**Radii, shadows, focus, transitions**

| Token                                              | Default                                    |
| -------------------------------------------------- | ------------------------------------------ |
| `--wn-radius-code`                                 | `4px` (inline code, code blocks, key caps) |
| `--wn-radius-control`                              | `6px` (inputs, buttons, menu toggle)       |
| `--wn-radius-dropdown`                             | `6px` (breadcrumb dropdown)                |
| `--wn-radius-menu`                                 | `8px` (mobile nav panel)                   |
| `--wn-radius-crumb`                                | `4px` (editor crumb hit area)              |
| `--wn-radius-image`                                | `0`                                        |
| `--wn-shadow-dropdown`                             | `0 4px 12px var(--wn-palette-shadow)`      |
| `--wn-shadow-menu`                                 | `0 6px 16px var(--wn-palette-shadow)`      |
| `--wn-focus-ring-width` / `--wn-focus-ring-offset` | `2px / 2px`                                |
| `--wn-transition-color`                            | `color 0.15s`                              |

**Layout constants**

| Token                                                 | Default                            | Used by                                                |
| ----------------------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `--wn-measure`                                        | `46rem`                            | reader `main`, editor column, site bands               |
| `--wn-touch-target`                                   | `44px`                             | minimum touch target on mobile (menu, actions, search) |
| `--wn-sidepanel-width`                                | `240px`                            | editor left/right panels                               |
| `--wn-crumb-max-width` / `--wn-nav-link-max-width`    | `18ch / 16ch`                      | per-item truncation                                    |
| `--wn-admin-form-width`                               | `32rem`                            | admin settings column                                  |
| `--wn-image-max-width`                                | `100%`                             | `.wn-image-img`                                        |
| `--wn-shortcuts-max-width` / `--wn-shortcuts-padding` | `min(560px, 92vw) / 1.2rem 1.4rem` | shortcuts overlay                                      |

**Toasts** (editor only)

| Token                                           | Default                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `--wn-toast-bg`                                 | `var(--wn-palette-surface)`                                               |
| `--wn-toast-bg-success` / `-warning` / `-error` | palette `success` / `warning` / `danger`                                  |
| `--wn-toast-border` / `--wn-toast-color`        | palette `border` / `fg`                                                   |
| `--wn-toast-radius`                             | `6px` (also the shortcuts overlay radius)                                 |
| `--wn-toast-shadow`                             | `0 4px 12px var(--wn-palette-shadow)` (also the shortcuts overlay shadow) |
| `--wn-toast-padding` / `--wn-toast-gap`         | `8px 12px` / `8px`                                                        |
| `--wn-toast-min-width` / `--wn-toast-max-width` | `260px` / `380px`                                                         |
| `--wn-toast-offset`                             | `12px` (distance from the viewport edge)                                  |

### 3. Per-surface overrides (unset by default)

Set any of these on `:root` to restyle one surface without touching the rest.
Shown as `token → fallback when unset`.

| Surface                        | Tokens                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header bar                     | `--wn-color-header-bg` → `transparent`; `--wn-color-header-border` → `--wn-color-border`                                                                                                          |
| Breadcrumbs                    | `--wn-color-crumb` → `fg-muted`; `--wn-color-crumb-hover` → `accent`; `--wn-color-crumb-current` → `fg`                                                                                           |
| Nav / actions                  | `--wn-color-nav-link` → `fg-muted`; `--wn-color-nav-link-hover` → `accent`; `--wn-color-menu-border` → `border` (mobile toggle)                                                                   |
| Dropdowns / mobile menu        | `--wn-color-dropdown-bg` → `bg`; `--wn-color-dropdown-border` → `border`; `--wn-radius-overlay` / `--wn-shadow-overlay` (shortcuts overlay) → toast radius / shadow                               |
| Toolbar                        | `--wn-color-toolbar-bg` → `transparent`; `--wn-color-toolbar-border` → `border`                                                                                                                   |
| Side panels                    | `--wn-color-sidepanel-bg` → `transparent`; `--wn-color-sidepanel-border` → `border`                                                                                                               |
| Search + admin inputs          | `--wn-color-input-bg` → `bg`; `--wn-color-input-fg` → `fg`; `--wn-color-input-border` → `border`                                                                                                  |
| Buttons (admin, toast actions) | `--wn-color-button-bg` → `transparent`; `--wn-color-button-fg` / `--wn-color-button-border` → `accent`; `--wn-color-admin-msg` → `accent`                                                         |
| Status pages                   | `--wn-color-status-heading` → `heading-h1`; `.wn-status` links use `--wn-color-link`                                                                                                              |
| Page lists / users table       | `--wn-padding-list-item` → `.15rem 0`; `--wn-color-table-border` → `border`                                                                                                                       |
| Article                        | `--wn-color-list-marker` → `fg-muted`; `--wn-color-list-text` → `fg`; `--wn-color-blockquote-border` → `border`; `--wn-color-link-marker` (external-link icon tint) → `fg-muted`; `--wn-icon-external` (icon shape: a CSS `url(...)` image used as a mask) → built-in box-and-arrow; `--wn-color-wiki-link-missing` (links to missing pages) → `fg-muted`; `--wn-link-missing-marker` (CSS string after missing links; `''` removes it) → `'/'`; `--wn-color-image-alt` → `fg-muted` |
| Code blocks                    | `--wn-color-code-block-bg` → `code-bg`; `--wn-color-code-block-fg` → `code`; `--wn-color-code-fence` → `punct`; `--wn-border-code-block` → `none`                                                 |
| Tables                         | `--wn-color-table-border` → `border`; `--wn-color-table-head-bg` → `transparent`                                                                                                                  |
| Selection                      | `--wn-color-selection-fg` → `currentColor`                                                                                                                                                        |
| Shortcuts overlay              | `--wn-color-shortcuts-bg` → `surface`; `-fg` → `fg`; `-border` → `border`; `-group` → `fg-muted`; `-keys-bg` → `code-bg`; `-keys-fg` → `code`                                                     |
| Remote cursors                 | `--wn-color-cursor-label-fg` → `#fff`                                                                                                                                                             |
| Site bands                     | `--wn-color-band-fg` → `fg-muted`; `--wn-color-band-border` → `border`                                                                                                                            |

### Aliases (legacy chrome names)

The reader's pre-unification chrome names remain as **read-only mirrors** on
`:root` so existing header/footer band HTML that reads them keeps working:

| Alias          | Resolves to                |
| -------------- | -------------------------- |
| `--wn-bg`      | `var(--wn-color-bg)`       |
| `--wn-fg`      | `var(--wn-color-fg)`       |
| `--wn-muted`   | `var(--wn-color-fg-muted)` |
| `--wn-accent`  | `var(--wn-color-accent)`   |
| `--wn-border`  | `var(--wn-color-border)`   |
| `--wn-code-bg` | `var(--wn-color-code-bg)`  |

The chrome itself reads `--wn-color-*` directly, so to **restyle** set
`--wn-palette-*` / `--wn-color-*`; overriding only an alias changes that alias
for author HTML that uses it and nothing else.

### Not tokenisable: the 640px breakpoint

CSS media _conditions_ cannot read custom properties, so the mobile
breakpoint (`@media (max-width: 640px)`) is a literal in the reader
(`VIEW_CSS`) and editor (`EDITOR_CHROME_CSS`). To move it, re-declare the
mobile rules in your own theme under your own `@media`. Everything **inside**
that query still reads tokens (`--wn-touch-target`, shadows, radii,
side-panel borders …). A few mobile-only paddings (`1.2rem .9rem 4rem`, the
`38%` panel height) are literals.

## Selectors worth knowing

Tokens cover colour, type, spacing and constants. When you need structure,
the stable hooks are the `.wn-*` classes:

- **Page chrome:** `body.wn-view`, `header.wn-view-bar` / `.wn-header`,
  `nav.wn-crumbs` / `.wn-breadcrumb`, `.wn-crumb`, `.wn-crumb-sep`,
  `.wn-crumb-more`, `.wn-crumb-drop`, `.wn-nav`, `.wn-menu`,
  `.wn-view-actions` / `.wn-actions`, `.wn-nav-link`, `main`.
- **Article / editor content:** `.wn-article`, `.wn-editor`, `.wn-editor-col`,
  `.wn-editor-wrap`, `.wn-h1…h3`, `.wn-punct`, `.wn-bold`, `.wn-italic`,
  `.wn-inline-code`, `.wn-code-text`, `.wn-blockquote`, `.wn-list-item*`,
  `.wn-hr`, `.wn-wiki-link`, `.wn-link`, `.wn-strikethrough`,
  `.wn-code-block` / `.wn-code-fence` / `.wn-code-line`,
  `.wn-table` / `-row` / `-head` / `-sep` / `-cells` / `-cell` / `-edge`,
  `.wn-align-left|center|right`, `.wn-image` / `-img` / `-alt` / `-src`.
- **Editor chrome:** `.wn-root`, `.wn-toolbar`, `.wn-body`,
  `.wn-left-sidepanel`, `.wn-right-sidepanel`, `.wn-footer`, `.wn-placeholder`,
  `.wn-overlay`, `.wn-toast*`, `.wn-shortcuts*`.
- **Reader-only:** `ul.wn-page-list`, `.wn-search-form`, `.wn-status`,
  `.wn-site-header` / `.wn-site-footer` (bands, both surfaces),
  `.wn-admin-form`, `.wn-users-table`, `.wn-visually-hidden`. The admin
  themes gallery (`.wn-themes`, `.wn-theme*`) is styled with the same tokens,
  but `/admin` never loads a theme, so none of the `/admin` selectors are
  themeable.

Links to internal pages carry state: a link whose target page exists is a
plain `.wn-wiki-link` (solid underline); a link whose target is known **not**
to exist also carries `.wn-link-missing` (dotted underline, muted colour,
trailing `/`). The class is set identically by the reader (server-side, from
one batched existence lookup per render) and the editor (client-side, patched
in place when the answer arrives). Unknown existence — lookup pending or
failed — keeps the plain look. Off-site links carry an icon via
`.wn-link[target="_blank"]::after`, a CSS mask tinted by
`--wn-color-link-marker` (`target="_blank"` is emitted ONLY for absolute
http(s) URLs by both renderers). Generated `::after` content never enters DOM
text.

Rules of thumb for theme authors:

- **Prefer tokens.** Class selectors work too (your theme is later in the
  cascade) but structural rules (`display`, flex layout, `white-space`,
  `display: none` on image/pipe punctuation) are load-bearing: the editor and
  reader share one DOM-text model, and the corpus fidelity tests assume it.
- **Never hide, reorder or generate text** with CSS in a way that changes
  what users select/copy in the editor. Presentation properties (colour,
  font, spacing, borders, shadows, `letter-spacing`) are safe.
- `::selection` and `:focus-visible` are themed by `--wn-color-selection-*`
  and `--wn-focus-ring-*`; the editor surface `.wn-editor` keeps
  `outline: none` (the caret is the focus indicator).

## Surfaces, source layout, fidelity

| Concern                                                                                    | Where                                                                                                                                    |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Palette + semantic tokens (`:root`, light + dark)                                          | `src/core/styles.ts` — `EDITOR_TOKENS_CSS`                                                                                               |
| Content rules (headings, code, tables, lists, images, selection, focus)                    | `src/core/styles.ts` — `EDITOR_CONTENT_CSS`                                                                                              |
| Site header/footer bands                                                                   | `src/core/styles.ts` — `SITE_BANDS_CSS`                                                                                                  |
| Editor chrome (layout, header, toolbar, panels, toasts, overlay)                           | `src/core/editor-dom.ts` — `EDITOR_CHROME_CSS` (never shipped to the reader: `.wn-root` is `display:flex; height:100%; overflow:hidden`) |
| Reader chrome (bar, crumbs, nav, search, admin form, users table, status) + legacy aliases | `src/server/render/layout.ts` — `VIEW_CSS`                                                                                               |

The reader **is** the editor, read-only: the article carries
`class="wn-root wn-article"` and embeds the same token + content strings, so
restyling content restyles both. Restyling content in source means editing
`src/core/styles.ts`; restyling it from a theme means tokens.

**Collapsed vs expanded** (editor, and collapsed everywhere on the reader):
while a line is not the cursor's, its rendered form shows — image
punctuation/alt/src spans and table pipes are hidden by CSS (`display:
none`; the text nodes stay in the DOM — fidelity and caret math are
CSS-independent) and the table separator collapses to a hairline. The moment
the cursor enters the line (or, for blocks, ANY line of the region),
line-renderer marks the wrapper `data-expanded="true"` and the whole region
renders as plain raw source. Expanded state exists only in the editor DOM.
Parity tests compare collapsed TREES, so these remain display-only
divergences — CSS tokens never alter DOM text.

**Header/footer bands.** `.wn-site-header` / `.wn-site-footer` are
admin-authored **raw HTML** shown to all readers: inside `<main>` on the
reader, inside the scrollable `.wn-editor-wrap` above/below the content
column in the editor (so they align with the `--wn-measure` column on both).
The `/admin` page shows the site name but never the bands or the theme
(anti-lockout). The site name suffixes every tab title and relabels the
breadcrumb root (`EditorOptions.homeLabel`).

**Reader chrome notes.** `.wn-view-actions` carries nav-page `.wn-nav-link`s,
search / all-pages links, then **role-gated** chrome (the Admin-settings link
only for `admin`; sign-out/identity for every session; no sign-in link on
reader pages — the login-required 403 document is the sole exception).
`.wn-status` wraps 404/403 documents (built-in and custom status-page bodies).

## Responsive (mobile)

Both layers ship first-class mobile breakpoints — no JS, no separate
stylesheet — at the literal `640px` (see the token section above):

- **Viewer**: wrapping header with scrollable breadcrumbs, tighter article
  padding, `overflow-wrap` for long tokens, and `--wn-touch-target` (44 px)
  hit areas on search, page-list and menu controls. Tables never scroll
  horizontally by design: flex cells shrink and wrap (`min-width: 0`).
- **Editor**: scrollable breadcrumb strip, roomier crumb hit areas, compact
  editor padding, side panels stacked full-width under the editor, and toasts
  clamped to the viewport.
- **Edit shell**: `viewport-fit=cover` + `100dvh` height chain so the editor
  fills the screen around mobile browser URL bars and keyboards. Bands live
  INSIDE the app, so a very tall admin-authored band scrolls with the
  document instead of squeezing the editor.

Mobile _editing_ beyond layout fit (touch caret behavior, keyboard UX) is a
deliberate follow-up (roadmap M3); reading on phones is first-class today.

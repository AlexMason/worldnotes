// ─── Editor stylesheets — shared with the reader ─────────────────────────────
// The two CSS groups that must stay identical between the interactive editor
// and the static (reader) surface: design tokens and content rules. Anything
// editor-chrome (`.wn-root` flex layout, header, toolbar, sidepanels, toasts,
// overlay) lives in `editor-dom.ts` only — never ship it to the reader.
//
// Token architecture (docs/theming.md is the reference):
//   1. ~15 PALETTE primitives `--wn-palette-*` (the only values a dark mode
//      has to redeclare) →
//   2. SEMANTIC tokens (`--wn-color-*`, fonts, spacing, radii, shadows,
//      layout constants) that default to the palette, →
//   3. optional per-surface override tokens that are NOT declared here: each
//      use site reads `var(--wn-color-<surface>, var(--wn-color-<semantic>, #lit))`
//      so they are inert until a theme sets them.
// Everything is declared on `:root` (not `.wn-root`) so the reader page
// background / header bar, the article, the editor chrome and the editor
// content are all restyled by the same declarations. A theme appended AFTER
// this stylesheet (and after the `prefers-color-scheme` block below) wins on
// equal specificity — no `!important` needed. Every `var()` carries a literal
// fallback so a broken theme degrades to the defaults.

/** Design tokens: custom properties only (light + auto-dark). Reader-safe. */
export const EDITOR_TOKENS_CSS = `
/* ===== WorldNotes Design Tokens ===== */
:root {
  /* Palette primitives — a full re-skin is these ~15 declarations */
  --wn-palette-bg: #fbfaf7;            /* page / editor background */
  --wn-palette-surface: #fbfaf7;       /* raised surfaces: toast, shortcuts overlay */
  --wn-palette-fg: #23211d;            /* primary text */
  --wn-palette-fg-muted: #6f6a61;      /* secondary text */
  --wn-palette-accent: #1a5fb4;        /* links, caret, focus ring */
  --wn-palette-accent-hover: #3f79c4;  /* link hover */
  --wn-palette-border: #e3ded4;        /* hairlines, borders */
  --wn-palette-code-bg: #f0ede6;       /* code background */
  --wn-palette-punct: #a39b8d;         /* markdown punctuation markers */
  --wn-palette-on-accent: #fbfaf7;     /* text on an accent fill (hovered buttons) */
  --wn-palette-selection: rgb(26 95 180 / 25%); /* ::selection background */
  --wn-palette-success: #eef6ee;       /* success toast tint */
  --wn-palette-warning: #f7f2e4;       /* warning toast tint */
  --wn-palette-danger: #f7e9e9;        /* error toast tint */
  --wn-palette-shadow: rgb(0 0 0 / 12%); /* shadow colour */

  /* Colors — semantic, default to the palette */
  --wn-color-bg: var(--wn-palette-bg, #fbfaf7);                       /* root / page background */
  --wn-color-surface: var(--wn-palette-surface, #fbfaf7);             /* raised surface background */
  --wn-color-fg: var(--wn-palette-fg, #23211d);                       /* primary text / chrome foreground */
  --wn-color-fg-muted: var(--wn-palette-fg-muted, #6f6a61);           /* secondary text (crumbs, markers) */
  --wn-color-accent: var(--wn-palette-accent, #1a5fb4);               /* links, caret */
  --wn-color-accent-hover: var(--wn-palette-accent-hover, #3f79c4);   /* accent hover */
  --wn-color-on-accent: var(--wn-palette-on-accent, #fbfaf7);         /* text on accent fill */
  --wn-color-border: var(--wn-palette-border, #e3ded4);               /* borders */
  --wn-color-code-bg: var(--wn-palette-code-bg, #f0ede6);             /* code background (inline + block) */
  --wn-color-punct: var(--wn-palette-punct, #a39b8d);                 /* markdown punctuation markers */
  --wn-color-heading-h1: var(--wn-palette-fg, #23211d);               /* H1 text */
  --wn-color-heading-h2: var(--wn-palette-fg, #23211d);               /* H2 text */
  --wn-color-heading-h3: var(--wn-palette-fg, #23211d);               /* H3 text */
  --wn-color-bold: var(--wn-palette-fg, #23211d);                     /* bold text */
  --wn-color-italic: var(--wn-palette-fg, #23211d);                   /* italic text */
  --wn-color-code: var(--wn-palette-fg, #23211d);                     /* code text (inline + block) */
  --wn-color-blockquote: var(--wn-palette-fg-muted, #6f6a61);         /* blockquote text */
  --wn-color-hr: var(--wn-palette-border, #e3ded4);                   /* horizontal rule */
  --wn-color-wiki-link: var(--wn-palette-accent, #1a5fb4);            /* wiki link text */
  --wn-color-link: var(--wn-palette-accent, #1a5fb4);                 /* external link text */
  --wn-color-link-hover: var(--wn-palette-accent-hover, #3f79c4);     /* link hover (wiki + external) */
  --wn-color-focus-ring: var(--wn-palette-accent, #1a5fb4);           /* :focus-visible outline */
  --wn-color-selection-bg: var(--wn-palette-selection, rgb(26 95 180 / 25%)); /* ::selection background */

  /* Typography */
  --wn-font-family: ui-serif, Georgia, 'Times New Roman', serif; /* body text */
  --wn-font-heading: var(--wn-font-family, ui-serif, Georgia, 'Times New Roman', serif); /* headings */
  --wn-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; /* code */
  --wn-font-ui: system-ui, sans-serif; /* chrome: header, nav, forms, toasts */
  --wn-font-size-body: 16px;         /* body text size */
  --wn-font-size-h1: 1.6rem;         /* H1 text size */
  --wn-font-size-h2: 1.3rem;         /* H2 text size */
  --wn-font-size-h3: 1.1rem;         /* H3 text size */
  --wn-font-size-small: 14px;        /* chrome + code block text size */
  --wn-font-size-xs: 11px;           /* shortcuts overlay group labels */
  --wn-font-size-keys: 12px;         /* shortcuts overlay key caps */
  --wn-font-size-inline-code: .9em;  /* inline code text size */
  --wn-line-height: 1.65;            /* body line height */
  --wn-line-height-heading: 1.25;    /* heading line height */
  --wn-line-height-code: 1.5;        /* code block line height */
  --wn-font-weight-bold: 700;        /* bold text weight */
  --wn-font-weight-heading: 700;     /* heading + table head weight */

  /* Spacing */
  --wn-padding-editor-y: 2rem;       /* page vertical padding (editor wrap + reader main) */
  --wn-padding-editor-x: 1.2rem;     /* page horizontal padding (editor wrap + reader main) */
  --wn-padding-page-bottom: 5rem;    /* room below the document */
  --wn-padding-header: .6rem 1.2rem; /* header bar padding (reader + editor) */
  --wn-padding-toolbar: .4rem 1.2rem; /* editor toolbar padding */
  --wn-padding-dropdown: .4rem .7rem; /* breadcrumb dropdown padding */
  --wn-padding-input: .35em .6em;    /* search + admin text inputs */
  --wn-padding-button: .4em 1.1em;   /* admin form buttons */
  --wn-padding-code-block: .6em .9em; /* fenced code block padding */
  --wn-padding-table-cell: .15em .5em; /* table cell padding */
  --wn-padding-inline-code: .1em .3em; /* inline code padding */
  --wn-margin-code-block: .5em 0;    /* fenced code block margin */
  --wn-margin-table: .6em 0;         /* table margin */
  --wn-margin-hr: 1em 0;             /* horizontal rule margin */
  --wn-block-padding-left: 1em;      /* blockquote left padding */
  --wn-border-width-blockquote: 3px; /* blockquote left rule */
  --wn-list-indent: 0.3em;           /* extra tracking per list-indent space (visual nesting) */
  --wn-gap-breadcrumb: 0;            /* breadcrumb gap */
  --wn-gap-header: 1rem;             /* header bar gap (crumbs ↔ nav) */
  --wn-gap-nav: .8rem;               /* gap between nav links */
  --wn-gap-toolbar: 6px;             /* gap between toolbar items */
  --wn-band-gap-header: 1.5rem;      /* space between the header band and content */
  --wn-band-gap-footer: 3rem;        /* space between content and the footer band */
  --wn-band-padding: 1rem;           /* band inner padding toward the content */

  /* Radii */
  --wn-radius-code: 4px;             /* inline code + code block radius */
  --wn-radius-control: 6px;          /* inputs, buttons, menu toggle */
  --wn-radius-dropdown: 6px;         /* breadcrumb dropdown */
  --wn-radius-menu: 8px;             /* mobile nav menu panel */
  --wn-radius-crumb: 4px;            /* editor crumb hit area */
  --wn-radius-image: 0;              /* images */

  /* Layout constants (640px media queries cannot read vars — see docs) */
  --wn-measure: 46rem;               /* content column max width (reader main, editor col, bands) */
  --wn-touch-target: 44px;           /* minimum touch target on mobile */
  --wn-sidepanel-width: 240px;       /* editor left/right side panel width */
  --wn-crumb-max-width: 18ch;        /* per-crumb truncation width */
  --wn-nav-link-max-width: 16ch;     /* per-nav-link truncation width */
  --wn-admin-form-width: 32rem;      /* admin settings form column width */
  --wn-image-max-width: 100%;        /* images */
  --wn-shortcuts-max-width: min(560px, 92vw); /* shortcuts overlay width */
  --wn-shortcuts-padding: 1.2rem 1.4rem;      /* shortcuts overlay padding */

  /* Focus ring */
  --wn-focus-ring-width: 2px;        /* :focus-visible outline width */
  --wn-focus-ring-offset: 2px;       /* :focus-visible outline offset */

  /* Shadows */
  --wn-shadow-dropdown: 0 4px 12px var(--wn-palette-shadow, rgb(0 0 0 / 12%)); /* breadcrumb dropdown */
  --wn-shadow-menu: 0 6px 16px var(--wn-palette-shadow, rgb(0 0 0 / 12%));     /* mobile nav panel */

  /* Transitions */
  --wn-transition-color: color 0.15s;

  /* Misc */
  --wn-caret-color: var(--wn-palette-accent, #1a5fb4); /* text cursor color */

  /* Toast */
  --wn-toast-bg: var(--wn-palette-surface, #fbfaf7);       /* info toast background */
  --wn-toast-bg-success: var(--wn-palette-success, #eef6ee); /* success toast background */
  --wn-toast-bg-warning: var(--wn-palette-warning, #f7f2e4); /* warning toast background */
  --wn-toast-bg-error: var(--wn-palette-danger, #f7e9e9);    /* error toast background */
  --wn-toast-border: var(--wn-palette-border, #e3ded4);    /* toast border color */
  --wn-toast-color: var(--wn-palette-fg, #23211d);         /* toast text color */
  --wn-toast-radius: 6px;            /* toast + shortcuts overlay border radius */
  --wn-toast-shadow: 0 4px 12px var(--wn-palette-shadow, rgb(0 0 0 / 12%)); /* toast + shortcuts overlay shadow */
  --wn-toast-padding: 8px 12px;      /* toast padding */
  --wn-toast-gap: 8px;               /* gap between stacked toasts */
  --wn-toast-min-width: 260px;       /* toast min width */
  --wn-toast-max-width: 380px;       /* toast container max width */
  --wn-toast-offset: 12px;           /* toast distance from the viewport edge */
}

@media (prefers-color-scheme: dark) {
  :root {
    --wn-palette-bg: #191816;
    --wn-palette-surface: #232120;
    --wn-palette-fg: #dcd7cd;
    --wn-palette-fg-muted: #9a948a;
    --wn-palette-accent: #78a9e0;
    --wn-palette-accent-hover: #9cc0ec;
    --wn-palette-border: #33302b;
    --wn-palette-code-bg: #232120;
    --wn-palette-punct: #6f6a61;
    --wn-palette-on-accent: #191816;
    --wn-palette-selection: rgb(120 169 224 / 35%);
    --wn-palette-success: #1e2a20;
    --wn-palette-warning: #2a2519;
    --wn-palette-danger: #2a1d1d;
    --wn-palette-shadow: rgb(0 0 0 / 40%);
  }
}
`

/* Off-site link icon (16x16 box-with-arrow), consumed as a CSS mask. */
const EXTERNAL_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6.5 3H3.5v9.5H13v-3M9.5 2.5h4v4M13.5 2.5l-6 6'/%3E%3C/svg%3E")`

/** Content rules for the token markup both surfaces emit. Reader-safe. */
export const EDITOR_CONTENT_CSS = `
/* Selection + keyboard focus — both surfaces. Presentation only: no DOM text. */
::selection { background: var(--wn-color-selection-bg, rgb(26 95 180 / 25%)); color: var(--wn-color-selection-fg, currentColor); }
:is(a, button, summary, input, select, textarea):focus-visible {
  outline: var(--wn-focus-ring-width, 2px) solid var(--wn-color-focus-ring, #1a5fb4);
  outline-offset: var(--wn-focus-ring-offset, 2px);
}

/* Punctuation (markdown markers) */
.wn-punct { color: var(--wn-color-punct, #a39b8d); }

/* Headings — keep the '#' marker muted, style the text like the viewer */
.wn-h1, .wn-h1-text { font-size: var(--wn-font-size-h1, 1.6rem); font-weight: var(--wn-font-weight-heading, 700); color: var(--wn-color-heading-h1, #23211d); font-family: var(--wn-font-heading, var(--wn-font-family, serif)); line-height: var(--wn-line-height-heading, 1.25); }
.wn-h2, .wn-h2-text { font-size: var(--wn-font-size-h2, 1.3rem); font-weight: var(--wn-font-weight-heading, 700); color: var(--wn-color-heading-h2, #23211d); font-family: var(--wn-font-heading, var(--wn-font-family, serif)); line-height: var(--wn-line-height-heading, 1.25); }
.wn-h3, .wn-h3-text { font-size: var(--wn-font-size-h3, 1.1rem); font-weight: var(--wn-font-weight-heading, 700); color: var(--wn-color-heading-h3, #23211d); font-family: var(--wn-font-heading, var(--wn-font-family, serif)); line-height: var(--wn-line-height-heading, 1.25); }

/* Inline */
.wn-bold { font-weight: var(--wn-font-weight-bold, 700); color: var(--wn-color-bold, #23211d); }
.wn-italic { font-style: italic; color: var(--wn-color-italic, #23211d); }
.wn-inline-code { color: var(--wn-color-code, #23211d); }
.wn-code-text { background: var(--wn-color-code-bg, #f0ede6); padding: var(--wn-padding-inline-code, .1em .3em); border-radius: var(--wn-radius-code, 4px); font-family: var(--wn-font-mono, monospace); font-size: var(--wn-font-size-inline-code, .9em); }

/* Blockquote — mirrors the viewer */
.wn-blockquote {
  display: block;
  color: var(--wn-color-blockquote, #6f6a61);
  border-left: var(--wn-border-width-blockquote, 3px) solid var(--wn-color-blockquote-border, var(--wn-color-border, #e3ded4));
  padding-left: var(--wn-block-padding-left, 1em);
}

/* List items */
.wn-list-item { display: flex; }
/* Nesting indent is the transparent source spaces — widened with tracking so
   depth is actually visible (a 2-space level ≈ 2.2× at the default token).
   letter-spacing is presentation-only: the DOM text stays byte-exact, so
   content-text extraction and character-offset caret math never see it. */
.wn-list-item-indent { color: transparent; white-space: pre; user-select: none; flex-shrink: 0; letter-spacing: var(--wn-list-indent, 0.3em); }
.wn-list-item-marker { color: var(--wn-color-list-marker, var(--wn-color-fg-muted, #6f6a61)); user-select: none; flex-shrink: 0; }
.wn-list-item-content { color: var(--wn-color-list-text, var(--wn-color-fg, #23211d)); min-width: 0; }

/* HR */
.wn-hr {
  display: block;
  border-top: 1px solid var(--wn-color-hr, #e3ded4);
  color: transparent;
  font-size: 2px;
  margin: var(--wn-margin-hr, 1em 0);
}

/* Code blocks (fenced) — block-pass regions. Lines keep byte-exact
   source text; the wrapper styles them. No <pre>: div[data-line] shape. */
.wn-code-block {
  background: var(--wn-color-code-block-bg, var(--wn-color-code-bg, #f0ede6));
  border: var(--wn-border-code-block, none);
  border-radius: var(--wn-radius-code, 4px);
  padding: var(--wn-padding-code-block, .6em .9em);
  margin: var(--wn-margin-code-block, .5em 0);
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-small, 14px);
  line-height: var(--wn-line-height-code, 1.5);
}
.wn-code-fence { color: var(--wn-color-code-fence, var(--wn-color-punct, #a39b8d)); }
.wn-code-line { color: var(--wn-color-code-block-fg, var(--wn-color-code, #23211d)); }

/* Pipe tables — FLEX rows, not display:table (deliberate: expanded raw rows
   and collapsed cell rows both flow sanely; anonymous-table-box caret quirks
   impossible; no layout engine exists in this repo's test harness to catch
   them). Columns are equal-width by design (sizing is out of scope). */
.wn-table { margin: var(--wn-margin-table, .6em 0); font-size: var(--wn-font-size-small, 14px); }
.wn-table-row { display: flex; align-items: stretch; }
.wn-table-cells { display: contents; }
.wn-table-cell {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid var(--wn-color-table-border, var(--wn-color-border, #e3ded4));
  padding: var(--wn-padding-table-cell, .15em .5em);
  white-space: normal; /* display-only collapse of source padding; text nodes intact */
}
.wn-table-head .wn-table-cell { font-weight: var(--wn-font-weight-heading, 700); background: var(--wn-color-table-head-bg, transparent); }
.wn-table-edge { color: transparent; font-size: 0; } /* outer-pipe padding, fidelity-only */
.wn-table-sep { font-size: 0; line-height: 0; border-bottom: 1px solid var(--wn-color-table-border, var(--wn-color-border, #e3ded4)); }
/* While the cursor is anywhere in the table the separator RESTORES its
   text (user feedback: it was unselectable/invisible — zero-height lines
   are neither clickable nor arrow-reachable). line-renderer marks the
   wrapper data-expanded="true" in that state (editor DOM only). */
.wn-table[data-expanded] .wn-table-sep {
  font-size: var(--wn-font-size-small, 14px);
  line-height: var(--wn-line-height-code, 1.5);
  border-bottom: none;
  color: var(--wn-color-punct, #a39b8d);
}
.wn-align-left { text-align: left; }
.wn-align-center { text-align: center; }
.wn-align-right { text-align: right; }
/* Pipes are grammar, not content — hidden on BOTH surfaces while the row is
   collapsed (cells own the layout). Expanded rows are raw text nodes with no
   punct spans, so editing always shows every pipe. */
.wn-table-row .wn-punct { display: none; }

/* Wiki link — solid underline when the target page exists. Links to pages
   known NOT to exist (.wn-link-missing, set identically by the reader and the
   editor) turn dotted, muted, and gain a trailing slash. Unknown existence
   keeps the plain look. The marker is generated content (never DOM text);
   --wn-link-missing-marker: '' removes it. */
.wn-wiki-link {
  color: var(--wn-color-wiki-link, #1a5fb4);
  text-decoration: underline;
  text-decoration-style: solid;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: var(--wn-transition-color, color 0.15s);
}
.wn-wiki-link:hover { color: var(--wn-color-link-hover, var(--wn-color-accent-hover, #3f79c4)); }
.wn-wiki-link.wn-link-missing {
  color: var(--wn-color-wiki-link-missing, var(--wn-color-fg-muted, #6f6a61));
  text-decoration-style: dotted;
}
.wn-wiki-link.wn-link-missing:hover { color: var(--wn-color-link-hover, var(--wn-color-accent-hover, #3f79c4)); }
.wn-wiki-link.wn-link-missing::after {
  content: var(--wn-link-missing-marker, '/');
  display: inline-block;
  margin-inline-start: .1em;
  text-decoration: none;
}

/* Strikethrough */
.wn-strikethrough { text-decoration: line-through; }

/* Underline */
.wn-underline { text-decoration: underline; }

/* External link */
.wn-link {
  color: var(--wn-color-link, #1a5fb4);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.wn-link:hover { color: var(--wn-color-link-hover, var(--wn-color-accent-hover, #3f79c4)); }
/* Off-site marker: absolute http(s) links are the only ones both renderers
   emit with target="_blank" (internal folds, #fragments and mailto: are not),
   so the attribute selects exactly "leaves the site". The icon is a CSS mask
   (tinted by --wn-color-link-marker; swap the shape via --wn-icon-external).
   Generated ::after content is invisible to DOM-text extraction — byte
   fidelity holds. */
.wn-link[target='_blank']::after {
  content: '';
  display: inline-block;
  width: .8em;
  height: .8em;
  margin-inline-start: .2em;
  vertical-align: -.05em;
  text-decoration: none;
  background-color: var(--wn-color-link-marker, var(--wn-color-fg-muted, #6f6a61));
  -webkit-mask: var(--wn-icon-external, ${EXTERNAL_ICON}) center / contain no-repeat;
  mask: var(--wn-icon-external, ${EXTERNAL_ICON}) center / contain no-repeat;
}

/* Image — punct-fidelity source (dimmed markers) + the rendered preview.
   While a line is COLLAPSED only the picture shows — on BOTH surfaces: the
   source spans stay in the DOM (extractContentText / caret math are
   CSS-independent) and the editor reveals them the instant the cursor's
   line goes raw (same affordance as hidden table pipes). */
.wn-image-img { max-width: var(--wn-image-max-width, 100%); height: auto; border-radius: var(--wn-radius-image, 0); display: inline-block; vertical-align: middle; }
.wn-image-alt { color: var(--wn-color-image-alt, var(--wn-color-fg-muted, #6f6a61)); }
.wn-image-src { color: var(--wn-color-punct, #a39b8d); }
.wn-image > .wn-punct,
.wn-image-alt,
.wn-image-src { display: none; }
`

/**
 * Site branding bands (`.wn-site-header` / `.wn-site-footer`) — the ONE
 * chrome group shared by BOTH surfaces: the reader composes it into VIEW_CSS
 * (bands inside `<main>`), the editor injects it via DEFAULT_CSS (the client
 * inserts them inside `.wn-editor-wrap`, around the content column). Tokens
 * resolve from `:root` on both surfaces. `max-width: var(--wn-measure)` +
 * `margin-inline: auto` align the bands with the content column on the
 * full-width editor wrapper and are a no-op inside the reader's `main`.
 */
export const SITE_BANDS_CSS = `
.wn-site-header, .wn-site-footer {
  font: var(--wn-font-size-small, 14px)/1.5 var(--wn-font-ui, system-ui, sans-serif);
  color: var(--wn-color-band-fg, var(--wn-color-fg-muted, #6f6a61));
  max-width: var(--wn-measure, 46rem);
  margin-inline: auto;
}
.wn-site-header { margin-block-end: var(--wn-band-gap-header, 1.5rem); padding-block-end: var(--wn-band-padding, 1rem); border-bottom: 1px solid var(--wn-color-band-border, var(--wn-color-border, #e3ded4)); }
.wn-site-footer { margin-block-start: var(--wn-band-gap-footer, 3rem); padding-block-start: var(--wn-band-padding, 1rem); border-top: 1px solid var(--wn-color-band-border, var(--wn-color-border, #e3ded4)); }
`

// ─── Editor stylesheets — shared with the reader ─────────────────────────────
// The two CSS groups that must stay identical between the interactive editor
// and the static (reader) surface: design tokens and content rules. Anything
// editor-chrome (`.wn-root` flex layout, header, toolbar, sidepanels, toasts,
// overlay) lives in `editor-dom.ts` only — never ship it to the reader.

/** Design tokens: custom properties only (light + auto-dark). Reader-safe. */
export const EDITOR_TOKENS_CSS = `
/* ===== WorldNotes Design Tokens ===== */
.wn-root {
  /* Colors — mirror the viewer palette */
  --wn-color-bg: #fbfaf7;            /* root background */
  --wn-color-surface: #fbfaf7;       /* header background */
  --wn-color-fg: #23211d;            /* primary text / chrome foreground */
  --wn-color-fg-muted: #6f6a61;      /* secondary text (crumbs, markers) */
  --wn-color-accent: #1a5fb4;        /* links, caret */
  --wn-color-accent-hover: #3f79c4;  /* link hover */
  --wn-color-border: #e3ded4;        /* borders */
  --wn-color-code-bg: #f0ede6;       /* inline code background */
  --wn-color-punct: #a39b8d;         /* markdown punctuation markers */
  --wn-color-heading-h1: #23211d;    /* H1 text */
  --wn-color-heading-h2: #23211d;    /* H2 text */
  --wn-color-heading-h3: #23211d;    /* H3 text */
  --wn-color-bold: #23211d;          /* bold text */
  --wn-color-italic: #23211d;        /* italic text */
  --wn-color-code: #23211d;          /* inline code text */
  --wn-color-blockquote: #6f6a61;    /* blockquote text */
  --wn-color-hr: #e3ded4;            /* horizontal rule */
  --wn-color-wiki-link: #1a5fb4;     /* wiki link text */
  --wn-color-link: #1a5fb4;          /* external link text */

  /* Typography */
  --wn-font-family: ui-serif, Georgia, 'Times New Roman', serif; /* headings */
  --wn-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; /* code */
  --wn-font-size-body: 16px;         /* editor body text size */
  --wn-font-size-h1: 1.6rem;         /* H1 text size */
  --wn-font-size-h2: 1.3rem;         /* H2 text size */
  --wn-font-size-h3: 1.1rem;         /* H3 text size */
  --wn-font-size-small: 14px;        /* chrome + code text size */
  --wn-line-height: 1.65;            /* editor line height */

  /* Spacing */
  --wn-padding-editor-y: 2rem;       /* editor vertical padding */
  --wn-padding-editor-x: 1.2rem;     /* editor horizontal padding */
  --wn-block-padding-left: 1em;      /* blockquote left padding */
  --wn-gap-breadcrumb: 0;            /* breadcrumb gap */

  /* Radii */
  --wn-radius-code: 4px;            /* inline code border radius */

  /* Transitions */
  --wn-transition-color: color 0.15s;

  /* Misc */
  --wn-caret-color: #1a5fb4;         /* text cursor color */
  --wn-font-weight-bold: 700;        /* bold text weight */

  /* Toast */
  --wn-toast-bg: #fbfaf7;            /* info toast background */
  --wn-toast-bg-success: #eef6ee;    /* success toast background */
  --wn-toast-bg-warning: #f7f2e4;    /* warning toast background */
  --wn-toast-bg-error: #f7e9e9;      /* error toast background */
  --wn-toast-border: #e3ded4;        /* toast border color */
  --wn-toast-radius: 6px;            /* toast border radius */
  --wn-toast-color: #23211d;         /* toast text color */
  --wn-toast-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

@media (prefers-color-scheme: dark) {
  .wn-root {
    --wn-color-bg: #191816;
    --wn-color-surface: #191816;
    --wn-color-fg: #dcd7cd;
    --wn-color-fg-muted: #9a948a;
    --wn-color-accent: #78a9e0;
    --wn-color-accent-hover: #9cc0ec;
    --wn-color-border: #33302b;
    --wn-color-code-bg: #232120;
    --wn-color-punct: #6f6a61;
    --wn-color-heading-h1: #dcd7cd;
    --wn-color-heading-h2: #dcd7cd;
    --wn-color-heading-h3: #dcd7cd;
    --wn-color-bold: #dcd7cd;
    --wn-color-italic: #dcd7cd;
    --wn-color-code: #dcd7cd;
    --wn-color-blockquote: #9a948a;
    --wn-color-hr: #33302b;
    --wn-color-wiki-link: #78a9e0;
    --wn-color-link: #78a9e0;
    --wn-caret-color: #78a9e0;
    --wn-toast-bg: #232120;
    --wn-toast-bg-success: #1e2a20;
    --wn-toast-bg-warning: #2a2519;
    --wn-toast-bg-error: #2a1d1d;
    --wn-toast-border: #33302b;
    --wn-toast-color: #dcd7cd;
    --wn-toast-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
}
`

/** Content rules for the token markup both surfaces emit. Reader-safe. */
export const EDITOR_CONTENT_CSS = `
/* Punctuation (markdown markers) */
.wn-punct { color: var(--wn-color-punct, #a39b8d); }

/* Headings — keep the '#' marker muted, style the text like the viewer */
.wn-h1, .wn-h1-text { font-size: var(--wn-font-size-h1, 1.6rem); font-weight: 700; color: var(--wn-color-heading-h1, #23211d); font-family: var(--wn-font-family, serif); line-height: 1.25; }
.wn-h2, .wn-h2-text { font-size: var(--wn-font-size-h2, 1.3rem); font-weight: 700; color: var(--wn-color-heading-h2, #23211d); font-family: var(--wn-font-family, serif); line-height: 1.25; }
.wn-h3, .wn-h3-text { font-size: var(--wn-font-size-h3, 1.1rem); font-weight: 700; color: var(--wn-color-heading-h3, #23211d); font-family: var(--wn-font-family, serif); line-height: 1.25; }

/* Inline */
.wn-bold { font-weight: var(--wn-font-weight-bold, 700); color: var(--wn-color-bold, #23211d); }
.wn-italic { font-style: italic; color: var(--wn-color-italic, #23211d); }
.wn-inline-code { color: var(--wn-color-code, #23211d); }
.wn-code-text { background: var(--wn-color-code-bg, #f0ede6); padding: .1em .3em; border-radius: var(--wn-radius-code, 4px); font-family: var(--wn-font-mono, monospace); font-size: .9em; }

/* Blockquote — mirrors the viewer */
.wn-blockquote {
  display: block;
  color: var(--wn-color-blockquote, #6f6a61);
  border-left: 3px solid var(--wn-color-border, #e3ded4);
  padding-left: var(--wn-block-padding-left, 1em);
}

/* List items */
.wn-list-item { display: flex; }
.wn-list-item-indent { color: transparent; white-space: pre; user-select: none; flex-shrink: 0; }
.wn-list-item-marker { color: var(--wn-color-fg-muted, #6f6a61); user-select: none; flex-shrink: 0; }
.wn-list-item-content { color: var(--wn-color-fg, #23211d); min-width: 0; }

/* HR */
.wn-hr {
  display: block;
  border-top: 1px solid var(--wn-color-hr, #e3ded4);
  color: transparent;
  font-size: 2px;
  margin: 1em 0;
}

/* Code blocks (fenced) — block-pass regions. Lines keep byte-exact
   source text; the wrapper styles them. No <pre>: div[data-line] shape. */
.wn-code-block {
  background: var(--wn-color-code-bg, #f0ede6);
  border-radius: var(--wn-radius-code, 4px);
  padding: .6em .9em;
  margin: .5em 0;
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-small, 14px);
  line-height: 1.5;
}
.wn-code-fence { color: var(--wn-color-punct, #a39b8d); }
.wn-code-line { color: var(--wn-color-code, #23211d); }

/* Pipe tables — FLEX rows, not display:table (deliberate: expanded raw rows
   and collapsed cell rows both flow sanely; anonymous-table-box caret quirks
   impossible; no layout engine exists in this repo's test harness to catch
   them). Columns are equal-width by design (sizing is out of scope). */
.wn-table { margin: .6em 0; font-size: var(--wn-font-size-small, 14px); }
.wn-table-row { display: flex; align-items: stretch; }
.wn-table-cells { display: contents; }
.wn-table-cell {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid var(--wn-color-border, #e3ded4);
  padding: .15em .5em;
  white-space: normal; /* display-only collapse of source padding; text nodes intact */
}
.wn-table-head .wn-table-cell { font-weight: 700; }
.wn-table-edge { color: transparent; font-size: 0; } /* outer-pipe padding, fidelity-only */
.wn-table-sep { font-size: 0; line-height: 0; border-bottom: 1px solid var(--wn-color-border, #e3ded4); }
.wn-align-left { text-align: left; }
.wn-align-center { text-align: center; }
.wn-align-right { text-align: right; }
/* Pipes are grammar, not content — hidden on BOTH surfaces while the row is
   collapsed (cells own the layout). Expanded rows are raw text nodes with no
   punct spans, so editing always shows every pipe. */
.wn-table-row .wn-punct { display: none; }

/* Wiki link — mirrors the viewer (dotted underline, no pill) */
.wn-wiki-link {
  color: var(--wn-color-wiki-link, #1a5fb4);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: var(--wn-transition-color, color 0.15s);
}
.wn-wiki-link:hover { color: var(--wn-color-accent-hover, #3f79c4); }

/* Strikethrough */
.wn-strikethrough { text-decoration: line-through; }

/* External link */
.wn-link {
  color: var(--wn-color-link, #1a5fb4);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.wn-link:hover { color: var(--wn-color-accent-hover, #3f79c4); }

/* Image — editor shows the punct-fidelity source (dimmed markers) plus the
   rendered preview; the reader hides the source through the .wn-article-
   scoped rules below (sanctioned display divergence — same tree). */
.wn-image-img { max-width: 100%; height: auto; display: inline-block; vertical-align: middle; }
.wn-image-alt { color: var(--wn-color-fg-muted, #6f6a61); }
.wn-image-src { color: var(--wn-color-punct, #a39b8d); }
.wn-article .wn-image > .wn-punct,
.wn-article .wn-image-alt,
.wn-article .wn-image-src { display: none; }
`

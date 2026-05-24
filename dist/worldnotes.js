const D = "worldnotes";
class S {
  constructor(t = D) {
    this.namespace = t;
  }
  key(t) {
    return `${this.namespace}::${t}`;
  }
  async get(t) {
    return localStorage.getItem(this.key(t));
  }
  async set(t, e) {
    localStorage.setItem(this.key(t), e);
  }
  async keys() {
    const t = `${this.namespace}::`;
    return Object.keys(localStorage).filter((e) => e.startsWith(t)).map((e) => e.slice(t.length));
  }
}
function v(r) {
  const t = r.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function E(r) {
  const t = r.indexOf("|"), e = (t === -1 ? r : r.slice(0, t)).trim(), n = t === -1 ? v(e) : r.slice(t + 1).trim();
  return { page: e, display: n || v(e) };
}
function A(r, t) {
  const n = r.replace(/^\?/, "").split("&").filter(Boolean).filter((a) => {
    const [c = ""] = a.split("=", 1);
    return decodeURIComponent(c.replace(/\+/g, " ")) !== "path";
  }), o = t.map((a) => encodeURIComponent(a)).join("/");
  return `?${[...n, `path=${o}`].join("&")}`;
}
function I(r) {
  const e = r.replace(/^\?/, "").split("&").filter(Boolean).find((i) => {
    const [a = ""] = i.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const n = e.indexOf("="), o = n === -1 ? "" : e.slice(n + 1);
  return o ? o.split("/").filter(Boolean).map((i) => decodeURIComponent(i)) : [];
}
const z = {
  name: "wiki-link",
  version: "1.0.0",
  kind: "content",
  tokens: [
    {
      type: "wiki-link",
      // Matches [[any content]] — non-greedy to handle multiple links per line
      pattern: /\[\[([^\]]+)\]\]/
    }
  ],
  render(r, t) {
    const { page: e, display: n } = E(r.groups[0] ?? ""), o = document.createElement("span");
    return o.className = "wn-wiki-link", o.dataset.page = e, o.dataset.raw = r.raw, o.textContent = n, o;
  },
  onNavigate(r, t) {
    const { page: e } = E(r.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function b(r, t, e) {
  const n = document.createElement("span");
  n.className = e;
  const o = document.createElement("span");
  o.className = "wn-punct", o.textContent = t;
  const i = document.createElement("span");
  return i.className = `${e}-text`, i.textContent = r.groups[0] ?? "", n.appendChild(o), n.appendChild(i), n;
}
const L = {
  name: "headings",
  version: "1.0.0",
  kind: "content",
  tokens: [
    { type: "h1", pattern: /^# (.*)$/ },
    { type: "h2", pattern: /^## (.*)$/ },
    { type: "h3", pattern: /^### (.*)$/ }
  ],
  render(r, t) {
    switch (r.type) {
      case "h1":
        return b(r, "# ", "wn-h1");
      case "h2":
        return b(r, "## ", "wn-h2");
      case "h3":
        return b(r, "### ", "wn-h3");
      default:
        return b(r, "", "wn-h1");
    }
  }
};
function y(r, t, e) {
  const n = document.createElement("span");
  n.className = r;
  const o = (i) => {
    const a = document.createElement("span");
    return a.className = "wn-punct", a.textContent = i, a;
  };
  return n.appendChild(o(t)), n.appendChild(document.createTextNode(e)), n.appendChild(o(t)), n;
}
const M = {
  name: "bold",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(r, t) {
    return y("wn-bold", "**", r.groups[0] ?? "");
  }
}, R = {
  name: "italic",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(r, t) {
    return y("wn-italic", "*", r.groups[0] ?? "");
  }
}, O = {
  name: "inline-code",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "inline-code", pattern: /`([^`]+)`/ }],
  render(r, t) {
    const e = document.createElement("span");
    e.className = "wn-inline-code";
    const n = (i) => {
      const a = document.createElement("span");
      return a.className = "wn-punct", a.textContent = i, a;
    };
    e.appendChild(n("`"));
    const o = document.createElement("span");
    return o.className = "wn-code-text", o.textContent = r.groups[0] ?? "", e.appendChild(o), e.appendChild(n("`")), e;
  }
}, $ = {
  name: "blockquote",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "blockquote", pattern: /^(> )(.*)$/ }],
  render(r, t) {
    const e = document.createElement("span");
    e.className = "wn-blockquote";
    const n = document.createElement("span");
    n.className = "wn-punct", n.textContent = "> ";
    const o = document.createElement("span");
    return o.className = "wn-blockquote-text", o.textContent = r.groups[1] ?? "", e.appendChild(n), e.appendChild(o), e;
  }
}, _ = {
  name: "hr",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(r, t) {
    const e = document.createElement("span");
    return e.className = "wn-hr", e.textContent = "---", e;
  }
}, B = {
  name: "link",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "link", pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],
  render(r, t) {
    const e = r.groups[0] ?? "", n = r.groups[1] ?? "";
    if (!n.includes("://") && !n.startsWith("//")) {
      const a = document.createElement("span");
      return a.className = "wn-wiki-link", a.dataset.page = n, a.dataset.raw = r.raw, a.textContent = e, a;
    }
    const i = document.createElement("a");
    return i.className = "wn-link", i.href = n, i.target = "_blank", i.rel = "noopener noreferrer", i.dataset.raw = r.raw, i.textContent = e, i;
  },
  onNavigate(r, t) {
    const e = r.groups[1] ?? "";
    return !e.includes("://") && !e.startsWith("//") ? (t.navigate(e), !0) : !1;
  }
}, H = {
  name: "strikethrough",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "strikethrough", pattern: /~~([^~]+)~~/ }],
  render(r, t) {
    const e = y("wn-strikethrough", "~~", r.groups[0] ?? "");
    return e.dataset.raw = r.raw, e;
  }
}, W = [
  L,
  // line-level — must come before inline plugins
  _,
  // line-level
  $,
  // line-level
  z,
  // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  B,
  // inline — [text](url) after [[...]]
  M,
  // inline — ** before * to avoid partial match
  R,
  // inline
  H,
  // inline — ~~text~~ (no conflict with * patterns)
  O
  // inline
], U = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
class q {
  constructor() {
    this.contentPlugins = /* @__PURE__ */ new Map(), this.uiPlugins = /* @__PURE__ */ new Map(), this.storagePlugins = /* @__PURE__ */ new Map(), this.tokenTypeOwners = /* @__PURE__ */ new Map(), this.slotAssignments = /* @__PURE__ */ new Map();
  }
  // ── Validation ──────────────────────────────────────────────────────────────
  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  validateVersion(t, e) {
    if (!U.test(e))
      throw new Error(
        `Invalid version "${e}" for plugin "${t}": must match semver format X.Y.Z or X.Y.Z-prerelease`
      );
  }
  // ── Name-Based Replacement ──────────────────────────────────────────────────
  /**
   * Remove a previously registered plugin by name and clean up its ownership.
   * Calls onDestroy on the removed plugin.
   */
  removeByName(t) {
    const e = this.contentPlugins.get(t);
    if (e) {
      e.onDestroy?.();
      for (const i of e.tokens)
        this.tokenTypeOwners.delete(i.type);
      this.contentPlugins.delete(t);
      return;
    }
    const n = this.uiPlugins.get(t);
    if (n) {
      n.onDestroy?.();
      const i = n.priority ?? 0;
      for (const a of n.slots) {
        const c = this.slotAssignments.get(a);
        c && (c.delete(i), c.size === 0 && this.slotAssignments.delete(a));
      }
      this.uiPlugins.delete(t);
      return;
    }
    const o = this.storagePlugins.get(t);
    o && (o.onDestroy?.(), this.storagePlugins.delete(t));
  }
  // ── Registration ────────────────────────────────────────────────────────────
  /**
   * Register a plugin manifest with conflict detection, semver validation,
   * and lifecycle hook invocation.
   *
   * @throws {Error} If the manifest version is invalid
   * @throws {Error} If a content plugin conflicts on a token type
   * @throws {Error} If a UI plugin conflicts on a slot+priority pair
   */
  register(t) {
    switch (this.validateVersion(t.name, t.version), this.removeByName(t.name), t.kind) {
      case "content":
        this.registerContent(t);
        break;
      case "ui":
        this.registerUI(t);
        break;
      case "storage":
        this.registerStorage(t);
        break;
    }
    try {
      t.onInit?.();
    } catch (e) {
      throw this.removeByName(t.name), e;
    }
  }
  /** Register a content plugin with token type conflict detection. */
  registerContent(t) {
    for (const e of t.tokens) {
      const n = this.tokenTypeOwners.get(e.type);
      if (n !== void 0 && n !== t.name)
        throw new Error(
          `Plugin conflict: "${t.name}" declares token type "${e.type}", but "${n}" already owns it. Each token type may only be registered by one content plugin.`
        );
    }
    for (const e of t.tokens)
      this.tokenTypeOwners.set(e.type, t.name);
    this.contentPlugins.set(t.name, t);
  }
  /** Register a UI plugin with slot+priority conflict detection. */
  registerUI(t) {
    const e = t.priority ?? 0;
    for (const n of t.slots) {
      const o = this.slotAssignments.get(n);
      if (o) {
        const i = o.get(e);
        if (i !== void 0 && i !== t.name)
          throw new Error(
            `UI plugin conflict: "${t.name}" claims slot "${n}" with priority ${e}, but "${i}" already claims it with the same priority. Change one plugin's priority to resolve.`
          );
      }
    }
    for (const n of t.slots) {
      let o = this.slotAssignments.get(n);
      o || (o = /* @__PURE__ */ new Map(), this.slotAssignments.set(n, o)), o.set(e, t.name);
    }
    this.uiPlugins.set(t.name, t);
  }
  /** Register a storage plugin (no conflict detection needed). */
  registerStorage(t) {
    this.storagePlugins.set(t.name, t);
  }
  // ── Accessors ───────────────────────────────────────────────────────────────
  /** Return all registered content plugins (no UI/storage plugins). */
  allContentPlugins() {
    return Array.from(this.contentPlugins.values());
  }
  /** Return all TokenDefs from all registered content plugins. */
  allTokenDefs() {
    return this.allContentPlugins().flatMap((t) => t.tokens);
  }
  /**
   * Look up the content plugin that owns a given token type.
   * Returns undefined if no plugin claims the type.
   */
  getContentPluginByType(t) {
    const e = this.tokenTypeOwners.get(t);
    if (e)
      return this.contentPlugins.get(e);
  }
  /**
   * Get a plugin by name across all categories.
   * Returns undefined if no plugin with that name is registered.
   */
  getPlugin(t) {
    return this.contentPlugins.get(t) ?? this.uiPlugins.get(t) ?? this.storagePlugins.get(t);
  }
  /** Return all registered plugins from all categories combined. */
  getAllPlugins() {
    return [
      ...this.contentPlugins.values(),
      ...this.uiPlugins.values(),
      ...this.storagePlugins.values()
    ];
  }
  /** Return all registered UI plugins. */
  allUIPlugins() {
    return Array.from(this.uiPlugins.values());
  }
  /** Return all registered storage plugins. */
  allStoragePlugins() {
    return Array.from(this.storagePlugins.values());
  }
  // ── Teardown ────────────────────────────────────────────────────────────────
  /**
   * Clear all plugin registrations.
   *
   * Does NOT call onDestroy on any plugin — the caller is responsible for
   * lifecycle teardown before calling clear(). This prevents a plugin's
   * onDestroy from throwing and blocking cleanup of other state.
   */
  clear() {
    this.contentPlugins.clear(), this.uiPlugins.clear(), this.storagePlugins.clear(), this.tokenTypeOwners.clear(), this.slotAssignments.clear();
  }
}
function F(r, t = {}) {
  const e = t.initialPage ?? "home", n = I(window.location.search), o = n[n.length - 1] ?? e, i = {};
  let a = n.length ? [...n] : [o], c = null, d = !1;
  return {
    world: i,
    getTrail() {
      return [...a];
    },
    getWorld() {
      return { ...i };
    },
    setWorldPage(s, l) {
      i[s] = l;
    },
    pushTrail(s) {
      a.push(s);
    },
    setTrail(s) {
      a = s;
    },
    truncateTrail(s) {
      a = a.slice(0, s + 1);
    },
    setNavigating(s) {
      return d = s, s;
    },
    isNavigating() {
      return d;
    },
    clearSaveTimer() {
      c && (clearTimeout(c), c = null);
    },
    setSaveTimer(s) {
      c = s;
    },
    toContext(s) {
      return {
        navigate: s,
        getTrail: () => [...a],
        getWorld: () => ({ ...i })
      };
    }
  };
}
const j = `
/* ===== WorldNotes Design Tokens ===== */
.wn-root {
  /* Colors */
  --wn-color-bg: #0e0e10;            /* root background */
  --wn-color-surface: #0a0a0c;       /* topbar background */
  --wn-color-fg: #c9c9d0;            /* primary text / chrome foreground */
  --wn-color-fg-muted: #4a4a5e;      /* secondary text (breadcrumb crumb) */
  --wn-color-accent: #9b8fe8;        /* accent: links, code, crumb hover, caret */
  --wn-color-accent-hover: #bbb3f8;  /* accent hover: wiki-link hover, link hover */
  --wn-color-border: #1f1f23;        /* borders: topbar, blockquote, hr */
  --wn-color-punct: #2e2e44;         /* punctuation markers */
  --wn-color-heading-h1: #e2e1f4;    /* H1 text color */
  --wn-color-heading-h2: #c8c7e2;    /* H2 text color */
  --wn-color-heading-h3: #a8a8c4;    /* H3 text color */
  --wn-color-bold: #d4d4ea;          /* bold text color */
  --wn-color-italic: #7878a0;        /* italic text color */
  --wn-color-code: #9b8fe8;          /* inline code text color */
  --wn-color-code-bg: #17171e;       /* inline code background */
  --wn-color-blockquote: #4a4a66;    /* blockquote text color */
  --wn-color-hr: #1e1e2c;            /* horizontal rule color */
  --wn-color-wiki-link: #9b8fe8;     /* wiki link text color */
  --wn-color-wiki-link-bg: #16142a;  /* wiki link background */
  --wn-color-wiki-link-border: #332d6a; /* wiki link border */
  --wn-color-link: #9b8fe8;          /* external link color */
  --wn-color-wiki-link-hover: #bbb3f8;     /* wiki link hover text color */
  --wn-color-wiki-link-bg-hover: #221e42;  /* wiki link hover background */

  /* Typography */
  --wn-font-family: sans-serif;      /* heading font family */
  --wn-font-mono: monospace;         /* body/code font family */
  --wn-font-size-body: 14px;         /* editor body text size */
  --wn-font-size-h1: 22px;           /* H1 text size */
  --wn-font-size-h2: 17px;           /* H2 text size */
  --wn-font-size-h3: 14px;           /* H3 text size */
  --wn-font-size-small: 12px;        /* breadcrumb, code text, wiki link size */
  --wn-line-height: 1.9;             /* editor line height */

  /* Spacing */
  --wn-padding-editor-y: 28px;       /* editor vertical padding */
  --wn-padding-editor-x: 36px;       /* editor horizontal padding */
  --wn-padding-topbar-y: 10px;       /* topbar vertical padding */
  --wn-padding-topbar-x: 14px;       /* topbar horizontal padding */
  --wn-block-padding-left: 10px;     /* blockquote left padding */
  --wn-gap-breadcrumb: 0;            /* breadcrumb gap */

  /* Radii */
  --wn-radius-crumb: 4px;           /* breadcrumb crumb border radius */
  --wn-radius-code: 3px;            /* inline code border radius */
  --wn-radius-wiki-link: 4px;       /* wiki link border radius */

  /* Shadows */
  --wn-shadow-wiki-link: none;       /* wiki link shadow (default: no shadow) */
  --wn-shadow-wiki-link-hover: none; /* wiki link hover shadow (default: no shadow) */

  /* Transitions */
  --wn-transition-color: color 0.15s;          /* color transition duration */
  --wn-transition-bg: background 0.12s;        /* background transition duration */

  /* Misc */
  --wn-caret-color: #9b8fe8;         /* text cursor color */
  --wn-font-weight-bold: 600;        /* bold text weight */
}
`, V = j + `
.wn-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wn-color-bg, #0e0e10);
  font-family: var(--wn-font-mono, monospace);
  color: var(--wn-color-fg, #c9c9d0);
  overflow: hidden;
}

.wn-topbar {
  display: flex;
  align-items: center;
  padding: var(--wn-padding-topbar-y, 10px) var(--wn-padding-topbar-x, 14px);
  border-bottom: 0.5px solid var(--wn-color-border, #1f1f23);
  background: var(--wn-color-surface, #0a0a0c);
  flex-shrink: 0;
}

.wn-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--wn-gap-breadcrumb, 0);
  font-size: var(--wn-font-size-small, 12px);
  flex: 1;
  overflow: hidden;
}

.wn-crumb {
  color: var(--wn-color-fg-muted, #4a4a5e);
  cursor: pointer;
  white-space: nowrap;
  padding: 3px 6px;
  border-radius: var(--wn-radius-crumb, 4px);
  transition: var(--wn-transition-color, color 0.15s);
}
.wn-crumb:hover { color: var(--wn-color-accent, #9b8fe8); }
.wn-crumb--active { color: var(--wn-color-fg, #c9c9d0); cursor: default; }

.wn-crumb-sep {
  color: var(--wn-color-punct, #252530);
  font-size: 11px;
  padding: 0 1px;
  user-select: none;
}

.wn-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: var(--wn-padding-editor-y, 28px) var(--wn-padding-editor-x, 36px);
  position: relative;
}

.wn-editor {
  outline: none;
  min-height: 100%;
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-body, 14px);
  line-height: var(--wn-line-height, 1.9);
  color: var(--wn-color-fg, #9090a8);
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: var(--wn-caret-color, #9b8fe8);
}

.wn-placeholder {
  position: absolute;
  top: 28px;
  left: 36px;
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-body, 14px);
  color: var(--wn-color-fg-muted, #282838);
  pointer-events: none;
  user-select: none;
}

/* Punctuation */
.wn-punct { color: var(--wn-color-punct, #2e2e44); font-size: 0.85em; }

/* Headings */
.wn-h1, .wn-h1-text { font-size: var(--wn-font-size-h1, 22px); font-weight: 500; color: var(--wn-color-heading-h1, #e2e1f4); font-family: var(--wn-font-family, sans-serif); }
.wn-h2, .wn-h2-text { font-size: var(--wn-font-size-h2, 17px); font-weight: 500; color: var(--wn-color-heading-h2, #c8c7e2); font-family: var(--wn-font-family, sans-serif); }
.wn-h3, .wn-h3-text { font-size: var(--wn-font-size-h3, 14px); font-weight: 500; color: var(--wn-color-heading-h3, #a8a8c4); font-family: var(--wn-font-family, sans-serif); }

/* Inline */
.wn-bold { font-weight: var(--wn-font-weight-bold, 600); color: var(--wn-color-bold, #d4d4ea); }
.wn-italic { font-style: italic; color: var(--wn-color-italic, #7878a0); }
.wn-inline-code { color: var(--wn-color-code, #9b8fe8); }
.wn-code-text { background: var(--wn-color-code-bg, #17171e); padding: 1px 5px; border-radius: var(--wn-radius-code, 3px); font-size: var(--wn-font-size-small, 12px); }

/* Blockquote */
.wn-blockquote {
  display: block;
  color: var(--wn-color-blockquote, #4a4a66);
  border-left: 2px solid var(--wn-color-border, #2a2a42);
  padding-left: var(--wn-block-padding-left, 10px);
}

/* HR */
.wn-hr {
  display: block;
  border-top: 0.5px solid var(--wn-color-hr, #1e1e2c);
  color: transparent;
  font-size: 2px;
  margin: 4px 0;
}

/* Wiki link */
.wn-wiki-link {
  color: var(--wn-color-wiki-link, #9b8fe8);
  background: var(--wn-color-wiki-link-bg, #16142a);
  border: 0.5px solid var(--wn-color-wiki-link-border, #332d6a);
  padding: 0 5px;
  border-radius: var(--wn-radius-wiki-link, 4px);
  cursor: pointer;
  font-size: var(--wn-font-size-small, 12px);
  transition: var(--wn-transition-bg, background 0.12s);
}
.wn-wiki-link:hover { background: var(--wn-color-wiki-link-bg-hover, #221e42); color: var(--wn-color-wiki-link-hover, #bbb3f8); }

/* Strikethrough */
.wn-strikethrough {
  text-decoration: line-through;
}

/* External link */
.wn-link {
  color: var(--wn-color-link, #9b8fe8);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.wn-link:hover { color: var(--wn-color-accent-hover, #bbb3f8); }
`;
function m(r, t) {
  const e = document.createElement(r);
  return e.className = t, e;
}
function X(r) {
  const t = "worldnotes-styles", e = document.getElementById(t);
  if (e) {
    r !== void 0 && (e.textContent = r);
    return;
  }
  const n = document.createElement("style");
  n.id = t, n.textContent = r ?? V, document.head.appendChild(n);
}
function K(r, t) {
  X(t), r.innerHTML = "", r.className = "wn-root";
  const e = m("div", "wn-topbar"), n = m("div", "wn-breadcrumb"), o = m("div", "wn-editor-wrap"), i = m("div", "wn-editor"), a = m("div", "wn-placeholder");
  return a.textContent = "Start writing… use [[page name]] to link deeper", i.contentEditable = "true", i.spellcheck = !1, e.appendChild(n), o.appendChild(a), o.appendChild(i), r.appendChild(e), r.appendChild(o), { container: r, topbar: e, breadcrumb: n, editorWrap: o, editorDiv: i, placeholder: a };
}
function Y(r) {
  const t = window.getSelection();
  if (!t || !t.rangeCount) return 0;
  const e = t.getRangeAt(0);
  return N(r, e.endContainer, e.endOffset).offset;
}
function G(r, t) {
  const e = ee(r, t), n = document.createRange(), o = window.getSelection();
  o && (e ? (n.setStart(e.node, e.offset), n.collapse(!0)) : (n.selectNodeContents(r), n.collapse(!1)), o.removeAllRanges(), o.addRange(n));
}
const Z = /* @__PURE__ */ new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "DL",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "UL"
]);
function Q(r) {
  return r.nodeType === Node.ELEMENT_NODE && Z.has(r.nodeName);
}
function x(r) {
  return N(r, null, 0).text;
}
function N(r, t, e) {
  let n = "", o = 0, i = t === null;
  function a(s) {
    i || (o += s.length), n += s;
  }
  function c(s) {
    if (s.nodeType === Node.TEXT_NODE) {
      const l = s.textContent ?? "";
      s === t && !i ? (o += Math.min(e, l.length), i = !0, n += l) : a(l);
    } else if (s.dataset?.raw !== void 0) {
      const l = s.dataset.raw ?? "";
      s === t && !i ? (o += e <= 0 ? 0 : l.length, i = !0) : J(s, t) && !i ? (T(s, t, e), o += Math.min(T(s, t, e), l.length), i = !0) : a(l);
    } else s.nodeName === "BR" ? a(`
`) : (Q(s) && n && !n.endsWith(`
`) && a(`
`), d(s));
  }
  function d(s) {
    s.childNodes.forEach((l, p) => {
      s === t && p === e && !i && (i = !0), c(l);
    }), s === t && s.childNodes.length === e && !i && (i = !0);
  }
  return d(r), { text: n, offset: o };
}
function J(r, t) {
  if (!t) return !1;
  let e = t;
  for (; e; ) {
    if (e === r) return !0;
    e = e.parentNode;
  }
  return !1;
}
function T(r, t, e) {
  let n = 0, o = !1;
  function i(a) {
    if (!o) {
      if (a.nodeType === Node.TEXT_NODE) {
        const c = a.textContent ?? "";
        a === t ? (n += Math.min(e, c.length), o = !0) : n += c.length;
        return;
      }
      a.childNodes.forEach((c, d) => {
        a === t && d === e && !o && (o = !0), o || i(c);
      }), a === t && a.childNodes.length === e && !o && (o = !0);
    }
  }
  return i(r), n;
}
function ee(r, t) {
  let e = t, n = null;
  function o(i) {
    if (n) return;
    if (i.nodeType === Node.TEXT_NODE) {
      const c = i.length;
      if (e <= c) {
        n = { node: i, offset: e };
        return;
      }
      e -= c;
      return;
    }
    const a = i.dataset?.raw;
    if (a !== void 0) {
      e -= a.length;
      return;
    }
    if (i.nodeName === "BR") {
      e -= 1;
      return;
    }
    i.childNodes.forEach(o);
  }
  return o(r), n;
}
function P(r) {
  return { type: "text", raw: r, groups: [r] };
}
function te(r, t) {
  const e = t.filter((o) => o.pattern.source.startsWith("^")), n = t.filter((o) => !o.pattern.source.startsWith("^"));
  for (const o of e) {
    const i = r.match(o.pattern);
    if (i)
      return [{ type: o.type, raw: i[0], groups: i.slice(1).map((a) => a ?? "") }];
  }
  return ne(r, n);
}
function ne(r, t) {
  const e = [];
  let n = r;
  for (; n.length > 0; ) {
    let o = null;
    for (const i of t) {
      const a = n.match(i.pattern);
      !a || a.index === void 0 || (o === null || a.index < o.index) && (o = { index: a.index, match: a, def: i });
    }
    if (!o) {
      e.push(P(n));
      break;
    }
    o.index > 0 && e.push(P(n.slice(0, o.index))), e.push({
      type: o.def.type,
      raw: o.match[0],
      groups: o.match.slice(1).map((i) => i ?? "")
    }), n = n.slice(o.index + o.match[0].length);
  }
  return e;
}
function re(r, t) {
  return r.split(`
`).map((e) => te(e, t));
}
function oe(r, t, e, n = -1) {
  const o = document.createDocumentFragment(), i = ae(t);
  let a = 0;
  for (const c of r) {
    if (c.type === "text") {
      o.appendChild(document.createTextNode(c.raw)), a += c.raw.length;
      continue;
    }
    const d = a, s = d + c.raw.length;
    if (a = s, n >= d && n <= s) {
      o.appendChild(document.createTextNode(c.raw));
      continue;
    }
    const l = i.get(c.type);
    if (!l) {
      o.appendChild(document.createTextNode(c.raw));
      continue;
    }
    const p = l.render(c, e);
    if (p instanceof HTMLElement && l.onNavigate) {
      const u = l.onNavigate.bind(l);
      p.addEventListener("mousedown", (g) => {
        u(c, e) && g.preventDefault();
      });
    }
    o.appendChild(p);
  }
  return o;
}
function ie(r, t, e, n = -1) {
  let o = 0;
  return r.map((i) => {
    const a = i.reduce((s, l) => s + l.raw.length, 0), c = n - o, d = oe(i, t, e, c);
    return o += a + 1, d;
  });
}
function ae(r) {
  const t = /* @__PURE__ */ new Map();
  for (const e of r)
    for (const n of e.tokens)
      t.set(n.type, e);
  return t;
}
function se(r, t, e, n = {}) {
  const { editorDiv: o, placeholder: i, breadcrumb: a } = r;
  function c() {
    const l = Y(o), p = x(o), u = re(
      p,
      t.flatMap((h) => h.tokens)
    ), g = e.toContext(
      n.navigateFn ?? ((h) => {
      })
    ), w = ie(u, t, g, l);
    o.innerHTML = "", w.forEach((h, k) => {
      o.appendChild(h), k < w.length - 1 && o.appendChild(document.createTextNode(`
`));
    }), i.style.display = p.length ? "none" : "block";
    try {
      G(o, l);
    } catch {
    }
  }
  function d() {
    a.innerHTML = "";
    const l = e.getTrail();
    l.forEach((p, u) => {
      if (u > 0) {
        const w = document.createElement("span");
        w.className = "wn-crumb-sep", w.textContent = "/", a.appendChild(w);
      }
      const g = document.createElement("span");
      g.className = "wn-crumb" + (u === l.length - 1 ? " wn-crumb--active" : ""), g.textContent = v(p), u < l.length - 1 && g.addEventListener("click", () => {
        e.truncateTrail(u);
        const w = e.getTrail(), h = w[w.length - 1];
        n.onBreadcrumbNavigate?.(h);
      }), a.appendChild(g);
    }), n.onTrailChange?.(e.getTrail()), s();
  }
  function s() {
    const l = e.getTrail(), p = A(window.location.search, l);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${p}${window.location.hash}`
    );
  }
  return { render: c, renderBreadcrumb: d, syncUrlToTrail: s };
}
const C = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
function ce(r, t, e, n) {
  let o = null;
  function i(d) {
    o = d;
  }
  async function a(d) {
    if (!r.world[d]) {
      const s = await t.get(d);
      s ? r.setWorldPage(d, s) : (r.setWorldPage(d, `# ${d}

`), await t.set(d, r.world[d]));
    }
    r.pushTrail(d), await c(d);
  }
  async function c(d) {
    if (r.setNavigating(!0), !r.world[d]) {
      const l = await t.get(d);
      !l && d === "home" ? (r.setWorldPage(d, C), await t.set(d, C)) : r.setWorldPage(d, l ?? `# ${d}

`);
    }
    const s = r.world[d];
    e.editorDiv.textContent = s, o && (o.render(), o.renderBreadcrumb());
    try {
      const l = document.createRange(), p = window.getSelection();
      p && (l.setStart(e.editorDiv, 0), l.collapse(!0), p.removeAllRanges(), p.addRange(l));
    } catch {
    }
    n.onPageLoad?.(d, s), r.setNavigating(!1), e.editorDiv.focus();
  }
  return { navigateToPage: a, loadPage: c, setRenderAPI: i };
}
function le(r, t, e, n, o, i, a) {
  function c(s) {
    const l = window.getSelection();
    if (!l || !l.rangeCount) return;
    const p = l.getRangeAt(0);
    p.deleteContents();
    const u = document.createTextNode(s);
    p.insertNode(u), p.setStart(u, s.length), p.collapse(!0), l.removeAllRanges(), l.addRange(p), r.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  function d() {
    const s = a.saveDebounceMs ?? 600;
    r.editorDiv.addEventListener("input", () => {
      if (e.isNavigating()) return;
      n.render();
      for (const k of t)
        k.onUpdate?.();
      const u = x(r.editorDiv), g = e.getTrail(), w = g[g.length - 1];
      e.setWorldPage(w, u), e.clearSaveTimer();
      const h = setTimeout(async () => {
        await i.set(w, u), a.onSave?.(w, u);
      }, s);
      e.setSaveTimer(h);
    }), r.editorDiv.addEventListener("paste", (u) => {
      u.preventDefault();
      const g = u.clipboardData?.getData("text/plain") ?? "";
      c(g);
    }), r.editorDiv.addEventListener("keydown", (u) => {
      u.key === "Tab" ? (u.preventDefault(), c("  ")) : u.key === "Enter" && (u.preventDefault(), c(`
`));
    });
    const l = e.getTrail(), p = l[l.length - 1];
    return o.loadPage(p), {
      destroy() {
        e.clearSaveTimer();
        for (const u of t)
          try {
            u.onDestroy?.();
          } catch (g) {
            console.error(`Plugin "${u.name}" onDestroy failed:`, g);
          }
        r.container.innerHTML = "";
      },
      navigate(u) {
        o.navigateToPage(u);
      },
      getCurrentPage() {
        const u = e.getTrail();
        return u[u.length - 1];
      },
      getTrail() {
        return e.getTrail();
      },
      getContent() {
        return x(r.editorDiv);
      },
      setContent(u) {
        const g = e.getTrail(), w = g[g.length - 1];
        e.setWorldPage(w, u), r.editorDiv.textContent = u, n.render();
      }
    };
  }
  return { mount: d };
}
class de {
  constructor(t, e = {}) {
    this.registry = new q(), this.storage = new S(), this.options = {}, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
    for (const n of W)
      this.registry.register(n);
  }
  /**
   * Register a plugin manifest (or replace a built-in by matching name).
   * Validates semver, detects conflicts, and fires lifecycle hooks.
   *
   * @param manifest - PluginManifest to register
   * @throws Error if version is invalid or a token/slot conflict is detected
   */
  use(t) {
    return this.registry.register(t), this;
  }
  /**
   * Remove all registered plugins and start fresh.
   * Note: does NOT call onDestroy on removed plugins.
   * Call mount() afterward to re-initialize the editor.
   */
  clearPlugins() {
    return this.registry.clear(), this;
  }
  /**
   * Replace the storage adapter.
   *
   * @param adapter - Any object implementing StorageAdapter
   */
  withStorage(t) {
    return this.storage = t, this;
  }
  /**
   * Mount the editor into the provided element and return a live EditorInstance.
   * Injects required styles, sets up event listeners, and loads the initial page.
   */
  mount() {
    return ue(this.el, this.registry.allContentPlugins(), this.storage, this.options);
  }
}
function ge(r, t = {}) {
  return new de(r, t);
}
function ue(r, t, e, n) {
  const o = F(e, n), i = K(r, n.theme), a = ce(o, e, i, n), c = {
    navigateFn: (s) => {
      a.navigateToPage(s);
    },
    onBreadcrumbNavigate: (s) => {
      a.loadPage(s);
    },
    onTrailChange: n.onTrailChange
  }, d = se(i, t, o, c);
  return a.setRenderAPI(d), le(i, t, o, d, a, e, n).mount();
}
const pe = "worldnotes", f = "pages";
class we {
  constructor(t = pe) {
    this.db = null, this.dbName = t;
  }
  /**
   * Open (or create) the IndexedDB database.
   * Must be called before get/set/keys, or those methods will call it lazily.
   */
  async open() {
    this.db || (this.db = await new Promise((t, e) => {
      const n = indexedDB.open(this.dbName, 1);
      n.onupgradeneeded = () => {
        n.result.createObjectStore(f);
      }, n.onsuccess = () => t(n.result), n.onerror = () => e(n.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(t) {
    const e = await this.ensureOpen();
    return new Promise((n, o) => {
      const a = e.transaction(f, "readonly").objectStore(f).get(t);
      a.onsuccess = () => n(a.result ?? null), a.onerror = () => o(a.error);
    });
  }
  async set(t, e) {
    const n = await this.ensureOpen();
    return new Promise((o, i) => {
      const c = n.transaction(f, "readwrite").objectStore(f).put(e, t);
      c.onsuccess = () => o(), c.onerror = () => i(c.error);
    });
  }
  async keys() {
    const t = await this.ensureOpen();
    return new Promise((e, n) => {
      const i = t.transaction(f, "readonly").objectStore(f).getAllKeys();
      i.onsuccess = () => e(i.result), i.onerror = () => n(i.error);
    });
  }
}
export {
  de as EditorBuilder,
  we as IndexedDBAdapter,
  S as LocalStorageAdapter,
  $ as blockquotePlugin,
  M as boldPlugin,
  ge as createEditor,
  W as defaultPlugins,
  L as headingsPlugin,
  _ as hrPlugin,
  O as inlineCodePlugin,
  R as italicPlugin,
  B as linkPlugin,
  H as strikethroughPlugin,
  z as wikiLinkPlugin
};

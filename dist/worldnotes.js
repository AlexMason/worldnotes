const A = "worldnotes";
class I {
  constructor(e = A) {
    this.namespace = e;
  }
  key(e) {
    return `${this.namespace}::${e}`;
  }
  async get(e) {
    return localStorage.getItem(this.key(e));
  }
  async set(e, t) {
    localStorage.setItem(this.key(e), t);
  }
  async keys() {
    const e = `${this.namespace}::`;
    return Object.keys(localStorage).filter((t) => t.startsWith(e)).map((t) => t.slice(e.length));
  }
}
function v(o) {
  const e = o.trim().replace(/\/+$/, ""), t = e.split("/").filter(Boolean);
  return t[t.length - 1] ?? e;
}
function E(o) {
  const e = o.indexOf("|"), t = (e === -1 ? o : o.slice(0, e)).trim(), n = e === -1 ? v(t) : o.slice(e + 1).trim();
  return { page: t, display: n || v(t) };
}
function M(o, e) {
  const n = o.replace(/^\?/, "").split("&").filter(Boolean).filter((s) => {
    const [l = ""] = s.split("=", 1);
    return decodeURIComponent(l.replace(/\+/g, " ")) !== "path";
  }), r = e.map((s) => encodeURIComponent(s)).join("/");
  return `?${[...n, `path=${r}`].join("&")}`;
}
function z(o) {
  const t = o.replace(/^\?/, "").split("&").filter(Boolean).find((i) => {
    const [s = ""] = i.split("=", 1);
    return decodeURIComponent(s.replace(/\+/g, " ")) === "path";
  });
  if (!t) return [];
  const n = t.indexOf("="), r = n === -1 ? "" : t.slice(n + 1);
  return r ? r.split("/").filter(Boolean).map((i) => decodeURIComponent(i)) : [];
}
const L = {
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
  render(o, e) {
    const { page: t, display: n } = E(o.groups[0] ?? ""), r = document.createElement("span");
    return r.className = "wn-wiki-link", r.dataset.page = t, r.dataset.raw = o.raw, r.textContent = n, r;
  },
  onNavigate(o, e) {
    const { page: t } = E(o.groups[0] ?? "");
    return e.navigate(t), !0;
  }
};
function k(o, e, t) {
  const n = document.createElement("span");
  n.className = t;
  const r = document.createElement("span");
  r.className = "wn-punct", r.textContent = e;
  const i = document.createElement("span");
  return i.className = `${t}-text`, i.textContent = o.groups[0] ?? "", n.appendChild(r), n.appendChild(i), n;
}
const _ = {
  name: "headings",
  version: "1.0.0",
  kind: "content",
  tokens: [
    { type: "h1", pattern: /^# (.*)$/ },
    { type: "h2", pattern: /^## (.*)$/ },
    { type: "h3", pattern: /^### (.*)$/ }
  ],
  render(o, e) {
    switch (o.type) {
      case "h1":
        return k(o, "# ", "wn-h1");
      case "h2":
        return k(o, "## ", "wn-h2");
      case "h3":
        return k(o, "### ", "wn-h3");
      default:
        return k(o, "", "wn-h1");
    }
  }
};
function y(o, e, t) {
  const n = document.createElement("span");
  n.className = o;
  const r = (i) => {
    const s = document.createElement("span");
    return s.className = "wn-punct", s.textContent = i, s;
  };
  return n.appendChild(r(e)), n.appendChild(document.createTextNode(t)), n.appendChild(r(e)), n;
}
const R = {
  name: "bold",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(o, e) {
    return y("wn-bold", "**", o.groups[0] ?? "");
  }
}, O = {
  name: "italic",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(o, e) {
    return y("wn-italic", "*", o.groups[0] ?? "");
  }
}, $ = {
  name: "inline-code",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "inline-code", pattern: /`([^`]+)`/ }],
  render(o, e) {
    const t = document.createElement("span");
    t.className = "wn-inline-code";
    const n = (i) => {
      const s = document.createElement("span");
      return s.className = "wn-punct", s.textContent = i, s;
    };
    t.appendChild(n("`"));
    const r = document.createElement("span");
    return r.className = "wn-code-text", r.textContent = o.groups[0] ?? "", t.appendChild(r), t.appendChild(n("`")), t;
  }
}, B = {
  name: "blockquote",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "blockquote", pattern: /^(> )(.*)$/ }],
  render(o, e) {
    const t = document.createElement("span");
    t.className = "wn-blockquote";
    const n = document.createElement("span");
    n.className = "wn-punct", n.textContent = "> ";
    const r = document.createElement("span");
    return r.className = "wn-blockquote-text", r.textContent = o.groups[1] ?? "", t.appendChild(n), t.appendChild(r), t;
  }
}, H = {
  name: "hr",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(o, e) {
    const t = document.createElement("span");
    return t.className = "wn-hr", t.textContent = "---", t;
  }
}, U = {
  name: "link",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "link", pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],
  render(o, e) {
    const t = o.groups[0] ?? "", n = o.groups[1] ?? "";
    if (!n.includes("://") && !n.startsWith("//")) {
      const s = document.createElement("span");
      return s.className = "wn-wiki-link", s.dataset.page = n, s.dataset.raw = o.raw, s.textContent = t, s;
    }
    const i = document.createElement("a");
    return i.className = "wn-link", i.href = n, i.target = "_blank", i.rel = "noopener noreferrer", i.dataset.raw = o.raw, i.textContent = t, i;
  },
  onNavigate(o, e) {
    const t = o.groups[1] ?? "";
    return !t.includes("://") && !t.startsWith("//") ? (e.navigate(t), !0) : !1;
  }
}, W = {
  name: "strikethrough",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "strikethrough", pattern: /~~([^~]+)~~/ }],
  render(o, e) {
    const t = y("wn-strikethrough", "~~", o.groups[0] ?? "");
    return t.dataset.raw = o.raw, t;
  }
}, q = [
  _,
  // line-level — must come before inline plugins
  H,
  // line-level
  B,
  // line-level
  L,
  // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  U,
  // inline — [text](url) after [[...]]
  R,
  // inline — ** before * to avoid partial match
  O,
  // inline
  W,
  // inline — ~~text~~ (no conflict with * patterns)
  $
  // inline
], F = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
class j {
  constructor() {
    this.contentPlugins = /* @__PURE__ */ new Map(), this.uiPlugins = /* @__PURE__ */ new Map(), this.storagePlugins = /* @__PURE__ */ new Map(), this.tokenTypeOwners = /* @__PURE__ */ new Map(), this.slotAssignments = /* @__PURE__ */ new Map();
  }
  // ── Validation ──────────────────────────────────────────────────────────────
  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  validateVersion(e, t) {
    if (!F.test(t))
      throw new Error(
        `Invalid version "${t}" for plugin "${e}": must match semver format X.Y.Z or X.Y.Z-prerelease`
      );
  }
  // ── Name-Based Replacement ──────────────────────────────────────────────────
  /**
   * Remove a previously registered plugin by name and clean up its ownership.
   * Calls onDestroy on the removed plugin.
   */
  removeByName(e) {
    const t = this.contentPlugins.get(e);
    if (t) {
      t.onDestroy?.();
      for (const i of t.tokens)
        this.tokenTypeOwners.delete(i.type);
      this.contentPlugins.delete(e);
      return;
    }
    const n = this.uiPlugins.get(e);
    if (n) {
      n.onDestroy?.();
      const i = n.priority ?? 0;
      for (const s of n.slots) {
        const l = this.slotAssignments.get(s);
        l && (l.delete(i), l.size === 0 && this.slotAssignments.delete(s));
      }
      this.uiPlugins.delete(e);
      return;
    }
    const r = this.storagePlugins.get(e);
    r && (r.onDestroy?.(), this.storagePlugins.delete(e));
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
  register(e) {
    switch (this.validateVersion(e.name, e.version), this.removeByName(e.name), e.kind) {
      case "content":
        this.registerContent(e);
        break;
      case "ui":
        this.registerUI(e);
        break;
      case "storage":
        this.registerStorage(e);
        break;
    }
    try {
      e.onInit?.();
    } catch (t) {
      throw this.removeByName(e.name), t;
    }
  }
  /** Register a content plugin with token type conflict detection. */
  registerContent(e) {
    for (const t of e.tokens) {
      const n = this.tokenTypeOwners.get(t.type);
      if (n !== void 0 && n !== e.name)
        throw new Error(
          `Plugin conflict: "${e.name}" declares token type "${t.type}", but "${n}" already owns it. Each token type may only be registered by one content plugin.`
        );
    }
    for (const t of e.tokens)
      this.tokenTypeOwners.set(t.type, e.name);
    this.contentPlugins.set(e.name, e);
  }
  /** Register a UI plugin with slot+priority conflict detection. */
  registerUI(e) {
    const t = e.priority ?? 0;
    for (const n of e.slots) {
      const r = this.slotAssignments.get(n);
      if (r) {
        const i = r.get(t);
        if (i !== void 0 && i !== e.name)
          throw new Error(
            `UI plugin conflict: "${e.name}" claims slot "${n}" with priority ${t}, but "${i}" already claims it with the same priority. Change one plugin's priority to resolve.`
          );
      }
    }
    for (const n of e.slots) {
      let r = this.slotAssignments.get(n);
      r || (r = /* @__PURE__ */ new Map(), this.slotAssignments.set(n, r)), r.set(t, e.name);
    }
    this.uiPlugins.set(e.name, e);
  }
  /** Register a storage plugin (no conflict detection needed). */
  registerStorage(e) {
    this.storagePlugins.set(e.name, e);
  }
  // ── Accessors ───────────────────────────────────────────────────────────────
  /** Return all registered content plugins (no UI/storage plugins). */
  allContentPlugins() {
    return Array.from(this.contentPlugins.values());
  }
  /** Return all TokenDefs from all registered content plugins. */
  allTokenDefs() {
    return this.allContentPlugins().flatMap((e) => e.tokens);
  }
  /**
   * Look up the content plugin that owns a given token type.
   * Returns undefined if no plugin claims the type.
   */
  getContentPluginByType(e) {
    const t = this.tokenTypeOwners.get(e);
    if (t)
      return this.contentPlugins.get(t);
  }
  /**
   * Get a plugin by name across all categories.
   * Returns undefined if no plugin with that name is registered.
   */
  getPlugin(e) {
    return this.contentPlugins.get(e) ?? this.uiPlugins.get(e) ?? this.storagePlugins.get(e);
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
  /**
   * Return UI plugins registered for the given slot, sorted by priority ascending.
   * Lower priority numbers mean the plugin renders first (closer to the top of the slot).
   *
   * @param slot - Slot name (e.g., 'wn-toolbar')
   * @returns UIPlugin[] sorted by priority (lowest first), empty array if no plugins for slot
   */
  getUIPluginsForSlot(e) {
    const t = this.slotAssignments.get(e);
    return t ? Array.from(t.keys()).sort((r, i) => r - i).map((r) => {
      const i = t.get(r);
      return this.uiPlugins.get(i);
    }).filter(Boolean) : [];
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
function V(o, e = {}) {
  const t = e.initialPage ?? "home", n = z(window.location.search), r = n[n.length - 1] ?? t, i = {};
  let s = n.length ? [...n] : [r], l = null, c = !1;
  return {
    world: i,
    getTrail() {
      return [...s];
    },
    getWorld() {
      return { ...i };
    },
    setWorldPage(a, d) {
      i[a] = d;
    },
    pushTrail(a) {
      s.push(a);
    },
    setTrail(a) {
      s = a;
    },
    truncateTrail(a) {
      s = s.slice(0, a + 1);
    },
    setNavigating(a) {
      return c = a, a;
    },
    isNavigating() {
      return c;
    },
    clearSaveTimer() {
      l && (clearTimeout(l), l = null);
    },
    setSaveTimer(a) {
      l = a;
    },
    toContext(a) {
      return {
        navigate: a,
        getTrail: () => [...s],
        getWorld: () => ({ ...i })
      };
    }
  };
}
const X = `
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
`, K = X + `
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

.wn-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
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
function b(o, e) {
  const t = document.createElement(o);
  return t.className = e, t;
}
function Y(o) {
  const e = "worldnotes-styles", t = document.getElementById(e);
  if (t) {
    o !== void 0 && (t.textContent = o);
    return;
  }
  const n = document.createElement("style");
  n.id = e, n.textContent = o ?? K, document.head.appendChild(n);
}
function G(o, e) {
  Y(e), o.innerHTML = "", o.className = "wn-root";
  const t = b("div", "wn-topbar"), n = b("div", "wn-breadcrumb"), r = b("div", "wn-toolbar"), i = b("div", "wn-editor-wrap"), s = b("div", "wn-editor"), l = b("div", "wn-placeholder");
  return l.textContent = "Start writing… use [[page name]] to link deeper", s.contentEditable = "true", s.spellcheck = !1, t.appendChild(n), i.appendChild(l), i.appendChild(s), o.appendChild(t), o.appendChild(r), o.appendChild(i), { container: o, topbar: t, breadcrumb: n, toolbar: r, editorWrap: i, editorDiv: s, placeholder: l };
}
function Z(o) {
  const e = window.getSelection();
  if (!e || !e.rangeCount) return 0;
  const t = e.getRangeAt(0);
  return N(o, t.endContainer, t.endOffset).offset;
}
function Q(o, e) {
  const t = ne(o, e), n = document.createRange(), r = window.getSelection();
  r && (t ? (n.setStart(t.node, t.offset), n.collapse(!0)) : (n.selectNodeContents(o), n.collapse(!1)), r.removeAllRanges(), r.addRange(n));
}
const J = /* @__PURE__ */ new Set([
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
function ee(o) {
  return o.nodeType === Node.ELEMENT_NODE && J.has(o.nodeName);
}
function x(o) {
  return N(o, null, 0).text;
}
function N(o, e, t) {
  let n = "", r = 0, i = e === null;
  function s(a) {
    i || (r += a.length), n += a;
  }
  function l(a) {
    if (a.nodeType === Node.TEXT_NODE) {
      const d = a.textContent ?? "";
      a === e && !i ? (r += Math.min(t, d.length), i = !0, n += d) : s(d);
    } else if (a.dataset?.raw !== void 0) {
      const d = a.dataset.raw ?? "";
      a === e && !i ? (r += t <= 0 ? 0 : d.length, i = !0) : te(a, e) && !i ? (P(a, e, t), r += Math.min(P(a, e, t), d.length), i = !0) : s(d);
    } else a.nodeName === "BR" ? s(`
`) : (ee(a) && n && !n.endsWith(`
`) && s(`
`), c(a));
  }
  function c(a) {
    a.childNodes.forEach((d, p) => {
      a === e && p === t && !i && (i = !0), l(d);
    }), a === e && a.childNodes.length === t && !i && (i = !0);
  }
  return c(o), { text: n, offset: r };
}
function te(o, e) {
  if (!e) return !1;
  let t = e;
  for (; t; ) {
    if (t === o) return !0;
    t = t.parentNode;
  }
  return !1;
}
function P(o, e, t) {
  let n = 0, r = !1;
  function i(s) {
    if (!r) {
      if (s.nodeType === Node.TEXT_NODE) {
        const l = s.textContent ?? "";
        s === e ? (n += Math.min(t, l.length), r = !0) : n += l.length;
        return;
      }
      s.childNodes.forEach((l, c) => {
        s === e && c === t && !r && (r = !0), r || i(l);
      }), s === e && s.childNodes.length === t && !r && (r = !0);
    }
  }
  return i(o), n;
}
function ne(o, e) {
  let t = e, n = null;
  function r(i) {
    if (n) return;
    if (i.nodeType === Node.TEXT_NODE) {
      const l = i.length;
      if (t <= l) {
        n = { node: i, offset: t };
        return;
      }
      t -= l;
      return;
    }
    const s = i.dataset?.raw;
    if (s !== void 0) {
      t -= s.length;
      return;
    }
    if (i.nodeName === "BR") {
      t -= 1;
      return;
    }
    i.childNodes.forEach(r);
  }
  return r(o), n;
}
function T(o) {
  return { type: "text", raw: o, groups: [o] };
}
function oe(o, e) {
  const t = e.filter((r) => r.pattern.source.startsWith("^")), n = e.filter((r) => !r.pattern.source.startsWith("^"));
  for (const r of t) {
    const i = o.match(r.pattern);
    if (i)
      return [{ type: r.type, raw: i[0], groups: i.slice(1).map((s) => s ?? "") }];
  }
  return re(o, n);
}
function re(o, e) {
  const t = [];
  let n = o;
  for (; n.length > 0; ) {
    let r = null;
    for (const i of e) {
      const s = n.match(i.pattern);
      !s || s.index === void 0 || (r === null || s.index < r.index) && (r = { index: s.index, match: s, def: i });
    }
    if (!r) {
      t.push(T(n));
      break;
    }
    r.index > 0 && t.push(T(n.slice(0, r.index))), t.push({
      type: r.def.type,
      raw: r.match[0],
      groups: r.match.slice(1).map((i) => i ?? "")
    }), n = n.slice(r.index + r.match[0].length);
  }
  return t;
}
function ie(o, e) {
  return o.split(`
`).map((t) => oe(t, e));
}
function se(o, e, t, n = -1) {
  const r = document.createDocumentFragment(), i = le(e);
  let s = 0;
  for (const l of o) {
    if (l.type === "text") {
      r.appendChild(document.createTextNode(l.raw)), s += l.raw.length;
      continue;
    }
    const c = s, a = c + l.raw.length;
    if (s = a, n >= c && n <= a) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const d = i.get(l.type);
    if (!d) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const p = d.render(l, t);
    if (p instanceof HTMLElement && d.onNavigate) {
      const h = d.onNavigate.bind(d);
      p.addEventListener("mousedown", (w) => {
        h(l, t) && w.preventDefault();
      });
    }
    r.appendChild(p);
  }
  return r;
}
function ae(o, e, t, n = -1) {
  let r = 0;
  return o.map((i) => {
    const s = i.reduce((a, d) => a + d.raw.length, 0), l = n - r, c = se(i, e, t, l);
    return r += s + 1, c;
  });
}
function le(o) {
  const e = /* @__PURE__ */ new Map();
  for (const t of o)
    for (const n of t.tokens)
      e.set(n.type, t);
  return e;
}
function ce(o, e, t, n = {}) {
  const { editorDiv: r, placeholder: i, breadcrumb: s } = o;
  function l() {
    const d = Z(r), p = x(r), h = ie(
      p,
      e.flatMap((g) => g.tokens)
    ), w = t.toContext(
      n.navigateFn ?? ((g) => {
      })
    ), u = ae(h, e, w, d);
    r.innerHTML = "", u.forEach((g, f) => {
      r.appendChild(g), f < u.length - 1 && r.appendChild(document.createTextNode(`
`));
    }), i.style.display = p.length ? "none" : "block";
    try {
      Q(r, d);
    } catch {
    }
  }
  function c() {
    s.innerHTML = "";
    const d = t.getTrail();
    d.forEach((p, h) => {
      if (h > 0) {
        const u = document.createElement("span");
        u.className = "wn-crumb-sep", u.textContent = "/", s.appendChild(u);
      }
      const w = document.createElement("span");
      w.className = "wn-crumb" + (h === d.length - 1 ? " wn-crumb--active" : ""), w.textContent = v(p), h < d.length - 1 && w.addEventListener("click", () => {
        t.truncateTrail(h);
        const u = t.getTrail(), g = u[u.length - 1];
        n.onBreadcrumbNavigate?.(g);
      }), s.appendChild(w);
    }), n.onTrailChange?.(t.getTrail()), a();
  }
  function a() {
    const d = t.getTrail(), p = M(window.location.search, d);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${p}${window.location.hash}`
    );
  }
  return { render: l, renderBreadcrumb: c, syncUrlToTrail: a };
}
const C = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
function de(o, e, t, n) {
  let r = null;
  function i(c) {
    r = c;
  }
  async function s(c) {
    if (!o.world[c]) {
      const a = await e.get(c);
      a ? o.setWorldPage(c, a) : (o.setWorldPage(c, `# ${c}

`), await e.set(c, o.world[c]));
    }
    o.pushTrail(c), await l(c);
  }
  async function l(c) {
    if (o.setNavigating(!0), !o.world[c]) {
      const d = await e.get(c);
      !d && c === "home" ? (o.setWorldPage(c, C), await e.set(c, C)) : o.setWorldPage(c, d ?? `# ${c}

`);
    }
    const a = o.world[c];
    t.editorDiv.textContent = a, r && (r.render(), r.renderBreadcrumb());
    try {
      const d = document.createRange(), p = window.getSelection();
      p && (d.setStart(t.editorDiv, 0), d.collapse(!0), p.removeAllRanges(), p.addRange(d));
    } catch {
    }
    n.onPageLoad?.(c, a), o.setNavigating(!1), t.editorDiv.focus();
  }
  return { navigateToPage: s, loadPage: l, setRenderAPI: i };
}
function ue(o, e, t, n, r, i, s, l) {
  function c(d) {
    const p = window.getSelection();
    if (!p || !p.rangeCount) return;
    const h = p.getRangeAt(0);
    h.deleteContents();
    const w = document.createTextNode(d);
    h.insertNode(w), h.setStart(w, d.length), h.collapse(!0), p.removeAllRanges(), p.addRange(h), o.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  function a() {
    const d = l.saveDebounceMs ?? 600;
    o.editorDiv.addEventListener("input", () => {
      if (n.isNavigating()) return;
      r.render();
      for (const S of e)
        S.onUpdate?.();
      const u = x(o.editorDiv), g = n.getTrail(), f = g[g.length - 1];
      n.setWorldPage(f, u), n.clearSaveTimer();
      const D = setTimeout(async () => {
        await s.set(f, u), l.onSave?.(f, u);
      }, d);
      n.setSaveTimer(D);
    }), o.editorDiv.addEventListener("paste", (u) => {
      u.preventDefault();
      const g = u.clipboardData?.getData("text/plain") ?? "";
      c(g);
    }), o.editorDiv.addEventListener("keydown", (u) => {
      u.key === "Tab" ? (u.preventDefault(), c("  ")) : u.key === "Enter" && (u.preventDefault(), c(`
`));
    });
    const p = n.getTrail(), h = p[p.length - 1];
    i.loadPage(h);
    const w = {
      "wn-toolbar": o.toolbar
    };
    for (const u of t)
      for (const g of u.slots) {
        const f = w[g];
        f && u.onMount(f);
      }
    return {
      destroy() {
        n.clearSaveTimer();
        for (const u of e)
          try {
            u.onDestroy?.();
          } catch (g) {
            console.error(`Plugin "${u.name}" onDestroy failed:`, g);
          }
        for (const u of t)
          try {
            u.onDestroy?.();
          } catch (g) {
            console.error(`UI plugin "${u.name}" onDestroy failed:`, g);
          }
        o.container.innerHTML = "";
      },
      navigate(u) {
        i.navigateToPage(u);
      },
      getCurrentPage() {
        const u = n.getTrail();
        return u[u.length - 1];
      },
      getTrail() {
        return n.getTrail();
      },
      getContent() {
        return x(o.editorDiv);
      },
      setContent(u) {
        const g = n.getTrail(), f = g[g.length - 1];
        n.setWorldPage(f, u), o.editorDiv.textContent = u, r.render();
      }
    };
  }
  return { mount: a };
}
class pe {
  constructor(e, t = {}) {
    this.registry = new j(), this.storage = new I(), this.options = {}, this._mounted = !1, this._slotElements = null, this.el = e, this.options = t, t.storage && (this.storage = t.storage);
    for (const n of q)
      this.registry.register(n);
  }
  /**
   * Register a plugin manifest (or replace a built-in by matching name).
   * Validates semver, detects conflicts, and fires lifecycle hooks.
   *
   * @param manifest - PluginManifest to register
   * @throws Error if version is invalid or a token/slot conflict is detected
   */
  use(e) {
    if (this.registry.register(e), this._mounted && e.kind === "ui" && this._slotElements)
      for (const t of e.slots) {
        const n = this._slotElements[t];
        n && e.onMount(n);
      }
    return this;
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
  withStorage(e) {
    return this.storage = e, this;
  }
  /**
   * Mount the editor into the provided element and return a live EditorInstance.
   * Injects required styles, sets up event listeners, and loads the initial page.
   */
  mount() {
    const e = this.registry.allUIPlugins().sort((n, r) => (n.priority ?? 0) - (r.priority ?? 0)), t = ge(
      this.el,
      this.registry.allContentPlugins(),
      e,
      this.storage,
      this.options
    );
    return this._mounted = !0, this._slotElements = {
      "wn-toolbar": this.el.querySelector(".wn-toolbar")
    }, t;
  }
}
function we(o, e = {}) {
  return new pe(o, e);
}
function ge(o, e, t, n, r) {
  const i = V(n, r), s = G(o, r.theme), l = de(i, n, s, r), c = {
    navigateFn: (p) => {
      l.navigateToPage(p);
    },
    onBreadcrumbNavigate: (p) => {
      l.loadPage(p);
    },
    onTrailChange: r.onTrailChange
  }, a = ce(s, e, i, c);
  return l.setRenderAPI(a), ue(
    s,
    e,
    t,
    i,
    a,
    l,
    n,
    r
  ).mount();
}
const he = "worldnotes", m = "pages";
class fe {
  constructor(e = he) {
    this.db = null, this.dbName = e;
  }
  /**
   * Open (or create) the IndexedDB database.
   * Must be called before get/set/keys, or those methods will call it lazily.
   */
  async open() {
    this.db || (this.db = await new Promise((e, t) => {
      const n = indexedDB.open(this.dbName, 1);
      n.onupgradeneeded = () => {
        n.result.createObjectStore(m);
      }, n.onsuccess = () => e(n.result), n.onerror = () => t(n.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(e) {
    const t = await this.ensureOpen();
    return new Promise((n, r) => {
      const s = t.transaction(m, "readonly").objectStore(m).get(e);
      s.onsuccess = () => n(s.result ?? null), s.onerror = () => r(s.error);
    });
  }
  async set(e, t) {
    const n = await this.ensureOpen();
    return new Promise((r, i) => {
      const l = n.transaction(m, "readwrite").objectStore(m).put(t, e);
      l.onsuccess = () => r(), l.onerror = () => i(l.error);
    });
  }
  async keys() {
    const e = await this.ensureOpen();
    return new Promise((t, n) => {
      const i = e.transaction(m, "readonly").objectStore(m).getAllKeys();
      i.onsuccess = () => t(i.result), i.onerror = () => n(i.error);
    });
  }
}
export {
  pe as EditorBuilder,
  fe as IndexedDBAdapter,
  I as LocalStorageAdapter,
  B as blockquotePlugin,
  R as boldPlugin,
  we as createEditor,
  q as defaultPlugins,
  _ as headingsPlugin,
  H as hrPlugin,
  $ as inlineCodePlugin,
  O as italicPlugin,
  U as linkPlugin,
  W as strikethroughPlugin,
  L as wikiLinkPlugin
};

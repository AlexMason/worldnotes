const U = "worldnotes";
class q {
  constructor(t = U) {
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
function P(n) {
  const t = n.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function R(n) {
  const t = n.indexOf("|"), e = (t === -1 ? n : n.slice(0, t)).trim(), o = t === -1 ? P(e) : n.slice(t + 1).trim();
  return { page: e, display: o || P(e) };
}
function F(n, t) {
  const o = n.replace(/^\?/, "").split("&").filter(Boolean).filter((a) => {
    const [l = ""] = a.split("=", 1);
    return decodeURIComponent(l.replace(/\+/g, " ")) !== "path";
  }), r = t.map((a) => encodeURIComponent(a)).join("/");
  return `?${[...o, `path=${r}`].join("&")}`;
}
function W(n) {
  const e = n.replace(/^\?/, "").split("&").filter(Boolean).find((s) => {
    const [a = ""] = s.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const o = e.indexOf("="), r = o === -1 ? "" : e.slice(o + 1);
  return r ? r.split("/").filter(Boolean).map((s) => decodeURIComponent(s)) : [];
}
const j = {
  name: "wiki-link",
  tokens: [
    {
      type: "wiki-link",
      // Matches [[any content]] — non-greedy to handle multiple links per line
      pattern: /\[\[([^\]]+)\]\]/
    }
  ],
  render(n, t) {
    const { page: e, display: o } = R(n.groups[0] ?? ""), r = document.createElement("span");
    return r.className = "wn-wiki-link", r.dataset.page = e, r.dataset.raw = n.raw, r.textContent = o, r;
  },
  onNavigate(n, t) {
    const { page: e } = R(n.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function k(n, t, e) {
  const o = document.createElement("span");
  o.className = e;
  const r = document.createElement("span");
  r.className = "wn-punct", r.textContent = t;
  const s = document.createElement("span");
  return s.className = `${e}-text`, s.textContent = n.groups[0] ?? "", o.appendChild(r), o.appendChild(s), o;
}
const K = {
  name: "headings",
  tokens: [
    { type: "h1", pattern: /^# (.*)$/ },
    { type: "h2", pattern: /^## (.*)$/ },
    { type: "h3", pattern: /^### (.*)$/ }
  ],
  render(n, t) {
    switch (n.type) {
      case "h1":
        return k(n, "# ", "wn-h1");
      case "h2":
        return k(n, "## ", "wn-h2");
      case "h3":
        return k(n, "### ", "wn-h3");
      default:
        return k(n, "", "wn-h1");
    }
  }
};
function M(n, t, e) {
  const o = document.createElement("span");
  o.className = n;
  const r = (s) => {
    const a = document.createElement("span");
    return a.className = "wn-punct", a.textContent = s, a;
  };
  return o.appendChild(r(t)), o.appendChild(document.createTextNode(e)), o.appendChild(r(t)), o;
}
const X = {
  name: "bold",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(n, t) {
    return M("wn-bold", "**", n.groups[0] ?? "");
  }
}, G = {
  name: "italic",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(n, t) {
    return M("wn-italic", "*", n.groups[0] ?? "");
  }
}, V = {
  name: "inline-code",
  tokens: [{ type: "inline-code", pattern: /`([^`]+)`/ }],
  render(n, t) {
    const e = document.createElement("span");
    e.className = "wn-inline-code";
    const o = (s) => {
      const a = document.createElement("span");
      return a.className = "wn-punct", a.textContent = s, a;
    };
    e.appendChild(o("`"));
    const r = document.createElement("span");
    return r.className = "wn-code-text", r.textContent = n.groups[0] ?? "", e.appendChild(r), e.appendChild(o("`")), e;
  }
}, Q = {
  name: "blockquote",
  tokens: [{ type: "blockquote", pattern: /^(> )(.*)$/ }],
  render(n, t) {
    const e = document.createElement("span");
    e.className = "wn-blockquote";
    const o = document.createElement("span");
    o.className = "wn-punct", o.textContent = "> ";
    const r = document.createElement("span");
    return r.className = "wn-blockquote-text", r.textContent = n.groups[1] ?? "", e.appendChild(o), e.appendChild(r), e;
  }
}, Y = {
  name: "hr",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(n, t) {
    const e = document.createElement("span");
    return e.className = "wn-hr", e.textContent = "---", e;
  }
}, J = [
  K,
  // line-level — must come before inline plugins
  Y,
  // line-level
  Q,
  // line-level
  j,
  // inline
  X,
  // inline — ** before * to avoid partial match
  G,
  // inline
  V
  // inline
];
function A(n) {
  return { type: "text", raw: n, groups: [n] };
}
function Z(n, t) {
  const e = t.filter((r) => r.pattern.source.startsWith("^")), o = t.filter((r) => !r.pattern.source.startsWith("^"));
  for (const r of e) {
    const s = n.match(r.pattern);
    if (s)
      return [{ type: r.type, raw: s[0], groups: s.slice(1).map((a) => a ?? "") }];
  }
  return ee(n, o);
}
function ee(n, t) {
  const e = [];
  let o = n;
  for (; o.length > 0; ) {
    let r = null;
    for (const s of t) {
      const a = o.match(s.pattern);
      !a || a.index === void 0 || (r === null || a.index < r.index) && (r = { index: a.index, match: a, def: s });
    }
    if (!r) {
      e.push(A(o));
      break;
    }
    r.index > 0 && e.push(A(o.slice(0, r.index))), e.push({
      type: r.def.type,
      raw: r.match[0],
      groups: r.match.slice(1).map((s) => s ?? "")
    }), o = o.slice(r.index + r.match[0].length);
  }
  return e;
}
function te(n, t) {
  return n.split(`
`).map((e) => Z(e, t));
}
function ne(n, t, e, o = -1) {
  const r = document.createDocumentFragment(), s = re(t);
  let a = 0;
  for (const l of n) {
    if (l.type === "text") {
      r.appendChild(document.createTextNode(l.raw)), a += l.raw.length;
      continue;
    }
    const p = a, c = p + l.raw.length;
    if (a = c, o >= p && o <= c) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const u = s.get(l.type);
    if (!u) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const w = u.render(l, e);
    if (w instanceof HTMLElement && u.onNavigate) {
      const y = u.onNavigate.bind(u);
      w.addEventListener("mousedown", (x) => {
        y(l, e) && x.preventDefault();
      });
    }
    r.appendChild(w);
  }
  return r;
}
function oe(n, t, e, o = -1) {
  let r = 0;
  return n.map((s) => {
    const a = s.reduce((c, u) => c + u.raw.length, 0), l = o - r, p = ne(s, t, e, l);
    return r += a + 1, p;
  });
}
function re(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    for (const o of e.tokens)
      t.set(o.type, e);
  return t;
}
function se(n) {
  const t = window.getSelection();
  if (!t || !t.rangeCount) return 0;
  const e = t.getRangeAt(0);
  return _(n, e.endContainer, e.endOffset).offset;
}
function ae(n, t) {
  const e = de(n, t), o = document.createRange(), r = window.getSelection();
  r && (e ? (o.setStart(e.node, e.offset), o.collapse(!0)) : (o.selectNodeContents(n), o.collapse(!1)), r.removeAllRanges(), r.addRange(o));
}
const ie = /* @__PURE__ */ new Set([
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
function ce(n) {
  return n.nodeType === Node.ELEMENT_NODE && ie.has(n.nodeName);
}
function D(n) {
  return _(n, null, 0).text;
}
function _(n, t, e) {
  let o = "", r = 0, s = t === null;
  function a(c) {
    s || (r += c.length), o += c;
  }
  function l(c) {
    if (c.nodeType === Node.TEXT_NODE) {
      const u = c.textContent ?? "";
      c === t && !s ? (r += Math.min(e, u.length), s = !0, o += u) : a(u);
    } else if (c.dataset?.raw !== void 0) {
      const u = c.dataset.raw ?? "";
      c === t && !s ? (r += e <= 0 ? 0 : u.length, s = !0) : le(c, t) && !s ? (I(c, t, e), r += Math.min(I(c, t, e), u.length), s = !0) : a(u);
    } else c.nodeName === "BR" ? a(`
`) : (ce(c) && o && !o.endsWith(`
`) && a(`
`), p(c));
  }
  function p(c) {
    c.childNodes.forEach((u, w) => {
      c === t && w === e && !s && (s = !0), l(u);
    }), c === t && c.childNodes.length === e && !s && (s = !0);
  }
  return p(n), { text: o, offset: r };
}
function le(n, t) {
  if (!t) return !1;
  let e = t;
  for (; e; ) {
    if (e === n) return !0;
    e = e.parentNode;
  }
  return !1;
}
function I(n, t, e) {
  let o = 0, r = !1;
  function s(a) {
    if (!r) {
      if (a.nodeType === Node.TEXT_NODE) {
        const l = a.textContent ?? "";
        a === t ? (o += Math.min(e, l.length), r = !0) : o += l.length;
        return;
      }
      a.childNodes.forEach((l, p) => {
        a === t && p === e && !r && (r = !0), r || s(l);
      }), a === t && a.childNodes.length === e && !r && (r = !0);
    }
  }
  return s(n), o;
}
function de(n, t) {
  let e = t, o = null;
  function r(s) {
    if (o) return;
    if (s.nodeType === Node.TEXT_NODE) {
      const l = s.length;
      if (e <= l) {
        o = { node: s, offset: e };
        return;
      }
      e -= l;
      return;
    }
    const a = s.dataset?.raw;
    if (a !== void 0) {
      e -= a.length;
      return;
    }
    if (s.nodeName === "BR") {
      e -= 1;
      return;
    }
    s.childNodes.forEach(r);
  }
  return r(n), o;
}
const O = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
class ue {
  constructor(t, e = {}) {
    this.plugins = [...J], this.storage = new q(), this.options = {}, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
  }
  /**
   * Register a plugin (or replace a built-in by matching name).
   * Plugins are applied in registration order during tokenization.
   *
   * @param plugin - Plugin instance to register
   */
  use(t) {
    const e = this.plugins.findIndex((o) => o.name === t.name);
    return e !== -1 ? this.plugins[e] = t : this.plugins.push(t), this;
  }
  /**
   * Remove all default plugins and start with an empty plugin set.
   * Useful when you want full control over which tokens are supported.
   */
  clearPlugins() {
    return this.plugins = [], this;
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
    return pe(this.el, this.plugins, this.storage, this.options);
  }
}
function we(n, t = {}) {
  return new ue(n, t);
}
function pe(n, t, e, o) {
  const r = o.saveDebounceMs ?? 600, s = o.initialPage ?? "home", a = W(window.location.search), l = a[a.length - 1] ?? s, p = {};
  let c = a.length ? [...a] : [l], u = null, w = !1;
  fe(), n.innerHTML = "", n.className = "wn-root";
  const y = b("div", "wn-topbar"), x = b("div", "wn-breadcrumb"), E = b("div", "wn-editor-wrap"), f = b("div", "wn-editor"), C = b("div", "wn-placeholder");
  C.textContent = "Start writing… use [[page name]] to link deeper", f.contentEditable = "true", f.spellcheck = !1, y.appendChild(x), E.appendChild(C), E.appendChild(f), n.appendChild(y), n.appendChild(E);
  const B = {
    navigate: (i) => L(i),
    getTrail: () => [...c],
    getWorld: () => ({ ...p })
  };
  function T() {
    const i = se(f), d = D(f), h = te(d, t.flatMap((S) => S.tokens)), m = oe(h, t, B, i);
    f.innerHTML = "", m.forEach((S, z) => {
      f.appendChild(S), z < m.length - 1 && f.appendChild(document.createTextNode(`
`));
    }), C.style.display = d.length ? "none" : "block";
    try {
      ae(f, i);
    } catch {
    }
  }
  function H() {
    x.innerHTML = "", c.forEach((i, d) => {
      if (d > 0) {
        const m = document.createElement("span");
        m.className = "wn-crumb-sep", m.textContent = "/", x.appendChild(m);
      }
      const h = document.createElement("span");
      h.className = "wn-crumb" + (d === c.length - 1 ? " wn-crumb--active" : ""), h.textContent = P(i), d < c.length - 1 && h.addEventListener("click", () => {
        c = c.slice(0, d + 1), N(c[c.length - 1]);
      }), x.appendChild(h);
    }), o.onTrailChange?.([...c]), $();
  }
  function $() {
    const i = F(window.location.search, c);
    window.history.replaceState(null, "", `${window.location.pathname}${i}${window.location.hash}`);
  }
  async function L(i) {
    if (!p[i]) {
      const d = await e.get(i);
      p[i] = d ?? `# ${i}

`, d || await e.set(i, p[i]);
    }
    c.push(i), await N(i);
  }
  async function N(i) {
    if (w = !0, !p[i]) {
      const h = await e.get(i);
      !h && i === "home" ? (p[i] = O, await e.set(i, O)) : p[i] = h ?? `# ${i}

`;
    }
    const d = p[i];
    f.textContent = d, T(), H();
    try {
      const h = document.createRange(), m = window.getSelection();
      m && (h.setStart(f, 0), h.collapse(!0), m.removeAllRanges(), m.addRange(h));
    } catch {
    }
    o.onPageLoad?.(i, d), w = !1, f.focus();
  }
  return f.addEventListener("input", () => {
    if (w) return;
    T();
    const i = D(f), d = c[c.length - 1];
    p[d] = i, u && clearTimeout(u), u = setTimeout(async () => {
      await e.set(d, i), o.onSave?.(d, i);
    }, r);
  }), f.addEventListener("paste", (i) => {
    i.preventDefault();
    const d = i.clipboardData?.getData("text/plain") ?? "";
    v(d);
  }), f.addEventListener("keydown", (i) => {
    i.key === "Tab" ? (i.preventDefault(), v("  ")) : i.key === "Enter" && (i.preventDefault(), v(`
`));
  }), N(l), {
    destroy() {
      u && clearTimeout(u), n.innerHTML = "";
    },
    navigate(i) {
      L(i);
    },
    getCurrentPage() {
      return c[c.length - 1];
    },
    getTrail() {
      return [...c];
    },
    getContent() {
      return D(f);
    },
    setContent(i) {
      const d = c[c.length - 1];
      p[d] = i, f.textContent = i, T();
    }
  };
  function v(i) {
    const d = window.getSelection();
    if (!d || !d.rangeCount) return;
    const h = d.getRangeAt(0);
    h.deleteContents();
    const m = document.createTextNode(i);
    h.insertNode(m), h.setStart(m, i.length), h.collapse(!0), d.removeAllRanges(), d.addRange(h), f.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
}
function b(n, t) {
  const e = document.createElement(n);
  return e.className = t, e;
}
function fe() {
  const n = "worldnotes-styles";
  if (document.getElementById(n)) return;
  const t = document.createElement("style");
  t.id = n, t.textContent = he, document.head.appendChild(t);
}
const he = `
.wn-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0e0e10;
  font-family: monospace;
  color: #c9c9d0;
  overflow: hidden;
}

.wn-topbar {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 0.5px solid #1f1f23;
  background: #0a0a0c;
  flex-shrink: 0;
}

.wn-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 12px;
  flex: 1;
  overflow: hidden;
}

.wn-crumb {
  color: #4a4a5e;
  cursor: pointer;
  white-space: nowrap;
  padding: 3px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.wn-crumb:hover { color: #9b8fe8; }
.wn-crumb--active { color: #c9c9d0; cursor: default; }

.wn-crumb-sep {
  color: #252530;
  font-size: 11px;
  padding: 0 1px;
  user-select: none;
}

.wn-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 28px 36px;
  position: relative;
}

.wn-editor {
  outline: none;
  min-height: 100%;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.9;
  color: #9090a8;
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: #9b8fe8;
}

.wn-placeholder {
  position: absolute;
  top: 28px;
  left: 36px;
  font-family: monospace;
  font-size: 14px;
  color: #282838;
  pointer-events: none;
  user-select: none;
}

/* Punctuation */
.wn-punct { color: #2e2e44; font-size: 0.85em; }

/* Headings */
.wn-h1, .wn-h1-text { font-size: 22px; font-weight: 500; color: #e2e1f4; font-family: sans-serif; }
.wn-h2, .wn-h2-text { font-size: 17px; font-weight: 500; color: #c8c7e2; font-family: sans-serif; }
.wn-h3, .wn-h3-text { font-size: 14px; font-weight: 500; color: #a8a8c4; font-family: sans-serif; }

/* Inline */
.wn-bold { font-weight: 600; color: #d4d4ea; }
.wn-italic { font-style: italic; color: #7878a0; }
.wn-inline-code { color: #9b8fe8; }
.wn-code-text { background: #17171e; padding: 1px 5px; border-radius: 3px; font-size: 12.5px; }

/* Blockquote */
.wn-blockquote {
  display: block;
  color: #4a4a66;
  border-left: 2px solid #2a2a42;
  padding-left: 10px;
}

/* HR */
.wn-hr {
  display: block;
  border-top: 0.5px solid #1e1e2c;
  color: transparent;
  font-size: 2px;
  margin: 4px 0;
}

/* Wiki link */
.wn-wiki-link {
  color: #9b8fe8;
  background: #16142a;
  border: 0.5px solid #332d6a;
  padding: 0 5px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.12s;
}
.wn-wiki-link:hover { background: #221e42; color: #bbb3f8; }
`, me = "worldnotes", g = "pages";
class ge {
  constructor(t = me) {
    this.db = null, this.dbName = t;
  }
  /**
   * Open (or create) the IndexedDB database.
   * Must be called before get/set/keys, or those methods will call it lazily.
   */
  async open() {
    this.db || (this.db = await new Promise((t, e) => {
      const o = indexedDB.open(this.dbName, 1);
      o.onupgradeneeded = () => {
        o.result.createObjectStore(g);
      }, o.onsuccess = () => t(o.result), o.onerror = () => e(o.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(t) {
    const e = await this.ensureOpen();
    return new Promise((o, r) => {
      const a = e.transaction(g, "readonly").objectStore(g).get(t);
      a.onsuccess = () => o(a.result ?? null), a.onerror = () => r(a.error);
    });
  }
  async set(t, e) {
    const o = await this.ensureOpen();
    return new Promise((r, s) => {
      const l = o.transaction(g, "readwrite").objectStore(g).put(e, t);
      l.onsuccess = () => r(), l.onerror = () => s(l.error);
    });
  }
  async keys() {
    const t = await this.ensureOpen();
    return new Promise((e, o) => {
      const s = t.transaction(g, "readonly").objectStore(g).getAllKeys();
      s.onsuccess = () => e(s.result), s.onerror = () => o(s.error);
    });
  }
}
export {
  ue as EditorBuilder,
  ge as IndexedDBAdapter,
  q as LocalStorageAdapter,
  Q as blockquotePlugin,
  X as boldPlugin,
  we as createEditor,
  J as defaultPlugins,
  K as headingsPlugin,
  Y as hrPlugin,
  V as inlineCodePlugin,
  G as italicPlugin,
  j as wikiLinkPlugin
};

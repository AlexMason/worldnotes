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
function P(o) {
  const t = o.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function R(o) {
  const t = o.indexOf("|"), e = (t === -1 ? o : o.slice(0, t)).trim(), n = t === -1 ? P(e) : o.slice(t + 1).trim();
  return { page: e, display: n || P(e) };
}
function F(o, t) {
  const n = o.replace(/^\?/, "").split("&").filter(Boolean).filter((s) => {
    const [l = ""] = s.split("=", 1);
    return decodeURIComponent(l.replace(/\+/g, " ")) !== "path";
  }), r = t.map((s) => encodeURIComponent(s)).join("/");
  return `?${[...n, `path=${r}`].join("&")}`;
}
function W(o) {
  const e = o.replace(/^\?/, "").split("&").filter(Boolean).find((a) => {
    const [s = ""] = a.split("=", 1);
    return decodeURIComponent(s.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const n = e.indexOf("="), r = n === -1 ? "" : e.slice(n + 1);
  return r ? r.split("/").filter(Boolean).map((a) => decodeURIComponent(a)) : [];
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
  render(o, t) {
    const { page: e, display: n } = R(o.groups[0] ?? ""), r = document.createElement("span");
    return r.className = "wn-wiki-link", r.dataset.page = e, r.dataset.raw = o.raw, r.textContent = n, r;
  },
  onNavigate(o, t) {
    const { page: e } = R(o.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function C(o, t, e) {
  const n = document.createElement("span");
  n.className = e;
  const r = document.createElement("span");
  r.className = "wn-punct", r.textContent = t;
  const a = document.createElement("span");
  return a.className = `${e}-text`, a.textContent = o.groups[0] ?? "", n.appendChild(r), n.appendChild(a), n;
}
const K = {
  name: "headings",
  tokens: [
    { type: "h1", pattern: /^# (.*)$/ },
    { type: "h2", pattern: /^## (.*)$/ },
    { type: "h3", pattern: /^### (.*)$/ }
  ],
  render(o, t) {
    switch (o.type) {
      case "h1":
        return C(o, "# ", "wn-h1");
      case "h2":
        return C(o, "## ", "wn-h2");
      case "h3":
        return C(o, "### ", "wn-h3");
      default:
        return C(o, "", "wn-h1");
    }
  }
};
function M(o, t, e) {
  const n = document.createElement("span");
  n.className = o;
  const r = (a) => {
    const s = document.createElement("span");
    return s.className = "wn-punct", s.textContent = a, s;
  };
  return n.appendChild(r(t)), n.appendChild(document.createTextNode(e)), n.appendChild(r(t)), n;
}
const X = {
  name: "bold",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(o, t) {
    return M("wn-bold", "**", o.groups[0] ?? "");
  }
}, G = {
  name: "italic",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(o, t) {
    return M("wn-italic", "*", o.groups[0] ?? "");
  }
}, V = {
  name: "inline-code",
  tokens: [{ type: "inline-code", pattern: /`([^`]+)`/ }],
  render(o, t) {
    const e = document.createElement("span");
    e.className = "wn-inline-code";
    const n = (a) => {
      const s = document.createElement("span");
      return s.className = "wn-punct", s.textContent = a, s;
    };
    e.appendChild(n("`"));
    const r = document.createElement("span");
    return r.className = "wn-code-text", r.textContent = o.groups[0] ?? "", e.appendChild(r), e.appendChild(n("`")), e;
  }
}, Q = {
  name: "blockquote",
  tokens: [{ type: "blockquote", pattern: /^(> )(.*)$/ }],
  render(o, t) {
    const e = document.createElement("span");
    e.className = "wn-blockquote";
    const n = document.createElement("span");
    n.className = "wn-punct", n.textContent = "> ";
    const r = document.createElement("span");
    return r.className = "wn-blockquote-text", r.textContent = o.groups[1] ?? "", e.appendChild(n), e.appendChild(r), e;
  }
}, Y = {
  name: "hr",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(o, t) {
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
function A(o) {
  return { type: "text", raw: o, groups: [o] };
}
function Z(o, t) {
  const e = t.filter((r) => r.pattern.source.startsWith("^")), n = t.filter((r) => !r.pattern.source.startsWith("^"));
  for (const r of e) {
    const a = o.match(r.pattern);
    if (a)
      return [{ type: r.type, raw: a[0], groups: a.slice(1).map((s) => s ?? "") }];
  }
  return ee(o, n);
}
function ee(o, t) {
  const e = [];
  let n = o;
  for (; n.length > 0; ) {
    let r = null;
    for (const a of t) {
      const s = n.match(a.pattern);
      !s || s.index === void 0 || (r === null || s.index < r.index) && (r = { index: s.index, match: s, def: a });
    }
    if (!r) {
      e.push(A(n));
      break;
    }
    r.index > 0 && e.push(A(n.slice(0, r.index))), e.push({
      type: r.def.type,
      raw: r.match[0],
      groups: r.match.slice(1).map((a) => a ?? "")
    }), n = n.slice(r.index + r.match[0].length);
  }
  return e;
}
function te(o, t) {
  return o.split(`
`).map((e) => Z(e, t));
}
function ne(o, t, e, n = -1) {
  const r = document.createDocumentFragment(), a = re(t);
  let s = 0;
  for (const l of o) {
    if (l.type === "text") {
      r.appendChild(document.createTextNode(l.raw)), s += l.raw.length;
      continue;
    }
    const d = s, c = d + l.raw.length;
    if (s = c, n >= d && n <= c) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const h = a.get(l.type);
    if (!h) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const m = h.render(l, e);
    if (m instanceof HTMLElement && h.onNavigate) {
      const E = h.onNavigate.bind(h);
      m.addEventListener("mousedown", (b) => {
        E(l, e) && b.preventDefault();
      });
    }
    r.appendChild(m);
  }
  return r;
}
function oe(o, t, e, n = -1) {
  let r = 0;
  return o.map((a) => {
    const s = a.reduce((c, h) => c + h.raw.length, 0), l = n - r, d = ne(a, t, e, l);
    return r += s + 1, d;
  });
}
function re(o) {
  const t = /* @__PURE__ */ new Map();
  for (const e of o)
    for (const n of e.tokens)
      t.set(n.type, e);
  return t;
}
function ae(o) {
  const t = window.getSelection();
  if (!t || !t.rangeCount) return 0;
  const e = t.getRangeAt(0);
  return _(o, e.endContainer, e.endOffset).offset;
}
function se(o, t) {
  const e = de(o, t), n = document.createRange(), r = window.getSelection();
  r && (e ? (n.setStart(e.node, e.offset), n.collapse(!0)) : (n.selectNodeContents(o), n.collapse(!1)), r.removeAllRanges(), r.addRange(n));
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
function ce(o) {
  return o.nodeType === Node.ELEMENT_NODE && ie.has(o.nodeName);
}
function D(o) {
  return _(o, null, 0).text;
}
function _(o, t, e) {
  let n = "", r = 0, a = t === null;
  function s(c) {
    a || (r += c.length), n += c;
  }
  function l(c) {
    var h;
    if (c.nodeType === Node.TEXT_NODE) {
      const m = c.textContent ?? "";
      c === t && !a ? (r += Math.min(e, m.length), a = !0, n += m) : s(m);
    } else if (((h = c.dataset) == null ? void 0 : h.raw) !== void 0) {
      const m = c.dataset.raw ?? "";
      c === t && !a ? (r += e <= 0 ? 0 : m.length, a = !0) : le(c, t) && !a ? (I(c, t, e), r += Math.min(I(c, t, e), m.length), a = !0) : s(m);
    } else c.nodeName === "BR" ? s(`
`) : (ce(c) && n && !n.endsWith(`
`) && s(`
`), d(c));
  }
  function d(c) {
    c.childNodes.forEach((h, m) => {
      c === t && m === e && !a && (a = !0), l(h);
    }), c === t && c.childNodes.length === e && !a && (a = !0);
  }
  return d(o), { text: n, offset: r };
}
function le(o, t) {
  if (!t) return !1;
  let e = t;
  for (; e; ) {
    if (e === o) return !0;
    e = e.parentNode;
  }
  return !1;
}
function I(o, t, e) {
  let n = 0, r = !1;
  function a(s) {
    if (!r) {
      if (s.nodeType === Node.TEXT_NODE) {
        const l = s.textContent ?? "";
        s === t ? (n += Math.min(e, l.length), r = !0) : n += l.length;
        return;
      }
      s.childNodes.forEach((l, d) => {
        s === t && d === e && !r && (r = !0), r || a(l);
      }), s === t && s.childNodes.length === e && !r && (r = !0);
    }
  }
  return a(o), n;
}
function de(o, t) {
  let e = t, n = null;
  function r(a) {
    var l;
    if (n) return;
    if (a.nodeType === Node.TEXT_NODE) {
      const d = a.length;
      if (e <= d) {
        n = { node: a, offset: e };
        return;
      }
      e -= d;
      return;
    }
    const s = (l = a.dataset) == null ? void 0 : l.raw;
    if (s !== void 0) {
      e -= s.length;
      return;
    }
    if (a.nodeName === "BR") {
      e -= 1;
      return;
    }
    a.childNodes.forEach(r);
  }
  return r(o), n;
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
    const e = this.plugins.findIndex((n) => n.name === t.name);
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
function we(o, t = {}) {
  return new ue(o, t);
}
function pe(o, t, e, n) {
  const r = n.saveDebounceMs ?? 600, a = n.initialPage ?? "home", s = W(window.location.search), l = s[s.length - 1] ?? a, d = {};
  let c = s.length ? [...s] : [l], h = null, m = !1;
  fe(), o.innerHTML = "", o.className = "wn-root";
  const E = y("div", "wn-topbar"), b = y("div", "wn-breadcrumb"), k = y("div", "wn-editor-wrap"), f = y("div", "wn-editor"), T = y("div", "wn-placeholder");
  T.textContent = "Start writing… use [[page name]] to link deeper", f.contentEditable = "true", f.spellcheck = !1, E.appendChild(b), k.appendChild(T), k.appendChild(f), o.appendChild(E), o.appendChild(k);
  const B = {
    navigate: (i) => L(i),
    getTrail: () => [...c],
    getWorld: () => ({ ...d })
  };
  function N() {
    const i = ae(f), u = D(f), p = te(u, t.flatMap((g) => g.tokens)), w = oe(p, t, B, i);
    f.innerHTML = "", w.forEach((g, z) => {
      f.appendChild(g), z < w.length - 1 && f.appendChild(document.createTextNode(`
`));
    }), T.style.display = u.length ? "none" : "block";
    try {
      se(f, i);
    } catch {
    }
  }
  function H() {
    var i;
    b.innerHTML = "", c.forEach((u, p) => {
      if (p > 0) {
        const g = document.createElement("span");
        g.className = "wn-crumb-sep", g.textContent = "/", b.appendChild(g);
      }
      const w = document.createElement("span");
      w.className = "wn-crumb" + (p === c.length - 1 ? " wn-crumb--active" : ""), w.textContent = P(u), p < c.length - 1 && w.addEventListener("click", () => {
        c = c.slice(0, p + 1), v(c[c.length - 1]);
      }), b.appendChild(w);
    }), (i = n.onTrailChange) == null || i.call(n, [...c]), $();
  }
  function $() {
    const i = F(window.location.search, c);
    window.history.replaceState(null, "", `${window.location.pathname}${i}${window.location.hash}`);
  }
  async function L(i) {
    if (!d[i]) {
      const u = await e.get(i);
      d[i] = u ?? `# ${i}

`, u || await e.set(i, d[i]);
    }
    c.push(i), await v(i);
  }
  async function v(i) {
    var p;
    if (m = !0, !d[i]) {
      const w = await e.get(i);
      !w && i === "home" ? (d[i] = O, await e.set(i, O)) : d[i] = w ?? `# ${i}

`;
    }
    const u = d[i];
    f.textContent = u, N(), H();
    try {
      const w = document.createRange(), g = window.getSelection();
      g && (w.setStart(f, 0), w.collapse(!0), g.removeAllRanges(), g.addRange(w));
    } catch {
    }
    (p = n.onPageLoad) == null || p.call(n, i, u), m = !1, f.focus();
  }
  return f.addEventListener("input", () => {
    if (m) return;
    N();
    const i = D(f), u = c[c.length - 1];
    d[u] = i, h && clearTimeout(h), h = setTimeout(async () => {
      var p;
      await e.set(u, i), (p = n.onSave) == null || p.call(n, u, i);
    }, r);
  }), f.addEventListener("paste", (i) => {
    var p;
    i.preventDefault();
    const u = ((p = i.clipboardData) == null ? void 0 : p.getData("text/plain")) ?? "";
    S(u);
  }), f.addEventListener("keydown", (i) => {
    i.key === "Tab" ? (i.preventDefault(), S("  ")) : i.key === "Enter" && (i.preventDefault(), S(`
`));
  }), v(l), {
    destroy() {
      h && clearTimeout(h), o.innerHTML = "";
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
      const u = c[c.length - 1];
      d[u] = i, f.textContent = i, N();
    }
  };
  function S(i) {
    const u = window.getSelection();
    if (!u || !u.rangeCount) return;
    const p = u.getRangeAt(0);
    p.deleteContents();
    const w = document.createTextNode(i);
    p.insertNode(w), p.setStart(w, i.length), p.collapse(!0), u.removeAllRanges(), u.addRange(p), f.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
}
function y(o, t) {
  const e = document.createElement(o);
  return e.className = t, e;
}
function fe() {
  const o = "worldnotes-styles";
  if (document.getElementById(o)) return;
  const t = document.createElement("style");
  t.id = o, t.textContent = he, document.head.appendChild(t);
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
`, me = "worldnotes", x = "pages";
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
      const n = indexedDB.open(this.dbName, 1);
      n.onupgradeneeded = () => {
        n.result.createObjectStore(x);
      }, n.onsuccess = () => t(n.result), n.onerror = () => e(n.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(t) {
    const e = await this.ensureOpen();
    return new Promise((n, r) => {
      const s = e.transaction(x, "readonly").objectStore(x).get(t);
      s.onsuccess = () => n(s.result ?? null), s.onerror = () => r(s.error);
    });
  }
  async set(t, e) {
    const n = await this.ensureOpen();
    return new Promise((r, a) => {
      const l = n.transaction(x, "readwrite").objectStore(x).put(e, t);
      l.onsuccess = () => r(), l.onerror = () => a(l.error);
    });
  }
  async keys() {
    const t = await this.ensureOpen();
    return new Promise((e, n) => {
      const a = t.transaction(x, "readonly").objectStore(x).getAllKeys();
      a.onsuccess = () => e(a.result), a.onerror = () => n(a.error);
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

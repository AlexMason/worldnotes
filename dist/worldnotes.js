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
function b(n) {
  const t = n.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function y(n) {
  const t = n.indexOf("|"), e = (t === -1 ? n : n.slice(0, t)).trim(), o = t === -1 ? b(e) : n.slice(t + 1).trim();
  return { page: e, display: o || b(e) };
}
function L(n, t) {
  const o = n.replace(/^\?/, "").split("&").filter(Boolean).filter((a) => {
    const [l = ""] = a.split("=", 1);
    return decodeURIComponent(l.replace(/\+/g, " ")) !== "path";
  }), r = t.map((a) => encodeURIComponent(a)).join("/");
  return `?${[...o, `path=${r}`].join("&")}`;
}
function R(n) {
  const e = n.replace(/^\?/, "").split("&").filter(Boolean).find((i) => {
    const [a = ""] = i.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const o = e.indexOf("="), r = o === -1 ? "" : e.slice(o + 1);
  return r ? r.split("/").filter(Boolean).map((i) => decodeURIComponent(i)) : [];
}
const A = {
  name: "wiki-link",
  tokens: [
    {
      type: "wiki-link",
      // Matches [[any content]] — non-greedy to handle multiple links per line
      pattern: /\[\[([^\]]+)\]\]/
    }
  ],
  render(n, t) {
    const { page: e, display: o } = y(n.groups[0] ?? ""), r = document.createElement("span");
    return r.className = "wn-wiki-link", r.dataset.page = e, r.dataset.raw = n.raw, r.textContent = o, r;
  },
  onNavigate(n, t) {
    const { page: e } = y(n.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function x(n, t, e) {
  const o = document.createElement("span");
  o.className = e;
  const r = document.createElement("span");
  r.className = "wn-punct", r.textContent = t;
  const i = document.createElement("span");
  return i.className = `${e}-text`, i.textContent = n.groups[0] ?? "", o.appendChild(r), o.appendChild(i), o;
}
const I = {
  name: "headings",
  tokens: [
    { type: "h1", pattern: /^# (.*)$/ },
    { type: "h2", pattern: /^## (.*)$/ },
    { type: "h3", pattern: /^### (.*)$/ }
  ],
  render(n, t) {
    switch (n.type) {
      case "h1":
        return x(n, "# ", "wn-h1");
      case "h2":
        return x(n, "## ", "wn-h2");
      case "h3":
        return x(n, "### ", "wn-h3");
      default:
        return x(n, "", "wn-h1");
    }
  }
};
function k(n, t, e) {
  const o = document.createElement("span");
  o.className = n;
  const r = (i) => {
    const a = document.createElement("span");
    return a.className = "wn-punct", a.textContent = i, a;
  };
  return o.appendChild(r(t)), o.appendChild(document.createTextNode(e)), o.appendChild(r(t)), o;
}
const O = {
  name: "bold",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(n, t) {
    return k("wn-bold", "**", n.groups[0] ?? "");
  }
}, _ = {
  name: "italic",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(n, t) {
    return k("wn-italic", "*", n.groups[0] ?? "");
  }
}, M = {
  name: "inline-code",
  tokens: [{ type: "inline-code", pattern: /`([^`]+)`/ }],
  render(n, t) {
    const e = document.createElement("span");
    e.className = "wn-inline-code";
    const o = (i) => {
      const a = document.createElement("span");
      return a.className = "wn-punct", a.textContent = i, a;
    };
    e.appendChild(o("`"));
    const r = document.createElement("span");
    return r.className = "wn-code-text", r.textContent = n.groups[0] ?? "", e.appendChild(r), e.appendChild(o("`")), e;
  }
}, B = {
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
}, H = {
  name: "hr",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(n, t) {
    const e = document.createElement("span");
    return e.className = "wn-hr", e.textContent = "---", e;
  }
}, W = [
  I,
  // line-level — must come before inline plugins
  H,
  // line-level
  B,
  // line-level
  A,
  // inline
  O,
  // inline — ** before * to avoid partial match
  _,
  // inline
  M
  // inline
];
function $(n, t = {}) {
  const e = t.initialPage ?? "home", o = R(window.location.search), r = o[o.length - 1] ?? e, i = {};
  let a = o.length ? [...o] : [r], l = null, d = !1;
  return {
    world: i,
    getTrail() {
      return [...a];
    },
    getWorld() {
      return { ...i };
    },
    setWorldPage(s, c) {
      i[s] = c;
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
      l && (clearTimeout(l), l = null);
    },
    setSaveTimer(s) {
      l = s;
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
const z = `
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
`;
function w(n, t) {
  const e = document.createElement(n);
  return e.className = t, e;
}
function U() {
  const n = "worldnotes-styles";
  if (document.getElementById(n)) return;
  const t = document.createElement("style");
  t.id = n, t.textContent = z, document.head.appendChild(t);
}
function q(n) {
  U(), n.innerHTML = "", n.className = "wn-root";
  const t = w("div", "wn-topbar"), e = w("div", "wn-breadcrumb"), o = w("div", "wn-editor-wrap"), r = w("div", "wn-editor"), i = w("div", "wn-placeholder");
  return i.textContent = "Start writing… use [[page name]] to link deeper", r.contentEditable = "true", r.spellcheck = !1, t.appendChild(e), o.appendChild(i), o.appendChild(r), n.appendChild(t), n.appendChild(o), { container: n, topbar: t, breadcrumb: e, editorWrap: o, editorDiv: r, placeholder: i };
}
function F(n) {
  const t = window.getSelection();
  if (!t || !t.rangeCount) return 0;
  const e = t.getRangeAt(0);
  return N(n, e.endContainer, e.endOffset).offset;
}
function j(n, t) {
  const e = V(n, t), o = document.createRange(), r = window.getSelection();
  r && (e ? (o.setStart(e.node, e.offset), o.collapse(!0)) : (o.selectNodeContents(n), o.collapse(!1)), r.removeAllRanges(), r.addRange(o));
}
const K = /* @__PURE__ */ new Set([
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
function X(n) {
  return n.nodeType === Node.ELEMENT_NODE && K.has(n.nodeName);
}
function E(n) {
  return N(n, null, 0).text;
}
function N(n, t, e) {
  let o = "", r = 0, i = t === null;
  function a(s) {
    i || (r += s.length), o += s;
  }
  function l(s) {
    if (s.nodeType === Node.TEXT_NODE) {
      const c = s.textContent ?? "";
      s === t && !i ? (r += Math.min(e, c.length), i = !0, o += c) : a(c);
    } else if (s.dataset?.raw !== void 0) {
      const c = s.dataset.raw ?? "";
      s === t && !i ? (r += e <= 0 ? 0 : c.length, i = !0) : G(s, t) && !i ? (T(s, t, e), r += Math.min(T(s, t, e), c.length), i = !0) : a(c);
    } else s.nodeName === "BR" ? a(`
`) : (X(s) && o && !o.endsWith(`
`) && a(`
`), d(s));
  }
  function d(s) {
    s.childNodes.forEach((c, p) => {
      s === t && p === e && !i && (i = !0), l(c);
    }), s === t && s.childNodes.length === e && !i && (i = !0);
  }
  return d(n), { text: o, offset: r };
}
function G(n, t) {
  if (!t) return !1;
  let e = t;
  for (; e; ) {
    if (e === n) return !0;
    e = e.parentNode;
  }
  return !1;
}
function T(n, t, e) {
  let o = 0, r = !1;
  function i(a) {
    if (!r) {
      if (a.nodeType === Node.TEXT_NODE) {
        const l = a.textContent ?? "";
        a === t ? (o += Math.min(e, l.length), r = !0) : o += l.length;
        return;
      }
      a.childNodes.forEach((l, d) => {
        a === t && d === e && !r && (r = !0), r || i(l);
      }), a === t && a.childNodes.length === e && !r && (r = !0);
    }
  }
  return i(n), o;
}
function V(n, t) {
  let e = t, o = null;
  function r(i) {
    if (o) return;
    if (i.nodeType === Node.TEXT_NODE) {
      const l = i.length;
      if (e <= l) {
        o = { node: i, offset: e };
        return;
      }
      e -= l;
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
    i.childNodes.forEach(r);
  }
  return r(n), o;
}
function v(n) {
  return { type: "text", raw: n, groups: [n] };
}
function Q(n, t) {
  const e = t.filter((r) => r.pattern.source.startsWith("^")), o = t.filter((r) => !r.pattern.source.startsWith("^"));
  for (const r of e) {
    const i = n.match(r.pattern);
    if (i)
      return [{ type: r.type, raw: i[0], groups: i.slice(1).map((a) => a ?? "") }];
  }
  return Y(n, o);
}
function Y(n, t) {
  const e = [];
  let o = n;
  for (; o.length > 0; ) {
    let r = null;
    for (const i of t) {
      const a = o.match(i.pattern);
      !a || a.index === void 0 || (r === null || a.index < r.index) && (r = { index: a.index, match: a, def: i });
    }
    if (!r) {
      e.push(v(o));
      break;
    }
    r.index > 0 && e.push(v(o.slice(0, r.index))), e.push({
      type: r.def.type,
      raw: r.match[0],
      groups: r.match.slice(1).map((i) => i ?? "")
    }), o = o.slice(r.index + r.match[0].length);
  }
  return e;
}
function J(n, t) {
  return n.split(`
`).map((e) => Q(e, t));
}
function Z(n, t, e, o = -1) {
  const r = document.createDocumentFragment(), i = te(t);
  let a = 0;
  for (const l of n) {
    if (l.type === "text") {
      r.appendChild(document.createTextNode(l.raw)), a += l.raw.length;
      continue;
    }
    const d = a, s = d + l.raw.length;
    if (a = s, o >= d && o <= s) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const c = i.get(l.type);
    if (!c) {
      r.appendChild(document.createTextNode(l.raw));
      continue;
    }
    const p = c.render(l, e);
    if (p instanceof HTMLElement && c.onNavigate) {
      const u = c.onNavigate.bind(c);
      p.addEventListener("mousedown", (f) => {
        u(l, e) && f.preventDefault();
      });
    }
    r.appendChild(p);
  }
  return r;
}
function ee(n, t, e, o = -1) {
  let r = 0;
  return n.map((i) => {
    const a = i.reduce((s, c) => s + c.raw.length, 0), l = o - r, d = Z(i, t, e, l);
    return r += a + 1, d;
  });
}
function te(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    for (const o of e.tokens)
      t.set(o.type, e);
  return t;
}
function ne(n, t, e, o = {}) {
  const { editorDiv: r, placeholder: i, breadcrumb: a } = n;
  function l() {
    const c = F(r), p = E(r), u = J(
      p,
      t.flatMap((g) => g.tokens)
    ), f = e.toContext(
      o.navigateFn ?? ((g) => {
      })
    ), h = ee(u, t, f, c);
    r.innerHTML = "", h.forEach((g, P) => {
      r.appendChild(g), P < h.length - 1 && r.appendChild(document.createTextNode(`
`));
    }), i.style.display = p.length ? "none" : "block";
    try {
      j(r, c);
    } catch {
    }
  }
  function d() {
    a.innerHTML = "";
    const c = e.getTrail();
    c.forEach((p, u) => {
      if (u > 0) {
        const h = document.createElement("span");
        h.className = "wn-crumb-sep", h.textContent = "/", a.appendChild(h);
      }
      const f = document.createElement("span");
      f.className = "wn-crumb" + (u === c.length - 1 ? " wn-crumb--active" : ""), f.textContent = b(p), u < c.length - 1 && f.addEventListener("click", () => {
        e.truncateTrail(u);
        const h = e.getTrail(), g = h[h.length - 1];
        o.onBreadcrumbNavigate?.(g);
      }), a.appendChild(f);
    }), o.onTrailChange?.(e.getTrail()), s();
  }
  function s() {
    const c = e.getTrail(), p = L(window.location.search, c);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${p}${window.location.hash}`
    );
  }
  return { render: l, renderBreadcrumb: d, syncUrlToTrail: s };
}
const C = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
function re(n, t, e, o) {
  let r = null;
  function i(d) {
    r = d;
  }
  async function a(d) {
    if (!n.world[d]) {
      const s = await t.get(d);
      s ? n.setWorldPage(d, s) : (n.setWorldPage(d, `# ${d}

`), await t.set(d, n.world[d]));
    }
    n.pushTrail(d), await l(d);
  }
  async function l(d) {
    if (n.setNavigating(!0), !n.world[d]) {
      const c = await t.get(d);
      !c && d === "home" ? (n.setWorldPage(d, C), await t.set(d, C)) : n.setWorldPage(d, c ?? `# ${d}

`);
    }
    const s = n.world[d];
    e.editorDiv.textContent = s, r && (r.render(), r.renderBreadcrumb());
    try {
      const c = document.createRange(), p = window.getSelection();
      p && (c.setStart(e.editorDiv, 0), c.collapse(!0), p.removeAllRanges(), p.addRange(c));
    } catch {
    }
    o.onPageLoad?.(d, s), n.setNavigating(!1), e.editorDiv.focus();
  }
  return { navigateToPage: a, loadPage: l, setRenderAPI: i };
}
function oe(n, t, e, o, r, i, a) {
  function l(s) {
    const c = window.getSelection();
    if (!c || !c.rangeCount) return;
    const p = c.getRangeAt(0);
    p.deleteContents();
    const u = document.createTextNode(s);
    p.insertNode(u), p.setStart(u, s.length), p.collapse(!0), c.removeAllRanges(), c.addRange(p), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  function d() {
    const s = a.saveDebounceMs ?? 600;
    n.editorDiv.addEventListener("input", () => {
      if (e.isNavigating()) return;
      o.render();
      const u = E(n.editorDiv), f = e.getTrail(), h = f[f.length - 1];
      e.setWorldPage(h, u), e.clearSaveTimer();
      const g = setTimeout(async () => {
        await i.set(h, u), a.onSave?.(h, u);
      }, s);
      e.setSaveTimer(g);
    }), n.editorDiv.addEventListener("paste", (u) => {
      u.preventDefault();
      const f = u.clipboardData?.getData("text/plain") ?? "";
      l(f);
    }), n.editorDiv.addEventListener("keydown", (u) => {
      u.key === "Tab" ? (u.preventDefault(), l("  ")) : u.key === "Enter" && (u.preventDefault(), l(`
`));
    });
    const c = e.getTrail(), p = c[c.length - 1];
    return r.loadPage(p), {
      destroy() {
        e.clearSaveTimer(), n.container.innerHTML = "";
      },
      navigate(u) {
        r.navigateToPage(u);
      },
      getCurrentPage() {
        const u = e.getTrail();
        return u[u.length - 1];
      },
      getTrail() {
        return e.getTrail();
      },
      getContent() {
        return E(n.editorDiv);
      },
      setContent(u) {
        const f = e.getTrail(), h = f[f.length - 1];
        e.setWorldPage(h, u), n.editorDiv.textContent = u, o.render();
      }
    };
  }
  return { mount: d };
}
class ie {
  constructor(t, e = {}) {
    this.plugins = [...W], this.storage = new S(), this.options = {}, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
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
    return ae(this.el, this.plugins, this.storage, this.options);
  }
}
function ce(n, t = {}) {
  return new ie(n, t);
}
function ae(n, t, e, o) {
  const r = $(e, o), i = q(n), a = re(r, e, i, o), l = {
    navigateFn: (s) => {
      a.navigateToPage(s);
    },
    onBreadcrumbNavigate: (s) => {
      a.loadPage(s);
    },
    onTrailChange: o.onTrailChange
  }, d = ne(i, t, r, l);
  return a.setRenderAPI(d), oe(i, t, r, d, a, e, o).mount();
}
const se = "worldnotes", m = "pages";
class le {
  constructor(t = se) {
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
        o.result.createObjectStore(m);
      }, o.onsuccess = () => t(o.result), o.onerror = () => e(o.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(t) {
    const e = await this.ensureOpen();
    return new Promise((o, r) => {
      const a = e.transaction(m, "readonly").objectStore(m).get(t);
      a.onsuccess = () => o(a.result ?? null), a.onerror = () => r(a.error);
    });
  }
  async set(t, e) {
    const o = await this.ensureOpen();
    return new Promise((r, i) => {
      const l = o.transaction(m, "readwrite").objectStore(m).put(e, t);
      l.onsuccess = () => r(), l.onerror = () => i(l.error);
    });
  }
  async keys() {
    const t = await this.ensureOpen();
    return new Promise((e, o) => {
      const i = t.transaction(m, "readonly").objectStore(m).getAllKeys();
      i.onsuccess = () => e(i.result), i.onerror = () => o(i.error);
    });
  }
}
export {
  ie as EditorBuilder,
  le as IndexedDBAdapter,
  S as LocalStorageAdapter,
  B as blockquotePlugin,
  O as boldPlugin,
  ce as createEditor,
  W as defaultPlugins,
  I as headingsPlugin,
  H as hrPlugin,
  M as inlineCodePlugin,
  _ as italicPlugin,
  A as wikiLinkPlugin
};

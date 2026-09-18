const Io = "worldnotes";
class Oo {
  constructor(t = Io) {
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
function dr(n) {
  const t = n.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function Xn(n) {
  const t = n.indexOf("|"), e = (t === -1 ? n : n.slice(0, t)).trim(), r = t === -1 ? dr(e) : n.slice(t + 1).trim();
  return { page: e, display: r || dr(e) };
}
function Lo(n, t) {
  const r = n.replace(/^\?/, "").split("&").filter(Boolean).filter((o) => {
    const [a = ""] = o.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) !== "path";
  }), s = t.map((o) => encodeURIComponent(o)).join("/");
  return `?${[...r, `path=${s}`].join("&")}`;
}
function Ro(n) {
  const e = n.replace(/^\?/, "").split("&").filter(Boolean).find((i) => {
    const [o = ""] = i.split("=", 1);
    return decodeURIComponent(o.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const r = e.indexOf("="), s = r === -1 ? "" : e.slice(r + 1);
  return s ? s.split("/").filter(Boolean).map((i) => decodeURIComponent(i)) : [];
}
function ps(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function No(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const zo = {
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
  render(n, t) {
    const { page: e, display: r } = Xn(n.groups[0] ?? ""), s = document.createElement("span");
    return s.className = "wn-wiki-link", s.dataset.page = e, s.dataset.raw = n.raw, s.textContent = r, s;
  },
  renderToHTML(n, t) {
    const { page: e, display: r } = Xn(n.groups[0] ?? "");
    return `<span class="wn-wiki-link" data-page="${ps(e)}" data-raw="${ps(n.raw)}">${No(r)}</span>`;
  },
  onNavigate(n, t) {
    const { page: e } = Xn(n.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function Mo(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function an(n, t, e, r) {
  const s = document.createElement("span");
  s.className = e;
  const i = document.createElement("span");
  i.className = "wn-punct", i.textContent = t;
  const o = document.createElement("span");
  o.className = `${e}-text`;
  const a = n.groups[0] ?? "";
  return r.renderInline ? o.appendChild(r.renderInline(a)) : o.textContent = a, s.appendChild(i), s.appendChild(o), s;
}
function cn(n, t, e, r) {
  const s = n.groups[0] ?? "", i = r.renderInline(s);
  return `<span class="${e}"><span class="wn-punct">${Mo(t)}</span><span class="${e}-text">${i}</span></span>`;
}
const Uo = {
  name: "headings",
  version: "1.0.0",
  kind: "content",
  tokens: [
    { type: "h1", pattern: /^# (.*)$/ },
    { type: "h2", pattern: /^## (.*)$/ },
    { type: "h3", pattern: /^### (.*)$/ }
  ],
  render(n, t) {
    switch (n.type) {
      case "h1":
        return an(n, "# ", "wn-h1", t);
      case "h2":
        return an(n, "## ", "wn-h2", t);
      case "h3":
        return an(n, "### ", "wn-h3", t);
      default:
        return an(n, "", "wn-h1", t);
    }
  },
  renderToHTML(n, t) {
    switch (n.type) {
      case "h1":
        return cn(n, "# ", "wn-h1", t);
      case "h2":
        return cn(n, "## ", "wn-h2", t);
      case "h3":
        return cn(n, "### ", "wn-h3", t);
      default:
        return cn(n, "", "wn-h1", t);
    }
  }
};
function fr(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ar(n, t, e) {
  const r = document.createElement("span");
  r.className = n;
  const s = (i) => {
    const o = document.createElement("span");
    return o.className = "wn-punct", o.textContent = i, o;
  };
  return r.appendChild(s(t)), r.appendChild(document.createTextNode(e)), r.appendChild(s(t)), r;
}
function Xs(n, t, e) {
  const r = fr(t), s = fr(e);
  return `<span class="${n}"><span class="wn-punct">${r}</span>${s}<span class="wn-punct">${r}</span></span>`;
}
const Po = {
  name: "bold",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(n, t) {
    return Ar("wn-bold", "**", n.groups[0] ?? "");
  },
  renderToHTML(n, t) {
    return Xs("wn-bold", "**", n.groups[0] ?? "");
  }
}, Bo = {
  name: "italic",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(n, t) {
    return Ar("wn-italic", "*", n.groups[0] ?? "");
  },
  renderToHTML(n, t) {
    return Xs("wn-italic", "*", n.groups[0] ?? "");
  }
}, Fo = {
  name: "inline-code",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "inline-code", pattern: /`([^`]+)`/ }],
  render(n, t) {
    const e = document.createElement("span");
    e.className = "wn-inline-code";
    const r = (i) => {
      const o = document.createElement("span");
      return o.className = "wn-punct", o.textContent = i, o;
    };
    e.appendChild(r("`"));
    const s = document.createElement("span");
    return s.className = "wn-code-text", s.textContent = n.groups[0] ?? "", e.appendChild(s), e.appendChild(r("`")), e;
  },
  renderToHTML(n, t) {
    return `<span class="wn-inline-code"><span class="wn-punct">\`</span><span class="wn-code-text">${fr(n.groups[0] ?? "")}</span><span class="wn-punct">\`</span></span>`;
  }
}, jo = {
  name: "blockquote",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "blockquote", pattern: /^(> )(.*)$/ }],
  render(n, t) {
    const e = document.createElement("span");
    e.className = "wn-blockquote";
    const r = document.createElement("span");
    r.className = "wn-punct", r.textContent = "> ";
    const s = document.createElement("span");
    s.className = "wn-blockquote-text";
    const i = n.groups[1] ?? "";
    return t.renderInline ? s.appendChild(t.renderInline(i)) : s.textContent = i, e.appendChild(r), e.appendChild(s), e;
  },
  renderToHTML(n, t) {
    const e = n.groups[1] ?? "";
    return `<span class="wn-blockquote"><span class="wn-punct">&gt; </span><span class="wn-blockquote-text">${t.renderInline(e)}</span></span>`;
  }
}, $o = {
  name: "hr",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(n, t) {
    const e = document.createElement("span");
    return e.className = "wn-hr", e.textContent = "---", e;
  },
  renderToHTML(n, t) {
    return '<span class="wn-hr">---</span>';
  }
};
function ln(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function gs(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const Ho = {
  name: "link",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "link", pattern: /\[([^\]]+)\]\(([^)]+)\)/ }],
  render(n, t) {
    const e = n.groups[0] ?? "", r = n.groups[1] ?? "";
    if (!r.includes("://") && !r.startsWith("//")) {
      const o = document.createElement("span");
      return o.className = "wn-wiki-link", o.dataset.page = r, o.dataset.raw = n.raw, o.textContent = e, o;
    }
    const i = document.createElement("a");
    return i.className = "wn-link", i.href = r, i.target = "_blank", i.rel = "noopener noreferrer", i.dataset.raw = n.raw, i.textContent = e, i;
  },
  renderToHTML(n, t) {
    const e = n.groups[0] ?? "", r = n.groups[1] ?? "";
    return !r.includes("://") && !r.startsWith("//") ? `<span class="wn-wiki-link" data-page="${ln(r)}" data-raw="${ln(n.raw)}">${gs(e)}</span>` : `<a class="wn-link" href="${ln(r)}" target="_blank" rel="noopener noreferrer" data-raw="${ln(n.raw)}">${gs(e)}</a>`;
  },
  onNavigate(n, t) {
    const e = n.groups[1] ?? "";
    return !e.includes("://") && !e.startsWith("//") ? (t.navigate(e), !0) : !1;
  }
};
function Wo(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Vo(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const Zo = {
  name: "strikethrough",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "strikethrough", pattern: /~~([^~]+)~~/ }],
  render(n, t) {
    const e = Ar("wn-strikethrough", "~~", n.groups[0] ?? "");
    return e.dataset.raw = n.raw, e;
  },
  renderToHTML(n, t) {
    const e = Vo(n.groups[0] ?? "");
    return `<span class="wn-strikethrough" data-raw="${Wo(n.raw)}"><span class="wn-punct">~~</span>${e}<span class="wn-punct">~~</span></span>`;
  }
}, Yo = /^(\s*)([-*+])\s(.*)$/;
function Ir(n) {
  const t = n.match(Yo);
  return t ? {
    indent: t[1] ?? "",
    marker: t[2] ?? "-",
    content: t[3] ?? ""
  } : null;
}
function qo(n) {
  return "  " + n;
}
function Go(n) {
  return n.startsWith("  ") ? n.slice(2) : null;
}
function Js(n) {
  if (n.nodeType === Node.TEXT_NODE)
    return n.length;
  if (n instanceof HTMLElement) {
    if (n.dataset.raw !== void 0)
      return n.dataset.raw.length;
    let t = 0;
    return n.childNodes.forEach((e) => {
      t += Js(e);
    }), t;
  }
  return 0;
}
function Fe(n) {
  return Js(n);
}
function ms(n, t) {
  let e = 0;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((s, i) => parseInt(s.dataset.line ?? "0", 10) - parseInt(i.dataset.line ?? "0", 10));
  for (const s of r) {
    if (parseInt(s.dataset.line ?? "0", 10) >= t) break;
    e += Fe(s) + 1;
  }
  return e;
}
function jt(n) {
  const t = window.getSelection();
  if (!t || !t.rangeCount) return 0;
  const e = t.getRangeAt(0), r = e.startContainer;
  let s = r;
  for (; s && !(s instanceof HTMLElement && s.dataset.line !== void 0); )
    s = s.parentNode;
  if (!s || !(s instanceof HTMLElement)) {
    let l = r.previousSibling;
    for (; l && !(l instanceof HTMLElement && l.dataset.line !== void 0); )
      l = l.previousSibling;
    if (l instanceof HTMLElement && l.dataset.line !== void 0) {
      const d = parseInt(l.dataset.line ?? "0", 10);
      return ms(n, d) + Fe(l) + 1;
    }
    return 0;
  }
  const i = parseInt(s.dataset.line ?? "0", 10), o = ms(n, i);
  let a = 0, c = !1;
  function h(l) {
    if (!c) {
      if (l.nodeType === Node.TEXT_NODE) {
        const d = l.length;
        if (l === r) {
          a += Math.min(e.startOffset, d), c = !0;
          return;
        }
        a += d;
        return;
      }
      if (l instanceof HTMLElement && l.dataset.raw !== void 0) {
        const d = l.dataset.raw.length;
        if (l === r || l.contains(r)) {
          let p = function(g) {
            if (!w) {
              if (g.nodeType === Node.TEXT_NODE) {
                const _ = g.length;
                if (g === r) {
                  u += Math.min(e.startOffset, _), w = !0;
                  return;
                }
                u += _;
                return;
              }
              g.childNodes.forEach(p);
            }
          }, u = 0, w = !1;
          l.childNodes.forEach(p), a += Math.min(u, d), c = !0;
          return;
        }
        a += d;
        return;
      }
      l.childNodes.forEach(h);
    }
  }
  return h(s), o + a;
}
function gn(n, t) {
  let e = t;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((i, o) => parseInt(i.dataset.line ?? "0", 10) - parseInt(o.dataset.line ?? "0", 10));
  for (const i of r) {
    const o = Fe(i);
    if (e <= o) {
      const a = Ko(i, e);
      if (a) {
        const c = window.getSelection();
        if (!c) return;
        const h = document.createRange();
        h.setStart(a.node, a.offset), h.collapse(!0), c.removeAllRanges(), c.addRange(h);
      } else {
        const c = window.getSelection();
        if (c) {
          const h = document.createRange();
          h.setStart(i, 0), h.collapse(!0), c.removeAllRanges(), c.addRange(h);
        }
      }
      return;
    }
    e -= o + 1;
  }
  const s = r[r.length - 1];
  if (s) {
    const i = window.getSelection();
    if (!i) return;
    const o = document.createRange(), a = Xo(s);
    a ? o.setStart(a, a.length) : o.selectNodeContents(s), o.collapse(!0), i.removeAllRanges(), i.addRange(o);
  }
}
function Ko(n, t) {
  let e = t;
  function r(s) {
    if (s.nodeType === Node.TEXT_NODE) {
      const i = s.length;
      return e <= i ? { node: s, offset: e } : (e -= i, null);
    }
    if (s instanceof HTMLElement && s.dataset.raw !== void 0) {
      const i = s.dataset.raw.length;
      if (e < i) {
        let o = function(a) {
          if (a.nodeType === Node.TEXT_NODE) {
            const c = a.length;
            return e < c ? { node: a, offset: e } : (e -= c, null);
          }
          for (const c of Array.from(a.childNodes)) {
            const h = o(c);
            if (h) return h;
          }
          return null;
        };
        return o(s);
      }
      return e -= i, null;
    }
    for (const i of Array.from(s.childNodes)) {
      const o = r(i);
      if (o) return o;
    }
    return null;
  }
  return r(n);
}
function Xo(n) {
  let t = null;
  function e(r) {
    if (r.nodeType === Node.TEXT_NODE) {
      t = r;
      return;
    }
    for (const s of Array.from(r.childNodes))
      e(s);
  }
  return e(n), t;
}
function Jn(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Jo(n, t) {
  const e = n.groups[0] ?? "", r = n.groups[1] ?? "-", s = n.groups[2] ?? "", i = document.createElement("span");
  if (i.className = "wn-list-item", i.dataset.raw = n.raw, e) {
    const c = document.createElement("span");
    c.className = "wn-list-item-indent", c.setAttribute("aria-hidden", "true"), c.textContent = e, i.appendChild(c);
  }
  const o = document.createElement("span");
  o.className = "wn-list-item-marker", o.setAttribute("aria-hidden", "true"), o.textContent = r + " ", i.appendChild(o);
  const a = document.createElement("span");
  return a.className = "wn-list-item-content", t.renderInline ? a.appendChild(t.renderInline(s)) : a.textContent = s, i.appendChild(a), i;
}
const Qo = {
  name: "list-item",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "list-item", pattern: /^(\s*)([-*+])\s(.*)$/ }],
  render(n, t) {
    return Jo(n, t);
  },
  renderToHTML(n, t) {
    const e = n.groups[0] ?? "", r = n.groups[1] ?? "-", s = n.groups[2] ?? "", i = t.renderInline(s);
    let o = `<span class="wn-list-item" data-raw="${Jn(n.raw)}">`;
    return e && (o += `<span class="wn-list-item-indent" aria-hidden="true">${Jn(e)}</span>`), o += `<span class="wn-list-item-marker" aria-hidden="true">${Jn(r)} </span>`, o += `<span class="wn-list-item-content">${i}</span>`, o += "</span>", o;
  },
  onKeydown(n, t) {
    if (n.key === "Tab" && !n.shiftKey)
      return ta(t);
    if (n.key === "Tab" && n.shiftKey)
      return ea(t);
    if (n.key === "Enter")
      return na(t);
  }
};
function ta(n) {
  const t = n.getDoc(), e = n.getCurrentPage(), s = t.getMap("pages").get(e);
  if (!s) return !1;
  const i = window.getSelection();
  if (!i || !i.rangeCount) return !1;
  let a = i.getRangeAt(0).startContainer;
  for (; a && !(a instanceof HTMLElement && a.dataset.line !== void 0); )
    a = a.parentNode;
  if (!a || !(a instanceof HTMLElement)) return !1;
  const c = parseInt(a.dataset.line ?? "0", 10), h = a.parentElement;
  if (!h) return !1;
  const l = jt(h), d = t.transact(() => {
    const p = s.toString(), u = p.split(`
`), w = u[c] ?? "";
    if (!Ir(w)) return null;
    const _ = qo(w);
    u[c] = _;
    const y = u.join(`
`);
    return s.delete(0, p.length), s.insert(0, y), l + 2;
  });
  return d === null ? !1 : { cursorOffset: d };
}
function ea(n) {
  const t = n.getDoc(), e = n.getCurrentPage(), s = t.getMap("pages").get(e);
  if (!s) return !1;
  const i = window.getSelection();
  if (!i || !i.rangeCount) return !1;
  let a = i.getRangeAt(0).startContainer;
  for (; a && !(a instanceof HTMLElement && a.dataset.line !== void 0); )
    a = a.parentNode;
  if (!a || !(a instanceof HTMLElement)) return !1;
  const c = parseInt(a.dataset.line ?? "0", 10), h = a.parentElement;
  if (!h) return !1;
  const l = jt(h), d = t.transact(() => {
    const p = s.toString(), u = p.split(`
`), w = u[c] ?? "";
    if (!Ir(w)) return null;
    const _ = Go(w);
    if (_ === null) return l;
    u[c] = _;
    const y = u.join(`
`);
    s.delete(0, p.length), s.insert(0, y);
    const k = pr(p, c);
    return Math.max(k, l - 2);
  });
  return d === null ? !1 : { cursorOffset: d };
}
function na(n) {
  const t = n.getDoc(), e = n.getCurrentPage(), s = t.getMap("pages").get(e);
  if (!s) return !1;
  const i = window.getSelection();
  if (!i || !i.rangeCount) return !1;
  let a = i.getRangeAt(0).startContainer;
  for (; a && !(a instanceof HTMLElement && a.dataset.line !== void 0); )
    a = a.parentNode;
  if (!a || !(a instanceof HTMLElement)) return !1;
  const c = parseInt(a.dataset.line ?? "0", 10), h = a.parentElement;
  if (!h) return !1;
  const l = jt(h), d = t.transact(() => {
    const p = s.toString(), u = p.split(`
`), w = u[c] ?? "", g = Ir(w);
    if (!g) return null;
    const _ = pr(p, c), y = l - _, k = Math.max(0, Math.min(y, w.length)), C = g.indent + g.marker + " ";
    if (g.content.trim() === "") {
      u.splice(c, 1, "");
      const S = u.join(`
`);
      return s.delete(0, p.length), s.insert(0, S), _;
    }
    const D = Math.max(0, k - C.length), P = g.content.slice(0, D), x = g.content.slice(D), O = C + P, T = C + x;
    u.splice(c, 1, O, T);
    const M = u.join(`
`);
    return s.delete(0, p.length), s.insert(0, M), pr(M, c + 1) + T.length;
  });
  return d === null ? !1 : { cursorOffset: d };
}
function pr(n, t) {
  if (t === 0) return 0;
  let e = 0, r = 0;
  for (; e < t; ) {
    if (r = n.indexOf(`
`, r), r === -1) return n.length;
    r++, e++;
  }
  return r;
}
const ra = [
  Uo,
  // line-level — must come before inline plugins
  $o,
  // line-level
  jo,
  // line-level
  Qo,
  // line-level
  zo,
  // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  Ho,
  // inline — [text](url) after [[...]]
  Po,
  // inline — ** before * to avoid partial match
  Bo,
  // inline
  Zo,
  // inline — ~~text~~ (no conflict with * patterns)
  Fo
  // inline
], sa = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
class ia {
  constructor() {
    this.contentPlugins = /* @__PURE__ */ new Map(), this.uiPlugins = /* @__PURE__ */ new Map(), this.storagePlugins = /* @__PURE__ */ new Map(), this.tokenTypeOwners = /* @__PURE__ */ new Map(), this.slotAssignments = /* @__PURE__ */ new Map();
  }
  // ── Validation ──────────────────────────────────────────────────────────────
  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  validateVersion(t, e) {
    if (!sa.test(e))
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
    const r = this.uiPlugins.get(t);
    if (r) {
      r.onDestroy?.();
      const i = r.priority ?? 0;
      for (const o of r.slots) {
        const a = this.slotAssignments.get(o);
        a && (a.delete(i), a.size === 0 && this.slotAssignments.delete(o));
      }
      this.uiPlugins.delete(t);
      return;
    }
    const s = this.storagePlugins.get(t);
    s && (s.onDestroy?.(), this.storagePlugins.delete(t));
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
      const r = this.tokenTypeOwners.get(e.type);
      if (r !== void 0 && r !== t.name)
        throw new Error(
          `Plugin conflict: "${t.name}" declares token type "${e.type}", but "${r}" already owns it. Each token type may only be registered by one content plugin.`
        );
    }
    for (const e of t.tokens)
      this.tokenTypeOwners.set(e.type, t.name);
    this.contentPlugins.set(t.name, t);
  }
  /** Register a UI plugin with slot+priority conflict detection. */
  registerUI(t) {
    const e = t.priority ?? 0;
    for (const r of t.slots) {
      const s = this.slotAssignments.get(r);
      if (s) {
        const i = s.get(e);
        if (i !== void 0 && i !== t.name)
          throw new Error(
            `UI plugin conflict: "${t.name}" claims slot "${r}" with priority ${e}, but "${i}" already claims it with the same priority. Change one plugin's priority to resolve.`
          );
      }
    }
    for (const r of t.slots) {
      let s = this.slotAssignments.get(r);
      s || (s = /* @__PURE__ */ new Map(), this.slotAssignments.set(r, s)), s.set(e, t.name);
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
  /**
   * Return UI plugins registered for the given slot, sorted by priority ascending.
   * Lower priority numbers mean the plugin renders first (closer to the top of the slot).
   *
   * @param slot - Slot name (e.g., 'wn-toolbar')
   * @returns UIPlugin[] sorted by priority (lowest first), empty array if no plugins for slot
   */
  getUIPluginsForSlot(t) {
    const e = this.slotAssignments.get(t);
    return e ? Array.from(e.keys()).sort((s, i) => s - i).map((s) => {
      const i = e.get(s);
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
const Dt = () => /* @__PURE__ */ new Map(), gr = (n) => {
  const t = Dt();
  return n.forEach((e, r) => {
    t.set(r, e);
  }), t;
}, Vt = (n, t, e) => {
  let r = n.get(t);
  return r === void 0 && n.set(t, r = e()), r;
}, oa = (n, t) => {
  const e = [];
  for (const [r, s] of n)
    e.push(t(s, r));
  return e;
}, aa = (n, t) => {
  for (const [e, r] of n)
    if (t(r, e))
      return !0;
  return !1;
}, ee = () => /* @__PURE__ */ new Set(), Qn = (n) => n[n.length - 1], ca = (n, t) => {
  for (let e = 0; e < t.length; e++)
    n.push(t[e]);
}, Gt = Array.from, Or = (n, t) => {
  for (let e = 0; e < n.length; e++)
    if (!t(n[e], e, n))
      return !1;
  return !0;
}, Lr = (n, t) => {
  for (let e = 0; e < n.length; e++)
    if (t(n[e], e, n))
      return !0;
  return !1;
}, la = (n, t) => {
  const e = new Array(n);
  for (let r = 0; r < n; r++)
    e[r] = t(r, e);
  return e;
}, xe = Array.isArray;
class Rr {
  constructor() {
    this._observers = Dt();
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  on(t, e) {
    return Vt(
      this._observers,
      /** @type {string} */
      t,
      ee
    ).add(e), e;
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  once(t, e) {
    const r = (...s) => {
      this.off(
        t,
        /** @type {any} */
        r
      ), e(...s);
    };
    this.on(
      t,
      /** @type {any} */
      r
    );
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  off(t, e) {
    const r = this._observers.get(t);
    r !== void 0 && (r.delete(e), r.size === 0 && this._observers.delete(t));
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name The event name.
   * @param {Parameters<EVENTS[NAME]>} args The arguments that are applied to the event listener.
   */
  emit(t, e) {
    return Gt((this._observers.get(t) || Dt()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = Dt();
  }
}
class ua {
  constructor() {
    this._observers = Dt();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(t, e) {
    Vt(this._observers, t, ee).add(e);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  once(t, e) {
    const r = (...s) => {
      this.off(t, r), e(...s);
    };
    this.on(t, r);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  off(t, e) {
    const r = this._observers.get(t);
    r !== void 0 && (r.delete(e), r.size === 0 && this._observers.delete(t));
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit(t, e) {
    return Gt((this._observers.get(t) || Dt()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = Dt();
  }
}
const Ut = Math.floor, mn = Math.abs, Nr = (n, t) => n < t ? n : t, fe = (n, t) => n > t ? n : t, ha = Math.pow, Qs = (n) => n !== 0 ? n < 0 : 1 / n < 0, ws = 1, ys = 2, tr = 4, er = 8, je = 32, qt = 64, At = 128, zn = 31, mr = 63, ae = 127, da = 2147483647, kn = Number.MAX_SAFE_INTEGER, _s = Number.MIN_SAFE_INTEGER, fa = Number.isInteger || ((n) => typeof n == "number" && isFinite(n) && Ut(n) === n), ti = String.fromCharCode, pa = (n) => n.toLowerCase(), ga = /^\s*/g, ma = (n) => n.replace(ga, ""), wa = /([A-Z])/g, bs = (n, t) => ma(n.replace(wa, (e) => `${t}${pa(e)}`)), ya = (n) => {
  const t = unescape(encodeURIComponent(n)), e = t.length, r = new Uint8Array(e);
  for (let s = 0; s < e; s++)
    r[s] = /** @type {number} */
    t.codePointAt(s);
  return r;
}, $e = (
  /** @type {TextEncoder} */
  typeof TextEncoder < "u" ? new TextEncoder() : null
), _a = (n) => $e.encode(n), ba = $e ? _a : ya;
let Pe = typeof TextDecoder > "u" ? null : new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 });
Pe && Pe.decode(new Uint8Array()).length === 1 && (Pe = null);
const ka = (n, t) => la(t, () => n).join("");
class Xe {
  constructor() {
    this.cpos = 0, this.cbuf = new Uint8Array(100), this.bufs = [];
  }
}
const xt = () => new Xe(), zr = (n) => {
  let t = n.cpos;
  for (let e = 0; e < n.bufs.length; e++)
    t += n.bufs[e].length;
  return t;
}, ut = (n) => {
  const t = new Uint8Array(zr(n));
  let e = 0;
  for (let r = 0; r < n.bufs.length; r++) {
    const s = n.bufs[r];
    t.set(s, e), e += s.length;
  }
  return t.set(new Uint8Array(n.cbuf.buffer, 0, n.cpos), e), t;
}, va = (n, t) => {
  const e = n.cbuf.length;
  e - n.cpos < t && (n.bufs.push(new Uint8Array(n.cbuf.buffer, 0, n.cpos)), n.cbuf = new Uint8Array(fe(e, t) * 2), n.cpos = 0);
}, _t = (n, t) => {
  const e = n.cbuf.length;
  n.cpos === e && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(e * 2), n.cpos = 0), n.cbuf[n.cpos++] = t;
}, wr = _t, K = (n, t) => {
  for (; t > ae; )
    _t(n, At | ae & t), t = Ut(t / 128);
  _t(n, ae & t);
}, Mr = (n, t) => {
  const e = Qs(t);
  for (e && (t = -t), _t(n, (t > mr ? At : 0) | (e ? qt : 0) | mr & t), t = Ut(t / 64); t > 0; )
    _t(n, (t > ae ? At : 0) | ae & t), t = Ut(t / 128);
}, yr = new Uint8Array(3e4), Sa = yr.length / 3, xa = (n, t) => {
  if (t.length < Sa) {
    const e = $e.encodeInto(t, yr).written || 0;
    K(n, e);
    for (let r = 0; r < e; r++)
      _t(n, yr[r]);
  } else
    pt(n, ba(t));
}, Ca = (n, t) => {
  const e = unescape(encodeURIComponent(t)), r = e.length;
  K(n, r);
  for (let s = 0; s < r; s++)
    _t(
      n,
      /** @type {number} */
      e.codePointAt(s)
    );
}, ce = $e && /** @type {any} */
$e.encodeInto ? xa : Ca, Mn = (n, t) => {
  const e = n.cbuf.length, r = n.cpos, s = Nr(e - r, t.length), i = t.length - s;
  n.cbuf.set(t.subarray(0, s), r), n.cpos += s, i > 0 && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(fe(e * 2, i)), n.cbuf.set(t.subarray(s)), n.cpos = i);
}, pt = (n, t) => {
  K(n, t.byteLength), Mn(n, t);
}, Ur = (n, t) => {
  va(n, t);
  const e = new DataView(n.cbuf.buffer, n.cpos, t);
  return n.cpos += t, e;
}, Ea = (n, t) => Ur(n, 4).setFloat32(0, t, !1), Ta = (n, t) => Ur(n, 8).setFloat64(0, t, !1), Da = (n, t) => (
  /** @type {any} */
  Ur(n, 8).setBigInt64(0, t, !1)
), ks = new DataView(new ArrayBuffer(4)), Aa = (n) => (ks.setFloat32(0, n), ks.getFloat32(0) === n), He = (n, t) => {
  switch (typeof t) {
    case "string":
      _t(n, 119), ce(n, t);
      break;
    case "number":
      fa(t) && mn(t) <= da ? (_t(n, 125), Mr(n, t)) : Aa(t) ? (_t(n, 124), Ea(n, t)) : (_t(n, 123), Ta(n, t));
      break;
    case "bigint":
      _t(n, 122), Da(n, t);
      break;
    case "object":
      if (t === null)
        _t(n, 126);
      else if (xe(t)) {
        _t(n, 117), K(n, t.length);
        for (let e = 0; e < t.length; e++)
          He(n, t[e]);
      } else if (t instanceof Uint8Array)
        _t(n, 116), pt(n, t);
      else {
        _t(n, 118);
        const e = Object.keys(t);
        K(n, e.length);
        for (let r = 0; r < e.length; r++) {
          const s = e[r];
          ce(n, s), He(n, t[s]);
        }
      }
      break;
    case "boolean":
      _t(n, t ? 120 : 121);
      break;
    default:
      _t(n, 127);
  }
};
class vs extends Xe {
  /**
   * @param {function(Encoder, T):void} writer
   */
  constructor(t) {
    super(), this.w = t, this.s = null, this.count = 0;
  }
  /**
   * @param {T} v
   */
  write(t) {
    this.s === t ? this.count++ : (this.count > 0 && K(this, this.count - 1), this.count = 1, this.w(this, t), this.s = t);
  }
}
const Ss = (n) => {
  n.count > 0 && (Mr(n.encoder, n.count === 1 ? n.s : -n.s), n.count > 1 && K(n.encoder, n.count - 2));
};
class wn {
  constructor() {
    this.encoder = new Xe(), this.s = 0, this.count = 0;
  }
  /**
   * @param {number} v
   */
  write(t) {
    this.s === t ? this.count++ : (Ss(this), this.count = 1, this.s = t);
  }
  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array() {
    return Ss(this), ut(this.encoder);
  }
}
const xs = (n) => {
  if (n.count > 0) {
    const t = n.diff * 2 + (n.count === 1 ? 0 : 1);
    Mr(n.encoder, t), n.count > 1 && K(n.encoder, n.count - 2);
  }
};
class nr {
  constructor() {
    this.encoder = new Xe(), this.s = 0, this.count = 0, this.diff = 0;
  }
  /**
   * @param {number} v
   */
  write(t) {
    this.diff === t - this.s ? (this.s = t, this.count++) : (xs(this), this.count = 1, this.diff = t - this.s, this.s = t);
  }
  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array() {
    return xs(this), ut(this.encoder);
  }
}
class Ia {
  constructor() {
    this.sarr = [], this.s = "", this.lensE = new wn();
  }
  /**
   * @param {string} string
   */
  write(t) {
    this.s += t, this.s.length > 19 && (this.sarr.push(this.s), this.s = ""), this.lensE.write(t.length);
  }
  toUint8Array() {
    const t = new Xe();
    return this.sarr.push(this.s), this.s = "", ce(t, this.sarr.join("")), Mn(t, this.lensE.toUint8Array()), ut(t);
  }
}
const $t = (n) => new Error(n), Mt = () => {
  throw $t("Method unimplemented");
}, Nt = () => {
  throw $t("Unexpected case");
}, ei = $t("Unexpected end of array"), ni = $t("Integer out of Range");
class Un {
  /**
   * @param {Uint8Array<Buf>} uint8Array Binary data to decode
   */
  constructor(t) {
    this.arr = t, this.pos = 0;
  }
}
const se = (n) => new Un(n), Oa = (n) => n.pos !== n.arr.length, La = (n, t) => {
  const e = new Uint8Array(n.arr.buffer, n.pos + n.arr.byteOffset, t);
  return n.pos += t, e;
}, St = (n) => La(n, tt(n)), Ce = (n) => n.arr[n.pos++], tt = (n) => {
  let t = 0, e = 1;
  const r = n.arr.length;
  for (; n.pos < r; ) {
    const s = n.arr[n.pos++];
    if (t = t + (s & ae) * e, e *= 128, s < At)
      return t;
    if (t > kn)
      throw ni;
  }
  throw ei;
}, Pr = (n) => {
  let t = n.arr[n.pos++], e = t & mr, r = 64;
  const s = (t & qt) > 0 ? -1 : 1;
  if ((t & At) === 0)
    return s * e;
  const i = n.arr.length;
  for (; n.pos < i; ) {
    if (t = n.arr[n.pos++], e = e + (t & ae) * r, r *= 128, t < At)
      return s * e;
    if (e > kn)
      throw ni;
  }
  throw ei;
}, Ra = (n) => {
  let t = tt(n);
  if (t === 0)
    return "";
  {
    let e = String.fromCodePoint(Ce(n));
    if (--t < 100)
      for (; t--; )
        e += String.fromCodePoint(Ce(n));
    else
      for (; t > 0; ) {
        const r = t < 1e4 ? t : 1e4, s = n.arr.subarray(n.pos, n.pos + r);
        n.pos += r, e += String.fromCodePoint.apply(
          null,
          /** @type {any} */
          s
        ), t -= r;
      }
    return decodeURIComponent(escape(e));
  }
}, Na = (n) => (
  /** @type any */
  Pe.decode(St(n))
), te = Pe ? Na : Ra, Br = (n, t) => {
  const e = new DataView(n.arr.buffer, n.arr.byteOffset + n.pos, t);
  return n.pos += t, e;
}, za = (n) => Br(n, 4).getFloat32(0, !1), Ma = (n) => Br(n, 8).getFloat64(0, !1), Ua = (n) => (
  /** @type {any} */
  Br(n, 8).getBigInt64(0, !1)
), Pa = [
  (n) => {
  },
  // CASE 127: undefined
  (n) => null,
  // CASE 126: null
  Pr,
  // CASE 125: integer
  za,
  // CASE 124: float32
  Ma,
  // CASE 123: float64
  Ua,
  // CASE 122: bigint
  (n) => !1,
  // CASE 121: boolean (false)
  (n) => !0,
  // CASE 120: boolean (true)
  te,
  // CASE 119: string
  (n) => {
    const t = tt(n), e = {};
    for (let r = 0; r < t; r++) {
      const s = te(n);
      e[s] = We(n);
    }
    return e;
  },
  (n) => {
    const t = tt(n), e = [];
    for (let r = 0; r < t; r++)
      e.push(We(n));
    return e;
  },
  St
  // CASE 116: Uint8Array
], We = (n) => Pa[127 - Ce(n)](n);
class Cs extends Un {
  /**
   * @param {Uint8Array} uint8Array
   * @param {function(Decoder):T} reader
   */
  constructor(t, e) {
    super(t), this.reader = e, this.s = null, this.count = 0;
  }
  read() {
    return this.count === 0 && (this.s = this.reader(this), Oa(this) ? this.count = tt(this) + 1 : this.count = -1), this.count--, /** @type {T} */
    this.s;
  }
}
class yn extends Un {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    super(t), this.s = 0, this.count = 0;
  }
  read() {
    if (this.count === 0) {
      this.s = Pr(this);
      const t = Qs(this.s);
      this.count = 1, t && (this.s = -this.s, this.count = tt(this) + 2);
    }
    return this.count--, /** @type {number} */
    this.s;
  }
}
class rr extends Un {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    super(t), this.s = 0, this.count = 0, this.diff = 0;
  }
  /**
   * @return {number}
   */
  read() {
    if (this.count === 0) {
      const t = Pr(this), e = t & 1;
      this.diff = Ut(t / 2), this.count = 1, e && (this.count = tt(this) + 2);
    }
    return this.s += this.diff, this.count--, this.s;
  }
}
class Ba {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    this.decoder = new yn(t), this.str = te(this.decoder), this.spos = 0;
  }
  /**
   * @return {string}
   */
  read() {
    const t = this.spos + this.decoder.read(), e = this.str.slice(this.spos, t);
    return this.spos = t, e;
  }
}
const Fa = crypto.getRandomValues.bind(crypto), ri = () => Fa(new Uint32Array(1))[0], ja = "10000000-1000-4000-8000" + -1e11, $a = () => ja.replace(
  /[018]/g,
  /** @param {number} c */
  (n) => (n ^ ri() & 15 >> n / 4).toString(16)
), ne = Date.now, Es = (n) => (
  /** @type {Promise<T>} */
  new Promise(n)
);
Promise.all.bind(Promise);
const Ts = (n) => n === void 0 ? null : n;
class Ha {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  /**
   * @param {string} key
   * @param {any} newValue
   */
  setItem(t, e) {
    this.map.set(t, e);
  }
  /**
   * @param {string} key
   */
  getItem(t) {
    return this.map.get(t);
  }
}
let si = new Ha(), Fr = !0;
try {
  typeof localStorage < "u" && localStorage && (si = localStorage, Fr = !1);
} catch {
}
const ii = si, Wa = (n) => Fr || addEventListener(
  "storage",
  /** @type {any} */
  n
), Va = (n) => Fr || removeEventListener(
  "storage",
  /** @type {any} */
  n
), Ve = /* @__PURE__ */ Symbol("Equality"), oi = (n, t) => n === t || !!n?.[Ve]?.(t) || !1, Za = (n) => typeof n == "object", Ya = Object.assign, qa = Object.keys, Ga = (n, t) => {
  for (const e in n)
    t(n[e], e);
}, Ka = (n, t) => {
  const e = [];
  for (const r in n)
    e.push(t(n[r], r));
  return e;
}, vn = (n) => qa(n).length, Xa = (n) => {
  for (const t in n)
    return !1;
  return !0;
}, Je = (n, t) => {
  for (const e in n)
    if (!t(n[e], e))
      return !1;
  return !0;
}, jr = (n, t) => Object.prototype.hasOwnProperty.call(n, t), Ja = (n, t) => n === t || vn(n) === vn(t) && Je(n, (e, r) => (e !== void 0 || jr(t, r)) && oi(t[r], e)), Qa = Object.freeze, ai = (n) => {
  for (const t in n) {
    const e = n[t];
    (typeof e == "object" || typeof e == "function") && ai(n[t]);
  }
  return Qa(n);
}, $r = (n, t, e = 0) => {
  try {
    for (; e < n.length; e++)
      n[e](...t);
  } finally {
    e < n.length && $r(n, t, e + 1);
  }
}, tc = (n) => n, _e = (n, t) => {
  if (n === t)
    return !0;
  if (n == null || t == null || n.constructor !== t.constructor && (n.constructor || Object) !== (t.constructor || Object))
    return !1;
  if (n[Ve] != null)
    return n[Ve](t);
  switch (n.constructor) {
    case ArrayBuffer:
      n = new Uint8Array(n), t = new Uint8Array(t);
    // eslint-disable-next-line no-fallthrough
    case Uint8Array: {
      if (n.byteLength !== t.byteLength)
        return !1;
      for (let e = 0; e < n.length; e++)
        if (n[e] !== t[e])
          return !1;
      break;
    }
    case Set: {
      if (n.size !== t.size)
        return !1;
      for (const e of n)
        if (!t.has(e))
          return !1;
      break;
    }
    case Map: {
      if (n.size !== t.size)
        return !1;
      for (const e of n.keys())
        if (!t.has(e) || !_e(n.get(e), t.get(e)))
          return !1;
      break;
    }
    case void 0:
    case Object:
      if (vn(n) !== vn(t))
        return !1;
      for (const e in n)
        if (!jr(n, e) || !_e(n[e], t[e]))
          return !1;
      break;
    case Array:
      if (n.length !== t.length)
        return !1;
      for (let e = 0; e < n.length; e++)
        if (!_e(n[e], t[e]))
          return !1;
      break;
    default:
      return !1;
  }
  return !0;
}, ec = (n, t) => t.includes(n), re = typeof process < "u" && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process < "u" ? process : 0) === "[object process]", ci = typeof window < "u" && typeof document < "u" && !re;
let Ft;
const nc = () => {
  if (Ft === void 0)
    if (re) {
      Ft = Dt();
      const n = process.argv;
      let t = null;
      for (let e = 0; e < n.length; e++) {
        const r = n[e];
        r[0] === "-" ? (t !== null && Ft.set(t, ""), t = r) : t !== null && (Ft.set(t, r), t = null);
      }
      t !== null && Ft.set(t, "");
    } else typeof location == "object" ? (Ft = Dt(), (location.search || "?").slice(1).split("&").forEach((n) => {
      if (n.length !== 0) {
        const [t, e] = n.split("=");
        Ft.set(`--${bs(t, "-")}`, e), Ft.set(`-${bs(t, "-")}`, e);
      }
    })) : Ft = Dt();
  return Ft;
}, _r = (n) => nc().has(n), Sn = (n) => Ts(re ? process.env[n.toUpperCase().replaceAll("-", "_")] : ii.getItem(n)), li = (n) => _r("--" + n) || Sn(n) !== null, rc = li("production"), sc = re && ec(process.env.FORCE_COLOR, ["true", "1", "2"]), ic = sc || !_r("--no-colors") && // @todo deprecate --no-colors
!li("no-color") && (!re || process.stdout.isTTY) && (!re || _r("--color") || Sn("COLORTERM") !== null || (Sn("TERM") || "").includes("color")), ui = (n) => new Uint8Array(n), oc = (n, t, e) => new Uint8Array(n, t, e), ac = (n) => new Uint8Array(n), cc = (n) => {
  let t = "";
  for (let e = 0; e < n.byteLength; e++)
    t += ti(n[e]);
  return btoa(t);
}, lc = (n) => Buffer.from(n.buffer, n.byteOffset, n.byteLength).toString("base64"), uc = (n) => {
  const t = atob(n), e = ui(t.length);
  for (let r = 0; r < t.length; r++)
    e[r] = t.charCodeAt(r);
  return e;
}, hc = (n) => {
  const t = Buffer.from(n, "base64");
  return oc(t.buffer, t.byteOffset, t.byteLength);
}, dc = ci ? cc : lc, fc = ci ? uc : hc, pc = (n) => {
  const t = ui(n.byteLength);
  return t.set(n), t;
};
class gc {
  /**
   * @param {L} left
   * @param {R} right
   */
  constructor(t, e) {
    this.left = t, this.right = e;
  }
}
const Yt = (n, t) => new gc(n, t), Ds = (n) => n.next() >= 0.5, sr = (n, t, e) => Ut(n.next() * (e + 1 - t) + t), hi = (n, t, e) => Ut(n.next() * (e + 1 - t) + t), Hr = (n, t, e) => hi(n, t, e), mc = (n) => ti(Hr(n, 97, 122)), wc = (n, t = 0, e = 20) => {
  const r = Hr(n, t, e);
  let s = "";
  for (let i = 0; i < r; i++)
    s += mc(n);
  return s;
}, ir = (n, t) => t[Hr(n, 0, t.length - 1)], yc = /* @__PURE__ */ Symbol("0schema");
class _c {
  constructor() {
    this._rerrs = [];
  }
  /**
   * @param {string?} path
   * @param {string} expected
   * @param {string} has
   * @param {string?} message
   */
  extend(t, e, r, s = null) {
    this._rerrs.push({ path: t, expected: e, has: r, message: s });
  }
  toString() {
    const t = [];
    for (let e = this._rerrs.length - 1; e > 0; e--) {
      const r = this._rerrs[e];
      t.push(ka(" ", (this._rerrs.length - e) * 2) + `${r.path != null ? `[${r.path}] ` : ""}${r.has} doesn't match ${r.expected}. ${r.message}`);
    }
    return t.join(`
`);
  }
}
const br = (n, t) => n === t ? !0 : n == null || t == null || n.constructor !== t.constructor ? !1 : n[Ve] ? oi(n, t) : xe(n) ? Or(
  n,
  (e) => Lr(t, (r) => br(e, r))
) : Za(n) ? Je(
  n,
  (e, r) => br(e, t[r])
) : !1;
class Et {
  // this.shape must not be defined on Schema. Otherwise typecheck on metatypes (e.g. $$object) won't work as expected anymore
  /**
   * If true, the more things are added to the shape the more objects this schema will accept (e.g.
   * union). By default, the more objects are added, the the fewer objects this schema will accept.
   * @protected
   */
  static _dilutes = !1;
  /**
   * @param {Schema<any>} other
   */
  extends(t) {
    let [e, r] = [
      /** @type {any} */
      this.shape,
      /** @type {any} */
      t.shape
    ];
    return (
      /** @type {typeof Schema<any>} */
      this.constructor._dilutes && ([r, e] = [e, r]), br(e, r)
    );
  }
  /**
   * Overwrite this when necessary. By default, we only check the `shape` property which every shape
   * should have.
   * @param {Schema<any>} other
   */
  equals(t) {
    return this.constructor === t.constructor && _e(this.shape, t.shape);
  }
  [yc]() {
    return !0;
  }
  /**
   * @param {object} other
   */
  [Ve](t) {
    return this.equals(
      /** @type {any} */
      t
    );
  }
  /**
   * Use `schema.validate(obj)` with a typed parameter that is already of typed to be an instance of
   * Schema. Validate will check the structure of the parameter and return true iff the instance
   * really is an instance of Schema.
   *
   * @param {T} o
   * @return {boolean}
   */
  validate(t) {
    return this.check(t);
  }
  /* c8 ignore start */
  /**
   * Similar to validate, but this method accepts untyped parameters.
   *
   * @param {any} _o
   * @param {ValidationError} [_err]
   * @return {_o is T}
   */
  check(t, e) {
    Mt();
  }
  /* c8 ignore stop */
  /**
   * @type {Schema<T?>}
   */
  get nullable() {
    return Oe(this, $n);
  }
  /**
   * @type {$Optional<Schema<T>>}
   */
  get optional() {
    return new pi(
      /** @type {Schema<T>} */
      this
    );
  }
  /**
   * Cast a variable to a specific type. Returns the casted value, or throws an exception otherwise.
   * Use this if you know that the type is of a specific type and you just want to convince the type
   * system.
   *
   * **Do not rely on these error messages!**
   * Performs an assertion check only if not in a production environment.
   *
   * @template OO
   * @param {OO} o
   * @return {Extract<OO, T> extends never ? T : (OO extends Array<never> ? T : Extract<OO,T>)}
   */
  cast(t) {
    return As(t, this), /** @type {any} */
    t;
  }
  /**
   * EXPECTO PATRONUM!! 🪄
   * This function protects against type errors. Though it may not work in the real world.
   *
   * "After all this time?"
   * "Always." - Snape, talking about type safety
   *
   * Ensures that a variable is a a specific type. Returns the value, or throws an exception if the assertion check failed.
   * Use this if you know that the type is of a specific type and you just want to convince the type
   * system.
   *
   * Can be useful when defining lambdas: `s.lambda(s.$number, s.$void).expect((n) => n + 1)`
   *
   * **Do not rely on these error messages!**
   * Performs an assertion check if not in a production environment.
   *
   * @param {T} o
   * @return {o extends T ? T : never}
   */
  expect(t) {
    return As(t, this), t;
  }
}
class Wr extends Et {
  /**
   * @param {C} c
   * @param {((o:Instance<C>)=>boolean)|null} check
   */
  constructor(t, e) {
    super(), this.shape = t, this._c = e;
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is C extends ((...args:any[]) => infer T) ? T : (C extends (new (...args:any[]) => any) ? InstanceType<C> : never)} o
   */
  check(t, e = void 0) {
    const r = t?.constructor === this.shape && (this._c == null || this._c(t));
    return !r && e?.extend(null, this.shape.name, t?.constructor.name, t?.constructor !== this.shape ? "Constructor match failed" : "Check failed"), r;
  }
}
const gt = (n, t = null) => new Wr(n, t);
gt(Wr);
class Vr extends Et {
  /**
   * @param {(o:any) => boolean} check
   */
  constructor(t) {
    super(), this.shape = t;
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is any}
   */
  check(t, e) {
    const r = this.shape(t);
    return !r && e?.extend(null, "custom prop", t?.constructor.name, "failed to check custom prop"), r;
  }
}
const kt = (n) => new Vr(n);
gt(Vr);
class Pn extends Et {
  /**
   * @param {Array<T>} literals
   */
  constructor(t) {
    super(), this.shape = t;
  }
  /**
   *
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is T}
   */
  check(t, e) {
    const r = this.shape.some((s) => s === t);
    return !r && e?.extend(null, this.shape.join(" | "), t.toString()), r;
  }
}
const Bn = (...n) => new Pn(n), di = gt(Pn), bc = (
  /** @type {any} */
  RegExp.escape || /** @type {(str:string) => string} */
  ((n) => n.replace(/[().|&,$^[\]]/g, (t) => "\\" + t))
), fi = (n) => {
  if (Ee.check(n))
    return [bc(n)];
  if (di.check(n))
    return (
      /** @type {Array<string|number>} */
      n.shape.map((t) => t + "")
    );
  if (Si.check(n))
    return ["[+-]?\\d+.?\\d*"];
  if (xi.check(n))
    return [".*"];
  if (xn.check(n))
    return n.shape.map(fi).flat(1);
  Nt();
};
class kc extends Et {
  /**
   * @param {T} shape
   */
  constructor(t) {
    super(), this.shape = t, this._r = new RegExp("^" + t.map(fi).map((e) => `(${e.join("|")})`).join("") + "$");
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is CastStringTemplateArgsToTemplate<T>}
   */
  check(t, e) {
    const r = this._r.exec(t) != null;
    return !r && e?.extend(null, this._r.toString(), t.toString(), "String doesn't match string template."), r;
  }
}
gt(kc);
const vc = /* @__PURE__ */ Symbol("optional");
class pi extends Et {
  /**
   * @param {S} shape
   */
  constructor(t) {
    super(), this.shape = t;
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is (Unwrap<S>|undefined)}
   */
  check(t, e) {
    const r = t === void 0 || this.shape.check(t);
    return !r && e?.extend(null, "undefined (optional)", "()"), r;
  }
  get [vc]() {
    return !0;
  }
}
const Sc = gt(pi);
class xc extends Et {
  /**
   * @param {any} _o
   * @param {ValidationError} [err]
   * @return {_o is never}
   */
  check(t, e) {
    return e?.extend(null, "never", typeof t), !1;
  }
}
gt(xc);
class Fn extends Et {
  /**
   * @param {S} shape
   * @param {boolean} partial
   */
  constructor(t, e = !1) {
    super(), this.shape = t, this._isPartial = e;
  }
  static _dilutes = !0;
  /**
   * @type {Schema<Partial<$ObjectToType<S>>>}
   */
  get partial() {
    return new Fn(this.shape, !0);
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is $ObjectToType<S>}
   */
  check(t, e) {
    return t == null ? (e?.extend(null, "object", "null"), !1) : Je(this.shape, (r, s) => {
      const i = this._isPartial && !jr(t, s) || r.check(t[s], e);
      return !i && e?.extend(s.toString(), r.toString(), typeof t[s], "Object property does not match"), i;
    });
  }
}
const Cc = (n) => (
  /** @type {any} */
  new Fn(n)
), Ec = gt(Fn), Tc = kt((n) => n != null && (n.constructor === Object || n.constructor == null));
class gi extends Et {
  /**
   * @param {Keys} keys
   * @param {Values} values
   */
  constructor(t, e) {
    super(), this.shape = {
      keys: t,
      values: e
    };
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is { [key in Unwrap<Keys>]: Unwrap<Values> }}
   */
  check(t, e) {
    return t != null && Je(t, (r, s) => {
      const i = this.shape.keys.check(s, e);
      return !i && e?.extend(s + "", "Record", typeof t, i ? "Key doesn't match schema" : "Value doesn't match value"), i && this.shape.values.check(r, e);
    });
  }
}
const mi = (n, t) => new gi(n, t), Dc = gt(gi);
class wi extends Et {
  /**
   * @param {S} shape
   */
  constructor(t) {
    super(), this.shape = t;
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is { [K in keyof S]: S[K] extends Schema<infer Type> ? Type : never }}
   */
  check(t, e) {
    return t != null && Je(this.shape, (r, s) => {
      const i = (
        /** @type {Schema<any>} */
        r.check(t[s], e)
      );
      return !i && e?.extend(s.toString(), "Tuple", typeof r), i;
    });
  }
}
const Ac = (...n) => new wi(n);
gt(wi);
class yi extends Et {
  /**
   * @param {Array<S>} v
   */
  constructor(t) {
    super(), this.shape = t.length === 1 ? t[0] : new Zr(t);
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is Array<S extends Schema<infer T> ? T : never>} o
   */
  check(t, e) {
    const r = xe(t) && Or(t, (s) => this.shape.check(s));
    return !r && e?.extend(null, "Array", ""), r;
  }
}
const _i = (...n) => new yi(n), Ic = gt(yi), Oc = kt((n) => xe(n));
class bi extends Et {
  /**
   * @param {new (...args:any) => T} constructor
   * @param {((o:T) => boolean)|null} check
   */
  constructor(t, e) {
    super(), this.shape = t, this._c = e;
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is T}
   */
  check(t, e) {
    const r = t instanceof this.shape && (this._c == null || this._c(t));
    return !r && e?.extend(null, this.shape.name, t?.constructor.name), r;
  }
}
const Lc = (n, t = null) => new bi(n, t);
gt(bi);
const Rc = Lc(Et);
class Nc extends Et {
  /**
   * @param {Args} args
   */
  constructor(t) {
    super(), this.len = t.length - 1, this.args = Ac(...t.slice(-1)), this.res = t[this.len];
  }
  /**
   * @param {any} f
   * @param {ValidationError} err
   * @return {f is _LArgsToLambdaDef<Args>}
   */
  check(t, e) {
    const r = t.constructor === Function && t.length <= this.len;
    return !r && e?.extend(null, "function", typeof t), r;
  }
}
const zc = gt(Nc), Mc = kt((n) => typeof n == "function");
class Uc extends Et {
  /**
   * @param {T} v
   */
  constructor(t) {
    super(), this.shape = t;
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is Intersect<UnwrapArray<T>>}
   */
  check(t, e) {
    const r = Or(this.shape, (s) => s.check(t, e));
    return !r && e?.extend(null, "Intersectinon", typeof t), r;
  }
}
gt(Uc, (n) => n.shape.length > 0);
class Zr extends Et {
  static _dilutes = !0;
  /**
   * @param {Array<Schema<S>>} v
   */
  constructor(t) {
    super(), this.shape = t;
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is S}
   */
  check(t, e) {
    const r = Lr(this.shape, (s) => s.check(t, e));
    return e?.extend(null, "Union", typeof t), r;
  }
}
const Oe = (...n) => n.findIndex((t) => xn.check(t)) >= 0 ? Oe(...n.map((t) => Ze(t)).map((t) => xn.check(t) ? t.shape : [t]).flat(1)) : n.length === 1 ? n[0] : new Zr(n), xn = (
  /** @type {Schema<$Union<any>>} */
  gt(Zr)
), ki = () => !0, Cn = kt(ki), Pc = (
  /** @type {Schema<Schema<any>>} */
  gt(Vr, (n) => n.shape === ki)
), Yr = kt((n) => typeof n == "bigint"), Bc = (
  /** @type {Schema<Schema<BigInt>>} */
  kt((n) => n === Yr)
), vi = kt((n) => typeof n == "symbol");
kt((n) => n === vi);
const be = kt((n) => typeof n == "number"), Si = (
  /** @type {Schema<Schema<number>>} */
  kt((n) => n === be)
), Ee = kt((n) => typeof n == "string"), xi = (
  /** @type {Schema<Schema<string>>} */
  kt((n) => n === Ee)
), jn = kt((n) => typeof n == "boolean"), Fc = (
  /** @type {Schema<Schema<Boolean>>} */
  kt((n) => n === jn)
), Ci = Bn(void 0);
gt(Pn, (n) => n.shape.length === 1 && n.shape[0] === void 0);
Bn(void 0);
const $n = Bn(null), jc = (
  /** @type {Schema<Schema<null>>} */
  gt(Pn, (n) => n.shape.length === 1 && n.shape[0] === null)
);
gt(Uint8Array);
gt(Wr, (n) => n.shape === Uint8Array);
const $c = Oe(be, Ee, $n, Ci, Yr, jn, vi);
(() => {
  const n = (
    /** @type {$Array<$any>} */
    _i(Cn)
  ), t = (
    /** @type {$Record<$string,$any>} */
    mi(Ee, Cn)
  ), e = Oe(be, Ee, $n, jn, n, t);
  return n.shape = e, t.shape.values = e, e;
})();
const Ze = (n) => {
  if (Rc.check(n))
    return (
      /** @type {any} */
      n
    );
  if (Tc.check(n)) {
    const t = {};
    for (const e in n)
      t[e] = Ze(n[e]);
    return (
      /** @type {any} */
      Cc(t)
    );
  } else {
    if (Oc.check(n))
      return (
        /** @type {any} */
        Oe(...n.map(Ze))
      );
    if ($c.check(n))
      return (
        /** @type {any} */
        Bn(n)
      );
    if (Mc.check(n))
      return (
        /** @type {any} */
        gt(
          /** @type {any} */
          n
        )
      );
  }
  Nt();
}, As = rc ? () => {
} : (n, t) => {
  const e = new _c();
  if (!t.check(n, e))
    throw $t(`Expected value to be of type ${t.constructor.name}.
${e.toString()}`);
};
class Hc {
  /**
   * @param {Schema<State>} [$state]
   */
  constructor(t) {
    this.patterns = [], this.$state = t;
  }
  /**
   * @template P
   * @template R
   * @param {P} pattern
   * @param {(o:NoInfer<Unwrap<ReadSchema<P>>>,s:State)=>R} handler
   * @return {PatternMatcher<State,Patterns|Pattern<Unwrap<ReadSchema<P>>,R>>}
   */
  if(t, e) {
    return this.patterns.push({ if: Ze(t), h: e }), this;
  }
  /**
   * @template R
   * @param {(o:any,s:State)=>R} h
   */
  else(t) {
    return this.if(Cn, t);
  }
  /**
   * @return {State extends undefined
   *   ? <In extends Unwrap<Patterns['if']>>(o:In,state?:undefined)=>PatternMatchResult<Patterns,In>
   *   : <In extends Unwrap<Patterns['if']>>(o:In,state:State)=>PatternMatchResult<Patterns,In>}
   */
  done() {
    return (
      /** @type {any} */
      (t, e) => {
        for (let r = 0; r < this.patterns.length; r++) {
          const s = this.patterns[r];
          if (s.if.check(t))
            return s.h(t, e);
        }
        throw $t("Unhandled pattern");
      }
    );
  }
}
const Wc = (n) => new Hc(
  /** @type {any} */
  n
), Ei = (
  /** @type {any} */
  Wc(
    /** @type {Schema<prng.PRNG>} */
    Cn
  ).if(Si, (n, t) => sr(t, _s, kn)).if(xi, (n, t) => wc(t)).if(Fc, (n, t) => Ds(t)).if(Bc, (n, t) => BigInt(sr(t, _s, kn))).if(xn, (n, t) => me(t, ir(t, n.shape))).if(Ec, (n, t) => {
    const e = {};
    for (const r in n.shape) {
      let s = n.shape[r];
      if (Sc.check(s)) {
        if (Ds(t))
          continue;
        s = s.shape;
      }
      e[r] = Ei(s, t);
    }
    return e;
  }).if(Ic, (n, t) => {
    const e = [], r = hi(t, 0, 42);
    for (let s = 0; s < r; s++)
      e.push(me(t, n.shape));
    return e;
  }).if(di, (n, t) => ir(t, n.shape)).if(jc, (n, t) => null).if(zc, (n, t) => {
    const e = me(t, n.res);
    return () => e;
  }).if(Pc, (n, t) => me(t, ir(t, [
    be,
    Ee,
    $n,
    Ci,
    Yr,
    jn,
    _i(be),
    mi(Oe("a", "b", "c"), be)
  ]))).if(Dc, (n, t) => {
    const e = {}, r = sr(t, 0, 3);
    for (let s = 0; s < r; s++) {
      const i = me(t, n.shape.keys), o = me(t, n.shape.values);
      e[i] = o;
    }
    return e;
  }).done()
), me = (n, t) => (
  /** @type {any} */
  Ei(Ze(t), n)
), Hn = (
  /** @type {Document} */
  typeof document < "u" ? document : {}
);
kt((n) => n.nodeType === Gc);
typeof DOMParser < "u" && new DOMParser();
kt((n) => n.nodeType === Zc);
kt((n) => n.nodeType === Yc);
const Vc = (n) => oa(n, (t, e) => `${e}:${t};`).join(""), Zc = Hn.ELEMENT_NODE, Yc = Hn.TEXT_NODE, qc = Hn.DOCUMENT_NODE, Gc = Hn.DOCUMENT_FRAGMENT_NODE;
kt((n) => n.nodeType === qc);
const Kt = Symbol, Ti = Kt(), Di = Kt(), Kc = Kt(), Xc = Kt(), Jc = Kt(), Ai = Kt(), Qc = Kt(), qr = Kt(), tl = Kt(), el = (n) => {
  n.length === 1 && n[0]?.constructor === Function && (n = /** @type {Array<string|Symbol|Object|number>} */
  /** @type {[function]} */
  n[0]());
  const t = [], e = [];
  let r = 0;
  for (; r < n.length; r++) {
    const s = n[r];
    if (s === void 0)
      break;
    if (s.constructor === String || s.constructor === Number)
      t.push(s);
    else if (s.constructor === Object)
      break;
  }
  for (r > 0 && e.push(t.join("")); r < n.length; r++) {
    const s = n[r];
    s instanceof Symbol || e.push(s);
  }
  return e;
}, nl = {
  [Ti]: Yt("font-weight", "bold"),
  [Di]: Yt("font-weight", "normal"),
  [Kc]: Yt("color", "blue"),
  [Jc]: Yt("color", "green"),
  [Xc]: Yt("color", "grey"),
  [Ai]: Yt("color", "red"),
  [Qc]: Yt("color", "purple"),
  [qr]: Yt("color", "orange"),
  // not well supported in chrome when debugging node with inspector - TODO: deprecate
  [tl]: Yt("color", "black")
}, rl = (n) => {
  n.length === 1 && n[0]?.constructor === Function && (n = /** @type {Array<string|Symbol|Object|number>} */
  /** @type {[function]} */
  n[0]());
  const t = [], e = [], r = Dt();
  let s = [], i = 0;
  for (; i < n.length; i++) {
    const o = n[i], a = nl[o];
    if (a !== void 0)
      r.set(a.left, a.right);
    else {
      if (o === void 0)
        break;
      if (o.constructor === String || o.constructor === Number) {
        const c = Vc(r);
        i > 0 || c.length > 0 ? (t.push("%c" + o), e.push(c)) : t.push(o);
      } else
        break;
    }
  }
  for (i > 0 && (s = e, s.unshift(t.join(""))); i < n.length; i++) {
    const o = n[i];
    o instanceof Symbol || s.push(o);
  }
  return s;
}, Ii = ic ? rl : el, sl = (...n) => {
  console.log(...Ii(n)), Li.forEach((t) => t.print(n));
}, Oi = (...n) => {
  console.warn(...Ii(n)), n.unshift(qr), Li.forEach((t) => t.print(n));
}, Li = ee(), Ri = (n) => ({
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this;
  },
  // @ts-ignore
  next: n
}), il = (n, t) => Ri(() => {
  let e;
  do
    e = n.next();
  while (!e.done && !t(e.value));
  return e;
}), or = (n, t) => Ri(() => {
  const { done: e, value: r } = n.next();
  return { done: e, value: e ? void 0 : t(r) };
});
class Wn {
  /**
   * @param {number} clock
   * @param {number} len
   */
  constructor(t, e) {
    this.clock = t, this.len = e;
  }
}
class Le {
  constructor() {
    this.clients = /* @__PURE__ */ new Map();
  }
}
const Te = (n, t, e) => t.clients.forEach((r, s) => {
  const i = (
    /** @type {Array<GC|Item>} */
    n.doc.store.clients.get(s)
  );
  if (i != null) {
    const o = i[i.length - 1], a = o.id.clock + o.length;
    for (let c = 0, h = r[c]; c < r.length && h.clock < a; h = r[++c])
      Vi(n, i, h.clock, h.len, e);
  }
}), ol = (n, t) => {
  let e = 0, r = n.length - 1;
  for (; e <= r; ) {
    const s = Ut((e + r) / 2), i = n[s], o = i.clock;
    if (o <= t) {
      if (t < o + i.len)
        return s;
      e = s + 1;
    } else
      r = s - 1;
  }
  return null;
}, Qe = (n, t) => {
  const e = n.clients.get(t.client);
  return e !== void 0 && ol(e, t.clock) !== null;
}, Gr = (n) => {
  n.clients.forEach((t) => {
    t.sort((s, i) => s.clock - i.clock);
    let e, r;
    for (e = 1, r = 1; e < t.length; e++) {
      const s = t[r - 1], i = t[e];
      s.clock + s.len >= i.clock ? t[r - 1] = new Wn(s.clock, fe(s.len, i.clock + i.len - s.clock)) : (r < e && (t[r] = i), r++);
    }
    t.length = r;
  });
}, kr = (n) => {
  const t = new Le();
  for (let e = 0; e < n.length; e++)
    n[e].clients.forEach((r, s) => {
      if (!t.clients.has(s)) {
        const i = r.slice();
        for (let o = e + 1; o < n.length; o++)
          ca(i, n[o].clients.get(s) || []);
        t.clients.set(s, i);
      }
    });
  return Gr(t), t;
}, Ye = (n, t, e, r) => {
  Vt(n.clients, t, () => (
    /** @type {Array<DeleteItem>} */
    []
  )).push(new Wn(e, r));
}, al = () => new Le(), cl = (n) => {
  const t = al();
  return n.clients.forEach((e, r) => {
    const s = [];
    for (let i = 0; i < e.length; i++) {
      const o = e[i];
      if (o.deleted) {
        const a = o.id.clock;
        let c = o.length;
        if (i + 1 < e.length)
          for (let h = e[i + 1]; i + 1 < e.length && h.deleted; h = e[++i + 1])
            c += h.length;
        s.push(new Wn(a, c));
      }
    }
    s.length > 0 && t.clients.set(r, s);
  }), t;
}, Re = (n, t) => {
  K(n.restEncoder, t.clients.size), Gt(t.clients.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
    n.resetDsCurVal(), K(n.restEncoder, e);
    const s = r.length;
    K(n.restEncoder, s);
    for (let i = 0; i < s; i++) {
      const o = r[i];
      n.writeDsClock(o.clock), n.writeDsLen(o.len);
    }
  });
}, Kr = (n) => {
  const t = new Le(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    n.resetDsCurVal();
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    if (i > 0) {
      const o = Vt(t.clients, s, () => (
        /** @type {Array<DeleteItem>} */
        []
      ));
      for (let a = 0; a < i; a++)
        o.push(new Wn(n.readDsClock(), n.readDsLen()));
    }
  }
  return t;
}, Is = (n, t, e) => {
  const r = new Le(), s = tt(n.restDecoder);
  for (let i = 0; i < s; i++) {
    n.resetDsCurVal();
    const o = tt(n.restDecoder), a = tt(n.restDecoder), c = e.clients.get(o) || [], h = mt(e, o);
    for (let l = 0; l < a; l++) {
      const d = n.readDsClock(), p = d + n.readDsLen();
      if (d < h) {
        h < p && Ye(r, o, h, p - h);
        let u = Ht(c, d), w = c[u];
        for (!w.deleted && w.id.clock < d && (c.splice(u + 1, 0, Rn(t, w, d - w.id.clock)), u++); u < c.length && (w = c[u++], w.id.clock < p); )
          w.deleted || (p < w.id.clock + w.length && c.splice(u, 0, Rn(t, w, p - w.id.clock)), w.delete(t));
      } else
        Ye(r, o, d, p - d);
    }
  }
  if (r.clients.size > 0) {
    const i = new le();
    return K(i.restEncoder, 0), Re(i, r), i.toUint8Array();
  }
  return null;
}, Ni = ri;
class pe extends Rr {
  /**
   * @param {DocOpts} opts configuration
   */
  constructor({ guid: t = $a(), collectionid: e = null, gc: r = !0, gcFilter: s = () => !0, meta: i = null, autoLoad: o = !1, shouldLoad: a = !0 } = {}) {
    super(), this.gc = r, this.gcFilter = s, this.clientID = Ni(), this.guid = t, this.collectionid = e, this.share = /* @__PURE__ */ new Map(), this.store = new Hi(), this._transaction = null, this._transactionCleanups = [], this.subdocs = /* @__PURE__ */ new Set(), this._item = null, this.shouldLoad = a, this.autoLoad = o, this.meta = i, this.isLoaded = !1, this.isSynced = !1, this.isDestroyed = !1, this.whenLoaded = Es((h) => {
      this.on("load", () => {
        this.isLoaded = !0, h(this);
      });
    });
    const c = () => Es((h) => {
      const l = (d) => {
        (d === void 0 || d === !0) && (this.off("sync", l), h());
      };
      this.on("sync", l);
    });
    this.on("sync", (h) => {
      h === !1 && this.isSynced && (this.whenSynced = c()), this.isSynced = h === void 0 || h === !0, this.isSynced && !this.isLoaded && this.emit("load", [this]);
    }), this.whenSynced = c();
  }
  /**
   * Notify the parent document that you request to load data into this subdocument (if it is a subdocument).
   *
   * `load()` might be used in the future to request any provider to load the most current data.
   *
   * It is safe to call `load()` multiple times.
   */
  load() {
    const t = this._item;
    t !== null && !this.shouldLoad && at(
      /** @type {any} */
      t.parent.doc,
      (e) => {
        e.subdocsLoaded.add(this);
      },
      null,
      !0
    ), this.shouldLoad = !0;
  }
  getSubdocs() {
    return this.subdocs;
  }
  getSubdocGuids() {
    return new Set(Gt(this.subdocs).map((t) => t.guid));
  }
  /**
   * Changes that happen inside of a transaction are bundled. This means that
   * the observer fires _after_ the transaction is finished and that all changes
   * that happened inside of the transaction are sent as one message to the
   * other peers.
   *
   * @template T
   * @param {function(Transaction):T} f The function that should be executed as a transaction
   * @param {any} [origin] Origin of who started the transaction. Will be stored on transaction.origin
   * @return T
   *
   * @public
   */
  transact(t, e = null) {
    return at(this, t, e);
  }
  /**
   * Define a shared data type.
   *
   * Multiple calls of `ydoc.get(name, TypeConstructor)` yield the same result
   * and do not overwrite each other. I.e.
   * `ydoc.get(name, Y.Array) === ydoc.get(name, Y.Array)`
   *
   * After this method is called, the type is also available on `ydoc.share.get(name)`.
   *
   * *Best Practices:*
   * Define all types right after the Y.Doc instance is created and store them in a separate object.
   * Also use the typed methods `getText(name)`, `getArray(name)`, ..
   *
   * @template {typeof AbstractType<any>} Type
   * @example
   *   const ydoc = new Y.Doc(..)
   *   const appState = {
   *     document: ydoc.getText('document')
   *     comments: ydoc.getArray('comments')
   *   }
   *
   * @param {string} name
   * @param {Type} TypeConstructor The constructor of the type definition. E.g. Y.Text, Y.Array, Y.Map, ...
   * @return {InstanceType<Type>} The created type. Constructed with TypeConstructor
   *
   * @public
   */
  get(t, e = (
    /** @type {any} */
    bt
  )) {
    const r = Vt(this.share, t, () => {
      const i = new e();
      return i._integrate(this, null), i;
    }), s = r.constructor;
    if (e !== bt && s !== e)
      if (s === bt) {
        const i = new e();
        i._map = r._map, r._map.forEach(
          /** @param {Item?} n */
          (o) => {
            for (; o !== null; o = o.left)
              o.parent = i;
          }
        ), i._start = r._start;
        for (let o = i._start; o !== null; o = o.right)
          o.parent = i;
        return i._length = r._length, this.share.set(t, i), i._integrate(this, null), /** @type {InstanceType<Type>} */
        i;
      } else
        throw new Error(`Type with the name ${t} has already been defined with a different constructor`);
    return (
      /** @type {InstanceType<Type>} */
      r
    );
  }
  /**
   * @template T
   * @param {string} [name]
   * @return {YArray<T>}
   *
   * @public
   */
  getArray(t = "") {
    return (
      /** @type {YArray<T>} */
      this.get(t, ve)
    );
  }
  /**
   * @param {string} [name]
   * @return {YText}
   *
   * @public
   */
  getText(t = "") {
    return this.get(t, ue);
  }
  /**
   * @template T
   * @param {string} [name]
   * @return {YMap<T>}
   *
   * @public
   */
  getMap(t = "") {
    return (
      /** @type {YMap<T>} */
      this.get(t, Ae)
    );
  }
  /**
   * @param {string} [name]
   * @return {YXmlElement}
   *
   * @public
   */
  getXmlElement(t = "") {
    return (
      /** @type {YXmlElement<{[key:string]:string}>} */
      this.get(t, Ie)
    );
  }
  /**
   * @param {string} [name]
   * @return {YXmlFragment}
   *
   * @public
   */
  getXmlFragment(t = "") {
    return this.get(t, he);
  }
  /**
   * Converts the entire document into a js object, recursively traversing each yjs type
   * Doesn't log types that have not been defined (using ydoc.getType(..)).
   *
   * @deprecated Do not use this method and rather call toJSON directly on the shared types.
   *
   * @return {Object<string, any>}
   */
  toJSON() {
    const t = {};
    return this.share.forEach((e, r) => {
      t[r] = e.toJSON();
    }), t;
  }
  /**
   * Emit `destroy` event and unregister all event handlers.
   */
  destroy() {
    this.isDestroyed = !0, Gt(this.subdocs).forEach((e) => e.destroy());
    const t = this._item;
    if (t !== null) {
      this._item = null;
      const e = (
        /** @type {ContentDoc} */
        t.content
      );
      e.doc = new pe({ guid: this.guid, ...e.opts, shouldLoad: !1 }), e.doc._item = t, at(
        /** @type {any} */
        t.parent.doc,
        (r) => {
          const s = e.doc;
          t.deleted || r.subdocsAdded.add(s), r.subdocsRemoved.add(this);
        },
        null,
        !0
      );
    }
    this.emit("destroyed", [!0]), this.emit("destroy", [this]), super.destroy();
  }
}
class zi {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor(t) {
    this.restDecoder = t;
  }
  resetDsCurVal() {
  }
  /**
   * @return {number}
   */
  readDsClock() {
    return tt(this.restDecoder);
  }
  /**
   * @return {number}
   */
  readDsLen() {
    return tt(this.restDecoder);
  }
}
class Mi extends zi {
  /**
   * @return {ID}
   */
  readLeftID() {
    return rt(tt(this.restDecoder), tt(this.restDecoder));
  }
  /**
   * @return {ID}
   */
  readRightID() {
    return rt(tt(this.restDecoder), tt(this.restDecoder));
  }
  /**
   * Read the next client id.
   * Use this in favor of readID whenever possible to reduce the number of objects created.
   */
  readClient() {
    return tt(this.restDecoder);
  }
  /**
   * @return {number} info An unsigned 8-bit integer
   */
  readInfo() {
    return Ce(this.restDecoder);
  }
  /**
   * @return {string}
   */
  readString() {
    return te(this.restDecoder);
  }
  /**
   * @return {boolean} isKey
   */
  readParentInfo() {
    return tt(this.restDecoder) === 1;
  }
  /**
   * @return {number} info An unsigned 8-bit integer
   */
  readTypeRef() {
    return tt(this.restDecoder);
  }
  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @return {number} len
   */
  readLen() {
    return tt(this.restDecoder);
  }
  /**
   * @return {any}
   */
  readAny() {
    return We(this.restDecoder);
  }
  /**
   * @return {Uint8Array}
   */
  readBuf() {
    return pc(St(this.restDecoder));
  }
  /**
   * Legacy implementation uses JSON parse. We use any-decoding in v2.
   *
   * @return {any}
   */
  readJSON() {
    return JSON.parse(te(this.restDecoder));
  }
  /**
   * @return {string}
   */
  readKey() {
    return te(this.restDecoder);
  }
}
class ll {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor(t) {
    this.dsCurrVal = 0, this.restDecoder = t;
  }
  resetDsCurVal() {
    this.dsCurrVal = 0;
  }
  /**
   * @return {number}
   */
  readDsClock() {
    return this.dsCurrVal += tt(this.restDecoder), this.dsCurrVal;
  }
  /**
   * @return {number}
   */
  readDsLen() {
    const t = tt(this.restDecoder) + 1;
    return this.dsCurrVal += t, t;
  }
}
class De extends ll {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor(t) {
    super(t), this.keys = [], tt(t), this.keyClockDecoder = new rr(St(t)), this.clientDecoder = new yn(St(t)), this.leftClockDecoder = new rr(St(t)), this.rightClockDecoder = new rr(St(t)), this.infoDecoder = new Cs(St(t), Ce), this.stringDecoder = new Ba(St(t)), this.parentInfoDecoder = new Cs(St(t), Ce), this.typeRefDecoder = new yn(St(t)), this.lenDecoder = new yn(St(t));
  }
  /**
   * @return {ID}
   */
  readLeftID() {
    return new ke(this.clientDecoder.read(), this.leftClockDecoder.read());
  }
  /**
   * @return {ID}
   */
  readRightID() {
    return new ke(this.clientDecoder.read(), this.rightClockDecoder.read());
  }
  /**
   * Read the next client id.
   * Use this in favor of readID whenever possible to reduce the number of objects created.
   */
  readClient() {
    return this.clientDecoder.read();
  }
  /**
   * @return {number} info An unsigned 8-bit integer
   */
  readInfo() {
    return (
      /** @type {number} */
      this.infoDecoder.read()
    );
  }
  /**
   * @return {string}
   */
  readString() {
    return this.stringDecoder.read();
  }
  /**
   * @return {boolean}
   */
  readParentInfo() {
    return this.parentInfoDecoder.read() === 1;
  }
  /**
   * @return {number} An unsigned 8-bit integer
   */
  readTypeRef() {
    return this.typeRefDecoder.read();
  }
  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @return {number}
   */
  readLen() {
    return this.lenDecoder.read();
  }
  /**
   * @return {any}
   */
  readAny() {
    return We(this.restDecoder);
  }
  /**
   * @return {Uint8Array}
   */
  readBuf() {
    return St(this.restDecoder);
  }
  /**
   * This is mainly here for legacy purposes.
   *
   * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
   *
   * @return {any}
   */
  readJSON() {
    return We(this.restDecoder);
  }
  /**
   * @return {string}
   */
  readKey() {
    const t = this.keyClockDecoder.read();
    if (t < this.keys.length)
      return this.keys[t];
    {
      const e = this.stringDecoder.read();
      return this.keys.push(e), e;
    }
  }
}
class Ui {
  constructor() {
    this.restEncoder = xt();
  }
  toUint8Array() {
    return ut(this.restEncoder);
  }
  resetDsCurVal() {
  }
  /**
   * @param {number} clock
   */
  writeDsClock(t) {
    K(this.restEncoder, t);
  }
  /**
   * @param {number} len
   */
  writeDsLen(t) {
    K(this.restEncoder, t);
  }
}
class tn extends Ui {
  /**
   * @param {ID} id
   */
  writeLeftID(t) {
    K(this.restEncoder, t.client), K(this.restEncoder, t.clock);
  }
  /**
   * @param {ID} id
   */
  writeRightID(t) {
    K(this.restEncoder, t.client), K(this.restEncoder, t.clock);
  }
  /**
   * Use writeClient and writeClock instead of writeID if possible.
   * @param {number} client
   */
  writeClient(t) {
    K(this.restEncoder, t);
  }
  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeInfo(t) {
    wr(this.restEncoder, t);
  }
  /**
   * @param {string} s
   */
  writeString(t) {
    ce(this.restEncoder, t);
  }
  /**
   * @param {boolean} isYKey
   */
  writeParentInfo(t) {
    K(this.restEncoder, t ? 1 : 0);
  }
  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeTypeRef(t) {
    K(this.restEncoder, t);
  }
  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @param {number} len
   */
  writeLen(t) {
    K(this.restEncoder, t);
  }
  /**
   * @param {any} any
   */
  writeAny(t) {
    He(this.restEncoder, t);
  }
  /**
   * @param {Uint8Array} buf
   */
  writeBuf(t) {
    pt(this.restEncoder, t);
  }
  /**
   * @param {any} embed
   */
  writeJSON(t) {
    ce(this.restEncoder, JSON.stringify(t));
  }
  /**
   * @param {string} key
   */
  writeKey(t) {
    ce(this.restEncoder, t);
  }
}
class Pi {
  constructor() {
    this.restEncoder = xt(), this.dsCurrVal = 0;
  }
  toUint8Array() {
    return ut(this.restEncoder);
  }
  resetDsCurVal() {
    this.dsCurrVal = 0;
  }
  /**
   * @param {number} clock
   */
  writeDsClock(t) {
    const e = t - this.dsCurrVal;
    this.dsCurrVal = t, K(this.restEncoder, e);
  }
  /**
   * @param {number} len
   */
  writeDsLen(t) {
    t === 0 && Nt(), K(this.restEncoder, t - 1), this.dsCurrVal += t;
  }
}
class le extends Pi {
  constructor() {
    super(), this.keyMap = /* @__PURE__ */ new Map(), this.keyClock = 0, this.keyClockEncoder = new nr(), this.clientEncoder = new wn(), this.leftClockEncoder = new nr(), this.rightClockEncoder = new nr(), this.infoEncoder = new vs(wr), this.stringEncoder = new Ia(), this.parentInfoEncoder = new vs(wr), this.typeRefEncoder = new wn(), this.lenEncoder = new wn();
  }
  toUint8Array() {
    const t = xt();
    return K(t, 0), pt(t, this.keyClockEncoder.toUint8Array()), pt(t, this.clientEncoder.toUint8Array()), pt(t, this.leftClockEncoder.toUint8Array()), pt(t, this.rightClockEncoder.toUint8Array()), pt(t, ut(this.infoEncoder)), pt(t, this.stringEncoder.toUint8Array()), pt(t, ut(this.parentInfoEncoder)), pt(t, this.typeRefEncoder.toUint8Array()), pt(t, this.lenEncoder.toUint8Array()), Mn(t, ut(this.restEncoder)), ut(t);
  }
  /**
   * @param {ID} id
   */
  writeLeftID(t) {
    this.clientEncoder.write(t.client), this.leftClockEncoder.write(t.clock);
  }
  /**
   * @param {ID} id
   */
  writeRightID(t) {
    this.clientEncoder.write(t.client), this.rightClockEncoder.write(t.clock);
  }
  /**
   * @param {number} client
   */
  writeClient(t) {
    this.clientEncoder.write(t);
  }
  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeInfo(t) {
    this.infoEncoder.write(t);
  }
  /**
   * @param {string} s
   */
  writeString(t) {
    this.stringEncoder.write(t);
  }
  /**
   * @param {boolean} isYKey
   */
  writeParentInfo(t) {
    this.parentInfoEncoder.write(t ? 1 : 0);
  }
  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeTypeRef(t) {
    this.typeRefEncoder.write(t);
  }
  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @param {number} len
   */
  writeLen(t) {
    this.lenEncoder.write(t);
  }
  /**
   * @param {any} any
   */
  writeAny(t) {
    He(this.restEncoder, t);
  }
  /**
   * @param {Uint8Array} buf
   */
  writeBuf(t) {
    pt(this.restEncoder, t);
  }
  /**
   * This is mainly here for legacy purposes.
   *
   * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
   *
   * @param {any} embed
   */
  writeJSON(t) {
    He(this.restEncoder, t);
  }
  /**
   * Property keys are often reused. For example, in y-prosemirror the key `bold` might
   * occur very often. For a 3d application, the key `position` might occur very often.
   *
   * We cache these keys in a Map and refer to them via a unique number.
   *
   * @param {string} key
   */
  writeKey(t) {
    const e = this.keyMap.get(t);
    e === void 0 ? (this.keyClockEncoder.write(this.keyClock++), this.stringEncoder.write(t)) : this.keyClockEncoder.write(e);
  }
}
const ul = (n, t, e, r) => {
  r = fe(r, t[0].id.clock);
  const s = Ht(t, r);
  K(n.restEncoder, t.length - s), n.writeClient(e), K(n.restEncoder, r);
  const i = t[s];
  i.write(n, r - i.id.clock);
  for (let o = s + 1; o < t.length; o++)
    t[o].write(n, 0);
}, Xr = (n, t, e) => {
  const r = /* @__PURE__ */ new Map();
  e.forEach((s, i) => {
    mt(t, i) > s && r.set(i, s);
  }), Vn(t).forEach((s, i) => {
    e.has(i) || r.set(i, 0);
  }), K(n.restEncoder, r.size), Gt(r.entries()).sort((s, i) => i[0] - s[0]).forEach(([s, i]) => {
    ul(
      n,
      /** @type {Array<GC|Item>} */
      t.clients.get(s),
      s,
      i
    );
  });
}, hl = (n, t) => {
  const e = Dt(), r = tt(n.restDecoder);
  for (let s = 0; s < r; s++) {
    const i = tt(n.restDecoder), o = new Array(i), a = n.readClient();
    let c = tt(n.restDecoder);
    e.set(a, { i: 0, refs: o });
    for (let h = 0; h < i; h++) {
      const l = n.readInfo();
      switch (zn & l) {
        case 0: {
          const d = n.readLen();
          o[h] = new Lt(rt(a, c), d), c += d;
          break;
        }
        case 10: {
          const d = tt(n.restDecoder);
          o[h] = new Rt(rt(a, c), d), c += d;
          break;
        }
        default: {
          const d = (l & (qt | At)) === 0, p = new lt(
            rt(a, c),
            null,
            // left
            (l & At) === At ? n.readLeftID() : null,
            // origin
            null,
            // right
            (l & qt) === qt ? n.readRightID() : null,
            // right origin
            d ? n.readParentInfo() ? t.get(n.readString()) : n.readLeftID() : null,
            // parent
            d && (l & je) === je ? n.readString() : null,
            // parentSub
            ho(n, l)
            // item content
          );
          o[h] = p, c += p.length;
        }
      }
    }
  }
  return e;
}, dl = (n, t, e) => {
  const r = [];
  let s = Gt(e.keys()).sort((u, w) => u - w);
  if (s.length === 0)
    return null;
  const i = () => {
    if (s.length === 0)
      return null;
    let u = (
      /** @type {{i:number,refs:Array<GC|Item>}} */
      e.get(s[s.length - 1])
    );
    for (; u.refs.length === u.i; )
      if (s.pop(), s.length > 0)
        u = /** @type {{i:number,refs:Array<GC|Item>}} */
        e.get(s[s.length - 1]);
      else
        return null;
    return u;
  };
  let o = i();
  if (o === null)
    return null;
  const a = new Hi(), c = /* @__PURE__ */ new Map(), h = (u, w) => {
    const g = c.get(u);
    (g == null || g > w) && c.set(u, w);
  };
  let l = (
    /** @type {any} */
    o.refs[
      /** @type {any} */
      o.i++
    ]
  );
  const d = /* @__PURE__ */ new Map(), p = () => {
    for (const u of r) {
      const w = u.id.client, g = e.get(w);
      g ? (g.i--, a.clients.set(w, g.refs.slice(g.i)), e.delete(w), g.i = 0, g.refs = []) : a.clients.set(w, [u]), s = s.filter((_) => _ !== w);
    }
    r.length = 0;
  };
  for (; ; ) {
    if (l.constructor !== Rt) {
      const w = Vt(d, l.id.client, () => mt(t, l.id.client)) - l.id.clock;
      if (w < 0)
        r.push(l), h(l.id.client, l.id.clock - 1), p();
      else {
        const g = l.getMissing(n, t);
        if (g !== null) {
          r.push(l);
          const _ = e.get(
            /** @type {number} */
            g
          ) || { refs: [], i: 0 };
          if (_.refs.length === _.i)
            h(
              /** @type {number} */
              g,
              mt(t, g)
            ), p();
          else {
            l = _.refs[_.i++];
            continue;
          }
        } else (w === 0 || w < l.length) && (l.integrate(n, w), d.set(l.id.client, l.id.clock + l.length));
      }
    }
    if (r.length > 0)
      l = /** @type {GC|Item} */
      r.pop();
    else if (o !== null && o.i < o.refs.length)
      l = /** @type {GC|Item} */
      o.refs[o.i++];
    else {
      if (o = i(), o === null)
        break;
      l = /** @type {GC|Item} */
      o.refs[o.i++];
    }
  }
  if (a.clients.size > 0) {
    const u = new le();
    return Xr(u, a, /* @__PURE__ */ new Map()), K(u.restEncoder, 0), { missing: c, update: u.toUint8Array() };
  }
  return null;
}, fl = (n, t) => Xr(n, t.doc.store, t.beforeState), pl = (n, t, e, r = new De(n)) => at(t, (s) => {
  s.local = !1;
  let i = !1;
  const o = s.doc, a = o.store, c = hl(r, o), h = dl(s, a, c), l = a.pendingStructs;
  if (l) {
    for (const [p, u] of l.missing)
      if (u < mt(a, p)) {
        i = !0;
        break;
      }
    if (h) {
      for (const [p, u] of h.missing) {
        const w = l.missing.get(p);
        (w == null || w > u) && l.missing.set(p, u);
      }
      l.update = Tn([l.update, h.update]);
    }
  } else
    a.pendingStructs = h;
  const d = Is(r, s, a);
  if (a.pendingDs) {
    const p = new De(se(a.pendingDs));
    tt(p.restDecoder);
    const u = Is(p, s, a);
    d && u ? a.pendingDs = Tn([d, u]) : a.pendingDs = d || u;
  } else
    a.pendingDs = d;
  if (i) {
    const p = (
      /** @type {{update: Uint8Array}} */
      a.pendingStructs.update
    );
    a.pendingStructs = null, Bi(s.doc, p);
  }
}, e, !1), Bi = (n, t, e, r = De) => {
  const s = se(t);
  pl(s, n, e, new r(s));
}, Jr = (n, t, e) => Bi(n, t, e, Mi), gl = (n, t, e = /* @__PURE__ */ new Map()) => {
  Xr(n, t.store, e), Re(n, cl(t.store));
}, ml = (n, t = new Uint8Array([0]), e = new le()) => {
  const r = Fi(t);
  gl(e, n, r);
  const s = [e.toUint8Array()];
  if (n.store.pendingDs && s.push(n.store.pendingDs), n.store.pendingStructs && s.push(Rl(n.store.pendingStructs.update, t)), s.length > 1) {
    if (e.constructor === tn)
      return Ol(s.map((i, o) => o === 0 ? i : zl(i)));
    if (e.constructor === le)
      return Tn(s);
  }
  return s[0];
}, Qr = (n, t) => ml(n, t, new tn()), wl = (n) => {
  const t = /* @__PURE__ */ new Map(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    t.set(s, i);
  }
  return t;
}, Fi = (n) => wl(new zi(se(n))), ji = (n, t) => (K(n.restEncoder, t.size), Gt(t.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
  K(n.restEncoder, e), K(n.restEncoder, r);
}), n), yl = (n, t) => ji(n, Vn(t.store)), _l = (n, t = new Pi()) => (n instanceof Map ? ji(t, n) : yl(t, n), t.toUint8Array()), bl = (n) => _l(n, new Ui());
class kl {
  constructor() {
    this.l = [];
  }
}
const Os = () => new kl(), Ls = (n, t) => n.l.push(t), Rs = (n, t) => {
  const e = n.l, r = e.length;
  n.l = e.filter((s) => t !== s), r === n.l.length && console.error("[yjs] Tried to remove event handler that doesn't exist.");
}, $i = (n, t, e) => $r(n.l, [t, e]);
class ke {
  /**
   * @param {number} client client id
   * @param {number} clock unique per client id, continuous number
   */
  constructor(t, e) {
    this.client = t, this.clock = e;
  }
}
const un = (n, t) => n === t || n !== null && t !== null && n.client === t.client && n.clock === t.clock, rt = (n, t) => new ke(n, t), vl = (n) => {
  for (const [t, e] of n.doc.share.entries())
    if (e === n)
      return t;
  throw Nt();
}, En = (n, t) => {
  for (; t !== null; ) {
    if (t.parent === n)
      return !0;
    t = /** @type {AbstractType<any>} */
    t.parent._item;
  }
  return !1;
}, we = (n, t) => t === void 0 ? !n.deleted : t.sv.has(n.id.client) && (t.sv.get(n.id.client) || 0) > n.id.clock && !Qe(t.ds, n.id), vr = (n, t) => {
  const e = Vt(n.meta, vr, ee), r = n.doc.store;
  e.has(t) || (t.sv.forEach((s, i) => {
    s < mt(r, i) && Tt(n, rt(i, s));
  }), Te(n, t.ds, (s) => {
  }), e.add(t));
};
class Hi {
  constructor() {
    this.clients = /* @__PURE__ */ new Map(), this.pendingStructs = null, this.pendingDs = null;
  }
}
const Vn = (n) => {
  const t = /* @__PURE__ */ new Map();
  return n.clients.forEach((e, r) => {
    const s = e[e.length - 1];
    t.set(r, s.id.clock + s.length);
  }), t;
}, mt = (n, t) => {
  const e = n.clients.get(t);
  if (e === void 0)
    return 0;
  const r = e[e.length - 1];
  return r.id.clock + r.length;
}, Wi = (n, t) => {
  let e = n.clients.get(t.id.client);
  if (e === void 0)
    e = [], n.clients.set(t.id.client, e);
  else {
    const r = e[e.length - 1];
    if (r.id.clock + r.length !== t.id.clock)
      throw Nt();
  }
  e.push(t);
}, Ht = (n, t) => {
  let e = 0, r = n.length - 1, s = n[r], i = s.id.clock;
  if (i === t)
    return r;
  let o = Ut(t / (i + s.length - 1) * r);
  for (; e <= r; ) {
    if (s = n[o], i = s.id.clock, i <= t) {
      if (t < i + s.length)
        return o;
      e = o + 1;
    } else
      r = o - 1;
    o = Ut((e + r) / 2);
  }
  throw Nt();
}, Sl = (n, t) => {
  const e = n.clients.get(t.client);
  return e[Ht(e, t.clock)];
}, _n = (
  /** @type {function(StructStore,ID):Item} */
  Sl
), Sr = (n, t, e) => {
  const r = Ht(t, e), s = t[r];
  return s.id.clock < e && s instanceof lt ? (t.splice(r + 1, 0, Rn(n, s, e - s.id.clock)), r + 1) : r;
}, Tt = (n, t) => {
  const e = (
    /** @type {Array<Item>} */
    n.doc.store.clients.get(t.client)
  );
  return e[Sr(n, e, t.clock)];
}, Ns = (n, t, e) => {
  const r = t.clients.get(e.client), s = Ht(r, e.clock), i = r[s];
  return e.clock !== i.id.clock + i.length - 1 && i.constructor !== Lt && r.splice(s + 1, 0, Rn(n, i, e.clock - i.id.clock + 1)), i;
}, xl = (n, t, e) => {
  const r = (
    /** @type {Array<GC|Item>} */
    n.clients.get(t.id.client)
  );
  r[Ht(r, t.id.clock)] = e;
}, Vi = (n, t, e, r, s) => {
  if (r === 0)
    return;
  const i = e + r;
  let o = Sr(n, t, e), a;
  do
    a = t[o++], i < a.id.clock + a.length && Sr(n, t, i), s(a);
  while (o < t.length && t[o].id.clock < i);
};
class Cl {
  /**
   * @param {Doc} doc
   * @param {any} origin
   * @param {boolean} local
   */
  constructor(t, e, r) {
    this.doc = t, this.deleteSet = new Le(), this.beforeState = Vn(t.store), this.afterState = /* @__PURE__ */ new Map(), this.changed = /* @__PURE__ */ new Map(), this.changedParentTypes = /* @__PURE__ */ new Map(), this._mergeStructs = [], this.origin = e, this.meta = /* @__PURE__ */ new Map(), this.local = r, this.subdocsAdded = /* @__PURE__ */ new Set(), this.subdocsRemoved = /* @__PURE__ */ new Set(), this.subdocsLoaded = /* @__PURE__ */ new Set(), this._needFormattingCleanup = !1;
  }
}
const zs = (n, t) => t.deleteSet.clients.size === 0 && !aa(t.afterState, (e, r) => t.beforeState.get(r) !== e) ? !1 : (Gr(t.deleteSet), fl(n, t), Re(n, t.deleteSet), !0), Ms = (n, t, e) => {
  const r = t._item;
  (r === null || r.id.clock < (n.beforeState.get(r.id.client) || 0) && !r.deleted) && Vt(n.changed, t, ee).add(e);
}, bn = (n, t) => {
  let e = n[t], r = n[t - 1], s = t;
  for (; s > 0; e = r, r = n[--s - 1]) {
    if (r.deleted === e.deleted && r.constructor === e.constructor && r.mergeWith(e)) {
      e instanceof lt && e.parentSub !== null && /** @type {AbstractType<any>} */
      e.parent._map.get(e.parentSub) === e && e.parent._map.set(
        e.parentSub,
        /** @type {Item} */
        r
      );
      continue;
    }
    break;
  }
  const i = t - s;
  return i && n.splice(t + 1 - i, i), i;
}, El = (n, t, e) => {
  for (const [r, s] of n.clients.entries()) {
    const i = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let o = s.length - 1; o >= 0; o--) {
      const a = s[o], c = a.clock + a.len;
      for (let h = Ht(i, a.clock), l = i[h]; h < i.length && l.id.clock < c; l = i[++h]) {
        const d = i[h];
        if (a.clock + a.len <= d.id.clock)
          break;
        d instanceof lt && d.deleted && !d.keep && e(d) && d.gc(t, !1);
      }
    }
  }
}, Tl = (n, t) => {
  n.clients.forEach((e, r) => {
    const s = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let i = e.length - 1; i >= 0; i--) {
      const o = e[i], a = Nr(s.length - 1, 1 + Ht(s, o.clock + o.len - 1));
      for (let c = a, h = s[c]; c > 0 && h.id.clock >= o.clock; h = s[c])
        c -= 1 + bn(s, c);
    }
  });
}, Zi = (n, t) => {
  if (t < n.length) {
    const e = n[t], r = e.doc, s = r.store, i = e.deleteSet, o = e._mergeStructs;
    try {
      Gr(i), e.afterState = Vn(e.doc.store), r.emit("beforeObserverCalls", [e, r]);
      const a = [];
      e.changed.forEach(
        (c, h) => a.push(() => {
          (h._item === null || !h._item.deleted) && h._callObserver(e, c);
        })
      ), a.push(() => {
        e.changedParentTypes.forEach((c, h) => {
          h._dEH.l.length > 0 && (h._item === null || !h._item.deleted) && (c = c.filter(
            (l) => l.target._item === null || !l.target._item.deleted
          ), c.forEach((l) => {
            l.currentTarget = h, l._path = null;
          }), c.sort((l, d) => l.path.length - d.path.length), a.push(() => {
            $i(h._dEH, c, e);
          }));
        }), a.push(() => r.emit("afterTransaction", [e, r])), a.push(() => {
          e._needFormattingCleanup && Gl(e);
        });
      }), $r(a, []);
    } finally {
      r.gc && El(i, s, r.gcFilter), Tl(i, s), e.afterState.forEach((l, d) => {
        const p = e.beforeState.get(d) || 0;
        if (p !== l) {
          const u = (
            /** @type {Array<GC|Item>} */
            s.clients.get(d)
          ), w = fe(Ht(u, p), 1);
          for (let g = u.length - 1; g >= w; )
            g -= 1 + bn(u, g);
        }
      });
      for (let l = o.length - 1; l >= 0; l--) {
        const { client: d, clock: p } = o[l].id, u = (
          /** @type {Array<GC|Item>} */
          s.clients.get(d)
        ), w = Ht(u, p);
        w + 1 < u.length && bn(u, w + 1) > 1 || w > 0 && bn(u, w);
      }
      if (!e.local && e.afterState.get(r.clientID) !== e.beforeState.get(r.clientID) && (sl(qr, Ti, "[yjs] ", Di, Ai, "Changed the client-id because another client seems to be using it."), r.clientID = Ni()), r.emit("afterTransactionCleanup", [e, r]), r._observers.has("update")) {
        const l = new tn();
        zs(l, e) && r.emit("update", [l.toUint8Array(), e.origin, r, e]);
      }
      if (r._observers.has("updateV2")) {
        const l = new le();
        zs(l, e) && r.emit("updateV2", [l.toUint8Array(), e.origin, r, e]);
      }
      const { subdocsAdded: a, subdocsLoaded: c, subdocsRemoved: h } = e;
      (a.size > 0 || h.size > 0 || c.size > 0) && (a.forEach((l) => {
        l.clientID = r.clientID, l.collectionid == null && (l.collectionid = r.collectionid), r.subdocs.add(l);
      }), h.forEach((l) => r.subdocs.delete(l)), r.emit("subdocs", [{ loaded: c, added: a, removed: h }, r, e]), h.forEach((l) => l.destroy())), n.length <= t + 1 ? (r._transactionCleanups = [], r.emit("afterAllTransactions", [r, n])) : Zi(n, t + 1);
    }
  }
}, at = (n, t, e = null, r = !0) => {
  const s = n._transactionCleanups;
  let i = !1, o = null;
  n._transaction === null && (i = !0, n._transaction = new Cl(n, e, r), s.push(n._transaction), s.length === 1 && n.emit("beforeAllTransactions", [n]), n.emit("beforeTransaction", [n._transaction, n]));
  try {
    o = t(n._transaction);
  } finally {
    if (i) {
      const a = n._transaction === s[0];
      n._transaction = null, a && Zi(s, 0);
    }
  }
  return o;
};
class Dl {
  /**
   * @param {DeleteSet} deletions
   * @param {DeleteSet} insertions
   */
  constructor(t, e) {
    this.insertions = e, this.deletions = t, this.meta = /* @__PURE__ */ new Map();
  }
}
const Us = (n, t, e) => {
  Te(n, e.deletions, (r) => {
    r instanceof lt && t.scope.some((s) => s === n.doc || En(
      /** @type {AbstractType<any>} */
      s,
      r
    )) && as(r, !1);
  });
}, Ps = (n, t, e) => {
  let r = null;
  const s = n.doc, i = n.scope;
  at(s, (a) => {
    for (; t.length > 0 && n.currStackItem === null; ) {
      const c = s.store, h = (
        /** @type {StackItem} */
        t.pop()
      ), l = /* @__PURE__ */ new Set(), d = [];
      let p = !1;
      Te(a, h.insertions, (u) => {
        if (u instanceof lt) {
          if (u.redone !== null) {
            let { item: w, diff: g } = vu(c, u.id);
            g > 0 && (w = Tt(a, rt(w.id.client, w.id.clock + g))), u = w;
          }
          !u.deleted && i.some((w) => w === a.doc || En(
            /** @type {AbstractType<any>} */
            w,
            /** @type {Item} */
            u
          )) && d.push(u);
        }
      }), Te(a, h.deletions, (u) => {
        u instanceof lt && i.some((w) => w === a.doc || En(
          /** @type {AbstractType<any>} */
          w,
          u
        )) && // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
        !Qe(h.insertions, u.id) && l.add(u);
      }), l.forEach((u) => {
        p = uo(a, u, l, h.insertions, n.ignoreRemoteMapChanges, n) !== null || p;
      });
      for (let u = d.length - 1; u >= 0; u--) {
        const w = d[u];
        n.deleteFilter(w) && (w.delete(a), p = !0);
      }
      n.currStackItem = p ? h : null;
    }
    a.changed.forEach((c, h) => {
      c.has(null) && h._searchMarker && (h._searchMarker.length = 0);
    }), r = a;
  }, n);
  const o = n.currStackItem;
  if (o != null) {
    const a = r.changedParentTypes;
    n.emit("stack-item-popped", [{ stackItem: o, type: e, changedParentTypes: a, origin: n }, n]), n.currStackItem = null;
  }
  return o;
};
class Al extends Rr {
  /**
   * @param {Doc|AbstractType<any>|Array<AbstractType<any>>} typeScope Limits the scope of the UndoManager. If this is set to a ydoc instance, all changes on that ydoc will be undone. If set to a specific type, only changes on that type or its children will be undone. Also accepts an array of types.
   * @param {UndoManagerOptions} options
   */
  constructor(t, {
    captureTimeout: e = 500,
    captureTransaction: r = (c) => !0,
    deleteFilter: s = () => !0,
    trackedOrigins: i = /* @__PURE__ */ new Set([null]),
    ignoreRemoteMapChanges: o = !1,
    doc: a = (
      /** @type {Doc} */
      xe(t) ? t[0].doc : t instanceof pe ? t : t.doc
    )
  } = {}) {
    super(), this.scope = [], this.doc = a, this.addToScope(t), this.deleteFilter = s, i.add(this), this.trackedOrigins = i, this.captureTransaction = r, this.undoStack = [], this.redoStack = [], this.undoing = !1, this.redoing = !1, this.currStackItem = null, this.lastChange = 0, this.ignoreRemoteMapChanges = o, this.captureTimeout = e, this.afterTransactionHandler = (c) => {
      if (!this.captureTransaction(c) || !this.scope.some((_) => c.changedParentTypes.has(
        /** @type {AbstractType<any>} */
        _
      ) || _ === this.doc) || !this.trackedOrigins.has(c.origin) && (!c.origin || !this.trackedOrigins.has(c.origin.constructor)))
        return;
      const h = this.undoing, l = this.redoing, d = h ? this.redoStack : this.undoStack;
      h ? this.stopCapturing() : l || this.clear(!1, !0);
      const p = new Le();
      c.afterState.forEach((_, y) => {
        const k = c.beforeState.get(y) || 0, C = _ - k;
        C > 0 && Ye(p, y, k, C);
      });
      const u = ne();
      let w = !1;
      if (this.lastChange > 0 && u - this.lastChange < this.captureTimeout && d.length > 0 && !h && !l) {
        const _ = d[d.length - 1];
        _.deletions = kr([_.deletions, c.deleteSet]), _.insertions = kr([_.insertions, p]);
      } else
        d.push(new Dl(c.deleteSet, p)), w = !0;
      !h && !l && (this.lastChange = u), Te(
        c,
        c.deleteSet,
        /** @param {Item|GC} item */
        (_) => {
          _ instanceof lt && this.scope.some((y) => y === c.doc || En(
            /** @type {AbstractType<any>} */
            y,
            _
          )) && as(_, !0);
        }
      );
      const g = [{ stackItem: d[d.length - 1], origin: c.origin, type: h ? "redo" : "undo", changedParentTypes: c.changedParentTypes }, this];
      w ? this.emit("stack-item-added", g) : this.emit("stack-item-updated", g);
    }, this.doc.on("afterTransaction", this.afterTransactionHandler), this.doc.on("destroy", () => {
      this.destroy();
    });
  }
  /**
   * Extend the scope.
   *
   * @param {Array<AbstractType<any> | Doc> | AbstractType<any> | Doc} ytypes
   */
  addToScope(t) {
    const e = new Set(this.scope);
    t = xe(t) ? t : [t], t.forEach((r) => {
      e.has(r) || (e.add(r), (r instanceof bt ? r.doc !== this.doc : r !== this.doc) && Oi("[yjs#509] Not same Y.Doc"), this.scope.push(r));
    });
  }
  /**
   * @param {any} origin
   */
  addTrackedOrigin(t) {
    this.trackedOrigins.add(t);
  }
  /**
   * @param {any} origin
   */
  removeTrackedOrigin(t) {
    this.trackedOrigins.delete(t);
  }
  clear(t = !0, e = !0) {
    (t && this.canUndo() || e && this.canRedo()) && this.doc.transact((r) => {
      t && (this.undoStack.forEach((s) => Us(r, this, s)), this.undoStack = []), e && (this.redoStack.forEach((s) => Us(r, this, s)), this.redoStack = []), this.emit("stack-cleared", [{ undoStackCleared: t, redoStackCleared: e }]);
    });
  }
  /**
   * UndoManager merges Undo-StackItem if they are created within time-gap
   * smaller than `options.captureTimeout`. Call `um.stopCapturing()` so that the next
   * StackItem won't be merged.
   *
   *
   * @example
   *     // without stopCapturing
   *     ytext.insert(0, 'a')
   *     ytext.insert(1, 'b')
   *     um.undo()
   *     ytext.toString() // => '' (note that 'ab' was removed)
   *     // with stopCapturing
   *     ytext.insert(0, 'a')
   *     um.stopCapturing()
   *     ytext.insert(0, 'b')
   *     um.undo()
   *     ytext.toString() // => 'a' (note that only 'b' was removed)
   *
   */
  stopCapturing() {
    this.lastChange = 0;
  }
  /**
   * Undo last changes on type.
   *
   * @return {StackItem?} Returns StackItem if a change was applied
   */
  undo() {
    this.undoing = !0;
    let t;
    try {
      t = Ps(this, this.undoStack, "undo");
    } finally {
      this.undoing = !1;
    }
    return t;
  }
  /**
   * Redo last undo operation.
   *
   * @return {StackItem?} Returns StackItem if a change was applied
   */
  redo() {
    this.redoing = !0;
    let t;
    try {
      t = Ps(this, this.redoStack, "redo");
    } finally {
      this.redoing = !1;
    }
    return t;
  }
  /**
   * Are undo steps available?
   *
   * @return {boolean} `true` if undo is possible
   */
  canUndo() {
    return this.undoStack.length > 0;
  }
  /**
   * Are redo steps available?
   *
   * @return {boolean} `true` if redo is possible
   */
  canRedo() {
    return this.redoStack.length > 0;
  }
  destroy() {
    this.trackedOrigins.delete(this), this.doc.off("afterTransaction", this.afterTransactionHandler), super.destroy();
  }
}
function* Il(n) {
  const t = tt(n.restDecoder);
  for (let e = 0; e < t; e++) {
    const r = tt(n.restDecoder), s = n.readClient();
    let i = tt(n.restDecoder);
    for (let o = 0; o < r; o++) {
      const a = n.readInfo();
      if (a === 10) {
        const c = tt(n.restDecoder);
        yield new Rt(rt(s, i), c), i += c;
      } else if ((zn & a) !== 0) {
        const c = (a & (qt | At)) === 0, h = new lt(
          rt(s, i),
          null,
          // left
          (a & At) === At ? n.readLeftID() : null,
          // origin
          null,
          // right
          (a & qt) === qt ? n.readRightID() : null,
          // right origin
          // @ts-ignore Force writing a string here.
          c ? n.readParentInfo() ? n.readString() : n.readLeftID() : null,
          // parent
          c && (a & je) === je ? n.readString() : null,
          // parentSub
          ho(n, a)
          // item content
        );
        yield h, i += h.length;
      } else {
        const c = n.readLen();
        yield new Lt(rt(s, i), c), i += c;
      }
    }
  }
}
class ts {
  /**
   * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
   * @param {boolean} filterSkips
   */
  constructor(t, e) {
    this.gen = Il(t), this.curr = null, this.done = !1, this.filterSkips = e, this.next();
  }
  /**
   * @return {Item | GC | Skip |null}
   */
  next() {
    do
      this.curr = this.gen.next().value || null;
    while (this.filterSkips && this.curr !== null && this.curr.constructor === Rt);
    return this.curr;
  }
}
class es {
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  constructor(t) {
    this.currClient = 0, this.startClock = 0, this.written = 0, this.encoder = t, this.clientStructs = [];
  }
}
const Ol = (n) => Tn(n, Mi, tn), Ll = (n, t) => {
  if (n.constructor === Lt) {
    const { client: e, clock: r } = n.id;
    return new Lt(rt(e, r + t), n.length - t);
  } else if (n.constructor === Rt) {
    const { client: e, clock: r } = n.id;
    return new Rt(rt(e, r + t), n.length - t);
  } else {
    const e = (
      /** @type {Item} */
      n
    ), { client: r, clock: s } = e.id;
    return new lt(
      rt(r, s + t),
      null,
      rt(r, s + t - 1),
      null,
      e.rightOrigin,
      e.parent,
      e.parentSub,
      e.content.splice(t)
    );
  }
}, Tn = (n, t = De, e = le) => {
  if (n.length === 1)
    return n[0];
  const r = n.map((l) => new t(se(l)));
  let s = r.map((l) => new ts(l, !0)), i = null;
  const o = new e(), a = new es(o);
  for (; s = s.filter((p) => p.curr !== null), s.sort(
    /** @type {function(any,any):number} */
    (p, u) => {
      if (p.curr.id.client === u.curr.id.client) {
        const w = p.curr.id.clock - u.curr.id.clock;
        return w === 0 ? p.curr.constructor === u.curr.constructor ? 0 : p.curr.constructor === Rt ? 1 : -1 : w;
      } else
        return u.curr.id.client - p.curr.id.client;
    }
  ), s.length !== 0; ) {
    const l = s[0], d = (
      /** @type {Item | GC} */
      l.curr.id.client
    );
    if (i !== null) {
      let p = (
        /** @type {Item | GC | null} */
        l.curr
      ), u = !1;
      for (; p !== null && p.id.clock + p.length <= i.struct.id.clock + i.struct.length && p.id.client >= i.struct.id.client; )
        p = l.next(), u = !0;
      if (p === null || // current decoder is empty
      p.id.client !== d || // check whether there is another decoder that has has updates from `firstClient`
      u && p.id.clock > i.struct.id.clock + i.struct.length)
        continue;
      if (d !== i.struct.id.client)
        Jt(a, i.struct, i.offset), i = { struct: p, offset: 0 }, l.next();
      else if (i.struct.id.clock + i.struct.length < p.id.clock)
        if (i.struct.constructor === Rt)
          i.struct.length = p.id.clock + p.length - i.struct.id.clock;
        else {
          Jt(a, i.struct, i.offset);
          const w = p.id.clock - i.struct.id.clock - i.struct.length;
          i = { struct: new Rt(rt(d, i.struct.id.clock + i.struct.length), w), offset: 0 };
        }
      else {
        const w = i.struct.id.clock + i.struct.length - p.id.clock;
        w > 0 && (i.struct.constructor === Rt ? i.struct.length -= w : p = Ll(p, w)), i.struct.mergeWith(
          /** @type {any} */
          p
        ) || (Jt(a, i.struct, i.offset), i = { struct: p, offset: 0 }, l.next());
      }
    } else
      i = { struct: (
        /** @type {Item | GC} */
        l.curr
      ), offset: 0 }, l.next();
    for (let p = l.curr; p !== null && p.id.client === d && p.id.clock === i.struct.id.clock + i.struct.length && p.constructor !== Rt; p = l.next())
      Jt(a, i.struct, i.offset), i = { struct: p, offset: 0 };
  }
  i !== null && (Jt(a, i.struct, i.offset), i = null), ns(a);
  const c = r.map((l) => Kr(l)), h = kr(c);
  return Re(o, h), o.toUint8Array();
}, Rl = (n, t, e = De, r = le) => {
  const s = Fi(t), i = new r(), o = new es(i), a = new e(se(n)), c = new ts(a, !1);
  for (; c.curr; ) {
    const l = c.curr, d = l.id.client, p = s.get(d) || 0;
    if (c.curr.constructor === Rt) {
      c.next();
      continue;
    }
    if (l.id.clock + l.length > p)
      for (Jt(o, l, fe(p - l.id.clock, 0)), c.next(); c.curr && c.curr.id.client === d; )
        Jt(o, c.curr, 0), c.next();
    else
      for (; c.curr && c.curr.id.client === d && c.curr.id.clock + c.curr.length <= p; )
        c.next();
  }
  ns(o);
  const h = Kr(a);
  return Re(i, h), i.toUint8Array();
}, Yi = (n) => {
  n.written > 0 && (n.clientStructs.push({ written: n.written, restEncoder: ut(n.encoder.restEncoder) }), n.encoder.restEncoder = xt(), n.written = 0);
}, Jt = (n, t, e) => {
  n.written > 0 && n.currClient !== t.id.client && Yi(n), n.written === 0 && (n.currClient = t.id.client, n.encoder.writeClient(t.id.client), K(n.encoder.restEncoder, t.id.clock + e)), t.write(n.encoder, e), n.written++;
}, ns = (n) => {
  Yi(n);
  const t = n.encoder.restEncoder;
  K(t, n.clientStructs.length);
  for (let e = 0; e < n.clientStructs.length; e++) {
    const r = n.clientStructs[e];
    K(t, r.written), Mn(t, r.restEncoder);
  }
}, Nl = (n, t, e, r) => {
  const s = new e(se(n)), i = new ts(s, !1), o = new r(), a = new es(o);
  for (let h = i.curr; h !== null; h = i.next())
    Jt(a, t(h), 0);
  ns(a);
  const c = Kr(s);
  return Re(o, c), o.toUint8Array();
}, zl = (n) => Nl(n, tc, De, tn), Bs = "You must not compute changes after the event-handler fired.";
class Zn {
  /**
   * @param {T} target The changed type.
   * @param {Transaction} transaction
   */
  constructor(t, e) {
    this.target = t, this.currentTarget = t, this.transaction = e, this._changes = null, this._keys = null, this._delta = null, this._path = null;
  }
  /**
   * Computes the path from `y` to the changed type.
   *
   * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
   *
   * The following property holds:
   * @example
   *   let type = y
   *   event.path.forEach(dir => {
   *     type = type.get(dir)
   *   })
   *   type === event.target // => true
   */
  get path() {
    return this._path || (this._path = Ml(this.currentTarget, this.target));
  }
  /**
   * Check if a struct is deleted by this event.
   *
   * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
   *
   * @param {AbstractStruct} struct
   * @return {boolean}
   */
  deletes(t) {
    return Qe(this.transaction.deleteSet, t.id);
  }
  /**
   * @type {Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
   */
  get keys() {
    if (this._keys === null) {
      if (this.transaction.doc._transactionCleanups.length === 0)
        throw $t(Bs);
      const t = /* @__PURE__ */ new Map(), e = this.target;
      /** @type Set<string|null> */
      this.transaction.changed.get(e).forEach((s) => {
        if (s !== null) {
          const i = (
            /** @type {Item} */
            e._map.get(s)
          );
          let o, a;
          if (this.adds(i)) {
            let c = i.left;
            for (; c !== null && this.adds(c); )
              c = c.left;
            if (this.deletes(i))
              if (c !== null && this.deletes(c))
                o = "delete", a = Qn(c.content.getContent());
              else
                return;
            else
              c !== null && this.deletes(c) ? (o = "update", a = Qn(c.content.getContent())) : (o = "add", a = void 0);
          } else if (this.deletes(i))
            o = "delete", a = Qn(
              /** @type {Item} */
              i.content.getContent()
            );
          else
            return;
          t.set(s, { action: o, oldValue: a });
        }
      }), this._keys = t;
    }
    return this._keys;
  }
  /**
   * This is a computed property. Note that this can only be safely computed during the
   * event call. Computing this property after other changes happened might result in
   * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
   * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
   *
   * @type {Array<{insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
   */
  get delta() {
    return this.changes.delta;
  }
  /**
   * Check if a struct is added by this event.
   *
   * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
   *
   * @param {AbstractStruct} struct
   * @return {boolean}
   */
  adds(t) {
    return t.id.clock >= (this.transaction.beforeState.get(t.id.client) || 0);
  }
  /**
   * This is a computed property. Note that this can only be safely computed during the
   * event call. Computing this property after other changes happened might result in
   * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
   * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
   *
   * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
   */
  get changes() {
    let t = this._changes;
    if (t === null) {
      if (this.transaction.doc._transactionCleanups.length === 0)
        throw $t(Bs);
      const e = this.target, r = ee(), s = ee(), i = [];
      if (t = {
        added: r,
        deleted: s,
        delta: i,
        keys: this.keys
      }, /** @type Set<string|null> */
      this.transaction.changed.get(e).has(null)) {
        let a = null;
        const c = () => {
          a && i.push(a);
        };
        for (let h = e._start; h !== null; h = h.right)
          h.deleted ? this.deletes(h) && !this.adds(h) && ((a === null || a.delete === void 0) && (c(), a = { delete: 0 }), a.delete += h.length, s.add(h)) : this.adds(h) ? ((a === null || a.insert === void 0) && (c(), a = { insert: [] }), a.insert = a.insert.concat(h.content.getContent()), r.add(h)) : ((a === null || a.retain === void 0) && (c(), a = { retain: 0 }), a.retain += h.length);
        a !== null && a.retain === void 0 && c();
      }
      this._changes = t;
    }
    return (
      /** @type {any} */
      t
    );
  }
}
const Ml = (n, t) => {
  const e = [];
  for (; t._item !== null && t !== n; ) {
    if (t._item.parentSub !== null)
      e.unshift(t._item.parentSub);
    else {
      let r = 0, s = (
        /** @type {AbstractType<any>} */
        t._item.parent._start
      );
      for (; s !== t._item && s !== null; )
        !s.deleted && s.countable && (r += s.length), s = s.right;
      e.unshift(r);
    }
    t = /** @type {AbstractType<any>} */
    t._item.parent;
  }
  return e;
}, Ct = () => {
  Oi("Invalid access: Add Yjs type to a document before reading data.");
}, qi = 80;
let rs = 0;
class Ul {
  /**
   * @param {Item} p
   * @param {number} index
   */
  constructor(t, e) {
    t.marker = !0, this.p = t, this.index = e, this.timestamp = rs++;
  }
}
const Pl = (n) => {
  n.timestamp = rs++;
}, Gi = (n, t, e) => {
  n.p.marker = !1, n.p = t, t.marker = !0, n.index = e, n.timestamp = rs++;
}, Bl = (n, t, e) => {
  if (n.length >= qi) {
    const r = n.reduce((s, i) => s.timestamp < i.timestamp ? s : i);
    return Gi(r, t, e), r;
  } else {
    const r = new Ul(t, e);
    return n.push(r), r;
  }
}, Yn = (n, t) => {
  if (n._start === null || t === 0 || n._searchMarker === null)
    return null;
  const e = n._searchMarker.length === 0 ? null : n._searchMarker.reduce((i, o) => mn(t - i.index) < mn(t - o.index) ? i : o);
  let r = n._start, s = 0;
  for (e !== null && (r = e.p, s = e.index, Pl(e)); r.right !== null && s < t; ) {
    if (!r.deleted && r.countable) {
      if (t < s + r.length)
        break;
      s += r.length;
    }
    r = r.right;
  }
  for (; r.left !== null && s > t; )
    r = r.left, !r.deleted && r.countable && (s -= r.length);
  for (; r.left !== null && r.left.id.client === r.id.client && r.left.id.clock + r.left.length === r.id.clock; )
    r = r.left, !r.deleted && r.countable && (s -= r.length);
  return e !== null && mn(e.index - s) < /** @type {YText|YArray<any>} */
  r.parent.length / qi ? (Gi(e, r, s), e) : Bl(n._searchMarker, r, s);
}, qe = (n, t, e) => {
  for (let r = n.length - 1; r >= 0; r--) {
    const s = n[r];
    if (e > 0) {
      let i = s.p;
      for (i.marker = !1; i && (i.deleted || !i.countable); )
        i = i.left, i && !i.deleted && i.countable && (s.index -= i.length);
      if (i === null || i.marker === !0) {
        n.splice(r, 1);
        continue;
      }
      s.p = i, i.marker = !0;
    }
    (t < s.index || e > 0 && t === s.index) && (s.index = fe(t, s.index + e));
  }
}, qn = (n, t, e) => {
  const r = n, s = t.changedParentTypes;
  for (; Vt(s, n, () => []).push(e), n._item !== null; )
    n = /** @type {AbstractType<any>} */
    n._item.parent;
  $i(r._eH, e, t);
};
class bt {
  constructor() {
    this._item = null, this._map = /* @__PURE__ */ new Map(), this._start = null, this.doc = null, this._length = 0, this._eH = Os(), this._dEH = Os(), this._searchMarker = null;
  }
  /**
   * @return {AbstractType<any>|null}
   */
  get parent() {
    return this._item ? (
      /** @type {AbstractType<any>} */
      this._item.parent
    ) : null;
  }
  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item|null} item
   */
  _integrate(t, e) {
    this.doc = t, this._item = e;
  }
  /**
   * @return {AbstractType<EventType>}
   */
  _copy() {
    throw Mt();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {AbstractType<EventType>}
   */
  clone() {
    throw Mt();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} _encoder
   */
  _write(t) {
  }
  /**
   * The first non-deleted item
   */
  get _first() {
    let t = this._start;
    for (; t !== null && t.deleted; )
      t = t.right;
    return t;
  }
  /**
   * Creates YEvent and calls all type observers.
   * Must be implemented by each type.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    !t.local && this._searchMarker && (this._searchMarker.length = 0);
  }
  /**
   * Observe all events that are created on this type.
   *
   * @param {function(EventType, Transaction):void} f Observer function
   */
  observe(t) {
    Ls(this._eH, t);
  }
  /**
   * Observe all events that are created by this type and its children.
   *
   * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
   */
  observeDeep(t) {
    Ls(this._dEH, t);
  }
  /**
   * Unregister an observer function.
   *
   * @param {function(EventType,Transaction):void} f Observer function
   */
  unobserve(t) {
    Rs(this._eH, t);
  }
  /**
   * Unregister an observer function.
   *
   * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
   */
  unobserveDeep(t) {
    Rs(this._dEH, t);
  }
  /**
   * @abstract
   * @return {any}
   */
  toJSON() {
  }
}
const Ki = (n, t, e) => {
  n.doc ?? Ct(), t < 0 && (t = n._length + t), e < 0 && (e = n._length + e);
  let r = e - t;
  const s = [];
  let i = n._start;
  for (; i !== null && r > 0; ) {
    if (i.countable && !i.deleted) {
      const o = i.content.getContent();
      if (o.length <= t)
        t -= o.length;
      else {
        for (let a = t; a < o.length && r > 0; a++)
          s.push(o[a]), r--;
        t = 0;
      }
    }
    i = i.right;
  }
  return s;
}, Xi = (n) => {
  n.doc ?? Ct();
  const t = [];
  let e = n._start;
  for (; e !== null; ) {
    if (e.countable && !e.deleted) {
      const r = e.content.getContent();
      for (let s = 0; s < r.length; s++)
        t.push(r[s]);
    }
    e = e.right;
  }
  return t;
}, Ge = (n, t) => {
  let e = 0, r = n._start;
  for (n.doc ?? Ct(); r !== null; ) {
    if (r.countable && !r.deleted) {
      const s = r.content.getContent();
      for (let i = 0; i < s.length; i++)
        t(s[i], e++, n);
    }
    r = r.right;
  }
}, Ji = (n, t) => {
  const e = [];
  return Ge(n, (r, s) => {
    e.push(t(r, s, n));
  }), e;
}, Fl = (n) => {
  let t = n._start, e = null, r = 0;
  return {
    [Symbol.iterator]() {
      return this;
    },
    next: () => {
      if (e === null) {
        for (; t !== null && t.deleted; )
          t = t.right;
        if (t === null)
          return {
            done: !0,
            value: void 0
          };
        e = t.content.getContent(), r = 0, t = t.right;
      }
      const s = e[r++];
      return e.length <= r && (e = null), {
        done: !1,
        value: s
      };
    }
  };
}, Qi = (n, t) => {
  n.doc ?? Ct();
  const e = Yn(n, t);
  let r = n._start;
  for (e !== null && (r = e.p, t -= e.index); r !== null; r = r.right)
    if (!r.deleted && r.countable) {
      if (t < r.length)
        return r.content.getContent()[t];
      t -= r.length;
    }
}, Dn = (n, t, e, r) => {
  let s = e;
  const i = n.doc, o = i.clientID, a = i.store, c = e === null ? t._start : e.right;
  let h = [];
  const l = () => {
    h.length > 0 && (s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new de(h)), s.integrate(n, 0), h = []);
  };
  r.forEach((d) => {
    if (d === null)
      h.push(d);
    else
      switch (d.constructor) {
        case Number:
        case Object:
        case Boolean:
        case Array:
        case String:
          h.push(d);
          break;
        default:
          switch (l(), d.constructor) {
            case Uint8Array:
            case ArrayBuffer:
              s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new en(new Uint8Array(
                /** @type {Uint8Array} */
                d
              ))), s.integrate(n, 0);
              break;
            case pe:
              s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new nn(
                /** @type {Doc} */
                d
              )), s.integrate(n, 0);
              break;
            default:
              if (d instanceof bt)
                s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new Xt(d)), s.integrate(n, 0);
              else
                throw new Error("Unexpected content type in insert operation");
          }
      }
  }), l();
}, to = () => $t("Length exceeded!"), eo = (n, t, e, r) => {
  if (e > t._length)
    throw to();
  if (e === 0)
    return t._searchMarker && qe(t._searchMarker, e, r.length), Dn(n, t, null, r);
  const s = e, i = Yn(t, e);
  let o = t._start;
  for (i !== null && (o = i.p, e -= i.index, e === 0 && (o = o.prev, e += o && o.countable && !o.deleted ? o.length : 0)); o !== null; o = o.right)
    if (!o.deleted && o.countable) {
      if (e <= o.length) {
        e < o.length && Tt(n, rt(o.id.client, o.id.clock + e));
        break;
      }
      e -= o.length;
    }
  return t._searchMarker && qe(t._searchMarker, s, r.length), Dn(n, t, o, r);
}, jl = (n, t, e) => {
  let s = (t._searchMarker || []).reduce((i, o) => o.index > i.index ? o : i, { index: 0, p: t._start }).p;
  if (s)
    for (; s.right; )
      s = s.right;
  return Dn(n, t, s, e);
}, no = (n, t, e, r) => {
  if (r === 0)
    return;
  const s = e, i = r, o = Yn(t, e);
  let a = t._start;
  for (o !== null && (a = o.p, e -= o.index); a !== null && e > 0; a = a.right)
    !a.deleted && a.countable && (e < a.length && Tt(n, rt(a.id.client, a.id.clock + e)), e -= a.length);
  for (; r > 0 && a !== null; )
    a.deleted || (r < a.length && Tt(n, rt(a.id.client, a.id.clock + r)), a.delete(n), r -= a.length), a = a.right;
  if (r > 0)
    throw to();
  t._searchMarker && qe(
    t._searchMarker,
    s,
    -i + r
    /* in case we remove the above exception */
  );
}, An = (n, t, e) => {
  const r = t._map.get(e);
  r !== void 0 && r.delete(n);
}, ss = (n, t, e, r) => {
  const s = t._map.get(e) || null, i = n.doc, o = i.clientID;
  let a;
  if (r == null)
    a = new de([r]);
  else
    switch (r.constructor) {
      case Number:
      case Object:
      case Boolean:
      case Array:
      case String:
      case Date:
      case BigInt:
        a = new de([r]);
        break;
      case Uint8Array:
        a = new en(
          /** @type {Uint8Array} */
          r
        );
        break;
      case pe:
        a = new nn(
          /** @type {Doc} */
          r
        );
        break;
      default:
        if (r instanceof bt)
          a = new Xt(r);
        else
          throw new Error("Unexpected content type");
    }
  new lt(rt(o, mt(i.store, o)), s, s && s.lastId, null, null, t, e, a).integrate(n, 0);
}, is = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted ? e.content.getContent()[e.length - 1] : void 0;
}, ro = (n) => {
  const t = {};
  return n.doc ?? Ct(), n._map.forEach((e, r) => {
    e.deleted || (t[r] = e.content.getContent()[e.length - 1]);
  }), t;
}, so = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted;
}, $l = (n, t) => {
  const e = {};
  return n._map.forEach((r, s) => {
    let i = r;
    for (; i !== null && (!t.sv.has(i.id.client) || i.id.clock >= (t.sv.get(i.id.client) || 0)); )
      i = i.left;
    i !== null && we(i, t) && (e[s] = i.content.getContent()[i.length - 1]);
  }), e;
}, hn = (n) => (n.doc ?? Ct(), il(
  n._map.entries(),
  /** @param {any} entry */
  (t) => !t[1].deleted
));
class Hl extends Zn {
}
class ve extends bt {
  constructor() {
    super(), this._prelimContent = [], this._searchMarker = [];
  }
  /**
   * Construct a new YArray containing the specified items.
   * @template {Object<string,any>|Array<any>|number|null|string|Uint8Array} T
   * @param {Array<T>} items
   * @return {YArray<T>}
   */
  static from(t) {
    const e = new ve();
    return e.push(t), e;
  }
  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item} item
   */
  _integrate(t, e) {
    super._integrate(t, e), this.insert(
      0,
      /** @type {Array<any>} */
      this._prelimContent
    ), this._prelimContent = null;
  }
  /**
   * @return {YArray<T>}
   */
  _copy() {
    return new ve();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YArray<T>}
   */
  clone() {
    const t = new ve();
    return t.insert(0, this.toArray().map(
      (e) => e instanceof bt ? (
        /** @type {typeof el} */
        e.clone()
      ) : e
    )), t;
  }
  get length() {
    return this.doc ?? Ct(), this._length;
  }
  /**
   * Creates YArrayEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    super._callObserver(t, e), qn(this, t, new Hl(this, t));
  }
  /**
   * Inserts new content at an index.
   *
   * Important: This function expects an array of content. Not just a content
   * object. The reason for this "weirdness" is that inserting several elements
   * is very efficient when it is done as a single operation.
   *
   * @example
   *  // Insert character 'a' at position 0
   *  yarray.insert(0, ['a'])
   *  // Insert numbers 1, 2 at position 1
   *  yarray.insert(1, [1, 2])
   *
   * @param {number} index The index to insert content at.
   * @param {Array<T>} content The array of content
   */
  insert(t, e) {
    this.doc !== null ? at(this.doc, (r) => {
      eo(
        r,
        this,
        t,
        /** @type {any} */
        e
      );
    }) : this._prelimContent.splice(t, 0, ...e);
  }
  /**
   * Appends content to this YArray.
   *
   * @param {Array<T>} content Array of content to append.
   *
   * @todo Use the following implementation in all types.
   */
  push(t) {
    this.doc !== null ? at(this.doc, (e) => {
      jl(
        e,
        this,
        /** @type {any} */
        t
      );
    }) : this._prelimContent.push(...t);
  }
  /**
   * Prepends content to this YArray.
   *
   * @param {Array<T>} content Array of content to prepend.
   */
  unshift(t) {
    this.insert(0, t);
  }
  /**
   * Deletes elements starting from an index.
   *
   * @param {number} index Index at which to start deleting elements
   * @param {number} length The number of elements to remove. Defaults to 1.
   */
  delete(t, e = 1) {
    this.doc !== null ? at(this.doc, (r) => {
      no(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Returns the i-th element from a YArray.
   *
   * @param {number} index The index of the element to return from the YArray
   * @return {T}
   */
  get(t) {
    return Qi(this, t);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<T>}
   */
  toArray() {
    return Xi(this);
  }
  /**
   * Returns a portion of this YArray into a JavaScript Array selected
   * from start to end (end not included).
   *
   * @param {number} [start]
   * @param {number} [end]
   * @return {Array<T>}
   */
  slice(t = 0, e = this.length) {
    return Ki(this, t, e);
  }
  /**
   * Transforms this Shared Type to a JSON object.
   *
   * @return {Array<any>}
   */
  toJSON() {
    return this.map((t) => t instanceof bt ? t.toJSON() : t);
  }
  /**
   * Returns an Array with the result of calling a provided function on every
   * element of this YArray.
   *
   * @template M
   * @param {function(T,number,YArray<T>):M} f Function that produces an element of the new Array
   * @return {Array<M>} A new array with each element being the result of the
   *                 callback function
   */
  map(t) {
    return Ji(
      this,
      /** @type {any} */
      t
    );
  }
  /**
   * Executes a provided function once on every element of this YArray.
   *
   * @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
   */
  forEach(t) {
    Ge(this, t);
  }
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return Fl(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(pu);
  }
}
const Wl = (n) => new ve();
class Vl extends Zn {
  /**
   * @param {YMap<T>} ymap The YArray that changed.
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed.
   */
  constructor(t, e, r) {
    super(t, e), this.keysChanged = r;
  }
}
class Ae extends bt {
  /**
   *
   * @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
   */
  constructor(t) {
    super(), this._prelimContent = null, t === void 0 ? this._prelimContent = /* @__PURE__ */ new Map() : this._prelimContent = new Map(t);
  }
  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item} item
   */
  _integrate(t, e) {
    super._integrate(t, e), this._prelimContent.forEach((r, s) => {
      this.set(s, r);
    }), this._prelimContent = null;
  }
  /**
   * @return {YMap<MapType>}
   */
  _copy() {
    return new Ae();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YMap<MapType>}
   */
  clone() {
    const t = new Ae();
    return this.forEach((e, r) => {
      t.set(r, e instanceof bt ? (
        /** @type {typeof value} */
        e.clone()
      ) : e);
    }), t;
  }
  /**
   * Creates YMapEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    qn(this, t, new Vl(this, t, e));
  }
  /**
   * Transforms this Shared Type to a JSON object.
   *
   * @return {Object<string,any>}
   */
  toJSON() {
    this.doc ?? Ct();
    const t = {};
    return this._map.forEach((e, r) => {
      if (!e.deleted) {
        const s = e.content.getContent()[e.length - 1];
        t[r] = s instanceof bt ? s.toJSON() : s;
      }
    }), t;
  }
  /**
   * Returns the size of the YMap (count of key/value pairs)
   *
   * @return {number}
   */
  get size() {
    return [...hn(this)].length;
  }
  /**
   * Returns the keys for each element in the YMap Type.
   *
   * @return {IterableIterator<string>}
   */
  keys() {
    return or(
      hn(this),
      /** @param {any} v */
      (t) => t[0]
    );
  }
  /**
   * Returns the values for each element in the YMap Type.
   *
   * @return {IterableIterator<MapType>}
   */
  values() {
    return or(
      hn(this),
      /** @param {any} v */
      (t) => t[1].content.getContent()[t[1].length - 1]
    );
  }
  /**
   * Returns an Iterator of [key, value] pairs
   *
   * @return {IterableIterator<[string, MapType]>}
   */
  entries() {
    return or(
      hn(this),
      /** @param {any} v */
      (t) => (
        /** @type {any} */
        [t[0], t[1].content.getContent()[t[1].length - 1]]
      )
    );
  }
  /**
   * Executes a provided function on once on every key-value pair.
   *
   * @param {function(MapType,string,YMap<MapType>):void} f A function to execute on every element of this YArray.
   */
  forEach(t) {
    this.doc ?? Ct(), this._map.forEach((e, r) => {
      e.deleted || t(e.content.getContent()[e.length - 1], r, this);
    });
  }
  /**
   * Returns an Iterator of [key, value] pairs
   *
   * @return {IterableIterator<[string, MapType]>}
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Remove a specified element from this YMap.
   *
   * @param {string} key The key of the element to remove.
   */
  delete(t) {
    this.doc !== null ? at(this.doc, (e) => {
      An(e, this, t);
    }) : this._prelimContent.delete(t);
  }
  /**
   * Adds or updates an element with a specified key and value.
   * @template {MapType} VAL
   *
   * @param {string} key The key of the element to add to this YMap
   * @param {VAL} value The value of the element to add
   * @return {VAL}
   */
  set(t, e) {
    return this.doc !== null ? at(this.doc, (r) => {
      ss(
        r,
        this,
        t,
        /** @type {any} */
        e
      );
    }) : this._prelimContent.set(t, e), e;
  }
  /**
   * Returns a specified element from this YMap.
   *
   * @param {string} key
   * @return {MapType|undefined}
   */
  get(t) {
    return (
      /** @type {any} */
      is(this, t)
    );
  }
  /**
   * Returns a boolean indicating whether the specified key exists or not.
   *
   * @param {string} key The key to test.
   * @return {boolean}
   */
  has(t) {
    return so(this, t);
  }
  /**
   * Removes all elements from this YMap.
   */
  clear() {
    this.doc !== null ? at(this.doc, (t) => {
      this.forEach(function(e, r, s) {
        An(t, s, r);
      });
    }) : this._prelimContent.clear();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(gu);
  }
}
const Zl = (n) => new Ae(), Qt = (n, t) => n === t || typeof n == "object" && typeof t == "object" && n && t && Ja(n, t);
class xr {
  /**
   * @param {Item|null} left
   * @param {Item|null} right
   * @param {number} index
   * @param {Map<string,any>} currentAttributes
   */
  constructor(t, e, r, s) {
    this.left = t, this.right = e, this.index = r, this.currentAttributes = s;
  }
  /**
   * Only call this if you know that this.right is defined
   */
  forward() {
    this.right === null && Nt(), this.right.content.constructor === wt ? this.right.deleted || Ne(
      this.currentAttributes,
      /** @type {ContentFormat} */
      this.right.content
    ) : this.right.deleted || (this.index += this.right.length), this.left = this.right, this.right = this.right.right;
  }
}
const Fs = (n, t, e) => {
  for (; t.right !== null && e > 0; )
    t.right.content.constructor === wt ? t.right.deleted || Ne(
      t.currentAttributes,
      /** @type {ContentFormat} */
      t.right.content
    ) : t.right.deleted || (e < t.right.length && Tt(n, rt(t.right.id.client, t.right.id.clock + e)), t.index += t.right.length, e -= t.right.length), t.left = t.right, t.right = t.right.right;
  return t;
}, dn = (n, t, e, r) => {
  const s = /* @__PURE__ */ new Map(), i = r ? Yn(t, e) : null;
  if (i) {
    const o = new xr(i.p.left, i.p, i.index, s);
    return Fs(n, o, e - i.index);
  } else {
    const o = new xr(null, t._start, 0, s);
    return Fs(n, o, e);
  }
}, io = (n, t, e, r) => {
  for (; e.right !== null && (e.right.deleted === !0 || e.right.content.constructor === wt && Qt(
    r.get(
      /** @type {ContentFormat} */
      e.right.content.key
    ),
    /** @type {ContentFormat} */
    e.right.content.value
  )); )
    e.right.deleted || r.delete(
      /** @type {ContentFormat} */
      e.right.content.key
    ), e.forward();
  const s = n.doc, i = s.clientID;
  r.forEach((o, a) => {
    const c = e.left, h = e.right, l = new lt(rt(i, mt(s.store, i)), c, c && c.lastId, h, h && h.id, t, null, new wt(a, o));
    l.integrate(n, 0), e.right = l, e.forward();
  });
}, Ne = (n, t) => {
  const { key: e, value: r } = t;
  r === null ? n.delete(e) : n.set(e, r);
}, oo = (n, t) => {
  for (; n.right !== null; ) {
    if (!(n.right.deleted || n.right.content.constructor === wt && Qt(
      t[
        /** @type {ContentFormat} */
        n.right.content.key
      ] ?? null,
      /** @type {ContentFormat} */
      n.right.content.value
    ))) break;
    n.forward();
  }
}, ao = (n, t, e, r) => {
  const s = n.doc, i = s.clientID, o = /* @__PURE__ */ new Map();
  for (const a in r) {
    const c = r[a], h = e.currentAttributes.get(a) ?? null;
    if (!Qt(h, c)) {
      o.set(a, h);
      const { left: l, right: d } = e;
      e.right = new lt(rt(i, mt(s.store, i)), l, l && l.lastId, d, d && d.id, t, null, new wt(a, c)), e.right.integrate(n, 0), e.forward();
    }
  }
  return o;
}, ar = (n, t, e, r, s) => {
  e.currentAttributes.forEach((p, u) => {
    s[u] === void 0 && (s[u] = null);
  });
  const i = n.doc, o = i.clientID;
  oo(e, s);
  const a = ao(n, t, e, s), c = r.constructor === String ? new Wt(
    /** @type {string} */
    r
  ) : r instanceof bt ? new Xt(r) : new ge(r);
  let { left: h, right: l, index: d } = e;
  t._searchMarker && qe(t._searchMarker, e.index, c.getLength()), l = new lt(rt(o, mt(i.store, o)), h, h && h.lastId, l, l && l.id, t, null, c), l.integrate(n, 0), e.right = l, e.index = d, e.forward(), io(n, t, e, a);
}, js = (n, t, e, r, s) => {
  const i = n.doc, o = i.clientID;
  oo(e, s);
  const a = ao(n, t, e, s);
  t: for (; e.right !== null && (r > 0 || a.size > 0 && (e.right.deleted || e.right.content.constructor === wt)); ) {
    if (!e.right.deleted)
      switch (e.right.content.constructor) {
        case wt: {
          const { key: c, value: h } = (
            /** @type {ContentFormat} */
            e.right.content
          ), l = s[c];
          if (l !== void 0) {
            if (Qt(l, h))
              a.delete(c);
            else {
              if (r === 0)
                break t;
              a.set(c, h);
            }
            e.right.delete(n);
          } else
            e.currentAttributes.set(c, h);
          break;
        }
        default:
          r < e.right.length && Tt(n, rt(e.right.id.client, e.right.id.clock + r)), r -= e.right.length;
          break;
      }
    e.forward();
  }
  if (r > 0) {
    let c = "";
    for (; r > 0; r--)
      c += `
`;
    e.right = new lt(rt(o, mt(i.store, o)), e.left, e.left && e.left.lastId, e.right, e.right && e.right.id, t, null, new Wt(c)), e.right.integrate(n, 0), e.forward();
  }
  io(n, t, e, a);
}, co = (n, t, e, r, s) => {
  let i = t;
  const o = Dt();
  for (; i && (!i.countable || i.deleted); ) {
    if (!i.deleted && i.content.constructor === wt) {
      const h = (
        /** @type {ContentFormat} */
        i.content
      );
      o.set(h.key, h);
    }
    i = i.right;
  }
  let a = 0, c = !1;
  for (; t !== i; ) {
    if (e === t && (c = !0), !t.deleted) {
      const h = t.content;
      if (h.constructor === wt) {
        const { key: l, value: d } = (
          /** @type {ContentFormat} */
          h
        ), p = r.get(l) ?? null;
        (o.get(l) !== h || p === d) && (t.delete(n), a++, !c && (s.get(l) ?? null) === d && p !== d && (p === null ? s.delete(l) : s.set(l, p))), !c && !t.deleted && Ne(
          s,
          /** @type {ContentFormat} */
          h
        );
      }
    }
    t = /** @type {Item} */
    t.right;
  }
  return a;
}, Yl = (n, t) => {
  for (; t && t.right && (t.right.deleted || !t.right.countable); )
    t = t.right;
  const e = /* @__PURE__ */ new Set();
  for (; t && (t.deleted || !t.countable); ) {
    if (!t.deleted && t.content.constructor === wt) {
      const r = (
        /** @type {ContentFormat} */
        t.content.key
      );
      e.has(r) ? t.delete(n) : e.add(r);
    }
    t = t.left;
  }
}, ql = (n) => {
  let t = 0;
  return at(
    /** @type {Doc} */
    n.doc,
    (e) => {
      let r = (
        /** @type {Item} */
        n._start
      ), s = n._start, i = Dt();
      const o = gr(i);
      for (; s; )
        s.deleted === !1 && (s.content.constructor === wt ? Ne(
          o,
          /** @type {ContentFormat} */
          s.content
        ) : (t += co(e, r, s, i, o), i = gr(o), r = s)), s = s.right;
    }
  ), t;
}, Gl = (n) => {
  const t = /* @__PURE__ */ new Set(), e = n.doc;
  for (const [r, s] of n.afterState.entries()) {
    const i = n.beforeState.get(r) || 0;
    s !== i && Vi(
      n,
      /** @type {Array<Item|GC>} */
      e.store.clients.get(r),
      i,
      s,
      (o) => {
        !o.deleted && /** @type {Item} */
        o.content.constructor === wt && o.constructor !== Lt && t.add(
          /** @type {any} */
          o.parent
        );
      }
    );
  }
  at(e, (r) => {
    Te(n, n.deleteSet, (s) => {
      if (s instanceof Lt || !/** @type {YText} */
      s.parent._hasFormatting || t.has(
        /** @type {YText} */
        s.parent
      ))
        return;
      const i = (
        /** @type {YText} */
        s.parent
      );
      s.content.constructor === wt ? t.add(i) : Yl(r, s);
    });
    for (const s of t)
      ql(s);
  });
}, $s = (n, t, e) => {
  const r = e, s = gr(t.currentAttributes), i = t.right;
  for (; e > 0 && t.right !== null; ) {
    if (t.right.deleted === !1)
      switch (t.right.content.constructor) {
        case Xt:
        case ge:
        case Wt:
          e < t.right.length && Tt(n, rt(t.right.id.client, t.right.id.clock + e)), e -= t.right.length, t.right.delete(n);
          break;
      }
    t.forward();
  }
  i && co(n, i, t.right, s, t.currentAttributes);
  const o = (
    /** @type {AbstractType<any>} */
    /** @type {Item} */
    (t.left || t.right).parent
  );
  return o._searchMarker && qe(o._searchMarker, t.index, -r + e), t;
};
class Kl extends Zn {
  /**
   * @param {YText} ytext
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed
   */
  constructor(t, e, r) {
    super(t, e), this.childListChanged = !1, this.keysChanged = /* @__PURE__ */ new Set(), r.forEach((s) => {
      s === null ? this.childListChanged = !0 : this.keysChanged.add(s);
    });
  }
  /**
   * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
   */
  get changes() {
    if (this._changes === null) {
      const t = {
        keys: this.keys,
        delta: this.delta,
        added: /* @__PURE__ */ new Set(),
        deleted: /* @__PURE__ */ new Set()
      };
      this._changes = t;
    }
    return (
      /** @type {any} */
      this._changes
    );
  }
  /**
   * Compute the changes in the delta format.
   * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
   *
   * @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
   *
   * @public
   */
  get delta() {
    if (this._delta === null) {
      const t = (
        /** @type {Doc} */
        this.target.doc
      ), e = [];
      at(t, (r) => {
        const s = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
        let o = this.target._start, a = null;
        const c = {};
        let h = "", l = 0, d = 0;
        const p = () => {
          if (a !== null) {
            let u = null;
            switch (a) {
              case "delete":
                d > 0 && (u = { delete: d }), d = 0;
                break;
              case "insert":
                (typeof h == "object" || h.length > 0) && (u = { insert: h }, s.size > 0 && (u.attributes = {}, s.forEach((w, g) => {
                  w !== null && (u.attributes[g] = w);
                }))), h = "";
                break;
              case "retain":
                l > 0 && (u = { retain: l }, Xa(c) || (u.attributes = Ya({}, c))), l = 0;
                break;
            }
            u && e.push(u), a = null;
          }
        };
        for (; o !== null; ) {
          switch (o.content.constructor) {
            case Xt:
            case ge:
              this.adds(o) ? this.deletes(o) || (p(), a = "insert", h = o.content.getContent()[0], p()) : this.deletes(o) ? (a !== "delete" && (p(), a = "delete"), d += 1) : o.deleted || (a !== "retain" && (p(), a = "retain"), l += 1);
              break;
            case Wt:
              this.adds(o) ? this.deletes(o) || (a !== "insert" && (p(), a = "insert"), h += /** @type {ContentString} */
              o.content.str) : this.deletes(o) ? (a !== "delete" && (p(), a = "delete"), d += o.length) : o.deleted || (a !== "retain" && (p(), a = "retain"), l += o.length);
              break;
            case wt: {
              const { key: u, value: w } = (
                /** @type {ContentFormat} */
                o.content
              );
              if (this.adds(o)) {
                if (!this.deletes(o)) {
                  const g = s.get(u) ?? null;
                  Qt(g, w) ? w !== null && o.delete(r) : (a === "retain" && p(), Qt(w, i.get(u) ?? null) ? delete c[u] : c[u] = w);
                }
              } else if (this.deletes(o)) {
                i.set(u, w);
                const g = s.get(u) ?? null;
                Qt(g, w) || (a === "retain" && p(), c[u] = g);
              } else if (!o.deleted) {
                i.set(u, w);
                const g = c[u];
                g !== void 0 && (Qt(g, w) ? g !== null && o.delete(r) : (a === "retain" && p(), w === null ? delete c[u] : c[u] = w));
              }
              o.deleted || (a === "insert" && p(), Ne(
                s,
                /** @type {ContentFormat} */
                o.content
              ));
              break;
            }
          }
          o = o.right;
        }
        for (p(); e.length > 0; ) {
          const u = e[e.length - 1];
          if (u.retain !== void 0 && u.attributes === void 0)
            e.pop();
          else
            break;
        }
      }), this._delta = e;
    }
    return (
      /** @type {any} */
      this._delta
    );
  }
}
class ue extends bt {
  /**
   * @param {String} [string] The initial value of the YText.
   */
  constructor(t) {
    super(), this._pending = t !== void 0 ? [() => this.insert(0, t)] : [], this._searchMarker = [], this._hasFormatting = !1;
  }
  /**
   * Number of characters of this text type.
   *
   * @type {number}
   */
  get length() {
    return this.doc ?? Ct(), this._length;
  }
  /**
   * @param {Doc} y
   * @param {Item} item
   */
  _integrate(t, e) {
    super._integrate(t, e);
    try {
      this._pending.forEach((r) => r());
    } catch (r) {
      console.error(r);
    }
    this._pending = null;
  }
  _copy() {
    return new ue();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YText}
   */
  clone() {
    const t = new ue();
    return t.applyDelta(this.toDelta()), t;
  }
  /**
   * Creates YTextEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    super._callObserver(t, e);
    const r = new Kl(this, t, e);
    qn(this, t, r), !t.local && this._hasFormatting && (t._needFormattingCleanup = !0);
  }
  /**
   * Returns the unformatted string representation of this YText type.
   *
   * @public
   */
  toString() {
    this.doc ?? Ct();
    let t = "", e = this._start;
    for (; e !== null; )
      !e.deleted && e.countable && e.content.constructor === Wt && (t += /** @type {ContentString} */
      e.content.str), e = e.right;
    return t;
  }
  /**
   * Returns the unformatted string representation of this YText type.
   *
   * @return {string}
   * @public
   */
  toJSON() {
    return this.toString();
  }
  /**
   * Apply a {@link Delta} on this shared YText type.
   *
   * @param {Array<any>} delta The changes to apply on this element.
   * @param {object}  opts
   * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
   *
   *
   * @public
   */
  applyDelta(t, { sanitize: e = !0 } = {}) {
    this.doc !== null ? at(this.doc, (r) => {
      const s = new xr(null, this._start, 0, /* @__PURE__ */ new Map());
      for (let i = 0; i < t.length; i++) {
        const o = t[i];
        if (o.insert !== void 0) {
          const a = !e && typeof o.insert == "string" && i === t.length - 1 && s.right === null && o.insert.slice(-1) === `
` ? o.insert.slice(0, -1) : o.insert;
          (typeof a != "string" || a.length > 0) && ar(r, this, s, a, o.attributes || {});
        } else o.retain !== void 0 ? js(r, this, s, o.retain, o.attributes || {}) : o.delete !== void 0 && $s(r, s, o.delete);
      }
    }) : this._pending.push(() => this.applyDelta(t));
  }
  /**
   * Returns the Delta representation of this YText type.
   *
   * @param {Snapshot} [snapshot]
   * @param {Snapshot} [prevSnapshot]
   * @param {function('removed' | 'added', ID):any} [computeYChange]
   * @return {any} The Delta representation of this type.
   *
   * @public
   */
  toDelta(t, e, r) {
    this.doc ?? Ct();
    const s = [], i = /* @__PURE__ */ new Map(), o = (
      /** @type {Doc} */
      this.doc
    );
    let a = "", c = this._start;
    function h() {
      if (a.length > 0) {
        const d = {};
        let p = !1;
        i.forEach((w, g) => {
          p = !0, d[g] = w;
        });
        const u = { insert: a };
        p && (u.attributes = d), s.push(u), a = "";
      }
    }
    const l = () => {
      for (; c !== null; ) {
        if (we(c, t) || e !== void 0 && we(c, e))
          switch (c.content.constructor) {
            case Wt: {
              const d = i.get("ychange");
              t !== void 0 && !we(c, t) ? (d === void 0 || d.user !== c.id.client || d.type !== "removed") && (h(), i.set("ychange", r ? r("removed", c.id) : { type: "removed" })) : e !== void 0 && !we(c, e) ? (d === void 0 || d.user !== c.id.client || d.type !== "added") && (h(), i.set("ychange", r ? r("added", c.id) : { type: "added" })) : d !== void 0 && (h(), i.delete("ychange")), a += /** @type {ContentString} */
              c.content.str;
              break;
            }
            case Xt:
            case ge: {
              h();
              const d = {
                insert: c.content.getContent()[0]
              };
              if (i.size > 0) {
                const p = (
                  /** @type {Object<string,any>} */
                  {}
                );
                d.attributes = p, i.forEach((u, w) => {
                  p[w] = u;
                });
              }
              s.push(d);
              break;
            }
            case wt:
              we(c, t) && (h(), Ne(
                i,
                /** @type {ContentFormat} */
                c.content
              ));
              break;
          }
        c = c.right;
      }
      h();
    };
    return t || e ? at(o, (d) => {
      t && vr(d, t), e && vr(d, e), l();
    }, "cleanup") : l(), s;
  }
  /**
   * Insert text at a given index.
   *
   * @param {number} index The index at which to start inserting.
   * @param {String} text The text to insert at the specified position.
   * @param {TextAttributes} [attributes] Optionally define some formatting
   *                                    information to apply on the inserted
   *                                    Text.
   * @public
   */
  insert(t, e, r) {
    if (e.length <= 0)
      return;
    const s = this.doc;
    s !== null ? at(s, (i) => {
      const o = dn(i, this, t, !r);
      r || (r = {}, o.currentAttributes.forEach((a, c) => {
        r[c] = a;
      })), ar(i, this, o, e, r);
    }) : this._pending.push(() => this.insert(t, e, r));
  }
  /**
   * Inserts an embed at a index.
   *
   * @param {number} index The index to insert the embed at.
   * @param {Object | AbstractType<any>} embed The Object that represents the embed.
   * @param {TextAttributes} [attributes] Attribute information to apply on the
   *                                    embed
   *
   * @public
   */
  insertEmbed(t, e, r) {
    const s = this.doc;
    s !== null ? at(s, (i) => {
      const o = dn(i, this, t, !r);
      ar(i, this, o, e, r || {});
    }) : this._pending.push(() => this.insertEmbed(t, e, r || {}));
  }
  /**
   * Deletes text starting from an index.
   *
   * @param {number} index Index at which to start deleting.
   * @param {number} length The number of characters to remove. Defaults to 1.
   *
   * @public
   */
  delete(t, e) {
    if (e === 0)
      return;
    const r = this.doc;
    r !== null ? at(r, (s) => {
      $s(s, dn(s, this, t, !0), e);
    }) : this._pending.push(() => this.delete(t, e));
  }
  /**
   * Assigns properties to a range of text.
   *
   * @param {number} index The position where to start formatting.
   * @param {number} length The amount of characters to assign properties to.
   * @param {TextAttributes} attributes Attribute information to apply on the
   *                                    text.
   *
   * @public
   */
  format(t, e, r) {
    if (e === 0)
      return;
    const s = this.doc;
    s !== null ? at(s, (i) => {
      const o = dn(i, this, t, !1);
      o.right !== null && js(i, this, o, e, r);
    }) : this._pending.push(() => this.format(t, e, r));
  }
  /**
   * Removes an attribute.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @param {String} attributeName The attribute name that is to be removed.
   *
   * @public
   */
  removeAttribute(t) {
    this.doc !== null ? at(this.doc, (e) => {
      An(e, this, t);
    }) : this._pending.push(() => this.removeAttribute(t));
  }
  /**
   * Sets or updates an attribute.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @param {String} attributeName The attribute name that is to be set.
   * @param {any} attributeValue The attribute value that is to be set.
   *
   * @public
   */
  setAttribute(t, e) {
    this.doc !== null ? at(this.doc, (r) => {
      ss(r, this, t, e);
    }) : this._pending.push(() => this.setAttribute(t, e));
  }
  /**
   * Returns an attribute value that belongs to the attribute name.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @param {String} attributeName The attribute name that identifies the
   *                               queried value.
   * @return {any} The queried attribute value.
   *
   * @public
   */
  getAttribute(t) {
    return (
      /** @type {any} */
      is(this, t)
    );
  }
  /**
   * Returns all attribute name/value pairs in a JSON Object.
   *
   * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
   *
   * @return {Object<string, any>} A JSON Object that describes the attributes.
   *
   * @public
   */
  getAttributes() {
    return ro(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(mu);
  }
}
const Xl = (n) => new ue();
class cr {
  /**
   * @param {YXmlFragment | YXmlElement} root
   * @param {function(AbstractType<any>):boolean} [f]
   */
  constructor(t, e = () => !0) {
    this._filter = e, this._root = t, this._currentNode = /** @type {Item} */
    t._start, this._firstCall = !0, t.doc ?? Ct();
  }
  [Symbol.iterator]() {
    return this;
  }
  /**
   * Get the next node.
   *
   * @return {IteratorResult<YXmlElement|YXmlText|YXmlHook>} The next node.
   *
   * @public
   */
  next() {
    let t = this._currentNode, e = t && t.content && /** @type {any} */
    t.content.type;
    if (t !== null && (!this._firstCall || t.deleted || !this._filter(e)))
      do
        if (e = /** @type {any} */
        t.content.type, !t.deleted && (e.constructor === Ie || e.constructor === he) && e._start !== null)
          t = e._start;
        else
          for (; t !== null; ) {
            const r = t.next;
            if (r !== null) {
              t = r;
              break;
            } else t.parent === this._root ? t = null : t = /** @type {AbstractType<any>} */
            t.parent._item;
          }
      while (t !== null && (t.deleted || !this._filter(
        /** @type {ContentType} */
        t.content.type
      )));
    return this._firstCall = !1, t === null ? { value: void 0, done: !0 } : (this._currentNode = t, { value: (
      /** @type {any} */
      t.content.type
    ), done: !1 });
  }
}
class he extends bt {
  constructor() {
    super(), this._prelimContent = [];
  }
  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get firstChild() {
    const t = this._first;
    return t ? t.content.getContent()[0] : null;
  }
  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item} item
   */
  _integrate(t, e) {
    super._integrate(t, e), this.insert(
      0,
      /** @type {Array<any>} */
      this._prelimContent
    ), this._prelimContent = null;
  }
  _copy() {
    return new he();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlFragment}
   */
  clone() {
    const t = new he();
    return t.insert(0, this.toArray().map((e) => e instanceof bt ? e.clone() : e)), t;
  }
  get length() {
    return this.doc ?? Ct(), this._prelimContent === null ? this._length : this._prelimContent.length;
  }
  /**
   * Create a subtree of childNodes.
   *
   * @example
   * const walker = elem.createTreeWalker(dom => dom.nodeName === 'div')
   * for (let node in walker) {
   *   // `node` is a div node
   *   nop(node)
   * }
   *
   * @param {function(AbstractType<any>):boolean} filter Function that is called on each child element and
   *                          returns a Boolean indicating whether the child
   *                          is to be included in the subtree.
   * @return {YXmlTreeWalker} A subtree and a position within it.
   *
   * @public
   */
  createTreeWalker(t) {
    return new cr(this, t);
  }
  /**
   * Returns the first YXmlElement that matches the query.
   * Similar to DOM's {@link querySelector}.
   *
   * Query support:
   *   - tagname
   * TODO:
   *   - id
   *   - attribute
   *
   * @param {CSS_Selector} query The query on the children.
   * @return {YXmlElement|YXmlText|YXmlHook|null} The first element that matches the query or null.
   *
   * @public
   */
  querySelector(t) {
    t = t.toUpperCase();
    const r = new cr(this, (s) => s.nodeName && s.nodeName.toUpperCase() === t).next();
    return r.done ? null : r.value;
  }
  /**
   * Returns all YXmlElements that match the query.
   * Similar to Dom's {@link querySelectorAll}.
   *
   * @todo Does not yet support all queries. Currently only query by tagName.
   *
   * @param {CSS_Selector} query The query on the children
   * @return {Array<YXmlElement|YXmlText|YXmlHook|null>} The elements that match this query.
   *
   * @public
   */
  querySelectorAll(t) {
    return t = t.toUpperCase(), Gt(new cr(this, (e) => e.nodeName && e.nodeName.toUpperCase() === t));
  }
  /**
   * Creates YXmlEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    qn(this, t, new tu(this, e, t));
  }
  /**
   * Get the string representation of all the children of this YXmlFragment.
   *
   * @return {string} The string representation of all children.
   */
  toString() {
    return Ji(this, (t) => t.toString()).join("");
  }
  /**
   * @return {string}
   */
  toJSON() {
    return this.toString();
  }
  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {any} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDOM(t = document, e = {}, r) {
    const s = t.createDocumentFragment();
    return r !== void 0 && r._createAssociation(s, this), Ge(this, (i) => {
      s.insertBefore(i.toDOM(t, e, r), null);
    }), s;
  }
  /**
   * Inserts new content at an index.
   *
   * @example
   *  // Insert character 'a' at position 0
   *  xml.insert(0, [new Y.XmlText('text')])
   *
   * @param {number} index The index to insert content at
   * @param {Array<YXmlElement|YXmlText>} content The array of content
   */
  insert(t, e) {
    this.doc !== null ? at(this.doc, (r) => {
      eo(r, this, t, e);
    }) : this._prelimContent.splice(t, 0, ...e);
  }
  /**
   * Inserts new content at an index.
   *
   * @example
   *  // Insert character 'a' at position 0
   *  xml.insert(0, [new Y.XmlText('text')])
   *
   * @param {null|Item|YXmlElement|YXmlText} ref The index to insert content at
   * @param {Array<YXmlElement|YXmlText>} content The array of content
   */
  insertAfter(t, e) {
    if (this.doc !== null)
      at(this.doc, (r) => {
        const s = t && t instanceof bt ? t._item : t;
        Dn(r, this, s, e);
      });
    else {
      const r = (
        /** @type {Array<any>} */
        this._prelimContent
      ), s = t === null ? 0 : r.findIndex((i) => i === t) + 1;
      if (s === 0 && t !== null)
        throw $t("Reference item not found");
      r.splice(s, 0, ...e);
    }
  }
  /**
   * Deletes elements starting from an index.
   *
   * @param {number} index Index at which to start deleting elements
   * @param {number} [length=1] The number of elements to remove. Defaults to 1.
   */
  delete(t, e = 1) {
    this.doc !== null ? at(this.doc, (r) => {
      no(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<YXmlElement|YXmlText|YXmlHook>}
   */
  toArray() {
    return Xi(this);
  }
  /**
   * Appends content to this YArray.
   *
   * @param {Array<YXmlElement|YXmlText>} content Array of content to append.
   */
  push(t) {
    this.insert(this.length, t);
  }
  /**
   * Prepends content to this YArray.
   *
   * @param {Array<YXmlElement|YXmlText>} content Array of content to prepend.
   */
  unshift(t) {
    this.insert(0, t);
  }
  /**
   * Returns the i-th element from a YArray.
   *
   * @param {number} index The index of the element to return from the YArray
   * @return {YXmlElement|YXmlText}
   */
  get(t) {
    return Qi(this, t);
  }
  /**
   * Returns a portion of this YXmlFragment into a JavaScript Array selected
   * from start to end (end not included).
   *
   * @param {number} [start]
   * @param {number} [end]
   * @return {Array<YXmlElement|YXmlText>}
   */
  slice(t = 0, e = this.length) {
    return Ki(this, t, e);
  }
  /**
   * Executes a provided function on once on every child element.
   *
   * @param {function(YXmlElement|YXmlText,number, typeof self):void} f A function to execute on every element of this YArray.
   */
  forEach(t) {
    Ge(this, t);
  }
  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   */
  _write(t) {
    t.writeTypeRef(yu);
  }
}
const Jl = (n) => new he();
class Ie extends he {
  constructor(t = "UNDEFINED") {
    super(), this.nodeName = t, this._prelimAttrs = /* @__PURE__ */ new Map();
  }
  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get nextSibling() {
    const t = this._item ? this._item.next : null;
    return t ? (
      /** @type {YXmlElement|YXmlText} */
      /** @type {ContentType} */
      t.content.type
    ) : null;
  }
  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get prevSibling() {
    const t = this._item ? this._item.prev : null;
    return t ? (
      /** @type {YXmlElement|YXmlText} */
      /** @type {ContentType} */
      t.content.type
    ) : null;
  }
  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item} item
   */
  _integrate(t, e) {
    super._integrate(t, e), /** @type {Map<string, any>} */
    this._prelimAttrs.forEach((r, s) => {
      this.setAttribute(s, r);
    }), this._prelimAttrs = null;
  }
  /**
   * Creates an Item with the same effect as this Item (without position effect)
   *
   * @return {YXmlElement}
   */
  _copy() {
    return new Ie(this.nodeName);
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlElement<KV>}
   */
  clone() {
    const t = new Ie(this.nodeName), e = this.getAttributes();
    return Ga(e, (r, s) => {
      t.setAttribute(
        s,
        /** @type {any} */
        r
      );
    }), t.insert(0, this.toArray().map((r) => r instanceof bt ? r.clone() : r)), t;
  }
  /**
   * Returns the XML serialization of this YXmlElement.
   * The attributes are ordered by attribute-name, so you can easily use this
   * method to compare YXmlElements
   *
   * @return {string} The string representation of this type.
   *
   * @public
   */
  toString() {
    const t = this.getAttributes(), e = [], r = [];
    for (const a in t)
      r.push(a);
    r.sort();
    const s = r.length;
    for (let a = 0; a < s; a++) {
      const c = r[a];
      e.push(c + '="' + t[c] + '"');
    }
    const i = this.nodeName.toLocaleLowerCase(), o = e.length > 0 ? " " + e.join(" ") : "";
    return `<${i}${o}>${super.toString()}</${i}>`;
  }
  /**
   * Removes an attribute from this YXmlElement.
   *
   * @param {string} attributeName The attribute name that is to be removed.
   *
   * @public
   */
  removeAttribute(t) {
    this.doc !== null ? at(this.doc, (e) => {
      An(e, this, t);
    }) : this._prelimAttrs.delete(t);
  }
  /**
   * Sets or updates an attribute.
   *
   * @template {keyof KV & string} KEY
   *
   * @param {KEY} attributeName The attribute name that is to be set.
   * @param {KV[KEY]} attributeValue The attribute value that is to be set.
   *
   * @public
   */
  setAttribute(t, e) {
    this.doc !== null ? at(this.doc, (r) => {
      ss(r, this, t, e);
    }) : this._prelimAttrs.set(t, e);
  }
  /**
   * Returns an attribute value that belongs to the attribute name.
   *
   * @template {keyof KV & string} KEY
   *
   * @param {KEY} attributeName The attribute name that identifies the
   *                               queried value.
   * @return {KV[KEY]|undefined} The queried attribute value.
   *
   * @public
   */
  getAttribute(t) {
    return (
      /** @type {any} */
      is(this, t)
    );
  }
  /**
   * Returns whether an attribute exists
   *
   * @param {string} attributeName The attribute name to check for existence.
   * @return {boolean} whether the attribute exists.
   *
   * @public
   */
  hasAttribute(t) {
    return (
      /** @type {any} */
      so(this, t)
    );
  }
  /**
   * Returns all attribute name/value pairs in a JSON Object.
   *
   * @param {Snapshot} [snapshot]
   * @return {{ [Key in Extract<keyof KV,string>]?: KV[Key]}} A JSON Object that describes the attributes.
   *
   * @public
   */
  getAttributes(t) {
    return (
      /** @type {any} */
      t ? $l(this, t) : ro(this)
    );
  }
  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {any} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDOM(t = document, e = {}, r) {
    const s = t.createElement(this.nodeName), i = this.getAttributes();
    for (const o in i) {
      const a = i[o];
      typeof a == "string" && s.setAttribute(o, a);
    }
    return Ge(this, (o) => {
      s.appendChild(o.toDOM(t, e, r));
    }), r !== void 0 && r._createAssociation(s, this), s;
  }
  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   */
  _write(t) {
    t.writeTypeRef(wu), t.writeKey(this.nodeName);
  }
}
const Ql = (n) => new Ie(n.readKey());
class tu extends Zn {
  /**
   * @param {YXmlElement|YXmlText|YXmlFragment} target The target on which the event is created.
   * @param {Set<string|null>} subs The set of changed attributes. `null` is included if the
   *                   child list changed.
   * @param {Transaction} transaction The transaction instance with which the
   *                                  change was created.
   */
  constructor(t, e, r) {
    super(t, r), this.childListChanged = !1, this.attributesChanged = /* @__PURE__ */ new Set(), e.forEach((s) => {
      s === null ? this.childListChanged = !0 : this.attributesChanged.add(s);
    });
  }
}
class In extends Ae {
  /**
   * @param {string} hookName nodeName of the Dom Node.
   */
  constructor(t) {
    super(), this.hookName = t;
  }
  /**
   * Creates an Item with the same effect as this Item (without position effect)
   */
  _copy() {
    return new In(this.hookName);
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlHook}
   */
  clone() {
    const t = new In(this.hookName);
    return this.forEach((e, r) => {
      t.set(r, e);
    }), t;
  }
  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object.<string, any>} [hooks] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {any} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type
   * @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDOM(t = document, e = {}, r) {
    const s = e[this.hookName];
    let i;
    return s !== void 0 ? i = s.createDom(this) : i = document.createElement(this.hookName), i.setAttribute("data-yjs-hook", this.hookName), r !== void 0 && r._createAssociation(i, this), i;
  }
  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   */
  _write(t) {
    t.writeTypeRef(_u), t.writeKey(this.hookName);
  }
}
const eu = (n) => new In(n.readKey());
class On extends ue {
  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get nextSibling() {
    const t = this._item ? this._item.next : null;
    return t ? (
      /** @type {YXmlElement|YXmlText} */
      /** @type {ContentType} */
      t.content.type
    ) : null;
  }
  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get prevSibling() {
    const t = this._item ? this._item.prev : null;
    return t ? (
      /** @type {YXmlElement|YXmlText} */
      /** @type {ContentType} */
      t.content.type
    ) : null;
  }
  _copy() {
    return new On();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlText}
   */
  clone() {
    const t = new On();
    return t.applyDelta(this.toDelta()), t;
  }
  /**
   * Creates a Dom Element that mirrors this YXmlText.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {any} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDOM(t = document, e, r) {
    const s = t.createTextNode(this.toString());
    return r !== void 0 && r._createAssociation(s, this), s;
  }
  toString() {
    return this.toDelta().map((t) => {
      const e = [];
      for (const s in t.attributes) {
        const i = [];
        for (const o in t.attributes[s])
          i.push({ key: o, value: t.attributes[s][o] });
        i.sort((o, a) => o.key < a.key ? -1 : 1), e.push({ nodeName: s, attrs: i });
      }
      e.sort((s, i) => s.nodeName < i.nodeName ? -1 : 1);
      let r = "";
      for (let s = 0; s < e.length; s++) {
        const i = e[s];
        r += `<${i.nodeName}`;
        for (let o = 0; o < i.attrs.length; o++) {
          const a = i.attrs[o];
          r += ` ${a.key}="${a.value}"`;
        }
        r += ">";
      }
      r += t.insert;
      for (let s = e.length - 1; s >= 0; s--)
        r += `</${e[s].nodeName}>`;
      return r;
    }).join("");
  }
  /**
   * @return {string}
   */
  toJSON() {
    return this.toString();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(bu);
  }
}
const nu = (n) => new On();
class os {
  /**
   * @param {ID} id
   * @param {number} length
   */
  constructor(t, e) {
    this.id = t, this.length = e;
  }
  /**
   * @type {boolean}
   */
  get deleted() {
    throw Mt();
  }
  /**
   * Merge this struct with the item to the right.
   * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
   * Also this method does *not* remove right from StructStore!
   * @param {AbstractStruct} right
   * @return {boolean} whether this merged with right
   */
  mergeWith(t) {
    return !1;
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   * @param {number} offset
   * @param {number} encodingRef
   */
  write(t, e, r) {
    throw Mt();
  }
  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate(t, e) {
    throw Mt();
  }
}
const ru = 0;
class Lt extends os {
  get deleted() {
    return !0;
  }
  delete() {
  }
  /**
   * @param {GC} right
   * @return {boolean}
   */
  mergeWith(t) {
    return this.constructor !== t.constructor ? !1 : (this.length += t.length, !0);
  }
  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate(t, e) {
    e > 0 && (this.id.clock += e, this.length -= e), Wi(t.doc.store, this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeInfo(ru), t.writeLen(this.length - e);
  }
  /**
   * @param {Transaction} transaction
   * @param {StructStore} store
   * @return {null | number}
   */
  getMissing(t, e) {
    return null;
  }
}
class en {
  /**
   * @param {Uint8Array} content
   */
  constructor(t) {
    this.content = t;
  }
  /**
   * @return {number}
   */
  getLength() {
    return 1;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return [this.content];
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentBinary}
   */
  copy() {
    return new en(this.content);
  }
  /**
   * @param {number} offset
   * @return {ContentBinary}
   */
  splice(t) {
    throw Mt();
  }
  /**
   * @param {ContentBinary} right
   * @return {boolean}
   */
  mergeWith(t) {
    return !1;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeBuf(this.content);
  }
  /**
   * @return {number}
   */
  getRef() {
    return 3;
  }
}
const su = (n) => new en(n.readBuf());
class Ke {
  /**
   * @param {number} len
   */
  constructor(t) {
    this.len = t;
  }
  /**
   * @return {number}
   */
  getLength() {
    return this.len;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return [];
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !1;
  }
  /**
   * @return {ContentDeleted}
   */
  copy() {
    return new Ke(this.len);
  }
  /**
   * @param {number} offset
   * @return {ContentDeleted}
   */
  splice(t) {
    const e = new Ke(this.len - t);
    return this.len = t, e;
  }
  /**
   * @param {ContentDeleted} right
   * @return {boolean}
   */
  mergeWith(t) {
    return this.len += t.len, !0;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
    Ye(t.deleteSet, e.id.client, e.id.clock, this.len), e.markDeleted();
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeLen(this.len - e);
  }
  /**
   * @return {number}
   */
  getRef() {
    return 1;
  }
}
const iu = (n) => new Ke(n.readLen()), lo = (n, t) => new pe({ guid: n, ...t, shouldLoad: t.shouldLoad || t.autoLoad || !1 });
class nn {
  /**
   * @param {Doc} doc
   */
  constructor(t) {
    t._item && console.error("This document was already integrated as a sub-document. You should create a second instance instead with the same guid."), this.doc = t;
    const e = {};
    this.opts = e, t.gc || (e.gc = !1), t.autoLoad && (e.autoLoad = !0), t.meta !== null && (e.meta = t.meta);
  }
  /**
   * @return {number}
   */
  getLength() {
    return 1;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return [this.doc];
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentDoc}
   */
  copy() {
    return new nn(lo(this.doc.guid, this.opts));
  }
  /**
   * @param {number} offset
   * @return {ContentDoc}
   */
  splice(t) {
    throw Mt();
  }
  /**
   * @param {ContentDoc} right
   * @return {boolean}
   */
  mergeWith(t) {
    return !1;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
    this.doc._item = e, t.subdocsAdded.add(this.doc), this.doc.shouldLoad && t.subdocsLoaded.add(this.doc);
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
    t.subdocsAdded.has(this.doc) ? t.subdocsAdded.delete(this.doc) : t.subdocsRemoved.add(this.doc);
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeString(this.doc.guid), t.writeAny(this.opts);
  }
  /**
   * @return {number}
   */
  getRef() {
    return 9;
  }
}
const ou = (n) => new nn(lo(n.readString(), n.readAny()));
class ge {
  /**
   * @param {Object} embed
   */
  constructor(t) {
    this.embed = t;
  }
  /**
   * @return {number}
   */
  getLength() {
    return 1;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return [this.embed];
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentEmbed}
   */
  copy() {
    return new ge(this.embed);
  }
  /**
   * @param {number} offset
   * @return {ContentEmbed}
   */
  splice(t) {
    throw Mt();
  }
  /**
   * @param {ContentEmbed} right
   * @return {boolean}
   */
  mergeWith(t) {
    return !1;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeJSON(this.embed);
  }
  /**
   * @return {number}
   */
  getRef() {
    return 5;
  }
}
const au = (n) => new ge(n.readJSON());
class wt {
  /**
   * @param {string} key
   * @param {Object} value
   */
  constructor(t, e) {
    this.key = t, this.value = e;
  }
  /**
   * @return {number}
   */
  getLength() {
    return 1;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return [];
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !1;
  }
  /**
   * @return {ContentFormat}
   */
  copy() {
    return new wt(this.key, this.value);
  }
  /**
   * @param {number} _offset
   * @return {ContentFormat}
   */
  splice(t) {
    throw Mt();
  }
  /**
   * @param {ContentFormat} _right
   * @return {boolean}
   */
  mergeWith(t) {
    return !1;
  }
  /**
   * @param {Transaction} _transaction
   * @param {Item} item
   */
  integrate(t, e) {
    const r = (
      /** @type {YText} */
      e.parent
    );
    r._searchMarker = null, r._hasFormatting = !0;
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeKey(this.key), t.writeJSON(this.value);
  }
  /**
   * @return {number}
   */
  getRef() {
    return 6;
  }
}
const cu = (n) => new wt(n.readKey(), n.readJSON());
class Ln {
  /**
   * @param {Array<any>} arr
   */
  constructor(t) {
    this.arr = t;
  }
  /**
   * @return {number}
   */
  getLength() {
    return this.arr.length;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return this.arr;
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentJSON}
   */
  copy() {
    return new Ln(this.arr);
  }
  /**
   * @param {number} offset
   * @return {ContentJSON}
   */
  splice(t) {
    const e = new Ln(this.arr.slice(t));
    return this.arr = this.arr.slice(0, t), e;
  }
  /**
   * @param {ContentJSON} right
   * @return {boolean}
   */
  mergeWith(t) {
    return this.arr = this.arr.concat(t.arr), !0;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    const r = this.arr.length;
    t.writeLen(r - e);
    for (let s = e; s < r; s++) {
      const i = this.arr[s];
      t.writeString(i === void 0 ? "undefined" : JSON.stringify(i));
    }
  }
  /**
   * @return {number}
   */
  getRef() {
    return 2;
  }
}
const lu = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++) {
    const s = n.readString();
    s === "undefined" ? e.push(void 0) : e.push(JSON.parse(s));
  }
  return new Ln(e);
}, uu = Sn("node_env") === "development";
class de {
  /**
   * @param {Array<any>} arr
   */
  constructor(t) {
    this.arr = t, uu && ai(t);
  }
  /**
   * @return {number}
   */
  getLength() {
    return this.arr.length;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return this.arr;
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentAny}
   */
  copy() {
    return new de(this.arr);
  }
  /**
   * @param {number} offset
   * @return {ContentAny}
   */
  splice(t) {
    const e = new de(this.arr.slice(t));
    return this.arr = this.arr.slice(0, t), e;
  }
  /**
   * @param {ContentAny} right
   * @return {boolean}
   */
  mergeWith(t) {
    return this.arr = this.arr.concat(t.arr), !0;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    const r = this.arr.length;
    t.writeLen(r - e);
    for (let s = e; s < r; s++) {
      const i = this.arr[s];
      t.writeAny(i);
    }
  }
  /**
   * @return {number}
   */
  getRef() {
    return 8;
  }
}
const hu = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++)
    e.push(n.readAny());
  return new de(e);
};
class Wt {
  /**
   * @param {string} str
   */
  constructor(t) {
    this.str = t;
  }
  /**
   * @return {number}
   */
  getLength() {
    return this.str.length;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return this.str.split("");
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentString}
   */
  copy() {
    return new Wt(this.str);
  }
  /**
   * @param {number} offset
   * @return {ContentString}
   */
  splice(t) {
    const e = new Wt(this.str.slice(t));
    this.str = this.str.slice(0, t);
    const r = this.str.charCodeAt(t - 1);
    return r >= 55296 && r <= 56319 && (this.str = this.str.slice(0, t - 1) + "�", e.str = "�" + e.str.slice(1)), e;
  }
  /**
   * @param {ContentString} right
   * @return {boolean}
   */
  mergeWith(t) {
    return this.str += t.str, !0;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeString(e === 0 ? this.str : this.str.slice(e));
  }
  /**
   * @return {number}
   */
  getRef() {
    return 4;
  }
}
const du = (n) => new Wt(n.readString()), fu = [
  Wl,
  Zl,
  Xl,
  Ql,
  Jl,
  eu,
  nu
], pu = 0, gu = 1, mu = 2, wu = 3, yu = 4, _u = 5, bu = 6;
class Xt {
  /**
   * @param {AbstractType<any>} type
   */
  constructor(t) {
    this.type = t;
  }
  /**
   * @return {number}
   */
  getLength() {
    return 1;
  }
  /**
   * @return {Array<any>}
   */
  getContent() {
    return [this.type];
  }
  /**
   * @return {boolean}
   */
  isCountable() {
    return !0;
  }
  /**
   * @return {ContentType}
   */
  copy() {
    return new Xt(this.type._copy());
  }
  /**
   * @param {number} offset
   * @return {ContentType}
   */
  splice(t) {
    throw Mt();
  }
  /**
   * @param {ContentType} right
   * @return {boolean}
   */
  mergeWith(t) {
    return !1;
  }
  /**
   * @param {Transaction} transaction
   * @param {Item} item
   */
  integrate(t, e) {
    this.type._integrate(t.doc, e);
  }
  /**
   * @param {Transaction} transaction
   */
  delete(t) {
    let e = this.type._start;
    for (; e !== null; )
      e.deleted ? e.id.clock < (t.beforeState.get(e.id.client) || 0) && t._mergeStructs.push(e) : e.delete(t), e = e.right;
    this.type._map.forEach((r) => {
      r.deleted ? r.id.clock < (t.beforeState.get(r.id.client) || 0) && t._mergeStructs.push(r) : r.delete(t);
    }), t.changed.delete(this.type);
  }
  /**
   * @param {StructStore} store
   */
  gc(t) {
    let e = this.type._start;
    for (; e !== null; )
      e.gc(t, !0), e = e.right;
    this.type._start = null, this.type._map.forEach(
      /** @param {Item | null} item */
      (r) => {
        for (; r !== null; )
          r.gc(t, !0), r = r.left;
      }
    ), this.type._map = /* @__PURE__ */ new Map();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    this.type._write(t);
  }
  /**
   * @return {number}
   */
  getRef() {
    return 7;
  }
}
const ku = (n) => new Xt(fu[n.readTypeRef()](n)), vu = (n, t) => {
  let e = t, r = 0, s;
  do
    r > 0 && (e = rt(e.client, e.clock + r)), s = _n(n, e), r = e.clock - s.id.clock, e = s.redone;
  while (e !== null && s instanceof lt);
  return {
    item: s,
    diff: r
  };
}, as = (n, t) => {
  for (; n !== null && n.keep !== t; )
    n.keep = t, n = /** @type {AbstractType<any>} */
    n.parent._item;
}, Rn = (n, t, e) => {
  const { client: r, clock: s } = t.id, i = new lt(
    rt(r, s + e),
    t,
    rt(r, s + e - 1),
    t.right,
    t.rightOrigin,
    t.parent,
    t.parentSub,
    t.content.splice(e)
  );
  return t.deleted && i.markDeleted(), t.keep && (i.keep = !0), t.redone !== null && (i.redone = rt(t.redone.client, t.redone.clock + e)), t.right = i, i.right !== null && (i.right.left = i), n._mergeStructs.push(i), i.parentSub !== null && i.right === null && i.parent._map.set(i.parentSub, i), t.length = e, i;
}, Hs = (n, t) => Lr(
  n,
  /** @param {StackItem} s */
  (e) => Qe(e.deletions, t)
), uo = (n, t, e, r, s, i) => {
  const o = n.doc, a = o.store, c = o.clientID, h = t.redone;
  if (h !== null)
    return Tt(n, h);
  let l = (
    /** @type {AbstractType<any>} */
    t.parent._item
  ), d = null, p;
  if (l !== null && l.deleted === !0) {
    if (l.redone === null && (!e.has(l) || uo(n, l, e, r, s, i) === null))
      return null;
    for (; l.redone !== null; )
      l = Tt(n, l.redone);
  }
  const u = l === null ? (
    /** @type {AbstractType<any>} */
    t.parent
  ) : (
    /** @type {ContentType} */
    l.content.type
  );
  if (t.parentSub === null) {
    for (d = t.left, p = t; d !== null; ) {
      let y = d;
      for (; y !== null && /** @type {AbstractType<any>} */
      y.parent._item !== l; )
        y = y.redone === null ? null : Tt(n, y.redone);
      if (y !== null && /** @type {AbstractType<any>} */
      y.parent._item === l) {
        d = y;
        break;
      }
      d = d.left;
    }
    for (; p !== null; ) {
      let y = p;
      for (; y !== null && /** @type {AbstractType<any>} */
      y.parent._item !== l; )
        y = y.redone === null ? null : Tt(n, y.redone);
      if (y !== null && /** @type {AbstractType<any>} */
      y.parent._item === l) {
        p = y;
        break;
      }
      p = p.right;
    }
  } else if (p = null, t.right && !s) {
    for (d = t; d !== null && d.right !== null && (d.right.redone || Qe(r, d.right.id) || Hs(i.undoStack, d.right.id) || Hs(i.redoStack, d.right.id)); )
      for (d = d.right; d.redone; ) d = Tt(n, d.redone);
    if (d && d.right !== null)
      return null;
  } else
    d = u._map.get(t.parentSub) || null;
  const w = mt(a, c), g = rt(c, w), _ = new lt(
    g,
    d,
    d && d.lastId,
    p,
    p && p.id,
    u,
    t.parentSub,
    t.content.copy()
  );
  return t.redone = g, as(_, !0), _.integrate(n, 0), _;
};
class lt extends os {
  /**
   * @param {ID} id
   * @param {Item | null} left
   * @param {ID | null} origin
   * @param {Item | null} right
   * @param {ID | null} rightOrigin
   * @param {AbstractType<any>|ID|null} parent Is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.
   * @param {string | null} parentSub
   * @param {AbstractContent} content
   */
  constructor(t, e, r, s, i, o, a, c) {
    super(t, c.getLength()), this.origin = r, this.left = e, this.right = s, this.rightOrigin = i, this.parent = o, this.parentSub = a, this.redone = null, this.content = c, this.info = this.content.isCountable() ? ys : 0;
  }
  /**
   * This is used to mark the item as an indexed fast-search marker
   *
   * @type {boolean}
   */
  set marker(t) {
    (this.info & er) > 0 !== t && (this.info ^= er);
  }
  get marker() {
    return (this.info & er) > 0;
  }
  /**
   * If true, do not garbage collect this Item.
   */
  get keep() {
    return (this.info & ws) > 0;
  }
  set keep(t) {
    this.keep !== t && (this.info ^= ws);
  }
  get countable() {
    return (this.info & ys) > 0;
  }
  /**
   * Whether this item was deleted or not.
   * @type {Boolean}
   */
  get deleted() {
    return (this.info & tr) > 0;
  }
  set deleted(t) {
    this.deleted !== t && (this.info ^= tr);
  }
  markDeleted() {
    this.info |= tr;
  }
  /**
   * Return the creator clientID of the missing op or define missing items and return null.
   *
   * @param {Transaction} transaction
   * @param {StructStore} store
   * @return {null | number}
   */
  getMissing(t, e) {
    if (this.origin && this.origin.client !== this.id.client && this.origin.clock >= mt(e, this.origin.client))
      return this.origin.client;
    if (this.rightOrigin && this.rightOrigin.client !== this.id.client && this.rightOrigin.clock >= mt(e, this.rightOrigin.client))
      return this.rightOrigin.client;
    if (this.parent && this.parent.constructor === ke && this.id.client !== this.parent.client && this.parent.clock >= mt(e, this.parent.client))
      return this.parent.client;
    if (this.origin && (this.left = Ns(t, e, this.origin), this.origin = this.left.lastId), this.rightOrigin && (this.right = Tt(t, this.rightOrigin), this.rightOrigin = this.right.id), this.left && this.left.constructor === Lt || this.right && this.right.constructor === Lt)
      this.parent = null;
    else if (!this.parent)
      this.left && this.left.constructor === lt ? (this.parent = this.left.parent, this.parentSub = this.left.parentSub) : this.right && this.right.constructor === lt && (this.parent = this.right.parent, this.parentSub = this.right.parentSub);
    else if (this.parent.constructor === ke) {
      const r = _n(e, this.parent);
      r.constructor === Lt ? this.parent = null : this.parent = /** @type {ContentType} */
      r.content.type;
    }
    return null;
  }
  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate(t, e) {
    if (e > 0 && (this.id.clock += e, this.left = Ns(t, t.doc.store, rt(this.id.client, this.id.clock - 1)), this.origin = this.left.lastId, this.content = this.content.splice(e), this.length -= e), this.parent) {
      if (!this.left && (!this.right || this.right.left !== null) || this.left && this.left.right !== this.right) {
        let r = this.left, s;
        if (r !== null)
          s = r.right;
        else if (this.parentSub !== null)
          for (s = /** @type {AbstractType<any>} */
          this.parent._map.get(this.parentSub) || null; s !== null && s.left !== null; )
            s = s.left;
        else
          s = /** @type {AbstractType<any>} */
          this.parent._start;
        const i = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set();
        for (; s !== null && s !== this.right; ) {
          if (o.add(s), i.add(s), un(this.origin, s.origin)) {
            if (s.id.client < this.id.client)
              r = s, i.clear();
            else if (un(this.rightOrigin, s.rightOrigin))
              break;
          } else if (s.origin !== null && o.has(_n(t.doc.store, s.origin)))
            i.has(_n(t.doc.store, s.origin)) || (r = s, i.clear());
          else
            break;
          s = s.right;
        }
        this.left = r;
      }
      if (this.left !== null) {
        const r = this.left.right;
        this.right = r, this.left.right = this;
      } else {
        let r;
        if (this.parentSub !== null)
          for (r = /** @type {AbstractType<any>} */
          this.parent._map.get(this.parentSub) || null; r !== null && r.left !== null; )
            r = r.left;
        else
          r = /** @type {AbstractType<any>} */
          this.parent._start, this.parent._start = this;
        this.right = r;
      }
      this.right !== null ? this.right.left = this : this.parentSub !== null && (this.parent._map.set(this.parentSub, this), this.left !== null && this.left.delete(t)), this.parentSub === null && this.countable && !this.deleted && (this.parent._length += this.length), Wi(t.doc.store, this), this.content.integrate(t, this), Ms(
        t,
        /** @type {AbstractType<any>} */
        this.parent,
        this.parentSub
      ), /** @type {AbstractType<any>} */
      (this.parent._item !== null && /** @type {AbstractType<any>} */
      this.parent._item.deleted || this.parentSub !== null && this.right !== null) && this.delete(t);
    } else
      new Lt(this.id, this.length).integrate(t, 0);
  }
  /**
   * Returns the next non-deleted item
   */
  get next() {
    let t = this.right;
    for (; t !== null && t.deleted; )
      t = t.right;
    return t;
  }
  /**
   * Returns the previous non-deleted item
   */
  get prev() {
    let t = this.left;
    for (; t !== null && t.deleted; )
      t = t.left;
    return t;
  }
  /**
   * Computes the last content address of this Item.
   */
  get lastId() {
    return this.length === 1 ? this.id : rt(this.id.client, this.id.clock + this.length - 1);
  }
  /**
   * Try to merge two items
   *
   * @param {Item} right
   * @return {boolean}
   */
  mergeWith(t) {
    if (this.constructor === t.constructor && un(t.origin, this.lastId) && this.right === t && un(this.rightOrigin, t.rightOrigin) && this.id.client === t.id.client && this.id.clock + this.length === t.id.clock && this.deleted === t.deleted && this.redone === null && t.redone === null && this.content.constructor === t.content.constructor && this.content.mergeWith(t.content)) {
      const e = (
        /** @type {AbstractType<any>} */
        this.parent._searchMarker
      );
      return e && e.forEach((r) => {
        r.p === t && (r.p = this, !this.deleted && this.countable && (r.index -= this.length));
      }), t.keep && (this.keep = !0), this.right = t.right, this.right !== null && (this.right.left = this), this.length += t.length, !0;
    }
    return !1;
  }
  /**
   * Mark this Item as deleted.
   *
   * @param {Transaction} transaction
   */
  delete(t) {
    if (!this.deleted) {
      const e = (
        /** @type {AbstractType<any>} */
        this.parent
      );
      this.countable && this.parentSub === null && (e._length -= this.length), this.markDeleted(), Ye(t.deleteSet, this.id.client, this.id.clock, this.length), Ms(t, e, this.parentSub), this.content.delete(t);
    }
  }
  /**
   * @param {StructStore} store
   * @param {boolean} parentGCd
   */
  gc(t, e) {
    if (!this.deleted)
      throw Nt();
    this.content.gc(t), e ? xl(t, this, new Lt(this.id, this.length)) : this.content = new Ke(this.length);
  }
  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   * @param {number} offset
   */
  write(t, e) {
    const r = e > 0 ? rt(this.id.client, this.id.clock + e - 1) : this.origin, s = this.rightOrigin, i = this.parentSub, o = this.content.getRef() & zn | (r === null ? 0 : At) | // origin is defined
    (s === null ? 0 : qt) | // right origin is defined
    (i === null ? 0 : je);
    if (t.writeInfo(o), r !== null && t.writeLeftID(r), s !== null && t.writeRightID(s), r === null && s === null) {
      const a = (
        /** @type {AbstractType<any>} */
        this.parent
      );
      if (a._item !== void 0) {
        const c = a._item;
        if (c === null) {
          const h = vl(a);
          t.writeParentInfo(!0), t.writeString(h);
        } else
          t.writeParentInfo(!1), t.writeLeftID(c.id);
      } else a.constructor === String ? (t.writeParentInfo(!0), t.writeString(a)) : a.constructor === ke ? (t.writeParentInfo(!1), t.writeLeftID(a)) : Nt();
      i !== null && t.writeString(i);
    }
    this.content.write(t, e);
  }
}
const ho = (n, t) => Su[t & zn](n), Su = [
  () => {
    Nt();
  },
  // GC is not ItemContent
  iu,
  // 1
  lu,
  // 2
  su,
  // 3
  du,
  // 4
  au,
  // 5
  cu,
  // 6
  ku,
  // 7
  hu,
  // 8
  ou,
  // 9
  () => {
    Nt();
  }
  // 10 - Skip is not ItemContent
], xu = 10;
class Rt extends os {
  get deleted() {
    return !0;
  }
  delete() {
  }
  /**
   * @param {Skip} right
   * @return {boolean}
   */
  mergeWith(t) {
    return this.constructor !== t.constructor ? !1 : (this.length += t.length, !0);
  }
  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate(t, e) {
    Nt();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeInfo(xu), K(t.restEncoder, this.length - e);
  }
  /**
   * @param {Transaction} transaction
   * @param {StructStore} store
   * @return {null | number}
   */
  getMissing(t, e) {
    return null;
  }
}
const fo = (
  /** @type {any} */
  typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : {}
), po = "__ $YJS$ __";
fo[po] === !0 && console.error("Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438");
fo[po] = !0;
function Cu() {
  const n = new pe(), t = n.getMap("pages");
  let e = null, r = null;
  function s(i) {
    let o = t.get(i);
    return o || (o = new ue(), t.set(i, o)), o;
  }
  return {
    doc: n,
    pages: t,
    get awareness() {
      return e;
    },
    set awareness(i) {
      e = i;
    },
    get undoManager() {
      return r;
    },
    set undoManager(i) {
      r = i;
    },
    getDoc() {
      return n;
    },
    getPage(i) {
      return s(i);
    },
    hasPage(i) {
      return t.has(i);
    },
    getWorld() {
      const i = {};
      for (const [o, a] of t.entries())
        i[o] = a.toString();
      return i;
    },
    setAwareness(i) {
      e = i;
    },
    setUndoManager(i) {
      r = i;
    },
    toContext(i) {
      return {
        navigate: i,
        getTrail: () => [],
        getCurrentPage: () => "",
        getWorld: () => {
          const o = {};
          for (const [a, c] of t.entries())
            o[a] = c.toString();
          return o;
        },
        getDoc: () => n
      };
    },
    encodeStateAsUpdate() {
      return Qr(n);
    },
    applyUpdate(i) {
      Jr(n, i);
    },
    destroy() {
      e?.destroy?.(), r?.destroy(), n.destroy();
    }
  };
}
function Eu(n, t = {}) {
  const e = Cu(), r = t.initialPage ?? "home", s = Ro(window.location.search), i = s[s.length - 1] ?? r;
  let o = s.length ? [...s] : [i], a = null, c = !1, h = null;
  return {
    getYDocState() {
      return e;
    },
    getTrail() {
      return [...o];
    },
    getCurrentPage() {
      return o.length <= 1 ? o[0] ?? "" : o.slice(1).join("/");
    },
    getWorld() {
      return e.getWorld();
    },
    pushTrail(l) {
      o.push(l);
    },
    setTrail(l) {
      o = l;
    },
    truncateTrail(l) {
      o = o.slice(0, l + 1);
    },
    setNavigating(l) {
      return c = l, l;
    },
    isNavigating() {
      return c;
    },
    clearSaveTimer() {
      a && (clearTimeout(a), a = null);
    },
    setSaveTimer(l) {
      a = l;
    },
    getPendingRequestedPage() {
      return h;
    },
    setPendingRequestedPage(l) {
      h = l;
    },
    toContext(l) {
      return {
        ...e.toContext(l),
        getTrail: () => [...o],
        getCurrentPage: () => o.length <= 1 ? o[0] ?? "" : o.slice(1).join("/")
      };
    }
  };
}
const Tu = `
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

  /* Toast */
  --wn-toast-bg: #17171e;            /* info toast background */
  --wn-toast-bg-success: #14241a;    /* success toast background */
  --wn-toast-bg-warning: #24201a;    /* warning toast background */
  --wn-toast-bg-error: #24141a;      /* error toast background */
  --wn-toast-border: #332d6a;        /* toast border color */
  --wn-toast-radius: 4px;            /* toast border radius */
  --wn-toast-color: #c9c9d0;         /* toast text color */
}
`, Du = Tu + `
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

.wn-header { flex-shrink: 0; }

.wn-body { display: flex; flex: 1; min-height: 0; }

.wn-footer { flex-shrink: 0; }

.wn-left-sidepanel {
  display: none;
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 0.5px solid var(--wn-color-border, #1f1f23);
}
.wn-left-sidepanel:not(:empty) { display: block; }

.wn-right-sidepanel {
  display: none;
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 0.5px solid var(--wn-color-border, #1f1f23);
}
.wn-right-sidepanel:not(:empty) { display: block; }

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

/* List items */
.wn-list-item {
  display: flex;
}
.wn-list-item-indent {
  color: transparent;
  white-space: pre;
  user-select: none;
  flex-shrink: 0;
}
.wn-list-item-marker {
  color: var(--wn-color-punct, #2e2e44);
  user-select: none;
  flex-shrink: 0;
}
.wn-list-item-content {
  color: var(--wn-color-fg, #c9c9d0);
  min-width: 0;
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

/* Remote cursor overlay */
.wn-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}
.wn-remote-cursor {
  position: absolute;
  pointer-events: none;
  white-space: nowrap;
}
.wn-remote-cursor-caret {
  width: 2px;
  height: 1.2em;
  display: inline-block;
  vertical-align: text-bottom;
  margin-right: 2px;
}
.wn-remote-cursor-label {
  font-size: 10px;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  position: absolute;
  top: -14px;
  left: 0;
  white-space: nowrap;
}

/* Toast notifications */
.wn-toast-container {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 380px;
}
.wn-toast-container--top-right    { top: 12px; right: 12px; align-items: flex-end; }
.wn-toast-container--top-left     { top: 12px; left: 12px; align-items: flex-start; }
.wn-toast-container--bottom-right { bottom: 12px; right: 12px; align-items: flex-end; }
.wn-toast-container--bottom-left  { bottom: 12px; left: 12px; align-items: flex-start; }

.wn-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border: 0.5px solid var(--wn-toast-border, #332d6a);
  border-radius: var(--wn-toast-radius, 4px);
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-small, 12px);
  color: var(--wn-toast-color, #c9c9d0);
  background: var(--wn-toast-bg, #17171e);
  min-width: 260px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: wn-toast-enter 0.2s ease-out;
}
.wn-toast--success { background: var(--wn-toast-bg-success, #14241a); }
.wn-toast--warning { background: var(--wn-toast-bg-warning, #24201a); }
.wn-toast--error   { background: var(--wn-toast-bg-error, #24141a); }
.wn-toast--exiting {
  animation: wn-toast-exit 0.15s ease-in forwards;
  pointer-events: none;
}

.wn-toast__icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  line-height: 14px;
  font-size: var(--wn-font-size-small, 12px);
}
.wn-toast__message {
  flex: 1;
  word-break: break-word;
  line-height: 1.4;
}
.wn-toast__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}
.wn-toast__action-btn {
  padding: 2px 8px;
  background: var(--wn-color-wiki-link-bg, #16142a);
  color: var(--wn-color-wiki-link, #9b8fe8);
  border: 0.5px solid var(--wn-color-wiki-link-border, #332d6a);
  border-radius: var(--wn-radius-wiki-link, 4px);
  cursor: pointer;
  font-family: var(--wn-font-mono, monospace);
  font-size: var(--wn-font-size-small, 12px);
  white-space: nowrap;
}
.wn-toast__action-btn:hover {
  background: var(--wn-color-wiki-link-bg-hover, #221e42);
  color: var(--wn-color-wiki-link-hover, #bbb3f8);
}
.wn-toast__close-btn {
  padding: 1px 4px;
  background: none;
  color: var(--wn-color-fg-muted, #4a4a5e);
  border: none;
  cursor: pointer;
  font-family: var(--wn-font-mono, monospace);
  font-size: 15px;
  line-height: 1;
}
.wn-toast__close-btn:hover {
  color: var(--wn-color-fg, #c9c9d0);
}

@keyframes wn-toast-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wn-toast-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
`;
function Ot(n, t) {
  const e = document.createElement(n);
  return e.className = t, e;
}
function Au(n) {
  const t = "worldnotes-styles", e = document.getElementById(t);
  if (e) {
    n !== void 0 && (e.textContent = n);
    return;
  }
  const r = document.createElement("style");
  r.id = t, r.textContent = n ?? Du, document.head.appendChild(r);
}
function Iu(n, t) {
  Au(t), n.innerHTML = "", n.className = "wn-root";
  const e = Ot("div", "wn-header"), r = Ot("div", "wn-topbar"), s = Ot("div", "wn-breadcrumb"), i = Ot("div", "wn-toolbar"), o = Ot("div", "wn-body"), a = Ot("div", "wn-left-sidepanel"), c = Ot("div", "wn-editor-wrap"), h = Ot("div", "wn-editor"), l = Ot("div", "wn-placeholder"), d = Ot("div", "wn-overlay"), p = Ot("div", "wn-right-sidepanel"), u = Ot("div", "wn-footer");
  return l.textContent = "Start writing… use [[page name]] to link deeper", h.contentEditable = "true", h.spellcheck = !1, r.appendChild(s), c.appendChild(l), c.appendChild(h), c.appendChild(d), o.appendChild(a), o.appendChild(c), o.appendChild(p), n.appendChild(e), n.appendChild(r), n.appendChild(i), n.appendChild(o), n.appendChild(u), { container: n, topbar: r, breadcrumb: s, toolbar: i, editorWrap: c, editorDiv: h, placeholder: l, overlay: d, header: e, body: o, footer: u, leftSidepanel: a, rightSidepanel: p };
}
function Ws(n) {
  return { type: "text", raw: n, groups: [n] };
}
function Ou(n, t) {
  const e = t.filter((s) => s.pattern.source.startsWith("^")), r = t.filter((s) => !s.pattern.source.startsWith("^"));
  for (const s of e) {
    const i = n.match(s.pattern);
    if (i)
      return [{ type: s.type, raw: i[0], groups: i.slice(1).map((o) => o ?? "") }];
  }
  return cs(n, r);
}
function cs(n, t) {
  const e = [];
  let r = n;
  for (; r.length > 0; ) {
    let s = null;
    for (const i of t) {
      const o = r.match(i.pattern);
      !o || o.index === void 0 || (s === null || o.index < s.index) && (s = { index: o.index, match: o, def: i });
    }
    if (!s) {
      e.push(Ws(r));
      break;
    }
    s.index > 0 && e.push(Ws(r.slice(0, s.index))), e.push({
      type: s.def.type,
      raw: s.match[0],
      groups: s.match.slice(1).map((i) => i ?? "")
    }), r = r.slice(s.index + s.match[0].length);
  }
  return e;
}
function Lu(n, t) {
  return n.split(`
`).map((e) => Ou(e, t));
}
function Nn(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ru(n, t, e, r = -1) {
  const s = document.createDocumentFragment(), i = Gn(t);
  let o = 0;
  for (const a of n) {
    if (a.type === "text") {
      s.appendChild(document.createTextNode(a.raw)), o += a.raw.length;
      continue;
    }
    const c = o, h = c + a.raw.length;
    if (o = h, r >= c && r <= h) {
      s.appendChild(document.createTextNode(a.raw));
      continue;
    }
    const l = i.get(a.type);
    if (!l) {
      s.appendChild(document.createTextNode(a.raw));
      continue;
    }
    const d = l.render(a, e);
    if (d instanceof HTMLElement && l.onNavigate) {
      const p = l.onNavigate.bind(l);
      d.addEventListener("mousedown", (u) => {
        p(a, e) && u.preventDefault();
      });
    }
    s.appendChild(d);
  }
  return s;
}
function Gn(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    for (const r of e.tokens)
      t.set(r.type, e);
  return t;
}
function go(n, t, e) {
  const r = t.flatMap((a) => a.tokens).filter((a) => !a.pattern.source.startsWith("^")), s = cs(n, r), i = Gn(t), o = document.createDocumentFragment();
  for (const a of s) {
    if (a.type === "text") {
      o.appendChild(document.createTextNode(a.raw));
      continue;
    }
    const c = i.get(a.type);
    if (!c) {
      o.appendChild(document.createTextNode(a.raw));
      continue;
    }
    const h = c.render(a, e);
    if (h instanceof HTMLElement && c.onNavigate) {
      const l = c.onNavigate.bind(c);
      h.addEventListener("mousedown", (d) => {
        l(a, e) && d.preventDefault();
      });
    }
    o.appendChild(h);
  }
  return o;
}
function Nu(n, t, e) {
  const r = Gn(t), s = [];
  for (const i of n) {
    if (i.type === "text") {
      s.push(Nn(i.raw));
      continue;
    }
    const o = r.get(i.type);
    if (!o || !o.renderToHTML) {
      s.push(Nn(i.raw));
      continue;
    }
    s.push(o.renderToHTML(i, e));
  }
  return s.join("");
}
function mo(n, t) {
  const e = t.flatMap((o) => o.tokens).filter((o) => !o.pattern.source.startsWith("^")), r = cs(n, e), s = Gn(t), i = [];
  for (const o of r) {
    if (o.type === "text") {
      i.push(Nn(o.raw));
      continue;
    }
    const a = s.get(o.type);
    if (!a || !a.renderToHTML) {
      i.push(Nn(o.raw));
      continue;
    }
    const c = {
      renderInline: (h) => mo(h, t)
    };
    i.push(a.renderToHTML(o, c));
  }
  return i.join("");
}
function xh(n, t) {
  const e = [];
  for (let r = 0; r < n.length; r++) {
    const s = {
      renderInline: (a) => mo(a, t)
    }, o = Nu(n[r], t, s).trim();
    o ? e.push(`<div data-line="${r}">${o}</div>`) : e.push(`<div data-line="${r}"><br></div>`);
  }
  return e.join(`
`);
}
function zu(n, t, e, r, s) {
  const i = Lu(
    n,
    t.flatMap((a) => a.tokens)
  ), o = [];
  r.innerHTML = "";
  for (let a = 0; a < i.length; a++) {
    const c = i[a].map((l) => l.raw).join("");
    o.push(c.length);
    const h = document.createElement("div");
    if (h.dataset.line = String(a), s?.has(a))
      h.textContent = c, c || h.appendChild(document.createElement("br"));
    else {
      const l = Ru(i[a], t, e);
      l.childNodes.length ? h.appendChild(l) : h.appendChild(document.createElement("br"));
    }
    r.appendChild(h);
  }
  return { lineCount: i.length, lineLengths: o };
}
function Vs(n, t) {
  let e = 0;
  for (let r = 0; r < Math.min(t, n.length); r++)
    n[r] === `
` && e++;
  return e;
}
function Mu(n, t, e, r = {}) {
  const { editorDiv: s, placeholder: i, breadcrumb: o } = n, { notifications: a } = r;
  let c = -1;
  function h(u = !1, w) {
    const g = w ?? jt(s), _ = e.getYDocState(), y = e.getCurrentPage(), C = _.getPage(y).toString();
    c = Vs(C, g);
    const A = /* @__PURE__ */ new Set([c]), D = _.awareness;
    if (D) {
      const x = _.doc.clientID;
      for (const [O, T] of D.getStates().entries())
        O !== x && T.cursor?.page === y && T.cursor.activeLine !== void 0 && A.add(T.cursor.activeLine);
    }
    const P = e.toContext(
      r.navigateFn ?? ((x) => {
      })
    );
    P.renderInline = (x) => go(x, t, P), zu(C, t, P, s, A), i.style.display = C.length ? "none" : "block";
    try {
      gn(s, g);
    } catch {
    }
    if (a) {
      const O = (r.statusPages ?? {})[404] ?? "404", T = e.getCurrentPage(), M = e.getPendingRequestedPage(), V = r.showCreateOverlay !== !1;
      if (T === O && M && V) {
        const S = r.navigateFn;
        a.notify({
          id: "wn-404",
          message: `Page "${M}" not found.`,
          type: "info",
          duration: 0,
          action: {
            label: "Create",
            onClick: () => {
              const z = M, U = e.getYDocState().getPage(z);
              U.toString() === "" && U.insert(0, `# ${z}

`), e.setPendingRequestedPage(null), S && S(z), a.dismiss("wn-404");
            }
          }
        });
      } else
        a.dismiss("wn-404");
    }
  }
  function l() {
    const u = window.getSelection();
    if (!u || !u.isCollapsed) return;
    const w = jt(s), g = e.getYDocState(), _ = e.getCurrentPage(), y = g.getPage(_).toString();
    Vs(y, w) !== c && h();
  }
  function d() {
    o.innerHTML = "";
    const u = e.getTrail();
    u.forEach((w, g) => {
      if (g > 0) {
        const y = document.createElement("span");
        y.className = "wn-crumb-sep", y.textContent = "/", o.appendChild(y);
      }
      const _ = document.createElement("span");
      _.className = "wn-crumb" + (g === u.length - 1 ? " wn-crumb--active" : ""), _.textContent = dr(w), g < u.length - 1 && _.addEventListener("click", () => {
        e.truncateTrail(g);
        const y = e.getTrail(), k = y.length <= 1 ? y[0] : y.slice(1).join("/");
        r.onBreadcrumbNavigate?.(k);
      }), o.appendChild(_);
    }), r.onTrailChange?.(e.getTrail()), p();
  }
  function p() {
    const u = e.getTrail(), w = Lo(window.location.search, u);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${w}${window.location.hash}`
    );
  }
  return { render: h, renderBreadcrumb: d, syncUrlToTrail: p, checkSelectChange: l };
}
class Uu extends Error {
  constructor(t) {
    super(t ?? "Permission denied"), this.name = "PermissionError";
  }
}
const Pu = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`, Bu = {
  404: `# Page Not Found

`,
  403: `# Access Denied

`
};
function Fu(n) {
  return Bu[n] ?? `# Error ${n}

`;
}
function ju(n, t, e, r) {
  let s = null;
  function i(l) {
    s = l;
  }
  function o(l) {
    return r.statusPages?.[l] ?? String(l);
  }
  async function a(l) {
    const d = o(l), p = n.getYDocState();
    p.hasPage(d) || p.getPage(d).insert(0, Fu(l)), await c(d);
  }
  async function c(l) {
    const d = n.getYDocState();
    if ((/* @__PURE__ */ new Set([
      ...Object.values(r.statusPages ?? {}),
      ...Object.keys(r.statusPages ?? {}).map((_) => String(_)),
      "404",
      "403"
    ])).has(l) || n.setPendingRequestedPage(null), !d.hasPage(l)) {
      let _;
      try {
        _ = await t.get(l);
      } catch (y) {
        if (y instanceof Uu) {
          await a(403);
          return;
        }
        throw y;
      }
      if (_) {
        const y = d.getPage(l);
        y.toString() === "" && y.insert(0, _);
      } else {
        n.setPendingRequestedPage(l), await a(404);
        return;
      }
    }
    const u = n.getTrail();
    if (l === u[0]) {
      n.truncateTrail(0), await h(l);
      return;
    }
    const w = l.split("/");
    let g = 0;
    for (let _ = 1; _ < u.length && g < w.length && u[_] === w[g]; _++)
      g++;
    n.truncateTrail(g);
    for (let _ = g; _ < w.length; _++)
      n.pushTrail(w[_]);
    await h(l);
  }
  async function h(l) {
    n.setNavigating(!0);
    const d = n.getYDocState(), p = d.hasPage(l), u = d.getPage(l);
    !u.toString() && !p && (l === "home" ? u.insert(0, Pu) : u.insert(0, `# ${l}

`)), e.editorDiv.innerHTML = "", s && (s.render(!0), s.renderBreadcrumb());
    try {
      const g = document.createRange(), _ = window.getSelection();
      if (_) {
        const y = e.editorDiv.querySelector('[data-line="0"]');
        y ? g.setStart(y, 0) : g.setStart(e.editorDiv, 0), g.collapse(!0), _.removeAllRanges(), _.addRange(g);
      }
    } catch {
    }
    r.onPageLoad?.(l, u.toString()), n.setNavigating(!1), e.editorDiv.focus();
  }
  return { navigateToPage: c, loadPage: h, setRenderAPI: i };
}
const wo = /* @__PURE__ */ new Map();
class $u {
  /**
   * @param {string} room
   */
  constructor(t) {
    this.room = t, this.onmessage = null, this._onChange = (e) => e.key === t && this.onmessage !== null && this.onmessage({ data: fc(e.newValue || "") }), Wa(this._onChange);
  }
  /**
   * @param {ArrayBuffer} buf
   */
  postMessage(t) {
    ii.setItem(this.room, dc(ac(t)));
  }
  close() {
    Va(this._onChange);
  }
}
const Hu = typeof BroadcastChannel > "u" ? $u : BroadcastChannel, ls = (n) => Vt(wo, n, () => {
  const t = ee(), e = new Hu(n);
  return e.onmessage = (r) => t.forEach((s) => s(r.data, "broadcastchannel")), {
    bc: e,
    subs: t
  };
}), Wu = (n, t) => (ls(n).subs.add(t), t), Vu = (n, t) => {
  const e = ls(n), r = e.subs.delete(t);
  return r && e.subs.size === 0 && (e.bc.close(), wo.delete(n)), r;
}, ye = (n, t, e = null) => {
  const r = ls(n);
  r.bc.postMessage(t), r.subs.forEach((s) => s(t, e));
}, yo = 0, us = 1, _o = 2, Cr = (n, t) => {
  K(n, yo);
  const e = bl(t);
  pt(n, e);
}, bo = (n, t, e) => {
  K(n, us), pt(n, Qr(t, e));
}, Zu = (n, t, e) => bo(t, e, St(n)), ko = (n, t, e, r) => {
  try {
    Jr(t, St(n), e);
  } catch (s) {
    r?.(
      /** @type {Error} */
      s
    ), console.error("Caught error while handling a Yjs update", s);
  }
}, Yu = (n, t) => {
  K(n, _o), pt(n, t);
}, qu = ko, Gu = (n, t, e, r, s) => {
  const i = tt(n);
  switch (i) {
    case yo:
      Zu(n, t, e);
      break;
    case us:
      ko(n, e, r, s);
      break;
    case _o:
      qu(n, e, r, s);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return i;
}, Ku = 0, Xu = (n, t, e) => {
  tt(n) === Ku && e(t, te(n));
}, lr = 3e4;
class Ju extends ua {
  /**
   * @param {Y.Doc} doc
   */
  constructor(t) {
    super(), this.doc = t, this.clientID = t.clientID, this.states = /* @__PURE__ */ new Map(), this.meta = /* @__PURE__ */ new Map(), this._checkInterval = /** @type {any} */
    setInterval(() => {
      const e = ne();
      this.getLocalState() !== null && lr / 2 <= e - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated && this.setLocalState(this.getLocalState());
      const r = [];
      this.meta.forEach((s, i) => {
        i !== this.clientID && lr <= e - s.lastUpdated && this.states.has(i) && r.push(i);
      }), r.length > 0 && hs(this, r, "timeout");
    }, Ut(lr / 10)), t.on("destroy", () => {
      this.destroy();
    }), this.setLocalState({});
  }
  destroy() {
    this.emit("destroy", [this]), this.setLocalState(null), super.destroy(), clearInterval(this._checkInterval);
  }
  /**
   * @return {Object<string,any>|null}
   */
  getLocalState() {
    return this.states.get(this.clientID) || null;
  }
  /**
   * @param {Object<string,any>|null} state
   */
  setLocalState(t) {
    const e = this.clientID, r = this.meta.get(e), s = r === void 0 ? 0 : r.clock + 1, i = this.states.get(e);
    t === null ? this.states.delete(e) : this.states.set(e, t), this.meta.set(e, {
      clock: s,
      lastUpdated: ne()
    });
    const o = [], a = [], c = [], h = [];
    t === null ? h.push(e) : i == null ? t != null && o.push(e) : (a.push(e), _e(i, t) || c.push(e)), (o.length > 0 || c.length > 0 || h.length > 0) && this.emit("change", [{ added: o, updated: c, removed: h }, "local"]), this.emit("update", [{ added: o, updated: a, removed: h }, "local"]);
  }
  /**
   * @param {string} field
   * @param {any} value
   */
  setLocalStateField(t, e) {
    const r = this.getLocalState();
    r !== null && this.setLocalState({
      ...r,
      [t]: e
    });
  }
  /**
   * @return {Map<number,Object<string,any>>}
   */
  getStates() {
    return this.states;
  }
}
const hs = (n, t, e) => {
  const r = [];
  for (let s = 0; s < t.length; s++) {
    const i = t[s];
    if (n.states.has(i)) {
      if (n.states.delete(i), i === n.clientID) {
        const o = (
          /** @type {MetaClientState} */
          n.meta.get(i)
        );
        n.meta.set(i, {
          clock: o.clock + 1,
          lastUpdated: ne()
        });
      }
      r.push(i);
    }
  }
  r.length > 0 && (n.emit("change", [{ added: [], updated: [], removed: r }, e]), n.emit("update", [{ added: [], updated: [], removed: r }, e]));
}, Be = (n, t, e = n.states) => {
  const r = t.length, s = xt();
  K(s, r);
  for (let i = 0; i < r; i++) {
    const o = t[i], a = e.get(o) || null, c = (
      /** @type {MetaClientState} */
      n.meta.get(o).clock
    );
    K(s, o), K(s, c), ce(s, JSON.stringify(a));
  }
  return ut(s);
}, Qu = (n, t, e) => {
  const r = se(t), s = ne(), i = [], o = [], a = [], c = [], h = tt(r);
  for (let l = 0; l < h; l++) {
    const d = tt(r);
    let p = tt(r);
    const u = JSON.parse(te(r)), w = n.meta.get(d), g = n.states.get(d), _ = w === void 0 ? 0 : w.clock;
    (_ < p || _ === p && u === null && n.states.has(d)) && (u === null ? d === n.clientID && n.getLocalState() != null ? p++ : n.states.delete(d) : n.states.set(d, u), n.meta.set(d, {
      clock: p,
      lastUpdated: s
    }), w === void 0 && u !== null ? i.push(d) : w !== void 0 && u === null ? c.push(d) : u !== null && (_e(u, g) || a.push(d), o.push(d)));
  }
  (i.length > 0 || a.length > 0 || c.length > 0) && n.emit("change", [{
    added: i,
    updated: a,
    removed: c
  }, e]), (i.length > 0 || o.length > 0 || c.length > 0) && n.emit("update", [{
    added: i,
    updated: o,
    removed: c
  }, e]);
}, th = (n) => Ka(n, (t, e) => `${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join("&"), oe = 0, vo = 3, Se = 1, eh = 2, rn = [];
rn[oe] = (n, t, e, r, s) => {
  K(n, oe);
  const i = Gu(
    t,
    n,
    e.doc,
    e
  );
  r && i === us && !e.synced && (e.synced = !0);
};
rn[vo] = (n, t, e, r, s) => {
  K(n, Se), pt(
    n,
    Be(
      e.awareness,
      Array.from(e.awareness.getStates().keys())
    )
  );
};
rn[Se] = (n, t, e, r, s) => {
  Qu(
    e.awareness,
    St(t),
    e
  );
};
rn[eh] = (n, t, e, r, s) => {
  Xu(
    t,
    e.doc,
    (i, o) => nh(e, o)
  );
};
const Zs = 3e4, nh = (n, t) => console.warn(`Permission denied to access ${n.url}.
${t}`), So = (n, t, e) => {
  const r = se(t), s = xt(), i = tt(r), o = n.messageHandlers[i];
  return /** @type {any} */ o ? o(s, r, n, e, i) : console.error("Unable to compute message"), s;
}, Er = (n, t, e) => {
  t === n.ws && (n.emit("connection-close", [e, n]), n.ws = null, t.close(), n.wsconnecting = !1, n.wsconnected ? (n.wsconnected = !1, n.synced = !1, hs(
    n.awareness,
    Array.from(n.awareness.getStates().keys()).filter(
      (r) => r !== n.doc.clientID
    ),
    n
  ), n.emit("status", [{
    status: "disconnected"
  }])) : n.wsUnsuccessfulReconnects++, setTimeout(
    xo,
    Nr(
      ha(2, n.wsUnsuccessfulReconnects) * 100,
      n.maxBackoffTime
    ),
    n
  ));
}, xo = (n) => {
  if (n.shouldConnect && n.ws === null) {
    const t = new n._WS(n.url, n.protocols);
    t.binaryType = "arraybuffer", n.ws = t, n.wsconnecting = !0, n.wsconnected = !1, n.synced = !1, t.onmessage = (e) => {
      n.wsLastMessageReceived = ne();
      const r = So(n, new Uint8Array(e.data), !0);
      zr(r) > 1 && t.send(ut(r));
    }, t.onerror = (e) => {
      n.emit("connection-error", [e, n]);
    }, t.onclose = (e) => {
      Er(n, t, e);
    }, t.onopen = () => {
      n.wsLastMessageReceived = ne(), n.wsconnecting = !1, n.wsconnected = !0, n.wsUnsuccessfulReconnects = 0, n.emit("status", [{
        status: "connected"
      }]);
      const e = xt();
      if (K(e, oe), Cr(e, n.doc), t.send(ut(e)), n.awareness.getLocalState() !== null) {
        const r = xt();
        K(r, Se), pt(
          r,
          Be(n.awareness, [
            n.doc.clientID
          ])
        ), t.send(ut(r));
      }
    }, n.emit("status", [{
      status: "connecting"
    }]);
  }
}, ur = (n, t) => {
  const e = n.ws;
  n.wsconnected && e && e.readyState === e.OPEN && e.send(t), n.bcconnected && ye(n.bcChannel, t, n);
};
class rh extends Rr {
  /**
   * @param {string} serverUrl
   * @param {string} roomname
   * @param {Y.Doc} doc
   * @param {object} opts
   * @param {boolean} [opts.connect]
   * @param {awarenessProtocol.Awareness} [opts.awareness]
   * @param {Object<string,string>} [opts.params] specify url parameters
   * @param {Array<string>} [opts.protocols] specify websocket protocols
   * @param {typeof WebSocket} [opts.WebSocketPolyfill] Optionall provide a WebSocket polyfill
   * @param {number} [opts.resyncInterval] Request server state every `resyncInterval` milliseconds
   * @param {number} [opts.maxBackoffTime] Maximum amount of time to wait before trying to reconnect (we try to reconnect using exponential backoff)
   * @param {boolean} [opts.disableBc] Disable cross-tab BroadcastChannel communication
   */
  constructor(t, e, r, {
    connect: s = !0,
    awareness: i = new Ju(r),
    params: o = {},
    protocols: a = [],
    WebSocketPolyfill: c = WebSocket,
    resyncInterval: h = -1,
    maxBackoffTime: l = 2500,
    disableBc: d = !1
  } = {}) {
    for (super(); t[t.length - 1] === "/"; )
      t = t.slice(0, t.length - 1);
    this.serverUrl = t, this.bcChannel = t + "/" + e, this.maxBackoffTime = l, this.params = o, this.protocols = a, this.roomname = e, this.doc = r, this._WS = c, this.awareness = i, this.wsconnected = !1, this.wsconnecting = !1, this.bcconnected = !1, this.disableBc = d, this.wsUnsuccessfulReconnects = 0, this.messageHandlers = rn.slice(), this._synced = !1, this.ws = null, this.wsLastMessageReceived = 0, this.shouldConnect = s, this._resyncInterval = 0, h > 0 && (this._resyncInterval = /** @type {any} */
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const p = xt();
        K(p, oe), Cr(p, r), this.ws.send(ut(p));
      }
    }, h)), this._bcSubscriber = (p, u) => {
      if (u !== this) {
        const w = So(this, new Uint8Array(p), !1);
        zr(w) > 1 && ye(this.bcChannel, ut(w), this);
      }
    }, this._updateHandler = (p, u) => {
      if (u !== this) {
        const w = xt();
        K(w, oe), Yu(w, p), ur(this, ut(w));
      }
    }, this.doc.on("update", this._updateHandler), this._awarenessUpdateHandler = ({ added: p, updated: u, removed: w }, g) => {
      const _ = p.concat(u).concat(w), y = xt();
      K(y, Se), pt(
        y,
        Be(i, _)
      ), ur(this, ut(y));
    }, this._exitHandler = () => {
      hs(
        this.awareness,
        [r.clientID],
        "app closed"
      );
    }, re && typeof process < "u" && process.on("exit", this._exitHandler), i.on("update", this._awarenessUpdateHandler), this._checkInterval = /** @type {any} */
    setInterval(() => {
      this.wsconnected && Zs < ne() - this.wsLastMessageReceived && Er(
        this,
        /** @type {WebSocket} */
        this.ws,
        null
      );
    }, Zs / 10), s && this.connect();
  }
  get url() {
    const t = th(this.params);
    return this.serverUrl + "/" + this.roomname + (t.length === 0 ? "" : "?" + t);
  }
  /**
   * @type {boolean}
   */
  get synced() {
    return this._synced;
  }
  set synced(t) {
    this._synced !== t && (this._synced = t, this.emit("synced", [t]), this.emit("sync", [t]));
  }
  destroy() {
    this._resyncInterval !== 0 && clearInterval(this._resyncInterval), clearInterval(this._checkInterval), this.disconnect(), re && typeof process < "u" && process.off("exit", this._exitHandler), this.awareness.off("update", this._awarenessUpdateHandler), this.doc.off("update", this._updateHandler), super.destroy();
  }
  connectBc() {
    if (this.disableBc)
      return;
    this.bcconnected || (Wu(this.bcChannel, this._bcSubscriber), this.bcconnected = !0);
    const t = xt();
    K(t, oe), Cr(t, this.doc), ye(this.bcChannel, ut(t), this);
    const e = xt();
    K(e, oe), bo(e, this.doc), ye(this.bcChannel, ut(e), this);
    const r = xt();
    K(r, vo), ye(
      this.bcChannel,
      ut(r),
      this
    );
    const s = xt();
    K(s, Se), pt(
      s,
      Be(this.awareness, [
        this.doc.clientID
      ])
    ), ye(
      this.bcChannel,
      ut(s),
      this
    );
  }
  disconnectBc() {
    const t = xt();
    K(t, Se), pt(
      t,
      Be(this.awareness, [
        this.doc.clientID
      ], /* @__PURE__ */ new Map())
    ), ur(this, ut(t)), this.bcconnected && (Vu(this.bcChannel, this._bcSubscriber), this.bcconnected = !1);
  }
  disconnect() {
    this.shouldConnect = !1, this.disconnectBc(), this.ws !== null && Er(this, this.ws, null);
  }
  connect() {
    this.shouldConnect = !0, !this.wsconnected && this.ws === null && (xo(this), this.connectBc());
  }
}
const Co = "__ync_update__";
async function sh(n, t) {
  const e = Qr(n), r = oh(e);
  await t.set(Co, r);
}
async function ih(n, t) {
  const e = await t.get(Co);
  if (e) {
    const r = ah(e);
    Jr(n, r);
  }
}
function oh(n) {
  const t = String.fromCharCode(...n);
  return btoa(t);
}
function ah(n) {
  const t = atob(n);
  return Uint8Array.from(t, (e) => e.charCodeAt(0));
}
const Ys = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#ffeb3b",
  "#ff9800",
  "#ff5722"
];
function ch(n) {
  return Ys[n % Ys.length] ?? "#888";
}
const Ch = {
  name: "remote-cursors",
  version: "1.0.0",
  kind: "ui",
  slots: ["wn-overlay"],
  priority: 0,
  onMount(n) {
    n.style.position = "absolute", n.style.top = "0", n.style.left = "0", n.style.pointerEvents = "none", n.style.zIndex = "10";
  }
};
function lh(n, t, e, r) {
  if (n.innerHTML = "", !t) return;
  const s = t.getStates();
  for (const [i, o] of s.entries()) {
    if (i === r || !o.cursor) continue;
    const a = o.user?.color ?? ch(i), c = o.user?.name ?? `User ${i}`, h = document.createElement("div");
    h.className = "wn-remote-cursor";
    const l = document.createElement("span");
    l.className = "wn-remote-cursor-caret", l.style.backgroundColor = a;
    const d = document.createElement("span");
    d.className = "wn-remote-cursor-label", d.style.backgroundColor = a, d.textContent = c, h.appendChild(l), h.appendChild(d);
    const p = uh(e, o.cursor.offset, n);
    p && (h.style.left = `${p.left}px`, h.style.top = `${p.top}px`), n.appendChild(h);
  }
}
function uh(n, t, e) {
  let r = t;
  const s = Array.from(
    n.querySelectorAll("[data-line]")
  );
  s.sort((l, d) => parseInt(l.dataset.line ?? "0", 10) - parseInt(d.dataset.line ?? "0", 10));
  const o = e.offsetParent?.getBoundingClientRect(), a = o?.left ?? 0, c = o?.top ?? 0;
  for (const l of s) {
    const d = Fe(l);
    if (r <= d) {
      const p = l.getBoundingClientRect();
      return {
        left: p.left - a + r * 8,
        top: p.top - c
      };
    }
    r -= d + 1;
  }
  const h = s[s.length - 1];
  if (h) {
    const l = h.getBoundingClientRect();
    return {
      left: l.left - a + Fe(h) * 8,
      top: l.top - c
    };
  }
  return null;
}
function hh(n, t, e, r, s, i, o, a, c) {
  function h(d) {
    const p = window.getSelection();
    if (!p || !p.rangeCount) return;
    const u = p.getRangeAt(0);
    u.deleteContents();
    const w = document.createTextNode(d);
    u.insertNode(w), u.setStart(w, d.length), u.collapse(!0), p.removeAllRanges(), p.addRange(u), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  async function l() {
    const d = a.saveDebounceMs ?? 600, p = r.getYDocState();
    await ih(p.doc, o);
    let u = null;
    if (a.syncServer) {
      const O = `worldnotes-${r.getCurrentPage()}`;
      u = new rh(
        a.syncServer,
        O,
        p.doc
      ), p.setAwareness(u.awareness);
      const T = u.awareness;
      T.on("change", () => {
        lh(
          n.overlay,
          T,
          n.editorDiv,
          p.doc.clientID
        );
      }), u.on("status", (M) => {
        M.status === "connected" && s.render(!0);
      }), p.doc.on("update", (M, V) => {
        V === u && s.render(!0);
      });
    }
    const w = async () => {
      await sh(p.doc, o);
    }, g = () => {
      r.clearSaveTimer();
      const x = setTimeout(async () => {
        await w();
        const O = r.getCurrentPage(), T = p.getPage(O);
        a.onSave?.(O, T.toString());
      }, d);
      r.setSaveTimer(x);
    };
    let _ = !1;
    function y(x) {
      let O = "", T = !1;
      function M(V) {
        V.nodeType === Node.TEXT_NODE ? O += V.textContent ?? "" : V instanceof HTMLElement && (V.dataset.raw !== void 0 ? O += V.dataset.raw : (V.dataset.line !== void 0 && (T && (O += `
`), T = !0), V.childNodes.forEach(M)));
      }
      return M(x), O;
    }
    n.editorDiv.addEventListener("input", () => {
      if (r.isNavigating() || _) return;
      _ = !0;
      const x = r.getCurrentPage(), O = p.getPage(x), T = y(n.editorDiv), M = O.toString();
      T !== M && p.doc.transact(() => {
        O.delete(0, M.length), O.insert(0, T);
      });
      const V = jt(n.editorDiv);
      let S = 0;
      for (let m = 0; m < Math.min(V, T.length); m++)
        T[m] === `
` && S++;
      p.awareness?.setLocalStateField?.("cursor", { offset: V, page: x, activeLine: S }), s.render();
      for (const m of t)
        m.onUpdate?.();
      g(), _ = !1;
    }), n.editorDiv.addEventListener("paste", (x) => {
      x.preventDefault();
      const O = x.clipboardData?.getData("text/plain") ?? "";
      h(O);
    }), n.editorDiv.addEventListener("keydown", (x) => {
      if ((x.ctrlKey || x.metaKey) && !x.shiftKey && x.key === "z") {
        x.preventDefault();
        const O = p.undoManager;
        O?.canUndo() && (O.undo(), s.render(!0));
        return;
      }
      if ((x.ctrlKey || x.metaKey) && x.shiftKey && x.key === "z") {
        x.preventDefault();
        const O = p.undoManager;
        O?.canRedo() && (O.redo(), s.render(!0));
        return;
      }
      if (x.ctrlKey && !x.shiftKey && x.key === "y") {
        x.preventDefault();
        const O = p.undoManager;
        O?.canRedo() && (O.redo(), s.render(!0));
        return;
      }
      {
        const O = r.getCurrentPage(), T = {
          navigate: (M) => {
            i.navigateToPage(M);
          },
          getTrail: () => r.getTrail(),
          getCurrentPage: () => r.getCurrentPage(),
          getWorld: () => p.getWorld(),
          getDoc: () => p.doc
        };
        T.renderInline = (M) => go(M, t, T);
        for (const M of t) {
          if (!M.onKeydown) continue;
          const V = M.onKeydown(x, T);
          if (V !== void 0 && V !== !1 && "cursorOffset" in V) {
            x.preventDefault(), s.render(!0, V.cursorOffset);
            const S = p.getPage(O).toString();
            let z = 0;
            for (let U = 0; U < Math.min(V.cursorOffset, S.length); U++)
              S[U] === `
` && z++;
            p.awareness?.setLocalStateField?.("cursor", { offset: V.cursorOffset, page: O, activeLine: z }), g();
            return;
          }
        }
      }
      if (x.key === "Tab")
        x.preventDefault(), h("  ");
      else if (x.key === "Enter")
        x.preventDefault(), h(`
`);
      else if (x.key === "Backspace") {
        x.preventDefault();
        const O = window.getSelection();
        if (!O || !O.rangeCount) return;
        const T = O.getRangeAt(0);
        if (!T.collapsed) {
          T.deleteContents(), O.removeAllRanges(), O.addRange(T), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
          return;
        }
        const M = jt(n.editorDiv);
        if (M > 0) {
          const V = r.getCurrentPage(), S = p.getPage(V), z = S.toString(), m = z.slice(0, M - 1) + z.slice(M);
          p.doc.transact(() => {
            S.delete(0, z.length), S.insert(0, m);
          }), s.render(), gn(n.editorDiv, M - 1), g();
        }
      }
    });
    let k = !1;
    document.addEventListener("selectionchange", () => {
      _ || k || r.isNavigating() || (k = !0, requestAnimationFrame(() => {
        k = !1, s.checkSelectChange();
      }));
    });
    const C = r.getCurrentPage();
    await i.loadPage(C);
    const A = p.getPage(C), D = new Al(A, { captureTimeout: 0 });
    p.setUndoManager(D);
    const P = {
      "wn-header": n.header,
      "wn-toolbar": n.toolbar,
      "wn-overlay": n.overlay,
      "wn-left-sidepanel": n.leftSidepanel,
      "wn-right-sidepanel": n.rightSidepanel,
      "wn-footer": n.footer
    };
    for (const x of e)
      for (const O of x.slots) {
        const T = P[O];
        T && x.onMount(T);
      }
    return {
      destroy() {
        r.clearSaveTimer(), u?.destroy(), c.destroy();
        for (const x of t)
          try {
            x.onDestroy?.();
          } catch (O) {
            console.error(`Plugin "${x.name}" onDestroy failed:`, O);
          }
        for (const x of e)
          try {
            x.onDestroy?.();
          } catch (O) {
            console.error(`UI plugin "${x.name}" onDestroy failed:`, O);
          }
        p.destroy(), n.container.innerHTML = "";
      },
      navigate(x) {
        i.navigateToPage(x);
      },
      getCurrentPage() {
        return r.getCurrentPage();
      },
      getTrail() {
        return r.getTrail();
      },
      getContent() {
        const x = r.getCurrentPage();
        return p.getPage(x).toString();
      },
      setContent(x) {
        const O = r.getCurrentPage(), T = p.getPage(O);
        p.doc.transact(() => {
          T.delete(0, T.length), T.insert(0, x);
        }), s.render(!0);
      },
      undo() {
        const x = p.undoManager;
        return x?.canUndo() ? (x.undo(), s.render(!0), !0) : !1;
      },
      redo() {
        const x = p.undoManager;
        return x?.canRedo() ? (x.redo(), s.render(!0), !0) : !1;
      },
      canUndo() {
        return p.undoManager?.canUndo() ?? !1;
      },
      canRedo() {
        return p.undoManager?.canRedo() ?? !1;
      },
      insertText(x) {
        h(x);
      },
      deleteForward() {
        const x = window.getSelection();
        if (!x || !x.rangeCount) return;
        if (x.isCollapsed)
          try {
            x.modify("extend", "forward", "character");
          } catch {
            const T = r.getCurrentPage(), M = p.getPage(T).toString(), V = jt(n.editorDiv);
            if (V >= M.length) return;
            const S = M.slice(0, V) + M.slice(V + 1);
            p.getPage(T).delete(0, M.length), p.getPage(T).insert(0, S), s.render(!0), gn(n.editorDiv, V);
            return;
          }
        const O = x.getRangeAt(0);
        O.deleteContents(), x.removeAllRanges(), x.addRange(O), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      deleteBackward() {
        const x = window.getSelection();
        if (!x || !x.rangeCount) return;
        if (x.isCollapsed)
          try {
            x.modify("extend", "backward", "character");
          } catch {
            const T = r.getCurrentPage(), M = p.getPage(T).toString(), V = jt(n.editorDiv);
            if (V <= 0) return;
            const S = M.slice(0, V - 1) + M.slice(V);
            p.getPage(T).delete(0, M.length), p.getPage(T).insert(0, S), s.render(!0), gn(n.editorDiv, V - 1);
            return;
          }
        const O = x.getRangeAt(0);
        O.deleteContents(), x.removeAllRanges(), x.addRange(O), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      getSelection() {
        const x = window.getSelection();
        if (!x || !x.rangeCount) return null;
        const O = x.toString(), T = jt(n.editorDiv), M = T + O.length;
        return { text: O, start: T, end: Math.max(T, M) };
      },
      notify(x) {
        return c.notify(x);
      },
      dismiss(x) {
        c.dismiss(x);
      }
    };
  }
  return { mount: l };
}
const dh = 5, qs = 150, fh = 4e3, Gs = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗"
};
let ph = 0;
function gh(n) {
  const t = /* @__PURE__ */ new Map(), e = [];
  function r(h) {
    const l = t.get(h);
    if (l) return l;
    const d = document.createElement("div");
    return d.className = `wn-toast-container wn-toast-container--${h}`, d.setAttribute("role", "log"), n.appendChild(d), t.set(h, d), d;
  }
  function s(h) {
    const l = h.type ?? "info", d = h.id ?? `toast-${ph++}`, p = document.createElement("div");
    p.className = "wn-toast", l !== "info" && p.classList.add(`wn-toast--${l}`), p.setAttribute("data-toast-id", d), p.setAttribute(
      "aria-live",
      l === "error" ? "assertive" : "polite"
    );
    const u = document.createElement("span");
    u.className = "wn-toast__icon", u.textContent = Gs[l] ?? Gs.info;
    const w = document.createElement("span");
    w.className = "wn-toast__message", w.textContent = h.message;
    const g = document.createElement("span");
    g.className = "wn-toast__actions", p.appendChild(u), p.appendChild(w), p.appendChild(g);
    const _ = () => {
      const k = e.find((C) => C.id === d);
      k?.timer && (clearTimeout(k.timer), k.timer = null), p.classList.add("wn-toast--exiting"), setTimeout(() => {
        p.remove();
        const C = e.findIndex((A) => A.id === d);
        C !== -1 && e.splice(C, 1);
      }, qs);
    };
    if (h.action) {
      const k = document.createElement("button");
      k.className = "wn-toast__action-btn", k.textContent = h.action.label, k.addEventListener("click", () => {
        h.action.onClick(), _();
      }), g.appendChild(k);
    }
    const y = document.createElement("button");
    return y.className = "wn-toast__close-btn", y.textContent = "×", y.addEventListener("click", () => {
      _();
    }), g.appendChild(y), { el: p, id: d };
  }
  function i(h) {
    const l = e.filter((d) => d.el.parentElement?.classList.contains(`wn-toast-container--${h}`));
    for (; l.length > dh; ) {
      const d = l.shift();
      d.timer && (clearTimeout(d.timer), d.timer = null), d.el.remove();
      const p = e.indexOf(d);
      p !== -1 && e.splice(p, 1);
    }
  }
  function o(h) {
    if (h.id && e.find((y) => y.id === h.id))
      return h.id;
    const { el: l, id: d } = s(h), p = h.position ?? "top-right", u = r(p), w = { id: d, timer: null, el: l };
    u.appendChild(l), e.push(w), i(p);
    const g = h.duration ?? fh;
    return g > 0 && (w.timer = setTimeout(() => {
      a(d);
    }, g)), d;
  }
  function a(h) {
    const l = e.find((d) => d.id === h);
    l && (l.timer && (clearTimeout(l.timer), l.timer = null), l.el.classList.add("wn-toast--exiting"), setTimeout(() => {
      l.el.remove();
      const d = e.indexOf(l);
      d !== -1 && e.splice(d, 1);
    }, qs));
  }
  function c() {
    for (const h of e)
      h.timer && clearTimeout(h.timer), h.el.remove();
    e.length = 0;
    for (const h of t.values())
      h.remove();
    t.clear();
  }
  return { notify: o, dismiss: a, destroy: c };
}
class mh {
  constructor(t, e = {}) {
    this.registry = new ia(), this.storage = new Oo(), this.options = {}, this._mounted = !1, this._slotElements = null, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
    for (const r of ra)
      this.registry.register(r);
  }
  /**
   * Register a plugin manifest (or replace a built-in by matching name).
   * Validates semver, detects conflicts, and fires lifecycle hooks.
   *
   * @param manifest - PluginManifest to register
   * @throws Error if version is invalid or a token/slot conflict is detected
   */
  use(t) {
    if (this.registry.register(t), this._mounted && t.kind === "ui" && this._slotElements)
      for (const e of t.slots) {
        const r = this._slotElements[e];
        r && t.onMount(r);
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
  withStorage(t) {
    return this.storage = t, this;
  }
  /**
   * Mount the editor into the provided element and return a live EditorInstance.
   * Injects required styles, sets up event listeners, and loads the initial page.
   */
  async mount() {
    const t = this.registry.allUIPlugins().sort((r, s) => (r.priority ?? 0) - (s.priority ?? 0)), e = await wh(
      this.el,
      this.registry.allContentPlugins(),
      t,
      this.storage,
      this.options
    );
    return this._mounted = !0, this._slotElements = {
      "wn-header": this.el.querySelector(".wn-header"),
      "wn-toolbar": this.el.querySelector(".wn-toolbar"),
      "wn-overlay": this.el.querySelector(".wn-overlay"),
      "wn-left-sidepanel": this.el.querySelector(".wn-left-sidepanel"),
      "wn-right-sidepanel": this.el.querySelector(".wn-right-sidepanel"),
      "wn-footer": this.el.querySelector(".wn-footer")
    }, e;
  }
}
function Eh(n, t = {}) {
  return new mh(n, t);
}
async function wh(n, t, e, r, s) {
  const i = Eu(r, s), o = Iu(n, s.theme), a = gh(o.container), c = ju(i, r, o, s), h = {
    navigateFn: (p) => {
      c.navigateToPage(p);
    },
    onBreadcrumbNavigate: (p) => {
      c.loadPage(p);
    },
    onTrailChange: s.onTrailChange,
    statusPages: s.statusPages,
    showCreateOverlay: s.showCreateOverlay,
    notifications: a
  }, l = Mu(o, t, i, h);
  return c.setRenderAPI(l), hh(
    o,
    t,
    e,
    i,
    l,
    c,
    r,
    s,
    a
  ).mount();
}
const yh = "worldnotes", ie = "pages";
class Th {
  constructor(t = yh) {
    this.db = null, this.dbName = t;
  }
  /**
   * Open (or create) the IndexedDB database.
   * Must be called before get/set/keys, or those methods will call it lazily.
   */
  async open() {
    this.db || (this.db = await new Promise((t, e) => {
      const r = indexedDB.open(this.dbName, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore(ie);
      }, r.onsuccess = () => t(r.result), r.onerror = () => e(r.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(t) {
    const e = await this.ensureOpen();
    return new Promise((r, s) => {
      const o = e.transaction(ie, "readonly").objectStore(ie).get(t);
      o.onsuccess = () => r(o.result ?? null), o.onerror = () => s(o.error);
    });
  }
  async set(t, e) {
    const r = await this.ensureOpen();
    return new Promise((s, i) => {
      const a = r.transaction(ie, "readwrite").objectStore(ie).put(e, t);
      a.onsuccess = () => s(), a.onerror = () => i(a.error);
    });
  }
  async keys() {
    const t = await this.ensureOpen();
    return new Promise((e, r) => {
      const i = t.transaction(ie, "readonly").objectStore(ie).getAllKeys();
      i.onsuccess = () => e(i.result), i.onerror = () => r(i.error);
    });
  }
}
class Dh {
  constructor(t = {}) {
    this.undoStack = [], this.redoStack = [], this.maxDepth = Math.max(1, t.maxDepth ?? 50);
  }
  push(t) {
    this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === t || (this.undoStack.push(t), this.redoStack = [], this.undoStack.length > this.maxDepth && this.undoStack.shift());
  }
  undo(t) {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(t);
    const e = this.undoStack.pop();
    return this.undoStack.length === 0 ? e : this.undoStack[this.undoStack.length - 1];
  }
  redo(t) {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(t);
    const e = this.redoStack.pop();
    return this.redoStack.length > this.maxDepth && this.redoStack.shift(), e;
  }
  canUndo() {
    return this.undoStack.length > 1;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  clear() {
    this.undoStack = [], this.redoStack = [];
  }
}
var fn = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function _h(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
function pn(n) {
  throw new Error('Could not dynamically require "' + n + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var hr = { exports: {} };
var Ks;
function bh() {
  return Ks || (Ks = 1, (function(n, t) {
    (function(e) {
      n.exports = e();
    })(function() {
      return (function e(r, s, i) {
        function o(h, l) {
          if (!s[h]) {
            if (!r[h]) {
              var d = typeof pn == "function" && pn;
              if (!l && d) return d(h, !0);
              if (a) return a(h, !0);
              var p = new Error("Cannot find module '" + h + "'");
              throw p.code = "MODULE_NOT_FOUND", p;
            }
            var u = s[h] = { exports: {} };
            r[h][0].call(u.exports, function(w) {
              var g = r[h][1][w];
              return o(g || w);
            }, u, u.exports, e, r, s, i);
          }
          return s[h].exports;
        }
        for (var a = typeof pn == "function" && pn, c = 0; c < i.length; c++) o(i[c]);
        return o;
      })({ 1: [function(e, r, s) {
        var i = e("./utils"), o = e("./support"), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        s.encode = function(c) {
          for (var h, l, d, p, u, w, g, _ = [], y = 0, k = c.length, C = k, A = i.getTypeOf(c) !== "string"; y < c.length; ) C = k - y, d = A ? (h = c[y++], l = y < k ? c[y++] : 0, y < k ? c[y++] : 0) : (h = c.charCodeAt(y++), l = y < k ? c.charCodeAt(y++) : 0, y < k ? c.charCodeAt(y++) : 0), p = h >> 2, u = (3 & h) << 4 | l >> 4, w = 1 < C ? (15 & l) << 2 | d >> 6 : 64, g = 2 < C ? 63 & d : 64, _.push(a.charAt(p) + a.charAt(u) + a.charAt(w) + a.charAt(g));
          return _.join("");
        }, s.decode = function(c) {
          var h, l, d, p, u, w, g = 0, _ = 0, y = "data:";
          if (c.substr(0, y.length) === y) throw new Error("Invalid base64 input, it looks like a data url.");
          var k, C = 3 * (c = c.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (c.charAt(c.length - 1) === a.charAt(64) && C--, c.charAt(c.length - 2) === a.charAt(64) && C--, C % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (k = o.uint8array ? new Uint8Array(0 | C) : new Array(0 | C); g < c.length; ) h = a.indexOf(c.charAt(g++)) << 2 | (p = a.indexOf(c.charAt(g++))) >> 4, l = (15 & p) << 4 | (u = a.indexOf(c.charAt(g++))) >> 2, d = (3 & u) << 6 | (w = a.indexOf(c.charAt(g++))), k[_++] = h, u !== 64 && (k[_++] = l), w !== 64 && (k[_++] = d);
          return k;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(e, r, s) {
        var i = e("./external"), o = e("./stream/DataWorker"), a = e("./stream/Crc32Probe"), c = e("./stream/DataLengthProbe");
        function h(l, d, p, u, w) {
          this.compressedSize = l, this.uncompressedSize = d, this.crc32 = p, this.compression = u, this.compressedContent = w;
        }
        h.prototype = { getContentWorker: function() {
          var l = new o(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new c("data_length")), d = this;
          return l.on("end", function() {
            if (this.streamInfo.data_length !== d.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), l;
        }, getCompressedWorker: function() {
          return new o(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, h.createWorkerFrom = function(l, d, p) {
          return l.pipe(new a()).pipe(new c("uncompressedSize")).pipe(d.compressWorker(p)).pipe(new c("compressedSize")).withStreamInfo("compression", d);
        }, r.exports = h;
      }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(e, r, s) {
        var i = e("./stream/GenericWorker");
        s.STORE = { magic: "\0\0", compressWorker: function() {
          return new i("STORE compression");
        }, uncompressWorker: function() {
          return new i("STORE decompression");
        } }, s.DEFLATE = e("./flate");
      }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(e, r, s) {
        var i = e("./utils"), o = (function() {
          for (var a, c = [], h = 0; h < 256; h++) {
            a = h;
            for (var l = 0; l < 8; l++) a = 1 & a ? 3988292384 ^ a >>> 1 : a >>> 1;
            c[h] = a;
          }
          return c;
        })();
        r.exports = function(a, c) {
          return a !== void 0 && a.length ? i.getTypeOf(a) !== "string" ? (function(h, l, d, p) {
            var u = o, w = p + d;
            h ^= -1;
            for (var g = p; g < w; g++) h = h >>> 8 ^ u[255 & (h ^ l[g])];
            return -1 ^ h;
          })(0 | c, a, a.length, 0) : (function(h, l, d, p) {
            var u = o, w = p + d;
            h ^= -1;
            for (var g = p; g < w; g++) h = h >>> 8 ^ u[255 & (h ^ l.charCodeAt(g))];
            return -1 ^ h;
          })(0 | c, a, a.length, 0) : 0;
        };
      }, { "./utils": 32 }], 5: [function(e, r, s) {
        s.base64 = !1, s.binary = !1, s.dir = !1, s.createFolders = !0, s.date = null, s.compression = null, s.compressionOptions = null, s.comment = null, s.unixPermissions = null, s.dosPermissions = null;
      }, {}], 6: [function(e, r, s) {
        var i = null;
        i = typeof Promise < "u" ? Promise : e("lie"), r.exports = { Promise: i };
      }, { lie: 37 }], 7: [function(e, r, s) {
        var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", o = e("pako"), a = e("./utils"), c = e("./stream/GenericWorker"), h = i ? "uint8array" : "array";
        function l(d, p) {
          c.call(this, "FlateWorker/" + d), this._pako = null, this._pakoAction = d, this._pakoOptions = p, this.meta = {};
        }
        s.magic = "\b\0", a.inherits(l, c), l.prototype.processChunk = function(d) {
          this.meta = d.meta, this._pako === null && this._createPako(), this._pako.push(a.transformTo(h, d.data), !1);
        }, l.prototype.flush = function() {
          c.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
        }, l.prototype.cleanUp = function() {
          c.prototype.cleanUp.call(this), this._pako = null;
        }, l.prototype._createPako = function() {
          this._pako = new o[this._pakoAction]({ raw: !0, level: this._pakoOptions.level || -1 });
          var d = this;
          this._pako.onData = function(p) {
            d.push({ data: p, meta: d.meta });
          };
        }, s.compressWorker = function(d) {
          return new l("Deflate", d);
        }, s.uncompressWorker = function() {
          return new l("Inflate", {});
        };
      }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, r, s) {
        function i(u, w) {
          var g, _ = "";
          for (g = 0; g < w; g++) _ += String.fromCharCode(255 & u), u >>>= 8;
          return _;
        }
        function o(u, w, g, _, y, k) {
          var C, A, D = u.file, P = u.compression, x = k !== h.utf8encode, O = a.transformTo("string", k(D.name)), T = a.transformTo("string", h.utf8encode(D.name)), M = D.comment, V = a.transformTo("string", k(M)), S = a.transformTo("string", h.utf8encode(M)), z = T.length !== D.name.length, m = S.length !== M.length, U = "", et = "", $ = "", nt = D.dir, H = D.date, Q = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          w && !g || (Q.crc32 = u.crc32, Q.compressedSize = u.compressedSize, Q.uncompressedSize = u.uncompressedSize);
          var R = 0;
          w && (R |= 8), x || !z && !m || (R |= 2048);
          var L = 0, J = 0;
          nt && (L |= 16), y === "UNIX" ? (J = 798, L |= (function(Y, ht) {
            var vt = Y;
            return Y || (vt = ht ? 16893 : 33204), (65535 & vt) << 16;
          })(D.unixPermissions, nt)) : (J = 20, L |= (function(Y) {
            return 63 & (Y || 0);
          })(D.dosPermissions)), C = H.getUTCHours(), C <<= 6, C |= H.getUTCMinutes(), C <<= 5, C |= H.getUTCSeconds() / 2, A = H.getUTCFullYear() - 1980, A <<= 4, A |= H.getUTCMonth() + 1, A <<= 5, A |= H.getUTCDate(), z && (et = i(1, 1) + i(l(O), 4) + T, U += "up" + i(et.length, 2) + et), m && ($ = i(1, 1) + i(l(V), 4) + S, U += "uc" + i($.length, 2) + $);
          var q = "";
          return q += `
\0`, q += i(R, 2), q += P.magic, q += i(C, 2), q += i(A, 2), q += i(Q.crc32, 4), q += i(Q.compressedSize, 4), q += i(Q.uncompressedSize, 4), q += i(O.length, 2), q += i(U.length, 2), { fileRecord: d.LOCAL_FILE_HEADER + q + O + U, dirRecord: d.CENTRAL_FILE_HEADER + i(J, 2) + q + i(V.length, 2) + "\0\0\0\0" + i(L, 4) + i(_, 4) + O + U + V };
        }
        var a = e("../utils"), c = e("../stream/GenericWorker"), h = e("../utf8"), l = e("../crc32"), d = e("../signature");
        function p(u, w, g, _) {
          c.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = w, this.zipPlatform = g, this.encodeFileName = _, this.streamFiles = u, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        a.inherits(p, c), p.prototype.push = function(u) {
          var w = u.meta.percent || 0, g = this.entriesCount, _ = this._sources.length;
          this.accumulate ? this.contentBuffer.push(u) : (this.bytesWritten += u.data.length, c.prototype.push.call(this, { data: u.data, meta: { currentFile: this.currentFile, percent: g ? (w + 100 * (g - _ - 1)) / g : 100 } }));
        }, p.prototype.openedSource = function(u) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = u.file.name;
          var w = this.streamFiles && !u.file.dir;
          if (w) {
            var g = o(u, w, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: g.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = !0;
        }, p.prototype.closedSource = function(u) {
          this.accumulate = !1;
          var w = this.streamFiles && !u.file.dir, g = o(u, w, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(g.dirRecord), w) this.push({ data: (function(_) {
            return d.DATA_DESCRIPTOR + i(_.crc32, 4) + i(_.compressedSize, 4) + i(_.uncompressedSize, 4);
          })(u), meta: { percent: 100 } });
          else for (this.push({ data: g.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, p.prototype.flush = function() {
          for (var u = this.bytesWritten, w = 0; w < this.dirRecords.length; w++) this.push({ data: this.dirRecords[w], meta: { percent: 100 } });
          var g = this.bytesWritten - u, _ = (function(y, k, C, A, D) {
            var P = a.transformTo("string", D(A));
            return d.CENTRAL_DIRECTORY_END + "\0\0\0\0" + i(y, 2) + i(y, 2) + i(k, 4) + i(C, 4) + i(P.length, 2) + P;
          })(this.dirRecords.length, g, u, this.zipComment, this.encodeFileName);
          this.push({ data: _, meta: { percent: 100 } });
        }, p.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, p.prototype.registerPrevious = function(u) {
          this._sources.push(u);
          var w = this;
          return u.on("data", function(g) {
            w.processChunk(g);
          }), u.on("end", function() {
            w.closedSource(w.previous.streamInfo), w._sources.length ? w.prepareNextSource() : w.end();
          }), u.on("error", function(g) {
            w.error(g);
          }), this;
        }, p.prototype.resume = function() {
          return !!c.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
        }, p.prototype.error = function(u) {
          var w = this._sources;
          if (!c.prototype.error.call(this, u)) return !1;
          for (var g = 0; g < w.length; g++) try {
            w[g].error(u);
          } catch {
          }
          return !0;
        }, p.prototype.lock = function() {
          c.prototype.lock.call(this);
          for (var u = this._sources, w = 0; w < u.length; w++) u[w].lock();
        }, r.exports = p;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, r, s) {
        var i = e("../compressions"), o = e("./ZipFileWorker");
        s.generateWorker = function(a, c, h) {
          var l = new o(c.streamFiles, h, c.platform, c.encodeFileName), d = 0;
          try {
            a.forEach(function(p, u) {
              d++;
              var w = (function(k, C) {
                var A = k || C, D = i[A];
                if (!D) throw new Error(A + " is not a valid compression method !");
                return D;
              })(u.options.compression, c.compression), g = u.options.compressionOptions || c.compressionOptions || {}, _ = u.dir, y = u.date;
              u._compressWorker(w, g).withStreamInfo("file", { name: p, dir: _, date: y, comment: u.comment || "", unixPermissions: u.unixPermissions, dosPermissions: u.dosPermissions }).pipe(l);
            }), l.entriesCount = d;
          } catch (p) {
            l.error(p);
          }
          return l;
        };
      }, { "../compressions": 3, "./ZipFileWorker": 8 }], 10: [function(e, r, s) {
        function i() {
          if (!(this instanceof i)) return new i();
          if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
          this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
            var o = new i();
            for (var a in this) typeof this[a] != "function" && (o[a] = this[a]);
            return o;
          };
        }
        (i.prototype = e("./object")).loadAsync = e("./load"), i.support = e("./support"), i.defaults = e("./defaults"), i.version = "3.10.1", i.loadAsync = function(o, a) {
          return new i().loadAsync(o, a);
        }, i.external = e("./external"), r.exports = i;
      }, { "./defaults": 5, "./external": 6, "./load": 11, "./object": 15, "./support": 30 }], 11: [function(e, r, s) {
        var i = e("./utils"), o = e("./external"), a = e("./utf8"), c = e("./zipEntries"), h = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
        function d(p) {
          return new o.Promise(function(u, w) {
            var g = p.decompressed.getContentWorker().pipe(new h());
            g.on("error", function(_) {
              w(_);
            }).on("end", function() {
              g.streamInfo.crc32 !== p.decompressed.crc32 ? w(new Error("Corrupted zip : CRC32 mismatch")) : u();
            }).resume();
          });
        }
        r.exports = function(p, u) {
          var w = this;
          return u = i.extend(u || {}, { base64: !1, checkCRC32: !1, optimizedBinaryString: !1, createFolders: !1, decodeFileName: a.utf8decode }), l.isNode && l.isStream(p) ? o.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : i.prepareContent("the loaded zip file", p, !0, u.optimizedBinaryString, u.base64).then(function(g) {
            var _ = new c(u);
            return _.load(g), _;
          }).then(function(g) {
            var _ = [o.Promise.resolve(g)], y = g.files;
            if (u.checkCRC32) for (var k = 0; k < y.length; k++) _.push(d(y[k]));
            return o.Promise.all(_);
          }).then(function(g) {
            for (var _ = g.shift(), y = _.files, k = 0; k < y.length; k++) {
              var C = y[k], A = C.fileNameStr, D = i.resolve(C.fileNameStr);
              w.file(D, C.decompressed, { binary: !0, optimizedBinaryString: !0, date: C.date, dir: C.dir, comment: C.fileCommentStr.length ? C.fileCommentStr : null, unixPermissions: C.unixPermissions, dosPermissions: C.dosPermissions, createFolders: u.createFolders }), C.dir || (w.file(D).unsafeOriginalName = A);
            }
            return _.zipComment.length && (w.comment = _.zipComment), w;
          });
        };
      }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, r, s) {
        var i = e("../utils"), o = e("../stream/GenericWorker");
        function a(c, h) {
          o.call(this, "Nodejs stream input adapter for " + c), this._upstreamEnded = !1, this._bindStream(h);
        }
        i.inherits(a, o), a.prototype._bindStream = function(c) {
          var h = this;
          (this._stream = c).pause(), c.on("data", function(l) {
            h.push({ data: l, meta: { percent: 0 } });
          }).on("error", function(l) {
            h.isPaused ? this.generatedError = l : h.error(l);
          }).on("end", function() {
            h.isPaused ? h._upstreamEnded = !0 : h.end();
          });
        }, a.prototype.pause = function() {
          return !!o.prototype.pause.call(this) && (this._stream.pause(), !0);
        }, a.prototype.resume = function() {
          return !!o.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), !0);
        }, r.exports = a;
      }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(e, r, s) {
        var i = e("readable-stream").Readable;
        function o(a, c, h) {
          i.call(this, c), this._helper = a;
          var l = this;
          a.on("data", function(d, p) {
            l.push(d) || l._helper.pause(), h && h(p);
          }).on("error", function(d) {
            l.emit("error", d);
          }).on("end", function() {
            l.push(null);
          });
        }
        e("../utils").inherits(o, i), o.prototype._read = function() {
          this._helper.resume();
        }, r.exports = o;
      }, { "../utils": 32, "readable-stream": 16 }], 14: [function(e, r, s) {
        r.exports = { isNode: typeof Buffer < "u", newBufferFrom: function(i, o) {
          if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(i, o);
          if (typeof i == "number") throw new Error('The "data" argument must not be a number');
          return new Buffer(i, o);
        }, allocBuffer: function(i) {
          if (Buffer.alloc) return Buffer.alloc(i);
          var o = new Buffer(i);
          return o.fill(0), o;
        }, isBuffer: function(i) {
          return Buffer.isBuffer(i);
        }, isStream: function(i) {
          return i && typeof i.on == "function" && typeof i.pause == "function" && typeof i.resume == "function";
        } };
      }, {}], 15: [function(e, r, s) {
        function i(D, P, x) {
          var O, T = a.getTypeOf(P), M = a.extend(x || {}, l);
          M.date = M.date || /* @__PURE__ */ new Date(), M.compression !== null && (M.compression = M.compression.toUpperCase()), typeof M.unixPermissions == "string" && (M.unixPermissions = parseInt(M.unixPermissions, 8)), M.unixPermissions && 16384 & M.unixPermissions && (M.dir = !0), M.dosPermissions && 16 & M.dosPermissions && (M.dir = !0), M.dir && (D = y(D)), M.createFolders && (O = _(D)) && k.call(this, O, !0);
          var V = T === "string" && M.binary === !1 && M.base64 === !1;
          x && x.binary !== void 0 || (M.binary = !V), (P instanceof d && P.uncompressedSize === 0 || M.dir || !P || P.length === 0) && (M.base64 = !1, M.binary = !0, P = "", M.compression = "STORE", T = "string");
          var S = null;
          S = P instanceof d || P instanceof c ? P : w.isNode && w.isStream(P) ? new g(D, P) : a.prepareContent(D, P, M.binary, M.optimizedBinaryString, M.base64);
          var z = new p(D, S, M);
          this.files[D] = z;
        }
        var o = e("./utf8"), a = e("./utils"), c = e("./stream/GenericWorker"), h = e("./stream/StreamHelper"), l = e("./defaults"), d = e("./compressedObject"), p = e("./zipObject"), u = e("./generate"), w = e("./nodejsUtils"), g = e("./nodejs/NodejsStreamInputAdapter"), _ = function(D) {
          D.slice(-1) === "/" && (D = D.substring(0, D.length - 1));
          var P = D.lastIndexOf("/");
          return 0 < P ? D.substring(0, P) : "";
        }, y = function(D) {
          return D.slice(-1) !== "/" && (D += "/"), D;
        }, k = function(D, P) {
          return P = P !== void 0 ? P : l.createFolders, D = y(D), this.files[D] || i.call(this, D, null, { dir: !0, createFolders: P }), this.files[D];
        };
        function C(D) {
          return Object.prototype.toString.call(D) === "[object RegExp]";
        }
        var A = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(D) {
          var P, x, O;
          for (P in this.files) O = this.files[P], (x = P.slice(this.root.length, P.length)) && P.slice(0, this.root.length) === this.root && D(x, O);
        }, filter: function(D) {
          var P = [];
          return this.forEach(function(x, O) {
            D(x, O) && P.push(O);
          }), P;
        }, file: function(D, P, x) {
          if (arguments.length !== 1) return D = this.root + D, i.call(this, D, P, x), this;
          if (C(D)) {
            var O = D;
            return this.filter(function(M, V) {
              return !V.dir && O.test(M);
            });
          }
          var T = this.files[this.root + D];
          return T && !T.dir ? T : null;
        }, folder: function(D) {
          if (!D) return this;
          if (C(D)) return this.filter(function(T, M) {
            return M.dir && D.test(T);
          });
          var P = this.root + D, x = k.call(this, P), O = this.clone();
          return O.root = x.name, O;
        }, remove: function(D) {
          D = this.root + D;
          var P = this.files[D];
          if (P || (D.slice(-1) !== "/" && (D += "/"), P = this.files[D]), P && !P.dir) delete this.files[D];
          else for (var x = this.filter(function(T, M) {
            return M.name.slice(0, D.length) === D;
          }), O = 0; O < x.length; O++) delete this.files[x[O].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(D) {
          var P, x = {};
          try {
            if ((x = a.extend(D || {}, { streamFiles: !1, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: o.utf8encode })).type = x.type.toLowerCase(), x.compression = x.compression.toUpperCase(), x.type === "binarystring" && (x.type = "string"), !x.type) throw new Error("No output type specified.");
            a.checkSupport(x.type), x.platform !== "darwin" && x.platform !== "freebsd" && x.platform !== "linux" && x.platform !== "sunos" || (x.platform = "UNIX"), x.platform === "win32" && (x.platform = "DOS");
            var O = x.comment || this.comment || "";
            P = u.generateWorker(this, x, O);
          } catch (T) {
            (P = new c("error")).error(T);
          }
          return new h(P, x.type || "string", x.mimeType);
        }, generateAsync: function(D, P) {
          return this.generateInternalStream(D).accumulate(P);
        }, generateNodeStream: function(D, P) {
          return (D = D || {}).type || (D.type = "nodebuffer"), this.generateInternalStream(D).toNodejsStream(P);
        } };
        r.exports = A;
      }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(e, r, s) {
        r.exports = e("stream");
      }, { stream: void 0 }], 17: [function(e, r, s) {
        var i = e("./DataReader");
        function o(a) {
          i.call(this, a);
          for (var c = 0; c < this.data.length; c++) a[c] = 255 & a[c];
        }
        e("../utils").inherits(o, i), o.prototype.byteAt = function(a) {
          return this.data[this.zero + a];
        }, o.prototype.lastIndexOfSignature = function(a) {
          for (var c = a.charCodeAt(0), h = a.charCodeAt(1), l = a.charCodeAt(2), d = a.charCodeAt(3), p = this.length - 4; 0 <= p; --p) if (this.data[p] === c && this.data[p + 1] === h && this.data[p + 2] === l && this.data[p + 3] === d) return p - this.zero;
          return -1;
        }, o.prototype.readAndCheckSignature = function(a) {
          var c = a.charCodeAt(0), h = a.charCodeAt(1), l = a.charCodeAt(2), d = a.charCodeAt(3), p = this.readData(4);
          return c === p[0] && h === p[1] && l === p[2] && d === p[3];
        }, o.prototype.readData = function(a) {
          if (this.checkOffset(a), a === 0) return [];
          var c = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, c;
        }, r.exports = o;
      }, { "../utils": 32, "./DataReader": 18 }], 18: [function(e, r, s) {
        var i = e("../utils");
        function o(a) {
          this.data = a, this.length = a.length, this.index = 0, this.zero = 0;
        }
        o.prototype = { checkOffset: function(a) {
          this.checkIndex(this.index + a);
        }, checkIndex: function(a) {
          if (this.length < this.zero + a || a < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + a + "). Corrupted zip ?");
        }, setIndex: function(a) {
          this.checkIndex(a), this.index = a;
        }, skip: function(a) {
          this.setIndex(this.index + a);
        }, byteAt: function() {
        }, readInt: function(a) {
          var c, h = 0;
          for (this.checkOffset(a), c = this.index + a - 1; c >= this.index; c--) h = (h << 8) + this.byteAt(c);
          return this.index += a, h;
        }, readString: function(a) {
          return i.transformTo("string", this.readData(a));
        }, readData: function() {
        }, lastIndexOfSignature: function() {
        }, readAndCheckSignature: function() {
        }, readDate: function() {
          var a = this.readInt(4);
          return new Date(Date.UTC(1980 + (a >> 25 & 127), (a >> 21 & 15) - 1, a >> 16 & 31, a >> 11 & 31, a >> 5 & 63, (31 & a) << 1));
        } }, r.exports = o;
      }, { "../utils": 32 }], 19: [function(e, r, s) {
        var i = e("./Uint8ArrayReader");
        function o(a) {
          i.call(this, a);
        }
        e("../utils").inherits(o, i), o.prototype.readData = function(a) {
          this.checkOffset(a);
          var c = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, c;
        }, r.exports = o;
      }, { "../utils": 32, "./Uint8ArrayReader": 21 }], 20: [function(e, r, s) {
        var i = e("./DataReader");
        function o(a) {
          i.call(this, a);
        }
        e("../utils").inherits(o, i), o.prototype.byteAt = function(a) {
          return this.data.charCodeAt(this.zero + a);
        }, o.prototype.lastIndexOfSignature = function(a) {
          return this.data.lastIndexOf(a) - this.zero;
        }, o.prototype.readAndCheckSignature = function(a) {
          return a === this.readData(4);
        }, o.prototype.readData = function(a) {
          this.checkOffset(a);
          var c = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, c;
        }, r.exports = o;
      }, { "../utils": 32, "./DataReader": 18 }], 21: [function(e, r, s) {
        var i = e("./ArrayReader");
        function o(a) {
          i.call(this, a);
        }
        e("../utils").inherits(o, i), o.prototype.readData = function(a) {
          if (this.checkOffset(a), a === 0) return new Uint8Array(0);
          var c = this.data.subarray(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, c;
        }, r.exports = o;
      }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(e, r, s) {
        var i = e("../utils"), o = e("../support"), a = e("./ArrayReader"), c = e("./StringReader"), h = e("./NodeBufferReader"), l = e("./Uint8ArrayReader");
        r.exports = function(d) {
          var p = i.getTypeOf(d);
          return i.checkSupport(p), p !== "string" || o.uint8array ? p === "nodebuffer" ? new h(d) : o.uint8array ? new l(i.transformTo("uint8array", d)) : new a(i.transformTo("array", d)) : new c(d);
        };
      }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(e, r, s) {
        s.LOCAL_FILE_HEADER = "PK", s.CENTRAL_FILE_HEADER = "PK", s.CENTRAL_DIRECTORY_END = "PK", s.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", s.ZIP64_CENTRAL_DIRECTORY_END = "PK", s.DATA_DESCRIPTOR = "PK\x07\b";
      }, {}], 24: [function(e, r, s) {
        var i = e("./GenericWorker"), o = e("../utils");
        function a(c) {
          i.call(this, "ConvertWorker to " + c), this.destType = c;
        }
        o.inherits(a, i), a.prototype.processChunk = function(c) {
          this.push({ data: o.transformTo(this.destType, c.data), meta: c.meta });
        }, r.exports = a;
      }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(e, r, s) {
        var i = e("./GenericWorker"), o = e("../crc32");
        function a() {
          i.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
        }
        e("../utils").inherits(a, i), a.prototype.processChunk = function(c) {
          this.streamInfo.crc32 = o(c.data, this.streamInfo.crc32 || 0), this.push(c);
        }, r.exports = a;
      }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(e, r, s) {
        var i = e("../utils"), o = e("./GenericWorker");
        function a(c) {
          o.call(this, "DataLengthProbe for " + c), this.propName = c, this.withStreamInfo(c, 0);
        }
        i.inherits(a, o), a.prototype.processChunk = function(c) {
          if (c) {
            var h = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = h + c.data.length;
          }
          o.prototype.processChunk.call(this, c);
        }, r.exports = a;
      }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, r, s) {
        var i = e("../utils"), o = e("./GenericWorker");
        function a(c) {
          o.call(this, "DataWorker");
          var h = this;
          this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, c.then(function(l) {
            h.dataIsReady = !0, h.data = l, h.max = l && l.length || 0, h.type = i.getTypeOf(l), h.isPaused || h._tickAndRepeat();
          }, function(l) {
            h.error(l);
          });
        }
        i.inherits(a, o), a.prototype.cleanUp = function() {
          o.prototype.cleanUp.call(this), this.data = null;
        }, a.prototype.resume = function() {
          return !!o.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, i.delay(this._tickAndRepeat, [], this)), !0);
        }, a.prototype._tickAndRepeat = function() {
          this._tickScheduled = !1, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (i.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
        }, a.prototype._tick = function() {
          if (this.isPaused || this.isFinished) return !1;
          var c = null, h = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              c = this.data.substring(this.index, h);
              break;
            case "uint8array":
              c = this.data.subarray(this.index, h);
              break;
            case "array":
            case "nodebuffer":
              c = this.data.slice(this.index, h);
          }
          return this.index = h, this.push({ data: c, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
        }, r.exports = a;
      }, { "../utils": 32, "./GenericWorker": 28 }], 28: [function(e, r, s) {
        function i(o) {
          this.name = o || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = { data: [], end: [], error: [] }, this.previous = null;
        }
        i.prototype = { push: function(o) {
          this.emit("data", o);
        }, end: function() {
          if (this.isFinished) return !1;
          this.flush();
          try {
            this.emit("end"), this.cleanUp(), this.isFinished = !0;
          } catch (o) {
            this.emit("error", o);
          }
          return !0;
        }, error: function(o) {
          return !this.isFinished && (this.isPaused ? this.generatedError = o : (this.isFinished = !0, this.emit("error", o), this.previous && this.previous.error(o), this.cleanUp()), !0);
        }, on: function(o, a) {
          return this._listeners[o].push(a), this;
        }, cleanUp: function() {
          this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
        }, emit: function(o, a) {
          if (this._listeners[o]) for (var c = 0; c < this._listeners[o].length; c++) this._listeners[o][c].call(this, a);
        }, pipe: function(o) {
          return o.registerPrevious(this);
        }, registerPrevious: function(o) {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.streamInfo = o.streamInfo, this.mergeStreamInfo(), this.previous = o;
          var a = this;
          return o.on("data", function(c) {
            a.processChunk(c);
          }), o.on("end", function() {
            a.end();
          }), o.on("error", function(c) {
            a.error(c);
          }), this;
        }, pause: function() {
          return !this.isPaused && !this.isFinished && (this.isPaused = !0, this.previous && this.previous.pause(), !0);
        }, resume: function() {
          if (!this.isPaused || this.isFinished) return !1;
          var o = this.isPaused = !1;
          return this.generatedError && (this.error(this.generatedError), o = !0), this.previous && this.previous.resume(), !o;
        }, flush: function() {
        }, processChunk: function(o) {
          this.push(o);
        }, withStreamInfo: function(o, a) {
          return this.extraStreamInfo[o] = a, this.mergeStreamInfo(), this;
        }, mergeStreamInfo: function() {
          for (var o in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, o) && (this.streamInfo[o] = this.extraStreamInfo[o]);
        }, lock: function() {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.isLocked = !0, this.previous && this.previous.lock();
        }, toString: function() {
          var o = "Worker " + this.name;
          return this.previous ? this.previous + " -> " + o : o;
        } }, r.exports = i;
      }, {}], 29: [function(e, r, s) {
        var i = e("../utils"), o = e("./ConvertWorker"), a = e("./GenericWorker"), c = e("../base64"), h = e("../support"), l = e("../external"), d = null;
        if (h.nodestream) try {
          d = e("../nodejs/NodejsStreamOutputAdapter");
        } catch {
        }
        function p(w, g) {
          return new l.Promise(function(_, y) {
            var k = [], C = w._internalType, A = w._outputType, D = w._mimeType;
            w.on("data", function(P, x) {
              k.push(P), g && g(x);
            }).on("error", function(P) {
              k = [], y(P);
            }).on("end", function() {
              try {
                var P = (function(x, O, T) {
                  switch (x) {
                    case "blob":
                      return i.newBlob(i.transformTo("arraybuffer", O), T);
                    case "base64":
                      return c.encode(O);
                    default:
                      return i.transformTo(x, O);
                  }
                })(A, (function(x, O) {
                  var T, M = 0, V = null, S = 0;
                  for (T = 0; T < O.length; T++) S += O[T].length;
                  switch (x) {
                    case "string":
                      return O.join("");
                    case "array":
                      return Array.prototype.concat.apply([], O);
                    case "uint8array":
                      for (V = new Uint8Array(S), T = 0; T < O.length; T++) V.set(O[T], M), M += O[T].length;
                      return V;
                    case "nodebuffer":
                      return Buffer.concat(O);
                    default:
                      throw new Error("concat : unsupported type '" + x + "'");
                  }
                })(C, k), D);
                _(P);
              } catch (x) {
                y(x);
              }
              k = [];
            }).resume();
          });
        }
        function u(w, g, _) {
          var y = g;
          switch (g) {
            case "blob":
            case "arraybuffer":
              y = "uint8array";
              break;
            case "base64":
              y = "string";
          }
          try {
            this._internalType = y, this._outputType = g, this._mimeType = _, i.checkSupport(y), this._worker = w.pipe(new o(y)), w.lock();
          } catch (k) {
            this._worker = new a("error"), this._worker.error(k);
          }
        }
        u.prototype = { accumulate: function(w) {
          return p(this, w);
        }, on: function(w, g) {
          var _ = this;
          return w === "data" ? this._worker.on(w, function(y) {
            g.call(_, y.data, y.meta);
          }) : this._worker.on(w, function() {
            i.delay(g, arguments, _);
          }), this;
        }, resume: function() {
          return i.delay(this._worker.resume, [], this._worker), this;
        }, pause: function() {
          return this._worker.pause(), this;
        }, toNodejsStream: function(w) {
          if (i.checkSupport("nodestream"), this._outputType !== "nodebuffer") throw new Error(this._outputType + " is not supported by this method");
          return new d(this, { objectMode: this._outputType !== "nodebuffer" }, w);
        } }, r.exports = u;
      }, { "../base64": 1, "../external": 6, "../nodejs/NodejsStreamOutputAdapter": 13, "../support": 30, "../utils": 32, "./ConvertWorker": 24, "./GenericWorker": 28 }], 30: [function(e, r, s) {
        if (s.base64 = !0, s.array = !0, s.string = !0, s.arraybuffer = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", s.nodebuffer = typeof Buffer < "u", s.uint8array = typeof Uint8Array < "u", typeof ArrayBuffer > "u") s.blob = !1;
        else {
          var i = new ArrayBuffer(0);
          try {
            s.blob = new Blob([i], { type: "application/zip" }).size === 0;
          } catch {
            try {
              var o = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              o.append(i), s.blob = o.getBlob("application/zip").size === 0;
            } catch {
              s.blob = !1;
            }
          }
        }
        try {
          s.nodestream = !!e("readable-stream").Readable;
        } catch {
          s.nodestream = !1;
        }
      }, { "readable-stream": 16 }], 31: [function(e, r, s) {
        for (var i = e("./utils"), o = e("./support"), a = e("./nodejsUtils"), c = e("./stream/GenericWorker"), h = new Array(256), l = 0; l < 256; l++) h[l] = 252 <= l ? 6 : 248 <= l ? 5 : 240 <= l ? 4 : 224 <= l ? 3 : 192 <= l ? 2 : 1;
        h[254] = h[254] = 1;
        function d() {
          c.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function p() {
          c.call(this, "utf-8 encode");
        }
        s.utf8encode = function(u) {
          return o.nodebuffer ? a.newBufferFrom(u, "utf-8") : (function(w) {
            var g, _, y, k, C, A = w.length, D = 0;
            for (k = 0; k < A; k++) (64512 & (_ = w.charCodeAt(k))) == 55296 && k + 1 < A && (64512 & (y = w.charCodeAt(k + 1))) == 56320 && (_ = 65536 + (_ - 55296 << 10) + (y - 56320), k++), D += _ < 128 ? 1 : _ < 2048 ? 2 : _ < 65536 ? 3 : 4;
            for (g = o.uint8array ? new Uint8Array(D) : new Array(D), k = C = 0; C < D; k++) (64512 & (_ = w.charCodeAt(k))) == 55296 && k + 1 < A && (64512 & (y = w.charCodeAt(k + 1))) == 56320 && (_ = 65536 + (_ - 55296 << 10) + (y - 56320), k++), _ < 128 ? g[C++] = _ : (_ < 2048 ? g[C++] = 192 | _ >>> 6 : (_ < 65536 ? g[C++] = 224 | _ >>> 12 : (g[C++] = 240 | _ >>> 18, g[C++] = 128 | _ >>> 12 & 63), g[C++] = 128 | _ >>> 6 & 63), g[C++] = 128 | 63 & _);
            return g;
          })(u);
        }, s.utf8decode = function(u) {
          return o.nodebuffer ? i.transformTo("nodebuffer", u).toString("utf-8") : (function(w) {
            var g, _, y, k, C = w.length, A = new Array(2 * C);
            for (g = _ = 0; g < C; ) if ((y = w[g++]) < 128) A[_++] = y;
            else if (4 < (k = h[y])) A[_++] = 65533, g += k - 1;
            else {
              for (y &= k === 2 ? 31 : k === 3 ? 15 : 7; 1 < k && g < C; ) y = y << 6 | 63 & w[g++], k--;
              1 < k ? A[_++] = 65533 : y < 65536 ? A[_++] = y : (y -= 65536, A[_++] = 55296 | y >> 10 & 1023, A[_++] = 56320 | 1023 & y);
            }
            return A.length !== _ && (A.subarray ? A = A.subarray(0, _) : A.length = _), i.applyFromCharCode(A);
          })(u = i.transformTo(o.uint8array ? "uint8array" : "array", u));
        }, i.inherits(d, c), d.prototype.processChunk = function(u) {
          var w = i.transformTo(o.uint8array ? "uint8array" : "array", u.data);
          if (this.leftOver && this.leftOver.length) {
            if (o.uint8array) {
              var g = w;
              (w = new Uint8Array(g.length + this.leftOver.length)).set(this.leftOver, 0), w.set(g, this.leftOver.length);
            } else w = this.leftOver.concat(w);
            this.leftOver = null;
          }
          var _ = (function(k, C) {
            var A;
            for ((C = C || k.length) > k.length && (C = k.length), A = C - 1; 0 <= A && (192 & k[A]) == 128; ) A--;
            return A < 0 || A === 0 ? C : A + h[k[A]] > C ? A : C;
          })(w), y = w;
          _ !== w.length && (o.uint8array ? (y = w.subarray(0, _), this.leftOver = w.subarray(_, w.length)) : (y = w.slice(0, _), this.leftOver = w.slice(_, w.length))), this.push({ data: s.utf8decode(y), meta: u.meta });
        }, d.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, s.Utf8DecodeWorker = d, i.inherits(p, c), p.prototype.processChunk = function(u) {
          this.push({ data: s.utf8encode(u.data), meta: u.meta });
        }, s.Utf8EncodeWorker = p;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, r, s) {
        var i = e("./support"), o = e("./base64"), a = e("./nodejsUtils"), c = e("./external");
        function h(g) {
          return g;
        }
        function l(g, _) {
          for (var y = 0; y < g.length; ++y) _[y] = 255 & g.charCodeAt(y);
          return _;
        }
        e("setimmediate"), s.newBlob = function(g, _) {
          s.checkSupport("blob");
          try {
            return new Blob([g], { type: _ });
          } catch {
            try {
              var y = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return y.append(g), y.getBlob(_);
            } catch {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var d = { stringifyByChunk: function(g, _, y) {
          var k = [], C = 0, A = g.length;
          if (A <= y) return String.fromCharCode.apply(null, g);
          for (; C < A; ) _ === "array" || _ === "nodebuffer" ? k.push(String.fromCharCode.apply(null, g.slice(C, Math.min(C + y, A)))) : k.push(String.fromCharCode.apply(null, g.subarray(C, Math.min(C + y, A)))), C += y;
          return k.join("");
        }, stringifyByChar: function(g) {
          for (var _ = "", y = 0; y < g.length; y++) _ += String.fromCharCode(g[y]);
          return _;
        }, applyCanBeUsed: { uint8array: (function() {
          try {
            return i.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
          } catch {
            return !1;
          }
        })(), nodebuffer: (function() {
          try {
            return i.nodebuffer && String.fromCharCode.apply(null, a.allocBuffer(1)).length === 1;
          } catch {
            return !1;
          }
        })() } };
        function p(g) {
          var _ = 65536, y = s.getTypeOf(g), k = !0;
          if (y === "uint8array" ? k = d.applyCanBeUsed.uint8array : y === "nodebuffer" && (k = d.applyCanBeUsed.nodebuffer), k) for (; 1 < _; ) try {
            return d.stringifyByChunk(g, y, _);
          } catch {
            _ = Math.floor(_ / 2);
          }
          return d.stringifyByChar(g);
        }
        function u(g, _) {
          for (var y = 0; y < g.length; y++) _[y] = g[y];
          return _;
        }
        s.applyFromCharCode = p;
        var w = {};
        w.string = { string: h, array: function(g) {
          return l(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return w.string.uint8array(g).buffer;
        }, uint8array: function(g) {
          return l(g, new Uint8Array(g.length));
        }, nodebuffer: function(g) {
          return l(g, a.allocBuffer(g.length));
        } }, w.array = { string: p, array: h, arraybuffer: function(g) {
          return new Uint8Array(g).buffer;
        }, uint8array: function(g) {
          return new Uint8Array(g);
        }, nodebuffer: function(g) {
          return a.newBufferFrom(g);
        } }, w.arraybuffer = { string: function(g) {
          return p(new Uint8Array(g));
        }, array: function(g) {
          return u(new Uint8Array(g), new Array(g.byteLength));
        }, arraybuffer: h, uint8array: function(g) {
          return new Uint8Array(g);
        }, nodebuffer: function(g) {
          return a.newBufferFrom(new Uint8Array(g));
        } }, w.uint8array = { string: p, array: function(g) {
          return u(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return g.buffer;
        }, uint8array: h, nodebuffer: function(g) {
          return a.newBufferFrom(g);
        } }, w.nodebuffer = { string: p, array: function(g) {
          return u(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return w.nodebuffer.uint8array(g).buffer;
        }, uint8array: function(g) {
          return u(g, new Uint8Array(g.length));
        }, nodebuffer: h }, s.transformTo = function(g, _) {
          if (_ = _ || "", !g) return _;
          s.checkSupport(g);
          var y = s.getTypeOf(_);
          return w[y][g](_);
        }, s.resolve = function(g) {
          for (var _ = g.split("/"), y = [], k = 0; k < _.length; k++) {
            var C = _[k];
            C === "." || C === "" && k !== 0 && k !== _.length - 1 || (C === ".." ? y.pop() : y.push(C));
          }
          return y.join("/");
        }, s.getTypeOf = function(g) {
          return typeof g == "string" ? "string" : Object.prototype.toString.call(g) === "[object Array]" ? "array" : i.nodebuffer && a.isBuffer(g) ? "nodebuffer" : i.uint8array && g instanceof Uint8Array ? "uint8array" : i.arraybuffer && g instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, s.checkSupport = function(g) {
          if (!i[g.toLowerCase()]) throw new Error(g + " is not supported by this platform");
        }, s.MAX_VALUE_16BITS = 65535, s.MAX_VALUE_32BITS = -1, s.pretty = function(g) {
          var _, y, k = "";
          for (y = 0; y < (g || "").length; y++) k += "\\x" + ((_ = g.charCodeAt(y)) < 16 ? "0" : "") + _.toString(16).toUpperCase();
          return k;
        }, s.delay = function(g, _, y) {
          setImmediate(function() {
            g.apply(y || null, _ || []);
          });
        }, s.inherits = function(g, _) {
          function y() {
          }
          y.prototype = _.prototype, g.prototype = new y();
        }, s.extend = function() {
          var g, _, y = {};
          for (g = 0; g < arguments.length; g++) for (_ in arguments[g]) Object.prototype.hasOwnProperty.call(arguments[g], _) && y[_] === void 0 && (y[_] = arguments[g][_]);
          return y;
        }, s.prepareContent = function(g, _, y, k, C) {
          return c.Promise.resolve(_).then(function(A) {
            return i.blob && (A instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(A)) !== -1) && typeof FileReader < "u" ? new c.Promise(function(D, P) {
              var x = new FileReader();
              x.onload = function(O) {
                D(O.target.result);
              }, x.onerror = function(O) {
                P(O.target.error);
              }, x.readAsArrayBuffer(A);
            }) : A;
          }).then(function(A) {
            var D = s.getTypeOf(A);
            return D ? (D === "arraybuffer" ? A = s.transformTo("uint8array", A) : D === "string" && (C ? A = o.decode(A) : y && k !== !0 && (A = (function(P) {
              return l(P, i.uint8array ? new Uint8Array(P.length) : new Array(P.length));
            })(A))), A) : c.Promise.reject(new Error("Can't read the data of '" + g + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./signature"), c = e("./zipEntry"), h = e("./support");
        function l(d) {
          this.files = [], this.loadOptions = d;
        }
        l.prototype = { checkSignature: function(d) {
          if (!this.reader.readAndCheckSignature(d)) {
            this.reader.index -= 4;
            var p = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature (" + o.pretty(p) + ", expected " + o.pretty(d) + ")");
          }
        }, isSignature: function(d, p) {
          var u = this.reader.index;
          this.reader.setIndex(d);
          var w = this.reader.readString(4) === p;
          return this.reader.setIndex(u), w;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var d = this.reader.readData(this.zipCommentLength), p = h.uint8array ? "uint8array" : "array", u = o.transformTo(p, d);
          this.zipComment = this.loadOptions.decodeFileName(u);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var d, p, u, w = this.zip64EndOfCentralSize - 44; 0 < w; ) d = this.reader.readInt(2), p = this.reader.readInt(4), u = this.reader.readData(p), this.zip64ExtensibleData[d] = { id: d, length: p, value: u };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var d, p;
          for (d = 0; d < this.files.length; d++) p = this.files[d], this.reader.setIndex(p.localHeaderOffset), this.checkSignature(a.LOCAL_FILE_HEADER), p.readLocalPart(this.reader), p.handleUTF8(), p.processAttributes();
        }, readCentralDir: function() {
          var d;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER); ) (d = new c({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(d);
          if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
        }, readEndOfCentral: function() {
          var d = this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);
          if (d < 0) throw this.isSignature(0, a.LOCAL_FILE_HEADER) ? new Error("Corrupted zip: can't find end of central directory") : new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
          this.reader.setIndex(d);
          var p = d;
          if (this.checkSignature(a.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === o.MAX_VALUE_16BITS || this.diskWithCentralDirStart === o.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === o.MAX_VALUE_16BITS || this.centralDirRecords === o.MAX_VALUE_16BITS || this.centralDirSize === o.MAX_VALUE_32BITS || this.centralDirOffset === o.MAX_VALUE_32BITS) {
            if (this.zip64 = !0, (d = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            if (this.reader.setIndex(d), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, a.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
          }
          var u = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (u += 20, u += 12 + this.zip64EndOfCentralSize);
          var w = p - u;
          if (0 < w) this.isSignature(p, a.CENTRAL_FILE_HEADER) || (this.reader.zero = w);
          else if (w < 0) throw new Error("Corrupted zip: missing " + Math.abs(w) + " bytes.");
        }, prepareReader: function(d) {
          this.reader = i(d);
        }, load: function(d) {
          this.prepareReader(d), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, r.exports = l;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./compressedObject"), c = e("./crc32"), h = e("./utf8"), l = e("./compressions"), d = e("./support");
        function p(u, w) {
          this.options = u, this.loadOptions = w;
        }
        p.prototype = { isEncrypted: function() {
          return (1 & this.bitFlag) == 1;
        }, useUTF8: function() {
          return (2048 & this.bitFlag) == 2048;
        }, readLocalPart: function(u) {
          var w, g;
          if (u.skip(22), this.fileNameLength = u.readInt(2), g = u.readInt(2), this.fileName = u.readData(this.fileNameLength), u.skip(g), this.compressedSize === -1 || this.uncompressedSize === -1) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if ((w = (function(_) {
            for (var y in l) if (Object.prototype.hasOwnProperty.call(l, y) && l[y].magic === _) return l[y];
            return null;
          })(this.compressionMethod)) === null) throw new Error("Corrupted zip : compression " + o.pretty(this.compressionMethod) + " unknown (inner file : " + o.transformTo("string", this.fileName) + ")");
          this.decompressed = new a(this.compressedSize, this.uncompressedSize, this.crc32, w, u.readData(this.compressedSize));
        }, readCentralPart: function(u) {
          this.versionMadeBy = u.readInt(2), u.skip(2), this.bitFlag = u.readInt(2), this.compressionMethod = u.readString(2), this.date = u.readDate(), this.crc32 = u.readInt(4), this.compressedSize = u.readInt(4), this.uncompressedSize = u.readInt(4);
          var w = u.readInt(2);
          if (this.extraFieldsLength = u.readInt(2), this.fileCommentLength = u.readInt(2), this.diskNumberStart = u.readInt(2), this.internalFileAttributes = u.readInt(2), this.externalFileAttributes = u.readInt(4), this.localHeaderOffset = u.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
          u.skip(w), this.readExtraFields(u), this.parseZIP64ExtraField(u), this.fileComment = u.readData(this.fileCommentLength);
        }, processAttributes: function() {
          this.unixPermissions = null, this.dosPermissions = null;
          var u = this.versionMadeBy >> 8;
          this.dir = !!(16 & this.externalFileAttributes), u == 0 && (this.dosPermissions = 63 & this.externalFileAttributes), u == 3 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || this.fileNameStr.slice(-1) !== "/" || (this.dir = !0);
        }, parseZIP64ExtraField: function() {
          if (this.extraFields[1]) {
            var u = i(this.extraFields[1].value);
            this.uncompressedSize === o.MAX_VALUE_32BITS && (this.uncompressedSize = u.readInt(8)), this.compressedSize === o.MAX_VALUE_32BITS && (this.compressedSize = u.readInt(8)), this.localHeaderOffset === o.MAX_VALUE_32BITS && (this.localHeaderOffset = u.readInt(8)), this.diskNumberStart === o.MAX_VALUE_32BITS && (this.diskNumberStart = u.readInt(4));
          }
        }, readExtraFields: function(u) {
          var w, g, _, y = u.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); u.index + 4 < y; ) w = u.readInt(2), g = u.readInt(2), _ = u.readData(g), this.extraFields[w] = { id: w, length: g, value: _ };
          u.setIndex(y);
        }, handleUTF8: function() {
          var u = d.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = h.utf8decode(this.fileName), this.fileCommentStr = h.utf8decode(this.fileComment);
          else {
            var w = this.findExtraFieldUnicodePath();
            if (w !== null) this.fileNameStr = w;
            else {
              var g = o.transformTo(u, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(g);
            }
            var _ = this.findExtraFieldUnicodeComment();
            if (_ !== null) this.fileCommentStr = _;
            else {
              var y = o.transformTo(u, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(y);
            }
          }
        }, findExtraFieldUnicodePath: function() {
          var u = this.extraFields[28789];
          if (u) {
            var w = i(u.value);
            return w.readInt(1) !== 1 || c(this.fileName) !== w.readInt(4) ? null : h.utf8decode(w.readData(u.length - 5));
          }
          return null;
        }, findExtraFieldUnicodeComment: function() {
          var u = this.extraFields[25461];
          if (u) {
            var w = i(u.value);
            return w.readInt(1) !== 1 || c(this.fileComment) !== w.readInt(4) ? null : h.utf8decode(w.readData(u.length - 5));
          }
          return null;
        } }, r.exports = p;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, r, s) {
        function i(w, g, _) {
          this.name = w, this.dir = _.dir, this.date = _.date, this.comment = _.comment, this.unixPermissions = _.unixPermissions, this.dosPermissions = _.dosPermissions, this._data = g, this._dataBinary = _.binary, this.options = { compression: _.compression, compressionOptions: _.compressionOptions };
        }
        var o = e("./stream/StreamHelper"), a = e("./stream/DataWorker"), c = e("./utf8"), h = e("./compressedObject"), l = e("./stream/GenericWorker");
        i.prototype = { internalStream: function(w) {
          var g = null, _ = "string";
          try {
            if (!w) throw new Error("No output type specified.");
            var y = (_ = w.toLowerCase()) === "string" || _ === "text";
            _ !== "binarystring" && _ !== "text" || (_ = "string"), g = this._decompressWorker();
            var k = !this._dataBinary;
            k && !y && (g = g.pipe(new c.Utf8EncodeWorker())), !k && y && (g = g.pipe(new c.Utf8DecodeWorker()));
          } catch (C) {
            (g = new l("error")).error(C);
          }
          return new o(g, _, "");
        }, async: function(w, g) {
          return this.internalStream(w).accumulate(g);
        }, nodeStream: function(w, g) {
          return this.internalStream(w || "nodebuffer").toNodejsStream(g);
        }, _compressWorker: function(w, g) {
          if (this._data instanceof h && this._data.compression.magic === w.magic) return this._data.getCompressedWorker();
          var _ = this._decompressWorker();
          return this._dataBinary || (_ = _.pipe(new c.Utf8EncodeWorker())), h.createWorkerFrom(_, w, g);
        }, _decompressWorker: function() {
          return this._data instanceof h ? this._data.getContentWorker() : this._data instanceof l ? this._data : new a(this._data);
        } };
        for (var d = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], p = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, u = 0; u < d.length; u++) i.prototype[d[u]] = p;
        r.exports = i;
      }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, r, s) {
        (function(i) {
          var o, a, c = i.MutationObserver || i.WebKitMutationObserver;
          if (c) {
            var h = 0, l = new c(w), d = i.document.createTextNode("");
            l.observe(d, { characterData: !0 }), o = function() {
              d.data = h = ++h % 2;
            };
          } else if (i.setImmediate || i.MessageChannel === void 0) o = "document" in i && "onreadystatechange" in i.document.createElement("script") ? function() {
            var g = i.document.createElement("script");
            g.onreadystatechange = function() {
              w(), g.onreadystatechange = null, g.parentNode.removeChild(g), g = null;
            }, i.document.documentElement.appendChild(g);
          } : function() {
            setTimeout(w, 0);
          };
          else {
            var p = new i.MessageChannel();
            p.port1.onmessage = w, o = function() {
              p.port2.postMessage(0);
            };
          }
          var u = [];
          function w() {
            var g, _;
            a = !0;
            for (var y = u.length; y; ) {
              for (_ = u, u = [], g = -1; ++g < y; ) _[g]();
              y = u.length;
            }
            a = !1;
          }
          r.exports = function(g) {
            u.push(g) !== 1 || a || o();
          };
        }).call(this, typeof fn < "u" ? fn : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}], 37: [function(e, r, s) {
        var i = e("immediate");
        function o() {
        }
        var a = {}, c = ["REJECTED"], h = ["FULFILLED"], l = ["PENDING"];
        function d(y) {
          if (typeof y != "function") throw new TypeError("resolver must be a function");
          this.state = l, this.queue = [], this.outcome = void 0, y !== o && g(this, y);
        }
        function p(y, k, C) {
          this.promise = y, typeof k == "function" && (this.onFulfilled = k, this.callFulfilled = this.otherCallFulfilled), typeof C == "function" && (this.onRejected = C, this.callRejected = this.otherCallRejected);
        }
        function u(y, k, C) {
          i(function() {
            var A;
            try {
              A = k(C);
            } catch (D) {
              return a.reject(y, D);
            }
            A === y ? a.reject(y, new TypeError("Cannot resolve promise with itself")) : a.resolve(y, A);
          });
        }
        function w(y) {
          var k = y && y.then;
          if (y && (typeof y == "object" || typeof y == "function") && typeof k == "function") return function() {
            k.apply(y, arguments);
          };
        }
        function g(y, k) {
          var C = !1;
          function A(x) {
            C || (C = !0, a.reject(y, x));
          }
          function D(x) {
            C || (C = !0, a.resolve(y, x));
          }
          var P = _(function() {
            k(D, A);
          });
          P.status === "error" && A(P.value);
        }
        function _(y, k) {
          var C = {};
          try {
            C.value = y(k), C.status = "success";
          } catch (A) {
            C.status = "error", C.value = A;
          }
          return C;
        }
        (r.exports = d).prototype.finally = function(y) {
          if (typeof y != "function") return this;
          var k = this.constructor;
          return this.then(function(C) {
            return k.resolve(y()).then(function() {
              return C;
            });
          }, function(C) {
            return k.resolve(y()).then(function() {
              throw C;
            });
          });
        }, d.prototype.catch = function(y) {
          return this.then(null, y);
        }, d.prototype.then = function(y, k) {
          if (typeof y != "function" && this.state === h || typeof k != "function" && this.state === c) return this;
          var C = new this.constructor(o);
          return this.state !== l ? u(C, this.state === h ? y : k, this.outcome) : this.queue.push(new p(C, y, k)), C;
        }, p.prototype.callFulfilled = function(y) {
          a.resolve(this.promise, y);
        }, p.prototype.otherCallFulfilled = function(y) {
          u(this.promise, this.onFulfilled, y);
        }, p.prototype.callRejected = function(y) {
          a.reject(this.promise, y);
        }, p.prototype.otherCallRejected = function(y) {
          u(this.promise, this.onRejected, y);
        }, a.resolve = function(y, k) {
          var C = _(w, k);
          if (C.status === "error") return a.reject(y, C.value);
          var A = C.value;
          if (A) g(y, A);
          else {
            y.state = h, y.outcome = k;
            for (var D = -1, P = y.queue.length; ++D < P; ) y.queue[D].callFulfilled(k);
          }
          return y;
        }, a.reject = function(y, k) {
          y.state = c, y.outcome = k;
          for (var C = -1, A = y.queue.length; ++C < A; ) y.queue[C].callRejected(k);
          return y;
        }, d.resolve = function(y) {
          return y instanceof this ? y : a.resolve(new this(o), y);
        }, d.reject = function(y) {
          var k = new this(o);
          return a.reject(k, y);
        }, d.all = function(y) {
          var k = this;
          if (Object.prototype.toString.call(y) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var C = y.length, A = !1;
          if (!C) return this.resolve([]);
          for (var D = new Array(C), P = 0, x = -1, O = new this(o); ++x < C; ) T(y[x], x);
          return O;
          function T(M, V) {
            k.resolve(M).then(function(S) {
              D[V] = S, ++P !== C || A || (A = !0, a.resolve(O, D));
            }, function(S) {
              A || (A = !0, a.reject(O, S));
            });
          }
        }, d.race = function(y) {
          var k = this;
          if (Object.prototype.toString.call(y) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var C = y.length, A = !1;
          if (!C) return this.resolve([]);
          for (var D = -1, P = new this(o); ++D < C; ) x = y[D], k.resolve(x).then(function(O) {
            A || (A = !0, a.resolve(P, O));
          }, function(O) {
            A || (A = !0, a.reject(P, O));
          });
          var x;
          return P;
        };
      }, { immediate: 36 }], 38: [function(e, r, s) {
        var i = {};
        (0, e("./lib/utils/common").assign)(i, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), r.exports = i;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, r, s) {
        var i = e("./zlib/deflate"), o = e("./utils/common"), a = e("./utils/strings"), c = e("./zlib/messages"), h = e("./zlib/zstream"), l = Object.prototype.toString, d = 0, p = -1, u = 0, w = 8;
        function g(y) {
          if (!(this instanceof g)) return new g(y);
          this.options = o.assign({ level: p, method: w, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: u, to: "" }, y || {});
          var k = this.options;
          k.raw && 0 < k.windowBits ? k.windowBits = -k.windowBits : k.gzip && 0 < k.windowBits && k.windowBits < 16 && (k.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new h(), this.strm.avail_out = 0;
          var C = i.deflateInit2(this.strm, k.level, k.method, k.windowBits, k.memLevel, k.strategy);
          if (C !== d) throw new Error(c[C]);
          if (k.header && i.deflateSetHeader(this.strm, k.header), k.dictionary) {
            var A;
            if (A = typeof k.dictionary == "string" ? a.string2buf(k.dictionary) : l.call(k.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(k.dictionary) : k.dictionary, (C = i.deflateSetDictionary(this.strm, A)) !== d) throw new Error(c[C]);
            this._dict_set = !0;
          }
        }
        function _(y, k) {
          var C = new g(k);
          if (C.push(y, !0), C.err) throw C.msg || c[C.err];
          return C.result;
        }
        g.prototype.push = function(y, k) {
          var C, A, D = this.strm, P = this.options.chunkSize;
          if (this.ended) return !1;
          A = k === ~~k ? k : k === !0 ? 4 : 0, typeof y == "string" ? D.input = a.string2buf(y) : l.call(y) === "[object ArrayBuffer]" ? D.input = new Uint8Array(y) : D.input = y, D.next_in = 0, D.avail_in = D.input.length;
          do {
            if (D.avail_out === 0 && (D.output = new o.Buf8(P), D.next_out = 0, D.avail_out = P), (C = i.deflate(D, A)) !== 1 && C !== d) return this.onEnd(C), !(this.ended = !0);
            D.avail_out !== 0 && (D.avail_in !== 0 || A !== 4 && A !== 2) || (this.options.to === "string" ? this.onData(a.buf2binstring(o.shrinkBuf(D.output, D.next_out))) : this.onData(o.shrinkBuf(D.output, D.next_out)));
          } while ((0 < D.avail_in || D.avail_out === 0) && C !== 1);
          return A === 4 ? (C = i.deflateEnd(this.strm), this.onEnd(C), this.ended = !0, C === d) : A !== 2 || (this.onEnd(d), !(D.avail_out = 0));
        }, g.prototype.onData = function(y) {
          this.chunks.push(y);
        }, g.prototype.onEnd = function(y) {
          y === d && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = y, this.msg = this.strm.msg;
        }, s.Deflate = g, s.deflate = _, s.deflateRaw = function(y, k) {
          return (k = k || {}).raw = !0, _(y, k);
        }, s.gzip = function(y, k) {
          return (k = k || {}).gzip = !0, _(y, k);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, r, s) {
        var i = e("./zlib/inflate"), o = e("./utils/common"), a = e("./utils/strings"), c = e("./zlib/constants"), h = e("./zlib/messages"), l = e("./zlib/zstream"), d = e("./zlib/gzheader"), p = Object.prototype.toString;
        function u(g) {
          if (!(this instanceof u)) return new u(g);
          this.options = o.assign({ chunkSize: 16384, windowBits: 0, to: "" }, g || {});
          var _ = this.options;
          _.raw && 0 <= _.windowBits && _.windowBits < 16 && (_.windowBits = -_.windowBits, _.windowBits === 0 && (_.windowBits = -15)), !(0 <= _.windowBits && _.windowBits < 16) || g && g.windowBits || (_.windowBits += 32), 15 < _.windowBits && _.windowBits < 48 && (15 & _.windowBits) == 0 && (_.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l(), this.strm.avail_out = 0;
          var y = i.inflateInit2(this.strm, _.windowBits);
          if (y !== c.Z_OK) throw new Error(h[y]);
          this.header = new d(), i.inflateGetHeader(this.strm, this.header);
        }
        function w(g, _) {
          var y = new u(_);
          if (y.push(g, !0), y.err) throw y.msg || h[y.err];
          return y.result;
        }
        u.prototype.push = function(g, _) {
          var y, k, C, A, D, P, x = this.strm, O = this.options.chunkSize, T = this.options.dictionary, M = !1;
          if (this.ended) return !1;
          k = _ === ~~_ ? _ : _ === !0 ? c.Z_FINISH : c.Z_NO_FLUSH, typeof g == "string" ? x.input = a.binstring2buf(g) : p.call(g) === "[object ArrayBuffer]" ? x.input = new Uint8Array(g) : x.input = g, x.next_in = 0, x.avail_in = x.input.length;
          do {
            if (x.avail_out === 0 && (x.output = new o.Buf8(O), x.next_out = 0, x.avail_out = O), (y = i.inflate(x, c.Z_NO_FLUSH)) === c.Z_NEED_DICT && T && (P = typeof T == "string" ? a.string2buf(T) : p.call(T) === "[object ArrayBuffer]" ? new Uint8Array(T) : T, y = i.inflateSetDictionary(this.strm, P)), y === c.Z_BUF_ERROR && M === !0 && (y = c.Z_OK, M = !1), y !== c.Z_STREAM_END && y !== c.Z_OK) return this.onEnd(y), !(this.ended = !0);
            x.next_out && (x.avail_out !== 0 && y !== c.Z_STREAM_END && (x.avail_in !== 0 || k !== c.Z_FINISH && k !== c.Z_SYNC_FLUSH) || (this.options.to === "string" ? (C = a.utf8border(x.output, x.next_out), A = x.next_out - C, D = a.buf2string(x.output, C), x.next_out = A, x.avail_out = O - A, A && o.arraySet(x.output, x.output, C, A, 0), this.onData(D)) : this.onData(o.shrinkBuf(x.output, x.next_out)))), x.avail_in === 0 && x.avail_out === 0 && (M = !0);
          } while ((0 < x.avail_in || x.avail_out === 0) && y !== c.Z_STREAM_END);
          return y === c.Z_STREAM_END && (k = c.Z_FINISH), k === c.Z_FINISH ? (y = i.inflateEnd(this.strm), this.onEnd(y), this.ended = !0, y === c.Z_OK) : k !== c.Z_SYNC_FLUSH || (this.onEnd(c.Z_OK), !(x.avail_out = 0));
        }, u.prototype.onData = function(g) {
          this.chunks.push(g);
        }, u.prototype.onEnd = function(g) {
          g === c.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = g, this.msg = this.strm.msg;
        }, s.Inflate = u, s.inflate = w, s.inflateRaw = function(g, _) {
          return (_ = _ || {}).raw = !0, w(g, _);
        }, s.ungzip = w;
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, r, s) {
        var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
        s.assign = function(c) {
          for (var h = Array.prototype.slice.call(arguments, 1); h.length; ) {
            var l = h.shift();
            if (l) {
              if (typeof l != "object") throw new TypeError(l + "must be non-object");
              for (var d in l) l.hasOwnProperty(d) && (c[d] = l[d]);
            }
          }
          return c;
        }, s.shrinkBuf = function(c, h) {
          return c.length === h ? c : c.subarray ? c.subarray(0, h) : (c.length = h, c);
        };
        var o = { arraySet: function(c, h, l, d, p) {
          if (h.subarray && c.subarray) c.set(h.subarray(l, l + d), p);
          else for (var u = 0; u < d; u++) c[p + u] = h[l + u];
        }, flattenChunks: function(c) {
          var h, l, d, p, u, w;
          for (h = d = 0, l = c.length; h < l; h++) d += c[h].length;
          for (w = new Uint8Array(d), h = p = 0, l = c.length; h < l; h++) u = c[h], w.set(u, p), p += u.length;
          return w;
        } }, a = { arraySet: function(c, h, l, d, p) {
          for (var u = 0; u < d; u++) c[p + u] = h[l + u];
        }, flattenChunks: function(c) {
          return [].concat.apply([], c);
        } };
        s.setTyped = function(c) {
          c ? (s.Buf8 = Uint8Array, s.Buf16 = Uint16Array, s.Buf32 = Int32Array, s.assign(s, o)) : (s.Buf8 = Array, s.Buf16 = Array, s.Buf32 = Array, s.assign(s, a));
        }, s.setTyped(i);
      }, {}], 42: [function(e, r, s) {
        var i = e("./common"), o = !0, a = !0;
        try {
          String.fromCharCode.apply(null, [0]);
        } catch {
          o = !1;
        }
        try {
          String.fromCharCode.apply(null, new Uint8Array(1));
        } catch {
          a = !1;
        }
        for (var c = new i.Buf8(256), h = 0; h < 256; h++) c[h] = 252 <= h ? 6 : 248 <= h ? 5 : 240 <= h ? 4 : 224 <= h ? 3 : 192 <= h ? 2 : 1;
        function l(d, p) {
          if (p < 65537 && (d.subarray && a || !d.subarray && o)) return String.fromCharCode.apply(null, i.shrinkBuf(d, p));
          for (var u = "", w = 0; w < p; w++) u += String.fromCharCode(d[w]);
          return u;
        }
        c[254] = c[254] = 1, s.string2buf = function(d) {
          var p, u, w, g, _, y = d.length, k = 0;
          for (g = 0; g < y; g++) (64512 & (u = d.charCodeAt(g))) == 55296 && g + 1 < y && (64512 & (w = d.charCodeAt(g + 1))) == 56320 && (u = 65536 + (u - 55296 << 10) + (w - 56320), g++), k += u < 128 ? 1 : u < 2048 ? 2 : u < 65536 ? 3 : 4;
          for (p = new i.Buf8(k), g = _ = 0; _ < k; g++) (64512 & (u = d.charCodeAt(g))) == 55296 && g + 1 < y && (64512 & (w = d.charCodeAt(g + 1))) == 56320 && (u = 65536 + (u - 55296 << 10) + (w - 56320), g++), u < 128 ? p[_++] = u : (u < 2048 ? p[_++] = 192 | u >>> 6 : (u < 65536 ? p[_++] = 224 | u >>> 12 : (p[_++] = 240 | u >>> 18, p[_++] = 128 | u >>> 12 & 63), p[_++] = 128 | u >>> 6 & 63), p[_++] = 128 | 63 & u);
          return p;
        }, s.buf2binstring = function(d) {
          return l(d, d.length);
        }, s.binstring2buf = function(d) {
          for (var p = new i.Buf8(d.length), u = 0, w = p.length; u < w; u++) p[u] = d.charCodeAt(u);
          return p;
        }, s.buf2string = function(d, p) {
          var u, w, g, _, y = p || d.length, k = new Array(2 * y);
          for (u = w = 0; u < y; ) if ((g = d[u++]) < 128) k[w++] = g;
          else if (4 < (_ = c[g])) k[w++] = 65533, u += _ - 1;
          else {
            for (g &= _ === 2 ? 31 : _ === 3 ? 15 : 7; 1 < _ && u < y; ) g = g << 6 | 63 & d[u++], _--;
            1 < _ ? k[w++] = 65533 : g < 65536 ? k[w++] = g : (g -= 65536, k[w++] = 55296 | g >> 10 & 1023, k[w++] = 56320 | 1023 & g);
          }
          return l(k, w);
        }, s.utf8border = function(d, p) {
          var u;
          for ((p = p || d.length) > d.length && (p = d.length), u = p - 1; 0 <= u && (192 & d[u]) == 128; ) u--;
          return u < 0 || u === 0 ? p : u + c[d[u]] > p ? u : p;
        };
      }, { "./common": 41 }], 43: [function(e, r, s) {
        r.exports = function(i, o, a, c) {
          for (var h = 65535 & i | 0, l = i >>> 16 & 65535 | 0, d = 0; a !== 0; ) {
            for (a -= d = 2e3 < a ? 2e3 : a; l = l + (h = h + o[c++] | 0) | 0, --d; ) ;
            h %= 65521, l %= 65521;
          }
          return h | l << 16 | 0;
        };
      }, {}], 44: [function(e, r, s) {
        r.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
      }, {}], 45: [function(e, r, s) {
        var i = (function() {
          for (var o, a = [], c = 0; c < 256; c++) {
            o = c;
            for (var h = 0; h < 8; h++) o = 1 & o ? 3988292384 ^ o >>> 1 : o >>> 1;
            a[c] = o;
          }
          return a;
        })();
        r.exports = function(o, a, c, h) {
          var l = i, d = h + c;
          o ^= -1;
          for (var p = h; p < d; p++) o = o >>> 8 ^ l[255 & (o ^ a[p])];
          return -1 ^ o;
        };
      }, {}], 46: [function(e, r, s) {
        var i, o = e("../utils/common"), a = e("./trees"), c = e("./adler32"), h = e("./crc32"), l = e("./messages"), d = 0, p = 4, u = 0, w = -2, g = -1, _ = 4, y = 2, k = 8, C = 9, A = 286, D = 30, P = 19, x = 2 * A + 1, O = 15, T = 3, M = 258, V = M + T + 1, S = 42, z = 113, m = 1, U = 2, et = 3, $ = 4;
        function nt(f, B) {
          return f.msg = l[B], B;
        }
        function H(f) {
          return (f << 1) - (4 < f ? 9 : 0);
        }
        function Q(f) {
          for (var B = f.length; 0 <= --B; ) f[B] = 0;
        }
        function R(f) {
          var B = f.state, N = B.pending;
          N > f.avail_out && (N = f.avail_out), N !== 0 && (o.arraySet(f.output, B.pending_buf, B.pending_out, N, f.next_out), f.next_out += N, B.pending_out += N, f.total_out += N, f.avail_out -= N, B.pending -= N, B.pending === 0 && (B.pending_out = 0));
        }
        function L(f, B) {
          a._tr_flush_block(f, 0 <= f.block_start ? f.block_start : -1, f.strstart - f.block_start, B), f.block_start = f.strstart, R(f.strm);
        }
        function J(f, B) {
          f.pending_buf[f.pending++] = B;
        }
        function q(f, B) {
          f.pending_buf[f.pending++] = B >>> 8 & 255, f.pending_buf[f.pending++] = 255 & B;
        }
        function Y(f, B) {
          var N, v, b = f.max_chain_length, E = f.strstart, F = f.prev_length, j = f.nice_match, I = f.strstart > f.w_size - V ? f.strstart - (f.w_size - V) : 0, W = f.window, G = f.w_mask, Z = f.prev, X = f.strstart + M, ct = W[E + F - 1], it = W[E + F];
          f.prev_length >= f.good_match && (b >>= 2), j > f.lookahead && (j = f.lookahead);
          do
            if (W[(N = B) + F] === it && W[N + F - 1] === ct && W[N] === W[E] && W[++N] === W[E + 1]) {
              E += 2, N++;
              do
                ;
              while (W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && E < X);
              if (v = M - (X - E), E = X - M, F < v) {
                if (f.match_start = B, j <= (F = v)) break;
                ct = W[E + F - 1], it = W[E + F];
              }
            }
          while ((B = Z[B & G]) > I && --b != 0);
          return F <= f.lookahead ? F : f.lookahead;
        }
        function ht(f) {
          var B, N, v, b, E, F, j, I, W, G, Z = f.w_size;
          do {
            if (b = f.window_size - f.lookahead - f.strstart, f.strstart >= Z + (Z - V)) {
              for (o.arraySet(f.window, f.window, Z, Z, 0), f.match_start -= Z, f.strstart -= Z, f.block_start -= Z, B = N = f.hash_size; v = f.head[--B], f.head[B] = Z <= v ? v - Z : 0, --N; ) ;
              for (B = N = Z; v = f.prev[--B], f.prev[B] = Z <= v ? v - Z : 0, --N; ) ;
              b += Z;
            }
            if (f.strm.avail_in === 0) break;
            if (F = f.strm, j = f.window, I = f.strstart + f.lookahead, W = b, G = void 0, G = F.avail_in, W < G && (G = W), N = G === 0 ? 0 : (F.avail_in -= G, o.arraySet(j, F.input, F.next_in, G, I), F.state.wrap === 1 ? F.adler = c(F.adler, j, G, I) : F.state.wrap === 2 && (F.adler = h(F.adler, j, G, I)), F.next_in += G, F.total_in += G, G), f.lookahead += N, f.lookahead + f.insert >= T) for (E = f.strstart - f.insert, f.ins_h = f.window[E], f.ins_h = (f.ins_h << f.hash_shift ^ f.window[E + 1]) & f.hash_mask; f.insert && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[E + T - 1]) & f.hash_mask, f.prev[E & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = E, E++, f.insert--, !(f.lookahead + f.insert < T)); ) ;
          } while (f.lookahead < V && f.strm.avail_in !== 0);
        }
        function vt(f, B) {
          for (var N, v; ; ) {
            if (f.lookahead < V) {
              if (ht(f), f.lookahead < V && B === d) return m;
              if (f.lookahead === 0) break;
            }
            if (N = 0, f.lookahead >= T && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + T - 1]) & f.hash_mask, N = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart), N !== 0 && f.strstart - N <= f.w_size - V && (f.match_length = Y(f, N)), f.match_length >= T) if (v = a._tr_tally(f, f.strstart - f.match_start, f.match_length - T), f.lookahead -= f.match_length, f.match_length <= f.max_lazy_match && f.lookahead >= T) {
              for (f.match_length--; f.strstart++, f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + T - 1]) & f.hash_mask, N = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart, --f.match_length != 0; ) ;
              f.strstart++;
            } else f.strstart += f.match_length, f.match_length = 0, f.ins_h = f.window[f.strstart], f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + 1]) & f.hash_mask;
            else v = a._tr_tally(f, 0, f.window[f.strstart]), f.lookahead--, f.strstart++;
            if (v && (L(f, !1), f.strm.avail_out === 0)) return m;
          }
          return f.insert = f.strstart < T - 1 ? f.strstart : T - 1, B === p ? (L(f, !0), f.strm.avail_out === 0 ? et : $) : f.last_lit && (L(f, !1), f.strm.avail_out === 0) ? m : U;
        }
        function st(f, B) {
          for (var N, v, b; ; ) {
            if (f.lookahead < V) {
              if (ht(f), f.lookahead < V && B === d) return m;
              if (f.lookahead === 0) break;
            }
            if (N = 0, f.lookahead >= T && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + T - 1]) & f.hash_mask, N = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart), f.prev_length = f.match_length, f.prev_match = f.match_start, f.match_length = T - 1, N !== 0 && f.prev_length < f.max_lazy_match && f.strstart - N <= f.w_size - V && (f.match_length = Y(f, N), f.match_length <= 5 && (f.strategy === 1 || f.match_length === T && 4096 < f.strstart - f.match_start) && (f.match_length = T - 1)), f.prev_length >= T && f.match_length <= f.prev_length) {
              for (b = f.strstart + f.lookahead - T, v = a._tr_tally(f, f.strstart - 1 - f.prev_match, f.prev_length - T), f.lookahead -= f.prev_length - 1, f.prev_length -= 2; ++f.strstart <= b && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + T - 1]) & f.hash_mask, N = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart), --f.prev_length != 0; ) ;
              if (f.match_available = 0, f.match_length = T - 1, f.strstart++, v && (L(f, !1), f.strm.avail_out === 0)) return m;
            } else if (f.match_available) {
              if ((v = a._tr_tally(f, 0, f.window[f.strstart - 1])) && L(f, !1), f.strstart++, f.lookahead--, f.strm.avail_out === 0) return m;
            } else f.match_available = 1, f.strstart++, f.lookahead--;
          }
          return f.match_available && (v = a._tr_tally(f, 0, f.window[f.strstart - 1]), f.match_available = 0), f.insert = f.strstart < T - 1 ? f.strstart : T - 1, B === p ? (L(f, !0), f.strm.avail_out === 0 ? et : $) : f.last_lit && (L(f, !1), f.strm.avail_out === 0) ? m : U;
        }
        function ot(f, B, N, v, b) {
          this.good_length = f, this.max_lazy = B, this.nice_length = N, this.max_chain = v, this.func = b;
        }
        function yt() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = k, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new o.Buf16(2 * x), this.dyn_dtree = new o.Buf16(2 * (2 * D + 1)), this.bl_tree = new o.Buf16(2 * (2 * P + 1)), Q(this.dyn_ltree), Q(this.dyn_dtree), Q(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new o.Buf16(O + 1), this.heap = new o.Buf16(2 * A + 1), Q(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new o.Buf16(2 * A + 1), Q(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function dt(f) {
          var B;
          return f && f.state ? (f.total_in = f.total_out = 0, f.data_type = y, (B = f.state).pending = 0, B.pending_out = 0, B.wrap < 0 && (B.wrap = -B.wrap), B.status = B.wrap ? S : z, f.adler = B.wrap === 2 ? 0 : 1, B.last_flush = d, a._tr_init(B), u) : nt(f, w);
        }
        function Pt(f) {
          var B = dt(f);
          return B === u && (function(N) {
            N.window_size = 2 * N.w_size, Q(N.head), N.max_lazy_match = i[N.level].max_lazy, N.good_match = i[N.level].good_length, N.nice_match = i[N.level].nice_length, N.max_chain_length = i[N.level].max_chain, N.strstart = 0, N.block_start = 0, N.lookahead = 0, N.insert = 0, N.match_length = N.prev_length = T - 1, N.match_available = 0, N.ins_h = 0;
          })(f.state), B;
        }
        function zt(f, B, N, v, b, E) {
          if (!f) return w;
          var F = 1;
          if (B === g && (B = 6), v < 0 ? (F = 0, v = -v) : 15 < v && (F = 2, v -= 16), b < 1 || C < b || N !== k || v < 8 || 15 < v || B < 0 || 9 < B || E < 0 || _ < E) return nt(f, w);
          v === 8 && (v = 9);
          var j = new yt();
          return (f.state = j).strm = f, j.wrap = F, j.gzhead = null, j.w_bits = v, j.w_size = 1 << j.w_bits, j.w_mask = j.w_size - 1, j.hash_bits = b + 7, j.hash_size = 1 << j.hash_bits, j.hash_mask = j.hash_size - 1, j.hash_shift = ~~((j.hash_bits + T - 1) / T), j.window = new o.Buf8(2 * j.w_size), j.head = new o.Buf16(j.hash_size), j.prev = new o.Buf16(j.w_size), j.lit_bufsize = 1 << b + 6, j.pending_buf_size = 4 * j.lit_bufsize, j.pending_buf = new o.Buf8(j.pending_buf_size), j.d_buf = 1 * j.lit_bufsize, j.l_buf = 3 * j.lit_bufsize, j.level = B, j.strategy = E, j.method = N, Pt(f);
        }
        i = [new ot(0, 0, 0, 0, function(f, B) {
          var N = 65535;
          for (N > f.pending_buf_size - 5 && (N = f.pending_buf_size - 5); ; ) {
            if (f.lookahead <= 1) {
              if (ht(f), f.lookahead === 0 && B === d) return m;
              if (f.lookahead === 0) break;
            }
            f.strstart += f.lookahead, f.lookahead = 0;
            var v = f.block_start + N;
            if ((f.strstart === 0 || f.strstart >= v) && (f.lookahead = f.strstart - v, f.strstart = v, L(f, !1), f.strm.avail_out === 0) || f.strstart - f.block_start >= f.w_size - V && (L(f, !1), f.strm.avail_out === 0)) return m;
          }
          return f.insert = 0, B === p ? (L(f, !0), f.strm.avail_out === 0 ? et : $) : (f.strstart > f.block_start && (L(f, !1), f.strm.avail_out), m);
        }), new ot(4, 4, 8, 4, vt), new ot(4, 5, 16, 8, vt), new ot(4, 6, 32, 32, vt), new ot(4, 4, 16, 16, st), new ot(8, 16, 32, 32, st), new ot(8, 16, 128, 128, st), new ot(8, 32, 128, 256, st), new ot(32, 128, 258, 1024, st), new ot(32, 258, 258, 4096, st)], s.deflateInit = function(f, B) {
          return zt(f, B, k, 15, 8, 0);
        }, s.deflateInit2 = zt, s.deflateReset = Pt, s.deflateResetKeep = dt, s.deflateSetHeader = function(f, B) {
          return f && f.state ? f.state.wrap !== 2 ? w : (f.state.gzhead = B, u) : w;
        }, s.deflate = function(f, B) {
          var N, v, b, E;
          if (!f || !f.state || 5 < B || B < 0) return f ? nt(f, w) : w;
          if (v = f.state, !f.output || !f.input && f.avail_in !== 0 || v.status === 666 && B !== p) return nt(f, f.avail_out === 0 ? -5 : w);
          if (v.strm = f, N = v.last_flush, v.last_flush = B, v.status === S) if (v.wrap === 2) f.adler = 0, J(v, 31), J(v, 139), J(v, 8), v.gzhead ? (J(v, (v.gzhead.text ? 1 : 0) + (v.gzhead.hcrc ? 2 : 0) + (v.gzhead.extra ? 4 : 0) + (v.gzhead.name ? 8 : 0) + (v.gzhead.comment ? 16 : 0)), J(v, 255 & v.gzhead.time), J(v, v.gzhead.time >> 8 & 255), J(v, v.gzhead.time >> 16 & 255), J(v, v.gzhead.time >> 24 & 255), J(v, v.level === 9 ? 2 : 2 <= v.strategy || v.level < 2 ? 4 : 0), J(v, 255 & v.gzhead.os), v.gzhead.extra && v.gzhead.extra.length && (J(v, 255 & v.gzhead.extra.length), J(v, v.gzhead.extra.length >> 8 & 255)), v.gzhead.hcrc && (f.adler = h(f.adler, v.pending_buf, v.pending, 0)), v.gzindex = 0, v.status = 69) : (J(v, 0), J(v, 0), J(v, 0), J(v, 0), J(v, 0), J(v, v.level === 9 ? 2 : 2 <= v.strategy || v.level < 2 ? 4 : 0), J(v, 3), v.status = z);
          else {
            var F = k + (v.w_bits - 8 << 4) << 8;
            F |= (2 <= v.strategy || v.level < 2 ? 0 : v.level < 6 ? 1 : v.level === 6 ? 2 : 3) << 6, v.strstart !== 0 && (F |= 32), F += 31 - F % 31, v.status = z, q(v, F), v.strstart !== 0 && (q(v, f.adler >>> 16), q(v, 65535 & f.adler)), f.adler = 1;
          }
          if (v.status === 69) if (v.gzhead.extra) {
            for (b = v.pending; v.gzindex < (65535 & v.gzhead.extra.length) && (v.pending !== v.pending_buf_size || (v.gzhead.hcrc && v.pending > b && (f.adler = h(f.adler, v.pending_buf, v.pending - b, b)), R(f), b = v.pending, v.pending !== v.pending_buf_size)); ) J(v, 255 & v.gzhead.extra[v.gzindex]), v.gzindex++;
            v.gzhead.hcrc && v.pending > b && (f.adler = h(f.adler, v.pending_buf, v.pending - b, b)), v.gzindex === v.gzhead.extra.length && (v.gzindex = 0, v.status = 73);
          } else v.status = 73;
          if (v.status === 73) if (v.gzhead.name) {
            b = v.pending;
            do {
              if (v.pending === v.pending_buf_size && (v.gzhead.hcrc && v.pending > b && (f.adler = h(f.adler, v.pending_buf, v.pending - b, b)), R(f), b = v.pending, v.pending === v.pending_buf_size)) {
                E = 1;
                break;
              }
              E = v.gzindex < v.gzhead.name.length ? 255 & v.gzhead.name.charCodeAt(v.gzindex++) : 0, J(v, E);
            } while (E !== 0);
            v.gzhead.hcrc && v.pending > b && (f.adler = h(f.adler, v.pending_buf, v.pending - b, b)), E === 0 && (v.gzindex = 0, v.status = 91);
          } else v.status = 91;
          if (v.status === 91) if (v.gzhead.comment) {
            b = v.pending;
            do {
              if (v.pending === v.pending_buf_size && (v.gzhead.hcrc && v.pending > b && (f.adler = h(f.adler, v.pending_buf, v.pending - b, b)), R(f), b = v.pending, v.pending === v.pending_buf_size)) {
                E = 1;
                break;
              }
              E = v.gzindex < v.gzhead.comment.length ? 255 & v.gzhead.comment.charCodeAt(v.gzindex++) : 0, J(v, E);
            } while (E !== 0);
            v.gzhead.hcrc && v.pending > b && (f.adler = h(f.adler, v.pending_buf, v.pending - b, b)), E === 0 && (v.status = 103);
          } else v.status = 103;
          if (v.status === 103 && (v.gzhead.hcrc ? (v.pending + 2 > v.pending_buf_size && R(f), v.pending + 2 <= v.pending_buf_size && (J(v, 255 & f.adler), J(v, f.adler >> 8 & 255), f.adler = 0, v.status = z)) : v.status = z), v.pending !== 0) {
            if (R(f), f.avail_out === 0) return v.last_flush = -1, u;
          } else if (f.avail_in === 0 && H(B) <= H(N) && B !== p) return nt(f, -5);
          if (v.status === 666 && f.avail_in !== 0) return nt(f, -5);
          if (f.avail_in !== 0 || v.lookahead !== 0 || B !== d && v.status !== 666) {
            var j = v.strategy === 2 ? (function(I, W) {
              for (var G; ; ) {
                if (I.lookahead === 0 && (ht(I), I.lookahead === 0)) {
                  if (W === d) return m;
                  break;
                }
                if (I.match_length = 0, G = a._tr_tally(I, 0, I.window[I.strstart]), I.lookahead--, I.strstart++, G && (L(I, !1), I.strm.avail_out === 0)) return m;
              }
              return I.insert = 0, W === p ? (L(I, !0), I.strm.avail_out === 0 ? et : $) : I.last_lit && (L(I, !1), I.strm.avail_out === 0) ? m : U;
            })(v, B) : v.strategy === 3 ? (function(I, W) {
              for (var G, Z, X, ct, it = I.window; ; ) {
                if (I.lookahead <= M) {
                  if (ht(I), I.lookahead <= M && W === d) return m;
                  if (I.lookahead === 0) break;
                }
                if (I.match_length = 0, I.lookahead >= T && 0 < I.strstart && (Z = it[X = I.strstart - 1]) === it[++X] && Z === it[++X] && Z === it[++X]) {
                  ct = I.strstart + M;
                  do
                    ;
                  while (Z === it[++X] && Z === it[++X] && Z === it[++X] && Z === it[++X] && Z === it[++X] && Z === it[++X] && Z === it[++X] && Z === it[++X] && X < ct);
                  I.match_length = M - (ct - X), I.match_length > I.lookahead && (I.match_length = I.lookahead);
                }
                if (I.match_length >= T ? (G = a._tr_tally(I, 1, I.match_length - T), I.lookahead -= I.match_length, I.strstart += I.match_length, I.match_length = 0) : (G = a._tr_tally(I, 0, I.window[I.strstart]), I.lookahead--, I.strstart++), G && (L(I, !1), I.strm.avail_out === 0)) return m;
              }
              return I.insert = 0, W === p ? (L(I, !0), I.strm.avail_out === 0 ? et : $) : I.last_lit && (L(I, !1), I.strm.avail_out === 0) ? m : U;
            })(v, B) : i[v.level].func(v, B);
            if (j !== et && j !== $ || (v.status = 666), j === m || j === et) return f.avail_out === 0 && (v.last_flush = -1), u;
            if (j === U && (B === 1 ? a._tr_align(v) : B !== 5 && (a._tr_stored_block(v, 0, 0, !1), B === 3 && (Q(v.head), v.lookahead === 0 && (v.strstart = 0, v.block_start = 0, v.insert = 0))), R(f), f.avail_out === 0)) return v.last_flush = -1, u;
          }
          return B !== p ? u : v.wrap <= 0 ? 1 : (v.wrap === 2 ? (J(v, 255 & f.adler), J(v, f.adler >> 8 & 255), J(v, f.adler >> 16 & 255), J(v, f.adler >> 24 & 255), J(v, 255 & f.total_in), J(v, f.total_in >> 8 & 255), J(v, f.total_in >> 16 & 255), J(v, f.total_in >> 24 & 255)) : (q(v, f.adler >>> 16), q(v, 65535 & f.adler)), R(f), 0 < v.wrap && (v.wrap = -v.wrap), v.pending !== 0 ? u : 1);
        }, s.deflateEnd = function(f) {
          var B;
          return f && f.state ? (B = f.state.status) !== S && B !== 69 && B !== 73 && B !== 91 && B !== 103 && B !== z && B !== 666 ? nt(f, w) : (f.state = null, B === z ? nt(f, -3) : u) : w;
        }, s.deflateSetDictionary = function(f, B) {
          var N, v, b, E, F, j, I, W, G = B.length;
          if (!f || !f.state || (E = (N = f.state).wrap) === 2 || E === 1 && N.status !== S || N.lookahead) return w;
          for (E === 1 && (f.adler = c(f.adler, B, G, 0)), N.wrap = 0, G >= N.w_size && (E === 0 && (Q(N.head), N.strstart = 0, N.block_start = 0, N.insert = 0), W = new o.Buf8(N.w_size), o.arraySet(W, B, G - N.w_size, N.w_size, 0), B = W, G = N.w_size), F = f.avail_in, j = f.next_in, I = f.input, f.avail_in = G, f.next_in = 0, f.input = B, ht(N); N.lookahead >= T; ) {
            for (v = N.strstart, b = N.lookahead - (T - 1); N.ins_h = (N.ins_h << N.hash_shift ^ N.window[v + T - 1]) & N.hash_mask, N.prev[v & N.w_mask] = N.head[N.ins_h], N.head[N.ins_h] = v, v++, --b; ) ;
            N.strstart = v, N.lookahead = T - 1, ht(N);
          }
          return N.strstart += N.lookahead, N.block_start = N.strstart, N.insert = N.lookahead, N.lookahead = 0, N.match_length = N.prev_length = T - 1, N.match_available = 0, f.next_in = j, f.input = I, f.avail_in = F, N.wrap = E, u;
        }, s.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, r, s) {
        r.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
        };
      }, {}], 48: [function(e, r, s) {
        r.exports = function(i, o) {
          var a, c, h, l, d, p, u, w, g, _, y, k, C, A, D, P, x, O, T, M, V, S, z, m, U;
          a = i.state, c = i.next_in, m = i.input, h = c + (i.avail_in - 5), l = i.next_out, U = i.output, d = l - (o - i.avail_out), p = l + (i.avail_out - 257), u = a.dmax, w = a.wsize, g = a.whave, _ = a.wnext, y = a.window, k = a.hold, C = a.bits, A = a.lencode, D = a.distcode, P = (1 << a.lenbits) - 1, x = (1 << a.distbits) - 1;
          t: do {
            C < 15 && (k += m[c++] << C, C += 8, k += m[c++] << C, C += 8), O = A[k & P];
            e: for (; ; ) {
              if (k >>>= T = O >>> 24, C -= T, (T = O >>> 16 & 255) === 0) U[l++] = 65535 & O;
              else {
                if (!(16 & T)) {
                  if ((64 & T) == 0) {
                    O = A[(65535 & O) + (k & (1 << T) - 1)];
                    continue e;
                  }
                  if (32 & T) {
                    a.mode = 12;
                    break t;
                  }
                  i.msg = "invalid literal/length code", a.mode = 30;
                  break t;
                }
                M = 65535 & O, (T &= 15) && (C < T && (k += m[c++] << C, C += 8), M += k & (1 << T) - 1, k >>>= T, C -= T), C < 15 && (k += m[c++] << C, C += 8, k += m[c++] << C, C += 8), O = D[k & x];
                n: for (; ; ) {
                  if (k >>>= T = O >>> 24, C -= T, !(16 & (T = O >>> 16 & 255))) {
                    if ((64 & T) == 0) {
                      O = D[(65535 & O) + (k & (1 << T) - 1)];
                      continue n;
                    }
                    i.msg = "invalid distance code", a.mode = 30;
                    break t;
                  }
                  if (V = 65535 & O, C < (T &= 15) && (k += m[c++] << C, (C += 8) < T && (k += m[c++] << C, C += 8)), u < (V += k & (1 << T) - 1)) {
                    i.msg = "invalid distance too far back", a.mode = 30;
                    break t;
                  }
                  if (k >>>= T, C -= T, (T = l - d) < V) {
                    if (g < (T = V - T) && a.sane) {
                      i.msg = "invalid distance too far back", a.mode = 30;
                      break t;
                    }
                    if (z = y, (S = 0) === _) {
                      if (S += w - T, T < M) {
                        for (M -= T; U[l++] = y[S++], --T; ) ;
                        S = l - V, z = U;
                      }
                    } else if (_ < T) {
                      if (S += w + _ - T, (T -= _) < M) {
                        for (M -= T; U[l++] = y[S++], --T; ) ;
                        if (S = 0, _ < M) {
                          for (M -= T = _; U[l++] = y[S++], --T; ) ;
                          S = l - V, z = U;
                        }
                      }
                    } else if (S += _ - T, T < M) {
                      for (M -= T; U[l++] = y[S++], --T; ) ;
                      S = l - V, z = U;
                    }
                    for (; 2 < M; ) U[l++] = z[S++], U[l++] = z[S++], U[l++] = z[S++], M -= 3;
                    M && (U[l++] = z[S++], 1 < M && (U[l++] = z[S++]));
                  } else {
                    for (S = l - V; U[l++] = U[S++], U[l++] = U[S++], U[l++] = U[S++], 2 < (M -= 3); ) ;
                    M && (U[l++] = U[S++], 1 < M && (U[l++] = U[S++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (c < h && l < p);
          c -= M = C >> 3, k &= (1 << (C -= M << 3)) - 1, i.next_in = c, i.next_out = l, i.avail_in = c < h ? h - c + 5 : 5 - (c - h), i.avail_out = l < p ? p - l + 257 : 257 - (l - p), a.hold = k, a.bits = C;
        };
      }, {}], 49: [function(e, r, s) {
        var i = e("../utils/common"), o = e("./adler32"), a = e("./crc32"), c = e("./inffast"), h = e("./inftrees"), l = 1, d = 2, p = 0, u = -2, w = 1, g = 852, _ = 592;
        function y(S) {
          return (S >>> 24 & 255) + (S >>> 8 & 65280) + ((65280 & S) << 8) + ((255 & S) << 24);
        }
        function k() {
          this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new i.Buf16(320), this.work = new i.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function C(S) {
          var z;
          return S && S.state ? (z = S.state, S.total_in = S.total_out = z.total = 0, S.msg = "", z.wrap && (S.adler = 1 & z.wrap), z.mode = w, z.last = 0, z.havedict = 0, z.dmax = 32768, z.head = null, z.hold = 0, z.bits = 0, z.lencode = z.lendyn = new i.Buf32(g), z.distcode = z.distdyn = new i.Buf32(_), z.sane = 1, z.back = -1, p) : u;
        }
        function A(S) {
          var z;
          return S && S.state ? ((z = S.state).wsize = 0, z.whave = 0, z.wnext = 0, C(S)) : u;
        }
        function D(S, z) {
          var m, U;
          return S && S.state ? (U = S.state, z < 0 ? (m = 0, z = -z) : (m = 1 + (z >> 4), z < 48 && (z &= 15)), z && (z < 8 || 15 < z) ? u : (U.window !== null && U.wbits !== z && (U.window = null), U.wrap = m, U.wbits = z, A(S))) : u;
        }
        function P(S, z) {
          var m, U;
          return S ? (U = new k(), (S.state = U).window = null, (m = D(S, z)) !== p && (S.state = null), m) : u;
        }
        var x, O, T = !0;
        function M(S) {
          if (T) {
            var z;
            for (x = new i.Buf32(512), O = new i.Buf32(32), z = 0; z < 144; ) S.lens[z++] = 8;
            for (; z < 256; ) S.lens[z++] = 9;
            for (; z < 280; ) S.lens[z++] = 7;
            for (; z < 288; ) S.lens[z++] = 8;
            for (h(l, S.lens, 0, 288, x, 0, S.work, { bits: 9 }), z = 0; z < 32; ) S.lens[z++] = 5;
            h(d, S.lens, 0, 32, O, 0, S.work, { bits: 5 }), T = !1;
          }
          S.lencode = x, S.lenbits = 9, S.distcode = O, S.distbits = 5;
        }
        function V(S, z, m, U) {
          var et, $ = S.state;
          return $.window === null && ($.wsize = 1 << $.wbits, $.wnext = 0, $.whave = 0, $.window = new i.Buf8($.wsize)), U >= $.wsize ? (i.arraySet($.window, z, m - $.wsize, $.wsize, 0), $.wnext = 0, $.whave = $.wsize) : (U < (et = $.wsize - $.wnext) && (et = U), i.arraySet($.window, z, m - U, et, $.wnext), (U -= et) ? (i.arraySet($.window, z, m - U, U, 0), $.wnext = U, $.whave = $.wsize) : ($.wnext += et, $.wnext === $.wsize && ($.wnext = 0), $.whave < $.wsize && ($.whave += et))), 0;
        }
        s.inflateReset = A, s.inflateReset2 = D, s.inflateResetKeep = C, s.inflateInit = function(S) {
          return P(S, 15);
        }, s.inflateInit2 = P, s.inflate = function(S, z) {
          var m, U, et, $, nt, H, Q, R, L, J, q, Y, ht, vt, st, ot, yt, dt, Pt, zt, f, B, N, v, b = 0, E = new i.Buf8(4), F = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!S || !S.state || !S.output || !S.input && S.avail_in !== 0) return u;
          (m = S.state).mode === 12 && (m.mode = 13), nt = S.next_out, et = S.output, Q = S.avail_out, $ = S.next_in, U = S.input, H = S.avail_in, R = m.hold, L = m.bits, J = H, q = Q, B = p;
          t: for (; ; ) switch (m.mode) {
            case w:
              if (m.wrap === 0) {
                m.mode = 13;
                break;
              }
              for (; L < 16; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              if (2 & m.wrap && R === 35615) {
                E[m.check = 0] = 255 & R, E[1] = R >>> 8 & 255, m.check = a(m.check, E, 2, 0), L = R = 0, m.mode = 2;
                break;
              }
              if (m.flags = 0, m.head && (m.head.done = !1), !(1 & m.wrap) || (((255 & R) << 8) + (R >> 8)) % 31) {
                S.msg = "incorrect header check", m.mode = 30;
                break;
              }
              if ((15 & R) != 8) {
                S.msg = "unknown compression method", m.mode = 30;
                break;
              }
              if (L -= 4, f = 8 + (15 & (R >>>= 4)), m.wbits === 0) m.wbits = f;
              else if (f > m.wbits) {
                S.msg = "invalid window size", m.mode = 30;
                break;
              }
              m.dmax = 1 << f, S.adler = m.check = 1, m.mode = 512 & R ? 10 : 12, L = R = 0;
              break;
            case 2:
              for (; L < 16; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              if (m.flags = R, (255 & m.flags) != 8) {
                S.msg = "unknown compression method", m.mode = 30;
                break;
              }
              if (57344 & m.flags) {
                S.msg = "unknown header flags set", m.mode = 30;
                break;
              }
              m.head && (m.head.text = R >> 8 & 1), 512 & m.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, m.check = a(m.check, E, 2, 0)), L = R = 0, m.mode = 3;
            case 3:
              for (; L < 32; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              m.head && (m.head.time = R), 512 & m.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, E[2] = R >>> 16 & 255, E[3] = R >>> 24 & 255, m.check = a(m.check, E, 4, 0)), L = R = 0, m.mode = 4;
            case 4:
              for (; L < 16; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              m.head && (m.head.xflags = 255 & R, m.head.os = R >> 8), 512 & m.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, m.check = a(m.check, E, 2, 0)), L = R = 0, m.mode = 5;
            case 5:
              if (1024 & m.flags) {
                for (; L < 16; ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                m.length = R, m.head && (m.head.extra_len = R), 512 & m.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, m.check = a(m.check, E, 2, 0)), L = R = 0;
              } else m.head && (m.head.extra = null);
              m.mode = 6;
            case 6:
              if (1024 & m.flags && (H < (Y = m.length) && (Y = H), Y && (m.head && (f = m.head.extra_len - m.length, m.head.extra || (m.head.extra = new Array(m.head.extra_len)), i.arraySet(m.head.extra, U, $, Y, f)), 512 & m.flags && (m.check = a(m.check, U, Y, $)), H -= Y, $ += Y, m.length -= Y), m.length)) break t;
              m.length = 0, m.mode = 7;
            case 7:
              if (2048 & m.flags) {
                if (H === 0) break t;
                for (Y = 0; f = U[$ + Y++], m.head && f && m.length < 65536 && (m.head.name += String.fromCharCode(f)), f && Y < H; ) ;
                if (512 & m.flags && (m.check = a(m.check, U, Y, $)), H -= Y, $ += Y, f) break t;
              } else m.head && (m.head.name = null);
              m.length = 0, m.mode = 8;
            case 8:
              if (4096 & m.flags) {
                if (H === 0) break t;
                for (Y = 0; f = U[$ + Y++], m.head && f && m.length < 65536 && (m.head.comment += String.fromCharCode(f)), f && Y < H; ) ;
                if (512 & m.flags && (m.check = a(m.check, U, Y, $)), H -= Y, $ += Y, f) break t;
              } else m.head && (m.head.comment = null);
              m.mode = 9;
            case 9:
              if (512 & m.flags) {
                for (; L < 16; ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                if (R !== (65535 & m.check)) {
                  S.msg = "header crc mismatch", m.mode = 30;
                  break;
                }
                L = R = 0;
              }
              m.head && (m.head.hcrc = m.flags >> 9 & 1, m.head.done = !0), S.adler = m.check = 0, m.mode = 12;
              break;
            case 10:
              for (; L < 32; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              S.adler = m.check = y(R), L = R = 0, m.mode = 11;
            case 11:
              if (m.havedict === 0) return S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = H, m.hold = R, m.bits = L, 2;
              S.adler = m.check = 1, m.mode = 12;
            case 12:
              if (z === 5 || z === 6) break t;
            case 13:
              if (m.last) {
                R >>>= 7 & L, L -= 7 & L, m.mode = 27;
                break;
              }
              for (; L < 3; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              switch (m.last = 1 & R, L -= 1, 3 & (R >>>= 1)) {
                case 0:
                  m.mode = 14;
                  break;
                case 1:
                  if (M(m), m.mode = 20, z !== 6) break;
                  R >>>= 2, L -= 2;
                  break t;
                case 2:
                  m.mode = 17;
                  break;
                case 3:
                  S.msg = "invalid block type", m.mode = 30;
              }
              R >>>= 2, L -= 2;
              break;
            case 14:
              for (R >>>= 7 & L, L -= 7 & L; L < 32; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              if ((65535 & R) != (R >>> 16 ^ 65535)) {
                S.msg = "invalid stored block lengths", m.mode = 30;
                break;
              }
              if (m.length = 65535 & R, L = R = 0, m.mode = 15, z === 6) break t;
            case 15:
              m.mode = 16;
            case 16:
              if (Y = m.length) {
                if (H < Y && (Y = H), Q < Y && (Y = Q), Y === 0) break t;
                i.arraySet(et, U, $, Y, nt), H -= Y, $ += Y, Q -= Y, nt += Y, m.length -= Y;
                break;
              }
              m.mode = 12;
              break;
            case 17:
              for (; L < 14; ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              if (m.nlen = 257 + (31 & R), R >>>= 5, L -= 5, m.ndist = 1 + (31 & R), R >>>= 5, L -= 5, m.ncode = 4 + (15 & R), R >>>= 4, L -= 4, 286 < m.nlen || 30 < m.ndist) {
                S.msg = "too many length or distance symbols", m.mode = 30;
                break;
              }
              m.have = 0, m.mode = 18;
            case 18:
              for (; m.have < m.ncode; ) {
                for (; L < 3; ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                m.lens[F[m.have++]] = 7 & R, R >>>= 3, L -= 3;
              }
              for (; m.have < 19; ) m.lens[F[m.have++]] = 0;
              if (m.lencode = m.lendyn, m.lenbits = 7, N = { bits: m.lenbits }, B = h(0, m.lens, 0, 19, m.lencode, 0, m.work, N), m.lenbits = N.bits, B) {
                S.msg = "invalid code lengths set", m.mode = 30;
                break;
              }
              m.have = 0, m.mode = 19;
            case 19:
              for (; m.have < m.nlen + m.ndist; ) {
                for (; ot = (b = m.lencode[R & (1 << m.lenbits) - 1]) >>> 16 & 255, yt = 65535 & b, !((st = b >>> 24) <= L); ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                if (yt < 16) R >>>= st, L -= st, m.lens[m.have++] = yt;
                else {
                  if (yt === 16) {
                    for (v = st + 2; L < v; ) {
                      if (H === 0) break t;
                      H--, R += U[$++] << L, L += 8;
                    }
                    if (R >>>= st, L -= st, m.have === 0) {
                      S.msg = "invalid bit length repeat", m.mode = 30;
                      break;
                    }
                    f = m.lens[m.have - 1], Y = 3 + (3 & R), R >>>= 2, L -= 2;
                  } else if (yt === 17) {
                    for (v = st + 3; L < v; ) {
                      if (H === 0) break t;
                      H--, R += U[$++] << L, L += 8;
                    }
                    L -= st, f = 0, Y = 3 + (7 & (R >>>= st)), R >>>= 3, L -= 3;
                  } else {
                    for (v = st + 7; L < v; ) {
                      if (H === 0) break t;
                      H--, R += U[$++] << L, L += 8;
                    }
                    L -= st, f = 0, Y = 11 + (127 & (R >>>= st)), R >>>= 7, L -= 7;
                  }
                  if (m.have + Y > m.nlen + m.ndist) {
                    S.msg = "invalid bit length repeat", m.mode = 30;
                    break;
                  }
                  for (; Y--; ) m.lens[m.have++] = f;
                }
              }
              if (m.mode === 30) break;
              if (m.lens[256] === 0) {
                S.msg = "invalid code -- missing end-of-block", m.mode = 30;
                break;
              }
              if (m.lenbits = 9, N = { bits: m.lenbits }, B = h(l, m.lens, 0, m.nlen, m.lencode, 0, m.work, N), m.lenbits = N.bits, B) {
                S.msg = "invalid literal/lengths set", m.mode = 30;
                break;
              }
              if (m.distbits = 6, m.distcode = m.distdyn, N = { bits: m.distbits }, B = h(d, m.lens, m.nlen, m.ndist, m.distcode, 0, m.work, N), m.distbits = N.bits, B) {
                S.msg = "invalid distances set", m.mode = 30;
                break;
              }
              if (m.mode = 20, z === 6) break t;
            case 20:
              m.mode = 21;
            case 21:
              if (6 <= H && 258 <= Q) {
                S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = H, m.hold = R, m.bits = L, c(S, q), nt = S.next_out, et = S.output, Q = S.avail_out, $ = S.next_in, U = S.input, H = S.avail_in, R = m.hold, L = m.bits, m.mode === 12 && (m.back = -1);
                break;
              }
              for (m.back = 0; ot = (b = m.lencode[R & (1 << m.lenbits) - 1]) >>> 16 & 255, yt = 65535 & b, !((st = b >>> 24) <= L); ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              if (ot && (240 & ot) == 0) {
                for (dt = st, Pt = ot, zt = yt; ot = (b = m.lencode[zt + ((R & (1 << dt + Pt) - 1) >> dt)]) >>> 16 & 255, yt = 65535 & b, !(dt + (st = b >>> 24) <= L); ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                R >>>= dt, L -= dt, m.back += dt;
              }
              if (R >>>= st, L -= st, m.back += st, m.length = yt, ot === 0) {
                m.mode = 26;
                break;
              }
              if (32 & ot) {
                m.back = -1, m.mode = 12;
                break;
              }
              if (64 & ot) {
                S.msg = "invalid literal/length code", m.mode = 30;
                break;
              }
              m.extra = 15 & ot, m.mode = 22;
            case 22:
              if (m.extra) {
                for (v = m.extra; L < v; ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                m.length += R & (1 << m.extra) - 1, R >>>= m.extra, L -= m.extra, m.back += m.extra;
              }
              m.was = m.length, m.mode = 23;
            case 23:
              for (; ot = (b = m.distcode[R & (1 << m.distbits) - 1]) >>> 16 & 255, yt = 65535 & b, !((st = b >>> 24) <= L); ) {
                if (H === 0) break t;
                H--, R += U[$++] << L, L += 8;
              }
              if ((240 & ot) == 0) {
                for (dt = st, Pt = ot, zt = yt; ot = (b = m.distcode[zt + ((R & (1 << dt + Pt) - 1) >> dt)]) >>> 16 & 255, yt = 65535 & b, !(dt + (st = b >>> 24) <= L); ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                R >>>= dt, L -= dt, m.back += dt;
              }
              if (R >>>= st, L -= st, m.back += st, 64 & ot) {
                S.msg = "invalid distance code", m.mode = 30;
                break;
              }
              m.offset = yt, m.extra = 15 & ot, m.mode = 24;
            case 24:
              if (m.extra) {
                for (v = m.extra; L < v; ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                m.offset += R & (1 << m.extra) - 1, R >>>= m.extra, L -= m.extra, m.back += m.extra;
              }
              if (m.offset > m.dmax) {
                S.msg = "invalid distance too far back", m.mode = 30;
                break;
              }
              m.mode = 25;
            case 25:
              if (Q === 0) break t;
              if (Y = q - Q, m.offset > Y) {
                if ((Y = m.offset - Y) > m.whave && m.sane) {
                  S.msg = "invalid distance too far back", m.mode = 30;
                  break;
                }
                ht = Y > m.wnext ? (Y -= m.wnext, m.wsize - Y) : m.wnext - Y, Y > m.length && (Y = m.length), vt = m.window;
              } else vt = et, ht = nt - m.offset, Y = m.length;
              for (Q < Y && (Y = Q), Q -= Y, m.length -= Y; et[nt++] = vt[ht++], --Y; ) ;
              m.length === 0 && (m.mode = 21);
              break;
            case 26:
              if (Q === 0) break t;
              et[nt++] = m.length, Q--, m.mode = 21;
              break;
            case 27:
              if (m.wrap) {
                for (; L < 32; ) {
                  if (H === 0) break t;
                  H--, R |= U[$++] << L, L += 8;
                }
                if (q -= Q, S.total_out += q, m.total += q, q && (S.adler = m.check = m.flags ? a(m.check, et, q, nt - q) : o(m.check, et, q, nt - q)), q = Q, (m.flags ? R : y(R)) !== m.check) {
                  S.msg = "incorrect data check", m.mode = 30;
                  break;
                }
                L = R = 0;
              }
              m.mode = 28;
            case 28:
              if (m.wrap && m.flags) {
                for (; L < 32; ) {
                  if (H === 0) break t;
                  H--, R += U[$++] << L, L += 8;
                }
                if (R !== (4294967295 & m.total)) {
                  S.msg = "incorrect length check", m.mode = 30;
                  break;
                }
                L = R = 0;
              }
              m.mode = 29;
            case 29:
              B = 1;
              break t;
            case 30:
              B = -3;
              break t;
            case 31:
              return -4;
            default:
              return u;
          }
          return S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = H, m.hold = R, m.bits = L, (m.wsize || q !== S.avail_out && m.mode < 30 && (m.mode < 27 || z !== 4)) && V(S, S.output, S.next_out, q - S.avail_out) ? (m.mode = 31, -4) : (J -= S.avail_in, q -= S.avail_out, S.total_in += J, S.total_out += q, m.total += q, m.wrap && q && (S.adler = m.check = m.flags ? a(m.check, et, q, S.next_out - q) : o(m.check, et, q, S.next_out - q)), S.data_type = m.bits + (m.last ? 64 : 0) + (m.mode === 12 ? 128 : 0) + (m.mode === 20 || m.mode === 15 ? 256 : 0), (J == 0 && q === 0 || z === 4) && B === p && (B = -5), B);
        }, s.inflateEnd = function(S) {
          if (!S || !S.state) return u;
          var z = S.state;
          return z.window && (z.window = null), S.state = null, p;
        }, s.inflateGetHeader = function(S, z) {
          var m;
          return S && S.state ? (2 & (m = S.state).wrap) == 0 ? u : ((m.head = z).done = !1, p) : u;
        }, s.inflateSetDictionary = function(S, z) {
          var m, U = z.length;
          return S && S.state ? (m = S.state).wrap !== 0 && m.mode !== 11 ? u : m.mode === 11 && o(1, z, U, 0) !== m.check ? -3 : V(S, z, U, U) ? (m.mode = 31, -4) : (m.havedict = 1, p) : u;
        }, s.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, r, s) {
        var i = e("../utils/common"), o = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], a = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], c = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], h = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        r.exports = function(l, d, p, u, w, g, _, y) {
          var k, C, A, D, P, x, O, T, M, V = y.bits, S = 0, z = 0, m = 0, U = 0, et = 0, $ = 0, nt = 0, H = 0, Q = 0, R = 0, L = null, J = 0, q = new i.Buf16(16), Y = new i.Buf16(16), ht = null, vt = 0;
          for (S = 0; S <= 15; S++) q[S] = 0;
          for (z = 0; z < u; z++) q[d[p + z]]++;
          for (et = V, U = 15; 1 <= U && q[U] === 0; U--) ;
          if (U < et && (et = U), U === 0) return w[g++] = 20971520, w[g++] = 20971520, y.bits = 1, 0;
          for (m = 1; m < U && q[m] === 0; m++) ;
          for (et < m && (et = m), S = H = 1; S <= 15; S++) if (H <<= 1, (H -= q[S]) < 0) return -1;
          if (0 < H && (l === 0 || U !== 1)) return -1;
          for (Y[1] = 0, S = 1; S < 15; S++) Y[S + 1] = Y[S] + q[S];
          for (z = 0; z < u; z++) d[p + z] !== 0 && (_[Y[d[p + z]]++] = z);
          if (x = l === 0 ? (L = ht = _, 19) : l === 1 ? (L = o, J -= 257, ht = a, vt -= 257, 256) : (L = c, ht = h, -1), S = m, P = g, nt = z = R = 0, A = -1, D = (Q = 1 << ($ = et)) - 1, l === 1 && 852 < Q || l === 2 && 592 < Q) return 1;
          for (; ; ) {
            for (O = S - nt, M = _[z] < x ? (T = 0, _[z]) : _[z] > x ? (T = ht[vt + _[z]], L[J + _[z]]) : (T = 96, 0), k = 1 << S - nt, m = C = 1 << $; w[P + (R >> nt) + (C -= k)] = O << 24 | T << 16 | M | 0, C !== 0; ) ;
            for (k = 1 << S - 1; R & k; ) k >>= 1;
            if (k !== 0 ? (R &= k - 1, R += k) : R = 0, z++, --q[S] == 0) {
              if (S === U) break;
              S = d[p + _[z]];
            }
            if (et < S && (R & D) !== A) {
              for (nt === 0 && (nt = et), P += m, H = 1 << ($ = S - nt); $ + nt < U && !((H -= q[$ + nt]) <= 0); ) $++, H <<= 1;
              if (Q += 1 << $, l === 1 && 852 < Q || l === 2 && 592 < Q) return 1;
              w[A = R & D] = et << 24 | $ << 16 | P - g | 0;
            }
          }
          return R !== 0 && (w[P + R] = S - nt << 24 | 64 << 16 | 0), y.bits = et, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(e, r, s) {
        r.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(e, r, s) {
        var i = e("../utils/common"), o = 0, a = 1;
        function c(b) {
          for (var E = b.length; 0 <= --E; ) b[E] = 0;
        }
        var h = 0, l = 29, d = 256, p = d + 1 + l, u = 30, w = 19, g = 2 * p + 1, _ = 15, y = 16, k = 7, C = 256, A = 16, D = 17, P = 18, x = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], O = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], T = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], M = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], V = new Array(2 * (p + 2));
        c(V);
        var S = new Array(2 * u);
        c(S);
        var z = new Array(512);
        c(z);
        var m = new Array(256);
        c(m);
        var U = new Array(l);
        c(U);
        var et, $, nt, H = new Array(u);
        function Q(b, E, F, j, I) {
          this.static_tree = b, this.extra_bits = E, this.extra_base = F, this.elems = j, this.max_length = I, this.has_stree = b && b.length;
        }
        function R(b, E) {
          this.dyn_tree = b, this.max_code = 0, this.stat_desc = E;
        }
        function L(b) {
          return b < 256 ? z[b] : z[256 + (b >>> 7)];
        }
        function J(b, E) {
          b.pending_buf[b.pending++] = 255 & E, b.pending_buf[b.pending++] = E >>> 8 & 255;
        }
        function q(b, E, F) {
          b.bi_valid > y - F ? (b.bi_buf |= E << b.bi_valid & 65535, J(b, b.bi_buf), b.bi_buf = E >> y - b.bi_valid, b.bi_valid += F - y) : (b.bi_buf |= E << b.bi_valid & 65535, b.bi_valid += F);
        }
        function Y(b, E, F) {
          q(b, F[2 * E], F[2 * E + 1]);
        }
        function ht(b, E) {
          for (var F = 0; F |= 1 & b, b >>>= 1, F <<= 1, 0 < --E; ) ;
          return F >>> 1;
        }
        function vt(b, E, F) {
          var j, I, W = new Array(_ + 1), G = 0;
          for (j = 1; j <= _; j++) W[j] = G = G + F[j - 1] << 1;
          for (I = 0; I <= E; I++) {
            var Z = b[2 * I + 1];
            Z !== 0 && (b[2 * I] = ht(W[Z]++, Z));
          }
        }
        function st(b) {
          var E;
          for (E = 0; E < p; E++) b.dyn_ltree[2 * E] = 0;
          for (E = 0; E < u; E++) b.dyn_dtree[2 * E] = 0;
          for (E = 0; E < w; E++) b.bl_tree[2 * E] = 0;
          b.dyn_ltree[2 * C] = 1, b.opt_len = b.static_len = 0, b.last_lit = b.matches = 0;
        }
        function ot(b) {
          8 < b.bi_valid ? J(b, b.bi_buf) : 0 < b.bi_valid && (b.pending_buf[b.pending++] = b.bi_buf), b.bi_buf = 0, b.bi_valid = 0;
        }
        function yt(b, E, F, j) {
          var I = 2 * E, W = 2 * F;
          return b[I] < b[W] || b[I] === b[W] && j[E] <= j[F];
        }
        function dt(b, E, F) {
          for (var j = b.heap[F], I = F << 1; I <= b.heap_len && (I < b.heap_len && yt(E, b.heap[I + 1], b.heap[I], b.depth) && I++, !yt(E, j, b.heap[I], b.depth)); ) b.heap[F] = b.heap[I], F = I, I <<= 1;
          b.heap[F] = j;
        }
        function Pt(b, E, F) {
          var j, I, W, G, Z = 0;
          if (b.last_lit !== 0) for (; j = b.pending_buf[b.d_buf + 2 * Z] << 8 | b.pending_buf[b.d_buf + 2 * Z + 1], I = b.pending_buf[b.l_buf + Z], Z++, j === 0 ? Y(b, I, E) : (Y(b, (W = m[I]) + d + 1, E), (G = x[W]) !== 0 && q(b, I -= U[W], G), Y(b, W = L(--j), F), (G = O[W]) !== 0 && q(b, j -= H[W], G)), Z < b.last_lit; ) ;
          Y(b, C, E);
        }
        function zt(b, E) {
          var F, j, I, W = E.dyn_tree, G = E.stat_desc.static_tree, Z = E.stat_desc.has_stree, X = E.stat_desc.elems, ct = -1;
          for (b.heap_len = 0, b.heap_max = g, F = 0; F < X; F++) W[2 * F] !== 0 ? (b.heap[++b.heap_len] = ct = F, b.depth[F] = 0) : W[2 * F + 1] = 0;
          for (; b.heap_len < 2; ) W[2 * (I = b.heap[++b.heap_len] = ct < 2 ? ++ct : 0)] = 1, b.depth[I] = 0, b.opt_len--, Z && (b.static_len -= G[2 * I + 1]);
          for (E.max_code = ct, F = b.heap_len >> 1; 1 <= F; F--) dt(b, W, F);
          for (I = X; F = b.heap[1], b.heap[1] = b.heap[b.heap_len--], dt(b, W, 1), j = b.heap[1], b.heap[--b.heap_max] = F, b.heap[--b.heap_max] = j, W[2 * I] = W[2 * F] + W[2 * j], b.depth[I] = (b.depth[F] >= b.depth[j] ? b.depth[F] : b.depth[j]) + 1, W[2 * F + 1] = W[2 * j + 1] = I, b.heap[1] = I++, dt(b, W, 1), 2 <= b.heap_len; ) ;
          b.heap[--b.heap_max] = b.heap[1], (function(it, It) {
            var ze, Bt, Me, ft, sn, Kn, Zt = It.dyn_tree, ds = It.max_code, To = It.stat_desc.static_tree, Do = It.stat_desc.has_stree, Ao = It.stat_desc.extra_bits, fs = It.stat_desc.extra_base, Ue = It.stat_desc.max_length, on = 0;
            for (ft = 0; ft <= _; ft++) it.bl_count[ft] = 0;
            for (Zt[2 * it.heap[it.heap_max] + 1] = 0, ze = it.heap_max + 1; ze < g; ze++) Ue < (ft = Zt[2 * Zt[2 * (Bt = it.heap[ze]) + 1] + 1] + 1) && (ft = Ue, on++), Zt[2 * Bt + 1] = ft, ds < Bt || (it.bl_count[ft]++, sn = 0, fs <= Bt && (sn = Ao[Bt - fs]), Kn = Zt[2 * Bt], it.opt_len += Kn * (ft + sn), Do && (it.static_len += Kn * (To[2 * Bt + 1] + sn)));
            if (on !== 0) {
              do {
                for (ft = Ue - 1; it.bl_count[ft] === 0; ) ft--;
                it.bl_count[ft]--, it.bl_count[ft + 1] += 2, it.bl_count[Ue]--, on -= 2;
              } while (0 < on);
              for (ft = Ue; ft !== 0; ft--) for (Bt = it.bl_count[ft]; Bt !== 0; ) ds < (Me = it.heap[--ze]) || (Zt[2 * Me + 1] !== ft && (it.opt_len += (ft - Zt[2 * Me + 1]) * Zt[2 * Me], Zt[2 * Me + 1] = ft), Bt--);
            }
          })(b, E), vt(W, ct, b.bl_count);
        }
        function f(b, E, F) {
          var j, I, W = -1, G = E[1], Z = 0, X = 7, ct = 4;
          for (G === 0 && (X = 138, ct = 3), E[2 * (F + 1) + 1] = 65535, j = 0; j <= F; j++) I = G, G = E[2 * (j + 1) + 1], ++Z < X && I === G || (Z < ct ? b.bl_tree[2 * I] += Z : I !== 0 ? (I !== W && b.bl_tree[2 * I]++, b.bl_tree[2 * A]++) : Z <= 10 ? b.bl_tree[2 * D]++ : b.bl_tree[2 * P]++, W = I, ct = (Z = 0) === G ? (X = 138, 3) : I === G ? (X = 6, 3) : (X = 7, 4));
        }
        function B(b, E, F) {
          var j, I, W = -1, G = E[1], Z = 0, X = 7, ct = 4;
          for (G === 0 && (X = 138, ct = 3), j = 0; j <= F; j++) if (I = G, G = E[2 * (j + 1) + 1], !(++Z < X && I === G)) {
            if (Z < ct) for (; Y(b, I, b.bl_tree), --Z != 0; ) ;
            else I !== 0 ? (I !== W && (Y(b, I, b.bl_tree), Z--), Y(b, A, b.bl_tree), q(b, Z - 3, 2)) : Z <= 10 ? (Y(b, D, b.bl_tree), q(b, Z - 3, 3)) : (Y(b, P, b.bl_tree), q(b, Z - 11, 7));
            W = I, ct = (Z = 0) === G ? (X = 138, 3) : I === G ? (X = 6, 3) : (X = 7, 4);
          }
        }
        c(H);
        var N = !1;
        function v(b, E, F, j) {
          q(b, (h << 1) + (j ? 1 : 0), 3), (function(I, W, G, Z) {
            ot(I), J(I, G), J(I, ~G), i.arraySet(I.pending_buf, I.window, W, G, I.pending), I.pending += G;
          })(b, E, F);
        }
        s._tr_init = function(b) {
          N || ((function() {
            var E, F, j, I, W, G = new Array(_ + 1);
            for (I = j = 0; I < l - 1; I++) for (U[I] = j, E = 0; E < 1 << x[I]; E++) m[j++] = I;
            for (m[j - 1] = I, I = W = 0; I < 16; I++) for (H[I] = W, E = 0; E < 1 << O[I]; E++) z[W++] = I;
            for (W >>= 7; I < u; I++) for (H[I] = W << 7, E = 0; E < 1 << O[I] - 7; E++) z[256 + W++] = I;
            for (F = 0; F <= _; F++) G[F] = 0;
            for (E = 0; E <= 143; ) V[2 * E + 1] = 8, E++, G[8]++;
            for (; E <= 255; ) V[2 * E + 1] = 9, E++, G[9]++;
            for (; E <= 279; ) V[2 * E + 1] = 7, E++, G[7]++;
            for (; E <= 287; ) V[2 * E + 1] = 8, E++, G[8]++;
            for (vt(V, p + 1, G), E = 0; E < u; E++) S[2 * E + 1] = 5, S[2 * E] = ht(E, 5);
            et = new Q(V, x, d + 1, p, _), $ = new Q(S, O, 0, u, _), nt = new Q(new Array(0), T, 0, w, k);
          })(), N = !0), b.l_desc = new R(b.dyn_ltree, et), b.d_desc = new R(b.dyn_dtree, $), b.bl_desc = new R(b.bl_tree, nt), b.bi_buf = 0, b.bi_valid = 0, st(b);
        }, s._tr_stored_block = v, s._tr_flush_block = function(b, E, F, j) {
          var I, W, G = 0;
          0 < b.level ? (b.strm.data_type === 2 && (b.strm.data_type = (function(Z) {
            var X, ct = 4093624447;
            for (X = 0; X <= 31; X++, ct >>>= 1) if (1 & ct && Z.dyn_ltree[2 * X] !== 0) return o;
            if (Z.dyn_ltree[18] !== 0 || Z.dyn_ltree[20] !== 0 || Z.dyn_ltree[26] !== 0) return a;
            for (X = 32; X < d; X++) if (Z.dyn_ltree[2 * X] !== 0) return a;
            return o;
          })(b)), zt(b, b.l_desc), zt(b, b.d_desc), G = (function(Z) {
            var X;
            for (f(Z, Z.dyn_ltree, Z.l_desc.max_code), f(Z, Z.dyn_dtree, Z.d_desc.max_code), zt(Z, Z.bl_desc), X = w - 1; 3 <= X && Z.bl_tree[2 * M[X] + 1] === 0; X--) ;
            return Z.opt_len += 3 * (X + 1) + 5 + 5 + 4, X;
          })(b), I = b.opt_len + 3 + 7 >>> 3, (W = b.static_len + 3 + 7 >>> 3) <= I && (I = W)) : I = W = F + 5, F + 4 <= I && E !== -1 ? v(b, E, F, j) : b.strategy === 4 || W === I ? (q(b, 2 + (j ? 1 : 0), 3), Pt(b, V, S)) : (q(b, 4 + (j ? 1 : 0), 3), (function(Z, X, ct, it) {
            var It;
            for (q(Z, X - 257, 5), q(Z, ct - 1, 5), q(Z, it - 4, 4), It = 0; It < it; It++) q(Z, Z.bl_tree[2 * M[It] + 1], 3);
            B(Z, Z.dyn_ltree, X - 1), B(Z, Z.dyn_dtree, ct - 1);
          })(b, b.l_desc.max_code + 1, b.d_desc.max_code + 1, G + 1), Pt(b, b.dyn_ltree, b.dyn_dtree)), st(b), j && ot(b);
        }, s._tr_tally = function(b, E, F) {
          return b.pending_buf[b.d_buf + 2 * b.last_lit] = E >>> 8 & 255, b.pending_buf[b.d_buf + 2 * b.last_lit + 1] = 255 & E, b.pending_buf[b.l_buf + b.last_lit] = 255 & F, b.last_lit++, E === 0 ? b.dyn_ltree[2 * F]++ : (b.matches++, E--, b.dyn_ltree[2 * (m[F] + d + 1)]++, b.dyn_dtree[2 * L(E)]++), b.last_lit === b.lit_bufsize - 1;
        }, s._tr_align = function(b) {
          q(b, 2, 3), Y(b, C, V), (function(E) {
            E.bi_valid === 16 ? (J(E, E.bi_buf), E.bi_buf = 0, E.bi_valid = 0) : 8 <= E.bi_valid && (E.pending_buf[E.pending++] = 255 & E.bi_buf, E.bi_buf >>= 8, E.bi_valid -= 8);
          })(b);
        };
      }, { "../utils/common": 41 }], 53: [function(e, r, s) {
        r.exports = function() {
          this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
        };
      }, {}], 54: [function(e, r, s) {
        (function(i) {
          (function(o, a) {
            if (!o.setImmediate) {
              var c, h, l, d, p = 1, u = {}, w = !1, g = o.document, _ = Object.getPrototypeOf && Object.getPrototypeOf(o);
              _ = _ && _.setTimeout ? _ : o, c = {}.toString.call(o.process) === "[object process]" ? function(A) {
                process.nextTick(function() {
                  k(A);
                });
              } : (function() {
                if (o.postMessage && !o.importScripts) {
                  var A = !0, D = o.onmessage;
                  return o.onmessage = function() {
                    A = !1;
                  }, o.postMessage("", "*"), o.onmessage = D, A;
                }
              })() ? (d = "setImmediate$" + Math.random() + "$", o.addEventListener ? o.addEventListener("message", C, !1) : o.attachEvent("onmessage", C), function(A) {
                o.postMessage(d + A, "*");
              }) : o.MessageChannel ? ((l = new MessageChannel()).port1.onmessage = function(A) {
                k(A.data);
              }, function(A) {
                l.port2.postMessage(A);
              }) : g && "onreadystatechange" in g.createElement("script") ? (h = g.documentElement, function(A) {
                var D = g.createElement("script");
                D.onreadystatechange = function() {
                  k(A), D.onreadystatechange = null, h.removeChild(D), D = null;
                }, h.appendChild(D);
              }) : function(A) {
                setTimeout(k, 0, A);
              }, _.setImmediate = function(A) {
                typeof A != "function" && (A = new Function("" + A));
                for (var D = new Array(arguments.length - 1), P = 0; P < D.length; P++) D[P] = arguments[P + 1];
                var x = { callback: A, args: D };
                return u[p] = x, c(p), p++;
              }, _.clearImmediate = y;
            }
            function y(A) {
              delete u[A];
            }
            function k(A) {
              if (w) setTimeout(k, 0, A);
              else {
                var D = u[A];
                if (D) {
                  w = !0;
                  try {
                    (function(P) {
                      var x = P.callback, O = P.args;
                      switch (O.length) {
                        case 0:
                          x();
                          break;
                        case 1:
                          x(O[0]);
                          break;
                        case 2:
                          x(O[0], O[1]);
                          break;
                        case 3:
                          x(O[0], O[1], O[2]);
                          break;
                        default:
                          x.apply(a, O);
                      }
                    })(D);
                  } finally {
                    y(A), w = !1;
                  }
                }
              }
            }
            function C(A) {
              A.source === o && typeof A.data == "string" && A.data.indexOf(d) === 0 && k(+A.data.slice(d.length));
            }
          })(typeof self > "u" ? i === void 0 ? this : i : self);
        }).call(this, typeof fn < "u" ? fn : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}] }, {}, [10])(10);
    });
  })(hr)), hr.exports;
}
var kh = bh();
const Eo = /* @__PURE__ */ _h(kh), Tr = "__ync_update__", Dr = "_worldnotes.yjs";
async function vh(n, t) {
  const e = new Eo(), r = await n.get(Tr);
  r && e.file(Dr, r);
  const s = await n.keys();
  for (const i of s) {
    if (i === Tr) continue;
    const o = await n.get(i);
    e.file(`${i}.md`, o ?? "");
  }
  return e.generateAsync({ type: "blob" });
}
async function Sh(n, t, e) {
  const r = e?.strategy ?? "overwrite", s = [], i = [], o = await Eo.loadAsync(t), a = o.file(Dr);
  if (a) {
    const c = await a.async("string");
    await n.set(Tr, c), s.push(Dr);
  }
  for (const [c, h] of Object.entries(o.files)) {
    if (h.dir || !c.endsWith(".md")) continue;
    const l = c.slice(0, -3);
    if (l === "") continue;
    if (r === "skip" && await n.get(l) !== null) {
      i.push(l);
      continue;
    }
    const d = await h.async("string");
    await n.set(l, d), s.push(l);
  }
  return { imported: s, skipped: i };
}
function Ah(n) {
  const { storage: t, onImportComplete: e, exportFilename: r, importStrategy: s } = n;
  let i = null, o = null, a = null;
  async function c() {
    const l = await vh(t), d = URL.createObjectURL(l), p = document.createElement("a");
    p.href = d, p.download = r ?? "worldnotes-export.zip", p.click(), URL.revokeObjectURL(d);
  }
  async function h() {
    const l = a?.files?.[0];
    l && (await Sh(t, l, { strategy: s }), await e());
  }
  return {
    name: "import-export",
    version: "1.0.0",
    kind: "ui",
    slots: ["wn-toolbar"],
    onMount(l) {
      i = document.createElement("button"), i.textContent = "Export", i.addEventListener("click", c), l.appendChild(i), o = document.createElement("button"), o.textContent = "Import", o.addEventListener("click", () => {
        a?.click();
      }), l.appendChild(o), a = document.createElement("input"), a.type = "file", a.accept = ".zip", a.style.display = "none", a.addEventListener("change", h), l.appendChild(a);
    },
    onDestroy() {
      i && (i.removeEventListener("click", c), i.remove(), i = null), o && (o.removeEventListener("click", () => {
        a?.click();
      }), o.remove(), o = null), a && (a.removeEventListener("change", h), a.remove(), a = null);
    }
  };
}
export {
  mh as EditorBuilder,
  Dh as EditorHistory,
  Th as IndexedDBAdapter,
  Oo as LocalStorageAdapter,
  Uu as PermissionError,
  jo as blockquotePlugin,
  Po as boldPlugin,
  Eh as createEditor,
  Ah as createImportExportPlugin,
  gh as createNotificationSystem,
  Cu as createYDocState,
  ra as defaultPlugins,
  vh as exportWorld,
  Uo as headingsPlugin,
  $o as hrPlugin,
  Sh as importWorld,
  Fo as inlineCodePlugin,
  Bo as italicPlugin,
  Ho as linkPlugin,
  ih as loadYDoc,
  Ch as remoteCursorsPlugin,
  xh as renderDocumentToHTML,
  mo as renderInlineHTML,
  Nu as renderLineToHTML,
  sh as saveYDoc,
  cs as scanInline,
  Zo as strikethroughPlugin,
  Lu as tokenizeDocument,
  Ou as tokenizeLine,
  zo as wikiLinkPlugin
};

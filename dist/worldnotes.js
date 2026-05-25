const Ao = "worldnotes";
class To {
  constructor(t = Ao) {
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
function Jn(n) {
  const t = n.indexOf("|"), e = (t === -1 ? n : n.slice(0, t)).trim(), r = t === -1 ? dr(e) : n.slice(t + 1).trim();
  return { page: e, display: r || dr(e) };
}
function Io(n, t) {
  const r = n.replace(/^\?/, "").split("&").filter(Boolean).filter((o) => {
    const [a = ""] = o.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) !== "path";
  }), s = t.map((o) => encodeURIComponent(o)).join("/");
  return `?${[...r, `path=${s}`].join("&")}`;
}
function Oo(n) {
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
function Lo(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const Ro = {
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
    const { page: e, display: r } = Jn(n.groups[0] ?? ""), s = document.createElement("span");
    return s.className = "wn-wiki-link", s.dataset.page = e, s.dataset.raw = n.raw, s.textContent = r, s;
  },
  renderToHTML(n, t) {
    const { page: e, display: r } = Jn(n.groups[0] ?? "");
    return `<span class="wn-wiki-link" data-page="${ps(e)}" data-raw="${ps(n.raw)}">${Lo(r)}</span>`;
  },
  onNavigate(n, t) {
    const { page: e } = Jn(n.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function zo(n) {
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
  return `<span class="${e}"><span class="wn-punct">${zo(t)}</span><span class="${e}-text">${i}</span></span>`;
}
const No = {
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
function Tr(n, t, e) {
  const r = document.createElement("span");
  r.className = n;
  const s = (i) => {
    const o = document.createElement("span");
    return o.className = "wn-punct", o.textContent = i, o;
  };
  return r.appendChild(s(t)), r.appendChild(document.createTextNode(e)), r.appendChild(s(t)), r;
}
function Ks(n, t, e) {
  const r = fr(t), s = fr(e);
  return `<span class="${n}"><span class="wn-punct">${r}</span>${s}<span class="wn-punct">${r}</span></span>`;
}
const Mo = {
  name: "bold",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(n, t) {
    return Tr("wn-bold", "**", n.groups[0] ?? "");
  },
  renderToHTML(n, t) {
    return Ks("wn-bold", "**", n.groups[0] ?? "");
  }
}, Uo = {
  name: "italic",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(n, t) {
    return Tr("wn-italic", "*", n.groups[0] ?? "");
  },
  renderToHTML(n, t) {
    return Ks("wn-italic", "*", n.groups[0] ?? "");
  }
}, Bo = {
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
}, Po = {
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
}, Fo = {
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
const jo = {
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
function $o(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Ho(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const Wo = {
  name: "strikethrough",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "strikethrough", pattern: /~~([^~]+)~~/ }],
  render(n, t) {
    const e = Tr("wn-strikethrough", "~~", n.groups[0] ?? "");
    return e.dataset.raw = n.raw, e;
  },
  renderToHTML(n, t) {
    const e = Ho(n.groups[0] ?? "");
    return `<span class="wn-strikethrough" data-raw="${$o(n.raw)}"><span class="wn-punct">~~</span>${e}<span class="wn-punct">~~</span></span>`;
  }
}, Vo = /^(\s*)([-*+])\s(.*)$/;
function Ir(n) {
  const t = n.match(Vo);
  return t ? {
    indent: t[1] ?? "",
    marker: t[2] ?? "-",
    content: t[3] ?? ""
  } : null;
}
function Zo(n) {
  return "  " + n;
}
function Yo(n) {
  return n.startsWith("  ") ? n.slice(2) : null;
}
function qs(n) {
  if (n.nodeType === Node.TEXT_NODE)
    return n.length;
  if (n instanceof HTMLElement) {
    if (n.dataset.raw !== void 0)
      return n.dataset.raw.length;
    let t = 0;
    return n.childNodes.forEach((e) => {
      t += qs(e);
    }), t;
  }
  return 0;
}
function Fe(n) {
  return qs(n);
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
function Ft(n) {
  const t = window.getSelection();
  if (!t || !t.rangeCount) return 0;
  const e = t.getRangeAt(0), r = e.startContainer;
  let s = r;
  for (; s && !(s instanceof HTMLElement && s.dataset.line !== void 0); )
    s = s.parentNode;
  if (!s || !(s instanceof HTMLElement)) {
    let f = r.previousSibling;
    for (; f && !(f instanceof HTMLElement && f.dataset.line !== void 0); )
      f = f.previousSibling;
    if (f instanceof HTMLElement && f.dataset.line !== void 0) {
      const u = parseInt(f.dataset.line ?? "0", 10);
      return ms(n, u) + Fe(f) + 1;
    }
    return 0;
  }
  const i = parseInt(s.dataset.line ?? "0", 10), o = ms(n, i);
  let a = 0, c = !1;
  function d(f) {
    if (!c) {
      if (f.nodeType === Node.TEXT_NODE) {
        const u = f.length;
        if (f === r) {
          a += Math.min(e.startOffset, u), c = !0;
          return;
        }
        a += u;
        return;
      }
      if (f instanceof HTMLElement && f.dataset.raw !== void 0) {
        const u = f.dataset.raw.length;
        if (f === r || f.contains(r)) {
          let p = function(g) {
            if (!w) {
              if (g.nodeType === Node.TEXT_NODE) {
                const _ = g.length;
                if (g === r) {
                  l += Math.min(e.startOffset, _), w = !0;
                  return;
                }
                l += _;
                return;
              }
              g.childNodes.forEach(p);
            }
          }, l = 0, w = !1;
          f.childNodes.forEach(p), a += Math.min(l, u), c = !0;
          return;
        }
        a += u;
        return;
      }
      f.childNodes.forEach(d);
    }
  }
  return d(s), o + a;
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
      const a = Go(i, e);
      if (a) {
        const c = window.getSelection();
        if (!c) return;
        const d = document.createRange();
        d.setStart(a.node, a.offset), d.collapse(!0), c.removeAllRanges(), c.addRange(d);
      } else {
        const c = window.getSelection();
        if (c) {
          const d = document.createRange();
          d.setStart(i, 0), d.collapse(!0), c.removeAllRanges(), c.addRange(d);
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
    const o = document.createRange(), a = Ko(s);
    a ? o.setStart(a, a.length) : o.selectNodeContents(s), o.collapse(!0), i.removeAllRanges(), i.addRange(o);
  }
}
function Go(n, t) {
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
            const d = o(c);
            if (d) return d;
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
function Ko(n) {
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
function Xn(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function qo(n, t) {
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
const Jo = {
  name: "list-item",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "list-item", pattern: /^(\s*)([-*+])\s(.*)$/ }],
  render(n, t) {
    return qo(n, t);
  },
  renderToHTML(n, t) {
    const e = n.groups[0] ?? "", r = n.groups[1] ?? "-", s = n.groups[2] ?? "", i = t.renderInline(s);
    let o = `<span class="wn-list-item" data-raw="${Xn(n.raw)}">`;
    return e && (o += `<span class="wn-list-item-indent" aria-hidden="true">${Xn(e)}</span>`), o += `<span class="wn-list-item-marker" aria-hidden="true">${Xn(r)} </span>`, o += `<span class="wn-list-item-content">${i}</span>`, o += "</span>", o;
  },
  onKeydown(n, t) {
    if (n.key === "Tab" && !n.shiftKey)
      return Xo(t);
    if (n.key === "Tab" && n.shiftKey)
      return Qo(t);
    if (n.key === "Enter")
      return ta(t);
  }
};
function Xo(n) {
  const t = n.getDoc(), e = n.getCurrentPage(), s = t.getMap("pages").get(e);
  if (!s) return !1;
  const i = window.getSelection();
  if (!i || !i.rangeCount) return !1;
  let a = i.getRangeAt(0).startContainer;
  for (; a && !(a instanceof HTMLElement && a.dataset.line !== void 0); )
    a = a.parentNode;
  if (!a || !(a instanceof HTMLElement)) return !1;
  const c = parseInt(a.dataset.line ?? "0", 10), d = a.parentElement;
  if (!d) return !1;
  const f = Ft(d), u = t.transact(() => {
    const p = s.toString(), l = p.split(`
`), w = l[c] ?? "";
    if (!Ir(w)) return null;
    const _ = Zo(w);
    l[c] = _;
    const y = l.join(`
`);
    return s.delete(0, p.length), s.insert(0, y), f + 2;
  });
  return u === null ? !1 : { cursorOffset: u };
}
function Qo(n) {
  const t = n.getDoc(), e = n.getCurrentPage(), s = t.getMap("pages").get(e);
  if (!s) return !1;
  const i = window.getSelection();
  if (!i || !i.rangeCount) return !1;
  let a = i.getRangeAt(0).startContainer;
  for (; a && !(a instanceof HTMLElement && a.dataset.line !== void 0); )
    a = a.parentNode;
  if (!a || !(a instanceof HTMLElement)) return !1;
  const c = parseInt(a.dataset.line ?? "0", 10), d = a.parentElement;
  if (!d) return !1;
  const f = Ft(d), u = t.transact(() => {
    const p = s.toString(), l = p.split(`
`), w = l[c] ?? "";
    if (!Ir(w)) return null;
    const _ = Yo(w);
    if (_ === null) return f;
    l[c] = _;
    const y = l.join(`
`);
    s.delete(0, p.length), s.insert(0, y);
    const v = pr(p, c);
    return Math.max(v, f - 2);
  });
  return u === null ? !1 : { cursorOffset: u };
}
function ta(n) {
  const t = n.getDoc(), e = n.getCurrentPage(), s = t.getMap("pages").get(e);
  if (!s) return !1;
  const i = window.getSelection();
  if (!i || !i.rangeCount) return !1;
  let a = i.getRangeAt(0).startContainer;
  for (; a && !(a instanceof HTMLElement && a.dataset.line !== void 0); )
    a = a.parentNode;
  if (!a || !(a instanceof HTMLElement)) return !1;
  const c = parseInt(a.dataset.line ?? "0", 10), d = a.parentElement;
  if (!d) return !1;
  const f = Ft(d), u = t.transact(() => {
    const p = s.toString(), l = p.split(`
`), w = l[c] ?? "", g = Ir(w);
    if (!g) return null;
    const _ = pr(p, c), y = f - _, v = Math.max(0, Math.min(y, w.length)), x = g.indent + g.marker + " ";
    if (g.content.trim() === "") {
      l.splice(c, 1, "");
      const S = l.join(`
`);
      return s.delete(0, p.length), s.insert(0, S), _;
    }
    const A = Math.max(0, v - x.length), C = g.content.slice(0, A), D = g.content.slice(A), R = x + C, I = x + D;
    l.splice(c, 1, R, I);
    const U = l.join(`
`);
    return s.delete(0, p.length), s.insert(0, U), pr(U, c + 1) + I.length;
  });
  return u === null ? !1 : { cursorOffset: u };
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
const ea = [
  No,
  // line-level — must come before inline plugins
  Fo,
  // line-level
  Po,
  // line-level
  Jo,
  // line-level
  Ro,
  // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  jo,
  // inline — [text](url) after [[...]]
  Mo,
  // inline — ** before * to avoid partial match
  Uo,
  // inline
  Wo,
  // inline — ~~text~~ (no conflict with * patterns)
  Bo
  // inline
], na = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
class ra {
  constructor() {
    this.contentPlugins = /* @__PURE__ */ new Map(), this.uiPlugins = /* @__PURE__ */ new Map(), this.storagePlugins = /* @__PURE__ */ new Map(), this.tokenTypeOwners = /* @__PURE__ */ new Map(), this.slotAssignments = /* @__PURE__ */ new Map();
  }
  // ── Validation ──────────────────────────────────────────────────────────────
  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  validateVersion(t, e) {
    if (!na.test(e))
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
const At = () => /* @__PURE__ */ new Map(), gr = (n) => {
  const t = At();
  return n.forEach((e, r) => {
    t.set(r, e);
  }), t;
}, Wt = (n, t, e) => {
  let r = n.get(t);
  return r === void 0 && n.set(t, r = e()), r;
}, sa = (n, t) => {
  const e = [];
  for (const [r, s] of n)
    e.push(t(s, r));
  return e;
}, ia = (n, t) => {
  for (const [e, r] of n)
    if (t(r, e))
      return !0;
  return !1;
}, te = () => /* @__PURE__ */ new Set(), Qn = (n) => n[n.length - 1], oa = (n, t) => {
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
}, aa = (n, t) => {
  const e = new Array(n);
  for (let r = 0; r < n; r++)
    e[r] = t(r, e);
  return e;
}, xe = Array.isArray;
class Rr {
  constructor() {
    this._observers = At();
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  on(t, e) {
    return Wt(
      this._observers,
      /** @type {string} */
      t,
      te
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
    return Gt((this._observers.get(t) || At()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = At();
  }
}
class ca {
  constructor() {
    this._observers = At();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(t, e) {
    Wt(this._observers, t, te).add(e);
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
    return Gt((this._observers.get(t) || At()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = At();
  }
}
const Mt = Math.floor, mn = Math.abs, zr = (n, t) => n < t ? n : t, fe = (n, t) => n > t ? n : t, la = Math.pow, Js = (n) => n !== 0 ? n < 0 : 1 / n < 0, ws = 1, ys = 2, tr = 4, er = 8, je = 32, Yt = 64, Tt = 128, Nn = 31, mr = 63, ae = 127, ua = 2147483647, kn = Number.MAX_SAFE_INTEGER, _s = Number.MIN_SAFE_INTEGER, ha = Number.isInteger || ((n) => typeof n == "number" && isFinite(n) && Mt(n) === n), Xs = String.fromCharCode, da = (n) => n.toLowerCase(), fa = /^\s*/g, pa = (n) => n.replace(fa, ""), ga = /([A-Z])/g, bs = (n, t) => pa(n.replace(ga, (e) => `${t}${da(e)}`)), ma = (n) => {
  const t = unescape(encodeURIComponent(n)), e = t.length, r = new Uint8Array(e);
  for (let s = 0; s < e; s++)
    r[s] = /** @type {number} */
    t.codePointAt(s);
  return r;
}, $e = (
  /** @type {TextEncoder} */
  typeof TextEncoder < "u" ? new TextEncoder() : null
), wa = (n) => $e.encode(n), ya = $e ? wa : ma;
let Be = typeof TextDecoder > "u" ? null : new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 });
Be && Be.decode(new Uint8Array()).length === 1 && (Be = null);
const _a = (n, t) => aa(t, () => n).join("");
class Je {
  constructor() {
    this.cpos = 0, this.cbuf = new Uint8Array(100), this.bufs = [];
  }
}
const xt = () => new Je(), Nr = (n) => {
  let t = n.cpos;
  for (let e = 0; e < n.bufs.length; e++)
    t += n.bufs[e].length;
  return t;
}, ut = (n) => {
  const t = new Uint8Array(Nr(n));
  let e = 0;
  for (let r = 0; r < n.bufs.length; r++) {
    const s = n.bufs[r];
    t.set(s, e), e += s.length;
  }
  return t.set(new Uint8Array(n.cbuf.buffer, 0, n.cpos), e), t;
}, ba = (n, t) => {
  const e = n.cbuf.length;
  e - n.cpos < t && (n.bufs.push(new Uint8Array(n.cbuf.buffer, 0, n.cpos)), n.cbuf = new Uint8Array(fe(e, t) * 2), n.cpos = 0);
}, _t = (n, t) => {
  const e = n.cbuf.length;
  n.cpos === e && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(e * 2), n.cpos = 0), n.cbuf[n.cpos++] = t;
}, wr = _t, q = (n, t) => {
  for (; t > ae; )
    _t(n, Tt | ae & t), t = Mt(t / 128);
  _t(n, ae & t);
}, Mr = (n, t) => {
  const e = Js(t);
  for (e && (t = -t), _t(n, (t > mr ? Tt : 0) | (e ? Yt : 0) | mr & t), t = Mt(t / 64); t > 0; )
    _t(n, (t > ae ? Tt : 0) | ae & t), t = Mt(t / 128);
}, yr = new Uint8Array(3e4), ka = yr.length / 3, va = (n, t) => {
  if (t.length < ka) {
    const e = $e.encodeInto(t, yr).written || 0;
    q(n, e);
    for (let r = 0; r < e; r++)
      _t(n, yr[r]);
  } else
    pt(n, ya(t));
}, Sa = (n, t) => {
  const e = unescape(encodeURIComponent(t)), r = e.length;
  q(n, r);
  for (let s = 0; s < r; s++)
    _t(
      n,
      /** @type {number} */
      e.codePointAt(s)
    );
}, ce = $e && /** @type {any} */
$e.encodeInto ? va : Sa, Mn = (n, t) => {
  const e = n.cbuf.length, r = n.cpos, s = zr(e - r, t.length), i = t.length - s;
  n.cbuf.set(t.subarray(0, s), r), n.cpos += s, i > 0 && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(fe(e * 2, i)), n.cbuf.set(t.subarray(s)), n.cpos = i);
}, pt = (n, t) => {
  q(n, t.byteLength), Mn(n, t);
}, Ur = (n, t) => {
  ba(n, t);
  const e = new DataView(n.cbuf.buffer, n.cpos, t);
  return n.cpos += t, e;
}, xa = (n, t) => Ur(n, 4).setFloat32(0, t, !1), Ca = (n, t) => Ur(n, 8).setFloat64(0, t, !1), Ea = (n, t) => (
  /** @type {any} */
  Ur(n, 8).setBigInt64(0, t, !1)
), ks = new DataView(new ArrayBuffer(4)), Da = (n) => (ks.setFloat32(0, n), ks.getFloat32(0) === n), He = (n, t) => {
  switch (typeof t) {
    case "string":
      _t(n, 119), ce(n, t);
      break;
    case "number":
      ha(t) && mn(t) <= ua ? (_t(n, 125), Mr(n, t)) : Da(t) ? (_t(n, 124), xa(n, t)) : (_t(n, 123), Ca(n, t));
      break;
    case "bigint":
      _t(n, 122), Ea(n, t);
      break;
    case "object":
      if (t === null)
        _t(n, 126);
      else if (xe(t)) {
        _t(n, 117), q(n, t.length);
        for (let e = 0; e < t.length; e++)
          He(n, t[e]);
      } else if (t instanceof Uint8Array)
        _t(n, 116), pt(n, t);
      else {
        _t(n, 118);
        const e = Object.keys(t);
        q(n, e.length);
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
class vs extends Je {
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
    this.s === t ? this.count++ : (this.count > 0 && q(this, this.count - 1), this.count = 1, this.w(this, t), this.s = t);
  }
}
const Ss = (n) => {
  n.count > 0 && (Mr(n.encoder, n.count === 1 ? n.s : -n.s), n.count > 1 && q(n.encoder, n.count - 2));
};
class wn {
  constructor() {
    this.encoder = new Je(), this.s = 0, this.count = 0;
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
    Mr(n.encoder, t), n.count > 1 && q(n.encoder, n.count - 2);
  }
};
class nr {
  constructor() {
    this.encoder = new Je(), this.s = 0, this.count = 0, this.diff = 0;
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
class Aa {
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
    const t = new Je();
    return this.sarr.push(this.s), this.s = "", ce(t, this.sarr.join("")), Mn(t, this.lensE.toUint8Array()), ut(t);
  }
}
const jt = (n) => new Error(n), Nt = () => {
  throw jt("Method unimplemented");
}, Rt = () => {
  throw jt("Unexpected case");
}, Qs = jt("Unexpected end of array"), ti = jt("Integer out of Range");
class Un {
  /**
   * @param {Uint8Array<Buf>} uint8Array Binary data to decode
   */
  constructor(t) {
    this.arr = t, this.pos = 0;
  }
}
const re = (n) => new Un(n), Ta = (n) => n.pos !== n.arr.length, Ia = (n, t) => {
  const e = new Uint8Array(n.arr.buffer, n.pos + n.arr.byteOffset, t);
  return n.pos += t, e;
}, St = (n) => Ia(n, tt(n)), Ce = (n) => n.arr[n.pos++], tt = (n) => {
  let t = 0, e = 1;
  const r = n.arr.length;
  for (; n.pos < r; ) {
    const s = n.arr[n.pos++];
    if (t = t + (s & ae) * e, e *= 128, s < Tt)
      return t;
    if (t > kn)
      throw ti;
  }
  throw Qs;
}, Br = (n) => {
  let t = n.arr[n.pos++], e = t & mr, r = 64;
  const s = (t & Yt) > 0 ? -1 : 1;
  if ((t & Tt) === 0)
    return s * e;
  const i = n.arr.length;
  for (; n.pos < i; ) {
    if (t = n.arr[n.pos++], e = e + (t & ae) * r, r *= 128, t < Tt)
      return s * e;
    if (e > kn)
      throw ti;
  }
  throw Qs;
}, Oa = (n) => {
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
}, La = (n) => (
  /** @type any */
  Be.decode(St(n))
), Qt = Be ? La : Oa, Pr = (n, t) => {
  const e = new DataView(n.arr.buffer, n.arr.byteOffset + n.pos, t);
  return n.pos += t, e;
}, Ra = (n) => Pr(n, 4).getFloat32(0, !1), za = (n) => Pr(n, 8).getFloat64(0, !1), Na = (n) => (
  /** @type {any} */
  Pr(n, 8).getBigInt64(0, !1)
), Ma = [
  (n) => {
  },
  // CASE 127: undefined
  (n) => null,
  // CASE 126: null
  Br,
  // CASE 125: integer
  Ra,
  // CASE 124: float32
  za,
  // CASE 123: float64
  Na,
  // CASE 122: bigint
  (n) => !1,
  // CASE 121: boolean (false)
  (n) => !0,
  // CASE 120: boolean (true)
  Qt,
  // CASE 119: string
  (n) => {
    const t = tt(n), e = {};
    for (let r = 0; r < t; r++) {
      const s = Qt(n);
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
], We = (n) => Ma[127 - Ce(n)](n);
class Cs extends Un {
  /**
   * @param {Uint8Array} uint8Array
   * @param {function(Decoder):T} reader
   */
  constructor(t, e) {
    super(t), this.reader = e, this.s = null, this.count = 0;
  }
  read() {
    return this.count === 0 && (this.s = this.reader(this), Ta(this) ? this.count = tt(this) + 1 : this.count = -1), this.count--, /** @type {T} */
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
      this.s = Br(this);
      const t = Js(this.s);
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
      const t = Br(this), e = t & 1;
      this.diff = Mt(t / 2), this.count = 1, e && (this.count = tt(this) + 2);
    }
    return this.s += this.diff, this.count--, this.s;
  }
}
class Ua {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    this.decoder = new yn(t), this.str = Qt(this.decoder), this.spos = 0;
  }
  /**
   * @return {string}
   */
  read() {
    const t = this.spos + this.decoder.read(), e = this.str.slice(this.spos, t);
    return this.spos = t, e;
  }
}
const Ba = crypto.getRandomValues.bind(crypto), ei = () => Ba(new Uint32Array(1))[0], Pa = "10000000-1000-4000-8000" + -1e11, Fa = () => Pa.replace(
  /[018]/g,
  /** @param {number} c */
  (n) => (n ^ ei() & 15 >> n / 4).toString(16)
), ee = Date.now, Es = (n) => (
  /** @type {Promise<T>} */
  new Promise(n)
);
Promise.all.bind(Promise);
const Ds = (n) => n === void 0 ? null : n;
class ja {
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
let ni = new ja(), Fr = !0;
try {
  typeof localStorage < "u" && localStorage && (ni = localStorage, Fr = !1);
} catch {
}
const ri = ni, $a = (n) => Fr || addEventListener(
  "storage",
  /** @type {any} */
  n
), Ha = (n) => Fr || removeEventListener(
  "storage",
  /** @type {any} */
  n
), Ve = /* @__PURE__ */ Symbol("Equality"), si = (n, t) => n === t || !!n?.[Ve]?.(t) || !1, Wa = (n) => typeof n == "object", Va = Object.assign, Za = Object.keys, Ya = (n, t) => {
  for (const e in n)
    t(n[e], e);
}, Ga = (n, t) => {
  const e = [];
  for (const r in n)
    e.push(t(n[r], r));
  return e;
}, vn = (n) => Za(n).length, Ka = (n) => {
  for (const t in n)
    return !1;
  return !0;
}, Xe = (n, t) => {
  for (const e in n)
    if (!t(n[e], e))
      return !1;
  return !0;
}, jr = (n, t) => Object.prototype.hasOwnProperty.call(n, t), qa = (n, t) => n === t || vn(n) === vn(t) && Xe(n, (e, r) => (e !== void 0 || jr(t, r)) && si(t[r], e)), Ja = Object.freeze, ii = (n) => {
  for (const t in n) {
    const e = n[t];
    (typeof e == "object" || typeof e == "function") && ii(n[t]);
  }
  return Ja(n);
}, $r = (n, t, e = 0) => {
  try {
    for (; e < n.length; e++)
      n[e](...t);
  } finally {
    e < n.length && $r(n, t, e + 1);
  }
}, Xa = (n) => n, _e = (n, t) => {
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
}, Qa = (n, t) => t.includes(n), ne = typeof process < "u" && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process < "u" ? process : 0) === "[object process]", oi = typeof window < "u" && typeof document < "u" && !ne;
let Pt;
const tc = () => {
  if (Pt === void 0)
    if (ne) {
      Pt = At();
      const n = process.argv;
      let t = null;
      for (let e = 0; e < n.length; e++) {
        const r = n[e];
        r[0] === "-" ? (t !== null && Pt.set(t, ""), t = r) : t !== null && (Pt.set(t, r), t = null);
      }
      t !== null && Pt.set(t, "");
    } else typeof location == "object" ? (Pt = At(), (location.search || "?").slice(1).split("&").forEach((n) => {
      if (n.length !== 0) {
        const [t, e] = n.split("=");
        Pt.set(`--${bs(t, "-")}`, e), Pt.set(`-${bs(t, "-")}`, e);
      }
    })) : Pt = At();
  return Pt;
}, _r = (n) => tc().has(n), Sn = (n) => Ds(ne ? process.env[n.toUpperCase().replaceAll("-", "_")] : ri.getItem(n)), ai = (n) => _r("--" + n) || Sn(n) !== null, ec = ai("production"), nc = ne && Qa(process.env.FORCE_COLOR, ["true", "1", "2"]), rc = nc || !_r("--no-colors") && // @todo deprecate --no-colors
!ai("no-color") && (!ne || process.stdout.isTTY) && (!ne || _r("--color") || Sn("COLORTERM") !== null || (Sn("TERM") || "").includes("color")), ci = (n) => new Uint8Array(n), sc = (n, t, e) => new Uint8Array(n, t, e), ic = (n) => new Uint8Array(n), oc = (n) => {
  let t = "";
  for (let e = 0; e < n.byteLength; e++)
    t += Xs(n[e]);
  return btoa(t);
}, ac = (n) => Buffer.from(n.buffer, n.byteOffset, n.byteLength).toString("base64"), cc = (n) => {
  const t = atob(n), e = ci(t.length);
  for (let r = 0; r < t.length; r++)
    e[r] = t.charCodeAt(r);
  return e;
}, lc = (n) => {
  const t = Buffer.from(n, "base64");
  return sc(t.buffer, t.byteOffset, t.byteLength);
}, uc = oi ? oc : ac, hc = oi ? cc : lc, dc = (n) => {
  const t = ci(n.byteLength);
  return t.set(n), t;
};
class fc {
  /**
   * @param {L} left
   * @param {R} right
   */
  constructor(t, e) {
    this.left = t, this.right = e;
  }
}
const Zt = (n, t) => new fc(n, t), As = (n) => n.next() >= 0.5, sr = (n, t, e) => Mt(n.next() * (e + 1 - t) + t), li = (n, t, e) => Mt(n.next() * (e + 1 - t) + t), Hr = (n, t, e) => li(n, t, e), pc = (n) => Xs(Hr(n, 97, 122)), gc = (n, t = 0, e = 20) => {
  const r = Hr(n, t, e);
  let s = "";
  for (let i = 0; i < r; i++)
    s += pc(n);
  return s;
}, ir = (n, t) => t[Hr(n, 0, t.length - 1)], mc = /* @__PURE__ */ Symbol("0schema");
class wc {
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
      t.push(_a(" ", (this._rerrs.length - e) * 2) + `${r.path != null ? `[${r.path}] ` : ""}${r.has} doesn't match ${r.expected}. ${r.message}`);
    }
    return t.join(`
`);
  }
}
const br = (n, t) => n === t ? !0 : n == null || t == null || n.constructor !== t.constructor ? !1 : n[Ve] ? si(n, t) : xe(n) ? Or(
  n,
  (e) => Lr(t, (r) => br(e, r))
) : Wa(n) ? Xe(
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
  [mc]() {
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
    Nt();
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
    return new di(
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
    return Ts(t, this), /** @type {any} */
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
    return Ts(t, this), t;
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
class Bn extends Et {
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
const Pn = (...n) => new Bn(n), ui = gt(Bn), yc = (
  /** @type {any} */
  RegExp.escape || /** @type {(str:string) => string} */
  ((n) => n.replace(/[().|&,$^[\]]/g, (t) => "\\" + t))
), hi = (n) => {
  if (Ee.check(n))
    return [yc(n)];
  if (ui.check(n))
    return (
      /** @type {Array<string|number>} */
      n.shape.map((t) => t + "")
    );
  if (ki.check(n))
    return ["[+-]?\\d+.?\\d*"];
  if (vi.check(n))
    return [".*"];
  if (xn.check(n))
    return n.shape.map(hi).flat(1);
  Rt();
};
class _c extends Et {
  /**
   * @param {T} shape
   */
  constructor(t) {
    super(), this.shape = t, this._r = new RegExp("^" + t.map(hi).map((e) => `(${e.join("|")})`).join("") + "$");
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
gt(_c);
const bc = /* @__PURE__ */ Symbol("optional");
class di extends Et {
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
  get [bc]() {
    return !0;
  }
}
const kc = gt(di);
class vc extends Et {
  /**
   * @param {any} _o
   * @param {ValidationError} [err]
   * @return {_o is never}
   */
  check(t, e) {
    return e?.extend(null, "never", typeof t), !1;
  }
}
gt(vc);
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
    return t == null ? (e?.extend(null, "object", "null"), !1) : Xe(this.shape, (r, s) => {
      const i = this._isPartial && !jr(t, s) || r.check(t[s], e);
      return !i && e?.extend(s.toString(), r.toString(), typeof t[s], "Object property does not match"), i;
    });
  }
}
const Sc = (n) => (
  /** @type {any} */
  new Fn(n)
), xc = gt(Fn), Cc = kt((n) => n != null && (n.constructor === Object || n.constructor == null));
class fi extends Et {
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
    return t != null && Xe(t, (r, s) => {
      const i = this.shape.keys.check(s, e);
      return !i && e?.extend(s + "", "Record", typeof t, i ? "Key doesn't match schema" : "Value doesn't match value"), i && this.shape.values.check(r, e);
    });
  }
}
const pi = (n, t) => new fi(n, t), Ec = gt(fi);
class gi extends Et {
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
    return t != null && Xe(this.shape, (r, s) => {
      const i = (
        /** @type {Schema<any>} */
        r.check(t[s], e)
      );
      return !i && e?.extend(s.toString(), "Tuple", typeof r), i;
    });
  }
}
const Dc = (...n) => new gi(n);
gt(gi);
class mi extends Et {
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
const wi = (...n) => new mi(n), Ac = gt(mi), Tc = kt((n) => xe(n));
class yi extends Et {
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
const Ic = (n, t = null) => new yi(n, t);
gt(yi);
const Oc = Ic(Et);
class Lc extends Et {
  /**
   * @param {Args} args
   */
  constructor(t) {
    super(), this.len = t.length - 1, this.args = Dc(...t.slice(-1)), this.res = t[this.len];
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
const Rc = gt(Lc), zc = kt((n) => typeof n == "function");
class Nc extends Et {
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
gt(Nc, (n) => n.shape.length > 0);
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
), _i = () => !0, Cn = kt(_i), Mc = (
  /** @type {Schema<Schema<any>>} */
  gt(Vr, (n) => n.shape === _i)
), Yr = kt((n) => typeof n == "bigint"), Uc = (
  /** @type {Schema<Schema<BigInt>>} */
  kt((n) => n === Yr)
), bi = kt((n) => typeof n == "symbol");
kt((n) => n === bi);
const be = kt((n) => typeof n == "number"), ki = (
  /** @type {Schema<Schema<number>>} */
  kt((n) => n === be)
), Ee = kt((n) => typeof n == "string"), vi = (
  /** @type {Schema<Schema<string>>} */
  kt((n) => n === Ee)
), jn = kt((n) => typeof n == "boolean"), Bc = (
  /** @type {Schema<Schema<Boolean>>} */
  kt((n) => n === jn)
), Si = Pn(void 0);
gt(Bn, (n) => n.shape.length === 1 && n.shape[0] === void 0);
Pn(void 0);
const $n = Pn(null), Pc = (
  /** @type {Schema<Schema<null>>} */
  gt(Bn, (n) => n.shape.length === 1 && n.shape[0] === null)
);
gt(Uint8Array);
gt(Wr, (n) => n.shape === Uint8Array);
const Fc = Oe(be, Ee, $n, Si, Yr, jn, bi);
(() => {
  const n = (
    /** @type {$Array<$any>} */
    wi(Cn)
  ), t = (
    /** @type {$Record<$string,$any>} */
    pi(Ee, Cn)
  ), e = Oe(be, Ee, $n, jn, n, t);
  return n.shape = e, t.shape.values = e, e;
})();
const Ze = (n) => {
  if (Oc.check(n))
    return (
      /** @type {any} */
      n
    );
  if (Cc.check(n)) {
    const t = {};
    for (const e in n)
      t[e] = Ze(n[e]);
    return (
      /** @type {any} */
      Sc(t)
    );
  } else {
    if (Tc.check(n))
      return (
        /** @type {any} */
        Oe(...n.map(Ze))
      );
    if (Fc.check(n))
      return (
        /** @type {any} */
        Pn(n)
      );
    if (zc.check(n))
      return (
        /** @type {any} */
        gt(
          /** @type {any} */
          n
        )
      );
  }
  Rt();
}, Ts = ec ? () => {
} : (n, t) => {
  const e = new wc();
  if (!t.check(n, e))
    throw jt(`Expected value to be of type ${t.constructor.name}.
${e.toString()}`);
};
class jc {
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
        throw jt("Unhandled pattern");
      }
    );
  }
}
const $c = (n) => new jc(
  /** @type {any} */
  n
), xi = (
  /** @type {any} */
  $c(
    /** @type {Schema<prng.PRNG>} */
    Cn
  ).if(ki, (n, t) => sr(t, _s, kn)).if(vi, (n, t) => gc(t)).if(Bc, (n, t) => As(t)).if(Uc, (n, t) => BigInt(sr(t, _s, kn))).if(xn, (n, t) => me(t, ir(t, n.shape))).if(xc, (n, t) => {
    const e = {};
    for (const r in n.shape) {
      let s = n.shape[r];
      if (kc.check(s)) {
        if (As(t))
          continue;
        s = s.shape;
      }
      e[r] = xi(s, t);
    }
    return e;
  }).if(Ac, (n, t) => {
    const e = [], r = li(t, 0, 42);
    for (let s = 0; s < r; s++)
      e.push(me(t, n.shape));
    return e;
  }).if(ui, (n, t) => ir(t, n.shape)).if(Pc, (n, t) => null).if(Rc, (n, t) => {
    const e = me(t, n.res);
    return () => e;
  }).if(Mc, (n, t) => me(t, ir(t, [
    be,
    Ee,
    $n,
    Si,
    Yr,
    jn,
    wi(be),
    pi(Oe("a", "b", "c"), be)
  ]))).if(Ec, (n, t) => {
    const e = {}, r = sr(t, 0, 3);
    for (let s = 0; s < r; s++) {
      const i = me(t, n.shape.keys), o = me(t, n.shape.values);
      e[i] = o;
    }
    return e;
  }).done()
), me = (n, t) => (
  /** @type {any} */
  xi(Ze(t), n)
), Hn = (
  /** @type {Document} */
  typeof document < "u" ? document : {}
);
kt((n) => n.nodeType === Yc);
typeof DOMParser < "u" && new DOMParser();
kt((n) => n.nodeType === Wc);
kt((n) => n.nodeType === Vc);
const Hc = (n) => sa(n, (t, e) => `${e}:${t};`).join(""), Wc = Hn.ELEMENT_NODE, Vc = Hn.TEXT_NODE, Zc = Hn.DOCUMENT_NODE, Yc = Hn.DOCUMENT_FRAGMENT_NODE;
kt((n) => n.nodeType === Zc);
const Kt = Symbol, Ci = Kt(), Ei = Kt(), Gc = Kt(), Kc = Kt(), qc = Kt(), Di = Kt(), Jc = Kt(), Gr = Kt(), Xc = Kt(), Qc = (n) => {
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
}, tl = {
  [Ci]: Zt("font-weight", "bold"),
  [Ei]: Zt("font-weight", "normal"),
  [Gc]: Zt("color", "blue"),
  [qc]: Zt("color", "green"),
  [Kc]: Zt("color", "grey"),
  [Di]: Zt("color", "red"),
  [Jc]: Zt("color", "purple"),
  [Gr]: Zt("color", "orange"),
  // not well supported in chrome when debugging node with inspector - TODO: deprecate
  [Xc]: Zt("color", "black")
}, el = (n) => {
  n.length === 1 && n[0]?.constructor === Function && (n = /** @type {Array<string|Symbol|Object|number>} */
  /** @type {[function]} */
  n[0]());
  const t = [], e = [], r = At();
  let s = [], i = 0;
  for (; i < n.length; i++) {
    const o = n[i], a = tl[o];
    if (a !== void 0)
      r.set(a.left, a.right);
    else {
      if (o === void 0)
        break;
      if (o.constructor === String || o.constructor === Number) {
        const c = Hc(r);
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
}, Ai = rc ? el : Qc, nl = (...n) => {
  console.log(...Ai(n)), Ii.forEach((t) => t.print(n));
}, Ti = (...n) => {
  console.warn(...Ai(n)), n.unshift(Gr), Ii.forEach((t) => t.print(n));
}, Ii = te(), Oi = (n) => ({
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this;
  },
  // @ts-ignore
  next: n
}), rl = (n, t) => Oi(() => {
  let e;
  do
    e = n.next();
  while (!e.done && !t(e.value));
  return e;
}), or = (n, t) => Oi(() => {
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
const De = (n, t, e) => t.clients.forEach((r, s) => {
  const i = (
    /** @type {Array<GC|Item>} */
    n.doc.store.clients.get(s)
  );
  if (i != null) {
    const o = i[i.length - 1], a = o.id.clock + o.length;
    for (let c = 0, d = r[c]; c < r.length && d.clock < a; d = r[++c])
      Hi(n, i, d.clock, d.len, e);
  }
}), sl = (n, t) => {
  let e = 0, r = n.length - 1;
  for (; e <= r; ) {
    const s = Mt((e + r) / 2), i = n[s], o = i.clock;
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
  return e !== void 0 && sl(e, t.clock) !== null;
}, Kr = (n) => {
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
          oa(i, n[o].clients.get(s) || []);
        t.clients.set(s, i);
      }
    });
  return Kr(t), t;
}, Ye = (n, t, e, r) => {
  Wt(n.clients, t, () => (
    /** @type {Array<DeleteItem>} */
    []
  )).push(new Wn(e, r));
}, il = () => new Le(), ol = (n) => {
  const t = il();
  return n.clients.forEach((e, r) => {
    const s = [];
    for (let i = 0; i < e.length; i++) {
      const o = e[i];
      if (o.deleted) {
        const a = o.id.clock;
        let c = o.length;
        if (i + 1 < e.length)
          for (let d = e[i + 1]; i + 1 < e.length && d.deleted; d = e[++i + 1])
            c += d.length;
        s.push(new Wn(a, c));
      }
    }
    s.length > 0 && t.clients.set(r, s);
  }), t;
}, Re = (n, t) => {
  q(n.restEncoder, t.clients.size), Gt(t.clients.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
    n.resetDsCurVal(), q(n.restEncoder, e);
    const s = r.length;
    q(n.restEncoder, s);
    for (let i = 0; i < s; i++) {
      const o = r[i];
      n.writeDsClock(o.clock), n.writeDsLen(o.len);
    }
  });
}, qr = (n) => {
  const t = new Le(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    n.resetDsCurVal();
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    if (i > 0) {
      const o = Wt(t.clients, s, () => (
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
    const o = tt(n.restDecoder), a = tt(n.restDecoder), c = e.clients.get(o) || [], d = mt(e, o);
    for (let f = 0; f < a; f++) {
      const u = n.readDsClock(), p = u + n.readDsLen();
      if (u < d) {
        d < p && Ye(r, o, d, p - d);
        let l = $t(c, u), w = c[l];
        for (!w.deleted && w.id.clock < u && (c.splice(l + 1, 0, Rn(t, w, u - w.id.clock)), l++); l < c.length && (w = c[l++], w.id.clock < p); )
          w.deleted || (p < w.id.clock + w.length && c.splice(l, 0, Rn(t, w, p - w.id.clock)), w.delete(t));
      } else
        Ye(r, o, u, p - u);
    }
  }
  if (r.clients.size > 0) {
    const i = new le();
    return q(i.restEncoder, 0), Re(i, r), i.toUint8Array();
  }
  return null;
}, Li = ei;
class pe extends Rr {
  /**
   * @param {DocOpts} opts configuration
   */
  constructor({ guid: t = Fa(), collectionid: e = null, gc: r = !0, gcFilter: s = () => !0, meta: i = null, autoLoad: o = !1, shouldLoad: a = !0 } = {}) {
    super(), this.gc = r, this.gcFilter = s, this.clientID = Li(), this.guid = t, this.collectionid = e, this.share = /* @__PURE__ */ new Map(), this.store = new ji(), this._transaction = null, this._transactionCleanups = [], this.subdocs = /* @__PURE__ */ new Set(), this._item = null, this.shouldLoad = a, this.autoLoad = o, this.meta = i, this.isLoaded = !1, this.isSynced = !1, this.isDestroyed = !1, this.whenLoaded = Es((d) => {
      this.on("load", () => {
        this.isLoaded = !0, d(this);
      });
    });
    const c = () => Es((d) => {
      const f = (u) => {
        (u === void 0 || u === !0) && (this.off("sync", f), d());
      };
      this.on("sync", f);
    });
    this.on("sync", (d) => {
      d === !1 && this.isSynced && (this.whenSynced = c()), this.isSynced = d === void 0 || d === !0, this.isSynced && !this.isLoaded && this.emit("load", [this]);
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
    const r = Wt(this.share, t, () => {
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
      this.get(t, Te)
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
class Ri {
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
class zi extends Ri {
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
    return Qt(this.restDecoder);
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
    return dc(St(this.restDecoder));
  }
  /**
   * Legacy implementation uses JSON parse. We use any-decoding in v2.
   *
   * @return {any}
   */
  readJSON() {
    return JSON.parse(Qt(this.restDecoder));
  }
  /**
   * @return {string}
   */
  readKey() {
    return Qt(this.restDecoder);
  }
}
class al {
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
class Ae extends al {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor(t) {
    super(t), this.keys = [], tt(t), this.keyClockDecoder = new rr(St(t)), this.clientDecoder = new yn(St(t)), this.leftClockDecoder = new rr(St(t)), this.rightClockDecoder = new rr(St(t)), this.infoDecoder = new Cs(St(t), Ce), this.stringDecoder = new Ua(St(t)), this.parentInfoDecoder = new Cs(St(t), Ce), this.typeRefDecoder = new yn(St(t)), this.lenDecoder = new yn(St(t));
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
class Ni {
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
    q(this.restEncoder, t);
  }
  /**
   * @param {number} len
   */
  writeDsLen(t) {
    q(this.restEncoder, t);
  }
}
class tn extends Ni {
  /**
   * @param {ID} id
   */
  writeLeftID(t) {
    q(this.restEncoder, t.client), q(this.restEncoder, t.clock);
  }
  /**
   * @param {ID} id
   */
  writeRightID(t) {
    q(this.restEncoder, t.client), q(this.restEncoder, t.clock);
  }
  /**
   * Use writeClient and writeClock instead of writeID if possible.
   * @param {number} client
   */
  writeClient(t) {
    q(this.restEncoder, t);
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
    q(this.restEncoder, t ? 1 : 0);
  }
  /**
   * @param {number} info An unsigned 8-bit integer
   */
  writeTypeRef(t) {
    q(this.restEncoder, t);
  }
  /**
   * Write len of a struct - well suited for Opt RLE encoder.
   *
   * @param {number} len
   */
  writeLen(t) {
    q(this.restEncoder, t);
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
class Mi {
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
    this.dsCurrVal = t, q(this.restEncoder, e);
  }
  /**
   * @param {number} len
   */
  writeDsLen(t) {
    t === 0 && Rt(), q(this.restEncoder, t - 1), this.dsCurrVal += t;
  }
}
class le extends Mi {
  constructor() {
    super(), this.keyMap = /* @__PURE__ */ new Map(), this.keyClock = 0, this.keyClockEncoder = new nr(), this.clientEncoder = new wn(), this.leftClockEncoder = new nr(), this.rightClockEncoder = new nr(), this.infoEncoder = new vs(wr), this.stringEncoder = new Aa(), this.parentInfoEncoder = new vs(wr), this.typeRefEncoder = new wn(), this.lenEncoder = new wn();
  }
  toUint8Array() {
    const t = xt();
    return q(t, 0), pt(t, this.keyClockEncoder.toUint8Array()), pt(t, this.clientEncoder.toUint8Array()), pt(t, this.leftClockEncoder.toUint8Array()), pt(t, this.rightClockEncoder.toUint8Array()), pt(t, ut(this.infoEncoder)), pt(t, this.stringEncoder.toUint8Array()), pt(t, ut(this.parentInfoEncoder)), pt(t, this.typeRefEncoder.toUint8Array()), pt(t, this.lenEncoder.toUint8Array()), Mn(t, ut(this.restEncoder)), ut(t);
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
const cl = (n, t, e, r) => {
  r = fe(r, t[0].id.clock);
  const s = $t(t, r);
  q(n.restEncoder, t.length - s), n.writeClient(e), q(n.restEncoder, r);
  const i = t[s];
  i.write(n, r - i.id.clock);
  for (let o = s + 1; o < t.length; o++)
    t[o].write(n, 0);
}, Jr = (n, t, e) => {
  const r = /* @__PURE__ */ new Map();
  e.forEach((s, i) => {
    mt(t, i) > s && r.set(i, s);
  }), Vn(t).forEach((s, i) => {
    e.has(i) || r.set(i, 0);
  }), q(n.restEncoder, r.size), Gt(r.entries()).sort((s, i) => i[0] - s[0]).forEach(([s, i]) => {
    cl(
      n,
      /** @type {Array<GC|Item>} */
      t.clients.get(s),
      s,
      i
    );
  });
}, ll = (n, t) => {
  const e = At(), r = tt(n.restDecoder);
  for (let s = 0; s < r; s++) {
    const i = tt(n.restDecoder), o = new Array(i), a = n.readClient();
    let c = tt(n.restDecoder);
    e.set(a, { i: 0, refs: o });
    for (let d = 0; d < i; d++) {
      const f = n.readInfo();
      switch (Nn & f) {
        case 0: {
          const u = n.readLen();
          o[d] = new Ot(rt(a, c), u), c += u;
          break;
        }
        case 10: {
          const u = tt(n.restDecoder);
          o[d] = new Lt(rt(a, c), u), c += u;
          break;
        }
        default: {
          const u = (f & (Yt | Tt)) === 0, p = new lt(
            rt(a, c),
            null,
            // left
            (f & Tt) === Tt ? n.readLeftID() : null,
            // origin
            null,
            // right
            (f & Yt) === Yt ? n.readRightID() : null,
            // right origin
            u ? n.readParentInfo() ? t.get(n.readString()) : n.readLeftID() : null,
            // parent
            u && (f & je) === je ? n.readString() : null,
            // parentSub
            lo(n, f)
            // item content
          );
          o[d] = p, c += p.length;
        }
      }
    }
  }
  return e;
}, ul = (n, t, e) => {
  const r = [];
  let s = Gt(e.keys()).sort((l, w) => l - w);
  if (s.length === 0)
    return null;
  const i = () => {
    if (s.length === 0)
      return null;
    let l = (
      /** @type {{i:number,refs:Array<GC|Item>}} */
      e.get(s[s.length - 1])
    );
    for (; l.refs.length === l.i; )
      if (s.pop(), s.length > 0)
        l = /** @type {{i:number,refs:Array<GC|Item>}} */
        e.get(s[s.length - 1]);
      else
        return null;
    return l;
  };
  let o = i();
  if (o === null)
    return null;
  const a = new ji(), c = /* @__PURE__ */ new Map(), d = (l, w) => {
    const g = c.get(l);
    (g == null || g > w) && c.set(l, w);
  };
  let f = (
    /** @type {any} */
    o.refs[
      /** @type {any} */
      o.i++
    ]
  );
  const u = /* @__PURE__ */ new Map(), p = () => {
    for (const l of r) {
      const w = l.id.client, g = e.get(w);
      g ? (g.i--, a.clients.set(w, g.refs.slice(g.i)), e.delete(w), g.i = 0, g.refs = []) : a.clients.set(w, [l]), s = s.filter((_) => _ !== w);
    }
    r.length = 0;
  };
  for (; ; ) {
    if (f.constructor !== Lt) {
      const w = Wt(u, f.id.client, () => mt(t, f.id.client)) - f.id.clock;
      if (w < 0)
        r.push(f), d(f.id.client, f.id.clock - 1), p();
      else {
        const g = f.getMissing(n, t);
        if (g !== null) {
          r.push(f);
          const _ = e.get(
            /** @type {number} */
            g
          ) || { refs: [], i: 0 };
          if (_.refs.length === _.i)
            d(
              /** @type {number} */
              g,
              mt(t, g)
            ), p();
          else {
            f = _.refs[_.i++];
            continue;
          }
        } else (w === 0 || w < f.length) && (f.integrate(n, w), u.set(f.id.client, f.id.clock + f.length));
      }
    }
    if (r.length > 0)
      f = /** @type {GC|Item} */
      r.pop();
    else if (o !== null && o.i < o.refs.length)
      f = /** @type {GC|Item} */
      o.refs[o.i++];
    else {
      if (o = i(), o === null)
        break;
      f = /** @type {GC|Item} */
      o.refs[o.i++];
    }
  }
  if (a.clients.size > 0) {
    const l = new le();
    return Jr(l, a, /* @__PURE__ */ new Map()), q(l.restEncoder, 0), { missing: c, update: l.toUint8Array() };
  }
  return null;
}, hl = (n, t) => Jr(n, t.doc.store, t.beforeState), dl = (n, t, e, r = new Ae(n)) => at(t, (s) => {
  s.local = !1;
  let i = !1;
  const o = s.doc, a = o.store, c = ll(r, o), d = ul(s, a, c), f = a.pendingStructs;
  if (f) {
    for (const [p, l] of f.missing)
      if (l < mt(a, p)) {
        i = !0;
        break;
      }
    if (d) {
      for (const [p, l] of d.missing) {
        const w = f.missing.get(p);
        (w == null || w > l) && f.missing.set(p, l);
      }
      f.update = Dn([f.update, d.update]);
    }
  } else
    a.pendingStructs = d;
  const u = Is(r, s, a);
  if (a.pendingDs) {
    const p = new Ae(re(a.pendingDs));
    tt(p.restDecoder);
    const l = Is(p, s, a);
    u && l ? a.pendingDs = Dn([u, l]) : a.pendingDs = u || l;
  } else
    a.pendingDs = u;
  if (i) {
    const p = (
      /** @type {{update: Uint8Array}} */
      a.pendingStructs.update
    );
    a.pendingStructs = null, Ui(s.doc, p);
  }
}, e, !1), Ui = (n, t, e, r = Ae) => {
  const s = re(t);
  dl(s, n, e, new r(s));
}, Xr = (n, t, e) => Ui(n, t, e, zi), fl = (n, t, e = /* @__PURE__ */ new Map()) => {
  Jr(n, t.store, e), Re(n, ol(t.store));
}, pl = (n, t = new Uint8Array([0]), e = new le()) => {
  const r = Bi(t);
  fl(e, n, r);
  const s = [e.toUint8Array()];
  if (n.store.pendingDs && s.push(n.store.pendingDs), n.store.pendingStructs && s.push(Ol(n.store.pendingStructs.update, t)), s.length > 1) {
    if (e.constructor === tn)
      return Tl(s.map((i, o) => o === 0 ? i : Rl(i)));
    if (e.constructor === le)
      return Dn(s);
  }
  return s[0];
}, Qr = (n, t) => pl(n, t, new tn()), gl = (n) => {
  const t = /* @__PURE__ */ new Map(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    t.set(s, i);
  }
  return t;
}, Bi = (n) => gl(new Ri(re(n))), Pi = (n, t) => (q(n.restEncoder, t.size), Gt(t.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
  q(n.restEncoder, e), q(n.restEncoder, r);
}), n), ml = (n, t) => Pi(n, Vn(t.store)), wl = (n, t = new Mi()) => (n instanceof Map ? Pi(t, n) : ml(t, n), t.toUint8Array()), yl = (n) => wl(n, new Ni());
class _l {
  constructor() {
    this.l = [];
  }
}
const Os = () => new _l(), Ls = (n, t) => n.l.push(t), Rs = (n, t) => {
  const e = n.l, r = e.length;
  n.l = e.filter((s) => t !== s), r === n.l.length && console.error("[yjs] Tried to remove event handler that doesn't exist.");
}, Fi = (n, t, e) => $r(n.l, [t, e]);
class ke {
  /**
   * @param {number} client client id
   * @param {number} clock unique per client id, continuous number
   */
  constructor(t, e) {
    this.client = t, this.clock = e;
  }
}
const un = (n, t) => n === t || n !== null && t !== null && n.client === t.client && n.clock === t.clock, rt = (n, t) => new ke(n, t), bl = (n) => {
  for (const [t, e] of n.doc.share.entries())
    if (e === n)
      return t;
  throw Rt();
}, En = (n, t) => {
  for (; t !== null; ) {
    if (t.parent === n)
      return !0;
    t = /** @type {AbstractType<any>} */
    t.parent._item;
  }
  return !1;
}, we = (n, t) => t === void 0 ? !n.deleted : t.sv.has(n.id.client) && (t.sv.get(n.id.client) || 0) > n.id.clock && !Qe(t.ds, n.id), vr = (n, t) => {
  const e = Wt(n.meta, vr, te), r = n.doc.store;
  e.has(t) || (t.sv.forEach((s, i) => {
    s < mt(r, i) && Dt(n, rt(i, s));
  }), De(n, t.ds, (s) => {
  }), e.add(t));
};
class ji {
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
}, $i = (n, t) => {
  let e = n.clients.get(t.id.client);
  if (e === void 0)
    e = [], n.clients.set(t.id.client, e);
  else {
    const r = e[e.length - 1];
    if (r.id.clock + r.length !== t.id.clock)
      throw Rt();
  }
  e.push(t);
}, $t = (n, t) => {
  let e = 0, r = n.length - 1, s = n[r], i = s.id.clock;
  if (i === t)
    return r;
  let o = Mt(t / (i + s.length - 1) * r);
  for (; e <= r; ) {
    if (s = n[o], i = s.id.clock, i <= t) {
      if (t < i + s.length)
        return o;
      e = o + 1;
    } else
      r = o - 1;
    o = Mt((e + r) / 2);
  }
  throw Rt();
}, kl = (n, t) => {
  const e = n.clients.get(t.client);
  return e[$t(e, t.clock)];
}, _n = (
  /** @type {function(StructStore,ID):Item} */
  kl
), Sr = (n, t, e) => {
  const r = $t(t, e), s = t[r];
  return s.id.clock < e && s instanceof lt ? (t.splice(r + 1, 0, Rn(n, s, e - s.id.clock)), r + 1) : r;
}, Dt = (n, t) => {
  const e = (
    /** @type {Array<Item>} */
    n.doc.store.clients.get(t.client)
  );
  return e[Sr(n, e, t.clock)];
}, zs = (n, t, e) => {
  const r = t.clients.get(e.client), s = $t(r, e.clock), i = r[s];
  return e.clock !== i.id.clock + i.length - 1 && i.constructor !== Ot && r.splice(s + 1, 0, Rn(n, i, e.clock - i.id.clock + 1)), i;
}, vl = (n, t, e) => {
  const r = (
    /** @type {Array<GC|Item>} */
    n.clients.get(t.id.client)
  );
  r[$t(r, t.id.clock)] = e;
}, Hi = (n, t, e, r, s) => {
  if (r === 0)
    return;
  const i = e + r;
  let o = Sr(n, t, e), a;
  do
    a = t[o++], i < a.id.clock + a.length && Sr(n, t, i), s(a);
  while (o < t.length && t[o].id.clock < i);
};
class Sl {
  /**
   * @param {Doc} doc
   * @param {any} origin
   * @param {boolean} local
   */
  constructor(t, e, r) {
    this.doc = t, this.deleteSet = new Le(), this.beforeState = Vn(t.store), this.afterState = /* @__PURE__ */ new Map(), this.changed = /* @__PURE__ */ new Map(), this.changedParentTypes = /* @__PURE__ */ new Map(), this._mergeStructs = [], this.origin = e, this.meta = /* @__PURE__ */ new Map(), this.local = r, this.subdocsAdded = /* @__PURE__ */ new Set(), this.subdocsRemoved = /* @__PURE__ */ new Set(), this.subdocsLoaded = /* @__PURE__ */ new Set(), this._needFormattingCleanup = !1;
  }
}
const Ns = (n, t) => t.deleteSet.clients.size === 0 && !ia(t.afterState, (e, r) => t.beforeState.get(r) !== e) ? !1 : (Kr(t.deleteSet), hl(n, t), Re(n, t.deleteSet), !0), Ms = (n, t, e) => {
  const r = t._item;
  (r === null || r.id.clock < (n.beforeState.get(r.id.client) || 0) && !r.deleted) && Wt(n.changed, t, te).add(e);
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
}, xl = (n, t, e) => {
  for (const [r, s] of n.clients.entries()) {
    const i = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let o = s.length - 1; o >= 0; o--) {
      const a = s[o], c = a.clock + a.len;
      for (let d = $t(i, a.clock), f = i[d]; d < i.length && f.id.clock < c; f = i[++d]) {
        const u = i[d];
        if (a.clock + a.len <= u.id.clock)
          break;
        u instanceof lt && u.deleted && !u.keep && e(u) && u.gc(t, !1);
      }
    }
  }
}, Cl = (n, t) => {
  n.clients.forEach((e, r) => {
    const s = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let i = e.length - 1; i >= 0; i--) {
      const o = e[i], a = zr(s.length - 1, 1 + $t(s, o.clock + o.len - 1));
      for (let c = a, d = s[c]; c > 0 && d.id.clock >= o.clock; d = s[c])
        c -= 1 + bn(s, c);
    }
  });
}, Wi = (n, t) => {
  if (t < n.length) {
    const e = n[t], r = e.doc, s = r.store, i = e.deleteSet, o = e._mergeStructs;
    try {
      Kr(i), e.afterState = Vn(e.doc.store), r.emit("beforeObserverCalls", [e, r]);
      const a = [];
      e.changed.forEach(
        (c, d) => a.push(() => {
          (d._item === null || !d._item.deleted) && d._callObserver(e, c);
        })
      ), a.push(() => {
        e.changedParentTypes.forEach((c, d) => {
          d._dEH.l.length > 0 && (d._item === null || !d._item.deleted) && (c = c.filter(
            (f) => f.target._item === null || !f.target._item.deleted
          ), c.forEach((f) => {
            f.currentTarget = d, f._path = null;
          }), c.sort((f, u) => f.path.length - u.path.length), a.push(() => {
            Fi(d._dEH, c, e);
          }));
        }), a.push(() => r.emit("afterTransaction", [e, r])), a.push(() => {
          e._needFormattingCleanup && Yl(e);
        });
      }), $r(a, []);
    } finally {
      r.gc && xl(i, s, r.gcFilter), Cl(i, s), e.afterState.forEach((f, u) => {
        const p = e.beforeState.get(u) || 0;
        if (p !== f) {
          const l = (
            /** @type {Array<GC|Item>} */
            s.clients.get(u)
          ), w = fe($t(l, p), 1);
          for (let g = l.length - 1; g >= w; )
            g -= 1 + bn(l, g);
        }
      });
      for (let f = o.length - 1; f >= 0; f--) {
        const { client: u, clock: p } = o[f].id, l = (
          /** @type {Array<GC|Item>} */
          s.clients.get(u)
        ), w = $t(l, p);
        w + 1 < l.length && bn(l, w + 1) > 1 || w > 0 && bn(l, w);
      }
      if (!e.local && e.afterState.get(r.clientID) !== e.beforeState.get(r.clientID) && (nl(Gr, Ci, "[yjs] ", Ei, Di, "Changed the client-id because another client seems to be using it."), r.clientID = Li()), r.emit("afterTransactionCleanup", [e, r]), r._observers.has("update")) {
        const f = new tn();
        Ns(f, e) && r.emit("update", [f.toUint8Array(), e.origin, r, e]);
      }
      if (r._observers.has("updateV2")) {
        const f = new le();
        Ns(f, e) && r.emit("updateV2", [f.toUint8Array(), e.origin, r, e]);
      }
      const { subdocsAdded: a, subdocsLoaded: c, subdocsRemoved: d } = e;
      (a.size > 0 || d.size > 0 || c.size > 0) && (a.forEach((f) => {
        f.clientID = r.clientID, f.collectionid == null && (f.collectionid = r.collectionid), r.subdocs.add(f);
      }), d.forEach((f) => r.subdocs.delete(f)), r.emit("subdocs", [{ loaded: c, added: a, removed: d }, r, e]), d.forEach((f) => f.destroy())), n.length <= t + 1 ? (r._transactionCleanups = [], r.emit("afterAllTransactions", [r, n])) : Wi(n, t + 1);
    }
  }
}, at = (n, t, e = null, r = !0) => {
  const s = n._transactionCleanups;
  let i = !1, o = null;
  n._transaction === null && (i = !0, n._transaction = new Sl(n, e, r), s.push(n._transaction), s.length === 1 && n.emit("beforeAllTransactions", [n]), n.emit("beforeTransaction", [n._transaction, n]));
  try {
    o = t(n._transaction);
  } finally {
    if (i) {
      const a = n._transaction === s[0];
      n._transaction = null, a && Wi(s, 0);
    }
  }
  return o;
};
class El {
  /**
   * @param {DeleteSet} deletions
   * @param {DeleteSet} insertions
   */
  constructor(t, e) {
    this.insertions = e, this.deletions = t, this.meta = /* @__PURE__ */ new Map();
  }
}
const Us = (n, t, e) => {
  De(n, e.deletions, (r) => {
    r instanceof lt && t.scope.some((s) => s === n.doc || En(
      /** @type {AbstractType<any>} */
      s,
      r
    )) && as(r, !1);
  });
}, Bs = (n, t, e) => {
  let r = null;
  const s = n.doc, i = n.scope;
  at(s, (a) => {
    for (; t.length > 0 && n.currStackItem === null; ) {
      const c = s.store, d = (
        /** @type {StackItem} */
        t.pop()
      ), f = /* @__PURE__ */ new Set(), u = [];
      let p = !1;
      De(a, d.insertions, (l) => {
        if (l instanceof lt) {
          if (l.redone !== null) {
            let { item: w, diff: g } = bu(c, l.id);
            g > 0 && (w = Dt(a, rt(w.id.client, w.id.clock + g))), l = w;
          }
          !l.deleted && i.some((w) => w === a.doc || En(
            /** @type {AbstractType<any>} */
            w,
            /** @type {Item} */
            l
          )) && u.push(l);
        }
      }), De(a, d.deletions, (l) => {
        l instanceof lt && i.some((w) => w === a.doc || En(
          /** @type {AbstractType<any>} */
          w,
          l
        )) && // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
        !Qe(d.insertions, l.id) && f.add(l);
      }), f.forEach((l) => {
        p = co(a, l, f, d.insertions, n.ignoreRemoteMapChanges, n) !== null || p;
      });
      for (let l = u.length - 1; l >= 0; l--) {
        const w = u[l];
        n.deleteFilter(w) && (w.delete(a), p = !0);
      }
      n.currStackItem = p ? d : null;
    }
    a.changed.forEach((c, d) => {
      c.has(null) && d._searchMarker && (d._searchMarker.length = 0);
    }), r = a;
  }, n);
  const o = n.currStackItem;
  if (o != null) {
    const a = r.changedParentTypes;
    n.emit("stack-item-popped", [{ stackItem: o, type: e, changedParentTypes: a, origin: n }, n]), n.currStackItem = null;
  }
  return o;
};
class Dl extends Rr {
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
      const d = this.undoing, f = this.redoing, u = d ? this.redoStack : this.undoStack;
      d ? this.stopCapturing() : f || this.clear(!1, !0);
      const p = new Le();
      c.afterState.forEach((_, y) => {
        const v = c.beforeState.get(y) || 0, x = _ - v;
        x > 0 && Ye(p, y, v, x);
      });
      const l = ee();
      let w = !1;
      if (this.lastChange > 0 && l - this.lastChange < this.captureTimeout && u.length > 0 && !d && !f) {
        const _ = u[u.length - 1];
        _.deletions = kr([_.deletions, c.deleteSet]), _.insertions = kr([_.insertions, p]);
      } else
        u.push(new El(c.deleteSet, p)), w = !0;
      !d && !f && (this.lastChange = l), De(
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
      const g = [{ stackItem: u[u.length - 1], origin: c.origin, type: d ? "redo" : "undo", changedParentTypes: c.changedParentTypes }, this];
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
      e.has(r) || (e.add(r), (r instanceof bt ? r.doc !== this.doc : r !== this.doc) && Ti("[yjs#509] Not same Y.Doc"), this.scope.push(r));
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
      t = Bs(this, this.undoStack, "undo");
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
      t = Bs(this, this.redoStack, "redo");
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
function* Al(n) {
  const t = tt(n.restDecoder);
  for (let e = 0; e < t; e++) {
    const r = tt(n.restDecoder), s = n.readClient();
    let i = tt(n.restDecoder);
    for (let o = 0; o < r; o++) {
      const a = n.readInfo();
      if (a === 10) {
        const c = tt(n.restDecoder);
        yield new Lt(rt(s, i), c), i += c;
      } else if ((Nn & a) !== 0) {
        const c = (a & (Yt | Tt)) === 0, d = new lt(
          rt(s, i),
          null,
          // left
          (a & Tt) === Tt ? n.readLeftID() : null,
          // origin
          null,
          // right
          (a & Yt) === Yt ? n.readRightID() : null,
          // right origin
          // @ts-ignore Force writing a string here.
          c ? n.readParentInfo() ? n.readString() : n.readLeftID() : null,
          // parent
          c && (a & je) === je ? n.readString() : null,
          // parentSub
          lo(n, a)
          // item content
        );
        yield d, i += d.length;
      } else {
        const c = n.readLen();
        yield new Ot(rt(s, i), c), i += c;
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
    this.gen = Al(t), this.curr = null, this.done = !1, this.filterSkips = e, this.next();
  }
  /**
   * @return {Item | GC | Skip |null}
   */
  next() {
    do
      this.curr = this.gen.next().value || null;
    while (this.filterSkips && this.curr !== null && this.curr.constructor === Lt);
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
const Tl = (n) => Dn(n, zi, tn), Il = (n, t) => {
  if (n.constructor === Ot) {
    const { client: e, clock: r } = n.id;
    return new Ot(rt(e, r + t), n.length - t);
  } else if (n.constructor === Lt) {
    const { client: e, clock: r } = n.id;
    return new Lt(rt(e, r + t), n.length - t);
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
}, Dn = (n, t = Ae, e = le) => {
  if (n.length === 1)
    return n[0];
  const r = n.map((f) => new t(re(f)));
  let s = r.map((f) => new ts(f, !0)), i = null;
  const o = new e(), a = new es(o);
  for (; s = s.filter((p) => p.curr !== null), s.sort(
    /** @type {function(any,any):number} */
    (p, l) => {
      if (p.curr.id.client === l.curr.id.client) {
        const w = p.curr.id.clock - l.curr.id.clock;
        return w === 0 ? p.curr.constructor === l.curr.constructor ? 0 : p.curr.constructor === Lt ? 1 : -1 : w;
      } else
        return l.curr.id.client - p.curr.id.client;
    }
  ), s.length !== 0; ) {
    const f = s[0], u = (
      /** @type {Item | GC} */
      f.curr.id.client
    );
    if (i !== null) {
      let p = (
        /** @type {Item | GC | null} */
        f.curr
      ), l = !1;
      for (; p !== null && p.id.clock + p.length <= i.struct.id.clock + i.struct.length && p.id.client >= i.struct.id.client; )
        p = f.next(), l = !0;
      if (p === null || // current decoder is empty
      p.id.client !== u || // check whether there is another decoder that has has updates from `firstClient`
      l && p.id.clock > i.struct.id.clock + i.struct.length)
        continue;
      if (u !== i.struct.id.client)
        Jt(a, i.struct, i.offset), i = { struct: p, offset: 0 }, f.next();
      else if (i.struct.id.clock + i.struct.length < p.id.clock)
        if (i.struct.constructor === Lt)
          i.struct.length = p.id.clock + p.length - i.struct.id.clock;
        else {
          Jt(a, i.struct, i.offset);
          const w = p.id.clock - i.struct.id.clock - i.struct.length;
          i = { struct: new Lt(rt(u, i.struct.id.clock + i.struct.length), w), offset: 0 };
        }
      else {
        const w = i.struct.id.clock + i.struct.length - p.id.clock;
        w > 0 && (i.struct.constructor === Lt ? i.struct.length -= w : p = Il(p, w)), i.struct.mergeWith(
          /** @type {any} */
          p
        ) || (Jt(a, i.struct, i.offset), i = { struct: p, offset: 0 }, f.next());
      }
    } else
      i = { struct: (
        /** @type {Item | GC} */
        f.curr
      ), offset: 0 }, f.next();
    for (let p = f.curr; p !== null && p.id.client === u && p.id.clock === i.struct.id.clock + i.struct.length && p.constructor !== Lt; p = f.next())
      Jt(a, i.struct, i.offset), i = { struct: p, offset: 0 };
  }
  i !== null && (Jt(a, i.struct, i.offset), i = null), ns(a);
  const c = r.map((f) => qr(f)), d = kr(c);
  return Re(o, d), o.toUint8Array();
}, Ol = (n, t, e = Ae, r = le) => {
  const s = Bi(t), i = new r(), o = new es(i), a = new e(re(n)), c = new ts(a, !1);
  for (; c.curr; ) {
    const f = c.curr, u = f.id.client, p = s.get(u) || 0;
    if (c.curr.constructor === Lt) {
      c.next();
      continue;
    }
    if (f.id.clock + f.length > p)
      for (Jt(o, f, fe(p - f.id.clock, 0)), c.next(); c.curr && c.curr.id.client === u; )
        Jt(o, c.curr, 0), c.next();
    else
      for (; c.curr && c.curr.id.client === u && c.curr.id.clock + c.curr.length <= p; )
        c.next();
  }
  ns(o);
  const d = qr(a);
  return Re(i, d), i.toUint8Array();
}, Vi = (n) => {
  n.written > 0 && (n.clientStructs.push({ written: n.written, restEncoder: ut(n.encoder.restEncoder) }), n.encoder.restEncoder = xt(), n.written = 0);
}, Jt = (n, t, e) => {
  n.written > 0 && n.currClient !== t.id.client && Vi(n), n.written === 0 && (n.currClient = t.id.client, n.encoder.writeClient(t.id.client), q(n.encoder.restEncoder, t.id.clock + e)), t.write(n.encoder, e), n.written++;
}, ns = (n) => {
  Vi(n);
  const t = n.encoder.restEncoder;
  q(t, n.clientStructs.length);
  for (let e = 0; e < n.clientStructs.length; e++) {
    const r = n.clientStructs[e];
    q(t, r.written), Mn(t, r.restEncoder);
  }
}, Ll = (n, t, e, r) => {
  const s = new e(re(n)), i = new ts(s, !1), o = new r(), a = new es(o);
  for (let d = i.curr; d !== null; d = i.next())
    Jt(a, t(d), 0);
  ns(a);
  const c = qr(s);
  return Re(o, c), o.toUint8Array();
}, Rl = (n) => Ll(n, Xa, Ae, tn), Ps = "You must not compute changes after the event-handler fired.";
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
    return this._path || (this._path = zl(this.currentTarget, this.target));
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
        throw jt(Ps);
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
        throw jt(Ps);
      const e = this.target, r = te(), s = te(), i = [];
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
        for (let d = e._start; d !== null; d = d.right)
          d.deleted ? this.deletes(d) && !this.adds(d) && ((a === null || a.delete === void 0) && (c(), a = { delete: 0 }), a.delete += d.length, s.add(d)) : this.adds(d) ? ((a === null || a.insert === void 0) && (c(), a = { insert: [] }), a.insert = a.insert.concat(d.content.getContent()), r.add(d)) : ((a === null || a.retain === void 0) && (c(), a = { retain: 0 }), a.retain += d.length);
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
const zl = (n, t) => {
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
  Ti("Invalid access: Add Yjs type to a document before reading data.");
}, Zi = 80;
let rs = 0;
class Nl {
  /**
   * @param {Item} p
   * @param {number} index
   */
  constructor(t, e) {
    t.marker = !0, this.p = t, this.index = e, this.timestamp = rs++;
  }
}
const Ml = (n) => {
  n.timestamp = rs++;
}, Yi = (n, t, e) => {
  n.p.marker = !1, n.p = t, t.marker = !0, n.index = e, n.timestamp = rs++;
}, Ul = (n, t, e) => {
  if (n.length >= Zi) {
    const r = n.reduce((s, i) => s.timestamp < i.timestamp ? s : i);
    return Yi(r, t, e), r;
  } else {
    const r = new Nl(t, e);
    return n.push(r), r;
  }
}, Yn = (n, t) => {
  if (n._start === null || t === 0 || n._searchMarker === null)
    return null;
  const e = n._searchMarker.length === 0 ? null : n._searchMarker.reduce((i, o) => mn(t - i.index) < mn(t - o.index) ? i : o);
  let r = n._start, s = 0;
  for (e !== null && (r = e.p, s = e.index, Ml(e)); r.right !== null && s < t; ) {
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
  r.parent.length / Zi ? (Yi(e, r, s), e) : Ul(n._searchMarker, r, s);
}, Ge = (n, t, e) => {
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
}, Gn = (n, t, e) => {
  const r = n, s = t.changedParentTypes;
  for (; Wt(s, n, () => []).push(e), n._item !== null; )
    n = /** @type {AbstractType<any>} */
    n._item.parent;
  Fi(r._eH, e, t);
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
    throw Nt();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {AbstractType<EventType>}
   */
  clone() {
    throw Nt();
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
const Gi = (n, t, e) => {
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
}, Ki = (n) => {
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
}, Ke = (n, t) => {
  let e = 0, r = n._start;
  for (n.doc ?? Ct(); r !== null; ) {
    if (r.countable && !r.deleted) {
      const s = r.content.getContent();
      for (let i = 0; i < s.length; i++)
        t(s[i], e++, n);
    }
    r = r.right;
  }
}, qi = (n, t) => {
  const e = [];
  return Ke(n, (r, s) => {
    e.push(t(r, s, n));
  }), e;
}, Bl = (n) => {
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
}, Ji = (n, t) => {
  n.doc ?? Ct();
  const e = Yn(n, t);
  let r = n._start;
  for (e !== null && (r = e.p, t -= e.index); r !== null; r = r.right)
    if (!r.deleted && r.countable) {
      if (t < r.length)
        return r.content.getContent()[t];
      t -= r.length;
    }
}, An = (n, t, e, r) => {
  let s = e;
  const i = n.doc, o = i.clientID, a = i.store, c = e === null ? t._start : e.right;
  let d = [];
  const f = () => {
    d.length > 0 && (s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new de(d)), s.integrate(n, 0), d = []);
  };
  r.forEach((u) => {
    if (u === null)
      d.push(u);
    else
      switch (u.constructor) {
        case Number:
        case Object:
        case Boolean:
        case Array:
        case String:
          d.push(u);
          break;
        default:
          switch (f(), u.constructor) {
            case Uint8Array:
            case ArrayBuffer:
              s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new en(new Uint8Array(
                /** @type {Uint8Array} */
                u
              ))), s.integrate(n, 0);
              break;
            case pe:
              s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new nn(
                /** @type {Doc} */
                u
              )), s.integrate(n, 0);
              break;
            default:
              if (u instanceof bt)
                s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new qt(u)), s.integrate(n, 0);
              else
                throw new Error("Unexpected content type in insert operation");
          }
      }
  }), f();
}, Xi = () => jt("Length exceeded!"), Qi = (n, t, e, r) => {
  if (e > t._length)
    throw Xi();
  if (e === 0)
    return t._searchMarker && Ge(t._searchMarker, e, r.length), An(n, t, null, r);
  const s = e, i = Yn(t, e);
  let o = t._start;
  for (i !== null && (o = i.p, e -= i.index, e === 0 && (o = o.prev, e += o && o.countable && !o.deleted ? o.length : 0)); o !== null; o = o.right)
    if (!o.deleted && o.countable) {
      if (e <= o.length) {
        e < o.length && Dt(n, rt(o.id.client, o.id.clock + e));
        break;
      }
      e -= o.length;
    }
  return t._searchMarker && Ge(t._searchMarker, s, r.length), An(n, t, o, r);
}, Pl = (n, t, e) => {
  let s = (t._searchMarker || []).reduce((i, o) => o.index > i.index ? o : i, { index: 0, p: t._start }).p;
  if (s)
    for (; s.right; )
      s = s.right;
  return An(n, t, s, e);
}, to = (n, t, e, r) => {
  if (r === 0)
    return;
  const s = e, i = r, o = Yn(t, e);
  let a = t._start;
  for (o !== null && (a = o.p, e -= o.index); a !== null && e > 0; a = a.right)
    !a.deleted && a.countable && (e < a.length && Dt(n, rt(a.id.client, a.id.clock + e)), e -= a.length);
  for (; r > 0 && a !== null; )
    a.deleted || (r < a.length && Dt(n, rt(a.id.client, a.id.clock + r)), a.delete(n), r -= a.length), a = a.right;
  if (r > 0)
    throw Xi();
  t._searchMarker && Ge(
    t._searchMarker,
    s,
    -i + r
    /* in case we remove the above exception */
  );
}, Tn = (n, t, e) => {
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
          a = new qt(r);
        else
          throw new Error("Unexpected content type");
    }
  new lt(rt(o, mt(i.store, o)), s, s && s.lastId, null, null, t, e, a).integrate(n, 0);
}, is = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted ? e.content.getContent()[e.length - 1] : void 0;
}, eo = (n) => {
  const t = {};
  return n.doc ?? Ct(), n._map.forEach((e, r) => {
    e.deleted || (t[r] = e.content.getContent()[e.length - 1]);
  }), t;
}, no = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted;
}, Fl = (n, t) => {
  const e = {};
  return n._map.forEach((r, s) => {
    let i = r;
    for (; i !== null && (!t.sv.has(i.id.client) || i.id.clock >= (t.sv.get(i.id.client) || 0)); )
      i = i.left;
    i !== null && we(i, t) && (e[s] = i.content.getContent()[i.length - 1]);
  }), e;
}, hn = (n) => (n.doc ?? Ct(), rl(
  n._map.entries(),
  /** @param {any} entry */
  (t) => !t[1].deleted
));
class jl extends Zn {
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
    super._callObserver(t, e), Gn(this, t, new jl(this, t));
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
      Qi(
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
      Pl(
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
      to(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Returns the i-th element from a YArray.
   *
   * @param {number} index The index of the element to return from the YArray
   * @return {T}
   */
  get(t) {
    return Ji(this, t);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<T>}
   */
  toArray() {
    return Ki(this);
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
    return Gi(this, t, e);
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
    return qi(
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
    Ke(this, t);
  }
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return Bl(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(du);
  }
}
const $l = (n) => new ve();
class Hl extends Zn {
  /**
   * @param {YMap<T>} ymap The YArray that changed.
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed.
   */
  constructor(t, e, r) {
    super(t, e), this.keysChanged = r;
  }
}
class Te extends bt {
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
    return new Te();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YMap<MapType>}
   */
  clone() {
    const t = new Te();
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
    Gn(this, t, new Hl(this, t, e));
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
      Tn(e, this, t);
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
    return no(this, t);
  }
  /**
   * Removes all elements from this YMap.
   */
  clear() {
    this.doc !== null ? at(this.doc, (t) => {
      this.forEach(function(e, r, s) {
        Tn(t, s, r);
      });
    }) : this._prelimContent.clear();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(fu);
  }
}
const Wl = (n) => new Te(), Xt = (n, t) => n === t || typeof n == "object" && typeof t == "object" && n && t && qa(n, t);
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
    this.right === null && Rt(), this.right.content.constructor === wt ? this.right.deleted || ze(
      this.currentAttributes,
      /** @type {ContentFormat} */
      this.right.content
    ) : this.right.deleted || (this.index += this.right.length), this.left = this.right, this.right = this.right.right;
  }
}
const Fs = (n, t, e) => {
  for (; t.right !== null && e > 0; )
    t.right.content.constructor === wt ? t.right.deleted || ze(
      t.currentAttributes,
      /** @type {ContentFormat} */
      t.right.content
    ) : t.right.deleted || (e < t.right.length && Dt(n, rt(t.right.id.client, t.right.id.clock + e)), t.index += t.right.length, e -= t.right.length), t.left = t.right, t.right = t.right.right;
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
}, ro = (n, t, e, r) => {
  for (; e.right !== null && (e.right.deleted === !0 || e.right.content.constructor === wt && Xt(
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
    const c = e.left, d = e.right, f = new lt(rt(i, mt(s.store, i)), c, c && c.lastId, d, d && d.id, t, null, new wt(a, o));
    f.integrate(n, 0), e.right = f, e.forward();
  });
}, ze = (n, t) => {
  const { key: e, value: r } = t;
  r === null ? n.delete(e) : n.set(e, r);
}, so = (n, t) => {
  for (; n.right !== null; ) {
    if (!(n.right.deleted || n.right.content.constructor === wt && Xt(
      t[
        /** @type {ContentFormat} */
        n.right.content.key
      ] ?? null,
      /** @type {ContentFormat} */
      n.right.content.value
    ))) break;
    n.forward();
  }
}, io = (n, t, e, r) => {
  const s = n.doc, i = s.clientID, o = /* @__PURE__ */ new Map();
  for (const a in r) {
    const c = r[a], d = e.currentAttributes.get(a) ?? null;
    if (!Xt(d, c)) {
      o.set(a, d);
      const { left: f, right: u } = e;
      e.right = new lt(rt(i, mt(s.store, i)), f, f && f.lastId, u, u && u.id, t, null, new wt(a, c)), e.right.integrate(n, 0), e.forward();
    }
  }
  return o;
}, ar = (n, t, e, r, s) => {
  e.currentAttributes.forEach((p, l) => {
    s[l] === void 0 && (s[l] = null);
  });
  const i = n.doc, o = i.clientID;
  so(e, s);
  const a = io(n, t, e, s), c = r.constructor === String ? new Ht(
    /** @type {string} */
    r
  ) : r instanceof bt ? new qt(r) : new ge(r);
  let { left: d, right: f, index: u } = e;
  t._searchMarker && Ge(t._searchMarker, e.index, c.getLength()), f = new lt(rt(o, mt(i.store, o)), d, d && d.lastId, f, f && f.id, t, null, c), f.integrate(n, 0), e.right = f, e.index = u, e.forward(), ro(n, t, e, a);
}, js = (n, t, e, r, s) => {
  const i = n.doc, o = i.clientID;
  so(e, s);
  const a = io(n, t, e, s);
  t: for (; e.right !== null && (r > 0 || a.size > 0 && (e.right.deleted || e.right.content.constructor === wt)); ) {
    if (!e.right.deleted)
      switch (e.right.content.constructor) {
        case wt: {
          const { key: c, value: d } = (
            /** @type {ContentFormat} */
            e.right.content
          ), f = s[c];
          if (f !== void 0) {
            if (Xt(f, d))
              a.delete(c);
            else {
              if (r === 0)
                break t;
              a.set(c, d);
            }
            e.right.delete(n);
          } else
            e.currentAttributes.set(c, d);
          break;
        }
        default:
          r < e.right.length && Dt(n, rt(e.right.id.client, e.right.id.clock + r)), r -= e.right.length;
          break;
      }
    e.forward();
  }
  if (r > 0) {
    let c = "";
    for (; r > 0; r--)
      c += `
`;
    e.right = new lt(rt(o, mt(i.store, o)), e.left, e.left && e.left.lastId, e.right, e.right && e.right.id, t, null, new Ht(c)), e.right.integrate(n, 0), e.forward();
  }
  ro(n, t, e, a);
}, oo = (n, t, e, r, s) => {
  let i = t;
  const o = At();
  for (; i && (!i.countable || i.deleted); ) {
    if (!i.deleted && i.content.constructor === wt) {
      const d = (
        /** @type {ContentFormat} */
        i.content
      );
      o.set(d.key, d);
    }
    i = i.right;
  }
  let a = 0, c = !1;
  for (; t !== i; ) {
    if (e === t && (c = !0), !t.deleted) {
      const d = t.content;
      if (d.constructor === wt) {
        const { key: f, value: u } = (
          /** @type {ContentFormat} */
          d
        ), p = r.get(f) ?? null;
        (o.get(f) !== d || p === u) && (t.delete(n), a++, !c && (s.get(f) ?? null) === u && p !== u && (p === null ? s.delete(f) : s.set(f, p))), !c && !t.deleted && ze(
          s,
          /** @type {ContentFormat} */
          d
        );
      }
    }
    t = /** @type {Item} */
    t.right;
  }
  return a;
}, Vl = (n, t) => {
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
}, Zl = (n) => {
  let t = 0;
  return at(
    /** @type {Doc} */
    n.doc,
    (e) => {
      let r = (
        /** @type {Item} */
        n._start
      ), s = n._start, i = At();
      const o = gr(i);
      for (; s; )
        s.deleted === !1 && (s.content.constructor === wt ? ze(
          o,
          /** @type {ContentFormat} */
          s.content
        ) : (t += oo(e, r, s, i, o), i = gr(o), r = s)), s = s.right;
    }
  ), t;
}, Yl = (n) => {
  const t = /* @__PURE__ */ new Set(), e = n.doc;
  for (const [r, s] of n.afterState.entries()) {
    const i = n.beforeState.get(r) || 0;
    s !== i && Hi(
      n,
      /** @type {Array<Item|GC>} */
      e.store.clients.get(r),
      i,
      s,
      (o) => {
        !o.deleted && /** @type {Item} */
        o.content.constructor === wt && o.constructor !== Ot && t.add(
          /** @type {any} */
          o.parent
        );
      }
    );
  }
  at(e, (r) => {
    De(n, n.deleteSet, (s) => {
      if (s instanceof Ot || !/** @type {YText} */
      s.parent._hasFormatting || t.has(
        /** @type {YText} */
        s.parent
      ))
        return;
      const i = (
        /** @type {YText} */
        s.parent
      );
      s.content.constructor === wt ? t.add(i) : Vl(r, s);
    });
    for (const s of t)
      Zl(s);
  });
}, $s = (n, t, e) => {
  const r = e, s = gr(t.currentAttributes), i = t.right;
  for (; e > 0 && t.right !== null; ) {
    if (t.right.deleted === !1)
      switch (t.right.content.constructor) {
        case qt:
        case ge:
        case Ht:
          e < t.right.length && Dt(n, rt(t.right.id.client, t.right.id.clock + e)), e -= t.right.length, t.right.delete(n);
          break;
      }
    t.forward();
  }
  i && oo(n, i, t.right, s, t.currentAttributes);
  const o = (
    /** @type {AbstractType<any>} */
    /** @type {Item} */
    (t.left || t.right).parent
  );
  return o._searchMarker && Ge(o._searchMarker, t.index, -r + e), t;
};
class Gl extends Zn {
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
        let d = "", f = 0, u = 0;
        const p = () => {
          if (a !== null) {
            let l = null;
            switch (a) {
              case "delete":
                u > 0 && (l = { delete: u }), u = 0;
                break;
              case "insert":
                (typeof d == "object" || d.length > 0) && (l = { insert: d }, s.size > 0 && (l.attributes = {}, s.forEach((w, g) => {
                  w !== null && (l.attributes[g] = w);
                }))), d = "";
                break;
              case "retain":
                f > 0 && (l = { retain: f }, Ka(c) || (l.attributes = Va({}, c))), f = 0;
                break;
            }
            l && e.push(l), a = null;
          }
        };
        for (; o !== null; ) {
          switch (o.content.constructor) {
            case qt:
            case ge:
              this.adds(o) ? this.deletes(o) || (p(), a = "insert", d = o.content.getContent()[0], p()) : this.deletes(o) ? (a !== "delete" && (p(), a = "delete"), u += 1) : o.deleted || (a !== "retain" && (p(), a = "retain"), f += 1);
              break;
            case Ht:
              this.adds(o) ? this.deletes(o) || (a !== "insert" && (p(), a = "insert"), d += /** @type {ContentString} */
              o.content.str) : this.deletes(o) ? (a !== "delete" && (p(), a = "delete"), u += o.length) : o.deleted || (a !== "retain" && (p(), a = "retain"), f += o.length);
              break;
            case wt: {
              const { key: l, value: w } = (
                /** @type {ContentFormat} */
                o.content
              );
              if (this.adds(o)) {
                if (!this.deletes(o)) {
                  const g = s.get(l) ?? null;
                  Xt(g, w) ? w !== null && o.delete(r) : (a === "retain" && p(), Xt(w, i.get(l) ?? null) ? delete c[l] : c[l] = w);
                }
              } else if (this.deletes(o)) {
                i.set(l, w);
                const g = s.get(l) ?? null;
                Xt(g, w) || (a === "retain" && p(), c[l] = g);
              } else if (!o.deleted) {
                i.set(l, w);
                const g = c[l];
                g !== void 0 && (Xt(g, w) ? g !== null && o.delete(r) : (a === "retain" && p(), w === null ? delete c[l] : c[l] = w));
              }
              o.deleted || (a === "insert" && p(), ze(
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
          const l = e[e.length - 1];
          if (l.retain !== void 0 && l.attributes === void 0)
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
    const r = new Gl(this, t, e);
    Gn(this, t, r), !t.local && this._hasFormatting && (t._needFormattingCleanup = !0);
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
      !e.deleted && e.countable && e.content.constructor === Ht && (t += /** @type {ContentString} */
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
    function d() {
      if (a.length > 0) {
        const u = {};
        let p = !1;
        i.forEach((w, g) => {
          p = !0, u[g] = w;
        });
        const l = { insert: a };
        p && (l.attributes = u), s.push(l), a = "";
      }
    }
    const f = () => {
      for (; c !== null; ) {
        if (we(c, t) || e !== void 0 && we(c, e))
          switch (c.content.constructor) {
            case Ht: {
              const u = i.get("ychange");
              t !== void 0 && !we(c, t) ? (u === void 0 || u.user !== c.id.client || u.type !== "removed") && (d(), i.set("ychange", r ? r("removed", c.id) : { type: "removed" })) : e !== void 0 && !we(c, e) ? (u === void 0 || u.user !== c.id.client || u.type !== "added") && (d(), i.set("ychange", r ? r("added", c.id) : { type: "added" })) : u !== void 0 && (d(), i.delete("ychange")), a += /** @type {ContentString} */
              c.content.str;
              break;
            }
            case qt:
            case ge: {
              d();
              const u = {
                insert: c.content.getContent()[0]
              };
              if (i.size > 0) {
                const p = (
                  /** @type {Object<string,any>} */
                  {}
                );
                u.attributes = p, i.forEach((l, w) => {
                  p[w] = l;
                });
              }
              s.push(u);
              break;
            }
            case wt:
              we(c, t) && (d(), ze(
                i,
                /** @type {ContentFormat} */
                c.content
              ));
              break;
          }
        c = c.right;
      }
      d();
    };
    return t || e ? at(o, (u) => {
      t && vr(u, t), e && vr(u, e), f();
    }, "cleanup") : f(), s;
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
      Tn(e, this, t);
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
    return eo(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(pu);
  }
}
const Kl = (n) => new ue();
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
    Gn(this, t, new Xl(this, e, t));
  }
  /**
   * Get the string representation of all the children of this YXmlFragment.
   *
   * @return {string} The string representation of all children.
   */
  toString() {
    return qi(this, (t) => t.toString()).join("");
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
    return r !== void 0 && r._createAssociation(s, this), Ke(this, (i) => {
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
      Qi(r, this, t, e);
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
        An(r, this, s, e);
      });
    else {
      const r = (
        /** @type {Array<any>} */
        this._prelimContent
      ), s = t === null ? 0 : r.findIndex((i) => i === t) + 1;
      if (s === 0 && t !== null)
        throw jt("Reference item not found");
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
      to(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<YXmlElement|YXmlText|YXmlHook>}
   */
  toArray() {
    return Ki(this);
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
    return Ji(this, t);
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
    return Gi(this, t, e);
  }
  /**
   * Executes a provided function on once on every child element.
   *
   * @param {function(YXmlElement|YXmlText,number, typeof self):void} f A function to execute on every element of this YArray.
   */
  forEach(t) {
    Ke(this, t);
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
    t.writeTypeRef(mu);
  }
}
const ql = (n) => new he();
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
    return Ya(e, (r, s) => {
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
      Tn(e, this, t);
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
      no(this, t)
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
      t ? Fl(this, t) : eo(this)
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
    return Ke(this, (o) => {
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
    t.writeTypeRef(gu), t.writeKey(this.nodeName);
  }
}
const Jl = (n) => new Ie(n.readKey());
class Xl extends Zn {
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
class In extends Te {
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
    t.writeTypeRef(wu), t.writeKey(this.hookName);
  }
}
const Ql = (n) => new In(n.readKey());
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
    t.writeTypeRef(yu);
  }
}
const tu = (n) => new On();
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
    throw Nt();
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
    throw Nt();
  }
  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate(t, e) {
    throw Nt();
  }
}
const eu = 0;
class Ot extends os {
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
    e > 0 && (this.id.clock += e, this.length -= e), $i(t.doc.store, this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeInfo(eu), t.writeLen(this.length - e);
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
    throw Nt();
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
const nu = (n) => new en(n.readBuf());
class qe {
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
    return new qe(this.len);
  }
  /**
   * @param {number} offset
   * @return {ContentDeleted}
   */
  splice(t) {
    const e = new qe(this.len - t);
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
const ru = (n) => new qe(n.readLen()), ao = (n, t) => new pe({ guid: n, ...t, shouldLoad: t.shouldLoad || t.autoLoad || !1 });
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
    return new nn(ao(this.doc.guid, this.opts));
  }
  /**
   * @param {number} offset
   * @return {ContentDoc}
   */
  splice(t) {
    throw Nt();
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
const su = (n) => new nn(ao(n.readString(), n.readAny()));
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
    throw Nt();
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
const iu = (n) => new ge(n.readJSON());
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
    throw Nt();
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
const ou = (n) => new wt(n.readKey(), n.readJSON());
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
const au = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++) {
    const s = n.readString();
    s === "undefined" ? e.push(void 0) : e.push(JSON.parse(s));
  }
  return new Ln(e);
}, cu = Sn("node_env") === "development";
class de {
  /**
   * @param {Array<any>} arr
   */
  constructor(t) {
    this.arr = t, cu && ii(t);
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
const lu = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++)
    e.push(n.readAny());
  return new de(e);
};
class Ht {
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
    return new Ht(this.str);
  }
  /**
   * @param {number} offset
   * @return {ContentString}
   */
  splice(t) {
    const e = new Ht(this.str.slice(t));
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
const uu = (n) => new Ht(n.readString()), hu = [
  $l,
  Wl,
  Kl,
  Jl,
  ql,
  Ql,
  tu
], du = 0, fu = 1, pu = 2, gu = 3, mu = 4, wu = 5, yu = 6;
class qt {
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
    return new qt(this.type._copy());
  }
  /**
   * @param {number} offset
   * @return {ContentType}
   */
  splice(t) {
    throw Nt();
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
const _u = (n) => new qt(hu[n.readTypeRef()](n)), bu = (n, t) => {
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
), co = (n, t, e, r, s, i) => {
  const o = n.doc, a = o.store, c = o.clientID, d = t.redone;
  if (d !== null)
    return Dt(n, d);
  let f = (
    /** @type {AbstractType<any>} */
    t.parent._item
  ), u = null, p;
  if (f !== null && f.deleted === !0) {
    if (f.redone === null && (!e.has(f) || co(n, f, e, r, s, i) === null))
      return null;
    for (; f.redone !== null; )
      f = Dt(n, f.redone);
  }
  const l = f === null ? (
    /** @type {AbstractType<any>} */
    t.parent
  ) : (
    /** @type {ContentType} */
    f.content.type
  );
  if (t.parentSub === null) {
    for (u = t.left, p = t; u !== null; ) {
      let y = u;
      for (; y !== null && /** @type {AbstractType<any>} */
      y.parent._item !== f; )
        y = y.redone === null ? null : Dt(n, y.redone);
      if (y !== null && /** @type {AbstractType<any>} */
      y.parent._item === f) {
        u = y;
        break;
      }
      u = u.left;
    }
    for (; p !== null; ) {
      let y = p;
      for (; y !== null && /** @type {AbstractType<any>} */
      y.parent._item !== f; )
        y = y.redone === null ? null : Dt(n, y.redone);
      if (y !== null && /** @type {AbstractType<any>} */
      y.parent._item === f) {
        p = y;
        break;
      }
      p = p.right;
    }
  } else if (p = null, t.right && !s) {
    for (u = t; u !== null && u.right !== null && (u.right.redone || Qe(r, u.right.id) || Hs(i.undoStack, u.right.id) || Hs(i.redoStack, u.right.id)); )
      for (u = u.right; u.redone; ) u = Dt(n, u.redone);
    if (u && u.right !== null)
      return null;
  } else
    u = l._map.get(t.parentSub) || null;
  const w = mt(a, c), g = rt(c, w), _ = new lt(
    g,
    u,
    u && u.lastId,
    p,
    p && p.id,
    l,
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
    if (this.origin && (this.left = zs(t, e, this.origin), this.origin = this.left.lastId), this.rightOrigin && (this.right = Dt(t, this.rightOrigin), this.rightOrigin = this.right.id), this.left && this.left.constructor === Ot || this.right && this.right.constructor === Ot)
      this.parent = null;
    else if (!this.parent)
      this.left && this.left.constructor === lt ? (this.parent = this.left.parent, this.parentSub = this.left.parentSub) : this.right && this.right.constructor === lt && (this.parent = this.right.parent, this.parentSub = this.right.parentSub);
    else if (this.parent.constructor === ke) {
      const r = _n(e, this.parent);
      r.constructor === Ot ? this.parent = null : this.parent = /** @type {ContentType} */
      r.content.type;
    }
    return null;
  }
  /**
   * @param {Transaction} transaction
   * @param {number} offset
   */
  integrate(t, e) {
    if (e > 0 && (this.id.clock += e, this.left = zs(t, t.doc.store, rt(this.id.client, this.id.clock - 1)), this.origin = this.left.lastId, this.content = this.content.splice(e), this.length -= e), this.parent) {
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
      this.right !== null ? this.right.left = this : this.parentSub !== null && (this.parent._map.set(this.parentSub, this), this.left !== null && this.left.delete(t)), this.parentSub === null && this.countable && !this.deleted && (this.parent._length += this.length), $i(t.doc.store, this), this.content.integrate(t, this), Ms(
        t,
        /** @type {AbstractType<any>} */
        this.parent,
        this.parentSub
      ), /** @type {AbstractType<any>} */
      (this.parent._item !== null && /** @type {AbstractType<any>} */
      this.parent._item.deleted || this.parentSub !== null && this.right !== null) && this.delete(t);
    } else
      new Ot(this.id, this.length).integrate(t, 0);
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
      throw Rt();
    this.content.gc(t), e ? vl(t, this, new Ot(this.id, this.length)) : this.content = new qe(this.length);
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
    const r = e > 0 ? rt(this.id.client, this.id.clock + e - 1) : this.origin, s = this.rightOrigin, i = this.parentSub, o = this.content.getRef() & Nn | (r === null ? 0 : Tt) | // origin is defined
    (s === null ? 0 : Yt) | // right origin is defined
    (i === null ? 0 : je);
    if (t.writeInfo(o), r !== null && t.writeLeftID(r), s !== null && t.writeRightID(s), r === null && s === null) {
      const a = (
        /** @type {AbstractType<any>} */
        this.parent
      );
      if (a._item !== void 0) {
        const c = a._item;
        if (c === null) {
          const d = bl(a);
          t.writeParentInfo(!0), t.writeString(d);
        } else
          t.writeParentInfo(!1), t.writeLeftID(c.id);
      } else a.constructor === String ? (t.writeParentInfo(!0), t.writeString(a)) : a.constructor === ke ? (t.writeParentInfo(!1), t.writeLeftID(a)) : Rt();
      i !== null && t.writeString(i);
    }
    this.content.write(t, e);
  }
}
const lo = (n, t) => ku[t & Nn](n), ku = [
  () => {
    Rt();
  },
  // GC is not ItemContent
  ru,
  // 1
  au,
  // 2
  nu,
  // 3
  uu,
  // 4
  iu,
  // 5
  ou,
  // 6
  _u,
  // 7
  lu,
  // 8
  su,
  // 9
  () => {
    Rt();
  }
  // 10 - Skip is not ItemContent
], vu = 10;
class Lt extends os {
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
    Rt();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeInfo(vu), q(t.restEncoder, this.length - e);
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
const uo = (
  /** @type {any} */
  typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : {}
), ho = "__ $YJS$ __";
uo[ho] === !0 && console.error("Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438");
uo[ho] = !0;
function Su() {
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
      Xr(n, i);
    },
    destroy() {
      e?.destroy?.(), r?.destroy(), n.destroy();
    }
  };
}
function xu(n, t = {}) {
  const e = Su(), r = t.initialPage ?? "home", s = Oo(window.location.search), i = s[s.length - 1] ?? r;
  let o = s.length ? [...s] : [i], a = null, c = !1;
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
    pushTrail(d) {
      o.push(d);
    },
    setTrail(d) {
      o = d;
    },
    truncateTrail(d) {
      o = o.slice(0, d + 1);
    },
    setNavigating(d) {
      return c = d, d;
    },
    isNavigating() {
      return c;
    },
    clearSaveTimer() {
      a && (clearTimeout(a), a = null);
    },
    setSaveTimer(d) {
      a = d;
    },
    toContext(d) {
      return {
        ...e.toContext(d),
        getTrail: () => [...o],
        getCurrentPage: () => o.length <= 1 ? o[0] ?? "" : o.slice(1).join("/")
      };
    }
  };
}
const Cu = `
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
`, Eu = Cu + `
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
`;
function se(n, t) {
  const e = document.createElement(n);
  return e.className = t, e;
}
function Du(n) {
  const t = "worldnotes-styles", e = document.getElementById(t);
  if (e) {
    n !== void 0 && (e.textContent = n);
    return;
  }
  const r = document.createElement("style");
  r.id = t, r.textContent = n ?? Eu, document.head.appendChild(r);
}
function Au(n, t) {
  Du(t), n.innerHTML = "", n.className = "wn-root";
  const e = se("div", "wn-topbar"), r = se("div", "wn-breadcrumb"), s = se("div", "wn-toolbar"), i = se("div", "wn-editor-wrap"), o = se("div", "wn-editor"), a = se("div", "wn-placeholder"), c = se("div", "wn-overlay");
  return a.textContent = "Start writing… use [[page name]] to link deeper", o.contentEditable = "true", o.spellcheck = !1, e.appendChild(r), i.appendChild(a), i.appendChild(o), i.appendChild(c), n.appendChild(e), n.appendChild(s), n.appendChild(i), { container: n, topbar: e, breadcrumb: r, toolbar: s, editorWrap: i, editorDiv: o, placeholder: a, overlay: c };
}
function Ws(n) {
  return { type: "text", raw: n, groups: [n] };
}
function Tu(n, t) {
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
function Iu(n, t) {
  return n.split(`
`).map((e) => Tu(e, t));
}
function zn(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function Ou(n, t, e, r = -1) {
  const s = document.createDocumentFragment(), i = Kn(t);
  let o = 0;
  for (const a of n) {
    if (a.type === "text") {
      s.appendChild(document.createTextNode(a.raw)), o += a.raw.length;
      continue;
    }
    const c = o, d = c + a.raw.length;
    if (o = d, r >= c && r <= d) {
      s.appendChild(document.createTextNode(a.raw));
      continue;
    }
    const f = i.get(a.type);
    if (!f) {
      s.appendChild(document.createTextNode(a.raw));
      continue;
    }
    const u = f.render(a, e);
    if (u instanceof HTMLElement && f.onNavigate) {
      const p = f.onNavigate.bind(f);
      u.addEventListener("mousedown", (l) => {
        p(a, e) && l.preventDefault();
      });
    }
    s.appendChild(u);
  }
  return s;
}
function Kn(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    for (const r of e.tokens)
      t.set(r.type, e);
  return t;
}
function fo(n, t, e) {
  const r = t.flatMap((a) => a.tokens).filter((a) => !a.pattern.source.startsWith("^")), s = cs(n, r), i = Kn(t), o = document.createDocumentFragment();
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
    const d = c.render(a, e);
    if (d instanceof HTMLElement && c.onNavigate) {
      const f = c.onNavigate.bind(c);
      d.addEventListener("mousedown", (u) => {
        f(a, e) && u.preventDefault();
      });
    }
    o.appendChild(d);
  }
  return o;
}
function Lu(n, t, e) {
  const r = Kn(t), s = [];
  for (const i of n) {
    if (i.type === "text") {
      s.push(zn(i.raw));
      continue;
    }
    const o = r.get(i.type);
    if (!o || !o.renderToHTML) {
      s.push(zn(i.raw));
      continue;
    }
    s.push(o.renderToHTML(i, e));
  }
  return s.join("");
}
function po(n, t) {
  const e = t.flatMap((o) => o.tokens).filter((o) => !o.pattern.source.startsWith("^")), r = cs(n, e), s = Kn(t), i = [];
  for (const o of r) {
    if (o.type === "text") {
      i.push(zn(o.raw));
      continue;
    }
    const a = s.get(o.type);
    if (!a || !a.renderToHTML) {
      i.push(zn(o.raw));
      continue;
    }
    const c = {
      renderInline: (d) => po(d, t)
    };
    i.push(a.renderToHTML(o, c));
  }
  return i.join("");
}
function gh(n, t) {
  const e = [];
  for (let r = 0; r < n.length; r++) {
    const s = {
      renderInline: (a) => po(a, t)
    }, o = Lu(n[r], t, s).trim();
    o ? e.push(`<div data-line="${r}">${o}</div>`) : e.push(`<div data-line="${r}"><br></div>`);
  }
  return e.join(`
`);
}
function Ru(n, t, e, r, s) {
  const i = Iu(
    n,
    t.flatMap((a) => a.tokens)
  ), o = [];
  r.innerHTML = "";
  for (let a = 0; a < i.length; a++) {
    const c = i[a].map((f) => f.raw).join("");
    o.push(c.length);
    const d = document.createElement("div");
    if (d.dataset.line = String(a), s?.has(a))
      d.textContent = c, c || d.appendChild(document.createElement("br"));
    else {
      const f = Ou(i[a], t, e);
      f.childNodes.length ? d.appendChild(f) : d.appendChild(document.createElement("br"));
    }
    r.appendChild(d);
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
function zu(n, t, e, r = {}) {
  const { editorDiv: s, placeholder: i, breadcrumb: o } = n;
  let a = -1;
  function c(p = !1, l) {
    const w = l ?? Ft(s), g = e.getYDocState(), _ = e.getCurrentPage(), v = g.getPage(_).toString();
    a = Vs(v, w);
    const x = /* @__PURE__ */ new Set([a]), T = g.awareness;
    if (T) {
      const C = g.doc.clientID;
      for (const [D, R] of T.getStates().entries())
        D !== C && R.cursor?.page === _ && R.cursor.activeLine !== void 0 && x.add(R.cursor.activeLine);
    }
    const A = e.toContext(
      r.navigateFn ?? ((C) => {
      })
    );
    A.renderInline = (C) => fo(C, t, A), Ru(v, t, A, s, x), i.style.display = v.length ? "none" : "block";
    try {
      gn(s, w);
    } catch {
    }
  }
  function d() {
    const p = window.getSelection();
    if (!p || !p.isCollapsed) return;
    const l = Ft(s), w = e.getYDocState(), g = e.getCurrentPage(), _ = w.getPage(g).toString();
    Vs(_, l) !== a && c();
  }
  function f() {
    o.innerHTML = "";
    const p = e.getTrail();
    p.forEach((l, w) => {
      if (w > 0) {
        const _ = document.createElement("span");
        _.className = "wn-crumb-sep", _.textContent = "/", o.appendChild(_);
      }
      const g = document.createElement("span");
      g.className = "wn-crumb" + (w === p.length - 1 ? " wn-crumb--active" : ""), g.textContent = dr(l), w < p.length - 1 && g.addEventListener("click", () => {
        e.truncateTrail(w);
        const _ = e.getTrail(), y = _.length <= 1 ? _[0] : _.slice(1).join("/");
        r.onBreadcrumbNavigate?.(y);
      }), o.appendChild(g);
    }), r.onTrailChange?.(e.getTrail()), u();
  }
  function u() {
    const p = e.getTrail(), l = Io(window.location.search, p);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${l}${window.location.hash}`
    );
  }
  return { render: c, renderBreadcrumb: f, syncUrlToTrail: u, checkSelectChange: d };
}
const Nu = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
function Mu(n, t, e, r) {
  let s = null;
  function i(c) {
    s = c;
  }
  async function o(c) {
    const d = n.getYDocState();
    if (!d.hasPage(c)) {
      const l = await t.get(c);
      if (l) {
        const w = d.getPage(c);
        w.toString() === "" && w.insert(0, l);
      } else
        d.getPage(c).insert(0, `# ${c}

`);
    }
    const f = n.getTrail();
    if (c === f[0]) {
      n.truncateTrail(0), await a(c);
      return;
    }
    const u = c.split("/");
    let p = 0;
    for (let l = 1; l < f.length && p < u.length && f[l] === u[p]; l++)
      p++;
    n.truncateTrail(p);
    for (let l = p; l < u.length; l++)
      n.pushTrail(u[l]);
    await a(c);
  }
  async function a(c) {
    n.setNavigating(!0);
    const d = n.getYDocState(), f = d.hasPage(c), u = d.getPage(c);
    !u.toString() && !f && (c === "home" ? u.insert(0, Nu) : u.insert(0, `# ${c}

`)), e.editorDiv.innerHTML = "", s && (s.render(!0), s.renderBreadcrumb());
    try {
      const l = document.createRange(), w = window.getSelection();
      if (w) {
        const g = e.editorDiv.querySelector('[data-line="0"]');
        g ? l.setStart(g, 0) : l.setStart(e.editorDiv, 0), l.collapse(!0), w.removeAllRanges(), w.addRange(l);
      }
    } catch {
    }
    r.onPageLoad?.(c, u.toString()), n.setNavigating(!1), e.editorDiv.focus();
  }
  return { navigateToPage: o, loadPage: a, setRenderAPI: i };
}
const go = /* @__PURE__ */ new Map();
class Uu {
  /**
   * @param {string} room
   */
  constructor(t) {
    this.room = t, this.onmessage = null, this._onChange = (e) => e.key === t && this.onmessage !== null && this.onmessage({ data: hc(e.newValue || "") }), $a(this._onChange);
  }
  /**
   * @param {ArrayBuffer} buf
   */
  postMessage(t) {
    ri.setItem(this.room, uc(ic(t)));
  }
  close() {
    Ha(this._onChange);
  }
}
const Bu = typeof BroadcastChannel > "u" ? Uu : BroadcastChannel, ls = (n) => Wt(go, n, () => {
  const t = te(), e = new Bu(n);
  return e.onmessage = (r) => t.forEach((s) => s(r.data, "broadcastchannel")), {
    bc: e,
    subs: t
  };
}), Pu = (n, t) => (ls(n).subs.add(t), t), Fu = (n, t) => {
  const e = ls(n), r = e.subs.delete(t);
  return r && e.subs.size === 0 && (e.bc.close(), go.delete(n)), r;
}, ye = (n, t, e = null) => {
  const r = ls(n);
  r.bc.postMessage(t), r.subs.forEach((s) => s(t, e));
}, mo = 0, us = 1, wo = 2, Cr = (n, t) => {
  q(n, mo);
  const e = yl(t);
  pt(n, e);
}, yo = (n, t, e) => {
  q(n, us), pt(n, Qr(t, e));
}, ju = (n, t, e) => yo(t, e, St(n)), _o = (n, t, e, r) => {
  try {
    Xr(t, St(n), e);
  } catch (s) {
    r?.(
      /** @type {Error} */
      s
    ), console.error("Caught error while handling a Yjs update", s);
  }
}, $u = (n, t) => {
  q(n, wo), pt(n, t);
}, Hu = _o, Wu = (n, t, e, r, s) => {
  const i = tt(n);
  switch (i) {
    case mo:
      ju(n, t, e);
      break;
    case us:
      _o(n, e, r, s);
      break;
    case wo:
      Hu(n, e, r, s);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return i;
}, Vu = 0, Zu = (n, t, e) => {
  tt(n) === Vu && e(t, Qt(n));
}, lr = 3e4;
class Yu extends ca {
  /**
   * @param {Y.Doc} doc
   */
  constructor(t) {
    super(), this.doc = t, this.clientID = t.clientID, this.states = /* @__PURE__ */ new Map(), this.meta = /* @__PURE__ */ new Map(), this._checkInterval = /** @type {any} */
    setInterval(() => {
      const e = ee();
      this.getLocalState() !== null && lr / 2 <= e - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated && this.setLocalState(this.getLocalState());
      const r = [];
      this.meta.forEach((s, i) => {
        i !== this.clientID && lr <= e - s.lastUpdated && this.states.has(i) && r.push(i);
      }), r.length > 0 && hs(this, r, "timeout");
    }, Mt(lr / 10)), t.on("destroy", () => {
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
      lastUpdated: ee()
    });
    const o = [], a = [], c = [], d = [];
    t === null ? d.push(e) : i == null ? t != null && o.push(e) : (a.push(e), _e(i, t) || c.push(e)), (o.length > 0 || c.length > 0 || d.length > 0) && this.emit("change", [{ added: o, updated: c, removed: d }, "local"]), this.emit("update", [{ added: o, updated: a, removed: d }, "local"]);
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
          lastUpdated: ee()
        });
      }
      r.push(i);
    }
  }
  r.length > 0 && (n.emit("change", [{ added: [], updated: [], removed: r }, e]), n.emit("update", [{ added: [], updated: [], removed: r }, e]));
}, Pe = (n, t, e = n.states) => {
  const r = t.length, s = xt();
  q(s, r);
  for (let i = 0; i < r; i++) {
    const o = t[i], a = e.get(o) || null, c = (
      /** @type {MetaClientState} */
      n.meta.get(o).clock
    );
    q(s, o), q(s, c), ce(s, JSON.stringify(a));
  }
  return ut(s);
}, Gu = (n, t, e) => {
  const r = re(t), s = ee(), i = [], o = [], a = [], c = [], d = tt(r);
  for (let f = 0; f < d; f++) {
    const u = tt(r);
    let p = tt(r);
    const l = JSON.parse(Qt(r)), w = n.meta.get(u), g = n.states.get(u), _ = w === void 0 ? 0 : w.clock;
    (_ < p || _ === p && l === null && n.states.has(u)) && (l === null ? u === n.clientID && n.getLocalState() != null ? p++ : n.states.delete(u) : n.states.set(u, l), n.meta.set(u, {
      clock: p,
      lastUpdated: s
    }), w === void 0 && l !== null ? i.push(u) : w !== void 0 && l === null ? c.push(u) : l !== null && (_e(l, g) || a.push(u), o.push(u)));
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
}, Ku = (n) => Ga(n, (t, e) => `${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join("&"), oe = 0, bo = 3, Se = 1, qu = 2, rn = [];
rn[oe] = (n, t, e, r, s) => {
  q(n, oe);
  const i = Wu(
    t,
    n,
    e.doc,
    e
  );
  r && i === us && !e.synced && (e.synced = !0);
};
rn[bo] = (n, t, e, r, s) => {
  q(n, Se), pt(
    n,
    Pe(
      e.awareness,
      Array.from(e.awareness.getStates().keys())
    )
  );
};
rn[Se] = (n, t, e, r, s) => {
  Gu(
    e.awareness,
    St(t),
    e
  );
};
rn[qu] = (n, t, e, r, s) => {
  Zu(
    t,
    e.doc,
    (i, o) => Ju(e, o)
  );
};
const Zs = 3e4, Ju = (n, t) => console.warn(`Permission denied to access ${n.url}.
${t}`), ko = (n, t, e) => {
  const r = re(t), s = xt(), i = tt(r), o = n.messageHandlers[i];
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
    vo,
    zr(
      la(2, n.wsUnsuccessfulReconnects) * 100,
      n.maxBackoffTime
    ),
    n
  ));
}, vo = (n) => {
  if (n.shouldConnect && n.ws === null) {
    const t = new n._WS(n.url, n.protocols);
    t.binaryType = "arraybuffer", n.ws = t, n.wsconnecting = !0, n.wsconnected = !1, n.synced = !1, t.onmessage = (e) => {
      n.wsLastMessageReceived = ee();
      const r = ko(n, new Uint8Array(e.data), !0);
      Nr(r) > 1 && t.send(ut(r));
    }, t.onerror = (e) => {
      n.emit("connection-error", [e, n]);
    }, t.onclose = (e) => {
      Er(n, t, e);
    }, t.onopen = () => {
      n.wsLastMessageReceived = ee(), n.wsconnecting = !1, n.wsconnected = !0, n.wsUnsuccessfulReconnects = 0, n.emit("status", [{
        status: "connected"
      }]);
      const e = xt();
      if (q(e, oe), Cr(e, n.doc), t.send(ut(e)), n.awareness.getLocalState() !== null) {
        const r = xt();
        q(r, Se), pt(
          r,
          Pe(n.awareness, [
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
class Xu extends Rr {
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
    awareness: i = new Yu(r),
    params: o = {},
    protocols: a = [],
    WebSocketPolyfill: c = WebSocket,
    resyncInterval: d = -1,
    maxBackoffTime: f = 2500,
    disableBc: u = !1
  } = {}) {
    for (super(); t[t.length - 1] === "/"; )
      t = t.slice(0, t.length - 1);
    this.serverUrl = t, this.bcChannel = t + "/" + e, this.maxBackoffTime = f, this.params = o, this.protocols = a, this.roomname = e, this.doc = r, this._WS = c, this.awareness = i, this.wsconnected = !1, this.wsconnecting = !1, this.bcconnected = !1, this.disableBc = u, this.wsUnsuccessfulReconnects = 0, this.messageHandlers = rn.slice(), this._synced = !1, this.ws = null, this.wsLastMessageReceived = 0, this.shouldConnect = s, this._resyncInterval = 0, d > 0 && (this._resyncInterval = /** @type {any} */
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const p = xt();
        q(p, oe), Cr(p, r), this.ws.send(ut(p));
      }
    }, d)), this._bcSubscriber = (p, l) => {
      if (l !== this) {
        const w = ko(this, new Uint8Array(p), !1);
        Nr(w) > 1 && ye(this.bcChannel, ut(w), this);
      }
    }, this._updateHandler = (p, l) => {
      if (l !== this) {
        const w = xt();
        q(w, oe), $u(w, p), ur(this, ut(w));
      }
    }, this.doc.on("update", this._updateHandler), this._awarenessUpdateHandler = ({ added: p, updated: l, removed: w }, g) => {
      const _ = p.concat(l).concat(w), y = xt();
      q(y, Se), pt(
        y,
        Pe(i, _)
      ), ur(this, ut(y));
    }, this._exitHandler = () => {
      hs(
        this.awareness,
        [r.clientID],
        "app closed"
      );
    }, ne && typeof process < "u" && process.on("exit", this._exitHandler), i.on("update", this._awarenessUpdateHandler), this._checkInterval = /** @type {any} */
    setInterval(() => {
      this.wsconnected && Zs < ee() - this.wsLastMessageReceived && Er(
        this,
        /** @type {WebSocket} */
        this.ws,
        null
      );
    }, Zs / 10), s && this.connect();
  }
  get url() {
    const t = Ku(this.params);
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
    this._resyncInterval !== 0 && clearInterval(this._resyncInterval), clearInterval(this._checkInterval), this.disconnect(), ne && typeof process < "u" && process.off("exit", this._exitHandler), this.awareness.off("update", this._awarenessUpdateHandler), this.doc.off("update", this._updateHandler), super.destroy();
  }
  connectBc() {
    if (this.disableBc)
      return;
    this.bcconnected || (Pu(this.bcChannel, this._bcSubscriber), this.bcconnected = !0);
    const t = xt();
    q(t, oe), Cr(t, this.doc), ye(this.bcChannel, ut(t), this);
    const e = xt();
    q(e, oe), yo(e, this.doc), ye(this.bcChannel, ut(e), this);
    const r = xt();
    q(r, bo), ye(
      this.bcChannel,
      ut(r),
      this
    );
    const s = xt();
    q(s, Se), pt(
      s,
      Pe(this.awareness, [
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
    q(t, Se), pt(
      t,
      Pe(this.awareness, [
        this.doc.clientID
      ], /* @__PURE__ */ new Map())
    ), ur(this, ut(t)), this.bcconnected && (Fu(this.bcChannel, this._bcSubscriber), this.bcconnected = !1);
  }
  disconnect() {
    this.shouldConnect = !1, this.disconnectBc(), this.ws !== null && Er(this, this.ws, null);
  }
  connect() {
    this.shouldConnect = !0, !this.wsconnected && this.ws === null && (vo(this), this.connectBc());
  }
}
const So = "__ync_update__";
async function Qu(n, t) {
  const e = Qr(n), r = eh(e);
  await t.set(So, r);
}
async function th(n, t) {
  const e = await t.get(So);
  if (e) {
    const r = nh(e);
    Xr(n, r);
  }
}
function eh(n) {
  const t = String.fromCharCode(...n);
  return btoa(t);
}
function nh(n) {
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
function rh(n) {
  return Ys[n % Ys.length] ?? "#888";
}
const mh = {
  name: "remote-cursors",
  version: "1.0.0",
  kind: "ui",
  slots: ["wn-overlay"],
  priority: 0,
  onMount(n) {
    n.style.position = "absolute", n.style.top = "0", n.style.left = "0", n.style.pointerEvents = "none", n.style.zIndex = "10";
  }
};
function sh(n, t, e, r) {
  if (n.innerHTML = "", !t) return;
  const s = t.getStates();
  for (const [i, o] of s.entries()) {
    if (i === r || !o.cursor) continue;
    const a = o.user?.color ?? rh(i), c = o.user?.name ?? `User ${i}`, d = document.createElement("div");
    d.className = "wn-remote-cursor";
    const f = document.createElement("span");
    f.className = "wn-remote-cursor-caret", f.style.backgroundColor = a;
    const u = document.createElement("span");
    u.className = "wn-remote-cursor-label", u.style.backgroundColor = a, u.textContent = c, d.appendChild(f), d.appendChild(u);
    const p = ih(e, o.cursor.offset, n);
    p && (d.style.left = `${p.left}px`, d.style.top = `${p.top}px`), n.appendChild(d);
  }
}
function ih(n, t, e) {
  let r = t;
  const s = Array.from(
    n.querySelectorAll("[data-line]")
  );
  s.sort((f, u) => parseInt(f.dataset.line ?? "0", 10) - parseInt(u.dataset.line ?? "0", 10));
  const o = e.offsetParent?.getBoundingClientRect(), a = o?.left ?? 0, c = o?.top ?? 0;
  for (const f of s) {
    const u = Fe(f);
    if (r <= u) {
      const p = f.getBoundingClientRect();
      return {
        left: p.left - a + r * 8,
        top: p.top - c
      };
    }
    r -= u + 1;
  }
  const d = s[s.length - 1];
  if (d) {
    const f = d.getBoundingClientRect();
    return {
      left: f.left - a + Fe(d) * 8,
      top: f.top - c
    };
  }
  return null;
}
function oh(n, t, e, r, s, i, o, a) {
  function c(f) {
    const u = window.getSelection();
    if (!u || !u.rangeCount) return;
    const p = u.getRangeAt(0);
    p.deleteContents();
    const l = document.createTextNode(f);
    p.insertNode(l), p.setStart(l, f.length), p.collapse(!0), u.removeAllRanges(), u.addRange(p), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  async function d() {
    const f = a.saveDebounceMs ?? 600, u = r.getYDocState();
    await th(u.doc, o);
    let p = null;
    if (a.syncServer) {
      const D = `worldnotes-${r.getCurrentPage()}`;
      p = new Xu(
        a.syncServer,
        D,
        u.doc
      ), u.setAwareness(p.awareness);
      const R = p.awareness;
      R.on("change", () => {
        sh(
          n.overlay,
          R,
          n.editorDiv,
          u.doc.clientID
        );
      }), p.on("status", (I) => {
        I.status === "connected" && s.render(!0);
      }), u.doc.on("update", (I, U) => {
        U === p && s.render(!0);
      });
    }
    const l = async () => {
      await Qu(u.doc, o);
    }, w = () => {
      r.clearSaveTimer();
      const C = setTimeout(async () => {
        await l();
        const D = r.getCurrentPage(), R = u.getPage(D);
        a.onSave?.(D, R.toString());
      }, f);
      r.setSaveTimer(C);
    };
    let g = !1;
    function _(C) {
      let D = "", R = !1;
      function I(U) {
        U.nodeType === Node.TEXT_NODE ? D += U.textContent ?? "" : U instanceof HTMLElement && (U.dataset.raw !== void 0 ? D += U.dataset.raw : (U.dataset.line !== void 0 && (R && (D += `
`), R = !0), U.childNodes.forEach(I)));
      }
      return I(C), D;
    }
    n.editorDiv.addEventListener("input", () => {
      if (r.isNavigating() || g) return;
      g = !0;
      const C = r.getCurrentPage(), D = u.getPage(C), R = _(n.editorDiv), I = D.toString();
      R !== I && u.doc.transact(() => {
        D.delete(0, I.length), D.insert(0, R);
      });
      const U = Ft(n.editorDiv);
      let K = 0;
      for (let M = 0; M < Math.min(U, R.length); M++)
        R[M] === `
` && K++;
      u.awareness?.setLocalStateField?.("cursor", { offset: U, page: C, activeLine: K }), s.render();
      for (const M of t)
        M.onUpdate?.();
      w(), g = !1;
    }), n.editorDiv.addEventListener("paste", (C) => {
      C.preventDefault();
      const D = C.clipboardData?.getData("text/plain") ?? "";
      c(D);
    }), n.editorDiv.addEventListener("keydown", (C) => {
      if ((C.ctrlKey || C.metaKey) && !C.shiftKey && C.key === "z") {
        C.preventDefault();
        const D = u.undoManager;
        D?.canUndo() && (D.undo(), s.render(!0));
        return;
      }
      if ((C.ctrlKey || C.metaKey) && C.shiftKey && C.key === "z") {
        C.preventDefault();
        const D = u.undoManager;
        D?.canRedo() && (D.redo(), s.render(!0));
        return;
      }
      if (C.ctrlKey && !C.shiftKey && C.key === "y") {
        C.preventDefault();
        const D = u.undoManager;
        D?.canRedo() && (D.redo(), s.render(!0));
        return;
      }
      {
        const D = r.getCurrentPage(), R = {
          navigate: (I) => {
            i.navigateToPage(I);
          },
          getTrail: () => r.getTrail(),
          getCurrentPage: () => r.getCurrentPage(),
          getWorld: () => u.getWorld(),
          getDoc: () => u.doc
        };
        R.renderInline = (I) => fo(I, t, R);
        for (const I of t) {
          if (!I.onKeydown) continue;
          const U = I.onKeydown(C, R);
          if (U !== void 0 && U !== !1 && "cursorOffset" in U) {
            C.preventDefault(), s.render(!0, U.cursorOffset);
            const K = u.getPage(D).toString();
            let S = 0;
            for (let m = 0; m < Math.min(U.cursorOffset, K.length); m++)
              K[m] === `
` && S++;
            u.awareness?.setLocalStateField?.("cursor", { offset: U.cursorOffset, page: D, activeLine: S }), w();
            return;
          }
        }
      }
      if (C.key === "Tab")
        C.preventDefault(), c("  ");
      else if (C.key === "Enter")
        C.preventDefault(), c(`
`);
      else if (C.key === "Backspace") {
        C.preventDefault();
        const D = window.getSelection();
        if (!D || !D.rangeCount) return;
        const R = D.getRangeAt(0);
        if (!R.collapsed) {
          R.deleteContents(), D.removeAllRanges(), D.addRange(R), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
          return;
        }
        const I = Ft(n.editorDiv);
        if (I > 0) {
          const U = r.getCurrentPage(), K = u.getPage(U), S = K.toString(), M = S.slice(0, I - 1) + S.slice(I);
          u.doc.transact(() => {
            K.delete(0, S.length), K.insert(0, M);
          }), s.render(), gn(n.editorDiv, I - 1), w();
        }
      }
    });
    let y = !1;
    document.addEventListener("selectionchange", () => {
      g || y || r.isNavigating() || (y = !0, requestAnimationFrame(() => {
        y = !1, s.checkSelectChange();
      }));
    });
    const v = r.getCurrentPage();
    await i.loadPage(v);
    const x = u.getPage(v), T = new Dl(x, { captureTimeout: 0 });
    u.setUndoManager(T);
    const A = {
      "wn-toolbar": n.toolbar,
      "wn-overlay": n.overlay
    };
    for (const C of e)
      for (const D of C.slots) {
        const R = A[D];
        R && C.onMount(R);
      }
    return {
      destroy() {
        r.clearSaveTimer(), p?.destroy();
        for (const C of t)
          try {
            C.onDestroy?.();
          } catch (D) {
            console.error(`Plugin "${C.name}" onDestroy failed:`, D);
          }
        for (const C of e)
          try {
            C.onDestroy?.();
          } catch (D) {
            console.error(`UI plugin "${C.name}" onDestroy failed:`, D);
          }
        u.destroy(), n.container.innerHTML = "";
      },
      navigate(C) {
        i.navigateToPage(C);
      },
      getCurrentPage() {
        return r.getCurrentPage();
      },
      getTrail() {
        return r.getTrail();
      },
      getContent() {
        const C = r.getCurrentPage();
        return u.getPage(C).toString();
      },
      setContent(C) {
        const D = r.getCurrentPage(), R = u.getPage(D);
        u.doc.transact(() => {
          R.delete(0, R.length), R.insert(0, C);
        }), s.render(!0);
      },
      undo() {
        const C = u.undoManager;
        return C?.canUndo() ? (C.undo(), s.render(!0), !0) : !1;
      },
      redo() {
        const C = u.undoManager;
        return C?.canRedo() ? (C.redo(), s.render(!0), !0) : !1;
      },
      canUndo() {
        return u.undoManager?.canUndo() ?? !1;
      },
      canRedo() {
        return u.undoManager?.canRedo() ?? !1;
      },
      insertText(C) {
        c(C);
      },
      deleteForward() {
        const C = window.getSelection();
        if (!C || !C.rangeCount) return;
        if (C.isCollapsed)
          try {
            C.modify("extend", "forward", "character");
          } catch {
            const R = r.getCurrentPage(), I = u.getPage(R).toString(), U = Ft(n.editorDiv);
            if (U >= I.length) return;
            const K = I.slice(0, U) + I.slice(U + 1);
            u.getPage(R).delete(0, I.length), u.getPage(R).insert(0, K), s.render(!0), gn(n.editorDiv, U);
            return;
          }
        const D = C.getRangeAt(0);
        D.deleteContents(), C.removeAllRanges(), C.addRange(D), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      deleteBackward() {
        const C = window.getSelection();
        if (!C || !C.rangeCount) return;
        if (C.isCollapsed)
          try {
            C.modify("extend", "backward", "character");
          } catch {
            const R = r.getCurrentPage(), I = u.getPage(R).toString(), U = Ft(n.editorDiv);
            if (U <= 0) return;
            const K = I.slice(0, U - 1) + I.slice(U);
            u.getPage(R).delete(0, I.length), u.getPage(R).insert(0, K), s.render(!0), gn(n.editorDiv, U - 1);
            return;
          }
        const D = C.getRangeAt(0);
        D.deleteContents(), C.removeAllRanges(), C.addRange(D), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      getSelection() {
        const C = window.getSelection();
        if (!C || !C.rangeCount) return null;
        const D = C.toString(), R = Ft(n.editorDiv), I = R + D.length;
        return { text: D, start: R, end: Math.max(R, I) };
      }
    };
  }
  return { mount: d };
}
class ah {
  constructor(t, e = {}) {
    this.registry = new ra(), this.storage = new To(), this.options = {}, this._mounted = !1, this._slotElements = null, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
    for (const r of ea)
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
    const t = this.registry.allUIPlugins().sort((r, s) => (r.priority ?? 0) - (s.priority ?? 0)), e = await ch(
      this.el,
      this.registry.allContentPlugins(),
      t,
      this.storage,
      this.options
    );
    return this._mounted = !0, this._slotElements = {
      "wn-toolbar": this.el.querySelector(".wn-toolbar")
    }, e;
  }
}
function wh(n, t = {}) {
  return new ah(n, t);
}
async function ch(n, t, e, r, s) {
  const i = xu(r, s), o = Au(n, s.theme), a = Mu(i, r, o, s), c = {
    navigateFn: (u) => {
      a.navigateToPage(u);
    },
    onBreadcrumbNavigate: (u) => {
      a.loadPage(u);
    },
    onTrailChange: s.onTrailChange
  }, d = zu(o, t, i, c);
  return a.setRenderAPI(d), oh(
    o,
    t,
    e,
    i,
    d,
    a,
    r,
    s
  ).mount();
}
const lh = "worldnotes", ie = "pages";
class yh {
  constructor(t = lh) {
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
class _h {
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
function uh(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
function pn(n) {
  throw new Error('Could not dynamically require "' + n + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var hr = { exports: {} };
var Gs;
function hh() {
  return Gs || (Gs = 1, (function(n, t) {
    (function(e) {
      n.exports = e();
    })(function() {
      return (function e(r, s, i) {
        function o(d, f) {
          if (!s[d]) {
            if (!r[d]) {
              var u = typeof pn == "function" && pn;
              if (!f && u) return u(d, !0);
              if (a) return a(d, !0);
              var p = new Error("Cannot find module '" + d + "'");
              throw p.code = "MODULE_NOT_FOUND", p;
            }
            var l = s[d] = { exports: {} };
            r[d][0].call(l.exports, function(w) {
              var g = r[d][1][w];
              return o(g || w);
            }, l, l.exports, e, r, s, i);
          }
          return s[d].exports;
        }
        for (var a = typeof pn == "function" && pn, c = 0; c < i.length; c++) o(i[c]);
        return o;
      })({ 1: [function(e, r, s) {
        var i = e("./utils"), o = e("./support"), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        s.encode = function(c) {
          for (var d, f, u, p, l, w, g, _ = [], y = 0, v = c.length, x = v, T = i.getTypeOf(c) !== "string"; y < c.length; ) x = v - y, u = T ? (d = c[y++], f = y < v ? c[y++] : 0, y < v ? c[y++] : 0) : (d = c.charCodeAt(y++), f = y < v ? c.charCodeAt(y++) : 0, y < v ? c.charCodeAt(y++) : 0), p = d >> 2, l = (3 & d) << 4 | f >> 4, w = 1 < x ? (15 & f) << 2 | u >> 6 : 64, g = 2 < x ? 63 & u : 64, _.push(a.charAt(p) + a.charAt(l) + a.charAt(w) + a.charAt(g));
          return _.join("");
        }, s.decode = function(c) {
          var d, f, u, p, l, w, g = 0, _ = 0, y = "data:";
          if (c.substr(0, y.length) === y) throw new Error("Invalid base64 input, it looks like a data url.");
          var v, x = 3 * (c = c.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (c.charAt(c.length - 1) === a.charAt(64) && x--, c.charAt(c.length - 2) === a.charAt(64) && x--, x % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (v = o.uint8array ? new Uint8Array(0 | x) : new Array(0 | x); g < c.length; ) d = a.indexOf(c.charAt(g++)) << 2 | (p = a.indexOf(c.charAt(g++))) >> 4, f = (15 & p) << 4 | (l = a.indexOf(c.charAt(g++))) >> 2, u = (3 & l) << 6 | (w = a.indexOf(c.charAt(g++))), v[_++] = d, l !== 64 && (v[_++] = f), w !== 64 && (v[_++] = u);
          return v;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(e, r, s) {
        var i = e("./external"), o = e("./stream/DataWorker"), a = e("./stream/Crc32Probe"), c = e("./stream/DataLengthProbe");
        function d(f, u, p, l, w) {
          this.compressedSize = f, this.uncompressedSize = u, this.crc32 = p, this.compression = l, this.compressedContent = w;
        }
        d.prototype = { getContentWorker: function() {
          var f = new o(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new c("data_length")), u = this;
          return f.on("end", function() {
            if (this.streamInfo.data_length !== u.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), f;
        }, getCompressedWorker: function() {
          return new o(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, d.createWorkerFrom = function(f, u, p) {
          return f.pipe(new a()).pipe(new c("uncompressedSize")).pipe(u.compressWorker(p)).pipe(new c("compressedSize")).withStreamInfo("compression", u);
        }, r.exports = d;
      }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(e, r, s) {
        var i = e("./stream/GenericWorker");
        s.STORE = { magic: "\0\0", compressWorker: function() {
          return new i("STORE compression");
        }, uncompressWorker: function() {
          return new i("STORE decompression");
        } }, s.DEFLATE = e("./flate");
      }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(e, r, s) {
        var i = e("./utils"), o = (function() {
          for (var a, c = [], d = 0; d < 256; d++) {
            a = d;
            for (var f = 0; f < 8; f++) a = 1 & a ? 3988292384 ^ a >>> 1 : a >>> 1;
            c[d] = a;
          }
          return c;
        })();
        r.exports = function(a, c) {
          return a !== void 0 && a.length ? i.getTypeOf(a) !== "string" ? (function(d, f, u, p) {
            var l = o, w = p + u;
            d ^= -1;
            for (var g = p; g < w; g++) d = d >>> 8 ^ l[255 & (d ^ f[g])];
            return -1 ^ d;
          })(0 | c, a, a.length, 0) : (function(d, f, u, p) {
            var l = o, w = p + u;
            d ^= -1;
            for (var g = p; g < w; g++) d = d >>> 8 ^ l[255 & (d ^ f.charCodeAt(g))];
            return -1 ^ d;
          })(0 | c, a, a.length, 0) : 0;
        };
      }, { "./utils": 32 }], 5: [function(e, r, s) {
        s.base64 = !1, s.binary = !1, s.dir = !1, s.createFolders = !0, s.date = null, s.compression = null, s.compressionOptions = null, s.comment = null, s.unixPermissions = null, s.dosPermissions = null;
      }, {}], 6: [function(e, r, s) {
        var i = null;
        i = typeof Promise < "u" ? Promise : e("lie"), r.exports = { Promise: i };
      }, { lie: 37 }], 7: [function(e, r, s) {
        var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", o = e("pako"), a = e("./utils"), c = e("./stream/GenericWorker"), d = i ? "uint8array" : "array";
        function f(u, p) {
          c.call(this, "FlateWorker/" + u), this._pako = null, this._pakoAction = u, this._pakoOptions = p, this.meta = {};
        }
        s.magic = "\b\0", a.inherits(f, c), f.prototype.processChunk = function(u) {
          this.meta = u.meta, this._pako === null && this._createPako(), this._pako.push(a.transformTo(d, u.data), !1);
        }, f.prototype.flush = function() {
          c.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
        }, f.prototype.cleanUp = function() {
          c.prototype.cleanUp.call(this), this._pako = null;
        }, f.prototype._createPako = function() {
          this._pako = new o[this._pakoAction]({ raw: !0, level: this._pakoOptions.level || -1 });
          var u = this;
          this._pako.onData = function(p) {
            u.push({ data: p, meta: u.meta });
          };
        }, s.compressWorker = function(u) {
          return new f("Deflate", u);
        }, s.uncompressWorker = function() {
          return new f("Inflate", {});
        };
      }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, r, s) {
        function i(l, w) {
          var g, _ = "";
          for (g = 0; g < w; g++) _ += String.fromCharCode(255 & l), l >>>= 8;
          return _;
        }
        function o(l, w, g, _, y, v) {
          var x, T, A = l.file, C = l.compression, D = v !== d.utf8encode, R = a.transformTo("string", v(A.name)), I = a.transformTo("string", d.utf8encode(A.name)), U = A.comment, K = a.transformTo("string", v(U)), S = a.transformTo("string", d.utf8encode(U)), M = I.length !== A.name.length, m = S.length !== U.length, P = "", et = "", $ = "", nt = A.dir, H = A.date, Q = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          w && !g || (Q.crc32 = l.crc32, Q.compressedSize = l.compressedSize, Q.uncompressedSize = l.uncompressedSize);
          var z = 0;
          w && (z |= 8), D || !M && !m || (z |= 2048);
          var L = 0, X = 0;
          nt && (L |= 16), y === "UNIX" ? (X = 798, L |= (function(Z, ht) {
            var vt = Z;
            return Z || (vt = ht ? 16893 : 33204), (65535 & vt) << 16;
          })(A.unixPermissions, nt)) : (X = 20, L |= (function(Z) {
            return 63 & (Z || 0);
          })(A.dosPermissions)), x = H.getUTCHours(), x <<= 6, x |= H.getUTCMinutes(), x <<= 5, x |= H.getUTCSeconds() / 2, T = H.getUTCFullYear() - 1980, T <<= 4, T |= H.getUTCMonth() + 1, T <<= 5, T |= H.getUTCDate(), M && (et = i(1, 1) + i(f(R), 4) + I, P += "up" + i(et.length, 2) + et), m && ($ = i(1, 1) + i(f(K), 4) + S, P += "uc" + i($.length, 2) + $);
          var Y = "";
          return Y += `
\0`, Y += i(z, 2), Y += C.magic, Y += i(x, 2), Y += i(T, 2), Y += i(Q.crc32, 4), Y += i(Q.compressedSize, 4), Y += i(Q.uncompressedSize, 4), Y += i(R.length, 2), Y += i(P.length, 2), { fileRecord: u.LOCAL_FILE_HEADER + Y + R + P, dirRecord: u.CENTRAL_FILE_HEADER + i(X, 2) + Y + i(K.length, 2) + "\0\0\0\0" + i(L, 4) + i(_, 4) + R + P + K };
        }
        var a = e("../utils"), c = e("../stream/GenericWorker"), d = e("../utf8"), f = e("../crc32"), u = e("../signature");
        function p(l, w, g, _) {
          c.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = w, this.zipPlatform = g, this.encodeFileName = _, this.streamFiles = l, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        a.inherits(p, c), p.prototype.push = function(l) {
          var w = l.meta.percent || 0, g = this.entriesCount, _ = this._sources.length;
          this.accumulate ? this.contentBuffer.push(l) : (this.bytesWritten += l.data.length, c.prototype.push.call(this, { data: l.data, meta: { currentFile: this.currentFile, percent: g ? (w + 100 * (g - _ - 1)) / g : 100 } }));
        }, p.prototype.openedSource = function(l) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = l.file.name;
          var w = this.streamFiles && !l.file.dir;
          if (w) {
            var g = o(l, w, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: g.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = !0;
        }, p.prototype.closedSource = function(l) {
          this.accumulate = !1;
          var w = this.streamFiles && !l.file.dir, g = o(l, w, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(g.dirRecord), w) this.push({ data: (function(_) {
            return u.DATA_DESCRIPTOR + i(_.crc32, 4) + i(_.compressedSize, 4) + i(_.uncompressedSize, 4);
          })(l), meta: { percent: 100 } });
          else for (this.push({ data: g.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, p.prototype.flush = function() {
          for (var l = this.bytesWritten, w = 0; w < this.dirRecords.length; w++) this.push({ data: this.dirRecords[w], meta: { percent: 100 } });
          var g = this.bytesWritten - l, _ = (function(y, v, x, T, A) {
            var C = a.transformTo("string", A(T));
            return u.CENTRAL_DIRECTORY_END + "\0\0\0\0" + i(y, 2) + i(y, 2) + i(v, 4) + i(x, 4) + i(C.length, 2) + C;
          })(this.dirRecords.length, g, l, this.zipComment, this.encodeFileName);
          this.push({ data: _, meta: { percent: 100 } });
        }, p.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, p.prototype.registerPrevious = function(l) {
          this._sources.push(l);
          var w = this;
          return l.on("data", function(g) {
            w.processChunk(g);
          }), l.on("end", function() {
            w.closedSource(w.previous.streamInfo), w._sources.length ? w.prepareNextSource() : w.end();
          }), l.on("error", function(g) {
            w.error(g);
          }), this;
        }, p.prototype.resume = function() {
          return !!c.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
        }, p.prototype.error = function(l) {
          var w = this._sources;
          if (!c.prototype.error.call(this, l)) return !1;
          for (var g = 0; g < w.length; g++) try {
            w[g].error(l);
          } catch {
          }
          return !0;
        }, p.prototype.lock = function() {
          c.prototype.lock.call(this);
          for (var l = this._sources, w = 0; w < l.length; w++) l[w].lock();
        }, r.exports = p;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, r, s) {
        var i = e("../compressions"), o = e("./ZipFileWorker");
        s.generateWorker = function(a, c, d) {
          var f = new o(c.streamFiles, d, c.platform, c.encodeFileName), u = 0;
          try {
            a.forEach(function(p, l) {
              u++;
              var w = (function(v, x) {
                var T = v || x, A = i[T];
                if (!A) throw new Error(T + " is not a valid compression method !");
                return A;
              })(l.options.compression, c.compression), g = l.options.compressionOptions || c.compressionOptions || {}, _ = l.dir, y = l.date;
              l._compressWorker(w, g).withStreamInfo("file", { name: p, dir: _, date: y, comment: l.comment || "", unixPermissions: l.unixPermissions, dosPermissions: l.dosPermissions }).pipe(f);
            }), f.entriesCount = u;
          } catch (p) {
            f.error(p);
          }
          return f;
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
        var i = e("./utils"), o = e("./external"), a = e("./utf8"), c = e("./zipEntries"), d = e("./stream/Crc32Probe"), f = e("./nodejsUtils");
        function u(p) {
          return new o.Promise(function(l, w) {
            var g = p.decompressed.getContentWorker().pipe(new d());
            g.on("error", function(_) {
              w(_);
            }).on("end", function() {
              g.streamInfo.crc32 !== p.decompressed.crc32 ? w(new Error("Corrupted zip : CRC32 mismatch")) : l();
            }).resume();
          });
        }
        r.exports = function(p, l) {
          var w = this;
          return l = i.extend(l || {}, { base64: !1, checkCRC32: !1, optimizedBinaryString: !1, createFolders: !1, decodeFileName: a.utf8decode }), f.isNode && f.isStream(p) ? o.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : i.prepareContent("the loaded zip file", p, !0, l.optimizedBinaryString, l.base64).then(function(g) {
            var _ = new c(l);
            return _.load(g), _;
          }).then(function(g) {
            var _ = [o.Promise.resolve(g)], y = g.files;
            if (l.checkCRC32) for (var v = 0; v < y.length; v++) _.push(u(y[v]));
            return o.Promise.all(_);
          }).then(function(g) {
            for (var _ = g.shift(), y = _.files, v = 0; v < y.length; v++) {
              var x = y[v], T = x.fileNameStr, A = i.resolve(x.fileNameStr);
              w.file(A, x.decompressed, { binary: !0, optimizedBinaryString: !0, date: x.date, dir: x.dir, comment: x.fileCommentStr.length ? x.fileCommentStr : null, unixPermissions: x.unixPermissions, dosPermissions: x.dosPermissions, createFolders: l.createFolders }), x.dir || (w.file(A).unsafeOriginalName = T);
            }
            return _.zipComment.length && (w.comment = _.zipComment), w;
          });
        };
      }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, r, s) {
        var i = e("../utils"), o = e("../stream/GenericWorker");
        function a(c, d) {
          o.call(this, "Nodejs stream input adapter for " + c), this._upstreamEnded = !1, this._bindStream(d);
        }
        i.inherits(a, o), a.prototype._bindStream = function(c) {
          var d = this;
          (this._stream = c).pause(), c.on("data", function(f) {
            d.push({ data: f, meta: { percent: 0 } });
          }).on("error", function(f) {
            d.isPaused ? this.generatedError = f : d.error(f);
          }).on("end", function() {
            d.isPaused ? d._upstreamEnded = !0 : d.end();
          });
        }, a.prototype.pause = function() {
          return !!o.prototype.pause.call(this) && (this._stream.pause(), !0);
        }, a.prototype.resume = function() {
          return !!o.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), !0);
        }, r.exports = a;
      }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(e, r, s) {
        var i = e("readable-stream").Readable;
        function o(a, c, d) {
          i.call(this, c), this._helper = a;
          var f = this;
          a.on("data", function(u, p) {
            f.push(u) || f._helper.pause(), d && d(p);
          }).on("error", function(u) {
            f.emit("error", u);
          }).on("end", function() {
            f.push(null);
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
        function i(A, C, D) {
          var R, I = a.getTypeOf(C), U = a.extend(D || {}, f);
          U.date = U.date || /* @__PURE__ */ new Date(), U.compression !== null && (U.compression = U.compression.toUpperCase()), typeof U.unixPermissions == "string" && (U.unixPermissions = parseInt(U.unixPermissions, 8)), U.unixPermissions && 16384 & U.unixPermissions && (U.dir = !0), U.dosPermissions && 16 & U.dosPermissions && (U.dir = !0), U.dir && (A = y(A)), U.createFolders && (R = _(A)) && v.call(this, R, !0);
          var K = I === "string" && U.binary === !1 && U.base64 === !1;
          D && D.binary !== void 0 || (U.binary = !K), (C instanceof u && C.uncompressedSize === 0 || U.dir || !C || C.length === 0) && (U.base64 = !1, U.binary = !0, C = "", U.compression = "STORE", I = "string");
          var S = null;
          S = C instanceof u || C instanceof c ? C : w.isNode && w.isStream(C) ? new g(A, C) : a.prepareContent(A, C, U.binary, U.optimizedBinaryString, U.base64);
          var M = new p(A, S, U);
          this.files[A] = M;
        }
        var o = e("./utf8"), a = e("./utils"), c = e("./stream/GenericWorker"), d = e("./stream/StreamHelper"), f = e("./defaults"), u = e("./compressedObject"), p = e("./zipObject"), l = e("./generate"), w = e("./nodejsUtils"), g = e("./nodejs/NodejsStreamInputAdapter"), _ = function(A) {
          A.slice(-1) === "/" && (A = A.substring(0, A.length - 1));
          var C = A.lastIndexOf("/");
          return 0 < C ? A.substring(0, C) : "";
        }, y = function(A) {
          return A.slice(-1) !== "/" && (A += "/"), A;
        }, v = function(A, C) {
          return C = C !== void 0 ? C : f.createFolders, A = y(A), this.files[A] || i.call(this, A, null, { dir: !0, createFolders: C }), this.files[A];
        };
        function x(A) {
          return Object.prototype.toString.call(A) === "[object RegExp]";
        }
        var T = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(A) {
          var C, D, R;
          for (C in this.files) R = this.files[C], (D = C.slice(this.root.length, C.length)) && C.slice(0, this.root.length) === this.root && A(D, R);
        }, filter: function(A) {
          var C = [];
          return this.forEach(function(D, R) {
            A(D, R) && C.push(R);
          }), C;
        }, file: function(A, C, D) {
          if (arguments.length !== 1) return A = this.root + A, i.call(this, A, C, D), this;
          if (x(A)) {
            var R = A;
            return this.filter(function(U, K) {
              return !K.dir && R.test(U);
            });
          }
          var I = this.files[this.root + A];
          return I && !I.dir ? I : null;
        }, folder: function(A) {
          if (!A) return this;
          if (x(A)) return this.filter(function(I, U) {
            return U.dir && A.test(I);
          });
          var C = this.root + A, D = v.call(this, C), R = this.clone();
          return R.root = D.name, R;
        }, remove: function(A) {
          A = this.root + A;
          var C = this.files[A];
          if (C || (A.slice(-1) !== "/" && (A += "/"), C = this.files[A]), C && !C.dir) delete this.files[A];
          else for (var D = this.filter(function(I, U) {
            return U.name.slice(0, A.length) === A;
          }), R = 0; R < D.length; R++) delete this.files[D[R].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(A) {
          var C, D = {};
          try {
            if ((D = a.extend(A || {}, { streamFiles: !1, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: o.utf8encode })).type = D.type.toLowerCase(), D.compression = D.compression.toUpperCase(), D.type === "binarystring" && (D.type = "string"), !D.type) throw new Error("No output type specified.");
            a.checkSupport(D.type), D.platform !== "darwin" && D.platform !== "freebsd" && D.platform !== "linux" && D.platform !== "sunos" || (D.platform = "UNIX"), D.platform === "win32" && (D.platform = "DOS");
            var R = D.comment || this.comment || "";
            C = l.generateWorker(this, D, R);
          } catch (I) {
            (C = new c("error")).error(I);
          }
          return new d(C, D.type || "string", D.mimeType);
        }, generateAsync: function(A, C) {
          return this.generateInternalStream(A).accumulate(C);
        }, generateNodeStream: function(A, C) {
          return (A = A || {}).type || (A.type = "nodebuffer"), this.generateInternalStream(A).toNodejsStream(C);
        } };
        r.exports = T;
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
          for (var c = a.charCodeAt(0), d = a.charCodeAt(1), f = a.charCodeAt(2), u = a.charCodeAt(3), p = this.length - 4; 0 <= p; --p) if (this.data[p] === c && this.data[p + 1] === d && this.data[p + 2] === f && this.data[p + 3] === u) return p - this.zero;
          return -1;
        }, o.prototype.readAndCheckSignature = function(a) {
          var c = a.charCodeAt(0), d = a.charCodeAt(1), f = a.charCodeAt(2), u = a.charCodeAt(3), p = this.readData(4);
          return c === p[0] && d === p[1] && f === p[2] && u === p[3];
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
          var c, d = 0;
          for (this.checkOffset(a), c = this.index + a - 1; c >= this.index; c--) d = (d << 8) + this.byteAt(c);
          return this.index += a, d;
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
        var i = e("../utils"), o = e("../support"), a = e("./ArrayReader"), c = e("./StringReader"), d = e("./NodeBufferReader"), f = e("./Uint8ArrayReader");
        r.exports = function(u) {
          var p = i.getTypeOf(u);
          return i.checkSupport(p), p !== "string" || o.uint8array ? p === "nodebuffer" ? new d(u) : o.uint8array ? new f(i.transformTo("uint8array", u)) : new a(i.transformTo("array", u)) : new c(u);
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
            var d = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = d + c.data.length;
          }
          o.prototype.processChunk.call(this, c);
        }, r.exports = a;
      }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, r, s) {
        var i = e("../utils"), o = e("./GenericWorker");
        function a(c) {
          o.call(this, "DataWorker");
          var d = this;
          this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, c.then(function(f) {
            d.dataIsReady = !0, d.data = f, d.max = f && f.length || 0, d.type = i.getTypeOf(f), d.isPaused || d._tickAndRepeat();
          }, function(f) {
            d.error(f);
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
          var c = null, d = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              c = this.data.substring(this.index, d);
              break;
            case "uint8array":
              c = this.data.subarray(this.index, d);
              break;
            case "array":
            case "nodebuffer":
              c = this.data.slice(this.index, d);
          }
          return this.index = d, this.push({ data: c, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
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
        var i = e("../utils"), o = e("./ConvertWorker"), a = e("./GenericWorker"), c = e("../base64"), d = e("../support"), f = e("../external"), u = null;
        if (d.nodestream) try {
          u = e("../nodejs/NodejsStreamOutputAdapter");
        } catch {
        }
        function p(w, g) {
          return new f.Promise(function(_, y) {
            var v = [], x = w._internalType, T = w._outputType, A = w._mimeType;
            w.on("data", function(C, D) {
              v.push(C), g && g(D);
            }).on("error", function(C) {
              v = [], y(C);
            }).on("end", function() {
              try {
                var C = (function(D, R, I) {
                  switch (D) {
                    case "blob":
                      return i.newBlob(i.transformTo("arraybuffer", R), I);
                    case "base64":
                      return c.encode(R);
                    default:
                      return i.transformTo(D, R);
                  }
                })(T, (function(D, R) {
                  var I, U = 0, K = null, S = 0;
                  for (I = 0; I < R.length; I++) S += R[I].length;
                  switch (D) {
                    case "string":
                      return R.join("");
                    case "array":
                      return Array.prototype.concat.apply([], R);
                    case "uint8array":
                      for (K = new Uint8Array(S), I = 0; I < R.length; I++) K.set(R[I], U), U += R[I].length;
                      return K;
                    case "nodebuffer":
                      return Buffer.concat(R);
                    default:
                      throw new Error("concat : unsupported type '" + D + "'");
                  }
                })(x, v), A);
                _(C);
              } catch (D) {
                y(D);
              }
              v = [];
            }).resume();
          });
        }
        function l(w, g, _) {
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
          } catch (v) {
            this._worker = new a("error"), this._worker.error(v);
          }
        }
        l.prototype = { accumulate: function(w) {
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
          return new u(this, { objectMode: this._outputType !== "nodebuffer" }, w);
        } }, r.exports = l;
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
        for (var i = e("./utils"), o = e("./support"), a = e("./nodejsUtils"), c = e("./stream/GenericWorker"), d = new Array(256), f = 0; f < 256; f++) d[f] = 252 <= f ? 6 : 248 <= f ? 5 : 240 <= f ? 4 : 224 <= f ? 3 : 192 <= f ? 2 : 1;
        d[254] = d[254] = 1;
        function u() {
          c.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function p() {
          c.call(this, "utf-8 encode");
        }
        s.utf8encode = function(l) {
          return o.nodebuffer ? a.newBufferFrom(l, "utf-8") : (function(w) {
            var g, _, y, v, x, T = w.length, A = 0;
            for (v = 0; v < T; v++) (64512 & (_ = w.charCodeAt(v))) == 55296 && v + 1 < T && (64512 & (y = w.charCodeAt(v + 1))) == 56320 && (_ = 65536 + (_ - 55296 << 10) + (y - 56320), v++), A += _ < 128 ? 1 : _ < 2048 ? 2 : _ < 65536 ? 3 : 4;
            for (g = o.uint8array ? new Uint8Array(A) : new Array(A), v = x = 0; x < A; v++) (64512 & (_ = w.charCodeAt(v))) == 55296 && v + 1 < T && (64512 & (y = w.charCodeAt(v + 1))) == 56320 && (_ = 65536 + (_ - 55296 << 10) + (y - 56320), v++), _ < 128 ? g[x++] = _ : (_ < 2048 ? g[x++] = 192 | _ >>> 6 : (_ < 65536 ? g[x++] = 224 | _ >>> 12 : (g[x++] = 240 | _ >>> 18, g[x++] = 128 | _ >>> 12 & 63), g[x++] = 128 | _ >>> 6 & 63), g[x++] = 128 | 63 & _);
            return g;
          })(l);
        }, s.utf8decode = function(l) {
          return o.nodebuffer ? i.transformTo("nodebuffer", l).toString("utf-8") : (function(w) {
            var g, _, y, v, x = w.length, T = new Array(2 * x);
            for (g = _ = 0; g < x; ) if ((y = w[g++]) < 128) T[_++] = y;
            else if (4 < (v = d[y])) T[_++] = 65533, g += v - 1;
            else {
              for (y &= v === 2 ? 31 : v === 3 ? 15 : 7; 1 < v && g < x; ) y = y << 6 | 63 & w[g++], v--;
              1 < v ? T[_++] = 65533 : y < 65536 ? T[_++] = y : (y -= 65536, T[_++] = 55296 | y >> 10 & 1023, T[_++] = 56320 | 1023 & y);
            }
            return T.length !== _ && (T.subarray ? T = T.subarray(0, _) : T.length = _), i.applyFromCharCode(T);
          })(l = i.transformTo(o.uint8array ? "uint8array" : "array", l));
        }, i.inherits(u, c), u.prototype.processChunk = function(l) {
          var w = i.transformTo(o.uint8array ? "uint8array" : "array", l.data);
          if (this.leftOver && this.leftOver.length) {
            if (o.uint8array) {
              var g = w;
              (w = new Uint8Array(g.length + this.leftOver.length)).set(this.leftOver, 0), w.set(g, this.leftOver.length);
            } else w = this.leftOver.concat(w);
            this.leftOver = null;
          }
          var _ = (function(v, x) {
            var T;
            for ((x = x || v.length) > v.length && (x = v.length), T = x - 1; 0 <= T && (192 & v[T]) == 128; ) T--;
            return T < 0 || T === 0 ? x : T + d[v[T]] > x ? T : x;
          })(w), y = w;
          _ !== w.length && (o.uint8array ? (y = w.subarray(0, _), this.leftOver = w.subarray(_, w.length)) : (y = w.slice(0, _), this.leftOver = w.slice(_, w.length))), this.push({ data: s.utf8decode(y), meta: l.meta });
        }, u.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, s.Utf8DecodeWorker = u, i.inherits(p, c), p.prototype.processChunk = function(l) {
          this.push({ data: s.utf8encode(l.data), meta: l.meta });
        }, s.Utf8EncodeWorker = p;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, r, s) {
        var i = e("./support"), o = e("./base64"), a = e("./nodejsUtils"), c = e("./external");
        function d(g) {
          return g;
        }
        function f(g, _) {
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
        var u = { stringifyByChunk: function(g, _, y) {
          var v = [], x = 0, T = g.length;
          if (T <= y) return String.fromCharCode.apply(null, g);
          for (; x < T; ) _ === "array" || _ === "nodebuffer" ? v.push(String.fromCharCode.apply(null, g.slice(x, Math.min(x + y, T)))) : v.push(String.fromCharCode.apply(null, g.subarray(x, Math.min(x + y, T)))), x += y;
          return v.join("");
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
          var _ = 65536, y = s.getTypeOf(g), v = !0;
          if (y === "uint8array" ? v = u.applyCanBeUsed.uint8array : y === "nodebuffer" && (v = u.applyCanBeUsed.nodebuffer), v) for (; 1 < _; ) try {
            return u.stringifyByChunk(g, y, _);
          } catch {
            _ = Math.floor(_ / 2);
          }
          return u.stringifyByChar(g);
        }
        function l(g, _) {
          for (var y = 0; y < g.length; y++) _[y] = g[y];
          return _;
        }
        s.applyFromCharCode = p;
        var w = {};
        w.string = { string: d, array: function(g) {
          return f(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return w.string.uint8array(g).buffer;
        }, uint8array: function(g) {
          return f(g, new Uint8Array(g.length));
        }, nodebuffer: function(g) {
          return f(g, a.allocBuffer(g.length));
        } }, w.array = { string: p, array: d, arraybuffer: function(g) {
          return new Uint8Array(g).buffer;
        }, uint8array: function(g) {
          return new Uint8Array(g);
        }, nodebuffer: function(g) {
          return a.newBufferFrom(g);
        } }, w.arraybuffer = { string: function(g) {
          return p(new Uint8Array(g));
        }, array: function(g) {
          return l(new Uint8Array(g), new Array(g.byteLength));
        }, arraybuffer: d, uint8array: function(g) {
          return new Uint8Array(g);
        }, nodebuffer: function(g) {
          return a.newBufferFrom(new Uint8Array(g));
        } }, w.uint8array = { string: p, array: function(g) {
          return l(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return g.buffer;
        }, uint8array: d, nodebuffer: function(g) {
          return a.newBufferFrom(g);
        } }, w.nodebuffer = { string: p, array: function(g) {
          return l(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return w.nodebuffer.uint8array(g).buffer;
        }, uint8array: function(g) {
          return l(g, new Uint8Array(g.length));
        }, nodebuffer: d }, s.transformTo = function(g, _) {
          if (_ = _ || "", !g) return _;
          s.checkSupport(g);
          var y = s.getTypeOf(_);
          return w[y][g](_);
        }, s.resolve = function(g) {
          for (var _ = g.split("/"), y = [], v = 0; v < _.length; v++) {
            var x = _[v];
            x === "." || x === "" && v !== 0 && v !== _.length - 1 || (x === ".." ? y.pop() : y.push(x));
          }
          return y.join("/");
        }, s.getTypeOf = function(g) {
          return typeof g == "string" ? "string" : Object.prototype.toString.call(g) === "[object Array]" ? "array" : i.nodebuffer && a.isBuffer(g) ? "nodebuffer" : i.uint8array && g instanceof Uint8Array ? "uint8array" : i.arraybuffer && g instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, s.checkSupport = function(g) {
          if (!i[g.toLowerCase()]) throw new Error(g + " is not supported by this platform");
        }, s.MAX_VALUE_16BITS = 65535, s.MAX_VALUE_32BITS = -1, s.pretty = function(g) {
          var _, y, v = "";
          for (y = 0; y < (g || "").length; y++) v += "\\x" + ((_ = g.charCodeAt(y)) < 16 ? "0" : "") + _.toString(16).toUpperCase();
          return v;
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
        }, s.prepareContent = function(g, _, y, v, x) {
          return c.Promise.resolve(_).then(function(T) {
            return i.blob && (T instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(T)) !== -1) && typeof FileReader < "u" ? new c.Promise(function(A, C) {
              var D = new FileReader();
              D.onload = function(R) {
                A(R.target.result);
              }, D.onerror = function(R) {
                C(R.target.error);
              }, D.readAsArrayBuffer(T);
            }) : T;
          }).then(function(T) {
            var A = s.getTypeOf(T);
            return A ? (A === "arraybuffer" ? T = s.transformTo("uint8array", T) : A === "string" && (x ? T = o.decode(T) : y && v !== !0 && (T = (function(C) {
              return f(C, i.uint8array ? new Uint8Array(C.length) : new Array(C.length));
            })(T))), T) : c.Promise.reject(new Error("Can't read the data of '" + g + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./signature"), c = e("./zipEntry"), d = e("./support");
        function f(u) {
          this.files = [], this.loadOptions = u;
        }
        f.prototype = { checkSignature: function(u) {
          if (!this.reader.readAndCheckSignature(u)) {
            this.reader.index -= 4;
            var p = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature (" + o.pretty(p) + ", expected " + o.pretty(u) + ")");
          }
        }, isSignature: function(u, p) {
          var l = this.reader.index;
          this.reader.setIndex(u);
          var w = this.reader.readString(4) === p;
          return this.reader.setIndex(l), w;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var u = this.reader.readData(this.zipCommentLength), p = d.uint8array ? "uint8array" : "array", l = o.transformTo(p, u);
          this.zipComment = this.loadOptions.decodeFileName(l);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var u, p, l, w = this.zip64EndOfCentralSize - 44; 0 < w; ) u = this.reader.readInt(2), p = this.reader.readInt(4), l = this.reader.readData(p), this.zip64ExtensibleData[u] = { id: u, length: p, value: l };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var u, p;
          for (u = 0; u < this.files.length; u++) p = this.files[u], this.reader.setIndex(p.localHeaderOffset), this.checkSignature(a.LOCAL_FILE_HEADER), p.readLocalPart(this.reader), p.handleUTF8(), p.processAttributes();
        }, readCentralDir: function() {
          var u;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER); ) (u = new c({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(u);
          if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
        }, readEndOfCentral: function() {
          var u = this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);
          if (u < 0) throw this.isSignature(0, a.LOCAL_FILE_HEADER) ? new Error("Corrupted zip: can't find end of central directory") : new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
          this.reader.setIndex(u);
          var p = u;
          if (this.checkSignature(a.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === o.MAX_VALUE_16BITS || this.diskWithCentralDirStart === o.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === o.MAX_VALUE_16BITS || this.centralDirRecords === o.MAX_VALUE_16BITS || this.centralDirSize === o.MAX_VALUE_32BITS || this.centralDirOffset === o.MAX_VALUE_32BITS) {
            if (this.zip64 = !0, (u = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            if (this.reader.setIndex(u), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, a.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
          }
          var l = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (l += 20, l += 12 + this.zip64EndOfCentralSize);
          var w = p - l;
          if (0 < w) this.isSignature(p, a.CENTRAL_FILE_HEADER) || (this.reader.zero = w);
          else if (w < 0) throw new Error("Corrupted zip: missing " + Math.abs(w) + " bytes.");
        }, prepareReader: function(u) {
          this.reader = i(u);
        }, load: function(u) {
          this.prepareReader(u), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, r.exports = f;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./compressedObject"), c = e("./crc32"), d = e("./utf8"), f = e("./compressions"), u = e("./support");
        function p(l, w) {
          this.options = l, this.loadOptions = w;
        }
        p.prototype = { isEncrypted: function() {
          return (1 & this.bitFlag) == 1;
        }, useUTF8: function() {
          return (2048 & this.bitFlag) == 2048;
        }, readLocalPart: function(l) {
          var w, g;
          if (l.skip(22), this.fileNameLength = l.readInt(2), g = l.readInt(2), this.fileName = l.readData(this.fileNameLength), l.skip(g), this.compressedSize === -1 || this.uncompressedSize === -1) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if ((w = (function(_) {
            for (var y in f) if (Object.prototype.hasOwnProperty.call(f, y) && f[y].magic === _) return f[y];
            return null;
          })(this.compressionMethod)) === null) throw new Error("Corrupted zip : compression " + o.pretty(this.compressionMethod) + " unknown (inner file : " + o.transformTo("string", this.fileName) + ")");
          this.decompressed = new a(this.compressedSize, this.uncompressedSize, this.crc32, w, l.readData(this.compressedSize));
        }, readCentralPart: function(l) {
          this.versionMadeBy = l.readInt(2), l.skip(2), this.bitFlag = l.readInt(2), this.compressionMethod = l.readString(2), this.date = l.readDate(), this.crc32 = l.readInt(4), this.compressedSize = l.readInt(4), this.uncompressedSize = l.readInt(4);
          var w = l.readInt(2);
          if (this.extraFieldsLength = l.readInt(2), this.fileCommentLength = l.readInt(2), this.diskNumberStart = l.readInt(2), this.internalFileAttributes = l.readInt(2), this.externalFileAttributes = l.readInt(4), this.localHeaderOffset = l.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
          l.skip(w), this.readExtraFields(l), this.parseZIP64ExtraField(l), this.fileComment = l.readData(this.fileCommentLength);
        }, processAttributes: function() {
          this.unixPermissions = null, this.dosPermissions = null;
          var l = this.versionMadeBy >> 8;
          this.dir = !!(16 & this.externalFileAttributes), l == 0 && (this.dosPermissions = 63 & this.externalFileAttributes), l == 3 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || this.fileNameStr.slice(-1) !== "/" || (this.dir = !0);
        }, parseZIP64ExtraField: function() {
          if (this.extraFields[1]) {
            var l = i(this.extraFields[1].value);
            this.uncompressedSize === o.MAX_VALUE_32BITS && (this.uncompressedSize = l.readInt(8)), this.compressedSize === o.MAX_VALUE_32BITS && (this.compressedSize = l.readInt(8)), this.localHeaderOffset === o.MAX_VALUE_32BITS && (this.localHeaderOffset = l.readInt(8)), this.diskNumberStart === o.MAX_VALUE_32BITS && (this.diskNumberStart = l.readInt(4));
          }
        }, readExtraFields: function(l) {
          var w, g, _, y = l.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); l.index + 4 < y; ) w = l.readInt(2), g = l.readInt(2), _ = l.readData(g), this.extraFields[w] = { id: w, length: g, value: _ };
          l.setIndex(y);
        }, handleUTF8: function() {
          var l = u.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = d.utf8decode(this.fileName), this.fileCommentStr = d.utf8decode(this.fileComment);
          else {
            var w = this.findExtraFieldUnicodePath();
            if (w !== null) this.fileNameStr = w;
            else {
              var g = o.transformTo(l, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(g);
            }
            var _ = this.findExtraFieldUnicodeComment();
            if (_ !== null) this.fileCommentStr = _;
            else {
              var y = o.transformTo(l, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(y);
            }
          }
        }, findExtraFieldUnicodePath: function() {
          var l = this.extraFields[28789];
          if (l) {
            var w = i(l.value);
            return w.readInt(1) !== 1 || c(this.fileName) !== w.readInt(4) ? null : d.utf8decode(w.readData(l.length - 5));
          }
          return null;
        }, findExtraFieldUnicodeComment: function() {
          var l = this.extraFields[25461];
          if (l) {
            var w = i(l.value);
            return w.readInt(1) !== 1 || c(this.fileComment) !== w.readInt(4) ? null : d.utf8decode(w.readData(l.length - 5));
          }
          return null;
        } }, r.exports = p;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, r, s) {
        function i(w, g, _) {
          this.name = w, this.dir = _.dir, this.date = _.date, this.comment = _.comment, this.unixPermissions = _.unixPermissions, this.dosPermissions = _.dosPermissions, this._data = g, this._dataBinary = _.binary, this.options = { compression: _.compression, compressionOptions: _.compressionOptions };
        }
        var o = e("./stream/StreamHelper"), a = e("./stream/DataWorker"), c = e("./utf8"), d = e("./compressedObject"), f = e("./stream/GenericWorker");
        i.prototype = { internalStream: function(w) {
          var g = null, _ = "string";
          try {
            if (!w) throw new Error("No output type specified.");
            var y = (_ = w.toLowerCase()) === "string" || _ === "text";
            _ !== "binarystring" && _ !== "text" || (_ = "string"), g = this._decompressWorker();
            var v = !this._dataBinary;
            v && !y && (g = g.pipe(new c.Utf8EncodeWorker())), !v && y && (g = g.pipe(new c.Utf8DecodeWorker()));
          } catch (x) {
            (g = new f("error")).error(x);
          }
          return new o(g, _, "");
        }, async: function(w, g) {
          return this.internalStream(w).accumulate(g);
        }, nodeStream: function(w, g) {
          return this.internalStream(w || "nodebuffer").toNodejsStream(g);
        }, _compressWorker: function(w, g) {
          if (this._data instanceof d && this._data.compression.magic === w.magic) return this._data.getCompressedWorker();
          var _ = this._decompressWorker();
          return this._dataBinary || (_ = _.pipe(new c.Utf8EncodeWorker())), d.createWorkerFrom(_, w, g);
        }, _decompressWorker: function() {
          return this._data instanceof d ? this._data.getContentWorker() : this._data instanceof f ? this._data : new a(this._data);
        } };
        for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], p = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, l = 0; l < u.length; l++) i.prototype[u[l]] = p;
        r.exports = i;
      }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, r, s) {
        (function(i) {
          var o, a, c = i.MutationObserver || i.WebKitMutationObserver;
          if (c) {
            var d = 0, f = new c(w), u = i.document.createTextNode("");
            f.observe(u, { characterData: !0 }), o = function() {
              u.data = d = ++d % 2;
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
          var l = [];
          function w() {
            var g, _;
            a = !0;
            for (var y = l.length; y; ) {
              for (_ = l, l = [], g = -1; ++g < y; ) _[g]();
              y = l.length;
            }
            a = !1;
          }
          r.exports = function(g) {
            l.push(g) !== 1 || a || o();
          };
        }).call(this, typeof fn < "u" ? fn : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}], 37: [function(e, r, s) {
        var i = e("immediate");
        function o() {
        }
        var a = {}, c = ["REJECTED"], d = ["FULFILLED"], f = ["PENDING"];
        function u(y) {
          if (typeof y != "function") throw new TypeError("resolver must be a function");
          this.state = f, this.queue = [], this.outcome = void 0, y !== o && g(this, y);
        }
        function p(y, v, x) {
          this.promise = y, typeof v == "function" && (this.onFulfilled = v, this.callFulfilled = this.otherCallFulfilled), typeof x == "function" && (this.onRejected = x, this.callRejected = this.otherCallRejected);
        }
        function l(y, v, x) {
          i(function() {
            var T;
            try {
              T = v(x);
            } catch (A) {
              return a.reject(y, A);
            }
            T === y ? a.reject(y, new TypeError("Cannot resolve promise with itself")) : a.resolve(y, T);
          });
        }
        function w(y) {
          var v = y && y.then;
          if (y && (typeof y == "object" || typeof y == "function") && typeof v == "function") return function() {
            v.apply(y, arguments);
          };
        }
        function g(y, v) {
          var x = !1;
          function T(D) {
            x || (x = !0, a.reject(y, D));
          }
          function A(D) {
            x || (x = !0, a.resolve(y, D));
          }
          var C = _(function() {
            v(A, T);
          });
          C.status === "error" && T(C.value);
        }
        function _(y, v) {
          var x = {};
          try {
            x.value = y(v), x.status = "success";
          } catch (T) {
            x.status = "error", x.value = T;
          }
          return x;
        }
        (r.exports = u).prototype.finally = function(y) {
          if (typeof y != "function") return this;
          var v = this.constructor;
          return this.then(function(x) {
            return v.resolve(y()).then(function() {
              return x;
            });
          }, function(x) {
            return v.resolve(y()).then(function() {
              throw x;
            });
          });
        }, u.prototype.catch = function(y) {
          return this.then(null, y);
        }, u.prototype.then = function(y, v) {
          if (typeof y != "function" && this.state === d || typeof v != "function" && this.state === c) return this;
          var x = new this.constructor(o);
          return this.state !== f ? l(x, this.state === d ? y : v, this.outcome) : this.queue.push(new p(x, y, v)), x;
        }, p.prototype.callFulfilled = function(y) {
          a.resolve(this.promise, y);
        }, p.prototype.otherCallFulfilled = function(y) {
          l(this.promise, this.onFulfilled, y);
        }, p.prototype.callRejected = function(y) {
          a.reject(this.promise, y);
        }, p.prototype.otherCallRejected = function(y) {
          l(this.promise, this.onRejected, y);
        }, a.resolve = function(y, v) {
          var x = _(w, v);
          if (x.status === "error") return a.reject(y, x.value);
          var T = x.value;
          if (T) g(y, T);
          else {
            y.state = d, y.outcome = v;
            for (var A = -1, C = y.queue.length; ++A < C; ) y.queue[A].callFulfilled(v);
          }
          return y;
        }, a.reject = function(y, v) {
          y.state = c, y.outcome = v;
          for (var x = -1, T = y.queue.length; ++x < T; ) y.queue[x].callRejected(v);
          return y;
        }, u.resolve = function(y) {
          return y instanceof this ? y : a.resolve(new this(o), y);
        }, u.reject = function(y) {
          var v = new this(o);
          return a.reject(v, y);
        }, u.all = function(y) {
          var v = this;
          if (Object.prototype.toString.call(y) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var x = y.length, T = !1;
          if (!x) return this.resolve([]);
          for (var A = new Array(x), C = 0, D = -1, R = new this(o); ++D < x; ) I(y[D], D);
          return R;
          function I(U, K) {
            v.resolve(U).then(function(S) {
              A[K] = S, ++C !== x || T || (T = !0, a.resolve(R, A));
            }, function(S) {
              T || (T = !0, a.reject(R, S));
            });
          }
        }, u.race = function(y) {
          var v = this;
          if (Object.prototype.toString.call(y) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var x = y.length, T = !1;
          if (!x) return this.resolve([]);
          for (var A = -1, C = new this(o); ++A < x; ) D = y[A], v.resolve(D).then(function(R) {
            T || (T = !0, a.resolve(C, R));
          }, function(R) {
            T || (T = !0, a.reject(C, R));
          });
          var D;
          return C;
        };
      }, { immediate: 36 }], 38: [function(e, r, s) {
        var i = {};
        (0, e("./lib/utils/common").assign)(i, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), r.exports = i;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, r, s) {
        var i = e("./zlib/deflate"), o = e("./utils/common"), a = e("./utils/strings"), c = e("./zlib/messages"), d = e("./zlib/zstream"), f = Object.prototype.toString, u = 0, p = -1, l = 0, w = 8;
        function g(y) {
          if (!(this instanceof g)) return new g(y);
          this.options = o.assign({ level: p, method: w, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: l, to: "" }, y || {});
          var v = this.options;
          v.raw && 0 < v.windowBits ? v.windowBits = -v.windowBits : v.gzip && 0 < v.windowBits && v.windowBits < 16 && (v.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new d(), this.strm.avail_out = 0;
          var x = i.deflateInit2(this.strm, v.level, v.method, v.windowBits, v.memLevel, v.strategy);
          if (x !== u) throw new Error(c[x]);
          if (v.header && i.deflateSetHeader(this.strm, v.header), v.dictionary) {
            var T;
            if (T = typeof v.dictionary == "string" ? a.string2buf(v.dictionary) : f.call(v.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(v.dictionary) : v.dictionary, (x = i.deflateSetDictionary(this.strm, T)) !== u) throw new Error(c[x]);
            this._dict_set = !0;
          }
        }
        function _(y, v) {
          var x = new g(v);
          if (x.push(y, !0), x.err) throw x.msg || c[x.err];
          return x.result;
        }
        g.prototype.push = function(y, v) {
          var x, T, A = this.strm, C = this.options.chunkSize;
          if (this.ended) return !1;
          T = v === ~~v ? v : v === !0 ? 4 : 0, typeof y == "string" ? A.input = a.string2buf(y) : f.call(y) === "[object ArrayBuffer]" ? A.input = new Uint8Array(y) : A.input = y, A.next_in = 0, A.avail_in = A.input.length;
          do {
            if (A.avail_out === 0 && (A.output = new o.Buf8(C), A.next_out = 0, A.avail_out = C), (x = i.deflate(A, T)) !== 1 && x !== u) return this.onEnd(x), !(this.ended = !0);
            A.avail_out !== 0 && (A.avail_in !== 0 || T !== 4 && T !== 2) || (this.options.to === "string" ? this.onData(a.buf2binstring(o.shrinkBuf(A.output, A.next_out))) : this.onData(o.shrinkBuf(A.output, A.next_out)));
          } while ((0 < A.avail_in || A.avail_out === 0) && x !== 1);
          return T === 4 ? (x = i.deflateEnd(this.strm), this.onEnd(x), this.ended = !0, x === u) : T !== 2 || (this.onEnd(u), !(A.avail_out = 0));
        }, g.prototype.onData = function(y) {
          this.chunks.push(y);
        }, g.prototype.onEnd = function(y) {
          y === u && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = y, this.msg = this.strm.msg;
        }, s.Deflate = g, s.deflate = _, s.deflateRaw = function(y, v) {
          return (v = v || {}).raw = !0, _(y, v);
        }, s.gzip = function(y, v) {
          return (v = v || {}).gzip = !0, _(y, v);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, r, s) {
        var i = e("./zlib/inflate"), o = e("./utils/common"), a = e("./utils/strings"), c = e("./zlib/constants"), d = e("./zlib/messages"), f = e("./zlib/zstream"), u = e("./zlib/gzheader"), p = Object.prototype.toString;
        function l(g) {
          if (!(this instanceof l)) return new l(g);
          this.options = o.assign({ chunkSize: 16384, windowBits: 0, to: "" }, g || {});
          var _ = this.options;
          _.raw && 0 <= _.windowBits && _.windowBits < 16 && (_.windowBits = -_.windowBits, _.windowBits === 0 && (_.windowBits = -15)), !(0 <= _.windowBits && _.windowBits < 16) || g && g.windowBits || (_.windowBits += 32), 15 < _.windowBits && _.windowBits < 48 && (15 & _.windowBits) == 0 && (_.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new f(), this.strm.avail_out = 0;
          var y = i.inflateInit2(this.strm, _.windowBits);
          if (y !== c.Z_OK) throw new Error(d[y]);
          this.header = new u(), i.inflateGetHeader(this.strm, this.header);
        }
        function w(g, _) {
          var y = new l(_);
          if (y.push(g, !0), y.err) throw y.msg || d[y.err];
          return y.result;
        }
        l.prototype.push = function(g, _) {
          var y, v, x, T, A, C, D = this.strm, R = this.options.chunkSize, I = this.options.dictionary, U = !1;
          if (this.ended) return !1;
          v = _ === ~~_ ? _ : _ === !0 ? c.Z_FINISH : c.Z_NO_FLUSH, typeof g == "string" ? D.input = a.binstring2buf(g) : p.call(g) === "[object ArrayBuffer]" ? D.input = new Uint8Array(g) : D.input = g, D.next_in = 0, D.avail_in = D.input.length;
          do {
            if (D.avail_out === 0 && (D.output = new o.Buf8(R), D.next_out = 0, D.avail_out = R), (y = i.inflate(D, c.Z_NO_FLUSH)) === c.Z_NEED_DICT && I && (C = typeof I == "string" ? a.string2buf(I) : p.call(I) === "[object ArrayBuffer]" ? new Uint8Array(I) : I, y = i.inflateSetDictionary(this.strm, C)), y === c.Z_BUF_ERROR && U === !0 && (y = c.Z_OK, U = !1), y !== c.Z_STREAM_END && y !== c.Z_OK) return this.onEnd(y), !(this.ended = !0);
            D.next_out && (D.avail_out !== 0 && y !== c.Z_STREAM_END && (D.avail_in !== 0 || v !== c.Z_FINISH && v !== c.Z_SYNC_FLUSH) || (this.options.to === "string" ? (x = a.utf8border(D.output, D.next_out), T = D.next_out - x, A = a.buf2string(D.output, x), D.next_out = T, D.avail_out = R - T, T && o.arraySet(D.output, D.output, x, T, 0), this.onData(A)) : this.onData(o.shrinkBuf(D.output, D.next_out)))), D.avail_in === 0 && D.avail_out === 0 && (U = !0);
          } while ((0 < D.avail_in || D.avail_out === 0) && y !== c.Z_STREAM_END);
          return y === c.Z_STREAM_END && (v = c.Z_FINISH), v === c.Z_FINISH ? (y = i.inflateEnd(this.strm), this.onEnd(y), this.ended = !0, y === c.Z_OK) : v !== c.Z_SYNC_FLUSH || (this.onEnd(c.Z_OK), !(D.avail_out = 0));
        }, l.prototype.onData = function(g) {
          this.chunks.push(g);
        }, l.prototype.onEnd = function(g) {
          g === c.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = g, this.msg = this.strm.msg;
        }, s.Inflate = l, s.inflate = w, s.inflateRaw = function(g, _) {
          return (_ = _ || {}).raw = !0, w(g, _);
        }, s.ungzip = w;
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, r, s) {
        var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
        s.assign = function(c) {
          for (var d = Array.prototype.slice.call(arguments, 1); d.length; ) {
            var f = d.shift();
            if (f) {
              if (typeof f != "object") throw new TypeError(f + "must be non-object");
              for (var u in f) f.hasOwnProperty(u) && (c[u] = f[u]);
            }
          }
          return c;
        }, s.shrinkBuf = function(c, d) {
          return c.length === d ? c : c.subarray ? c.subarray(0, d) : (c.length = d, c);
        };
        var o = { arraySet: function(c, d, f, u, p) {
          if (d.subarray && c.subarray) c.set(d.subarray(f, f + u), p);
          else for (var l = 0; l < u; l++) c[p + l] = d[f + l];
        }, flattenChunks: function(c) {
          var d, f, u, p, l, w;
          for (d = u = 0, f = c.length; d < f; d++) u += c[d].length;
          for (w = new Uint8Array(u), d = p = 0, f = c.length; d < f; d++) l = c[d], w.set(l, p), p += l.length;
          return w;
        } }, a = { arraySet: function(c, d, f, u, p) {
          for (var l = 0; l < u; l++) c[p + l] = d[f + l];
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
        for (var c = new i.Buf8(256), d = 0; d < 256; d++) c[d] = 252 <= d ? 6 : 248 <= d ? 5 : 240 <= d ? 4 : 224 <= d ? 3 : 192 <= d ? 2 : 1;
        function f(u, p) {
          if (p < 65537 && (u.subarray && a || !u.subarray && o)) return String.fromCharCode.apply(null, i.shrinkBuf(u, p));
          for (var l = "", w = 0; w < p; w++) l += String.fromCharCode(u[w]);
          return l;
        }
        c[254] = c[254] = 1, s.string2buf = function(u) {
          var p, l, w, g, _, y = u.length, v = 0;
          for (g = 0; g < y; g++) (64512 & (l = u.charCodeAt(g))) == 55296 && g + 1 < y && (64512 & (w = u.charCodeAt(g + 1))) == 56320 && (l = 65536 + (l - 55296 << 10) + (w - 56320), g++), v += l < 128 ? 1 : l < 2048 ? 2 : l < 65536 ? 3 : 4;
          for (p = new i.Buf8(v), g = _ = 0; _ < v; g++) (64512 & (l = u.charCodeAt(g))) == 55296 && g + 1 < y && (64512 & (w = u.charCodeAt(g + 1))) == 56320 && (l = 65536 + (l - 55296 << 10) + (w - 56320), g++), l < 128 ? p[_++] = l : (l < 2048 ? p[_++] = 192 | l >>> 6 : (l < 65536 ? p[_++] = 224 | l >>> 12 : (p[_++] = 240 | l >>> 18, p[_++] = 128 | l >>> 12 & 63), p[_++] = 128 | l >>> 6 & 63), p[_++] = 128 | 63 & l);
          return p;
        }, s.buf2binstring = function(u) {
          return f(u, u.length);
        }, s.binstring2buf = function(u) {
          for (var p = new i.Buf8(u.length), l = 0, w = p.length; l < w; l++) p[l] = u.charCodeAt(l);
          return p;
        }, s.buf2string = function(u, p) {
          var l, w, g, _, y = p || u.length, v = new Array(2 * y);
          for (l = w = 0; l < y; ) if ((g = u[l++]) < 128) v[w++] = g;
          else if (4 < (_ = c[g])) v[w++] = 65533, l += _ - 1;
          else {
            for (g &= _ === 2 ? 31 : _ === 3 ? 15 : 7; 1 < _ && l < y; ) g = g << 6 | 63 & u[l++], _--;
            1 < _ ? v[w++] = 65533 : g < 65536 ? v[w++] = g : (g -= 65536, v[w++] = 55296 | g >> 10 & 1023, v[w++] = 56320 | 1023 & g);
          }
          return f(v, w);
        }, s.utf8border = function(u, p) {
          var l;
          for ((p = p || u.length) > u.length && (p = u.length), l = p - 1; 0 <= l && (192 & u[l]) == 128; ) l--;
          return l < 0 || l === 0 ? p : l + c[u[l]] > p ? l : p;
        };
      }, { "./common": 41 }], 43: [function(e, r, s) {
        r.exports = function(i, o, a, c) {
          for (var d = 65535 & i | 0, f = i >>> 16 & 65535 | 0, u = 0; a !== 0; ) {
            for (a -= u = 2e3 < a ? 2e3 : a; f = f + (d = d + o[c++] | 0) | 0, --u; ) ;
            d %= 65521, f %= 65521;
          }
          return d | f << 16 | 0;
        };
      }, {}], 44: [function(e, r, s) {
        r.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
      }, {}], 45: [function(e, r, s) {
        var i = (function() {
          for (var o, a = [], c = 0; c < 256; c++) {
            o = c;
            for (var d = 0; d < 8; d++) o = 1 & o ? 3988292384 ^ o >>> 1 : o >>> 1;
            a[c] = o;
          }
          return a;
        })();
        r.exports = function(o, a, c, d) {
          var f = i, u = d + c;
          o ^= -1;
          for (var p = d; p < u; p++) o = o >>> 8 ^ f[255 & (o ^ a[p])];
          return -1 ^ o;
        };
      }, {}], 46: [function(e, r, s) {
        var i, o = e("../utils/common"), a = e("./trees"), c = e("./adler32"), d = e("./crc32"), f = e("./messages"), u = 0, p = 4, l = 0, w = -2, g = -1, _ = 4, y = 2, v = 8, x = 9, T = 286, A = 30, C = 19, D = 2 * T + 1, R = 15, I = 3, U = 258, K = U + I + 1, S = 42, M = 113, m = 1, P = 2, et = 3, $ = 4;
        function nt(h, B) {
          return h.msg = f[B], B;
        }
        function H(h) {
          return (h << 1) - (4 < h ? 9 : 0);
        }
        function Q(h) {
          for (var B = h.length; 0 <= --B; ) h[B] = 0;
        }
        function z(h) {
          var B = h.state, N = B.pending;
          N > h.avail_out && (N = h.avail_out), N !== 0 && (o.arraySet(h.output, B.pending_buf, B.pending_out, N, h.next_out), h.next_out += N, B.pending_out += N, h.total_out += N, h.avail_out -= N, B.pending -= N, B.pending === 0 && (B.pending_out = 0));
        }
        function L(h, B) {
          a._tr_flush_block(h, 0 <= h.block_start ? h.block_start : -1, h.strstart - h.block_start, B), h.block_start = h.strstart, z(h.strm);
        }
        function X(h, B) {
          h.pending_buf[h.pending++] = B;
        }
        function Y(h, B) {
          h.pending_buf[h.pending++] = B >>> 8 & 255, h.pending_buf[h.pending++] = 255 & B;
        }
        function Z(h, B) {
          var N, k, b = h.max_chain_length, E = h.strstart, F = h.prev_length, j = h.nice_match, O = h.strstart > h.w_size - K ? h.strstart - (h.w_size - K) : 0, W = h.window, G = h.w_mask, V = h.prev, J = h.strstart + U, ct = W[E + F - 1], it = W[E + F];
          h.prev_length >= h.good_match && (b >>= 2), j > h.lookahead && (j = h.lookahead);
          do
            if (W[(N = B) + F] === it && W[N + F - 1] === ct && W[N] === W[E] && W[++N] === W[E + 1]) {
              E += 2, N++;
              do
                ;
              while (W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && W[++E] === W[++N] && E < J);
              if (k = U - (J - E), E = J - U, F < k) {
                if (h.match_start = B, j <= (F = k)) break;
                ct = W[E + F - 1], it = W[E + F];
              }
            }
          while ((B = V[B & G]) > O && --b != 0);
          return F <= h.lookahead ? F : h.lookahead;
        }
        function ht(h) {
          var B, N, k, b, E, F, j, O, W, G, V = h.w_size;
          do {
            if (b = h.window_size - h.lookahead - h.strstart, h.strstart >= V + (V - K)) {
              for (o.arraySet(h.window, h.window, V, V, 0), h.match_start -= V, h.strstart -= V, h.block_start -= V, B = N = h.hash_size; k = h.head[--B], h.head[B] = V <= k ? k - V : 0, --N; ) ;
              for (B = N = V; k = h.prev[--B], h.prev[B] = V <= k ? k - V : 0, --N; ) ;
              b += V;
            }
            if (h.strm.avail_in === 0) break;
            if (F = h.strm, j = h.window, O = h.strstart + h.lookahead, W = b, G = void 0, G = F.avail_in, W < G && (G = W), N = G === 0 ? 0 : (F.avail_in -= G, o.arraySet(j, F.input, F.next_in, G, O), F.state.wrap === 1 ? F.adler = c(F.adler, j, G, O) : F.state.wrap === 2 && (F.adler = d(F.adler, j, G, O)), F.next_in += G, F.total_in += G, G), h.lookahead += N, h.lookahead + h.insert >= I) for (E = h.strstart - h.insert, h.ins_h = h.window[E], h.ins_h = (h.ins_h << h.hash_shift ^ h.window[E + 1]) & h.hash_mask; h.insert && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[E + I - 1]) & h.hash_mask, h.prev[E & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = E, E++, h.insert--, !(h.lookahead + h.insert < I)); ) ;
          } while (h.lookahead < K && h.strm.avail_in !== 0);
        }
        function vt(h, B) {
          for (var N, k; ; ) {
            if (h.lookahead < K) {
              if (ht(h), h.lookahead < K && B === u) return m;
              if (h.lookahead === 0) break;
            }
            if (N = 0, h.lookahead >= I && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, N = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart), N !== 0 && h.strstart - N <= h.w_size - K && (h.match_length = Z(h, N)), h.match_length >= I) if (k = a._tr_tally(h, h.strstart - h.match_start, h.match_length - I), h.lookahead -= h.match_length, h.match_length <= h.max_lazy_match && h.lookahead >= I) {
              for (h.match_length--; h.strstart++, h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, N = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart, --h.match_length != 0; ) ;
              h.strstart++;
            } else h.strstart += h.match_length, h.match_length = 0, h.ins_h = h.window[h.strstart], h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + 1]) & h.hash_mask;
            else k = a._tr_tally(h, 0, h.window[h.strstart]), h.lookahead--, h.strstart++;
            if (k && (L(h, !1), h.strm.avail_out === 0)) return m;
          }
          return h.insert = h.strstart < I - 1 ? h.strstart : I - 1, B === p ? (L(h, !0), h.strm.avail_out === 0 ? et : $) : h.last_lit && (L(h, !1), h.strm.avail_out === 0) ? m : P;
        }
        function st(h, B) {
          for (var N, k, b; ; ) {
            if (h.lookahead < K) {
              if (ht(h), h.lookahead < K && B === u) return m;
              if (h.lookahead === 0) break;
            }
            if (N = 0, h.lookahead >= I && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, N = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart), h.prev_length = h.match_length, h.prev_match = h.match_start, h.match_length = I - 1, N !== 0 && h.prev_length < h.max_lazy_match && h.strstart - N <= h.w_size - K && (h.match_length = Z(h, N), h.match_length <= 5 && (h.strategy === 1 || h.match_length === I && 4096 < h.strstart - h.match_start) && (h.match_length = I - 1)), h.prev_length >= I && h.match_length <= h.prev_length) {
              for (b = h.strstart + h.lookahead - I, k = a._tr_tally(h, h.strstart - 1 - h.prev_match, h.prev_length - I), h.lookahead -= h.prev_length - 1, h.prev_length -= 2; ++h.strstart <= b && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, N = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart), --h.prev_length != 0; ) ;
              if (h.match_available = 0, h.match_length = I - 1, h.strstart++, k && (L(h, !1), h.strm.avail_out === 0)) return m;
            } else if (h.match_available) {
              if ((k = a._tr_tally(h, 0, h.window[h.strstart - 1])) && L(h, !1), h.strstart++, h.lookahead--, h.strm.avail_out === 0) return m;
            } else h.match_available = 1, h.strstart++, h.lookahead--;
          }
          return h.match_available && (k = a._tr_tally(h, 0, h.window[h.strstart - 1]), h.match_available = 0), h.insert = h.strstart < I - 1 ? h.strstart : I - 1, B === p ? (L(h, !0), h.strm.avail_out === 0 ? et : $) : h.last_lit && (L(h, !1), h.strm.avail_out === 0) ? m : P;
        }
        function ot(h, B, N, k, b) {
          this.good_length = h, this.max_lazy = B, this.nice_length = N, this.max_chain = k, this.func = b;
        }
        function yt() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = v, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new o.Buf16(2 * D), this.dyn_dtree = new o.Buf16(2 * (2 * A + 1)), this.bl_tree = new o.Buf16(2 * (2 * C + 1)), Q(this.dyn_ltree), Q(this.dyn_dtree), Q(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new o.Buf16(R + 1), this.heap = new o.Buf16(2 * T + 1), Q(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new o.Buf16(2 * T + 1), Q(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function dt(h) {
          var B;
          return h && h.state ? (h.total_in = h.total_out = 0, h.data_type = y, (B = h.state).pending = 0, B.pending_out = 0, B.wrap < 0 && (B.wrap = -B.wrap), B.status = B.wrap ? S : M, h.adler = B.wrap === 2 ? 0 : 1, B.last_flush = u, a._tr_init(B), l) : nt(h, w);
        }
        function Ut(h) {
          var B = dt(h);
          return B === l && (function(N) {
            N.window_size = 2 * N.w_size, Q(N.head), N.max_lazy_match = i[N.level].max_lazy, N.good_match = i[N.level].good_length, N.nice_match = i[N.level].nice_length, N.max_chain_length = i[N.level].max_chain, N.strstart = 0, N.block_start = 0, N.lookahead = 0, N.insert = 0, N.match_length = N.prev_length = I - 1, N.match_available = 0, N.ins_h = 0;
          })(h.state), B;
        }
        function zt(h, B, N, k, b, E) {
          if (!h) return w;
          var F = 1;
          if (B === g && (B = 6), k < 0 ? (F = 0, k = -k) : 15 < k && (F = 2, k -= 16), b < 1 || x < b || N !== v || k < 8 || 15 < k || B < 0 || 9 < B || E < 0 || _ < E) return nt(h, w);
          k === 8 && (k = 9);
          var j = new yt();
          return (h.state = j).strm = h, j.wrap = F, j.gzhead = null, j.w_bits = k, j.w_size = 1 << j.w_bits, j.w_mask = j.w_size - 1, j.hash_bits = b + 7, j.hash_size = 1 << j.hash_bits, j.hash_mask = j.hash_size - 1, j.hash_shift = ~~((j.hash_bits + I - 1) / I), j.window = new o.Buf8(2 * j.w_size), j.head = new o.Buf16(j.hash_size), j.prev = new o.Buf16(j.w_size), j.lit_bufsize = 1 << b + 6, j.pending_buf_size = 4 * j.lit_bufsize, j.pending_buf = new o.Buf8(j.pending_buf_size), j.d_buf = 1 * j.lit_bufsize, j.l_buf = 3 * j.lit_bufsize, j.level = B, j.strategy = E, j.method = N, Ut(h);
        }
        i = [new ot(0, 0, 0, 0, function(h, B) {
          var N = 65535;
          for (N > h.pending_buf_size - 5 && (N = h.pending_buf_size - 5); ; ) {
            if (h.lookahead <= 1) {
              if (ht(h), h.lookahead === 0 && B === u) return m;
              if (h.lookahead === 0) break;
            }
            h.strstart += h.lookahead, h.lookahead = 0;
            var k = h.block_start + N;
            if ((h.strstart === 0 || h.strstart >= k) && (h.lookahead = h.strstart - k, h.strstart = k, L(h, !1), h.strm.avail_out === 0) || h.strstart - h.block_start >= h.w_size - K && (L(h, !1), h.strm.avail_out === 0)) return m;
          }
          return h.insert = 0, B === p ? (L(h, !0), h.strm.avail_out === 0 ? et : $) : (h.strstart > h.block_start && (L(h, !1), h.strm.avail_out), m);
        }), new ot(4, 4, 8, 4, vt), new ot(4, 5, 16, 8, vt), new ot(4, 6, 32, 32, vt), new ot(4, 4, 16, 16, st), new ot(8, 16, 32, 32, st), new ot(8, 16, 128, 128, st), new ot(8, 32, 128, 256, st), new ot(32, 128, 258, 1024, st), new ot(32, 258, 258, 4096, st)], s.deflateInit = function(h, B) {
          return zt(h, B, v, 15, 8, 0);
        }, s.deflateInit2 = zt, s.deflateReset = Ut, s.deflateResetKeep = dt, s.deflateSetHeader = function(h, B) {
          return h && h.state ? h.state.wrap !== 2 ? w : (h.state.gzhead = B, l) : w;
        }, s.deflate = function(h, B) {
          var N, k, b, E;
          if (!h || !h.state || 5 < B || B < 0) return h ? nt(h, w) : w;
          if (k = h.state, !h.output || !h.input && h.avail_in !== 0 || k.status === 666 && B !== p) return nt(h, h.avail_out === 0 ? -5 : w);
          if (k.strm = h, N = k.last_flush, k.last_flush = B, k.status === S) if (k.wrap === 2) h.adler = 0, X(k, 31), X(k, 139), X(k, 8), k.gzhead ? (X(k, (k.gzhead.text ? 1 : 0) + (k.gzhead.hcrc ? 2 : 0) + (k.gzhead.extra ? 4 : 0) + (k.gzhead.name ? 8 : 0) + (k.gzhead.comment ? 16 : 0)), X(k, 255 & k.gzhead.time), X(k, k.gzhead.time >> 8 & 255), X(k, k.gzhead.time >> 16 & 255), X(k, k.gzhead.time >> 24 & 255), X(k, k.level === 9 ? 2 : 2 <= k.strategy || k.level < 2 ? 4 : 0), X(k, 255 & k.gzhead.os), k.gzhead.extra && k.gzhead.extra.length && (X(k, 255 & k.gzhead.extra.length), X(k, k.gzhead.extra.length >> 8 & 255)), k.gzhead.hcrc && (h.adler = d(h.adler, k.pending_buf, k.pending, 0)), k.gzindex = 0, k.status = 69) : (X(k, 0), X(k, 0), X(k, 0), X(k, 0), X(k, 0), X(k, k.level === 9 ? 2 : 2 <= k.strategy || k.level < 2 ? 4 : 0), X(k, 3), k.status = M);
          else {
            var F = v + (k.w_bits - 8 << 4) << 8;
            F |= (2 <= k.strategy || k.level < 2 ? 0 : k.level < 6 ? 1 : k.level === 6 ? 2 : 3) << 6, k.strstart !== 0 && (F |= 32), F += 31 - F % 31, k.status = M, Y(k, F), k.strstart !== 0 && (Y(k, h.adler >>> 16), Y(k, 65535 & h.adler)), h.adler = 1;
          }
          if (k.status === 69) if (k.gzhead.extra) {
            for (b = k.pending; k.gzindex < (65535 & k.gzhead.extra.length) && (k.pending !== k.pending_buf_size || (k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), z(h), b = k.pending, k.pending !== k.pending_buf_size)); ) X(k, 255 & k.gzhead.extra[k.gzindex]), k.gzindex++;
            k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), k.gzindex === k.gzhead.extra.length && (k.gzindex = 0, k.status = 73);
          } else k.status = 73;
          if (k.status === 73) if (k.gzhead.name) {
            b = k.pending;
            do {
              if (k.pending === k.pending_buf_size && (k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), z(h), b = k.pending, k.pending === k.pending_buf_size)) {
                E = 1;
                break;
              }
              E = k.gzindex < k.gzhead.name.length ? 255 & k.gzhead.name.charCodeAt(k.gzindex++) : 0, X(k, E);
            } while (E !== 0);
            k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), E === 0 && (k.gzindex = 0, k.status = 91);
          } else k.status = 91;
          if (k.status === 91) if (k.gzhead.comment) {
            b = k.pending;
            do {
              if (k.pending === k.pending_buf_size && (k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), z(h), b = k.pending, k.pending === k.pending_buf_size)) {
                E = 1;
                break;
              }
              E = k.gzindex < k.gzhead.comment.length ? 255 & k.gzhead.comment.charCodeAt(k.gzindex++) : 0, X(k, E);
            } while (E !== 0);
            k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), E === 0 && (k.status = 103);
          } else k.status = 103;
          if (k.status === 103 && (k.gzhead.hcrc ? (k.pending + 2 > k.pending_buf_size && z(h), k.pending + 2 <= k.pending_buf_size && (X(k, 255 & h.adler), X(k, h.adler >> 8 & 255), h.adler = 0, k.status = M)) : k.status = M), k.pending !== 0) {
            if (z(h), h.avail_out === 0) return k.last_flush = -1, l;
          } else if (h.avail_in === 0 && H(B) <= H(N) && B !== p) return nt(h, -5);
          if (k.status === 666 && h.avail_in !== 0) return nt(h, -5);
          if (h.avail_in !== 0 || k.lookahead !== 0 || B !== u && k.status !== 666) {
            var j = k.strategy === 2 ? (function(O, W) {
              for (var G; ; ) {
                if (O.lookahead === 0 && (ht(O), O.lookahead === 0)) {
                  if (W === u) return m;
                  break;
                }
                if (O.match_length = 0, G = a._tr_tally(O, 0, O.window[O.strstart]), O.lookahead--, O.strstart++, G && (L(O, !1), O.strm.avail_out === 0)) return m;
              }
              return O.insert = 0, W === p ? (L(O, !0), O.strm.avail_out === 0 ? et : $) : O.last_lit && (L(O, !1), O.strm.avail_out === 0) ? m : P;
            })(k, B) : k.strategy === 3 ? (function(O, W) {
              for (var G, V, J, ct, it = O.window; ; ) {
                if (O.lookahead <= U) {
                  if (ht(O), O.lookahead <= U && W === u) return m;
                  if (O.lookahead === 0) break;
                }
                if (O.match_length = 0, O.lookahead >= I && 0 < O.strstart && (V = it[J = O.strstart - 1]) === it[++J] && V === it[++J] && V === it[++J]) {
                  ct = O.strstart + U;
                  do
                    ;
                  while (V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && J < ct);
                  O.match_length = U - (ct - J), O.match_length > O.lookahead && (O.match_length = O.lookahead);
                }
                if (O.match_length >= I ? (G = a._tr_tally(O, 1, O.match_length - I), O.lookahead -= O.match_length, O.strstart += O.match_length, O.match_length = 0) : (G = a._tr_tally(O, 0, O.window[O.strstart]), O.lookahead--, O.strstart++), G && (L(O, !1), O.strm.avail_out === 0)) return m;
              }
              return O.insert = 0, W === p ? (L(O, !0), O.strm.avail_out === 0 ? et : $) : O.last_lit && (L(O, !1), O.strm.avail_out === 0) ? m : P;
            })(k, B) : i[k.level].func(k, B);
            if (j !== et && j !== $ || (k.status = 666), j === m || j === et) return h.avail_out === 0 && (k.last_flush = -1), l;
            if (j === P && (B === 1 ? a._tr_align(k) : B !== 5 && (a._tr_stored_block(k, 0, 0, !1), B === 3 && (Q(k.head), k.lookahead === 0 && (k.strstart = 0, k.block_start = 0, k.insert = 0))), z(h), h.avail_out === 0)) return k.last_flush = -1, l;
          }
          return B !== p ? l : k.wrap <= 0 ? 1 : (k.wrap === 2 ? (X(k, 255 & h.adler), X(k, h.adler >> 8 & 255), X(k, h.adler >> 16 & 255), X(k, h.adler >> 24 & 255), X(k, 255 & h.total_in), X(k, h.total_in >> 8 & 255), X(k, h.total_in >> 16 & 255), X(k, h.total_in >> 24 & 255)) : (Y(k, h.adler >>> 16), Y(k, 65535 & h.adler)), z(h), 0 < k.wrap && (k.wrap = -k.wrap), k.pending !== 0 ? l : 1);
        }, s.deflateEnd = function(h) {
          var B;
          return h && h.state ? (B = h.state.status) !== S && B !== 69 && B !== 73 && B !== 91 && B !== 103 && B !== M && B !== 666 ? nt(h, w) : (h.state = null, B === M ? nt(h, -3) : l) : w;
        }, s.deflateSetDictionary = function(h, B) {
          var N, k, b, E, F, j, O, W, G = B.length;
          if (!h || !h.state || (E = (N = h.state).wrap) === 2 || E === 1 && N.status !== S || N.lookahead) return w;
          for (E === 1 && (h.adler = c(h.adler, B, G, 0)), N.wrap = 0, G >= N.w_size && (E === 0 && (Q(N.head), N.strstart = 0, N.block_start = 0, N.insert = 0), W = new o.Buf8(N.w_size), o.arraySet(W, B, G - N.w_size, N.w_size, 0), B = W, G = N.w_size), F = h.avail_in, j = h.next_in, O = h.input, h.avail_in = G, h.next_in = 0, h.input = B, ht(N); N.lookahead >= I; ) {
            for (k = N.strstart, b = N.lookahead - (I - 1); N.ins_h = (N.ins_h << N.hash_shift ^ N.window[k + I - 1]) & N.hash_mask, N.prev[k & N.w_mask] = N.head[N.ins_h], N.head[N.ins_h] = k, k++, --b; ) ;
            N.strstart = k, N.lookahead = I - 1, ht(N);
          }
          return N.strstart += N.lookahead, N.block_start = N.strstart, N.insert = N.lookahead, N.lookahead = 0, N.match_length = N.prev_length = I - 1, N.match_available = 0, h.next_in = j, h.input = O, h.avail_in = F, N.wrap = E, l;
        }, s.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, r, s) {
        r.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
        };
      }, {}], 48: [function(e, r, s) {
        r.exports = function(i, o) {
          var a, c, d, f, u, p, l, w, g, _, y, v, x, T, A, C, D, R, I, U, K, S, M, m, P;
          a = i.state, c = i.next_in, m = i.input, d = c + (i.avail_in - 5), f = i.next_out, P = i.output, u = f - (o - i.avail_out), p = f + (i.avail_out - 257), l = a.dmax, w = a.wsize, g = a.whave, _ = a.wnext, y = a.window, v = a.hold, x = a.bits, T = a.lencode, A = a.distcode, C = (1 << a.lenbits) - 1, D = (1 << a.distbits) - 1;
          t: do {
            x < 15 && (v += m[c++] << x, x += 8, v += m[c++] << x, x += 8), R = T[v & C];
            e: for (; ; ) {
              if (v >>>= I = R >>> 24, x -= I, (I = R >>> 16 & 255) === 0) P[f++] = 65535 & R;
              else {
                if (!(16 & I)) {
                  if ((64 & I) == 0) {
                    R = T[(65535 & R) + (v & (1 << I) - 1)];
                    continue e;
                  }
                  if (32 & I) {
                    a.mode = 12;
                    break t;
                  }
                  i.msg = "invalid literal/length code", a.mode = 30;
                  break t;
                }
                U = 65535 & R, (I &= 15) && (x < I && (v += m[c++] << x, x += 8), U += v & (1 << I) - 1, v >>>= I, x -= I), x < 15 && (v += m[c++] << x, x += 8, v += m[c++] << x, x += 8), R = A[v & D];
                n: for (; ; ) {
                  if (v >>>= I = R >>> 24, x -= I, !(16 & (I = R >>> 16 & 255))) {
                    if ((64 & I) == 0) {
                      R = A[(65535 & R) + (v & (1 << I) - 1)];
                      continue n;
                    }
                    i.msg = "invalid distance code", a.mode = 30;
                    break t;
                  }
                  if (K = 65535 & R, x < (I &= 15) && (v += m[c++] << x, (x += 8) < I && (v += m[c++] << x, x += 8)), l < (K += v & (1 << I) - 1)) {
                    i.msg = "invalid distance too far back", a.mode = 30;
                    break t;
                  }
                  if (v >>>= I, x -= I, (I = f - u) < K) {
                    if (g < (I = K - I) && a.sane) {
                      i.msg = "invalid distance too far back", a.mode = 30;
                      break t;
                    }
                    if (M = y, (S = 0) === _) {
                      if (S += w - I, I < U) {
                        for (U -= I; P[f++] = y[S++], --I; ) ;
                        S = f - K, M = P;
                      }
                    } else if (_ < I) {
                      if (S += w + _ - I, (I -= _) < U) {
                        for (U -= I; P[f++] = y[S++], --I; ) ;
                        if (S = 0, _ < U) {
                          for (U -= I = _; P[f++] = y[S++], --I; ) ;
                          S = f - K, M = P;
                        }
                      }
                    } else if (S += _ - I, I < U) {
                      for (U -= I; P[f++] = y[S++], --I; ) ;
                      S = f - K, M = P;
                    }
                    for (; 2 < U; ) P[f++] = M[S++], P[f++] = M[S++], P[f++] = M[S++], U -= 3;
                    U && (P[f++] = M[S++], 1 < U && (P[f++] = M[S++]));
                  } else {
                    for (S = f - K; P[f++] = P[S++], P[f++] = P[S++], P[f++] = P[S++], 2 < (U -= 3); ) ;
                    U && (P[f++] = P[S++], 1 < U && (P[f++] = P[S++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (c < d && f < p);
          c -= U = x >> 3, v &= (1 << (x -= U << 3)) - 1, i.next_in = c, i.next_out = f, i.avail_in = c < d ? d - c + 5 : 5 - (c - d), i.avail_out = f < p ? p - f + 257 : 257 - (f - p), a.hold = v, a.bits = x;
        };
      }, {}], 49: [function(e, r, s) {
        var i = e("../utils/common"), o = e("./adler32"), a = e("./crc32"), c = e("./inffast"), d = e("./inftrees"), f = 1, u = 2, p = 0, l = -2, w = 1, g = 852, _ = 592;
        function y(S) {
          return (S >>> 24 & 255) + (S >>> 8 & 65280) + ((65280 & S) << 8) + ((255 & S) << 24);
        }
        function v() {
          this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new i.Buf16(320), this.work = new i.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function x(S) {
          var M;
          return S && S.state ? (M = S.state, S.total_in = S.total_out = M.total = 0, S.msg = "", M.wrap && (S.adler = 1 & M.wrap), M.mode = w, M.last = 0, M.havedict = 0, M.dmax = 32768, M.head = null, M.hold = 0, M.bits = 0, M.lencode = M.lendyn = new i.Buf32(g), M.distcode = M.distdyn = new i.Buf32(_), M.sane = 1, M.back = -1, p) : l;
        }
        function T(S) {
          var M;
          return S && S.state ? ((M = S.state).wsize = 0, M.whave = 0, M.wnext = 0, x(S)) : l;
        }
        function A(S, M) {
          var m, P;
          return S && S.state ? (P = S.state, M < 0 ? (m = 0, M = -M) : (m = 1 + (M >> 4), M < 48 && (M &= 15)), M && (M < 8 || 15 < M) ? l : (P.window !== null && P.wbits !== M && (P.window = null), P.wrap = m, P.wbits = M, T(S))) : l;
        }
        function C(S, M) {
          var m, P;
          return S ? (P = new v(), (S.state = P).window = null, (m = A(S, M)) !== p && (S.state = null), m) : l;
        }
        var D, R, I = !0;
        function U(S) {
          if (I) {
            var M;
            for (D = new i.Buf32(512), R = new i.Buf32(32), M = 0; M < 144; ) S.lens[M++] = 8;
            for (; M < 256; ) S.lens[M++] = 9;
            for (; M < 280; ) S.lens[M++] = 7;
            for (; M < 288; ) S.lens[M++] = 8;
            for (d(f, S.lens, 0, 288, D, 0, S.work, { bits: 9 }), M = 0; M < 32; ) S.lens[M++] = 5;
            d(u, S.lens, 0, 32, R, 0, S.work, { bits: 5 }), I = !1;
          }
          S.lencode = D, S.lenbits = 9, S.distcode = R, S.distbits = 5;
        }
        function K(S, M, m, P) {
          var et, $ = S.state;
          return $.window === null && ($.wsize = 1 << $.wbits, $.wnext = 0, $.whave = 0, $.window = new i.Buf8($.wsize)), P >= $.wsize ? (i.arraySet($.window, M, m - $.wsize, $.wsize, 0), $.wnext = 0, $.whave = $.wsize) : (P < (et = $.wsize - $.wnext) && (et = P), i.arraySet($.window, M, m - P, et, $.wnext), (P -= et) ? (i.arraySet($.window, M, m - P, P, 0), $.wnext = P, $.whave = $.wsize) : ($.wnext += et, $.wnext === $.wsize && ($.wnext = 0), $.whave < $.wsize && ($.whave += et))), 0;
        }
        s.inflateReset = T, s.inflateReset2 = A, s.inflateResetKeep = x, s.inflateInit = function(S) {
          return C(S, 15);
        }, s.inflateInit2 = C, s.inflate = function(S, M) {
          var m, P, et, $, nt, H, Q, z, L, X, Y, Z, ht, vt, st, ot, yt, dt, Ut, zt, h, B, N, k, b = 0, E = new i.Buf8(4), F = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!S || !S.state || !S.output || !S.input && S.avail_in !== 0) return l;
          (m = S.state).mode === 12 && (m.mode = 13), nt = S.next_out, et = S.output, Q = S.avail_out, $ = S.next_in, P = S.input, H = S.avail_in, z = m.hold, L = m.bits, X = H, Y = Q, B = p;
          t: for (; ; ) switch (m.mode) {
            case w:
              if (m.wrap === 0) {
                m.mode = 13;
                break;
              }
              for (; L < 16; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              if (2 & m.wrap && z === 35615) {
                E[m.check = 0] = 255 & z, E[1] = z >>> 8 & 255, m.check = a(m.check, E, 2, 0), L = z = 0, m.mode = 2;
                break;
              }
              if (m.flags = 0, m.head && (m.head.done = !1), !(1 & m.wrap) || (((255 & z) << 8) + (z >> 8)) % 31) {
                S.msg = "incorrect header check", m.mode = 30;
                break;
              }
              if ((15 & z) != 8) {
                S.msg = "unknown compression method", m.mode = 30;
                break;
              }
              if (L -= 4, h = 8 + (15 & (z >>>= 4)), m.wbits === 0) m.wbits = h;
              else if (h > m.wbits) {
                S.msg = "invalid window size", m.mode = 30;
                break;
              }
              m.dmax = 1 << h, S.adler = m.check = 1, m.mode = 512 & z ? 10 : 12, L = z = 0;
              break;
            case 2:
              for (; L < 16; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              if (m.flags = z, (255 & m.flags) != 8) {
                S.msg = "unknown compression method", m.mode = 30;
                break;
              }
              if (57344 & m.flags) {
                S.msg = "unknown header flags set", m.mode = 30;
                break;
              }
              m.head && (m.head.text = z >> 8 & 1), 512 & m.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, m.check = a(m.check, E, 2, 0)), L = z = 0, m.mode = 3;
            case 3:
              for (; L < 32; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              m.head && (m.head.time = z), 512 & m.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, E[2] = z >>> 16 & 255, E[3] = z >>> 24 & 255, m.check = a(m.check, E, 4, 0)), L = z = 0, m.mode = 4;
            case 4:
              for (; L < 16; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              m.head && (m.head.xflags = 255 & z, m.head.os = z >> 8), 512 & m.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, m.check = a(m.check, E, 2, 0)), L = z = 0, m.mode = 5;
            case 5:
              if (1024 & m.flags) {
                for (; L < 16; ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                m.length = z, m.head && (m.head.extra_len = z), 512 & m.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, m.check = a(m.check, E, 2, 0)), L = z = 0;
              } else m.head && (m.head.extra = null);
              m.mode = 6;
            case 6:
              if (1024 & m.flags && (H < (Z = m.length) && (Z = H), Z && (m.head && (h = m.head.extra_len - m.length, m.head.extra || (m.head.extra = new Array(m.head.extra_len)), i.arraySet(m.head.extra, P, $, Z, h)), 512 & m.flags && (m.check = a(m.check, P, Z, $)), H -= Z, $ += Z, m.length -= Z), m.length)) break t;
              m.length = 0, m.mode = 7;
            case 7:
              if (2048 & m.flags) {
                if (H === 0) break t;
                for (Z = 0; h = P[$ + Z++], m.head && h && m.length < 65536 && (m.head.name += String.fromCharCode(h)), h && Z < H; ) ;
                if (512 & m.flags && (m.check = a(m.check, P, Z, $)), H -= Z, $ += Z, h) break t;
              } else m.head && (m.head.name = null);
              m.length = 0, m.mode = 8;
            case 8:
              if (4096 & m.flags) {
                if (H === 0) break t;
                for (Z = 0; h = P[$ + Z++], m.head && h && m.length < 65536 && (m.head.comment += String.fromCharCode(h)), h && Z < H; ) ;
                if (512 & m.flags && (m.check = a(m.check, P, Z, $)), H -= Z, $ += Z, h) break t;
              } else m.head && (m.head.comment = null);
              m.mode = 9;
            case 9:
              if (512 & m.flags) {
                for (; L < 16; ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                if (z !== (65535 & m.check)) {
                  S.msg = "header crc mismatch", m.mode = 30;
                  break;
                }
                L = z = 0;
              }
              m.head && (m.head.hcrc = m.flags >> 9 & 1, m.head.done = !0), S.adler = m.check = 0, m.mode = 12;
              break;
            case 10:
              for (; L < 32; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              S.adler = m.check = y(z), L = z = 0, m.mode = 11;
            case 11:
              if (m.havedict === 0) return S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = H, m.hold = z, m.bits = L, 2;
              S.adler = m.check = 1, m.mode = 12;
            case 12:
              if (M === 5 || M === 6) break t;
            case 13:
              if (m.last) {
                z >>>= 7 & L, L -= 7 & L, m.mode = 27;
                break;
              }
              for (; L < 3; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              switch (m.last = 1 & z, L -= 1, 3 & (z >>>= 1)) {
                case 0:
                  m.mode = 14;
                  break;
                case 1:
                  if (U(m), m.mode = 20, M !== 6) break;
                  z >>>= 2, L -= 2;
                  break t;
                case 2:
                  m.mode = 17;
                  break;
                case 3:
                  S.msg = "invalid block type", m.mode = 30;
              }
              z >>>= 2, L -= 2;
              break;
            case 14:
              for (z >>>= 7 & L, L -= 7 & L; L < 32; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              if ((65535 & z) != (z >>> 16 ^ 65535)) {
                S.msg = "invalid stored block lengths", m.mode = 30;
                break;
              }
              if (m.length = 65535 & z, L = z = 0, m.mode = 15, M === 6) break t;
            case 15:
              m.mode = 16;
            case 16:
              if (Z = m.length) {
                if (H < Z && (Z = H), Q < Z && (Z = Q), Z === 0) break t;
                i.arraySet(et, P, $, Z, nt), H -= Z, $ += Z, Q -= Z, nt += Z, m.length -= Z;
                break;
              }
              m.mode = 12;
              break;
            case 17:
              for (; L < 14; ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              if (m.nlen = 257 + (31 & z), z >>>= 5, L -= 5, m.ndist = 1 + (31 & z), z >>>= 5, L -= 5, m.ncode = 4 + (15 & z), z >>>= 4, L -= 4, 286 < m.nlen || 30 < m.ndist) {
                S.msg = "too many length or distance symbols", m.mode = 30;
                break;
              }
              m.have = 0, m.mode = 18;
            case 18:
              for (; m.have < m.ncode; ) {
                for (; L < 3; ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                m.lens[F[m.have++]] = 7 & z, z >>>= 3, L -= 3;
              }
              for (; m.have < 19; ) m.lens[F[m.have++]] = 0;
              if (m.lencode = m.lendyn, m.lenbits = 7, N = { bits: m.lenbits }, B = d(0, m.lens, 0, 19, m.lencode, 0, m.work, N), m.lenbits = N.bits, B) {
                S.msg = "invalid code lengths set", m.mode = 30;
                break;
              }
              m.have = 0, m.mode = 19;
            case 19:
              for (; m.have < m.nlen + m.ndist; ) {
                for (; ot = (b = m.lencode[z & (1 << m.lenbits) - 1]) >>> 16 & 255, yt = 65535 & b, !((st = b >>> 24) <= L); ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                if (yt < 16) z >>>= st, L -= st, m.lens[m.have++] = yt;
                else {
                  if (yt === 16) {
                    for (k = st + 2; L < k; ) {
                      if (H === 0) break t;
                      H--, z += P[$++] << L, L += 8;
                    }
                    if (z >>>= st, L -= st, m.have === 0) {
                      S.msg = "invalid bit length repeat", m.mode = 30;
                      break;
                    }
                    h = m.lens[m.have - 1], Z = 3 + (3 & z), z >>>= 2, L -= 2;
                  } else if (yt === 17) {
                    for (k = st + 3; L < k; ) {
                      if (H === 0) break t;
                      H--, z += P[$++] << L, L += 8;
                    }
                    L -= st, h = 0, Z = 3 + (7 & (z >>>= st)), z >>>= 3, L -= 3;
                  } else {
                    for (k = st + 7; L < k; ) {
                      if (H === 0) break t;
                      H--, z += P[$++] << L, L += 8;
                    }
                    L -= st, h = 0, Z = 11 + (127 & (z >>>= st)), z >>>= 7, L -= 7;
                  }
                  if (m.have + Z > m.nlen + m.ndist) {
                    S.msg = "invalid bit length repeat", m.mode = 30;
                    break;
                  }
                  for (; Z--; ) m.lens[m.have++] = h;
                }
              }
              if (m.mode === 30) break;
              if (m.lens[256] === 0) {
                S.msg = "invalid code -- missing end-of-block", m.mode = 30;
                break;
              }
              if (m.lenbits = 9, N = { bits: m.lenbits }, B = d(f, m.lens, 0, m.nlen, m.lencode, 0, m.work, N), m.lenbits = N.bits, B) {
                S.msg = "invalid literal/lengths set", m.mode = 30;
                break;
              }
              if (m.distbits = 6, m.distcode = m.distdyn, N = { bits: m.distbits }, B = d(u, m.lens, m.nlen, m.ndist, m.distcode, 0, m.work, N), m.distbits = N.bits, B) {
                S.msg = "invalid distances set", m.mode = 30;
                break;
              }
              if (m.mode = 20, M === 6) break t;
            case 20:
              m.mode = 21;
            case 21:
              if (6 <= H && 258 <= Q) {
                S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = H, m.hold = z, m.bits = L, c(S, Y), nt = S.next_out, et = S.output, Q = S.avail_out, $ = S.next_in, P = S.input, H = S.avail_in, z = m.hold, L = m.bits, m.mode === 12 && (m.back = -1);
                break;
              }
              for (m.back = 0; ot = (b = m.lencode[z & (1 << m.lenbits) - 1]) >>> 16 & 255, yt = 65535 & b, !((st = b >>> 24) <= L); ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              if (ot && (240 & ot) == 0) {
                for (dt = st, Ut = ot, zt = yt; ot = (b = m.lencode[zt + ((z & (1 << dt + Ut) - 1) >> dt)]) >>> 16 & 255, yt = 65535 & b, !(dt + (st = b >>> 24) <= L); ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                z >>>= dt, L -= dt, m.back += dt;
              }
              if (z >>>= st, L -= st, m.back += st, m.length = yt, ot === 0) {
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
                for (k = m.extra; L < k; ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                m.length += z & (1 << m.extra) - 1, z >>>= m.extra, L -= m.extra, m.back += m.extra;
              }
              m.was = m.length, m.mode = 23;
            case 23:
              for (; ot = (b = m.distcode[z & (1 << m.distbits) - 1]) >>> 16 & 255, yt = 65535 & b, !((st = b >>> 24) <= L); ) {
                if (H === 0) break t;
                H--, z += P[$++] << L, L += 8;
              }
              if ((240 & ot) == 0) {
                for (dt = st, Ut = ot, zt = yt; ot = (b = m.distcode[zt + ((z & (1 << dt + Ut) - 1) >> dt)]) >>> 16 & 255, yt = 65535 & b, !(dt + (st = b >>> 24) <= L); ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                z >>>= dt, L -= dt, m.back += dt;
              }
              if (z >>>= st, L -= st, m.back += st, 64 & ot) {
                S.msg = "invalid distance code", m.mode = 30;
                break;
              }
              m.offset = yt, m.extra = 15 & ot, m.mode = 24;
            case 24:
              if (m.extra) {
                for (k = m.extra; L < k; ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                m.offset += z & (1 << m.extra) - 1, z >>>= m.extra, L -= m.extra, m.back += m.extra;
              }
              if (m.offset > m.dmax) {
                S.msg = "invalid distance too far back", m.mode = 30;
                break;
              }
              m.mode = 25;
            case 25:
              if (Q === 0) break t;
              if (Z = Y - Q, m.offset > Z) {
                if ((Z = m.offset - Z) > m.whave && m.sane) {
                  S.msg = "invalid distance too far back", m.mode = 30;
                  break;
                }
                ht = Z > m.wnext ? (Z -= m.wnext, m.wsize - Z) : m.wnext - Z, Z > m.length && (Z = m.length), vt = m.window;
              } else vt = et, ht = nt - m.offset, Z = m.length;
              for (Q < Z && (Z = Q), Q -= Z, m.length -= Z; et[nt++] = vt[ht++], --Z; ) ;
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
                  H--, z |= P[$++] << L, L += 8;
                }
                if (Y -= Q, S.total_out += Y, m.total += Y, Y && (S.adler = m.check = m.flags ? a(m.check, et, Y, nt - Y) : o(m.check, et, Y, nt - Y)), Y = Q, (m.flags ? z : y(z)) !== m.check) {
                  S.msg = "incorrect data check", m.mode = 30;
                  break;
                }
                L = z = 0;
              }
              m.mode = 28;
            case 28:
              if (m.wrap && m.flags) {
                for (; L < 32; ) {
                  if (H === 0) break t;
                  H--, z += P[$++] << L, L += 8;
                }
                if (z !== (4294967295 & m.total)) {
                  S.msg = "incorrect length check", m.mode = 30;
                  break;
                }
                L = z = 0;
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
              return l;
          }
          return S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = H, m.hold = z, m.bits = L, (m.wsize || Y !== S.avail_out && m.mode < 30 && (m.mode < 27 || M !== 4)) && K(S, S.output, S.next_out, Y - S.avail_out) ? (m.mode = 31, -4) : (X -= S.avail_in, Y -= S.avail_out, S.total_in += X, S.total_out += Y, m.total += Y, m.wrap && Y && (S.adler = m.check = m.flags ? a(m.check, et, Y, S.next_out - Y) : o(m.check, et, Y, S.next_out - Y)), S.data_type = m.bits + (m.last ? 64 : 0) + (m.mode === 12 ? 128 : 0) + (m.mode === 20 || m.mode === 15 ? 256 : 0), (X == 0 && Y === 0 || M === 4) && B === p && (B = -5), B);
        }, s.inflateEnd = function(S) {
          if (!S || !S.state) return l;
          var M = S.state;
          return M.window && (M.window = null), S.state = null, p;
        }, s.inflateGetHeader = function(S, M) {
          var m;
          return S && S.state ? (2 & (m = S.state).wrap) == 0 ? l : ((m.head = M).done = !1, p) : l;
        }, s.inflateSetDictionary = function(S, M) {
          var m, P = M.length;
          return S && S.state ? (m = S.state).wrap !== 0 && m.mode !== 11 ? l : m.mode === 11 && o(1, M, P, 0) !== m.check ? -3 : K(S, M, P, P) ? (m.mode = 31, -4) : (m.havedict = 1, p) : l;
        }, s.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, r, s) {
        var i = e("../utils/common"), o = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], a = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], c = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], d = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        r.exports = function(f, u, p, l, w, g, _, y) {
          var v, x, T, A, C, D, R, I, U, K = y.bits, S = 0, M = 0, m = 0, P = 0, et = 0, $ = 0, nt = 0, H = 0, Q = 0, z = 0, L = null, X = 0, Y = new i.Buf16(16), Z = new i.Buf16(16), ht = null, vt = 0;
          for (S = 0; S <= 15; S++) Y[S] = 0;
          for (M = 0; M < l; M++) Y[u[p + M]]++;
          for (et = K, P = 15; 1 <= P && Y[P] === 0; P--) ;
          if (P < et && (et = P), P === 0) return w[g++] = 20971520, w[g++] = 20971520, y.bits = 1, 0;
          for (m = 1; m < P && Y[m] === 0; m++) ;
          for (et < m && (et = m), S = H = 1; S <= 15; S++) if (H <<= 1, (H -= Y[S]) < 0) return -1;
          if (0 < H && (f === 0 || P !== 1)) return -1;
          for (Z[1] = 0, S = 1; S < 15; S++) Z[S + 1] = Z[S] + Y[S];
          for (M = 0; M < l; M++) u[p + M] !== 0 && (_[Z[u[p + M]]++] = M);
          if (D = f === 0 ? (L = ht = _, 19) : f === 1 ? (L = o, X -= 257, ht = a, vt -= 257, 256) : (L = c, ht = d, -1), S = m, C = g, nt = M = z = 0, T = -1, A = (Q = 1 << ($ = et)) - 1, f === 1 && 852 < Q || f === 2 && 592 < Q) return 1;
          for (; ; ) {
            for (R = S - nt, U = _[M] < D ? (I = 0, _[M]) : _[M] > D ? (I = ht[vt + _[M]], L[X + _[M]]) : (I = 96, 0), v = 1 << S - nt, m = x = 1 << $; w[C + (z >> nt) + (x -= v)] = R << 24 | I << 16 | U | 0, x !== 0; ) ;
            for (v = 1 << S - 1; z & v; ) v >>= 1;
            if (v !== 0 ? (z &= v - 1, z += v) : z = 0, M++, --Y[S] == 0) {
              if (S === P) break;
              S = u[p + _[M]];
            }
            if (et < S && (z & A) !== T) {
              for (nt === 0 && (nt = et), C += m, H = 1 << ($ = S - nt); $ + nt < P && !((H -= Y[$ + nt]) <= 0); ) $++, H <<= 1;
              if (Q += 1 << $, f === 1 && 852 < Q || f === 2 && 592 < Q) return 1;
              w[T = z & A] = et << 24 | $ << 16 | C - g | 0;
            }
          }
          return z !== 0 && (w[C + z] = S - nt << 24 | 64 << 16 | 0), y.bits = et, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(e, r, s) {
        r.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(e, r, s) {
        var i = e("../utils/common"), o = 0, a = 1;
        function c(b) {
          for (var E = b.length; 0 <= --E; ) b[E] = 0;
        }
        var d = 0, f = 29, u = 256, p = u + 1 + f, l = 30, w = 19, g = 2 * p + 1, _ = 15, y = 16, v = 7, x = 256, T = 16, A = 17, C = 18, D = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], R = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], I = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], U = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], K = new Array(2 * (p + 2));
        c(K);
        var S = new Array(2 * l);
        c(S);
        var M = new Array(512);
        c(M);
        var m = new Array(256);
        c(m);
        var P = new Array(f);
        c(P);
        var et, $, nt, H = new Array(l);
        function Q(b, E, F, j, O) {
          this.static_tree = b, this.extra_bits = E, this.extra_base = F, this.elems = j, this.max_length = O, this.has_stree = b && b.length;
        }
        function z(b, E) {
          this.dyn_tree = b, this.max_code = 0, this.stat_desc = E;
        }
        function L(b) {
          return b < 256 ? M[b] : M[256 + (b >>> 7)];
        }
        function X(b, E) {
          b.pending_buf[b.pending++] = 255 & E, b.pending_buf[b.pending++] = E >>> 8 & 255;
        }
        function Y(b, E, F) {
          b.bi_valid > y - F ? (b.bi_buf |= E << b.bi_valid & 65535, X(b, b.bi_buf), b.bi_buf = E >> y - b.bi_valid, b.bi_valid += F - y) : (b.bi_buf |= E << b.bi_valid & 65535, b.bi_valid += F);
        }
        function Z(b, E, F) {
          Y(b, F[2 * E], F[2 * E + 1]);
        }
        function ht(b, E) {
          for (var F = 0; F |= 1 & b, b >>>= 1, F <<= 1, 0 < --E; ) ;
          return F >>> 1;
        }
        function vt(b, E, F) {
          var j, O, W = new Array(_ + 1), G = 0;
          for (j = 1; j <= _; j++) W[j] = G = G + F[j - 1] << 1;
          for (O = 0; O <= E; O++) {
            var V = b[2 * O + 1];
            V !== 0 && (b[2 * O] = ht(W[V]++, V));
          }
        }
        function st(b) {
          var E;
          for (E = 0; E < p; E++) b.dyn_ltree[2 * E] = 0;
          for (E = 0; E < l; E++) b.dyn_dtree[2 * E] = 0;
          for (E = 0; E < w; E++) b.bl_tree[2 * E] = 0;
          b.dyn_ltree[2 * x] = 1, b.opt_len = b.static_len = 0, b.last_lit = b.matches = 0;
        }
        function ot(b) {
          8 < b.bi_valid ? X(b, b.bi_buf) : 0 < b.bi_valid && (b.pending_buf[b.pending++] = b.bi_buf), b.bi_buf = 0, b.bi_valid = 0;
        }
        function yt(b, E, F, j) {
          var O = 2 * E, W = 2 * F;
          return b[O] < b[W] || b[O] === b[W] && j[E] <= j[F];
        }
        function dt(b, E, F) {
          for (var j = b.heap[F], O = F << 1; O <= b.heap_len && (O < b.heap_len && yt(E, b.heap[O + 1], b.heap[O], b.depth) && O++, !yt(E, j, b.heap[O], b.depth)); ) b.heap[F] = b.heap[O], F = O, O <<= 1;
          b.heap[F] = j;
        }
        function Ut(b, E, F) {
          var j, O, W, G, V = 0;
          if (b.last_lit !== 0) for (; j = b.pending_buf[b.d_buf + 2 * V] << 8 | b.pending_buf[b.d_buf + 2 * V + 1], O = b.pending_buf[b.l_buf + V], V++, j === 0 ? Z(b, O, E) : (Z(b, (W = m[O]) + u + 1, E), (G = D[W]) !== 0 && Y(b, O -= P[W], G), Z(b, W = L(--j), F), (G = R[W]) !== 0 && Y(b, j -= H[W], G)), V < b.last_lit; ) ;
          Z(b, x, E);
        }
        function zt(b, E) {
          var F, j, O, W = E.dyn_tree, G = E.stat_desc.static_tree, V = E.stat_desc.has_stree, J = E.stat_desc.elems, ct = -1;
          for (b.heap_len = 0, b.heap_max = g, F = 0; F < J; F++) W[2 * F] !== 0 ? (b.heap[++b.heap_len] = ct = F, b.depth[F] = 0) : W[2 * F + 1] = 0;
          for (; b.heap_len < 2; ) W[2 * (O = b.heap[++b.heap_len] = ct < 2 ? ++ct : 0)] = 1, b.depth[O] = 0, b.opt_len--, V && (b.static_len -= G[2 * O + 1]);
          for (E.max_code = ct, F = b.heap_len >> 1; 1 <= F; F--) dt(b, W, F);
          for (O = J; F = b.heap[1], b.heap[1] = b.heap[b.heap_len--], dt(b, W, 1), j = b.heap[1], b.heap[--b.heap_max] = F, b.heap[--b.heap_max] = j, W[2 * O] = W[2 * F] + W[2 * j], b.depth[O] = (b.depth[F] >= b.depth[j] ? b.depth[F] : b.depth[j]) + 1, W[2 * F + 1] = W[2 * j + 1] = O, b.heap[1] = O++, dt(b, W, 1), 2 <= b.heap_len; ) ;
          b.heap[--b.heap_max] = b.heap[1], (function(it, It) {
            var Ne, Bt, Me, ft, sn, qn, Vt = It.dyn_tree, ds = It.max_code, Co = It.stat_desc.static_tree, Eo = It.stat_desc.has_stree, Do = It.stat_desc.extra_bits, fs = It.stat_desc.extra_base, Ue = It.stat_desc.max_length, on = 0;
            for (ft = 0; ft <= _; ft++) it.bl_count[ft] = 0;
            for (Vt[2 * it.heap[it.heap_max] + 1] = 0, Ne = it.heap_max + 1; Ne < g; Ne++) Ue < (ft = Vt[2 * Vt[2 * (Bt = it.heap[Ne]) + 1] + 1] + 1) && (ft = Ue, on++), Vt[2 * Bt + 1] = ft, ds < Bt || (it.bl_count[ft]++, sn = 0, fs <= Bt && (sn = Do[Bt - fs]), qn = Vt[2 * Bt], it.opt_len += qn * (ft + sn), Eo && (it.static_len += qn * (Co[2 * Bt + 1] + sn)));
            if (on !== 0) {
              do {
                for (ft = Ue - 1; it.bl_count[ft] === 0; ) ft--;
                it.bl_count[ft]--, it.bl_count[ft + 1] += 2, it.bl_count[Ue]--, on -= 2;
              } while (0 < on);
              for (ft = Ue; ft !== 0; ft--) for (Bt = it.bl_count[ft]; Bt !== 0; ) ds < (Me = it.heap[--Ne]) || (Vt[2 * Me + 1] !== ft && (it.opt_len += (ft - Vt[2 * Me + 1]) * Vt[2 * Me], Vt[2 * Me + 1] = ft), Bt--);
            }
          })(b, E), vt(W, ct, b.bl_count);
        }
        function h(b, E, F) {
          var j, O, W = -1, G = E[1], V = 0, J = 7, ct = 4;
          for (G === 0 && (J = 138, ct = 3), E[2 * (F + 1) + 1] = 65535, j = 0; j <= F; j++) O = G, G = E[2 * (j + 1) + 1], ++V < J && O === G || (V < ct ? b.bl_tree[2 * O] += V : O !== 0 ? (O !== W && b.bl_tree[2 * O]++, b.bl_tree[2 * T]++) : V <= 10 ? b.bl_tree[2 * A]++ : b.bl_tree[2 * C]++, W = O, ct = (V = 0) === G ? (J = 138, 3) : O === G ? (J = 6, 3) : (J = 7, 4));
        }
        function B(b, E, F) {
          var j, O, W = -1, G = E[1], V = 0, J = 7, ct = 4;
          for (G === 0 && (J = 138, ct = 3), j = 0; j <= F; j++) if (O = G, G = E[2 * (j + 1) + 1], !(++V < J && O === G)) {
            if (V < ct) for (; Z(b, O, b.bl_tree), --V != 0; ) ;
            else O !== 0 ? (O !== W && (Z(b, O, b.bl_tree), V--), Z(b, T, b.bl_tree), Y(b, V - 3, 2)) : V <= 10 ? (Z(b, A, b.bl_tree), Y(b, V - 3, 3)) : (Z(b, C, b.bl_tree), Y(b, V - 11, 7));
            W = O, ct = (V = 0) === G ? (J = 138, 3) : O === G ? (J = 6, 3) : (J = 7, 4);
          }
        }
        c(H);
        var N = !1;
        function k(b, E, F, j) {
          Y(b, (d << 1) + (j ? 1 : 0), 3), (function(O, W, G, V) {
            ot(O), X(O, G), X(O, ~G), i.arraySet(O.pending_buf, O.window, W, G, O.pending), O.pending += G;
          })(b, E, F);
        }
        s._tr_init = function(b) {
          N || ((function() {
            var E, F, j, O, W, G = new Array(_ + 1);
            for (O = j = 0; O < f - 1; O++) for (P[O] = j, E = 0; E < 1 << D[O]; E++) m[j++] = O;
            for (m[j - 1] = O, O = W = 0; O < 16; O++) for (H[O] = W, E = 0; E < 1 << R[O]; E++) M[W++] = O;
            for (W >>= 7; O < l; O++) for (H[O] = W << 7, E = 0; E < 1 << R[O] - 7; E++) M[256 + W++] = O;
            for (F = 0; F <= _; F++) G[F] = 0;
            for (E = 0; E <= 143; ) K[2 * E + 1] = 8, E++, G[8]++;
            for (; E <= 255; ) K[2 * E + 1] = 9, E++, G[9]++;
            for (; E <= 279; ) K[2 * E + 1] = 7, E++, G[7]++;
            for (; E <= 287; ) K[2 * E + 1] = 8, E++, G[8]++;
            for (vt(K, p + 1, G), E = 0; E < l; E++) S[2 * E + 1] = 5, S[2 * E] = ht(E, 5);
            et = new Q(K, D, u + 1, p, _), $ = new Q(S, R, 0, l, _), nt = new Q(new Array(0), I, 0, w, v);
          })(), N = !0), b.l_desc = new z(b.dyn_ltree, et), b.d_desc = new z(b.dyn_dtree, $), b.bl_desc = new z(b.bl_tree, nt), b.bi_buf = 0, b.bi_valid = 0, st(b);
        }, s._tr_stored_block = k, s._tr_flush_block = function(b, E, F, j) {
          var O, W, G = 0;
          0 < b.level ? (b.strm.data_type === 2 && (b.strm.data_type = (function(V) {
            var J, ct = 4093624447;
            for (J = 0; J <= 31; J++, ct >>>= 1) if (1 & ct && V.dyn_ltree[2 * J] !== 0) return o;
            if (V.dyn_ltree[18] !== 0 || V.dyn_ltree[20] !== 0 || V.dyn_ltree[26] !== 0) return a;
            for (J = 32; J < u; J++) if (V.dyn_ltree[2 * J] !== 0) return a;
            return o;
          })(b)), zt(b, b.l_desc), zt(b, b.d_desc), G = (function(V) {
            var J;
            for (h(V, V.dyn_ltree, V.l_desc.max_code), h(V, V.dyn_dtree, V.d_desc.max_code), zt(V, V.bl_desc), J = w - 1; 3 <= J && V.bl_tree[2 * U[J] + 1] === 0; J--) ;
            return V.opt_len += 3 * (J + 1) + 5 + 5 + 4, J;
          })(b), O = b.opt_len + 3 + 7 >>> 3, (W = b.static_len + 3 + 7 >>> 3) <= O && (O = W)) : O = W = F + 5, F + 4 <= O && E !== -1 ? k(b, E, F, j) : b.strategy === 4 || W === O ? (Y(b, 2 + (j ? 1 : 0), 3), Ut(b, K, S)) : (Y(b, 4 + (j ? 1 : 0), 3), (function(V, J, ct, it) {
            var It;
            for (Y(V, J - 257, 5), Y(V, ct - 1, 5), Y(V, it - 4, 4), It = 0; It < it; It++) Y(V, V.bl_tree[2 * U[It] + 1], 3);
            B(V, V.dyn_ltree, J - 1), B(V, V.dyn_dtree, ct - 1);
          })(b, b.l_desc.max_code + 1, b.d_desc.max_code + 1, G + 1), Ut(b, b.dyn_ltree, b.dyn_dtree)), st(b), j && ot(b);
        }, s._tr_tally = function(b, E, F) {
          return b.pending_buf[b.d_buf + 2 * b.last_lit] = E >>> 8 & 255, b.pending_buf[b.d_buf + 2 * b.last_lit + 1] = 255 & E, b.pending_buf[b.l_buf + b.last_lit] = 255 & F, b.last_lit++, E === 0 ? b.dyn_ltree[2 * F]++ : (b.matches++, E--, b.dyn_ltree[2 * (m[F] + u + 1)]++, b.dyn_dtree[2 * L(E)]++), b.last_lit === b.lit_bufsize - 1;
        }, s._tr_align = function(b) {
          Y(b, 2, 3), Z(b, x, K), (function(E) {
            E.bi_valid === 16 ? (X(E, E.bi_buf), E.bi_buf = 0, E.bi_valid = 0) : 8 <= E.bi_valid && (E.pending_buf[E.pending++] = 255 & E.bi_buf, E.bi_buf >>= 8, E.bi_valid -= 8);
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
              var c, d, f, u, p = 1, l = {}, w = !1, g = o.document, _ = Object.getPrototypeOf && Object.getPrototypeOf(o);
              _ = _ && _.setTimeout ? _ : o, c = {}.toString.call(o.process) === "[object process]" ? function(T) {
                process.nextTick(function() {
                  v(T);
                });
              } : (function() {
                if (o.postMessage && !o.importScripts) {
                  var T = !0, A = o.onmessage;
                  return o.onmessage = function() {
                    T = !1;
                  }, o.postMessage("", "*"), o.onmessage = A, T;
                }
              })() ? (u = "setImmediate$" + Math.random() + "$", o.addEventListener ? o.addEventListener("message", x, !1) : o.attachEvent("onmessage", x), function(T) {
                o.postMessage(u + T, "*");
              }) : o.MessageChannel ? ((f = new MessageChannel()).port1.onmessage = function(T) {
                v(T.data);
              }, function(T) {
                f.port2.postMessage(T);
              }) : g && "onreadystatechange" in g.createElement("script") ? (d = g.documentElement, function(T) {
                var A = g.createElement("script");
                A.onreadystatechange = function() {
                  v(T), A.onreadystatechange = null, d.removeChild(A), A = null;
                }, d.appendChild(A);
              }) : function(T) {
                setTimeout(v, 0, T);
              }, _.setImmediate = function(T) {
                typeof T != "function" && (T = new Function("" + T));
                for (var A = new Array(arguments.length - 1), C = 0; C < A.length; C++) A[C] = arguments[C + 1];
                var D = { callback: T, args: A };
                return l[p] = D, c(p), p++;
              }, _.clearImmediate = y;
            }
            function y(T) {
              delete l[T];
            }
            function v(T) {
              if (w) setTimeout(v, 0, T);
              else {
                var A = l[T];
                if (A) {
                  w = !0;
                  try {
                    (function(C) {
                      var D = C.callback, R = C.args;
                      switch (R.length) {
                        case 0:
                          D();
                          break;
                        case 1:
                          D(R[0]);
                          break;
                        case 2:
                          D(R[0], R[1]);
                          break;
                        case 3:
                          D(R[0], R[1], R[2]);
                          break;
                        default:
                          D.apply(a, R);
                      }
                    })(A);
                  } finally {
                    y(T), w = !1;
                  }
                }
              }
            }
            function x(T) {
              T.source === o && typeof T.data == "string" && T.data.indexOf(u) === 0 && v(+T.data.slice(u.length));
            }
          })(typeof self > "u" ? i === void 0 ? this : i : self);
        }).call(this, typeof fn < "u" ? fn : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}] }, {}, [10])(10);
    });
  })(hr)), hr.exports;
}
var dh = hh();
const xo = /* @__PURE__ */ uh(dh), Dr = "__ync_update__", Ar = "_worldnotes.yjs";
async function fh(n, t) {
  const e = new xo(), r = await n.get(Dr);
  r && e.file(Ar, r);
  const s = await n.keys();
  for (const i of s) {
    if (i === Dr) continue;
    const o = await n.get(i);
    e.file(`${i}.md`, o ?? "");
  }
  return e.generateAsync({ type: "blob" });
}
async function ph(n, t, e) {
  const r = e?.strategy ?? "overwrite", s = [], i = [], o = await xo.loadAsync(t), a = o.file(Ar);
  if (a) {
    const c = await a.async("string");
    await n.set(Dr, c), s.push(Ar);
  }
  for (const [c, d] of Object.entries(o.files)) {
    if (d.dir || !c.endsWith(".md")) continue;
    const f = c.slice(0, -3);
    if (f === "") continue;
    if (r === "skip" && await n.get(f) !== null) {
      i.push(f);
      continue;
    }
    const u = await d.async("string");
    await n.set(f, u), s.push(f);
  }
  return { imported: s, skipped: i };
}
function bh(n) {
  const { storage: t, onImportComplete: e, exportFilename: r, importStrategy: s } = n;
  let i = null, o = null, a = null;
  async function c() {
    const f = await fh(t), u = URL.createObjectURL(f), p = document.createElement("a");
    p.href = u, p.download = r ?? "worldnotes-export.zip", p.click(), URL.revokeObjectURL(u);
  }
  async function d() {
    const f = a?.files?.[0];
    f && (await ph(t, f, { strategy: s }), await e());
  }
  return {
    name: "import-export",
    version: "1.0.0",
    kind: "ui",
    slots: ["wn-toolbar"],
    onMount(f) {
      i = document.createElement("button"), i.textContent = "Export", i.addEventListener("click", c), f.appendChild(i), o = document.createElement("button"), o.textContent = "Import", o.addEventListener("click", () => {
        a?.click();
      }), f.appendChild(o), a = document.createElement("input"), a.type = "file", a.accept = ".zip", a.style.display = "none", a.addEventListener("change", d), f.appendChild(a);
    },
    onDestroy() {
      i && (i.removeEventListener("click", c), i.remove(), i = null), o && (o.removeEventListener("click", () => {
        a?.click();
      }), o.remove(), o = null), a && (a.removeEventListener("change", d), a.remove(), a = null);
    }
  };
}
export {
  ah as EditorBuilder,
  _h as EditorHistory,
  yh as IndexedDBAdapter,
  To as LocalStorageAdapter,
  Po as blockquotePlugin,
  Mo as boldPlugin,
  wh as createEditor,
  bh as createImportExportPlugin,
  Su as createYDocState,
  ea as defaultPlugins,
  fh as exportWorld,
  No as headingsPlugin,
  Fo as hrPlugin,
  ph as importWorld,
  Bo as inlineCodePlugin,
  Uo as italicPlugin,
  jo as linkPlugin,
  th as loadYDoc,
  mh as remoteCursorsPlugin,
  gh as renderDocumentToHTML,
  po as renderInlineHTML,
  Lu as renderLineToHTML,
  Qu as saveYDoc,
  cs as scanInline,
  Wo as strikethroughPlugin,
  Iu as tokenizeDocument,
  Tu as tokenizeLine,
  Ro as wikiLinkPlugin
};

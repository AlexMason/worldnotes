const mo = "worldnotes";
class wo {
  constructor(t = mo) {
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
function or(n) {
  const t = n.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function ss(n) {
  const t = n.indexOf("|"), e = (t === -1 ? n : n.slice(0, t)).trim(), r = t === -1 ? or(e) : n.slice(t + 1).trim();
  return { page: e, display: r || or(e) };
}
function _o(n, t) {
  const r = n.replace(/^\?/, "").split("&").filter(Boolean).filter((o) => {
    const [a = ""] = o.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) !== "path";
  }), s = t.map((o) => encodeURIComponent(o)).join("/");
  return `?${[...r, `path=${s}`].join("&")}`;
}
function yo(n) {
  const e = n.replace(/^\?/, "").split("&").filter(Boolean).find((i) => {
    const [o = ""] = i.split("=", 1);
    return decodeURIComponent(o.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const r = e.indexOf("="), s = r === -1 ? "" : e.slice(r + 1);
  return s ? s.split("/").filter(Boolean).map((i) => decodeURIComponent(i)) : [];
}
const bo = {
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
    const { page: e, display: r } = ss(n.groups[0] ?? ""), s = document.createElement("span");
    return s.className = "wn-wiki-link", s.dataset.page = e, s.dataset.raw = n.raw, s.textContent = r, s;
  },
  onNavigate(n, t) {
    const { page: e } = ss(n.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
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
const ko = {
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
  }
};
function kr(n, t, e) {
  const r = document.createElement("span");
  r.className = n;
  const s = (i) => {
    const o = document.createElement("span");
    return o.className = "wn-punct", o.textContent = i, o;
  };
  return r.appendChild(s(t)), r.appendChild(document.createTextNode(e)), r.appendChild(s(t)), r;
}
const vo = {
  name: "bold",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(n, t) {
    return kr("wn-bold", "**", n.groups[0] ?? "");
  }
}, So = {
  name: "italic",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(n, t) {
    return kr("wn-italic", "*", n.groups[0] ?? "");
  }
}, xo = {
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
  }
}, Co = {
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
  }
}, Eo = {
  name: "hr",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(n, t) {
    const e = document.createElement("span");
    return e.className = "wn-hr", e.textContent = "---", e;
  }
}, Do = {
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
  onNavigate(n, t) {
    const e = n.groups[1] ?? "";
    return !e.includes("://") && !e.startsWith("//") ? (t.navigate(e), !0) : !1;
  }
}, Ao = {
  name: "strikethrough",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "strikethrough", pattern: /~~([^~]+)~~/ }],
  render(n, t) {
    const e = kr("wn-strikethrough", "~~", n.groups[0] ?? "");
    return e.dataset.raw = n.raw, e;
  }
}, Io = [
  ko,
  // line-level — must come before inline plugins
  Eo,
  // line-level
  Co,
  // line-level
  bo,
  // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  Do,
  // inline — [text](url) after [[...]]
  vo,
  // inline — ** before * to avoid partial match
  So,
  // inline
  Ao,
  // inline — ~~text~~ (no conflict with * patterns)
  xo
  // inline
], To = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
class Oo {
  constructor() {
    this.contentPlugins = /* @__PURE__ */ new Map(), this.uiPlugins = /* @__PURE__ */ new Map(), this.storagePlugins = /* @__PURE__ */ new Map(), this.tokenTypeOwners = /* @__PURE__ */ new Map(), this.slotAssignments = /* @__PURE__ */ new Map();
  }
  // ── Validation ──────────────────────────────────────────────────────────────
  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  validateVersion(t, e) {
    if (!To.test(e))
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
const At = () => /* @__PURE__ */ new Map(), ar = (n) => {
  const t = At();
  return n.forEach((e, r) => {
    t.set(r, e);
  }), t;
}, Wt = (n, t, e) => {
  let r = n.get(t);
  return r === void 0 && n.set(t, r = e()), r;
}, zo = (n, t) => {
  const e = [];
  for (const [r, s] of n)
    e.push(t(s, r));
  return e;
}, Ro = (n, t) => {
  for (const [e, r] of n)
    if (t(r, e))
      return !0;
  return !1;
}, Qt = () => /* @__PURE__ */ new Set(), Yn = (n) => n[n.length - 1], Lo = (n, t) => {
  for (let e = 0; e < t.length; e++)
    n.push(t[e]);
}, Yt = Array.from, vr = (n, t) => {
  for (let e = 0; e < n.length; e++)
    if (!t(n[e], e, n))
      return !1;
  return !0;
}, Sr = (n, t) => {
  for (let e = 0; e < n.length; e++)
    if (t(n[e], e, n))
      return !0;
  return !1;
}, No = (n, t) => {
  const e = new Array(n);
  for (let r = 0; r < n; r++)
    e[r] = t(r, e);
  return e;
}, xe = Array.isArray;
class xr {
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
      Qt
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
    return Yt((this._observers.get(t) || At()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = At();
  }
}
class Uo {
  constructor() {
    this._observers = At();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(t, e) {
    Wt(this._observers, t, Qt).add(e);
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
    return Yt((this._observers.get(t) || At()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = At();
  }
}
const Ut = Math.floor, fn = Math.abs, Cr = (n, t) => n < t ? n : t, fe = (n, t) => n > t ? n : t, Bo = Math.pow, Ms = (n) => n !== 0 ? n < 0 : 1 / n < 0, is = 1, os = 2, Gn = 4, Kn = 8, Pe = 32, Zt = 64, It = 128, zn = 31, cr = 63, ae = 127, Mo = 2147483647, yn = Number.MAX_SAFE_INTEGER, as = Number.MIN_SAFE_INTEGER, Fo = Number.isInteger || ((n) => typeof n == "number" && isFinite(n) && Ut(n) === n), Fs = String.fromCharCode, Po = (n) => n.toLowerCase(), jo = /^\s*/g, $o = (n) => n.replace(jo, ""), Wo = /([A-Z])/g, cs = (n, t) => $o(n.replace(Wo, (e) => `${t}${Po(e)}`)), Ho = (n) => {
  const t = unescape(encodeURIComponent(n)), e = t.length, r = new Uint8Array(e);
  for (let s = 0; s < e; s++)
    r[s] = /** @type {number} */
    t.codePointAt(s);
  return r;
}, je = (
  /** @type {TextEncoder} */
  typeof TextEncoder < "u" ? new TextEncoder() : null
), Vo = (n) => je.encode(n), Zo = je ? Vo : Ho;
let Me = typeof TextDecoder > "u" ? null : new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 });
Me && Me.decode(new Uint8Array()).length === 1 && (Me = null);
const Yo = (n, t) => No(t, () => n).join("");
class Je {
  constructor() {
    this.cpos = 0, this.cbuf = new Uint8Array(100), this.bufs = [];
  }
}
const xt = () => new Je(), Er = (n) => {
  let t = n.cpos;
  for (let e = 0; e < n.bufs.length; e++)
    t += n.bufs[e].length;
  return t;
}, ht = (n) => {
  const t = new Uint8Array(Er(n));
  let e = 0;
  for (let r = 0; r < n.bufs.length; r++) {
    const s = n.bufs[r];
    t.set(s, e), e += s.length;
  }
  return t.set(new Uint8Array(n.cbuf.buffer, 0, n.cpos), e), t;
}, Go = (n, t) => {
  const e = n.cbuf.length;
  e - n.cpos < t && (n.bufs.push(new Uint8Array(n.cbuf.buffer, 0, n.cpos)), n.cbuf = new Uint8Array(fe(e, t) * 2), n.cpos = 0);
}, yt = (n, t) => {
  const e = n.cbuf.length;
  n.cpos === e && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(e * 2), n.cpos = 0), n.cbuf[n.cpos++] = t;
}, lr = yt, q = (n, t) => {
  for (; t > ae; )
    yt(n, It | ae & t), t = Ut(t / 128);
  yt(n, ae & t);
}, Dr = (n, t) => {
  const e = Ms(t);
  for (e && (t = -t), yt(n, (t > cr ? It : 0) | (e ? Zt : 0) | cr & t), t = Ut(t / 64); t > 0; )
    yt(n, (t > ae ? It : 0) | ae & t), t = Ut(t / 128);
}, hr = new Uint8Array(3e4), Ko = hr.length / 3, qo = (n, t) => {
  if (t.length < Ko) {
    const e = je.encodeInto(t, hr).written || 0;
    q(n, e);
    for (let r = 0; r < e; r++)
      yt(n, hr[r]);
  } else
    pt(n, Zo(t));
}, Jo = (n, t) => {
  const e = unescape(encodeURIComponent(t)), r = e.length;
  q(n, r);
  for (let s = 0; s < r; s++)
    yt(
      n,
      /** @type {number} */
      e.codePointAt(s)
    );
}, ce = je && /** @type {any} */
je.encodeInto ? qo : Jo, Rn = (n, t) => {
  const e = n.cbuf.length, r = n.cpos, s = Cr(e - r, t.length), i = t.length - s;
  n.cbuf.set(t.subarray(0, s), r), n.cpos += s, i > 0 && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(fe(e * 2, i)), n.cbuf.set(t.subarray(s)), n.cpos = i);
}, pt = (n, t) => {
  q(n, t.byteLength), Rn(n, t);
}, Ar = (n, t) => {
  Go(n, t);
  const e = new DataView(n.cbuf.buffer, n.cpos, t);
  return n.cpos += t, e;
}, Xo = (n, t) => Ar(n, 4).setFloat32(0, t, !1), Qo = (n, t) => Ar(n, 8).setFloat64(0, t, !1), ta = (n, t) => (
  /** @type {any} */
  Ar(n, 8).setBigInt64(0, t, !1)
), ls = new DataView(new ArrayBuffer(4)), ea = (n) => (ls.setFloat32(0, n), ls.getFloat32(0) === n), $e = (n, t) => {
  switch (typeof t) {
    case "string":
      yt(n, 119), ce(n, t);
      break;
    case "number":
      Fo(t) && fn(t) <= Mo ? (yt(n, 125), Dr(n, t)) : ea(t) ? (yt(n, 124), Xo(n, t)) : (yt(n, 123), Qo(n, t));
      break;
    case "bigint":
      yt(n, 122), ta(n, t);
      break;
    case "object":
      if (t === null)
        yt(n, 126);
      else if (xe(t)) {
        yt(n, 117), q(n, t.length);
        for (let e = 0; e < t.length; e++)
          $e(n, t[e]);
      } else if (t instanceof Uint8Array)
        yt(n, 116), pt(n, t);
      else {
        yt(n, 118);
        const e = Object.keys(t);
        q(n, e.length);
        for (let r = 0; r < e.length; r++) {
          const s = e[r];
          ce(n, s), $e(n, t[s]);
        }
      }
      break;
    case "boolean":
      yt(n, t ? 120 : 121);
      break;
    default:
      yt(n, 127);
  }
};
class hs extends Je {
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
const us = (n) => {
  n.count > 0 && (Dr(n.encoder, n.count === 1 ? n.s : -n.s), n.count > 1 && q(n.encoder, n.count - 2));
};
class pn {
  constructor() {
    this.encoder = new Je(), this.s = 0, this.count = 0;
  }
  /**
   * @param {number} v
   */
  write(t) {
    this.s === t ? this.count++ : (us(this), this.count = 1, this.s = t);
  }
  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array() {
    return us(this), ht(this.encoder);
  }
}
const ds = (n) => {
  if (n.count > 0) {
    const t = n.diff * 2 + (n.count === 1 ? 0 : 1);
    Dr(n.encoder, t), n.count > 1 && q(n.encoder, n.count - 2);
  }
};
class qn {
  constructor() {
    this.encoder = new Je(), this.s = 0, this.count = 0, this.diff = 0;
  }
  /**
   * @param {number} v
   */
  write(t) {
    this.diff === t - this.s ? (this.s = t, this.count++) : (ds(this), this.count = 1, this.diff = t - this.s, this.s = t);
  }
  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array() {
    return ds(this), ht(this.encoder);
  }
}
class na {
  constructor() {
    this.sarr = [], this.s = "", this.lensE = new pn();
  }
  /**
   * @param {string} string
   */
  write(t) {
    this.s += t, this.s.length > 19 && (this.sarr.push(this.s), this.s = ""), this.lensE.write(t.length);
  }
  toUint8Array() {
    const t = new Je();
    return this.sarr.push(this.s), this.s = "", ce(t, this.sarr.join("")), Rn(t, this.lensE.toUint8Array()), ht(t);
  }
}
const Pt = (n) => new Error(n), Nt = () => {
  throw Pt("Method unimplemented");
}, Rt = () => {
  throw Pt("Unexpected case");
}, Ps = Pt("Unexpected end of array"), js = Pt("Integer out of Range");
class Ln {
  /**
   * @param {Uint8Array<Buf>} uint8Array Binary data to decode
   */
  constructor(t) {
    this.arr = t, this.pos = 0;
  }
}
const ne = (n) => new Ln(n), ra = (n) => n.pos !== n.arr.length, sa = (n, t) => {
  const e = new Uint8Array(n.arr.buffer, n.pos + n.arr.byteOffset, t);
  return n.pos += t, e;
}, St = (n) => sa(n, tt(n)), Ce = (n) => n.arr[n.pos++], tt = (n) => {
  let t = 0, e = 1;
  const r = n.arr.length;
  for (; n.pos < r; ) {
    const s = n.arr[n.pos++];
    if (t = t + (s & ae) * e, e *= 128, s < It)
      return t;
    if (t > yn)
      throw js;
  }
  throw Ps;
}, Ir = (n) => {
  let t = n.arr[n.pos++], e = t & cr, r = 64;
  const s = (t & Zt) > 0 ? -1 : 1;
  if ((t & It) === 0)
    return s * e;
  const i = n.arr.length;
  for (; n.pos < i; ) {
    if (t = n.arr[n.pos++], e = e + (t & ae) * r, r *= 128, t < It)
      return s * e;
    if (e > yn)
      throw js;
  }
  throw Ps;
}, ia = (n) => {
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
}, oa = (n) => (
  /** @type any */
  Me.decode(St(n))
), Xt = Me ? oa : ia, Tr = (n, t) => {
  const e = new DataView(n.arr.buffer, n.arr.byteOffset + n.pos, t);
  return n.pos += t, e;
}, aa = (n) => Tr(n, 4).getFloat32(0, !1), ca = (n) => Tr(n, 8).getFloat64(0, !1), la = (n) => (
  /** @type {any} */
  Tr(n, 8).getBigInt64(0, !1)
), ha = [
  (n) => {
  },
  // CASE 127: undefined
  (n) => null,
  // CASE 126: null
  Ir,
  // CASE 125: integer
  aa,
  // CASE 124: float32
  ca,
  // CASE 123: float64
  la,
  // CASE 122: bigint
  (n) => !1,
  // CASE 121: boolean (false)
  (n) => !0,
  // CASE 120: boolean (true)
  Xt,
  // CASE 119: string
  (n) => {
    const t = tt(n), e = {};
    for (let r = 0; r < t; r++) {
      const s = Xt(n);
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
], We = (n) => ha[127 - Ce(n)](n);
class fs extends Ln {
  /**
   * @param {Uint8Array} uint8Array
   * @param {function(Decoder):T} reader
   */
  constructor(t, e) {
    super(t), this.reader = e, this.s = null, this.count = 0;
  }
  read() {
    return this.count === 0 && (this.s = this.reader(this), ra(this) ? this.count = tt(this) + 1 : this.count = -1), this.count--, /** @type {T} */
    this.s;
  }
}
class gn extends Ln {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    super(t), this.s = 0, this.count = 0;
  }
  read() {
    if (this.count === 0) {
      this.s = Ir(this);
      const t = Ms(this.s);
      this.count = 1, t && (this.s = -this.s, this.count = tt(this) + 2);
    }
    return this.count--, /** @type {number} */
    this.s;
  }
}
class Jn extends Ln {
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
      const t = Ir(this), e = t & 1;
      this.diff = Ut(t / 2), this.count = 1, e && (this.count = tt(this) + 2);
    }
    return this.s += this.diff, this.count--, this.s;
  }
}
class ua {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    this.decoder = new gn(t), this.str = Xt(this.decoder), this.spos = 0;
  }
  /**
   * @return {string}
   */
  read() {
    const t = this.spos + this.decoder.read(), e = this.str.slice(this.spos, t);
    return this.spos = t, e;
  }
}
const da = crypto.getRandomValues.bind(crypto), $s = () => da(new Uint32Array(1))[0], fa = "10000000-1000-4000-8000" + -1e11, pa = () => fa.replace(
  /[018]/g,
  /** @param {number} c */
  (n) => (n ^ $s() & 15 >> n / 4).toString(16)
), te = Date.now, ps = (n) => (
  /** @type {Promise<T>} */
  new Promise(n)
);
Promise.all.bind(Promise);
const gs = (n) => n === void 0 ? null : n;
class ga {
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
let Ws = new ga(), Or = !0;
try {
  typeof localStorage < "u" && localStorage && (Ws = localStorage, Or = !1);
} catch {
}
const Hs = Ws, ma = (n) => Or || addEventListener(
  "storage",
  /** @type {any} */
  n
), wa = (n) => Or || removeEventListener(
  "storage",
  /** @type {any} */
  n
), He = /* @__PURE__ */ Symbol("Equality"), Vs = (n, t) => n === t || !!n?.[He]?.(t) || !1, _a = (n) => typeof n == "object", ya = Object.assign, ba = Object.keys, ka = (n, t) => {
  for (const e in n)
    t(n[e], e);
}, va = (n, t) => {
  const e = [];
  for (const r in n)
    e.push(t(n[r], r));
  return e;
}, bn = (n) => ba(n).length, Sa = (n) => {
  for (const t in n)
    return !1;
  return !0;
}, Xe = (n, t) => {
  for (const e in n)
    if (!t(n[e], e))
      return !1;
  return !0;
}, zr = (n, t) => Object.prototype.hasOwnProperty.call(n, t), xa = (n, t) => n === t || bn(n) === bn(t) && Xe(n, (e, r) => (e !== void 0 || zr(t, r)) && Vs(t[r], e)), Ca = Object.freeze, Zs = (n) => {
  for (const t in n) {
    const e = n[t];
    (typeof e == "object" || typeof e == "function") && Zs(n[t]);
  }
  return Ca(n);
}, Rr = (n, t, e = 0) => {
  try {
    for (; e < n.length; e++)
      n[e](...t);
  } finally {
    e < n.length && Rr(n, t, e + 1);
  }
}, Ea = (n) => n, ye = (n, t) => {
  if (n === t)
    return !0;
  if (n == null || t == null || n.constructor !== t.constructor && (n.constructor || Object) !== (t.constructor || Object))
    return !1;
  if (n[He] != null)
    return n[He](t);
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
        if (!t.has(e) || !ye(n.get(e), t.get(e)))
          return !1;
      break;
    }
    case void 0:
    case Object:
      if (bn(n) !== bn(t))
        return !1;
      for (const e in n)
        if (!zr(n, e) || !ye(n[e], t[e]))
          return !1;
      break;
    case Array:
      if (n.length !== t.length)
        return !1;
      for (let e = 0; e < n.length; e++)
        if (!ye(n[e], t[e]))
          return !1;
      break;
    default:
      return !1;
  }
  return !0;
}, Da = (n, t) => t.includes(n), ee = typeof process < "u" && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process < "u" ? process : 0) === "[object process]", Ys = typeof window < "u" && typeof document < "u" && !ee;
let Ft;
const Aa = () => {
  if (Ft === void 0)
    if (ee) {
      Ft = At();
      const n = process.argv;
      let t = null;
      for (let e = 0; e < n.length; e++) {
        const r = n[e];
        r[0] === "-" ? (t !== null && Ft.set(t, ""), t = r) : t !== null && (Ft.set(t, r), t = null);
      }
      t !== null && Ft.set(t, "");
    } else typeof location == "object" ? (Ft = At(), (location.search || "?").slice(1).split("&").forEach((n) => {
      if (n.length !== 0) {
        const [t, e] = n.split("=");
        Ft.set(`--${cs(t, "-")}`, e), Ft.set(`-${cs(t, "-")}`, e);
      }
    })) : Ft = At();
  return Ft;
}, ur = (n) => Aa().has(n), kn = (n) => gs(ee ? process.env[n.toUpperCase().replaceAll("-", "_")] : Hs.getItem(n)), Gs = (n) => ur("--" + n) || kn(n) !== null, Ia = Gs("production"), Ta = ee && Da(process.env.FORCE_COLOR, ["true", "1", "2"]), Oa = Ta || !ur("--no-colors") && // @todo deprecate --no-colors
!Gs("no-color") && (!ee || process.stdout.isTTY) && (!ee || ur("--color") || kn("COLORTERM") !== null || (kn("TERM") || "").includes("color")), Ks = (n) => new Uint8Array(n), za = (n, t, e) => new Uint8Array(n, t, e), Ra = (n) => new Uint8Array(n), La = (n) => {
  let t = "";
  for (let e = 0; e < n.byteLength; e++)
    t += Fs(n[e]);
  return btoa(t);
}, Na = (n) => Buffer.from(n.buffer, n.byteOffset, n.byteLength).toString("base64"), Ua = (n) => {
  const t = atob(n), e = Ks(t.length);
  for (let r = 0; r < t.length; r++)
    e[r] = t.charCodeAt(r);
  return e;
}, Ba = (n) => {
  const t = Buffer.from(n, "base64");
  return za(t.buffer, t.byteOffset, t.byteLength);
}, Ma = Ys ? La : Na, Fa = Ys ? Ua : Ba, Pa = (n) => {
  const t = Ks(n.byteLength);
  return t.set(n), t;
};
class ja {
  /**
   * @param {L} left
   * @param {R} right
   */
  constructor(t, e) {
    this.left = t, this.right = e;
  }
}
const Vt = (n, t) => new ja(n, t), ms = (n) => n.next() >= 0.5, Xn = (n, t, e) => Ut(n.next() * (e + 1 - t) + t), qs = (n, t, e) => Ut(n.next() * (e + 1 - t) + t), Lr = (n, t, e) => qs(n, t, e), $a = (n) => Fs(Lr(n, 97, 122)), Wa = (n, t = 0, e = 20) => {
  const r = Lr(n, t, e);
  let s = "";
  for (let i = 0; i < r; i++)
    s += $a(n);
  return s;
}, Qn = (n, t) => t[Lr(n, 0, t.length - 1)], Ha = /* @__PURE__ */ Symbol("0schema");
class Va {
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
      t.push(Yo(" ", (this._rerrs.length - e) * 2) + `${r.path != null ? `[${r.path}] ` : ""}${r.has} doesn't match ${r.expected}. ${r.message}`);
    }
    return t.join(`
`);
  }
}
const dr = (n, t) => n === t ? !0 : n == null || t == null || n.constructor !== t.constructor ? !1 : n[He] ? Vs(n, t) : xe(n) ? vr(
  n,
  (e) => Sr(t, (r) => dr(e, r))
) : _a(n) ? Xe(
  n,
  (e, r) => dr(e, t[r])
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
      this.constructor._dilutes && ([r, e] = [e, r]), dr(e, r)
    );
  }
  /**
   * Overwrite this when necessary. By default, we only check the `shape` property which every shape
   * should have.
   * @param {Schema<any>} other
   */
  equals(t) {
    return this.constructor === t.constructor && ye(this.shape, t.shape);
  }
  [Ha]() {
    return !0;
  }
  /**
   * @param {object} other
   */
  [He](t) {
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
    return Oe(this, Fn);
  }
  /**
   * @type {$Optional<Schema<T>>}
   */
  get optional() {
    return new Qs(
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
    return ws(t, this), /** @type {any} */
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
    return ws(t, this), t;
  }
}
class Nr extends Et {
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
const gt = (n, t = null) => new Nr(n, t);
gt(Nr);
class Ur extends Et {
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
const kt = (n) => new Ur(n);
gt(Ur);
class Nn extends Et {
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
const Un = (...n) => new Nn(n), Js = gt(Nn), Za = (
  /** @type {any} */
  RegExp.escape || /** @type {(str:string) => string} */
  ((n) => n.replace(/[().|&,$^[\]]/g, (t) => "\\" + t))
), Xs = (n) => {
  if (Ee.check(n))
    return [Za(n)];
  if (Js.check(n))
    return (
      /** @type {Array<string|number>} */
      n.shape.map((t) => t + "")
    );
  if (ci.check(n))
    return ["[+-]?\\d+.?\\d*"];
  if (li.check(n))
    return [".*"];
  if (vn.check(n))
    return n.shape.map(Xs).flat(1);
  Rt();
};
class Ya extends Et {
  /**
   * @param {T} shape
   */
  constructor(t) {
    super(), this.shape = t, this._r = new RegExp("^" + t.map(Xs).map((e) => `(${e.join("|")})`).join("") + "$");
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
gt(Ya);
const Ga = /* @__PURE__ */ Symbol("optional");
class Qs extends Et {
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
  get [Ga]() {
    return !0;
  }
}
const Ka = gt(Qs);
class qa extends Et {
  /**
   * @param {any} _o
   * @param {ValidationError} [err]
   * @return {_o is never}
   */
  check(t, e) {
    return e?.extend(null, "never", typeof t), !1;
  }
}
gt(qa);
class Bn extends Et {
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
    return new Bn(this.shape, !0);
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is $ObjectToType<S>}
   */
  check(t, e) {
    return t == null ? (e?.extend(null, "object", "null"), !1) : Xe(this.shape, (r, s) => {
      const i = this._isPartial && !zr(t, s) || r.check(t[s], e);
      return !i && e?.extend(s.toString(), r.toString(), typeof t[s], "Object property does not match"), i;
    });
  }
}
const Ja = (n) => (
  /** @type {any} */
  new Bn(n)
), Xa = gt(Bn), Qa = kt((n) => n != null && (n.constructor === Object || n.constructor == null));
class ti extends Et {
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
const ei = (n, t) => new ti(n, t), tc = gt(ti);
class ni extends Et {
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
const ec = (...n) => new ni(n);
gt(ni);
class ri extends Et {
  /**
   * @param {Array<S>} v
   */
  constructor(t) {
    super(), this.shape = t.length === 1 ? t[0] : new Br(t);
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is Array<S extends Schema<infer T> ? T : never>} o
   */
  check(t, e) {
    const r = xe(t) && vr(t, (s) => this.shape.check(s));
    return !r && e?.extend(null, "Array", ""), r;
  }
}
const si = (...n) => new ri(n), nc = gt(ri), rc = kt((n) => xe(n));
class ii extends Et {
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
const sc = (n, t = null) => new ii(n, t);
gt(ii);
const ic = sc(Et);
class oc extends Et {
  /**
   * @param {Args} args
   */
  constructor(t) {
    super(), this.len = t.length - 1, this.args = ec(...t.slice(-1)), this.res = t[this.len];
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
const ac = gt(oc), cc = kt((n) => typeof n == "function");
class lc extends Et {
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
    const r = vr(this.shape, (s) => s.check(t, e));
    return !r && e?.extend(null, "Intersectinon", typeof t), r;
  }
}
gt(lc, (n) => n.shape.length > 0);
class Br extends Et {
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
    const r = Sr(this.shape, (s) => s.check(t, e));
    return e?.extend(null, "Union", typeof t), r;
  }
}
const Oe = (...n) => n.findIndex((t) => vn.check(t)) >= 0 ? Oe(...n.map((t) => Ve(t)).map((t) => vn.check(t) ? t.shape : [t]).flat(1)) : n.length === 1 ? n[0] : new Br(n), vn = (
  /** @type {Schema<$Union<any>>} */
  gt(Br)
), oi = () => !0, Sn = kt(oi), hc = (
  /** @type {Schema<Schema<any>>} */
  gt(Ur, (n) => n.shape === oi)
), Mr = kt((n) => typeof n == "bigint"), uc = (
  /** @type {Schema<Schema<BigInt>>} */
  kt((n) => n === Mr)
), ai = kt((n) => typeof n == "symbol");
kt((n) => n === ai);
const be = kt((n) => typeof n == "number"), ci = (
  /** @type {Schema<Schema<number>>} */
  kt((n) => n === be)
), Ee = kt((n) => typeof n == "string"), li = (
  /** @type {Schema<Schema<string>>} */
  kt((n) => n === Ee)
), Mn = kt((n) => typeof n == "boolean"), dc = (
  /** @type {Schema<Schema<Boolean>>} */
  kt((n) => n === Mn)
), hi = Un(void 0);
gt(Nn, (n) => n.shape.length === 1 && n.shape[0] === void 0);
Un(void 0);
const Fn = Un(null), fc = (
  /** @type {Schema<Schema<null>>} */
  gt(Nn, (n) => n.shape.length === 1 && n.shape[0] === null)
);
gt(Uint8Array);
gt(Nr, (n) => n.shape === Uint8Array);
const pc = Oe(be, Ee, Fn, hi, Mr, Mn, ai);
(() => {
  const n = (
    /** @type {$Array<$any>} */
    si(Sn)
  ), t = (
    /** @type {$Record<$string,$any>} */
    ei(Ee, Sn)
  ), e = Oe(be, Ee, Fn, Mn, n, t);
  return n.shape = e, t.shape.values = e, e;
})();
const Ve = (n) => {
  if (ic.check(n))
    return (
      /** @type {any} */
      n
    );
  if (Qa.check(n)) {
    const t = {};
    for (const e in n)
      t[e] = Ve(n[e]);
    return (
      /** @type {any} */
      Ja(t)
    );
  } else {
    if (rc.check(n))
      return (
        /** @type {any} */
        Oe(...n.map(Ve))
      );
    if (pc.check(n))
      return (
        /** @type {any} */
        Un(n)
      );
    if (cc.check(n))
      return (
        /** @type {any} */
        gt(
          /** @type {any} */
          n
        )
      );
  }
  Rt();
}, ws = Ia ? () => {
} : (n, t) => {
  const e = new Va();
  if (!t.check(n, e))
    throw Pt(`Expected value to be of type ${t.constructor.name}.
${e.toString()}`);
};
class gc {
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
    return this.patterns.push({ if: Ve(t), h: e }), this;
  }
  /**
   * @template R
   * @param {(o:any,s:State)=>R} h
   */
  else(t) {
    return this.if(Sn, t);
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
        throw Pt("Unhandled pattern");
      }
    );
  }
}
const mc = (n) => new gc(
  /** @type {any} */
  n
), ui = (
  /** @type {any} */
  mc(
    /** @type {Schema<prng.PRNG>} */
    Sn
  ).if(ci, (n, t) => Xn(t, as, yn)).if(li, (n, t) => Wa(t)).if(dc, (n, t) => ms(t)).if(uc, (n, t) => BigInt(Xn(t, as, yn))).if(vn, (n, t) => me(t, Qn(t, n.shape))).if(Xa, (n, t) => {
    const e = {};
    for (const r in n.shape) {
      let s = n.shape[r];
      if (Ka.check(s)) {
        if (ms(t))
          continue;
        s = s.shape;
      }
      e[r] = ui(s, t);
    }
    return e;
  }).if(nc, (n, t) => {
    const e = [], r = qs(t, 0, 42);
    for (let s = 0; s < r; s++)
      e.push(me(t, n.shape));
    return e;
  }).if(Js, (n, t) => Qn(t, n.shape)).if(fc, (n, t) => null).if(ac, (n, t) => {
    const e = me(t, n.res);
    return () => e;
  }).if(hc, (n, t) => me(t, Qn(t, [
    be,
    Ee,
    Fn,
    hi,
    Mr,
    Mn,
    si(be),
    ei(Oe("a", "b", "c"), be)
  ]))).if(tc, (n, t) => {
    const e = {}, r = Xn(t, 0, 3);
    for (let s = 0; s < r; s++) {
      const i = me(t, n.shape.keys), o = me(t, n.shape.values);
      e[i] = o;
    }
    return e;
  }).done()
), me = (n, t) => (
  /** @type {any} */
  ui(Ve(t), n)
), Pn = (
  /** @type {Document} */
  typeof document < "u" ? document : {}
);
kt((n) => n.nodeType === kc);
typeof DOMParser < "u" && new DOMParser();
kt((n) => n.nodeType === _c);
kt((n) => n.nodeType === yc);
const wc = (n) => zo(n, (t, e) => `${e}:${t};`).join(""), _c = Pn.ELEMENT_NODE, yc = Pn.TEXT_NODE, bc = Pn.DOCUMENT_NODE, kc = Pn.DOCUMENT_FRAGMENT_NODE;
kt((n) => n.nodeType === bc);
const Gt = Symbol, di = Gt(), fi = Gt(), vc = Gt(), Sc = Gt(), xc = Gt(), pi = Gt(), Cc = Gt(), Fr = Gt(), Ec = Gt(), Dc = (n) => {
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
}, Ac = {
  [di]: Vt("font-weight", "bold"),
  [fi]: Vt("font-weight", "normal"),
  [vc]: Vt("color", "blue"),
  [xc]: Vt("color", "green"),
  [Sc]: Vt("color", "grey"),
  [pi]: Vt("color", "red"),
  [Cc]: Vt("color", "purple"),
  [Fr]: Vt("color", "orange"),
  // not well supported in chrome when debugging node with inspector - TODO: deprecate
  [Ec]: Vt("color", "black")
}, Ic = (n) => {
  n.length === 1 && n[0]?.constructor === Function && (n = /** @type {Array<string|Symbol|Object|number>} */
  /** @type {[function]} */
  n[0]());
  const t = [], e = [], r = At();
  let s = [], i = 0;
  for (; i < n.length; i++) {
    const o = n[i], a = Ac[o];
    if (a !== void 0)
      r.set(a.left, a.right);
    else {
      if (o === void 0)
        break;
      if (o.constructor === String || o.constructor === Number) {
        const c = wc(r);
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
}, gi = Oa ? Ic : Dc, Tc = (...n) => {
  console.log(...gi(n)), wi.forEach((t) => t.print(n));
}, mi = (...n) => {
  console.warn(...gi(n)), n.unshift(Fr), wi.forEach((t) => t.print(n));
}, wi = Qt(), _i = (n) => ({
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this;
  },
  // @ts-ignore
  next: n
}), Oc = (n, t) => _i(() => {
  let e;
  do
    e = n.next();
  while (!e.done && !t(e.value));
  return e;
}), tr = (n, t) => _i(() => {
  const { done: e, value: r } = n.next();
  return { done: e, value: e ? void 0 : t(r) };
});
class jn {
  /**
   * @param {number} clock
   * @param {number} len
   */
  constructor(t, e) {
    this.clock = t, this.len = e;
  }
}
class ze {
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
      Ti(n, i, d.clock, d.len, e);
  }
}), zc = (n, t) => {
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
  return e !== void 0 && zc(e, t.clock) !== null;
}, Pr = (n) => {
  n.clients.forEach((t) => {
    t.sort((s, i) => s.clock - i.clock);
    let e, r;
    for (e = 1, r = 1; e < t.length; e++) {
      const s = t[r - 1], i = t[e];
      s.clock + s.len >= i.clock ? t[r - 1] = new jn(s.clock, fe(s.len, i.clock + i.len - s.clock)) : (r < e && (t[r] = i), r++);
    }
    t.length = r;
  });
}, fr = (n) => {
  const t = new ze();
  for (let e = 0; e < n.length; e++)
    n[e].clients.forEach((r, s) => {
      if (!t.clients.has(s)) {
        const i = r.slice();
        for (let o = e + 1; o < n.length; o++)
          Lo(i, n[o].clients.get(s) || []);
        t.clients.set(s, i);
      }
    });
  return Pr(t), t;
}, Ze = (n, t, e, r) => {
  Wt(n.clients, t, () => (
    /** @type {Array<DeleteItem>} */
    []
  )).push(new jn(e, r));
}, Rc = () => new ze(), Lc = (n) => {
  const t = Rc();
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
        s.push(new jn(a, c));
      }
    }
    s.length > 0 && t.clients.set(r, s);
  }), t;
}, Re = (n, t) => {
  q(n.restEncoder, t.clients.size), Yt(t.clients.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
    n.resetDsCurVal(), q(n.restEncoder, e);
    const s = r.length;
    q(n.restEncoder, s);
    for (let i = 0; i < s; i++) {
      const o = r[i];
      n.writeDsClock(o.clock), n.writeDsLen(o.len);
    }
  });
}, jr = (n) => {
  const t = new ze(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    n.resetDsCurVal();
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    if (i > 0) {
      const o = Wt(t.clients, s, () => (
        /** @type {Array<DeleteItem>} */
        []
      ));
      for (let a = 0; a < i; a++)
        o.push(new jn(n.readDsClock(), n.readDsLen()));
    }
  }
  return t;
}, _s = (n, t, e) => {
  const r = new ze(), s = tt(n.restDecoder);
  for (let i = 0; i < s; i++) {
    n.resetDsCurVal();
    const o = tt(n.restDecoder), a = tt(n.restDecoder), c = e.clients.get(o) || [], d = mt(e, o);
    for (let f = 0; f < a; f++) {
      const u = n.readDsClock(), m = u + n.readDsLen();
      if (u < d) {
        d < m && Ze(r, o, d, m - d);
        let l = jt(c, u), w = c[l];
        for (!w.deleted && w.id.clock < u && (c.splice(l + 1, 0, On(t, w, u - w.id.clock)), l++); l < c.length && (w = c[l++], w.id.clock < m); )
          w.deleted || (m < w.id.clock + w.length && c.splice(l, 0, On(t, w, m - w.id.clock)), w.delete(t));
      } else
        Ze(r, o, u, m - u);
    }
  }
  if (r.clients.size > 0) {
    const i = new le();
    return q(i.restEncoder, 0), Re(i, r), i.toUint8Array();
  }
  return null;
}, yi = $s;
class pe extends xr {
  /**
   * @param {DocOpts} opts configuration
   */
  constructor({ guid: t = pa(), collectionid: e = null, gc: r = !0, gcFilter: s = () => !0, meta: i = null, autoLoad: o = !1, shouldLoad: a = !0 } = {}) {
    super(), this.gc = r, this.gcFilter = s, this.clientID = yi(), this.guid = t, this.collectionid = e, this.share = /* @__PURE__ */ new Map(), this.store = new Ai(), this._transaction = null, this._transactionCleanups = [], this.subdocs = /* @__PURE__ */ new Set(), this._item = null, this.shouldLoad = a, this.autoLoad = o, this.meta = i, this.isLoaded = !1, this.isSynced = !1, this.isDestroyed = !1, this.whenLoaded = ps((d) => {
      this.on("load", () => {
        this.isLoaded = !0, d(this);
      });
    });
    const c = () => ps((d) => {
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
    return new Set(Yt(this.subdocs).map((t) => t.guid));
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
    return this.get(t, he);
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
      this.get(t, Ie)
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
      this.get(t, Te)
    );
  }
  /**
   * @param {string} [name]
   * @return {YXmlFragment}
   *
   * @public
   */
  getXmlFragment(t = "") {
    return this.get(t, ue);
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
    this.isDestroyed = !0, Yt(this.subdocs).forEach((e) => e.destroy());
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
class bi {
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
class ki extends bi {
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
    return Xt(this.restDecoder);
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
    return Pa(St(this.restDecoder));
  }
  /**
   * Legacy implementation uses JSON parse. We use any-decoding in v2.
   *
   * @return {any}
   */
  readJSON() {
    return JSON.parse(Xt(this.restDecoder));
  }
  /**
   * @return {string}
   */
  readKey() {
    return Xt(this.restDecoder);
  }
}
class Nc {
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
class Ae extends Nc {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor(t) {
    super(t), this.keys = [], tt(t), this.keyClockDecoder = new Jn(St(t)), this.clientDecoder = new gn(St(t)), this.leftClockDecoder = new Jn(St(t)), this.rightClockDecoder = new Jn(St(t)), this.infoDecoder = new fs(St(t), Ce), this.stringDecoder = new ua(St(t)), this.parentInfoDecoder = new fs(St(t), Ce), this.typeRefDecoder = new gn(St(t)), this.lenDecoder = new gn(St(t));
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
class vi {
  constructor() {
    this.restEncoder = xt();
  }
  toUint8Array() {
    return ht(this.restEncoder);
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
class tn extends vi {
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
    lr(this.restEncoder, t);
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
    $e(this.restEncoder, t);
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
class Si {
  constructor() {
    this.restEncoder = xt(), this.dsCurrVal = 0;
  }
  toUint8Array() {
    return ht(this.restEncoder);
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
class le extends Si {
  constructor() {
    super(), this.keyMap = /* @__PURE__ */ new Map(), this.keyClock = 0, this.keyClockEncoder = new qn(), this.clientEncoder = new pn(), this.leftClockEncoder = new qn(), this.rightClockEncoder = new qn(), this.infoEncoder = new hs(lr), this.stringEncoder = new na(), this.parentInfoEncoder = new hs(lr), this.typeRefEncoder = new pn(), this.lenEncoder = new pn();
  }
  toUint8Array() {
    const t = xt();
    return q(t, 0), pt(t, this.keyClockEncoder.toUint8Array()), pt(t, this.clientEncoder.toUint8Array()), pt(t, this.leftClockEncoder.toUint8Array()), pt(t, this.rightClockEncoder.toUint8Array()), pt(t, ht(this.infoEncoder)), pt(t, this.stringEncoder.toUint8Array()), pt(t, ht(this.parentInfoEncoder)), pt(t, this.typeRefEncoder.toUint8Array()), pt(t, this.lenEncoder.toUint8Array()), Rn(t, ht(this.restEncoder)), ht(t);
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
    $e(this.restEncoder, t);
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
    $e(this.restEncoder, t);
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
const Uc = (n, t, e, r) => {
  r = fe(r, t[0].id.clock);
  const s = jt(t, r);
  q(n.restEncoder, t.length - s), n.writeClient(e), q(n.restEncoder, r);
  const i = t[s];
  i.write(n, r - i.id.clock);
  for (let o = s + 1; o < t.length; o++)
    t[o].write(n, 0);
}, $r = (n, t, e) => {
  const r = /* @__PURE__ */ new Map();
  e.forEach((s, i) => {
    mt(t, i) > s && r.set(i, s);
  }), $n(t).forEach((s, i) => {
    e.has(i) || r.set(i, 0);
  }), q(n.restEncoder, r.size), Yt(r.entries()).sort((s, i) => i[0] - s[0]).forEach(([s, i]) => {
    Uc(
      n,
      /** @type {Array<GC|Item>} */
      t.clients.get(s),
      s,
      i
    );
  });
}, Bc = (n, t) => {
  const e = At(), r = tt(n.restDecoder);
  for (let s = 0; s < r; s++) {
    const i = tt(n.restDecoder), o = new Array(i), a = n.readClient();
    let c = tt(n.restDecoder);
    e.set(a, { i: 0, refs: o });
    for (let d = 0; d < i; d++) {
      const f = n.readInfo();
      switch (zn & f) {
        case 0: {
          const u = n.readLen();
          o[d] = new Ot(rt(a, c), u), c += u;
          break;
        }
        case 10: {
          const u = tt(n.restDecoder);
          o[d] = new zt(rt(a, c), u), c += u;
          break;
        }
        default: {
          const u = (f & (Zt | It)) === 0, m = new lt(
            rt(a, c),
            null,
            // left
            (f & It) === It ? n.readLeftID() : null,
            // origin
            null,
            // right
            (f & Zt) === Zt ? n.readRightID() : null,
            // right origin
            u ? n.readParentInfo() ? t.get(n.readString()) : n.readLeftID() : null,
            // parent
            u && (f & Pe) === Pe ? n.readString() : null,
            // parentSub
            qi(n, f)
            // item content
          );
          o[d] = m, c += m.length;
        }
      }
    }
  }
  return e;
}, Mc = (n, t, e) => {
  const r = [];
  let s = Yt(e.keys()).sort((l, w) => l - w);
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
  const a = new Ai(), c = /* @__PURE__ */ new Map(), d = (l, w) => {
    const p = c.get(l);
    (p == null || p > w) && c.set(l, w);
  };
  let f = (
    /** @type {any} */
    o.refs[
      /** @type {any} */
      o.i++
    ]
  );
  const u = /* @__PURE__ */ new Map(), m = () => {
    for (const l of r) {
      const w = l.id.client, p = e.get(w);
      p ? (p.i--, a.clients.set(w, p.refs.slice(p.i)), e.delete(w), p.i = 0, p.refs = []) : a.clients.set(w, [l]), s = s.filter((y) => y !== w);
    }
    r.length = 0;
  };
  for (; ; ) {
    if (f.constructor !== zt) {
      const w = Wt(u, f.id.client, () => mt(t, f.id.client)) - f.id.clock;
      if (w < 0)
        r.push(f), d(f.id.client, f.id.clock - 1), m();
      else {
        const p = f.getMissing(n, t);
        if (p !== null) {
          r.push(f);
          const y = e.get(
            /** @type {number} */
            p
          ) || { refs: [], i: 0 };
          if (y.refs.length === y.i)
            d(
              /** @type {number} */
              p,
              mt(t, p)
            ), m();
          else {
            f = y.refs[y.i++];
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
    return $r(l, a, /* @__PURE__ */ new Map()), q(l.restEncoder, 0), { missing: c, update: l.toUint8Array() };
  }
  return null;
}, Fc = (n, t) => $r(n, t.doc.store, t.beforeState), Pc = (n, t, e, r = new Ae(n)) => at(t, (s) => {
  s.local = !1;
  let i = !1;
  const o = s.doc, a = o.store, c = Bc(r, o), d = Mc(s, a, c), f = a.pendingStructs;
  if (f) {
    for (const [m, l] of f.missing)
      if (l < mt(a, m)) {
        i = !0;
        break;
      }
    if (d) {
      for (const [m, l] of d.missing) {
        const w = f.missing.get(m);
        (w == null || w > l) && f.missing.set(m, l);
      }
      f.update = Cn([f.update, d.update]);
    }
  } else
    a.pendingStructs = d;
  const u = _s(r, s, a);
  if (a.pendingDs) {
    const m = new Ae(ne(a.pendingDs));
    tt(m.restDecoder);
    const l = _s(m, s, a);
    u && l ? a.pendingDs = Cn([u, l]) : a.pendingDs = u || l;
  } else
    a.pendingDs = u;
  if (i) {
    const m = (
      /** @type {{update: Uint8Array}} */
      a.pendingStructs.update
    );
    a.pendingStructs = null, xi(s.doc, m);
  }
}, e, !1), xi = (n, t, e, r = Ae) => {
  const s = ne(t);
  Pc(s, n, e, new r(s));
}, Wr = (n, t, e) => xi(n, t, e, ki), jc = (n, t, e = /* @__PURE__ */ new Map()) => {
  $r(n, t.store, e), Re(n, Lc(t.store));
}, $c = (n, t = new Uint8Array([0]), e = new le()) => {
  const r = Ci(t);
  jc(e, n, r);
  const s = [e.toUint8Array()];
  if (n.store.pendingDs && s.push(n.store.pendingDs), n.store.pendingStructs && s.push(il(n.store.pendingStructs.update, t)), s.length > 1) {
    if (e.constructor === tn)
      return rl(s.map((i, o) => o === 0 ? i : al(i)));
    if (e.constructor === le)
      return Cn(s);
  }
  return s[0];
}, Hr = (n, t) => $c(n, t, new tn()), Wc = (n) => {
  const t = /* @__PURE__ */ new Map(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    t.set(s, i);
  }
  return t;
}, Ci = (n) => Wc(new bi(ne(n))), Ei = (n, t) => (q(n.restEncoder, t.size), Yt(t.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
  q(n.restEncoder, e), q(n.restEncoder, r);
}), n), Hc = (n, t) => Ei(n, $n(t.store)), Vc = (n, t = new Si()) => (n instanceof Map ? Ei(t, n) : Hc(t, n), t.toUint8Array()), Zc = (n) => Vc(n, new vi());
class Yc {
  constructor() {
    this.l = [];
  }
}
const ys = () => new Yc(), bs = (n, t) => n.l.push(t), ks = (n, t) => {
  const e = n.l, r = e.length;
  n.l = e.filter((s) => t !== s), r === n.l.length && console.error("[yjs] Tried to remove event handler that doesn't exist.");
}, Di = (n, t, e) => Rr(n.l, [t, e]);
class ke {
  /**
   * @param {number} client client id
   * @param {number} clock unique per client id, continuous number
   */
  constructor(t, e) {
    this.client = t, this.clock = e;
  }
}
const cn = (n, t) => n === t || n !== null && t !== null && n.client === t.client && n.clock === t.clock, rt = (n, t) => new ke(n, t), Gc = (n) => {
  for (const [t, e] of n.doc.share.entries())
    if (e === n)
      return t;
  throw Rt();
}, xn = (n, t) => {
  for (; t !== null; ) {
    if (t.parent === n)
      return !0;
    t = /** @type {AbstractType<any>} */
    t.parent._item;
  }
  return !1;
}, we = (n, t) => t === void 0 ? !n.deleted : t.sv.has(n.id.client) && (t.sv.get(n.id.client) || 0) > n.id.clock && !Qe(t.ds, n.id), pr = (n, t) => {
  const e = Wt(n.meta, pr, Qt), r = n.doc.store;
  e.has(t) || (t.sv.forEach((s, i) => {
    s < mt(r, i) && Dt(n, rt(i, s));
  }), De(n, t.ds, (s) => {
  }), e.add(t));
};
class Ai {
  constructor() {
    this.clients = /* @__PURE__ */ new Map(), this.pendingStructs = null, this.pendingDs = null;
  }
}
const $n = (n) => {
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
}, Ii = (n, t) => {
  let e = n.clients.get(t.id.client);
  if (e === void 0)
    e = [], n.clients.set(t.id.client, e);
  else {
    const r = e[e.length - 1];
    if (r.id.clock + r.length !== t.id.clock)
      throw Rt();
  }
  e.push(t);
}, jt = (n, t) => {
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
  throw Rt();
}, Kc = (n, t) => {
  const e = n.clients.get(t.client);
  return e[jt(e, t.clock)];
}, mn = (
  /** @type {function(StructStore,ID):Item} */
  Kc
), gr = (n, t, e) => {
  const r = jt(t, e), s = t[r];
  return s.id.clock < e && s instanceof lt ? (t.splice(r + 1, 0, On(n, s, e - s.id.clock)), r + 1) : r;
}, Dt = (n, t) => {
  const e = (
    /** @type {Array<Item>} */
    n.doc.store.clients.get(t.client)
  );
  return e[gr(n, e, t.clock)];
}, vs = (n, t, e) => {
  const r = t.clients.get(e.client), s = jt(r, e.clock), i = r[s];
  return e.clock !== i.id.clock + i.length - 1 && i.constructor !== Ot && r.splice(s + 1, 0, On(n, i, e.clock - i.id.clock + 1)), i;
}, qc = (n, t, e) => {
  const r = (
    /** @type {Array<GC|Item>} */
    n.clients.get(t.id.client)
  );
  r[jt(r, t.id.clock)] = e;
}, Ti = (n, t, e, r, s) => {
  if (r === 0)
    return;
  const i = e + r;
  let o = gr(n, t, e), a;
  do
    a = t[o++], i < a.id.clock + a.length && gr(n, t, i), s(a);
  while (o < t.length && t[o].id.clock < i);
};
class Jc {
  /**
   * @param {Doc} doc
   * @param {any} origin
   * @param {boolean} local
   */
  constructor(t, e, r) {
    this.doc = t, this.deleteSet = new ze(), this.beforeState = $n(t.store), this.afterState = /* @__PURE__ */ new Map(), this.changed = /* @__PURE__ */ new Map(), this.changedParentTypes = /* @__PURE__ */ new Map(), this._mergeStructs = [], this.origin = e, this.meta = /* @__PURE__ */ new Map(), this.local = r, this.subdocsAdded = /* @__PURE__ */ new Set(), this.subdocsRemoved = /* @__PURE__ */ new Set(), this.subdocsLoaded = /* @__PURE__ */ new Set(), this._needFormattingCleanup = !1;
  }
}
const Ss = (n, t) => t.deleteSet.clients.size === 0 && !Ro(t.afterState, (e, r) => t.beforeState.get(r) !== e) ? !1 : (Pr(t.deleteSet), Fc(n, t), Re(n, t.deleteSet), !0), xs = (n, t, e) => {
  const r = t._item;
  (r === null || r.id.clock < (n.beforeState.get(r.id.client) || 0) && !r.deleted) && Wt(n.changed, t, Qt).add(e);
}, wn = (n, t) => {
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
}, Xc = (n, t, e) => {
  for (const [r, s] of n.clients.entries()) {
    const i = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let o = s.length - 1; o >= 0; o--) {
      const a = s[o], c = a.clock + a.len;
      for (let d = jt(i, a.clock), f = i[d]; d < i.length && f.id.clock < c; f = i[++d]) {
        const u = i[d];
        if (a.clock + a.len <= u.id.clock)
          break;
        u instanceof lt && u.deleted && !u.keep && e(u) && u.gc(t, !1);
      }
    }
  }
}, Qc = (n, t) => {
  n.clients.forEach((e, r) => {
    const s = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let i = e.length - 1; i >= 0; i--) {
      const o = e[i], a = Cr(s.length - 1, 1 + jt(s, o.clock + o.len - 1));
      for (let c = a, d = s[c]; c > 0 && d.id.clock >= o.clock; d = s[c])
        c -= 1 + wn(s, c);
    }
  });
}, Oi = (n, t) => {
  if (t < n.length) {
    const e = n[t], r = e.doc, s = r.store, i = e.deleteSet, o = e._mergeStructs;
    try {
      Pr(i), e.afterState = $n(e.doc.store), r.emit("beforeObserverCalls", [e, r]);
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
            Di(d._dEH, c, e);
          }));
        }), a.push(() => r.emit("afterTransaction", [e, r])), a.push(() => {
          e._needFormattingCleanup && kl(e);
        });
      }), Rr(a, []);
    } finally {
      r.gc && Xc(i, s, r.gcFilter), Qc(i, s), e.afterState.forEach((f, u) => {
        const m = e.beforeState.get(u) || 0;
        if (m !== f) {
          const l = (
            /** @type {Array<GC|Item>} */
            s.clients.get(u)
          ), w = fe(jt(l, m), 1);
          for (let p = l.length - 1; p >= w; )
            p -= 1 + wn(l, p);
        }
      });
      for (let f = o.length - 1; f >= 0; f--) {
        const { client: u, clock: m } = o[f].id, l = (
          /** @type {Array<GC|Item>} */
          s.clients.get(u)
        ), w = jt(l, m);
        w + 1 < l.length && wn(l, w + 1) > 1 || w > 0 && wn(l, w);
      }
      if (!e.local && e.afterState.get(r.clientID) !== e.beforeState.get(r.clientID) && (Tc(Fr, di, "[yjs] ", fi, pi, "Changed the client-id because another client seems to be using it."), r.clientID = yi()), r.emit("afterTransactionCleanup", [e, r]), r._observers.has("update")) {
        const f = new tn();
        Ss(f, e) && r.emit("update", [f.toUint8Array(), e.origin, r, e]);
      }
      if (r._observers.has("updateV2")) {
        const f = new le();
        Ss(f, e) && r.emit("updateV2", [f.toUint8Array(), e.origin, r, e]);
      }
      const { subdocsAdded: a, subdocsLoaded: c, subdocsRemoved: d } = e;
      (a.size > 0 || d.size > 0 || c.size > 0) && (a.forEach((f) => {
        f.clientID = r.clientID, f.collectionid == null && (f.collectionid = r.collectionid), r.subdocs.add(f);
      }), d.forEach((f) => r.subdocs.delete(f)), r.emit("subdocs", [{ loaded: c, added: a, removed: d }, r, e]), d.forEach((f) => f.destroy())), n.length <= t + 1 ? (r._transactionCleanups = [], r.emit("afterAllTransactions", [r, n])) : Oi(n, t + 1);
    }
  }
}, at = (n, t, e = null, r = !0) => {
  const s = n._transactionCleanups;
  let i = !1, o = null;
  n._transaction === null && (i = !0, n._transaction = new Jc(n, e, r), s.push(n._transaction), s.length === 1 && n.emit("beforeAllTransactions", [n]), n.emit("beforeTransaction", [n._transaction, n]));
  try {
    o = t(n._transaction);
  } finally {
    if (i) {
      const a = n._transaction === s[0];
      n._transaction = null, a && Oi(s, 0);
    }
  }
  return o;
};
class tl {
  /**
   * @param {DeleteSet} deletions
   * @param {DeleteSet} insertions
   */
  constructor(t, e) {
    this.insertions = e, this.deletions = t, this.meta = /* @__PURE__ */ new Map();
  }
}
const Cs = (n, t, e) => {
  De(n, e.deletions, (r) => {
    r instanceof lt && t.scope.some((s) => s === n.doc || xn(
      /** @type {AbstractType<any>} */
      s,
      r
    )) && Xr(r, !1);
  });
}, Es = (n, t, e) => {
  let r = null;
  const s = n.doc, i = n.scope;
  at(s, (a) => {
    for (; t.length > 0 && n.currStackItem === null; ) {
      const c = s.store, d = (
        /** @type {StackItem} */
        t.pop()
      ), f = /* @__PURE__ */ new Set(), u = [];
      let m = !1;
      De(a, d.insertions, (l) => {
        if (l instanceof lt) {
          if (l.redone !== null) {
            let { item: w, diff: p } = Gl(c, l.id);
            p > 0 && (w = Dt(a, rt(w.id.client, w.id.clock + p))), l = w;
          }
          !l.deleted && i.some((w) => w === a.doc || xn(
            /** @type {AbstractType<any>} */
            w,
            /** @type {Item} */
            l
          )) && u.push(l);
        }
      }), De(a, d.deletions, (l) => {
        l instanceof lt && i.some((w) => w === a.doc || xn(
          /** @type {AbstractType<any>} */
          w,
          l
        )) && // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
        !Qe(d.insertions, l.id) && f.add(l);
      }), f.forEach((l) => {
        m = Ki(a, l, f, d.insertions, n.ignoreRemoteMapChanges, n) !== null || m;
      });
      for (let l = u.length - 1; l >= 0; l--) {
        const w = u[l];
        n.deleteFilter(w) && (w.delete(a), m = !0);
      }
      n.currStackItem = m ? d : null;
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
class el extends xr {
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
      if (!this.captureTransaction(c) || !this.scope.some((y) => c.changedParentTypes.has(
        /** @type {AbstractType<any>} */
        y
      ) || y === this.doc) || !this.trackedOrigins.has(c.origin) && (!c.origin || !this.trackedOrigins.has(c.origin.constructor)))
        return;
      const d = this.undoing, f = this.redoing, u = d ? this.redoStack : this.undoStack;
      d ? this.stopCapturing() : f || this.clear(!1, !0);
      const m = new ze();
      c.afterState.forEach((y, _) => {
        const v = c.beforeState.get(_) || 0, C = y - v;
        C > 0 && Ze(m, _, v, C);
      });
      const l = te();
      let w = !1;
      if (this.lastChange > 0 && l - this.lastChange < this.captureTimeout && u.length > 0 && !d && !f) {
        const y = u[u.length - 1];
        y.deletions = fr([y.deletions, c.deleteSet]), y.insertions = fr([y.insertions, m]);
      } else
        u.push(new tl(c.deleteSet, m)), w = !0;
      !d && !f && (this.lastChange = l), De(
        c,
        c.deleteSet,
        /** @param {Item|GC} item */
        (y) => {
          y instanceof lt && this.scope.some((_) => _ === c.doc || xn(
            /** @type {AbstractType<any>} */
            _,
            y
          )) && Xr(y, !0);
        }
      );
      const p = [{ stackItem: u[u.length - 1], origin: c.origin, type: d ? "redo" : "undo", changedParentTypes: c.changedParentTypes }, this];
      w ? this.emit("stack-item-added", p) : this.emit("stack-item-updated", p);
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
      e.has(r) || (e.add(r), (r instanceof bt ? r.doc !== this.doc : r !== this.doc) && mi("[yjs#509] Not same Y.Doc"), this.scope.push(r));
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
      t && (this.undoStack.forEach((s) => Cs(r, this, s)), this.undoStack = []), e && (this.redoStack.forEach((s) => Cs(r, this, s)), this.redoStack = []), this.emit("stack-cleared", [{ undoStackCleared: t, redoStackCleared: e }]);
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
      t = Es(this, this.undoStack, "undo");
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
      t = Es(this, this.redoStack, "redo");
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
function* nl(n) {
  const t = tt(n.restDecoder);
  for (let e = 0; e < t; e++) {
    const r = tt(n.restDecoder), s = n.readClient();
    let i = tt(n.restDecoder);
    for (let o = 0; o < r; o++) {
      const a = n.readInfo();
      if (a === 10) {
        const c = tt(n.restDecoder);
        yield new zt(rt(s, i), c), i += c;
      } else if ((zn & a) !== 0) {
        const c = (a & (Zt | It)) === 0, d = new lt(
          rt(s, i),
          null,
          // left
          (a & It) === It ? n.readLeftID() : null,
          // origin
          null,
          // right
          (a & Zt) === Zt ? n.readRightID() : null,
          // right origin
          // @ts-ignore Force writing a string here.
          c ? n.readParentInfo() ? n.readString() : n.readLeftID() : null,
          // parent
          c && (a & Pe) === Pe ? n.readString() : null,
          // parentSub
          qi(n, a)
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
class Vr {
  /**
   * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
   * @param {boolean} filterSkips
   */
  constructor(t, e) {
    this.gen = nl(t), this.curr = null, this.done = !1, this.filterSkips = e, this.next();
  }
  /**
   * @return {Item | GC | Skip |null}
   */
  next() {
    do
      this.curr = this.gen.next().value || null;
    while (this.filterSkips && this.curr !== null && this.curr.constructor === zt);
    return this.curr;
  }
}
class Zr {
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  constructor(t) {
    this.currClient = 0, this.startClock = 0, this.written = 0, this.encoder = t, this.clientStructs = [];
  }
}
const rl = (n) => Cn(n, ki, tn), sl = (n, t) => {
  if (n.constructor === Ot) {
    const { client: e, clock: r } = n.id;
    return new Ot(rt(e, r + t), n.length - t);
  } else if (n.constructor === zt) {
    const { client: e, clock: r } = n.id;
    return new zt(rt(e, r + t), n.length - t);
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
}, Cn = (n, t = Ae, e = le) => {
  if (n.length === 1)
    return n[0];
  const r = n.map((f) => new t(ne(f)));
  let s = r.map((f) => new Vr(f, !0)), i = null;
  const o = new e(), a = new Zr(o);
  for (; s = s.filter((m) => m.curr !== null), s.sort(
    /** @type {function(any,any):number} */
    (m, l) => {
      if (m.curr.id.client === l.curr.id.client) {
        const w = m.curr.id.clock - l.curr.id.clock;
        return w === 0 ? m.curr.constructor === l.curr.constructor ? 0 : m.curr.constructor === zt ? 1 : -1 : w;
      } else
        return l.curr.id.client - m.curr.id.client;
    }
  ), s.length !== 0; ) {
    const f = s[0], u = (
      /** @type {Item | GC} */
      f.curr.id.client
    );
    if (i !== null) {
      let m = (
        /** @type {Item | GC | null} */
        f.curr
      ), l = !1;
      for (; m !== null && m.id.clock + m.length <= i.struct.id.clock + i.struct.length && m.id.client >= i.struct.id.client; )
        m = f.next(), l = !0;
      if (m === null || // current decoder is empty
      m.id.client !== u || // check whether there is another decoder that has has updates from `firstClient`
      l && m.id.clock > i.struct.id.clock + i.struct.length)
        continue;
      if (u !== i.struct.id.client)
        qt(a, i.struct, i.offset), i = { struct: m, offset: 0 }, f.next();
      else if (i.struct.id.clock + i.struct.length < m.id.clock)
        if (i.struct.constructor === zt)
          i.struct.length = m.id.clock + m.length - i.struct.id.clock;
        else {
          qt(a, i.struct, i.offset);
          const w = m.id.clock - i.struct.id.clock - i.struct.length;
          i = { struct: new zt(rt(u, i.struct.id.clock + i.struct.length), w), offset: 0 };
        }
      else {
        const w = i.struct.id.clock + i.struct.length - m.id.clock;
        w > 0 && (i.struct.constructor === zt ? i.struct.length -= w : m = sl(m, w)), i.struct.mergeWith(
          /** @type {any} */
          m
        ) || (qt(a, i.struct, i.offset), i = { struct: m, offset: 0 }, f.next());
      }
    } else
      i = { struct: (
        /** @type {Item | GC} */
        f.curr
      ), offset: 0 }, f.next();
    for (let m = f.curr; m !== null && m.id.client === u && m.id.clock === i.struct.id.clock + i.struct.length && m.constructor !== zt; m = f.next())
      qt(a, i.struct, i.offset), i = { struct: m, offset: 0 };
  }
  i !== null && (qt(a, i.struct, i.offset), i = null), Yr(a);
  const c = r.map((f) => jr(f)), d = fr(c);
  return Re(o, d), o.toUint8Array();
}, il = (n, t, e = Ae, r = le) => {
  const s = Ci(t), i = new r(), o = new Zr(i), a = new e(ne(n)), c = new Vr(a, !1);
  for (; c.curr; ) {
    const f = c.curr, u = f.id.client, m = s.get(u) || 0;
    if (c.curr.constructor === zt) {
      c.next();
      continue;
    }
    if (f.id.clock + f.length > m)
      for (qt(o, f, fe(m - f.id.clock, 0)), c.next(); c.curr && c.curr.id.client === u; )
        qt(o, c.curr, 0), c.next();
    else
      for (; c.curr && c.curr.id.client === u && c.curr.id.clock + c.curr.length <= m; )
        c.next();
  }
  Yr(o);
  const d = jr(a);
  return Re(i, d), i.toUint8Array();
}, zi = (n) => {
  n.written > 0 && (n.clientStructs.push({ written: n.written, restEncoder: ht(n.encoder.restEncoder) }), n.encoder.restEncoder = xt(), n.written = 0);
}, qt = (n, t, e) => {
  n.written > 0 && n.currClient !== t.id.client && zi(n), n.written === 0 && (n.currClient = t.id.client, n.encoder.writeClient(t.id.client), q(n.encoder.restEncoder, t.id.clock + e)), t.write(n.encoder, e), n.written++;
}, Yr = (n) => {
  zi(n);
  const t = n.encoder.restEncoder;
  q(t, n.clientStructs.length);
  for (let e = 0; e < n.clientStructs.length; e++) {
    const r = n.clientStructs[e];
    q(t, r.written), Rn(t, r.restEncoder);
  }
}, ol = (n, t, e, r) => {
  const s = new e(ne(n)), i = new Vr(s, !1), o = new r(), a = new Zr(o);
  for (let d = i.curr; d !== null; d = i.next())
    qt(a, t(d), 0);
  Yr(a);
  const c = jr(s);
  return Re(o, c), o.toUint8Array();
}, al = (n) => ol(n, Ea, Ae, tn), Ds = "You must not compute changes after the event-handler fired.";
class Wn {
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
    return this._path || (this._path = cl(this.currentTarget, this.target));
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
        throw Pt(Ds);
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
                o = "delete", a = Yn(c.content.getContent());
              else
                return;
            else
              c !== null && this.deletes(c) ? (o = "update", a = Yn(c.content.getContent())) : (o = "add", a = void 0);
          } else if (this.deletes(i))
            o = "delete", a = Yn(
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
        throw Pt(Ds);
      const e = this.target, r = Qt(), s = Qt(), i = [];
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
const cl = (n, t) => {
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
  mi("Invalid access: Add Yjs type to a document before reading data.");
}, Ri = 80;
let Gr = 0;
class ll {
  /**
   * @param {Item} p
   * @param {number} index
   */
  constructor(t, e) {
    t.marker = !0, this.p = t, this.index = e, this.timestamp = Gr++;
  }
}
const hl = (n) => {
  n.timestamp = Gr++;
}, Li = (n, t, e) => {
  n.p.marker = !1, n.p = t, t.marker = !0, n.index = e, n.timestamp = Gr++;
}, ul = (n, t, e) => {
  if (n.length >= Ri) {
    const r = n.reduce((s, i) => s.timestamp < i.timestamp ? s : i);
    return Li(r, t, e), r;
  } else {
    const r = new ll(t, e);
    return n.push(r), r;
  }
}, Hn = (n, t) => {
  if (n._start === null || t === 0 || n._searchMarker === null)
    return null;
  const e = n._searchMarker.length === 0 ? null : n._searchMarker.reduce((i, o) => fn(t - i.index) < fn(t - o.index) ? i : o);
  let r = n._start, s = 0;
  for (e !== null && (r = e.p, s = e.index, hl(e)); r.right !== null && s < t; ) {
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
  return e !== null && fn(e.index - s) < /** @type {YText|YArray<any>} */
  r.parent.length / Ri ? (Li(e, r, s), e) : ul(n._searchMarker, r, s);
}, Ye = (n, t, e) => {
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
}, Vn = (n, t, e) => {
  const r = n, s = t.changedParentTypes;
  for (; Wt(s, n, () => []).push(e), n._item !== null; )
    n = /** @type {AbstractType<any>} */
    n._item.parent;
  Di(r._eH, e, t);
};
class bt {
  constructor() {
    this._item = null, this._map = /* @__PURE__ */ new Map(), this._start = null, this.doc = null, this._length = 0, this._eH = ys(), this._dEH = ys(), this._searchMarker = null;
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
    bs(this._eH, t);
  }
  /**
   * Observe all events that are created by this type and its children.
   *
   * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
   */
  observeDeep(t) {
    bs(this._dEH, t);
  }
  /**
   * Unregister an observer function.
   *
   * @param {function(EventType,Transaction):void} f Observer function
   */
  unobserve(t) {
    ks(this._eH, t);
  }
  /**
   * Unregister an observer function.
   *
   * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
   */
  unobserveDeep(t) {
    ks(this._dEH, t);
  }
  /**
   * @abstract
   * @return {any}
   */
  toJSON() {
  }
}
const Ni = (n, t, e) => {
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
}, Ui = (n) => {
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
}, Bi = (n, t) => {
  const e = [];
  return Ge(n, (r, s) => {
    e.push(t(r, s, n));
  }), e;
}, dl = (n) => {
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
}, Mi = (n, t) => {
  n.doc ?? Ct();
  const e = Hn(n, t);
  let r = n._start;
  for (e !== null && (r = e.p, t -= e.index); r !== null; r = r.right)
    if (!r.deleted && r.countable) {
      if (t < r.length)
        return r.content.getContent()[t];
      t -= r.length;
    }
}, En = (n, t, e, r) => {
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
                s = new lt(rt(o, mt(a, o)), s, s && s.lastId, c, c && c.id, t, null, new Kt(u)), s.integrate(n, 0);
              else
                throw new Error("Unexpected content type in insert operation");
          }
      }
  }), f();
}, Fi = () => Pt("Length exceeded!"), Pi = (n, t, e, r) => {
  if (e > t._length)
    throw Fi();
  if (e === 0)
    return t._searchMarker && Ye(t._searchMarker, e, r.length), En(n, t, null, r);
  const s = e, i = Hn(t, e);
  let o = t._start;
  for (i !== null && (o = i.p, e -= i.index, e === 0 && (o = o.prev, e += o && o.countable && !o.deleted ? o.length : 0)); o !== null; o = o.right)
    if (!o.deleted && o.countable) {
      if (e <= o.length) {
        e < o.length && Dt(n, rt(o.id.client, o.id.clock + e));
        break;
      }
      e -= o.length;
    }
  return t._searchMarker && Ye(t._searchMarker, s, r.length), En(n, t, o, r);
}, fl = (n, t, e) => {
  let s = (t._searchMarker || []).reduce((i, o) => o.index > i.index ? o : i, { index: 0, p: t._start }).p;
  if (s)
    for (; s.right; )
      s = s.right;
  return En(n, t, s, e);
}, ji = (n, t, e, r) => {
  if (r === 0)
    return;
  const s = e, i = r, o = Hn(t, e);
  let a = t._start;
  for (o !== null && (a = o.p, e -= o.index); a !== null && e > 0; a = a.right)
    !a.deleted && a.countable && (e < a.length && Dt(n, rt(a.id.client, a.id.clock + e)), e -= a.length);
  for (; r > 0 && a !== null; )
    a.deleted || (r < a.length && Dt(n, rt(a.id.client, a.id.clock + r)), a.delete(n), r -= a.length), a = a.right;
  if (r > 0)
    throw Fi();
  t._searchMarker && Ye(
    t._searchMarker,
    s,
    -i + r
    /* in case we remove the above exception */
  );
}, Dn = (n, t, e) => {
  const r = t._map.get(e);
  r !== void 0 && r.delete(n);
}, Kr = (n, t, e, r) => {
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
          a = new Kt(r);
        else
          throw new Error("Unexpected content type");
    }
  new lt(rt(o, mt(i.store, o)), s, s && s.lastId, null, null, t, e, a).integrate(n, 0);
}, qr = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted ? e.content.getContent()[e.length - 1] : void 0;
}, $i = (n) => {
  const t = {};
  return n.doc ?? Ct(), n._map.forEach((e, r) => {
    e.deleted || (t[r] = e.content.getContent()[e.length - 1]);
  }), t;
}, Wi = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted;
}, pl = (n, t) => {
  const e = {};
  return n._map.forEach((r, s) => {
    let i = r;
    for (; i !== null && (!t.sv.has(i.id.client) || i.id.clock >= (t.sv.get(i.id.client) || 0)); )
      i = i.left;
    i !== null && we(i, t) && (e[s] = i.content.getContent()[i.length - 1]);
  }), e;
}, ln = (n) => (n.doc ?? Ct(), Oc(
  n._map.entries(),
  /** @param {any} entry */
  (t) => !t[1].deleted
));
class gl extends Wn {
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
    super._callObserver(t, e), Vn(this, t, new gl(this, t));
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
      Pi(
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
      fl(
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
      ji(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Returns the i-th element from a YArray.
   *
   * @param {number} index The index of the element to return from the YArray
   * @return {T}
   */
  get(t) {
    return Mi(this, t);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<T>}
   */
  toArray() {
    return Ui(this);
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
    return Ni(this, t, e);
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
    return Bi(
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
    return dl(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(Pl);
  }
}
const ml = (n) => new ve();
class wl extends Wn {
  /**
   * @param {YMap<T>} ymap The YArray that changed.
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed.
   */
  constructor(t, e, r) {
    super(t, e), this.keysChanged = r;
  }
}
class Ie extends bt {
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
    return new Ie();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YMap<MapType>}
   */
  clone() {
    const t = new Ie();
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
    Vn(this, t, new wl(this, t, e));
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
    return [...ln(this)].length;
  }
  /**
   * Returns the keys for each element in the YMap Type.
   *
   * @return {IterableIterator<string>}
   */
  keys() {
    return tr(
      ln(this),
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
    return tr(
      ln(this),
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
    return tr(
      ln(this),
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
      Dn(e, this, t);
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
      Kr(
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
      qr(this, t)
    );
  }
  /**
   * Returns a boolean indicating whether the specified key exists or not.
   *
   * @param {string} key The key to test.
   * @return {boolean}
   */
  has(t) {
    return Wi(this, t);
  }
  /**
   * Removes all elements from this YMap.
   */
  clear() {
    this.doc !== null ? at(this.doc, (t) => {
      this.forEach(function(e, r, s) {
        Dn(t, s, r);
      });
    }) : this._prelimContent.clear();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(jl);
  }
}
const _l = (n) => new Ie(), Jt = (n, t) => n === t || typeof n == "object" && typeof t == "object" && n && t && xa(n, t);
class mr {
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
    this.right === null && Rt(), this.right.content.constructor === wt ? this.right.deleted || Le(
      this.currentAttributes,
      /** @type {ContentFormat} */
      this.right.content
    ) : this.right.deleted || (this.index += this.right.length), this.left = this.right, this.right = this.right.right;
  }
}
const As = (n, t, e) => {
  for (; t.right !== null && e > 0; )
    t.right.content.constructor === wt ? t.right.deleted || Le(
      t.currentAttributes,
      /** @type {ContentFormat} */
      t.right.content
    ) : t.right.deleted || (e < t.right.length && Dt(n, rt(t.right.id.client, t.right.id.clock + e)), t.index += t.right.length, e -= t.right.length), t.left = t.right, t.right = t.right.right;
  return t;
}, hn = (n, t, e, r) => {
  const s = /* @__PURE__ */ new Map(), i = r ? Hn(t, e) : null;
  if (i) {
    const o = new mr(i.p.left, i.p, i.index, s);
    return As(n, o, e - i.index);
  } else {
    const o = new mr(null, t._start, 0, s);
    return As(n, o, e);
  }
}, Hi = (n, t, e, r) => {
  for (; e.right !== null && (e.right.deleted === !0 || e.right.content.constructor === wt && Jt(
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
}, Le = (n, t) => {
  const { key: e, value: r } = t;
  r === null ? n.delete(e) : n.set(e, r);
}, Vi = (n, t) => {
  for (; n.right !== null; ) {
    if (!(n.right.deleted || n.right.content.constructor === wt && Jt(
      t[
        /** @type {ContentFormat} */
        n.right.content.key
      ] ?? null,
      /** @type {ContentFormat} */
      n.right.content.value
    ))) break;
    n.forward();
  }
}, Zi = (n, t, e, r) => {
  const s = n.doc, i = s.clientID, o = /* @__PURE__ */ new Map();
  for (const a in r) {
    const c = r[a], d = e.currentAttributes.get(a) ?? null;
    if (!Jt(d, c)) {
      o.set(a, d);
      const { left: f, right: u } = e;
      e.right = new lt(rt(i, mt(s.store, i)), f, f && f.lastId, u, u && u.id, t, null, new wt(a, c)), e.right.integrate(n, 0), e.forward();
    }
  }
  return o;
}, er = (n, t, e, r, s) => {
  e.currentAttributes.forEach((m, l) => {
    s[l] === void 0 && (s[l] = null);
  });
  const i = n.doc, o = i.clientID;
  Vi(e, s);
  const a = Zi(n, t, e, s), c = r.constructor === String ? new $t(
    /** @type {string} */
    r
  ) : r instanceof bt ? new Kt(r) : new ge(r);
  let { left: d, right: f, index: u } = e;
  t._searchMarker && Ye(t._searchMarker, e.index, c.getLength()), f = new lt(rt(o, mt(i.store, o)), d, d && d.lastId, f, f && f.id, t, null, c), f.integrate(n, 0), e.right = f, e.index = u, e.forward(), Hi(n, t, e, a);
}, Is = (n, t, e, r, s) => {
  const i = n.doc, o = i.clientID;
  Vi(e, s);
  const a = Zi(n, t, e, s);
  t: for (; e.right !== null && (r > 0 || a.size > 0 && (e.right.deleted || e.right.content.constructor === wt)); ) {
    if (!e.right.deleted)
      switch (e.right.content.constructor) {
        case wt: {
          const { key: c, value: d } = (
            /** @type {ContentFormat} */
            e.right.content
          ), f = s[c];
          if (f !== void 0) {
            if (Jt(f, d))
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
    e.right = new lt(rt(o, mt(i.store, o)), e.left, e.left && e.left.lastId, e.right, e.right && e.right.id, t, null, new $t(c)), e.right.integrate(n, 0), e.forward();
  }
  Hi(n, t, e, a);
}, Yi = (n, t, e, r, s) => {
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
        ), m = r.get(f) ?? null;
        (o.get(f) !== d || m === u) && (t.delete(n), a++, !c && (s.get(f) ?? null) === u && m !== u && (m === null ? s.delete(f) : s.set(f, m))), !c && !t.deleted && Le(
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
}, yl = (n, t) => {
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
}, bl = (n) => {
  let t = 0;
  return at(
    /** @type {Doc} */
    n.doc,
    (e) => {
      let r = (
        /** @type {Item} */
        n._start
      ), s = n._start, i = At();
      const o = ar(i);
      for (; s; )
        s.deleted === !1 && (s.content.constructor === wt ? Le(
          o,
          /** @type {ContentFormat} */
          s.content
        ) : (t += Yi(e, r, s, i, o), i = ar(o), r = s)), s = s.right;
    }
  ), t;
}, kl = (n) => {
  const t = /* @__PURE__ */ new Set(), e = n.doc;
  for (const [r, s] of n.afterState.entries()) {
    const i = n.beforeState.get(r) || 0;
    s !== i && Ti(
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
      s.content.constructor === wt ? t.add(i) : yl(r, s);
    });
    for (const s of t)
      bl(s);
  });
}, Ts = (n, t, e) => {
  const r = e, s = ar(t.currentAttributes), i = t.right;
  for (; e > 0 && t.right !== null; ) {
    if (t.right.deleted === !1)
      switch (t.right.content.constructor) {
        case Kt:
        case ge:
        case $t:
          e < t.right.length && Dt(n, rt(t.right.id.client, t.right.id.clock + e)), e -= t.right.length, t.right.delete(n);
          break;
      }
    t.forward();
  }
  i && Yi(n, i, t.right, s, t.currentAttributes);
  const o = (
    /** @type {AbstractType<any>} */
    /** @type {Item} */
    (t.left || t.right).parent
  );
  return o._searchMarker && Ye(o._searchMarker, t.index, -r + e), t;
};
class vl extends Wn {
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
        const m = () => {
          if (a !== null) {
            let l = null;
            switch (a) {
              case "delete":
                u > 0 && (l = { delete: u }), u = 0;
                break;
              case "insert":
                (typeof d == "object" || d.length > 0) && (l = { insert: d }, s.size > 0 && (l.attributes = {}, s.forEach((w, p) => {
                  w !== null && (l.attributes[p] = w);
                }))), d = "";
                break;
              case "retain":
                f > 0 && (l = { retain: f }, Sa(c) || (l.attributes = ya({}, c))), f = 0;
                break;
            }
            l && e.push(l), a = null;
          }
        };
        for (; o !== null; ) {
          switch (o.content.constructor) {
            case Kt:
            case ge:
              this.adds(o) ? this.deletes(o) || (m(), a = "insert", d = o.content.getContent()[0], m()) : this.deletes(o) ? (a !== "delete" && (m(), a = "delete"), u += 1) : o.deleted || (a !== "retain" && (m(), a = "retain"), f += 1);
              break;
            case $t:
              this.adds(o) ? this.deletes(o) || (a !== "insert" && (m(), a = "insert"), d += /** @type {ContentString} */
              o.content.str) : this.deletes(o) ? (a !== "delete" && (m(), a = "delete"), u += o.length) : o.deleted || (a !== "retain" && (m(), a = "retain"), f += o.length);
              break;
            case wt: {
              const { key: l, value: w } = (
                /** @type {ContentFormat} */
                o.content
              );
              if (this.adds(o)) {
                if (!this.deletes(o)) {
                  const p = s.get(l) ?? null;
                  Jt(p, w) ? w !== null && o.delete(r) : (a === "retain" && m(), Jt(w, i.get(l) ?? null) ? delete c[l] : c[l] = w);
                }
              } else if (this.deletes(o)) {
                i.set(l, w);
                const p = s.get(l) ?? null;
                Jt(p, w) || (a === "retain" && m(), c[l] = p);
              } else if (!o.deleted) {
                i.set(l, w);
                const p = c[l];
                p !== void 0 && (Jt(p, w) ? p !== null && o.delete(r) : (a === "retain" && m(), w === null ? delete c[l] : c[l] = w));
              }
              o.deleted || (a === "insert" && m(), Le(
                s,
                /** @type {ContentFormat} */
                o.content
              ));
              break;
            }
          }
          o = o.right;
        }
        for (m(); e.length > 0; ) {
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
class he extends bt {
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
    return new he();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YText}
   */
  clone() {
    const t = new he();
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
    const r = new vl(this, t, e);
    Vn(this, t, r), !t.local && this._hasFormatting && (t._needFormattingCleanup = !0);
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
      !e.deleted && e.countable && e.content.constructor === $t && (t += /** @type {ContentString} */
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
      const s = new mr(null, this._start, 0, /* @__PURE__ */ new Map());
      for (let i = 0; i < t.length; i++) {
        const o = t[i];
        if (o.insert !== void 0) {
          const a = !e && typeof o.insert == "string" && i === t.length - 1 && s.right === null && o.insert.slice(-1) === `
` ? o.insert.slice(0, -1) : o.insert;
          (typeof a != "string" || a.length > 0) && er(r, this, s, a, o.attributes || {});
        } else o.retain !== void 0 ? Is(r, this, s, o.retain, o.attributes || {}) : o.delete !== void 0 && Ts(r, s, o.delete);
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
        let m = !1;
        i.forEach((w, p) => {
          m = !0, u[p] = w;
        });
        const l = { insert: a };
        m && (l.attributes = u), s.push(l), a = "";
      }
    }
    const f = () => {
      for (; c !== null; ) {
        if (we(c, t) || e !== void 0 && we(c, e))
          switch (c.content.constructor) {
            case $t: {
              const u = i.get("ychange");
              t !== void 0 && !we(c, t) ? (u === void 0 || u.user !== c.id.client || u.type !== "removed") && (d(), i.set("ychange", r ? r("removed", c.id) : { type: "removed" })) : e !== void 0 && !we(c, e) ? (u === void 0 || u.user !== c.id.client || u.type !== "added") && (d(), i.set("ychange", r ? r("added", c.id) : { type: "added" })) : u !== void 0 && (d(), i.delete("ychange")), a += /** @type {ContentString} */
              c.content.str;
              break;
            }
            case Kt:
            case ge: {
              d();
              const u = {
                insert: c.content.getContent()[0]
              };
              if (i.size > 0) {
                const m = (
                  /** @type {Object<string,any>} */
                  {}
                );
                u.attributes = m, i.forEach((l, w) => {
                  m[w] = l;
                });
              }
              s.push(u);
              break;
            }
            case wt:
              we(c, t) && (d(), Le(
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
      t && pr(u, t), e && pr(u, e), f();
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
      const o = hn(i, this, t, !r);
      r || (r = {}, o.currentAttributes.forEach((a, c) => {
        r[c] = a;
      })), er(i, this, o, e, r);
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
      const o = hn(i, this, t, !r);
      er(i, this, o, e, r || {});
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
      Ts(s, hn(s, this, t, !0), e);
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
      const o = hn(i, this, t, !1);
      o.right !== null && Is(i, this, o, e, r);
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
      Dn(e, this, t);
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
      Kr(r, this, t, e);
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
      qr(this, t)
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
    return $i(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef($l);
  }
}
const Sl = (n) => new he();
class nr {
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
        t.content.type, !t.deleted && (e.constructor === Te || e.constructor === ue) && e._start !== null)
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
class ue extends bt {
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
    return new ue();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlFragment}
   */
  clone() {
    const t = new ue();
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
    return new nr(this, t);
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
    const r = new nr(this, (s) => s.nodeName && s.nodeName.toUpperCase() === t).next();
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
    return t = t.toUpperCase(), Yt(new nr(this, (e) => e.nodeName && e.nodeName.toUpperCase() === t));
  }
  /**
   * Creates YXmlEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    Vn(this, t, new El(this, e, t));
  }
  /**
   * Get the string representation of all the children of this YXmlFragment.
   *
   * @return {string} The string representation of all children.
   */
  toString() {
    return Bi(this, (t) => t.toString()).join("");
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
      Pi(r, this, t, e);
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
        En(r, this, s, e);
      });
    else {
      const r = (
        /** @type {Array<any>} */
        this._prelimContent
      ), s = t === null ? 0 : r.findIndex((i) => i === t) + 1;
      if (s === 0 && t !== null)
        throw Pt("Reference item not found");
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
      ji(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<YXmlElement|YXmlText|YXmlHook>}
   */
  toArray() {
    return Ui(this);
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
    return Mi(this, t);
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
    return Ni(this, t, e);
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
    t.writeTypeRef(Hl);
  }
}
const xl = (n) => new ue();
class Te extends ue {
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
    return new Te(this.nodeName);
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlElement<KV>}
   */
  clone() {
    const t = new Te(this.nodeName), e = this.getAttributes();
    return ka(e, (r, s) => {
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
      Dn(e, this, t);
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
      Kr(r, this, t, e);
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
      qr(this, t)
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
      Wi(this, t)
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
      t ? pl(this, t) : $i(this)
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
    t.writeTypeRef(Wl), t.writeKey(this.nodeName);
  }
}
const Cl = (n) => new Te(n.readKey());
class El extends Wn {
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
class An extends Ie {
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
    return new An(this.hookName);
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlHook}
   */
  clone() {
    const t = new An(this.hookName);
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
    t.writeTypeRef(Vl), t.writeKey(this.hookName);
  }
}
const Dl = (n) => new An(n.readKey());
class In extends he {
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
    return new In();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlText}
   */
  clone() {
    const t = new In();
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
    t.writeTypeRef(Zl);
  }
}
const Al = (n) => new In();
class Jr {
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
const Il = 0;
class Ot extends Jr {
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
    e > 0 && (this.id.clock += e, this.length -= e), Ii(t.doc.store, this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeInfo(Il), t.writeLen(this.length - e);
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
const Tl = (n) => new en(n.readBuf());
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
    Ze(t.deleteSet, e.id.client, e.id.clock, this.len), e.markDeleted();
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
const Ol = (n) => new Ke(n.readLen()), Gi = (n, t) => new pe({ guid: n, ...t, shouldLoad: t.shouldLoad || t.autoLoad || !1 });
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
    return new nn(Gi(this.doc.guid, this.opts));
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
const zl = (n) => new nn(Gi(n.readString(), n.readAny()));
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
const Rl = (n) => new ge(n.readJSON());
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
const Ll = (n) => new wt(n.readKey(), n.readJSON());
class Tn {
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
    return new Tn(this.arr);
  }
  /**
   * @param {number} offset
   * @return {ContentJSON}
   */
  splice(t) {
    const e = new Tn(this.arr.slice(t));
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
const Nl = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++) {
    const s = n.readString();
    s === "undefined" ? e.push(void 0) : e.push(JSON.parse(s));
  }
  return new Tn(e);
}, Ul = kn("node_env") === "development";
class de {
  /**
   * @param {Array<any>} arr
   */
  constructor(t) {
    this.arr = t, Ul && Zs(t);
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
const Bl = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++)
    e.push(n.readAny());
  return new de(e);
};
class $t {
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
    return new $t(this.str);
  }
  /**
   * @param {number} offset
   * @return {ContentString}
   */
  splice(t) {
    const e = new $t(this.str.slice(t));
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
const Ml = (n) => new $t(n.readString()), Fl = [
  ml,
  _l,
  Sl,
  Cl,
  xl,
  Dl,
  Al
], Pl = 0, jl = 1, $l = 2, Wl = 3, Hl = 4, Vl = 5, Zl = 6;
class Kt {
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
    return new Kt(this.type._copy());
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
const Yl = (n) => new Kt(Fl[n.readTypeRef()](n)), Gl = (n, t) => {
  let e = t, r = 0, s;
  do
    r > 0 && (e = rt(e.client, e.clock + r)), s = mn(n, e), r = e.clock - s.id.clock, e = s.redone;
  while (e !== null && s instanceof lt);
  return {
    item: s,
    diff: r
  };
}, Xr = (n, t) => {
  for (; n !== null && n.keep !== t; )
    n.keep = t, n = /** @type {AbstractType<any>} */
    n.parent._item;
}, On = (n, t, e) => {
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
}, Os = (n, t) => Sr(
  n,
  /** @param {StackItem} s */
  (e) => Qe(e.deletions, t)
), Ki = (n, t, e, r, s, i) => {
  const o = n.doc, a = o.store, c = o.clientID, d = t.redone;
  if (d !== null)
    return Dt(n, d);
  let f = (
    /** @type {AbstractType<any>} */
    t.parent._item
  ), u = null, m;
  if (f !== null && f.deleted === !0) {
    if (f.redone === null && (!e.has(f) || Ki(n, f, e, r, s, i) === null))
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
    for (u = t.left, m = t; u !== null; ) {
      let _ = u;
      for (; _ !== null && /** @type {AbstractType<any>} */
      _.parent._item !== f; )
        _ = _.redone === null ? null : Dt(n, _.redone);
      if (_ !== null && /** @type {AbstractType<any>} */
      _.parent._item === f) {
        u = _;
        break;
      }
      u = u.left;
    }
    for (; m !== null; ) {
      let _ = m;
      for (; _ !== null && /** @type {AbstractType<any>} */
      _.parent._item !== f; )
        _ = _.redone === null ? null : Dt(n, _.redone);
      if (_ !== null && /** @type {AbstractType<any>} */
      _.parent._item === f) {
        m = _;
        break;
      }
      m = m.right;
    }
  } else if (m = null, t.right && !s) {
    for (u = t; u !== null && u.right !== null && (u.right.redone || Qe(r, u.right.id) || Os(i.undoStack, u.right.id) || Os(i.redoStack, u.right.id)); )
      for (u = u.right; u.redone; ) u = Dt(n, u.redone);
    if (u && u.right !== null)
      return null;
  } else
    u = l._map.get(t.parentSub) || null;
  const w = mt(a, c), p = rt(c, w), y = new lt(
    p,
    u,
    u && u.lastId,
    m,
    m && m.id,
    l,
    t.parentSub,
    t.content.copy()
  );
  return t.redone = p, Xr(y, !0), y.integrate(n, 0), y;
};
class lt extends Jr {
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
    super(t, c.getLength()), this.origin = r, this.left = e, this.right = s, this.rightOrigin = i, this.parent = o, this.parentSub = a, this.redone = null, this.content = c, this.info = this.content.isCountable() ? os : 0;
  }
  /**
   * This is used to mark the item as an indexed fast-search marker
   *
   * @type {boolean}
   */
  set marker(t) {
    (this.info & Kn) > 0 !== t && (this.info ^= Kn);
  }
  get marker() {
    return (this.info & Kn) > 0;
  }
  /**
   * If true, do not garbage collect this Item.
   */
  get keep() {
    return (this.info & is) > 0;
  }
  set keep(t) {
    this.keep !== t && (this.info ^= is);
  }
  get countable() {
    return (this.info & os) > 0;
  }
  /**
   * Whether this item was deleted or not.
   * @type {Boolean}
   */
  get deleted() {
    return (this.info & Gn) > 0;
  }
  set deleted(t) {
    this.deleted !== t && (this.info ^= Gn);
  }
  markDeleted() {
    this.info |= Gn;
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
    if (this.origin && (this.left = vs(t, e, this.origin), this.origin = this.left.lastId), this.rightOrigin && (this.right = Dt(t, this.rightOrigin), this.rightOrigin = this.right.id), this.left && this.left.constructor === Ot || this.right && this.right.constructor === Ot)
      this.parent = null;
    else if (!this.parent)
      this.left && this.left.constructor === lt ? (this.parent = this.left.parent, this.parentSub = this.left.parentSub) : this.right && this.right.constructor === lt && (this.parent = this.right.parent, this.parentSub = this.right.parentSub);
    else if (this.parent.constructor === ke) {
      const r = mn(e, this.parent);
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
    if (e > 0 && (this.id.clock += e, this.left = vs(t, t.doc.store, rt(this.id.client, this.id.clock - 1)), this.origin = this.left.lastId, this.content = this.content.splice(e), this.length -= e), this.parent) {
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
          if (o.add(s), i.add(s), cn(this.origin, s.origin)) {
            if (s.id.client < this.id.client)
              r = s, i.clear();
            else if (cn(this.rightOrigin, s.rightOrigin))
              break;
          } else if (s.origin !== null && o.has(mn(t.doc.store, s.origin)))
            i.has(mn(t.doc.store, s.origin)) || (r = s, i.clear());
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
      this.right !== null ? this.right.left = this : this.parentSub !== null && (this.parent._map.set(this.parentSub, this), this.left !== null && this.left.delete(t)), this.parentSub === null && this.countable && !this.deleted && (this.parent._length += this.length), Ii(t.doc.store, this), this.content.integrate(t, this), xs(
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
    if (this.constructor === t.constructor && cn(t.origin, this.lastId) && this.right === t && cn(this.rightOrigin, t.rightOrigin) && this.id.client === t.id.client && this.id.clock + this.length === t.id.clock && this.deleted === t.deleted && this.redone === null && t.redone === null && this.content.constructor === t.content.constructor && this.content.mergeWith(t.content)) {
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
      this.countable && this.parentSub === null && (e._length -= this.length), this.markDeleted(), Ze(t.deleteSet, this.id.client, this.id.clock, this.length), xs(t, e, this.parentSub), this.content.delete(t);
    }
  }
  /**
   * @param {StructStore} store
   * @param {boolean} parentGCd
   */
  gc(t, e) {
    if (!this.deleted)
      throw Rt();
    this.content.gc(t), e ? qc(t, this, new Ot(this.id, this.length)) : this.content = new Ke(this.length);
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
    const r = e > 0 ? rt(this.id.client, this.id.clock + e - 1) : this.origin, s = this.rightOrigin, i = this.parentSub, o = this.content.getRef() & zn | (r === null ? 0 : It) | // origin is defined
    (s === null ? 0 : Zt) | // right origin is defined
    (i === null ? 0 : Pe);
    if (t.writeInfo(o), r !== null && t.writeLeftID(r), s !== null && t.writeRightID(s), r === null && s === null) {
      const a = (
        /** @type {AbstractType<any>} */
        this.parent
      );
      if (a._item !== void 0) {
        const c = a._item;
        if (c === null) {
          const d = Gc(a);
          t.writeParentInfo(!0), t.writeString(d);
        } else
          t.writeParentInfo(!1), t.writeLeftID(c.id);
      } else a.constructor === String ? (t.writeParentInfo(!0), t.writeString(a)) : a.constructor === ke ? (t.writeParentInfo(!1), t.writeLeftID(a)) : Rt();
      i !== null && t.writeString(i);
    }
    this.content.write(t, e);
  }
}
const qi = (n, t) => Kl[t & zn](n), Kl = [
  () => {
    Rt();
  },
  // GC is not ItemContent
  Ol,
  // 1
  Nl,
  // 2
  Tl,
  // 3
  Ml,
  // 4
  Rl,
  // 5
  Ll,
  // 6
  Yl,
  // 7
  Bl,
  // 8
  zl,
  // 9
  () => {
    Rt();
  }
  // 10 - Skip is not ItemContent
], ql = 10;
class zt extends Jr {
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
    t.writeInfo(ql), q(t.restEncoder, this.length - e);
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
const Ji = (
  /** @type {any} */
  typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : {}
), Xi = "__ $YJS$ __";
Ji[Xi] === !0 && console.error("Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438");
Ji[Xi] = !0;
function Jl() {
  const n = new pe(), t = n.getMap("pages");
  let e = null, r = null;
  function s(i) {
    let o = t.get(i);
    return o || (o = new he(), t.set(i, o)), o;
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
      return Hr(n);
    },
    applyUpdate(i) {
      Wr(n, i);
    },
    destroy() {
      e?.destroy?.(), r?.destroy(), n.destroy();
    }
  };
}
function Xl(n, t = {}) {
  const e = Jl(), r = t.initialPage ?? "home", s = yo(window.location.search), i = s[s.length - 1] ?? r;
  let o = s.length ? [...s] : [i], a = null, c = !1;
  return {
    getYDocState() {
      return e;
    },
    getTrail() {
      return [...o];
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
        getTrail: () => [...o]
      };
    }
  };
}
const Ql = `
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
`, th = Ql + `
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
function re(n, t) {
  const e = document.createElement(n);
  return e.className = t, e;
}
function eh(n) {
  const t = "worldnotes-styles", e = document.getElementById(t);
  if (e) {
    n !== void 0 && (e.textContent = n);
    return;
  }
  const r = document.createElement("style");
  r.id = t, r.textContent = n ?? th, document.head.appendChild(r);
}
function nh(n, t) {
  eh(t), n.innerHTML = "", n.className = "wn-root";
  const e = re("div", "wn-topbar"), r = re("div", "wn-breadcrumb"), s = re("div", "wn-toolbar"), i = re("div", "wn-editor-wrap"), o = re("div", "wn-editor"), a = re("div", "wn-placeholder"), c = re("div", "wn-overlay");
  return a.textContent = "Start writing… use [[page name]] to link deeper", o.contentEditable = "true", o.spellcheck = !1, e.appendChild(r), i.appendChild(a), i.appendChild(o), i.appendChild(c), n.appendChild(e), n.appendChild(s), n.appendChild(i), { container: n, topbar: e, breadcrumb: r, toolbar: s, editorWrap: i, editorDiv: o, placeholder: a, overlay: c };
}
function Qi(n) {
  if (n.nodeType === Node.TEXT_NODE)
    return n.length;
  if (n instanceof HTMLElement) {
    if (n.dataset.raw !== void 0)
      return n.dataset.raw.length;
    let t = 0;
    return n.childNodes.forEach((e) => {
      t += Qi(e);
    }), t;
  }
  return 0;
}
function qe(n) {
  return Qi(n);
}
function zs(n, t) {
  let e = 0;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((s, i) => parseInt(s.dataset.line ?? "0", 10) - parseInt(i.dataset.line ?? "0", 10));
  for (const s of r) {
    if (parseInt(s.dataset.line ?? "0", 10) >= t) break;
    e += qe(s) + 1;
  }
  return e;
}
function ie(n) {
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
      return zs(n, u) + qe(f) + 1;
    }
    return 0;
  }
  const i = parseInt(s.dataset.line ?? "0", 10), o = zs(n, i);
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
          let m = function(p) {
            if (!w) {
              if (p.nodeType === Node.TEXT_NODE) {
                const y = p.length;
                if (p === r) {
                  l += Math.min(e.startOffset, y), w = !0;
                  return;
                }
                l += y;
                return;
              }
              p.childNodes.forEach(m);
            }
          }, l = 0, w = !1;
          f.childNodes.forEach(m), a += Math.min(l, u), c = !0;
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
function _n(n, t) {
  let e = t;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((i, o) => parseInt(i.dataset.line ?? "0", 10) - parseInt(o.dataset.line ?? "0", 10));
  for (const i of r) {
    const o = qe(i);
    if (e <= o) {
      const a = rh(i, e);
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
    const o = document.createRange(), a = sh(s);
    a ? o.setStart(a, a.length) : o.selectNodeContents(s), o.collapse(!0), i.removeAllRanges(), i.addRange(o);
  }
}
function rh(n, t) {
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
function sh(n) {
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
function Rs(n) {
  return { type: "text", raw: n, groups: [n] };
}
function ih(n, t) {
  const e = t.filter((s) => s.pattern.source.startsWith("^")), r = t.filter((s) => !s.pattern.source.startsWith("^"));
  for (const s of e) {
    const i = n.match(s.pattern);
    if (i)
      return [{ type: s.type, raw: i[0], groups: i.slice(1).map((o) => o ?? "") }];
  }
  return to(n, r);
}
function to(n, t) {
  const e = [];
  let r = n;
  for (; r.length > 0; ) {
    let s = null;
    for (const i of t) {
      const o = r.match(i.pattern);
      !o || o.index === void 0 || (s === null || o.index < s.index) && (s = { index: o.index, match: o, def: i });
    }
    if (!s) {
      e.push(Rs(r));
      break;
    }
    s.index > 0 && e.push(Rs(r.slice(0, s.index))), e.push({
      type: s.def.type,
      raw: s.match[0],
      groups: s.match.slice(1).map((i) => i ?? "")
    }), r = r.slice(s.index + s.match[0].length);
  }
  return e;
}
function oh(n, t) {
  return n.split(`
`).map((e) => ih(e, t));
}
function ah(n, t, e, r = -1) {
  const s = document.createDocumentFragment(), i = eo(t);
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
      const m = f.onNavigate.bind(f);
      u.addEventListener("mousedown", (l) => {
        m(a, e) && l.preventDefault();
      });
    }
    s.appendChild(u);
  }
  return s;
}
function eo(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    for (const r of e.tokens)
      t.set(r.type, e);
  return t;
}
function ch(n, t, e) {
  const r = t.flatMap((a) => a.tokens).filter((a) => !a.pattern.source.startsWith("^")), s = to(n, r), i = eo(t), o = document.createDocumentFragment();
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
function lh(n, t, e, r, s) {
  const i = oh(
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
      const f = ah(i[a], t, e);
      f.childNodes.length ? d.appendChild(f) : d.appendChild(document.createElement("br"));
    }
    r.appendChild(d);
  }
  return { lineCount: i.length, lineLengths: o };
}
function Ls(n, t) {
  let e = 0;
  for (let r = 0; r < Math.min(t, n.length); r++)
    n[r] === `
` && e++;
  return e;
}
function hh(n, t, e, r = {}) {
  const { editorDiv: s, placeholder: i, breadcrumb: o } = n;
  let a = -1;
  function c(m = !1) {
    const l = ie(s), w = e.getYDocState(), p = e.getTrail(), y = p[p.length - 1], v = w.getPage(y).toString();
    a = Ls(v, l);
    const C = /* @__PURE__ */ new Set([a]), A = w.awareness;
    if (A) {
      const F = w.doc.clientID;
      for (const [x, O] of A.getStates().entries())
        x !== F && O.cursor?.page === y && O.cursor.activeLine !== void 0 && C.add(O.cursor.activeLine);
    }
    const D = e.toContext(
      r.navigateFn ?? ((F) => {
      })
    );
    D.renderInline = (F) => ch(F, t, D), lh(v, t, D, s, C), i.style.display = v.length ? "none" : "block";
    try {
      _n(s, l);
    } catch {
    }
  }
  function d() {
    const m = ie(s), l = e.getYDocState(), w = e.getTrail(), p = w[w.length - 1], y = l.getPage(p).toString();
    Ls(y, m) !== a && c();
  }
  function f() {
    o.innerHTML = "";
    const m = e.getTrail();
    m.forEach((l, w) => {
      if (w > 0) {
        const y = document.createElement("span");
        y.className = "wn-crumb-sep", y.textContent = "/", o.appendChild(y);
      }
      const p = document.createElement("span");
      p.className = "wn-crumb" + (w === m.length - 1 ? " wn-crumb--active" : ""), p.textContent = or(l), w < m.length - 1 && p.addEventListener("click", () => {
        e.truncateTrail(w);
        const y = e.getTrail(), _ = y[y.length - 1];
        r.onBreadcrumbNavigate?.(_);
      }), o.appendChild(p);
    }), r.onTrailChange?.(e.getTrail()), u();
  }
  function u() {
    const m = e.getTrail(), l = _o(window.location.search, m);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${l}${window.location.hash}`
    );
  }
  return { render: c, renderBreadcrumb: f, syncUrlToTrail: u, checkSelectChange: d };
}
const uh = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
function dh(n, t, e, r) {
  let s = null;
  function i(c) {
    s = c;
  }
  async function o(c) {
    const d = n.getYDocState();
    if (!d.hasPage(c)) {
      const m = await t.get(c);
      if (m) {
        const l = d.getPage(c);
        l.toString() === "" && l.insert(0, m);
      } else
        d.getPage(c).insert(0, `# ${c}

`);
    }
    const u = n.getTrail().indexOf(c);
    u !== -1 ? n.truncateTrail(u) : n.pushTrail(c), await a(c);
  }
  async function a(c) {
    n.setNavigating(!0);
    const d = n.getYDocState(), f = d.hasPage(c), u = d.getPage(c);
    !u.toString() && !f && (c === "home" ? u.insert(0, uh) : u.insert(0, `# ${c}

`)), e.editorDiv.innerHTML = "", s && (s.render(!0), s.renderBreadcrumb());
    try {
      const l = document.createRange(), w = window.getSelection();
      if (w) {
        const p = e.editorDiv.querySelector('[data-line="0"]');
        p ? l.setStart(p, 0) : l.setStart(e.editorDiv, 0), l.collapse(!0), w.removeAllRanges(), w.addRange(l);
      }
    } catch {
    }
    r.onPageLoad?.(c, u.toString()), n.setNavigating(!1), e.editorDiv.focus();
  }
  return { navigateToPage: o, loadPage: a, setRenderAPI: i };
}
const no = /* @__PURE__ */ new Map();
class fh {
  /**
   * @param {string} room
   */
  constructor(t) {
    this.room = t, this.onmessage = null, this._onChange = (e) => e.key === t && this.onmessage !== null && this.onmessage({ data: Fa(e.newValue || "") }), ma(this._onChange);
  }
  /**
   * @param {ArrayBuffer} buf
   */
  postMessage(t) {
    Hs.setItem(this.room, Ma(Ra(t)));
  }
  close() {
    wa(this._onChange);
  }
}
const ph = typeof BroadcastChannel > "u" ? fh : BroadcastChannel, Qr = (n) => Wt(no, n, () => {
  const t = Qt(), e = new ph(n);
  return e.onmessage = (r) => t.forEach((s) => s(r.data, "broadcastchannel")), {
    bc: e,
    subs: t
  };
}), gh = (n, t) => (Qr(n).subs.add(t), t), mh = (n, t) => {
  const e = Qr(n), r = e.subs.delete(t);
  return r && e.subs.size === 0 && (e.bc.close(), no.delete(n)), r;
}, _e = (n, t, e = null) => {
  const r = Qr(n);
  r.bc.postMessage(t), r.subs.forEach((s) => s(t, e));
}, ro = 0, ts = 1, so = 2, wr = (n, t) => {
  q(n, ro);
  const e = Zc(t);
  pt(n, e);
}, io = (n, t, e) => {
  q(n, ts), pt(n, Hr(t, e));
}, wh = (n, t, e) => io(t, e, St(n)), oo = (n, t, e, r) => {
  try {
    Wr(t, St(n), e);
  } catch (s) {
    r?.(
      /** @type {Error} */
      s
    ), console.error("Caught error while handling a Yjs update", s);
  }
}, _h = (n, t) => {
  q(n, so), pt(n, t);
}, yh = oo, bh = (n, t, e, r, s) => {
  const i = tt(n);
  switch (i) {
    case ro:
      wh(n, t, e);
      break;
    case ts:
      oo(n, e, r, s);
      break;
    case so:
      yh(n, e, r, s);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return i;
}, kh = 0, vh = (n, t, e) => {
  tt(n) === kh && e(t, Xt(n));
}, rr = 3e4;
class Sh extends Uo {
  /**
   * @param {Y.Doc} doc
   */
  constructor(t) {
    super(), this.doc = t, this.clientID = t.clientID, this.states = /* @__PURE__ */ new Map(), this.meta = /* @__PURE__ */ new Map(), this._checkInterval = /** @type {any} */
    setInterval(() => {
      const e = te();
      this.getLocalState() !== null && rr / 2 <= e - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated && this.setLocalState(this.getLocalState());
      const r = [];
      this.meta.forEach((s, i) => {
        i !== this.clientID && rr <= e - s.lastUpdated && this.states.has(i) && r.push(i);
      }), r.length > 0 && es(this, r, "timeout");
    }, Ut(rr / 10)), t.on("destroy", () => {
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
      lastUpdated: te()
    });
    const o = [], a = [], c = [], d = [];
    t === null ? d.push(e) : i == null ? t != null && o.push(e) : (a.push(e), ye(i, t) || c.push(e)), (o.length > 0 || c.length > 0 || d.length > 0) && this.emit("change", [{ added: o, updated: c, removed: d }, "local"]), this.emit("update", [{ added: o, updated: a, removed: d }, "local"]);
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
const es = (n, t, e) => {
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
          lastUpdated: te()
        });
      }
      r.push(i);
    }
  }
  r.length > 0 && (n.emit("change", [{ added: [], updated: [], removed: r }, e]), n.emit("update", [{ added: [], updated: [], removed: r }, e]));
}, Fe = (n, t, e = n.states) => {
  const r = t.length, s = xt();
  q(s, r);
  for (let i = 0; i < r; i++) {
    const o = t[i], a = e.get(o) || null, c = (
      /** @type {MetaClientState} */
      n.meta.get(o).clock
    );
    q(s, o), q(s, c), ce(s, JSON.stringify(a));
  }
  return ht(s);
}, xh = (n, t, e) => {
  const r = ne(t), s = te(), i = [], o = [], a = [], c = [], d = tt(r);
  for (let f = 0; f < d; f++) {
    const u = tt(r);
    let m = tt(r);
    const l = JSON.parse(Xt(r)), w = n.meta.get(u), p = n.states.get(u), y = w === void 0 ? 0 : w.clock;
    (y < m || y === m && l === null && n.states.has(u)) && (l === null ? u === n.clientID && n.getLocalState() != null ? m++ : n.states.delete(u) : n.states.set(u, l), n.meta.set(u, {
      clock: m,
      lastUpdated: s
    }), w === void 0 && l !== null ? i.push(u) : w !== void 0 && l === null ? c.push(u) : l !== null && (ye(l, p) || a.push(u), o.push(u)));
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
}, Ch = (n) => va(n, (t, e) => `${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join("&"), oe = 0, ao = 3, Se = 1, Eh = 2, rn = [];
rn[oe] = (n, t, e, r, s) => {
  q(n, oe);
  const i = bh(
    t,
    n,
    e.doc,
    e
  );
  r && i === ts && !e.synced && (e.synced = !0);
};
rn[ao] = (n, t, e, r, s) => {
  q(n, Se), pt(
    n,
    Fe(
      e.awareness,
      Array.from(e.awareness.getStates().keys())
    )
  );
};
rn[Se] = (n, t, e, r, s) => {
  xh(
    e.awareness,
    St(t),
    e
  );
};
rn[Eh] = (n, t, e, r, s) => {
  vh(
    t,
    e.doc,
    (i, o) => Dh(e, o)
  );
};
const Ns = 3e4, Dh = (n, t) => console.warn(`Permission denied to access ${n.url}.
${t}`), co = (n, t, e) => {
  const r = ne(t), s = xt(), i = tt(r), o = n.messageHandlers[i];
  return /** @type {any} */ o ? o(s, r, n, e, i) : console.error("Unable to compute message"), s;
}, _r = (n, t, e) => {
  t === n.ws && (n.emit("connection-close", [e, n]), n.ws = null, t.close(), n.wsconnecting = !1, n.wsconnected ? (n.wsconnected = !1, n.synced = !1, es(
    n.awareness,
    Array.from(n.awareness.getStates().keys()).filter(
      (r) => r !== n.doc.clientID
    ),
    n
  ), n.emit("status", [{
    status: "disconnected"
  }])) : n.wsUnsuccessfulReconnects++, setTimeout(
    lo,
    Cr(
      Bo(2, n.wsUnsuccessfulReconnects) * 100,
      n.maxBackoffTime
    ),
    n
  ));
}, lo = (n) => {
  if (n.shouldConnect && n.ws === null) {
    const t = new n._WS(n.url, n.protocols);
    t.binaryType = "arraybuffer", n.ws = t, n.wsconnecting = !0, n.wsconnected = !1, n.synced = !1, t.onmessage = (e) => {
      n.wsLastMessageReceived = te();
      const r = co(n, new Uint8Array(e.data), !0);
      Er(r) > 1 && t.send(ht(r));
    }, t.onerror = (e) => {
      n.emit("connection-error", [e, n]);
    }, t.onclose = (e) => {
      _r(n, t, e);
    }, t.onopen = () => {
      n.wsLastMessageReceived = te(), n.wsconnecting = !1, n.wsconnected = !0, n.wsUnsuccessfulReconnects = 0, n.emit("status", [{
        status: "connected"
      }]);
      const e = xt();
      if (q(e, oe), wr(e, n.doc), t.send(ht(e)), n.awareness.getLocalState() !== null) {
        const r = xt();
        q(r, Se), pt(
          r,
          Fe(n.awareness, [
            n.doc.clientID
          ])
        ), t.send(ht(r));
      }
    }, n.emit("status", [{
      status: "connecting"
    }]);
  }
}, sr = (n, t) => {
  const e = n.ws;
  n.wsconnected && e && e.readyState === e.OPEN && e.send(t), n.bcconnected && _e(n.bcChannel, t, n);
};
class Ah extends xr {
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
    awareness: i = new Sh(r),
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
        const m = xt();
        q(m, oe), wr(m, r), this.ws.send(ht(m));
      }
    }, d)), this._bcSubscriber = (m, l) => {
      if (l !== this) {
        const w = co(this, new Uint8Array(m), !1);
        Er(w) > 1 && _e(this.bcChannel, ht(w), this);
      }
    }, this._updateHandler = (m, l) => {
      if (l !== this) {
        const w = xt();
        q(w, oe), _h(w, m), sr(this, ht(w));
      }
    }, this.doc.on("update", this._updateHandler), this._awarenessUpdateHandler = ({ added: m, updated: l, removed: w }, p) => {
      const y = m.concat(l).concat(w), _ = xt();
      q(_, Se), pt(
        _,
        Fe(i, y)
      ), sr(this, ht(_));
    }, this._exitHandler = () => {
      es(
        this.awareness,
        [r.clientID],
        "app closed"
      );
    }, ee && typeof process < "u" && process.on("exit", this._exitHandler), i.on("update", this._awarenessUpdateHandler), this._checkInterval = /** @type {any} */
    setInterval(() => {
      this.wsconnected && Ns < te() - this.wsLastMessageReceived && _r(
        this,
        /** @type {WebSocket} */
        this.ws,
        null
      );
    }, Ns / 10), s && this.connect();
  }
  get url() {
    const t = Ch(this.params);
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
    this._resyncInterval !== 0 && clearInterval(this._resyncInterval), clearInterval(this._checkInterval), this.disconnect(), ee && typeof process < "u" && process.off("exit", this._exitHandler), this.awareness.off("update", this._awarenessUpdateHandler), this.doc.off("update", this._updateHandler), super.destroy();
  }
  connectBc() {
    if (this.disableBc)
      return;
    this.bcconnected || (gh(this.bcChannel, this._bcSubscriber), this.bcconnected = !0);
    const t = xt();
    q(t, oe), wr(t, this.doc), _e(this.bcChannel, ht(t), this);
    const e = xt();
    q(e, oe), io(e, this.doc), _e(this.bcChannel, ht(e), this);
    const r = xt();
    q(r, ao), _e(
      this.bcChannel,
      ht(r),
      this
    );
    const s = xt();
    q(s, Se), pt(
      s,
      Fe(this.awareness, [
        this.doc.clientID
      ])
    ), _e(
      this.bcChannel,
      ht(s),
      this
    );
  }
  disconnectBc() {
    const t = xt();
    q(t, Se), pt(
      t,
      Fe(this.awareness, [
        this.doc.clientID
      ], /* @__PURE__ */ new Map())
    ), sr(this, ht(t)), this.bcconnected && (mh(this.bcChannel, this._bcSubscriber), this.bcconnected = !1);
  }
  disconnect() {
    this.shouldConnect = !1, this.disconnectBc(), this.ws !== null && _r(this, this.ws, null);
  }
  connect() {
    this.shouldConnect = !0, !this.wsconnected && this.ws === null && (lo(this), this.connectBc());
  }
}
const ho = "__ync_update__";
async function Ih(n, t) {
  const e = Hr(n), r = Oh(e);
  await t.set(ho, r);
}
async function Th(n, t) {
  const e = await t.get(ho);
  if (e) {
    const r = zh(e);
    Wr(n, r);
  }
}
function Oh(n) {
  const t = String.fromCharCode(...n);
  return btoa(t);
}
function zh(n) {
  const t = atob(n);
  return Uint8Array.from(t, (e) => e.charCodeAt(0));
}
const Us = [
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
function Rh(n) {
  return Us[n % Us.length] ?? "#888";
}
const Vh = {
  name: "remote-cursors",
  version: "1.0.0",
  kind: "ui",
  slots: ["wn-overlay"],
  priority: 0,
  onMount(n) {
    n.style.position = "absolute", n.style.top = "0", n.style.left = "0", n.style.pointerEvents = "none", n.style.zIndex = "10";
  }
};
function Lh(n, t, e, r) {
  if (n.innerHTML = "", !t) return;
  const s = t.getStates();
  for (const [i, o] of s.entries()) {
    if (i === r || !o.cursor) continue;
    const a = o.user?.color ?? Rh(i), c = o.user?.name ?? `User ${i}`, d = document.createElement("div");
    d.className = "wn-remote-cursor";
    const f = document.createElement("span");
    f.className = "wn-remote-cursor-caret", f.style.backgroundColor = a;
    const u = document.createElement("span");
    u.className = "wn-remote-cursor-label", u.style.backgroundColor = a, u.textContent = c, d.appendChild(f), d.appendChild(u);
    const m = Nh(e, o.cursor.offset, n);
    m && (d.style.left = `${m.left}px`, d.style.top = `${m.top}px`), n.appendChild(d);
  }
}
function Nh(n, t, e) {
  let r = t;
  const s = Array.from(
    n.querySelectorAll("[data-line]")
  );
  s.sort((f, u) => parseInt(f.dataset.line ?? "0", 10) - parseInt(u.dataset.line ?? "0", 10));
  const o = e.offsetParent?.getBoundingClientRect(), a = o?.left ?? 0, c = o?.top ?? 0;
  for (const f of s) {
    const u = qe(f);
    if (r <= u) {
      const m = f.getBoundingClientRect();
      return {
        left: m.left - a + r * 8,
        top: m.top - c
      };
    }
    r -= u + 1;
  }
  const d = s[s.length - 1];
  if (d) {
    const f = d.getBoundingClientRect();
    return {
      left: f.left - a + qe(d) * 8,
      top: f.top - c
    };
  }
  return null;
}
function Uh(n, t, e, r, s, i, o, a) {
  function c(f) {
    const u = window.getSelection();
    if (!u || !u.rangeCount) return;
    const m = u.getRangeAt(0);
    m.deleteContents();
    const l = document.createTextNode(f);
    m.insertNode(l), m.setStart(l, f.length), m.collapse(!0), u.removeAllRanges(), u.addRange(m), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  async function d() {
    const f = a.saveDebounceMs ?? 600, u = r.getYDocState();
    await Th(u.doc, o);
    let m = null;
    if (a.syncServer) {
      const x = r.getTrail(), O = `worldnotes-${x[x.length - 1]}`;
      m = new Ah(
        a.syncServer,
        O,
        u.doc
      ), u.setAwareness(m.awareness);
      const I = m.awareness;
      I.on("change", () => {
        Lh(
          n.overlay,
          I,
          n.editorDiv,
          u.doc.clientID
        );
      }), m.on("status", (U) => {
        U.status === "connected" && s.render(!0);
      }), u.doc.on("update", (U, Y) => {
        Y === m && s.render(!0);
      });
    }
    const l = async () => {
      await Ih(u.doc, o);
    }, w = () => {
      r.clearSaveTimer();
      const x = setTimeout(async () => {
        await l();
        const O = r.getTrail(), I = O[O.length - 1], U = u.getPage(I);
        a.onSave?.(I, U.toString());
      }, f);
      r.setSaveTimer(x);
    };
    let p = !1;
    function y(x) {
      let O = "", I = !1;
      function U(Y) {
        Y.nodeType === Node.TEXT_NODE ? O += Y.textContent ?? "" : Y instanceof HTMLElement && (Y.dataset.raw !== void 0 ? O += Y.dataset.raw : (Y.dataset.line !== void 0 && (I && (O += `
`), I = !0), Y.childNodes.forEach(U)));
      }
      return U(x), O;
    }
    n.editorDiv.addEventListener("input", () => {
      if (r.isNavigating() || p) return;
      p = !0;
      const x = r.getTrail(), O = x[x.length - 1], I = u.getPage(O), U = y(n.editorDiv), Y = I.toString();
      U !== Y && u.doc.transact(() => {
        I.delete(0, Y.length), I.insert(0, U);
      });
      const S = ie(n.editorDiv);
      let N = 0;
      for (let B = 0; B < Math.min(S, U.length); B++)
        U[B] === `
` && N++;
      u.awareness?.setLocalStateField?.("cursor", { offset: S, page: O, activeLine: N }), s.render();
      for (const B of t)
        B.onUpdate?.();
      w(), p = !1;
    }), n.editorDiv.addEventListener("paste", (x) => {
      x.preventDefault();
      const O = x.clipboardData?.getData("text/plain") ?? "";
      c(O);
    }), n.editorDiv.addEventListener("keydown", (x) => {
      if ((x.ctrlKey || x.metaKey) && !x.shiftKey && x.key === "z") {
        x.preventDefault();
        const O = u.undoManager;
        O?.canUndo() && (O.undo(), s.render(!0));
        return;
      }
      if ((x.ctrlKey || x.metaKey) && x.shiftKey && x.key === "z") {
        x.preventDefault();
        const O = u.undoManager;
        O?.canRedo() && (O.redo(), s.render(!0));
        return;
      }
      if (x.ctrlKey && !x.shiftKey && x.key === "y") {
        x.preventDefault();
        const O = u.undoManager;
        O?.canRedo() && (O.redo(), s.render(!0));
        return;
      }
      if (x.key === "Tab")
        x.preventDefault(), c("  ");
      else if (x.key === "Enter")
        x.preventDefault(), c(`
`);
      else if (x.key === "Backspace") {
        x.preventDefault();
        const O = window.getSelection();
        if (!O || !O.rangeCount) return;
        const I = O.getRangeAt(0);
        if (!I.collapsed) {
          I.deleteContents(), O.removeAllRanges(), O.addRange(I), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
          return;
        }
        const U = ie(n.editorDiv);
        if (U > 0) {
          const Y = r.getTrail(), S = Y[Y.length - 1], N = u.getPage(S), g = N.toString(), B = g.slice(0, U - 1) + g.slice(U);
          u.doc.transact(() => {
            N.delete(0, g.length), N.insert(0, B);
          }), s.render(), _n(n.editorDiv, U - 1), w();
        }
      }
    });
    let _ = !1;
    document.addEventListener("selectionchange", () => {
      p || _ || r.isNavigating() || (_ = !0, requestAnimationFrame(() => {
        _ = !1, s.checkSelectChange();
      }));
    });
    const v = r.getTrail(), C = v[v.length - 1];
    await i.loadPage(C);
    const A = u.getPage(C), D = new el(A, { captureTimeout: 0 });
    u.setUndoManager(D);
    const F = {
      "wn-toolbar": n.toolbar,
      "wn-overlay": n.overlay
    };
    for (const x of e)
      for (const O of x.slots) {
        const I = F[O];
        I && x.onMount(I);
      }
    return {
      destroy() {
        r.clearSaveTimer(), m?.destroy();
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
        u.destroy(), n.container.innerHTML = "";
      },
      navigate(x) {
        i.navigateToPage(x);
      },
      getCurrentPage() {
        const x = r.getTrail();
        return x[x.length - 1];
      },
      getTrail() {
        return r.getTrail();
      },
      getContent() {
        const x = r.getTrail(), O = x[x.length - 1];
        return u.getPage(O).toString();
      },
      setContent(x) {
        const O = r.getTrail(), I = O[O.length - 1], U = u.getPage(I);
        u.doc.transact(() => {
          U.delete(0, U.length), U.insert(0, x);
        }), s.render(!0);
      },
      undo() {
        const x = u.undoManager;
        return x?.canUndo() ? (x.undo(), s.render(!0), !0) : !1;
      },
      redo() {
        const x = u.undoManager;
        return x?.canRedo() ? (x.redo(), s.render(!0), !0) : !1;
      },
      canUndo() {
        return u.undoManager?.canUndo() ?? !1;
      },
      canRedo() {
        return u.undoManager?.canRedo() ?? !1;
      },
      insertText(x) {
        c(x);
      },
      deleteForward() {
        const x = window.getSelection();
        if (!x || !x.rangeCount) return;
        if (x.isCollapsed)
          try {
            x.modify("extend", "forward", "character");
          } catch {
            const I = u.getPage(
              r.getTrail()[r.getTrail().length - 1]
            ).toString(), U = ie(n.editorDiv);
            if (U >= I.length) return;
            const Y = I.slice(0, U) + I.slice(U + 1);
            u.getPage(r.getTrail()[r.getTrail().length - 1]).delete(0, I.length), u.getPage(r.getTrail()[r.getTrail().length - 1]).insert(0, Y), s.render(!0), _n(n.editorDiv, U);
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
            const I = u.getPage(
              r.getTrail()[r.getTrail().length - 1]
            ).toString(), U = ie(n.editorDiv);
            if (U <= 0) return;
            const Y = I.slice(0, U - 1) + I.slice(U);
            u.getPage(r.getTrail()[r.getTrail().length - 1]).delete(0, I.length), u.getPage(r.getTrail()[r.getTrail().length - 1]).insert(0, Y), s.render(!0), _n(n.editorDiv, U - 1);
            return;
          }
        const O = x.getRangeAt(0);
        O.deleteContents(), x.removeAllRanges(), x.addRange(O), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      getSelection() {
        const x = window.getSelection();
        if (!x || !x.rangeCount) return null;
        const O = x.toString(), I = ie(n.editorDiv), U = I + O.length;
        return { text: O, start: I, end: Math.max(I, U) };
      }
    };
  }
  return { mount: d };
}
class Bh {
  constructor(t, e = {}) {
    this.registry = new Oo(), this.storage = new wo(), this.options = {}, this._mounted = !1, this._slotElements = null, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
    for (const r of Io)
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
    const t = this.registry.allUIPlugins().sort((r, s) => (r.priority ?? 0) - (s.priority ?? 0)), e = await Mh(
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
function Zh(n, t = {}) {
  return new Bh(n, t);
}
async function Mh(n, t, e, r, s) {
  const i = Xl(r, s), o = nh(n, s.theme), a = dh(i, r, o, s), c = {
    navigateFn: (u) => {
      a.navigateToPage(u);
    },
    onBreadcrumbNavigate: (u) => {
      a.loadPage(u);
    },
    onTrailChange: s.onTrailChange
  }, d = hh(o, t, i, c);
  return a.setRenderAPI(d), Uh(
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
const Fh = "worldnotes", se = "pages";
class Yh {
  constructor(t = Fh) {
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
        r.result.createObjectStore(se);
      }, r.onsuccess = () => t(r.result), r.onerror = () => e(r.error);
    }));
  }
  async ensureOpen() {
    return await this.open(), this.db;
  }
  async get(t) {
    const e = await this.ensureOpen();
    return new Promise((r, s) => {
      const o = e.transaction(se, "readonly").objectStore(se).get(t);
      o.onsuccess = () => r(o.result ?? null), o.onerror = () => s(o.error);
    });
  }
  async set(t, e) {
    const r = await this.ensureOpen();
    return new Promise((s, i) => {
      const a = r.transaction(se, "readwrite").objectStore(se).put(e, t);
      a.onsuccess = () => s(), a.onerror = () => i(a.error);
    });
  }
  async keys() {
    const t = await this.ensureOpen();
    return new Promise((e, r) => {
      const i = t.transaction(se, "readonly").objectStore(se).getAllKeys();
      i.onsuccess = () => e(i.result), i.onerror = () => r(i.error);
    });
  }
}
class Gh {
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
var un = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ph(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
function dn(n) {
  throw new Error('Could not dynamically require "' + n + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var ir = { exports: {} };
var Bs;
function jh() {
  return Bs || (Bs = 1, (function(n, t) {
    (function(e) {
      n.exports = e();
    })(function() {
      return (function e(r, s, i) {
        function o(d, f) {
          if (!s[d]) {
            if (!r[d]) {
              var u = typeof dn == "function" && dn;
              if (!f && u) return u(d, !0);
              if (a) return a(d, !0);
              var m = new Error("Cannot find module '" + d + "'");
              throw m.code = "MODULE_NOT_FOUND", m;
            }
            var l = s[d] = { exports: {} };
            r[d][0].call(l.exports, function(w) {
              var p = r[d][1][w];
              return o(p || w);
            }, l, l.exports, e, r, s, i);
          }
          return s[d].exports;
        }
        for (var a = typeof dn == "function" && dn, c = 0; c < i.length; c++) o(i[c]);
        return o;
      })({ 1: [function(e, r, s) {
        var i = e("./utils"), o = e("./support"), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        s.encode = function(c) {
          for (var d, f, u, m, l, w, p, y = [], _ = 0, v = c.length, C = v, A = i.getTypeOf(c) !== "string"; _ < c.length; ) C = v - _, u = A ? (d = c[_++], f = _ < v ? c[_++] : 0, _ < v ? c[_++] : 0) : (d = c.charCodeAt(_++), f = _ < v ? c.charCodeAt(_++) : 0, _ < v ? c.charCodeAt(_++) : 0), m = d >> 2, l = (3 & d) << 4 | f >> 4, w = 1 < C ? (15 & f) << 2 | u >> 6 : 64, p = 2 < C ? 63 & u : 64, y.push(a.charAt(m) + a.charAt(l) + a.charAt(w) + a.charAt(p));
          return y.join("");
        }, s.decode = function(c) {
          var d, f, u, m, l, w, p = 0, y = 0, _ = "data:";
          if (c.substr(0, _.length) === _) throw new Error("Invalid base64 input, it looks like a data url.");
          var v, C = 3 * (c = c.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (c.charAt(c.length - 1) === a.charAt(64) && C--, c.charAt(c.length - 2) === a.charAt(64) && C--, C % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (v = o.uint8array ? new Uint8Array(0 | C) : new Array(0 | C); p < c.length; ) d = a.indexOf(c.charAt(p++)) << 2 | (m = a.indexOf(c.charAt(p++))) >> 4, f = (15 & m) << 4 | (l = a.indexOf(c.charAt(p++))) >> 2, u = (3 & l) << 6 | (w = a.indexOf(c.charAt(p++))), v[y++] = d, l !== 64 && (v[y++] = f), w !== 64 && (v[y++] = u);
          return v;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(e, r, s) {
        var i = e("./external"), o = e("./stream/DataWorker"), a = e("./stream/Crc32Probe"), c = e("./stream/DataLengthProbe");
        function d(f, u, m, l, w) {
          this.compressedSize = f, this.uncompressedSize = u, this.crc32 = m, this.compression = l, this.compressedContent = w;
        }
        d.prototype = { getContentWorker: function() {
          var f = new o(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new c("data_length")), u = this;
          return f.on("end", function() {
            if (this.streamInfo.data_length !== u.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), f;
        }, getCompressedWorker: function() {
          return new o(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, d.createWorkerFrom = function(f, u, m) {
          return f.pipe(new a()).pipe(new c("uncompressedSize")).pipe(u.compressWorker(m)).pipe(new c("compressedSize")).withStreamInfo("compression", u);
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
          return a !== void 0 && a.length ? i.getTypeOf(a) !== "string" ? (function(d, f, u, m) {
            var l = o, w = m + u;
            d ^= -1;
            for (var p = m; p < w; p++) d = d >>> 8 ^ l[255 & (d ^ f[p])];
            return -1 ^ d;
          })(0 | c, a, a.length, 0) : (function(d, f, u, m) {
            var l = o, w = m + u;
            d ^= -1;
            for (var p = m; p < w; p++) d = d >>> 8 ^ l[255 & (d ^ f.charCodeAt(p))];
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
        function f(u, m) {
          c.call(this, "FlateWorker/" + u), this._pako = null, this._pakoAction = u, this._pakoOptions = m, this.meta = {};
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
          this._pako.onData = function(m) {
            u.push({ data: m, meta: u.meta });
          };
        }, s.compressWorker = function(u) {
          return new f("Deflate", u);
        }, s.uncompressWorker = function() {
          return new f("Inflate", {});
        };
      }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, r, s) {
        function i(l, w) {
          var p, y = "";
          for (p = 0; p < w; p++) y += String.fromCharCode(255 & l), l >>>= 8;
          return y;
        }
        function o(l, w, p, y, _, v) {
          var C, A, D = l.file, F = l.compression, x = v !== d.utf8encode, O = a.transformTo("string", v(D.name)), I = a.transformTo("string", d.utf8encode(D.name)), U = D.comment, Y = a.transformTo("string", v(U)), S = a.transformTo("string", d.utf8encode(U)), N = I.length !== D.name.length, g = S.length !== U.length, B = "", et = "", $ = "", nt = D.dir, W = D.date, Q = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          w && !p || (Q.crc32 = l.crc32, Q.compressedSize = l.compressedSize, Q.uncompressedSize = l.uncompressedSize);
          var R = 0;
          w && (R |= 8), x || !N && !g || (R |= 2048);
          var z = 0, X = 0;
          nt && (z |= 16), _ === "UNIX" ? (X = 798, z |= (function(Z, ut) {
            var vt = Z;
            return Z || (vt = ut ? 16893 : 33204), (65535 & vt) << 16;
          })(D.unixPermissions, nt)) : (X = 20, z |= (function(Z) {
            return 63 & (Z || 0);
          })(D.dosPermissions)), C = W.getUTCHours(), C <<= 6, C |= W.getUTCMinutes(), C <<= 5, C |= W.getUTCSeconds() / 2, A = W.getUTCFullYear() - 1980, A <<= 4, A |= W.getUTCMonth() + 1, A <<= 5, A |= W.getUTCDate(), N && (et = i(1, 1) + i(f(O), 4) + I, B += "up" + i(et.length, 2) + et), g && ($ = i(1, 1) + i(f(Y), 4) + S, B += "uc" + i($.length, 2) + $);
          var G = "";
          return G += `
\0`, G += i(R, 2), G += F.magic, G += i(C, 2), G += i(A, 2), G += i(Q.crc32, 4), G += i(Q.compressedSize, 4), G += i(Q.uncompressedSize, 4), G += i(O.length, 2), G += i(B.length, 2), { fileRecord: u.LOCAL_FILE_HEADER + G + O + B, dirRecord: u.CENTRAL_FILE_HEADER + i(X, 2) + G + i(Y.length, 2) + "\0\0\0\0" + i(z, 4) + i(y, 4) + O + B + Y };
        }
        var a = e("../utils"), c = e("../stream/GenericWorker"), d = e("../utf8"), f = e("../crc32"), u = e("../signature");
        function m(l, w, p, y) {
          c.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = w, this.zipPlatform = p, this.encodeFileName = y, this.streamFiles = l, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        a.inherits(m, c), m.prototype.push = function(l) {
          var w = l.meta.percent || 0, p = this.entriesCount, y = this._sources.length;
          this.accumulate ? this.contentBuffer.push(l) : (this.bytesWritten += l.data.length, c.prototype.push.call(this, { data: l.data, meta: { currentFile: this.currentFile, percent: p ? (w + 100 * (p - y - 1)) / p : 100 } }));
        }, m.prototype.openedSource = function(l) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = l.file.name;
          var w = this.streamFiles && !l.file.dir;
          if (w) {
            var p = o(l, w, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: p.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = !0;
        }, m.prototype.closedSource = function(l) {
          this.accumulate = !1;
          var w = this.streamFiles && !l.file.dir, p = o(l, w, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(p.dirRecord), w) this.push({ data: (function(y) {
            return u.DATA_DESCRIPTOR + i(y.crc32, 4) + i(y.compressedSize, 4) + i(y.uncompressedSize, 4);
          })(l), meta: { percent: 100 } });
          else for (this.push({ data: p.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, m.prototype.flush = function() {
          for (var l = this.bytesWritten, w = 0; w < this.dirRecords.length; w++) this.push({ data: this.dirRecords[w], meta: { percent: 100 } });
          var p = this.bytesWritten - l, y = (function(_, v, C, A, D) {
            var F = a.transformTo("string", D(A));
            return u.CENTRAL_DIRECTORY_END + "\0\0\0\0" + i(_, 2) + i(_, 2) + i(v, 4) + i(C, 4) + i(F.length, 2) + F;
          })(this.dirRecords.length, p, l, this.zipComment, this.encodeFileName);
          this.push({ data: y, meta: { percent: 100 } });
        }, m.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, m.prototype.registerPrevious = function(l) {
          this._sources.push(l);
          var w = this;
          return l.on("data", function(p) {
            w.processChunk(p);
          }), l.on("end", function() {
            w.closedSource(w.previous.streamInfo), w._sources.length ? w.prepareNextSource() : w.end();
          }), l.on("error", function(p) {
            w.error(p);
          }), this;
        }, m.prototype.resume = function() {
          return !!c.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
        }, m.prototype.error = function(l) {
          var w = this._sources;
          if (!c.prototype.error.call(this, l)) return !1;
          for (var p = 0; p < w.length; p++) try {
            w[p].error(l);
          } catch {
          }
          return !0;
        }, m.prototype.lock = function() {
          c.prototype.lock.call(this);
          for (var l = this._sources, w = 0; w < l.length; w++) l[w].lock();
        }, r.exports = m;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, r, s) {
        var i = e("../compressions"), o = e("./ZipFileWorker");
        s.generateWorker = function(a, c, d) {
          var f = new o(c.streamFiles, d, c.platform, c.encodeFileName), u = 0;
          try {
            a.forEach(function(m, l) {
              u++;
              var w = (function(v, C) {
                var A = v || C, D = i[A];
                if (!D) throw new Error(A + " is not a valid compression method !");
                return D;
              })(l.options.compression, c.compression), p = l.options.compressionOptions || c.compressionOptions || {}, y = l.dir, _ = l.date;
              l._compressWorker(w, p).withStreamInfo("file", { name: m, dir: y, date: _, comment: l.comment || "", unixPermissions: l.unixPermissions, dosPermissions: l.dosPermissions }).pipe(f);
            }), f.entriesCount = u;
          } catch (m) {
            f.error(m);
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
        function u(m) {
          return new o.Promise(function(l, w) {
            var p = m.decompressed.getContentWorker().pipe(new d());
            p.on("error", function(y) {
              w(y);
            }).on("end", function() {
              p.streamInfo.crc32 !== m.decompressed.crc32 ? w(new Error("Corrupted zip : CRC32 mismatch")) : l();
            }).resume();
          });
        }
        r.exports = function(m, l) {
          var w = this;
          return l = i.extend(l || {}, { base64: !1, checkCRC32: !1, optimizedBinaryString: !1, createFolders: !1, decodeFileName: a.utf8decode }), f.isNode && f.isStream(m) ? o.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : i.prepareContent("the loaded zip file", m, !0, l.optimizedBinaryString, l.base64).then(function(p) {
            var y = new c(l);
            return y.load(p), y;
          }).then(function(p) {
            var y = [o.Promise.resolve(p)], _ = p.files;
            if (l.checkCRC32) for (var v = 0; v < _.length; v++) y.push(u(_[v]));
            return o.Promise.all(y);
          }).then(function(p) {
            for (var y = p.shift(), _ = y.files, v = 0; v < _.length; v++) {
              var C = _[v], A = C.fileNameStr, D = i.resolve(C.fileNameStr);
              w.file(D, C.decompressed, { binary: !0, optimizedBinaryString: !0, date: C.date, dir: C.dir, comment: C.fileCommentStr.length ? C.fileCommentStr : null, unixPermissions: C.unixPermissions, dosPermissions: C.dosPermissions, createFolders: l.createFolders }), C.dir || (w.file(D).unsafeOriginalName = A);
            }
            return y.zipComment.length && (w.comment = y.zipComment), w;
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
          a.on("data", function(u, m) {
            f.push(u) || f._helper.pause(), d && d(m);
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
        function i(D, F, x) {
          var O, I = a.getTypeOf(F), U = a.extend(x || {}, f);
          U.date = U.date || /* @__PURE__ */ new Date(), U.compression !== null && (U.compression = U.compression.toUpperCase()), typeof U.unixPermissions == "string" && (U.unixPermissions = parseInt(U.unixPermissions, 8)), U.unixPermissions && 16384 & U.unixPermissions && (U.dir = !0), U.dosPermissions && 16 & U.dosPermissions && (U.dir = !0), U.dir && (D = _(D)), U.createFolders && (O = y(D)) && v.call(this, O, !0);
          var Y = I === "string" && U.binary === !1 && U.base64 === !1;
          x && x.binary !== void 0 || (U.binary = !Y), (F instanceof u && F.uncompressedSize === 0 || U.dir || !F || F.length === 0) && (U.base64 = !1, U.binary = !0, F = "", U.compression = "STORE", I = "string");
          var S = null;
          S = F instanceof u || F instanceof c ? F : w.isNode && w.isStream(F) ? new p(D, F) : a.prepareContent(D, F, U.binary, U.optimizedBinaryString, U.base64);
          var N = new m(D, S, U);
          this.files[D] = N;
        }
        var o = e("./utf8"), a = e("./utils"), c = e("./stream/GenericWorker"), d = e("./stream/StreamHelper"), f = e("./defaults"), u = e("./compressedObject"), m = e("./zipObject"), l = e("./generate"), w = e("./nodejsUtils"), p = e("./nodejs/NodejsStreamInputAdapter"), y = function(D) {
          D.slice(-1) === "/" && (D = D.substring(0, D.length - 1));
          var F = D.lastIndexOf("/");
          return 0 < F ? D.substring(0, F) : "";
        }, _ = function(D) {
          return D.slice(-1) !== "/" && (D += "/"), D;
        }, v = function(D, F) {
          return F = F !== void 0 ? F : f.createFolders, D = _(D), this.files[D] || i.call(this, D, null, { dir: !0, createFolders: F }), this.files[D];
        };
        function C(D) {
          return Object.prototype.toString.call(D) === "[object RegExp]";
        }
        var A = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(D) {
          var F, x, O;
          for (F in this.files) O = this.files[F], (x = F.slice(this.root.length, F.length)) && F.slice(0, this.root.length) === this.root && D(x, O);
        }, filter: function(D) {
          var F = [];
          return this.forEach(function(x, O) {
            D(x, O) && F.push(O);
          }), F;
        }, file: function(D, F, x) {
          if (arguments.length !== 1) return D = this.root + D, i.call(this, D, F, x), this;
          if (C(D)) {
            var O = D;
            return this.filter(function(U, Y) {
              return !Y.dir && O.test(U);
            });
          }
          var I = this.files[this.root + D];
          return I && !I.dir ? I : null;
        }, folder: function(D) {
          if (!D) return this;
          if (C(D)) return this.filter(function(I, U) {
            return U.dir && D.test(I);
          });
          var F = this.root + D, x = v.call(this, F), O = this.clone();
          return O.root = x.name, O;
        }, remove: function(D) {
          D = this.root + D;
          var F = this.files[D];
          if (F || (D.slice(-1) !== "/" && (D += "/"), F = this.files[D]), F && !F.dir) delete this.files[D];
          else for (var x = this.filter(function(I, U) {
            return U.name.slice(0, D.length) === D;
          }), O = 0; O < x.length; O++) delete this.files[x[O].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(D) {
          var F, x = {};
          try {
            if ((x = a.extend(D || {}, { streamFiles: !1, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: o.utf8encode })).type = x.type.toLowerCase(), x.compression = x.compression.toUpperCase(), x.type === "binarystring" && (x.type = "string"), !x.type) throw new Error("No output type specified.");
            a.checkSupport(x.type), x.platform !== "darwin" && x.platform !== "freebsd" && x.platform !== "linux" && x.platform !== "sunos" || (x.platform = "UNIX"), x.platform === "win32" && (x.platform = "DOS");
            var O = x.comment || this.comment || "";
            F = l.generateWorker(this, x, O);
          } catch (I) {
            (F = new c("error")).error(I);
          }
          return new d(F, x.type || "string", x.mimeType);
        }, generateAsync: function(D, F) {
          return this.generateInternalStream(D).accumulate(F);
        }, generateNodeStream: function(D, F) {
          return (D = D || {}).type || (D.type = "nodebuffer"), this.generateInternalStream(D).toNodejsStream(F);
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
          for (var c = a.charCodeAt(0), d = a.charCodeAt(1), f = a.charCodeAt(2), u = a.charCodeAt(3), m = this.length - 4; 0 <= m; --m) if (this.data[m] === c && this.data[m + 1] === d && this.data[m + 2] === f && this.data[m + 3] === u) return m - this.zero;
          return -1;
        }, o.prototype.readAndCheckSignature = function(a) {
          var c = a.charCodeAt(0), d = a.charCodeAt(1), f = a.charCodeAt(2), u = a.charCodeAt(3), m = this.readData(4);
          return c === m[0] && d === m[1] && f === m[2] && u === m[3];
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
          var m = i.getTypeOf(u);
          return i.checkSupport(m), m !== "string" || o.uint8array ? m === "nodebuffer" ? new d(u) : o.uint8array ? new f(i.transformTo("uint8array", u)) : new a(i.transformTo("array", u)) : new c(u);
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
        function m(w, p) {
          return new f.Promise(function(y, _) {
            var v = [], C = w._internalType, A = w._outputType, D = w._mimeType;
            w.on("data", function(F, x) {
              v.push(F), p && p(x);
            }).on("error", function(F) {
              v = [], _(F);
            }).on("end", function() {
              try {
                var F = (function(x, O, I) {
                  switch (x) {
                    case "blob":
                      return i.newBlob(i.transformTo("arraybuffer", O), I);
                    case "base64":
                      return c.encode(O);
                    default:
                      return i.transformTo(x, O);
                  }
                })(A, (function(x, O) {
                  var I, U = 0, Y = null, S = 0;
                  for (I = 0; I < O.length; I++) S += O[I].length;
                  switch (x) {
                    case "string":
                      return O.join("");
                    case "array":
                      return Array.prototype.concat.apply([], O);
                    case "uint8array":
                      for (Y = new Uint8Array(S), I = 0; I < O.length; I++) Y.set(O[I], U), U += O[I].length;
                      return Y;
                    case "nodebuffer":
                      return Buffer.concat(O);
                    default:
                      throw new Error("concat : unsupported type '" + x + "'");
                  }
                })(C, v), D);
                y(F);
              } catch (x) {
                _(x);
              }
              v = [];
            }).resume();
          });
        }
        function l(w, p, y) {
          var _ = p;
          switch (p) {
            case "blob":
            case "arraybuffer":
              _ = "uint8array";
              break;
            case "base64":
              _ = "string";
          }
          try {
            this._internalType = _, this._outputType = p, this._mimeType = y, i.checkSupport(_), this._worker = w.pipe(new o(_)), w.lock();
          } catch (v) {
            this._worker = new a("error"), this._worker.error(v);
          }
        }
        l.prototype = { accumulate: function(w) {
          return m(this, w);
        }, on: function(w, p) {
          var y = this;
          return w === "data" ? this._worker.on(w, function(_) {
            p.call(y, _.data, _.meta);
          }) : this._worker.on(w, function() {
            i.delay(p, arguments, y);
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
        function m() {
          c.call(this, "utf-8 encode");
        }
        s.utf8encode = function(l) {
          return o.nodebuffer ? a.newBufferFrom(l, "utf-8") : (function(w) {
            var p, y, _, v, C, A = w.length, D = 0;
            for (v = 0; v < A; v++) (64512 & (y = w.charCodeAt(v))) == 55296 && v + 1 < A && (64512 & (_ = w.charCodeAt(v + 1))) == 56320 && (y = 65536 + (y - 55296 << 10) + (_ - 56320), v++), D += y < 128 ? 1 : y < 2048 ? 2 : y < 65536 ? 3 : 4;
            for (p = o.uint8array ? new Uint8Array(D) : new Array(D), v = C = 0; C < D; v++) (64512 & (y = w.charCodeAt(v))) == 55296 && v + 1 < A && (64512 & (_ = w.charCodeAt(v + 1))) == 56320 && (y = 65536 + (y - 55296 << 10) + (_ - 56320), v++), y < 128 ? p[C++] = y : (y < 2048 ? p[C++] = 192 | y >>> 6 : (y < 65536 ? p[C++] = 224 | y >>> 12 : (p[C++] = 240 | y >>> 18, p[C++] = 128 | y >>> 12 & 63), p[C++] = 128 | y >>> 6 & 63), p[C++] = 128 | 63 & y);
            return p;
          })(l);
        }, s.utf8decode = function(l) {
          return o.nodebuffer ? i.transformTo("nodebuffer", l).toString("utf-8") : (function(w) {
            var p, y, _, v, C = w.length, A = new Array(2 * C);
            for (p = y = 0; p < C; ) if ((_ = w[p++]) < 128) A[y++] = _;
            else if (4 < (v = d[_])) A[y++] = 65533, p += v - 1;
            else {
              for (_ &= v === 2 ? 31 : v === 3 ? 15 : 7; 1 < v && p < C; ) _ = _ << 6 | 63 & w[p++], v--;
              1 < v ? A[y++] = 65533 : _ < 65536 ? A[y++] = _ : (_ -= 65536, A[y++] = 55296 | _ >> 10 & 1023, A[y++] = 56320 | 1023 & _);
            }
            return A.length !== y && (A.subarray ? A = A.subarray(0, y) : A.length = y), i.applyFromCharCode(A);
          })(l = i.transformTo(o.uint8array ? "uint8array" : "array", l));
        }, i.inherits(u, c), u.prototype.processChunk = function(l) {
          var w = i.transformTo(o.uint8array ? "uint8array" : "array", l.data);
          if (this.leftOver && this.leftOver.length) {
            if (o.uint8array) {
              var p = w;
              (w = new Uint8Array(p.length + this.leftOver.length)).set(this.leftOver, 0), w.set(p, this.leftOver.length);
            } else w = this.leftOver.concat(w);
            this.leftOver = null;
          }
          var y = (function(v, C) {
            var A;
            for ((C = C || v.length) > v.length && (C = v.length), A = C - 1; 0 <= A && (192 & v[A]) == 128; ) A--;
            return A < 0 || A === 0 ? C : A + d[v[A]] > C ? A : C;
          })(w), _ = w;
          y !== w.length && (o.uint8array ? (_ = w.subarray(0, y), this.leftOver = w.subarray(y, w.length)) : (_ = w.slice(0, y), this.leftOver = w.slice(y, w.length))), this.push({ data: s.utf8decode(_), meta: l.meta });
        }, u.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, s.Utf8DecodeWorker = u, i.inherits(m, c), m.prototype.processChunk = function(l) {
          this.push({ data: s.utf8encode(l.data), meta: l.meta });
        }, s.Utf8EncodeWorker = m;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, r, s) {
        var i = e("./support"), o = e("./base64"), a = e("./nodejsUtils"), c = e("./external");
        function d(p) {
          return p;
        }
        function f(p, y) {
          for (var _ = 0; _ < p.length; ++_) y[_] = 255 & p.charCodeAt(_);
          return y;
        }
        e("setimmediate"), s.newBlob = function(p, y) {
          s.checkSupport("blob");
          try {
            return new Blob([p], { type: y });
          } catch {
            try {
              var _ = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return _.append(p), _.getBlob(y);
            } catch {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var u = { stringifyByChunk: function(p, y, _) {
          var v = [], C = 0, A = p.length;
          if (A <= _) return String.fromCharCode.apply(null, p);
          for (; C < A; ) y === "array" || y === "nodebuffer" ? v.push(String.fromCharCode.apply(null, p.slice(C, Math.min(C + _, A)))) : v.push(String.fromCharCode.apply(null, p.subarray(C, Math.min(C + _, A)))), C += _;
          return v.join("");
        }, stringifyByChar: function(p) {
          for (var y = "", _ = 0; _ < p.length; _++) y += String.fromCharCode(p[_]);
          return y;
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
        function m(p) {
          var y = 65536, _ = s.getTypeOf(p), v = !0;
          if (_ === "uint8array" ? v = u.applyCanBeUsed.uint8array : _ === "nodebuffer" && (v = u.applyCanBeUsed.nodebuffer), v) for (; 1 < y; ) try {
            return u.stringifyByChunk(p, _, y);
          } catch {
            y = Math.floor(y / 2);
          }
          return u.stringifyByChar(p);
        }
        function l(p, y) {
          for (var _ = 0; _ < p.length; _++) y[_] = p[_];
          return y;
        }
        s.applyFromCharCode = m;
        var w = {};
        w.string = { string: d, array: function(p) {
          return f(p, new Array(p.length));
        }, arraybuffer: function(p) {
          return w.string.uint8array(p).buffer;
        }, uint8array: function(p) {
          return f(p, new Uint8Array(p.length));
        }, nodebuffer: function(p) {
          return f(p, a.allocBuffer(p.length));
        } }, w.array = { string: m, array: d, arraybuffer: function(p) {
          return new Uint8Array(p).buffer;
        }, uint8array: function(p) {
          return new Uint8Array(p);
        }, nodebuffer: function(p) {
          return a.newBufferFrom(p);
        } }, w.arraybuffer = { string: function(p) {
          return m(new Uint8Array(p));
        }, array: function(p) {
          return l(new Uint8Array(p), new Array(p.byteLength));
        }, arraybuffer: d, uint8array: function(p) {
          return new Uint8Array(p);
        }, nodebuffer: function(p) {
          return a.newBufferFrom(new Uint8Array(p));
        } }, w.uint8array = { string: m, array: function(p) {
          return l(p, new Array(p.length));
        }, arraybuffer: function(p) {
          return p.buffer;
        }, uint8array: d, nodebuffer: function(p) {
          return a.newBufferFrom(p);
        } }, w.nodebuffer = { string: m, array: function(p) {
          return l(p, new Array(p.length));
        }, arraybuffer: function(p) {
          return w.nodebuffer.uint8array(p).buffer;
        }, uint8array: function(p) {
          return l(p, new Uint8Array(p.length));
        }, nodebuffer: d }, s.transformTo = function(p, y) {
          if (y = y || "", !p) return y;
          s.checkSupport(p);
          var _ = s.getTypeOf(y);
          return w[_][p](y);
        }, s.resolve = function(p) {
          for (var y = p.split("/"), _ = [], v = 0; v < y.length; v++) {
            var C = y[v];
            C === "." || C === "" && v !== 0 && v !== y.length - 1 || (C === ".." ? _.pop() : _.push(C));
          }
          return _.join("/");
        }, s.getTypeOf = function(p) {
          return typeof p == "string" ? "string" : Object.prototype.toString.call(p) === "[object Array]" ? "array" : i.nodebuffer && a.isBuffer(p) ? "nodebuffer" : i.uint8array && p instanceof Uint8Array ? "uint8array" : i.arraybuffer && p instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, s.checkSupport = function(p) {
          if (!i[p.toLowerCase()]) throw new Error(p + " is not supported by this platform");
        }, s.MAX_VALUE_16BITS = 65535, s.MAX_VALUE_32BITS = -1, s.pretty = function(p) {
          var y, _, v = "";
          for (_ = 0; _ < (p || "").length; _++) v += "\\x" + ((y = p.charCodeAt(_)) < 16 ? "0" : "") + y.toString(16).toUpperCase();
          return v;
        }, s.delay = function(p, y, _) {
          setImmediate(function() {
            p.apply(_ || null, y || []);
          });
        }, s.inherits = function(p, y) {
          function _() {
          }
          _.prototype = y.prototype, p.prototype = new _();
        }, s.extend = function() {
          var p, y, _ = {};
          for (p = 0; p < arguments.length; p++) for (y in arguments[p]) Object.prototype.hasOwnProperty.call(arguments[p], y) && _[y] === void 0 && (_[y] = arguments[p][y]);
          return _;
        }, s.prepareContent = function(p, y, _, v, C) {
          return c.Promise.resolve(y).then(function(A) {
            return i.blob && (A instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(A)) !== -1) && typeof FileReader < "u" ? new c.Promise(function(D, F) {
              var x = new FileReader();
              x.onload = function(O) {
                D(O.target.result);
              }, x.onerror = function(O) {
                F(O.target.error);
              }, x.readAsArrayBuffer(A);
            }) : A;
          }).then(function(A) {
            var D = s.getTypeOf(A);
            return D ? (D === "arraybuffer" ? A = s.transformTo("uint8array", A) : D === "string" && (C ? A = o.decode(A) : _ && v !== !0 && (A = (function(F) {
              return f(F, i.uint8array ? new Uint8Array(F.length) : new Array(F.length));
            })(A))), A) : c.Promise.reject(new Error("Can't read the data of '" + p + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
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
            var m = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature (" + o.pretty(m) + ", expected " + o.pretty(u) + ")");
          }
        }, isSignature: function(u, m) {
          var l = this.reader.index;
          this.reader.setIndex(u);
          var w = this.reader.readString(4) === m;
          return this.reader.setIndex(l), w;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var u = this.reader.readData(this.zipCommentLength), m = d.uint8array ? "uint8array" : "array", l = o.transformTo(m, u);
          this.zipComment = this.loadOptions.decodeFileName(l);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var u, m, l, w = this.zip64EndOfCentralSize - 44; 0 < w; ) u = this.reader.readInt(2), m = this.reader.readInt(4), l = this.reader.readData(m), this.zip64ExtensibleData[u] = { id: u, length: m, value: l };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var u, m;
          for (u = 0; u < this.files.length; u++) m = this.files[u], this.reader.setIndex(m.localHeaderOffset), this.checkSignature(a.LOCAL_FILE_HEADER), m.readLocalPart(this.reader), m.handleUTF8(), m.processAttributes();
        }, readCentralDir: function() {
          var u;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER); ) (u = new c({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(u);
          if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
        }, readEndOfCentral: function() {
          var u = this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);
          if (u < 0) throw this.isSignature(0, a.LOCAL_FILE_HEADER) ? new Error("Corrupted zip: can't find end of central directory") : new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
          this.reader.setIndex(u);
          var m = u;
          if (this.checkSignature(a.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === o.MAX_VALUE_16BITS || this.diskWithCentralDirStart === o.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === o.MAX_VALUE_16BITS || this.centralDirRecords === o.MAX_VALUE_16BITS || this.centralDirSize === o.MAX_VALUE_32BITS || this.centralDirOffset === o.MAX_VALUE_32BITS) {
            if (this.zip64 = !0, (u = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            if (this.reader.setIndex(u), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, a.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
          }
          var l = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (l += 20, l += 12 + this.zip64EndOfCentralSize);
          var w = m - l;
          if (0 < w) this.isSignature(m, a.CENTRAL_FILE_HEADER) || (this.reader.zero = w);
          else if (w < 0) throw new Error("Corrupted zip: missing " + Math.abs(w) + " bytes.");
        }, prepareReader: function(u) {
          this.reader = i(u);
        }, load: function(u) {
          this.prepareReader(u), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, r.exports = f;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./compressedObject"), c = e("./crc32"), d = e("./utf8"), f = e("./compressions"), u = e("./support");
        function m(l, w) {
          this.options = l, this.loadOptions = w;
        }
        m.prototype = { isEncrypted: function() {
          return (1 & this.bitFlag) == 1;
        }, useUTF8: function() {
          return (2048 & this.bitFlag) == 2048;
        }, readLocalPart: function(l) {
          var w, p;
          if (l.skip(22), this.fileNameLength = l.readInt(2), p = l.readInt(2), this.fileName = l.readData(this.fileNameLength), l.skip(p), this.compressedSize === -1 || this.uncompressedSize === -1) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if ((w = (function(y) {
            for (var _ in f) if (Object.prototype.hasOwnProperty.call(f, _) && f[_].magic === y) return f[_];
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
          var w, p, y, _ = l.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); l.index + 4 < _; ) w = l.readInt(2), p = l.readInt(2), y = l.readData(p), this.extraFields[w] = { id: w, length: p, value: y };
          l.setIndex(_);
        }, handleUTF8: function() {
          var l = u.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = d.utf8decode(this.fileName), this.fileCommentStr = d.utf8decode(this.fileComment);
          else {
            var w = this.findExtraFieldUnicodePath();
            if (w !== null) this.fileNameStr = w;
            else {
              var p = o.transformTo(l, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(p);
            }
            var y = this.findExtraFieldUnicodeComment();
            if (y !== null) this.fileCommentStr = y;
            else {
              var _ = o.transformTo(l, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(_);
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
        } }, r.exports = m;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, r, s) {
        function i(w, p, y) {
          this.name = w, this.dir = y.dir, this.date = y.date, this.comment = y.comment, this.unixPermissions = y.unixPermissions, this.dosPermissions = y.dosPermissions, this._data = p, this._dataBinary = y.binary, this.options = { compression: y.compression, compressionOptions: y.compressionOptions };
        }
        var o = e("./stream/StreamHelper"), a = e("./stream/DataWorker"), c = e("./utf8"), d = e("./compressedObject"), f = e("./stream/GenericWorker");
        i.prototype = { internalStream: function(w) {
          var p = null, y = "string";
          try {
            if (!w) throw new Error("No output type specified.");
            var _ = (y = w.toLowerCase()) === "string" || y === "text";
            y !== "binarystring" && y !== "text" || (y = "string"), p = this._decompressWorker();
            var v = !this._dataBinary;
            v && !_ && (p = p.pipe(new c.Utf8EncodeWorker())), !v && _ && (p = p.pipe(new c.Utf8DecodeWorker()));
          } catch (C) {
            (p = new f("error")).error(C);
          }
          return new o(p, y, "");
        }, async: function(w, p) {
          return this.internalStream(w).accumulate(p);
        }, nodeStream: function(w, p) {
          return this.internalStream(w || "nodebuffer").toNodejsStream(p);
        }, _compressWorker: function(w, p) {
          if (this._data instanceof d && this._data.compression.magic === w.magic) return this._data.getCompressedWorker();
          var y = this._decompressWorker();
          return this._dataBinary || (y = y.pipe(new c.Utf8EncodeWorker())), d.createWorkerFrom(y, w, p);
        }, _decompressWorker: function() {
          return this._data instanceof d ? this._data.getContentWorker() : this._data instanceof f ? this._data : new a(this._data);
        } };
        for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], m = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, l = 0; l < u.length; l++) i.prototype[u[l]] = m;
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
            var p = i.document.createElement("script");
            p.onreadystatechange = function() {
              w(), p.onreadystatechange = null, p.parentNode.removeChild(p), p = null;
            }, i.document.documentElement.appendChild(p);
          } : function() {
            setTimeout(w, 0);
          };
          else {
            var m = new i.MessageChannel();
            m.port1.onmessage = w, o = function() {
              m.port2.postMessage(0);
            };
          }
          var l = [];
          function w() {
            var p, y;
            a = !0;
            for (var _ = l.length; _; ) {
              for (y = l, l = [], p = -1; ++p < _; ) y[p]();
              _ = l.length;
            }
            a = !1;
          }
          r.exports = function(p) {
            l.push(p) !== 1 || a || o();
          };
        }).call(this, typeof un < "u" ? un : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}], 37: [function(e, r, s) {
        var i = e("immediate");
        function o() {
        }
        var a = {}, c = ["REJECTED"], d = ["FULFILLED"], f = ["PENDING"];
        function u(_) {
          if (typeof _ != "function") throw new TypeError("resolver must be a function");
          this.state = f, this.queue = [], this.outcome = void 0, _ !== o && p(this, _);
        }
        function m(_, v, C) {
          this.promise = _, typeof v == "function" && (this.onFulfilled = v, this.callFulfilled = this.otherCallFulfilled), typeof C == "function" && (this.onRejected = C, this.callRejected = this.otherCallRejected);
        }
        function l(_, v, C) {
          i(function() {
            var A;
            try {
              A = v(C);
            } catch (D) {
              return a.reject(_, D);
            }
            A === _ ? a.reject(_, new TypeError("Cannot resolve promise with itself")) : a.resolve(_, A);
          });
        }
        function w(_) {
          var v = _ && _.then;
          if (_ && (typeof _ == "object" || typeof _ == "function") && typeof v == "function") return function() {
            v.apply(_, arguments);
          };
        }
        function p(_, v) {
          var C = !1;
          function A(x) {
            C || (C = !0, a.reject(_, x));
          }
          function D(x) {
            C || (C = !0, a.resolve(_, x));
          }
          var F = y(function() {
            v(D, A);
          });
          F.status === "error" && A(F.value);
        }
        function y(_, v) {
          var C = {};
          try {
            C.value = _(v), C.status = "success";
          } catch (A) {
            C.status = "error", C.value = A;
          }
          return C;
        }
        (r.exports = u).prototype.finally = function(_) {
          if (typeof _ != "function") return this;
          var v = this.constructor;
          return this.then(function(C) {
            return v.resolve(_()).then(function() {
              return C;
            });
          }, function(C) {
            return v.resolve(_()).then(function() {
              throw C;
            });
          });
        }, u.prototype.catch = function(_) {
          return this.then(null, _);
        }, u.prototype.then = function(_, v) {
          if (typeof _ != "function" && this.state === d || typeof v != "function" && this.state === c) return this;
          var C = new this.constructor(o);
          return this.state !== f ? l(C, this.state === d ? _ : v, this.outcome) : this.queue.push(new m(C, _, v)), C;
        }, m.prototype.callFulfilled = function(_) {
          a.resolve(this.promise, _);
        }, m.prototype.otherCallFulfilled = function(_) {
          l(this.promise, this.onFulfilled, _);
        }, m.prototype.callRejected = function(_) {
          a.reject(this.promise, _);
        }, m.prototype.otherCallRejected = function(_) {
          l(this.promise, this.onRejected, _);
        }, a.resolve = function(_, v) {
          var C = y(w, v);
          if (C.status === "error") return a.reject(_, C.value);
          var A = C.value;
          if (A) p(_, A);
          else {
            _.state = d, _.outcome = v;
            for (var D = -1, F = _.queue.length; ++D < F; ) _.queue[D].callFulfilled(v);
          }
          return _;
        }, a.reject = function(_, v) {
          _.state = c, _.outcome = v;
          for (var C = -1, A = _.queue.length; ++C < A; ) _.queue[C].callRejected(v);
          return _;
        }, u.resolve = function(_) {
          return _ instanceof this ? _ : a.resolve(new this(o), _);
        }, u.reject = function(_) {
          var v = new this(o);
          return a.reject(v, _);
        }, u.all = function(_) {
          var v = this;
          if (Object.prototype.toString.call(_) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var C = _.length, A = !1;
          if (!C) return this.resolve([]);
          for (var D = new Array(C), F = 0, x = -1, O = new this(o); ++x < C; ) I(_[x], x);
          return O;
          function I(U, Y) {
            v.resolve(U).then(function(S) {
              D[Y] = S, ++F !== C || A || (A = !0, a.resolve(O, D));
            }, function(S) {
              A || (A = !0, a.reject(O, S));
            });
          }
        }, u.race = function(_) {
          var v = this;
          if (Object.prototype.toString.call(_) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var C = _.length, A = !1;
          if (!C) return this.resolve([]);
          for (var D = -1, F = new this(o); ++D < C; ) x = _[D], v.resolve(x).then(function(O) {
            A || (A = !0, a.resolve(F, O));
          }, function(O) {
            A || (A = !0, a.reject(F, O));
          });
          var x;
          return F;
        };
      }, { immediate: 36 }], 38: [function(e, r, s) {
        var i = {};
        (0, e("./lib/utils/common").assign)(i, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), r.exports = i;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, r, s) {
        var i = e("./zlib/deflate"), o = e("./utils/common"), a = e("./utils/strings"), c = e("./zlib/messages"), d = e("./zlib/zstream"), f = Object.prototype.toString, u = 0, m = -1, l = 0, w = 8;
        function p(_) {
          if (!(this instanceof p)) return new p(_);
          this.options = o.assign({ level: m, method: w, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: l, to: "" }, _ || {});
          var v = this.options;
          v.raw && 0 < v.windowBits ? v.windowBits = -v.windowBits : v.gzip && 0 < v.windowBits && v.windowBits < 16 && (v.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new d(), this.strm.avail_out = 0;
          var C = i.deflateInit2(this.strm, v.level, v.method, v.windowBits, v.memLevel, v.strategy);
          if (C !== u) throw new Error(c[C]);
          if (v.header && i.deflateSetHeader(this.strm, v.header), v.dictionary) {
            var A;
            if (A = typeof v.dictionary == "string" ? a.string2buf(v.dictionary) : f.call(v.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(v.dictionary) : v.dictionary, (C = i.deflateSetDictionary(this.strm, A)) !== u) throw new Error(c[C]);
            this._dict_set = !0;
          }
        }
        function y(_, v) {
          var C = new p(v);
          if (C.push(_, !0), C.err) throw C.msg || c[C.err];
          return C.result;
        }
        p.prototype.push = function(_, v) {
          var C, A, D = this.strm, F = this.options.chunkSize;
          if (this.ended) return !1;
          A = v === ~~v ? v : v === !0 ? 4 : 0, typeof _ == "string" ? D.input = a.string2buf(_) : f.call(_) === "[object ArrayBuffer]" ? D.input = new Uint8Array(_) : D.input = _, D.next_in = 0, D.avail_in = D.input.length;
          do {
            if (D.avail_out === 0 && (D.output = new o.Buf8(F), D.next_out = 0, D.avail_out = F), (C = i.deflate(D, A)) !== 1 && C !== u) return this.onEnd(C), !(this.ended = !0);
            D.avail_out !== 0 && (D.avail_in !== 0 || A !== 4 && A !== 2) || (this.options.to === "string" ? this.onData(a.buf2binstring(o.shrinkBuf(D.output, D.next_out))) : this.onData(o.shrinkBuf(D.output, D.next_out)));
          } while ((0 < D.avail_in || D.avail_out === 0) && C !== 1);
          return A === 4 ? (C = i.deflateEnd(this.strm), this.onEnd(C), this.ended = !0, C === u) : A !== 2 || (this.onEnd(u), !(D.avail_out = 0));
        }, p.prototype.onData = function(_) {
          this.chunks.push(_);
        }, p.prototype.onEnd = function(_) {
          _ === u && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = _, this.msg = this.strm.msg;
        }, s.Deflate = p, s.deflate = y, s.deflateRaw = function(_, v) {
          return (v = v || {}).raw = !0, y(_, v);
        }, s.gzip = function(_, v) {
          return (v = v || {}).gzip = !0, y(_, v);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, r, s) {
        var i = e("./zlib/inflate"), o = e("./utils/common"), a = e("./utils/strings"), c = e("./zlib/constants"), d = e("./zlib/messages"), f = e("./zlib/zstream"), u = e("./zlib/gzheader"), m = Object.prototype.toString;
        function l(p) {
          if (!(this instanceof l)) return new l(p);
          this.options = o.assign({ chunkSize: 16384, windowBits: 0, to: "" }, p || {});
          var y = this.options;
          y.raw && 0 <= y.windowBits && y.windowBits < 16 && (y.windowBits = -y.windowBits, y.windowBits === 0 && (y.windowBits = -15)), !(0 <= y.windowBits && y.windowBits < 16) || p && p.windowBits || (y.windowBits += 32), 15 < y.windowBits && y.windowBits < 48 && (15 & y.windowBits) == 0 && (y.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new f(), this.strm.avail_out = 0;
          var _ = i.inflateInit2(this.strm, y.windowBits);
          if (_ !== c.Z_OK) throw new Error(d[_]);
          this.header = new u(), i.inflateGetHeader(this.strm, this.header);
        }
        function w(p, y) {
          var _ = new l(y);
          if (_.push(p, !0), _.err) throw _.msg || d[_.err];
          return _.result;
        }
        l.prototype.push = function(p, y) {
          var _, v, C, A, D, F, x = this.strm, O = this.options.chunkSize, I = this.options.dictionary, U = !1;
          if (this.ended) return !1;
          v = y === ~~y ? y : y === !0 ? c.Z_FINISH : c.Z_NO_FLUSH, typeof p == "string" ? x.input = a.binstring2buf(p) : m.call(p) === "[object ArrayBuffer]" ? x.input = new Uint8Array(p) : x.input = p, x.next_in = 0, x.avail_in = x.input.length;
          do {
            if (x.avail_out === 0 && (x.output = new o.Buf8(O), x.next_out = 0, x.avail_out = O), (_ = i.inflate(x, c.Z_NO_FLUSH)) === c.Z_NEED_DICT && I && (F = typeof I == "string" ? a.string2buf(I) : m.call(I) === "[object ArrayBuffer]" ? new Uint8Array(I) : I, _ = i.inflateSetDictionary(this.strm, F)), _ === c.Z_BUF_ERROR && U === !0 && (_ = c.Z_OK, U = !1), _ !== c.Z_STREAM_END && _ !== c.Z_OK) return this.onEnd(_), !(this.ended = !0);
            x.next_out && (x.avail_out !== 0 && _ !== c.Z_STREAM_END && (x.avail_in !== 0 || v !== c.Z_FINISH && v !== c.Z_SYNC_FLUSH) || (this.options.to === "string" ? (C = a.utf8border(x.output, x.next_out), A = x.next_out - C, D = a.buf2string(x.output, C), x.next_out = A, x.avail_out = O - A, A && o.arraySet(x.output, x.output, C, A, 0), this.onData(D)) : this.onData(o.shrinkBuf(x.output, x.next_out)))), x.avail_in === 0 && x.avail_out === 0 && (U = !0);
          } while ((0 < x.avail_in || x.avail_out === 0) && _ !== c.Z_STREAM_END);
          return _ === c.Z_STREAM_END && (v = c.Z_FINISH), v === c.Z_FINISH ? (_ = i.inflateEnd(this.strm), this.onEnd(_), this.ended = !0, _ === c.Z_OK) : v !== c.Z_SYNC_FLUSH || (this.onEnd(c.Z_OK), !(x.avail_out = 0));
        }, l.prototype.onData = function(p) {
          this.chunks.push(p);
        }, l.prototype.onEnd = function(p) {
          p === c.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = p, this.msg = this.strm.msg;
        }, s.Inflate = l, s.inflate = w, s.inflateRaw = function(p, y) {
          return (y = y || {}).raw = !0, w(p, y);
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
        var o = { arraySet: function(c, d, f, u, m) {
          if (d.subarray && c.subarray) c.set(d.subarray(f, f + u), m);
          else for (var l = 0; l < u; l++) c[m + l] = d[f + l];
        }, flattenChunks: function(c) {
          var d, f, u, m, l, w;
          for (d = u = 0, f = c.length; d < f; d++) u += c[d].length;
          for (w = new Uint8Array(u), d = m = 0, f = c.length; d < f; d++) l = c[d], w.set(l, m), m += l.length;
          return w;
        } }, a = { arraySet: function(c, d, f, u, m) {
          for (var l = 0; l < u; l++) c[m + l] = d[f + l];
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
        function f(u, m) {
          if (m < 65537 && (u.subarray && a || !u.subarray && o)) return String.fromCharCode.apply(null, i.shrinkBuf(u, m));
          for (var l = "", w = 0; w < m; w++) l += String.fromCharCode(u[w]);
          return l;
        }
        c[254] = c[254] = 1, s.string2buf = function(u) {
          var m, l, w, p, y, _ = u.length, v = 0;
          for (p = 0; p < _; p++) (64512 & (l = u.charCodeAt(p))) == 55296 && p + 1 < _ && (64512 & (w = u.charCodeAt(p + 1))) == 56320 && (l = 65536 + (l - 55296 << 10) + (w - 56320), p++), v += l < 128 ? 1 : l < 2048 ? 2 : l < 65536 ? 3 : 4;
          for (m = new i.Buf8(v), p = y = 0; y < v; p++) (64512 & (l = u.charCodeAt(p))) == 55296 && p + 1 < _ && (64512 & (w = u.charCodeAt(p + 1))) == 56320 && (l = 65536 + (l - 55296 << 10) + (w - 56320), p++), l < 128 ? m[y++] = l : (l < 2048 ? m[y++] = 192 | l >>> 6 : (l < 65536 ? m[y++] = 224 | l >>> 12 : (m[y++] = 240 | l >>> 18, m[y++] = 128 | l >>> 12 & 63), m[y++] = 128 | l >>> 6 & 63), m[y++] = 128 | 63 & l);
          return m;
        }, s.buf2binstring = function(u) {
          return f(u, u.length);
        }, s.binstring2buf = function(u) {
          for (var m = new i.Buf8(u.length), l = 0, w = m.length; l < w; l++) m[l] = u.charCodeAt(l);
          return m;
        }, s.buf2string = function(u, m) {
          var l, w, p, y, _ = m || u.length, v = new Array(2 * _);
          for (l = w = 0; l < _; ) if ((p = u[l++]) < 128) v[w++] = p;
          else if (4 < (y = c[p])) v[w++] = 65533, l += y - 1;
          else {
            for (p &= y === 2 ? 31 : y === 3 ? 15 : 7; 1 < y && l < _; ) p = p << 6 | 63 & u[l++], y--;
            1 < y ? v[w++] = 65533 : p < 65536 ? v[w++] = p : (p -= 65536, v[w++] = 55296 | p >> 10 & 1023, v[w++] = 56320 | 1023 & p);
          }
          return f(v, w);
        }, s.utf8border = function(u, m) {
          var l;
          for ((m = m || u.length) > u.length && (m = u.length), l = m - 1; 0 <= l && (192 & u[l]) == 128; ) l--;
          return l < 0 || l === 0 ? m : l + c[u[l]] > m ? l : m;
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
          for (var m = d; m < u; m++) o = o >>> 8 ^ f[255 & (o ^ a[m])];
          return -1 ^ o;
        };
      }, {}], 46: [function(e, r, s) {
        var i, o = e("../utils/common"), a = e("./trees"), c = e("./adler32"), d = e("./crc32"), f = e("./messages"), u = 0, m = 4, l = 0, w = -2, p = -1, y = 4, _ = 2, v = 8, C = 9, A = 286, D = 30, F = 19, x = 2 * A + 1, O = 15, I = 3, U = 258, Y = U + I + 1, S = 42, N = 113, g = 1, B = 2, et = 3, $ = 4;
        function nt(h, M) {
          return h.msg = f[M], M;
        }
        function W(h) {
          return (h << 1) - (4 < h ? 9 : 0);
        }
        function Q(h) {
          for (var M = h.length; 0 <= --M; ) h[M] = 0;
        }
        function R(h) {
          var M = h.state, L = M.pending;
          L > h.avail_out && (L = h.avail_out), L !== 0 && (o.arraySet(h.output, M.pending_buf, M.pending_out, L, h.next_out), h.next_out += L, M.pending_out += L, h.total_out += L, h.avail_out -= L, M.pending -= L, M.pending === 0 && (M.pending_out = 0));
        }
        function z(h, M) {
          a._tr_flush_block(h, 0 <= h.block_start ? h.block_start : -1, h.strstart - h.block_start, M), h.block_start = h.strstart, R(h.strm);
        }
        function X(h, M) {
          h.pending_buf[h.pending++] = M;
        }
        function G(h, M) {
          h.pending_buf[h.pending++] = M >>> 8 & 255, h.pending_buf[h.pending++] = 255 & M;
        }
        function Z(h, M) {
          var L, k, b = h.max_chain_length, E = h.strstart, P = h.prev_length, j = h.nice_match, T = h.strstart > h.w_size - Y ? h.strstart - (h.w_size - Y) : 0, H = h.window, K = h.w_mask, V = h.prev, J = h.strstart + U, ct = H[E + P - 1], it = H[E + P];
          h.prev_length >= h.good_match && (b >>= 2), j > h.lookahead && (j = h.lookahead);
          do
            if (H[(L = M) + P] === it && H[L + P - 1] === ct && H[L] === H[E] && H[++L] === H[E + 1]) {
              E += 2, L++;
              do
                ;
              while (H[++E] === H[++L] && H[++E] === H[++L] && H[++E] === H[++L] && H[++E] === H[++L] && H[++E] === H[++L] && H[++E] === H[++L] && H[++E] === H[++L] && H[++E] === H[++L] && E < J);
              if (k = U - (J - E), E = J - U, P < k) {
                if (h.match_start = M, j <= (P = k)) break;
                ct = H[E + P - 1], it = H[E + P];
              }
            }
          while ((M = V[M & K]) > T && --b != 0);
          return P <= h.lookahead ? P : h.lookahead;
        }
        function ut(h) {
          var M, L, k, b, E, P, j, T, H, K, V = h.w_size;
          do {
            if (b = h.window_size - h.lookahead - h.strstart, h.strstart >= V + (V - Y)) {
              for (o.arraySet(h.window, h.window, V, V, 0), h.match_start -= V, h.strstart -= V, h.block_start -= V, M = L = h.hash_size; k = h.head[--M], h.head[M] = V <= k ? k - V : 0, --L; ) ;
              for (M = L = V; k = h.prev[--M], h.prev[M] = V <= k ? k - V : 0, --L; ) ;
              b += V;
            }
            if (h.strm.avail_in === 0) break;
            if (P = h.strm, j = h.window, T = h.strstart + h.lookahead, H = b, K = void 0, K = P.avail_in, H < K && (K = H), L = K === 0 ? 0 : (P.avail_in -= K, o.arraySet(j, P.input, P.next_in, K, T), P.state.wrap === 1 ? P.adler = c(P.adler, j, K, T) : P.state.wrap === 2 && (P.adler = d(P.adler, j, K, T)), P.next_in += K, P.total_in += K, K), h.lookahead += L, h.lookahead + h.insert >= I) for (E = h.strstart - h.insert, h.ins_h = h.window[E], h.ins_h = (h.ins_h << h.hash_shift ^ h.window[E + 1]) & h.hash_mask; h.insert && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[E + I - 1]) & h.hash_mask, h.prev[E & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = E, E++, h.insert--, !(h.lookahead + h.insert < I)); ) ;
          } while (h.lookahead < Y && h.strm.avail_in !== 0);
        }
        function vt(h, M) {
          for (var L, k; ; ) {
            if (h.lookahead < Y) {
              if (ut(h), h.lookahead < Y && M === u) return g;
              if (h.lookahead === 0) break;
            }
            if (L = 0, h.lookahead >= I && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, L = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart), L !== 0 && h.strstart - L <= h.w_size - Y && (h.match_length = Z(h, L)), h.match_length >= I) if (k = a._tr_tally(h, h.strstart - h.match_start, h.match_length - I), h.lookahead -= h.match_length, h.match_length <= h.max_lazy_match && h.lookahead >= I) {
              for (h.match_length--; h.strstart++, h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, L = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart, --h.match_length != 0; ) ;
              h.strstart++;
            } else h.strstart += h.match_length, h.match_length = 0, h.ins_h = h.window[h.strstart], h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + 1]) & h.hash_mask;
            else k = a._tr_tally(h, 0, h.window[h.strstart]), h.lookahead--, h.strstart++;
            if (k && (z(h, !1), h.strm.avail_out === 0)) return g;
          }
          return h.insert = h.strstart < I - 1 ? h.strstart : I - 1, M === m ? (z(h, !0), h.strm.avail_out === 0 ? et : $) : h.last_lit && (z(h, !1), h.strm.avail_out === 0) ? g : B;
        }
        function st(h, M) {
          for (var L, k, b; ; ) {
            if (h.lookahead < Y) {
              if (ut(h), h.lookahead < Y && M === u) return g;
              if (h.lookahead === 0) break;
            }
            if (L = 0, h.lookahead >= I && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, L = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart), h.prev_length = h.match_length, h.prev_match = h.match_start, h.match_length = I - 1, L !== 0 && h.prev_length < h.max_lazy_match && h.strstart - L <= h.w_size - Y && (h.match_length = Z(h, L), h.match_length <= 5 && (h.strategy === 1 || h.match_length === I && 4096 < h.strstart - h.match_start) && (h.match_length = I - 1)), h.prev_length >= I && h.match_length <= h.prev_length) {
              for (b = h.strstart + h.lookahead - I, k = a._tr_tally(h, h.strstart - 1 - h.prev_match, h.prev_length - I), h.lookahead -= h.prev_length - 1, h.prev_length -= 2; ++h.strstart <= b && (h.ins_h = (h.ins_h << h.hash_shift ^ h.window[h.strstart + I - 1]) & h.hash_mask, L = h.prev[h.strstart & h.w_mask] = h.head[h.ins_h], h.head[h.ins_h] = h.strstart), --h.prev_length != 0; ) ;
              if (h.match_available = 0, h.match_length = I - 1, h.strstart++, k && (z(h, !1), h.strm.avail_out === 0)) return g;
            } else if (h.match_available) {
              if ((k = a._tr_tally(h, 0, h.window[h.strstart - 1])) && z(h, !1), h.strstart++, h.lookahead--, h.strm.avail_out === 0) return g;
            } else h.match_available = 1, h.strstart++, h.lookahead--;
          }
          return h.match_available && (k = a._tr_tally(h, 0, h.window[h.strstart - 1]), h.match_available = 0), h.insert = h.strstart < I - 1 ? h.strstart : I - 1, M === m ? (z(h, !0), h.strm.avail_out === 0 ? et : $) : h.last_lit && (z(h, !1), h.strm.avail_out === 0) ? g : B;
        }
        function ot(h, M, L, k, b) {
          this.good_length = h, this.max_lazy = M, this.nice_length = L, this.max_chain = k, this.func = b;
        }
        function _t() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = v, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new o.Buf16(2 * x), this.dyn_dtree = new o.Buf16(2 * (2 * D + 1)), this.bl_tree = new o.Buf16(2 * (2 * F + 1)), Q(this.dyn_ltree), Q(this.dyn_dtree), Q(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new o.Buf16(O + 1), this.heap = new o.Buf16(2 * A + 1), Q(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new o.Buf16(2 * A + 1), Q(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function dt(h) {
          var M;
          return h && h.state ? (h.total_in = h.total_out = 0, h.data_type = _, (M = h.state).pending = 0, M.pending_out = 0, M.wrap < 0 && (M.wrap = -M.wrap), M.status = M.wrap ? S : N, h.adler = M.wrap === 2 ? 0 : 1, M.last_flush = u, a._tr_init(M), l) : nt(h, w);
        }
        function Bt(h) {
          var M = dt(h);
          return M === l && (function(L) {
            L.window_size = 2 * L.w_size, Q(L.head), L.max_lazy_match = i[L.level].max_lazy, L.good_match = i[L.level].good_length, L.nice_match = i[L.level].nice_length, L.max_chain_length = i[L.level].max_chain, L.strstart = 0, L.block_start = 0, L.lookahead = 0, L.insert = 0, L.match_length = L.prev_length = I - 1, L.match_available = 0, L.ins_h = 0;
          })(h.state), M;
        }
        function Lt(h, M, L, k, b, E) {
          if (!h) return w;
          var P = 1;
          if (M === p && (M = 6), k < 0 ? (P = 0, k = -k) : 15 < k && (P = 2, k -= 16), b < 1 || C < b || L !== v || k < 8 || 15 < k || M < 0 || 9 < M || E < 0 || y < E) return nt(h, w);
          k === 8 && (k = 9);
          var j = new _t();
          return (h.state = j).strm = h, j.wrap = P, j.gzhead = null, j.w_bits = k, j.w_size = 1 << j.w_bits, j.w_mask = j.w_size - 1, j.hash_bits = b + 7, j.hash_size = 1 << j.hash_bits, j.hash_mask = j.hash_size - 1, j.hash_shift = ~~((j.hash_bits + I - 1) / I), j.window = new o.Buf8(2 * j.w_size), j.head = new o.Buf16(j.hash_size), j.prev = new o.Buf16(j.w_size), j.lit_bufsize = 1 << b + 6, j.pending_buf_size = 4 * j.lit_bufsize, j.pending_buf = new o.Buf8(j.pending_buf_size), j.d_buf = 1 * j.lit_bufsize, j.l_buf = 3 * j.lit_bufsize, j.level = M, j.strategy = E, j.method = L, Bt(h);
        }
        i = [new ot(0, 0, 0, 0, function(h, M) {
          var L = 65535;
          for (L > h.pending_buf_size - 5 && (L = h.pending_buf_size - 5); ; ) {
            if (h.lookahead <= 1) {
              if (ut(h), h.lookahead === 0 && M === u) return g;
              if (h.lookahead === 0) break;
            }
            h.strstart += h.lookahead, h.lookahead = 0;
            var k = h.block_start + L;
            if ((h.strstart === 0 || h.strstart >= k) && (h.lookahead = h.strstart - k, h.strstart = k, z(h, !1), h.strm.avail_out === 0) || h.strstart - h.block_start >= h.w_size - Y && (z(h, !1), h.strm.avail_out === 0)) return g;
          }
          return h.insert = 0, M === m ? (z(h, !0), h.strm.avail_out === 0 ? et : $) : (h.strstart > h.block_start && (z(h, !1), h.strm.avail_out), g);
        }), new ot(4, 4, 8, 4, vt), new ot(4, 5, 16, 8, vt), new ot(4, 6, 32, 32, vt), new ot(4, 4, 16, 16, st), new ot(8, 16, 32, 32, st), new ot(8, 16, 128, 128, st), new ot(8, 32, 128, 256, st), new ot(32, 128, 258, 1024, st), new ot(32, 258, 258, 4096, st)], s.deflateInit = function(h, M) {
          return Lt(h, M, v, 15, 8, 0);
        }, s.deflateInit2 = Lt, s.deflateReset = Bt, s.deflateResetKeep = dt, s.deflateSetHeader = function(h, M) {
          return h && h.state ? h.state.wrap !== 2 ? w : (h.state.gzhead = M, l) : w;
        }, s.deflate = function(h, M) {
          var L, k, b, E;
          if (!h || !h.state || 5 < M || M < 0) return h ? nt(h, w) : w;
          if (k = h.state, !h.output || !h.input && h.avail_in !== 0 || k.status === 666 && M !== m) return nt(h, h.avail_out === 0 ? -5 : w);
          if (k.strm = h, L = k.last_flush, k.last_flush = M, k.status === S) if (k.wrap === 2) h.adler = 0, X(k, 31), X(k, 139), X(k, 8), k.gzhead ? (X(k, (k.gzhead.text ? 1 : 0) + (k.gzhead.hcrc ? 2 : 0) + (k.gzhead.extra ? 4 : 0) + (k.gzhead.name ? 8 : 0) + (k.gzhead.comment ? 16 : 0)), X(k, 255 & k.gzhead.time), X(k, k.gzhead.time >> 8 & 255), X(k, k.gzhead.time >> 16 & 255), X(k, k.gzhead.time >> 24 & 255), X(k, k.level === 9 ? 2 : 2 <= k.strategy || k.level < 2 ? 4 : 0), X(k, 255 & k.gzhead.os), k.gzhead.extra && k.gzhead.extra.length && (X(k, 255 & k.gzhead.extra.length), X(k, k.gzhead.extra.length >> 8 & 255)), k.gzhead.hcrc && (h.adler = d(h.adler, k.pending_buf, k.pending, 0)), k.gzindex = 0, k.status = 69) : (X(k, 0), X(k, 0), X(k, 0), X(k, 0), X(k, 0), X(k, k.level === 9 ? 2 : 2 <= k.strategy || k.level < 2 ? 4 : 0), X(k, 3), k.status = N);
          else {
            var P = v + (k.w_bits - 8 << 4) << 8;
            P |= (2 <= k.strategy || k.level < 2 ? 0 : k.level < 6 ? 1 : k.level === 6 ? 2 : 3) << 6, k.strstart !== 0 && (P |= 32), P += 31 - P % 31, k.status = N, G(k, P), k.strstart !== 0 && (G(k, h.adler >>> 16), G(k, 65535 & h.adler)), h.adler = 1;
          }
          if (k.status === 69) if (k.gzhead.extra) {
            for (b = k.pending; k.gzindex < (65535 & k.gzhead.extra.length) && (k.pending !== k.pending_buf_size || (k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), R(h), b = k.pending, k.pending !== k.pending_buf_size)); ) X(k, 255 & k.gzhead.extra[k.gzindex]), k.gzindex++;
            k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), k.gzindex === k.gzhead.extra.length && (k.gzindex = 0, k.status = 73);
          } else k.status = 73;
          if (k.status === 73) if (k.gzhead.name) {
            b = k.pending;
            do {
              if (k.pending === k.pending_buf_size && (k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), R(h), b = k.pending, k.pending === k.pending_buf_size)) {
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
              if (k.pending === k.pending_buf_size && (k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), R(h), b = k.pending, k.pending === k.pending_buf_size)) {
                E = 1;
                break;
              }
              E = k.gzindex < k.gzhead.comment.length ? 255 & k.gzhead.comment.charCodeAt(k.gzindex++) : 0, X(k, E);
            } while (E !== 0);
            k.gzhead.hcrc && k.pending > b && (h.adler = d(h.adler, k.pending_buf, k.pending - b, b)), E === 0 && (k.status = 103);
          } else k.status = 103;
          if (k.status === 103 && (k.gzhead.hcrc ? (k.pending + 2 > k.pending_buf_size && R(h), k.pending + 2 <= k.pending_buf_size && (X(k, 255 & h.adler), X(k, h.adler >> 8 & 255), h.adler = 0, k.status = N)) : k.status = N), k.pending !== 0) {
            if (R(h), h.avail_out === 0) return k.last_flush = -1, l;
          } else if (h.avail_in === 0 && W(M) <= W(L) && M !== m) return nt(h, -5);
          if (k.status === 666 && h.avail_in !== 0) return nt(h, -5);
          if (h.avail_in !== 0 || k.lookahead !== 0 || M !== u && k.status !== 666) {
            var j = k.strategy === 2 ? (function(T, H) {
              for (var K; ; ) {
                if (T.lookahead === 0 && (ut(T), T.lookahead === 0)) {
                  if (H === u) return g;
                  break;
                }
                if (T.match_length = 0, K = a._tr_tally(T, 0, T.window[T.strstart]), T.lookahead--, T.strstart++, K && (z(T, !1), T.strm.avail_out === 0)) return g;
              }
              return T.insert = 0, H === m ? (z(T, !0), T.strm.avail_out === 0 ? et : $) : T.last_lit && (z(T, !1), T.strm.avail_out === 0) ? g : B;
            })(k, M) : k.strategy === 3 ? (function(T, H) {
              for (var K, V, J, ct, it = T.window; ; ) {
                if (T.lookahead <= U) {
                  if (ut(T), T.lookahead <= U && H === u) return g;
                  if (T.lookahead === 0) break;
                }
                if (T.match_length = 0, T.lookahead >= I && 0 < T.strstart && (V = it[J = T.strstart - 1]) === it[++J] && V === it[++J] && V === it[++J]) {
                  ct = T.strstart + U;
                  do
                    ;
                  while (V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && V === it[++J] && J < ct);
                  T.match_length = U - (ct - J), T.match_length > T.lookahead && (T.match_length = T.lookahead);
                }
                if (T.match_length >= I ? (K = a._tr_tally(T, 1, T.match_length - I), T.lookahead -= T.match_length, T.strstart += T.match_length, T.match_length = 0) : (K = a._tr_tally(T, 0, T.window[T.strstart]), T.lookahead--, T.strstart++), K && (z(T, !1), T.strm.avail_out === 0)) return g;
              }
              return T.insert = 0, H === m ? (z(T, !0), T.strm.avail_out === 0 ? et : $) : T.last_lit && (z(T, !1), T.strm.avail_out === 0) ? g : B;
            })(k, M) : i[k.level].func(k, M);
            if (j !== et && j !== $ || (k.status = 666), j === g || j === et) return h.avail_out === 0 && (k.last_flush = -1), l;
            if (j === B && (M === 1 ? a._tr_align(k) : M !== 5 && (a._tr_stored_block(k, 0, 0, !1), M === 3 && (Q(k.head), k.lookahead === 0 && (k.strstart = 0, k.block_start = 0, k.insert = 0))), R(h), h.avail_out === 0)) return k.last_flush = -1, l;
          }
          return M !== m ? l : k.wrap <= 0 ? 1 : (k.wrap === 2 ? (X(k, 255 & h.adler), X(k, h.adler >> 8 & 255), X(k, h.adler >> 16 & 255), X(k, h.adler >> 24 & 255), X(k, 255 & h.total_in), X(k, h.total_in >> 8 & 255), X(k, h.total_in >> 16 & 255), X(k, h.total_in >> 24 & 255)) : (G(k, h.adler >>> 16), G(k, 65535 & h.adler)), R(h), 0 < k.wrap && (k.wrap = -k.wrap), k.pending !== 0 ? l : 1);
        }, s.deflateEnd = function(h) {
          var M;
          return h && h.state ? (M = h.state.status) !== S && M !== 69 && M !== 73 && M !== 91 && M !== 103 && M !== N && M !== 666 ? nt(h, w) : (h.state = null, M === N ? nt(h, -3) : l) : w;
        }, s.deflateSetDictionary = function(h, M) {
          var L, k, b, E, P, j, T, H, K = M.length;
          if (!h || !h.state || (E = (L = h.state).wrap) === 2 || E === 1 && L.status !== S || L.lookahead) return w;
          for (E === 1 && (h.adler = c(h.adler, M, K, 0)), L.wrap = 0, K >= L.w_size && (E === 0 && (Q(L.head), L.strstart = 0, L.block_start = 0, L.insert = 0), H = new o.Buf8(L.w_size), o.arraySet(H, M, K - L.w_size, L.w_size, 0), M = H, K = L.w_size), P = h.avail_in, j = h.next_in, T = h.input, h.avail_in = K, h.next_in = 0, h.input = M, ut(L); L.lookahead >= I; ) {
            for (k = L.strstart, b = L.lookahead - (I - 1); L.ins_h = (L.ins_h << L.hash_shift ^ L.window[k + I - 1]) & L.hash_mask, L.prev[k & L.w_mask] = L.head[L.ins_h], L.head[L.ins_h] = k, k++, --b; ) ;
            L.strstart = k, L.lookahead = I - 1, ut(L);
          }
          return L.strstart += L.lookahead, L.block_start = L.strstart, L.insert = L.lookahead, L.lookahead = 0, L.match_length = L.prev_length = I - 1, L.match_available = 0, h.next_in = j, h.input = T, h.avail_in = P, L.wrap = E, l;
        }, s.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, r, s) {
        r.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
        };
      }, {}], 48: [function(e, r, s) {
        r.exports = function(i, o) {
          var a, c, d, f, u, m, l, w, p, y, _, v, C, A, D, F, x, O, I, U, Y, S, N, g, B;
          a = i.state, c = i.next_in, g = i.input, d = c + (i.avail_in - 5), f = i.next_out, B = i.output, u = f - (o - i.avail_out), m = f + (i.avail_out - 257), l = a.dmax, w = a.wsize, p = a.whave, y = a.wnext, _ = a.window, v = a.hold, C = a.bits, A = a.lencode, D = a.distcode, F = (1 << a.lenbits) - 1, x = (1 << a.distbits) - 1;
          t: do {
            C < 15 && (v += g[c++] << C, C += 8, v += g[c++] << C, C += 8), O = A[v & F];
            e: for (; ; ) {
              if (v >>>= I = O >>> 24, C -= I, (I = O >>> 16 & 255) === 0) B[f++] = 65535 & O;
              else {
                if (!(16 & I)) {
                  if ((64 & I) == 0) {
                    O = A[(65535 & O) + (v & (1 << I) - 1)];
                    continue e;
                  }
                  if (32 & I) {
                    a.mode = 12;
                    break t;
                  }
                  i.msg = "invalid literal/length code", a.mode = 30;
                  break t;
                }
                U = 65535 & O, (I &= 15) && (C < I && (v += g[c++] << C, C += 8), U += v & (1 << I) - 1, v >>>= I, C -= I), C < 15 && (v += g[c++] << C, C += 8, v += g[c++] << C, C += 8), O = D[v & x];
                n: for (; ; ) {
                  if (v >>>= I = O >>> 24, C -= I, !(16 & (I = O >>> 16 & 255))) {
                    if ((64 & I) == 0) {
                      O = D[(65535 & O) + (v & (1 << I) - 1)];
                      continue n;
                    }
                    i.msg = "invalid distance code", a.mode = 30;
                    break t;
                  }
                  if (Y = 65535 & O, C < (I &= 15) && (v += g[c++] << C, (C += 8) < I && (v += g[c++] << C, C += 8)), l < (Y += v & (1 << I) - 1)) {
                    i.msg = "invalid distance too far back", a.mode = 30;
                    break t;
                  }
                  if (v >>>= I, C -= I, (I = f - u) < Y) {
                    if (p < (I = Y - I) && a.sane) {
                      i.msg = "invalid distance too far back", a.mode = 30;
                      break t;
                    }
                    if (N = _, (S = 0) === y) {
                      if (S += w - I, I < U) {
                        for (U -= I; B[f++] = _[S++], --I; ) ;
                        S = f - Y, N = B;
                      }
                    } else if (y < I) {
                      if (S += w + y - I, (I -= y) < U) {
                        for (U -= I; B[f++] = _[S++], --I; ) ;
                        if (S = 0, y < U) {
                          for (U -= I = y; B[f++] = _[S++], --I; ) ;
                          S = f - Y, N = B;
                        }
                      }
                    } else if (S += y - I, I < U) {
                      for (U -= I; B[f++] = _[S++], --I; ) ;
                      S = f - Y, N = B;
                    }
                    for (; 2 < U; ) B[f++] = N[S++], B[f++] = N[S++], B[f++] = N[S++], U -= 3;
                    U && (B[f++] = N[S++], 1 < U && (B[f++] = N[S++]));
                  } else {
                    for (S = f - Y; B[f++] = B[S++], B[f++] = B[S++], B[f++] = B[S++], 2 < (U -= 3); ) ;
                    U && (B[f++] = B[S++], 1 < U && (B[f++] = B[S++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (c < d && f < m);
          c -= U = C >> 3, v &= (1 << (C -= U << 3)) - 1, i.next_in = c, i.next_out = f, i.avail_in = c < d ? d - c + 5 : 5 - (c - d), i.avail_out = f < m ? m - f + 257 : 257 - (f - m), a.hold = v, a.bits = C;
        };
      }, {}], 49: [function(e, r, s) {
        var i = e("../utils/common"), o = e("./adler32"), a = e("./crc32"), c = e("./inffast"), d = e("./inftrees"), f = 1, u = 2, m = 0, l = -2, w = 1, p = 852, y = 592;
        function _(S) {
          return (S >>> 24 & 255) + (S >>> 8 & 65280) + ((65280 & S) << 8) + ((255 & S) << 24);
        }
        function v() {
          this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new i.Buf16(320), this.work = new i.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function C(S) {
          var N;
          return S && S.state ? (N = S.state, S.total_in = S.total_out = N.total = 0, S.msg = "", N.wrap && (S.adler = 1 & N.wrap), N.mode = w, N.last = 0, N.havedict = 0, N.dmax = 32768, N.head = null, N.hold = 0, N.bits = 0, N.lencode = N.lendyn = new i.Buf32(p), N.distcode = N.distdyn = new i.Buf32(y), N.sane = 1, N.back = -1, m) : l;
        }
        function A(S) {
          var N;
          return S && S.state ? ((N = S.state).wsize = 0, N.whave = 0, N.wnext = 0, C(S)) : l;
        }
        function D(S, N) {
          var g, B;
          return S && S.state ? (B = S.state, N < 0 ? (g = 0, N = -N) : (g = 1 + (N >> 4), N < 48 && (N &= 15)), N && (N < 8 || 15 < N) ? l : (B.window !== null && B.wbits !== N && (B.window = null), B.wrap = g, B.wbits = N, A(S))) : l;
        }
        function F(S, N) {
          var g, B;
          return S ? (B = new v(), (S.state = B).window = null, (g = D(S, N)) !== m && (S.state = null), g) : l;
        }
        var x, O, I = !0;
        function U(S) {
          if (I) {
            var N;
            for (x = new i.Buf32(512), O = new i.Buf32(32), N = 0; N < 144; ) S.lens[N++] = 8;
            for (; N < 256; ) S.lens[N++] = 9;
            for (; N < 280; ) S.lens[N++] = 7;
            for (; N < 288; ) S.lens[N++] = 8;
            for (d(f, S.lens, 0, 288, x, 0, S.work, { bits: 9 }), N = 0; N < 32; ) S.lens[N++] = 5;
            d(u, S.lens, 0, 32, O, 0, S.work, { bits: 5 }), I = !1;
          }
          S.lencode = x, S.lenbits = 9, S.distcode = O, S.distbits = 5;
        }
        function Y(S, N, g, B) {
          var et, $ = S.state;
          return $.window === null && ($.wsize = 1 << $.wbits, $.wnext = 0, $.whave = 0, $.window = new i.Buf8($.wsize)), B >= $.wsize ? (i.arraySet($.window, N, g - $.wsize, $.wsize, 0), $.wnext = 0, $.whave = $.wsize) : (B < (et = $.wsize - $.wnext) && (et = B), i.arraySet($.window, N, g - B, et, $.wnext), (B -= et) ? (i.arraySet($.window, N, g - B, B, 0), $.wnext = B, $.whave = $.wsize) : ($.wnext += et, $.wnext === $.wsize && ($.wnext = 0), $.whave < $.wsize && ($.whave += et))), 0;
        }
        s.inflateReset = A, s.inflateReset2 = D, s.inflateResetKeep = C, s.inflateInit = function(S) {
          return F(S, 15);
        }, s.inflateInit2 = F, s.inflate = function(S, N) {
          var g, B, et, $, nt, W, Q, R, z, X, G, Z, ut, vt, st, ot, _t, dt, Bt, Lt, h, M, L, k, b = 0, E = new i.Buf8(4), P = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!S || !S.state || !S.output || !S.input && S.avail_in !== 0) return l;
          (g = S.state).mode === 12 && (g.mode = 13), nt = S.next_out, et = S.output, Q = S.avail_out, $ = S.next_in, B = S.input, W = S.avail_in, R = g.hold, z = g.bits, X = W, G = Q, M = m;
          t: for (; ; ) switch (g.mode) {
            case w:
              if (g.wrap === 0) {
                g.mode = 13;
                break;
              }
              for (; z < 16; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              if (2 & g.wrap && R === 35615) {
                E[g.check = 0] = 255 & R, E[1] = R >>> 8 & 255, g.check = a(g.check, E, 2, 0), z = R = 0, g.mode = 2;
                break;
              }
              if (g.flags = 0, g.head && (g.head.done = !1), !(1 & g.wrap) || (((255 & R) << 8) + (R >> 8)) % 31) {
                S.msg = "incorrect header check", g.mode = 30;
                break;
              }
              if ((15 & R) != 8) {
                S.msg = "unknown compression method", g.mode = 30;
                break;
              }
              if (z -= 4, h = 8 + (15 & (R >>>= 4)), g.wbits === 0) g.wbits = h;
              else if (h > g.wbits) {
                S.msg = "invalid window size", g.mode = 30;
                break;
              }
              g.dmax = 1 << h, S.adler = g.check = 1, g.mode = 512 & R ? 10 : 12, z = R = 0;
              break;
            case 2:
              for (; z < 16; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              if (g.flags = R, (255 & g.flags) != 8) {
                S.msg = "unknown compression method", g.mode = 30;
                break;
              }
              if (57344 & g.flags) {
                S.msg = "unknown header flags set", g.mode = 30;
                break;
              }
              g.head && (g.head.text = R >> 8 & 1), 512 & g.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, g.check = a(g.check, E, 2, 0)), z = R = 0, g.mode = 3;
            case 3:
              for (; z < 32; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              g.head && (g.head.time = R), 512 & g.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, E[2] = R >>> 16 & 255, E[3] = R >>> 24 & 255, g.check = a(g.check, E, 4, 0)), z = R = 0, g.mode = 4;
            case 4:
              for (; z < 16; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              g.head && (g.head.xflags = 255 & R, g.head.os = R >> 8), 512 & g.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, g.check = a(g.check, E, 2, 0)), z = R = 0, g.mode = 5;
            case 5:
              if (1024 & g.flags) {
                for (; z < 16; ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                g.length = R, g.head && (g.head.extra_len = R), 512 & g.flags && (E[0] = 255 & R, E[1] = R >>> 8 & 255, g.check = a(g.check, E, 2, 0)), z = R = 0;
              } else g.head && (g.head.extra = null);
              g.mode = 6;
            case 6:
              if (1024 & g.flags && (W < (Z = g.length) && (Z = W), Z && (g.head && (h = g.head.extra_len - g.length, g.head.extra || (g.head.extra = new Array(g.head.extra_len)), i.arraySet(g.head.extra, B, $, Z, h)), 512 & g.flags && (g.check = a(g.check, B, Z, $)), W -= Z, $ += Z, g.length -= Z), g.length)) break t;
              g.length = 0, g.mode = 7;
            case 7:
              if (2048 & g.flags) {
                if (W === 0) break t;
                for (Z = 0; h = B[$ + Z++], g.head && h && g.length < 65536 && (g.head.name += String.fromCharCode(h)), h && Z < W; ) ;
                if (512 & g.flags && (g.check = a(g.check, B, Z, $)), W -= Z, $ += Z, h) break t;
              } else g.head && (g.head.name = null);
              g.length = 0, g.mode = 8;
            case 8:
              if (4096 & g.flags) {
                if (W === 0) break t;
                for (Z = 0; h = B[$ + Z++], g.head && h && g.length < 65536 && (g.head.comment += String.fromCharCode(h)), h && Z < W; ) ;
                if (512 & g.flags && (g.check = a(g.check, B, Z, $)), W -= Z, $ += Z, h) break t;
              } else g.head && (g.head.comment = null);
              g.mode = 9;
            case 9:
              if (512 & g.flags) {
                for (; z < 16; ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                if (R !== (65535 & g.check)) {
                  S.msg = "header crc mismatch", g.mode = 30;
                  break;
                }
                z = R = 0;
              }
              g.head && (g.head.hcrc = g.flags >> 9 & 1, g.head.done = !0), S.adler = g.check = 0, g.mode = 12;
              break;
            case 10:
              for (; z < 32; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              S.adler = g.check = _(R), z = R = 0, g.mode = 11;
            case 11:
              if (g.havedict === 0) return S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = W, g.hold = R, g.bits = z, 2;
              S.adler = g.check = 1, g.mode = 12;
            case 12:
              if (N === 5 || N === 6) break t;
            case 13:
              if (g.last) {
                R >>>= 7 & z, z -= 7 & z, g.mode = 27;
                break;
              }
              for (; z < 3; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              switch (g.last = 1 & R, z -= 1, 3 & (R >>>= 1)) {
                case 0:
                  g.mode = 14;
                  break;
                case 1:
                  if (U(g), g.mode = 20, N !== 6) break;
                  R >>>= 2, z -= 2;
                  break t;
                case 2:
                  g.mode = 17;
                  break;
                case 3:
                  S.msg = "invalid block type", g.mode = 30;
              }
              R >>>= 2, z -= 2;
              break;
            case 14:
              for (R >>>= 7 & z, z -= 7 & z; z < 32; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              if ((65535 & R) != (R >>> 16 ^ 65535)) {
                S.msg = "invalid stored block lengths", g.mode = 30;
                break;
              }
              if (g.length = 65535 & R, z = R = 0, g.mode = 15, N === 6) break t;
            case 15:
              g.mode = 16;
            case 16:
              if (Z = g.length) {
                if (W < Z && (Z = W), Q < Z && (Z = Q), Z === 0) break t;
                i.arraySet(et, B, $, Z, nt), W -= Z, $ += Z, Q -= Z, nt += Z, g.length -= Z;
                break;
              }
              g.mode = 12;
              break;
            case 17:
              for (; z < 14; ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              if (g.nlen = 257 + (31 & R), R >>>= 5, z -= 5, g.ndist = 1 + (31 & R), R >>>= 5, z -= 5, g.ncode = 4 + (15 & R), R >>>= 4, z -= 4, 286 < g.nlen || 30 < g.ndist) {
                S.msg = "too many length or distance symbols", g.mode = 30;
                break;
              }
              g.have = 0, g.mode = 18;
            case 18:
              for (; g.have < g.ncode; ) {
                for (; z < 3; ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                g.lens[P[g.have++]] = 7 & R, R >>>= 3, z -= 3;
              }
              for (; g.have < 19; ) g.lens[P[g.have++]] = 0;
              if (g.lencode = g.lendyn, g.lenbits = 7, L = { bits: g.lenbits }, M = d(0, g.lens, 0, 19, g.lencode, 0, g.work, L), g.lenbits = L.bits, M) {
                S.msg = "invalid code lengths set", g.mode = 30;
                break;
              }
              g.have = 0, g.mode = 19;
            case 19:
              for (; g.have < g.nlen + g.ndist; ) {
                for (; ot = (b = g.lencode[R & (1 << g.lenbits) - 1]) >>> 16 & 255, _t = 65535 & b, !((st = b >>> 24) <= z); ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                if (_t < 16) R >>>= st, z -= st, g.lens[g.have++] = _t;
                else {
                  if (_t === 16) {
                    for (k = st + 2; z < k; ) {
                      if (W === 0) break t;
                      W--, R += B[$++] << z, z += 8;
                    }
                    if (R >>>= st, z -= st, g.have === 0) {
                      S.msg = "invalid bit length repeat", g.mode = 30;
                      break;
                    }
                    h = g.lens[g.have - 1], Z = 3 + (3 & R), R >>>= 2, z -= 2;
                  } else if (_t === 17) {
                    for (k = st + 3; z < k; ) {
                      if (W === 0) break t;
                      W--, R += B[$++] << z, z += 8;
                    }
                    z -= st, h = 0, Z = 3 + (7 & (R >>>= st)), R >>>= 3, z -= 3;
                  } else {
                    for (k = st + 7; z < k; ) {
                      if (W === 0) break t;
                      W--, R += B[$++] << z, z += 8;
                    }
                    z -= st, h = 0, Z = 11 + (127 & (R >>>= st)), R >>>= 7, z -= 7;
                  }
                  if (g.have + Z > g.nlen + g.ndist) {
                    S.msg = "invalid bit length repeat", g.mode = 30;
                    break;
                  }
                  for (; Z--; ) g.lens[g.have++] = h;
                }
              }
              if (g.mode === 30) break;
              if (g.lens[256] === 0) {
                S.msg = "invalid code -- missing end-of-block", g.mode = 30;
                break;
              }
              if (g.lenbits = 9, L = { bits: g.lenbits }, M = d(f, g.lens, 0, g.nlen, g.lencode, 0, g.work, L), g.lenbits = L.bits, M) {
                S.msg = "invalid literal/lengths set", g.mode = 30;
                break;
              }
              if (g.distbits = 6, g.distcode = g.distdyn, L = { bits: g.distbits }, M = d(u, g.lens, g.nlen, g.ndist, g.distcode, 0, g.work, L), g.distbits = L.bits, M) {
                S.msg = "invalid distances set", g.mode = 30;
                break;
              }
              if (g.mode = 20, N === 6) break t;
            case 20:
              g.mode = 21;
            case 21:
              if (6 <= W && 258 <= Q) {
                S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = W, g.hold = R, g.bits = z, c(S, G), nt = S.next_out, et = S.output, Q = S.avail_out, $ = S.next_in, B = S.input, W = S.avail_in, R = g.hold, z = g.bits, g.mode === 12 && (g.back = -1);
                break;
              }
              for (g.back = 0; ot = (b = g.lencode[R & (1 << g.lenbits) - 1]) >>> 16 & 255, _t = 65535 & b, !((st = b >>> 24) <= z); ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              if (ot && (240 & ot) == 0) {
                for (dt = st, Bt = ot, Lt = _t; ot = (b = g.lencode[Lt + ((R & (1 << dt + Bt) - 1) >> dt)]) >>> 16 & 255, _t = 65535 & b, !(dt + (st = b >>> 24) <= z); ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                R >>>= dt, z -= dt, g.back += dt;
              }
              if (R >>>= st, z -= st, g.back += st, g.length = _t, ot === 0) {
                g.mode = 26;
                break;
              }
              if (32 & ot) {
                g.back = -1, g.mode = 12;
                break;
              }
              if (64 & ot) {
                S.msg = "invalid literal/length code", g.mode = 30;
                break;
              }
              g.extra = 15 & ot, g.mode = 22;
            case 22:
              if (g.extra) {
                for (k = g.extra; z < k; ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                g.length += R & (1 << g.extra) - 1, R >>>= g.extra, z -= g.extra, g.back += g.extra;
              }
              g.was = g.length, g.mode = 23;
            case 23:
              for (; ot = (b = g.distcode[R & (1 << g.distbits) - 1]) >>> 16 & 255, _t = 65535 & b, !((st = b >>> 24) <= z); ) {
                if (W === 0) break t;
                W--, R += B[$++] << z, z += 8;
              }
              if ((240 & ot) == 0) {
                for (dt = st, Bt = ot, Lt = _t; ot = (b = g.distcode[Lt + ((R & (1 << dt + Bt) - 1) >> dt)]) >>> 16 & 255, _t = 65535 & b, !(dt + (st = b >>> 24) <= z); ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                R >>>= dt, z -= dt, g.back += dt;
              }
              if (R >>>= st, z -= st, g.back += st, 64 & ot) {
                S.msg = "invalid distance code", g.mode = 30;
                break;
              }
              g.offset = _t, g.extra = 15 & ot, g.mode = 24;
            case 24:
              if (g.extra) {
                for (k = g.extra; z < k; ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                g.offset += R & (1 << g.extra) - 1, R >>>= g.extra, z -= g.extra, g.back += g.extra;
              }
              if (g.offset > g.dmax) {
                S.msg = "invalid distance too far back", g.mode = 30;
                break;
              }
              g.mode = 25;
            case 25:
              if (Q === 0) break t;
              if (Z = G - Q, g.offset > Z) {
                if ((Z = g.offset - Z) > g.whave && g.sane) {
                  S.msg = "invalid distance too far back", g.mode = 30;
                  break;
                }
                ut = Z > g.wnext ? (Z -= g.wnext, g.wsize - Z) : g.wnext - Z, Z > g.length && (Z = g.length), vt = g.window;
              } else vt = et, ut = nt - g.offset, Z = g.length;
              for (Q < Z && (Z = Q), Q -= Z, g.length -= Z; et[nt++] = vt[ut++], --Z; ) ;
              g.length === 0 && (g.mode = 21);
              break;
            case 26:
              if (Q === 0) break t;
              et[nt++] = g.length, Q--, g.mode = 21;
              break;
            case 27:
              if (g.wrap) {
                for (; z < 32; ) {
                  if (W === 0) break t;
                  W--, R |= B[$++] << z, z += 8;
                }
                if (G -= Q, S.total_out += G, g.total += G, G && (S.adler = g.check = g.flags ? a(g.check, et, G, nt - G) : o(g.check, et, G, nt - G)), G = Q, (g.flags ? R : _(R)) !== g.check) {
                  S.msg = "incorrect data check", g.mode = 30;
                  break;
                }
                z = R = 0;
              }
              g.mode = 28;
            case 28:
              if (g.wrap && g.flags) {
                for (; z < 32; ) {
                  if (W === 0) break t;
                  W--, R += B[$++] << z, z += 8;
                }
                if (R !== (4294967295 & g.total)) {
                  S.msg = "incorrect length check", g.mode = 30;
                  break;
                }
                z = R = 0;
              }
              g.mode = 29;
            case 29:
              M = 1;
              break t;
            case 30:
              M = -3;
              break t;
            case 31:
              return -4;
            default:
              return l;
          }
          return S.next_out = nt, S.avail_out = Q, S.next_in = $, S.avail_in = W, g.hold = R, g.bits = z, (g.wsize || G !== S.avail_out && g.mode < 30 && (g.mode < 27 || N !== 4)) && Y(S, S.output, S.next_out, G - S.avail_out) ? (g.mode = 31, -4) : (X -= S.avail_in, G -= S.avail_out, S.total_in += X, S.total_out += G, g.total += G, g.wrap && G && (S.adler = g.check = g.flags ? a(g.check, et, G, S.next_out - G) : o(g.check, et, G, S.next_out - G)), S.data_type = g.bits + (g.last ? 64 : 0) + (g.mode === 12 ? 128 : 0) + (g.mode === 20 || g.mode === 15 ? 256 : 0), (X == 0 && G === 0 || N === 4) && M === m && (M = -5), M);
        }, s.inflateEnd = function(S) {
          if (!S || !S.state) return l;
          var N = S.state;
          return N.window && (N.window = null), S.state = null, m;
        }, s.inflateGetHeader = function(S, N) {
          var g;
          return S && S.state ? (2 & (g = S.state).wrap) == 0 ? l : ((g.head = N).done = !1, m) : l;
        }, s.inflateSetDictionary = function(S, N) {
          var g, B = N.length;
          return S && S.state ? (g = S.state).wrap !== 0 && g.mode !== 11 ? l : g.mode === 11 && o(1, N, B, 0) !== g.check ? -3 : Y(S, N, B, B) ? (g.mode = 31, -4) : (g.havedict = 1, m) : l;
        }, s.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, r, s) {
        var i = e("../utils/common"), o = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], a = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], c = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], d = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        r.exports = function(f, u, m, l, w, p, y, _) {
          var v, C, A, D, F, x, O, I, U, Y = _.bits, S = 0, N = 0, g = 0, B = 0, et = 0, $ = 0, nt = 0, W = 0, Q = 0, R = 0, z = null, X = 0, G = new i.Buf16(16), Z = new i.Buf16(16), ut = null, vt = 0;
          for (S = 0; S <= 15; S++) G[S] = 0;
          for (N = 0; N < l; N++) G[u[m + N]]++;
          for (et = Y, B = 15; 1 <= B && G[B] === 0; B--) ;
          if (B < et && (et = B), B === 0) return w[p++] = 20971520, w[p++] = 20971520, _.bits = 1, 0;
          for (g = 1; g < B && G[g] === 0; g++) ;
          for (et < g && (et = g), S = W = 1; S <= 15; S++) if (W <<= 1, (W -= G[S]) < 0) return -1;
          if (0 < W && (f === 0 || B !== 1)) return -1;
          for (Z[1] = 0, S = 1; S < 15; S++) Z[S + 1] = Z[S] + G[S];
          for (N = 0; N < l; N++) u[m + N] !== 0 && (y[Z[u[m + N]]++] = N);
          if (x = f === 0 ? (z = ut = y, 19) : f === 1 ? (z = o, X -= 257, ut = a, vt -= 257, 256) : (z = c, ut = d, -1), S = g, F = p, nt = N = R = 0, A = -1, D = (Q = 1 << ($ = et)) - 1, f === 1 && 852 < Q || f === 2 && 592 < Q) return 1;
          for (; ; ) {
            for (O = S - nt, U = y[N] < x ? (I = 0, y[N]) : y[N] > x ? (I = ut[vt + y[N]], z[X + y[N]]) : (I = 96, 0), v = 1 << S - nt, g = C = 1 << $; w[F + (R >> nt) + (C -= v)] = O << 24 | I << 16 | U | 0, C !== 0; ) ;
            for (v = 1 << S - 1; R & v; ) v >>= 1;
            if (v !== 0 ? (R &= v - 1, R += v) : R = 0, N++, --G[S] == 0) {
              if (S === B) break;
              S = u[m + y[N]];
            }
            if (et < S && (R & D) !== A) {
              for (nt === 0 && (nt = et), F += g, W = 1 << ($ = S - nt); $ + nt < B && !((W -= G[$ + nt]) <= 0); ) $++, W <<= 1;
              if (Q += 1 << $, f === 1 && 852 < Q || f === 2 && 592 < Q) return 1;
              w[A = R & D] = et << 24 | $ << 16 | F - p | 0;
            }
          }
          return R !== 0 && (w[F + R] = S - nt << 24 | 64 << 16 | 0), _.bits = et, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(e, r, s) {
        r.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(e, r, s) {
        var i = e("../utils/common"), o = 0, a = 1;
        function c(b) {
          for (var E = b.length; 0 <= --E; ) b[E] = 0;
        }
        var d = 0, f = 29, u = 256, m = u + 1 + f, l = 30, w = 19, p = 2 * m + 1, y = 15, _ = 16, v = 7, C = 256, A = 16, D = 17, F = 18, x = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], O = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], I = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], U = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], Y = new Array(2 * (m + 2));
        c(Y);
        var S = new Array(2 * l);
        c(S);
        var N = new Array(512);
        c(N);
        var g = new Array(256);
        c(g);
        var B = new Array(f);
        c(B);
        var et, $, nt, W = new Array(l);
        function Q(b, E, P, j, T) {
          this.static_tree = b, this.extra_bits = E, this.extra_base = P, this.elems = j, this.max_length = T, this.has_stree = b && b.length;
        }
        function R(b, E) {
          this.dyn_tree = b, this.max_code = 0, this.stat_desc = E;
        }
        function z(b) {
          return b < 256 ? N[b] : N[256 + (b >>> 7)];
        }
        function X(b, E) {
          b.pending_buf[b.pending++] = 255 & E, b.pending_buf[b.pending++] = E >>> 8 & 255;
        }
        function G(b, E, P) {
          b.bi_valid > _ - P ? (b.bi_buf |= E << b.bi_valid & 65535, X(b, b.bi_buf), b.bi_buf = E >> _ - b.bi_valid, b.bi_valid += P - _) : (b.bi_buf |= E << b.bi_valid & 65535, b.bi_valid += P);
        }
        function Z(b, E, P) {
          G(b, P[2 * E], P[2 * E + 1]);
        }
        function ut(b, E) {
          for (var P = 0; P |= 1 & b, b >>>= 1, P <<= 1, 0 < --E; ) ;
          return P >>> 1;
        }
        function vt(b, E, P) {
          var j, T, H = new Array(y + 1), K = 0;
          for (j = 1; j <= y; j++) H[j] = K = K + P[j - 1] << 1;
          for (T = 0; T <= E; T++) {
            var V = b[2 * T + 1];
            V !== 0 && (b[2 * T] = ut(H[V]++, V));
          }
        }
        function st(b) {
          var E;
          for (E = 0; E < m; E++) b.dyn_ltree[2 * E] = 0;
          for (E = 0; E < l; E++) b.dyn_dtree[2 * E] = 0;
          for (E = 0; E < w; E++) b.bl_tree[2 * E] = 0;
          b.dyn_ltree[2 * C] = 1, b.opt_len = b.static_len = 0, b.last_lit = b.matches = 0;
        }
        function ot(b) {
          8 < b.bi_valid ? X(b, b.bi_buf) : 0 < b.bi_valid && (b.pending_buf[b.pending++] = b.bi_buf), b.bi_buf = 0, b.bi_valid = 0;
        }
        function _t(b, E, P, j) {
          var T = 2 * E, H = 2 * P;
          return b[T] < b[H] || b[T] === b[H] && j[E] <= j[P];
        }
        function dt(b, E, P) {
          for (var j = b.heap[P], T = P << 1; T <= b.heap_len && (T < b.heap_len && _t(E, b.heap[T + 1], b.heap[T], b.depth) && T++, !_t(E, j, b.heap[T], b.depth)); ) b.heap[P] = b.heap[T], P = T, T <<= 1;
          b.heap[P] = j;
        }
        function Bt(b, E, P) {
          var j, T, H, K, V = 0;
          if (b.last_lit !== 0) for (; j = b.pending_buf[b.d_buf + 2 * V] << 8 | b.pending_buf[b.d_buf + 2 * V + 1], T = b.pending_buf[b.l_buf + V], V++, j === 0 ? Z(b, T, E) : (Z(b, (H = g[T]) + u + 1, E), (K = x[H]) !== 0 && G(b, T -= B[H], K), Z(b, H = z(--j), P), (K = O[H]) !== 0 && G(b, j -= W[H], K)), V < b.last_lit; ) ;
          Z(b, C, E);
        }
        function Lt(b, E) {
          var P, j, T, H = E.dyn_tree, K = E.stat_desc.static_tree, V = E.stat_desc.has_stree, J = E.stat_desc.elems, ct = -1;
          for (b.heap_len = 0, b.heap_max = p, P = 0; P < J; P++) H[2 * P] !== 0 ? (b.heap[++b.heap_len] = ct = P, b.depth[P] = 0) : H[2 * P + 1] = 0;
          for (; b.heap_len < 2; ) H[2 * (T = b.heap[++b.heap_len] = ct < 2 ? ++ct : 0)] = 1, b.depth[T] = 0, b.opt_len--, V && (b.static_len -= K[2 * T + 1]);
          for (E.max_code = ct, P = b.heap_len >> 1; 1 <= P; P--) dt(b, H, P);
          for (T = J; P = b.heap[1], b.heap[1] = b.heap[b.heap_len--], dt(b, H, 1), j = b.heap[1], b.heap[--b.heap_max] = P, b.heap[--b.heap_max] = j, H[2 * T] = H[2 * P] + H[2 * j], b.depth[T] = (b.depth[P] >= b.depth[j] ? b.depth[P] : b.depth[j]) + 1, H[2 * P + 1] = H[2 * j + 1] = T, b.heap[1] = T++, dt(b, H, 1), 2 <= b.heap_len; ) ;
          b.heap[--b.heap_max] = b.heap[1], (function(it, Tt) {
            var Ne, Mt, Ue, ft, sn, Zn, Ht = Tt.dyn_tree, ns = Tt.max_code, fo = Tt.stat_desc.static_tree, po = Tt.stat_desc.has_stree, go = Tt.stat_desc.extra_bits, rs = Tt.stat_desc.extra_base, Be = Tt.stat_desc.max_length, on = 0;
            for (ft = 0; ft <= y; ft++) it.bl_count[ft] = 0;
            for (Ht[2 * it.heap[it.heap_max] + 1] = 0, Ne = it.heap_max + 1; Ne < p; Ne++) Be < (ft = Ht[2 * Ht[2 * (Mt = it.heap[Ne]) + 1] + 1] + 1) && (ft = Be, on++), Ht[2 * Mt + 1] = ft, ns < Mt || (it.bl_count[ft]++, sn = 0, rs <= Mt && (sn = go[Mt - rs]), Zn = Ht[2 * Mt], it.opt_len += Zn * (ft + sn), po && (it.static_len += Zn * (fo[2 * Mt + 1] + sn)));
            if (on !== 0) {
              do {
                for (ft = Be - 1; it.bl_count[ft] === 0; ) ft--;
                it.bl_count[ft]--, it.bl_count[ft + 1] += 2, it.bl_count[Be]--, on -= 2;
              } while (0 < on);
              for (ft = Be; ft !== 0; ft--) for (Mt = it.bl_count[ft]; Mt !== 0; ) ns < (Ue = it.heap[--Ne]) || (Ht[2 * Ue + 1] !== ft && (it.opt_len += (ft - Ht[2 * Ue + 1]) * Ht[2 * Ue], Ht[2 * Ue + 1] = ft), Mt--);
            }
          })(b, E), vt(H, ct, b.bl_count);
        }
        function h(b, E, P) {
          var j, T, H = -1, K = E[1], V = 0, J = 7, ct = 4;
          for (K === 0 && (J = 138, ct = 3), E[2 * (P + 1) + 1] = 65535, j = 0; j <= P; j++) T = K, K = E[2 * (j + 1) + 1], ++V < J && T === K || (V < ct ? b.bl_tree[2 * T] += V : T !== 0 ? (T !== H && b.bl_tree[2 * T]++, b.bl_tree[2 * A]++) : V <= 10 ? b.bl_tree[2 * D]++ : b.bl_tree[2 * F]++, H = T, ct = (V = 0) === K ? (J = 138, 3) : T === K ? (J = 6, 3) : (J = 7, 4));
        }
        function M(b, E, P) {
          var j, T, H = -1, K = E[1], V = 0, J = 7, ct = 4;
          for (K === 0 && (J = 138, ct = 3), j = 0; j <= P; j++) if (T = K, K = E[2 * (j + 1) + 1], !(++V < J && T === K)) {
            if (V < ct) for (; Z(b, T, b.bl_tree), --V != 0; ) ;
            else T !== 0 ? (T !== H && (Z(b, T, b.bl_tree), V--), Z(b, A, b.bl_tree), G(b, V - 3, 2)) : V <= 10 ? (Z(b, D, b.bl_tree), G(b, V - 3, 3)) : (Z(b, F, b.bl_tree), G(b, V - 11, 7));
            H = T, ct = (V = 0) === K ? (J = 138, 3) : T === K ? (J = 6, 3) : (J = 7, 4);
          }
        }
        c(W);
        var L = !1;
        function k(b, E, P, j) {
          G(b, (d << 1) + (j ? 1 : 0), 3), (function(T, H, K, V) {
            ot(T), X(T, K), X(T, ~K), i.arraySet(T.pending_buf, T.window, H, K, T.pending), T.pending += K;
          })(b, E, P);
        }
        s._tr_init = function(b) {
          L || ((function() {
            var E, P, j, T, H, K = new Array(y + 1);
            for (T = j = 0; T < f - 1; T++) for (B[T] = j, E = 0; E < 1 << x[T]; E++) g[j++] = T;
            for (g[j - 1] = T, T = H = 0; T < 16; T++) for (W[T] = H, E = 0; E < 1 << O[T]; E++) N[H++] = T;
            for (H >>= 7; T < l; T++) for (W[T] = H << 7, E = 0; E < 1 << O[T] - 7; E++) N[256 + H++] = T;
            for (P = 0; P <= y; P++) K[P] = 0;
            for (E = 0; E <= 143; ) Y[2 * E + 1] = 8, E++, K[8]++;
            for (; E <= 255; ) Y[2 * E + 1] = 9, E++, K[9]++;
            for (; E <= 279; ) Y[2 * E + 1] = 7, E++, K[7]++;
            for (; E <= 287; ) Y[2 * E + 1] = 8, E++, K[8]++;
            for (vt(Y, m + 1, K), E = 0; E < l; E++) S[2 * E + 1] = 5, S[2 * E] = ut(E, 5);
            et = new Q(Y, x, u + 1, m, y), $ = new Q(S, O, 0, l, y), nt = new Q(new Array(0), I, 0, w, v);
          })(), L = !0), b.l_desc = new R(b.dyn_ltree, et), b.d_desc = new R(b.dyn_dtree, $), b.bl_desc = new R(b.bl_tree, nt), b.bi_buf = 0, b.bi_valid = 0, st(b);
        }, s._tr_stored_block = k, s._tr_flush_block = function(b, E, P, j) {
          var T, H, K = 0;
          0 < b.level ? (b.strm.data_type === 2 && (b.strm.data_type = (function(V) {
            var J, ct = 4093624447;
            for (J = 0; J <= 31; J++, ct >>>= 1) if (1 & ct && V.dyn_ltree[2 * J] !== 0) return o;
            if (V.dyn_ltree[18] !== 0 || V.dyn_ltree[20] !== 0 || V.dyn_ltree[26] !== 0) return a;
            for (J = 32; J < u; J++) if (V.dyn_ltree[2 * J] !== 0) return a;
            return o;
          })(b)), Lt(b, b.l_desc), Lt(b, b.d_desc), K = (function(V) {
            var J;
            for (h(V, V.dyn_ltree, V.l_desc.max_code), h(V, V.dyn_dtree, V.d_desc.max_code), Lt(V, V.bl_desc), J = w - 1; 3 <= J && V.bl_tree[2 * U[J] + 1] === 0; J--) ;
            return V.opt_len += 3 * (J + 1) + 5 + 5 + 4, J;
          })(b), T = b.opt_len + 3 + 7 >>> 3, (H = b.static_len + 3 + 7 >>> 3) <= T && (T = H)) : T = H = P + 5, P + 4 <= T && E !== -1 ? k(b, E, P, j) : b.strategy === 4 || H === T ? (G(b, 2 + (j ? 1 : 0), 3), Bt(b, Y, S)) : (G(b, 4 + (j ? 1 : 0), 3), (function(V, J, ct, it) {
            var Tt;
            for (G(V, J - 257, 5), G(V, ct - 1, 5), G(V, it - 4, 4), Tt = 0; Tt < it; Tt++) G(V, V.bl_tree[2 * U[Tt] + 1], 3);
            M(V, V.dyn_ltree, J - 1), M(V, V.dyn_dtree, ct - 1);
          })(b, b.l_desc.max_code + 1, b.d_desc.max_code + 1, K + 1), Bt(b, b.dyn_ltree, b.dyn_dtree)), st(b), j && ot(b);
        }, s._tr_tally = function(b, E, P) {
          return b.pending_buf[b.d_buf + 2 * b.last_lit] = E >>> 8 & 255, b.pending_buf[b.d_buf + 2 * b.last_lit + 1] = 255 & E, b.pending_buf[b.l_buf + b.last_lit] = 255 & P, b.last_lit++, E === 0 ? b.dyn_ltree[2 * P]++ : (b.matches++, E--, b.dyn_ltree[2 * (g[P] + u + 1)]++, b.dyn_dtree[2 * z(E)]++), b.last_lit === b.lit_bufsize - 1;
        }, s._tr_align = function(b) {
          G(b, 2, 3), Z(b, C, Y), (function(E) {
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
              var c, d, f, u, m = 1, l = {}, w = !1, p = o.document, y = Object.getPrototypeOf && Object.getPrototypeOf(o);
              y = y && y.setTimeout ? y : o, c = {}.toString.call(o.process) === "[object process]" ? function(A) {
                process.nextTick(function() {
                  v(A);
                });
              } : (function() {
                if (o.postMessage && !o.importScripts) {
                  var A = !0, D = o.onmessage;
                  return o.onmessage = function() {
                    A = !1;
                  }, o.postMessage("", "*"), o.onmessage = D, A;
                }
              })() ? (u = "setImmediate$" + Math.random() + "$", o.addEventListener ? o.addEventListener("message", C, !1) : o.attachEvent("onmessage", C), function(A) {
                o.postMessage(u + A, "*");
              }) : o.MessageChannel ? ((f = new MessageChannel()).port1.onmessage = function(A) {
                v(A.data);
              }, function(A) {
                f.port2.postMessage(A);
              }) : p && "onreadystatechange" in p.createElement("script") ? (d = p.documentElement, function(A) {
                var D = p.createElement("script");
                D.onreadystatechange = function() {
                  v(A), D.onreadystatechange = null, d.removeChild(D), D = null;
                }, d.appendChild(D);
              }) : function(A) {
                setTimeout(v, 0, A);
              }, y.setImmediate = function(A) {
                typeof A != "function" && (A = new Function("" + A));
                for (var D = new Array(arguments.length - 1), F = 0; F < D.length; F++) D[F] = arguments[F + 1];
                var x = { callback: A, args: D };
                return l[m] = x, c(m), m++;
              }, y.clearImmediate = _;
            }
            function _(A) {
              delete l[A];
            }
            function v(A) {
              if (w) setTimeout(v, 0, A);
              else {
                var D = l[A];
                if (D) {
                  w = !0;
                  try {
                    (function(F) {
                      var x = F.callback, O = F.args;
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
                    _(A), w = !1;
                  }
                }
              }
            }
            function C(A) {
              A.source === o && typeof A.data == "string" && A.data.indexOf(u) === 0 && v(+A.data.slice(u.length));
            }
          })(typeof self > "u" ? i === void 0 ? this : i : self);
        }).call(this, typeof un < "u" ? un : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}] }, {}, [10])(10);
    });
  })(ir)), ir.exports;
}
var $h = jh();
const uo = /* @__PURE__ */ Ph($h), yr = "__ync_update__", br = "_worldnotes.yjs";
async function Wh(n, t) {
  const e = new uo(), r = await n.get(yr);
  r && e.file(br, r);
  const s = await n.keys();
  for (const i of s) {
    if (i === yr) continue;
    const o = await n.get(i);
    e.file(`${i}.md`, o ?? "");
  }
  return e.generateAsync({ type: "blob" });
}
async function Hh(n, t, e) {
  const r = e?.strategy ?? "overwrite", s = [], i = [], o = await uo.loadAsync(t), a = o.file(br);
  if (a) {
    const c = await a.async("string");
    await n.set(yr, c), s.push(br);
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
function Kh(n) {
  const { storage: t, onImportComplete: e, exportFilename: r, importStrategy: s } = n;
  let i = null, o = null, a = null;
  async function c() {
    const f = await Wh(t), u = URL.createObjectURL(f), m = document.createElement("a");
    m.href = u, m.download = r ?? "worldnotes-export.zip", m.click(), URL.revokeObjectURL(u);
  }
  async function d() {
    const f = a?.files?.[0];
    f && (await Hh(t, f, { strategy: s }), await e());
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
  Bh as EditorBuilder,
  Gh as EditorHistory,
  Yh as IndexedDBAdapter,
  wo as LocalStorageAdapter,
  Co as blockquotePlugin,
  vo as boldPlugin,
  Zh as createEditor,
  Kh as createImportExportPlugin,
  Jl as createYDocState,
  Io as defaultPlugins,
  Wh as exportWorld,
  ko as headingsPlugin,
  Eo as hrPlugin,
  Hh as importWorld,
  xo as inlineCodePlugin,
  So as italicPlugin,
  Do as linkPlugin,
  Th as loadYDoc,
  Vh as remoteCursorsPlugin,
  Ih as saveYDoc,
  Ao as strikethroughPlugin,
  bo as wikiLinkPlugin
};

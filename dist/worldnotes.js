const ho = "worldnotes";
class uo {
  constructor(t = ho) {
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
function sr(n) {
  const t = n.trim().replace(/\/+$/, ""), e = t.split("/").filter(Boolean);
  return e[e.length - 1] ?? t;
}
function rs(n) {
  const t = n.indexOf("|"), e = (t === -1 ? n : n.slice(0, t)).trim(), r = t === -1 ? sr(e) : n.slice(t + 1).trim();
  return { page: e, display: r || sr(e) };
}
function fo(n, t) {
  const r = n.replace(/^\?/, "").split("&").filter(Boolean).filter((o) => {
    const [a = ""] = o.split("=", 1);
    return decodeURIComponent(a.replace(/\+/g, " ")) !== "path";
  }), s = t.map((o) => encodeURIComponent(o)).join("/");
  return `?${[...r, `path=${s}`].join("&")}`;
}
function po(n) {
  const e = n.replace(/^\?/, "").split("&").filter(Boolean).find((i) => {
    const [o = ""] = i.split("=", 1);
    return decodeURIComponent(o.replace(/\+/g, " ")) === "path";
  });
  if (!e) return [];
  const r = e.indexOf("="), s = r === -1 ? "" : e.slice(r + 1);
  return s ? s.split("/").filter(Boolean).map((i) => decodeURIComponent(i)) : [];
}
const go = {
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
    const { page: e, display: r } = rs(n.groups[0] ?? ""), s = document.createElement("span");
    return s.className = "wn-wiki-link", s.dataset.page = e, s.dataset.raw = n.raw, s.textContent = r, s;
  },
  onNavigate(n, t) {
    const { page: e } = rs(n.groups[0] ?? "");
    return t.navigate(e), !0;
  }
};
function on(n, t, e) {
  const r = document.createElement("span");
  r.className = e;
  const s = document.createElement("span");
  s.className = "wn-punct", s.textContent = t;
  const i = document.createElement("span");
  return i.className = `${e}-text`, i.textContent = n.groups[0] ?? "", r.appendChild(s), r.appendChild(i), r;
}
const mo = {
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
        return on(n, "# ", "wn-h1");
      case "h2":
        return on(n, "## ", "wn-h2");
      case "h3":
        return on(n, "### ", "wn-h3");
      default:
        return on(n, "", "wn-h1");
    }
  }
};
function br(n, t, e) {
  const r = document.createElement("span");
  r.className = n;
  const s = (i) => {
    const o = document.createElement("span");
    return o.className = "wn-punct", o.textContent = i, o;
  };
  return r.appendChild(s(t)), r.appendChild(document.createTextNode(e)), r.appendChild(s(t)), r;
}
const wo = {
  name: "bold",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "bold", pattern: /\*\*([^*]+)\*\*/ }],
  render(n, t) {
    return br("wn-bold", "**", n.groups[0] ?? "");
  }
}, _o = {
  name: "italic",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "italic", pattern: /\*([^*]+)\*/ }],
  render(n, t) {
    return br("wn-italic", "*", n.groups[0] ?? "");
  }
}, yo = {
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
}, bo = {
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
    return s.className = "wn-blockquote-text", s.textContent = n.groups[1] ?? "", e.appendChild(r), e.appendChild(s), e;
  }
}, ko = {
  name: "hr",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "hr", pattern: /^---+$/ }],
  render(n, t) {
    const e = document.createElement("span");
    return e.className = "wn-hr", e.textContent = "---", e;
  }
}, vo = {
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
}, So = {
  name: "strikethrough",
  version: "1.0.0",
  kind: "content",
  tokens: [{ type: "strikethrough", pattern: /~~([^~]+)~~/ }],
  render(n, t) {
    const e = br("wn-strikethrough", "~~", n.groups[0] ?? "");
    return e.dataset.raw = n.raw, e;
  }
}, xo = [
  mo,
  // line-level — must come before inline plugins
  ko,
  // line-level
  bo,
  // line-level
  go,
  // inline — [[...]] before [...] to avoid partial match (Pitfall 1)
  vo,
  // inline — [text](url) after [[...]]
  wo,
  // inline — ** before * to avoid partial match
  _o,
  // inline
  So,
  // inline — ~~text~~ (no conflict with * patterns)
  yo
  // inline
], Co = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
class Eo {
  constructor() {
    this.contentPlugins = /* @__PURE__ */ new Map(), this.uiPlugins = /* @__PURE__ */ new Map(), this.storagePlugins = /* @__PURE__ */ new Map(), this.tokenTypeOwners = /* @__PURE__ */ new Map(), this.slotAssignments = /* @__PURE__ */ new Map();
  }
  // ── Validation ──────────────────────────────────────────────────────────────
  /**
   * Validate a version string against the semver regex.
   * Throws if the version does not match the expected format.
   */
  validateVersion(t, e) {
    if (!Co.test(e))
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
const Dt = () => /* @__PURE__ */ new Map(), ir = (n) => {
  const t = Dt();
  return n.forEach((e, r) => {
    t.set(r, e);
  }), t;
}, Wt = (n, t, e) => {
  let r = n.get(t);
  return r === void 0 && n.set(t, r = e()), r;
}, Ao = (n, t) => {
  const e = [];
  for (const [r, s] of n)
    e.push(t(s, r));
  return e;
}, Do = (n, t) => {
  for (const [e, r] of n)
    if (t(r, e))
      return !0;
  return !1;
}, Qt = () => /* @__PURE__ */ new Set(), Vn = (n) => n[n.length - 1], Io = (n, t) => {
  for (let e = 0; e < t.length; e++)
    n.push(t[e]);
}, Yt = Array.from, kr = (n, t) => {
  for (let e = 0; e < n.length; e++)
    if (!t(n[e], e, n))
      return !1;
  return !0;
}, vr = (n, t) => {
  for (let e = 0; e < n.length; e++)
    if (t(n[e], e, n))
      return !0;
  return !1;
}, To = (n, t) => {
  const e = new Array(n);
  for (let r = 0; r < n; r++)
    e[r] = t(r, e);
  return e;
}, Se = Array.isArray;
class Sr {
  constructor() {
    this._observers = Dt();
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
    return Yt((this._observers.get(t) || Dt()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = Dt();
  }
}
class Oo {
  constructor() {
    this._observers = Dt();
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
    return Yt((this._observers.get(t) || Dt()).values()).forEach((r) => r(...e));
  }
  destroy() {
    this._observers = Dt();
  }
}
const Ut = Math.floor, dn = Math.abs, xr = (n, t) => n < t ? n : t, de = (n, t) => n > t ? n : t, zo = Math.pow, Us = (n) => n !== 0 ? n < 0 : 1 / n < 0, ss = 1, is = 2, Zn = 4, Yn = 8, Pe = 32, Zt = 64, It = 128, Tn = 31, or = 63, oe = 127, Ro = 2147483647, wn = Number.MAX_SAFE_INTEGER, os = Number.MIN_SAFE_INTEGER, Lo = Number.isInteger || ((n) => typeof n == "number" && isFinite(n) && Ut(n) === n), Bs = String.fromCharCode, No = (n) => n.toLowerCase(), Uo = /^\s*/g, Bo = (n) => n.replace(Uo, ""), Mo = /([A-Z])/g, as = (n, t) => Bo(n.replace(Mo, (e) => `${t}${No(e)}`)), Fo = (n) => {
  const t = unescape(encodeURIComponent(n)), e = t.length, r = new Uint8Array(e);
  for (let s = 0; s < e; s++)
    r[s] = /** @type {number} */
    t.codePointAt(s);
  return r;
}, je = (
  /** @type {TextEncoder} */
  typeof TextEncoder < "u" ? new TextEncoder() : null
), Po = (n) => je.encode(n), jo = je ? Po : Fo;
let Me = typeof TextDecoder > "u" ? null : new TextDecoder("utf-8", { fatal: !0, ignoreBOM: !0 });
Me && Me.decode(new Uint8Array()).length === 1 && (Me = null);
const $o = (n, t) => To(t, () => n).join("");
class qe {
  constructor() {
    this.cpos = 0, this.cbuf = new Uint8Array(100), this.bufs = [];
  }
}
const xt = () => new qe(), Cr = (n) => {
  let t = n.cpos;
  for (let e = 0; e < n.bufs.length; e++)
    t += n.bufs[e].length;
  return t;
}, ht = (n) => {
  const t = new Uint8Array(Cr(n));
  let e = 0;
  for (let r = 0; r < n.bufs.length; r++) {
    const s = n.bufs[r];
    t.set(s, e), e += s.length;
  }
  return t.set(new Uint8Array(n.cbuf.buffer, 0, n.cpos), e), t;
}, Wo = (n, t) => {
  const e = n.cbuf.length;
  e - n.cpos < t && (n.bufs.push(new Uint8Array(n.cbuf.buffer, 0, n.cpos)), n.cbuf = new Uint8Array(de(e, t) * 2), n.cpos = 0);
}, yt = (n, t) => {
  const e = n.cbuf.length;
  n.cpos === e && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(e * 2), n.cpos = 0), n.cbuf[n.cpos++] = t;
}, ar = yt, K = (n, t) => {
  for (; t > oe; )
    yt(n, It | oe & t), t = Ut(t / 128);
  yt(n, oe & t);
}, Er = (n, t) => {
  const e = Us(t);
  for (e && (t = -t), yt(n, (t > or ? It : 0) | (e ? Zt : 0) | or & t), t = Ut(t / 64); t > 0; )
    yt(n, (t > oe ? It : 0) | oe & t), t = Ut(t / 128);
}, lr = new Uint8Array(3e4), Ho = lr.length / 3, Vo = (n, t) => {
  if (t.length < Ho) {
    const e = je.encodeInto(t, lr).written || 0;
    K(n, e);
    for (let r = 0; r < e; r++)
      yt(n, lr[r]);
  } else
    pt(n, jo(t));
}, Zo = (n, t) => {
  const e = unescape(encodeURIComponent(t)), r = e.length;
  K(n, r);
  for (let s = 0; s < r; s++)
    yt(
      n,
      /** @type {number} */
      e.codePointAt(s)
    );
}, ae = je && /** @type {any} */
je.encodeInto ? Vo : Zo, On = (n, t) => {
  const e = n.cbuf.length, r = n.cpos, s = xr(e - r, t.length), i = t.length - s;
  n.cbuf.set(t.subarray(0, s), r), n.cpos += s, i > 0 && (n.bufs.push(n.cbuf), n.cbuf = new Uint8Array(de(e * 2, i)), n.cbuf.set(t.subarray(s)), n.cpos = i);
}, pt = (n, t) => {
  K(n, t.byteLength), On(n, t);
}, Ar = (n, t) => {
  Wo(n, t);
  const e = new DataView(n.cbuf.buffer, n.cpos, t);
  return n.cpos += t, e;
}, Yo = (n, t) => Ar(n, 4).setFloat32(0, t, !1), Go = (n, t) => Ar(n, 8).setFloat64(0, t, !1), Ko = (n, t) => (
  /** @type {any} */
  Ar(n, 8).setBigInt64(0, t, !1)
), ls = new DataView(new ArrayBuffer(4)), qo = (n) => (ls.setFloat32(0, n), ls.getFloat32(0) === n), $e = (n, t) => {
  switch (typeof t) {
    case "string":
      yt(n, 119), ae(n, t);
      break;
    case "number":
      Lo(t) && dn(t) <= Ro ? (yt(n, 125), Er(n, t)) : qo(t) ? (yt(n, 124), Yo(n, t)) : (yt(n, 123), Go(n, t));
      break;
    case "bigint":
      yt(n, 122), Ko(n, t);
      break;
    case "object":
      if (t === null)
        yt(n, 126);
      else if (Se(t)) {
        yt(n, 117), K(n, t.length);
        for (let e = 0; e < t.length; e++)
          $e(n, t[e]);
      } else if (t instanceof Uint8Array)
        yt(n, 116), pt(n, t);
      else {
        yt(n, 118);
        const e = Object.keys(t);
        K(n, e.length);
        for (let r = 0; r < e.length; r++) {
          const s = e[r];
          ae(n, s), $e(n, t[s]);
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
class cs extends qe {
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
const hs = (n) => {
  n.count > 0 && (Er(n.encoder, n.count === 1 ? n.s : -n.s), n.count > 1 && K(n.encoder, n.count - 2));
};
class fn {
  constructor() {
    this.encoder = new qe(), this.s = 0, this.count = 0;
  }
  /**
   * @param {number} v
   */
  write(t) {
    this.s === t ? this.count++ : (hs(this), this.count = 1, this.s = t);
  }
  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array() {
    return hs(this), ht(this.encoder);
  }
}
const us = (n) => {
  if (n.count > 0) {
    const t = n.diff * 2 + (n.count === 1 ? 0 : 1);
    Er(n.encoder, t), n.count > 1 && K(n.encoder, n.count - 2);
  }
};
class Gn {
  constructor() {
    this.encoder = new qe(), this.s = 0, this.count = 0, this.diff = 0;
  }
  /**
   * @param {number} v
   */
  write(t) {
    this.diff === t - this.s ? (this.s = t, this.count++) : (us(this), this.count = 1, this.diff = t - this.s, this.s = t);
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
class Jo {
  constructor() {
    this.sarr = [], this.s = "", this.lensE = new fn();
  }
  /**
   * @param {string} string
   */
  write(t) {
    this.s += t, this.s.length > 19 && (this.sarr.push(this.s), this.s = ""), this.lensE.write(t.length);
  }
  toUint8Array() {
    const t = new qe();
    return this.sarr.push(this.s), this.s = "", ae(t, this.sarr.join("")), On(t, this.lensE.toUint8Array()), ht(t);
  }
}
const Pt = (n) => new Error(n), Nt = () => {
  throw Pt("Method unimplemented");
}, Rt = () => {
  throw Pt("Unexpected case");
}, Ms = Pt("Unexpected end of array"), Fs = Pt("Integer out of Range");
class zn {
  /**
   * @param {Uint8Array<Buf>} uint8Array Binary data to decode
   */
  constructor(t) {
    this.arr = t, this.pos = 0;
  }
}
const ne = (n) => new zn(n), Xo = (n) => n.pos !== n.arr.length, Qo = (n, t) => {
  const e = new Uint8Array(n.arr.buffer, n.pos + n.arr.byteOffset, t);
  return n.pos += t, e;
}, St = (n) => Qo(n, tt(n)), xe = (n) => n.arr[n.pos++], tt = (n) => {
  let t = 0, e = 1;
  const r = n.arr.length;
  for (; n.pos < r; ) {
    const s = n.arr[n.pos++];
    if (t = t + (s & oe) * e, e *= 128, s < It)
      return t;
    if (t > wn)
      throw Fs;
  }
  throw Ms;
}, Dr = (n) => {
  let t = n.arr[n.pos++], e = t & or, r = 64;
  const s = (t & Zt) > 0 ? -1 : 1;
  if ((t & It) === 0)
    return s * e;
  const i = n.arr.length;
  for (; n.pos < i; ) {
    if (t = n.arr[n.pos++], e = e + (t & oe) * r, r *= 128, t < It)
      return s * e;
    if (e > wn)
      throw Fs;
  }
  throw Ms;
}, ta = (n) => {
  let t = tt(n);
  if (t === 0)
    return "";
  {
    let e = String.fromCodePoint(xe(n));
    if (--t < 100)
      for (; t--; )
        e += String.fromCodePoint(xe(n));
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
}, ea = (n) => (
  /** @type any */
  Me.decode(St(n))
), Xt = Me ? ea : ta, Ir = (n, t) => {
  const e = new DataView(n.arr.buffer, n.arr.byteOffset + n.pos, t);
  return n.pos += t, e;
}, na = (n) => Ir(n, 4).getFloat32(0, !1), ra = (n) => Ir(n, 8).getFloat64(0, !1), sa = (n) => (
  /** @type {any} */
  Ir(n, 8).getBigInt64(0, !1)
), ia = [
  (n) => {
  },
  // CASE 127: undefined
  (n) => null,
  // CASE 126: null
  Dr,
  // CASE 125: integer
  na,
  // CASE 124: float32
  ra,
  // CASE 123: float64
  sa,
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
], We = (n) => ia[127 - xe(n)](n);
class ds extends zn {
  /**
   * @param {Uint8Array} uint8Array
   * @param {function(Decoder):T} reader
   */
  constructor(t, e) {
    super(t), this.reader = e, this.s = null, this.count = 0;
  }
  read() {
    return this.count === 0 && (this.s = this.reader(this), Xo(this) ? this.count = tt(this) + 1 : this.count = -1), this.count--, /** @type {T} */
    this.s;
  }
}
class pn extends zn {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    super(t), this.s = 0, this.count = 0;
  }
  read() {
    if (this.count === 0) {
      this.s = Dr(this);
      const t = Us(this.s);
      this.count = 1, t && (this.s = -this.s, this.count = tt(this) + 2);
    }
    return this.count--, /** @type {number} */
    this.s;
  }
}
class Kn extends zn {
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
      const t = Dr(this), e = t & 1;
      this.diff = Ut(t / 2), this.count = 1, e && (this.count = tt(this) + 2);
    }
    return this.s += this.diff, this.count--, this.s;
  }
}
class oa {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor(t) {
    this.decoder = new pn(t), this.str = Xt(this.decoder), this.spos = 0;
  }
  /**
   * @return {string}
   */
  read() {
    const t = this.spos + this.decoder.read(), e = this.str.slice(this.spos, t);
    return this.spos = t, e;
  }
}
const aa = crypto.getRandomValues.bind(crypto), Ps = () => aa(new Uint32Array(1))[0], la = "10000000-1000-4000-8000" + -1e11, ca = () => la.replace(
  /[018]/g,
  /** @param {number} c */
  (n) => (n ^ Ps() & 15 >> n / 4).toString(16)
), te = Date.now, fs = (n) => (
  /** @type {Promise<T>} */
  new Promise(n)
);
Promise.all.bind(Promise);
const ps = (n) => n === void 0 ? null : n;
class ha {
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
let js = new ha(), Tr = !0;
try {
  typeof localStorage < "u" && localStorage && (js = localStorage, Tr = !1);
} catch {
}
const $s = js, ua = (n) => Tr || addEventListener(
  "storage",
  /** @type {any} */
  n
), da = (n) => Tr || removeEventListener(
  "storage",
  /** @type {any} */
  n
), He = /* @__PURE__ */ Symbol("Equality"), Ws = (n, t) => n === t || !!n?.[He]?.(t) || !1, fa = (n) => typeof n == "object", pa = Object.assign, ga = Object.keys, ma = (n, t) => {
  for (const e in n)
    t(n[e], e);
}, wa = (n, t) => {
  const e = [];
  for (const r in n)
    e.push(t(n[r], r));
  return e;
}, _n = (n) => ga(n).length, _a = (n) => {
  for (const t in n)
    return !1;
  return !0;
}, Je = (n, t) => {
  for (const e in n)
    if (!t(n[e], e))
      return !1;
  return !0;
}, Or = (n, t) => Object.prototype.hasOwnProperty.call(n, t), ya = (n, t) => n === t || _n(n) === _n(t) && Je(n, (e, r) => (e !== void 0 || Or(t, r)) && Ws(t[r], e)), ba = Object.freeze, Hs = (n) => {
  for (const t in n) {
    const e = n[t];
    (typeof e == "object" || typeof e == "function") && Hs(n[t]);
  }
  return ba(n);
}, zr = (n, t, e = 0) => {
  try {
    for (; e < n.length; e++)
      n[e](...t);
  } finally {
    e < n.length && zr(n, t, e + 1);
  }
}, ka = (n) => n, _e = (n, t) => {
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
        if (!t.has(e) || !_e(n.get(e), t.get(e)))
          return !1;
      break;
    }
    case void 0:
    case Object:
      if (_n(n) !== _n(t))
        return !1;
      for (const e in n)
        if (!Or(n, e) || !_e(n[e], t[e]))
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
}, va = (n, t) => t.includes(n), ee = typeof process < "u" && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process < "u" ? process : 0) === "[object process]", Vs = typeof window < "u" && typeof document < "u" && !ee;
let Ft;
const Sa = () => {
  if (Ft === void 0)
    if (ee) {
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
        Ft.set(`--${as(t, "-")}`, e), Ft.set(`-${as(t, "-")}`, e);
      }
    })) : Ft = Dt();
  return Ft;
}, cr = (n) => Sa().has(n), yn = (n) => ps(ee ? process.env[n.toUpperCase().replaceAll("-", "_")] : $s.getItem(n)), Zs = (n) => cr("--" + n) || yn(n) !== null, xa = Zs("production"), Ca = ee && va(process.env.FORCE_COLOR, ["true", "1", "2"]), Ea = Ca || !cr("--no-colors") && // @todo deprecate --no-colors
!Zs("no-color") && (!ee || process.stdout.isTTY) && (!ee || cr("--color") || yn("COLORTERM") !== null || (yn("TERM") || "").includes("color")), Ys = (n) => new Uint8Array(n), Aa = (n, t, e) => new Uint8Array(n, t, e), Da = (n) => new Uint8Array(n), Ia = (n) => {
  let t = "";
  for (let e = 0; e < n.byteLength; e++)
    t += Bs(n[e]);
  return btoa(t);
}, Ta = (n) => Buffer.from(n.buffer, n.byteOffset, n.byteLength).toString("base64"), Oa = (n) => {
  const t = atob(n), e = Ys(t.length);
  for (let r = 0; r < t.length; r++)
    e[r] = t.charCodeAt(r);
  return e;
}, za = (n) => {
  const t = Buffer.from(n, "base64");
  return Aa(t.buffer, t.byteOffset, t.byteLength);
}, Ra = Vs ? Ia : Ta, La = Vs ? Oa : za, Na = (n) => {
  const t = Ys(n.byteLength);
  return t.set(n), t;
};
class Ua {
  /**
   * @param {L} left
   * @param {R} right
   */
  constructor(t, e) {
    this.left = t, this.right = e;
  }
}
const Vt = (n, t) => new Ua(n, t), gs = (n) => n.next() >= 0.5, qn = (n, t, e) => Ut(n.next() * (e + 1 - t) + t), Gs = (n, t, e) => Ut(n.next() * (e + 1 - t) + t), Rr = (n, t, e) => Gs(n, t, e), Ba = (n) => Bs(Rr(n, 97, 122)), Ma = (n, t = 0, e = 20) => {
  const r = Rr(n, t, e);
  let s = "";
  for (let i = 0; i < r; i++)
    s += Ba(n);
  return s;
}, Jn = (n, t) => t[Rr(n, 0, t.length - 1)], Fa = /* @__PURE__ */ Symbol("0schema");
class Pa {
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
      t.push($o(" ", (this._rerrs.length - e) * 2) + `${r.path != null ? `[${r.path}] ` : ""}${r.has} doesn't match ${r.expected}. ${r.message}`);
    }
    return t.join(`
`);
  }
}
const hr = (n, t) => n === t ? !0 : n == null || t == null || n.constructor !== t.constructor ? !1 : n[He] ? Ws(n, t) : Se(n) ? kr(
  n,
  (e) => vr(t, (r) => hr(e, r))
) : fa(n) ? Je(
  n,
  (e, r) => hr(e, t[r])
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
      this.constructor._dilutes && ([r, e] = [e, r]), hr(e, r)
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
  [Fa]() {
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
    return Te(this, Bn);
  }
  /**
   * @type {$Optional<Schema<T>>}
   */
  get optional() {
    return new Js(
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
    return ms(t, this), /** @type {any} */
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
    return ms(t, this), t;
  }
}
class Lr extends Et {
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
const gt = (n, t = null) => new Lr(n, t);
gt(Lr);
class Nr extends Et {
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
const kt = (n) => new Nr(n);
gt(Nr);
class Rn extends Et {
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
const Ln = (...n) => new Rn(n), Ks = gt(Rn), ja = (
  /** @type {any} */
  RegExp.escape || /** @type {(str:string) => string} */
  ((n) => n.replace(/[().|&,$^[\]]/g, (t) => "\\" + t))
), qs = (n) => {
  if (Ce.check(n))
    return [ja(n)];
  if (Ks.check(n))
    return (
      /** @type {Array<string|number>} */
      n.shape.map((t) => t + "")
    );
  if (oi.check(n))
    return ["[+-]?\\d+.?\\d*"];
  if (ai.check(n))
    return [".*"];
  if (bn.check(n))
    return n.shape.map(qs).flat(1);
  Rt();
};
class $a extends Et {
  /**
   * @param {T} shape
   */
  constructor(t) {
    super(), this.shape = t, this._r = new RegExp("^" + t.map(qs).map((e) => `(${e.join("|")})`).join("") + "$");
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
gt($a);
const Wa = /* @__PURE__ */ Symbol("optional");
class Js extends Et {
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
  get [Wa]() {
    return !0;
  }
}
const Ha = gt(Js);
class Va extends Et {
  /**
   * @param {any} _o
   * @param {ValidationError} [err]
   * @return {_o is never}
   */
  check(t, e) {
    return e?.extend(null, "never", typeof t), !1;
  }
}
gt(Va);
class Nn extends Et {
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
    return new Nn(this.shape, !0);
  }
  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is $ObjectToType<S>}
   */
  check(t, e) {
    return t == null ? (e?.extend(null, "object", "null"), !1) : Je(this.shape, (r, s) => {
      const i = this._isPartial && !Or(t, s) || r.check(t[s], e);
      return !i && e?.extend(s.toString(), r.toString(), typeof t[s], "Object property does not match"), i;
    });
  }
}
const Za = (n) => (
  /** @type {any} */
  new Nn(n)
), Ya = gt(Nn), Ga = kt((n) => n != null && (n.constructor === Object || n.constructor == null));
class Xs extends Et {
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
const Qs = (n, t) => new Xs(n, t), Ka = gt(Xs);
class ti extends Et {
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
const qa = (...n) => new ti(n);
gt(ti);
class ei extends Et {
  /**
   * @param {Array<S>} v
   */
  constructor(t) {
    super(), this.shape = t.length === 1 ? t[0] : new Ur(t);
  }
  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is Array<S extends Schema<infer T> ? T : never>} o
   */
  check(t, e) {
    const r = Se(t) && kr(t, (s) => this.shape.check(s));
    return !r && e?.extend(null, "Array", ""), r;
  }
}
const ni = (...n) => new ei(n), Ja = gt(ei), Xa = kt((n) => Se(n));
class ri extends Et {
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
const Qa = (n, t = null) => new ri(n, t);
gt(ri);
const tl = Qa(Et);
class el extends Et {
  /**
   * @param {Args} args
   */
  constructor(t) {
    super(), this.len = t.length - 1, this.args = qa(...t.slice(-1)), this.res = t[this.len];
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
const nl = gt(el), rl = kt((n) => typeof n == "function");
class sl extends Et {
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
    const r = kr(this.shape, (s) => s.check(t, e));
    return !r && e?.extend(null, "Intersectinon", typeof t), r;
  }
}
gt(sl, (n) => n.shape.length > 0);
class Ur extends Et {
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
    const r = vr(this.shape, (s) => s.check(t, e));
    return e?.extend(null, "Union", typeof t), r;
  }
}
const Te = (...n) => n.findIndex((t) => bn.check(t)) >= 0 ? Te(...n.map((t) => Ve(t)).map((t) => bn.check(t) ? t.shape : [t]).flat(1)) : n.length === 1 ? n[0] : new Ur(n), bn = (
  /** @type {Schema<$Union<any>>} */
  gt(Ur)
), si = () => !0, kn = kt(si), il = (
  /** @type {Schema<Schema<any>>} */
  gt(Nr, (n) => n.shape === si)
), Br = kt((n) => typeof n == "bigint"), ol = (
  /** @type {Schema<Schema<BigInt>>} */
  kt((n) => n === Br)
), ii = kt((n) => typeof n == "symbol");
kt((n) => n === ii);
const ye = kt((n) => typeof n == "number"), oi = (
  /** @type {Schema<Schema<number>>} */
  kt((n) => n === ye)
), Ce = kt((n) => typeof n == "string"), ai = (
  /** @type {Schema<Schema<string>>} */
  kt((n) => n === Ce)
), Un = kt((n) => typeof n == "boolean"), al = (
  /** @type {Schema<Schema<Boolean>>} */
  kt((n) => n === Un)
), li = Ln(void 0);
gt(Rn, (n) => n.shape.length === 1 && n.shape[0] === void 0);
Ln(void 0);
const Bn = Ln(null), ll = (
  /** @type {Schema<Schema<null>>} */
  gt(Rn, (n) => n.shape.length === 1 && n.shape[0] === null)
);
gt(Uint8Array);
gt(Lr, (n) => n.shape === Uint8Array);
const cl = Te(ye, Ce, Bn, li, Br, Un, ii);
(() => {
  const n = (
    /** @type {$Array<$any>} */
    ni(kn)
  ), t = (
    /** @type {$Record<$string,$any>} */
    Qs(Ce, kn)
  ), e = Te(ye, Ce, Bn, Un, n, t);
  return n.shape = e, t.shape.values = e, e;
})();
const Ve = (n) => {
  if (tl.check(n))
    return (
      /** @type {any} */
      n
    );
  if (Ga.check(n)) {
    const t = {};
    for (const e in n)
      t[e] = Ve(n[e]);
    return (
      /** @type {any} */
      Za(t)
    );
  } else {
    if (Xa.check(n))
      return (
        /** @type {any} */
        Te(...n.map(Ve))
      );
    if (cl.check(n))
      return (
        /** @type {any} */
        Ln(n)
      );
    if (rl.check(n))
      return (
        /** @type {any} */
        gt(
          /** @type {any} */
          n
        )
      );
  }
  Rt();
}, ms = xa ? () => {
} : (n, t) => {
  const e = new Pa();
  if (!t.check(n, e))
    throw Pt(`Expected value to be of type ${t.constructor.name}.
${e.toString()}`);
};
class hl {
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
    return this.if(kn, t);
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
const ul = (n) => new hl(
  /** @type {any} */
  n
), ci = (
  /** @type {any} */
  ul(
    /** @type {Schema<prng.PRNG>} */
    kn
  ).if(oi, (n, t) => qn(t, os, wn)).if(ai, (n, t) => Ma(t)).if(al, (n, t) => gs(t)).if(ol, (n, t) => BigInt(qn(t, os, wn))).if(bn, (n, t) => ge(t, Jn(t, n.shape))).if(Ya, (n, t) => {
    const e = {};
    for (const r in n.shape) {
      let s = n.shape[r];
      if (Ha.check(s)) {
        if (gs(t))
          continue;
        s = s.shape;
      }
      e[r] = ci(s, t);
    }
    return e;
  }).if(Ja, (n, t) => {
    const e = [], r = Gs(t, 0, 42);
    for (let s = 0; s < r; s++)
      e.push(ge(t, n.shape));
    return e;
  }).if(Ks, (n, t) => Jn(t, n.shape)).if(ll, (n, t) => null).if(nl, (n, t) => {
    const e = ge(t, n.res);
    return () => e;
  }).if(il, (n, t) => ge(t, Jn(t, [
    ye,
    Ce,
    Bn,
    li,
    Br,
    Un,
    ni(ye),
    Qs(Te("a", "b", "c"), ye)
  ]))).if(Ka, (n, t) => {
    const e = {}, r = qn(t, 0, 3);
    for (let s = 0; s < r; s++) {
      const i = ge(t, n.shape.keys), o = ge(t, n.shape.values);
      e[i] = o;
    }
    return e;
  }).done()
), ge = (n, t) => (
  /** @type {any} */
  ci(Ve(t), n)
), Mn = (
  /** @type {Document} */
  typeof document < "u" ? document : {}
);
kt((n) => n.nodeType === ml);
typeof DOMParser < "u" && new DOMParser();
kt((n) => n.nodeType === fl);
kt((n) => n.nodeType === pl);
const dl = (n) => Ao(n, (t, e) => `${e}:${t};`).join(""), fl = Mn.ELEMENT_NODE, pl = Mn.TEXT_NODE, gl = Mn.DOCUMENT_NODE, ml = Mn.DOCUMENT_FRAGMENT_NODE;
kt((n) => n.nodeType === gl);
const Gt = Symbol, hi = Gt(), ui = Gt(), wl = Gt(), _l = Gt(), yl = Gt(), di = Gt(), bl = Gt(), Mr = Gt(), kl = Gt(), vl = (n) => {
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
}, Sl = {
  [hi]: Vt("font-weight", "bold"),
  [ui]: Vt("font-weight", "normal"),
  [wl]: Vt("color", "blue"),
  [yl]: Vt("color", "green"),
  [_l]: Vt("color", "grey"),
  [di]: Vt("color", "red"),
  [bl]: Vt("color", "purple"),
  [Mr]: Vt("color", "orange"),
  // not well supported in chrome when debugging node with inspector - TODO: deprecate
  [kl]: Vt("color", "black")
}, xl = (n) => {
  n.length === 1 && n[0]?.constructor === Function && (n = /** @type {Array<string|Symbol|Object|number>} */
  /** @type {[function]} */
  n[0]());
  const t = [], e = [], r = Dt();
  let s = [], i = 0;
  for (; i < n.length; i++) {
    const o = n[i], a = Sl[o];
    if (a !== void 0)
      r.set(a.left, a.right);
    else {
      if (o === void 0)
        break;
      if (o.constructor === String || o.constructor === Number) {
        const l = dl(r);
        i > 0 || l.length > 0 ? (t.push("%c" + o), e.push(l)) : t.push(o);
      } else
        break;
    }
  }
  for (i > 0 && (s = e, s.unshift(t.join(""))); i < n.length; i++) {
    const o = n[i];
    o instanceof Symbol || s.push(o);
  }
  return s;
}, fi = Ea ? xl : vl, Cl = (...n) => {
  console.log(...fi(n)), gi.forEach((t) => t.print(n));
}, pi = (...n) => {
  console.warn(...fi(n)), n.unshift(Mr), gi.forEach((t) => t.print(n));
}, gi = Qt(), mi = (n) => ({
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator]() {
    return this;
  },
  // @ts-ignore
  next: n
}), El = (n, t) => mi(() => {
  let e;
  do
    e = n.next();
  while (!e.done && !t(e.value));
  return e;
}), Xn = (n, t) => mi(() => {
  const { done: e, value: r } = n.next();
  return { done: e, value: e ? void 0 : t(r) };
});
class Fn {
  /**
   * @param {number} clock
   * @param {number} len
   */
  constructor(t, e) {
    this.clock = t, this.len = e;
  }
}
class Oe {
  constructor() {
    this.clients = /* @__PURE__ */ new Map();
  }
}
const Ee = (n, t, e) => t.clients.forEach((r, s) => {
  const i = (
    /** @type {Array<GC|Item>} */
    n.doc.store.clients.get(s)
  );
  if (i != null) {
    const o = i[i.length - 1], a = o.id.clock + o.length;
    for (let l = 0, d = r[l]; l < r.length && d.clock < a; d = r[++l])
      Di(n, i, d.clock, d.len, e);
  }
}), Al = (n, t) => {
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
}, Xe = (n, t) => {
  const e = n.clients.get(t.client);
  return e !== void 0 && Al(e, t.clock) !== null;
}, Fr = (n) => {
  n.clients.forEach((t) => {
    t.sort((s, i) => s.clock - i.clock);
    let e, r;
    for (e = 1, r = 1; e < t.length; e++) {
      const s = t[r - 1], i = t[e];
      s.clock + s.len >= i.clock ? t[r - 1] = new Fn(s.clock, de(s.len, i.clock + i.len - s.clock)) : (r < e && (t[r] = i), r++);
    }
    t.length = r;
  });
}, ur = (n) => {
  const t = new Oe();
  for (let e = 0; e < n.length; e++)
    n[e].clients.forEach((r, s) => {
      if (!t.clients.has(s)) {
        const i = r.slice();
        for (let o = e + 1; o < n.length; o++)
          Io(i, n[o].clients.get(s) || []);
        t.clients.set(s, i);
      }
    });
  return Fr(t), t;
}, Ze = (n, t, e, r) => {
  Wt(n.clients, t, () => (
    /** @type {Array<DeleteItem>} */
    []
  )).push(new Fn(e, r));
}, Dl = () => new Oe(), Il = (n) => {
  const t = Dl();
  return n.clients.forEach((e, r) => {
    const s = [];
    for (let i = 0; i < e.length; i++) {
      const o = e[i];
      if (o.deleted) {
        const a = o.id.clock;
        let l = o.length;
        if (i + 1 < e.length)
          for (let d = e[i + 1]; i + 1 < e.length && d.deleted; d = e[++i + 1])
            l += d.length;
        s.push(new Fn(a, l));
      }
    }
    s.length > 0 && t.clients.set(r, s);
  }), t;
}, ze = (n, t) => {
  K(n.restEncoder, t.clients.size), Yt(t.clients.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
    n.resetDsCurVal(), K(n.restEncoder, e);
    const s = r.length;
    K(n.restEncoder, s);
    for (let i = 0; i < s; i++) {
      const o = r[i];
      n.writeDsClock(o.clock), n.writeDsLen(o.len);
    }
  });
}, Pr = (n) => {
  const t = new Oe(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    n.resetDsCurVal();
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    if (i > 0) {
      const o = Wt(t.clients, s, () => (
        /** @type {Array<DeleteItem>} */
        []
      ));
      for (let a = 0; a < i; a++)
        o.push(new Fn(n.readDsClock(), n.readDsLen()));
    }
  }
  return t;
}, ws = (n, t, e) => {
  const r = new Oe(), s = tt(n.restDecoder);
  for (let i = 0; i < s; i++) {
    n.resetDsCurVal();
    const o = tt(n.restDecoder), a = tt(n.restDecoder), l = e.clients.get(o) || [], d = mt(e, o);
    for (let f = 0; f < a; f++) {
      const u = n.readDsClock(), m = u + n.readDsLen();
      if (u < d) {
        d < m && Ze(r, o, d, m - d);
        let h = jt(l, u), w = l[h];
        for (!w.deleted && w.id.clock < u && (l.splice(h + 1, 0, In(t, w, u - w.id.clock)), h++); h < l.length && (w = l[h++], w.id.clock < m); )
          w.deleted || (m < w.id.clock + w.length && l.splice(h, 0, In(t, w, m - w.id.clock)), w.delete(t));
      } else
        Ze(r, o, u, m - u);
    }
  }
  if (r.clients.size > 0) {
    const i = new le();
    return K(i.restEncoder, 0), ze(i, r), i.toUint8Array();
  }
  return null;
}, wi = Ps;
class fe extends Sr {
  /**
   * @param {DocOpts} opts configuration
   */
  constructor({ guid: t = ca(), collectionid: e = null, gc: r = !0, gcFilter: s = () => !0, meta: i = null, autoLoad: o = !1, shouldLoad: a = !0 } = {}) {
    super(), this.gc = r, this.gcFilter = s, this.clientID = wi(), this.guid = t, this.collectionid = e, this.share = /* @__PURE__ */ new Map(), this.store = new Ei(), this._transaction = null, this._transactionCleanups = [], this.subdocs = /* @__PURE__ */ new Set(), this._item = null, this.shouldLoad = a, this.autoLoad = o, this.meta = i, this.isLoaded = !1, this.isSynced = !1, this.isDestroyed = !1, this.whenLoaded = fs((d) => {
      this.on("load", () => {
        this.isLoaded = !0, d(this);
      });
    });
    const l = () => fs((d) => {
      const f = (u) => {
        (u === void 0 || u === !0) && (this.off("sync", f), d());
      };
      this.on("sync", f);
    });
    this.on("sync", (d) => {
      d === !1 && this.isSynced && (this.whenSynced = l()), this.isSynced = d === void 0 || d === !0, this.isSynced && !this.isLoaded && this.emit("load", [this]);
    }), this.whenSynced = l();
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
      this.get(t, ke)
    );
  }
  /**
   * @param {string} [name]
   * @return {YText}
   *
   * @public
   */
  getText(t = "") {
    return this.get(t, ce);
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
      this.get(t, De)
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
    this.isDestroyed = !0, Yt(this.subdocs).forEach((e) => e.destroy());
    const t = this._item;
    if (t !== null) {
      this._item = null;
      const e = (
        /** @type {ContentDoc} */
        t.content
      );
      e.doc = new fe({ guid: this.guid, ...e.opts, shouldLoad: !1 }), e.doc._item = t, at(
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
class _i {
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
class yi extends _i {
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
    return xe(this.restDecoder);
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
    return Na(St(this.restDecoder));
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
class Tl {
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
class Ae extends Tl {
  /**
   * @param {decoding.Decoder} decoder
   */
  constructor(t) {
    super(t), this.keys = [], tt(t), this.keyClockDecoder = new Kn(St(t)), this.clientDecoder = new pn(St(t)), this.leftClockDecoder = new Kn(St(t)), this.rightClockDecoder = new Kn(St(t)), this.infoDecoder = new ds(St(t), xe), this.stringDecoder = new oa(St(t)), this.parentInfoDecoder = new ds(St(t), xe), this.typeRefDecoder = new pn(St(t)), this.lenDecoder = new pn(St(t));
  }
  /**
   * @return {ID}
   */
  readLeftID() {
    return new be(this.clientDecoder.read(), this.leftClockDecoder.read());
  }
  /**
   * @return {ID}
   */
  readRightID() {
    return new be(this.clientDecoder.read(), this.rightClockDecoder.read());
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
class bi {
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
    K(this.restEncoder, t);
  }
  /**
   * @param {number} len
   */
  writeDsLen(t) {
    K(this.restEncoder, t);
  }
}
class Qe extends bi {
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
    ar(this.restEncoder, t);
  }
  /**
   * @param {string} s
   */
  writeString(t) {
    ae(this.restEncoder, t);
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
    ae(this.restEncoder, JSON.stringify(t));
  }
  /**
   * @param {string} key
   */
  writeKey(t) {
    ae(this.restEncoder, t);
  }
}
class ki {
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
    this.dsCurrVal = t, K(this.restEncoder, e);
  }
  /**
   * @param {number} len
   */
  writeDsLen(t) {
    t === 0 && Rt(), K(this.restEncoder, t - 1), this.dsCurrVal += t;
  }
}
class le extends ki {
  constructor() {
    super(), this.keyMap = /* @__PURE__ */ new Map(), this.keyClock = 0, this.keyClockEncoder = new Gn(), this.clientEncoder = new fn(), this.leftClockEncoder = new Gn(), this.rightClockEncoder = new Gn(), this.infoEncoder = new cs(ar), this.stringEncoder = new Jo(), this.parentInfoEncoder = new cs(ar), this.typeRefEncoder = new fn(), this.lenEncoder = new fn();
  }
  toUint8Array() {
    const t = xt();
    return K(t, 0), pt(t, this.keyClockEncoder.toUint8Array()), pt(t, this.clientEncoder.toUint8Array()), pt(t, this.leftClockEncoder.toUint8Array()), pt(t, this.rightClockEncoder.toUint8Array()), pt(t, ht(this.infoEncoder)), pt(t, this.stringEncoder.toUint8Array()), pt(t, ht(this.parentInfoEncoder)), pt(t, this.typeRefEncoder.toUint8Array()), pt(t, this.lenEncoder.toUint8Array()), On(t, ht(this.restEncoder)), ht(t);
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
const Ol = (n, t, e, r) => {
  r = de(r, t[0].id.clock);
  const s = jt(t, r);
  K(n.restEncoder, t.length - s), n.writeClient(e), K(n.restEncoder, r);
  const i = t[s];
  i.write(n, r - i.id.clock);
  for (let o = s + 1; o < t.length; o++)
    t[o].write(n, 0);
}, jr = (n, t, e) => {
  const r = /* @__PURE__ */ new Map();
  e.forEach((s, i) => {
    mt(t, i) > s && r.set(i, s);
  }), Pn(t).forEach((s, i) => {
    e.has(i) || r.set(i, 0);
  }), K(n.restEncoder, r.size), Yt(r.entries()).sort((s, i) => i[0] - s[0]).forEach(([s, i]) => {
    Ol(
      n,
      /** @type {Array<GC|Item>} */
      t.clients.get(s),
      s,
      i
    );
  });
}, zl = (n, t) => {
  const e = Dt(), r = tt(n.restDecoder);
  for (let s = 0; s < r; s++) {
    const i = tt(n.restDecoder), o = new Array(i), a = n.readClient();
    let l = tt(n.restDecoder);
    e.set(a, { i: 0, refs: o });
    for (let d = 0; d < i; d++) {
      const f = n.readInfo();
      switch (Tn & f) {
        case 0: {
          const u = n.readLen();
          o[d] = new Ot(rt(a, l), u), l += u;
          break;
        }
        case 10: {
          const u = tt(n.restDecoder);
          o[d] = new zt(rt(a, l), u), l += u;
          break;
        }
        default: {
          const u = (f & (Zt | It)) === 0, m = new ct(
            rt(a, l),
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
            Gi(n, f)
            // item content
          );
          o[d] = m, l += m.length;
        }
      }
    }
  }
  return e;
}, Rl = (n, t, e) => {
  const r = [];
  let s = Yt(e.keys()).sort((h, w) => h - w);
  if (s.length === 0)
    return null;
  const i = () => {
    if (s.length === 0)
      return null;
    let h = (
      /** @type {{i:number,refs:Array<GC|Item>}} */
      e.get(s[s.length - 1])
    );
    for (; h.refs.length === h.i; )
      if (s.pop(), s.length > 0)
        h = /** @type {{i:number,refs:Array<GC|Item>}} */
        e.get(s[s.length - 1]);
      else
        return null;
    return h;
  };
  let o = i();
  if (o === null)
    return null;
  const a = new Ei(), l = /* @__PURE__ */ new Map(), d = (h, w) => {
    const g = l.get(h);
    (g == null || g > w) && l.set(h, w);
  };
  let f = (
    /** @type {any} */
    o.refs[
      /** @type {any} */
      o.i++
    ]
  );
  const u = /* @__PURE__ */ new Map(), m = () => {
    for (const h of r) {
      const w = h.id.client, g = e.get(w);
      g ? (g.i--, a.clients.set(w, g.refs.slice(g.i)), e.delete(w), g.i = 0, g.refs = []) : a.clients.set(w, [h]), s = s.filter((y) => y !== w);
    }
    r.length = 0;
  };
  for (; ; ) {
    if (f.constructor !== zt) {
      const w = Wt(u, f.id.client, () => mt(t, f.id.client)) - f.id.clock;
      if (w < 0)
        r.push(f), d(f.id.client, f.id.clock - 1), m();
      else {
        const g = f.getMissing(n, t);
        if (g !== null) {
          r.push(f);
          const y = e.get(
            /** @type {number} */
            g
          ) || { refs: [], i: 0 };
          if (y.refs.length === y.i)
            d(
              /** @type {number} */
              g,
              mt(t, g)
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
    const h = new le();
    return jr(h, a, /* @__PURE__ */ new Map()), K(h.restEncoder, 0), { missing: l, update: h.toUint8Array() };
  }
  return null;
}, Ll = (n, t) => jr(n, t.doc.store, t.beforeState), Nl = (n, t, e, r = new Ae(n)) => at(t, (s) => {
  s.local = !1;
  let i = !1;
  const o = s.doc, a = o.store, l = zl(r, o), d = Rl(s, a, l), f = a.pendingStructs;
  if (f) {
    for (const [m, h] of f.missing)
      if (h < mt(a, m)) {
        i = !0;
        break;
      }
    if (d) {
      for (const [m, h] of d.missing) {
        const w = f.missing.get(m);
        (w == null || w > h) && f.missing.set(m, h);
      }
      f.update = Sn([f.update, d.update]);
    }
  } else
    a.pendingStructs = d;
  const u = ws(r, s, a);
  if (a.pendingDs) {
    const m = new Ae(ne(a.pendingDs));
    tt(m.restDecoder);
    const h = ws(m, s, a);
    u && h ? a.pendingDs = Sn([u, h]) : a.pendingDs = u || h;
  } else
    a.pendingDs = u;
  if (i) {
    const m = (
      /** @type {{update: Uint8Array}} */
      a.pendingStructs.update
    );
    a.pendingStructs = null, vi(s.doc, m);
  }
}, e, !1), vi = (n, t, e, r = Ae) => {
  const s = ne(t);
  Nl(s, n, e, new r(s));
}, $r = (n, t, e) => vi(n, t, e, yi), Ul = (n, t, e = /* @__PURE__ */ new Map()) => {
  jr(n, t.store, e), ze(n, Il(t.store));
}, Bl = (n, t = new Uint8Array([0]), e = new le()) => {
  const r = Si(t);
  Ul(e, n, r);
  const s = [e.toUint8Array()];
  if (n.store.pendingDs && s.push(n.store.pendingDs), n.store.pendingStructs && s.push(tc(n.store.pendingStructs.update, t)), s.length > 1) {
    if (e.constructor === Qe)
      return Xl(s.map((i, o) => o === 0 ? i : nc(i)));
    if (e.constructor === le)
      return Sn(s);
  }
  return s[0];
}, Wr = (n, t) => Bl(n, t, new Qe()), Ml = (n) => {
  const t = /* @__PURE__ */ new Map(), e = tt(n.restDecoder);
  for (let r = 0; r < e; r++) {
    const s = tt(n.restDecoder), i = tt(n.restDecoder);
    t.set(s, i);
  }
  return t;
}, Si = (n) => Ml(new _i(ne(n))), xi = (n, t) => (K(n.restEncoder, t.size), Yt(t.entries()).sort((e, r) => r[0] - e[0]).forEach(([e, r]) => {
  K(n.restEncoder, e), K(n.restEncoder, r);
}), n), Fl = (n, t) => xi(n, Pn(t.store)), Pl = (n, t = new ki()) => (n instanceof Map ? xi(t, n) : Fl(t, n), t.toUint8Array()), jl = (n) => Pl(n, new bi());
class $l {
  constructor() {
    this.l = [];
  }
}
const _s = () => new $l(), ys = (n, t) => n.l.push(t), bs = (n, t) => {
  const e = n.l, r = e.length;
  n.l = e.filter((s) => t !== s), r === n.l.length && console.error("[yjs] Tried to remove event handler that doesn't exist.");
}, Ci = (n, t, e) => zr(n.l, [t, e]);
class be {
  /**
   * @param {number} client client id
   * @param {number} clock unique per client id, continuous number
   */
  constructor(t, e) {
    this.client = t, this.clock = e;
  }
}
const an = (n, t) => n === t || n !== null && t !== null && n.client === t.client && n.clock === t.clock, rt = (n, t) => new be(n, t), Wl = (n) => {
  for (const [t, e] of n.doc.share.entries())
    if (e === n)
      return t;
  throw Rt();
}, vn = (n, t) => {
  for (; t !== null; ) {
    if (t.parent === n)
      return !0;
    t = /** @type {AbstractType<any>} */
    t.parent._item;
  }
  return !1;
}, me = (n, t) => t === void 0 ? !n.deleted : t.sv.has(n.id.client) && (t.sv.get(n.id.client) || 0) > n.id.clock && !Xe(t.ds, n.id), dr = (n, t) => {
  const e = Wt(n.meta, dr, Qt), r = n.doc.store;
  e.has(t) || (t.sv.forEach((s, i) => {
    s < mt(r, i) && At(n, rt(i, s));
  }), Ee(n, t.ds, (s) => {
  }), e.add(t));
};
class Ei {
  constructor() {
    this.clients = /* @__PURE__ */ new Map(), this.pendingStructs = null, this.pendingDs = null;
  }
}
const Pn = (n) => {
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
}, Ai = (n, t) => {
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
}, Hl = (n, t) => {
  const e = n.clients.get(t.client);
  return e[jt(e, t.clock)];
}, gn = (
  /** @type {function(StructStore,ID):Item} */
  Hl
), fr = (n, t, e) => {
  const r = jt(t, e), s = t[r];
  return s.id.clock < e && s instanceof ct ? (t.splice(r + 1, 0, In(n, s, e - s.id.clock)), r + 1) : r;
}, At = (n, t) => {
  const e = (
    /** @type {Array<Item>} */
    n.doc.store.clients.get(t.client)
  );
  return e[fr(n, e, t.clock)];
}, ks = (n, t, e) => {
  const r = t.clients.get(e.client), s = jt(r, e.clock), i = r[s];
  return e.clock !== i.id.clock + i.length - 1 && i.constructor !== Ot && r.splice(s + 1, 0, In(n, i, e.clock - i.id.clock + 1)), i;
}, Vl = (n, t, e) => {
  const r = (
    /** @type {Array<GC|Item>} */
    n.clients.get(t.id.client)
  );
  r[jt(r, t.id.clock)] = e;
}, Di = (n, t, e, r, s) => {
  if (r === 0)
    return;
  const i = e + r;
  let o = fr(n, t, e), a;
  do
    a = t[o++], i < a.id.clock + a.length && fr(n, t, i), s(a);
  while (o < t.length && t[o].id.clock < i);
};
class Zl {
  /**
   * @param {Doc} doc
   * @param {any} origin
   * @param {boolean} local
   */
  constructor(t, e, r) {
    this.doc = t, this.deleteSet = new Oe(), this.beforeState = Pn(t.store), this.afterState = /* @__PURE__ */ new Map(), this.changed = /* @__PURE__ */ new Map(), this.changedParentTypes = /* @__PURE__ */ new Map(), this._mergeStructs = [], this.origin = e, this.meta = /* @__PURE__ */ new Map(), this.local = r, this.subdocsAdded = /* @__PURE__ */ new Set(), this.subdocsRemoved = /* @__PURE__ */ new Set(), this.subdocsLoaded = /* @__PURE__ */ new Set(), this._needFormattingCleanup = !1;
  }
}
const vs = (n, t) => t.deleteSet.clients.size === 0 && !Do(t.afterState, (e, r) => t.beforeState.get(r) !== e) ? !1 : (Fr(t.deleteSet), Ll(n, t), ze(n, t.deleteSet), !0), Ss = (n, t, e) => {
  const r = t._item;
  (r === null || r.id.clock < (n.beforeState.get(r.id.client) || 0) && !r.deleted) && Wt(n.changed, t, Qt).add(e);
}, mn = (n, t) => {
  let e = n[t], r = n[t - 1], s = t;
  for (; s > 0; e = r, r = n[--s - 1]) {
    if (r.deleted === e.deleted && r.constructor === e.constructor && r.mergeWith(e)) {
      e instanceof ct && e.parentSub !== null && /** @type {AbstractType<any>} */
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
}, Yl = (n, t, e) => {
  for (const [r, s] of n.clients.entries()) {
    const i = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let o = s.length - 1; o >= 0; o--) {
      const a = s[o], l = a.clock + a.len;
      for (let d = jt(i, a.clock), f = i[d]; d < i.length && f.id.clock < l; f = i[++d]) {
        const u = i[d];
        if (a.clock + a.len <= u.id.clock)
          break;
        u instanceof ct && u.deleted && !u.keep && e(u) && u.gc(t, !1);
      }
    }
  }
}, Gl = (n, t) => {
  n.clients.forEach((e, r) => {
    const s = (
      /** @type {Array<GC|Item>} */
      t.clients.get(r)
    );
    for (let i = e.length - 1; i >= 0; i--) {
      const o = e[i], a = xr(s.length - 1, 1 + jt(s, o.clock + o.len - 1));
      for (let l = a, d = s[l]; l > 0 && d.id.clock >= o.clock; d = s[l])
        l -= 1 + mn(s, l);
    }
  });
}, Ii = (n, t) => {
  if (t < n.length) {
    const e = n[t], r = e.doc, s = r.store, i = e.deleteSet, o = e._mergeStructs;
    try {
      Fr(i), e.afterState = Pn(e.doc.store), r.emit("beforeObserverCalls", [e, r]);
      const a = [];
      e.changed.forEach(
        (l, d) => a.push(() => {
          (d._item === null || !d._item.deleted) && d._callObserver(e, l);
        })
      ), a.push(() => {
        e.changedParentTypes.forEach((l, d) => {
          d._dEH.l.length > 0 && (d._item === null || !d._item.deleted) && (l = l.filter(
            (f) => f.target._item === null || !f.target._item.deleted
          ), l.forEach((f) => {
            f.currentTarget = d, f._path = null;
          }), l.sort((f, u) => f.path.length - u.path.length), a.push(() => {
            Ci(d._dEH, l, e);
          }));
        }), a.push(() => r.emit("afterTransaction", [e, r])), a.push(() => {
          e._needFormattingCleanup && mc(e);
        });
      }), zr(a, []);
    } finally {
      r.gc && Yl(i, s, r.gcFilter), Gl(i, s), e.afterState.forEach((f, u) => {
        const m = e.beforeState.get(u) || 0;
        if (m !== f) {
          const h = (
            /** @type {Array<GC|Item>} */
            s.clients.get(u)
          ), w = de(jt(h, m), 1);
          for (let g = h.length - 1; g >= w; )
            g -= 1 + mn(h, g);
        }
      });
      for (let f = o.length - 1; f >= 0; f--) {
        const { client: u, clock: m } = o[f].id, h = (
          /** @type {Array<GC|Item>} */
          s.clients.get(u)
        ), w = jt(h, m);
        w + 1 < h.length && mn(h, w + 1) > 1 || w > 0 && mn(h, w);
      }
      if (!e.local && e.afterState.get(r.clientID) !== e.beforeState.get(r.clientID) && (Cl(Mr, hi, "[yjs] ", ui, di, "Changed the client-id because another client seems to be using it."), r.clientID = wi()), r.emit("afterTransactionCleanup", [e, r]), r._observers.has("update")) {
        const f = new Qe();
        vs(f, e) && r.emit("update", [f.toUint8Array(), e.origin, r, e]);
      }
      if (r._observers.has("updateV2")) {
        const f = new le();
        vs(f, e) && r.emit("updateV2", [f.toUint8Array(), e.origin, r, e]);
      }
      const { subdocsAdded: a, subdocsLoaded: l, subdocsRemoved: d } = e;
      (a.size > 0 || d.size > 0 || l.size > 0) && (a.forEach((f) => {
        f.clientID = r.clientID, f.collectionid == null && (f.collectionid = r.collectionid), r.subdocs.add(f);
      }), d.forEach((f) => r.subdocs.delete(f)), r.emit("subdocs", [{ loaded: l, added: a, removed: d }, r, e]), d.forEach((f) => f.destroy())), n.length <= t + 1 ? (r._transactionCleanups = [], r.emit("afterAllTransactions", [r, n])) : Ii(n, t + 1);
    }
  }
}, at = (n, t, e = null, r = !0) => {
  const s = n._transactionCleanups;
  let i = !1, o = null;
  n._transaction === null && (i = !0, n._transaction = new Zl(n, e, r), s.push(n._transaction), s.length === 1 && n.emit("beforeAllTransactions", [n]), n.emit("beforeTransaction", [n._transaction, n]));
  try {
    o = t(n._transaction);
  } finally {
    if (i) {
      const a = n._transaction === s[0];
      n._transaction = null, a && Ii(s, 0);
    }
  }
  return o;
};
class Kl {
  /**
   * @param {DeleteSet} deletions
   * @param {DeleteSet} insertions
   */
  constructor(t, e) {
    this.insertions = e, this.deletions = t, this.meta = /* @__PURE__ */ new Map();
  }
}
const xs = (n, t, e) => {
  Ee(n, e.deletions, (r) => {
    r instanceof ct && t.scope.some((s) => s === n.doc || vn(
      /** @type {AbstractType<any>} */
      s,
      r
    )) && Jr(r, !1);
  });
}, Cs = (n, t, e) => {
  let r = null;
  const s = n.doc, i = n.scope;
  at(s, (a) => {
    for (; t.length > 0 && n.currStackItem === null; ) {
      const l = s.store, d = (
        /** @type {StackItem} */
        t.pop()
      ), f = /* @__PURE__ */ new Set(), u = [];
      let m = !1;
      Ee(a, d.insertions, (h) => {
        if (h instanceof ct) {
          if (h.redone !== null) {
            let { item: w, diff: g } = Wc(l, h.id);
            g > 0 && (w = At(a, rt(w.id.client, w.id.clock + g))), h = w;
          }
          !h.deleted && i.some((w) => w === a.doc || vn(
            /** @type {AbstractType<any>} */
            w,
            /** @type {Item} */
            h
          )) && u.push(h);
        }
      }), Ee(a, d.deletions, (h) => {
        h instanceof ct && i.some((w) => w === a.doc || vn(
          /** @type {AbstractType<any>} */
          w,
          h
        )) && // Never redo structs in stackItem.insertions because they were created and deleted in the same capture interval.
        !Xe(d.insertions, h.id) && f.add(h);
      }), f.forEach((h) => {
        m = Yi(a, h, f, d.insertions, n.ignoreRemoteMapChanges, n) !== null || m;
      });
      for (let h = u.length - 1; h >= 0; h--) {
        const w = u[h];
        n.deleteFilter(w) && (w.delete(a), m = !0);
      }
      n.currStackItem = m ? d : null;
    }
    a.changed.forEach((l, d) => {
      l.has(null) && d._searchMarker && (d._searchMarker.length = 0);
    }), r = a;
  }, n);
  const o = n.currStackItem;
  if (o != null) {
    const a = r.changedParentTypes;
    n.emit("stack-item-popped", [{ stackItem: o, type: e, changedParentTypes: a, origin: n }, n]), n.currStackItem = null;
  }
  return o;
};
class ql extends Sr {
  /**
   * @param {Doc|AbstractType<any>|Array<AbstractType<any>>} typeScope Limits the scope of the UndoManager. If this is set to a ydoc instance, all changes on that ydoc will be undone. If set to a specific type, only changes on that type or its children will be undone. Also accepts an array of types.
   * @param {UndoManagerOptions} options
   */
  constructor(t, {
    captureTimeout: e = 500,
    captureTransaction: r = (l) => !0,
    deleteFilter: s = () => !0,
    trackedOrigins: i = /* @__PURE__ */ new Set([null]),
    ignoreRemoteMapChanges: o = !1,
    doc: a = (
      /** @type {Doc} */
      Se(t) ? t[0].doc : t instanceof fe ? t : t.doc
    )
  } = {}) {
    super(), this.scope = [], this.doc = a, this.addToScope(t), this.deleteFilter = s, i.add(this), this.trackedOrigins = i, this.captureTransaction = r, this.undoStack = [], this.redoStack = [], this.undoing = !1, this.redoing = !1, this.currStackItem = null, this.lastChange = 0, this.ignoreRemoteMapChanges = o, this.captureTimeout = e, this.afterTransactionHandler = (l) => {
      if (!this.captureTransaction(l) || !this.scope.some((y) => l.changedParentTypes.has(
        /** @type {AbstractType<any>} */
        y
      ) || y === this.doc) || !this.trackedOrigins.has(l.origin) && (!l.origin || !this.trackedOrigins.has(l.origin.constructor)))
        return;
      const d = this.undoing, f = this.redoing, u = d ? this.redoStack : this.undoStack;
      d ? this.stopCapturing() : f || this.clear(!1, !0);
      const m = new Oe();
      l.afterState.forEach((y, _) => {
        const S = l.beforeState.get(_) || 0, C = y - S;
        C > 0 && Ze(m, _, S, C);
      });
      const h = te();
      let w = !1;
      if (this.lastChange > 0 && h - this.lastChange < this.captureTimeout && u.length > 0 && !d && !f) {
        const y = u[u.length - 1];
        y.deletions = ur([y.deletions, l.deleteSet]), y.insertions = ur([y.insertions, m]);
      } else
        u.push(new Kl(l.deleteSet, m)), w = !0;
      !d && !f && (this.lastChange = h), Ee(
        l,
        l.deleteSet,
        /** @param {Item|GC} item */
        (y) => {
          y instanceof ct && this.scope.some((_) => _ === l.doc || vn(
            /** @type {AbstractType<any>} */
            _,
            y
          )) && Jr(y, !0);
        }
      );
      const g = [{ stackItem: u[u.length - 1], origin: l.origin, type: d ? "redo" : "undo", changedParentTypes: l.changedParentTypes }, this];
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
    t = Se(t) ? t : [t], t.forEach((r) => {
      e.has(r) || (e.add(r), (r instanceof bt ? r.doc !== this.doc : r !== this.doc) && pi("[yjs#509] Not same Y.Doc"), this.scope.push(r));
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
      t && (this.undoStack.forEach((s) => xs(r, this, s)), this.undoStack = []), e && (this.redoStack.forEach((s) => xs(r, this, s)), this.redoStack = []), this.emit("stack-cleared", [{ undoStackCleared: t, redoStackCleared: e }]);
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
      t = Cs(this, this.undoStack, "undo");
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
      t = Cs(this, this.redoStack, "redo");
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
function* Jl(n) {
  const t = tt(n.restDecoder);
  for (let e = 0; e < t; e++) {
    const r = tt(n.restDecoder), s = n.readClient();
    let i = tt(n.restDecoder);
    for (let o = 0; o < r; o++) {
      const a = n.readInfo();
      if (a === 10) {
        const l = tt(n.restDecoder);
        yield new zt(rt(s, i), l), i += l;
      } else if ((Tn & a) !== 0) {
        const l = (a & (Zt | It)) === 0, d = new ct(
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
          l ? n.readParentInfo() ? n.readString() : n.readLeftID() : null,
          // parent
          l && (a & Pe) === Pe ? n.readString() : null,
          // parentSub
          Gi(n, a)
          // item content
        );
        yield d, i += d.length;
      } else {
        const l = n.readLen();
        yield new Ot(rt(s, i), l), i += l;
      }
    }
  }
}
class Hr {
  /**
   * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
   * @param {boolean} filterSkips
   */
  constructor(t, e) {
    this.gen = Jl(t), this.curr = null, this.done = !1, this.filterSkips = e, this.next();
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
class Vr {
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  constructor(t) {
    this.currClient = 0, this.startClock = 0, this.written = 0, this.encoder = t, this.clientStructs = [];
  }
}
const Xl = (n) => Sn(n, yi, Qe), Ql = (n, t) => {
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
    return new ct(
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
}, Sn = (n, t = Ae, e = le) => {
  if (n.length === 1)
    return n[0];
  const r = n.map((f) => new t(ne(f)));
  let s = r.map((f) => new Hr(f, !0)), i = null;
  const o = new e(), a = new Vr(o);
  for (; s = s.filter((m) => m.curr !== null), s.sort(
    /** @type {function(any,any):number} */
    (m, h) => {
      if (m.curr.id.client === h.curr.id.client) {
        const w = m.curr.id.clock - h.curr.id.clock;
        return w === 0 ? m.curr.constructor === h.curr.constructor ? 0 : m.curr.constructor === zt ? 1 : -1 : w;
      } else
        return h.curr.id.client - m.curr.id.client;
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
      ), h = !1;
      for (; m !== null && m.id.clock + m.length <= i.struct.id.clock + i.struct.length && m.id.client >= i.struct.id.client; )
        m = f.next(), h = !0;
      if (m === null || // current decoder is empty
      m.id.client !== u || // check whether there is another decoder that has has updates from `firstClient`
      h && m.id.clock > i.struct.id.clock + i.struct.length)
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
        w > 0 && (i.struct.constructor === zt ? i.struct.length -= w : m = Ql(m, w)), i.struct.mergeWith(
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
  i !== null && (qt(a, i.struct, i.offset), i = null), Zr(a);
  const l = r.map((f) => Pr(f)), d = ur(l);
  return ze(o, d), o.toUint8Array();
}, tc = (n, t, e = Ae, r = le) => {
  const s = Si(t), i = new r(), o = new Vr(i), a = new e(ne(n)), l = new Hr(a, !1);
  for (; l.curr; ) {
    const f = l.curr, u = f.id.client, m = s.get(u) || 0;
    if (l.curr.constructor === zt) {
      l.next();
      continue;
    }
    if (f.id.clock + f.length > m)
      for (qt(o, f, de(m - f.id.clock, 0)), l.next(); l.curr && l.curr.id.client === u; )
        qt(o, l.curr, 0), l.next();
    else
      for (; l.curr && l.curr.id.client === u && l.curr.id.clock + l.curr.length <= m; )
        l.next();
  }
  Zr(o);
  const d = Pr(a);
  return ze(i, d), i.toUint8Array();
}, Ti = (n) => {
  n.written > 0 && (n.clientStructs.push({ written: n.written, restEncoder: ht(n.encoder.restEncoder) }), n.encoder.restEncoder = xt(), n.written = 0);
}, qt = (n, t, e) => {
  n.written > 0 && n.currClient !== t.id.client && Ti(n), n.written === 0 && (n.currClient = t.id.client, n.encoder.writeClient(t.id.client), K(n.encoder.restEncoder, t.id.clock + e)), t.write(n.encoder, e), n.written++;
}, Zr = (n) => {
  Ti(n);
  const t = n.encoder.restEncoder;
  K(t, n.clientStructs.length);
  for (let e = 0; e < n.clientStructs.length; e++) {
    const r = n.clientStructs[e];
    K(t, r.written), On(t, r.restEncoder);
  }
}, ec = (n, t, e, r) => {
  const s = new e(ne(n)), i = new Hr(s, !1), o = new r(), a = new Vr(o);
  for (let d = i.curr; d !== null; d = i.next())
    qt(a, t(d), 0);
  Zr(a);
  const l = Pr(s);
  return ze(o, l), o.toUint8Array();
}, nc = (n) => ec(n, ka, Ae, Qe), Es = "You must not compute changes after the event-handler fired.";
class jn {
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
    return this._path || (this._path = rc(this.currentTarget, this.target));
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
    return Xe(this.transaction.deleteSet, t.id);
  }
  /**
   * @type {Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
   */
  get keys() {
    if (this._keys === null) {
      if (this.transaction.doc._transactionCleanups.length === 0)
        throw Pt(Es);
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
            let l = i.left;
            for (; l !== null && this.adds(l); )
              l = l.left;
            if (this.deletes(i))
              if (l !== null && this.deletes(l))
                o = "delete", a = Vn(l.content.getContent());
              else
                return;
            else
              l !== null && this.deletes(l) ? (o = "update", a = Vn(l.content.getContent())) : (o = "add", a = void 0);
          } else if (this.deletes(i))
            o = "delete", a = Vn(
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
        throw Pt(Es);
      const e = this.target, r = Qt(), s = Qt(), i = [];
      if (t = {
        added: r,
        deleted: s,
        delta: i,
        keys: this.keys
      }, /** @type Set<string|null> */
      this.transaction.changed.get(e).has(null)) {
        let a = null;
        const l = () => {
          a && i.push(a);
        };
        for (let d = e._start; d !== null; d = d.right)
          d.deleted ? this.deletes(d) && !this.adds(d) && ((a === null || a.delete === void 0) && (l(), a = { delete: 0 }), a.delete += d.length, s.add(d)) : this.adds(d) ? ((a === null || a.insert === void 0) && (l(), a = { insert: [] }), a.insert = a.insert.concat(d.content.getContent()), r.add(d)) : ((a === null || a.retain === void 0) && (l(), a = { retain: 0 }), a.retain += d.length);
        a !== null && a.retain === void 0 && l();
      }
      this._changes = t;
    }
    return (
      /** @type {any} */
      t
    );
  }
}
const rc = (n, t) => {
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
  pi("Invalid access: Add Yjs type to a document before reading data.");
}, Oi = 80;
let Yr = 0;
class sc {
  /**
   * @param {Item} p
   * @param {number} index
   */
  constructor(t, e) {
    t.marker = !0, this.p = t, this.index = e, this.timestamp = Yr++;
  }
}
const ic = (n) => {
  n.timestamp = Yr++;
}, zi = (n, t, e) => {
  n.p.marker = !1, n.p = t, t.marker = !0, n.index = e, n.timestamp = Yr++;
}, oc = (n, t, e) => {
  if (n.length >= Oi) {
    const r = n.reduce((s, i) => s.timestamp < i.timestamp ? s : i);
    return zi(r, t, e), r;
  } else {
    const r = new sc(t, e);
    return n.push(r), r;
  }
}, $n = (n, t) => {
  if (n._start === null || t === 0 || n._searchMarker === null)
    return null;
  const e = n._searchMarker.length === 0 ? null : n._searchMarker.reduce((i, o) => dn(t - i.index) < dn(t - o.index) ? i : o);
  let r = n._start, s = 0;
  for (e !== null && (r = e.p, s = e.index, ic(e)); r.right !== null && s < t; ) {
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
  return e !== null && dn(e.index - s) < /** @type {YText|YArray<any>} */
  r.parent.length / Oi ? (zi(e, r, s), e) : oc(n._searchMarker, r, s);
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
    (t < s.index || e > 0 && t === s.index) && (s.index = de(t, s.index + e));
  }
}, Wn = (n, t, e) => {
  const r = n, s = t.changedParentTypes;
  for (; Wt(s, n, () => []).push(e), n._item !== null; )
    n = /** @type {AbstractType<any>} */
    n._item.parent;
  Ci(r._eH, e, t);
};
class bt {
  constructor() {
    this._item = null, this._map = /* @__PURE__ */ new Map(), this._start = null, this.doc = null, this._length = 0, this._eH = _s(), this._dEH = _s(), this._searchMarker = null;
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
    ys(this._eH, t);
  }
  /**
   * Observe all events that are created by this type and its children.
   *
   * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
   */
  observeDeep(t) {
    ys(this._dEH, t);
  }
  /**
   * Unregister an observer function.
   *
   * @param {function(EventType,Transaction):void} f Observer function
   */
  unobserve(t) {
    bs(this._eH, t);
  }
  /**
   * Unregister an observer function.
   *
   * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
   */
  unobserveDeep(t) {
    bs(this._dEH, t);
  }
  /**
   * @abstract
   * @return {any}
   */
  toJSON() {
  }
}
const Ri = (n, t, e) => {
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
}, Li = (n) => {
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
}, Ni = (n, t) => {
  const e = [];
  return Ge(n, (r, s) => {
    e.push(t(r, s, n));
  }), e;
}, ac = (n) => {
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
}, Ui = (n, t) => {
  n.doc ?? Ct();
  const e = $n(n, t);
  let r = n._start;
  for (e !== null && (r = e.p, t -= e.index); r !== null; r = r.right)
    if (!r.deleted && r.countable) {
      if (t < r.length)
        return r.content.getContent()[t];
      t -= r.length;
    }
}, xn = (n, t, e, r) => {
  let s = e;
  const i = n.doc, o = i.clientID, a = i.store, l = e === null ? t._start : e.right;
  let d = [];
  const f = () => {
    d.length > 0 && (s = new ct(rt(o, mt(a, o)), s, s && s.lastId, l, l && l.id, t, null, new ue(d)), s.integrate(n, 0), d = []);
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
              s = new ct(rt(o, mt(a, o)), s, s && s.lastId, l, l && l.id, t, null, new tn(new Uint8Array(
                /** @type {Uint8Array} */
                u
              ))), s.integrate(n, 0);
              break;
            case fe:
              s = new ct(rt(o, mt(a, o)), s, s && s.lastId, l, l && l.id, t, null, new en(
                /** @type {Doc} */
                u
              )), s.integrate(n, 0);
              break;
            default:
              if (u instanceof bt)
                s = new ct(rt(o, mt(a, o)), s, s && s.lastId, l, l && l.id, t, null, new Kt(u)), s.integrate(n, 0);
              else
                throw new Error("Unexpected content type in insert operation");
          }
      }
  }), f();
}, Bi = () => Pt("Length exceeded!"), Mi = (n, t, e, r) => {
  if (e > t._length)
    throw Bi();
  if (e === 0)
    return t._searchMarker && Ye(t._searchMarker, e, r.length), xn(n, t, null, r);
  const s = e, i = $n(t, e);
  let o = t._start;
  for (i !== null && (o = i.p, e -= i.index, e === 0 && (o = o.prev, e += o && o.countable && !o.deleted ? o.length : 0)); o !== null; o = o.right)
    if (!o.deleted && o.countable) {
      if (e <= o.length) {
        e < o.length && At(n, rt(o.id.client, o.id.clock + e));
        break;
      }
      e -= o.length;
    }
  return t._searchMarker && Ye(t._searchMarker, s, r.length), xn(n, t, o, r);
}, lc = (n, t, e) => {
  let s = (t._searchMarker || []).reduce((i, o) => o.index > i.index ? o : i, { index: 0, p: t._start }).p;
  if (s)
    for (; s.right; )
      s = s.right;
  return xn(n, t, s, e);
}, Fi = (n, t, e, r) => {
  if (r === 0)
    return;
  const s = e, i = r, o = $n(t, e);
  let a = t._start;
  for (o !== null && (a = o.p, e -= o.index); a !== null && e > 0; a = a.right)
    !a.deleted && a.countable && (e < a.length && At(n, rt(a.id.client, a.id.clock + e)), e -= a.length);
  for (; r > 0 && a !== null; )
    a.deleted || (r < a.length && At(n, rt(a.id.client, a.id.clock + r)), a.delete(n), r -= a.length), a = a.right;
  if (r > 0)
    throw Bi();
  t._searchMarker && Ye(
    t._searchMarker,
    s,
    -i + r
    /* in case we remove the above exception */
  );
}, Cn = (n, t, e) => {
  const r = t._map.get(e);
  r !== void 0 && r.delete(n);
}, Gr = (n, t, e, r) => {
  const s = t._map.get(e) || null, i = n.doc, o = i.clientID;
  let a;
  if (r == null)
    a = new ue([r]);
  else
    switch (r.constructor) {
      case Number:
      case Object:
      case Boolean:
      case Array:
      case String:
      case Date:
      case BigInt:
        a = new ue([r]);
        break;
      case Uint8Array:
        a = new tn(
          /** @type {Uint8Array} */
          r
        );
        break;
      case fe:
        a = new en(
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
  new ct(rt(o, mt(i.store, o)), s, s && s.lastId, null, null, t, e, a).integrate(n, 0);
}, Kr = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted ? e.content.getContent()[e.length - 1] : void 0;
}, Pi = (n) => {
  const t = {};
  return n.doc ?? Ct(), n._map.forEach((e, r) => {
    e.deleted || (t[r] = e.content.getContent()[e.length - 1]);
  }), t;
}, ji = (n, t) => {
  n.doc ?? Ct();
  const e = n._map.get(t);
  return e !== void 0 && !e.deleted;
}, cc = (n, t) => {
  const e = {};
  return n._map.forEach((r, s) => {
    let i = r;
    for (; i !== null && (!t.sv.has(i.id.client) || i.id.clock >= (t.sv.get(i.id.client) || 0)); )
      i = i.left;
    i !== null && me(i, t) && (e[s] = i.content.getContent()[i.length - 1]);
  }), e;
}, ln = (n) => (n.doc ?? Ct(), El(
  n._map.entries(),
  /** @param {any} entry */
  (t) => !t[1].deleted
));
class hc extends jn {
}
class ke extends bt {
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
    const e = new ke();
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
    return new ke();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YArray<T>}
   */
  clone() {
    const t = new ke();
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
    super._callObserver(t, e), Wn(this, t, new hc(this, t));
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
      Mi(
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
      lc(
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
      Fi(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Returns the i-th element from a YArray.
   *
   * @param {number} index The index of the element to return from the YArray
   * @return {T}
   */
  get(t) {
    return Ui(this, t);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<T>}
   */
  toArray() {
    return Li(this);
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
    return Ri(this, t, e);
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
    return Ni(
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
    return ac(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(Nc);
  }
}
const uc = (n) => new ke();
class dc extends jn {
  /**
   * @param {YMap<T>} ymap The YArray that changed.
   * @param {Transaction} transaction
   * @param {Set<any>} subs The keys that changed.
   */
  constructor(t, e, r) {
    super(t, e), this.keysChanged = r;
  }
}
class De extends bt {
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
    return new De();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YMap<MapType>}
   */
  clone() {
    const t = new De();
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
    Wn(this, t, new dc(this, t, e));
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
    return Xn(
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
    return Xn(
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
    return Xn(
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
      Cn(e, this, t);
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
      Gr(
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
      Kr(this, t)
    );
  }
  /**
   * Returns a boolean indicating whether the specified key exists or not.
   *
   * @param {string} key The key to test.
   * @return {boolean}
   */
  has(t) {
    return ji(this, t);
  }
  /**
   * Removes all elements from this YMap.
   */
  clear() {
    this.doc !== null ? at(this.doc, (t) => {
      this.forEach(function(e, r, s) {
        Cn(t, s, r);
      });
    }) : this._prelimContent.clear();
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(Uc);
  }
}
const fc = (n) => new De(), Jt = (n, t) => n === t || typeof n == "object" && typeof t == "object" && n && t && ya(n, t);
class pr {
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
    this.right === null && Rt(), this.right.content.constructor === wt ? this.right.deleted || Re(
      this.currentAttributes,
      /** @type {ContentFormat} */
      this.right.content
    ) : this.right.deleted || (this.index += this.right.length), this.left = this.right, this.right = this.right.right;
  }
}
const As = (n, t, e) => {
  for (; t.right !== null && e > 0; )
    t.right.content.constructor === wt ? t.right.deleted || Re(
      t.currentAttributes,
      /** @type {ContentFormat} */
      t.right.content
    ) : t.right.deleted || (e < t.right.length && At(n, rt(t.right.id.client, t.right.id.clock + e)), t.index += t.right.length, e -= t.right.length), t.left = t.right, t.right = t.right.right;
  return t;
}, cn = (n, t, e, r) => {
  const s = /* @__PURE__ */ new Map(), i = r ? $n(t, e) : null;
  if (i) {
    const o = new pr(i.p.left, i.p, i.index, s);
    return As(n, o, e - i.index);
  } else {
    const o = new pr(null, t._start, 0, s);
    return As(n, o, e);
  }
}, $i = (n, t, e, r) => {
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
    const l = e.left, d = e.right, f = new ct(rt(i, mt(s.store, i)), l, l && l.lastId, d, d && d.id, t, null, new wt(a, o));
    f.integrate(n, 0), e.right = f, e.forward();
  });
}, Re = (n, t) => {
  const { key: e, value: r } = t;
  r === null ? n.delete(e) : n.set(e, r);
}, Wi = (n, t) => {
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
}, Hi = (n, t, e, r) => {
  const s = n.doc, i = s.clientID, o = /* @__PURE__ */ new Map();
  for (const a in r) {
    const l = r[a], d = e.currentAttributes.get(a) ?? null;
    if (!Jt(d, l)) {
      o.set(a, d);
      const { left: f, right: u } = e;
      e.right = new ct(rt(i, mt(s.store, i)), f, f && f.lastId, u, u && u.id, t, null, new wt(a, l)), e.right.integrate(n, 0), e.forward();
    }
  }
  return o;
}, Qn = (n, t, e, r, s) => {
  e.currentAttributes.forEach((m, h) => {
    s[h] === void 0 && (s[h] = null);
  });
  const i = n.doc, o = i.clientID;
  Wi(e, s);
  const a = Hi(n, t, e, s), l = r.constructor === String ? new $t(
    /** @type {string} */
    r
  ) : r instanceof bt ? new Kt(r) : new pe(r);
  let { left: d, right: f, index: u } = e;
  t._searchMarker && Ye(t._searchMarker, e.index, l.getLength()), f = new ct(rt(o, mt(i.store, o)), d, d && d.lastId, f, f && f.id, t, null, l), f.integrate(n, 0), e.right = f, e.index = u, e.forward(), $i(n, t, e, a);
}, Ds = (n, t, e, r, s) => {
  const i = n.doc, o = i.clientID;
  Wi(e, s);
  const a = Hi(n, t, e, s);
  t: for (; e.right !== null && (r > 0 || a.size > 0 && (e.right.deleted || e.right.content.constructor === wt)); ) {
    if (!e.right.deleted)
      switch (e.right.content.constructor) {
        case wt: {
          const { key: l, value: d } = (
            /** @type {ContentFormat} */
            e.right.content
          ), f = s[l];
          if (f !== void 0) {
            if (Jt(f, d))
              a.delete(l);
            else {
              if (r === 0)
                break t;
              a.set(l, d);
            }
            e.right.delete(n);
          } else
            e.currentAttributes.set(l, d);
          break;
        }
        default:
          r < e.right.length && At(n, rt(e.right.id.client, e.right.id.clock + r)), r -= e.right.length;
          break;
      }
    e.forward();
  }
  if (r > 0) {
    let l = "";
    for (; r > 0; r--)
      l += `
`;
    e.right = new ct(rt(o, mt(i.store, o)), e.left, e.left && e.left.lastId, e.right, e.right && e.right.id, t, null, new $t(l)), e.right.integrate(n, 0), e.forward();
  }
  $i(n, t, e, a);
}, Vi = (n, t, e, r, s) => {
  let i = t;
  const o = Dt();
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
  let a = 0, l = !1;
  for (; t !== i; ) {
    if (e === t && (l = !0), !t.deleted) {
      const d = t.content;
      if (d.constructor === wt) {
        const { key: f, value: u } = (
          /** @type {ContentFormat} */
          d
        ), m = r.get(f) ?? null;
        (o.get(f) !== d || m === u) && (t.delete(n), a++, !l && (s.get(f) ?? null) === u && m !== u && (m === null ? s.delete(f) : s.set(f, m))), !l && !t.deleted && Re(
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
}, pc = (n, t) => {
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
}, gc = (n) => {
  let t = 0;
  return at(
    /** @type {Doc} */
    n.doc,
    (e) => {
      let r = (
        /** @type {Item} */
        n._start
      ), s = n._start, i = Dt();
      const o = ir(i);
      for (; s; )
        s.deleted === !1 && (s.content.constructor === wt ? Re(
          o,
          /** @type {ContentFormat} */
          s.content
        ) : (t += Vi(e, r, s, i, o), i = ir(o), r = s)), s = s.right;
    }
  ), t;
}, mc = (n) => {
  const t = /* @__PURE__ */ new Set(), e = n.doc;
  for (const [r, s] of n.afterState.entries()) {
    const i = n.beforeState.get(r) || 0;
    s !== i && Di(
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
    Ee(n, n.deleteSet, (s) => {
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
      s.content.constructor === wt ? t.add(i) : pc(r, s);
    });
    for (const s of t)
      gc(s);
  });
}, Is = (n, t, e) => {
  const r = e, s = ir(t.currentAttributes), i = t.right;
  for (; e > 0 && t.right !== null; ) {
    if (t.right.deleted === !1)
      switch (t.right.content.constructor) {
        case Kt:
        case pe:
        case $t:
          e < t.right.length && At(n, rt(t.right.id.client, t.right.id.clock + e)), e -= t.right.length, t.right.delete(n);
          break;
      }
    t.forward();
  }
  i && Vi(n, i, t.right, s, t.currentAttributes);
  const o = (
    /** @type {AbstractType<any>} */
    /** @type {Item} */
    (t.left || t.right).parent
  );
  return o._searchMarker && Ye(o._searchMarker, t.index, -r + e), t;
};
class wc extends jn {
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
        const l = {};
        let d = "", f = 0, u = 0;
        const m = () => {
          if (a !== null) {
            let h = null;
            switch (a) {
              case "delete":
                u > 0 && (h = { delete: u }), u = 0;
                break;
              case "insert":
                (typeof d == "object" || d.length > 0) && (h = { insert: d }, s.size > 0 && (h.attributes = {}, s.forEach((w, g) => {
                  w !== null && (h.attributes[g] = w);
                }))), d = "";
                break;
              case "retain":
                f > 0 && (h = { retain: f }, _a(l) || (h.attributes = pa({}, l))), f = 0;
                break;
            }
            h && e.push(h), a = null;
          }
        };
        for (; o !== null; ) {
          switch (o.content.constructor) {
            case Kt:
            case pe:
              this.adds(o) ? this.deletes(o) || (m(), a = "insert", d = o.content.getContent()[0], m()) : this.deletes(o) ? (a !== "delete" && (m(), a = "delete"), u += 1) : o.deleted || (a !== "retain" && (m(), a = "retain"), f += 1);
              break;
            case $t:
              this.adds(o) ? this.deletes(o) || (a !== "insert" && (m(), a = "insert"), d += /** @type {ContentString} */
              o.content.str) : this.deletes(o) ? (a !== "delete" && (m(), a = "delete"), u += o.length) : o.deleted || (a !== "retain" && (m(), a = "retain"), f += o.length);
              break;
            case wt: {
              const { key: h, value: w } = (
                /** @type {ContentFormat} */
                o.content
              );
              if (this.adds(o)) {
                if (!this.deletes(o)) {
                  const g = s.get(h) ?? null;
                  Jt(g, w) ? w !== null && o.delete(r) : (a === "retain" && m(), Jt(w, i.get(h) ?? null) ? delete l[h] : l[h] = w);
                }
              } else if (this.deletes(o)) {
                i.set(h, w);
                const g = s.get(h) ?? null;
                Jt(g, w) || (a === "retain" && m(), l[h] = g);
              } else if (!o.deleted) {
                i.set(h, w);
                const g = l[h];
                g !== void 0 && (Jt(g, w) ? g !== null && o.delete(r) : (a === "retain" && m(), w === null ? delete l[h] : l[h] = w));
              }
              o.deleted || (a === "insert" && m(), Re(
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
          const h = e[e.length - 1];
          if (h.retain !== void 0 && h.attributes === void 0)
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
class ce extends bt {
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
    return new ce();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YText}
   */
  clone() {
    const t = new ce();
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
    const r = new wc(this, t, e);
    Wn(this, t, r), !t.local && this._hasFormatting && (t._needFormattingCleanup = !0);
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
      const s = new pr(null, this._start, 0, /* @__PURE__ */ new Map());
      for (let i = 0; i < t.length; i++) {
        const o = t[i];
        if (o.insert !== void 0) {
          const a = !e && typeof o.insert == "string" && i === t.length - 1 && s.right === null && o.insert.slice(-1) === `
` ? o.insert.slice(0, -1) : o.insert;
          (typeof a != "string" || a.length > 0) && Qn(r, this, s, a, o.attributes || {});
        } else o.retain !== void 0 ? Ds(r, this, s, o.retain, o.attributes || {}) : o.delete !== void 0 && Is(r, s, o.delete);
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
    let a = "", l = this._start;
    function d() {
      if (a.length > 0) {
        const u = {};
        let m = !1;
        i.forEach((w, g) => {
          m = !0, u[g] = w;
        });
        const h = { insert: a };
        m && (h.attributes = u), s.push(h), a = "";
      }
    }
    const f = () => {
      for (; l !== null; ) {
        if (me(l, t) || e !== void 0 && me(l, e))
          switch (l.content.constructor) {
            case $t: {
              const u = i.get("ychange");
              t !== void 0 && !me(l, t) ? (u === void 0 || u.user !== l.id.client || u.type !== "removed") && (d(), i.set("ychange", r ? r("removed", l.id) : { type: "removed" })) : e !== void 0 && !me(l, e) ? (u === void 0 || u.user !== l.id.client || u.type !== "added") && (d(), i.set("ychange", r ? r("added", l.id) : { type: "added" })) : u !== void 0 && (d(), i.delete("ychange")), a += /** @type {ContentString} */
              l.content.str;
              break;
            }
            case Kt:
            case pe: {
              d();
              const u = {
                insert: l.content.getContent()[0]
              };
              if (i.size > 0) {
                const m = (
                  /** @type {Object<string,any>} */
                  {}
                );
                u.attributes = m, i.forEach((h, w) => {
                  m[w] = h;
                });
              }
              s.push(u);
              break;
            }
            case wt:
              me(l, t) && (d(), Re(
                i,
                /** @type {ContentFormat} */
                l.content
              ));
              break;
          }
        l = l.right;
      }
      d();
    };
    return t || e ? at(o, (u) => {
      t && dr(u, t), e && dr(u, e), f();
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
      const o = cn(i, this, t, !r);
      r || (r = {}, o.currentAttributes.forEach((a, l) => {
        r[l] = a;
      })), Qn(i, this, o, e, r);
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
      const o = cn(i, this, t, !r);
      Qn(i, this, o, e, r || {});
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
      Is(s, cn(s, this, t, !0), e);
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
      const o = cn(i, this, t, !1);
      o.right !== null && Ds(i, this, o, e, r);
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
      Cn(e, this, t);
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
      Gr(r, this, t, e);
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
      Kr(this, t)
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
    return Pi(this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write(t) {
    t.writeTypeRef(Bc);
  }
}
const _c = (n) => new ce();
class tr {
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
    return new tr(this, t);
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
    const r = new tr(this, (s) => s.nodeName && s.nodeName.toUpperCase() === t).next();
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
    return t = t.toUpperCase(), Yt(new tr(this, (e) => e.nodeName && e.nodeName.toUpperCase() === t));
  }
  /**
   * Creates YXmlEvent and calls observers.
   *
   * @param {Transaction} transaction
   * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
   */
  _callObserver(t, e) {
    Wn(this, t, new kc(this, e, t));
  }
  /**
   * Get the string representation of all the children of this YXmlFragment.
   *
   * @return {string} The string representation of all children.
   */
  toString() {
    return Ni(this, (t) => t.toString()).join("");
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
      Mi(r, this, t, e);
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
        xn(r, this, s, e);
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
      Fi(r, this, t, e);
    }) : this._prelimContent.splice(t, e);
  }
  /**
   * Transforms this YArray to a JavaScript Array.
   *
   * @return {Array<YXmlElement|YXmlText|YXmlHook>}
   */
  toArray() {
    return Li(this);
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
    return Ui(this, t);
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
    return Ri(this, t, e);
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
    t.writeTypeRef(Fc);
  }
}
const yc = (n) => new he();
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
    return ma(e, (r, s) => {
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
      const l = r[a];
      e.push(l + '="' + t[l] + '"');
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
      Cn(e, this, t);
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
      Gr(r, this, t, e);
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
      Kr(this, t)
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
      ji(this, t)
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
      t ? cc(this, t) : Pi(this)
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
    t.writeTypeRef(Mc), t.writeKey(this.nodeName);
  }
}
const bc = (n) => new Ie(n.readKey());
class kc extends jn {
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
class En extends De {
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
    return new En(this.hookName);
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlHook}
   */
  clone() {
    const t = new En(this.hookName);
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
    t.writeTypeRef(Pc), t.writeKey(this.hookName);
  }
}
const vc = (n) => new En(n.readKey());
class An extends ce {
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
    return new An();
  }
  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlText}
   */
  clone() {
    const t = new An();
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
    t.writeTypeRef(jc);
  }
}
const Sc = (n) => new An();
class qr {
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
const xc = 0;
class Ot extends qr {
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
    e > 0 && (this.id.clock += e, this.length -= e), Ai(t.doc.store, this);
  }
  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   * @param {number} offset
   */
  write(t, e) {
    t.writeInfo(xc), t.writeLen(this.length - e);
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
class tn {
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
    return new tn(this.content);
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
const Cc = (n) => new tn(n.readBuf());
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
const Ec = (n) => new Ke(n.readLen()), Zi = (n, t) => new fe({ guid: n, ...t, shouldLoad: t.shouldLoad || t.autoLoad || !1 });
class en {
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
    return new en(Zi(this.doc.guid, this.opts));
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
const Ac = (n) => new en(Zi(n.readString(), n.readAny()));
class pe {
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
    return new pe(this.embed);
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
const Dc = (n) => new pe(n.readJSON());
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
const Ic = (n) => new wt(n.readKey(), n.readJSON());
class Dn {
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
    return new Dn(this.arr);
  }
  /**
   * @param {number} offset
   * @return {ContentJSON}
   */
  splice(t) {
    const e = new Dn(this.arr.slice(t));
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
const Tc = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++) {
    const s = n.readString();
    s === "undefined" ? e.push(void 0) : e.push(JSON.parse(s));
  }
  return new Dn(e);
}, Oc = yn("node_env") === "development";
class ue {
  /**
   * @param {Array<any>} arr
   */
  constructor(t) {
    this.arr = t, Oc && Hs(t);
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
    return new ue(this.arr);
  }
  /**
   * @param {number} offset
   * @return {ContentAny}
   */
  splice(t) {
    const e = new ue(this.arr.slice(t));
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
const zc = (n) => {
  const t = n.readLen(), e = [];
  for (let r = 0; r < t; r++)
    e.push(n.readAny());
  return new ue(e);
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
const Rc = (n) => new $t(n.readString()), Lc = [
  uc,
  fc,
  _c,
  bc,
  yc,
  vc,
  Sc
], Nc = 0, Uc = 1, Bc = 2, Mc = 3, Fc = 4, Pc = 5, jc = 6;
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
const $c = (n) => new Kt(Lc[n.readTypeRef()](n)), Wc = (n, t) => {
  let e = t, r = 0, s;
  do
    r > 0 && (e = rt(e.client, e.clock + r)), s = gn(n, e), r = e.clock - s.id.clock, e = s.redone;
  while (e !== null && s instanceof ct);
  return {
    item: s,
    diff: r
  };
}, Jr = (n, t) => {
  for (; n !== null && n.keep !== t; )
    n.keep = t, n = /** @type {AbstractType<any>} */
    n.parent._item;
}, In = (n, t, e) => {
  const { client: r, clock: s } = t.id, i = new ct(
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
}, Ts = (n, t) => vr(
  n,
  /** @param {StackItem} s */
  (e) => Xe(e.deletions, t)
), Yi = (n, t, e, r, s, i) => {
  const o = n.doc, a = o.store, l = o.clientID, d = t.redone;
  if (d !== null)
    return At(n, d);
  let f = (
    /** @type {AbstractType<any>} */
    t.parent._item
  ), u = null, m;
  if (f !== null && f.deleted === !0) {
    if (f.redone === null && (!e.has(f) || Yi(n, f, e, r, s, i) === null))
      return null;
    for (; f.redone !== null; )
      f = At(n, f.redone);
  }
  const h = f === null ? (
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
        _ = _.redone === null ? null : At(n, _.redone);
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
        _ = _.redone === null ? null : At(n, _.redone);
      if (_ !== null && /** @type {AbstractType<any>} */
      _.parent._item === f) {
        m = _;
        break;
      }
      m = m.right;
    }
  } else if (m = null, t.right && !s) {
    for (u = t; u !== null && u.right !== null && (u.right.redone || Xe(r, u.right.id) || Ts(i.undoStack, u.right.id) || Ts(i.redoStack, u.right.id)); )
      for (u = u.right; u.redone; ) u = At(n, u.redone);
    if (u && u.right !== null)
      return null;
  } else
    u = h._map.get(t.parentSub) || null;
  const w = mt(a, l), g = rt(l, w), y = new ct(
    g,
    u,
    u && u.lastId,
    m,
    m && m.id,
    h,
    t.parentSub,
    t.content.copy()
  );
  return t.redone = g, Jr(y, !0), y.integrate(n, 0), y;
};
class ct extends qr {
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
  constructor(t, e, r, s, i, o, a, l) {
    super(t, l.getLength()), this.origin = r, this.left = e, this.right = s, this.rightOrigin = i, this.parent = o, this.parentSub = a, this.redone = null, this.content = l, this.info = this.content.isCountable() ? is : 0;
  }
  /**
   * This is used to mark the item as an indexed fast-search marker
   *
   * @type {boolean}
   */
  set marker(t) {
    (this.info & Yn) > 0 !== t && (this.info ^= Yn);
  }
  get marker() {
    return (this.info & Yn) > 0;
  }
  /**
   * If true, do not garbage collect this Item.
   */
  get keep() {
    return (this.info & ss) > 0;
  }
  set keep(t) {
    this.keep !== t && (this.info ^= ss);
  }
  get countable() {
    return (this.info & is) > 0;
  }
  /**
   * Whether this item was deleted or not.
   * @type {Boolean}
   */
  get deleted() {
    return (this.info & Zn) > 0;
  }
  set deleted(t) {
    this.deleted !== t && (this.info ^= Zn);
  }
  markDeleted() {
    this.info |= Zn;
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
    if (this.parent && this.parent.constructor === be && this.id.client !== this.parent.client && this.parent.clock >= mt(e, this.parent.client))
      return this.parent.client;
    if (this.origin && (this.left = ks(t, e, this.origin), this.origin = this.left.lastId), this.rightOrigin && (this.right = At(t, this.rightOrigin), this.rightOrigin = this.right.id), this.left && this.left.constructor === Ot || this.right && this.right.constructor === Ot)
      this.parent = null;
    else if (!this.parent)
      this.left && this.left.constructor === ct ? (this.parent = this.left.parent, this.parentSub = this.left.parentSub) : this.right && this.right.constructor === ct && (this.parent = this.right.parent, this.parentSub = this.right.parentSub);
    else if (this.parent.constructor === be) {
      const r = gn(e, this.parent);
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
    if (e > 0 && (this.id.clock += e, this.left = ks(t, t.doc.store, rt(this.id.client, this.id.clock - 1)), this.origin = this.left.lastId, this.content = this.content.splice(e), this.length -= e), this.parent) {
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
          if (o.add(s), i.add(s), an(this.origin, s.origin)) {
            if (s.id.client < this.id.client)
              r = s, i.clear();
            else if (an(this.rightOrigin, s.rightOrigin))
              break;
          } else if (s.origin !== null && o.has(gn(t.doc.store, s.origin)))
            i.has(gn(t.doc.store, s.origin)) || (r = s, i.clear());
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
      this.right !== null ? this.right.left = this : this.parentSub !== null && (this.parent._map.set(this.parentSub, this), this.left !== null && this.left.delete(t)), this.parentSub === null && this.countable && !this.deleted && (this.parent._length += this.length), Ai(t.doc.store, this), this.content.integrate(t, this), Ss(
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
    if (this.constructor === t.constructor && an(t.origin, this.lastId) && this.right === t && an(this.rightOrigin, t.rightOrigin) && this.id.client === t.id.client && this.id.clock + this.length === t.id.clock && this.deleted === t.deleted && this.redone === null && t.redone === null && this.content.constructor === t.content.constructor && this.content.mergeWith(t.content)) {
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
      this.countable && this.parentSub === null && (e._length -= this.length), this.markDeleted(), Ze(t.deleteSet, this.id.client, this.id.clock, this.length), Ss(t, e, this.parentSub), this.content.delete(t);
    }
  }
  /**
   * @param {StructStore} store
   * @param {boolean} parentGCd
   */
  gc(t, e) {
    if (!this.deleted)
      throw Rt();
    this.content.gc(t), e ? Vl(t, this, new Ot(this.id, this.length)) : this.content = new Ke(this.length);
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
    const r = e > 0 ? rt(this.id.client, this.id.clock + e - 1) : this.origin, s = this.rightOrigin, i = this.parentSub, o = this.content.getRef() & Tn | (r === null ? 0 : It) | // origin is defined
    (s === null ? 0 : Zt) | // right origin is defined
    (i === null ? 0 : Pe);
    if (t.writeInfo(o), r !== null && t.writeLeftID(r), s !== null && t.writeRightID(s), r === null && s === null) {
      const a = (
        /** @type {AbstractType<any>} */
        this.parent
      );
      if (a._item !== void 0) {
        const l = a._item;
        if (l === null) {
          const d = Wl(a);
          t.writeParentInfo(!0), t.writeString(d);
        } else
          t.writeParentInfo(!1), t.writeLeftID(l.id);
      } else a.constructor === String ? (t.writeParentInfo(!0), t.writeString(a)) : a.constructor === be ? (t.writeParentInfo(!1), t.writeLeftID(a)) : Rt();
      i !== null && t.writeString(i);
    }
    this.content.write(t, e);
  }
}
const Gi = (n, t) => Hc[t & Tn](n), Hc = [
  () => {
    Rt();
  },
  // GC is not ItemContent
  Ec,
  // 1
  Tc,
  // 2
  Cc,
  // 3
  Rc,
  // 4
  Dc,
  // 5
  Ic,
  // 6
  $c,
  // 7
  zc,
  // 8
  Ac,
  // 9
  () => {
    Rt();
  }
  // 10 - Skip is not ItemContent
], Vc = 10;
class zt extends qr {
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
    t.writeInfo(Vc), K(t.restEncoder, this.length - e);
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
const Ki = (
  /** @type {any} */
  typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : {}
), qi = "__ $YJS$ __";
Ki[qi] === !0 && console.error("Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438");
Ki[qi] = !0;
function Zc() {
  const n = new fe(), t = n.getMap("pages");
  let e = null, r = null;
  function s(i) {
    let o = t.get(i);
    return o || (o = new ce(), t.set(i, o)), o;
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
          for (const [a, l] of t.entries())
            o[a] = l.toString();
          return o;
        },
        getDoc: () => n
      };
    },
    encodeStateAsUpdate() {
      return Wr(n);
    },
    applyUpdate(i) {
      $r(n, i);
    },
    destroy() {
      e?.destroy?.(), r?.destroy(), n.destroy();
    }
  };
}
function Yc(n, t = {}) {
  const e = Zc(), r = t.initialPage ?? "home", s = po(window.location.search), i = s[s.length - 1] ?? r;
  let o = s.length ? [...s] : [i], a = null, l = !1;
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
      return l = d, d;
    },
    isNavigating() {
      return l;
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
const Gc = `
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
`, Kc = Gc + `
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
function qc(n) {
  const t = "worldnotes-styles", e = document.getElementById(t);
  if (e) {
    n !== void 0 && (e.textContent = n);
    return;
  }
  const r = document.createElement("style");
  r.id = t, r.textContent = n ?? Kc, document.head.appendChild(r);
}
function Jc(n, t) {
  qc(t), n.innerHTML = "", n.className = "wn-root";
  const e = re("div", "wn-topbar"), r = re("div", "wn-breadcrumb"), s = re("div", "wn-toolbar"), i = re("div", "wn-editor-wrap"), o = re("div", "wn-editor"), a = re("div", "wn-placeholder"), l = re("div", "wn-overlay");
  return a.textContent = "Start writing… use [[page name]] to link deeper", o.contentEditable = "true", o.spellcheck = !1, e.appendChild(r), i.appendChild(a), i.appendChild(o), i.appendChild(l), n.appendChild(e), n.appendChild(s), n.appendChild(i), { container: n, topbar: e, breadcrumb: r, toolbar: s, editorWrap: i, editorDiv: o, placeholder: a, overlay: l };
}
function Os(n, t) {
  let e = 0;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((s, i) => parseInt(s.dataset.line ?? "0", 10) - parseInt(i.dataset.line ?? "0", 10));
  for (const s of r) {
    if (parseInt(s.dataset.line ?? "0", 10) >= t) break;
    e += (s.textContent ?? "").length + 1;
  }
  return e;
}
function Be(n) {
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
      return Os(n, u) + (f.textContent ?? "").length + 1;
    }
    return 0;
  }
  const i = parseInt(s.dataset.line ?? "0", 10), o = Os(n, i);
  let a = 0, l = !1;
  function d(f) {
    if (!l) {
      if (f.nodeType === Node.TEXT_NODE) {
        const u = f.length;
        if (f === r) {
          a += Math.min(e.startOffset, u), l = !0;
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
function gr(n, t) {
  let e = t;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((i, o) => parseInt(i.dataset.line ?? "0", 10) - parseInt(o.dataset.line ?? "0", 10));
  for (const i of r) {
    const o = (i.textContent ?? "").length;
    if (e <= o) {
      const a = Xc(i, e);
      if (a) {
        const l = window.getSelection();
        if (!l) return;
        const d = document.createRange();
        d.setStart(a.node, a.offset), d.collapse(!0), l.removeAllRanges(), l.addRange(d);
      } else {
        const l = window.getSelection();
        if (l) {
          const d = document.createRange();
          d.setStart(i, 0), d.collapse(!0), l.removeAllRanges(), l.addRange(d);
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
    const o = document.createRange(), a = Qc(s);
    a ? o.setStart(a, a.length) : o.selectNodeContents(s), o.collapse(!0), i.removeAllRanges(), i.addRange(o);
  }
}
function Xc(n, t) {
  let e = t;
  function r(s) {
    if (s.nodeType === Node.TEXT_NODE) {
      const i = s.length;
      return e <= i ? { node: s, offset: e } : (e -= i, null);
    }
    for (const i of Array.from(s.childNodes)) {
      const o = r(i);
      if (o) return o;
    }
    return null;
  }
  return r(n);
}
function Qc(n) {
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
function zs(n) {
  return { type: "text", raw: n, groups: [n] };
}
function th(n, t) {
  const e = t.filter((s) => s.pattern.source.startsWith("^")), r = t.filter((s) => !s.pattern.source.startsWith("^"));
  for (const s of e) {
    const i = n.match(s.pattern);
    if (i)
      return [{ type: s.type, raw: i[0], groups: i.slice(1).map((o) => o ?? "") }];
  }
  return eh(n, r);
}
function eh(n, t) {
  const e = [];
  let r = n;
  for (; r.length > 0; ) {
    let s = null;
    for (const i of t) {
      const o = r.match(i.pattern);
      !o || o.index === void 0 || (s === null || o.index < s.index) && (s = { index: o.index, match: o, def: i });
    }
    if (!s) {
      e.push(zs(r));
      break;
    }
    s.index > 0 && e.push(zs(r.slice(0, s.index))), e.push({
      type: s.def.type,
      raw: s.match[0],
      groups: s.match.slice(1).map((i) => i ?? "")
    }), r = r.slice(s.index + s.match[0].length);
  }
  return e;
}
function nh(n, t) {
  return n.split(`
`).map((e) => th(e, t));
}
function rh(n, t, e, r = -1) {
  const s = document.createDocumentFragment(), i = sh(t);
  let o = 0;
  for (const a of n) {
    if (a.type === "text") {
      s.appendChild(document.createTextNode(a.raw)), o += a.raw.length;
      continue;
    }
    const l = o, d = l + a.raw.length;
    if (o = d, r >= l && r <= d) {
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
      u.addEventListener("mousedown", (h) => {
        m(a, e) && h.preventDefault();
      });
    }
    s.appendChild(u);
  }
  return s;
}
function sh(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    for (const r of e.tokens)
      t.set(r.type, e);
  return t;
}
function ih(n, t, e, r) {
  const s = nh(
    n,
    t.flatMap((o) => o.tokens)
  ), i = [];
  r.innerHTML = "";
  for (let o = 0; o < s.length; o++) {
    const a = s[o].map((f) => f.raw).join("");
    i.push(a.length);
    const l = rh(s[o], t, e), d = document.createElement("div");
    d.dataset.line = String(o), l.childNodes.length ? d.appendChild(l) : d.appendChild(document.createElement("br")), r.appendChild(d), o < s.length - 1 && r.appendChild(document.createTextNode(`
`));
  }
  return { lineCount: s.length, lineLengths: i };
}
function oh(n, t, e, r = {}) {
  const { editorDiv: s, placeholder: i, breadcrumb: o } = n;
  function a(f = !1) {
    const u = Be(s), m = e.getYDocState(), h = e.getTrail(), w = h[h.length - 1], y = m.getPage(w).toString(), _ = e.toContext(
      r.navigateFn ?? ((S) => {
      })
    );
    ih(y, t, _, s), i.style.display = y.length ? "none" : "block";
    try {
      gr(s, u);
    } catch {
    }
  }
  function l() {
    o.innerHTML = "";
    const f = e.getTrail();
    f.forEach((u, m) => {
      if (m > 0) {
        const w = document.createElement("span");
        w.className = "wn-crumb-sep", w.textContent = "/", o.appendChild(w);
      }
      const h = document.createElement("span");
      h.className = "wn-crumb" + (m === f.length - 1 ? " wn-crumb--active" : ""), h.textContent = sr(u), m < f.length - 1 && h.addEventListener("click", () => {
        e.truncateTrail(m);
        const w = e.getTrail(), g = w[w.length - 1];
        r.onBreadcrumbNavigate?.(g);
      }), o.appendChild(h);
    }), r.onTrailChange?.(e.getTrail()), d();
  }
  function d() {
    const f = e.getTrail(), u = fo(window.location.search, f);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${u}${window.location.hash}`
    );
  }
  return { render: a, renderBreadcrumb: l, syncUrlToTrail: d };
}
const ah = `# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;
function lh(n, t, e, r) {
  let s = null;
  function i(l) {
    s = l;
  }
  async function o(l) {
    const d = n.getYDocState();
    if (!d.hasPage(l)) {
      const f = await t.get(l);
      if (f) {
        const u = d.getPage(l);
        u.toString() === "" && u.insert(0, f);
      } else
        d.getPage(l).insert(0, `# ${l}

`);
    }
    n.pushTrail(l), await a(l);
  }
  async function a(l) {
    n.setNavigating(!0);
    const d = n.getYDocState(), f = d.hasPage(l), u = d.getPage(l);
    !u.toString() && !f && (l === "home" ? u.insert(0, ah) : u.insert(0, `# ${l}

`)), e.editorDiv.innerHTML = "", s && (s.render(!0), s.renderBreadcrumb());
    try {
      const h = document.createRange(), w = window.getSelection();
      if (w) {
        const g = e.editorDiv.querySelector('[data-line="0"]');
        g ? h.setStart(g, 0) : h.setStart(e.editorDiv, 0), h.collapse(!0), w.removeAllRanges(), w.addRange(h);
      }
    } catch {
    }
    r.onPageLoad?.(l, u.toString()), n.setNavigating(!1), e.editorDiv.focus();
  }
  return { navigateToPage: o, loadPage: a, setRenderAPI: i };
}
const Ji = /* @__PURE__ */ new Map();
class ch {
  /**
   * @param {string} room
   */
  constructor(t) {
    this.room = t, this.onmessage = null, this._onChange = (e) => e.key === t && this.onmessage !== null && this.onmessage({ data: La(e.newValue || "") }), ua(this._onChange);
  }
  /**
   * @param {ArrayBuffer} buf
   */
  postMessage(t) {
    $s.setItem(this.room, Ra(Da(t)));
  }
  close() {
    da(this._onChange);
  }
}
const hh = typeof BroadcastChannel > "u" ? ch : BroadcastChannel, Xr = (n) => Wt(Ji, n, () => {
  const t = Qt(), e = new hh(n);
  return e.onmessage = (r) => t.forEach((s) => s(r.data, "broadcastchannel")), {
    bc: e,
    subs: t
  };
}), uh = (n, t) => (Xr(n).subs.add(t), t), dh = (n, t) => {
  const e = Xr(n), r = e.subs.delete(t);
  return r && e.subs.size === 0 && (e.bc.close(), Ji.delete(n)), r;
}, we = (n, t, e = null) => {
  const r = Xr(n);
  r.bc.postMessage(t), r.subs.forEach((s) => s(t, e));
}, Xi = 0, Qr = 1, Qi = 2, mr = (n, t) => {
  K(n, Xi);
  const e = jl(t);
  pt(n, e);
}, to = (n, t, e) => {
  K(n, Qr), pt(n, Wr(t, e));
}, fh = (n, t, e) => to(t, e, St(n)), eo = (n, t, e, r) => {
  try {
    $r(t, St(n), e);
  } catch (s) {
    r?.(
      /** @type {Error} */
      s
    ), console.error("Caught error while handling a Yjs update", s);
  }
}, ph = (n, t) => {
  K(n, Qi), pt(n, t);
}, gh = eo, mh = (n, t, e, r, s) => {
  const i = tt(n);
  switch (i) {
    case Xi:
      fh(n, t, e);
      break;
    case Qr:
      eo(n, e, r, s);
      break;
    case Qi:
      gh(n, e, r, s);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return i;
}, wh = 0, _h = (n, t, e) => {
  tt(n) === wh && e(t, Xt(n));
}, er = 3e4;
class yh extends Oo {
  /**
   * @param {Y.Doc} doc
   */
  constructor(t) {
    super(), this.doc = t, this.clientID = t.clientID, this.states = /* @__PURE__ */ new Map(), this.meta = /* @__PURE__ */ new Map(), this._checkInterval = /** @type {any} */
    setInterval(() => {
      const e = te();
      this.getLocalState() !== null && er / 2 <= e - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated && this.setLocalState(this.getLocalState());
      const r = [];
      this.meta.forEach((s, i) => {
        i !== this.clientID && er <= e - s.lastUpdated && this.states.has(i) && r.push(i);
      }), r.length > 0 && ts(this, r, "timeout");
    }, Ut(er / 10)), t.on("destroy", () => {
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
    const o = [], a = [], l = [], d = [];
    t === null ? d.push(e) : i == null ? t != null && o.push(e) : (a.push(e), _e(i, t) || l.push(e)), (o.length > 0 || l.length > 0 || d.length > 0) && this.emit("change", [{ added: o, updated: l, removed: d }, "local"]), this.emit("update", [{ added: o, updated: a, removed: d }, "local"]);
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
const ts = (n, t, e) => {
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
  K(s, r);
  for (let i = 0; i < r; i++) {
    const o = t[i], a = e.get(o) || null, l = (
      /** @type {MetaClientState} */
      n.meta.get(o).clock
    );
    K(s, o), K(s, l), ae(s, JSON.stringify(a));
  }
  return ht(s);
}, bh = (n, t, e) => {
  const r = ne(t), s = te(), i = [], o = [], a = [], l = [], d = tt(r);
  for (let f = 0; f < d; f++) {
    const u = tt(r);
    let m = tt(r);
    const h = JSON.parse(Xt(r)), w = n.meta.get(u), g = n.states.get(u), y = w === void 0 ? 0 : w.clock;
    (y < m || y === m && h === null && n.states.has(u)) && (h === null ? u === n.clientID && n.getLocalState() != null ? m++ : n.states.delete(u) : n.states.set(u, h), n.meta.set(u, {
      clock: m,
      lastUpdated: s
    }), w === void 0 && h !== null ? i.push(u) : w !== void 0 && h === null ? l.push(u) : h !== null && (_e(h, g) || a.push(u), o.push(u)));
  }
  (i.length > 0 || a.length > 0 || l.length > 0) && n.emit("change", [{
    added: i,
    updated: a,
    removed: l
  }, e]), (i.length > 0 || o.length > 0 || l.length > 0) && n.emit("update", [{
    added: i,
    updated: o,
    removed: l
  }, e]);
}, kh = (n) => wa(n, (t, e) => `${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join("&"), ie = 0, no = 3, ve = 1, vh = 2, nn = [];
nn[ie] = (n, t, e, r, s) => {
  K(n, ie);
  const i = mh(
    t,
    n,
    e.doc,
    e
  );
  r && i === Qr && !e.synced && (e.synced = !0);
};
nn[no] = (n, t, e, r, s) => {
  K(n, ve), pt(
    n,
    Fe(
      e.awareness,
      Array.from(e.awareness.getStates().keys())
    )
  );
};
nn[ve] = (n, t, e, r, s) => {
  bh(
    e.awareness,
    St(t),
    e
  );
};
nn[vh] = (n, t, e, r, s) => {
  _h(
    t,
    e.doc,
    (i, o) => Sh(e, o)
  );
};
const Rs = 3e4, Sh = (n, t) => console.warn(`Permission denied to access ${n.url}.
${t}`), ro = (n, t, e) => {
  const r = ne(t), s = xt(), i = tt(r), o = n.messageHandlers[i];
  return /** @type {any} */ o ? o(s, r, n, e, i) : console.error("Unable to compute message"), s;
}, wr = (n, t, e) => {
  t === n.ws && (n.emit("connection-close", [e, n]), n.ws = null, t.close(), n.wsconnecting = !1, n.wsconnected ? (n.wsconnected = !1, n.synced = !1, ts(
    n.awareness,
    Array.from(n.awareness.getStates().keys()).filter(
      (r) => r !== n.doc.clientID
    ),
    n
  ), n.emit("status", [{
    status: "disconnected"
  }])) : n.wsUnsuccessfulReconnects++, setTimeout(
    so,
    xr(
      zo(2, n.wsUnsuccessfulReconnects) * 100,
      n.maxBackoffTime
    ),
    n
  ));
}, so = (n) => {
  if (n.shouldConnect && n.ws === null) {
    const t = new n._WS(n.url, n.protocols);
    t.binaryType = "arraybuffer", n.ws = t, n.wsconnecting = !0, n.wsconnected = !1, n.synced = !1, t.onmessage = (e) => {
      n.wsLastMessageReceived = te();
      const r = ro(n, new Uint8Array(e.data), !0);
      Cr(r) > 1 && t.send(ht(r));
    }, t.onerror = (e) => {
      n.emit("connection-error", [e, n]);
    }, t.onclose = (e) => {
      wr(n, t, e);
    }, t.onopen = () => {
      n.wsLastMessageReceived = te(), n.wsconnecting = !1, n.wsconnected = !0, n.wsUnsuccessfulReconnects = 0, n.emit("status", [{
        status: "connected"
      }]);
      const e = xt();
      if (K(e, ie), mr(e, n.doc), t.send(ht(e)), n.awareness.getLocalState() !== null) {
        const r = xt();
        K(r, ve), pt(
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
}, nr = (n, t) => {
  const e = n.ws;
  n.wsconnected && e && e.readyState === e.OPEN && e.send(t), n.bcconnected && we(n.bcChannel, t, n);
};
class xh extends Sr {
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
    awareness: i = new yh(r),
    params: o = {},
    protocols: a = [],
    WebSocketPolyfill: l = WebSocket,
    resyncInterval: d = -1,
    maxBackoffTime: f = 2500,
    disableBc: u = !1
  } = {}) {
    for (super(); t[t.length - 1] === "/"; )
      t = t.slice(0, t.length - 1);
    this.serverUrl = t, this.bcChannel = t + "/" + e, this.maxBackoffTime = f, this.params = o, this.protocols = a, this.roomname = e, this.doc = r, this._WS = l, this.awareness = i, this.wsconnected = !1, this.wsconnecting = !1, this.bcconnected = !1, this.disableBc = u, this.wsUnsuccessfulReconnects = 0, this.messageHandlers = nn.slice(), this._synced = !1, this.ws = null, this.wsLastMessageReceived = 0, this.shouldConnect = s, this._resyncInterval = 0, d > 0 && (this._resyncInterval = /** @type {any} */
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const m = xt();
        K(m, ie), mr(m, r), this.ws.send(ht(m));
      }
    }, d)), this._bcSubscriber = (m, h) => {
      if (h !== this) {
        const w = ro(this, new Uint8Array(m), !1);
        Cr(w) > 1 && we(this.bcChannel, ht(w), this);
      }
    }, this._updateHandler = (m, h) => {
      if (h !== this) {
        const w = xt();
        K(w, ie), ph(w, m), nr(this, ht(w));
      }
    }, this.doc.on("update", this._updateHandler), this._awarenessUpdateHandler = ({ added: m, updated: h, removed: w }, g) => {
      const y = m.concat(h).concat(w), _ = xt();
      K(_, ve), pt(
        _,
        Fe(i, y)
      ), nr(this, ht(_));
    }, this._exitHandler = () => {
      ts(
        this.awareness,
        [r.clientID],
        "app closed"
      );
    }, ee && typeof process < "u" && process.on("exit", this._exitHandler), i.on("update", this._awarenessUpdateHandler), this._checkInterval = /** @type {any} */
    setInterval(() => {
      this.wsconnected && Rs < te() - this.wsLastMessageReceived && wr(
        this,
        /** @type {WebSocket} */
        this.ws,
        null
      );
    }, Rs / 10), s && this.connect();
  }
  get url() {
    const t = kh(this.params);
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
    this.bcconnected || (uh(this.bcChannel, this._bcSubscriber), this.bcconnected = !0);
    const t = xt();
    K(t, ie), mr(t, this.doc), we(this.bcChannel, ht(t), this);
    const e = xt();
    K(e, ie), to(e, this.doc), we(this.bcChannel, ht(e), this);
    const r = xt();
    K(r, no), we(
      this.bcChannel,
      ht(r),
      this
    );
    const s = xt();
    K(s, ve), pt(
      s,
      Fe(this.awareness, [
        this.doc.clientID
      ])
    ), we(
      this.bcChannel,
      ht(s),
      this
    );
  }
  disconnectBc() {
    const t = xt();
    K(t, ve), pt(
      t,
      Fe(this.awareness, [
        this.doc.clientID
      ], /* @__PURE__ */ new Map())
    ), nr(this, ht(t)), this.bcconnected && (dh(this.bcChannel, this._bcSubscriber), this.bcconnected = !1);
  }
  disconnect() {
    this.shouldConnect = !1, this.disconnectBc(), this.ws !== null && wr(this, this.ws, null);
  }
  connect() {
    this.shouldConnect = !0, !this.wsconnected && this.ws === null && (so(this), this.connectBc());
  }
}
const io = "__ync_update__";
async function Ch(n, t) {
  const e = Wr(n), r = Ah(e);
  await t.set(io, r);
}
async function Eh(n, t) {
  const e = await t.get(io);
  if (e) {
    const r = Dh(e);
    $r(n, r);
  }
}
function Ah(n) {
  const t = String.fromCharCode(...n);
  return btoa(t);
}
function Dh(n) {
  const t = atob(n);
  return Uint8Array.from(t, (e) => e.charCodeAt(0));
}
const Ls = [
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
function Ih(n) {
  return Ls[n % Ls.length] ?? "#888";
}
const jh = {
  name: "remote-cursors",
  version: "1.0.0",
  kind: "ui",
  slots: ["wn-overlay"],
  priority: 0,
  onMount(n) {
    n.style.position = "absolute", n.style.top = "0", n.style.left = "0", n.style.pointerEvents = "none", n.style.zIndex = "10";
  }
};
function Th(n, t, e, r) {
  if (n.innerHTML = "", !t) return;
  const s = t.getStates();
  for (const [i, o] of s.entries()) {
    if (i === r || !o.cursor) continue;
    const a = o.user?.color ?? Ih(i), l = o.user?.name ?? `User ${i}`, d = document.createElement("div");
    d.className = "wn-remote-cursor";
    const f = document.createElement("span");
    f.className = "wn-remote-cursor-caret", f.style.backgroundColor = a;
    const u = document.createElement("span");
    u.className = "wn-remote-cursor-label", u.style.backgroundColor = a, u.textContent = l, d.appendChild(f), d.appendChild(u);
    const m = Oh(e, o.cursor.offset);
    m && (d.style.left = `${m.left}px`, d.style.top = `${m.top}px`), n.appendChild(d);
  }
}
function Oh(n, t) {
  let e = t;
  const r = Array.from(
    n.querySelectorAll("[data-line]")
  );
  r.sort((i, o) => parseInt(i.dataset.line ?? "0", 10) - parseInt(o.dataset.line ?? "0", 10));
  for (const i of r) {
    const o = (i.textContent ?? "").length;
    if (e <= o) {
      const a = i.getBoundingClientRect();
      return {
        left: a.left + e * 8,
        // rough char-width estimate
        top: a.top
      };
    }
    e -= o + 1;
  }
  const s = r[r.length - 1];
  if (s) {
    const i = s.getBoundingClientRect();
    return {
      left: i.left + (s.textContent ?? "").length * 8,
      top: i.top
    };
  }
  return null;
}
function zh(n, t, e, r, s, i, o, a) {
  function l(f) {
    const u = window.getSelection();
    if (!u || !u.rangeCount) return;
    const m = u.getRangeAt(0);
    m.deleteContents();
    const h = document.createTextNode(f);
    m.insertNode(h), m.setStart(h, f.length), m.collapse(!0), u.removeAllRanges(), u.addRange(m), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
  }
  async function d() {
    const f = a.saveDebounceMs ?? 600, u = r.getYDocState();
    await Eh(u.doc, o);
    let m = null;
    if (a.syncServer) {
      const v = r.getTrail(), T = `worldnotes-${v[v.length - 1]}`;
      m = new xh(
        a.syncServer,
        T,
        u.doc
      ), u.setAwareness(m.awareness);
      const I = m.awareness;
      I.on("change", () => {
        Th(
          n.overlay,
          I,
          n.editorDiv,
          u.doc.clientID
        );
      }), m.on("status", (U) => {
        U.status === "connected" && s.render(!0);
      });
    }
    const h = async () => {
      await Ch(u.doc, o);
    }, w = () => {
      r.clearSaveTimer();
      const v = setTimeout(async () => {
        await h();
        const T = r.getTrail(), I = T[T.length - 1], U = u.getPage(I);
        a.onSave?.(I, U.toString());
      }, f);
      r.setSaveTimer(v);
    };
    let g = !1;
    n.editorDiv.addEventListener("input", () => {
      if (r.isNavigating() || g) return;
      g = !0;
      const v = r.getTrail(), T = v[v.length - 1], I = u.getPage(T), U = n.editorDiv.textContent ?? "", L = I.toString();
      U !== L && u.doc.transact(() => {
        I.delete(0, L.length), I.insert(0, U);
      });
      const H = Be(n.editorDiv);
      u.awareness?.setLocalStateField?.("cursor", { offset: H, page: T }), s.render();
      for (const x of t)
        x.onUpdate?.();
      w(), g = !1;
    }), n.editorDiv.addEventListener("paste", (v) => {
      v.preventDefault();
      const T = v.clipboardData?.getData("text/plain") ?? "";
      l(T);
    }), n.editorDiv.addEventListener("keydown", (v) => {
      if ((v.ctrlKey || v.metaKey) && !v.shiftKey && v.key === "z") {
        v.preventDefault();
        const T = u.undoManager;
        T?.canUndo() && (T.undo(), s.render(!0));
        return;
      }
      if ((v.ctrlKey || v.metaKey) && v.shiftKey && v.key === "z") {
        v.preventDefault();
        const T = u.undoManager;
        T?.canRedo() && (T.redo(), s.render(!0));
        return;
      }
      if (v.ctrlKey && !v.shiftKey && v.key === "y") {
        v.preventDefault();
        const T = u.undoManager;
        T?.canRedo() && (T.redo(), s.render(!0));
        return;
      }
      v.key === "Tab" ? (v.preventDefault(), l("  ")) : v.key === "Enter" && (v.preventDefault(), l(`
`));
    });
    const y = r.getTrail(), _ = y[y.length - 1];
    await i.loadPage(_);
    const S = u.getPage(_), C = new ql(S, { captureTimeout: 0 });
    u.setUndoManager(C);
    const A = {
      "wn-toolbar": n.toolbar,
      "wn-overlay": n.overlay
    };
    for (const v of e)
      for (const T of v.slots) {
        const I = A[T];
        I && v.onMount(I);
      }
    return {
      destroy() {
        r.clearSaveTimer(), m?.destroy();
        for (const v of t)
          try {
            v.onDestroy?.();
          } catch (T) {
            console.error(`Plugin "${v.name}" onDestroy failed:`, T);
          }
        for (const v of e)
          try {
            v.onDestroy?.();
          } catch (T) {
            console.error(`UI plugin "${v.name}" onDestroy failed:`, T);
          }
        u.destroy(), n.container.innerHTML = "";
      },
      navigate(v) {
        i.navigateToPage(v);
      },
      getCurrentPage() {
        const v = r.getTrail();
        return v[v.length - 1];
      },
      getTrail() {
        return r.getTrail();
      },
      getContent() {
        const v = r.getTrail(), T = v[v.length - 1];
        return u.getPage(T).toString();
      },
      setContent(v) {
        const T = r.getTrail(), I = T[T.length - 1], U = u.getPage(I);
        u.doc.transact(() => {
          U.delete(0, U.length), U.insert(0, v);
        }), s.render(!0);
      },
      undo() {
        const v = u.undoManager;
        return v?.canUndo() ? (v.undo(), s.render(!0), !0) : !1;
      },
      redo() {
        const v = u.undoManager;
        return v?.canRedo() ? (v.redo(), s.render(!0), !0) : !1;
      },
      canUndo() {
        return u.undoManager?.canUndo() ?? !1;
      },
      canRedo() {
        return u.undoManager?.canRedo() ?? !1;
      },
      insertText(v) {
        l(v);
      },
      deleteForward() {
        const v = window.getSelection();
        if (!v || !v.rangeCount) return;
        if (v.isCollapsed)
          try {
            v.modify("extend", "forward", "character");
          } catch {
            const I = u.getPage(
              r.getTrail()[r.getTrail().length - 1]
            ).toString(), U = Be(n.editorDiv);
            if (U >= I.length) return;
            const L = I.slice(0, U) + I.slice(U + 1);
            u.getPage(r.getTrail()[r.getTrail().length - 1]).delete(0, I.length), u.getPage(r.getTrail()[r.getTrail().length - 1]).insert(0, L), s.render(!0), gr(n.editorDiv, U);
            return;
          }
        const T = v.getRangeAt(0);
        T.deleteContents(), v.removeAllRanges(), v.addRange(T), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      deleteBackward() {
        const v = window.getSelection();
        if (!v || !v.rangeCount) return;
        if (v.isCollapsed)
          try {
            v.modify("extend", "backward", "character");
          } catch {
            const I = u.getPage(
              r.getTrail()[r.getTrail().length - 1]
            ).toString(), U = Be(n.editorDiv);
            if (U <= 0) return;
            const L = I.slice(0, U - 1) + I.slice(U);
            u.getPage(r.getTrail()[r.getTrail().length - 1]).delete(0, I.length), u.getPage(r.getTrail()[r.getTrail().length - 1]).insert(0, L), s.render(!0), gr(n.editorDiv, U - 1);
            return;
          }
        const T = v.getRangeAt(0);
        T.deleteContents(), v.removeAllRanges(), v.addRange(T), n.editorDiv.dispatchEvent(new Event("input", { bubbles: !0 }));
      },
      getSelection() {
        const v = window.getSelection();
        if (!v || !v.rangeCount) return null;
        const T = v.toString(), I = Be(n.editorDiv), U = I + T.length;
        return { text: T, start: I, end: Math.max(I, U) };
      }
    };
  }
  return { mount: d };
}
class Rh {
  constructor(t, e = {}) {
    this.registry = new Eo(), this.storage = new uo(), this.options = {}, this._mounted = !1, this._slotElements = null, this.el = t, this.options = e, e.storage && (this.storage = e.storage);
    for (const r of xo)
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
    const t = this.registry.allUIPlugins().sort((r, s) => (r.priority ?? 0) - (s.priority ?? 0)), e = await Lh(
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
function $h(n, t = {}) {
  return new Rh(n, t);
}
async function Lh(n, t, e, r, s) {
  const i = Yc(r, s), o = Jc(n, s.theme), a = lh(i, r, o, s), l = {
    navigateFn: (u) => {
      a.navigateToPage(u);
    },
    onBreadcrumbNavigate: (u) => {
      a.loadPage(u);
    },
    onTrailChange: s.onTrailChange
  }, d = oh(o, t, i, l);
  return a.setRenderAPI(d), zh(
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
const Nh = "worldnotes", se = "pages";
class Wh {
  constructor(t = Nh) {
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
class Hh {
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
var hn = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Uh(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
function un(n) {
  throw new Error('Could not dynamically require "' + n + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var rr = { exports: {} };
var Ns;
function Bh() {
  return Ns || (Ns = 1, (function(n, t) {
    (function(e) {
      n.exports = e();
    })(function() {
      return (function e(r, s, i) {
        function o(d, f) {
          if (!s[d]) {
            if (!r[d]) {
              var u = typeof un == "function" && un;
              if (!f && u) return u(d, !0);
              if (a) return a(d, !0);
              var m = new Error("Cannot find module '" + d + "'");
              throw m.code = "MODULE_NOT_FOUND", m;
            }
            var h = s[d] = { exports: {} };
            r[d][0].call(h.exports, function(w) {
              var g = r[d][1][w];
              return o(g || w);
            }, h, h.exports, e, r, s, i);
          }
          return s[d].exports;
        }
        for (var a = typeof un == "function" && un, l = 0; l < i.length; l++) o(i[l]);
        return o;
      })({ 1: [function(e, r, s) {
        var i = e("./utils"), o = e("./support"), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        s.encode = function(l) {
          for (var d, f, u, m, h, w, g, y = [], _ = 0, S = l.length, C = S, A = i.getTypeOf(l) !== "string"; _ < l.length; ) C = S - _, u = A ? (d = l[_++], f = _ < S ? l[_++] : 0, _ < S ? l[_++] : 0) : (d = l.charCodeAt(_++), f = _ < S ? l.charCodeAt(_++) : 0, _ < S ? l.charCodeAt(_++) : 0), m = d >> 2, h = (3 & d) << 4 | f >> 4, w = 1 < C ? (15 & f) << 2 | u >> 6 : 64, g = 2 < C ? 63 & u : 64, y.push(a.charAt(m) + a.charAt(h) + a.charAt(w) + a.charAt(g));
          return y.join("");
        }, s.decode = function(l) {
          var d, f, u, m, h, w, g = 0, y = 0, _ = "data:";
          if (l.substr(0, _.length) === _) throw new Error("Invalid base64 input, it looks like a data url.");
          var S, C = 3 * (l = l.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (l.charAt(l.length - 1) === a.charAt(64) && C--, l.charAt(l.length - 2) === a.charAt(64) && C--, C % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (S = o.uint8array ? new Uint8Array(0 | C) : new Array(0 | C); g < l.length; ) d = a.indexOf(l.charAt(g++)) << 2 | (m = a.indexOf(l.charAt(g++))) >> 4, f = (15 & m) << 4 | (h = a.indexOf(l.charAt(g++))) >> 2, u = (3 & h) << 6 | (w = a.indexOf(l.charAt(g++))), S[y++] = d, h !== 64 && (S[y++] = f), w !== 64 && (S[y++] = u);
          return S;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(e, r, s) {
        var i = e("./external"), o = e("./stream/DataWorker"), a = e("./stream/Crc32Probe"), l = e("./stream/DataLengthProbe");
        function d(f, u, m, h, w) {
          this.compressedSize = f, this.uncompressedSize = u, this.crc32 = m, this.compression = h, this.compressedContent = w;
        }
        d.prototype = { getContentWorker: function() {
          var f = new o(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new l("data_length")), u = this;
          return f.on("end", function() {
            if (this.streamInfo.data_length !== u.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), f;
        }, getCompressedWorker: function() {
          return new o(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, d.createWorkerFrom = function(f, u, m) {
          return f.pipe(new a()).pipe(new l("uncompressedSize")).pipe(u.compressWorker(m)).pipe(new l("compressedSize")).withStreamInfo("compression", u);
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
          for (var a, l = [], d = 0; d < 256; d++) {
            a = d;
            for (var f = 0; f < 8; f++) a = 1 & a ? 3988292384 ^ a >>> 1 : a >>> 1;
            l[d] = a;
          }
          return l;
        })();
        r.exports = function(a, l) {
          return a !== void 0 && a.length ? i.getTypeOf(a) !== "string" ? (function(d, f, u, m) {
            var h = o, w = m + u;
            d ^= -1;
            for (var g = m; g < w; g++) d = d >>> 8 ^ h[255 & (d ^ f[g])];
            return -1 ^ d;
          })(0 | l, a, a.length, 0) : (function(d, f, u, m) {
            var h = o, w = m + u;
            d ^= -1;
            for (var g = m; g < w; g++) d = d >>> 8 ^ h[255 & (d ^ f.charCodeAt(g))];
            return -1 ^ d;
          })(0 | l, a, a.length, 0) : 0;
        };
      }, { "./utils": 32 }], 5: [function(e, r, s) {
        s.base64 = !1, s.binary = !1, s.dir = !1, s.createFolders = !0, s.date = null, s.compression = null, s.compressionOptions = null, s.comment = null, s.unixPermissions = null, s.dosPermissions = null;
      }, {}], 6: [function(e, r, s) {
        var i = null;
        i = typeof Promise < "u" ? Promise : e("lie"), r.exports = { Promise: i };
      }, { lie: 37 }], 7: [function(e, r, s) {
        var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", o = e("pako"), a = e("./utils"), l = e("./stream/GenericWorker"), d = i ? "uint8array" : "array";
        function f(u, m) {
          l.call(this, "FlateWorker/" + u), this._pako = null, this._pakoAction = u, this._pakoOptions = m, this.meta = {};
        }
        s.magic = "\b\0", a.inherits(f, l), f.prototype.processChunk = function(u) {
          this.meta = u.meta, this._pako === null && this._createPako(), this._pako.push(a.transformTo(d, u.data), !1);
        }, f.prototype.flush = function() {
          l.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
        }, f.prototype.cleanUp = function() {
          l.prototype.cleanUp.call(this), this._pako = null;
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
        function i(h, w) {
          var g, y = "";
          for (g = 0; g < w; g++) y += String.fromCharCode(255 & h), h >>>= 8;
          return y;
        }
        function o(h, w, g, y, _, S) {
          var C, A, v = h.file, T = h.compression, I = S !== d.utf8encode, U = a.transformTo("string", S(v.name)), L = a.transformTo("string", d.utf8encode(v.name)), H = v.comment, J = a.transformTo("string", S(H)), x = a.transformTo("string", d.utf8encode(H)), N = L.length !== v.name.length, p = x.length !== H.length, M = "", et = "", j = "", nt = v.dir, $ = v.date, Q = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          w && !g || (Q.crc32 = h.crc32, Q.compressedSize = h.compressedSize, Q.uncompressedSize = h.uncompressedSize);
          var z = 0;
          w && (z |= 8), I || !N && !p || (z |= 2048);
          var O = 0, X = 0;
          nt && (O |= 16), _ === "UNIX" ? (X = 798, O |= (function(Z, ut) {
            var vt = Z;
            return Z || (vt = ut ? 16893 : 33204), (65535 & vt) << 16;
          })(v.unixPermissions, nt)) : (X = 20, O |= (function(Z) {
            return 63 & (Z || 0);
          })(v.dosPermissions)), C = $.getUTCHours(), C <<= 6, C |= $.getUTCMinutes(), C <<= 5, C |= $.getUTCSeconds() / 2, A = $.getUTCFullYear() - 1980, A <<= 4, A |= $.getUTCMonth() + 1, A <<= 5, A |= $.getUTCDate(), N && (et = i(1, 1) + i(f(U), 4) + L, M += "up" + i(et.length, 2) + et), p && (j = i(1, 1) + i(f(J), 4) + x, M += "uc" + i(j.length, 2) + j);
          var Y = "";
          return Y += `
\0`, Y += i(z, 2), Y += T.magic, Y += i(C, 2), Y += i(A, 2), Y += i(Q.crc32, 4), Y += i(Q.compressedSize, 4), Y += i(Q.uncompressedSize, 4), Y += i(U.length, 2), Y += i(M.length, 2), { fileRecord: u.LOCAL_FILE_HEADER + Y + U + M, dirRecord: u.CENTRAL_FILE_HEADER + i(X, 2) + Y + i(J.length, 2) + "\0\0\0\0" + i(O, 4) + i(y, 4) + U + M + J };
        }
        var a = e("../utils"), l = e("../stream/GenericWorker"), d = e("../utf8"), f = e("../crc32"), u = e("../signature");
        function m(h, w, g, y) {
          l.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = w, this.zipPlatform = g, this.encodeFileName = y, this.streamFiles = h, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        a.inherits(m, l), m.prototype.push = function(h) {
          var w = h.meta.percent || 0, g = this.entriesCount, y = this._sources.length;
          this.accumulate ? this.contentBuffer.push(h) : (this.bytesWritten += h.data.length, l.prototype.push.call(this, { data: h.data, meta: { currentFile: this.currentFile, percent: g ? (w + 100 * (g - y - 1)) / g : 100 } }));
        }, m.prototype.openedSource = function(h) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = h.file.name;
          var w = this.streamFiles && !h.file.dir;
          if (w) {
            var g = o(h, w, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: g.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = !0;
        }, m.prototype.closedSource = function(h) {
          this.accumulate = !1;
          var w = this.streamFiles && !h.file.dir, g = o(h, w, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(g.dirRecord), w) this.push({ data: (function(y) {
            return u.DATA_DESCRIPTOR + i(y.crc32, 4) + i(y.compressedSize, 4) + i(y.uncompressedSize, 4);
          })(h), meta: { percent: 100 } });
          else for (this.push({ data: g.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, m.prototype.flush = function() {
          for (var h = this.bytesWritten, w = 0; w < this.dirRecords.length; w++) this.push({ data: this.dirRecords[w], meta: { percent: 100 } });
          var g = this.bytesWritten - h, y = (function(_, S, C, A, v) {
            var T = a.transformTo("string", v(A));
            return u.CENTRAL_DIRECTORY_END + "\0\0\0\0" + i(_, 2) + i(_, 2) + i(S, 4) + i(C, 4) + i(T.length, 2) + T;
          })(this.dirRecords.length, g, h, this.zipComment, this.encodeFileName);
          this.push({ data: y, meta: { percent: 100 } });
        }, m.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, m.prototype.registerPrevious = function(h) {
          this._sources.push(h);
          var w = this;
          return h.on("data", function(g) {
            w.processChunk(g);
          }), h.on("end", function() {
            w.closedSource(w.previous.streamInfo), w._sources.length ? w.prepareNextSource() : w.end();
          }), h.on("error", function(g) {
            w.error(g);
          }), this;
        }, m.prototype.resume = function() {
          return !!l.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
        }, m.prototype.error = function(h) {
          var w = this._sources;
          if (!l.prototype.error.call(this, h)) return !1;
          for (var g = 0; g < w.length; g++) try {
            w[g].error(h);
          } catch {
          }
          return !0;
        }, m.prototype.lock = function() {
          l.prototype.lock.call(this);
          for (var h = this._sources, w = 0; w < h.length; w++) h[w].lock();
        }, r.exports = m;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, r, s) {
        var i = e("../compressions"), o = e("./ZipFileWorker");
        s.generateWorker = function(a, l, d) {
          var f = new o(l.streamFiles, d, l.platform, l.encodeFileName), u = 0;
          try {
            a.forEach(function(m, h) {
              u++;
              var w = (function(S, C) {
                var A = S || C, v = i[A];
                if (!v) throw new Error(A + " is not a valid compression method !");
                return v;
              })(h.options.compression, l.compression), g = h.options.compressionOptions || l.compressionOptions || {}, y = h.dir, _ = h.date;
              h._compressWorker(w, g).withStreamInfo("file", { name: m, dir: y, date: _, comment: h.comment || "", unixPermissions: h.unixPermissions, dosPermissions: h.dosPermissions }).pipe(f);
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
        var i = e("./utils"), o = e("./external"), a = e("./utf8"), l = e("./zipEntries"), d = e("./stream/Crc32Probe"), f = e("./nodejsUtils");
        function u(m) {
          return new o.Promise(function(h, w) {
            var g = m.decompressed.getContentWorker().pipe(new d());
            g.on("error", function(y) {
              w(y);
            }).on("end", function() {
              g.streamInfo.crc32 !== m.decompressed.crc32 ? w(new Error("Corrupted zip : CRC32 mismatch")) : h();
            }).resume();
          });
        }
        r.exports = function(m, h) {
          var w = this;
          return h = i.extend(h || {}, { base64: !1, checkCRC32: !1, optimizedBinaryString: !1, createFolders: !1, decodeFileName: a.utf8decode }), f.isNode && f.isStream(m) ? o.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : i.prepareContent("the loaded zip file", m, !0, h.optimizedBinaryString, h.base64).then(function(g) {
            var y = new l(h);
            return y.load(g), y;
          }).then(function(g) {
            var y = [o.Promise.resolve(g)], _ = g.files;
            if (h.checkCRC32) for (var S = 0; S < _.length; S++) y.push(u(_[S]));
            return o.Promise.all(y);
          }).then(function(g) {
            for (var y = g.shift(), _ = y.files, S = 0; S < _.length; S++) {
              var C = _[S], A = C.fileNameStr, v = i.resolve(C.fileNameStr);
              w.file(v, C.decompressed, { binary: !0, optimizedBinaryString: !0, date: C.date, dir: C.dir, comment: C.fileCommentStr.length ? C.fileCommentStr : null, unixPermissions: C.unixPermissions, dosPermissions: C.dosPermissions, createFolders: h.createFolders }), C.dir || (w.file(v).unsafeOriginalName = A);
            }
            return y.zipComment.length && (w.comment = y.zipComment), w;
          });
        };
      }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, r, s) {
        var i = e("../utils"), o = e("../stream/GenericWorker");
        function a(l, d) {
          o.call(this, "Nodejs stream input adapter for " + l), this._upstreamEnded = !1, this._bindStream(d);
        }
        i.inherits(a, o), a.prototype._bindStream = function(l) {
          var d = this;
          (this._stream = l).pause(), l.on("data", function(f) {
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
        function o(a, l, d) {
          i.call(this, l), this._helper = a;
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
        function i(v, T, I) {
          var U, L = a.getTypeOf(T), H = a.extend(I || {}, f);
          H.date = H.date || /* @__PURE__ */ new Date(), H.compression !== null && (H.compression = H.compression.toUpperCase()), typeof H.unixPermissions == "string" && (H.unixPermissions = parseInt(H.unixPermissions, 8)), H.unixPermissions && 16384 & H.unixPermissions && (H.dir = !0), H.dosPermissions && 16 & H.dosPermissions && (H.dir = !0), H.dir && (v = _(v)), H.createFolders && (U = y(v)) && S.call(this, U, !0);
          var J = L === "string" && H.binary === !1 && H.base64 === !1;
          I && I.binary !== void 0 || (H.binary = !J), (T instanceof u && T.uncompressedSize === 0 || H.dir || !T || T.length === 0) && (H.base64 = !1, H.binary = !0, T = "", H.compression = "STORE", L = "string");
          var x = null;
          x = T instanceof u || T instanceof l ? T : w.isNode && w.isStream(T) ? new g(v, T) : a.prepareContent(v, T, H.binary, H.optimizedBinaryString, H.base64);
          var N = new m(v, x, H);
          this.files[v] = N;
        }
        var o = e("./utf8"), a = e("./utils"), l = e("./stream/GenericWorker"), d = e("./stream/StreamHelper"), f = e("./defaults"), u = e("./compressedObject"), m = e("./zipObject"), h = e("./generate"), w = e("./nodejsUtils"), g = e("./nodejs/NodejsStreamInputAdapter"), y = function(v) {
          v.slice(-1) === "/" && (v = v.substring(0, v.length - 1));
          var T = v.lastIndexOf("/");
          return 0 < T ? v.substring(0, T) : "";
        }, _ = function(v) {
          return v.slice(-1) !== "/" && (v += "/"), v;
        }, S = function(v, T) {
          return T = T !== void 0 ? T : f.createFolders, v = _(v), this.files[v] || i.call(this, v, null, { dir: !0, createFolders: T }), this.files[v];
        };
        function C(v) {
          return Object.prototype.toString.call(v) === "[object RegExp]";
        }
        var A = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(v) {
          var T, I, U;
          for (T in this.files) U = this.files[T], (I = T.slice(this.root.length, T.length)) && T.slice(0, this.root.length) === this.root && v(I, U);
        }, filter: function(v) {
          var T = [];
          return this.forEach(function(I, U) {
            v(I, U) && T.push(U);
          }), T;
        }, file: function(v, T, I) {
          if (arguments.length !== 1) return v = this.root + v, i.call(this, v, T, I), this;
          if (C(v)) {
            var U = v;
            return this.filter(function(H, J) {
              return !J.dir && U.test(H);
            });
          }
          var L = this.files[this.root + v];
          return L && !L.dir ? L : null;
        }, folder: function(v) {
          if (!v) return this;
          if (C(v)) return this.filter(function(L, H) {
            return H.dir && v.test(L);
          });
          var T = this.root + v, I = S.call(this, T), U = this.clone();
          return U.root = I.name, U;
        }, remove: function(v) {
          v = this.root + v;
          var T = this.files[v];
          if (T || (v.slice(-1) !== "/" && (v += "/"), T = this.files[v]), T && !T.dir) delete this.files[v];
          else for (var I = this.filter(function(L, H) {
            return H.name.slice(0, v.length) === v;
          }), U = 0; U < I.length; U++) delete this.files[I[U].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(v) {
          var T, I = {};
          try {
            if ((I = a.extend(v || {}, { streamFiles: !1, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: o.utf8encode })).type = I.type.toLowerCase(), I.compression = I.compression.toUpperCase(), I.type === "binarystring" && (I.type = "string"), !I.type) throw new Error("No output type specified.");
            a.checkSupport(I.type), I.platform !== "darwin" && I.platform !== "freebsd" && I.platform !== "linux" && I.platform !== "sunos" || (I.platform = "UNIX"), I.platform === "win32" && (I.platform = "DOS");
            var U = I.comment || this.comment || "";
            T = h.generateWorker(this, I, U);
          } catch (L) {
            (T = new l("error")).error(L);
          }
          return new d(T, I.type || "string", I.mimeType);
        }, generateAsync: function(v, T) {
          return this.generateInternalStream(v).accumulate(T);
        }, generateNodeStream: function(v, T) {
          return (v = v || {}).type || (v.type = "nodebuffer"), this.generateInternalStream(v).toNodejsStream(T);
        } };
        r.exports = A;
      }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(e, r, s) {
        r.exports = e("stream");
      }, { stream: void 0 }], 17: [function(e, r, s) {
        var i = e("./DataReader");
        function o(a) {
          i.call(this, a);
          for (var l = 0; l < this.data.length; l++) a[l] = 255 & a[l];
        }
        e("../utils").inherits(o, i), o.prototype.byteAt = function(a) {
          return this.data[this.zero + a];
        }, o.prototype.lastIndexOfSignature = function(a) {
          for (var l = a.charCodeAt(0), d = a.charCodeAt(1), f = a.charCodeAt(2), u = a.charCodeAt(3), m = this.length - 4; 0 <= m; --m) if (this.data[m] === l && this.data[m + 1] === d && this.data[m + 2] === f && this.data[m + 3] === u) return m - this.zero;
          return -1;
        }, o.prototype.readAndCheckSignature = function(a) {
          var l = a.charCodeAt(0), d = a.charCodeAt(1), f = a.charCodeAt(2), u = a.charCodeAt(3), m = this.readData(4);
          return l === m[0] && d === m[1] && f === m[2] && u === m[3];
        }, o.prototype.readData = function(a) {
          if (this.checkOffset(a), a === 0) return [];
          var l = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, l;
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
          var l, d = 0;
          for (this.checkOffset(a), l = this.index + a - 1; l >= this.index; l--) d = (d << 8) + this.byteAt(l);
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
          var l = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, l;
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
          var l = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, l;
        }, r.exports = o;
      }, { "../utils": 32, "./DataReader": 18 }], 21: [function(e, r, s) {
        var i = e("./ArrayReader");
        function o(a) {
          i.call(this, a);
        }
        e("../utils").inherits(o, i), o.prototype.readData = function(a) {
          if (this.checkOffset(a), a === 0) return new Uint8Array(0);
          var l = this.data.subarray(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, l;
        }, r.exports = o;
      }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(e, r, s) {
        var i = e("../utils"), o = e("../support"), a = e("./ArrayReader"), l = e("./StringReader"), d = e("./NodeBufferReader"), f = e("./Uint8ArrayReader");
        r.exports = function(u) {
          var m = i.getTypeOf(u);
          return i.checkSupport(m), m !== "string" || o.uint8array ? m === "nodebuffer" ? new d(u) : o.uint8array ? new f(i.transformTo("uint8array", u)) : new a(i.transformTo("array", u)) : new l(u);
        };
      }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(e, r, s) {
        s.LOCAL_FILE_HEADER = "PK", s.CENTRAL_FILE_HEADER = "PK", s.CENTRAL_DIRECTORY_END = "PK", s.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", s.ZIP64_CENTRAL_DIRECTORY_END = "PK", s.DATA_DESCRIPTOR = "PK\x07\b";
      }, {}], 24: [function(e, r, s) {
        var i = e("./GenericWorker"), o = e("../utils");
        function a(l) {
          i.call(this, "ConvertWorker to " + l), this.destType = l;
        }
        o.inherits(a, i), a.prototype.processChunk = function(l) {
          this.push({ data: o.transformTo(this.destType, l.data), meta: l.meta });
        }, r.exports = a;
      }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(e, r, s) {
        var i = e("./GenericWorker"), o = e("../crc32");
        function a() {
          i.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
        }
        e("../utils").inherits(a, i), a.prototype.processChunk = function(l) {
          this.streamInfo.crc32 = o(l.data, this.streamInfo.crc32 || 0), this.push(l);
        }, r.exports = a;
      }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(e, r, s) {
        var i = e("../utils"), o = e("./GenericWorker");
        function a(l) {
          o.call(this, "DataLengthProbe for " + l), this.propName = l, this.withStreamInfo(l, 0);
        }
        i.inherits(a, o), a.prototype.processChunk = function(l) {
          if (l) {
            var d = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = d + l.data.length;
          }
          o.prototype.processChunk.call(this, l);
        }, r.exports = a;
      }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, r, s) {
        var i = e("../utils"), o = e("./GenericWorker");
        function a(l) {
          o.call(this, "DataWorker");
          var d = this;
          this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, l.then(function(f) {
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
          var l = null, d = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              l = this.data.substring(this.index, d);
              break;
            case "uint8array":
              l = this.data.subarray(this.index, d);
              break;
            case "array":
            case "nodebuffer":
              l = this.data.slice(this.index, d);
          }
          return this.index = d, this.push({ data: l, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
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
          if (this._listeners[o]) for (var l = 0; l < this._listeners[o].length; l++) this._listeners[o][l].call(this, a);
        }, pipe: function(o) {
          return o.registerPrevious(this);
        }, registerPrevious: function(o) {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.streamInfo = o.streamInfo, this.mergeStreamInfo(), this.previous = o;
          var a = this;
          return o.on("data", function(l) {
            a.processChunk(l);
          }), o.on("end", function() {
            a.end();
          }), o.on("error", function(l) {
            a.error(l);
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
        var i = e("../utils"), o = e("./ConvertWorker"), a = e("./GenericWorker"), l = e("../base64"), d = e("../support"), f = e("../external"), u = null;
        if (d.nodestream) try {
          u = e("../nodejs/NodejsStreamOutputAdapter");
        } catch {
        }
        function m(w, g) {
          return new f.Promise(function(y, _) {
            var S = [], C = w._internalType, A = w._outputType, v = w._mimeType;
            w.on("data", function(T, I) {
              S.push(T), g && g(I);
            }).on("error", function(T) {
              S = [], _(T);
            }).on("end", function() {
              try {
                var T = (function(I, U, L) {
                  switch (I) {
                    case "blob":
                      return i.newBlob(i.transformTo("arraybuffer", U), L);
                    case "base64":
                      return l.encode(U);
                    default:
                      return i.transformTo(I, U);
                  }
                })(A, (function(I, U) {
                  var L, H = 0, J = null, x = 0;
                  for (L = 0; L < U.length; L++) x += U[L].length;
                  switch (I) {
                    case "string":
                      return U.join("");
                    case "array":
                      return Array.prototype.concat.apply([], U);
                    case "uint8array":
                      for (J = new Uint8Array(x), L = 0; L < U.length; L++) J.set(U[L], H), H += U[L].length;
                      return J;
                    case "nodebuffer":
                      return Buffer.concat(U);
                    default:
                      throw new Error("concat : unsupported type '" + I + "'");
                  }
                })(C, S), v);
                y(T);
              } catch (I) {
                _(I);
              }
              S = [];
            }).resume();
          });
        }
        function h(w, g, y) {
          var _ = g;
          switch (g) {
            case "blob":
            case "arraybuffer":
              _ = "uint8array";
              break;
            case "base64":
              _ = "string";
          }
          try {
            this._internalType = _, this._outputType = g, this._mimeType = y, i.checkSupport(_), this._worker = w.pipe(new o(_)), w.lock();
          } catch (S) {
            this._worker = new a("error"), this._worker.error(S);
          }
        }
        h.prototype = { accumulate: function(w) {
          return m(this, w);
        }, on: function(w, g) {
          var y = this;
          return w === "data" ? this._worker.on(w, function(_) {
            g.call(y, _.data, _.meta);
          }) : this._worker.on(w, function() {
            i.delay(g, arguments, y);
          }), this;
        }, resume: function() {
          return i.delay(this._worker.resume, [], this._worker), this;
        }, pause: function() {
          return this._worker.pause(), this;
        }, toNodejsStream: function(w) {
          if (i.checkSupport("nodestream"), this._outputType !== "nodebuffer") throw new Error(this._outputType + " is not supported by this method");
          return new u(this, { objectMode: this._outputType !== "nodebuffer" }, w);
        } }, r.exports = h;
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
        for (var i = e("./utils"), o = e("./support"), a = e("./nodejsUtils"), l = e("./stream/GenericWorker"), d = new Array(256), f = 0; f < 256; f++) d[f] = 252 <= f ? 6 : 248 <= f ? 5 : 240 <= f ? 4 : 224 <= f ? 3 : 192 <= f ? 2 : 1;
        d[254] = d[254] = 1;
        function u() {
          l.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function m() {
          l.call(this, "utf-8 encode");
        }
        s.utf8encode = function(h) {
          return o.nodebuffer ? a.newBufferFrom(h, "utf-8") : (function(w) {
            var g, y, _, S, C, A = w.length, v = 0;
            for (S = 0; S < A; S++) (64512 & (y = w.charCodeAt(S))) == 55296 && S + 1 < A && (64512 & (_ = w.charCodeAt(S + 1))) == 56320 && (y = 65536 + (y - 55296 << 10) + (_ - 56320), S++), v += y < 128 ? 1 : y < 2048 ? 2 : y < 65536 ? 3 : 4;
            for (g = o.uint8array ? new Uint8Array(v) : new Array(v), S = C = 0; C < v; S++) (64512 & (y = w.charCodeAt(S))) == 55296 && S + 1 < A && (64512 & (_ = w.charCodeAt(S + 1))) == 56320 && (y = 65536 + (y - 55296 << 10) + (_ - 56320), S++), y < 128 ? g[C++] = y : (y < 2048 ? g[C++] = 192 | y >>> 6 : (y < 65536 ? g[C++] = 224 | y >>> 12 : (g[C++] = 240 | y >>> 18, g[C++] = 128 | y >>> 12 & 63), g[C++] = 128 | y >>> 6 & 63), g[C++] = 128 | 63 & y);
            return g;
          })(h);
        }, s.utf8decode = function(h) {
          return o.nodebuffer ? i.transformTo("nodebuffer", h).toString("utf-8") : (function(w) {
            var g, y, _, S, C = w.length, A = new Array(2 * C);
            for (g = y = 0; g < C; ) if ((_ = w[g++]) < 128) A[y++] = _;
            else if (4 < (S = d[_])) A[y++] = 65533, g += S - 1;
            else {
              for (_ &= S === 2 ? 31 : S === 3 ? 15 : 7; 1 < S && g < C; ) _ = _ << 6 | 63 & w[g++], S--;
              1 < S ? A[y++] = 65533 : _ < 65536 ? A[y++] = _ : (_ -= 65536, A[y++] = 55296 | _ >> 10 & 1023, A[y++] = 56320 | 1023 & _);
            }
            return A.length !== y && (A.subarray ? A = A.subarray(0, y) : A.length = y), i.applyFromCharCode(A);
          })(h = i.transformTo(o.uint8array ? "uint8array" : "array", h));
        }, i.inherits(u, l), u.prototype.processChunk = function(h) {
          var w = i.transformTo(o.uint8array ? "uint8array" : "array", h.data);
          if (this.leftOver && this.leftOver.length) {
            if (o.uint8array) {
              var g = w;
              (w = new Uint8Array(g.length + this.leftOver.length)).set(this.leftOver, 0), w.set(g, this.leftOver.length);
            } else w = this.leftOver.concat(w);
            this.leftOver = null;
          }
          var y = (function(S, C) {
            var A;
            for ((C = C || S.length) > S.length && (C = S.length), A = C - 1; 0 <= A && (192 & S[A]) == 128; ) A--;
            return A < 0 || A === 0 ? C : A + d[S[A]] > C ? A : C;
          })(w), _ = w;
          y !== w.length && (o.uint8array ? (_ = w.subarray(0, y), this.leftOver = w.subarray(y, w.length)) : (_ = w.slice(0, y), this.leftOver = w.slice(y, w.length))), this.push({ data: s.utf8decode(_), meta: h.meta });
        }, u.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, s.Utf8DecodeWorker = u, i.inherits(m, l), m.prototype.processChunk = function(h) {
          this.push({ data: s.utf8encode(h.data), meta: h.meta });
        }, s.Utf8EncodeWorker = m;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, r, s) {
        var i = e("./support"), o = e("./base64"), a = e("./nodejsUtils"), l = e("./external");
        function d(g) {
          return g;
        }
        function f(g, y) {
          for (var _ = 0; _ < g.length; ++_) y[_] = 255 & g.charCodeAt(_);
          return y;
        }
        e("setimmediate"), s.newBlob = function(g, y) {
          s.checkSupport("blob");
          try {
            return new Blob([g], { type: y });
          } catch {
            try {
              var _ = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return _.append(g), _.getBlob(y);
            } catch {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var u = { stringifyByChunk: function(g, y, _) {
          var S = [], C = 0, A = g.length;
          if (A <= _) return String.fromCharCode.apply(null, g);
          for (; C < A; ) y === "array" || y === "nodebuffer" ? S.push(String.fromCharCode.apply(null, g.slice(C, Math.min(C + _, A)))) : S.push(String.fromCharCode.apply(null, g.subarray(C, Math.min(C + _, A)))), C += _;
          return S.join("");
        }, stringifyByChar: function(g) {
          for (var y = "", _ = 0; _ < g.length; _++) y += String.fromCharCode(g[_]);
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
        function m(g) {
          var y = 65536, _ = s.getTypeOf(g), S = !0;
          if (_ === "uint8array" ? S = u.applyCanBeUsed.uint8array : _ === "nodebuffer" && (S = u.applyCanBeUsed.nodebuffer), S) for (; 1 < y; ) try {
            return u.stringifyByChunk(g, _, y);
          } catch {
            y = Math.floor(y / 2);
          }
          return u.stringifyByChar(g);
        }
        function h(g, y) {
          for (var _ = 0; _ < g.length; _++) y[_] = g[_];
          return y;
        }
        s.applyFromCharCode = m;
        var w = {};
        w.string = { string: d, array: function(g) {
          return f(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return w.string.uint8array(g).buffer;
        }, uint8array: function(g) {
          return f(g, new Uint8Array(g.length));
        }, nodebuffer: function(g) {
          return f(g, a.allocBuffer(g.length));
        } }, w.array = { string: m, array: d, arraybuffer: function(g) {
          return new Uint8Array(g).buffer;
        }, uint8array: function(g) {
          return new Uint8Array(g);
        }, nodebuffer: function(g) {
          return a.newBufferFrom(g);
        } }, w.arraybuffer = { string: function(g) {
          return m(new Uint8Array(g));
        }, array: function(g) {
          return h(new Uint8Array(g), new Array(g.byteLength));
        }, arraybuffer: d, uint8array: function(g) {
          return new Uint8Array(g);
        }, nodebuffer: function(g) {
          return a.newBufferFrom(new Uint8Array(g));
        } }, w.uint8array = { string: m, array: function(g) {
          return h(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return g.buffer;
        }, uint8array: d, nodebuffer: function(g) {
          return a.newBufferFrom(g);
        } }, w.nodebuffer = { string: m, array: function(g) {
          return h(g, new Array(g.length));
        }, arraybuffer: function(g) {
          return w.nodebuffer.uint8array(g).buffer;
        }, uint8array: function(g) {
          return h(g, new Uint8Array(g.length));
        }, nodebuffer: d }, s.transformTo = function(g, y) {
          if (y = y || "", !g) return y;
          s.checkSupport(g);
          var _ = s.getTypeOf(y);
          return w[_][g](y);
        }, s.resolve = function(g) {
          for (var y = g.split("/"), _ = [], S = 0; S < y.length; S++) {
            var C = y[S];
            C === "." || C === "" && S !== 0 && S !== y.length - 1 || (C === ".." ? _.pop() : _.push(C));
          }
          return _.join("/");
        }, s.getTypeOf = function(g) {
          return typeof g == "string" ? "string" : Object.prototype.toString.call(g) === "[object Array]" ? "array" : i.nodebuffer && a.isBuffer(g) ? "nodebuffer" : i.uint8array && g instanceof Uint8Array ? "uint8array" : i.arraybuffer && g instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, s.checkSupport = function(g) {
          if (!i[g.toLowerCase()]) throw new Error(g + " is not supported by this platform");
        }, s.MAX_VALUE_16BITS = 65535, s.MAX_VALUE_32BITS = -1, s.pretty = function(g) {
          var y, _, S = "";
          for (_ = 0; _ < (g || "").length; _++) S += "\\x" + ((y = g.charCodeAt(_)) < 16 ? "0" : "") + y.toString(16).toUpperCase();
          return S;
        }, s.delay = function(g, y, _) {
          setImmediate(function() {
            g.apply(_ || null, y || []);
          });
        }, s.inherits = function(g, y) {
          function _() {
          }
          _.prototype = y.prototype, g.prototype = new _();
        }, s.extend = function() {
          var g, y, _ = {};
          for (g = 0; g < arguments.length; g++) for (y in arguments[g]) Object.prototype.hasOwnProperty.call(arguments[g], y) && _[y] === void 0 && (_[y] = arguments[g][y]);
          return _;
        }, s.prepareContent = function(g, y, _, S, C) {
          return l.Promise.resolve(y).then(function(A) {
            return i.blob && (A instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(A)) !== -1) && typeof FileReader < "u" ? new l.Promise(function(v, T) {
              var I = new FileReader();
              I.onload = function(U) {
                v(U.target.result);
              }, I.onerror = function(U) {
                T(U.target.error);
              }, I.readAsArrayBuffer(A);
            }) : A;
          }).then(function(A) {
            var v = s.getTypeOf(A);
            return v ? (v === "arraybuffer" ? A = s.transformTo("uint8array", A) : v === "string" && (C ? A = o.decode(A) : _ && S !== !0 && (A = (function(T) {
              return f(T, i.uint8array ? new Uint8Array(T.length) : new Array(T.length));
            })(A))), A) : l.Promise.reject(new Error("Can't read the data of '" + g + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./signature"), l = e("./zipEntry"), d = e("./support");
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
          var h = this.reader.index;
          this.reader.setIndex(u);
          var w = this.reader.readString(4) === m;
          return this.reader.setIndex(h), w;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var u = this.reader.readData(this.zipCommentLength), m = d.uint8array ? "uint8array" : "array", h = o.transformTo(m, u);
          this.zipComment = this.loadOptions.decodeFileName(h);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var u, m, h, w = this.zip64EndOfCentralSize - 44; 0 < w; ) u = this.reader.readInt(2), m = this.reader.readInt(4), h = this.reader.readData(m), this.zip64ExtensibleData[u] = { id: u, length: m, value: h };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var u, m;
          for (u = 0; u < this.files.length; u++) m = this.files[u], this.reader.setIndex(m.localHeaderOffset), this.checkSignature(a.LOCAL_FILE_HEADER), m.readLocalPart(this.reader), m.handleUTF8(), m.processAttributes();
        }, readCentralDir: function() {
          var u;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER); ) (u = new l({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(u);
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
          var h = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (h += 20, h += 12 + this.zip64EndOfCentralSize);
          var w = m - h;
          if (0 < w) this.isSignature(m, a.CENTRAL_FILE_HEADER) || (this.reader.zero = w);
          else if (w < 0) throw new Error("Corrupted zip: missing " + Math.abs(w) + " bytes.");
        }, prepareReader: function(u) {
          this.reader = i(u);
        }, load: function(u) {
          this.prepareReader(u), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, r.exports = f;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, r, s) {
        var i = e("./reader/readerFor"), o = e("./utils"), a = e("./compressedObject"), l = e("./crc32"), d = e("./utf8"), f = e("./compressions"), u = e("./support");
        function m(h, w) {
          this.options = h, this.loadOptions = w;
        }
        m.prototype = { isEncrypted: function() {
          return (1 & this.bitFlag) == 1;
        }, useUTF8: function() {
          return (2048 & this.bitFlag) == 2048;
        }, readLocalPart: function(h) {
          var w, g;
          if (h.skip(22), this.fileNameLength = h.readInt(2), g = h.readInt(2), this.fileName = h.readData(this.fileNameLength), h.skip(g), this.compressedSize === -1 || this.uncompressedSize === -1) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if ((w = (function(y) {
            for (var _ in f) if (Object.prototype.hasOwnProperty.call(f, _) && f[_].magic === y) return f[_];
            return null;
          })(this.compressionMethod)) === null) throw new Error("Corrupted zip : compression " + o.pretty(this.compressionMethod) + " unknown (inner file : " + o.transformTo("string", this.fileName) + ")");
          this.decompressed = new a(this.compressedSize, this.uncompressedSize, this.crc32, w, h.readData(this.compressedSize));
        }, readCentralPart: function(h) {
          this.versionMadeBy = h.readInt(2), h.skip(2), this.bitFlag = h.readInt(2), this.compressionMethod = h.readString(2), this.date = h.readDate(), this.crc32 = h.readInt(4), this.compressedSize = h.readInt(4), this.uncompressedSize = h.readInt(4);
          var w = h.readInt(2);
          if (this.extraFieldsLength = h.readInt(2), this.fileCommentLength = h.readInt(2), this.diskNumberStart = h.readInt(2), this.internalFileAttributes = h.readInt(2), this.externalFileAttributes = h.readInt(4), this.localHeaderOffset = h.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
          h.skip(w), this.readExtraFields(h), this.parseZIP64ExtraField(h), this.fileComment = h.readData(this.fileCommentLength);
        }, processAttributes: function() {
          this.unixPermissions = null, this.dosPermissions = null;
          var h = this.versionMadeBy >> 8;
          this.dir = !!(16 & this.externalFileAttributes), h == 0 && (this.dosPermissions = 63 & this.externalFileAttributes), h == 3 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || this.fileNameStr.slice(-1) !== "/" || (this.dir = !0);
        }, parseZIP64ExtraField: function() {
          if (this.extraFields[1]) {
            var h = i(this.extraFields[1].value);
            this.uncompressedSize === o.MAX_VALUE_32BITS && (this.uncompressedSize = h.readInt(8)), this.compressedSize === o.MAX_VALUE_32BITS && (this.compressedSize = h.readInt(8)), this.localHeaderOffset === o.MAX_VALUE_32BITS && (this.localHeaderOffset = h.readInt(8)), this.diskNumberStart === o.MAX_VALUE_32BITS && (this.diskNumberStart = h.readInt(4));
          }
        }, readExtraFields: function(h) {
          var w, g, y, _ = h.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); h.index + 4 < _; ) w = h.readInt(2), g = h.readInt(2), y = h.readData(g), this.extraFields[w] = { id: w, length: g, value: y };
          h.setIndex(_);
        }, handleUTF8: function() {
          var h = u.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = d.utf8decode(this.fileName), this.fileCommentStr = d.utf8decode(this.fileComment);
          else {
            var w = this.findExtraFieldUnicodePath();
            if (w !== null) this.fileNameStr = w;
            else {
              var g = o.transformTo(h, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(g);
            }
            var y = this.findExtraFieldUnicodeComment();
            if (y !== null) this.fileCommentStr = y;
            else {
              var _ = o.transformTo(h, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(_);
            }
          }
        }, findExtraFieldUnicodePath: function() {
          var h = this.extraFields[28789];
          if (h) {
            var w = i(h.value);
            return w.readInt(1) !== 1 || l(this.fileName) !== w.readInt(4) ? null : d.utf8decode(w.readData(h.length - 5));
          }
          return null;
        }, findExtraFieldUnicodeComment: function() {
          var h = this.extraFields[25461];
          if (h) {
            var w = i(h.value);
            return w.readInt(1) !== 1 || l(this.fileComment) !== w.readInt(4) ? null : d.utf8decode(w.readData(h.length - 5));
          }
          return null;
        } }, r.exports = m;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, r, s) {
        function i(w, g, y) {
          this.name = w, this.dir = y.dir, this.date = y.date, this.comment = y.comment, this.unixPermissions = y.unixPermissions, this.dosPermissions = y.dosPermissions, this._data = g, this._dataBinary = y.binary, this.options = { compression: y.compression, compressionOptions: y.compressionOptions };
        }
        var o = e("./stream/StreamHelper"), a = e("./stream/DataWorker"), l = e("./utf8"), d = e("./compressedObject"), f = e("./stream/GenericWorker");
        i.prototype = { internalStream: function(w) {
          var g = null, y = "string";
          try {
            if (!w) throw new Error("No output type specified.");
            var _ = (y = w.toLowerCase()) === "string" || y === "text";
            y !== "binarystring" && y !== "text" || (y = "string"), g = this._decompressWorker();
            var S = !this._dataBinary;
            S && !_ && (g = g.pipe(new l.Utf8EncodeWorker())), !S && _ && (g = g.pipe(new l.Utf8DecodeWorker()));
          } catch (C) {
            (g = new f("error")).error(C);
          }
          return new o(g, y, "");
        }, async: function(w, g) {
          return this.internalStream(w).accumulate(g);
        }, nodeStream: function(w, g) {
          return this.internalStream(w || "nodebuffer").toNodejsStream(g);
        }, _compressWorker: function(w, g) {
          if (this._data instanceof d && this._data.compression.magic === w.magic) return this._data.getCompressedWorker();
          var y = this._decompressWorker();
          return this._dataBinary || (y = y.pipe(new l.Utf8EncodeWorker())), d.createWorkerFrom(y, w, g);
        }, _decompressWorker: function() {
          return this._data instanceof d ? this._data.getContentWorker() : this._data instanceof f ? this._data : new a(this._data);
        } };
        for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], m = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, h = 0; h < u.length; h++) i.prototype[u[h]] = m;
        r.exports = i;
      }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, r, s) {
        (function(i) {
          var o, a, l = i.MutationObserver || i.WebKitMutationObserver;
          if (l) {
            var d = 0, f = new l(w), u = i.document.createTextNode("");
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
            var m = new i.MessageChannel();
            m.port1.onmessage = w, o = function() {
              m.port2.postMessage(0);
            };
          }
          var h = [];
          function w() {
            var g, y;
            a = !0;
            for (var _ = h.length; _; ) {
              for (y = h, h = [], g = -1; ++g < _; ) y[g]();
              _ = h.length;
            }
            a = !1;
          }
          r.exports = function(g) {
            h.push(g) !== 1 || a || o();
          };
        }).call(this, typeof hn < "u" ? hn : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}], 37: [function(e, r, s) {
        var i = e("immediate");
        function o() {
        }
        var a = {}, l = ["REJECTED"], d = ["FULFILLED"], f = ["PENDING"];
        function u(_) {
          if (typeof _ != "function") throw new TypeError("resolver must be a function");
          this.state = f, this.queue = [], this.outcome = void 0, _ !== o && g(this, _);
        }
        function m(_, S, C) {
          this.promise = _, typeof S == "function" && (this.onFulfilled = S, this.callFulfilled = this.otherCallFulfilled), typeof C == "function" && (this.onRejected = C, this.callRejected = this.otherCallRejected);
        }
        function h(_, S, C) {
          i(function() {
            var A;
            try {
              A = S(C);
            } catch (v) {
              return a.reject(_, v);
            }
            A === _ ? a.reject(_, new TypeError("Cannot resolve promise with itself")) : a.resolve(_, A);
          });
        }
        function w(_) {
          var S = _ && _.then;
          if (_ && (typeof _ == "object" || typeof _ == "function") && typeof S == "function") return function() {
            S.apply(_, arguments);
          };
        }
        function g(_, S) {
          var C = !1;
          function A(I) {
            C || (C = !0, a.reject(_, I));
          }
          function v(I) {
            C || (C = !0, a.resolve(_, I));
          }
          var T = y(function() {
            S(v, A);
          });
          T.status === "error" && A(T.value);
        }
        function y(_, S) {
          var C = {};
          try {
            C.value = _(S), C.status = "success";
          } catch (A) {
            C.status = "error", C.value = A;
          }
          return C;
        }
        (r.exports = u).prototype.finally = function(_) {
          if (typeof _ != "function") return this;
          var S = this.constructor;
          return this.then(function(C) {
            return S.resolve(_()).then(function() {
              return C;
            });
          }, function(C) {
            return S.resolve(_()).then(function() {
              throw C;
            });
          });
        }, u.prototype.catch = function(_) {
          return this.then(null, _);
        }, u.prototype.then = function(_, S) {
          if (typeof _ != "function" && this.state === d || typeof S != "function" && this.state === l) return this;
          var C = new this.constructor(o);
          return this.state !== f ? h(C, this.state === d ? _ : S, this.outcome) : this.queue.push(new m(C, _, S)), C;
        }, m.prototype.callFulfilled = function(_) {
          a.resolve(this.promise, _);
        }, m.prototype.otherCallFulfilled = function(_) {
          h(this.promise, this.onFulfilled, _);
        }, m.prototype.callRejected = function(_) {
          a.reject(this.promise, _);
        }, m.prototype.otherCallRejected = function(_) {
          h(this.promise, this.onRejected, _);
        }, a.resolve = function(_, S) {
          var C = y(w, S);
          if (C.status === "error") return a.reject(_, C.value);
          var A = C.value;
          if (A) g(_, A);
          else {
            _.state = d, _.outcome = S;
            for (var v = -1, T = _.queue.length; ++v < T; ) _.queue[v].callFulfilled(S);
          }
          return _;
        }, a.reject = function(_, S) {
          _.state = l, _.outcome = S;
          for (var C = -1, A = _.queue.length; ++C < A; ) _.queue[C].callRejected(S);
          return _;
        }, u.resolve = function(_) {
          return _ instanceof this ? _ : a.resolve(new this(o), _);
        }, u.reject = function(_) {
          var S = new this(o);
          return a.reject(S, _);
        }, u.all = function(_) {
          var S = this;
          if (Object.prototype.toString.call(_) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var C = _.length, A = !1;
          if (!C) return this.resolve([]);
          for (var v = new Array(C), T = 0, I = -1, U = new this(o); ++I < C; ) L(_[I], I);
          return U;
          function L(H, J) {
            S.resolve(H).then(function(x) {
              v[J] = x, ++T !== C || A || (A = !0, a.resolve(U, v));
            }, function(x) {
              A || (A = !0, a.reject(U, x));
            });
          }
        }, u.race = function(_) {
          var S = this;
          if (Object.prototype.toString.call(_) !== "[object Array]") return this.reject(new TypeError("must be an array"));
          var C = _.length, A = !1;
          if (!C) return this.resolve([]);
          for (var v = -1, T = new this(o); ++v < C; ) I = _[v], S.resolve(I).then(function(U) {
            A || (A = !0, a.resolve(T, U));
          }, function(U) {
            A || (A = !0, a.reject(T, U));
          });
          var I;
          return T;
        };
      }, { immediate: 36 }], 38: [function(e, r, s) {
        var i = {};
        (0, e("./lib/utils/common").assign)(i, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), r.exports = i;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, r, s) {
        var i = e("./zlib/deflate"), o = e("./utils/common"), a = e("./utils/strings"), l = e("./zlib/messages"), d = e("./zlib/zstream"), f = Object.prototype.toString, u = 0, m = -1, h = 0, w = 8;
        function g(_) {
          if (!(this instanceof g)) return new g(_);
          this.options = o.assign({ level: m, method: w, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: h, to: "" }, _ || {});
          var S = this.options;
          S.raw && 0 < S.windowBits ? S.windowBits = -S.windowBits : S.gzip && 0 < S.windowBits && S.windowBits < 16 && (S.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new d(), this.strm.avail_out = 0;
          var C = i.deflateInit2(this.strm, S.level, S.method, S.windowBits, S.memLevel, S.strategy);
          if (C !== u) throw new Error(l[C]);
          if (S.header && i.deflateSetHeader(this.strm, S.header), S.dictionary) {
            var A;
            if (A = typeof S.dictionary == "string" ? a.string2buf(S.dictionary) : f.call(S.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(S.dictionary) : S.dictionary, (C = i.deflateSetDictionary(this.strm, A)) !== u) throw new Error(l[C]);
            this._dict_set = !0;
          }
        }
        function y(_, S) {
          var C = new g(S);
          if (C.push(_, !0), C.err) throw C.msg || l[C.err];
          return C.result;
        }
        g.prototype.push = function(_, S) {
          var C, A, v = this.strm, T = this.options.chunkSize;
          if (this.ended) return !1;
          A = S === ~~S ? S : S === !0 ? 4 : 0, typeof _ == "string" ? v.input = a.string2buf(_) : f.call(_) === "[object ArrayBuffer]" ? v.input = new Uint8Array(_) : v.input = _, v.next_in = 0, v.avail_in = v.input.length;
          do {
            if (v.avail_out === 0 && (v.output = new o.Buf8(T), v.next_out = 0, v.avail_out = T), (C = i.deflate(v, A)) !== 1 && C !== u) return this.onEnd(C), !(this.ended = !0);
            v.avail_out !== 0 && (v.avail_in !== 0 || A !== 4 && A !== 2) || (this.options.to === "string" ? this.onData(a.buf2binstring(o.shrinkBuf(v.output, v.next_out))) : this.onData(o.shrinkBuf(v.output, v.next_out)));
          } while ((0 < v.avail_in || v.avail_out === 0) && C !== 1);
          return A === 4 ? (C = i.deflateEnd(this.strm), this.onEnd(C), this.ended = !0, C === u) : A !== 2 || (this.onEnd(u), !(v.avail_out = 0));
        }, g.prototype.onData = function(_) {
          this.chunks.push(_);
        }, g.prototype.onEnd = function(_) {
          _ === u && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = _, this.msg = this.strm.msg;
        }, s.Deflate = g, s.deflate = y, s.deflateRaw = function(_, S) {
          return (S = S || {}).raw = !0, y(_, S);
        }, s.gzip = function(_, S) {
          return (S = S || {}).gzip = !0, y(_, S);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, r, s) {
        var i = e("./zlib/inflate"), o = e("./utils/common"), a = e("./utils/strings"), l = e("./zlib/constants"), d = e("./zlib/messages"), f = e("./zlib/zstream"), u = e("./zlib/gzheader"), m = Object.prototype.toString;
        function h(g) {
          if (!(this instanceof h)) return new h(g);
          this.options = o.assign({ chunkSize: 16384, windowBits: 0, to: "" }, g || {});
          var y = this.options;
          y.raw && 0 <= y.windowBits && y.windowBits < 16 && (y.windowBits = -y.windowBits, y.windowBits === 0 && (y.windowBits = -15)), !(0 <= y.windowBits && y.windowBits < 16) || g && g.windowBits || (y.windowBits += 32), 15 < y.windowBits && y.windowBits < 48 && (15 & y.windowBits) == 0 && (y.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new f(), this.strm.avail_out = 0;
          var _ = i.inflateInit2(this.strm, y.windowBits);
          if (_ !== l.Z_OK) throw new Error(d[_]);
          this.header = new u(), i.inflateGetHeader(this.strm, this.header);
        }
        function w(g, y) {
          var _ = new h(y);
          if (_.push(g, !0), _.err) throw _.msg || d[_.err];
          return _.result;
        }
        h.prototype.push = function(g, y) {
          var _, S, C, A, v, T, I = this.strm, U = this.options.chunkSize, L = this.options.dictionary, H = !1;
          if (this.ended) return !1;
          S = y === ~~y ? y : y === !0 ? l.Z_FINISH : l.Z_NO_FLUSH, typeof g == "string" ? I.input = a.binstring2buf(g) : m.call(g) === "[object ArrayBuffer]" ? I.input = new Uint8Array(g) : I.input = g, I.next_in = 0, I.avail_in = I.input.length;
          do {
            if (I.avail_out === 0 && (I.output = new o.Buf8(U), I.next_out = 0, I.avail_out = U), (_ = i.inflate(I, l.Z_NO_FLUSH)) === l.Z_NEED_DICT && L && (T = typeof L == "string" ? a.string2buf(L) : m.call(L) === "[object ArrayBuffer]" ? new Uint8Array(L) : L, _ = i.inflateSetDictionary(this.strm, T)), _ === l.Z_BUF_ERROR && H === !0 && (_ = l.Z_OK, H = !1), _ !== l.Z_STREAM_END && _ !== l.Z_OK) return this.onEnd(_), !(this.ended = !0);
            I.next_out && (I.avail_out !== 0 && _ !== l.Z_STREAM_END && (I.avail_in !== 0 || S !== l.Z_FINISH && S !== l.Z_SYNC_FLUSH) || (this.options.to === "string" ? (C = a.utf8border(I.output, I.next_out), A = I.next_out - C, v = a.buf2string(I.output, C), I.next_out = A, I.avail_out = U - A, A && o.arraySet(I.output, I.output, C, A, 0), this.onData(v)) : this.onData(o.shrinkBuf(I.output, I.next_out)))), I.avail_in === 0 && I.avail_out === 0 && (H = !0);
          } while ((0 < I.avail_in || I.avail_out === 0) && _ !== l.Z_STREAM_END);
          return _ === l.Z_STREAM_END && (S = l.Z_FINISH), S === l.Z_FINISH ? (_ = i.inflateEnd(this.strm), this.onEnd(_), this.ended = !0, _ === l.Z_OK) : S !== l.Z_SYNC_FLUSH || (this.onEnd(l.Z_OK), !(I.avail_out = 0));
        }, h.prototype.onData = function(g) {
          this.chunks.push(g);
        }, h.prototype.onEnd = function(g) {
          g === l.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = g, this.msg = this.strm.msg;
        }, s.Inflate = h, s.inflate = w, s.inflateRaw = function(g, y) {
          return (y = y || {}).raw = !0, w(g, y);
        }, s.ungzip = w;
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, r, s) {
        var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
        s.assign = function(l) {
          for (var d = Array.prototype.slice.call(arguments, 1); d.length; ) {
            var f = d.shift();
            if (f) {
              if (typeof f != "object") throw new TypeError(f + "must be non-object");
              for (var u in f) f.hasOwnProperty(u) && (l[u] = f[u]);
            }
          }
          return l;
        }, s.shrinkBuf = function(l, d) {
          return l.length === d ? l : l.subarray ? l.subarray(0, d) : (l.length = d, l);
        };
        var o = { arraySet: function(l, d, f, u, m) {
          if (d.subarray && l.subarray) l.set(d.subarray(f, f + u), m);
          else for (var h = 0; h < u; h++) l[m + h] = d[f + h];
        }, flattenChunks: function(l) {
          var d, f, u, m, h, w;
          for (d = u = 0, f = l.length; d < f; d++) u += l[d].length;
          for (w = new Uint8Array(u), d = m = 0, f = l.length; d < f; d++) h = l[d], w.set(h, m), m += h.length;
          return w;
        } }, a = { arraySet: function(l, d, f, u, m) {
          for (var h = 0; h < u; h++) l[m + h] = d[f + h];
        }, flattenChunks: function(l) {
          return [].concat.apply([], l);
        } };
        s.setTyped = function(l) {
          l ? (s.Buf8 = Uint8Array, s.Buf16 = Uint16Array, s.Buf32 = Int32Array, s.assign(s, o)) : (s.Buf8 = Array, s.Buf16 = Array, s.Buf32 = Array, s.assign(s, a));
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
        for (var l = new i.Buf8(256), d = 0; d < 256; d++) l[d] = 252 <= d ? 6 : 248 <= d ? 5 : 240 <= d ? 4 : 224 <= d ? 3 : 192 <= d ? 2 : 1;
        function f(u, m) {
          if (m < 65537 && (u.subarray && a || !u.subarray && o)) return String.fromCharCode.apply(null, i.shrinkBuf(u, m));
          for (var h = "", w = 0; w < m; w++) h += String.fromCharCode(u[w]);
          return h;
        }
        l[254] = l[254] = 1, s.string2buf = function(u) {
          var m, h, w, g, y, _ = u.length, S = 0;
          for (g = 0; g < _; g++) (64512 & (h = u.charCodeAt(g))) == 55296 && g + 1 < _ && (64512 & (w = u.charCodeAt(g + 1))) == 56320 && (h = 65536 + (h - 55296 << 10) + (w - 56320), g++), S += h < 128 ? 1 : h < 2048 ? 2 : h < 65536 ? 3 : 4;
          for (m = new i.Buf8(S), g = y = 0; y < S; g++) (64512 & (h = u.charCodeAt(g))) == 55296 && g + 1 < _ && (64512 & (w = u.charCodeAt(g + 1))) == 56320 && (h = 65536 + (h - 55296 << 10) + (w - 56320), g++), h < 128 ? m[y++] = h : (h < 2048 ? m[y++] = 192 | h >>> 6 : (h < 65536 ? m[y++] = 224 | h >>> 12 : (m[y++] = 240 | h >>> 18, m[y++] = 128 | h >>> 12 & 63), m[y++] = 128 | h >>> 6 & 63), m[y++] = 128 | 63 & h);
          return m;
        }, s.buf2binstring = function(u) {
          return f(u, u.length);
        }, s.binstring2buf = function(u) {
          for (var m = new i.Buf8(u.length), h = 0, w = m.length; h < w; h++) m[h] = u.charCodeAt(h);
          return m;
        }, s.buf2string = function(u, m) {
          var h, w, g, y, _ = m || u.length, S = new Array(2 * _);
          for (h = w = 0; h < _; ) if ((g = u[h++]) < 128) S[w++] = g;
          else if (4 < (y = l[g])) S[w++] = 65533, h += y - 1;
          else {
            for (g &= y === 2 ? 31 : y === 3 ? 15 : 7; 1 < y && h < _; ) g = g << 6 | 63 & u[h++], y--;
            1 < y ? S[w++] = 65533 : g < 65536 ? S[w++] = g : (g -= 65536, S[w++] = 55296 | g >> 10 & 1023, S[w++] = 56320 | 1023 & g);
          }
          return f(S, w);
        }, s.utf8border = function(u, m) {
          var h;
          for ((m = m || u.length) > u.length && (m = u.length), h = m - 1; 0 <= h && (192 & u[h]) == 128; ) h--;
          return h < 0 || h === 0 ? m : h + l[u[h]] > m ? h : m;
        };
      }, { "./common": 41 }], 43: [function(e, r, s) {
        r.exports = function(i, o, a, l) {
          for (var d = 65535 & i | 0, f = i >>> 16 & 65535 | 0, u = 0; a !== 0; ) {
            for (a -= u = 2e3 < a ? 2e3 : a; f = f + (d = d + o[l++] | 0) | 0, --u; ) ;
            d %= 65521, f %= 65521;
          }
          return d | f << 16 | 0;
        };
      }, {}], 44: [function(e, r, s) {
        r.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
      }, {}], 45: [function(e, r, s) {
        var i = (function() {
          for (var o, a = [], l = 0; l < 256; l++) {
            o = l;
            for (var d = 0; d < 8; d++) o = 1 & o ? 3988292384 ^ o >>> 1 : o >>> 1;
            a[l] = o;
          }
          return a;
        })();
        r.exports = function(o, a, l, d) {
          var f = i, u = d + l;
          o ^= -1;
          for (var m = d; m < u; m++) o = o >>> 8 ^ f[255 & (o ^ a[m])];
          return -1 ^ o;
        };
      }, {}], 46: [function(e, r, s) {
        var i, o = e("../utils/common"), a = e("./trees"), l = e("./adler32"), d = e("./crc32"), f = e("./messages"), u = 0, m = 4, h = 0, w = -2, g = -1, y = 4, _ = 2, S = 8, C = 9, A = 286, v = 30, T = 19, I = 2 * A + 1, U = 15, L = 3, H = 258, J = H + L + 1, x = 42, N = 113, p = 1, M = 2, et = 3, j = 4;
        function nt(c, B) {
          return c.msg = f[B], B;
        }
        function $(c) {
          return (c << 1) - (4 < c ? 9 : 0);
        }
        function Q(c) {
          for (var B = c.length; 0 <= --B; ) c[B] = 0;
        }
        function z(c) {
          var B = c.state, R = B.pending;
          R > c.avail_out && (R = c.avail_out), R !== 0 && (o.arraySet(c.output, B.pending_buf, B.pending_out, R, c.next_out), c.next_out += R, B.pending_out += R, c.total_out += R, c.avail_out -= R, B.pending -= R, B.pending === 0 && (B.pending_out = 0));
        }
        function O(c, B) {
          a._tr_flush_block(c, 0 <= c.block_start ? c.block_start : -1, c.strstart - c.block_start, B), c.block_start = c.strstart, z(c.strm);
        }
        function X(c, B) {
          c.pending_buf[c.pending++] = B;
        }
        function Y(c, B) {
          c.pending_buf[c.pending++] = B >>> 8 & 255, c.pending_buf[c.pending++] = 255 & B;
        }
        function Z(c, B) {
          var R, k, b = c.max_chain_length, E = c.strstart, F = c.prev_length, P = c.nice_match, D = c.strstart > c.w_size - J ? c.strstart - (c.w_size - J) : 0, W = c.window, G = c.w_mask, V = c.prev, q = c.strstart + H, lt = W[E + F - 1], it = W[E + F];
          c.prev_length >= c.good_match && (b >>= 2), P > c.lookahead && (P = c.lookahead);
          do
            if (W[(R = B) + F] === it && W[R + F - 1] === lt && W[R] === W[E] && W[++R] === W[E + 1]) {
              E += 2, R++;
              do
                ;
              while (W[++E] === W[++R] && W[++E] === W[++R] && W[++E] === W[++R] && W[++E] === W[++R] && W[++E] === W[++R] && W[++E] === W[++R] && W[++E] === W[++R] && W[++E] === W[++R] && E < q);
              if (k = H - (q - E), E = q - H, F < k) {
                if (c.match_start = B, P <= (F = k)) break;
                lt = W[E + F - 1], it = W[E + F];
              }
            }
          while ((B = V[B & G]) > D && --b != 0);
          return F <= c.lookahead ? F : c.lookahead;
        }
        function ut(c) {
          var B, R, k, b, E, F, P, D, W, G, V = c.w_size;
          do {
            if (b = c.window_size - c.lookahead - c.strstart, c.strstart >= V + (V - J)) {
              for (o.arraySet(c.window, c.window, V, V, 0), c.match_start -= V, c.strstart -= V, c.block_start -= V, B = R = c.hash_size; k = c.head[--B], c.head[B] = V <= k ? k - V : 0, --R; ) ;
              for (B = R = V; k = c.prev[--B], c.prev[B] = V <= k ? k - V : 0, --R; ) ;
              b += V;
            }
            if (c.strm.avail_in === 0) break;
            if (F = c.strm, P = c.window, D = c.strstart + c.lookahead, W = b, G = void 0, G = F.avail_in, W < G && (G = W), R = G === 0 ? 0 : (F.avail_in -= G, o.arraySet(P, F.input, F.next_in, G, D), F.state.wrap === 1 ? F.adler = l(F.adler, P, G, D) : F.state.wrap === 2 && (F.adler = d(F.adler, P, G, D)), F.next_in += G, F.total_in += G, G), c.lookahead += R, c.lookahead + c.insert >= L) for (E = c.strstart - c.insert, c.ins_h = c.window[E], c.ins_h = (c.ins_h << c.hash_shift ^ c.window[E + 1]) & c.hash_mask; c.insert && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[E + L - 1]) & c.hash_mask, c.prev[E & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = E, E++, c.insert--, !(c.lookahead + c.insert < L)); ) ;
          } while (c.lookahead < J && c.strm.avail_in !== 0);
        }
        function vt(c, B) {
          for (var R, k; ; ) {
            if (c.lookahead < J) {
              if (ut(c), c.lookahead < J && B === u) return p;
              if (c.lookahead === 0) break;
            }
            if (R = 0, c.lookahead >= L && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + L - 1]) & c.hash_mask, R = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart), R !== 0 && c.strstart - R <= c.w_size - J && (c.match_length = Z(c, R)), c.match_length >= L) if (k = a._tr_tally(c, c.strstart - c.match_start, c.match_length - L), c.lookahead -= c.match_length, c.match_length <= c.max_lazy_match && c.lookahead >= L) {
              for (c.match_length--; c.strstart++, c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + L - 1]) & c.hash_mask, R = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart, --c.match_length != 0; ) ;
              c.strstart++;
            } else c.strstart += c.match_length, c.match_length = 0, c.ins_h = c.window[c.strstart], c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + 1]) & c.hash_mask;
            else k = a._tr_tally(c, 0, c.window[c.strstart]), c.lookahead--, c.strstart++;
            if (k && (O(c, !1), c.strm.avail_out === 0)) return p;
          }
          return c.insert = c.strstart < L - 1 ? c.strstart : L - 1, B === m ? (O(c, !0), c.strm.avail_out === 0 ? et : j) : c.last_lit && (O(c, !1), c.strm.avail_out === 0) ? p : M;
        }
        function st(c, B) {
          for (var R, k, b; ; ) {
            if (c.lookahead < J) {
              if (ut(c), c.lookahead < J && B === u) return p;
              if (c.lookahead === 0) break;
            }
            if (R = 0, c.lookahead >= L && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + L - 1]) & c.hash_mask, R = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart), c.prev_length = c.match_length, c.prev_match = c.match_start, c.match_length = L - 1, R !== 0 && c.prev_length < c.max_lazy_match && c.strstart - R <= c.w_size - J && (c.match_length = Z(c, R), c.match_length <= 5 && (c.strategy === 1 || c.match_length === L && 4096 < c.strstart - c.match_start) && (c.match_length = L - 1)), c.prev_length >= L && c.match_length <= c.prev_length) {
              for (b = c.strstart + c.lookahead - L, k = a._tr_tally(c, c.strstart - 1 - c.prev_match, c.prev_length - L), c.lookahead -= c.prev_length - 1, c.prev_length -= 2; ++c.strstart <= b && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + L - 1]) & c.hash_mask, R = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart), --c.prev_length != 0; ) ;
              if (c.match_available = 0, c.match_length = L - 1, c.strstart++, k && (O(c, !1), c.strm.avail_out === 0)) return p;
            } else if (c.match_available) {
              if ((k = a._tr_tally(c, 0, c.window[c.strstart - 1])) && O(c, !1), c.strstart++, c.lookahead--, c.strm.avail_out === 0) return p;
            } else c.match_available = 1, c.strstart++, c.lookahead--;
          }
          return c.match_available && (k = a._tr_tally(c, 0, c.window[c.strstart - 1]), c.match_available = 0), c.insert = c.strstart < L - 1 ? c.strstart : L - 1, B === m ? (O(c, !0), c.strm.avail_out === 0 ? et : j) : c.last_lit && (O(c, !1), c.strm.avail_out === 0) ? p : M;
        }
        function ot(c, B, R, k, b) {
          this.good_length = c, this.max_lazy = B, this.nice_length = R, this.max_chain = k, this.func = b;
        }
        function _t() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = S, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new o.Buf16(2 * I), this.dyn_dtree = new o.Buf16(2 * (2 * v + 1)), this.bl_tree = new o.Buf16(2 * (2 * T + 1)), Q(this.dyn_ltree), Q(this.dyn_dtree), Q(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new o.Buf16(U + 1), this.heap = new o.Buf16(2 * A + 1), Q(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new o.Buf16(2 * A + 1), Q(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function dt(c) {
          var B;
          return c && c.state ? (c.total_in = c.total_out = 0, c.data_type = _, (B = c.state).pending = 0, B.pending_out = 0, B.wrap < 0 && (B.wrap = -B.wrap), B.status = B.wrap ? x : N, c.adler = B.wrap === 2 ? 0 : 1, B.last_flush = u, a._tr_init(B), h) : nt(c, w);
        }
        function Bt(c) {
          var B = dt(c);
          return B === h && (function(R) {
            R.window_size = 2 * R.w_size, Q(R.head), R.max_lazy_match = i[R.level].max_lazy, R.good_match = i[R.level].good_length, R.nice_match = i[R.level].nice_length, R.max_chain_length = i[R.level].max_chain, R.strstart = 0, R.block_start = 0, R.lookahead = 0, R.insert = 0, R.match_length = R.prev_length = L - 1, R.match_available = 0, R.ins_h = 0;
          })(c.state), B;
        }
        function Lt(c, B, R, k, b, E) {
          if (!c) return w;
          var F = 1;
          if (B === g && (B = 6), k < 0 ? (F = 0, k = -k) : 15 < k && (F = 2, k -= 16), b < 1 || C < b || R !== S || k < 8 || 15 < k || B < 0 || 9 < B || E < 0 || y < E) return nt(c, w);
          k === 8 && (k = 9);
          var P = new _t();
          return (c.state = P).strm = c, P.wrap = F, P.gzhead = null, P.w_bits = k, P.w_size = 1 << P.w_bits, P.w_mask = P.w_size - 1, P.hash_bits = b + 7, P.hash_size = 1 << P.hash_bits, P.hash_mask = P.hash_size - 1, P.hash_shift = ~~((P.hash_bits + L - 1) / L), P.window = new o.Buf8(2 * P.w_size), P.head = new o.Buf16(P.hash_size), P.prev = new o.Buf16(P.w_size), P.lit_bufsize = 1 << b + 6, P.pending_buf_size = 4 * P.lit_bufsize, P.pending_buf = new o.Buf8(P.pending_buf_size), P.d_buf = 1 * P.lit_bufsize, P.l_buf = 3 * P.lit_bufsize, P.level = B, P.strategy = E, P.method = R, Bt(c);
        }
        i = [new ot(0, 0, 0, 0, function(c, B) {
          var R = 65535;
          for (R > c.pending_buf_size - 5 && (R = c.pending_buf_size - 5); ; ) {
            if (c.lookahead <= 1) {
              if (ut(c), c.lookahead === 0 && B === u) return p;
              if (c.lookahead === 0) break;
            }
            c.strstart += c.lookahead, c.lookahead = 0;
            var k = c.block_start + R;
            if ((c.strstart === 0 || c.strstart >= k) && (c.lookahead = c.strstart - k, c.strstart = k, O(c, !1), c.strm.avail_out === 0) || c.strstart - c.block_start >= c.w_size - J && (O(c, !1), c.strm.avail_out === 0)) return p;
          }
          return c.insert = 0, B === m ? (O(c, !0), c.strm.avail_out === 0 ? et : j) : (c.strstart > c.block_start && (O(c, !1), c.strm.avail_out), p);
        }), new ot(4, 4, 8, 4, vt), new ot(4, 5, 16, 8, vt), new ot(4, 6, 32, 32, vt), new ot(4, 4, 16, 16, st), new ot(8, 16, 32, 32, st), new ot(8, 16, 128, 128, st), new ot(8, 32, 128, 256, st), new ot(32, 128, 258, 1024, st), new ot(32, 258, 258, 4096, st)], s.deflateInit = function(c, B) {
          return Lt(c, B, S, 15, 8, 0);
        }, s.deflateInit2 = Lt, s.deflateReset = Bt, s.deflateResetKeep = dt, s.deflateSetHeader = function(c, B) {
          return c && c.state ? c.state.wrap !== 2 ? w : (c.state.gzhead = B, h) : w;
        }, s.deflate = function(c, B) {
          var R, k, b, E;
          if (!c || !c.state || 5 < B || B < 0) return c ? nt(c, w) : w;
          if (k = c.state, !c.output || !c.input && c.avail_in !== 0 || k.status === 666 && B !== m) return nt(c, c.avail_out === 0 ? -5 : w);
          if (k.strm = c, R = k.last_flush, k.last_flush = B, k.status === x) if (k.wrap === 2) c.adler = 0, X(k, 31), X(k, 139), X(k, 8), k.gzhead ? (X(k, (k.gzhead.text ? 1 : 0) + (k.gzhead.hcrc ? 2 : 0) + (k.gzhead.extra ? 4 : 0) + (k.gzhead.name ? 8 : 0) + (k.gzhead.comment ? 16 : 0)), X(k, 255 & k.gzhead.time), X(k, k.gzhead.time >> 8 & 255), X(k, k.gzhead.time >> 16 & 255), X(k, k.gzhead.time >> 24 & 255), X(k, k.level === 9 ? 2 : 2 <= k.strategy || k.level < 2 ? 4 : 0), X(k, 255 & k.gzhead.os), k.gzhead.extra && k.gzhead.extra.length && (X(k, 255 & k.gzhead.extra.length), X(k, k.gzhead.extra.length >> 8 & 255)), k.gzhead.hcrc && (c.adler = d(c.adler, k.pending_buf, k.pending, 0)), k.gzindex = 0, k.status = 69) : (X(k, 0), X(k, 0), X(k, 0), X(k, 0), X(k, 0), X(k, k.level === 9 ? 2 : 2 <= k.strategy || k.level < 2 ? 4 : 0), X(k, 3), k.status = N);
          else {
            var F = S + (k.w_bits - 8 << 4) << 8;
            F |= (2 <= k.strategy || k.level < 2 ? 0 : k.level < 6 ? 1 : k.level === 6 ? 2 : 3) << 6, k.strstart !== 0 && (F |= 32), F += 31 - F % 31, k.status = N, Y(k, F), k.strstart !== 0 && (Y(k, c.adler >>> 16), Y(k, 65535 & c.adler)), c.adler = 1;
          }
          if (k.status === 69) if (k.gzhead.extra) {
            for (b = k.pending; k.gzindex < (65535 & k.gzhead.extra.length) && (k.pending !== k.pending_buf_size || (k.gzhead.hcrc && k.pending > b && (c.adler = d(c.adler, k.pending_buf, k.pending - b, b)), z(c), b = k.pending, k.pending !== k.pending_buf_size)); ) X(k, 255 & k.gzhead.extra[k.gzindex]), k.gzindex++;
            k.gzhead.hcrc && k.pending > b && (c.adler = d(c.adler, k.pending_buf, k.pending - b, b)), k.gzindex === k.gzhead.extra.length && (k.gzindex = 0, k.status = 73);
          } else k.status = 73;
          if (k.status === 73) if (k.gzhead.name) {
            b = k.pending;
            do {
              if (k.pending === k.pending_buf_size && (k.gzhead.hcrc && k.pending > b && (c.adler = d(c.adler, k.pending_buf, k.pending - b, b)), z(c), b = k.pending, k.pending === k.pending_buf_size)) {
                E = 1;
                break;
              }
              E = k.gzindex < k.gzhead.name.length ? 255 & k.gzhead.name.charCodeAt(k.gzindex++) : 0, X(k, E);
            } while (E !== 0);
            k.gzhead.hcrc && k.pending > b && (c.adler = d(c.adler, k.pending_buf, k.pending - b, b)), E === 0 && (k.gzindex = 0, k.status = 91);
          } else k.status = 91;
          if (k.status === 91) if (k.gzhead.comment) {
            b = k.pending;
            do {
              if (k.pending === k.pending_buf_size && (k.gzhead.hcrc && k.pending > b && (c.adler = d(c.adler, k.pending_buf, k.pending - b, b)), z(c), b = k.pending, k.pending === k.pending_buf_size)) {
                E = 1;
                break;
              }
              E = k.gzindex < k.gzhead.comment.length ? 255 & k.gzhead.comment.charCodeAt(k.gzindex++) : 0, X(k, E);
            } while (E !== 0);
            k.gzhead.hcrc && k.pending > b && (c.adler = d(c.adler, k.pending_buf, k.pending - b, b)), E === 0 && (k.status = 103);
          } else k.status = 103;
          if (k.status === 103 && (k.gzhead.hcrc ? (k.pending + 2 > k.pending_buf_size && z(c), k.pending + 2 <= k.pending_buf_size && (X(k, 255 & c.adler), X(k, c.adler >> 8 & 255), c.adler = 0, k.status = N)) : k.status = N), k.pending !== 0) {
            if (z(c), c.avail_out === 0) return k.last_flush = -1, h;
          } else if (c.avail_in === 0 && $(B) <= $(R) && B !== m) return nt(c, -5);
          if (k.status === 666 && c.avail_in !== 0) return nt(c, -5);
          if (c.avail_in !== 0 || k.lookahead !== 0 || B !== u && k.status !== 666) {
            var P = k.strategy === 2 ? (function(D, W) {
              for (var G; ; ) {
                if (D.lookahead === 0 && (ut(D), D.lookahead === 0)) {
                  if (W === u) return p;
                  break;
                }
                if (D.match_length = 0, G = a._tr_tally(D, 0, D.window[D.strstart]), D.lookahead--, D.strstart++, G && (O(D, !1), D.strm.avail_out === 0)) return p;
              }
              return D.insert = 0, W === m ? (O(D, !0), D.strm.avail_out === 0 ? et : j) : D.last_lit && (O(D, !1), D.strm.avail_out === 0) ? p : M;
            })(k, B) : k.strategy === 3 ? (function(D, W) {
              for (var G, V, q, lt, it = D.window; ; ) {
                if (D.lookahead <= H) {
                  if (ut(D), D.lookahead <= H && W === u) return p;
                  if (D.lookahead === 0) break;
                }
                if (D.match_length = 0, D.lookahead >= L && 0 < D.strstart && (V = it[q = D.strstart - 1]) === it[++q] && V === it[++q] && V === it[++q]) {
                  lt = D.strstart + H;
                  do
                    ;
                  while (V === it[++q] && V === it[++q] && V === it[++q] && V === it[++q] && V === it[++q] && V === it[++q] && V === it[++q] && V === it[++q] && q < lt);
                  D.match_length = H - (lt - q), D.match_length > D.lookahead && (D.match_length = D.lookahead);
                }
                if (D.match_length >= L ? (G = a._tr_tally(D, 1, D.match_length - L), D.lookahead -= D.match_length, D.strstart += D.match_length, D.match_length = 0) : (G = a._tr_tally(D, 0, D.window[D.strstart]), D.lookahead--, D.strstart++), G && (O(D, !1), D.strm.avail_out === 0)) return p;
              }
              return D.insert = 0, W === m ? (O(D, !0), D.strm.avail_out === 0 ? et : j) : D.last_lit && (O(D, !1), D.strm.avail_out === 0) ? p : M;
            })(k, B) : i[k.level].func(k, B);
            if (P !== et && P !== j || (k.status = 666), P === p || P === et) return c.avail_out === 0 && (k.last_flush = -1), h;
            if (P === M && (B === 1 ? a._tr_align(k) : B !== 5 && (a._tr_stored_block(k, 0, 0, !1), B === 3 && (Q(k.head), k.lookahead === 0 && (k.strstart = 0, k.block_start = 0, k.insert = 0))), z(c), c.avail_out === 0)) return k.last_flush = -1, h;
          }
          return B !== m ? h : k.wrap <= 0 ? 1 : (k.wrap === 2 ? (X(k, 255 & c.adler), X(k, c.adler >> 8 & 255), X(k, c.adler >> 16 & 255), X(k, c.adler >> 24 & 255), X(k, 255 & c.total_in), X(k, c.total_in >> 8 & 255), X(k, c.total_in >> 16 & 255), X(k, c.total_in >> 24 & 255)) : (Y(k, c.adler >>> 16), Y(k, 65535 & c.adler)), z(c), 0 < k.wrap && (k.wrap = -k.wrap), k.pending !== 0 ? h : 1);
        }, s.deflateEnd = function(c) {
          var B;
          return c && c.state ? (B = c.state.status) !== x && B !== 69 && B !== 73 && B !== 91 && B !== 103 && B !== N && B !== 666 ? nt(c, w) : (c.state = null, B === N ? nt(c, -3) : h) : w;
        }, s.deflateSetDictionary = function(c, B) {
          var R, k, b, E, F, P, D, W, G = B.length;
          if (!c || !c.state || (E = (R = c.state).wrap) === 2 || E === 1 && R.status !== x || R.lookahead) return w;
          for (E === 1 && (c.adler = l(c.adler, B, G, 0)), R.wrap = 0, G >= R.w_size && (E === 0 && (Q(R.head), R.strstart = 0, R.block_start = 0, R.insert = 0), W = new o.Buf8(R.w_size), o.arraySet(W, B, G - R.w_size, R.w_size, 0), B = W, G = R.w_size), F = c.avail_in, P = c.next_in, D = c.input, c.avail_in = G, c.next_in = 0, c.input = B, ut(R); R.lookahead >= L; ) {
            for (k = R.strstart, b = R.lookahead - (L - 1); R.ins_h = (R.ins_h << R.hash_shift ^ R.window[k + L - 1]) & R.hash_mask, R.prev[k & R.w_mask] = R.head[R.ins_h], R.head[R.ins_h] = k, k++, --b; ) ;
            R.strstart = k, R.lookahead = L - 1, ut(R);
          }
          return R.strstart += R.lookahead, R.block_start = R.strstart, R.insert = R.lookahead, R.lookahead = 0, R.match_length = R.prev_length = L - 1, R.match_available = 0, c.next_in = P, c.input = D, c.avail_in = F, R.wrap = E, h;
        }, s.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, r, s) {
        r.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
        };
      }, {}], 48: [function(e, r, s) {
        r.exports = function(i, o) {
          var a, l, d, f, u, m, h, w, g, y, _, S, C, A, v, T, I, U, L, H, J, x, N, p, M;
          a = i.state, l = i.next_in, p = i.input, d = l + (i.avail_in - 5), f = i.next_out, M = i.output, u = f - (o - i.avail_out), m = f + (i.avail_out - 257), h = a.dmax, w = a.wsize, g = a.whave, y = a.wnext, _ = a.window, S = a.hold, C = a.bits, A = a.lencode, v = a.distcode, T = (1 << a.lenbits) - 1, I = (1 << a.distbits) - 1;
          t: do {
            C < 15 && (S += p[l++] << C, C += 8, S += p[l++] << C, C += 8), U = A[S & T];
            e: for (; ; ) {
              if (S >>>= L = U >>> 24, C -= L, (L = U >>> 16 & 255) === 0) M[f++] = 65535 & U;
              else {
                if (!(16 & L)) {
                  if ((64 & L) == 0) {
                    U = A[(65535 & U) + (S & (1 << L) - 1)];
                    continue e;
                  }
                  if (32 & L) {
                    a.mode = 12;
                    break t;
                  }
                  i.msg = "invalid literal/length code", a.mode = 30;
                  break t;
                }
                H = 65535 & U, (L &= 15) && (C < L && (S += p[l++] << C, C += 8), H += S & (1 << L) - 1, S >>>= L, C -= L), C < 15 && (S += p[l++] << C, C += 8, S += p[l++] << C, C += 8), U = v[S & I];
                n: for (; ; ) {
                  if (S >>>= L = U >>> 24, C -= L, !(16 & (L = U >>> 16 & 255))) {
                    if ((64 & L) == 0) {
                      U = v[(65535 & U) + (S & (1 << L) - 1)];
                      continue n;
                    }
                    i.msg = "invalid distance code", a.mode = 30;
                    break t;
                  }
                  if (J = 65535 & U, C < (L &= 15) && (S += p[l++] << C, (C += 8) < L && (S += p[l++] << C, C += 8)), h < (J += S & (1 << L) - 1)) {
                    i.msg = "invalid distance too far back", a.mode = 30;
                    break t;
                  }
                  if (S >>>= L, C -= L, (L = f - u) < J) {
                    if (g < (L = J - L) && a.sane) {
                      i.msg = "invalid distance too far back", a.mode = 30;
                      break t;
                    }
                    if (N = _, (x = 0) === y) {
                      if (x += w - L, L < H) {
                        for (H -= L; M[f++] = _[x++], --L; ) ;
                        x = f - J, N = M;
                      }
                    } else if (y < L) {
                      if (x += w + y - L, (L -= y) < H) {
                        for (H -= L; M[f++] = _[x++], --L; ) ;
                        if (x = 0, y < H) {
                          for (H -= L = y; M[f++] = _[x++], --L; ) ;
                          x = f - J, N = M;
                        }
                      }
                    } else if (x += y - L, L < H) {
                      for (H -= L; M[f++] = _[x++], --L; ) ;
                      x = f - J, N = M;
                    }
                    for (; 2 < H; ) M[f++] = N[x++], M[f++] = N[x++], M[f++] = N[x++], H -= 3;
                    H && (M[f++] = N[x++], 1 < H && (M[f++] = N[x++]));
                  } else {
                    for (x = f - J; M[f++] = M[x++], M[f++] = M[x++], M[f++] = M[x++], 2 < (H -= 3); ) ;
                    H && (M[f++] = M[x++], 1 < H && (M[f++] = M[x++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (l < d && f < m);
          l -= H = C >> 3, S &= (1 << (C -= H << 3)) - 1, i.next_in = l, i.next_out = f, i.avail_in = l < d ? d - l + 5 : 5 - (l - d), i.avail_out = f < m ? m - f + 257 : 257 - (f - m), a.hold = S, a.bits = C;
        };
      }, {}], 49: [function(e, r, s) {
        var i = e("../utils/common"), o = e("./adler32"), a = e("./crc32"), l = e("./inffast"), d = e("./inftrees"), f = 1, u = 2, m = 0, h = -2, w = 1, g = 852, y = 592;
        function _(x) {
          return (x >>> 24 & 255) + (x >>> 8 & 65280) + ((65280 & x) << 8) + ((255 & x) << 24);
        }
        function S() {
          this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new i.Buf16(320), this.work = new i.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function C(x) {
          var N;
          return x && x.state ? (N = x.state, x.total_in = x.total_out = N.total = 0, x.msg = "", N.wrap && (x.adler = 1 & N.wrap), N.mode = w, N.last = 0, N.havedict = 0, N.dmax = 32768, N.head = null, N.hold = 0, N.bits = 0, N.lencode = N.lendyn = new i.Buf32(g), N.distcode = N.distdyn = new i.Buf32(y), N.sane = 1, N.back = -1, m) : h;
        }
        function A(x) {
          var N;
          return x && x.state ? ((N = x.state).wsize = 0, N.whave = 0, N.wnext = 0, C(x)) : h;
        }
        function v(x, N) {
          var p, M;
          return x && x.state ? (M = x.state, N < 0 ? (p = 0, N = -N) : (p = 1 + (N >> 4), N < 48 && (N &= 15)), N && (N < 8 || 15 < N) ? h : (M.window !== null && M.wbits !== N && (M.window = null), M.wrap = p, M.wbits = N, A(x))) : h;
        }
        function T(x, N) {
          var p, M;
          return x ? (M = new S(), (x.state = M).window = null, (p = v(x, N)) !== m && (x.state = null), p) : h;
        }
        var I, U, L = !0;
        function H(x) {
          if (L) {
            var N;
            for (I = new i.Buf32(512), U = new i.Buf32(32), N = 0; N < 144; ) x.lens[N++] = 8;
            for (; N < 256; ) x.lens[N++] = 9;
            for (; N < 280; ) x.lens[N++] = 7;
            for (; N < 288; ) x.lens[N++] = 8;
            for (d(f, x.lens, 0, 288, I, 0, x.work, { bits: 9 }), N = 0; N < 32; ) x.lens[N++] = 5;
            d(u, x.lens, 0, 32, U, 0, x.work, { bits: 5 }), L = !1;
          }
          x.lencode = I, x.lenbits = 9, x.distcode = U, x.distbits = 5;
        }
        function J(x, N, p, M) {
          var et, j = x.state;
          return j.window === null && (j.wsize = 1 << j.wbits, j.wnext = 0, j.whave = 0, j.window = new i.Buf8(j.wsize)), M >= j.wsize ? (i.arraySet(j.window, N, p - j.wsize, j.wsize, 0), j.wnext = 0, j.whave = j.wsize) : (M < (et = j.wsize - j.wnext) && (et = M), i.arraySet(j.window, N, p - M, et, j.wnext), (M -= et) ? (i.arraySet(j.window, N, p - M, M, 0), j.wnext = M, j.whave = j.wsize) : (j.wnext += et, j.wnext === j.wsize && (j.wnext = 0), j.whave < j.wsize && (j.whave += et))), 0;
        }
        s.inflateReset = A, s.inflateReset2 = v, s.inflateResetKeep = C, s.inflateInit = function(x) {
          return T(x, 15);
        }, s.inflateInit2 = T, s.inflate = function(x, N) {
          var p, M, et, j, nt, $, Q, z, O, X, Y, Z, ut, vt, st, ot, _t, dt, Bt, Lt, c, B, R, k, b = 0, E = new i.Buf8(4), F = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!x || !x.state || !x.output || !x.input && x.avail_in !== 0) return h;
          (p = x.state).mode === 12 && (p.mode = 13), nt = x.next_out, et = x.output, Q = x.avail_out, j = x.next_in, M = x.input, $ = x.avail_in, z = p.hold, O = p.bits, X = $, Y = Q, B = m;
          t: for (; ; ) switch (p.mode) {
            case w:
              if (p.wrap === 0) {
                p.mode = 13;
                break;
              }
              for (; O < 16; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              if (2 & p.wrap && z === 35615) {
                E[p.check = 0] = 255 & z, E[1] = z >>> 8 & 255, p.check = a(p.check, E, 2, 0), O = z = 0, p.mode = 2;
                break;
              }
              if (p.flags = 0, p.head && (p.head.done = !1), !(1 & p.wrap) || (((255 & z) << 8) + (z >> 8)) % 31) {
                x.msg = "incorrect header check", p.mode = 30;
                break;
              }
              if ((15 & z) != 8) {
                x.msg = "unknown compression method", p.mode = 30;
                break;
              }
              if (O -= 4, c = 8 + (15 & (z >>>= 4)), p.wbits === 0) p.wbits = c;
              else if (c > p.wbits) {
                x.msg = "invalid window size", p.mode = 30;
                break;
              }
              p.dmax = 1 << c, x.adler = p.check = 1, p.mode = 512 & z ? 10 : 12, O = z = 0;
              break;
            case 2:
              for (; O < 16; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              if (p.flags = z, (255 & p.flags) != 8) {
                x.msg = "unknown compression method", p.mode = 30;
                break;
              }
              if (57344 & p.flags) {
                x.msg = "unknown header flags set", p.mode = 30;
                break;
              }
              p.head && (p.head.text = z >> 8 & 1), 512 & p.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, p.check = a(p.check, E, 2, 0)), O = z = 0, p.mode = 3;
            case 3:
              for (; O < 32; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              p.head && (p.head.time = z), 512 & p.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, E[2] = z >>> 16 & 255, E[3] = z >>> 24 & 255, p.check = a(p.check, E, 4, 0)), O = z = 0, p.mode = 4;
            case 4:
              for (; O < 16; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              p.head && (p.head.xflags = 255 & z, p.head.os = z >> 8), 512 & p.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, p.check = a(p.check, E, 2, 0)), O = z = 0, p.mode = 5;
            case 5:
              if (1024 & p.flags) {
                for (; O < 16; ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                p.length = z, p.head && (p.head.extra_len = z), 512 & p.flags && (E[0] = 255 & z, E[1] = z >>> 8 & 255, p.check = a(p.check, E, 2, 0)), O = z = 0;
              } else p.head && (p.head.extra = null);
              p.mode = 6;
            case 6:
              if (1024 & p.flags && ($ < (Z = p.length) && (Z = $), Z && (p.head && (c = p.head.extra_len - p.length, p.head.extra || (p.head.extra = new Array(p.head.extra_len)), i.arraySet(p.head.extra, M, j, Z, c)), 512 & p.flags && (p.check = a(p.check, M, Z, j)), $ -= Z, j += Z, p.length -= Z), p.length)) break t;
              p.length = 0, p.mode = 7;
            case 7:
              if (2048 & p.flags) {
                if ($ === 0) break t;
                for (Z = 0; c = M[j + Z++], p.head && c && p.length < 65536 && (p.head.name += String.fromCharCode(c)), c && Z < $; ) ;
                if (512 & p.flags && (p.check = a(p.check, M, Z, j)), $ -= Z, j += Z, c) break t;
              } else p.head && (p.head.name = null);
              p.length = 0, p.mode = 8;
            case 8:
              if (4096 & p.flags) {
                if ($ === 0) break t;
                for (Z = 0; c = M[j + Z++], p.head && c && p.length < 65536 && (p.head.comment += String.fromCharCode(c)), c && Z < $; ) ;
                if (512 & p.flags && (p.check = a(p.check, M, Z, j)), $ -= Z, j += Z, c) break t;
              } else p.head && (p.head.comment = null);
              p.mode = 9;
            case 9:
              if (512 & p.flags) {
                for (; O < 16; ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                if (z !== (65535 & p.check)) {
                  x.msg = "header crc mismatch", p.mode = 30;
                  break;
                }
                O = z = 0;
              }
              p.head && (p.head.hcrc = p.flags >> 9 & 1, p.head.done = !0), x.adler = p.check = 0, p.mode = 12;
              break;
            case 10:
              for (; O < 32; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              x.adler = p.check = _(z), O = z = 0, p.mode = 11;
            case 11:
              if (p.havedict === 0) return x.next_out = nt, x.avail_out = Q, x.next_in = j, x.avail_in = $, p.hold = z, p.bits = O, 2;
              x.adler = p.check = 1, p.mode = 12;
            case 12:
              if (N === 5 || N === 6) break t;
            case 13:
              if (p.last) {
                z >>>= 7 & O, O -= 7 & O, p.mode = 27;
                break;
              }
              for (; O < 3; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              switch (p.last = 1 & z, O -= 1, 3 & (z >>>= 1)) {
                case 0:
                  p.mode = 14;
                  break;
                case 1:
                  if (H(p), p.mode = 20, N !== 6) break;
                  z >>>= 2, O -= 2;
                  break t;
                case 2:
                  p.mode = 17;
                  break;
                case 3:
                  x.msg = "invalid block type", p.mode = 30;
              }
              z >>>= 2, O -= 2;
              break;
            case 14:
              for (z >>>= 7 & O, O -= 7 & O; O < 32; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              if ((65535 & z) != (z >>> 16 ^ 65535)) {
                x.msg = "invalid stored block lengths", p.mode = 30;
                break;
              }
              if (p.length = 65535 & z, O = z = 0, p.mode = 15, N === 6) break t;
            case 15:
              p.mode = 16;
            case 16:
              if (Z = p.length) {
                if ($ < Z && (Z = $), Q < Z && (Z = Q), Z === 0) break t;
                i.arraySet(et, M, j, Z, nt), $ -= Z, j += Z, Q -= Z, nt += Z, p.length -= Z;
                break;
              }
              p.mode = 12;
              break;
            case 17:
              for (; O < 14; ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              if (p.nlen = 257 + (31 & z), z >>>= 5, O -= 5, p.ndist = 1 + (31 & z), z >>>= 5, O -= 5, p.ncode = 4 + (15 & z), z >>>= 4, O -= 4, 286 < p.nlen || 30 < p.ndist) {
                x.msg = "too many length or distance symbols", p.mode = 30;
                break;
              }
              p.have = 0, p.mode = 18;
            case 18:
              for (; p.have < p.ncode; ) {
                for (; O < 3; ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                p.lens[F[p.have++]] = 7 & z, z >>>= 3, O -= 3;
              }
              for (; p.have < 19; ) p.lens[F[p.have++]] = 0;
              if (p.lencode = p.lendyn, p.lenbits = 7, R = { bits: p.lenbits }, B = d(0, p.lens, 0, 19, p.lencode, 0, p.work, R), p.lenbits = R.bits, B) {
                x.msg = "invalid code lengths set", p.mode = 30;
                break;
              }
              p.have = 0, p.mode = 19;
            case 19:
              for (; p.have < p.nlen + p.ndist; ) {
                for (; ot = (b = p.lencode[z & (1 << p.lenbits) - 1]) >>> 16 & 255, _t = 65535 & b, !((st = b >>> 24) <= O); ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                if (_t < 16) z >>>= st, O -= st, p.lens[p.have++] = _t;
                else {
                  if (_t === 16) {
                    for (k = st + 2; O < k; ) {
                      if ($ === 0) break t;
                      $--, z += M[j++] << O, O += 8;
                    }
                    if (z >>>= st, O -= st, p.have === 0) {
                      x.msg = "invalid bit length repeat", p.mode = 30;
                      break;
                    }
                    c = p.lens[p.have - 1], Z = 3 + (3 & z), z >>>= 2, O -= 2;
                  } else if (_t === 17) {
                    for (k = st + 3; O < k; ) {
                      if ($ === 0) break t;
                      $--, z += M[j++] << O, O += 8;
                    }
                    O -= st, c = 0, Z = 3 + (7 & (z >>>= st)), z >>>= 3, O -= 3;
                  } else {
                    for (k = st + 7; O < k; ) {
                      if ($ === 0) break t;
                      $--, z += M[j++] << O, O += 8;
                    }
                    O -= st, c = 0, Z = 11 + (127 & (z >>>= st)), z >>>= 7, O -= 7;
                  }
                  if (p.have + Z > p.nlen + p.ndist) {
                    x.msg = "invalid bit length repeat", p.mode = 30;
                    break;
                  }
                  for (; Z--; ) p.lens[p.have++] = c;
                }
              }
              if (p.mode === 30) break;
              if (p.lens[256] === 0) {
                x.msg = "invalid code -- missing end-of-block", p.mode = 30;
                break;
              }
              if (p.lenbits = 9, R = { bits: p.lenbits }, B = d(f, p.lens, 0, p.nlen, p.lencode, 0, p.work, R), p.lenbits = R.bits, B) {
                x.msg = "invalid literal/lengths set", p.mode = 30;
                break;
              }
              if (p.distbits = 6, p.distcode = p.distdyn, R = { bits: p.distbits }, B = d(u, p.lens, p.nlen, p.ndist, p.distcode, 0, p.work, R), p.distbits = R.bits, B) {
                x.msg = "invalid distances set", p.mode = 30;
                break;
              }
              if (p.mode = 20, N === 6) break t;
            case 20:
              p.mode = 21;
            case 21:
              if (6 <= $ && 258 <= Q) {
                x.next_out = nt, x.avail_out = Q, x.next_in = j, x.avail_in = $, p.hold = z, p.bits = O, l(x, Y), nt = x.next_out, et = x.output, Q = x.avail_out, j = x.next_in, M = x.input, $ = x.avail_in, z = p.hold, O = p.bits, p.mode === 12 && (p.back = -1);
                break;
              }
              for (p.back = 0; ot = (b = p.lencode[z & (1 << p.lenbits) - 1]) >>> 16 & 255, _t = 65535 & b, !((st = b >>> 24) <= O); ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              if (ot && (240 & ot) == 0) {
                for (dt = st, Bt = ot, Lt = _t; ot = (b = p.lencode[Lt + ((z & (1 << dt + Bt) - 1) >> dt)]) >>> 16 & 255, _t = 65535 & b, !(dt + (st = b >>> 24) <= O); ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                z >>>= dt, O -= dt, p.back += dt;
              }
              if (z >>>= st, O -= st, p.back += st, p.length = _t, ot === 0) {
                p.mode = 26;
                break;
              }
              if (32 & ot) {
                p.back = -1, p.mode = 12;
                break;
              }
              if (64 & ot) {
                x.msg = "invalid literal/length code", p.mode = 30;
                break;
              }
              p.extra = 15 & ot, p.mode = 22;
            case 22:
              if (p.extra) {
                for (k = p.extra; O < k; ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                p.length += z & (1 << p.extra) - 1, z >>>= p.extra, O -= p.extra, p.back += p.extra;
              }
              p.was = p.length, p.mode = 23;
            case 23:
              for (; ot = (b = p.distcode[z & (1 << p.distbits) - 1]) >>> 16 & 255, _t = 65535 & b, !((st = b >>> 24) <= O); ) {
                if ($ === 0) break t;
                $--, z += M[j++] << O, O += 8;
              }
              if ((240 & ot) == 0) {
                for (dt = st, Bt = ot, Lt = _t; ot = (b = p.distcode[Lt + ((z & (1 << dt + Bt) - 1) >> dt)]) >>> 16 & 255, _t = 65535 & b, !(dt + (st = b >>> 24) <= O); ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                z >>>= dt, O -= dt, p.back += dt;
              }
              if (z >>>= st, O -= st, p.back += st, 64 & ot) {
                x.msg = "invalid distance code", p.mode = 30;
                break;
              }
              p.offset = _t, p.extra = 15 & ot, p.mode = 24;
            case 24:
              if (p.extra) {
                for (k = p.extra; O < k; ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                p.offset += z & (1 << p.extra) - 1, z >>>= p.extra, O -= p.extra, p.back += p.extra;
              }
              if (p.offset > p.dmax) {
                x.msg = "invalid distance too far back", p.mode = 30;
                break;
              }
              p.mode = 25;
            case 25:
              if (Q === 0) break t;
              if (Z = Y - Q, p.offset > Z) {
                if ((Z = p.offset - Z) > p.whave && p.sane) {
                  x.msg = "invalid distance too far back", p.mode = 30;
                  break;
                }
                ut = Z > p.wnext ? (Z -= p.wnext, p.wsize - Z) : p.wnext - Z, Z > p.length && (Z = p.length), vt = p.window;
              } else vt = et, ut = nt - p.offset, Z = p.length;
              for (Q < Z && (Z = Q), Q -= Z, p.length -= Z; et[nt++] = vt[ut++], --Z; ) ;
              p.length === 0 && (p.mode = 21);
              break;
            case 26:
              if (Q === 0) break t;
              et[nt++] = p.length, Q--, p.mode = 21;
              break;
            case 27:
              if (p.wrap) {
                for (; O < 32; ) {
                  if ($ === 0) break t;
                  $--, z |= M[j++] << O, O += 8;
                }
                if (Y -= Q, x.total_out += Y, p.total += Y, Y && (x.adler = p.check = p.flags ? a(p.check, et, Y, nt - Y) : o(p.check, et, Y, nt - Y)), Y = Q, (p.flags ? z : _(z)) !== p.check) {
                  x.msg = "incorrect data check", p.mode = 30;
                  break;
                }
                O = z = 0;
              }
              p.mode = 28;
            case 28:
              if (p.wrap && p.flags) {
                for (; O < 32; ) {
                  if ($ === 0) break t;
                  $--, z += M[j++] << O, O += 8;
                }
                if (z !== (4294967295 & p.total)) {
                  x.msg = "incorrect length check", p.mode = 30;
                  break;
                }
                O = z = 0;
              }
              p.mode = 29;
            case 29:
              B = 1;
              break t;
            case 30:
              B = -3;
              break t;
            case 31:
              return -4;
            default:
              return h;
          }
          return x.next_out = nt, x.avail_out = Q, x.next_in = j, x.avail_in = $, p.hold = z, p.bits = O, (p.wsize || Y !== x.avail_out && p.mode < 30 && (p.mode < 27 || N !== 4)) && J(x, x.output, x.next_out, Y - x.avail_out) ? (p.mode = 31, -4) : (X -= x.avail_in, Y -= x.avail_out, x.total_in += X, x.total_out += Y, p.total += Y, p.wrap && Y && (x.adler = p.check = p.flags ? a(p.check, et, Y, x.next_out - Y) : o(p.check, et, Y, x.next_out - Y)), x.data_type = p.bits + (p.last ? 64 : 0) + (p.mode === 12 ? 128 : 0) + (p.mode === 20 || p.mode === 15 ? 256 : 0), (X == 0 && Y === 0 || N === 4) && B === m && (B = -5), B);
        }, s.inflateEnd = function(x) {
          if (!x || !x.state) return h;
          var N = x.state;
          return N.window && (N.window = null), x.state = null, m;
        }, s.inflateGetHeader = function(x, N) {
          var p;
          return x && x.state ? (2 & (p = x.state).wrap) == 0 ? h : ((p.head = N).done = !1, m) : h;
        }, s.inflateSetDictionary = function(x, N) {
          var p, M = N.length;
          return x && x.state ? (p = x.state).wrap !== 0 && p.mode !== 11 ? h : p.mode === 11 && o(1, N, M, 0) !== p.check ? -3 : J(x, N, M, M) ? (p.mode = 31, -4) : (p.havedict = 1, m) : h;
        }, s.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, r, s) {
        var i = e("../utils/common"), o = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], a = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], l = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], d = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        r.exports = function(f, u, m, h, w, g, y, _) {
          var S, C, A, v, T, I, U, L, H, J = _.bits, x = 0, N = 0, p = 0, M = 0, et = 0, j = 0, nt = 0, $ = 0, Q = 0, z = 0, O = null, X = 0, Y = new i.Buf16(16), Z = new i.Buf16(16), ut = null, vt = 0;
          for (x = 0; x <= 15; x++) Y[x] = 0;
          for (N = 0; N < h; N++) Y[u[m + N]]++;
          for (et = J, M = 15; 1 <= M && Y[M] === 0; M--) ;
          if (M < et && (et = M), M === 0) return w[g++] = 20971520, w[g++] = 20971520, _.bits = 1, 0;
          for (p = 1; p < M && Y[p] === 0; p++) ;
          for (et < p && (et = p), x = $ = 1; x <= 15; x++) if ($ <<= 1, ($ -= Y[x]) < 0) return -1;
          if (0 < $ && (f === 0 || M !== 1)) return -1;
          for (Z[1] = 0, x = 1; x < 15; x++) Z[x + 1] = Z[x] + Y[x];
          for (N = 0; N < h; N++) u[m + N] !== 0 && (y[Z[u[m + N]]++] = N);
          if (I = f === 0 ? (O = ut = y, 19) : f === 1 ? (O = o, X -= 257, ut = a, vt -= 257, 256) : (O = l, ut = d, -1), x = p, T = g, nt = N = z = 0, A = -1, v = (Q = 1 << (j = et)) - 1, f === 1 && 852 < Q || f === 2 && 592 < Q) return 1;
          for (; ; ) {
            for (U = x - nt, H = y[N] < I ? (L = 0, y[N]) : y[N] > I ? (L = ut[vt + y[N]], O[X + y[N]]) : (L = 96, 0), S = 1 << x - nt, p = C = 1 << j; w[T + (z >> nt) + (C -= S)] = U << 24 | L << 16 | H | 0, C !== 0; ) ;
            for (S = 1 << x - 1; z & S; ) S >>= 1;
            if (S !== 0 ? (z &= S - 1, z += S) : z = 0, N++, --Y[x] == 0) {
              if (x === M) break;
              x = u[m + y[N]];
            }
            if (et < x && (z & v) !== A) {
              for (nt === 0 && (nt = et), T += p, $ = 1 << (j = x - nt); j + nt < M && !(($ -= Y[j + nt]) <= 0); ) j++, $ <<= 1;
              if (Q += 1 << j, f === 1 && 852 < Q || f === 2 && 592 < Q) return 1;
              w[A = z & v] = et << 24 | j << 16 | T - g | 0;
            }
          }
          return z !== 0 && (w[T + z] = x - nt << 24 | 64 << 16 | 0), _.bits = et, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(e, r, s) {
        r.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(e, r, s) {
        var i = e("../utils/common"), o = 0, a = 1;
        function l(b) {
          for (var E = b.length; 0 <= --E; ) b[E] = 0;
        }
        var d = 0, f = 29, u = 256, m = u + 1 + f, h = 30, w = 19, g = 2 * m + 1, y = 15, _ = 16, S = 7, C = 256, A = 16, v = 17, T = 18, I = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], U = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], L = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], H = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], J = new Array(2 * (m + 2));
        l(J);
        var x = new Array(2 * h);
        l(x);
        var N = new Array(512);
        l(N);
        var p = new Array(256);
        l(p);
        var M = new Array(f);
        l(M);
        var et, j, nt, $ = new Array(h);
        function Q(b, E, F, P, D) {
          this.static_tree = b, this.extra_bits = E, this.extra_base = F, this.elems = P, this.max_length = D, this.has_stree = b && b.length;
        }
        function z(b, E) {
          this.dyn_tree = b, this.max_code = 0, this.stat_desc = E;
        }
        function O(b) {
          return b < 256 ? N[b] : N[256 + (b >>> 7)];
        }
        function X(b, E) {
          b.pending_buf[b.pending++] = 255 & E, b.pending_buf[b.pending++] = E >>> 8 & 255;
        }
        function Y(b, E, F) {
          b.bi_valid > _ - F ? (b.bi_buf |= E << b.bi_valid & 65535, X(b, b.bi_buf), b.bi_buf = E >> _ - b.bi_valid, b.bi_valid += F - _) : (b.bi_buf |= E << b.bi_valid & 65535, b.bi_valid += F);
        }
        function Z(b, E, F) {
          Y(b, F[2 * E], F[2 * E + 1]);
        }
        function ut(b, E) {
          for (var F = 0; F |= 1 & b, b >>>= 1, F <<= 1, 0 < --E; ) ;
          return F >>> 1;
        }
        function vt(b, E, F) {
          var P, D, W = new Array(y + 1), G = 0;
          for (P = 1; P <= y; P++) W[P] = G = G + F[P - 1] << 1;
          for (D = 0; D <= E; D++) {
            var V = b[2 * D + 1];
            V !== 0 && (b[2 * D] = ut(W[V]++, V));
          }
        }
        function st(b) {
          var E;
          for (E = 0; E < m; E++) b.dyn_ltree[2 * E] = 0;
          for (E = 0; E < h; E++) b.dyn_dtree[2 * E] = 0;
          for (E = 0; E < w; E++) b.bl_tree[2 * E] = 0;
          b.dyn_ltree[2 * C] = 1, b.opt_len = b.static_len = 0, b.last_lit = b.matches = 0;
        }
        function ot(b) {
          8 < b.bi_valid ? X(b, b.bi_buf) : 0 < b.bi_valid && (b.pending_buf[b.pending++] = b.bi_buf), b.bi_buf = 0, b.bi_valid = 0;
        }
        function _t(b, E, F, P) {
          var D = 2 * E, W = 2 * F;
          return b[D] < b[W] || b[D] === b[W] && P[E] <= P[F];
        }
        function dt(b, E, F) {
          for (var P = b.heap[F], D = F << 1; D <= b.heap_len && (D < b.heap_len && _t(E, b.heap[D + 1], b.heap[D], b.depth) && D++, !_t(E, P, b.heap[D], b.depth)); ) b.heap[F] = b.heap[D], F = D, D <<= 1;
          b.heap[F] = P;
        }
        function Bt(b, E, F) {
          var P, D, W, G, V = 0;
          if (b.last_lit !== 0) for (; P = b.pending_buf[b.d_buf + 2 * V] << 8 | b.pending_buf[b.d_buf + 2 * V + 1], D = b.pending_buf[b.l_buf + V], V++, P === 0 ? Z(b, D, E) : (Z(b, (W = p[D]) + u + 1, E), (G = I[W]) !== 0 && Y(b, D -= M[W], G), Z(b, W = O(--P), F), (G = U[W]) !== 0 && Y(b, P -= $[W], G)), V < b.last_lit; ) ;
          Z(b, C, E);
        }
        function Lt(b, E) {
          var F, P, D, W = E.dyn_tree, G = E.stat_desc.static_tree, V = E.stat_desc.has_stree, q = E.stat_desc.elems, lt = -1;
          for (b.heap_len = 0, b.heap_max = g, F = 0; F < q; F++) W[2 * F] !== 0 ? (b.heap[++b.heap_len] = lt = F, b.depth[F] = 0) : W[2 * F + 1] = 0;
          for (; b.heap_len < 2; ) W[2 * (D = b.heap[++b.heap_len] = lt < 2 ? ++lt : 0)] = 1, b.depth[D] = 0, b.opt_len--, V && (b.static_len -= G[2 * D + 1]);
          for (E.max_code = lt, F = b.heap_len >> 1; 1 <= F; F--) dt(b, W, F);
          for (D = q; F = b.heap[1], b.heap[1] = b.heap[b.heap_len--], dt(b, W, 1), P = b.heap[1], b.heap[--b.heap_max] = F, b.heap[--b.heap_max] = P, W[2 * D] = W[2 * F] + W[2 * P], b.depth[D] = (b.depth[F] >= b.depth[P] ? b.depth[F] : b.depth[P]) + 1, W[2 * F + 1] = W[2 * P + 1] = D, b.heap[1] = D++, dt(b, W, 1), 2 <= b.heap_len; ) ;
          b.heap[--b.heap_max] = b.heap[1], (function(it, Tt) {
            var Le, Mt, Ne, ft, rn, Hn, Ht = Tt.dyn_tree, es = Tt.max_code, ao = Tt.stat_desc.static_tree, lo = Tt.stat_desc.has_stree, co = Tt.stat_desc.extra_bits, ns = Tt.stat_desc.extra_base, Ue = Tt.stat_desc.max_length, sn = 0;
            for (ft = 0; ft <= y; ft++) it.bl_count[ft] = 0;
            for (Ht[2 * it.heap[it.heap_max] + 1] = 0, Le = it.heap_max + 1; Le < g; Le++) Ue < (ft = Ht[2 * Ht[2 * (Mt = it.heap[Le]) + 1] + 1] + 1) && (ft = Ue, sn++), Ht[2 * Mt + 1] = ft, es < Mt || (it.bl_count[ft]++, rn = 0, ns <= Mt && (rn = co[Mt - ns]), Hn = Ht[2 * Mt], it.opt_len += Hn * (ft + rn), lo && (it.static_len += Hn * (ao[2 * Mt + 1] + rn)));
            if (sn !== 0) {
              do {
                for (ft = Ue - 1; it.bl_count[ft] === 0; ) ft--;
                it.bl_count[ft]--, it.bl_count[ft + 1] += 2, it.bl_count[Ue]--, sn -= 2;
              } while (0 < sn);
              for (ft = Ue; ft !== 0; ft--) for (Mt = it.bl_count[ft]; Mt !== 0; ) es < (Ne = it.heap[--Le]) || (Ht[2 * Ne + 1] !== ft && (it.opt_len += (ft - Ht[2 * Ne + 1]) * Ht[2 * Ne], Ht[2 * Ne + 1] = ft), Mt--);
            }
          })(b, E), vt(W, lt, b.bl_count);
        }
        function c(b, E, F) {
          var P, D, W = -1, G = E[1], V = 0, q = 7, lt = 4;
          for (G === 0 && (q = 138, lt = 3), E[2 * (F + 1) + 1] = 65535, P = 0; P <= F; P++) D = G, G = E[2 * (P + 1) + 1], ++V < q && D === G || (V < lt ? b.bl_tree[2 * D] += V : D !== 0 ? (D !== W && b.bl_tree[2 * D]++, b.bl_tree[2 * A]++) : V <= 10 ? b.bl_tree[2 * v]++ : b.bl_tree[2 * T]++, W = D, lt = (V = 0) === G ? (q = 138, 3) : D === G ? (q = 6, 3) : (q = 7, 4));
        }
        function B(b, E, F) {
          var P, D, W = -1, G = E[1], V = 0, q = 7, lt = 4;
          for (G === 0 && (q = 138, lt = 3), P = 0; P <= F; P++) if (D = G, G = E[2 * (P + 1) + 1], !(++V < q && D === G)) {
            if (V < lt) for (; Z(b, D, b.bl_tree), --V != 0; ) ;
            else D !== 0 ? (D !== W && (Z(b, D, b.bl_tree), V--), Z(b, A, b.bl_tree), Y(b, V - 3, 2)) : V <= 10 ? (Z(b, v, b.bl_tree), Y(b, V - 3, 3)) : (Z(b, T, b.bl_tree), Y(b, V - 11, 7));
            W = D, lt = (V = 0) === G ? (q = 138, 3) : D === G ? (q = 6, 3) : (q = 7, 4);
          }
        }
        l($);
        var R = !1;
        function k(b, E, F, P) {
          Y(b, (d << 1) + (P ? 1 : 0), 3), (function(D, W, G, V) {
            ot(D), X(D, G), X(D, ~G), i.arraySet(D.pending_buf, D.window, W, G, D.pending), D.pending += G;
          })(b, E, F);
        }
        s._tr_init = function(b) {
          R || ((function() {
            var E, F, P, D, W, G = new Array(y + 1);
            for (D = P = 0; D < f - 1; D++) for (M[D] = P, E = 0; E < 1 << I[D]; E++) p[P++] = D;
            for (p[P - 1] = D, D = W = 0; D < 16; D++) for ($[D] = W, E = 0; E < 1 << U[D]; E++) N[W++] = D;
            for (W >>= 7; D < h; D++) for ($[D] = W << 7, E = 0; E < 1 << U[D] - 7; E++) N[256 + W++] = D;
            for (F = 0; F <= y; F++) G[F] = 0;
            for (E = 0; E <= 143; ) J[2 * E + 1] = 8, E++, G[8]++;
            for (; E <= 255; ) J[2 * E + 1] = 9, E++, G[9]++;
            for (; E <= 279; ) J[2 * E + 1] = 7, E++, G[7]++;
            for (; E <= 287; ) J[2 * E + 1] = 8, E++, G[8]++;
            for (vt(J, m + 1, G), E = 0; E < h; E++) x[2 * E + 1] = 5, x[2 * E] = ut(E, 5);
            et = new Q(J, I, u + 1, m, y), j = new Q(x, U, 0, h, y), nt = new Q(new Array(0), L, 0, w, S);
          })(), R = !0), b.l_desc = new z(b.dyn_ltree, et), b.d_desc = new z(b.dyn_dtree, j), b.bl_desc = new z(b.bl_tree, nt), b.bi_buf = 0, b.bi_valid = 0, st(b);
        }, s._tr_stored_block = k, s._tr_flush_block = function(b, E, F, P) {
          var D, W, G = 0;
          0 < b.level ? (b.strm.data_type === 2 && (b.strm.data_type = (function(V) {
            var q, lt = 4093624447;
            for (q = 0; q <= 31; q++, lt >>>= 1) if (1 & lt && V.dyn_ltree[2 * q] !== 0) return o;
            if (V.dyn_ltree[18] !== 0 || V.dyn_ltree[20] !== 0 || V.dyn_ltree[26] !== 0) return a;
            for (q = 32; q < u; q++) if (V.dyn_ltree[2 * q] !== 0) return a;
            return o;
          })(b)), Lt(b, b.l_desc), Lt(b, b.d_desc), G = (function(V) {
            var q;
            for (c(V, V.dyn_ltree, V.l_desc.max_code), c(V, V.dyn_dtree, V.d_desc.max_code), Lt(V, V.bl_desc), q = w - 1; 3 <= q && V.bl_tree[2 * H[q] + 1] === 0; q--) ;
            return V.opt_len += 3 * (q + 1) + 5 + 5 + 4, q;
          })(b), D = b.opt_len + 3 + 7 >>> 3, (W = b.static_len + 3 + 7 >>> 3) <= D && (D = W)) : D = W = F + 5, F + 4 <= D && E !== -1 ? k(b, E, F, P) : b.strategy === 4 || W === D ? (Y(b, 2 + (P ? 1 : 0), 3), Bt(b, J, x)) : (Y(b, 4 + (P ? 1 : 0), 3), (function(V, q, lt, it) {
            var Tt;
            for (Y(V, q - 257, 5), Y(V, lt - 1, 5), Y(V, it - 4, 4), Tt = 0; Tt < it; Tt++) Y(V, V.bl_tree[2 * H[Tt] + 1], 3);
            B(V, V.dyn_ltree, q - 1), B(V, V.dyn_dtree, lt - 1);
          })(b, b.l_desc.max_code + 1, b.d_desc.max_code + 1, G + 1), Bt(b, b.dyn_ltree, b.dyn_dtree)), st(b), P && ot(b);
        }, s._tr_tally = function(b, E, F) {
          return b.pending_buf[b.d_buf + 2 * b.last_lit] = E >>> 8 & 255, b.pending_buf[b.d_buf + 2 * b.last_lit + 1] = 255 & E, b.pending_buf[b.l_buf + b.last_lit] = 255 & F, b.last_lit++, E === 0 ? b.dyn_ltree[2 * F]++ : (b.matches++, E--, b.dyn_ltree[2 * (p[F] + u + 1)]++, b.dyn_dtree[2 * O(E)]++), b.last_lit === b.lit_bufsize - 1;
        }, s._tr_align = function(b) {
          Y(b, 2, 3), Z(b, C, J), (function(E) {
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
              var l, d, f, u, m = 1, h = {}, w = !1, g = o.document, y = Object.getPrototypeOf && Object.getPrototypeOf(o);
              y = y && y.setTimeout ? y : o, l = {}.toString.call(o.process) === "[object process]" ? function(A) {
                process.nextTick(function() {
                  S(A);
                });
              } : (function() {
                if (o.postMessage && !o.importScripts) {
                  var A = !0, v = o.onmessage;
                  return o.onmessage = function() {
                    A = !1;
                  }, o.postMessage("", "*"), o.onmessage = v, A;
                }
              })() ? (u = "setImmediate$" + Math.random() + "$", o.addEventListener ? o.addEventListener("message", C, !1) : o.attachEvent("onmessage", C), function(A) {
                o.postMessage(u + A, "*");
              }) : o.MessageChannel ? ((f = new MessageChannel()).port1.onmessage = function(A) {
                S(A.data);
              }, function(A) {
                f.port2.postMessage(A);
              }) : g && "onreadystatechange" in g.createElement("script") ? (d = g.documentElement, function(A) {
                var v = g.createElement("script");
                v.onreadystatechange = function() {
                  S(A), v.onreadystatechange = null, d.removeChild(v), v = null;
                }, d.appendChild(v);
              }) : function(A) {
                setTimeout(S, 0, A);
              }, y.setImmediate = function(A) {
                typeof A != "function" && (A = new Function("" + A));
                for (var v = new Array(arguments.length - 1), T = 0; T < v.length; T++) v[T] = arguments[T + 1];
                var I = { callback: A, args: v };
                return h[m] = I, l(m), m++;
              }, y.clearImmediate = _;
            }
            function _(A) {
              delete h[A];
            }
            function S(A) {
              if (w) setTimeout(S, 0, A);
              else {
                var v = h[A];
                if (v) {
                  w = !0;
                  try {
                    (function(T) {
                      var I = T.callback, U = T.args;
                      switch (U.length) {
                        case 0:
                          I();
                          break;
                        case 1:
                          I(U[0]);
                          break;
                        case 2:
                          I(U[0], U[1]);
                          break;
                        case 3:
                          I(U[0], U[1], U[2]);
                          break;
                        default:
                          I.apply(a, U);
                      }
                    })(v);
                  } finally {
                    _(A), w = !1;
                  }
                }
              }
            }
            function C(A) {
              A.source === o && typeof A.data == "string" && A.data.indexOf(u) === 0 && S(+A.data.slice(u.length));
            }
          })(typeof self > "u" ? i === void 0 ? this : i : self);
        }).call(this, typeof hn < "u" ? hn : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}] }, {}, [10])(10);
    });
  })(rr)), rr.exports;
}
var Mh = Bh();
const oo = /* @__PURE__ */ Uh(Mh), _r = "__ync_update__", yr = "_worldnotes.yjs";
async function Fh(n, t) {
  const e = new oo(), r = await n.get(_r);
  r && e.file(yr, r);
  const s = await n.keys();
  for (const i of s) {
    if (i === _r) continue;
    const o = await n.get(i);
    e.file(`${i}.md`, o ?? "");
  }
  return e.generateAsync({ type: "blob" });
}
async function Ph(n, t, e) {
  const r = e?.strategy ?? "overwrite", s = [], i = [], o = await oo.loadAsync(t), a = o.file(yr);
  if (a) {
    const l = await a.async("string");
    await n.set(_r, l), s.push(yr);
  }
  for (const [l, d] of Object.entries(o.files)) {
    if (d.dir || !l.endsWith(".md")) continue;
    const f = l.slice(0, -3);
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
function Vh(n) {
  const { storage: t, onImportComplete: e, exportFilename: r, importStrategy: s } = n;
  let i = null, o = null, a = null;
  async function l() {
    const f = await Fh(t), u = URL.createObjectURL(f), m = document.createElement("a");
    m.href = u, m.download = r ?? "worldnotes-export.zip", m.click(), URL.revokeObjectURL(u);
  }
  async function d() {
    const f = a?.files?.[0];
    f && (await Ph(t, f, { strategy: s }), e());
  }
  return {
    name: "import-export",
    version: "1.0.0",
    kind: "ui",
    slots: ["wn-toolbar"],
    onMount(f) {
      i = document.createElement("button"), i.textContent = "Export", i.addEventListener("click", l), f.appendChild(i), o = document.createElement("button"), o.textContent = "Import", o.addEventListener("click", () => {
        a?.click();
      }), f.appendChild(o), a = document.createElement("input"), a.type = "file", a.accept = ".zip", a.style.display = "none", a.addEventListener("change", d), f.appendChild(a);
    },
    onDestroy() {
      i && (i.removeEventListener("click", l), i.remove(), i = null), o && (o.removeEventListener("click", () => {
        a?.click();
      }), o.remove(), o = null), a && (a.removeEventListener("change", d), a.remove(), a = null);
    }
  };
}
export {
  Rh as EditorBuilder,
  Hh as EditorHistory,
  Wh as IndexedDBAdapter,
  uo as LocalStorageAdapter,
  bo as blockquotePlugin,
  wo as boldPlugin,
  $h as createEditor,
  Vh as createImportExportPlugin,
  Zc as createYDocState,
  xo as defaultPlugins,
  Fh as exportWorld,
  mo as headingsPlugin,
  ko as hrPlugin,
  Ph as importWorld,
  yo as inlineCodePlugin,
  _o as italicPlugin,
  vo as linkPlugin,
  Eh as loadYDoc,
  jh as remoteCursorsPlugin,
  Ch as saveYDoc,
  So as strikethroughPlugin,
  go as wikiLinkPlugin
};

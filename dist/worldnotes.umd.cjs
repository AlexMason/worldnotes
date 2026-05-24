(function(g,b){typeof exports=="object"&&typeof module<"u"?b(exports):typeof define=="function"&&define.amd?define(["exports"],b):(g=typeof globalThis<"u"?globalThis:g||self,b(g.WorldNotes={}))})(this,(function(g){"use strict";const b="worldnotes";class T{constructor(t=b){this.namespace=t}key(t){return`${this.namespace}::${t}`}async get(t){return localStorage.getItem(this.key(t))}async set(t,e){localStorage.setItem(this.key(t),e)}async keys(){const t=`${this.namespace}::`;return Object.keys(localStorage).filter(e=>e.startsWith(t)).map(e=>e.slice(t.length))}}function y(o){const t=o.trim().replace(/\/+$/,""),e=t.split("/").filter(Boolean);return e[e.length-1]??t}function C(o){const t=o.indexOf("|"),e=(t===-1?o:o.slice(0,t)).trim(),n=t===-1?y(e):o.slice(t+1).trim();return{page:e,display:n||y(e)}}function U(o,t){const n=o.replace(/^\?/,"").split("&").filter(Boolean).filter(a=>{const[l=""]=a.split("=",1);return decodeURIComponent(l.replace(/\+/g," "))!=="path"}),r=t.map(a=>encodeURIComponent(a)).join("/");return`?${[...n,`path=${r}`].join("&")}`}function q(o){const e=o.replace(/^\?/,"").split("&").filter(Boolean).find(i=>{const[a=""]=i.split("=",1);return decodeURIComponent(a.replace(/\+/g," "))==="path"});if(!e)return[];const n=e.indexOf("="),r=n===-1?"":e.slice(n+1);return r?r.split("/").filter(Boolean).map(i=>decodeURIComponent(i)):[]}const N={name:"wiki-link",version:"1.0.0",kind:"content",tokens:[{type:"wiki-link",pattern:/\[\[([^\]]+)\]\]/}],render(o,t){const{page:e,display:n}=C(o.groups[0]??""),r=document.createElement("span");return r.className="wn-wiki-link",r.dataset.page=e,r.dataset.raw=o.raw,r.textContent=n,r},onNavigate(o,t){const{page:e}=C(o.groups[0]??"");return t.navigate(e),!0}};function v(o,t,e){const n=document.createElement("span");n.className=e;const r=document.createElement("span");r.className="wn-punct",r.textContent=t;const i=document.createElement("span");return i.className=`${e}-text`,i.textContent=o.groups[0]??"",n.appendChild(r),n.appendChild(i),n}const D={name:"headings",version:"1.0.0",kind:"content",tokens:[{type:"h1",pattern:/^# (.*)$/},{type:"h2",pattern:/^## (.*)$/},{type:"h3",pattern:/^### (.*)$/}],render(o,t){switch(o.type){case"h1":return v(o,"# ","wn-h1");case"h2":return v(o,"## ","wn-h2");case"h3":return v(o,"### ","wn-h3");default:return v(o,"","wn-h1")}}};function x(o,t,e){const n=document.createElement("span");n.className=o;const r=i=>{const a=document.createElement("span");return a.className="wn-punct",a.textContent=i,a};return n.appendChild(r(t)),n.appendChild(document.createTextNode(e)),n.appendChild(r(t)),n}const S={name:"bold",version:"1.0.0",kind:"content",tokens:[{type:"bold",pattern:/\*\*([^*]+)\*\*/}],render(o,t){return x("wn-bold","**",o.groups[0]??"")}},A={name:"italic",version:"1.0.0",kind:"content",tokens:[{type:"italic",pattern:/\*([^*]+)\*/}],render(o,t){return x("wn-italic","*",o.groups[0]??"")}},L={name:"inline-code",version:"1.0.0",kind:"content",tokens:[{type:"inline-code",pattern:/`([^`]+)`/}],render(o,t){const e=document.createElement("span");e.className="wn-inline-code";const n=i=>{const a=document.createElement("span");return a.className="wn-punct",a.textContent=i,a};e.appendChild(n("`"));const r=document.createElement("span");return r.className="wn-code-text",r.textContent=o.groups[0]??"",e.appendChild(r),e.appendChild(n("`")),e}},I={name:"blockquote",version:"1.0.0",kind:"content",tokens:[{type:"blockquote",pattern:/^(> )(.*)$/}],render(o,t){const e=document.createElement("span");e.className="wn-blockquote";const n=document.createElement("span");n.className="wn-punct",n.textContent="> ";const r=document.createElement("span");return r.className="wn-blockquote-text",r.textContent=o.groups[1]??"",e.appendChild(n),e.appendChild(r),e}},z={name:"hr",version:"1.0.0",kind:"content",tokens:[{type:"hr",pattern:/^---+$/}],render(o,t){const e=document.createElement("span");return e.className="wn-hr",e.textContent="---",e}},M={name:"link",version:"1.0.0",kind:"content",tokens:[{type:"link",pattern:/\[([^\]]+)\]\(([^)]+)\)/}],render(o,t){const e=o.groups[0]??"",n=o.groups[1]??"";if(!n.includes("://")&&!n.startsWith("//")){const a=document.createElement("span");return a.className="wn-wiki-link",a.dataset.page=n,a.dataset.raw=o.raw,a.textContent=e,a}const i=document.createElement("a");return i.className="wn-link",i.href=n,i.target="_blank",i.rel="noopener noreferrer",i.dataset.raw=o.raw,i.textContent=e,i},onNavigate(o,t){const e=o.groups[1]??"";return!e.includes("://")&&!e.startsWith("//")?(t.navigate(e),!0):!1}},O={name:"strikethrough",version:"1.0.0",kind:"content",tokens:[{type:"strikethrough",pattern:/~~([^~]+)~~/}],render(o,t){const e=x("wn-strikethrough","~~",o.groups[0]??"");return e.dataset.raw=o.raw,e}},R=[D,z,I,N,M,S,A,O,L],F=/^\d+\.\d+\.\d+(-[\w.]+)?$/;class j{constructor(){this.contentPlugins=new Map,this.uiPlugins=new Map,this.storagePlugins=new Map,this.tokenTypeOwners=new Map,this.slotAssignments=new Map}validateVersion(t,e){if(!F.test(e))throw new Error(`Invalid version "${e}" for plugin "${t}": must match semver format X.Y.Z or X.Y.Z-prerelease`)}removeByName(t){const e=this.contentPlugins.get(t);if(e){e.onDestroy?.();for(const i of e.tokens)this.tokenTypeOwners.delete(i.type);this.contentPlugins.delete(t);return}const n=this.uiPlugins.get(t);if(n){n.onDestroy?.();const i=n.priority??0;for(const a of n.slots){const l=this.slotAssignments.get(a);l&&(l.delete(i),l.size===0&&this.slotAssignments.delete(a))}this.uiPlugins.delete(t);return}const r=this.storagePlugins.get(t);r&&(r.onDestroy?.(),this.storagePlugins.delete(t))}register(t){switch(this.validateVersion(t.name,t.version),this.removeByName(t.name),t.kind){case"content":this.registerContent(t);break;case"ui":this.registerUI(t);break;case"storage":this.registerStorage(t);break}try{t.onInit?.()}catch(e){throw this.removeByName(t.name),e}}registerContent(t){for(const e of t.tokens){const n=this.tokenTypeOwners.get(e.type);if(n!==void 0&&n!==t.name)throw new Error(`Plugin conflict: "${t.name}" declares token type "${e.type}", but "${n}" already owns it. Each token type may only be registered by one content plugin.`)}for(const e of t.tokens)this.tokenTypeOwners.set(e.type,t.name);this.contentPlugins.set(t.name,t)}registerUI(t){const e=t.priority??0;for(const n of t.slots){const r=this.slotAssignments.get(n);if(r){const i=r.get(e);if(i!==void 0&&i!==t.name)throw new Error(`UI plugin conflict: "${t.name}" claims slot "${n}" with priority ${e}, but "${i}" already claims it with the same priority. Change one plugin's priority to resolve.`)}}for(const n of t.slots){let r=this.slotAssignments.get(n);r||(r=new Map,this.slotAssignments.set(n,r)),r.set(e,t.name)}this.uiPlugins.set(t.name,t)}registerStorage(t){this.storagePlugins.set(t.name,t)}allContentPlugins(){return Array.from(this.contentPlugins.values())}allTokenDefs(){return this.allContentPlugins().flatMap(t=>t.tokens)}getContentPluginByType(t){const e=this.tokenTypeOwners.get(t);if(e)return this.contentPlugins.get(e)}getPlugin(t){return this.contentPlugins.get(t)??this.uiPlugins.get(t)??this.storagePlugins.get(t)}getAllPlugins(){return[...this.contentPlugins.values(),...this.uiPlugins.values(),...this.storagePlugins.values()]}allUIPlugins(){return Array.from(this.uiPlugins.values())}allStoragePlugins(){return Array.from(this.storagePlugins.values())}clear(){this.contentPlugins.clear(),this.uiPlugins.clear(),this.storagePlugins.clear(),this.tokenTypeOwners.clear(),this.slotAssignments.clear()}}function K(o,t={}){const e=t.initialPage??"home",n=q(window.location.search),r=n[n.length-1]??e,i={};let a=n.length?[...n]:[r],l=null,d=!1;return{world:i,getTrail(){return[...a]},getWorld(){return{...i}},setWorldPage(s,c){i[s]=c},pushTrail(s){a.push(s)},setTrail(s){a=s},truncateTrail(s){a=a.slice(0,s+1)},setNavigating(s){return d=s,s},isNavigating(){return d},clearSaveTimer(){l&&(clearTimeout(l),l=null)},setSaveTimer(s){l=s},toContext(s){return{navigate:s,getTrail:()=>[...a],getWorld:()=>({...i})}}}}const V=`
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
`+`
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
`;function k(o,t){const e=document.createElement(o);return e.className=t,e}function X(o){const t="worldnotes-styles",e=document.getElementById(t);if(e){o!==void 0&&(e.textContent=o);return}const n=document.createElement("style");n.id=t,n.textContent=o??V,document.head.appendChild(n)}function Y(o,t){X(t),o.innerHTML="",o.className="wn-root";const e=k("div","wn-topbar"),n=k("div","wn-breadcrumb"),r=k("div","wn-editor-wrap"),i=k("div","wn-editor"),a=k("div","wn-placeholder");return a.textContent="Start writing… use [[page name]] to link deeper",i.contentEditable="true",i.spellcheck=!1,e.appendChild(n),r.appendChild(a),r.appendChild(i),o.appendChild(e),o.appendChild(r),{container:o,topbar:e,breadcrumb:n,editorWrap:r,editorDiv:i,placeholder:a}}function G(o){const t=window.getSelection();if(!t||!t.rangeCount)return 0;const e=t.getRangeAt(0);return _(o,e.endContainer,e.endOffset).offset}function Z(o,t){const e=te(o,t),n=document.createRange(),r=window.getSelection();r&&(e?(n.setStart(e.node,e.offset),n.collapse(!0)):(n.selectNodeContents(o),n.collapse(!1)),r.removeAllRanges(),r.addRange(n))}const Q=new Set(["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DIV","DL","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","TABLE","UL"]);function J(o){return o.nodeType===Node.ELEMENT_NODE&&Q.has(o.nodeName)}function P(o){return _(o,null,0).text}function _(o,t,e){let n="",r=0,i=t===null;function a(s){i||(r+=s.length),n+=s}function l(s){if(s.nodeType===Node.TEXT_NODE){const c=s.textContent??"";s===t&&!i?(r+=Math.min(e,c.length),i=!0,n+=c):a(c)}else if(s.dataset?.raw!==void 0){const c=s.dataset.raw??"";s===t&&!i?(r+=e<=0?0:c.length,i=!0):ee(s,t)&&!i?($(s,t,e),r+=Math.min($(s,t,e),c.length),i=!0):a(c)}else s.nodeName==="BR"?a(`
`):(J(s)&&n&&!n.endsWith(`
`)&&a(`
`),d(s))}function d(s){s.childNodes.forEach((c,p)=>{s===t&&p===e&&!i&&(i=!0),l(c)}),s===t&&s.childNodes.length===e&&!i&&(i=!0)}return d(o),{text:n,offset:r}}function ee(o,t){if(!t)return!1;let e=t;for(;e;){if(e===o)return!0;e=e.parentNode}return!1}function $(o,t,e){let n=0,r=!1;function i(a){if(!r){if(a.nodeType===Node.TEXT_NODE){const l=a.textContent??"";a===t?(n+=Math.min(e,l.length),r=!0):n+=l.length;return}a.childNodes.forEach((l,d)=>{a===t&&d===e&&!r&&(r=!0),r||i(l)}),a===t&&a.childNodes.length===e&&!r&&(r=!0)}}return i(o),n}function te(o,t){let e=t,n=null;function r(i){if(n)return;if(i.nodeType===Node.TEXT_NODE){const l=i.length;if(e<=l){n={node:i,offset:e};return}e-=l;return}const a=i.dataset?.raw;if(a!==void 0){e-=a.length;return}if(i.nodeName==="BR"){e-=1;return}i.childNodes.forEach(r)}return r(o),n}function B(o){return{type:"text",raw:o,groups:[o]}}function ne(o,t){const e=t.filter(r=>r.pattern.source.startsWith("^")),n=t.filter(r=>!r.pattern.source.startsWith("^"));for(const r of e){const i=o.match(r.pattern);if(i)return[{type:r.type,raw:i[0],groups:i.slice(1).map(a=>a??"")}]}return oe(o,n)}function oe(o,t){const e=[];let n=o;for(;n.length>0;){let r=null;for(const i of t){const a=n.match(i.pattern);!a||a.index===void 0||(r===null||a.index<r.index)&&(r={index:a.index,match:a,def:i})}if(!r){e.push(B(n));break}r.index>0&&e.push(B(n.slice(0,r.index))),e.push({type:r.def.type,raw:r.match[0],groups:r.match.slice(1).map(i=>i??"")}),n=n.slice(r.index+r.match[0].length)}return e}function re(o,t){return o.split(`
`).map(e=>ne(e,t))}function ie(o,t,e,n=-1){const r=document.createDocumentFragment(),i=se(t);let a=0;for(const l of o){if(l.type==="text"){r.appendChild(document.createTextNode(l.raw)),a+=l.raw.length;continue}const d=a,s=d+l.raw.length;if(a=s,n>=d&&n<=s){r.appendChild(document.createTextNode(l.raw));continue}const c=i.get(l.type);if(!c){r.appendChild(document.createTextNode(l.raw));continue}const p=c.render(l,e);if(p instanceof HTMLElement&&c.onNavigate){const u=c.onNavigate.bind(c);p.addEventListener("mousedown",h=>{u(l,e)&&h.preventDefault()})}r.appendChild(p)}return r}function ae(o,t,e,n=-1){let r=0;return o.map(i=>{const a=i.reduce((s,c)=>s+c.raw.length,0),l=n-r,d=ie(i,t,e,l);return r+=a+1,d})}function se(o){const t=new Map;for(const e of o)for(const n of e.tokens)t.set(n.type,e);return t}function le(o,t,e,n={}){const{editorDiv:r,placeholder:i,breadcrumb:a}=o;function l(){const c=G(r),p=P(r),u=re(p,t.flatMap(f=>f.tokens)),h=e.toContext(n.navigateFn??(f=>{})),w=ae(u,t,h,c);r.innerHTML="",w.forEach((f,E)=>{r.appendChild(f),E<w.length-1&&r.appendChild(document.createTextNode(`
`))}),i.style.display=p.length?"none":"block";try{Z(r,c)}catch{}}function d(){a.innerHTML="";const c=e.getTrail();c.forEach((p,u)=>{if(u>0){const w=document.createElement("span");w.className="wn-crumb-sep",w.textContent="/",a.appendChild(w)}const h=document.createElement("span");h.className="wn-crumb"+(u===c.length-1?" wn-crumb--active":""),h.textContent=y(p),u<c.length-1&&h.addEventListener("click",()=>{e.truncateTrail(u);const w=e.getTrail(),f=w[w.length-1];n.onBreadcrumbNavigate?.(f)}),a.appendChild(h)}),n.onTrailChange?.(e.getTrail()),s()}function s(){const c=e.getTrail(),p=U(window.location.search,c);window.history.replaceState(null,"",`${window.location.pathname}${p}${window.location.hash}`)}return{render:l,renderBreadcrumb:d,syncUrlToTrail:s}}const H=`# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;function ce(o,t,e,n){let r=null;function i(d){r=d}async function a(d){if(!o.world[d]){const s=await t.get(d);s?o.setWorldPage(d,s):(o.setWorldPage(d,`# ${d}

`),await t.set(d,o.world[d]))}o.pushTrail(d),await l(d)}async function l(d){if(o.setNavigating(!0),!o.world[d]){const c=await t.get(d);!c&&d==="home"?(o.setWorldPage(d,H),await t.set(d,H)):o.setWorldPage(d,c??`# ${d}

`)}const s=o.world[d];e.editorDiv.textContent=s,r&&(r.render(),r.renderBreadcrumb());try{const c=document.createRange(),p=window.getSelection();p&&(c.setStart(e.editorDiv,0),c.collapse(!0),p.removeAllRanges(),p.addRange(c))}catch{}n.onPageLoad?.(d,s),o.setNavigating(!1),e.editorDiv.focus()}return{navigateToPage:a,loadPage:l,setRenderAPI:i}}function de(o,t,e,n,r,i,a){function l(s){const c=window.getSelection();if(!c||!c.rangeCount)return;const p=c.getRangeAt(0);p.deleteContents();const u=document.createTextNode(s);p.insertNode(u),p.setStart(u,s.length),p.collapse(!0),c.removeAllRanges(),c.addRange(p),o.editorDiv.dispatchEvent(new Event("input",{bubbles:!0}))}function d(){const s=a.saveDebounceMs??600;o.editorDiv.addEventListener("input",()=>{if(e.isNavigating())return;n.render();for(const E of t)E.onUpdate?.();const u=P(o.editorDiv),h=e.getTrail(),w=h[h.length-1];e.setWorldPage(w,u),e.clearSaveTimer();const f=setTimeout(async()=>{await i.set(w,u),a.onSave?.(w,u)},s);e.setSaveTimer(f)}),o.editorDiv.addEventListener("paste",u=>{u.preventDefault();const h=u.clipboardData?.getData("text/plain")??"";l(h)}),o.editorDiv.addEventListener("keydown",u=>{u.key==="Tab"?(u.preventDefault(),l("  ")):u.key==="Enter"&&(u.preventDefault(),l(`
`))});const c=e.getTrail(),p=c[c.length-1];return r.loadPage(p),{destroy(){e.clearSaveTimer();for(const u of t)try{u.onDestroy?.()}catch(h){console.error(`Plugin "${u.name}" onDestroy failed:`,h)}o.container.innerHTML=""},navigate(u){r.navigateToPage(u)},getCurrentPage(){const u=e.getTrail();return u[u.length-1]},getTrail(){return e.getTrail()},getContent(){return P(o.editorDiv)},setContent(u){const h=e.getTrail(),w=h[h.length-1];e.setWorldPage(w,u),o.editorDiv.textContent=u,n.render()}}}return{mount:d}}class W{constructor(t,e={}){this.registry=new j,this.storage=new T,this.options={},this.el=t,this.options=e,e.storage&&(this.storage=e.storage);for(const n of R)this.registry.register(n)}use(t){return this.registry.register(t),this}clearPlugins(){return this.registry.clear(),this}withStorage(t){return this.storage=t,this}mount(){return pe(this.el,this.registry.allContentPlugins(),this.storage,this.options)}}function ue(o,t={}){return new W(o,t)}function pe(o,t,e,n){const r=K(e,n),i=Y(o,n.theme),a=ce(r,e,i,n),l={navigateFn:s=>{a.navigateToPage(s)},onBreadcrumbNavigate:s=>{a.loadPage(s)},onTrailChange:n.onTrailChange},d=le(i,t,r,l);return a.setRenderAPI(d),de(i,t,r,d,a,e,n).mount()}const ge="worldnotes",m="pages";class he{constructor(t=ge){this.db=null,this.dbName=t}async open(){this.db||(this.db=await new Promise((t,e)=>{const n=indexedDB.open(this.dbName,1);n.onupgradeneeded=()=>{n.result.createObjectStore(m)},n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error)}))}async ensureOpen(){return await this.open(),this.db}async get(t){const e=await this.ensureOpen();return new Promise((n,r)=>{const a=e.transaction(m,"readonly").objectStore(m).get(t);a.onsuccess=()=>n(a.result??null),a.onerror=()=>r(a.error)})}async set(t,e){const n=await this.ensureOpen();return new Promise((r,i)=>{const l=n.transaction(m,"readwrite").objectStore(m).put(e,t);l.onsuccess=()=>r(),l.onerror=()=>i(l.error)})}async keys(){const t=await this.ensureOpen();return new Promise((e,n)=>{const i=t.transaction(m,"readonly").objectStore(m).getAllKeys();i.onsuccess=()=>e(i.result),i.onerror=()=>n(i.error)})}}g.EditorBuilder=W,g.IndexedDBAdapter=he,g.LocalStorageAdapter=T,g.blockquotePlugin=I,g.boldPlugin=S,g.createEditor=ue,g.defaultPlugins=R,g.headingsPlugin=D,g.hrPlugin=z,g.inlineCodePlugin=L,g.italicPlugin=A,g.linkPlugin=M,g.strikethroughPlugin=O,g.wikiLinkPlugin=N,Object.defineProperty(g,Symbol.toStringTag,{value:"Module"})}));

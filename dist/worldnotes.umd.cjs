(function(m,y){typeof exports=="object"&&typeof module<"u"?y(exports):typeof define=="function"&&define.amd?define(["exports"],y):(m=typeof globalThis<"u"?globalThis:m||self,y(m.WorldNotes={}))})(this,(function(m){"use strict";const y="worldnotes";class I{constructor(t=y){this.namespace=t}key(t){return`${this.namespace}::${t}`}async get(t){return localStorage.getItem(this.key(t))}async set(t,e){localStorage.setItem(this.key(t),e)}async keys(){const t=`${this.namespace}::`;return Object.keys(localStorage).filter(e=>e.startsWith(t)).map(e=>e.slice(t.length))}}function N(n){const t=n.trim().replace(/\/+$/,""),e=t.split("/").filter(Boolean);return e[e.length-1]??t}function R(n){const t=n.indexOf("|"),e=(t===-1?n:n.slice(0,t)).trim(),o=t===-1?N(e):n.slice(t+1).trim();return{page:e,display:o||N(e)}}function V(n,t){const o=n.replace(/^\?/,"").split("&").filter(Boolean).filter(a=>{const[l=""]=a.split("=",1);return decodeURIComponent(l.replace(/\+/g," "))!=="path"}),r=t.map(a=>encodeURIComponent(a)).join("/");return`?${[...o,`path=${r}`].join("&")}`}function Q(n){const e=n.replace(/^\?/,"").split("&").filter(Boolean).find(i=>{const[a=""]=i.split("=",1);return decodeURIComponent(a.replace(/\+/g," "))==="path"});if(!e)return[];const o=e.indexOf("="),r=o===-1?"":e.slice(o+1);return r?r.split("/").filter(Boolean).map(i=>decodeURIComponent(i)):[]}const O={name:"wiki-link",tokens:[{type:"wiki-link",pattern:/\[\[([^\]]+)\]\]/}],render(n,t){const{page:e,display:o}=R(n.groups[0]??""),r=document.createElement("span");return r.className="wn-wiki-link",r.dataset.page=e,r.dataset.raw=n.raw,r.textContent=o,r},onNavigate(n,t){const{page:e}=R(n.groups[0]??"");return t.navigate(e),!0}};function k(n,t,e){const o=document.createElement("span");o.className=e;const r=document.createElement("span");r.className="wn-punct",r.textContent=t;const i=document.createElement("span");return i.className=`${e}-text`,i.textContent=n.groups[0]??"",o.appendChild(r),o.appendChild(i),o}const M={name:"headings",tokens:[{type:"h1",pattern:/^# (.*)$/},{type:"h2",pattern:/^## (.*)$/},{type:"h3",pattern:/^### (.*)$/}],render(n,t){switch(n.type){case"h1":return k(n,"# ","wn-h1");case"h2":return k(n,"## ","wn-h2");case"h3":return k(n,"### ","wn-h3");default:return k(n,"","wn-h1")}}};function B(n,t,e){const o=document.createElement("span");o.className=n;const r=i=>{const a=document.createElement("span");return a.className="wn-punct",a.textContent=i,a};return o.appendChild(r(t)),o.appendChild(document.createTextNode(e)),o.appendChild(r(t)),o}const _={name:"bold",tokens:[{type:"bold",pattern:/\*\*([^*]+)\*\*/}],render(n,t){return B("wn-bold","**",n.groups[0]??"")}},H={name:"italic",tokens:[{type:"italic",pattern:/\*([^*]+)\*/}],render(n,t){return B("wn-italic","*",n.groups[0]??"")}},$={name:"inline-code",tokens:[{type:"inline-code",pattern:/`([^`]+)`/}],render(n,t){const e=document.createElement("span");e.className="wn-inline-code";const o=i=>{const a=document.createElement("span");return a.className="wn-punct",a.textContent=i,a};e.appendChild(o("`"));const r=document.createElement("span");return r.className="wn-code-text",r.textContent=n.groups[0]??"",e.appendChild(r),e.appendChild(o("`")),e}},q={name:"blockquote",tokens:[{type:"blockquote",pattern:/^(> )(.*)$/}],render(n,t){const e=document.createElement("span");e.className="wn-blockquote";const o=document.createElement("span");o.className="wn-punct",o.textContent="> ";const r=document.createElement("span");return r.className="wn-blockquote-text",r.textContent=n.groups[1]??"",e.appendChild(o),e.appendChild(r),e}},z={name:"hr",tokens:[{type:"hr",pattern:/^---+$/}],render(n,t){const e=document.createElement("span");return e.className="wn-hr",e.textContent="---",e}},U=[M,z,q,O,_,H,$];function j(n){return{type:"text",raw:n,groups:[n]}}function Y(n,t){const e=t.filter(r=>r.pattern.source.startsWith("^")),o=t.filter(r=>!r.pattern.source.startsWith("^"));for(const r of e){const i=n.match(r.pattern);if(i)return[{type:r.type,raw:i[0],groups:i.slice(1).map(a=>a??"")}]}return J(n,o)}function J(n,t){const e=[];let o=n;for(;o.length>0;){let r=null;for(const i of t){const a=o.match(i.pattern);!a||a.index===void 0||(r===null||a.index<r.index)&&(r={index:a.index,match:a,def:i})}if(!r){e.push(j(o));break}r.index>0&&e.push(j(o.slice(0,r.index))),e.push({type:r.def.type,raw:r.match[0],groups:r.match.slice(1).map(i=>i??"")}),o=o.slice(r.index+r.match[0].length)}return e}function Z(n,t){return n.split(`
`).map(e=>Y(e,t))}function ee(n,t,e,o=-1){const r=document.createDocumentFragment(),i=ne(t);let a=0;for(const l of n){if(l.type==="text"){r.appendChild(document.createTextNode(l.raw)),a+=l.raw.length;continue}const p=a,c=p+l.raw.length;if(a=c,o>=p&&o<=c){r.appendChild(document.createTextNode(l.raw));continue}const u=i.get(l.type);if(!u){r.appendChild(document.createTextNode(l.raw));continue}const g=u.render(l,e);if(g instanceof HTMLElement&&u.onNavigate){const C=u.onNavigate.bind(u);g.addEventListener("mousedown",b=>{C(l,e)&&b.preventDefault()})}r.appendChild(g)}return r}function te(n,t,e,o=-1){let r=0;return n.map(i=>{const a=i.reduce((c,u)=>c+u.raw.length,0),l=o-r,p=ee(i,t,e,l);return r+=a+1,p})}function ne(n){const t=new Map;for(const e of n)for(const o of e.tokens)t.set(o.type,e);return t}function oe(n){const t=window.getSelection();if(!t||!t.rangeCount)return 0;const e=t.getRangeAt(0);return F(n,e.endContainer,e.endOffset).offset}function re(n,t){const e=ce(n,t),o=document.createRange(),r=window.getSelection();r&&(e?(o.setStart(e.node,e.offset),o.collapse(!0)):(o.selectNodeContents(n),o.collapse(!1)),r.removeAllRanges(),r.addRange(o))}const ie=new Set(["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DIV","DL","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","TABLE","UL"]);function ae(n){return n.nodeType===Node.ELEMENT_NODE&&ie.has(n.nodeName)}function v(n){return F(n,null,0).text}function F(n,t,e){let o="",r=0,i=t===null;function a(c){i||(r+=c.length),o+=c}function l(c){if(c.nodeType===Node.TEXT_NODE){const u=c.textContent??"";c===t&&!i?(r+=Math.min(e,u.length),i=!0,o+=u):a(u)}else if(c.dataset?.raw!==void 0){const u=c.dataset.raw??"";c===t&&!i?(r+=e<=0?0:u.length,i=!0):se(c,t)&&!i?(W(c,t,e),r+=Math.min(W(c,t,e),u.length),i=!0):a(u)}else c.nodeName==="BR"?a(`
`):(ae(c)&&o&&!o.endsWith(`
`)&&a(`
`),p(c))}function p(c){c.childNodes.forEach((u,g)=>{c===t&&g===e&&!i&&(i=!0),l(u)}),c===t&&c.childNodes.length===e&&!i&&(i=!0)}return p(n),{text:o,offset:r}}function se(n,t){if(!t)return!1;let e=t;for(;e;){if(e===n)return!0;e=e.parentNode}return!1}function W(n,t,e){let o=0,r=!1;function i(a){if(!r){if(a.nodeType===Node.TEXT_NODE){const l=a.textContent??"";a===t?(o+=Math.min(e,l.length),r=!0):o+=l.length;return}a.childNodes.forEach((l,p)=>{a===t&&p===e&&!r&&(r=!0),r||i(l)}),a===t&&a.childNodes.length===e&&!r&&(r=!0)}}return i(n),o}function ce(n,t){let e=t,o=null;function r(i){if(o)return;if(i.nodeType===Node.TEXT_NODE){const l=i.length;if(e<=l){o={node:i,offset:e};return}e-=l;return}const a=i.dataset?.raw;if(a!==void 0){e-=a.length;return}if(i.nodeName==="BR"){e-=1;return}i.childNodes.forEach(r)}return r(n),o}const K=`# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;class X{constructor(t,e={}){this.plugins=[...U],this.storage=new I,this.options={},this.el=t,this.options=e,e.storage&&(this.storage=e.storage)}use(t){const e=this.plugins.findIndex(o=>o.name===t.name);return e!==-1?this.plugins[e]=t:this.plugins.push(t),this}clearPlugins(){return this.plugins=[],this}withStorage(t){return this.storage=t,this}mount(){return de(this.el,this.plugins,this.storage,this.options)}}function le(n,t={}){return new X(n,t)}function de(n,t,e,o){const r=o.saveDebounceMs??600,i=o.initialPage??"home",a=Q(window.location.search),l=a[a.length-1]??i,p={};let c=a.length?[...a]:[l],u=null,g=!1;ue(),n.innerHTML="",n.className="wn-root";const C=E("div","wn-topbar"),b=E("div","wn-breadcrumb"),T=E("div","wn-editor-wrap"),f=E("div","wn-editor"),P=E("div","wn-placeholder");P.textContent="Start writing… use [[page name]] to link deeper",f.contentEditable="true",f.spellcheck=!1,C.appendChild(b),T.appendChild(P),T.appendChild(f),n.appendChild(C),n.appendChild(T);const me={navigate:s=>G(s),getTrail:()=>[...c],getWorld:()=>({...p})};function S(){const s=oe(f),d=v(f),h=Z(d,t.flatMap(A=>A.tokens)),w=te(h,t,me,s);f.innerHTML="",w.forEach((A,xe)=>{f.appendChild(A),xe<w.length-1&&f.appendChild(document.createTextNode(`
`))}),P.style.display=d.length?"none":"block";try{re(f,s)}catch{}}function we(){b.innerHTML="",c.forEach((s,d)=>{if(d>0){const w=document.createElement("span");w.className="wn-crumb-sep",w.textContent="/",b.appendChild(w)}const h=document.createElement("span");h.className="wn-crumb"+(d===c.length-1?" wn-crumb--active":""),h.textContent=N(s),d<c.length-1&&h.addEventListener("click",()=>{c=c.slice(0,d+1),D(c[c.length-1])}),b.appendChild(h)}),o.onTrailChange?.([...c]),ge()}function ge(){const s=V(window.location.search,c);window.history.replaceState(null,"",`${window.location.pathname}${s}${window.location.hash}`)}async function G(s){if(!p[s]){const d=await e.get(s);p[s]=d??`# ${s}

`,d||await e.set(s,p[s])}c.push(s),await D(s)}async function D(s){if(g=!0,!p[s]){const h=await e.get(s);!h&&s==="home"?(p[s]=K,await e.set(s,K)):p[s]=h??`# ${s}

`}const d=p[s];f.textContent=d,S(),we();try{const h=document.createRange(),w=window.getSelection();w&&(h.setStart(f,0),h.collapse(!0),w.removeAllRanges(),w.addRange(h))}catch{}o.onPageLoad?.(s,d),g=!1,f.focus()}return f.addEventListener("input",()=>{if(g)return;S();const s=v(f),d=c[c.length-1];p[d]=s,u&&clearTimeout(u),u=setTimeout(async()=>{await e.set(d,s),o.onSave?.(d,s)},r)}),f.addEventListener("paste",s=>{s.preventDefault();const d=s.clipboardData?.getData("text/plain")??"";L(d)}),f.addEventListener("keydown",s=>{s.key==="Tab"?(s.preventDefault(),L("  ")):s.key==="Enter"&&(s.preventDefault(),L(`
`))}),D(l),{destroy(){u&&clearTimeout(u),n.innerHTML=""},navigate(s){G(s)},getCurrentPage(){return c[c.length-1]},getTrail(){return[...c]},getContent(){return v(f)},setContent(s){const d=c[c.length-1];p[d]=s,f.textContent=s,S()}};function L(s){const d=window.getSelection();if(!d||!d.rangeCount)return;const h=d.getRangeAt(0);h.deleteContents();const w=document.createTextNode(s);h.insertNode(w),h.setStart(w,s.length),h.collapse(!0),d.removeAllRanges(),d.addRange(h),f.dispatchEvent(new Event("input",{bubbles:!0}))}}function E(n,t){const e=document.createElement(n);return e.className=t,e}function ue(){const n="worldnotes-styles";if(document.getElementById(n))return;const t=document.createElement("style");t.id=n,t.textContent=pe,document.head.appendChild(t)}const pe=`
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
`,fe="worldnotes",x="pages";class he{constructor(t=fe){this.db=null,this.dbName=t}async open(){this.db||(this.db=await new Promise((t,e)=>{const o=indexedDB.open(this.dbName,1);o.onupgradeneeded=()=>{o.result.createObjectStore(x)},o.onsuccess=()=>t(o.result),o.onerror=()=>e(o.error)}))}async ensureOpen(){return await this.open(),this.db}async get(t){const e=await this.ensureOpen();return new Promise((o,r)=>{const a=e.transaction(x,"readonly").objectStore(x).get(t);a.onsuccess=()=>o(a.result??null),a.onerror=()=>r(a.error)})}async set(t,e){const o=await this.ensureOpen();return new Promise((r,i)=>{const l=o.transaction(x,"readwrite").objectStore(x).put(e,t);l.onsuccess=()=>r(),l.onerror=()=>i(l.error)})}async keys(){const t=await this.ensureOpen();return new Promise((e,o)=>{const i=t.transaction(x,"readonly").objectStore(x).getAllKeys();i.onsuccess=()=>e(i.result),i.onerror=()=>o(i.error)})}}m.EditorBuilder=X,m.IndexedDBAdapter=he,m.LocalStorageAdapter=I,m.blockquotePlugin=q,m.boldPlugin=_,m.createEditor=le,m.defaultPlugins=U,m.headingsPlugin=M,m.hrPlugin=z,m.inlineCodePlugin=$,m.italicPlugin=H,m.wikiLinkPlugin=O,Object.defineProperty(m,Symbol.toStringTag,{value:"Module"})}));

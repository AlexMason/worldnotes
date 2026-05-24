(function(m,E){typeof exports=="object"&&typeof module<"u"?E(exports):typeof define=="function"&&define.amd?define(["exports"],E):(m=typeof globalThis<"u"?globalThis:m||self,E(m.WorldNotes={}))})(this,function(m){"use strict";const E="worldnotes";class I{constructor(t=E){this.namespace=t}key(t){return`${this.namespace}::${t}`}async get(t){return localStorage.getItem(this.key(t))}async set(t,e){localStorage.setItem(this.key(t),e)}async keys(){const t=`${this.namespace}::`;return Object.keys(localStorage).filter(e=>e.startsWith(t)).map(e=>e.slice(t.length))}}function v(o){const t=o.trim().replace(/\/+$/,""),e=t.split("/").filter(Boolean);return e[e.length-1]??t}function R(o){const t=o.indexOf("|"),e=(t===-1?o:o.slice(0,t)).trim(),n=t===-1?v(e):o.slice(t+1).trim();return{page:e,display:n||v(e)}}function V(o,t){const n=o.replace(/^\?/,"").split("&").filter(Boolean).filter(a=>{const[l=""]=a.split("=",1);return decodeURIComponent(l.replace(/\+/g," "))!=="path"}),r=t.map(a=>encodeURIComponent(a)).join("/");return`?${[...n,`path=${r}`].join("&")}`}function Q(o){const e=o.replace(/^\?/,"").split("&").filter(Boolean).find(i=>{const[a=""]=i.split("=",1);return decodeURIComponent(a.replace(/\+/g," "))==="path"});if(!e)return[];const n=e.indexOf("="),r=n===-1?"":e.slice(n+1);return r?r.split("/").filter(Boolean).map(i=>decodeURIComponent(i)):[]}const O={name:"wiki-link",tokens:[{type:"wiki-link",pattern:/\[\[([^\]]+)\]\]/}],render(o,t){const{page:e,display:n}=R(o.groups[0]??""),r=document.createElement("span");return r.className="wn-wiki-link",r.dataset.page=e,r.dataset.raw=o.raw,r.textContent=n,r},onNavigate(o,t){const{page:e}=R(o.groups[0]??"");return t.navigate(e),!0}};function C(o,t,e){const n=document.createElement("span");n.className=e;const r=document.createElement("span");r.className="wn-punct",r.textContent=t;const i=document.createElement("span");return i.className=`${e}-text`,i.textContent=o.groups[0]??"",n.appendChild(r),n.appendChild(i),n}const M={name:"headings",tokens:[{type:"h1",pattern:/^# (.*)$/},{type:"h2",pattern:/^## (.*)$/},{type:"h3",pattern:/^### (.*)$/}],render(o,t){switch(o.type){case"h1":return C(o,"# ","wn-h1");case"h2":return C(o,"## ","wn-h2");case"h3":return C(o,"### ","wn-h3");default:return C(o,"","wn-h1")}}};function B(o,t,e){const n=document.createElement("span");n.className=o;const r=i=>{const a=document.createElement("span");return a.className="wn-punct",a.textContent=i,a};return n.appendChild(r(t)),n.appendChild(document.createTextNode(e)),n.appendChild(r(t)),n}const _={name:"bold",tokens:[{type:"bold",pattern:/\*\*([^*]+)\*\*/}],render(o,t){return B("wn-bold","**",o.groups[0]??"")}},H={name:"italic",tokens:[{type:"italic",pattern:/\*([^*]+)\*/}],render(o,t){return B("wn-italic","*",o.groups[0]??"")}},$={name:"inline-code",tokens:[{type:"inline-code",pattern:/`([^`]+)`/}],render(o,t){const e=document.createElement("span");e.className="wn-inline-code";const n=i=>{const a=document.createElement("span");return a.className="wn-punct",a.textContent=i,a};e.appendChild(n("`"));const r=document.createElement("span");return r.className="wn-code-text",r.textContent=o.groups[0]??"",e.appendChild(r),e.appendChild(n("`")),e}},q={name:"blockquote",tokens:[{type:"blockquote",pattern:/^(> )(.*)$/}],render(o,t){const e=document.createElement("span");e.className="wn-blockquote";const n=document.createElement("span");n.className="wn-punct",n.textContent="> ";const r=document.createElement("span");return r.className="wn-blockquote-text",r.textContent=o.groups[1]??"",e.appendChild(n),e.appendChild(r),e}},z={name:"hr",tokens:[{type:"hr",pattern:/^---+$/}],render(o,t){const e=document.createElement("span");return e.className="wn-hr",e.textContent="---",e}},U=[M,z,q,O,_,H,$];function j(o){return{type:"text",raw:o,groups:[o]}}function Y(o,t){const e=t.filter(r=>r.pattern.source.startsWith("^")),n=t.filter(r=>!r.pattern.source.startsWith("^"));for(const r of e){const i=o.match(r.pattern);if(i)return[{type:r.type,raw:i[0],groups:i.slice(1).map(a=>a??"")}]}return J(o,n)}function J(o,t){const e=[];let n=o;for(;n.length>0;){let r=null;for(const i of t){const a=n.match(i.pattern);!a||a.index===void 0||(r===null||a.index<r.index)&&(r={index:a.index,match:a,def:i})}if(!r){e.push(j(n));break}r.index>0&&e.push(j(n.slice(0,r.index))),e.push({type:r.def.type,raw:r.match[0],groups:r.match.slice(1).map(i=>i??"")}),n=n.slice(r.index+r.match[0].length)}return e}function Z(o,t){return o.split(`
`).map(e=>Y(e,t))}function ee(o,t,e,n=-1){const r=document.createDocumentFragment(),i=ne(t);let a=0;for(const l of o){if(l.type==="text"){r.appendChild(document.createTextNode(l.raw)),a+=l.raw.length;continue}const d=a,c=d+l.raw.length;if(a=c,n>=d&&n<=c){r.appendChild(document.createTextNode(l.raw));continue}const h=i.get(l.type);if(!h){r.appendChild(document.createTextNode(l.raw));continue}const w=h.render(l,e);if(w instanceof HTMLElement&&h.onNavigate){const T=h.onNavigate.bind(h);w.addEventListener("mousedown",y=>{T(l,e)&&y.preventDefault()})}r.appendChild(w)}return r}function te(o,t,e,n=-1){let r=0;return o.map(i=>{const a=i.reduce((c,h)=>c+h.raw.length,0),l=n-r,d=ee(i,t,e,l);return r+=a+1,d})}function ne(o){const t=new Map;for(const e of o)for(const n of e.tokens)t.set(n.type,e);return t}function oe(o){const t=window.getSelection();if(!t||!t.rangeCount)return 0;const e=t.getRangeAt(0);return F(o,e.endContainer,e.endOffset).offset}function re(o,t){const e=ce(o,t),n=document.createRange(),r=window.getSelection();r&&(e?(n.setStart(e.node,e.offset),n.collapse(!0)):(n.selectNodeContents(o),n.collapse(!1)),r.removeAllRanges(),r.addRange(n))}const ie=new Set(["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","DIV","DL","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","TABLE","UL"]);function ae(o){return o.nodeType===Node.ELEMENT_NODE&&ie.has(o.nodeName)}function P(o){return F(o,null,0).text}function F(o,t,e){let n="",r=0,i=t===null;function a(c){i||(r+=c.length),n+=c}function l(c){var h;if(c.nodeType===Node.TEXT_NODE){const w=c.textContent??"";c===t&&!i?(r+=Math.min(e,w.length),i=!0,n+=w):a(w)}else if(((h=c.dataset)==null?void 0:h.raw)!==void 0){const w=c.dataset.raw??"";c===t&&!i?(r+=e<=0?0:w.length,i=!0):se(c,t)&&!i?(W(c,t,e),r+=Math.min(W(c,t,e),w.length),i=!0):a(w)}else c.nodeName==="BR"?a(`
`):(ae(c)&&n&&!n.endsWith(`
`)&&a(`
`),d(c))}function d(c){c.childNodes.forEach((h,w)=>{c===t&&w===e&&!i&&(i=!0),l(h)}),c===t&&c.childNodes.length===e&&!i&&(i=!0)}return d(o),{text:n,offset:r}}function se(o,t){if(!t)return!1;let e=t;for(;e;){if(e===o)return!0;e=e.parentNode}return!1}function W(o,t,e){let n=0,r=!1;function i(a){if(!r){if(a.nodeType===Node.TEXT_NODE){const l=a.textContent??"";a===t?(n+=Math.min(e,l.length),r=!0):n+=l.length;return}a.childNodes.forEach((l,d)=>{a===t&&d===e&&!r&&(r=!0),r||i(l)}),a===t&&a.childNodes.length===e&&!r&&(r=!0)}}return i(o),n}function ce(o,t){let e=t,n=null;function r(i){var l;if(n)return;if(i.nodeType===Node.TEXT_NODE){const d=i.length;if(e<=d){n={node:i,offset:e};return}e-=d;return}const a=(l=i.dataset)==null?void 0:l.raw;if(a!==void 0){e-=a.length;return}if(i.nodeName==="BR"){e-=1;return}i.childNodes.forEach(r)}return r(o),n}const K=`# Welcome to your world

Start writing here. Use [[page name]] to link into new pages.

**Bold**, *italic*, and \`inline code\` all render as you type.

---

> Every link opens a door.`;class X{constructor(t,e={}){this.plugins=[...U],this.storage=new I,this.options={},this.el=t,this.options=e,e.storage&&(this.storage=e.storage)}use(t){const e=this.plugins.findIndex(n=>n.name===t.name);return e!==-1?this.plugins[e]=t:this.plugins.push(t),this}clearPlugins(){return this.plugins=[],this}withStorage(t){return this.storage=t,this}mount(){return de(this.el,this.plugins,this.storage,this.options)}}function le(o,t={}){return new X(o,t)}function de(o,t,e,n){const r=n.saveDebounceMs??600,i=n.initialPage??"home",a=Q(window.location.search),l=a[a.length-1]??i,d={};let c=a.length?[...a]:[l],h=null,w=!1;ue(),o.innerHTML="",o.className="wn-root";const T=k("div","wn-topbar"),y=k("div","wn-breadcrumb"),N=k("div","wn-editor-wrap"),f=k("div","wn-editor"),S=k("div","wn-placeholder");S.textContent="Start writing… use [[page name]] to link deeper",f.contentEditable="true",f.spellcheck=!1,T.appendChild(y),N.appendChild(S),N.appendChild(f),o.appendChild(T),o.appendChild(N);const me={navigate:s=>G(s),getTrail:()=>[...c],getWorld:()=>({...d})};function D(){const s=oe(f),u=P(f),p=Z(u,t.flatMap(x=>x.tokens)),g=te(p,t,me,s);f.innerHTML="",g.forEach((x,xe)=>{f.appendChild(x),xe<g.length-1&&f.appendChild(document.createTextNode(`
`))}),S.style.display=u.length?"none":"block";try{re(f,s)}catch{}}function we(){var s;y.innerHTML="",c.forEach((u,p)=>{if(p>0){const x=document.createElement("span");x.className="wn-crumb-sep",x.textContent="/",y.appendChild(x)}const g=document.createElement("span");g.className="wn-crumb"+(p===c.length-1?" wn-crumb--active":""),g.textContent=v(u),p<c.length-1&&g.addEventListener("click",()=>{c=c.slice(0,p+1),L(c[c.length-1])}),y.appendChild(g)}),(s=n.onTrailChange)==null||s.call(n,[...c]),ge()}function ge(){const s=V(window.location.search,c);window.history.replaceState(null,"",`${window.location.pathname}${s}${window.location.hash}`)}async function G(s){if(!d[s]){const u=await e.get(s);d[s]=u??`# ${s}

`,u||await e.set(s,d[s])}c.push(s),await L(s)}async function L(s){var p;if(w=!0,!d[s]){const g=await e.get(s);!g&&s==="home"?(d[s]=K,await e.set(s,K)):d[s]=g??`# ${s}

`}const u=d[s];f.textContent=u,D(),we();try{const g=document.createRange(),x=window.getSelection();x&&(g.setStart(f,0),g.collapse(!0),x.removeAllRanges(),x.addRange(g))}catch{}(p=n.onPageLoad)==null||p.call(n,s,u),w=!1,f.focus()}return f.addEventListener("input",()=>{if(w)return;D();const s=P(f),u=c[c.length-1];d[u]=s,h&&clearTimeout(h),h=setTimeout(async()=>{var p;await e.set(u,s),(p=n.onSave)==null||p.call(n,u,s)},r)}),f.addEventListener("paste",s=>{var p;s.preventDefault();const u=((p=s.clipboardData)==null?void 0:p.getData("text/plain"))??"";A(u)}),f.addEventListener("keydown",s=>{s.key==="Tab"?(s.preventDefault(),A("  ")):s.key==="Enter"&&(s.preventDefault(),A(`
`))}),L(l),{destroy(){h&&clearTimeout(h),o.innerHTML=""},navigate(s){G(s)},getCurrentPage(){return c[c.length-1]},getTrail(){return[...c]},getContent(){return P(f)},setContent(s){const u=c[c.length-1];d[u]=s,f.textContent=s,D()}};function A(s){const u=window.getSelection();if(!u||!u.rangeCount)return;const p=u.getRangeAt(0);p.deleteContents();const g=document.createTextNode(s);p.insertNode(g),p.setStart(g,s.length),p.collapse(!0),u.removeAllRanges(),u.addRange(p),f.dispatchEvent(new Event("input",{bubbles:!0}))}}function k(o,t){const e=document.createElement(o);return e.className=t,e}function ue(){const o="worldnotes-styles";if(document.getElementById(o))return;const t=document.createElement("style");t.id=o,t.textContent=pe,document.head.appendChild(t)}const pe=`
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
`,fe="worldnotes",b="pages";class he{constructor(t=fe){this.db=null,this.dbName=t}async open(){this.db||(this.db=await new Promise((t,e)=>{const n=indexedDB.open(this.dbName,1);n.onupgradeneeded=()=>{n.result.createObjectStore(b)},n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error)}))}async ensureOpen(){return await this.open(),this.db}async get(t){const e=await this.ensureOpen();return new Promise((n,r)=>{const a=e.transaction(b,"readonly").objectStore(b).get(t);a.onsuccess=()=>n(a.result??null),a.onerror=()=>r(a.error)})}async set(t,e){const n=await this.ensureOpen();return new Promise((r,i)=>{const l=n.transaction(b,"readwrite").objectStore(b).put(e,t);l.onsuccess=()=>r(),l.onerror=()=>i(l.error)})}async keys(){const t=await this.ensureOpen();return new Promise((e,n)=>{const i=t.transaction(b,"readonly").objectStore(b).getAllKeys();i.onsuccess=()=>e(i.result),i.onerror=()=>n(i.error)})}}m.EditorBuilder=X,m.IndexedDBAdapter=he,m.LocalStorageAdapter=I,m.blockquotePlugin=q,m.boldPlugin=_,m.createEditor=le,m.defaultPlugins=U,m.headingsPlugin=M,m.hrPlugin=z,m.inlineCodePlugin=$,m.italicPlugin=H,m.wikiLinkPlugin=O,Object.defineProperty(m,Symbol.toStringTag,{value:"Module"})});

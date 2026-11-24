/* =========================================================
   SITE EDITOR — runtime (loads after catalog.js, before app.js)
   Everything the editor changes is stored as one JSON document ("site data").
   This file applies it for every visitor of this browser:
     1. before the shop renders: settings, products added / edited / hidden, brands, theme
     2. after it renders: added sections, text / image changes, hidden elements, page titles
   The editor UI itself (assets/js/editor.js) is only loaded when the editor is opened.
   Prototype storage: localStorage. In production the same JSON would be saved to a server.
   ========================================================= */
(() => {
  const KEY = "mlb_site_v1";
  const empty = () => ({ v: 1, settings: {}, theme: {}, brands: {}, products: [], productEdits: {}, sections: [], pages: [], texts: [], images: [], hidden: [], meta: {}, assistant: {}, discounts: [] });
  let D;
  try { D = Object.assign(empty(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { D = empty(); }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const params = new URLSearchParams(location.search);
  const page = document.body.dataset.page || "home";
  const pageKey = page === "custom" ? "custom:" + (params.get("p") || "") : page;
  const urlKey = location.pathname.split("/").pop() + location.search;
  const PREVIEW = params.has("med-preview");

  /* ---------- 1. catalogue: add, edit, hide ---------- */
  const cat = window.MLB_CATALOG || [];
  const ADMIN = page === "admin"; // the admin lists everything, hidden products included, and applies edits itself
  if (!ADMIN) for (const p of D.products || []) if (p && p.h && p.t && p.p > 0) cat.unshift({ h: p.h, t: p.t, v: p.v || "Malabisy", ty: p.ty || "", d: p.d || "Clothing", g: p.g || "Women", p: +p.p, c: +p.c || 0, s: p.s || [], a: p.a || p.s || [], k: p.k || [], i: (p.i || []).filter(Boolean).length ? p.i.filter(Boolean) : ["assets/logo.png"], n: p.n ? 1 : 0, b: p.b || "", sb: 1, cms: 1 });
  const hiddenBrands = new Set(Object.entries(D.brands || {}).filter(([, b]) => b && b.hidden).map(([n]) => n));
  if (!ADMIN) for (let i = cat.length - 1; i >= 0; i--) {
    const r = cat[i], e = (D.productEdits || {})[r.h];
    if (hiddenBrands.has(r.v) || (e && e.hidden)) { cat.splice(i, 1); continue; }
    if (e) { if (e.t) r.t = e.t; if (e.p > 0) r.p = +e.p; if (e.c !== undefined && e.c !== "") r.c = +e.c || 0; if (e.n !== undefined) r.n = e.n ? 1 : 0; if (e.a) r.a = e.a; if (e.i && e.i.length) r.i = e.i; if (e.b) r.b = e.b; }
  }

  /* ---------- 2. public object read by app.js and the stylist ---------- */
  const pagesNav = (D.pages || []).filter((p) => p.nav).map((p) => ({ label: p.title, href: "page.html?p=" + encodeURIComponent(p.slug), key: "custom:" + p.slug }));
  window.MLB_CMS = { settings: D.settings || {}, brands: D.brands || {}, assistant: D.assistant || {}, discounts: D.discounts || [], extraNav: pagesNav, pages: D.pages || [] };

  /* ---------- 3. theme: applied before first paint ---------- */
  const T = D.theme || {};
  const fonts = [T.fontDisplay, T.fontBody].filter((f) => f && !/^(Inter|Montserrat)$/.test(f));
  if (fonts.length) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?" + fonts.map((f) => "family=" + encodeURIComponent(f) + ":wght@400;500;600;700;800").join("&") + "&display=swap"; document.head.appendChild(l); }
  const themeCSS = () => {
    const t = D.theme || {}, v = [];
    if (t.black) v.push(`--black:${t.black};--ink:${t.black}`);
    if (t.red) v.push(`--red:${t.red}`);
    if (t.bg) v.push(`--grey-50:${t.bg}`);
    if (t.fontDisplay) v.push(`--f-display:"${t.fontDisplay}", Arial, sans-serif`);
    if (t.fontBody) v.push(`--f-ui:"${t.fontBody}", Arial, sans-serif`);
    let css = v.length ? `:root{${v.join(";")}}` : "";
    if (t.fontBody) css += `body{font-family:var(--f-ui)}`;
    if (t.radius) css += `.btn,.hdr__nav>li>a,.tag{border-radius:${{ pill: "999px", rounded: "10px", square: "0" }[t.radius] || "999px"}}`;
    if (t.pageBg) css += `body{background:${t.pageBg}}`;
    if (t.css) css += String(t.css).replace(/<\/?style[^>]*>/gi, "");
    return css;
  };
  const themeEl = document.createElement("style"); themeEl.id = "cms-theme"; themeEl.textContent = themeCSS(); document.head.appendChild(themeEl);
  const hideEl = document.createElement("style"); hideEl.id = "cms-hidden"; document.head.appendChild(hideEl);

  /* ---------- maintenance mode: visitors see a holding page; signed-in team members see the store ---------- */
  const MAINT = (D.settings || {}).maintenance || {};
  const MAINT_ON = !!MAINT.on && page !== "admin" && !PREVIEW;
  if ((MAINT_ON && !staff()) || params.has("maint-preview")) {
    const st = document.createElement("style"); st.textContent = "body > *:not(#cms-maint){display:none !important} body{background:#F2F2F2 !important}"; document.head.appendChild(st);
    document.title = (MAINT.title || "We’ll be back soon") + " | MALABISY";
    const show = () => {
      if (document.getElementById("cms-maint")) return;
      const until = MAINT.until && !isNaN(Date.parse(MAINT.until)) ? new Date(MAINT.until).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
      const el = document.createElement("main"); el.id = "cms-maint"; el.className = "cms-maint";
      el.innerHTML = `<img src="${esc((D.settings || {}).logo || "assets/logo.png")}" alt="MALABISY" class="cms-maint__logo"><h1>${esc(MAINT.title || "We’ll be back soon")}</h1><p>${esc(MAINT.message || "We’re updating the store to make shopping better. Please check back shortly.").replace(/\n/g, "<br>")}</p>${until ? `<p class="cms-maint__until">Expected back: <b>${esc(until)}</b></p>` : ""}`;
      document.body.appendChild(el);
      const t = (MAINT.title || "We’ll be back soon") + " | MALABISY"; document.title = t; addEventListener("load", () => { document.title = t; });
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", show) : show();
  }

  /* ---------- 4. sections ---------- */
  const API = () => window.MLB_API;
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const cleanHTML = (h) => String(h || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");
  const btn = (label, href, cls = "btn--black") => label ? `<a class="btn ${cls}" href="${esc(href || "#")}">${esc(label)}</a>` : "";
  function productsFor(d) {
    const a = API(); if (!a) return [];
    let rows = a.catalog.slice();
    const src = d.source || "new";
    if (src === "new") rows = rows.filter((r) => r.n);
    else if (src === "sale") rows = rows.filter((r) => r.c).sort((x, y) => (1 - x.p / x.c) < (1 - y.p / y.c) ? 1 : -1);
    else if (src === "label") rows = rows.filter((r) => r.v === "Malabisy");
    else if (src === "brand") rows = rows.filter((r) => r.v === d.brand);
    else if (src === "dept") rows = rows.filter((r) => r.d === d.dept);
    else if (src === "search") { const w = String(d.query || "").toLowerCase().split(/\s+/).filter(Boolean); rows = rows.filter((r) => w.every((x) => (r.t + " " + r.v + " " + r.ty).toLowerCase().includes(x))); }
    else if (src === "handles") { const hs = String(d.handles || "").split(/[\s,]+/).filter(Boolean); rows = hs.map((h) => a.byHandle(h)).filter(Boolean); }
    if (d.max) rows = rows.filter((r) => r.p <= +d.max);
    if (d.sort === "low") rows.sort((x, y) => x.p - y.p); else if (d.sort === "high") rows.sort((x, y) => y.p - x.p);
    return rows.filter((r) => !r.s.length || r.a.length).slice(0, +d.limit || 8);
  }
  const R = {
    hero: (d) => `<section class="cms-hero cms-hero--${d.layout || "overlay"} cms-tone--${d.tone || "dark"}">${d.image ? `<div class="cms-hero__media"><img src="${esc(d.image)}" alt="${esc(d.alt || d.title || "")}"></div>` : ""}<div class="cms-hero__copy wrap">${d.kicker ? `<p class="kicker">${esc(d.kicker)}</p>` : ""}${d.title ? `<h2 class="cms-hero__t">${esc(d.title)}</h2>` : ""}${d.text ? `<p class="cms-hero__p">${md(d.text)}</p>` : ""}<div class="cms-row">${btn(d.button, d.link, (d.tone || "dark") === "dark" && (d.layout || "overlay") !== "split" ? "btn--white" : "btn--black")}${btn(d.button2, d.link2, "btn--outline")}</div></div></section>`,
    text: (d) => `<section class="cms-sec"><div class="wrap cms-text cms-al--${d.align || "left"}">${d.kicker ? `<p class="kicker">${esc(d.kicker)}</p>` : ""}${d.title ? `<h2 class="h1">${esc(d.title)}</h2>` : ""}${d.text ? `<p class="lede">${md(d.text)}</p>` : ""}${d.button ? `<div class="cms-row">${btn(d.button, d.link)}</div>` : ""}</div></section>`,
    imagetext: (d) => `<section class="cms-sec"><div class="wrap cms-it ${d.side === "right" ? "cms-it--r" : ""}"><div class="cms-it__img">${d.image ? `<img src="${esc(d.image)}" alt="${esc(d.title || "")}" loading="lazy">` : ""}</div><div>${d.kicker ? `<p class="kicker">${esc(d.kicker)}</p>` : ""}${d.title ? `<h2 class="h1">${esc(d.title)}</h2>` : ""}${d.text ? `<p class="lede">${md(d.text)}</p>` : ""}<div class="cms-row">${btn(d.button, d.link)}</div></div></div></section>`,
    products: (d) => { const a = API(), rows = productsFor(d); return `<section class="cms-sec"><div class="wrap">${d.title || d.link ? `<div class="sec__head"><div>${d.kicker ? `<p class="kicker">${esc(d.kicker)}</p>` : ""}${d.title ? `<h2 class="h1">${esc(d.title)}</h2>` : ""}</div>${d.link ? `<a class="link" href="${esc(d.link)}">${esc(d.linkLabel || "View all")}</a>` : ""}</div>` : ""}${rows.length && a ? `<div class="grid cms-grid--${d.cols || 4}">${rows.map((r) => a.card(r)).join("")}</div>` : `<p class="muted">No products match this section yet.</p>`}</div></section>`; },
    brands: (d) => { const a = API(); if (!a) return ""; const list = (d.list ? String(d.list).split(",").map((x) => x.trim()).filter(Boolean) : a.brands().filter((b) => b.name !== "Malabisy").slice(0, +d.limit || 12).map((b) => b.name)); return `<section class="cms-sec"><div class="wrap">${d.title ? `<h2 class="h1" style="margin-bottom:24px">${esc(d.title)}</h2>` : ""}<div class="cms-brands">${list.map((n) => `<a href="${a.brandHref(n)}" class="cms-brand">${a.logoTile(n)}<span>${esc(n)}</span></a>`).join("")}</div></div></section>`; },
    promo: (d) => `<a class="cms-promo cms-promo--${d.tone || "black"}" href="${esc(d.link || "#")}"><span>${esc(d.text || "")}</span>${d.button ? `<b>${esc(d.button)} →</b>` : ""}</a>`,
    countdown: (d) => `<section class="cms-sec"><div class="wrap cms-cd cms-tone--${d.tone || "dark"}"><div>${d.kicker ? `<p class="kicker">${esc(d.kicker)}</p>` : ""}<h2 class="h1">${esc(d.title || "")}</h2>${d.text ? `<p class="lede">${md(d.text)}</p>` : ""}</div><div class="cms-cd__t" data-cd="${esc(d.end || "")}"></div>${btn(d.button, d.link, (d.tone || "dark") === "dark" ? "btn--white" : "btn--black")}</div></section>`,
    faq: (d) => `<section class="cms-sec"><div class="wrap cms-faq">${d.title ? `<h2 class="h1">${esc(d.title)}</h2>` : ""}<div>${String(d.items || "").split("\n").filter((l) => l.includes("|")).map((l) => { const [q, ...a] = l.split("|"); return `<details><summary>${esc(q.trim())}</summary><p>${md(a.join("|").trim())}</p></details>`; }).join("")}</div></div></section>`,
    gallery: (d) => `<section class="cms-sec"><div class="wrap">${d.title ? `<h2 class="h1" style="margin-bottom:24px">${esc(d.title)}</h2>` : ""}<div class="cms-gal cms-grid--${d.cols || 3}">${(d.images || []).filter(Boolean).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div></div></section>`,
    video: (d) => { const u = String(d.url || ""); const yt = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); return `<section class="cms-sec"><div class="wrap">${d.title ? `<h2 class="h1" style="margin-bottom:24px">${esc(d.title)}</h2>` : ""}<div class="cms-video">${yt ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="${esc(d.title || "Video")}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>` : u ? `<video src="${esc(u)}" controls playsinline></video>` : ""}</div></div></section>`; },
    html: (d) => `<section class="cms-sec"><div class="wrap">${cleanHTML(d.html)}</div></section>`,
    spacer: (d) => `<div class="cms-spacer" style="height:${Math.max(0, +d.height || 40)}px">${d.line ? '<hr class="wrap">' : ""}</div>`,
  };
  window.MLB_CMS.renderers = R;
  const visible = (s) => !s.off && (s.page === pageKey || s.page === "*") && (s.scope !== "url" || s.url === urlKey);
  function renderSections() {
    const app = document.getElementById("app"); if (!app) return;
    let top = document.getElementById("cms-top"), bot = document.getElementById("cms-bottom");
    if (!top) { top = document.createElement("div"); top.id = "cms-top"; app.before(top); }
    if (!bot) { bot = document.createElement("div"); bot.id = "cms-bottom"; app.after(bot); }
    const html = (pos) => (D.sections || []).filter((s) => visible(s) && (s.pos || "bottom") === pos).map((s) => { try { return `<div class="cms-s" data-sid="${esc(s.id)}">${(R[s.type] || (() => ""))(s.data || {})}</div>`; } catch (e) { console.error("[site editor] section", s.type, e); return ""; } }).join("");
    top.innerHTML = html("top"); bot.innerHTML = html("bottom");
    if (page === "custom" && !top.innerHTML && !bot.innerHTML) top.innerHTML = `<section class="cms-sec"><div class="wrap cms-text"><h1 class="h1">${esc(currentPage() ? currentPage().title : "Page not found")}</h1><p class="lede">${currentPage() ? "This page has no sections yet. Open the editor and add one." : "This page does not exist."}</p></div></section>`;
    tickCountdowns();
  }
  const currentPage = () => (D.pages || []).find((p) => "custom:" + p.slug === pageKey);
  function tickCountdowns() {
    document.querySelectorAll("[data-cd]").forEach((el) => {
      const end = Date.parse(el.dataset.cd); if (isNaN(end)) { el.textContent = ""; return; }
      const left = Math.max(0, end - Date.now()), d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
      el.innerHTML = [[d, "Days"], [h, "Hours"], [m, "Min"], [s, "Sec"]].map(([n, l]) => `<span><b>${String(n).padStart(2, "0")}</b><small>${l}</small></span>`).join("");
    });
  }
  setInterval(tickCountdowns, 1000);

  /* ---------- 5. text, image and hide overrides (re-applied whenever the shop re-renders) ---------- */
  const inScope = (x) => x.scope === "global" || x.page === pageKey;
  const norm = (t) => String(t).replace(/\s+/g, " ").trim();
  function applyOverrides() {
    const texts = new Map((D.texts || []).filter(inScope).map((x) => [norm(x.from), x.to]));
    if (texts.size) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => n.closest("#med-root, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      for (let el = w.nextNode(); el; el = w.nextNode()) {
        if (el.dataset.cmsT) continue;
        if ([...el.children].some((c) => !/^(B|STRONG|I|EM|SPAN|BR|SMALL|S|U)$/.test(c.tagName))) continue;
        const key = norm(el.textContent); if (!key || !texts.has(key)) continue;
        el.dataset.cmsT = "1"; el.textContent = texts.get(key);
      }
    }
    const imgs = new Map((D.images || []).filter(inScope).map((x) => [x.from, x.to]));
    if (imgs.size) document.querySelectorAll("img").forEach((im) => { if (im.closest("#med-root")) return; const s = im.getAttribute("src"); if (imgs.has(s)) { im.dataset.cmsFrom = s; im.removeAttribute("srcset"); im.src = imgs.get(s); } });
    const S = D.settings || {};
    if (S.logo) document.querySelectorAll('img[src="assets/logo.png"]').forEach((im) => { im.dataset.cmsFrom = "assets/logo.png"; im.src = S.logo; });
    if (S.logoWhite) document.querySelectorAll('img[src="assets/logo-white.png"]').forEach((im) => { im.dataset.cmsFrom = "assets/logo-white.png"; im.src = S.logoWhite; });
    hideEl.textContent = (D.hidden || []).filter(inScope).map((x) => `${x.path}{display:none!important}`).join("\n");
  }
  function applyMeta() {
    const m = (D.meta || {})[pageKey] || (currentPage() ? { title: currentPage().title, desc: currentPage().desc } : null);
    if (!m) return;
    if (m.title) document.title = m.title;
    if (m.desc) { let t = document.querySelector('meta[name="description"]'); if (!t) { t = document.createElement("meta"); t.name = "description"; document.head.appendChild(t); } t.content = m.desc; }
  }
  // brand page: the "about" text the editor stores for a brand
  function brandAbout() {
    if (page !== "brand") return;
    const a = API(); if (!a) return;
    const b = a.brands().find((x) => x.slug === params.get("b")); const info = b && (D.brands || {})[b.name];
    if (!info || !info.about || document.getElementById("cms-about")) return;
    const head = document.querySelector("#app .pghead, #app .bhero, #app h1"); if (!head) return;
    head.insertAdjacentHTML("afterend", `<div id="cms-about" class="wrap cms-about"><p>${md(info.about)}</p></div>`);
  }

  let raf = 0;
  const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; applyOverrides(); brandAbout(); }); };
  function boot() {
    renderSections(); applyOverrides(); applyMeta(); brandAbout();
    new MutationObserver((ms) => { if (ms.some((m) => !(m.target.closest && m.target.closest("#med-root")))) queue(); }).observe(document.body, { childList: true, subtree: true });
    if (!PREVIEW && !ADMIN) editorButton();
    if (MAINT_ON && staff()) { const b = document.createElement("div"); b.className = "cms-maintbar"; b.innerHTML = `<b>Maintenance mode is on.</b> Visitors see the maintenance page; only signed-in team members can see the store. <a href="admin.html#settings">Turn it off in Settings</a>`; document.body.prepend(b); }
  }

  /* ---------- 6. the editor button ---------- */
  function loadEditor(cb) {
    if (window.MLB_EDITOR) return cb && cb();
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "assets/css/editor.css"; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = "assets/js/editor.js"; s.onload = () => cb && cb(); document.body.appendChild(s);
  }
  // visitors never see editing tools: only a signed-in team member (dashboard session) does,
  // and only one whose role allows editing content can open the visual editor
  function staff() {
    try {
      const s = JSON.parse(localStorage.getItem("mlb_admin_sess") || "null"); if (!s || s.exp < Date.now()) return null;
      const u = (JSON.parse(localStorage.getItem("mlb_admin_users") || "[]") || []).find((x) => x.id === s.uid && x.active); if (!u) return null;
      return { name: u.name, content: u.role === "super" || (u.perms && u.perms.content === "edit") };
    } catch { return null; }
  }
  function editorButton() {
    const me = staff();
    if (!me) { sessionStorage.removeItem("med_open"); return; }
    const b = document.createElement("div");
    b.className = "cms-editbtn"; b.id = "cms-editbtn"; b.setAttribute("role", "group"); b.setAttribute("aria-label", "Team tools (only you can see this)");
    b.innerHTML = '<a href="admin.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/></svg><span>Dashboard</span></a>' + (me.content ? '<button type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg><span>Edit this page</span></button>' : "");
    const eb = b.querySelector("button"); if (eb) eb.onclick = () => loadEditor(() => window.MLB_EDITOR.open());
    document.body.appendChild(b);
    if (!me.content) { sessionStorage.removeItem("med_open"); return; }
    addEventListener("keydown", (e) => { if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) { e.preventDefault(); loadEditor(() => window.MLB_EDITOR.open()); } });
    if (sessionStorage.getItem("med_open") || params.has("edit")) loadEditor(() => window.MLB_EDITOR.open(true));
  }

  /* ---------- 7. API for the editor ---------- */
  window.MLB_CMS.store = {
    KEY, get: () => D, empty,
    save(next, { reload = false } = {}) {
      D = next;
      try { localStorage.setItem(KEY, JSON.stringify(D)); }
      catch (e) { alert("The browser’s storage is full. Use image links instead of uploads, or remove some uploaded images."); return false; }
      window.MLB_CMS.settings = D.settings; window.MLB_CMS.assistant = D.assistant; window.MLB_CMS.brands = D.brands;
      if (reload) { sessionStorage.setItem("med_scroll", String(scrollY)); location.reload(); return true; }
      themeEl.textContent = themeCSS();
      document.querySelectorAll("[data-cms-t]").forEach((el) => delete el.dataset.cmsT);
      renderSections(); applyOverrides(); applyMeta();
      return true;
    },
  };
  window.MLB_CMS.ctx = { page, pageKey, urlKey, slug, esc };

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
  const sy = sessionStorage.getItem("med_scroll"); if (sy) { sessionStorage.removeItem("med_scroll"); addEventListener("load", () => scrollTo(0, +sy)); }
})();

/* =========================================================
   MALABISY — redesign prototype (English)
   Real catalogue from malabisy.com (assets/js/catalog.js)
   ========================================================= */
(() => {
const ALL = window.MLB_CATALOG.filter((r) => r.p > 0 && (!r.c || r.p / r.c > 0.1) && r.g !== "Men");
const BASE = window.MLB_IMG;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));
const money = (n) => `LE ${fmt(n)}`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const img = (p, w = 600) => (/^(https?:|data:|blob:|\/|assets\/)/.test(p) ? p : (p.startsWith("P/") ? BASE + "products/" + p.slice(2) : BASE + "files/" + p) + "?width=" + w); // full URLs (editor uploads) are used as-is
const srcset = (p) => `${img(p, 400)} 400w, ${img(p, 700)} 700w, ${img(p, 1000)} 1000w`;
const off = (r) => (r.c ? Math.round((1 - r.p / r.c) * 100) : 0);
const isOwn = (r) => r.v === "Malabisy";
const byH = new Map(ALL.map((r) => [r.h, r]));
const OWN = ALL.filter(isOwn), MKT = ALL.filter((r) => !isOwn(r));
const CAMPAIGN = "https://malabisy.com/cdn/shop/files/Malabisy_Winter_27_Campaign.png?width=2200";
const CAMPAIGN_CROP = "https://malabisy.com/cdn/shop/files/Malabisy_Winter_27_Campaign.png?width=1000&height=940&crop=left"; // people only, no baked-in text
/* site settings from the editor (assets/js/cms.js); every value falls back to the original design */
const CMS = window.MLB_CMS || {};
const S = CMS.settings || {};
const num = (v, d) => (v === "" || v === undefined || v === null || isNaN(+v) ? d : +v);
const FREE = num(S.freeOver, 3500), DELIVERY = num(S.deliveryFee, 70);
const DAYS = S.deliveryDays || "2–5", EXCH = num(S.exchangeDays, 14);
const PAYMENTS = (S.payments || [["Cash on delivery", "Pay in cash or by card when your order arrives"], ["Credit / debit card", "Visa, Mastercard, Meeza — secure payment page"], ["Vodafone Cash", "A payment request is sent to your phone"], ["InstaPay", "Transfer to Malabisy"], ["valU", "Split your payment into instalments"]].map(([name, note]) => ({ name, note, on: true }))).filter((p) => p.on !== false);
const NAV_DEFAULT = [{ label: "New in", href: "marketplace.html?new=1", key: "new" }, { label: "Women", href: "marketplace.html?g=Women", key: "Women", mega: "Women" }, { label: "Kids", href: "marketplace.html?g=Kids", key: "Kids", mega: "Kids" }, { label: "Malabisy Label", href: "malabisy.html", key: "label" }, { label: "Brands", href: "brands.html", key: "brands", mega: "brands" }, { label: "Sale", href: "marketplace.html?sale=1", red: true }];
const NAV = (S.nav && S.nav.length ? S.nav : NAV_DEFAULT).concat(CMS.extraNav || []).filter((n) => n.on !== false);

/* brands */
const BRANDS = (() => {
  const m = new Map();
  ALL.forEach((r) => { if (!m.has(r.v)) m.set(r.v, { name: r.v, slug: slug(r.v), items: [] }); m.get(r.v).items.push(r); });
  return [...m.values()].sort((a, b) => b.items.length - a.items.length);
})();
const brandBySlug = (s) => BRANDS.find((b) => b.slug === s);
const MKT_BRANDS = BRANDS.filter((b) => b.name !== "Malabisy");

/* ---------- icons ---------- */
const I = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.3 4.5 7.4 4.5c2 0 3.5 1.1 4.6 2.7 1.1-1.6 2.6-2.7 4.6-2.7 3.1 0 5.4 2.9 4.4 6.2C19.5 15.4 12 20 12 20Z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  l: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m15 5-7 7 7 7"/></svg>',
  r: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m9 5 7 7-7 7"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 6h12v10H2zM14 10h4l3 3.5V16h-7z"/><circle cx="6" cy="17.5" r="1.8" fill="#fff"/><circle cx="17" cy="17.5" r="1.8" fill="#fff"/></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2.5" y="6" width="19" height="12"/><circle cx="12" cy="12" r="3"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 8h15l-4-4M20 16H5l4 4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  check: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
};

/* =========================================================
   STATE: bag + wishlist
   ========================================================= */
const store = {
  get bag() { return (JSON.parse(localStorage.getItem("mlb2_bag") || "[]")).filter((x) => byH.has(x.h)); },
  set bag(v) { localStorage.setItem("mlb2_bag", JSON.stringify(v)); renderCounts(); document.dispatchEvent(new Event("bagchange")); },
  get wish() { return new Set(JSON.parse(localStorage.getItem("mlb2_wish") || "[]")); },
  set wish(v) { localStorage.setItem("mlb2_wish", JSON.stringify([...v])); renderCounts(); },
};
const bagAdd = (h, size) => { const b = store.bag; const f = b.find((x) => x.h === h && x.size === size); f ? f.qty++ : b.push({ h, size, qty: 1 }); store.bag = b; };
const bagSub = () => store.bag.reduce((a, x) => a + byH.get(x.h).p * x.qty, 0);
const bagCount = () => store.bag.reduce((a, x) => a + x.qty, 0);
/* discount codes created in the admin (percent off, fixed amount off, or free delivery; optional minimum order) */
const DISCOUNTS = (CMS.discounts || []).filter((d) => d && d.code && d.on !== false);
const codeNow = () => { const c = String(sessionStorage.getItem("mlb_code") || "").trim().toUpperCase(); return c ? DISCOUNTS.find((d) => d.code.trim().toUpperCase() === c) || null : null; };
const codeOk = (d, s) => d && s >= (+d.min || 0) && (!d.ends || Date.parse(d.ends) > Date.now());
const discount = () => { const s = bagSub(), d = codeNow(); if (!codeOk(d, s)) return 0; return d.type === "percent" ? Math.round((s * Math.min(100, +d.value || 0)) / 100) : d.type === "fixed" ? Math.min(s, +d.value || 0) : 0; };
const delivery = () => { const s = bagSub(), d = codeNow(); return !s || s >= FREE || (d && d.type === "ship" && codeOk(d, s)) ? 0 : DELIVERY; };
const grand = () => Math.max(0, bagSub() - discount() + delivery());
function renderCounts() {
  const c = bagCount(), w = store.wish.size;
  $$("[data-count=bag]").forEach((e) => { e.textContent = c; e.classList.toggle("has", c > 0); });
  $$("[data-count=wish]").forEach((e) => { e.textContent = w; e.classList.toggle("has", w > 0); });
}

/* =========================================================
   COMPONENTS
   ========================================================= */
const brandHref = (v) => (v === "Malabisy" ? "malabisy.html" : `brand.html?b=${slug(v)}`);
const priceHTML = (r) => `<div class="price ${r.c ? "sale" : ""}"><b>${money(r.p)}</b>${r.c ? `<s>${money(r.c)}</s><em>−${off(r)}%</em>` : ""}</div>`;
function card(r, { lazy = true } = {}) {
  const alt = r.i[1];
  const sizes = r.s.length ? r.s : [];
  const wished = store.wish.has(r.h);
  return `<article class="card"><div class="card__mwrap">
    <a class="card__media" href="product.html?h=${encodeURIComponent(r.h)}" aria-label="${esc(r.t)}">
      <img class="main ${alt ? "has-alt" : ""}" src="${img(r.i[0], 600)}" srcset="${srcset(r.i[0])}" sizes="(max-width:960px) 50vw, 25vw" alt="${esc(r.t)}" ${lazy ? 'loading="lazy"' : ""}>
      ${alt ? `<img class="alt" src="${img(alt, 600)}" alt="" loading="lazy">` : ""}
      <span class="card__tags">${isOwn(r) ? '<span class="tag tag--black">Malabisy Label</span>' : r.n ? '<span class="tag tag--black">New</span>' : ""}${r.c ? `<span class="tag tag--red">−${off(r)}%</span>` : ""}</span>
    </a>
    <button class="ibtn card__wish ${wished ? "wish-on" : ""}" data-wish="${esc(r.h)}" aria-label="Save to wishlist" aria-pressed="${wished}">${I.heart}</button>
    <div class="card__quick glass">${sizes.length ? `<p>Quick add</p><div class="card__sizes">${sizes.slice(0, 8).map((s) => `<button type="button" data-qa="${esc(r.h)}" data-size="${esc(s)}" ${r.a.includes(s) ? "" : "disabled"}>${esc(s)}</button>`).join("")}</div>` : `<button class="btn btn--black btn--sm btn--block" data-qa="${esc(r.h)}" data-size="One size">Add to bag</button>`}</div></div>
    <div class="card__body">
      <a class="card__brand" href="${brandHref(r.v)}">${esc(r.v)}</a>
      <a class="card__title" href="product.html?h=${encodeURIComponent(r.h)}">${esc(r.t)}</a>
      ${priceHTML(r)}
    </div>
  </article>`;
}
function carousel(items, id) {
  return `<div class="carousel"><button type="button" class="carousel__arrow carousel__arrow--prev glass" data-d="-1" aria-label="Previous products" disabled>${I.l}</button><div class="carousel__track" id="${id}">${items.map((r) => card(r)).join("")}</div><button type="button" class="carousel__arrow carousel__arrow--next glass" data-d="1" aria-label="Next products">${I.r}</button><div class="carousel__bar"><i id="${id}-bar"></i></div></div>`;
}
const carouselNav = () => "";
function initCarousels() {
  $$(".carousel").forEach((c) => {
    const tr = $(".carousel__track", c), bar = $(".carousel__bar i", c), prev = $(".carousel__arrow--prev", c), next = $(".carousel__arrow--next", c);
    [prev, next].forEach((b) => (b.onclick = () => tr.scrollBy({ left: +b.dataset.d * tr.clientWidth * 0.9 })));
    const upd = () => {
      const max = tr.scrollWidth - tr.clientWidth;
      bar.style.width = (tr.clientWidth / tr.scrollWidth) * 100 + "%"; bar.style.transform = `translateX(${(tr.scrollLeft / tr.clientWidth) * 100}%)`;
      prev.disabled = tr.scrollLeft < 4; next.disabled = tr.scrollLeft > max - 4;
    };
    tr.addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
  });
}

/* =========================================================
   CHROME
   ========================================================= */
function topTypes(items, n = 9) {
  const m = {}; items.forEach((r) => { if (r.ty) m[r.ty] = (m[r.ty] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t);
}
function mega(g) {
  const items = ALL.filter((r) => r.g === g);
  const col = (title, d) => { const sub = items.filter((r) => r.d === d); if (!sub.length) return ""; return `<div><h4>${title}</h4><ul><li><a href="marketplace.html?g=${g}&d=${d}">All ${title.toLowerCase()}</a></li>${topTypes(sub, 8).map((t) => `<li><a href="marketplace.html?g=${g}&d=${d}&ty=${encodeURIComponent(t)}">${esc(t)}</a></li>`).join("")}</ul></div>`; };
  const brands = Object.entries(items.reduce((m, r) => ((m[r.v] = (m[r.v] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 9);
  const feat = g === "Women" ? OWN[0] : items.find((r) => r.i.length > 1) || items[0];
  return `<div class="mega glass"><div class="wrap">
    ${col("Clothing", "Clothing")}${col("Footwear", "Footwear")}
    <div><h4>Bags &amp; more</h4><ul>${["Bags", "Accessories", "Homewear", "Socks"].filter((d) => items.some((r) => r.d === d)).map((d) => `<li><a href="marketplace.html?g=${g}&d=${d}">${d}</a></li>`).join("")}<li><a href="marketplace.html?g=${g}&sale=1" style="color:var(--red)">Sale</a></li></ul></div>
    <div><h4>Brands</h4><div class="bfind" data-bfind><input type="search" placeholder="Find a brand" aria-label="Find a brand" autocomplete="off"><div class="bfind__res"></div></div><p class="muted" style="font-size:12.5px;margin:12px 0 0">${brands.length < 9 ? brands.length : Object.keys(items.reduce((m, r) => ((m[r.v] = 1), m), {})).length} brands in ${g.toLowerCase()}</p><a class="link" href="brands.html" style="display:inline-block;margin-top:10px;font-size:13px">Brands A–Z</a></div>
    ${feat ? `<a class="mega__feat" href="${g === "Women" ? "malabisy.html" : `marketplace.html?g=${g}`}"><img src="${img(feat.i[0], 700)}" alt="" loading="lazy"><span>${g === "Women" ? "Malabisy Label — Winter ’27" : `Shop ${g}`}</span></a>` : "<div></div>"}
  </div></div>`;
}
/* neutral brand directory menu: alphabetical, no brand ranked above another */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const firstLetter = (n) => { const c = n[0].toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; };
const ALPHA = () => [...BRANDS].sort((a, b) => a.name.localeCompare(b.name));
function brandsMega() {
  const has = new Set(BRANDS.map((b) => firstLetter(b.name)));
  return `<div class="mega glass"><div class="wrap mega--brands">
    <div><h4>Find a brand</h4><div class="bfind" data-bfind><input type="search" placeholder="Type a brand name" aria-label="Find a brand" autocomplete="off"><div class="bfind__res"></div></div>
      <p class="muted" style="font-size:12.5px;margin:14px 0 0">${BRANDS.length} brands, listed alphabetically.</p>
      <a class="arrow-link" href="brands.html" style="margin-top:18px">Brands A–Z ${I.arrow}</a></div>
    <div><h4>Browse by letter</h4><div class="azgrid">${LETTERS.map((l) => has.has(l) ? `<a href="brands.html#L-${l}">${l}</a>` : `<span>${l}</span>`).join("")}</div></div>
    <div><h4>Malabisy Label</h4><ul><li><a href="malabisy.html">Shop the label</a></li><li><a href="malabisy.html">Winter ’27</a></li></ul><h4 style="margin-top:26px">For brands</h4><ul><li><a href="sell.html">Sell on Malabisy</a></li></ul></div>
  </div></div>`;
}
function initBrandFinders() {
  $$("[data-bfind]").forEach((box) => {
    const inp = $("input", box), res = $(".bfind__res", box);
    const run = () => {
      const v = inp.value.trim().toLowerCase();
      if (!v) { res.innerHTML = ""; res.classList.remove("on"); return; }
      const m = ALPHA().filter((b) => b.name.toLowerCase().includes(v)).slice(0, 8);
      res.innerHTML = m.length ? m.map((b) => `<a href="${brandHref(b.name)}">${esc(b.name)}<span>${fmt(b.items.length)}</span></a>`).join("") : `<p class="muted" style="margin:10px 12px;font-size:13px">No brand matches “${esc(v)}”.</p>`;
      res.classList.add("on");
    };
    inp.oninput = run;
    inp.onkeydown = (e) => { if (e.key === "Enter") { const a = $("a", res); if (a) location.href = a.href; } };
  });
}
const FOOTER_DEFAULT = () => [
  { title: "Shop", links: [{ label: "Malabisy Label", href: "malabisy.html" }, { label: "Marketplace", href: "marketplace.html" }, { label: "New in", href: "marketplace.html?new=1" }, { label: "Sale", href: "marketplace.html?sale=1" }] },
  { title: "Departments", links: [{ label: "Women", href: "marketplace.html?g=Women" }, { label: "Kids", href: "marketplace.html?g=Kids" }, { label: "Footwear", href: "marketplace.html?d=Footwear" }, { label: "Bags", href: "marketplace.html?d=Bags" }] },
  { title: "Brands", auto: "brands" },
  { title: "Customer care", links: [{ label: "Track your order", href: "account.html#orders" }, { label: "Delivery", href: "#" }, { label: "Returns & exchanges", href: "#" }, { label: "Size guide", href: "#", sizeguide: true }, { label: "Sell on Malabisy", href: "sell.html" }] },
];
function chrome(active) {
  const header = `
  <div class="announce" aria-live="polite">
    ${(S.announce && S.announce.length ? S.announce : [`Free delivery on orders over ${money(FREE)}`, "Cash on delivery available across Egypt", `${MKT_BRANDS.length} brands · ${fmt(ALL.length)} pieces · one checkout`]).map((t, i) => `<div class="announce__item ${i ? "" : "on"}">${esc(t)}</div>`).join("")}
  </div>
  <header class="hdr glass" id="hdr"><div class="wrap hdr__row">
    <a class="logo" href="index.html" aria-label="Malabisy home"><img src="assets/logo.png" alt="MALABISY" width="200" height="27"></a>
    <ul class="hdr__nav">
      ${NAV.map((n) => `<li><a href="${esc(n.href)}" class="${n.red ? "sale" : ""} ${n.key && active === n.key ? "on" : ""}">${esc(n.label)}</a>${n.mega === "brands" ? brandsMega() : n.mega ? mega(n.mega) : ""}</li>`).join("")}
    </ul>
    <div class="hdr__act">
      <button class="sbox glass" id="searchBtn" aria-label="Search">${I.search}<span>Search</span><kbd>/</kbd></button>
      <a class="ibtn" href="account.html" aria-label="My account">${I.user}</a>
      <button class="ibtn" id="wishBtn" aria-label="Wishlist">${I.heart}<span class="count" data-count="wish">0</span></button>
      <button class="ibtn" id="bagBtn" aria-label="Shopping bag">${I.bag}<span class="count" data-count="bag">0</span></button>
      <button class="ibtn burger" id="burger" aria-label="Menu">${I.menu}</button>
    </div>
  </div></header>`;
  const footer = `
  <section class="news"><div class="wrap">
    <div><p class="kicker">Newsletter</p><h2 class="h1">${esc(S.newsTitle || "First to know.")}</h2><p class="lede" style="margin-top:14px">${esc(S.newsText || "New drops from the Malabisy Label and the marketplace, straight to your inbox.")}</p></div>
    <form id="newsForm"><input type="email" required placeholder="Email address" aria-label="Email address"><button>Subscribe</button></form>
  </div></section>
  <footer class="ftr"><div class="wrap">
    <div class="ftr__grid">
      <div><img class="ftr__logo" src="assets/logo-white.png" alt="MALABISY"><p style="color:rgba(255,255,255,.6);max-width:34ch;margin-top:20px;font-size:13.5px">${esc(S.footerText || `The Malabisy Label and ${MKT_BRANDS.length} brands, curated in one place, delivered across Egypt.`)}</p>
        <div class="ftr__pay">${(S.footerPay && S.footerPay.length ? S.footerPay : ["Cash on delivery", "Visa", "Mastercard", "Meeza", "Vodafone Cash", "InstaPay", "valU"]).map((p) => `<span>${esc(p)}</span>`).join("")}</div></div>
      ${(S.footerCols && S.footerCols.length ? S.footerCols : FOOTER_DEFAULT()).filter((c) => c.on !== false).map((c) => `<div><h4>${esc(c.title)}</h4><ul>${(c.auto === "brands" ? [...rotate(MKT_BRANDS).slice(0, 5).map((b) => ({ label: b.name, href: `brand.html?b=${b.slug}` })), { label: "All brands", href: "brands.html" }] : c.links || []).map((l) => `<li><a href="${esc(l.href || "#")}"${l.sizeguide ? " data-sizeguide" : ""}>${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")}
    </div>
    <div class="ftr__bot"><span>${esc(S.copyright || "© 2026 Malabisy. All rights reserved.")}</span><span>Redesign prototype</span></div>
  </div></footer>
  <div class="scrim" id="scrim"></div>
  <aside class="drawer glass" id="drawer" aria-label="Shopping bag"><div class="drawer__hd"><h3>Shopping bag (<span data-bagn>0</span>)</h3><button class="ibtn" data-close aria-label="Close">${I.x}</button></div><div class="drawer__bd" id="drawerBody"></div><div class="drawer__ft" id="drawerFoot"></div></aside>
  <nav class="mnav" id="mnav" aria-label="Menu"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><img src="assets/logo.png" alt="MALABISY" style="height:20px;mix-blend-mode:multiply"><button class="ibtn" data-close aria-label="Close">${I.x}</button></div>
    ${NAV.map((n) => `<a href="${esc(n.href)}"${n.red ? ' style="color:var(--red)"' : ""}>${esc(n.label === "Brands" ? "Brands A–Z" : n.label)}</a>`).join("")}<a href="account.html">My account</a><a href="sell.html">Sell on Malabisy</a></nav>
  <div class="search" id="search" role="dialog" aria-modal="true" aria-label="Search">
    <div class="search__top"><div class="wrap"><span style="width:22px;display:block">${I.search}</span><input id="q" type="search" placeholder="Search for products, brands or categories" autocomplete="off" aria-controls="qPanel"><button class="ibtn" data-close aria-label="Close search">${I.x}</button></div>
      <div class="wrap search__tabs" id="qTabs" hidden></div></div>
    <div class="search__body"><div class="wrap search__grid" id="qPanel"><div class="search__side" id="qSide"></div><div id="qMain"></div></div></div>
  </div>
  <div class="modal" id="modal" role="dialog" aria-modal="true"><div class="modal__box"><button class="ibtn modal__x" data-close aria-label="Close">${I.x}</button><div id="modalBody"></div></div></div>
  <div class="toast glass" id="toast" role="status"></div>`;
  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);
  initChrome();
}

function initChrome() {
  renderCounts();
  // announcement rotation
  const ann = $$(".announce__item"); let ai = 0;
  setInterval(() => { ann[ai].classList.remove("on"); ai = (ai + 1) % ann.length; ann[ai].classList.add("on"); }, 4200);
  // header: floats as a glass bar once you scroll; tucks away while scrolling down, returns on scroll up
  const hdr = $("#hdr"); let ly = scrollY;
  const onScroll = () => { const y = scrollY; hdr.classList.toggle("float", y > 40); hdr.classList.toggle("hide", y > ly && y > 500 && !document.body.classList.contains("lock")); ly = y; };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  // liquid glass: specular light follows the pointer across any glass surface
  document.addEventListener("pointermove", (e) => {
    const g = e.target.closest && e.target.closest(".glass"); if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--gx", ((e.clientX - r.left) / r.width) * 100 + "%");
    g.style.setProperty("--gy", ((e.clientY - r.top) / r.height) * 100 + "%");
  }, { passive: true });
  // open/close
  $("#bagBtn").onclick = openBag;
  $("#burger").onclick = () => open("#mnav");
  $("#searchBtn").onclick = openSearch;
  $("#wishBtn").onclick = () => { location.href = "marketplace.html?wish=1"; };
  $("#scrim").onclick = closeAll;
  $("#newsForm").onsubmit = (e) => { e.preventDefault(); e.target.innerHTML = '<p style="margin:14px 0;font-size:15px">Thank you — you are on the list.</p>'; };
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); } });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-close]")) { e.preventDefault(); closeAll(); return; }
    const w = t.closest("[data-wish]");
    if (w) { e.preventDefault(); const s = store.wish, h = w.dataset.wish; s.has(h) ? s.delete(h) : s.add(h); store.wish = s; $$(`[data-wish="${CSS.escape(h)}"]`).forEach((b) => { b.classList.toggle("wish-on", s.has(h)); b.setAttribute("aria-pressed", s.has(h)); }); return; }
    const qa = t.closest("[data-qa]");
    if (qa) { e.preventDefault(); addAndNotify(qa.dataset.qa, qa.dataset.size); return; }
    const q = t.closest("[data-line]");
    if (q) { const b = store.bag, i = +q.dataset.line, d = +q.dataset.d; if (d === 0) b.splice(i, 1); else { b[i].qty += d; if (b[i].qty < 1) b.splice(i, 1); } store.bag = b; renderBag(); return; }
    if (t.closest("[data-openbag]")) { e.preventDefault(); openBag(); return; }
    if (t.closest("[data-sizeguide]")) { e.preventDefault(); sizeGuide(t.closest("[data-sizeguide]").dataset.sizeguide); }
  });

  initBrandFinders();
  initSearch();
}

/* =========================================================
   SEARCH — recent, trending, suggestions, brands, products
   ========================================================= */
const TYPES = topTypes(ALL, 60);
const recent = { get: () => JSON.parse(localStorage.getItem("mlb2_recent") || "[]"), add(v) { v = v.trim(); if (!v) return; const r = this.get().filter((x) => x.toLowerCase() !== v.toLowerCase()); r.unshift(v); localStorage.setItem("mlb2_recent", JSON.stringify(r.slice(0, 6))); }, clear() { localStorage.removeItem("mlb2_recent"); } };
const hl = (text, v) => { const t = esc(text); if (!v) return t; const i = text.toLowerCase().indexOf(v); return i < 0 ? t : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + v.length)) + "</mark>" + esc(text.slice(i + v.length)); };
const matchRow = (r, words) => { const s = (r.t + " " + r.v + " " + r.ty + " " + r.d + " " + r.g).toLowerCase(); return words.every((w) => s.includes(w)); };
function initSearch() {
  const q = $("#q"); let scope = "all";
  const go = (v) => { recent.add(v); location.href = `marketplace.html?q=${encodeURIComponent(v)}`; };
  const row = (r, v) => `<a class="sres" href="product.html?h=${encodeURIComponent(r.h)}" data-rec="${esc(q.value)}"><span class="sres__img"><img src="${img(r.i[0], 160)}" alt="" loading="lazy"></span><span class="sres__t"><b>${hl(r.v, v)}${isOwn(r) ? ' <i class="badge badge--black" style="height:18px;font-style:normal">Label</i>' : ""}</b><span>${hl(r.t, v)}</span>${priceHTML(r)}</span></a>`;
  const run = () => {
    const raw = q.value.trim(), v = raw.toLowerCase();
    if (!v) {
      $("#qTabs").hidden = true;
      const rec = recent.get();
      $("#qSide").innerHTML = (rec.length ? `<div class="sgroup"><div class="sgroup__h"><p class="kicker">Recent searches</p><button class="link" id="qClear" style="font-size:12px">Clear</button></div>${rec.map((x) => `<a href="#" data-term="${esc(x)}">${esc(x)}</a>`).join("")}</div>` : "")
        + `<div class="sgroup"><p class="kicker">Trending</p>${["Leather jacket", "Loafers", "Pajamas", "Wide-leg pants", "Abaya", "Boots"].map((x) => `<a href="#" data-term="${x}">${x}</a>`).join("")}</div>`
        + `<div class="sgroup"><p class="kicker">Shop by department</p>${["Women", "Kids"].map((g) => `<a href="marketplace.html?g=${g}">${g}</a>`).join("")}<a href="malabisy.html">Malabisy Label</a><a href="brands.html">Brands A–Z</a></div>`;
      $("#qMain").innerHTML = `<p class="kicker">New from the Malabisy Label</p><div class="sres-grid">${OWN.slice(0, 6).map((r) => row(r, "")).join("")}</div>`;
      const c = $("#qClear"); if (c) c.onclick = () => { recent.clear(); run(); };
      return;
    }
    const words = v.split(/\s+/);
    const all = ALL.filter((r) => matchRow(r, words));
    const own = all.filter(isOwn), mkt = all.filter((r) => !isOwn(r));
    const shown = scope === "label" ? own : scope === "market" ? mkt : all;
    const brands = ALPHA().filter((b) => b.name.toLowerCase().includes(v)).slice(0, 5);
    const cats = TYPES.filter((t) => t.toLowerCase().includes(v)).slice(0, 5);
    const sugg = [...new Set(all.slice(0, 200).map((r) => r.ty).filter(Boolean))].slice(0, 4).map((t) => `${raw} ${t.toLowerCase()}`).filter((s) => s.toLowerCase() !== v);
    $("#qTabs").hidden = false;
    $("#qTabs").innerHTML = [["all", "All", all.length], ["label", "Malabisy Label", own.length], ["market", "Marketplace", mkt.length]].map(([k, t, n]) => `<button type="button" class="${scope === k ? "on" : ""}" data-scope="${k}">${t} <span>${fmt(n)}</span></button>`).join("");
    $("#qSide").innerHTML = (sugg.length ? `<div class="sgroup"><p class="kicker">Suggestions</p>${sugg.map((s) => `<a href="#" data-term="${esc(s)}">${hl(s, v)}</a>`).join("")}</div>` : "")
      + (brands.length ? `<div class="sgroup"><p class="kicker">Brands</p>${brands.map((b) => `<a href="${brandHref(b.name)}">${hl(b.name, v)} <span class="muted">${fmt(b.items.length)}</span></a>`).join("")}</div>` : "")
      + (cats.length ? `<div class="sgroup"><p class="kicker">Categories</p>${cats.map((t) => `<a href="marketplace.html?ty=${encodeURIComponent(t)}">${hl(t, v)}</a>`).join("")}</div>` : "");
    $("#qMain").innerHTML = shown.length
      ? `<div class="sgroup__h"><p class="kicker">Products</p><a class="arrow-link" href="marketplace.html?q=${encodeURIComponent(raw)}" data-rec="${esc(raw)}">View all ${fmt(shown.length)} ${I.arrow}</a></div><div class="sres-grid">${shown.slice(0, 9).map((r) => row(r, v)).join("")}</div>`
      : `<div class="snone"><h3 class="h2">No results for “${esc(raw)}”</h3><p class="muted">Check the spelling, or try a more general term.</p><div class="qnav">${["Dresses", "Jackets", "Loafers", "Bags"].map((x) => `<a class="pill" href="#" data-term="${x}">${x}</a>`).join("")}</div></div>`;
    $$("#qTabs [data-scope]").forEach((b) => (b.onclick = () => { scope = b.dataset.scope; run(); }));
  };
  let qt; q.oninput = () => { clearTimeout(qt); qt = setTimeout(run, 110); };
  q.onkeydown = (e) => {
    if (e.key === "Enter" && q.value.trim()) go(q.value);
    if (e.key === "ArrowDown") { e.preventDefault(); const f = $("#qPanel a"); f && f.focus(); }
  };
  $("#qPanel").addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return; e.preventDefault();
    const links = $$("#qPanel a"), i = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown") (links[i + 1] || links[0]).focus(); else (i <= 0 ? q : links[i - 1]).focus();
  });
  $("#search").addEventListener("click", (e) => {
    const t = e.target.closest("[data-term]"); if (t) { e.preventDefault(); q.value = t.dataset.term; scope = "all"; run(); q.focus(); return; }
    const rc = e.target.closest("[data-rec]"); if (rc && rc.dataset.rec) recent.add(rc.dataset.rec);
  });
  q.value = params.get("q") || ""; run();
}
function open(sel) { $(sel).classList.add("open"); $("#scrim").classList.add("open"); document.body.classList.add("lock"); document.body.style.overflow = "hidden"; }
function closeAll() { $$(".drawer,.mnav,.search,.modal,.scrim,.filters,.lightbox").forEach((e) => e.classList.remove("open")); document.body.classList.remove("lock"); document.body.style.overflow = ""; }
function openSearch() { $("#search").classList.add("open"); document.body.style.overflow = "hidden"; setTimeout(() => $("#q").focus(), 60); }

/* bag drawer */
function lineHTML(x, i, editable) {
  const r = byH.get(x.h);
  return `<div class="line"><a class="line__img" href="product.html?h=${encodeURIComponent(r.h)}"><img src="${img(r.i[0], 200)}" alt=""></a>
    <div><div class="line__b">${esc(r.v)}</div><div class="line__t">${esc(r.t)}</div><div class="line__m">Size: ${esc(x.size)}${editable ? "" : ` · Qty: ${x.qty}`}</div>
    ${editable ? `<div class="qty"><button type="button" data-line="${i}" data-d="-1" aria-label="Decrease">−</button><span>${x.qty}</span><button type="button" data-line="${i}" data-d="1" aria-label="Increase">+</button></div>` : ""}</div>
    <div class="line__r"><span>${money(r.p * x.qty)}</span>${editable ? `<button type="button" class="line__rm" data-line="${i}" data-d="0">Remove</button>` : ""}</div></div>`;
}
const freeHTML = () => {
  const s = bagSub(), left = FREE - s, pct = Math.min(100, Math.round((s / FREE) * 100)), done = left <= 0;
  return `<div class="free${done ? " free--done" : ""}" role="group" aria-label="Free delivery progress">
    <div class="free__top"><span class="free__ic">${I.truck}</span><span>${done ? "<b>Free delivery unlocked.</b> Your order ships free." : `Add <b>${money(left)}</b> more for <b>free delivery</b>.`}</span></div>
    <div class="free__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${FREE}" aria-valuenow="${Math.min(s, FREE)}" aria-valuetext="${money(Math.min(s, FREE))} of ${money(FREE)}"><i style="width:${pct}%"></i></div>
    <div class="free__scale"><span>${money(0)}</span><span>${pct}%</span><span>Free over ${money(FREE)}</span></div></div>`;
};
const totalsHTML = () => `<div class="totals"><div><span>Subtotal</span><span>${money(bagSub())}</span></div>${discount() ? `<div class="totals__disc"><span>Discount (${esc(codeNow().code.toUpperCase())})</span><span>−${money(discount())}</span></div>` : ""}<div><span>Delivery</span><span>${delivery() ? money(delivery()) : "Free"}</span></div><div class="grand"><span>Total</span><span>${money(grand())}</span></div></div>`;
const codeHTML = () => { if (!DISCOUNTS.length) return ""; const d = codeNow(), s = bagSub(); const msg = !d ? (sessionStorage.getItem("mlb_code") ? "This code is not valid." : "") : !codeOk(d, s) ? (d.ends && Date.parse(d.ends) <= Date.now() ? "This code has expired." : `Add ${money((+d.min || 0) - s)} more to use this code.`) : `Code applied: ${d.type === "percent" ? `${+d.value}% off` : d.type === "fixed" ? `${money(+d.value)} off` : "free delivery"}.`;
  return `<form class="code" id="codeForm"><input name="c" placeholder="Discount code" value="${esc(sessionStorage.getItem("mlb_code") || "")}" aria-label="Discount code" autocomplete="off"><button class="btn btn--outline btn--sm">${d ? "Change" : "Apply"}</button>${d ? `<button type="button" class="link" id="codeRm">Remove</button>` : ""}</form>${msg ? `<p class="code__msg ${d && codeOk(d, s) ? "ok" : ""}">${esc(msg)}</p>` : ""}`; };
function renderBag() {
  const b = store.bag; $$("[data-bagn]").forEach((e) => (e.textContent = bagCount()));
  if (!b.length) { $("#drawerBody").innerHTML = `<div class="empty-bag"><span style="width:40px;display:block">${I.bag}</span><b style="color:var(--black);letter-spacing:.12em;text-transform:uppercase;font-size:12px">Your bag is empty</b><a class="btn btn--black" href="marketplace.html?new=1">Shop new in</a></div>`; $("#drawerFoot").innerHTML = ""; return; }
  $("#drawerBody").innerHTML = b.map((x, i) => lineHTML(x, i, true)).join("");
  $("#drawerFoot").innerHTML = freeHTML() + totalsHTML() + `<a class="btn btn--black btn--block" href="bag.html">Checkout</a><button class="btn btn--outline btn--block" data-close>Continue shopping</button>`;
}
function openBag() { renderBag(); open("#drawer"); }
let tT;
function addAndNotify(h, size) {
  bagAdd(h, size);
  const r = byH.get(h), t = $("#toast");
  t.innerHTML = `<img src="${img(r.i[0], 200)}" alt=""><div><b>Added to bag</b><p>${esc(r.v)} — ${esc(r.t)}<br><span class="muted">Size: ${esc(size)}</span></p><a href="#" class="link" data-openbag style="font-size:12px">View bag (${bagCount()})</a></div>`;
  t.classList.add("show"); clearTimeout(tT); tT = setTimeout(() => t.classList.remove("show"), 3800);
  $$("[data-count=bag]").forEach((e) => { e.classList.remove("pulse"); void e.offsetWidth; e.classList.add("pulse"); });
}
function sizeGuide(kind) {
  const shoes = kind === "Footwear";
  const rows = shoes ? [["36", "23.0"], ["37", "23.7"], ["38", "24.3"], ["39", "25.0"], ["40", "25.7"], ["41", "26.3"], ["42", "27.0"]] : [["S", "84–88", "66–70", "90–94"], ["M", "88–94", "70–76", "94–100"], ["L", "94–100", "76–82", "100–106"], ["XL", "100–106", "82–88", "106–112"], ["2XL", "106–114", "88–96", "112–120"]];
  const head = shoes ? ["EU size", "Foot length (cm)"] : ["Size", "Bust (cm)", "Waist (cm)", "Hips (cm)"];
  $("#modalBody").innerHTML = `<p class="kicker">Size guide</p><h2 class="h1">${shoes ? "Footwear" : "Clothing"}</h2><table class="sz"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table><p class="muted" style="margin-top:18px;font-size:13px">Measurements are a general guide; fit varies by brand. Between sizes, we recommend sizing up.</p>`;
  open("#modal");
}

/* =========================================================
   LISTING (shared)
   ========================================================= */
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "S/M", "M/L", "L/XL", "Free Size", "One Size"];
const sizeRank = (s) => { const i = SIZE_ORDER.indexOf(s); return i >= 0 ? i : isNaN(+s) ? 500 : 100 + +s; };
function listing(source, { lockBrand = false, title = "" } = {}) {
  const st = {
    g: params.get("g") || "", d: params.get("d") || "", ty: new Set(params.getAll("ty")),
    brands: new Set(params.getAll("brand")), sizes: new Set(), min: "", max: params.get("max") || "",
    sale: params.get("sale") === "1", nw: params.get("new") === "1", q: params.get("q") || "", wish: params.get("wish") === "1",
    sort: params.get("sort") || "new", shown: 48,
  };
  const base = () => source.filter((r) => (!st.g || r.g === st.g) && (!st.d || r.d === st.d) && (!st.q || (r.t + " " + r.v + " " + r.ty).toLowerCase().includes(st.q.toLowerCase())) && (!st.wish || store.wish.has(r.h)));
  const apply = (rows, skip) => rows.filter((r) =>
    (skip === "ty" || !st.ty.size || st.ty.has(r.ty)) &&
    (skip === "brand" || !st.brands.size || st.brands.has(slug(r.v))) &&
    (skip === "size" || !st.sizes.size || r.a.some((s) => st.sizes.has(s))) &&
    (!st.min || r.p >= +st.min) && (!st.max || r.p <= +st.max) && (!st.sale || r.c) && (!st.nw || r.n));
  const count = (rows, key) => rows.reduce((m, r) => ((m[key(r)] = (m[key(r)] || 0) + 1), m), {});

  const html = `
  <div class="layout" id="list">
    <aside class="filters" id="filters" aria-label="Filters">
      <div class="mob-only" style="justify-content:space-between;align-items:center;width:100%;margin-bottom:16px"><b style="letter-spacing:.14em;text-transform:uppercase;font-size:12px">Filters</b><button class="ibtn" data-close aria-label="Close filters">${I.x}</button></div>
      <details class="fgroup" open><summary>Department</summary><div class="fgroup__body" id="fDept"></div></details>
      <details class="fgroup" open><summary>Category</summary><div class="fgroup__body scroll" id="fType"></div></details>
      ${lockBrand ? "" : `<details class="fgroup" open><summary>Brand</summary><div class="fgroup__body"><input class="fsearch" id="fBrandQ" placeholder="Search brands" aria-label="Search brands"><div class="scroll" id="fBrand" style="display:grid;gap:8px;max-height:240px;overflow:auto"></div></div></details>`}
      <details class="fgroup" open><summary>Size</summary><div class="fgroup__body"><div class="sizes" id="fSize"></div></div></details>
      <details class="fgroup" open><summary>Price (LE)</summary><div class="fgroup__body"><div class="prange"><input id="fMin" inputmode="numeric" placeholder="Min" aria-label="Minimum price"><span class="muted">—</span><input id="fMax" inputmode="numeric" placeholder="Max" aria-label="Maximum price"></div></div></details>
      <details class="fgroup" open><summary>Refine</summary><div class="fgroup__body"><label class="check"><input type="checkbox" id="fSale"> On sale</label><label class="check"><input type="checkbox" id="fNew"> New in</label></div></details>
      <button class="btn btn--black btn--block mob-only" data-close style="margin-top:20px">Show results</button>
    </aside>
    <div>
      <div class="toolbar"><div class="toolbar__chips" id="chips"></div>
        <div class="toolbar__right"><span class="results-n" id="resN"></span><button class="pill mob-only" id="openF">${I.filter} Filters</button>
          <select class="select" id="sort" aria-label="Sort"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="off">Biggest discount</option></select></div></div>
      <div class="grid" id="grid"></div>
      <div class="more" id="more"></div>
    </div>
  </div>`;

  const bind = () => {
    $("#sort").value = st.sort;
    const renderFilters = () => {
      const b = base();
      const deptRows = source.filter((r) => (!st.g || r.g === st.g));
      const dc = count(deptRows, (r) => r.d);
      $("#fDept").innerHTML = `<label class="check"><input type="radio" name="dept" value="" ${!st.d ? "checked" : ""}> All</label>` + Object.entries(dc).sort((a, b) => b[1] - a[1]).map(([d, n]) => `<label class="check"><input type="radio" name="dept" value="${d}" ${st.d === d ? "checked" : ""}> ${d}<span class="n">${fmt(n)}</span></label>`).join("");
      const tc = count(apply(b, "ty"), (r) => r.ty || "Other");
      $("#fType").innerHTML = Object.entries(tc).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<label class="check"><input type="checkbox" data-ty="${esc(t)}" ${st.ty.has(t) ? "checked" : ""}> ${esc(t)}<span class="n">${fmt(n)}</span></label>`).join("") || '<span class="muted">—</span>';
      if (!lockBrand) {
        const bc = count(apply(b, "brand"), (r) => r.v); const bq = ($("#fBrandQ").value || "").toLowerCase();
        $("#fBrand").innerHTML = Object.entries(bc).sort((a, b) => a[0].localeCompare(b[0])).filter(([v]) => v.toLowerCase().includes(bq) || st.brands.has(slug(v))).map(([v, n]) => `<label class="check"><input type="checkbox" data-brand="${slug(v)}" ${st.brands.has(slug(v)) ? "checked" : ""}> ${esc(v)}<span class="n">${fmt(n)}</span></label>`).join("");
      }
      const sc = new Set(); apply(b, "size").forEach((r) => r.a.forEach((s) => sc.add(s)));
      const sizes = [...sc].filter((s) => s.length <= 9).sort((a, b) => sizeRank(a) - sizeRank(b)).slice(0, 30);
      $("#fSize").innerHTML = sizes.map((s) => `<button type="button" class="${st.sizes.has(s) ? "on" : ""}" data-sz="${esc(s)}">${esc(s)}</button>`).join("") || '<span class="muted">—</span>';
      $("#fSale").checked = st.sale; $("#fNew").checked = st.nw; $("#fMin").value = st.min; $("#fMax").value = st.max;
    };
    const renderGrid = (reset = true) => {
      if (reset) st.shown = 48;
      let rows = apply(base());
      if (st.sort === "low") rows.sort((a, b) => a.p - b.p);
      if (st.sort === "high") rows.sort((a, b) => b.p - a.p);
      if (st.sort === "off") rows.sort((a, b) => off(b) - off(a));
      $("#resN").textContent = `${fmt(rows.length)} ${rows.length === 1 ? "item" : "items"}`;
      $("#grid").innerHTML = rows.length ? rows.slice(0, st.shown).map((r) => card(r)).join("") : `<div class="empty"><h3 class="h2">No items match these filters</h3><p class="muted">Try removing a filter.</p><button class="btn btn--outline" id="clearAll">Clear all filters</button></div>`;
      const sh = Math.min(st.shown, rows.length);
      $("#more").innerHTML = rows.length > st.shown ? `<span>Showing ${fmt(sh)} of ${fmt(rows.length)}</span><div class="more__bar"><i style="width:${(sh / rows.length) * 100}%"></i></div><button class="btn btn--outline" id="loadMore">Load more</button>` : rows.length ? `<span>Showing all ${fmt(rows.length)}</span>` : "";
      const lm = $("#loadMore"); if (lm) lm.onclick = () => { st.shown += 48; renderGrid(false); };
      const ca = $("#clearAll"); if (ca) ca.onclick = clearAll;
      // chips
      const chips = [];
      if (st.q) chips.push(["q", `“${st.q}”`]);
      if (st.g) chips.push(["g", st.g]);
      if (st.d) chips.push(["d", st.d]);
      st.ty.forEach((t) => chips.push(["ty:" + t, t]));
      if (!lockBrand) st.brands.forEach((b) => chips.push(["brand:" + b, brandBySlug(b)?.name || b]));
      st.sizes.forEach((s) => chips.push(["size:" + s, "Size " + s]));
      if (st.min || st.max) chips.push(["price", `${st.min ? money(st.min) : "LE 0"} – ${st.max ? money(st.max) : "any"}`]);
      if (st.sale) chips.push(["sale", "On sale"]);
      if (st.nw) chips.push(["nw", "New in"]);
      if (st.wish) chips.push(["wish", "Wishlist"]);
      $("#chips").innerHTML = chips.map(([k, l]) => `<button class="pill on" data-chip="${esc(k)}">${esc(l)} <span class="x">✕</span></button>`).join("") + (chips.length > 1 ? `<button class="link" id="clearChips" style="font-size:12px">Clear all</button>` : "");
      const cc = $("#clearChips"); if (cc) cc.onclick = clearAll;
    };
    const update = () => { renderFilters(); renderGrid(); };
    const clearAll = () => { st.g = st.d = st.q = st.min = st.max = ""; st.ty.clear(); if (!lockBrand) st.brands.clear(); st.sizes.clear(); st.sale = st.nw = st.wish = false; update(); };
    $("#filters").addEventListener("change", (e) => {
      const t = e.target;
      if (t.name === "dept") { st.d = t.value; st.ty.clear(); }
      if (t.dataset.ty !== undefined) t.checked ? st.ty.add(t.dataset.ty) : st.ty.delete(t.dataset.ty);
      if (t.dataset.brand !== undefined) t.checked ? st.brands.add(t.dataset.brand) : st.brands.delete(t.dataset.brand);
      if (t.id === "fSale") st.sale = t.checked;
      if (t.id === "fNew") st.nw = t.checked;
      if (t.id === "fMin" || t.id === "fMax") { st.min = $("#fMin").value.replace(/\D/g, ""); st.max = $("#fMax").value.replace(/\D/g, ""); }
      update();
    });
    $("#filters").addEventListener("click", (e) => { const b = e.target.closest("[data-sz]"); if (!b) return; const s = b.dataset.sz; st.sizes.has(s) ? st.sizes.delete(s) : st.sizes.add(s); update(); });
    if (!lockBrand) $("#fBrandQ").oninput = renderFilters;
    $("#sort").onchange = (e) => { st.sort = e.target.value; renderGrid(); };
    $("#openF").onclick = () => { $("#filters").classList.add("open"); document.body.style.overflow = "hidden"; };
    $("#chips").addEventListener("click", (e) => {
      const c = e.target.closest("[data-chip]"); if (!c) return;
      const [k, v] = c.dataset.chip.split(/:(.*)/s);
      if (k === "ty") st.ty.delete(v); else if (k === "brand") st.brands.delete(v); else if (k === "size") st.sizes.delete(v);
      else if (k === "price") st.min = st.max = ""; else if (k === "sale" || k === "nw" || k === "wish") st[k] = false; else st[k] = "";
      update();
    });
    $$("[data-qnav]").forEach((p) => (p.onclick = (e) => { e.preventDefault(); const [k, v] = p.dataset.qnav.split("="); st[k] = st[k] === v ? "" : v; if (k === "d") st.ty.clear(); $$("[data-qnav]").forEach((x) => { const [k2, v2] = x.dataset.qnav.split("="); x.classList.toggle("on", st[k2] === v2); }); update(); }));
    update();
  };
  return { html, bind, st };
}

/* =========================================================
   PAGES
   ========================================================= */
const app = document.getElementById("app");
const pick = (arr, n, fn = () => true) => arr.filter(fn).slice(0, n);
const pageHead = (crumbs, kicker, title, lede, extra = "") => `<section class="phead"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav><div class="phead__row"><div><p class="kicker">${kicker}</p><h1 class="h1">${title}</h1>${lede ? `<p class="lede" style="margin-top:14px">${lede}</p>` : ""}</div>${extra}</div></div></section>`;

/* ---------- brand logos (real logos from malabisy.com) ---------- */
const LOGO_BASE = "https://malabisy.com/cdn/shop/files/";
const LOGOS = {
  "XO Style": "xo_logo_9a11eb3d-ed26-4044-b260-2642ef76f860.jpg",
  "Carinawear": "carina_logo.jpg",
  "Clue": "clue_logo.jpg",
  "Libra": "WhatsApp_Image_2026-01-27_at_3.06.43_PM.jpg",
  "Mr. Joe": "mrjo.jpg",
  "Eve Chantelle": "WhatsApp_Image_2026-01-27_at_3.12.24_PM.jpg",
  /* found on each brand's own website */
  "Leocansa": "https://www.leocansa.com/cdn/shop/files/WhatsApp_Image_2023-09-17_at_4.43.47_PM.jpg?width=400",
  "Navy": "https://navyoriginals.com/cdn/shop/files/navyoriginals_logo_white.png?width=600",
  "Onda": "https://ondaslipper.com/cdn/shop/files/logo-small_1200x1200.png?v=1682696199",
  "Chertex": "https://chertexeg.com/cdn/shop/files/CHERTEX_LOGO_PNG_WHITE.png?height=120",
  "SheChick": "https://shechick.com/wp-content/uploads/2022/12/shechicklogo.svg",
  "Champs Land": "https://champsland.com/cdn/shop/files/standard_logo_6a6d468f-4561-4495-b622-d809c033e954.png?width=600",
  "Runes": "https://runeseg.com/cdn/shop/files/Runes_ForPrint-1.png?height=200",
  "Uji": "https://uji.store/cdn/shop/files/UJI.png?width=600",
  "99 THREADS": "https://99threadseg.com/cdn/shop/files/7768361A-4A93-4D29-805E-B377D3746BDD.png?height=120",
  "Gorilla Outfit": "https://gorillaoutfit.com/cdn/shop/files/logoooo.png?width=400",
  "Gvox": "https://gvoxeg.com/cdn/shop/files/Logo_White.png?width=600",
  "Reebelle": "https://reebelle.com/cdn/shop/files/w-logo_150x.png",
  "Hesper": "https://shophesper.com/cdn/shop/files/image-1789584005687.png?width=500",
};
/* logos published as white artwork: shown inverted (black) on white tiles */
const LOGO_INVERT = new Set(["Navy", "Chertex", "99 THREADS", "Reebelle"]);
/* the six logos hosted on malabisy.com are square files with wide margins; they get trimmed */
const LOGO_SQUARE = new Set(["XO Style", "Carinawear", "Clue", "Libra", "Mr. Joe", "Eve Chantelle"]);
const hasLogo = (v) => v === "Malabisy" || !!LOGOS[v] || !!(CMS.brands && CMS.brands[v] && CMS.brands[v].logo);
const logoSrc = (v) => (LOGOS[v].startsWith("http") ? LOGOS[v] : `${LOGO_BASE}${LOGOS[v]}?width=400`);
const cmsLogo = (v) => CMS.brands && CMS.brands[v] && CMS.brands[v].logo;
const logoTile = (v, cls = "") => cmsLogo(v) ? `<span class="ltile ${cls}"><img src="${esc(cmsLogo(v))}" alt="${esc(v)}" style="width:100%;height:100%;object-fit:contain;padding:14%"></span>` : v === "Malabisy"
  ? `<span class="ltile ltile--own ${cls}"><img src="assets/logo.png" alt="Malabisy"></span>`
  : `<span class="ltile ltile--ph ${cls}" aria-label="${esc(v)}"><span class="ltile__ph">Logo</span></span>`;
/* brands ordered: real logos first, then by size */
const daySeed = Math.floor(Date.now() / 864e5);
const rotate = (arr) => { let x = daySeed; return [...arr].map((v) => { x = (x * 9301 + 49297) % 233280; return [x, v]; }).sort((a, b) => a[0] - b[0]).map((p) => p[1]); };
const LOGO_BRANDS = () => [...MKT_BRANDS].sort((a, b) => (hasLogo(b.name) - hasLogo(a.name)) || b.items.length - a.items.length);
const logoWall = (n) => LOGO_BRANDS().slice(0, n).map((b) => logoTile(b.name)).join("");

/* ---------- hero options (review switcher) ---------- */
const HEROES = { a: "Campaign", b: "Editorial split", c: "Label + Marketplace" };
function heroHTML(v) {
  if (v === "b") return `<section class="heroB">
    <div class="heroB__media"><img src="${CAMPAIGN_CROP}" alt="Malabisy Winter ’27 campaign" fetchpriority="high"></div>
    <div class="heroB__copy">
      <p class="kicker">Malabisy Label · Winter ’27</p>
      <h1 class="display"><span class="reveal-line"><span>The layers</span></span><span class="reveal-line"><span>we love.</span></span></h1>
      <p class="lede">Coats, leather and tailored layers designed by Malabisy, alongside ${MKT_BRANDS.length} brands in one marketplace.</p>
      <div class="hero__ctas"><a class="btn btn--black" href="malabisy.html">Shop the collection</a><a class="btn btn--outline" href="marketplace.html">Explore the marketplace</a></div>
      <div class="heroB__meta"><div><b>${fmt(OWN.length)}</b><span>Label pieces</span></div><div><b>${MKT_BRANDS.length}</b><span>Brands</span></div><div><b>${fmt(ALL.length)}</b><span>Pieces in stock</span></div></div>
    </div></section>`;
  if (v === "c") return `<section class="heroC wrap">
    <a class="heroC__col" href="malabisy.html"><div class="heroC__media"><img src="${CAMPAIGN_CROP}" alt="Malabisy Winter ’27 campaign" fetchpriority="high"></div>
      <div class="heroC__cap"><div><p class="kicker">Malabisy Label</p><h1 class="h1">Winter ’27</h1><p class="muted" style="margin:8px 0 0">Designed by Malabisy · ${fmt(OWN.length)} pieces</p></div><span class="btn btn--black">Shop the label</span></div></a>
    <a class="heroC__col" href="marketplace.html"><div class="heroC__media heroC__media--logos"><div class="logo-wall">${logoWall(9)}</div></div>
      <div class="heroC__cap"><div><p class="kicker">The Marketplace</p><h2 class="h1">${MKT_BRANDS.length} brands, one bag</h2><p class="muted" style="margin:8px 0 0">Sold by the brands · delivered by Malabisy</p></div><span class="btn btn--outline">Explore brands</span></div></a>
  </section>`;
  return `<section class="heroA">
    <a class="heroA__img" href="malabisy.html" aria-label="Shop Malabisy Winter ’27"><img src="${CAMPAIGN}" alt="Malabisy Winter ’27 — The layers we love" fetchpriority="high"></a>
    <div class="heroA__dock"><div class="heroA__pill glass glass--dark"><div><p class="kicker">Malabisy Label · Winter ’27</p><b class="heroA__t">The layers we love</b></div>
      <div class="hero__ctas"><a class="btn btn--white" href="malabisy.html">Shop the collection</a><a class="btn btn--glass" href="marketplace.html">Explore the marketplace</a></div></div></div>
  </section>`;
}

/* sale offers — the store's own promotional banners, auto-playing */
const PROMOS = [
  { img: "7_6874cc6d-593a-4945-9b35-3f236948fe7c.jpg", alt: "Pants you'll obsess over: relaxed fits, endless ways to wear", href: "marketplace.html?g=Women&q=pants" },
  { img: "4_ecb85451-95ee-44fb-bd7b-21881627d79b.jpg", alt: "Winter shoes: but make it fashion", href: "marketplace.html?g=Women&d=Footwear" },
  { img: "2_995f70dd-cb49-40ba-b67a-7e0f6a320871.jpg", alt: "The Malabisy archive: previous-season pieces, up to 50% off", href: "marketplace.html?sale=1&brand=malabisy" },
  { img: "1_d2aa6967-bda3-4cf9-a757-01cd0a50a3fe.jpg", alt: "One last summer thing: summer favourites on clearance", href: "marketplace.html?sale=1" },
];
function promoSlider() {
  return `<section class="promo wrap" aria-roledescription="carousel" aria-label="Offers">
    <div class="promo__stage" id="promo">${PROMOS.map((p, i) => `<a class="promo__slide ${i ? "" : "on"}" href="${p.href}" aria-label="${esc(p.alt)}" ${i ? 'tabindex="-1"' : ""}><img src="https://malabisy.com/cdn/shop/files/${p.img}?width=1800" alt="${esc(p.alt)}" ${i ? 'loading="lazy"' : ""}></a>`).join("")}
      <button type="button" class="promo__arrow promo__arrow--prev glass" data-pd="-1" aria-label="Previous offer">${I.l}</button>
      <button type="button" class="promo__arrow promo__arrow--next glass" data-pd="1" aria-label="Next offer">${I.r}</button>
      <div class="promo__dots glass">${PROMOS.map((_, i) => `<button type="button" data-pi="${i}" class="${i ? "" : "on"}" aria-label="Offer ${i + 1}"><i></i></button>`).join("")}</div>
    </div></section>`;
}
function initPromo() {
  const st = document.getElementById("promo"); if (!st) return;
  const slides = [...st.querySelectorAll(".promo__slide")], dots = [...st.querySelectorAll("[data-pi]")];
  let i = 0, timer;
  const go = (n) => { i = (n + slides.length) % slides.length; slides.forEach((s, k) => { s.classList.toggle("on", k === i); s.tabIndex = k === i ? 0 : -1; }); dots.forEach((d, k) => d.classList.toggle("on", k === i)); restart(); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 5500); };
  st.querySelectorAll("[data-pd]").forEach((b) => (b.onclick = () => go(i + +b.dataset.pd)));
  dots.forEach((d) => (d.onclick = () => go(+d.dataset.pi)));
  st.addEventListener("mouseenter", () => clearInterval(timer)); st.addEventListener("mouseleave", restart);
  let x0 = null; st.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  st.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
  restart();
}

/* sale offers from our brands — sits directly under the logo slider */
function saleOffers() {
  const perBrand = {};
  const MIXED = new Set(["Navy", "99 THREADS", "Champs Land", "Havana Socks", "Onda", "Remark"]);
  const rows = MKT.filter((r) => r.c && r.sb && r.i.length > 1 && r.g === "Women" && r.d === "Clothing" && !MIXED.has(r.v)).filter((r) => !/Md{2}/.test(r.t)).sort((a, b) => b.n - a.n).filter((r, _, arr) => (perBrand[r.v] = (perBrand[r.v] || 0) + 1) <= 2).slice(0, 8);
  return `<section class="sec" style="padding-top:clamp(20px,3vw,40px)"><div class="wrap">
    <div class="sec__head rv"><div><p class="kicker kicker--red">Sale offers</p><h2 class="h1">Offers from our brands</h2></div><a class="arrow-link" href="marketplace.html?sale=1">Shop all offers ${I.arrow}</a></div>
    <div class="grid rv">${rows.map((r) => card(r)).join("")}</div>
  </div></section>`;
}

/* moving brand logo slider — alphabetical, endless loop, so no brand is ranked above another */
function logoMarquee() {
  const list = ALPHA().filter((b) => b.name !== "Malabisy");
  const half = Math.ceil(list.length / 2);
  const row = (arr, rev) => { const items = arr.map((b) => `<a class="mq__item glass" href="brand.html?b=${b.slug}" title="${esc(b.name)}">${logoTile(b.name)}</a>`).join(""); return `<div class="mq__row ${rev ? "mq__row--rev" : ""}"><div class="mq__track">${items}${items.replace(/href=/g, 'tabindex="-1" aria-hidden="true" href=')}</div></div>`; };
  return `<section class="mq" aria-label="Brands on Malabisy"><div class="wrap mq__head"><p class="kicker" style="margin:0">${list.length} brands on Malabisy</p><a class="arrow-link" href="brands.html">Brands A–Z ${I.arrow}</a></div>${row(list.slice(0, half))}${row(list.slice(half), true)}</section>`;
}

function home() {
  const newOwn = OWN.slice(0, 12);
  const mktNew = pick(MKT, 8, (r) => r.sb && r.n && r.i.length > 1 && r.d === "Clothing");
  const nth = (g, d, v, i = 0) => ALL.filter((r) => r.g === g && r.d === d && r.v === v && r.sb)[i] || ALL.find((r) => r.g === g && r.d === d && r.sb);
  const catDefs = [
    ["Clothing", "Women", "Clothing", OWN.find((r) => /Trench Coat – Beige/.test(r.t)) || OWN[0]],
    ["Footwear", "Women", "Footwear", nth("Women", "Footwear", "XO Style")],
    ["Bags", "Women", "Bags", nth("Women", "Bags", "Mr. Joe")],
    ["Homewear", "Women", "Homewear", nth("Women", "Homewear", "Carinawear")],
    ["Accessories", "Women", "Accessories", nth("Women", "Accessories", "Libra")],
    ["Kidswear", "Kids", "", ALL.find((r) => r.g === "Kids" && r.sb)],
  ];
  const cats = catDefs.filter((c) => c[3]).map(([label, g, d, r]) => ({ label, g, d, r, n: ALL.filter((x) => x.g === g && (!d || x.d === d)).length }));
  const maxOff = Math.max(...ALL.map(off));
  const brandsGrid = rotate(MKT_BRANDS).slice(0, 12);
  const ownHero = OWN.find((r) => /Trench Coat – Beige/.test(r.t)) || OWN[0];
  const mktEx = ALL.find((r) => r.v === "XO Style" && r.d === "Footwear" && r.sb) || MKT[0];

  document.body.classList.add("is-home");

  app.innerHTML = `
  ${heroHTML("a")}
  ${logoMarquee()}
  ${saleOffers()}

  <section class="sec"><div class="wrap">
    <div class="sec__head rv"><div><p class="kicker">How Malabisy works</p><h2 class="h1">Two ways to shop. One bag.</h2><p>Shop our own label and our partner brands together, then check out once.</p></div></div>
    <div class="eq rv">
      <a class="eq__card glass" href="malabisy.html">
        <span class="badge badge--black">Malabisy Label</span>
        <div class="eq__img"><img src="${img(ownHero.i[0], 800)}" alt="" loading="lazy"><span class="eq__tag">Malabisy Label</span></div>
        <h3 class="h2">Our own collection</h3>
        <p>Designed, made and sold by Malabisy. ${fmt(OWN.length)} pieces.</p>
        <span class="arrow-link">Shop the label ${I.arrow}</span>
      </a>
      <span class="eq__op eq__op--or">or</span>
      <a class="eq__card glass" href="marketplace.html">
        <span class="badge badge--outline">Marketplace</span>
        <div class="eq__img"><img src="${img(mktEx.i[0], 800)}" alt="" loading="lazy"><span class="eq__tag">Sold by ${esc(mktEx.v)}</span></div>
        <h3 class="h2">Partner brands</h3>
        <p>${MKT_BRANDS.length} brands sell their collections on Malabisy.</p>
        <span class="arrow-link">Explore the marketplace ${I.arrow}</span>
      </a>
      <span class="eq__op" aria-hidden="true">=</span>
      <div class="eq__card eq__card--bag glass glass--dark">
        <span class="badge" style="background:#fff;color:#0a0a0a">Your bag</span>
        <div class="eq__bag">
          ${[ownHero, mktEx].map((r) => `<div class="eq__line"><img src="${img(r.i[0], 160)}" alt=""><span><b>${isOwn(r) ? "Malabisy Label" : "Sold by " + esc(r.v)}</b>${esc(r.t)}</span><em>${money(r.p)}</em></div>`).join("")}
          <div class="eq__total"><span>One checkout · One delivery</span><b>${money(ownHero.p + mktEx.p)}</b></div>
        </div>
        <h3 class="h2">One bag, one checkout</h3>
        <p>Mix both in one bag. Pay once, get one delivery from Malabisy.</p>
      </div>
    </div>
  </div></section>

  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec__head rv"><div><p class="kicker">Malabisy Label</p><h2 class="h1">Just landed</h2></div><div style="display:flex;gap:24px;align-items:center"><a class="arrow-link" href="malabisy.html">View all ${I.arrow}</a>${carouselNav("carOwn")}</div></div>
    <div class="rv">${carousel(newOwn, "carOwn")}</div>
  </div></section>

  <section class="sec sec--grey"><div class="wrap">
    <div class="sec__head rv"><div><p class="kicker">Marketplace</p><h2 class="h1">Shop by brand</h2><p>A rotating selection of our partner brands. The line-up changes every day.</p></div><a class="arrow-link" href="brands.html">All ${BRANDS.length} brands A–Z ${I.arrow}</a></div>
    <div class="brandgrid rv">${brandsGrid.map((b) => `<a class="bcell" href="brand.html?b=${b.slug}"><span class="bcell__img"><img src="${img((b.items.find((r) => r.sb) || b.items[0]).i[0], 400)}" alt="" loading="lazy"></span>${logoTile(b.name, "ltile--bar")}<span class="bcell__n"><span>${fmt(b.items.length)} pieces</span><span>Shop brand →</span></span></a>`).join("")}</div>
  </div></section>

  <section class="sec"><div class="wrap">
    <div class="sec__head rv"><div><p class="kicker">Shop by category</p><h2 class="h1">The essentials</h2></div></div>
    <div class="cats rv">${cats.map((c) => `<a class="cat" href="marketplace.html?g=${c.g}${c.d ? "&d=" + c.d : ""}"><div class="cat__img"><img src="${img(c.r.i[0], 500)}" alt="" loading="lazy"></div><div class="cat__lbl">${c.label}<span>${fmt(c.n)}</span></div></a>`).join("")}</div>
  </div></section>


  <section class="sec--tight"><div class="wrap">
    <div class="edits rv">
      <a class="edit" href="marketplace.html?max=500"><span class="kicker" style="margin:0">The edit</span><b>Under LE 500</b><span class="muted">${fmt(ALL.filter((r) => r.p <= 500).length)} pieces</span><span class="arrow-link" style="justify-self:start">Shop now ${I.arrow}</span></a>
      <a class="edit" href="marketplace.html?max=1000"><span class="kicker" style="margin:0">The edit</span><b>Under LE 1,000</b><span class="muted">${fmt(ALL.filter((r) => r.p <= 1000).length)} pieces</span><span class="arrow-link" style="justify-self:start">Shop now ${I.arrow}</span></a>
      <a class="edit" href="marketplace.html?sale=1"><span class="kicker kicker--red" style="margin:0">Sale</span><b>Up to ${maxOff}% off</b><span class="muted">${fmt(ALL.filter((r) => r.c).length)} pieces</span><span class="arrow-link" style="justify-self:start">Shop the sale ${I.arrow}</span></a>
    </div>
  </div></section>

  <section class="sec--tight" style="padding-top:0"><div class="wrap"><div class="services">
    ${[[I.truck, "Delivery across Egypt", "Fast delivery in Cairo & Giza"], [I.cash, "Cash on delivery", "Or pay by card, wallet or valU"], [I.swap, "Easy exchanges", "Within 14 days of delivery"], [I.shield, "Authentic brands", "Every brand is vetted by Malabisy"]].map(([ic, t, s]) => `<div class="service">${ic}<div><b>${t}</b><span>${s}</span></div></div>`).join("")}
  </div></div></section>`;


}

function label() {
  const L1 = listing(OWN, { lockBrand: true });
  const hero = OWN.find((r) => /Leather Jacket – Black/.test(r.t)) || OWN[0];
  const pick = (re) => OWN.find((r) => r.sb && re.test(r.t)) || OWN.find((r) => re.test(r.t));
  const feats = [pick(/Toggle-Front Leather Jacket – Brown/), pick(/High-Collar Belted Trench Coat – Beige/)].filter(Boolean);
  const kinds = new Set(OWN.map((r) => r.ty).filter(Boolean)).size;
  app.innerHTML = `
  <section class="lhero">
    <div class="lhero__copy">
      <nav class="crumbs lhero__crumbs"><a href="index.html">Home</a><span>/</span><span>Malabisy Label</span></nav>
      <p class="lhero__kicker"><i></i>Malabisy Label · The Winter Edit</p>
      <h1 class="lhero__title"><span class="reveal-line"><span>Winter</span></span><span class="reveal-line"><span>’27</span></span></h1>
      <p class="lhero__lede">Outerwear, leather and tailored separates, designed, produced and sold by Malabisy.</p>
      <dl class="lhero__stats"><div><dt>${fmt(OWN.length)}</dt><dd>Pieces</dd></div><div><dt>${kinds}</dt><dd>Categories</dd></div><div><dt>14</dt><dd>Days to exchange</dd></div></dl>
      <a class="btn btn--white lhero__cta" href="#grid">Shop the collection</a>
    </div>
    <div class="lhero__mosaic">
      <figure class="lhero__main"><img src="${CAMPAIGN_CROP}" alt="Malabisy Winter ’27 campaign" fetchpriority="high"><figcaption>Campaign · Winter ’27</figcaption></figure>
      ${feats.map((r, i) => `<a class="lhero__card lhero__card--${i + 1}" href="product.html?h=${encodeURIComponent(r.h)}"><img src="${img(r.i[0], 600)}" alt="${esc(r.t)}"><span><b>${esc(r.t.split(" – ")[0])}</b>${money(r.p)}</span></a>`).join("")}
    </div>
  </section>
  <div class="wrap"><div class="qnav" style="margin-top:30px">${["Clothing"].concat(topTypes(OWN, 7)).map((t, i) => i === 0 ? `<a class="pill on" href="malabisy.html">All</a>` : `<a class="pill" data-qnav="ty=${esc(t)}" href="#">${esc(t)}</a>`).join("")}</div></div>
  <div class="wrap">${L1.html}</div>`;
  // quick nav for type uses a Set: adapt
  $$("[data-qnav]").forEach((p) => p.removeAttribute("data-qnav"));
  L1.bind();
  $$(".qnav .pill").forEach((p, i) => (p.onclick = (e) => { e.preventDefault(); $$(".qnav .pill").forEach((x) => x.classList.toggle("on", x === p)); const t = p.textContent; L1.st.ty.clear(); if (i > 0) L1.st.ty.add(t); $("#filters").dispatchEvent(new Event("change")); }));
}

function market() {
  const g = params.get("g"), d = params.get("d");
  const title = params.get("wish") === "1" ? "Wishlist" : params.get("sale") === "1" ? "Sale" : params.get("new") === "1" ? "New in" : params.get("q") ? `Search: “${esc(params.get("q"))}”` : [g, d].filter(Boolean).join(" · ") || "The Marketplace";
  const L1 = listing(ALL);
  app.innerHTML = pageHead(`<a href="index.html">Home</a><span>/</span><span>Marketplace</span>`, `${MKT_BRANDS.length} brands + Malabisy Label`, title, "Shop every brand on Malabisy in one place. One bag, one checkout, delivered across Egypt.",
    `<div class="qnav" style="margin:0">${["Women", "Kids"].map((x) => `<a class="pill ${g === x ? "on" : ""}" data-qnav="g=${x}" href="#">${x}</a>`).join("")}<a class="pill" href="brands.html">Brands A–Z</a></div>`)
    + logoMarquee()
    + `<div class="wrap">${L1.html}</div>`;
  L1.bind();
  document.title = `${title.replace(/<[^>]+>/g, "")} | MALABISY`;
}

function brandsPage() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");
  const groups = {}; BRANDS.forEach((b) => { const c = b.name[0].toUpperCase(); const k = /[A-Z]/.test(c) ? c : "#"; (groups[k] ||= []).push(b); });
  Object.values(groups).forEach((a) => a.sort((x, y) => x.name.localeCompare(y.name)));
  const feat = rotate(MKT_BRANDS).slice(0, 8);
  app.innerHTML = pageHead(`<a href="index.html">Home</a><span>/</span><span>Brands A–Z</span>`, "Brand directory", "Brands A–Z", `${BRANDS.length} brands, including the Malabisy Label.`, `<input class="fsearch" id="bq" placeholder="Find a brand" style="width:280px;height:46px" aria-label="Find a brand">`) + `
  <section class="sec--tight"><div class="wrap"><div class="sec__head"><div><p class="kicker">Featured</p><h2 class="h2">Brand spotlight</h2><p>Rotates daily, so every brand gets its turn.</p></div></div>
    <div class="featured-brands">${feat.map((b) => `<a class="fbrand rv" href="brand.html?b=${b.slug}">${logoTile(b.name)}<div class="fbrand__img">${b.items.slice(0, 3).map((r) => `<img src="${img(r.i[0], 300)}" alt="" loading="lazy">`).join("")}</div><div class="fbrand__name">${esc(b.name)}<span>${fmt(b.items.length)}</span></div></a>`).join("")}</div></div></section>
  <div class="wrap" style="padding-bottom:90px">
    <nav class="az" aria-label="Jump to letter">${letters.map((l) => `<a href="#L-${l === "#" ? "num" : l}" class="${groups[l] ? "" : "dim"}">${l}</a>`).join("")}</nav>
    <div id="azList">${letters.filter((l) => groups[l]).map((l) => `<section class="letter" id="L-${l === "#" ? "num" : l}"><h3>${l}</h3><ul>${groups[l].map((b) => `<li data-name="${esc(b.name.toLowerCase())}"><a href="${brandHref(b.name)}"><b style="font-weight:500">${esc(b.name)}${b.name === "Malabisy" ? ' <span class="badge badge--black" style="margin-left:6px">Label</span>' : ""}</b><span>${fmt(b.items.length)}</span></a></li>`).join("")}</ul></section>`).join("")}</div>
  </div>`;
  $("#bq").oninput = (e) => { const v = e.target.value.toLowerCase(); $$("#azList li").forEach((li) => (li.style.display = li.dataset.name.includes(v) ? "" : "none")); $$("#azList .letter").forEach((s) => (s.style.display = $$("li", s).some((li) => li.style.display !== "none") ? "" : "none")); };
}

function brandPage() {
  const b = brandBySlug(params.get("b")) || MKT_BRANDS[0];
  if (b.name === "Malabisy") { location.replace("malabisy.html"); return; }
  const L1 = listing(b.items, { lockBrand: true });
  const depts = [...new Set(b.items.map((r) => r.d))];
  const sale = b.items.filter((r) => r.c).length;
  app.innerHTML = `
  <section class="bhero"><div class="wrap">
    <div><nav class="crumbs"><a href="index.html">Home</a><span>/</span><a href="brands.html">Brands</a><span>/</span><span>${esc(b.name)}</span></nav>
      <div class="bhero__logo">${logoTile(b.name)}</div>
      <p class="kicker" style="color:rgba(255,255,255,.55)">Sold on the Malabisy marketplace</p><h1 class="display" style="font-size:clamp(36px,5vw,76px)"><span class="reveal-line"><span>${esc(b.name)}</span></span></h1>
      <div class="bhero__facts"><div><b>${fmt(b.items.length)}</b><span>Pieces</span></div><div><b>${depts.length}</b><span>Departments</span></div>${sale ? `<div><b>${fmt(sale)}</b><span>On sale</span></div>` : ""}</div>
      <div style="display:flex;gap:10px;margin-top:30px;flex-wrap:wrap"><button class="btn btn--white" id="follow">Follow brand</button><a class="btn btn--outline-w" href="brands.html">All brands</a></div></div>
    <div class="bhero__strip">${b.items.slice(0, 4).map((r) => `<div><img src="${img(r.i[0], 500)}" alt=""></div>`).join("")}</div>
  </div></section>
  <div class="wrap">${L1.html}</div>`;
  L1.bind();
  $("#follow").onclick = (e) => { e.currentTarget.textContent = "Following"; };
  document.title = `${b.name} | MALABISY`;
}

function productPage() {
  const r = byH.get(params.get("h")) || OWN[0];
  document.title = `${r.t} | ${r.v} | MALABISY`;
  const own = isOwn(r);
  const sizes = r.s.length ? r.s : ["One size"];
  const one = sizes.length === 1;
  const moreBrand = ALL.filter((x) => x.v === r.v && x.h !== r.h).slice(0, 12);
  const similar = ALL.filter((x) => x.ty === r.ty && x.v !== r.v && x.h !== r.h).slice(0, 12);
  const wished = store.wish.has(r.h);
  app.innerHTML = `
  <div class="wrap"><nav class="crumbs" style="padding-top:26px"><a href="index.html">Home</a><span>/</span><a href="${own ? "malabisy.html" : "marketplace.html"}">${own ? "Malabisy Label" : "Marketplace"}</a><span>/</span>${own ? "" : `<a href="${brandHref(r.v)}">${esc(r.v)}</a><span>/</span>`}<span>${esc(r.t)}</span></nav>
  <div class="pdp">
    <div class="gallery">${r.i.map((p, i) => `<button type="button" data-lb="${i}" aria-label="Open image ${i + 1}"><img src="${img(p, i ? 800 : 1200)}" srcset="${srcset(p)}" sizes="(max-width:960px) 100vw, 55vw" alt="${esc(r.t)} — image ${i + 1}" ${i > 1 ? 'loading="lazy"' : ""}></button>`).join("")}</div>
    <div class="pinfo" id="pinfo">
      <div><a class="pinfo__brand" href="${brandHref(r.v)}">${esc(r.v)}</a><h1>${esc(r.t)}</h1>${priceHTML(r)}${r.c ? `<p class="muted" style="font-size:12.5px;margin:6px 0 0">You save ${money(r.c - r.p)}</p>` : ""}</div>
      ${r.k.length ? `<div><div class="opt-lbl"><b>Colour</b><span>${esc(r.k.join(" / "))}</span></div></div>` : ""}
      <div><div class="opt-lbl"><b>Size</b>${one ? "" : `<a href="#" class="link" data-sizeguide="${r.d}">Size guide</a>`}</div>
        <div class="psizes" id="psizes">${sizes.map((s) => `<button type="button" data-ps="${esc(s)}" class="${one ? "on" : ""}" ${one || r.a.includes(s) ? "" : "disabled"} aria-label="Size ${esc(s)}${one || r.a.includes(s) ? "" : " (sold out)"}">${esc(s)}</button>`).join("")}</div>
        <div class="msg" id="pmsg" aria-live="polite"></div></div>
      <div class="buy"><button class="btn btn--black" id="atc">Add to bag</button><button class="wishbtn ${wished ? "wish-on" : ""}" data-wish="${esc(r.h)}" aria-label="Save to wishlist" aria-pressed="${wished}">${I.heart.replace("<svg", '<svg width="20" height="20"')}</button></div>
      <div class="sold"><span class="sold__logo">${logoTile(r.v)}</span><div><b>${own ? "Malabisy Label" : `Sold by ${esc(r.v)}`}</b><span>${own ? "Designed and shipped by Malabisy" : "Delivered by Malabisy"}</span></div><a class="link" style="font-size:12px" href="${brandHref(r.v)}">${own ? "View label" : "View brand"}</a></div>
      <div class="perks"><div>${I.truck}<span>Delivery in ${esc(DAYS)} working days · free over ${money(FREE)}</span></div><div>${I.cash}<span>Cash on delivery available</span></div><div>${I.swap}<span>Exchange within 14 days</span></div></div>
      <div>
        ${r.b ? `<details class="acc" open><summary>Description</summary><div class="acc__body">${esc(r.b)}</div></details>` : ""}
        <details class="acc" ${r.b ? "" : "open"}><summary>Details</summary><div class="acc__body"><dl><dt>Brand</dt><dd>${esc(r.v)}</dd><dt>Category</dt><dd>${esc(r.ty || r.d)}</dd><dt>Department</dt><dd>${esc(r.g)} · ${esc(r.d)}</dd>${r.k.length ? `<dt>Colour</dt><dd>${esc(r.k.join(", "))}</dd>` : ""}<dt>Sizes</dt><dd>${esc(sizes.join(", "))}</dd></dl></div></details>
        <details class="acc"><summary>Delivery &amp; exchanges</summary><div class="acc__body">Delivered by Malabisy across Egypt. Pay by card, wallet, valU or cash on delivery. Items can be exchanged within 14 days in their original condition.</div></details>
      </div>
    </div>
  </div></div>
  ${moreBrand.length ? `<section class="sec" style="border-top:1px solid var(--line)"><div class="wrap"><div class="sec__head"><div><p class="kicker">${own ? "Malabisy Label" : esc(r.v)}</p><h2 class="h1">More from ${own ? "the label" : "the brand"}</h2></div><div style="display:flex;gap:24px;align-items:center"><a class="arrow-link" href="${brandHref(r.v)}">View all ${I.arrow}</a>${carouselNav("carBrand")}</div></div>${carousel(moreBrand, "carBrand")}</div></section>` : ""}
  ${similar.length > 3 ? `<section class="sec"><div class="wrap"><div class="sec__head"><div><p class="kicker">From other brands</p><h2 class="h1">You may also like</h2></div>${carouselNav("carSim")}</div>${carousel(similar, "carSim")}</div></section>` : ""}
  <div class="sticky-atc" id="satc"><div class="wrap"><img src="${img(r.i[0], 200)}" alt=""><div class="sticky-atc__t"><b>${esc(r.v)}</b><span>${esc(r.t)}</span></div><b style="font-size:14px">${money(r.p)}</b><button class="btn btn--black btn--sm" id="satcBtn">Add to bag</button></div></div>
  <div class="lightbox" id="lb"><div class="lightbox__ui"><button id="lbZoom" aria-label="Zoom">+</button><button data-close aria-label="Close">${I.x}</button></div><div class="lightbox__nav"><button id="lbP" aria-label="Previous">${I.l}</button><button id="lbN" aria-label="Next">${I.r}</button></div><div class="lightbox__img" id="lbImg"><img alt=""></div><div class="lightbox__count" id="lbC"></div></div>`;

  let size = one ? sizes[0] : "";
  $("#psizes").onclick = (e) => { const b = e.target.closest("[data-ps]"); if (!b || b.disabled) return; size = b.dataset.ps; $$("#psizes button").forEach((x) => x.classList.toggle("on", x === b)); $("#pmsg").textContent = ""; };
  const add = () => {
    if (!size) { const p = $("#psizes"); p.classList.remove("err"); void p.offsetWidth; p.classList.add("err"); $("#pmsg").textContent = "Please select a size."; p.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    addAndNotify(r.h, size);
  };
  $("#atc").onclick = add; $("#satcBtn").onclick = add;
  const satc = $("#satc");
  new IntersectionObserver(([e]) => satc.classList.toggle("show", !e.isIntersecting && e.boundingClientRect.top < 0)).observe($("#atc"));
  // lightbox
  let li = 0; const lb = $("#lb"), lbi = $("#lbImg img");
  const show = () => { lbi.src = img(r.i[li], 1800); $("#lbC").textContent = `${li + 1} / ${r.i.length}`; $("#lbImg").classList.remove("zoom"); };
  $$("[data-lb]").forEach((b) => (b.onclick = () => { li = +b.dataset.lb; show(); lb.classList.add("open"); document.body.style.overflow = "hidden"; }));
  $("#lbP").onclick = () => { li = (li - 1 + r.i.length) % r.i.length; show(); };
  $("#lbN").onclick = () => { li = (li + 1) % r.i.length; show(); };
  $("#lbZoom").onclick = () => $("#lbImg").classList.toggle("zoom");
  $("#lbImg").onclick = (e) => { if (e.target === lbi) $("#lbImg").classList.toggle("zoom"); };
  addEventListener("keydown", (e) => { if (!lb.classList.contains("open")) return; if (e.key === "ArrowLeft") $("#lbP").click(); if (e.key === "ArrowRight") $("#lbN").click(); });
}

/* checkout stepper: 3 steps on one progress line */
function stepperHTML(step) {
  const steps = [["Bag", "Review your pieces"], ["Delivery", "Where it’s going"], ["Payment", "How you’ll pay"]];
  const pct = step >= 4 ? 100 : ((step - 1) / 2) * 100;
  return `<ol class="cstep" aria-label="Checkout progress"><li class="cstep__line" aria-hidden="true"><i style="width:${pct}%"></i></li>${steps.map(([t, d], i) => {
    const n = i + 1, st = step > n ? "is-done" : step === n ? "is-now" : "";
    return `<li class="cstep__s ${st}"${st === "is-now" ? ' aria-current="step"' : ""}><span class="cstep__dot">${st === "is-done" ? I.check : n}</span><b>${t}</b><small>${d}</small></li>`;
  }).join("")}</ol>`;
}
/* order progress: Placed → Confirmed → Shipped → Delivered, with the delivery window (2–5 working days) */
const ORDER_STEPS = ["Placed", "Confirmed", "Shipped", "Delivered"];
const addWorkdays = (d, n) => { const x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 5) n--; } return x; }; // Friday off
const dShort = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
function orderBarHTML(o) {
  if (o.status === "Cancelled") return `<div class="obar"><div class="obar__hd"><span>Order status: <b>Cancelled</b></span><span>This order will not be delivered.</span></div></div>`;
  const si = Math.max(0, o.status === "Processing" ? 1 : ORDER_STEPS.indexOf(o.status));
  const eta = `${dShort(addWorkdays(o.date, 2))} – ${dShort(addWorkdays(o.date, 5))}`;
  const pct = (si / (ORDER_STEPS.length - 1)) * 100;
  const marks = ORDER_STEPS.map((s, i) => {
    const st = i < si ? "is-done" : i === si ? "is-now" : "";
    const when = i === 0 ? dShort(o.date) : i === ORDER_STEPS.length - 1 ? "by " + dShort(addWorkdays(o.date, 5)) : "";
    return `<li class="obar__s ${st}"><em>${i <= si ? I.check : ""}</em><b>${s}</b><small>${when}</small></li>`;
  }).join("");
  return `<div class="obar"><div class="obar__hd"><span>Order status: <b>${esc(ORDER_STEPS[si])}</b></span><span>Estimated delivery: <b>${eta}</b></span></div>
    <ol class="obar__track" role="progressbar" aria-label="Order progress" aria-valuemin="1" aria-valuemax="${ORDER_STEPS.length}" aria-valuenow="${si + 1}" aria-valuetext="${ORDER_STEPS[si]}"><li class="obar__line" aria-hidden="true"><i style="width:${pct}%"></i></li>${marks}</ol></div>`;
}
/* invoice: shown when the order is placed, and from My account → Orders */
function invoiceHTML(o, fresh) {
  const items = o.items.map((x) => { const r = byH.get(x.h) || {}; return { ...x, p: x.p ?? r.p ?? 0, t: x.t || r.t || x.h, v: x.v || r.v || "", img: r.i ? img(r.i[0], 160) : "" }; });
  const sub = o.sub ?? items.reduce((a, x) => a + x.p * x.qty, 0), del = o.del ?? Math.max(0, (o.total || 0) - sub), a = o.address || {};
  const groups = {}; items.forEach((x) => (groups[x.v] ||= []).push(x));
  const seller = (v) => esc(v === "Malabisy" ? "Malabisy Label" : v);
  const pm = o.pm || "Cash on delivery", cod = pm === "Cash on delivery";
  const rows = Object.entries(groups).map(([v, arr]) => `<tr class="inv__grp"><td colspan="5">Sold by ${seller(v)}</td></tr>` + arr.map((x) => `<tr><td><div class="inv__item">${x.img ? `<img src="${x.img}" alt="">` : ""}<span>${esc(x.t)}</span></div></td><td>${esc(x.size)}</td><td class="num">${x.qty}</td><td class="num">${money(x.p)}</td><td class="num">${money(x.p * x.qty)}</td></tr>`).join("")).join("");
  const thanks = fresh ? `<div class="inv__thanks no-print"><span class="done__check">${I.check}</span><div><b>Thank you, your order is placed.</b><span>We’ll send updates to ${esc(a.phone || "your mobile number")}.</span></div></div>` : "";
  return `<article class="inv" id="invoice">${thanks}
    <header class="inv__hd"><div><div class="inv__logo">MALABISY</div><span class="inv__muted">The Malabisy Label and the Marketplace</span></div>
      <div class="inv__meta"><h2>Invoice</h2><dl><div><dt>Order no.</dt><dd>${esc(o.no)}</dd></div><div><dt>Date</dt><dd>${new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd></div><div><dt>Payment</dt><dd>${esc(pm)}</dd></div><div><dt>Payment status</dt><dd>${cod ? "Due on delivery" : "Awaiting payment"}</dd></div></dl></div></header>
    ${orderBarHTML(o)}
    <section class="inv__parties"><div><h3>Deliver to</h3><p><b>${esc(a.name || "—")}</b><br>${esc(a.street || "")}${a.area ? "<br>" + esc(a.area) : ""}${a.gov ? ", " + esc(a.gov) : ""}${a.phone ? "<br>" + esc(a.phone) : ""}</p></div>
      <div><h3>Sold by</h3><p>${Object.keys(groups).map(seller).join("<br>")}</p></div>
      <div><h3>Delivered by</h3><p>Malabisy<br>${esc(DAYS)} working days<br>Exchange within ${EXCH} days</p></div></section>
    <div class="inv__scroll"><table class="inv__tbl"><thead><tr><th>Item</th><th>Size</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="inv__foot"><p class="inv__muted">Delivery is free on orders over ${money(FREE)}. Keep this invoice for exchanges.<br>Prototype: no payment has been taken.</p>
      <dl class="inv__tot"><div><dt>Subtotal</dt><dd>${money(sub)}</dd></div>${o.disc ? `<div><dt>Discount${o.code ? ` (${esc(o.code)})` : ""}</dt><dd>−${money(o.disc)}</dd></div>` : ""}<div><dt>Delivery${!del && o.code && !o.disc ? ` (${esc(o.code)})` : ""}</dt><dd>${del ? money(del) : "Free"}</dd></div><div class="grand"><dt>Total${cod ? " due on delivery" : ""}</dt><dd>${money(sub - (o.disc || 0) + del)}</dd></div></dl></div>
    <div class="inv__act no-print"><button type="button" class="btn btn--black" data-print>Print / save as PDF</button><a class="btn btn--outline" href="account.html#orders">View in my account</a><a class="btn btn--outline" href="marketplace.html">Continue shopping</a></div>
  </article>`;
}
function bindInvoice() { $$("[data-print]").forEach((b) => (b.onclick = () => print())); }

function checkout() {
  let step = 1, orderNo = "MLB" + Math.floor(100000 + Math.random() * 900000);
  const GOV = ["Cairo", "Giza", "Alexandria", "Qalyubia", "Dakahlia", "Gharbia", "Sharqia", "Monufia", "Beheira", "Kafr El Sheikh", "Damietta", "Port Said", "Ismailia", "Suez", "Faiyum", "Beni Suef", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Red Sea", "Matrouh", "North Sinai", "South Sinai", "New Valley"];
  const summary = () => {
    const b = store.bag; const groups = {}; b.forEach((x, i) => (groups[byH.get(x.h).v] ||= []).push([x, i]));
    return `<aside class="co__sum"><h2 class="h2" style="margin-bottom:6px">Order summary</h2><p class="muted" style="margin:0 0 14px;font-size:12.5px">${bagCount()} ${bagCount() === 1 ? "item" : "items"} from ${Object.keys(groups).length} ${Object.keys(groups).length === 1 ? "brand" : "brands"}</p>${Object.entries(groups).map(([v, arr]) => `<div class="co-group">${esc(v)}</div>${arr.map(([x, i]) => lineHTML(x, i, false)).join("")}`).join("")}<div style="margin-top:20px;display:grid;gap:14px">${freeHTML()}${codeHTML()}${totalsHTML()}</div></aside>`;
  };
  const head = () => `<div class="wrap"><div class="co-head"><h1 class="h1" style="font-size:clamp(22px,2.4vw,32px)">${step === 4 ? "Order confirmed" : "Checkout"}</h1><span class="co-head__n">${step === 4 ? "All steps complete" : `Step ${step} of 3`}</span></div>${stepperHTML(step)}</div>`;
  const render = () => {
    if (step === 4) return;
    if (!store.bag.length) { app.innerHTML = head() + `<div class="wrap done"><h2 class="h1">Your bag is empty</h2><p class="lede">Discover the Malabisy Label and ${MKT_BRANDS.length} brands.</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn btn--black" href="malabisy.html">Malabisy Label</a><a class="btn btn--outline" href="marketplace.html">Marketplace</a></div></div>`; return; }
    let left = "";
    if (step === 1) left = `<div><h2 class="h2" style="margin-bottom:10px">Shopping bag</h2>${store.bag.map((x, i) => lineHTML(x, i, true)).join("")}<div style="display:flex;justify-content:space-between;gap:10px;margin-top:26px;flex-wrap:wrap"><a class="btn btn--outline" href="marketplace.html">Continue shopping</a><button class="btn btn--black" id="toDelivery">Continue to delivery</button></div></div>`;
    if (step === 2) left = `<form id="fDel"><h2 class="h2" style="margin-bottom:20px">Delivery details</h2>
      <div class="row2"><label class="field"><span>First name</span><input required autocomplete="given-name"></label><label class="field"><span>Last name</span><input required autocomplete="family-name"></label></div>
      <div class="row2"><label class="field"><span>Mobile number</span><input required type="tel" inputmode="tel" pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" autocomplete="tel"></label><label class="field"><span>Email</span><input type="email" autocomplete="email"></label></div>
      <div class="row2"><label class="field"><span>Governorate</span><select required>${GOV.map((g) => `<option>${g}</option>`).join("")}</select></label><label class="field"><span>City / area</span><input required></label></div>
      <label class="field"><span>Street address</span><input required placeholder="Street, building, floor, apartment" autocomplete="street-address"></label>
      <label class="field"><span>Delivery notes (optional)</span><textarea></textarea></label>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:10px"><button type="button" class="btn btn--outline" id="back">Back</button><button class="btn btn--black">Continue to payment</button></div></form>`;
    if (step === 3) left = `<form id="fPay"><h2 class="h2" style="margin-bottom:20px">Payment</h2><div class="pay">${PAYMENTS.map((p) => [p.name, p.note]).map(([t, s], i) => `<label><input type="radio" name="pm" value="${t}" ${i ? "" : "checked"}><span><b>${t}</b><small>${s}</small></span></label>`).join("")}</div>
      <p class="muted" style="font-size:12.5px;margin:16px 0 0">Prototype — no payment will be taken.</p>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:24px"><button type="button" class="btn btn--outline" id="back">Back</button><button class="btn btn--black">Place order · ${money(grand())}</button></div></form>`;
    app.innerHTML = head() + `<div class="wrap co">${left}${summary()}</div>`;
    const cf = $("#codeForm"); if (cf) cf.onsubmit = (e) => { e.preventDefault(); const v = cf.c.value.trim(); v ? sessionStorage.setItem("mlb_code", v) : sessionStorage.removeItem("mlb_code"); render(); };
    const cr = $("#codeRm"); if (cr) cr.onclick = () => { sessionStorage.removeItem("mlb_code"); render(); };
    const tD = $("#toDelivery"); if (tD) tD.onclick = () => { step = 2; render(); scrollTo(0, 0); };
    const bk = $("#back"); if (bk) bk.onclick = () => { step--; render(); };
    const fd = $("#fDel"); if (fd) fd.onsubmit = (e) => { e.preventDefault(); const v = [...fd.querySelectorAll("input,select")].map((x) => x.value); window.__mlbAddr = { name: v[0] + " " + v[1], phone: v[2], gov: v[4], area: v[5], street: v[6] }; const ad = JSON.parse(localStorage.getItem("mlb2_addr") || "[]"); if (!ad.some((a) => a.street === v[6])) { ad.push(window.__mlbAddr); localStorage.setItem("mlb2_addr", JSON.stringify(ad)); } step = 3; render(); scrollTo(0, 0); };
    const fp = $("#fPay"); if (fp) fp.onsubmit = (e) => {
      e.preventDefault();
      const pm = (fp.querySelector("input[name=pm]:checked") || {}).value || "Cash on delivery";
      const sub = bagSub(), del = delivery(), disc = discount(), code = disc || (codeNow() && codeNow().type === "ship" && codeOk(codeNow(), sub)) ? codeNow().code.toUpperCase() : "";
      // prices are frozen on the order, so the invoice stays correct if the catalogue changes later
      const items = store.bag.map((x) => { const p = byH.get(x.h); return { ...x, p: p.p, t: p.t, v: p.v }; });
      const order = { no: orderNo, date: new Date().toISOString(), items, sub, disc, code, del, total: sub - disc + del, pm, status: "Placed", address: window.__mlbAddr || null };
      sessionStorage.removeItem("mlb_code");
      const orders = JSON.parse(localStorage.getItem("mlb2_orders") || "[]"); orders.unshift(order); localStorage.setItem("mlb2_orders", JSON.stringify(orders));
      store.bag = []; step = 4;
      app.innerHTML = head() + `<div class="wrap inv-wrap">${invoiceHTML(order, true)}</div>`;
      bindInvoice(); scrollTo(0, 0);
    };
  };
  document.addEventListener("bagchange", () => { if (step === 1) render(); });
  render();
}

function sell() {
  const imgs = MKT_BRANDS.slice(0, 4).map((b) => b.items.find((r) => r.d === "Clothing") || b.items[0]);
  app.innerHTML = `
  <section class="sell-hero">
    <div class="sell-hero__copy"><nav class="crumbs" style="color:rgba(255,255,255,.5)"><a href="index.html">Home</a><span>/</span><span>Sell on Malabisy</span></nav><p class="kicker">For brands</p><h1 class="display" style="font-size:clamp(40px,5.4vw,80px)"><span class="reveal-line"><span>Sell on</span></span><span class="reveal-line"><span>Malabisy.</span></span></h1>
      <p class="lede">Join ${MKT_BRANDS.length} brands on the Malabisy marketplace. We handle the storefront, payments and delivery, so you can focus on your collection.</p>
      <div class="hero__ctas"><a class="btn btn--white" href="#apply">Apply now</a><a class="btn btn--outline-w" href="brands.html">See our brands</a></div>
      <div class="hero__meta"><div><b>${MKT_BRANDS.length}</b><span>Brands</span></div><div><b>${fmt(MKT.length)}</b><span>Marketplace pieces</span></div><div><b>27</b><span>Governorates</span></div></div></div>
    <div class="sell-hero__media">${imgs.map((r) => `<div><img src="${img(r.i[0], 600)}" alt=""></div>`).join("")}</div>
  </section>
  <section class="sec"><div class="wrap"><div class="sec__head"><div><p class="kicker">Why Malabisy</p><h2 class="h1">Built for fashion brands</h2></div></div>
    <div class="props">${[["Reach", "Your collection in front of Malabisy customers across Egypt, alongside the Malabisy Label."], ["Fulfilment", "Malabisy collects, delivers and handles exchanges, with cash on delivery available."], ["Payments", "Card, wallet, InstaPay, valU and cash, reconciled and paid out to you."]].map(([t, d]) => `<div class="prop rv"><b>${t}</b><p>${d}</p></div>`).join("")}</div></div></section>
  <section class="sec sec--grey"><div class="wrap"><div class="sec__head"><div><p class="kicker">How it works</p><h2 class="h1">Four steps to launch</h2></div></div>
    <div class="process">${[["Apply", "Tell us about your brand and collection."], ["Review", "Our team reviews every brand that joins the marketplace."], ["Onboard", "We set up your brand page and upload your catalogue."], ["Sell", "Orders, delivery and payments are managed by Malabisy."]].map(([t, d]) => `<div class="rv"><b>${t}</b><p>${d}</p></div>`).join("")}</div></div></section>
  <section class="sec" id="apply"><div class="wrap" style="display:grid;grid-template-columns:1fr 1.2fr;gap:clamp(30px,5vw,80px)">
    <div><p class="kicker">Application</p><h2 class="h1">Apply to sell</h2><p class="lede" style="margin-top:14px">Our partnerships team will get back to you within two working days.</p></div>
    <form id="fSell"><div class="row2"><label class="field"><span>Brand name</span><input required></label><label class="field"><span>Contact name</span><input required autocomplete="name"></label></div>
      <div class="row2"><label class="field"><span>Mobile number</span><input required type="tel" autocomplete="tel"></label><label class="field"><span>Email</span><input required type="email" autocomplete="email"></label></div>
      <div class="row2"><label class="field"><span>Main category</span><select><option>Clothing</option><option>Footwear</option><option>Bags</option><option>Accessories</option><option>Homewear</option></select></label><label class="field"><span>Instagram / website</span><input></label></div>
      <label class="field"><span>About your brand</span><textarea></textarea></label><button class="btn btn--black">Submit application</button></form>
  </div></section>`;
  $("#fSell").onsubmit = (e) => { e.preventDefault(); e.target.innerHTML = `<div style="border:1px solid var(--line);padding:40px"><span class="done__check" style="margin-bottom:18px">${I.check}</span><h3 class="h2">Application received</h3><p class="muted">Thank you. (Prototype — nothing was sent.)</p></div>`; };
}

/* =========================================================
   MY ACCOUNT
   ========================================================= */
function account() {
  const user = () => JSON.parse(localStorage.getItem("mlb2_user") || "null");
  const orders = () => JSON.parse(localStorage.getItem("mlb2_orders") || "[]");
  const addrs = () => JSON.parse(localStorage.getItem("mlb2_addr") || "[]");
  const statusSteps = ORDER_STEPS;
  const render = () => {
    const u = user();
    if (!u) {
      app.innerHTML = pageHead('<a href="index.html">Home</a><span>/</span><span>My account</span>', "My account", "Sign in", "Track orders, save your wishlist and check out faster.") + `
      <div class="wrap acc-auth">
        <form class="acc-card" id="fIn"><h2 class="h2">Sign in</h2><p class="muted">Welcome back.</p>
          <label class="field"><span>Email or mobile number</span><input required autocomplete="username"></label>
          <label class="field"><span>Password</span><input required type="password" autocomplete="current-password"></label>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-size:13px"><label class="check"><input type="checkbox"> Remember me</label><a href="#" class="link" id="forgot">Forgot password?</a></div>
          <button class="btn btn--black btn--block">Sign in</button>
          <div class="acc-or"><span>or</span></div>
          <button type="button" class="btn btn--outline btn--block" id="otp">Sign in with a one-time code</button></form>
        <form class="acc-card" id="fUp"><h2 class="h2">Create an account</h2><p class="muted">New to Malabisy?</p>
          <div class="row2"><label class="field"><span>First name</span><input required autocomplete="given-name"></label><label class="field"><span>Last name</span><input required autocomplete="family-name"></label></div>
          <label class="field"><span>Email</span><input required type="email" autocomplete="email"></label>
          <label class="field"><span>Mobile number</span><input type="tel" autocomplete="tel" placeholder="01XXXXXXXXX"></label>
          <label class="field"><span>Password</span><input required type="password" minlength="8" autocomplete="new-password"></label>
          <label class="check" style="margin-bottom:18px;font-size:13px"><input type="checkbox"> Email me about new drops and offers</label>
          <button class="btn btn--black btn--block">Create account</button>
          <ul class="acc-perks"><li>Track every order in one place</li><li>Save addresses for faster checkout</li><li>Keep your wishlist on every device</li></ul></form>
      </div>
      <p class="wrap muted" style="font-size:12px;padding-bottom:60px">Prototype: no data is sent; your details stay in this browser.</p>`;
      const signIn = (name, email) => { localStorage.setItem("mlb2_user", JSON.stringify({ name, email, phone: "", since: new Date().toISOString() })); location.hash = "#overview"; render(); scrollTo(0, 0); };
      $("#fIn").onsubmit = (e) => { e.preventDefault(); const id = e.target.querySelector("input").value; signIn(id.split("@")[0].replace(/\W+/g, " ").trim() || "Customer", id); };
      $("#fUp").onsubmit = (e) => { e.preventDefault(); const v = [...e.target.querySelectorAll("input")].map((x) => x.value); signIn(v[0] + " " + v[1], v[2]); };
      $("#forgot").onclick = (e) => { e.preventDefault(); e.target.textContent = "Reset link sent"; };
      $("#otp").onclick = (e) => { e.target.textContent = "Code sent to your mobile"; };
      return;
    }
    const tab = (location.hash || "#overview").slice(1);
    const os = orders(), w = [...store.wish].map((h) => byH.get(h)).filter(Boolean), ad = addrs();
    const invOrder = tab.startsWith("invoice-") ? os.find((o) => o.no === tab.slice(8)) : null;
    const nav = [["overview", "Overview"], ["orders", `Orders <span>${os.length}</span>`], ["wishlist", `Wishlist <span>${w.length}</span>`], ["addresses", `Addresses <span>${ad.length}</span>`], ["details", "Account details"]];
    const orderCard = (o) => { const si = Math.max(0, statusSteps.indexOf(o.status)); return `<div class="ord"><div class="ord__hd"><div><b>Order ${esc(o.no)}</b><span class="muted">${new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · ${o.items.reduce((a, x) => a + x.qty, 0)} items</span></div><div style="text-align:right"><span class="badge badge--outline">${esc(o.status)}</span><div style="margin-top:6px;font-weight:600">${money(o.total)}</div></div></div>
      <div class="ord__bar">${orderBarHTML(o)}</div>
      <div class="ord__items">${o.items.map((x) => { const r = byH.get(x.h); return r ? `<a href="product.html?h=${encodeURIComponent(r.h)}"><img src="${img(r.i[0], 160)}" alt=""><span><b>${esc(r.v)}</b>${esc(r.t)}<em>Size ${esc(x.size)} · Qty ${x.qty}</em></span></a>` : ""; }).join("")}</div>
      <div class="ord__ft"><a class="btn btn--black btn--sm" href="#invoice-${esc(o.no)}">View invoice</a><button class="btn btn--outline btn--sm" data-reorder="${esc(o.no)}">Buy again</button><a class="btn btn--outline btn--sm" href="#">Request exchange</a><a class="link" href="#" style="font-size:12.5px">Need help?</a></div></div>`; };
    const panes = {
      overview: `<h2 class="h1" style="font-size:clamp(24px,2.4vw,34px)">Hello, ${esc(u.name.split(" ")[0])}</h2><p class="muted">Manage your orders, wishlist and details.</p>
        <div class="acc-stats"><a href="#orders"><b>${os.length}</b><span>Orders</span></a><a href="#wishlist"><b>${w.length}</b><span>Wishlist</span></a><a href="#addresses"><b>${ad.length}</b><span>Addresses</span></a></div>
        <h3 class="h2" style="margin:34px 0 14px">Latest order</h3>${os.length ? orderCard(os[0]) : `<div class="acc-empty"><p>You have not placed an order yet.</p><a class="btn btn--black" href="marketplace.html?new=1">Shop new in</a></div>`}`,
      orders: `<h2 class="h2" style="margin-bottom:18px">Orders</h2>${os.length ? os.map(orderCard).join("") : `<div class="acc-empty"><p>No orders yet.</p><a class="btn btn--black" href="marketplace.html">Start shopping</a></div>`}`,
      wishlist: `<h2 class="h2" style="margin-bottom:18px">Wishlist</h2>${w.length ? `<div class="grid grid--3">${w.map((r) => card(r)).join("")}</div>` : `<div class="acc-empty"><p>Tap the heart on any product to save it here.</p><a class="btn btn--black" href="marketplace.html">Browse products</a></div>`}`,
      addresses: `<h2 class="h2" style="margin-bottom:18px">Addresses</h2><div class="addr-grid">${ad.map((a, i) => `<div class="addr"><b>${esc(a.name)}</b><span>${esc(a.street)}<br>${esc(a.area)}, ${esc(a.gov)}<br>${esc(a.phone)}</span><div>${i === 0 ? '<span class="badge badge--black">Default</span>' : ""}<button class="link" data-deladdr="${i}" style="font-size:12.5px">Remove</button></div></div>`).join("")}
        <form class="addr addr--new" id="fAddr"><b>Add a new address</b><input required placeholder="Full name"><input required placeholder="Mobile number" type="tel"><input required placeholder="Street, building, floor"><input required placeholder="City / area"><input required placeholder="Governorate"><button class="btn btn--black btn--sm">Save address</button></form></div>`,
      details: `<h2 class="h2" style="margin-bottom:18px">Account details</h2><form id="fDet" class="acc-form"><label class="field"><span>Full name</span><input value="${esc(u.name)}" required></label><label class="field"><span>Email</span><input type="email" value="${esc(u.email)}"></label><label class="field"><span>Mobile number</span><input type="tel" value="${esc(u.phone || "")}" placeholder="01XXXXXXXXX"></label><button class="btn btn--black">Save changes</button><span class="muted" id="detMsg" style="margin-left:14px;font-size:13px"></span></form>
        <h3 class="h2" style="margin:40px 0 16px">Password</h3><form id="fPw" class="acc-form"><label class="field"><span>Current password</span><input type="password" required></label><label class="field"><span>New password</span><input type="password" minlength="8" required></label><button class="btn btn--outline">Update password</button><span class="muted" id="pwMsg" style="margin-left:14px;font-size:13px"></span></form>`,
    };
    app.innerHTML = `<div class="wrap"><nav class="crumbs" style="padding-top:26px"><a href="index.html">Home</a><span>/</span><span>My account</span></nav>
      <div class="acc"><aside class="acc__nav"><div class="acc__me"><span class="acc__av">${esc(u.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase())}</span><div><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div></div>
        ${nav.map(([k, t]) => `<a href="#${k}" class="${tab === k ? "on" : ""}">${t}</a>`).join("")}<button id="signOut">Sign out</button></aside>
        <section class="acc__main">${invOrder ? `<a class="link no-print" href="#orders" style="font-size:12.5px">← Back to orders</a>` + invoiceHTML(invOrder) : panes[tab] || panes.overview}</section></div></div>`;
    bindInvoice();
    $("#signOut").onclick = () => { localStorage.removeItem("mlb2_user"); location.hash = ""; render(); };
    $$("[data-reorder]").forEach((b) => (b.onclick = () => { const o = os.find((x) => x.no === b.dataset.reorder); const bag = store.bag; o.items.forEach((x) => bag.push({ ...x })); store.bag = bag; openBag(); }));
    $$("[data-deladdr]").forEach((b) => (b.onclick = () => { const a = addrs(); a.splice(+b.dataset.deladdr, 1); localStorage.setItem("mlb2_addr", JSON.stringify(a)); render(); }));
    const fa = $("#fAddr"); if (fa) fa.onsubmit = (e) => { e.preventDefault(); const v = [...fa.querySelectorAll("input")].map((x) => x.value); const a = addrs(); a.push({ name: v[0], phone: v[1], street: v[2], area: v[3], gov: v[4] }); localStorage.setItem("mlb2_addr", JSON.stringify(a)); render(); };
    const fdt = $("#fDet"); if (fdt) fdt.onsubmit = (e) => { e.preventDefault(); const v = [...fdt.querySelectorAll("input")].map((x) => x.value); localStorage.setItem("mlb2_user", JSON.stringify({ ...u, name: v[0], email: v[1], phone: v[2] })); $("#detMsg").textContent = "Saved."; };
    const fpw = $("#fPw"); if (fpw) fpw.onsubmit = (e) => { e.preventDefault(); fpw.reset(); $("#pwMsg").textContent = "Password updated."; };
  };
  addEventListener("hashchange", render);
  render();
}

/* =========================================================
   BOOT
   ========================================================= */
/* read-only bridge for optional add-on features (e.g. the AI Stylist); adds nothing to the page itself */
window.MLB_API = Object.freeze({ catalog: ALL, byHandle: (h) => byH.get(h), img, money, isOwn, addToBag: addAndNotify, openBag, bag: () => store.bag, wish: () => [...store.wish], params, card, brandHref, slug, brands: () => BRANDS.map((b) => ({ name: b.name, slug: b.slug, count: b.items.length })), logoTile, settings: { FREE, DELIVERY, DAYS, EXCH, PAYMENTS, NAV, NAV_DEFAULT, FOOTER_DEFAULT } });
const page = document.body.dataset.page;
chrome({ label: "label", market: params.get("new") === "1" ? "new" : params.get("g") || "", brand: "brands", brands: "brands", product: byH.get(params.get("h")) && isOwn(byH.get(params.get("h"))) ? "label" : "" }[page] || "");
({ home, label, market, account, brands: brandsPage, brand: brandPage, product: productPage, bag: checkout, sell, custom: () => { app.innerHTML = ""; } }[page] || home)();
initCarousels();
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.08 });
$$(".rv").forEach((el) => io.observe(el));
})();

/* =========================================================
   SITE EDITOR — panel (loaded on demand by cms.js)
   Edits: page sections, any text or image on any page, hiding any element, theme, header,
   footer, navigation, custom pages, brands, products, the AI stylist, checkout and policies.
   Saves to the site data in cms.js (undo, export / import, reset).
   ========================================================= */
(() => {
  if (window.MLB_EDITOR) return;
  const CMS = window.MLB_CMS, ST = CMS.store, CTX = CMS.ctx, API = window.MLB_API;
  const { esc, slug, pageKey, urlKey } = CTX;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => Math.random().toString(36).slice(2, 9);
  let D = clone(ST.get());
  const undo = JSON.parse(sessionStorage.getItem("med_undo") || "[]");
  let tab = sessionStorage.getItem("med_tab") || "page", mode = null, sub = sessionStorage.getItem("med_sub") || null, pending = false;
  const remember = () => { sessionStorage.setItem("med_tab", tab); sub ? sessionStorage.setItem("med_sub", sub) : sessionStorage.removeItem("med_sub"); };
  const refresh = () => { remember(); sessionStorage.setItem("med_scroll", String(scrollY)); location.reload(); };

  const PAGE_NAMES = { home: "Home", label: "Malabisy Label", market: "Marketplace / listing", brands: "Brands A–Z", brand: "Brand page", product: "Product page", bag: "Checkout", account: "My account", sell: "Sell on Malabisy" };
  const pageName = PAGE_NAMES[CTX.page] || (pageKey.startsWith("custom:") ? "Page: " + ((D.pages.find((p) => "custom:" + p.slug === pageKey) || {}).title || pageKey.slice(7)) : CTX.page);

  /* ---------- save / undo ---------- */
  function commit(next, opts = {}) {
    undo.push(JSON.stringify(ST.get())); if (undo.length > 40) undo.shift();
    sessionStorage.setItem("med_undo", JSON.stringify(undo));
    D = next;
    if (opts.hard) { remember(); ST.save(clone(D), { reload: true }); return; }
    if (opts.reload) pending = true;
    if (ST.save(clone(D), { reload: false })) flash(opts.msg || (opts.reload ? "Saved. Refresh to see it on the page" : "Saved"));
    render();
  }
  const change = (fn, opts) => { const n = clone(D); fn(n); commit(n, opts); };
  function doUndo() { if (!undo.length) return flash("Nothing to undo"); const prev = JSON.parse(undo.pop()); sessionStorage.setItem("med_undo", JSON.stringify(undo)); D = prev; remember(); ST.save(clone(D), { reload: true }); }
  let fT; function flash(t) { const el = root.querySelector(".med-flash"); if (!el) return; el.textContent = t; el.classList.add("on"); clearTimeout(fT); fT = setTimeout(() => el.classList.remove("on"), 1600); }

  /* ---------- images: link or upload (resized and compressed in the browser) ---------- */
  function readImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => { const max = 1600, k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext("2d"); g.drawImage(im, 0, 0, c.width, c.height); const png = /png|svg/.test(file.type); res(c.toDataURL(png ? "image/png" : "image/jpeg", 0.82)); }; im.onerror = rej; im.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  /* ---------- form builder ---------- */
  // field: [key, label, type, options]
  function fieldHTML(path, f, val) {
    const [key, label, type = "text", opt = {}] = f, id = "f-" + uid(), name = `${path}§${key}`;
    const v = val ?? opt.def ?? "";
    const hint = opt.hint ? `<small class="med-hint">${esc(opt.hint)}</small>` : "";
    if (type === "check") return `<label class="med-check"><input type="checkbox" data-k="${esc(name)}" ${v ? "checked" : ""}><span>${esc(label)}</span></label>${hint}`;
    if (type === "select") return `<label class="med-f" for="${id}"><span>${esc(label)}</span><select id="${id}" data-k="${esc(name)}">${opt.options.map(([o, l]) => `<option value="${esc(o)}" ${String(v) === String(o) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${hint}</label>`;
    if (type === "textarea") return `<label class="med-f" for="${id}"><span>${esc(label)}</span><textarea id="${id}" rows="${opt.rows || 4}" data-k="${esc(name)}" placeholder="${esc(opt.ph || "")}">${esc(v)}</textarea>${hint}</label>`;
    if (type === "color") return `<label class="med-f med-f--color" for="${id}"><span>${esc(label)}</span><span class="med-color"><input type="color" id="${id}" data-k="${esc(name)}" value="${esc(v || opt.def || "#000000")}"><code>${esc(v || "default")}</code>${v ? `<button type="button" class="med-link" data-clear="${esc(name)}">Reset</button>` : ""}</span></label>`;
    if (type === "image") return `<div class="med-f"><span>${esc(label)}</span><div class="med-img">${v ? `<img src="${esc(v)}" alt="">` : `<span class="med-img__ph">No image</span>`}<div><input type="url" data-k="${esc(name)}" value="${esc(String(v).startsWith("data:") ? "" : v)}" placeholder="${String(v).startsWith("data:") ? "Uploaded image" : "Paste an image link"}"><div class="med-row"><label class="med-btn med-btn--sm">Upload<input type="file" accept="image/*" data-up="${esc(name)}" hidden></label>${v ? `<button type="button" class="med-link" data-clear="${esc(name)}">Remove</button>` : ""}</div></div></div>${hint}</div>`;
    if (type === "list") return `<label class="med-f" for="${id}"><span>${esc(label)}</span><textarea id="${id}" rows="${opt.rows || 4}" data-k="${esc(name)}" data-list="1" placeholder="${esc(opt.ph || "One per line")}">${esc((v || []).join("\n"))}</textarea>${hint || `<small class="med-hint">One per line</small>`}</label>`;
    if (type === "images") return `<div class="med-f"><span>${esc(label)}</span><div class="med-thumbs">${(v || []).map((u, i) => `<span><img src="${esc(u)}" alt=""><button type="button" data-rmimg="${esc(name)}" data-i="${i}" aria-label="Remove image">×</button></span>`).join("")}<label class="med-thumbs__add">+ Upload<input type="file" accept="image/*" multiple data-upmany="${esc(name)}" hidden></label></div><input type="url" data-addurl="${esc(name)}" placeholder="…or paste an image link and press Enter">${hint}</div>`;
    return `<label class="med-f" for="${id}"><span>${esc(label)}</span><input id="${id}" type="${type}" data-k="${esc(name)}" value="${esc(v)}" placeholder="${esc(opt.ph || "")}" ${type === "number" ? 'step="any"' : ""}>${hint}</label>`;
  }
  const SEP = "§";
  const getAt = (o, p) => p.split(SEP).reduce((a, k) => (a == null ? a : a[k]), o);
  const setAt = (o, p, v) => { const ks = p.split(SEP); let a = o; ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
  const form = (path, fields, obj) => fields.map((f) => fieldHTML(path, f, obj ? obj[f[0]] : getAt(D, `${path}§${f[0]}`))).join("");

  // fields whose change needs the shop to re-render (it reads them at start-up)
  const NEEDS_RELOAD = /^(settings|brands|products|productEdits|pages|assistant)\b/;
  function bindForm(scope) {
    scope.querySelectorAll("[data-k]").forEach((el) => {
      const ev = el.type === "checkbox" || el.tagName === "SELECT" || el.type === "color" ? "change" : "change";
      el.addEventListener(ev, () => {
        const k = el.dataset.k; let v = el.type === "checkbox" ? el.checked : el.value;
        if (el.dataset.list) v = el.value.split("\n").map((x) => x.trim()).filter(Boolean);
        if (el.type === "number") v = el.value === "" ? "" : +el.value;
        change((n) => setAt(n, k, v), { reload: NEEDS_RELOAD.test(k) && !k.startsWith("sections") });
      });
    });
    scope.querySelectorAll("[data-clear]").forEach((b) => b.onclick = () => change((n) => setAt(n, b.dataset.clear, ""), { reload: NEEDS_RELOAD.test(b.dataset.clear) }));
    scope.querySelectorAll("[data-up]").forEach((inp) => inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const url = await readImage(f); change((n) => setAt(n, inp.dataset.up, url), { reload: NEEDS_RELOAD.test(inp.dataset.up) }); });
    scope.querySelectorAll("[data-upmany]").forEach((inp) => inp.onchange = async () => { const urls = []; for (const f of inp.files) urls.push(await readImage(f)); change((n) => setAt(n, inp.dataset.upmany, [...(getAt(n, inp.dataset.upmany) || []), ...urls]), { reload: NEEDS_RELOAD.test(inp.dataset.upmany) }); });
    scope.querySelectorAll("[data-addurl]").forEach((inp) => inp.onkeydown = (e) => { if (e.key !== "Enter" || !inp.value.trim()) return; e.preventDefault(); const k = inp.dataset.addurl; change((n) => setAt(n, k, [...(getAt(n, k) || []), inp.value.trim()]), { reload: NEEDS_RELOAD.test(k) }); });
    scope.querySelectorAll("[data-rmimg]").forEach((b) => b.onclick = () => { const k = b.dataset.rmimg; change((n) => { const a = getAt(n, k) || []; a.splice(+b.dataset.i, 1); setAt(n, k, a); }, { reload: NEEDS_RELOAD.test(k) }); });
  }

  /* ---------- section library ---------- */
  const SRC = [["new", "New in"], ["sale", "On sale (biggest discount first)"], ["label", "Malabisy Label"], ["brand", "One brand"], ["dept", "Department"], ["search", "Products matching words"], ["handles", "Hand-picked products"]];
  const TYPES = {
    hero: { name: "Banner", desc: "Big image with title and buttons", fields: [["image", "Image", "image"], ["layout", "Layout", "select", { options: [["overlay", "Text on the image"], ["split", "Image beside text"]] }], ["tone", "Colour", "select", { options: [["dark", "Dark"], ["light", "Light"]] }], ["kicker", "Small label"], ["title", "Title"], ["text", "Text", "textarea"], ["button", "Button text"], ["link", "Button link", "text", { ph: "marketplace.html?sale=1" }], ["button2", "Second button text"], ["link2", "Second button link"]] },
    text: { name: "Text", desc: "Title, paragraph and a button", fields: [["kicker", "Small label"], ["title", "Title"], ["text", "Text", "textarea", { hint: "**bold** works. New lines are kept." }], ["align", "Align", "select", { options: [["left", "Left"], ["center", "Centre"]] }], ["button", "Button text"], ["link", "Button link"]] },
    imagetext: { name: "Image with text", desc: "Image on one side, copy on the other", fields: [["image", "Image", "image"], ["side", "Image side", "select", { options: [["left", "Left"], ["right", "Right"]] }], ["kicker", "Small label"], ["title", "Title"], ["text", "Text", "textarea"], ["button", "Button text"], ["link", "Button link"]] },
    products: { name: "Product grid", desc: "Live products by brand, category, sale…", fields: [["kicker", "Small label"], ["title", "Title"], ["source", "Show", "select", { options: SRC }], ["brand", "Brand (for “One brand”)", "select", { options: () => API.brands().map((b) => [b.name, b.name]) }], ["dept", "Department", "select", { options: [["Clothing", "Clothing"], ["Footwear", "Footwear"], ["Bags", "Bags"], ["Accessories", "Accessories"], ["Homewear", "Homewear"]] }], ["query", "Words (for “matching words”)", "text", { ph: "leather jacket" }], ["handles", "Products (for “Hand-picked”)", "textarea", { rows: 3, hint: "Product links or handles, one per line. Tip: copy them from the product page address." }], ["max", "Maximum price (LE)", "number"], ["sort", "Sort", "select", { options: [["", "Best match"], ["low", "Price: low to high"], ["high", "Price: high to low"]] }], ["limit", "How many", "number", { def: 8 }], ["cols", "Columns", "select", { options: [["4", "4"], ["3", "3"], ["2", "2"]] }], ["linkLabel", "Link text", "text", { ph: "View all" }], ["link", "Link"]] },
    brands: { name: "Brand logos", desc: "A wall of brands with links", fields: [["title", "Title"], ["list", "Brands", "textarea", { rows: 3, hint: "Leave empty for the biggest brands, or list names separated by commas." }], ["limit", "How many", "number", { def: 12 }]] },
    promo: { name: "Promo strip", desc: "A one-line announcement", fields: [["text", "Text"], ["button", "Link text"], ["link", "Link"], ["tone", "Colour", "select", { options: [["black", "Black"], ["red", "Brand red"], ["grey", "Grey"]] }]] },
    countdown: { name: "Countdown offer", desc: "Timer to the end of a sale", fields: [["kicker", "Small label"], ["title", "Title"], ["text", "Text", "textarea"], ["end", "Ends at", "datetime-local"], ["tone", "Colour", "select", { options: [["dark", "Dark"], ["light", "Light"]] }], ["button", "Button text"], ["link", "Button link"]] },
    faq: { name: "FAQ", desc: "Questions and answers", fields: [["title", "Title"], ["items", "Questions", "textarea", { rows: 8, ph: "How long is delivery? | 2–5 working days.", hint: "One per line: question | answer" }]] },
    gallery: { name: "Image gallery", desc: "A grid of images", fields: [["title", "Title"], ["images", "Images", "images"], ["cols", "Columns", "select", { options: [["3", "3"], ["4", "4"], ["2", "2"]] }]] },
    video: { name: "Video", desc: "YouTube link or video file", fields: [["title", "Title"], ["url", "YouTube or .mp4 link"]] },
    html: { name: "Custom HTML", desc: "Anything else (scripts are removed)", fields: [["html", "HTML", "textarea", { rows: 10 }]] },
    spacer: { name: "Spacer", desc: "Empty space or a divider", fields: [["height", "Height (px)", "number", { def: 40 }], ["line", "Show a line", "check"]] },
  };
  const fieldsOf = (t) => TYPES[t].fields.map((f) => (f[3] && typeof f[3].options === "function" ? [f[0], f[1], f[2], { ...f[3], options: f[3].options() }] : f));

  /* ---------- views ---------- */
  const TABS = [["page", "This page", "M4 5h16M4 12h16M4 19h10"], ["theme", "Theme", "M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.6 0-1.3-1-1.4-1-2.4 0-.9.7-1.5 1.6-1.5H16a5 5 0 005-5c0-4-4-7.5-9-7.5z"], ["chrome", "Header & footer", "M3 5h18v4H3zM3 15h18v4H3z"], ["pages", "Pages", "M6 3h9l4 4v14H6zM14 3v5h5"], ["catalog", "Brands & products", "M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7"], ["assistant", "AI stylist", "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z"], ["checkout", "Checkout", "M3 6h18v12H3zM3 10h18"], ["data", "Data", "M12 3v12M7 10l5 5 5-5M4 21h16"]];
  const root = document.createElement("div");
  root.id = "med-root";
  document.body.appendChild(root);

  function viewPage() {
    const mine = D.sections.map((s, i) => [s, i]).filter(([s]) => s.page === pageKey || s.page === "*");
    const edits = [...D.texts.map((x, i) => ["texts", x, i, `“${x.from.slice(0, 34)}” → “${x.to.slice(0, 34)}”`]), ...D.images.map((x, i) => ["images", x, i, "Image replaced"]), ...D.hidden.map((x, i) => ["hidden", x, i, "Hidden: " + (x.label || x.path).slice(0, 50)])].filter(([, x]) => x.scope === "global" || x.page === pageKey);
    if (sub && sub.startsWith("sec:")) {
      const i = +sub.slice(4), s = D.sections[i]; if (!s) { sub = null; return viewPage(); }
      return `<button class="med-back" data-sub="">← All sections</button><h3 class="med-h">${esc(TYPES[s.type].name)}</h3>
        <div class="med-card">${form(`sections§${i}§data`, fieldsOf(s.type), s.data)}</div>
        <div class="med-card">${form(`sections§${i}`, [["pos", "Position", "select", { options: [["top", "Top of the page"], ["bottom", "Bottom of the page (above the newsletter)"]] }], ["page", "Show on", "select", { options: [[s.page, s.page === "*" ? "Every page" : "This page type (" + pageName + ")"], ["*", "Every page"], ...(s.page !== pageKey ? [[pageKey, "This page type (" + pageName + ")"]] : [])] }], ["scope", "Which pages", "select", { options: [["type", "All pages of this type"], ["url", "Only this exact address"]] }], ["off", "Hide this section for now", "check"]], s)}
        <div class="med-row"><button class="med-btn" data-act="dup" data-i="${i}">Duplicate</button><button class="med-btn med-btn--danger" data-act="del" data-i="${i}">Delete section</button></div></div>`;
    }
    if (sub === "add") return `<button class="med-back" data-sub="">← Back</button><h3 class="med-h">Add a section</h3><p class="med-p">It appears on <b>${esc(pageName)}</b>. You can move it to every page later.</p>
      <div class="med-types">${Object.entries(TYPES).map(([k, t]) => `<button class="med-type" data-addtype="${k}"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join("")}</div>`;
    return `<p class="med-p">Editing <b>${esc(pageName)}</b>. Go to any page of the site and this tab follows you.</p>
      <div class="med-modes"><button class="med-mode ${mode === "edit" ? "on" : ""}" data-mode="edit"><b>Edit on the page</b><span>Click any text to rewrite it, any image to replace it</span></button><button class="med-mode ${mode === "hide" ? "on" : ""}" data-mode="hide"><b>Hide elements</b><span>Click anything on the page to hide it</span></button></div>
      <div class="med-sech"><h3 class="med-h">Sections on this page</h3><button class="med-btn med-btn--dark" data-sub="add">+ Add section</button></div>
      ${mine.length ? `<ol class="med-list">${mine.map(([s, i]) => `<li class="${s.off ? "off" : ""}"><button class="med-list__main" data-sub="sec:${i}"><b>${esc(TYPES[s.type] ? TYPES[s.type].name : s.type)}</b><span>${esc((s.data && (s.data.title || s.data.text)) || "Untitled")} · ${s.pos === "top" ? "top" : "bottom"}${s.page === "*" ? " · every page" : ""}${s.off ? " · hidden" : ""}</span></button><span class="med-list__act"><button data-act="up" data-i="${i}" aria-label="Move up">↑</button><button data-act="down" data-i="${i}" aria-label="Move down">↓</button></span></li>`).join("")}</ol>` : `<p class="med-empty">No added sections yet.</p>`}
      <div class="med-card"><h3 class="med-h">Page title for search engines</h3>${form(`meta§${pageKey}`, [["title", "Title", "text", { ph: document.title }], ["desc", "Description", "textarea", { rows: 3 }]], D.meta[pageKey] || {})}</div>
      <h3 class="med-h">Changes made on the page</h3>
      ${edits.length ? `<ul class="med-edits">${edits.map(([k, x, i, t]) => `<li><span>${esc(t)}<small>${x.scope === "global" ? "Every page" : "This page"}</small></span><button class="med-link" data-revert="${k}" data-i="${i}">Undo</button></li>`).join("")}</ul>` : `<p class="med-empty">Nothing yet. Use “Edit on the page” or “Hide elements”.</p>`}`;
  }
  function viewTheme() {
    return `<div class="med-card"><h3 class="med-h">Colours</h3>${form("theme", [["black", "Main colour (text, buttons, header)", "color", { def: "#0A0A0A" }], ["red", "Accent colour (sale, highlights)", "color", { def: "#DB1215" }], ["bg", "Light panels", "color", { def: "#F6F6F6" }], ["pageBg", "Page background", "color", { def: "#FFFFFF" }]])}</div>
      <div class="med-card"><h3 class="med-h">Typography & shape</h3>${form("theme", [["fontDisplay", "Headings font", "select", { options: [["", "Montserrat (current)"], ["Inter", "Inter"], ["Playfair Display", "Playfair Display"], ["Cormorant Garamond", "Cormorant Garamond"], ["DM Serif Display", "DM Serif Display"], ["Poppins", "Poppins"], ["Archivo", "Archivo"], ["Cairo", "Cairo (Arabic)"], ["Tajawal", "Tajawal (Arabic)"]] }], ["fontBody", "Body font", "select", { options: [["", "Inter (current)"], ["DM Sans", "DM Sans"], ["Poppins", "Poppins"], ["Manrope", "Manrope"], ["Work Sans", "Work Sans"], ["Cairo", "Cairo (Arabic)"], ["IBM Plex Sans Arabic", "IBM Plex Sans Arabic"]] }], ["radius", "Buttons", "select", { options: [["", "Pill (current)"], ["rounded", "Rounded"], ["square", "Square"]] }]])}</div>
      <div class="med-card"><h3 class="med-h">Logo</h3>${form("settings", [["logo", "Logo (header)", "image"], ["logoWhite", "Logo (footer, on black)", "image"]])}</div>
      <div class="med-card"><h3 class="med-h">Advanced: custom CSS</h3>${form("theme", [["css", "CSS", "textarea", { rows: 8, ph: ".hdr { background: #fff; }", hint: "Applies to every page. Anything the site looks like can be changed here." }]])}</div>`;
  }
  function viewChrome() {
    const nav = D.settings.nav && D.settings.nav.length ? D.settings.nav : clone(API.settings.NAV_DEFAULT);
    const cols = D.settings.footerCols && D.settings.footerCols.length ? D.settings.footerCols : clone(API.settings.FOOTER_DEFAULT());
    return `<div class="med-card"><h3 class="med-h">Announcement bar</h3>${fieldHTML("settings", ["announce", "Messages (they rotate)", "list", { rows: 4, ph: "Free delivery on orders over LE 3,500" }], D.settings.announce)}</div>
      <div class="med-card"><div class="med-sech"><h3 class="med-h">Main menu</h3><button class="med-btn med-btn--sm" data-act="navadd">+ Link</button></div>
        <ol class="med-rep">${nav.map((n, i) => `<li><div class="med-row2"><input data-nav="${i}" data-f="label" value="${esc(n.label)}" aria-label="Label"><input data-nav="${i}" data-f="href" value="${esc(n.href)}" aria-label="Link"></div><div class="med-row"><label class="med-check"><input type="checkbox" data-nav="${i}" data-f="red" ${n.red ? "checked" : ""}><span>Red</span></label><label class="med-check"><input type="checkbox" data-nav="${i}" data-f="on" ${n.on !== false ? "checked" : ""}><span>Visible</span></label><select data-nav="${i}" data-f="mega" aria-label="Dropdown"><option value="">No dropdown</option>${["Women", "Kids", "brands"].map((m) => `<option value="${m}" ${n.mega === m ? "selected" : ""}>${m === "brands" ? "Brands" : m} dropdown</option>`).join("")}</select><span class="med-list__act"><button data-navmv="${i}" data-d="-1" aria-label="Move up">↑</button><button data-navmv="${i}" data-d="1" aria-label="Move down">↓</button><button data-navrm="${i}" aria-label="Remove">×</button></span></div></li>`).join("")}</ol>
        <small class="med-hint">Custom pages marked “show in menu” are added after these.</small></div>
      <div class="med-card"><h3 class="med-h">Newsletter</h3>${form("settings", [["newsTitle", "Title", "text", { ph: "First to know." }], ["newsText", "Text", "textarea", { rows: 2 }]])}</div>
      <div class="med-card"><div class="med-sech"><h3 class="med-h">Footer columns</h3><button class="med-btn med-btn--sm" data-act="coladd">+ Column</button></div>
        <ol class="med-rep">${cols.map((c, i) => `<li><div class="med-row2"><input data-col="${i}" data-f="title" value="${esc(c.title)}" aria-label="Column title"><label class="med-check"><input type="checkbox" data-col="${i}" data-f="on" ${c.on !== false ? "checked" : ""}><span>Visible</span></label></div>${c.auto ? `<small class="med-hint">Filled automatically with 5 brands.</small>` : `<textarea rows="4" data-col="${i}" data-f="links" aria-label="Links">${esc((c.links || []).map((l) => `${l.label} | ${l.href}`).join("\n"))}</textarea><small class="med-hint">One per line: label | link</small>`}<span class="med-list__act"><button data-colmv="${i}" data-d="-1">↑</button><button data-colmv="${i}" data-d="1">↓</button><button data-colrm="${i}">×</button></span></li>`).join("")}</ol></div>
      <div class="med-card"><h3 class="med-h">Footer text</h3>${form("settings", [["footerText", "About text", "textarea", { rows: 3 }], ["footerPay", "Payment badges", "list", { rows: 4 }], ["copyright", "Copyright line", "text", { ph: "© 2026 Malabisy. All rights reserved." }]])}</div>`;
  }
  function viewPages() {
    return `<p class="med-p">Create new pages and build them from sections. Each page gets its own address.</p>
      <div class="med-card"><h3 class="med-h">New page</h3><label class="med-f"><span>Page title</span><input id="med-np" placeholder="e.g. Ramadan Edit"></label><label class="med-check"><input type="checkbox" id="med-npnav" checked><span>Show in the main menu</span></label><button class="med-btn med-btn--dark" data-act="pageadd">Create page</button></div>
      ${D.pages.length ? `<ol class="med-list">${D.pages.map((p, i) => `<li><a class="med-list__main" href="page.html?p=${encodeURIComponent(p.slug)}"><b>${esc(p.title)}</b><span>page.html?p=${esc(p.slug)}${p.nav ? " · in menu" : ""}</span></a><span class="med-list__act"><button data-pgnav="${i}" title="Show or hide in menu">${p.nav ? "Menu ✓" : "Menu"}</button><button data-pgrm="${i}" aria-label="Delete page">×</button></span></li>`).join("")}</ol>` : `<p class="med-empty">No custom pages yet.</p>`}
      <div class="med-card"><h3 class="med-h">Built-in pages</h3><ul class="med-links">${Object.entries({ "index.html": "Home", "malabisy.html": "Malabisy Label", "marketplace.html": "Marketplace", "brands.html": "Brands A–Z", "brand.html?b=kava": "Brand page", "product.html": "Product page", "bag.html": "Checkout", "account.html": "My account", "sell.html": "Sell on Malabisy" }).map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul><small class="med-hint">Open a page, then use “This page” to add sections or edit its content.</small></div>`;
  }
  function viewCatalog() {
    if (sub && sub.startsWith("brand:")) {
      const name = sub.slice(6), b = D.brands[name] || {};
      return `<button class="med-back" data-sub="">← Brands & products</button><h3 class="med-h">${esc(name)}</h3>
        <div class="med-card">${form(`brands§${name}`, [["logo", "Logo", "image"], ["about", "About the brand (shown on its page)", "textarea", { rows: 4 }], ["hidden", "Hide this brand and all its products", "check"]], b)}<a class="med-link" href="${API.brandHref(name)}">Open brand page →</a></div>
        <button class="med-btn med-btn--dark" data-act="prodnew" data-brand="${esc(name)}">+ Add a product to ${esc(name)}</button>`;
    }
    if (sub && (sub.startsWith("prod:") || sub.startsWith("new:"))) {
      const isNew = sub.startsWith("new:"), h = sub.slice(isNew ? 4 : 5);
      if (isNew) {
        const i = D.products.findIndex((p) => p.h === h); const p = D.products[i]; if (!p) { sub = null; return viewCatalog(); }
        return `<button class="med-back" data-sub="">← Brands & products</button><h3 class="med-h">${esc(p.t || "New product")}</h3>
          <div class="med-card">${form(`products§${i}`, [["t", "Title"], ["v", "Brand", "text", { hint: "Use an existing brand name, or a new name to create a brand." }], ["p", "Price (LE)", "number"], ["c", "Compare-at price (LE, for a sale)", "number"], ["d", "Department", "select", { options: [["Clothing", "Clothing"], ["Footwear", "Footwear"], ["Bags", "Bags"], ["Accessories", "Accessories"], ["Homewear", "Homewear"]] }], ["g", "For", "select", { options: [["Women", "Women"], ["Kids", "Kids"]] }], ["ty", "Category", "text", { ph: "Jackets, Dresses, Boots…" }], ["s", "Sizes", "list", { rows: 2, ph: "S\nM\nL" }], ["a", "Sizes in stock", "list", { rows: 2, hint: "Leave empty if every size is in stock." }], ["k", "Colours", "list", { rows: 2 }], ["i", "Images", "images"], ["b", "Description", "textarea", { rows: 4 }], ["n", "Mark as new", "check"]], p)}</div>
          <div class="med-row"><a class="med-btn" href="product.html?h=${encodeURIComponent(p.h)}">Open product page</a><button class="med-btn med-btn--danger" data-act="prodrm" data-h="${esc(p.h)}">Delete product</button></div>`;
      }
      const r = API.byHandle(h) || {}; const e = D.productEdits[h] || {};
      return `<button class="med-back" data-sub="">← Brands & products</button><h3 class="med-h">${esc(r.t || h)}</h3><p class="med-p">${esc(r.v || "")} · now ${API.money(r.p || 0)}</p>
        <div class="med-card">${form(`productEdits§${h}`, [["t", "Title", "text", { ph: r.t }], ["p", "Price (LE)", "number", { ph: r.p }], ["c", "Compare-at price (LE)", "number", { ph: r.c || "" }], ["a", "Sizes in stock", "list", { rows: 3, ph: (r.a || []).join("\n") }], ["i", "Replace images", "images"], ["n", "Mark as new", "check"], ["hidden", "Hide this product", "check"]], e)}</div>
        <a class="med-btn" href="product.html?h=${encodeURIComponent(h)}">Open product page</a>`;
    }
    const q = (root.querySelector("#med-q") || {}).value || "";
    return `<div class="med-row"><button class="med-btn med-btn--dark" data-act="prodnew">+ Add product</button><button class="med-btn" data-act="brandnew">+ Add brand</button></div>
      <label class="med-f"><span>Find a product or brand</span><input id="med-q" value="${esc(q)}" placeholder="Name, brand…" autocomplete="off"></label>
      <div id="med-qres">${catalogResults(q)}</div>
      ${D.products.length ? `<h3 class="med-h">Products you added</h3><ol class="med-list">${D.products.map((p) => `<li><button class="med-list__main" data-sub="new:${esc(p.h)}"><b>${esc(p.t || "Untitled")}</b><span>${esc(p.v)} · ${API.money(+p.p || 0)}</span></button></li>`).join("")}</ol>` : ""}
      <h3 class="med-h">Brands</h3><ol class="med-list med-list--brands">${API.brands().map((b) => `<li><button class="med-list__main" data-sub="brand:${esc(b.name)}"><b>${esc(b.name)}</b><span>${b.count} products${D.brands[b.name] && D.brands[b.name].logo ? " · logo" : ""}</span></button></li>`).join("")}${Object.entries(D.brands).filter(([n, b]) => b.hidden && !API.brands().some((x) => x.name === n)).map(([n]) => `<li class="off"><button class="med-list__main" data-sub="brand:${esc(n)}"><b>${esc(n)}</b><span>Hidden</span></button></li>`).join("")}</ol>`;
  }
  function catalogResults(q) {
    q = q.trim().toLowerCase(); if (q.length < 2) return "";
    const rows = API.catalog.filter((r) => (r.t + " " + r.v).toLowerCase().includes(q)).slice(0, 12);
    const hid = Object.entries(D.productEdits).filter(([, e]) => e.hidden).map(([h]) => h);
    return `<ol class="med-list">${rows.map((r) => `<li><button class="med-list__main" data-sub="prod:${esc(r.h)}"><img src="${API.img(r.i[0], 120)}" alt=""><span class="med-list__t"><b>${esc(r.t)}</b><span>${esc(r.v)} · ${API.money(r.p)}</span></span></button></li>`).join("")}${hid.length ? hid.slice(0, 5).map((h) => `<li class="off"><button class="med-list__main" data-sub="prod:${esc(h)}"><b>${esc(h)}</b><span>Hidden product</span></button></li>`).join("") : ""}</ol>${rows.length ? "" : `<p class="med-empty">No product matches.</p>`}`;
  }
  function viewAssistant() {
    const a = D.assistant;
    return `<div class="med-card">${form("assistant", [["off", "Turn the AI stylist off", "check"], ["name", "Name", "text", { ph: "Malabisy Stylist" }], ["subtitle", "Subtitle", "text", { ph: "Personal shopping assistant" }], ["launcher", "Button title", "text", { ph: "AI Stylist" }], ["launcherSub", "Button subtitle", "text", { ph: "Outfits, colours & sizes" }], ["greeting", "First message", "textarea", { rows: 3 }], ["chips", "Suggested questions", "list", { rows: 4, ph: "Office look under LE 2,000" }]], a)}</div>
      <div class="med-card"><div class="med-sech"><h3 class="med-h">Teach it answers</h3><button class="med-btn med-btn--sm" data-act="qaadd">+ Answer</button></div><p class="med-p">When a message contains one of the words, the stylist replies with your answer. Works in English, Arabic and Franco.</p>
        <ol class="med-rep">${(a.qa || []).map((x, i) => `<li>${form(`assistant§qa§${i}`, [["keys", "Words or phrases (comma separated)", "text", { ph: "gift wrap, تغليف, taghlif" }], ["answer", "Answer", "textarea", { rows: 3 }]], x)}<span class="med-list__act"><button data-qarm="${i}" aria-label="Remove">×</button></span></li>`).join("")}</ol></div>
      <p class="med-hint">Delivery, exchange and payment answers follow the Checkout tab automatically.</p>`;
  }
  function viewCheckout() {
    const pays = D.settings.payments && D.settings.payments.length ? D.settings.payments : clone(API.settings.PAYMENTS);
    return `<div class="med-card"><h3 class="med-h">Delivery</h3>${form("settings", [["freeOver", "Free delivery from (LE)", "number", { ph: "3500" }], ["deliveryFee", "Delivery fee (LE)", "number", { ph: "70" }], ["deliveryDays", "Delivery time (working days)", "text", { ph: "2–5" }], ["exchangeDays", "Exchange window (days)", "number", { ph: "14" }]])}</div>
      <div class="med-card"><div class="med-sech"><h3 class="med-h">Payment methods</h3><button class="med-btn med-btn--sm" data-act="payadd">+ Method</button></div>
        <ol class="med-rep">${pays.map((p, i) => `<li><div class="med-row2"><input data-pay="${i}" data-f="name" value="${esc(p.name)}" aria-label="Name"><label class="med-check"><input type="checkbox" data-pay="${i}" data-f="on" ${p.on !== false ? "checked" : ""}><span>On</span></label></div><input data-pay="${i}" data-f="note" value="${esc(p.note || "")}" aria-label="Note"><span class="med-list__act"><button data-paymv="${i}" data-d="-1">↑</button><button data-paymv="${i}" data-d="1">↓</button><button data-payrm="${i}">×</button></span></li>`).join("")}</ol></div>`;
  }
  function viewData() {
    const size = new Blob([JSON.stringify(D)]).size;
    return `<div class="med-card"><h3 class="med-h">Where changes are saved</h3><p class="med-p">This prototype has no server, so changes are saved <b>in this browser</b> (${(size / 1024).toFixed(1)} KB used). Export them to move them to another browser or to hand them to a developer to publish.</p>
        <div class="med-row"><button class="med-btn med-btn--dark" data-act="export">Export site data</button><label class="med-btn">Import<input type="file" accept="application/json" id="med-imp" hidden></label></div></div>
      <div class="med-card"><h3 class="med-h">Start over</h3><p class="med-p">Removes every change and brings back the original site.</p><button class="med-btn med-btn--danger" data-act="reset">Reset all changes</button></div>`;
  }

  /* ---------- shell ---------- */
  function render() {
    if (sub && sub.startsWith("sec:") && !D.sections[+sub.slice(4)]) sub = null;
    const views = { page: viewPage, theme: viewTheme, chrome: viewChrome, pages: viewPages, catalog: viewCatalog, assistant: viewAssistant, checkout: viewCheckout, data: viewData };
    const scrollTop = root.querySelector(".med-body") ? root.querySelector(".med-body").scrollTop : 0;
    root.innerHTML = `<aside class="med-panel" role="dialog" aria-label="Site editor">
      <header class="med-hd"><div><b>Site editor</b><span>${esc(pageName)}</span></div><div class="med-hd__act"><a href="admin.html#content" title="Back to the dashboard" aria-label="Back to the dashboard" class="med-hd__dash"><svg viewBox="0 0 24 24"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/></svg></a><button data-act="undo" title="Undo" aria-label="Undo"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"/></svg></button><button data-act="preview" title="Preview on phone, tablet or desktop" aria-label="Preview"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg></button><button data-act="close" title="Close editor" aria-label="Close editor"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></header>
      <nav class="med-tabs">${TABS.map(([k, t, d]) => `<button class="${tab === k ? "on" : ""}" data-tab="${k}" title="${esc(t)}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg><span>${esc(t)}</span></button>`).join("")}</nav>
      <div class="med-body">${pending ? `<div class="med-pending"><span>Saved. Some of these changes appear after a refresh.</span><button class="med-btn med-btn--dark med-btn--sm" data-act="refresh">Refresh now</button></div>` : ""}${views[tab]()}</div>
      <div class="med-flash" role="status"></div></aside>`;
    root.querySelector(".med-body").scrollTop = scrollTop;
    bindForm(root); bindShell();
    document.body.classList.toggle("med-editing", mode === "edit");
    document.body.classList.toggle("med-hiding", mode === "hide");
  }
  function bindShell() {
    const $$ = (s) => root.querySelectorAll(s);
    $$("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; sub = null; remember(); if (pending) return refresh(); render(); });
    $$("[data-sub]").forEach((b) => b.onclick = () => { sub = b.dataset.sub || null; remember(); if (pending) return refresh(); render(); root.querySelector(".med-body").scrollTop = 0; });
    $$("[data-mode]").forEach((b) => b.onclick = () => { mode = mode === b.dataset.mode ? null : b.dataset.mode; render(); flash(mode === "edit" ? "Click text or an image on the page" : mode === "hide" ? "Click anything on the page to hide it" : "Done"); });
    $$("[data-addtype]").forEach((b) => b.onclick = () => { const t = b.dataset.addtype; const data = {}; TYPES[t].fields.forEach((f) => { if (f[3] && f[3].def !== undefined) data[f[0]] = f[3].def; }); if (t === "hero") Object.assign(data, { title: "New banner", text: "Write something here.", button: "Shop now", link: "marketplace.html", tone: "dark", layout: "overlay", image: "https://malabisy.com/cdn/shop/files/Malabisy_Winter_27_Campaign.png?width=1000&height=940&crop=left" }); if (t === "text") data.title = "New text section"; if (t === "products") Object.assign(data, { title: "New in", source: "new", limit: 8, cols: "4" }); if (t === "promo") Object.assign(data, { text: "Free delivery on orders over " + API.money(API.settings.FREE), tone: "black" }); if (t === "countdown") Object.assign(data, { title: "The offer ends soon", end: new Date(Date.now() + 3 * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), tone: "dark", button: "Shop the sale", link: "marketplace.html?sale=1" }); if (t === "faq") Object.assign(data, { title: "Questions", items: `How long is delivery? | ${API.settings.DAYS} working days.\nCan I exchange? | Yes, within ${API.settings.EXCH} days in original condition.` });
      const n = clone(D); n.sections.push({ id: uid(), type: t, page: pageKey, scope: "type", url: urlKey, pos: CMS.ctx.page === "custom" ? "top" : "bottom", data }); const i = n.sections.length - 1; sub = "sec:" + i; commit(n, { msg: "Section added" }); setTimeout(() => { const el = document.querySelector(`[data-sid="${n.sections[i].id}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); });
    $$("[data-act]").forEach((b) => b.onclick = () => act(b.dataset.act, b));
    $$("[data-revert]").forEach((b) => b.onclick = () => change((n) => n[b.dataset.revert].splice(+b.dataset.i, 1), { hard: true }));
    // menu, footer, payment repeaters
    const rep = (attr, path, getList) => {
      $$(`[data-${attr}]`).forEach((el) => el.onchange = () => change((n) => { const list = getList(n); const it = list[+el.dataset[attr]]; const f = el.dataset.f; if (f === "links") it.links = el.value.split("\n").map((l) => l.split("|")).filter((x) => x[0].trim()).map(([l, h]) => ({ label: l.trim(), href: (h || "#").trim() })); else it[f] = el.type === "checkbox" ? el.checked : el.value; setAt(n, path, list); }, { reload: true }));
      $$(`[data-${attr}mv]`).forEach((el) => el.onclick = () => change((n) => { const list = getList(n), i = +el.dataset[attr + "mv"], j = i + +el.dataset.d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; setAt(n, path, list); }, { reload: true }));
      $$(`[data-${attr}rm]`).forEach((el) => el.onclick = () => change((n) => { const list = getList(n); list.splice(+el.dataset[attr + "rm"], 1); setAt(n, path, list); }, { reload: true }));
    };
    rep("nav", "settings§nav", (n) => (n.settings.nav && n.settings.nav.length ? n.settings.nav : clone(API.settings.NAV_DEFAULT)));
    rep("col", "settings§footerCols", (n) => (n.settings.footerCols && n.settings.footerCols.length ? n.settings.footerCols : clone(API.settings.FOOTER_DEFAULT())));
    rep("pay", "settings§payments", (n) => (n.settings.payments && n.settings.payments.length ? n.settings.payments : clone(API.settings.PAYMENTS)));
    $$("[data-qarm]").forEach((b) => b.onclick = () => change((n) => n.assistant.qa.splice(+b.dataset.qarm, 1), { reload: true }));
    $$("[data-pgrm]").forEach((b) => b.onclick = () => { const p = D.pages[+b.dataset.pgrm]; if (!confirm(`Delete the page “${p.title}” and its sections?`)) return; change((n) => { n.pages.splice(+b.dataset.pgrm, 1); n.sections = n.sections.filter((s) => s.page !== "custom:" + p.slug); }, { hard: true }); });
    $$("[data-pgnav]").forEach((b) => b.onclick = () => change((n) => { const p = n.pages[+b.dataset.pgnav]; p.nav = !p.nav; }, { reload: true }));
    const q = root.querySelector("#med-q"); if (q) q.oninput = () => { root.querySelector("#med-qres").innerHTML = catalogResults(q.value); root.querySelectorAll("#med-qres [data-sub]").forEach((b) => b.onclick = () => { sub = b.dataset.sub; render(); }); };
    const imp = root.querySelector("#med-imp"); if (imp) imp.onchange = async () => { try { const j = JSON.parse(await imp.files[0].text()); if (!j || typeof j !== "object" || !("sections" in j)) throw 0; commit(Object.assign(ST.empty(), j), { hard: true }); } catch { alert("That file is not site data exported from this editor."); } };
  }
  function act(a, b) {
    if (a === "close") { if (pending) { sessionStorage.removeItem("med_open"); return refresh(); } return close(); }
    if (a === "refresh") return refresh();
    if (a === "undo") return doUndo();
    if (a === "preview") return preview();
    if (a === "up" || a === "down") return change((n) => { const i = +b.dataset.i, same = n.sections.map((s, k) => [s, k]).filter(([s]) => s.page === n.sections[i].page || s.page === "*").map(([, k]) => k), p = same.indexOf(i), j = same[p + (a === "up" ? -1 : 1)]; if (j === undefined) return; [n.sections[i], n.sections[j]] = [n.sections[j], n.sections[i]]; });
    if (a === "del") { if (!confirm("Delete this section?")) return; sub = null; return change((n) => n.sections.splice(+b.dataset.i, 1)); }
    if (a === "dup") return change((n) => { const s = clone(n.sections[+b.dataset.i]); s.id = uid(); n.sections.splice(+b.dataset.i + 1, 0, s); });
    if (a === "navadd") return change((n) => { n.settings.nav = (n.settings.nav && n.settings.nav.length ? n.settings.nav : clone(API.settings.NAV_DEFAULT)); n.settings.nav.push({ label: "New link", href: "marketplace.html" }); }, { reload: true });
    if (a === "coladd") return change((n) => { n.settings.footerCols = (n.settings.footerCols && n.settings.footerCols.length ? n.settings.footerCols : clone(API.settings.FOOTER_DEFAULT())); n.settings.footerCols.push({ title: "New column", links: [{ label: "Link", href: "#" }] }); }, { reload: true });
    if (a === "payadd") return change((n) => { n.settings.payments = (n.settings.payments && n.settings.payments.length ? n.settings.payments : clone(API.settings.PAYMENTS)); n.settings.payments.push({ name: "New method", note: "", on: true }); }, { reload: true });
    if (a === "qaadd") return change((n) => { n.assistant.qa = n.assistant.qa || []; n.assistant.qa.push({ keys: "", answer: "" }); });
    if (a === "pageadd") { const t = root.querySelector("#med-np").value.trim(); if (!t) return root.querySelector("#med-np").focus(); let s = slug(t) || "page"; while (D.pages.some((p) => p.slug === s)) s += "-2"; const nav = root.querySelector("#med-npnav").checked; const n = clone(D); n.pages.push({ slug: s, title: t, nav }); n.sections.push({ id: uid(), type: "hero", page: "custom:" + s, scope: "type", pos: "top", data: { title: t, text: "Describe this page.", tone: "light", layout: "split", button: "Shop now", link: "marketplace.html" } }); ST.save(n); sessionStorage.setItem("med_tab", "page"); location.href = "page.html?p=" + encodeURIComponent(s); return; }
    if (a === "brandnew") { const name = (prompt("Brand name") || "").trim(); if (!name) return; sub = "brand:" + name; return change((n) => { n.brands[name] = n.brands[name] || {}; }); }
    if (a === "prodnew") { const brand = b.dataset.brand || (API.brands().find((x) => x.name === "Malabisy") ? "Malabisy" : ""); const h = "cms-" + uid(); sub = "new:" + h; return change((n) => n.products.push({ h, t: "New product", v: brand, p: 999, c: "", d: "Clothing", g: "Women", ty: "", s: ["S", "M", "L"], a: [], k: [], i: [], b: "", n: true }), { msg: "Product created. Fill it in, then open its page." }); }
    if (a === "prodrm") { if (!confirm("Delete this product?")) return; sub = null; return change((n) => { n.products = n.products.filter((p) => p.h !== b.dataset.h); }, { hard: true }); }
    if (a === "export") { const url = URL.createObjectURL(new Blob([JSON.stringify(D, null, 1)], { type: "application/json" })); const l = document.createElement("a"); l.href = url; l.download = "site-data-" + new Date().toISOString().slice(0, 10) + ".json"; l.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return; }
    if (a === "reset") { if (!confirm("Remove every change and restore the original site? This cannot be undone (export first if you want a copy).")) return; localStorage.removeItem(ST.KEY); sessionStorage.removeItem("med_undo"); location.reload(); }
  }

  /* ---------- on-page editing ---------- */
  const isEditor = (el) => el.closest("#med-root, #cms-editbtn, .med-pop, .med-prev");
  const scopeOf = (el) => (el.closest("header, .announce, footer, .news, .mnav, #mst-root") ? "global" : "page");
  const TEXT_OK = (el) => el && el.childElementCount === [...el.children].filter((c) => /^(B|STRONG|I|EM|SPAN|BR|SMALL|S|U)$/.test(c.tagName)).length && el.textContent.trim().length > 0 && !/^(INPUT|TEXTAREA|SELECT|svg|path)$/i.test(el.tagName);
  function cssPath(el) {
    const parts = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id && !/^(app)$/.test(e.id)) { parts.unshift("#" + CSS.escape(e.id)); break; }
      let i = 1; for (let s = e.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === e.tagName) i++;
      parts.unshift(`${e.tagName.toLowerCase()}:nth-of-type(${i})`);
    }
    return (parts[0] && parts[0].startsWith("#") ? "" : "body > ") + parts.join(" > ");
  }
  let hoverEl = null;
  const outline = document.createElement("div"); outline.className = "med-outline"; document.body.appendChild(outline);
  document.addEventListener("mousemove", (e) => {
    if (!mode) { outline.style.display = "none"; return; }
    let t = e.target; if (!t || isEditor(t)) { outline.style.display = "none"; return; }
    if (mode === "edit") { if (t.tagName !== "IMG") { while (t && !TEXT_OK(t)) t = t.parentElement; } }
    if (!t || t === document.body) { outline.style.display = "none"; return; }
    hoverEl = t; const r = t.getBoundingClientRect();
    Object.assign(outline.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    outline.dataset.label = mode === "hide" ? "Hide " + t.tagName.toLowerCase() : t.tagName === "IMG" ? "Replace image" : "Edit text";
  }, true);
  document.addEventListener("click", (e) => {
    if (!mode || isEditor(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    const t = hoverEl; if (!t) return;
    if (mode === "hide") {
      const path = cssPath(t), label = (t.textContent || t.getAttribute("alt") || t.tagName).trim().replace(/\s+/g, " ").slice(0, 60);
      return change((n) => n.hidden.push({ id: uid(), path, label, scope: scopeOf(t), page: pageKey }), { msg: "Hidden. Undo it from “Changes made on the page”." });
    }
    if (t.tagName === "IMG") return imagePop(t);
    textEdit(t);
  }, true);
  function textEdit(el) {
    if (el.isContentEditable) return;
    const before = el.textContent; const from = (D.texts.find((x) => x.to.replace(/\s+/g, " ").trim() === before.replace(/\s+/g, " ").trim()) || {}).from || before;
    el.contentEditable = "plaintext-only"; if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    el.classList.add("med-live"); el.focus();
    const range = document.createRange(); range.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    const done = (save) => {
      el.removeAttribute("contenteditable"); el.classList.remove("med-live"); el.removeEventListener("keydown", key); el.removeEventListener("blur", blur);
      const to = el.textContent;
      if (!save || to.trim() === before.trim()) { el.textContent = before; return; }
      change((n) => { n.texts = n.texts.filter((x) => x.from.replace(/\s+/g, " ").trim() !== from.replace(/\s+/g, " ").trim() || (x.scope !== scopeOf(el) && x.page !== pageKey)); n.texts.push({ id: uid(), from: from.replace(/\s+/g, " ").trim(), to: to.trim(), scope: scopeOf(el), page: pageKey }); }, { msg: scopeOf(el) === "global" ? "Saved on every page" : "Saved" });
    };
    const key = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); } if (e.key === "Escape") { e.preventDefault(); done(false); } };
    const blur = () => done(true);
    el.addEventListener("keydown", key); el.addEventListener("blur", blur);
  }
  function imagePop(im) {
    document.querySelectorAll(".med-pop").forEach((p) => p.remove());
    const from = im.dataset.cmsFrom || im.getAttribute("src"), r = im.getBoundingClientRect();
    const pop = document.createElement("div"); pop.className = "med-pop";
    pop.style.left = Math.min(innerWidth - 330, Math.max(10, r.left)) + "px"; pop.style.top = Math.max(10, r.top + 10) + "px";
    pop.innerHTML = `<b>Replace image</b><input type="url" placeholder="Paste an image link"><div class="med-row"><label class="med-btn med-btn--dark">Upload<input type="file" accept="image/*" hidden></label><button class="med-btn" data-x>Cancel</button></div><small class="med-hint">${scopeOf(im) === "global" ? "Changes it on every page" : "Changes it wherever this image appears on this page type"}</small>`;
    document.body.appendChild(pop);
    const apply = (url) => { pop.remove(); change((n) => { n.images = n.images.filter((x) => x.from !== from); n.images.push({ id: uid(), from, to: url, scope: scopeOf(im), page: pageKey }); }, { msg: "Image replaced" }); };
    pop.querySelector("[data-x]").onclick = () => pop.remove();
    pop.querySelector("input[type=url]").onkeydown = (e) => { if (e.key === "Enter" && e.target.value.trim()) apply(e.target.value.trim()); };
    pop.querySelector("input[type=file]").onchange = async (e) => { if (e.target.files[0]) apply(await readImage(e.target.files[0])); };
    pop.querySelector("input[type=url]").focus();
  }

  /* ---------- device preview ---------- */
  function preview() {
    const u = new URL(location.href); u.searchParams.set("med-preview", "1"); u.searchParams.delete("edit");
    const w = document.createElement("div"); w.className = "med-prev";
    w.innerHTML = `<div class="med-prev__bar">${[["390", "Phone"], ["820", "Tablet"], ["1366", "Desktop"]].map(([px, l], i) => `<button data-w="${px}" class="${i ? "" : "on"}">${l}</button>`).join("")}<button data-x>Close preview</button></div><div class="med-prev__stage"><iframe src="${u}" title="Preview" style="width:390px"></iframe></div>`;
    document.body.appendChild(w);
    w.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => { w.querySelectorAll("[data-w]").forEach((x) => x.classList.toggle("on", x === b)); w.querySelector("iframe").style.width = b.dataset.w + "px"; });
    w.querySelector("[data-x]").onclick = () => w.remove();
  }

  /* ---------- open / close ---------- */
  function open() { sessionStorage.setItem("med_open", "1"); document.body.classList.add("med-on"); const b = document.getElementById("cms-editbtn"); if (b) b.hidden = true; render(); }
  function close() { sessionStorage.removeItem("med_open"); sessionStorage.removeItem("med_sub"); mode = null; document.body.classList.remove("med-on", "med-editing", "med-hiding"); root.innerHTML = ""; outline.style.display = "none"; const b = document.getElementById("cms-editbtn"); if (b) b.hidden = false; }
  addEventListener("keydown", (e) => { if (e.key === "Escape" && mode && !document.querySelector(".med-live")) { mode = null; render(); } });
  window.MLB_EDITOR = { open, close };
})();

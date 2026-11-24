/* =========================================================
   STORE DASHBOARD (admin.html)
   Sign-in with roles (Super admin / Admin + per-section permissions), overview with editable widgets,
   orders, customers, discounts, products, brands, content (visual editor), AI stylist, settings,
   team & roles, activity log. Reads/writes the same data as the storefront.
   Prototype: everything lives in this browser (localStorage). A live store needs a server.
   ========================================================= */
(() => {
  const ST = window.MLB_CMS.store, BASE = window.MLB_IMG;
  const RAW = window.MLB_CATALOG.filter((r) => r.p > 0 && r.g !== "Men");
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => new Intl.NumberFormat("en-US").format(Math.round(+n || 0)), money = (n) => "LE " + fmt(n);
  const short = (n) => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(1) + "K" : fmt(n));
  const img = (p, w = 200) => !p ? "assets/logo.png" : /^(https?:|data:|assets\/)/.test(p) ? p : (p.startsWith("P/") ? BASE + "products/" + p.slice(2) : BASE + "files/" + p) + "?width=" + w;
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const dlong = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const dtime = (d) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ago = (d) => { const s = (Date.now() - Date.parse(d)) / 1000; return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min ago" : s < 86400 ? Math.floor(s / 3600) + " h ago" : Math.floor(s / 86400) + " d ago"; };
  const STATUSES = ["Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  const stOf = (o) => (o.status === "Processing" ? "Confirmed" : o.status || "Placed");
  const PAY_DEFAULT = [["Cash on delivery", "Pay in cash or by card when your order arrives"], ["Credit / debit card", "Visa, Mastercard, Meeza — secure payment page"], ["Vodafone Cash", "A payment request is sent to your phone"], ["InstaPay", "Transfer to Malabisy"], ["valU", "Split your payment into instalments"]].map(([name, note]) => ({ name, note, on: true }));
  const app = $("#admin");
  const LS = { get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };

  /* =========================================================
     ACCOUNTS, ROLES, PERMISSIONS
     ========================================================= */
  const SECTIONS = [["dashboard", "Dashboard"], ["orders", "Orders"], ["customers", "Customers"], ["discounts", "Discounts"], ["products", "Products"], ["brands", "Brands"], ["content", "Content & editor"], ["stylist", "AI stylist"], ["settings", "Settings"], ["activity", "Activity log"]];
  const ADMIN_DEFAULT = { dashboard: "view", orders: "edit", customers: "view", discounts: "edit", products: "edit", brands: "edit", content: "none", stylist: "view", settings: "none", activity: "none" };
  // passwords are stored only as salted SHA-256 hashes
  const SEED = [
    { id: "u-super", name: "Super Admin", username: "super.admin", role: "super", salt: "2be060fa75df6890", hash: "fb317dd84f094b1b85d1db29f986d1b520636addb37f6f29c430daa209a8958f", active: true, created: "2026-11-24T09:00:00Z" },
    { id: "u-store", name: "Store Admin", username: "store.admin", role: "admin", perms: ADMIN_DEFAULT, salt: "3eedbb8eb57dd9f2", hash: "78cc3d9e592ed8c03d826f9919d7c3e4162d54f9f425d99e7b5659d4a92676c9", active: true, created: "2026-11-24T09:00:00Z" },
  ];
  const users = () => { let u = LS.get("mlb_admin_users", null); if (!Array.isArray(u) || !u.length) { u = clone(SEED); LS.set("mlb_admin_users", u); } return u; };
  const saveUsers = (u) => LS.set("mlb_admin_users", u);
  const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const session = () => { const s = LS.get("mlb_admin_sess", null); if (!s || s.exp < Date.now()) return null; const u = users().find((x) => x.id === s.uid && x.active); return u ? { ...s, user: u } : null; };
  let ME = null;
  const isSuper = () => ME && ME.role === "super";
  const perm = (sec) => (isSuper() ? "edit" : sec === "team" ? "none" : (ME && ME.perms && ME.perms[sec]) || "none");
  const can = (sec, lvl = "view") => (lvl === "edit" ? perm(sec) === "edit" : perm(sec) !== "none");
  function log(action, target = "") { const l = LS.get("mlb_admin_log", []); l.unshift({ at: new Date().toISOString(), uid: ME ? ME.id : "", name: ME ? ME.name : "System", action, target }); LS.set("mlb_admin_log", l.slice(0, 600)); }

  /* ---------- sign-in ---------- */
  function loginView(msg = "") {
    document.title = "Sign in | MALABISY";
    app.className = "auth";
    app.innerHTML = `<main class="auth__card"><img class="auth__logo" src="assets/logo.png" alt="MALABISY">
      <h1>Sign in to the dashboard</h1><p class="auth__sub">For the store team only.</p>
      <form id="auth" novalidate><label class="ad-f"><span>Username</span><input name="u" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>
        <label class="ad-f"><span>Password</span><span class="auth__pw"><input name="p" type="password" autocomplete="current-password" required><button type="button" id="pw-eye" aria-label="Show password">Show</button></span></label>
        <p class="auth__err" role="alert">${esc(msg)}</p><button class="ad-btn ad-btn--dark ad-btn--block" id="auth-go">Sign in</button></form>
      <a class="auth__back" href="index.html">← Back to the store</a></main>`;
    const f = $("#auth");
    $("#pw-eye").onclick = (e) => { const p = f.p; p.type = p.type === "password" ? "text" : "password"; e.target.textContent = p.type === "password" ? "Show" : "Hide"; e.target.setAttribute("aria-label", p.type === "password" ? "Show password" : "Hide password"); };
    f.u.focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = $(".auth__err"), lock = LS.get("mlb_admin_lock", { n: 0, until: 0 });
      if (lock.until > Date.now()) { err.textContent = `Too many attempts. Try again in ${Math.ceil((lock.until - Date.now()) / 1000)} seconds.`; return; }
      const un = f.u.value.trim().toLowerCase(), pw = f.p.value;
      if (!un || !pw) { err.textContent = "Enter your username and password."; return; }
      $("#auth-go").disabled = true;
      const u = users().find((x) => x.username.toLowerCase() === un && x.active);
      const ok = u && (await sha(u.salt + ":" + pw)) === u.hash;
      $("#auth-go").disabled = false;
      if (!ok) { lock.n++; if (lock.n >= 5) { lock.until = Date.now() + 60000; lock.n = 0; } LS.set("mlb_admin_lock", lock); err.textContent = lock.until > Date.now() ? "Too many attempts. Try again in 60 seconds." : "Username or password is incorrect."; f.p.value = ""; f.p.focus(); return; }
      LS.set("mlb_admin_lock", { n: 0, until: 0 });
      LS.set("mlb_admin_sess", { uid: u.id, at: Date.now(), exp: Date.now() + 8 * 3600e3 });
      const all = users(); all.find((x) => x.id === u.id).last = new Date().toISOString(); saveUsers(all);
      ME = u; log("Signed in"); start();
    };
  }
  function signOut() { log("Signed out"); localStorage.removeItem("mlb_admin_sess"); ME = null; location.hash = ""; loginView(); }

  /* =========================================================
     DATA
     ========================================================= */
  let D = clone(ST.get());
  const save = (msg = "Saved", what) => { ST.save(clone(D)); toast(msg); if (what) log(what[0], what[1]); };
  const orders = () => LS.get("mlb2_orders", []);
  const saveOrders = (o) => LS.set("mlb2_orders", o);
  function products() {
    const out = (D.products || []).filter((p) => p && p.h).map((p) => ({ ...p, p: +p.p || 0, c: +p.c || 0, s: p.s || [], a: p.a && p.a.length ? p.a : p.s || [], i: p.i || [], custom: true }));
    for (const r of RAW) { const e = D.productEdits[r.h] || {}; out.push({ ...r, t: e.t || r.t, p: e.p > 0 ? +e.p : r.p, c: e.c !== undefined && e.c !== "" ? +e.c || 0 : r.c, a: e.a && e.a.length ? e.a : r.a, i: e.i && e.i.length ? e.i : r.i, n: e.n !== undefined ? e.n : r.n, hidden: !!e.hidden }); }
    const hb = new Set(Object.entries(D.brands).filter(([, b]) => b && b.hidden).map(([n]) => n));
    out.forEach((p) => { if (hb.has(p.v)) p.brandHidden = true; });
    return out;
  }
  const brandList = () => { const m = new Map(); products().forEach((p) => { if (!m.has(p.v)) m.set(p.v, { name: p.v, count: 0, live: 0 }); const b = m.get(p.v); b.count++; if (!p.hidden && !p.brandHidden) b.live++; }); return [...m.values()].sort((a, b) => b.count - a.count); };
  const custKey = (o) => (o.address && (o.address.phone || o.address.name)) || "guest";

  /* ---------- sample data (clearly marked, removable) ---------- */
  function sampleOrders(n = 240) {
    let x = 20261124; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const first = ["Nour", "Mariam", "Salma", "Yasmin", "Hana", "Farida", "Malak", "Laila", "Habiba", "Rana", "Nada", "Jana", "Dina", "Aya", "Reem", "Lina", "Mona", "Sara", "Heba", "Karma"];
    const last = ["Adel", "Hassan", "Mostafa", "Samir", "Fathy", "Kamal", "Nabil", "Youssef", "Ibrahim", "Saad", "Gamal", "Tarek", "Ashraf", "Mahmoud", "Ezzat"];
    const gov = [["Cairo", 34, ["Nasr City", "Heliopolis", "Maadi", "New Cairo", "Zamalek", "Mokattam"]], ["Giza", 22, ["Dokki", "Mohandessin", "6th of October", "Sheikh Zayed", "Haram"]], ["Alexandria", 14, ["Smouha", "Sidi Gaber", "Miami", "Roushdy"]], ["Qalyubia", 6, ["Banha", "Shubra El Kheima"]], ["Dakahlia", 6, ["Mansoura"]], ["Sharqia", 5, ["Zagazig"]], ["Gharbia", 5, ["Tanta"]], ["Ismailia", 3, ["Ismailia"]], ["Port Said", 3, ["Port Said"]], ["Assiut", 2, ["Assiut"]]];
    const wgov = () => { let t = rnd() * 100; for (const g of gov) { if ((t -= g[1]) <= 0) return g; } return gov[0]; };
    const pays = [["Cash on delivery", 52], ["Credit / debit card", 22], ["InstaPay", 10], ["Vodafone Cash", 9], ["valU", 7]];
    const wpay = () => { let t = rnd() * 100; for (const p of pays) { if ((t -= p[1]) <= 0) return p[0]; } return pays[0][0]; };
    const pool = products().filter((p) => !p.hidden && !p.brandHidden && (!p.s.length || p.a.length));
    const people = [...Array(150)].map(() => { const g = wgov(); return { name: pick(first) + " " + pick(last), phone: "010" + String(Math.floor(rnd() * 1e8)).padStart(8, "0"), gov: g[0], area: pick(g[2]) }; });
    const out = [];
    for (let i = 0; i < n; i++) {
      const days = Math.floor(Math.pow(rnd(), 1.35) * 120), d = new Date(); d.setDate(d.getDate() - days); d.setHours(9 + Math.floor(rnd() * 14), Math.floor(rnd() * 60));
      const who = rnd() < 0.32 ? people[Math.floor(rnd() * 25)] : pick(people);
      const items = [...Array(1 + Math.floor(Math.pow(rnd(), 2) * 3))].map(() => { const p = pick(pool); return { h: p.h, size: p.a[0] || "One size", qty: rnd() < 0.85 ? 1 : 2, p: p.p, t: p.t, v: p.v }; });
      const sub = items.reduce((a, it) => a + it.p * it.qty, 0), free = num(D.settings.freeOver, 3500), del = sub >= free ? 0 : num(D.settings.deliveryFee, 70);
      const st = days > 6 ? (rnd() < 0.05 ? "Cancelled" : "Delivered") : days > 3 ? pick(["Shipped", "Delivered", "Shipped"]) : days > 1 ? pick(["Confirmed", "Shipped", "Confirmed"]) : pick(["Placed", "Placed", "Confirmed"]);
      out.push({ no: "MLB" + String(700000 + i * 37 + Math.floor(rnd() * 30)), date: d.toISOString(), items, sub, del, total: sub + del, pm: wpay(), status: st, address: { name: who.name, phone: who.phone, gov: who.gov, area: who.area, street: Math.floor(1 + rnd() * 80) + " " + pick(["El Tahrir", "Abbas El Akkad", "Gamet El Dowal", "El Nozha", "Mostafa El Nahas", "El Horreya"]) + " St" }, sample: true });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }
  const num = (v, d) => (v === "" || v === undefined || v === null || isNaN(+v) ? d : +v);

  /* ---------- period ---------- */
  const RANGES = [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 12 months"]];
  const rangeDays = () => +(LS.get("mlb_admin_range_" + ME.id, "30"));
  const inRange = (o, days, offset = 0) => { const t = Date.parse(o.date), end = Date.now() - offset * days * 864e5, start = end - days * 864e5; return t > start && t <= end; };

  /* =========================================================
     UI KIT
     ========================================================= */
  const I = {
    dashboard: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z", orders: "M6 2h12l2 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 7h16M9 11a3 3 0 006 0", customers: "M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a4 4 0 100-8 4 4 0 000 8zM22 19v-1a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8", discounts: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01", products: "M20 7l-8-4-8 4 8 4zM4 7v10l8 4 8-4V7", brands: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", content: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4", stylist: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z", settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z", team: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1", activity: "M3 12h4l3-8 4 16 3-8h4", search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4-4", bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0", ext: "M14 3h7v7M10 14L21 3M21 14v7H3V3h7", up: "M7 14l5-5 5 5", down: "M7 10l5 5 5-5", x: "M6 6l12 12M18 6L6 18", plus: "M12 5v14M5 12h14", dl: "M12 3v12M7 10l5 5 5-5M4 21h16", eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z", grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01", lock: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4",
  };
  const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${I[k] || ""}"/></svg>`;
  let tT; function toast(t) { const el = $(".ad-toast"); if (!el) return; el.textContent = t; el.classList.add("on"); clearTimeout(tT); tT = setTimeout(() => el.classList.remove("on"), 1800); }
  const pill = (s) => `<span class="ad-pill ad-pill--${slug(s)}">${esc(s)}</span>`;
  const card = (title, body, extra = "", cls = "") => `<section class="ad-card ${cls}">${title ? `<div class="ad-card__hd"><h2>${title}</h2>${extra}</div>` : ""}${body}</section>`;
  const empty = (t, a = "") => `<div class="ad-empty"><p>${t}</p>${a}</div>`;
  const delta = (cur, prev) => { if (!prev) return cur ? `<span class="ad-delta up">new</span>` : `<span class="ad-delta">—</span>`; const p = ((cur - prev) / prev) * 100; return `<span class="ad-delta ${p >= 0 ? "up" : "dn"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(1)}%</span>`; };
  const csv = (name, head, rows) => { const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`; const blob = new Blob(["﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click(); };
  const readImage = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL(/png|svg/.test(file.type) ? "image/png" : "image/jpeg", 0.82)); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });

  /* form kit: data-path="a§b" saves on change; read-only when the user may only view this section */
  const SEP = "§";
  const getAt = (o, p) => p.split(SEP).reduce((a, k) => (a == null ? a : a[k]), o);
  const setAt = (o, p, v) => { const ks = p.split(SEP); let a = o; ks.slice(0, -1).forEach((k, i) => { if (a[k] == null || typeof a[k] !== "object") a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
  let SEC = "dashboard";
  function F(path, label, type = "text", o = {}) {
    const ro = !can(SEC, "edit") ? "disabled" : "";
    const v = getAt(D, path) ?? o.def ?? "", id = "f" + uid(), hint = o.hint ? `<small class="ad-hint">${esc(o.hint)}</small>` : "";
    const attrs = `id="${id}" data-path="${esc(path)}" ${o.list ? 'data-list="1"' : ""} ${type === "number" ? 'data-num="1" step="any"' : ""} placeholder="${esc(o.ph ?? "")}" ${ro}`;
    if (type === "switch") return `<label class="ad-switch"><input type="checkbox" role="switch" data-path="${esc(path)}" ${(getAt(D, path) ?? o.def) ? "checked" : ""} ${ro}><span class="ad-switch__ui"></span><span><b>${esc(label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ""}</span></label>`;
    if (type === "check") return `<label class="ad-check"><input type="checkbox" data-path="${esc(path)}" ${v ? "checked" : ""} ${ro}><span>${esc(label)}</span></label>${hint}`;
    if (type === "select") return `<label class="ad-f" for="${id}"><span>${esc(label)}</span><select ${attrs}>${o.options.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${hint}</label>`;
    if (type === "textarea" || o.list) return `<label class="ad-f" for="${id}"><span>${esc(label)}</span><textarea ${attrs} rows="${o.rows || 3}">${esc(o.list ? (v || []).join("\n") : v)}</textarea>${hint || (o.list ? '<small class="ad-hint">One per line</small>' : "")}</label>`;
    if (type === "image") return `<div class="ad-f"><span>${esc(label)}</span><div class="ad-img">${v ? `<img src="${esc(img(v, 300))}" alt="">` : `<span class="ad-img__ph">No image</span>`}<div><input type="url" ${attrs} value="${esc(String(v).startsWith("data:") ? "" : v)}" placeholder="${String(v).startsWith("data:") ? "Uploaded image" : "Paste an image link"}">${ro ? "" : `<div class="ad-row"><label class="ad-btn ad-btn--sm">Upload<input type="file" accept="image/*" data-up="${esc(path)}" hidden></label>${v ? `<button type="button" class="ad-link" data-clear="${esc(path)}">Remove</button>` : ""}</div>`}</div></div>${hint}</div>`;
    if (type === "images") return `<div class="ad-f"><span>${esc(label)}</span><div class="ad-thumbs">${(v || []).map((u, i) => `<span><img src="${esc(img(u, 200))}" alt="">${ro ? "" : `<button type="button" data-rmimg="${esc(path)}" data-i="${i}" aria-label="Remove image">×</button>`}</span>`).join("")}${ro ? "" : `<label class="ad-thumbs__add">+ Upload<input type="file" accept="image/*" multiple data-upmany="${esc(path)}" hidden></label>`}</div>${ro ? "" : `<input type="url" data-addurl="${esc(path)}" placeholder="…or paste an image link and press Enter">`}${hint}</div>`;
    return `<label class="ad-f" for="${id}"><span>${esc(label)}</span><input type="${type}" ${attrs} value="${esc(v)}">${hint}</label>`;
  }
  function bindForms(scope) {
    $$("[data-path]", scope).forEach((el) => el.addEventListener("change", () => {
      if (!can(SEC, "edit")) return;
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.dataset.list) v = el.value.split("\n").map((x) => x.trim()).filter(Boolean);
      if (el.dataset.num) v = el.value === "" ? "" : +el.value;
      setAt(D, el.dataset.path, v);
      const lbl = (el.closest("label, .ad-f") || {}).querySelector ? ((el.closest("label, .ad-f").querySelector("span") || {}).textContent || "") : "";
      save("Saved", ["Changed " + (lbl || el.dataset.path.split(SEP).pop()).toLowerCase(), crumbOf(el.dataset.path)]);
    }));
    $$("[data-clear]", scope).forEach((b) => b.onclick = () => { setAt(D, b.dataset.clear, ""); save("Removed", ["Removed image", crumbOf(b.dataset.clear)]); route(); });
    $$("[data-up]", scope).forEach((i) => i.onchange = async () => { if (!i.files[0]) return; setAt(D, i.dataset.up, await readImage(i.files[0])); save("Image uploaded", ["Uploaded image", crumbOf(i.dataset.up)]); route(); });
    $$("[data-upmany]", scope).forEach((i) => i.onchange = async () => { const a = getAt(D, i.dataset.upmany) || []; for (const f of i.files) a.push(await readImage(f)); setAt(D, i.dataset.upmany, a); save("Images uploaded", ["Uploaded images", crumbOf(i.dataset.upmany)]); route(); });
    $$("[data-addurl]", scope).forEach((i) => i.onkeydown = (e) => { if (e.key !== "Enter" || !i.value.trim()) return; e.preventDefault(); setAt(D, i.dataset.addurl, [...(getAt(D, i.dataset.addurl) || []), i.value.trim()]); save("Image added", ["Added image", crumbOf(i.dataset.addurl)]); route(); });
    $$("[data-rmimg]", scope).forEach((b) => b.onclick = () => { const a = getAt(D, b.dataset.rmimg) || []; a.splice(+b.dataset.i, 1); setAt(D, b.dataset.rmimg, a); save("Image removed", ["Removed image", crumbOf(b.dataset.rmimg)]); route(); });
  }
  const crumbOf = (p) => { const k = p.split(SEP); if (k[0] === "productEdits") return (RAW.find((r) => r.h === k[1]) || {}).t || k[1]; if (k[0] === "products") return ((D.products || [])[+k[1]] || {}).t || "New product"; if (k[0] === "brands") return "Brand: " + k[1]; if (k[0] === "discounts") return "Discount " + (((D.discounts || [])[+k[1]] || {}).code || ""); return { settings: "Settings", assistant: "AI stylist" }[k[0]] || k[0]; };

  /* ---------- floating bulk bar (shared by tables) ---------- */
  function bulkBar(actions, onAct) {
    const bar = document.createElement("div"); bar.className = "ad-bulkbar"; bar.hidden = true;
    bar.innerHTML = `<span class="ad-bulkbar__n">0 selected</span>${actions.map(([k, l, cls]) => `<button type="button" data-ba="${k}" class="${cls || ""}">${l}</button>`).join("")}<button type="button" data-ba="__clear" class="ad-bulkbar__x">Clear</button>`;
    document.body.appendChild(bar);
    const sel = () => $$("[data-sel]:checked").map((c) => c.dataset.sel);
    const upd = () => { const n = sel().length; bar.hidden = !n; $(".ad-bulkbar__n", bar).textContent = n + " selected"; const all = $("#sel-all"); if (all) { const boxes = $$("[data-sel]"); all.checked = n && n === boxes.length; all.indeterminate = n && n < boxes.length; } };
    $$("[data-sel]").forEach((c) => c.addEventListener("change", upd));
    const all = $("#sel-all"); if (all) all.onchange = () => { $$("[data-sel]").forEach((c) => (c.checked = all.checked)); upd(); };
    bar.onclick = (e) => { const b = e.target.closest("[data-ba]"); if (!b) return; if (b.dataset.ba === "__clear") { $$("[data-sel]").forEach((c) => (c.checked = false)); return upd(); } onAct(b.dataset.ba, sel()); };
  }

  /* =========================================================
     SHELL
     ========================================================= */
  const NAV = [["Overview", [["dashboard", "Dashboard"]]], ["Sales", [["orders", "Orders"], ["customers", "Customers"], ["discounts", "Discounts"]]], ["Catalog", [["products", "Products"], ["brands", "Brands"]]], ["Store", [["content", "Content & editor"], ["stylist", "AI stylist"]]], ["Admin", [["team", "Team & roles"], ["activity", "Activity log"], ["settings", "Settings"]]]];
  function alerts() {
    const out = [], os = orders();
    const placed = os.filter((o) => stOf(o) === "Placed"); if (placed.length && can("orders")) out.push(["orders", `${placed.length} order${placed.length > 1 ? "s" : ""} waiting for confirmation`, "#orders?s=Placed"]);
    const sold = products().filter((p) => p.s.length && !p.a.length && !p.hidden); if (sold.length && can("products")) out.push(["products", `${sold.length} product${sold.length > 1 ? "s are" : " is"} sold out`, "#products?f=soldout"]);
    const exp = (D.discounts || []).filter((d) => d.on !== false && d.ends && Date.parse(d.ends) < Date.now() + 2 * 864e5 && Date.parse(d.ends) > Date.now()); if (exp.length && can("discounts")) out.push(["discounts", `${exp.length} discount code${exp.length > 1 ? "s end" : " ends"} within 2 days`, "#discounts"]);
    return out;
  }
  function shell(active, title, actions, body, sub = "") {
    SEC = active;
    const open = orders().filter((o) => stOf(o) === "Placed").length, al = alerts();
    document.title = title.replace(/<[^>]+>/g, "").replace(/←/g, "").replace(/\s+/g, " ").trim() + " | Dashboard";
    app.className = "ad";
    app.innerHTML = `<aside class="ad-side" aria-label="Dashboard"><a class="ad-brand" href="#dashboard"><img src="${esc((D.settings && D.settings.logo) || "assets/logo.png")}" alt="MALABISY"><span>Dashboard</span></a>
      <nav>${NAV.map(([g, items]) => { const vis = items.filter(([k]) => (k === "team" ? isSuper() : can(k))); return vis.length ? `<p class="ad-side__g">${g}</p>${vis.map(([k, t]) => `<a href="#${k}" class="${active === k ? "on" : ""}">${ico(k)}<span>${t}</span>${k === "orders" && open ? `<em>${open}</em>` : ""}${k !== "team" && perm(k) === "view" ? `<i class="ad-ro" title="View only">${ico("eye")}</i>` : ""}</a>`).join("")}` : ""; }).join("")}</nav>
      <div class="ad-me"><span class="ad-av">${esc(ME.name.split(" ").map((x) => x[0]).join("").slice(0, 2))}</span><span><b>${esc(ME.name)}</b><small>${isSuper() ? "Super admin" : "Admin"}</small></span><button type="button" id="me-menu" aria-label="Account menu">⋯</button>
        <div class="ad-menu" id="me-pop" hidden><button data-me="pw">Change password</button><a href="index.html" target="_blank" rel="noopener">View store ↗</a><button data-me="out">Sign out</button></div></div></aside>
      <div class="ad-body"><header class="ad-top"><label class="ad-search">${ico("search")}<input id="ad-q" placeholder="Search orders, products, customers" autocomplete="off"><kbd>/</kbd></label>
        <div class="ad-top__act"><div class="ad-bellwrap"><button class="ad-icon" id="bell" aria-label="Notifications">${ico("bell")}${al.length ? `<em>${al.length}</em>` : ""}</button><div class="ad-menu ad-menu--wide" id="bell-pop" hidden>${al.length ? al.map(([k, t, h]) => `<a href="${h}">${ico(k)}<span>${esc(t)}</span></a>`).join("") : `<p class="ad-muted" style="padding:10px">You’re all caught up.</p>`}</div></div>
        ${can("content", "edit") ? `<a class="ad-btn" href="index.html?edit">${ico("content")}Customize store</a>` : ""}<a class="ad-btn ad-btn--dark" href="index.html" target="_blank" rel="noopener">View store ${ico("ext")}</a></div></header>
      <main class="ad-main"><div class="ad-head"><div><h1>${title}</h1>${sub ? `<p class="ad-sub">${sub}</p>` : ""}</div><div class="ad-row">${actions || ""}</div></div>${body}</main></div><div class="ad-toast" role="status"></div>`;
    $$(".ad-bulkbar").forEach((b) => b.remove());
    bindForms(app);
    const q = $("#ad-q"); q.onkeydown = (e) => { if (e.key === "Enter" && q.value.trim()) { sessionStorage.setItem("ad_q", q.value.trim()); location.hash = "#search"; } };
    const pop = (btn, el) => { $(btn).onclick = (e) => { e.stopPropagation(); const p = $(el); const was = p.hidden; $$(".ad-menu").forEach((m) => (m.hidden = true)); p.hidden = !was; }; };
    pop("#me-menu", "#me-pop"); pop("#bell", "#bell-pop");
    $$("[data-me]").forEach((b) => b.onclick = () => (b.dataset.me === "out" ? signOut() : changePassword()));
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".ad-menu, #me-menu, #bell")) $$(".ad-menu").forEach((m) => (m.hidden = true)); });
  document.addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $("#ad-q")) { e.preventDefault(); $("#ad-q").focus(); } });
  function modal(title, body, onOk, okLabel = "Save") {
    const m = document.createElement("div"); m.className = "ad-modal"; m.innerHTML = `<form class="ad-modal__box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${body}<p class="auth__err" role="alert"></p><div class="ad-row ad-row--end"><button type="button" class="ad-btn" data-x>Cancel</button><button class="ad-btn ad-btn--dark">${esc(okLabel)}</button></div></form>`;
    document.body.appendChild(m); const f = $("form", m); const close = () => m.remove();
    $("[data-x]", m).onclick = close; m.onclick = (e) => { if (e.target === m) close(); }; addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); removeEventListener("keydown", k); } });
    const firstIn = $("input,select,textarea", f); if (firstIn) firstIn.focus();
    f.onsubmit = async (e) => { e.preventDefault(); const r = await onOk(f); if (r === true) close(); else if (r) $(".auth__err", m).textContent = r; };
  }
  function changePassword() {
    modal("Change password", `<label class="ad-f"><span>Current password</span><input name="a" type="password" autocomplete="current-password" required></label><label class="ad-f"><span>New password</span><input name="b" type="password" autocomplete="new-password" minlength="8" required></label><label class="ad-f"><span>Repeat new password</span><input name="c" type="password" autocomplete="new-password" required></label>`, async (f) => {
      if ((await sha(ME.salt + ":" + f.a.value)) !== ME.hash) return "Current password is incorrect.";
      if (f.b.value.length < 8) return "Use at least 8 characters."; if (f.b.value !== f.c.value) return "The new passwords don’t match.";
      const all = users(), u = all.find((x) => x.id === ME.id); u.salt = uid() + uid(); u.hash = await sha(u.salt + ":" + f.b.value); saveUsers(all); ME = u; log("Changed own password"); toast("Password changed"); return true;
    });
  }
  const noAccess = () => shell("", "No access", "", empty(`${ico("lock")}<br>Your account doesn’t have access to this section. Ask the super admin to change your permissions.`, `<a class="ad-btn" href="#dashboard">Back to the dashboard</a>`));
  const notFound = () => shell(SEC, "Not found", "", empty("This item does not exist any more.", `<a class="ad-btn" href="#dashboard">Back to the dashboard</a>`));
  const roBanner = (sec) => (perm(sec) === "view" ? `<div class="ad-note">${ico("eye")} You can view this section but not change it.</div>` : "");

  /* =========================================================
     DASHBOARD with editable widgets
     ========================================================= */
  const WIDGETS = {
    revenue: ["Total sales", "wide"], status: ["Orders by status", ""], weekday: ["Busiest days", ""], best: ["Best-selling products", "wide"], brands: ["Sales by brand", ""], payments: ["Payment methods", ""], regions: ["Top governorates", ""], repeat: ["Repeat customer rate", ""], recent: ["Recent orders", "wide"], alerts: ["Needs attention", ""], codes: ["Discount codes", ""],
  };
  const DEFAULT_LAYOUT = ["revenue", "status", "best", "weekday", "brands", "payments", "repeat", "regions", "recent", "alerts", "codes"];
  const layout = () => { const l = LS.get("mlb_admin_layout_" + ME.id, null); return Array.isArray(l) ? l.filter((k) => WIDGETS[k]) : DEFAULT_LAYOUT.slice(); };
  let editingLayout = false;
  function dashboard() {
    const days = rangeDays(), all = orders(), os = all.filter((o) => stOf(o) !== "Cancelled");
    const cur = os.filter((o) => inRange(o, days)), prev = os.filter((o) => inRange(o, days, 1));
    const sum = (a) => a.reduce((s, o) => s + (+o.total || 0), 0), items = (a) => a.reduce((s, o) => s + o.items.reduce((b, x) => b + x.qty, 0), 0);
    const firstSeen = {}; [...os].sort((a, b) => a.date.localeCompare(b.date)).forEach((o) => { const k = custKey(o); if (!firstSeen[k]) firstSeen[k] = o.date; });
    const newC = (a) => new Set(a.filter((o) => firstSeen[custKey(o)] === o.date).map(custKey)).size;
    const buckets = days <= 30 ? days : days <= 90 ? Math.ceil(days / 7) : 12, step = (days / buckets) * 864e5;
    const series = (a, off) => [...Array(buckets)].map((_, i) => { const end = Date.now() - off * days * 864e5 - (buckets - 1 - i) * step, start = end - step; return a.filter((o) => { const t = Date.parse(o.date); return t > start && t <= end; }); });
    const sC = series(os, 0), sP = series(os, 1);
    const spark = (vals) => { const mx = Math.max(1, ...vals); return `<svg class="ad-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 100},${28 - (v / mx) * 26}`).join(" ")}"/></svg>`; };
    const kpi = (label, val, c, p, sp) => `<div class="ad-kpi"><span>${label}</span><b>${val}</b><div class="ad-kpi__ft">${delta(c, p)}<small>vs previous ${days} days</small></div>${spark(sp)}</div>`;
    const kpis = `<div class="ad-kpis">${kpi("Total sales", money(sum(cur)), sum(cur), sum(prev), sC.map(sum))}${kpi("Orders", fmt(cur.length), cur.length, prev.length, sC.map((a) => a.length))}${kpi("Average order value", money(cur.length ? sum(cur) / cur.length : 0), cur.length ? sum(cur) / cur.length : 0, prev.length ? sum(prev) / prev.length : 0, sC.map((a) => (a.length ? sum(a) / a.length : 0)))}${kpi("New customers", fmt(newC(cur)), newC(cur), newC(prev), sC.map(newC))}</div>`;
    const W = {
      revenue: () => { const c = sC.map(sum), p = sP.map(sum), mx = Math.max(1, ...c, ...p), X = (i) => 40 + (i / Math.max(1, buckets - 1)) * 640, Y = (v) => 200 - (v / mx) * 170; const lbl = (i) => { const d = new Date(Date.now() - (buckets - 1 - i) * step); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
        return `<div class="ad-big"><b>${money(sum(cur))}</b>${delta(sum(cur), sum(prev))}<small>${fmt(items(cur))} items sold</small></div><svg class="ad-line" viewBox="0 0 700 230" role="img" aria-label="Sales over the period compared with the previous period"><g class="grid">${[0, .25, .5, .75, 1].map((f) => `<line x1="40" x2="680" y1="${200 - f * 170}" y2="${200 - f * 170}"/><text x="34" y="${204 - f * 170}" text-anchor="end">${short(mx * f)}</text>`).join("")}</g><path class="area" d="M${X(0)},200 ${c.map((v, i) => `L${X(i)},${Y(v)}`).join(" ")} L${X(buckets - 1)},200Z"/><polyline class="prev" points="${p.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/><polyline class="cur" points="${c.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/>${[0, Math.floor((buckets - 1) / 2), buckets - 1].map((i) => `<text class="x" x="${X(i)}" y="222" text-anchor="middle">${lbl(i)}</text>`).join("")}</svg><div class="ad-legend"><span class="cur">This period</span><span class="prev">Previous period</span></div>`; },
      status: () => { const cs = STATUSES.map((s) => [s, all.filter((o) => inRange(o, days) && stOf(o) === s).length]), tot = cs.reduce((a, x) => a + x[1], 0) || 1, col = { Placed: "#E8B10C", Confirmed: "#3B6FE0", Shipped: "#7A4BE0", Delivered: "#1d9a4a", Cancelled: "#DB1215" }; let a0 = 0; const arcs = cs.filter((x) => x[1]).map(([s, n]) => { const a1 = a0 + (n / tot) * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0, p = (a) => `${60 + 48 * Math.sin(a)},${60 - 48 * Math.cos(a)}`, d = n === tot ? `M60,12 A48,48 0 1,1 59.99,12` : `M${p(a0)} A48,48 0 ${large},1 ${p(a1)}`; a0 = a1; return `<path d="${d}" stroke="${col[s]}"/>`; }).join("");
        return `<div class="ad-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Orders by status">${arcs || '<circle cx="60" cy="60" r="48" stroke="#eee"/>'}<text x="60" y="58" text-anchor="middle" class="n">${fmt(tot === 1 && !cs.some((x) => x[1]) ? 0 : tot)}</text><text x="60" y="74" text-anchor="middle" class="l">orders</text></svg><ul>${cs.map(([s, n]) => `<li><a href="#orders?s=${s}"><i style="background:${col[s]}"></i>${s}<b>${n}</b></a></li>`).join("")}</ul></div>`; },
      weekday: () => { const d = [0, 0, 0, 0, 0, 0, 0]; cur.forEach((o) => d[new Date(o.date).getDay()] += +o.total || 0); const mx = Math.max(1, ...d), top = d.indexOf(Math.max(...d)), n = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; return `<div class="ad-vbars">${d.map((v, i) => `<div class="${i === top && v ? "top" : ""}"><small>${i === top && v ? short(v) : ""}</small><i style="height:${Math.max(6, (v / mx) * 100)}%" title="${n[i]}: ${money(v)}"></i><span>${n[i]}</span></div>`).join("")}</div>`; },
      best: () => { const m = {}; cur.forEach((o) => o.items.forEach((x) => { m[x.h] = m[x.h] || { h: x.h, t: x.t || x.h, v: x.v || "", q: 0, s: 0 }; m[x.h].q += x.qty; m[x.h].s += (x.p || 0) * x.qty; })); const rows = Object.values(m).sort((a, b) => b.s - a.s).slice(0, 6); const P = products();
        return rows.length ? `<table class="ad-table ad-table--flat"><thead><tr><th>#</th><th>Product</th><th>Brand</th><th class="num">Sold</th><th class="num">Revenue</th></tr></thead><tbody>${rows.map((r, i) => { const p = P.find((x) => x.h === r.h); return `<tr data-go="#products/${encodeURIComponent(r.h)}"><td>${i + 1}</td><td><span class="ad-prod"><img src="${esc(img(p && p.i[0], 100))}" alt="">${esc(r.t)}</span></td><td>${esc(r.v)}</td><td class="num">${r.q}</td><td class="num"><b>${money(r.s)}</b></td></tr>`; }).join("")}</tbody></table>` : empty("No sales in this period."); },
      brands: () => { const m = {}; cur.forEach((o) => o.items.forEach((x) => { m[x.v || "—"] = (m[x.v || "—"] || 0) + (x.p || 0) * x.qty; })); const rows = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = rows.length ? rows[0][1] : 1; return rows.length ? `<ul class="ad-hbars">${rows.map(([n, v]) => `<li><span>${esc(n === "Malabisy" ? "Malabisy Label" : n)}</span><i><b style="width:${(v / mx) * 100}%"></b></i><em>${money(v)}</em></li>`).join("")}</ul>` : empty("No sales in this period."); },
      payments: () => { const m = {}; cur.forEach((o) => { const k = o.pm || "Cash on delivery"; m[k] = (m[k] || 0) + 1; }); const rows = Object.entries(m).sort((a, b) => b[1] - a[1]), tot = cur.length || 1, cols = ["#0A0A0A", "#3B6FE0", "#1d9a4a", "#E8B10C", "#DB1215", "#7A4BE0"]; return rows.length ? `<div class="ad-stack">${rows.map(([k, n], i) => `<i style="width:${(n / tot) * 100}%;background:${cols[i % 6]}" title="${esc(k)}"></i>`).join("")}</div><ul class="ad-keys">${rows.map(([k, n], i) => `<li><i style="background:${cols[i % 6]}"></i>${esc(k)}<b>${Math.round((n / tot) * 100)}%</b></li>`).join("")}</ul>` : empty("No orders in this period."); },
      regions: () => { const m = {}; cur.forEach((o) => { const g = (o.address && o.address.gov) || "—"; m[g] = m[g] || [0, 0]; m[g][0]++; m[g][1] += +o.total || 0; }); const rows = Object.entries(m).sort((a, b) => b[1][1] - a[1][1]).slice(0, 6); return rows.length ? `<table class="ad-table ad-table--flat"><thead><tr><th>Governorate</th><th class="num">Orders</th><th class="num">Sales</th></tr></thead><tbody>${rows.map(([g, [n, v]]) => `<tr><td>${esc(g)}</td><td class="num">${n}</td><td class="num">${money(v)}</td></tr>`).join("")}</tbody></table>` : empty("No orders in this period."); },
      repeat: () => { const cnt = {}; os.forEach((o) => { cnt[custKey(o)] = (cnt[custKey(o)] || 0) + 1; }); const act = new Set(cur.map(custKey)); const rep = [...act].filter((k) => cnt[k] > 1).length, rate = act.size ? Math.round((rep / act.size) * 100) : 0; const ticks = 30;
        return `<div class="ad-gauge"><svg viewBox="0 0 200 112" role="img" aria-label="Repeat customer rate ${rate}%">${[...Array(ticks)].map((_, i) => { const a = Math.PI * (i / (ticks - 1)), x1 = 100 - 86 * Math.cos(a), y1 = 104 - 86 * Math.sin(a), x2 = 100 - 70 * Math.cos(a), y2 = 104 - 70 * Math.sin(a); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${i / (ticks - 1) <= rate / 100 && rate ? "on" : ""}"/>`; }).join("")}<text x="100" y="94" text-anchor="middle" class="n">${rate}%</text></svg><p>${rep} of ${act.size} customers in this period have ordered more than once.</p></div>`; },
      recent: () => ordersTable(all.slice(0, 6), { compact: true }),
      alerts: () => { const al = alerts(); return al.length ? `<ul class="ad-todo">${al.map(([k, t, h]) => `<li><a href="${h}">${ico(k)}<span>${esc(t)}</span></a></li>`).join("")}</ul>` : empty("Nothing needs attention."); },
      codes: () => { const used = {}; cur.forEach((o) => { if (o.code) { used[o.code] = used[o.code] || [0, 0]; used[o.code][0]++; used[o.code][1] += +o.disc || 0; } }); const rows = (D.discounts || []).map((d) => [String(d.code || "").toUpperCase(), ...(used[String(d.code || "").toUpperCase()] || [0, 0]), d]); return rows.length ? `<table class="ad-table ad-table--flat"><thead><tr><th>Code</th><th class="num">Used</th><th class="num">Discount given</th></tr></thead><tbody>${rows.map(([c, n, v]) => `<tr><td><b class="ad-code">${esc(c)}</b></td><td class="num">${n}</td><td class="num">${money(v)}</td></tr>`).join("")}</tbody></table>` : empty("No discount codes yet.", can("discounts", "edit") ? `<a class="ad-btn ad-btn--sm" href="#discounts">Create one</a>` : ""); },
    };
    const L = layout(), hiddenW = Object.keys(WIDGETS).filter((k) => !L.includes(k));
    const sample = all.some((o) => o.sample);
    shell("dashboard", `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${esc(ME.name.split(" ")[0])}`,
      `<select id="range" class="ad-select" aria-label="Period">${RANGES.map(([v, l]) => `<option value="${v}" ${+v === days ? "selected" : ""}>${l}</option>`).join("")}</select><button class="ad-btn ${editingLayout ? "ad-btn--dark" : ""}" id="lay">${editingLayout ? "Done" : "Customize dashboard"}</button><button class="ad-btn" id="kexp">${ico("dl")}Export</button>`,
      `${sample ? `<div class="ad-note">${ico("activity")} The dashboard includes <b>sample orders</b> for the demo. ${isSuper() ? `Remove them in <a href="#settings">Settings → Data</a>.` : ""}</div>` : !all.length && isSuper() ? `<div class="ad-note">No orders yet. <button class="ad-link" id="load-sample">Load sample orders</button> to see the dashboard with data.</div>` : ""}
      ${kpis}
      ${editingLayout && hiddenW.length ? `<div class="ad-tray"><span>Add widget:</span>${hiddenW.map((k) => `<button class="ad-btn ad-btn--sm" data-wadd="${k}">${ico("plus")}${WIDGETS[k][0]}</button>`).join("")}</div>` : ""}
      <div class="ad-widgets ${editingLayout ? "editing" : ""}">${L.map((k, i) => `<section class="ad-card ad-w ${WIDGETS[k][1] === "wide" ? "ad-w--wide" : ""}" data-w="${k}"><div class="ad-card__hd"><h2>${WIDGETS[k][0]}</h2>${editingLayout ? `<span class="ad-wctl"><button data-wmv="${i}" data-d="-1" aria-label="Move up">${ico("up")}</button><button data-wmv="${i}" data-d="1" aria-label="Move down">${ico("down")}</button><button data-wrm="${k}" aria-label="Hide widget">${ico("x")}</button></span>` : k === "recent" ? `<a class="ad-link" href="#orders">View all</a>` : ""}</div>${W[k]()}</section>`).join("")}</div>`,
      `${RANGES.find(([v]) => +v === days)[1]} · updated ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`);
    $("#range").onchange = (e) => { LS.set("mlb_admin_range_" + ME.id, e.target.value); dashboard(); };
    $("#lay").onclick = () => { editingLayout = !editingLayout; dashboard(); };
    $("#kexp").onclick = () => csv("dashboard", ["Metric", "This period", "Previous period"], [["Total sales (LE)", sum(cur), sum(prev)], ["Orders", cur.length, prev.length], ["Average order value (LE)", cur.length ? Math.round(sum(cur) / cur.length) : 0, prev.length ? Math.round(sum(prev) / prev.length) : 0], ["Items sold", items(cur), items(prev)], ["New customers", newC(cur), newC(prev)]]);
    const ls = $("#load-sample"); if (ls) ls.onclick = () => { saveOrders([...orders(), ...sampleOrders()]); log("Loaded sample orders"); dashboard(); };
    const setL = (l) => { LS.set("mlb_admin_layout_" + ME.id, l); dashboard(); };
    $$("[data-wmv]").forEach((b) => b.onclick = () => { const l = layout(), i = +b.dataset.wmv, j = i + +b.dataset.d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setL(l); });
    $$("[data-wrm]").forEach((b) => b.onclick = () => setL(layout().filter((k) => k !== b.dataset.wrm)));
    $$("[data-wadd]").forEach((b) => b.onclick = () => setL([...layout(), b.dataset.wadd]));
  }

  /* =========================================================
     ORDERS
     ========================================================= */
  const PERO = 25;
  function ordersTable(list, { compact = false, select = false } = {}) {
    if (!list.length) return empty("No orders here yet. Orders placed at checkout appear here.");
    const ed = can("orders", "edit");
    return `<div class="ad-tablewrap"><table class="ad-table"><thead><tr>${select ? `<th class="ad-cb"><input type="checkbox" id="sel-all" aria-label="Select all"></th>` : ""}<th>Order</th><th>Date</th><th>Customer</th>${compact ? "" : "<th>Governorate</th><th>Payment</th><th class='num'>Items</th>"}<th>Status</th><th class="num">Total</th></tr></thead><tbody>${list.map((o) => `<tr data-go="#orders/${esc(o.no)}">${select ? `<td class="ad-cb" data-stop><input type="checkbox" data-sel="${esc(o.no)}" aria-label="Select order ${esc(o.no)}"></td>` : ""}<td><b>#${esc(o.no)}</b>${o.sample ? ' <span class="ad-tag">sample</span>' : ""}</td><td>${dtime(o.date)}</td><td>${esc((o.address && o.address.name) || "—")}</td>${compact ? "" : `<td>${esc((o.address && o.address.gov) || "—")}</td><td>${esc(o.pm || "Cash on delivery")}</td><td class="num">${o.items.reduce((a, x) => a + x.qty, 0)}</td>`}<td data-stop>${ed && !compact ? `<select class="ad-stsel ad-stsel--${slug(stOf(o))}" data-st="${esc(o.no)}" aria-label="Status of order ${esc(o.no)}">${STATUSES.map((s) => `<option ${s === stOf(o) ? "selected" : ""}>${s}</option>`).join("")}</select>` : pill(stOf(o))}</td><td class="num">${money(o.total)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function setStatus(nos, st) {
    const os = orders(); let n = 0;
    os.forEach((o) => { if (nos.includes(o.no) && stOf(o) !== st) { o.status = st; (o.log = o.log || []).push({ s: st, at: new Date().toISOString(), by: ME.name }); n++; } });
    saveOrders(os); log(`Set ${n} order${n === 1 ? "" : "s"} to ${st}`, nos.length === 1 ? "#" + nos[0] : nos.length + " orders"); toast(`${n} order${n === 1 ? "" : "s"} marked ${st.toLowerCase()}`);
  }
  function ordersPage(q) {
    const s = q.get("s") || "", pm = q.get("pm") || "", t = (q.get("q") || "").toLowerCase(), r = q.get("r") || "", page = +q.get("p") || 1, all = orders();
    let list = all.filter((o) => (!s || stOf(o) === s) && (!pm || (o.pm || "Cash on delivery") === pm) && (!r || inRange(o, +r)) && (!t || (o.no + " " + JSON.stringify(o.address || {}) + " " + o.items.map((x) => x.t).join(" ")).toLowerCase().includes(t)));
    const pages = Math.max(1, Math.ceil(list.length / PERO)), rows = list.slice((page - 1) * PERO, page * PERO);
    const qs = (o) => "#orders?" + new URLSearchParams(Object.fromEntries(Object.entries({ s, pm, q: t, r, p: page, ...o }).filter(([, v]) => v))).toString();
    const cnt = (k) => all.filter((o) => !k || stOf(o) === k).length;
    const sumAll = list.filter((o) => stOf(o) !== "Cancelled").reduce((a, o) => a + (+o.total || 0), 0);
    shell("orders", `Orders <em class="ad-count">${fmt(all.length)}</em>`, `<button class="ad-btn" id="o-exp">${ico("dl")}Export</button>`,
      `${roBanner("orders")}<div class="ad-mini">${["Placed", "Confirmed", "Shipped", "Delivered"].map((k) => `<a href="${qs({ s: k, p: "" })}"><span>${k}</span><b>${cnt(k)}</b></a>`).join("")}<div><span>Value of these orders</span><b>${money(sumAll)}</b></div></div>
      <div class="ad-tabs">${["", ...STATUSES].map((k) => `<a href="${qs({ s: k, p: "" })}" class="${s === k ? "on" : ""}">${k || "All"} <em>${cnt(k)}</em></a>`).join("")}</div>
      ${card("", `<div class="ad-filters"><label class="ad-fsearch">${ico("search")}<input id="of-q" placeholder="Order number, customer, phone, product" value="${esc(t)}"></label><select id="of-pm" aria-label="Payment"><option value="">All payments</option>${[...new Set(all.map((o) => o.pm || "Cash on delivery"))].map((x) => `<option ${x === pm ? "selected" : ""}>${esc(x)}</option>`).join("")}</select><select id="of-r" aria-label="Date"><option value="">Any date</option>${RANGES.map(([v, l]) => `<option value="${v}" ${v === r ? "selected" : ""}>${l}</option>`).join("")}</select><span class="ad-muted">${fmt(list.length)} orders</span></div>
        ${ordersTable(rows, { select: can("orders", "edit") })}
        ${pages > 1 ? `<div class="ad-pager">${page > 1 ? `<a class="ad-btn ad-btn--sm" href="${qs({ p: page - 1 })}">← Previous</a>` : ""}<span>Page ${page} of ${pages}</span>${page < pages ? `<a class="ad-btn ad-btn--sm" href="${qs({ p: page + 1 })}">Next →</a>` : ""}</div>` : ""}`, "", "ad-card--flush")}`);
    const go = (o) => { location.hash = qs({ ...o, p: "" }); };
    let tm; $("#of-q").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => go({ q: e.target.value.trim() }), 350); };
    $("#of-pm").onchange = (e) => go({ pm: e.target.value }); $("#of-r").onchange = (e) => go({ r: e.target.value });
    $$("[data-st]").forEach((sel) => sel.onchange = () => { setStatus([sel.dataset.st], sel.value); route(); });
    $("#o-exp").onclick = () => { csv("orders", ["Order", "Date", "Customer", "Phone", "Governorate", "Area", "Payment", "Status", "Items", "Subtotal", "Discount", "Delivery", "Total"], list.map((o) => [o.no, o.date, o.address && o.address.name, o.address && o.address.phone, o.address && o.address.gov, o.address && o.address.area, o.pm || "Cash on delivery", stOf(o), o.items.reduce((a, x) => a + x.qty, 0), o.sub, o.disc || 0, o.del, o.total])); log("Exported orders", list.length + " orders"); };
    if (can("orders", "edit")) bulkBar([["Confirmed", "Mark confirmed"], ["Shipped", "Mark shipped"], ["Delivered", "Mark delivered"], ["Cancelled", "Cancel", "danger"]], (a, sel) => { if (a === "Cancelled" && !confirm(`Cancel ${sel.length} order(s)?`)) return; setStatus(sel, a); route(); });
  }
  function orderPage(no) {
    const all = orders(), i = all.findIndex((x) => x.no === no), o = all[i]; if (!o) return notFound();
    const st = stOf(o), a = o.address || {}, si = STATUSES.indexOf(st), ed = can("orders", "edit");
    const sub = o.sub ?? o.items.reduce((s, x) => s + (x.p || 0) * x.qty, 0), del = o.del ?? Math.max(0, o.total - sub);
    const P = products(), cust = all.filter((x) => custKey(x) === custKey(o));
    shell("orders", `<a class="ad-back" href="#orders" aria-label="Back to orders">←</a> Order #${esc(o.no)} ${pill(st)}${o.sample ? ' <span class="ad-tag">sample</span>' : ""}`,
      `${all[i + 1] ? `<a class="ad-btn ad-btn--sm" href="#orders/${esc(all[i + 1].no)}" aria-label="Older order">${ico("down")}</a>` : ""}${all[i - 1] ? `<a class="ad-btn ad-btn--sm" href="#orders/${esc(all[i - 1].no)}" aria-label="Newer order">${ico("up")}</a>` : ""}<button class="ad-btn" data-print>Print invoice</button>`,
      `${roBanner("orders")}<div class="ad-grid2"><div class="ad-col">
        ${card("Fulfilment", `<div class="ad-steps">${STATUSES.slice(0, 4).map((x, k) => `<span class="${st === "Cancelled" ? "" : k < si ? "done" : k === si ? "now" : ""}"><b>${x}</b><small>${(o.log || []).filter((l) => l.s === x).map((l) => dtime(l.at)).pop() || (k === 0 ? dtime(o.date) : "")}</small></span>`).join("")}</div>
          ${ed ? `<div class="ad-row">${st === "Cancelled" ? `<button class="ad-btn" data-status="Placed">Reopen order</button>` : `${si < 3 ? `<button class="ad-btn ad-btn--dark" data-status="${STATUSES[si + 1]}">Mark as ${STATUSES[si + 1].toLowerCase()}</button>` : ""}<button class="ad-btn ad-btn--danger" data-status="Cancelled">Cancel order</button>`}</div>` : ""}<small class="ad-hint">The customer sees this status on their invoice and in My account → Orders.</small>`)}
        ${card(`Items <em class="ad-count">${o.items.reduce((s, x) => s + x.qty, 0)}</em>`, `<ul class="ad-lines">${o.items.map((x) => { const r = P.find((y) => y.h === x.h); return `<li><img src="${esc(img(r && r.i && r.i[0], 120))}" alt=""><span><a href="#products/${encodeURIComponent(x.h)}"><b>${esc(x.t || (r && r.t) || x.h)}</b></a><small>${esc(x.v || (r && r.v) || "")} · Size ${esc(x.size)}</small></span><span class="num">${x.qty} × ${money(x.p || (r && r.p))}</span><b class="num">${money((x.p || (r && r.p) || 0) * x.qty)}</b></li>`; }).join("")}</ul>
          <dl class="ad-tot"><div><dt>Subtotal</dt><dd>${money(sub)}</dd></div>${o.disc ? `<div><dt>Discount (${esc(o.code)})</dt><dd>−${money(o.disc)}</dd></div>` : ""}<div><dt>Delivery</dt><dd>${del ? money(del) : "Free"}</dd></div><div class="grand"><dt>Total</dt><dd>${money(o.total)}</dd></div><div><dt>Payment</dt><dd>${esc(o.pm || "Cash on delivery")} · ${(o.pm || "Cash on delivery") === "Cash on delivery" ? (st === "Delivered" ? "Collected" : "Due on delivery") : "Awaiting payment"}</dd></div></dl>`)}
        ${card("Timeline", `<ol class="ad-tl"><li><b>Order placed</b><small>${dtime(o.date)}</small></li>${(o.log || []).map((l) => `<li><b>Marked ${esc(l.s.toLowerCase())}</b><small>${dtime(l.at)}${l.by ? " · " + esc(l.by) : ""}</small></li>`).join("")}</ol>`)}
      </div><div class="ad-col">
        ${card("Customer", `<p class="ad-p"><b>${esc(a.name || "—")}</b><br>${esc(a.phone || "")}<br><span class="ad-muted">${cust.length} order${cust.length === 1 ? "" : "s"} · ${money(cust.filter((x) => stOf(x) !== "Cancelled").reduce((s, x) => s + (+x.total || 0), 0))} spent</span></p>${can("customers") ? `<a class="ad-link" href="#customers/${encodeURIComponent(custKey(o))}">View customer</a>` : ""}<h3 class="ad-h3">Delivery address</h3><p class="ad-p">${esc(a.street || "—")}<br>${esc(a.area || "")}${a.gov ? ", " + esc(a.gov) : ""}</p>`)}
        ${card("Internal note", `<label class="ad-f"><span class="sr">Note</span><textarea id="ad-note" rows="3" placeholder="Not shown to the customer" ${ed ? "" : "disabled"}>${esc(o.note || "")}</textarea></label>`)}
      </div></div>`);
    $$("[data-status]").forEach((b) => b.onclick = () => { if (b.dataset.status === "Cancelled" && !confirm("Cancel this order?")) return; setStatus([no], b.dataset.status); route(); });
    const note = $("#ad-note"); if (note) note.onchange = (e) => { const os = orders(); os.find((y) => y.no === no).note = e.target.value; saveOrders(os); log("Added a note", "#" + no); toast("Note saved"); };
    $("[data-print]").onclick = () => print();
  }

  /* =========================================================
     CUSTOMERS
     ========================================================= */
  function customerList() {
    const m = new Map();
    orders().forEach((o) => { const a = o.address || {}, k = custKey(o); if (!m.has(k)) m.set(k, { key: k, name: a.name || "Guest", phone: a.phone || "", gov: a.gov || "", area: a.area || "", orders: 0, spent: 0, first: o.date, last: o.date, list: [] }); const c = m.get(k); c.orders++; c.list.push(o); if (stOf(o) !== "Cancelled") c.spent += +o.total || 0; if (o.date > c.last) c.last = o.date; if (o.date < c.first) c.first = o.date; });
    return [...m.values()];
  }
  function customersPage(q) {
    const seg = q.get("seg") || "", t = (q.get("q") || "").toLowerCase(), sort = q.get("sort") || "spent";
    let list = customerList(); const all = list.length, spentSorted = list.map((c) => c.spent).sort((a, b) => b - a), top = spentSorted[Math.floor(spentSorted.length * 0.1)] || 0;
    if (seg === "repeat") list = list.filter((c) => c.orders > 1); if (seg === "new") list = list.filter((c) => Date.parse(c.first) > Date.now() - 30 * 864e5); if (seg === "vip") list = list.filter((c) => c.spent >= top && c.spent > 0); if (seg === "lapsed") list = list.filter((c) => Date.parse(c.last) < Date.now() - 60 * 864e5);
    if (t) list = list.filter((c) => (c.name + " " + c.phone + " " + c.gov + " " + c.area).toLowerCase().includes(t));
    list.sort((a, b) => (sort === "orders" ? b.orders - a.orders : sort === "recent" ? b.last.localeCompare(a.last) : b.spent - a.spent));
    const qs = (o) => "#customers?" + new URLSearchParams(Object.fromEntries(Object.entries({ seg, q: t, sort, ...o }).filter(([, v]) => v))).toString();
    const rep = customerList().filter((c) => c.orders > 1).length;
    shell("customers", `Customers <em class="ad-count">${fmt(all)}</em>`, `<button class="ad-btn" id="c-exp">${ico("dl")}Export</button>`,
      `<div class="ad-mini"><div><span>Customers</span><b>${fmt(all)}</b></div><div><span>Repeat customers</span><b>${all ? Math.round((rep / all) * 100) : 0}%</b></div><div><span>Average spend</span><b>${money(all ? customerList().reduce((a, c) => a + c.spent, 0) / all : 0)}</b></div><div><span>Top 10% spend from</span><b>${money(top)}</b></div></div>
      <div class="ad-tabs">${[["", "All"], ["vip", "Top 10%"], ["repeat", "Repeat"], ["new", "New (30 days)"], ["lapsed", "No order in 60 days"]].map(([k, l]) => `<a href="${qs({ seg: k })}" class="${seg === k ? "on" : ""}">${l}</a>`).join("")}</div>
      ${card("", `<div class="ad-filters"><label class="ad-fsearch">${ico("search")}<input id="cf-q" placeholder="Name, phone, area" value="${esc(t)}"></label><select id="cf-s" aria-label="Sort"><option value="spent" ${sort === "spent" ? "selected" : ""}>Most spent</option><option value="orders" ${sort === "orders" ? "selected" : ""}>Most orders</option><option value="recent" ${sort === "recent" ? "selected" : ""}>Last order</option></select><span class="ad-muted">${fmt(list.length)} customers</span></div>
        ${list.length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Customer</th><th>Location</th><th class="num">Orders</th><th class="num">Avg. order</th><th>Last order</th><th class="num">Spent</th></tr></thead><tbody>${list.slice(0, 100).map((c) => `<tr data-go="#customers/${encodeURIComponent(c.key)}"><td><span class="ad-prod"><span class="ad-av ad-av--sm">${esc(c.name.split(" ").map((x) => x[0]).join("").slice(0, 2))}</span><span><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></span></span></td><td>${esc([c.area, c.gov].filter(Boolean).join(", ") || "—")}</td><td class="num">${c.orders}</td><td class="num">${money(c.spent / Math.max(1, c.orders))}</td><td>${dlong(c.last)}</td><td class="num"><b>${money(c.spent)}</b></td></tr>`).join("")}</tbody></table></div>` : empty("No customers match.")}`, "", "ad-card--flush")}`);
    const go = (o) => { location.hash = qs(o); }; let tm; $("#cf-q").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => go({ q: e.target.value.trim() }), 350); }; $("#cf-s").onchange = (e) => go({ sort: e.target.value });
    $("#c-exp").onclick = () => { csv("customers", ["Name", "Phone", "Governorate", "Area", "Orders", "Spent", "First order", "Last order"], list.map((c) => [c.name, c.phone, c.gov, c.area, c.orders, c.spent, c.first, c.last])); log("Exported customers", list.length + " customers"); };
  }
  function customerPage(key) {
    const c = customerList().find((x) => x.key === key); if (!c) return notFound();
    shell("customers", `<a class="ad-back" href="#customers" aria-label="Back to customers">←</a> ${esc(c.name)}`, "",
      `<div class="ad-mini"><div><span>Total spent</span><b>${money(c.spent)}</b></div><div><span>Orders</span><b>${c.orders}</b></div><div><span>Average order</span><b>${money(c.spent / Math.max(1, c.orders))}</b></div><div><span>Customer since</span><b>${dlong(c.first)}</b></div></div>
      <div class="ad-grid2"><div class="ad-col">${card("Orders", ordersTable(c.list.sort((a, b) => b.date.localeCompare(a.date))), "", "ad-card--flush")}</div><div class="ad-col">${card("Contact", `<p class="ad-p"><b>${esc(c.name)}</b><br>${esc(c.phone)}<br>${esc([c.area, c.gov].filter(Boolean).join(", "))}</p>`)}</div></div>`);
  }

  /* =========================================================
     DISCOUNTS
     ========================================================= */
  function discountsPage() {
    const used = {}; orders().forEach((o) => { if (o.code) { const k = o.code.toUpperCase(); used[k] = used[k] || [0, 0]; used[k][0]++; used[k][1] += +o.disc || 0; } });
    const status = (d) => (d.on === false ? "Off" : d.ends && Date.parse(d.ends) < Date.now() ? "Expired" : "Active");
    shell("discounts", "Discounts", can("discounts", "edit") ? `<button class="ad-btn ad-btn--dark" id="dc-new">${ico("plus")}Create discount</button>` : "",
      `${roBanner("discounts")}${card("", (D.discounts || []).length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Code</th><th>Discount</th><th>Minimum order</th><th>Ends</th><th class="num">Used</th><th class="num">Given</th><th>Status</th></tr></thead><tbody>${D.discounts.map((d, i) => { const k = String(d.code || "").toUpperCase(); return `<tr data-go="#discounts/${i}"><td><b class="ad-code">${esc(k || "—")}</b></td><td>${d.type === "percent" ? `${+d.value || 0}% off` : d.type === "fixed" ? `${money(d.value)} off` : "Free delivery"}</td><td>${+d.min ? money(d.min) : "None"}</td><td>${d.ends ? dlong(d.ends) : "No end date"}</td><td class="num">${(used[k] || [0])[0]}</td><td class="num">${money((used[k] || [0, 0])[1])}</td><td>${pill(status(d))}</td></tr>`; }).join("")}</tbody></table></div>` : empty("No discount codes yet. Shoppers enter codes in the checkout summary."), "", "ad-card--flush")}`);
    const n = $("#dc-new"); if (n) n.onclick = () => modal("Create discount", `<label class="ad-f"><span>Code</span><input name="code" required placeholder="e.g. EID20" autocapitalize="characters"></label><label class="ad-f"><span>Type</span><select name="type"><option value="percent">Percentage off</option><option value="fixed">Fixed amount off (LE)</option><option value="ship">Free delivery</option></select></label><label class="ad-f"><span>Value</span><input name="value" type="number" min="0" step="any" placeholder="20"></label>`, (f) => {
      const code = f.code.value.trim().toUpperCase(); if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return "Use 3–20 letters or numbers, no spaces.";
      if ((D.discounts || []).some((d) => String(d.code).toUpperCase() === code)) return "That code already exists.";
      if (f.type.value !== "ship" && !(+f.value.value > 0)) return "Enter a value above 0."; if (f.type.value === "percent" && +f.value.value > 100) return "A percentage can’t be above 100.";
      D.discounts = D.discounts || []; D.discounts.push({ code, type: f.type.value, value: +f.value.value || 0, min: "", ends: "", on: true }); save("Discount created", ["Created discount", code]); location.hash = "#discounts/" + (D.discounts.length - 1); return true;
    }, "Create");
  }
  function discountPage(i) {
    const d = (D.discounts || [])[+i]; if (!d) return notFound(); const b = "discounts" + SEP + i;
    shell("discounts", `<a class="ad-back" href="#discounts" aria-label="Back to discounts">←</a> <span class="ad-code">${esc((d.code || "Discount").toUpperCase())}</span>`, can("discounts", "edit") ? `<button class="ad-btn ad-btn--danger" id="dc-del">Delete</button>` : "",
      `${roBanner("discounts")}<div class="ad-grid2"><div class="ad-col">${card("Code", F(b + SEP + "code", "Discount code", "text", { hint: "Customers type this at checkout. Not case-sensitive." }))}${card("Value", F(b + SEP + "type", "Type", "select", { options: [["percent", "Percentage off the order"], ["fixed", "Fixed amount off (LE)"], ["ship", "Free delivery"]] }) + F(b + SEP + "value", "Value", "number", { hint: "Percent or LE. Not used for free delivery." }))}${card("Rules", F(b + SEP + "min", "Minimum order (LE)", "number", { ph: "No minimum" }) + F(b + SEP + "ends", "Ends at", "datetime-local"))}</div>
       <div class="ad-col">${card("Status", F(b + SEP + "on", "Active", "check"))}</div></div>`);
    const del = $("#dc-del"); if (del) del.onclick = () => { if (!confirm("Delete this discount?")) return; const c = d.code; D.discounts.splice(+i, 1); save("Discount deleted", ["Deleted discount", c]); location.hash = "#discounts"; };
  }

  /* =========================================================
     PRODUCTS
     ========================================================= */
  const PER = 50;
  function productsPage(q) {
    const f = q.get("f") || "", term = (q.get("q") || "").toLowerCase(), brand = q.get("b") || "", dept = q.get("d") || "", page = +q.get("p") || 1, sort = q.get("sort") || "";
    const ALLP = products(); let list = ALLP;
    if (f === "hidden") list = list.filter((p) => p.hidden || p.brandHidden); else if (f === "active") list = list.filter((p) => !p.hidden && !p.brandHidden); else if (f === "sale") list = list.filter((p) => p.c); else if (f === "soldout") list = list.filter((p) => p.s.length && !p.a.length); else if (f === "low") list = list.filter((p) => p.s.length > 1 && p.a.length === 1); else if (f === "added") list = list.filter((p) => p.custom);
    if (brand) list = list.filter((p) => p.v === brand); if (dept) list = list.filter((p) => p.d === dept);
    if (term) list = list.filter((p) => (p.t + " " + p.v + " " + (p.ty || "")).toLowerCase().includes(term));
    if (sort === "low") list = [...list].sort((a, b) => a.p - b.p); else if (sort === "high") list = [...list].sort((a, b) => b.p - a.p); else if (sort === "az") list = [...list].sort((a, b) => a.t.localeCompare(b.t));
    const pages = Math.max(1, Math.ceil(list.length / PER)), rows = list.slice((page - 1) * PER, page * PER), ed = can("products", "edit");
    const qs = (o) => "#products?" + new URLSearchParams(Object.fromEntries(Object.entries({ f, q: term, b: brand, d: dept, sort, p: page, ...o }).filter(([, v]) => v))).toString();
    const n = (fn) => ALLP.filter(fn).length;
    shell("products", `Products <em class="ad-count">${fmt(ALLP.length)}</em>`, `<button class="ad-btn" id="p-exp">${ico("dl")}Export</button>${ed ? `<a class="ad-btn ad-btn--dark" href="#products/new">${ico("plus")}Add product</a>` : ""}`,
      `${roBanner("products")}<div class="ad-mini"><a href="${qs({ f: "active", p: "" })}"><span>Live in the store</span><b>${fmt(n((p) => !p.hidden && !p.brandHidden))}</b></a><a href="${qs({ f: "sale", p: "" })}"><span>On sale</span><b>${fmt(n((p) => p.c))}</b></a><a href="${qs({ f: "low", p: "" })}"><span>Last size left</span><b>${fmt(n((p) => p.s.length > 1 && p.a.length === 1))}</b></a><a href="${qs({ f: "soldout", p: "" })}"><span>Sold out</span><b class="${n((p) => p.s.length && !p.a.length) ? "ad-warn" : ""}">${fmt(n((p) => p.s.length && !p.a.length))}</b></a></div>
      <div class="ad-tabs">${[["", "All"], ["active", "Active"], ["hidden", "Hidden"], ["sale", "On sale"], ["low", "Low stock"], ["soldout", "Sold out"], ["added", "Added here"]].map(([k, l]) => `<a href="${qs({ f: k, p: "" })}" class="${f === k ? "on" : ""}">${l}</a>`).join("")}</div>
      ${card("", `<div class="ad-filters"><label class="ad-fsearch">${ico("search")}<input id="pf-q" placeholder="Search products" value="${esc(term)}"></label><select id="pf-b" aria-label="Brand"><option value="">All brands</option>${brandList().map((b) => `<option ${b.name === brand ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select><select id="pf-d" aria-label="Department"><option value="">All departments</option>${["Clothing", "Footwear", "Bags", "Accessories", "Homewear", "Socks"].map((x) => `<option ${x === dept ? "selected" : ""}>${x}</option>`).join("")}</select><select id="pf-s" aria-label="Sort"><option value="">Default order</option><option value="az" ${sort === "az" ? "selected" : ""}>Name A–Z</option><option value="low" ${sort === "low" ? "selected" : ""}>Price: low to high</option><option value="high" ${sort === "high" ? "selected" : ""}>Price: high to low</option></select><span class="ad-muted">${fmt(list.length)} products</span></div>
        <div class="ad-tablewrap"><table class="ad-table ad-table--prod"><thead><tr>${ed ? `<th class="ad-cb"><input type="checkbox" id="sel-all" aria-label="Select all"></th>` : ""}<th>Product</th><th>Status</th><th>Stock</th><th>Brand</th><th>Category</th><th class="num">Price</th></tr></thead><tbody>${rows.map((p) => `<tr data-go="#products/${encodeURIComponent(p.h)}">${ed ? `<td class="ad-cb" data-stop><input type="checkbox" data-sel="${esc(p.h)}" aria-label="Select ${esc(p.t)}"></td>` : ""}<td><span class="ad-prod"><img src="${esc(img(p.i[0], 120))}" alt="" loading="lazy"><span><b>${esc(p.t || "Untitled")}</b>${p.custom ? '<small>Added here</small>' : ""}</span></span></td><td>${p.hidden || p.brandHidden ? pill("Hidden") : pill("Active")}</td><td>${p.s.length ? (p.a.length ? `<span class="ad-stock"><i style="width:${(p.a.length / p.s.length) * 100}%"></i></span>${p.a.length}/${p.s.length} sizes` : `<span class="ad-warn">Sold out</span>`) : "One size"}</td><td>${esc(p.v)}</td><td>${esc(p.ty || p.d)}</td><td class="num">${money(p.p)}${p.c ? `<s>${money(p.c)}</s>` : ""}</td></tr>`).join("") || `<tr><td colspan="7">${empty("No products match.")}</td></tr>`}</tbody></table></div>
        ${pages > 1 ? `<div class="ad-pager">${page > 1 ? `<a class="ad-btn ad-btn--sm" href="${qs({ p: page - 1 })}">← Previous</a>` : ""}<span>Page ${page} of ${pages}</span>${page < pages ? `<a class="ad-btn ad-btn--sm" href="${qs({ p: page + 1 })}">Next →</a>` : ""}</div>` : ""}`, "", "ad-card--flush")}`);
    const go = (o) => { location.hash = qs({ ...o, p: "" }); };
    let tm; $("#pf-q").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => go({ q: e.target.value.trim() }), 350); };
    $("#pf-b").onchange = (e) => go({ b: e.target.value }); $("#pf-d").onchange = (e) => go({ d: e.target.value }); $("#pf-s").onchange = (e) => go({ sort: e.target.value });
    $("#p-exp").onclick = () => { csv("products", ["Handle", "Title", "Brand", "Department", "Category", "Price", "Compare at", "Sizes", "In stock", "Status"], list.map((p) => [p.h, p.t, p.v, p.d, p.ty, p.p, p.c || "", p.s.join(" "), p.a.join(" "), p.hidden || p.brandHidden ? "Hidden" : "Active"])); log("Exported products", list.length + " products"); };
    if (ed) bulkBar([["hide", "Hide"], ["show", "Show"], ["sale", "Put on sale…"], ["nosale", "End sale"]], (kind, hs) => {
      let pct = 0;
      if (kind === "sale") { pct = +prompt("Discount in percent (1–90)", "20"); if (!(pct > 0 && pct <= 90)) return; }
      hs.forEach((h) => { const p = ALLP.find((x) => x.h === h); if (!p) return; const tgt = p.custom ? D.products.find((x) => x.h === h) : (D.productEdits[h] = D.productEdits[h] || {});
        if (kind === "hide") tgt.hidden = true; if (kind === "show") tgt.hidden = false;
        if (kind === "sale") { const base = p.c || p.p; tgt.c = base; tgt.p = Math.round(base * (1 - pct / 100)); }
        if (kind === "nosale" && p.c) { tgt.p = p.c; tgt.c = 0; } });
      save(`${hs.length} product${hs.length === 1 ? "" : "s"} updated`, [{ hide: "Hid", show: "Showed", sale: `Put ${pct}% sale on`, nosale: "Ended sale on" }[kind] + ` ${hs.length} product${hs.length === 1 ? "" : "s"}`, ""]); route();
    });
  }
  function productPage(h) {
    if (h === "new") { if (!can("products", "edit")) return noAccess(); const nh = "cms-" + uid(); D.products.push({ h: nh, t: "", v: "Malabisy", p: "", c: "", d: "Clothing", g: "Women", ty: "", s: ["S", "M", "L"], a: [], k: [], i: [], b: "", n: true }); save("Draft product created", ["Created a product", ""]); location.replace("#products/" + nh); return; }
    const ci = D.products.findIndex((p) => p.h === h), base = ci >= 0 ? `products${SEP}${ci}` : `productEdits${SEP}${h}`, r = RAW.find((x) => x.h === h);
    if (ci < 0 && !r) return notFound();
    const P = products().find((x) => x.h === h) || {}, sold = orders().reduce((a, o) => a + o.items.filter((x) => x.h === h).reduce((b, x) => b + x.qty, 0), 0);
    shell("products", `<a class="ad-back" href="#products" aria-label="Back to products">←</a> ${esc(P.t || "New product")}`, `<a class="ad-btn" href="product.html?h=${encodeURIComponent(h)}" target="_blank" rel="noopener">View in store ${ico("ext")}</a>${ci >= 0 && can("products", "edit") ? `<button class="ad-btn ad-btn--danger" id="pd-del">Delete</button>` : ""}`,
      `${roBanner("products")}<div class="ad-grid2"><div class="ad-col">
        ${card("", F(base + SEP + "t", "Title", "text", { ph: r ? r.t : "e.g. Wool Blend Long Coat – Camel" }) + F(base + SEP + "b", "Description", "textarea", { rows: 5, ph: r ? r.b || "" : "" }))}
        ${card("Media", F(base + SEP + "i", ci >= 0 ? "Images" : "Replace images (leave empty to keep the current ones)", "images") + (ci < 0 && r ? `<div class="ad-thumbs ad-thumbs--ro">${r.i.slice(0, 6).map((u) => `<img src="${esc(img(u, 200))}" alt="">`).join("")}</div>` : ""))}
        ${card("Pricing", `<div class="ad-row2">${F(base + SEP + "p", "Price (LE)", "number", { ph: r ? r.p : "" })}${F(base + SEP + "c", "Compare-at price (LE)", "number", { ph: r ? r.c || "" : "", hint: "Shows the product as on sale." })}</div>`)}
        ${card("Sizes & stock", (ci >= 0 ? F(base + SEP + "s", "Sizes", "text", { list: true, rows: 3 }) : `<p class="ad-p">Sizes: ${esc((r.s || []).join(", ") || "one size")}</p>`) + F(base + SEP + "a", "Sizes in stock", "text", { list: true, rows: 3, ph: r ? (r.a || []).join("\n") : "", hint: "Leave empty when every size is in stock. A size missing here shows as sold out." }))}
      </div><div class="ad-col">
        ${card("Status", F(base + SEP + "hidden", "Hidden from the store", "check") + F(base + SEP + "n", "Show the “New” label", "check"))}
        ${card("Performance", `<p class="ad-p"><b>${sold}</b> sold in all orders</p>`)}
        ${card("Organisation", ci >= 0 ? `${F(base + SEP + "v", "Brand", "text", { hint: "An existing brand name, or a new one to create a brand." })}${F(base + SEP + "d", "Department", "select", { options: ["Clothing", "Footwear", "Bags", "Accessories", "Homewear"].map((x) => [x, x]) })}${F(base + SEP + "g", "For", "select", { options: [["Women", "Women"], ["Kids", "Kids"]] })}${F(base + SEP + "ty", "Category", "text", { ph: "Coats, Dresses, Boots…" })}${F(base + SEP + "k", "Colours", "text", { list: true, rows: 2 })}` : `<p class="ad-p"><b>${esc(r.v)}</b><br>${esc(r.d)} · ${esc(r.ty || "")} · ${esc(r.g)}</p><small class="ad-hint">Brand and category come from the brand’s catalogue.</small>`)}
      </div></div>`);
    const del = $("#pd-del"); if (del) del.onclick = () => { if (!confirm("Delete this product?")) return; const t = D.products[ci].t; D.products.splice(ci, 1); save("Product deleted", ["Deleted product", t]); location.hash = "#products"; };
  }

  /* =========================================================
     BRANDS
     ========================================================= */
  function brandsPage() {
    const list = brandList(), sales = {}; orders().filter((o) => stOf(o) !== "Cancelled").forEach((o) => o.items.forEach((x) => { sales[x.v] = (sales[x.v] || 0) + (x.p || 0) * x.qty; }));
    shell("brands", `Brands <em class="ad-count">${list.length}</em>`, can("brands", "edit") ? `<button class="ad-btn ad-btn--dark" id="br-new">${ico("plus")}Add brand</button>` : "",
      `${roBanner("brands")}${card("", `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Brand</th><th class="num">Products</th><th class="num">Sales</th><th>Status</th><th></th></tr></thead><tbody>${list.map((b) => { const info = D.brands[b.name] || {}; return `<tr data-go="#brands/${encodeURIComponent(b.name)}"><td><span class="ad-prod">${info.logo ? `<img class="ad-logo-sm" src="${esc(img(info.logo, 120))}" alt="">` : `<span class="ad-logo-ph">${esc(b.name.slice(0, 2))}</span>`}<span><b>${esc(b.name === "Malabisy" ? "Malabisy Label" : b.name)}</b>${info.about ? `<small>${esc(info.about.slice(0, 60))}…</small>` : ""}</span></span></td><td class="num">${b.live}${b.count !== b.live ? ` <small class="ad-muted">(${b.count - b.live} hidden)</small>` : ""}</td><td class="num">${money(sales[b.name] || 0)}</td><td>${info.hidden ? pill("Hidden") : pill("Active")}</td><td class="num"><a class="ad-link" href="${b.name === "Malabisy" ? "malabisy.html" : "brand.html?b=" + slug(b.name)}" target="_blank" rel="noopener" data-stop>View ↗</a></td></tr>`; }).join("")}</tbody></table></div>`, "", "ad-card--flush")}`);
    const n = $("#br-new"); if (n) n.onclick = () => modal("Add brand", `<label class="ad-f"><span>Brand name</span><input name="n" required></label><small class="ad-hint">A brand appears in the store once it has a product. You’ll add the first one next.</small>`, (f) => {
      const name = f.n.value.trim(); if (!name) return "Enter a name."; if (brandList().some((b) => b.name.toLowerCase() === name.toLowerCase())) return "That brand already exists.";
      D.brands[name] = D.brands[name] || {}; const nh = "cms-" + uid(); D.products.push({ h: nh, t: "", v: name, p: "", c: "", d: "Clothing", g: "Women", ty: "", s: ["S", "M", "L"], a: [], k: [], i: [], b: "", n: true }); save("Brand created", ["Created brand", name]); location.hash = "#products/" + nh; return true;
    }, "Create brand");
  }
  function brandPage(name) {
    const b = brandList().find((x) => x.name === name); if (!b && !D.brands[name]) return notFound();
    const base = "brands" + SEP + name;
    shell("brands", `<a class="ad-back" href="#brands" aria-label="Back to brands">←</a> ${esc(name)}`, `<a class="ad-btn" href="#products?b=${encodeURIComponent(name)}">Products (${b ? b.count : 0})</a><a class="ad-btn" href="${name === "Malabisy" ? "malabisy.html" : "brand.html?b=" + slug(name)}" target="_blank" rel="noopener">View in store ${ico("ext")}</a>`,
      `${roBanner("brands")}<div class="ad-grid2"><div class="ad-col">${card("Brand page", F(base + SEP + "logo", "Logo", "image") + F(base + SEP + "about", "About the brand", "textarea", { rows: 5, hint: "Shown under the brand name on its page." }))}</div><div class="ad-col">${card("Status", F(base + SEP + "hidden", "Hide this brand and all its products", "check"))}</div></div>`);
  }

  /* =========================================================
     CONTENT (visual editor lives in the store, opened from here)
     ========================================================= */
  function contentPage() {
    const ed = can("content", "edit"), secs = (D.sections || []).length, edits = (D.texts || []).length + (D.images || []).length + (D.hidden || []).length;
    shell("content", "Content & editor", ed ? `<a class="ad-btn ad-btn--dark" href="index.html?edit">${ico("content")}Open the editor</a>` : "",
      `${roBanner("content")}<div class="ad-theme ad-card"><div class="ad-theme__prev"><iframe src="index.html?med-preview=1" title="Store preview" tabindex="-1" loading="lazy"></iframe></div><div><h2 class="ad-h2">Visual editor</h2><p class="ad-p">Opens the store with the editor on the left. Add sections to any page, click any text or image to change it, hide anything, change colours, fonts, the menu and the footer, and preview on phone and tablet. Only signed-in team members with content access can open it.</p><div class="ad-mini ad-mini--inline"><div><span>Added sections</span><b>${secs}</b></div><div><span>Text, image & hide changes</span><b>${edits}</b></div><div><span>Custom pages</span><b>${(D.pages || []).length}</b></div></div>${ed ? `<div class="ad-row"><a class="ad-btn ad-btn--dark" href="index.html?edit">Open the editor</a><a class="ad-btn" href="index.html?edit" id="ed-menu">Edit menu & footer</a></div>` : ""}</div></div>
      <div class="ad-grid2"><div class="ad-col">${card(`Pages <em class="ad-count">${(D.pages || []).length}</em>`, `${ed ? `<div class="ad-row"><input id="pg-t" placeholder="New page title, e.g. Ramadan Edit" aria-label="New page title"><label class="ad-check"><input type="checkbox" id="pg-nav" checked><span>In menu</span></label><button class="ad-btn ad-btn--dark" id="pg-add">Create</button></div>` : ""}
          ${(D.pages || []).length ? `<ul class="ad-list">${D.pages.map((p, i) => `<li><span><b>${esc(p.title)}</b><small>page.html?p=${esc(p.slug)}${p.nav ? " · in menu" : ""}</small></span>${ed ? `<span class="ad-row"><a class="ad-btn ad-btn--sm" href="page.html?p=${encodeURIComponent(p.slug)}&edit">Edit</a><button class="ad-btn ad-btn--sm" data-pgnav="${i}">${p.nav ? "Remove from menu" : "Add to menu"}</button><button class="ad-btn ad-btn--sm ad-btn--danger" data-pgdel="${i}">Delete</button></span>` : ""}</li>`).join("")}</ul>` : `<p class="ad-muted">No custom pages yet.</p>`}`)}</div>
        <div class="ad-col">${card("Announcement bar", F("settings" + SEP + "announce", "Messages (they rotate)", "text", { list: true, rows: 4, ph: "Free delivery on orders over LE 3,500" }))}</div></div>`);
    const em = $("#ed-menu"); if (em) em.onclick = () => sessionStorage.setItem("med_tab", "chrome");
    const add = $("#pg-add"); if (add) add.onclick = () => { const t = $("#pg-t").value.trim(); if (!t) return $("#pg-t").focus(); let s = slug(t) || "page"; while (D.pages.some((p) => p.slug === s)) s += "-2"; D.pages.push({ slug: s, title: t, nav: $("#pg-nav").checked }); D.sections.push({ id: uid(), type: "hero", page: "custom:" + s, scope: "type", pos: "top", data: { title: t, text: "Describe this page.", tone: "light", layout: "split", button: "Shop now", link: "marketplace.html" } }); save("Page created", ["Created page", t]); route(); };
    $$("[data-pgnav]").forEach((b) => b.onclick = () => { const p = D.pages[+b.dataset.pgnav]; p.nav = !p.nav; save("Saved", [(p.nav ? "Added to menu" : "Removed from menu"), p.title]); route(); });
    $$("[data-pgdel]").forEach((b) => b.onclick = () => { const p = D.pages[+b.dataset.pgdel]; if (!confirm(`Delete “${p.title}”?`)) return; D.pages.splice(+b.dataset.pgdel, 1); D.sections = D.sections.filter((s) => s.page !== "custom:" + p.slug); save("Page deleted", ["Deleted page", p.title]); route(); });
  }

  /* =========================================================
     AI STYLIST — full control: what it stored, what it knows, what it says, what it may do
     ========================================================= */
  const INTENT_LABEL = { recommend: "Product search", outfit: "Outfit", color: "Colour advice", compare: "Compare", size: "Size help", measure: "Measurements", fabric: "Fabric", gift: "Gift ideas", delivery: "Delivery", returns: "Exchanges", payment: "Payment", track: "Order tracking", human: "Talk to a person", who: "Who are you", help: "What can you do", hello: "Greeting", thanks: "Thanks", compliment: "Compliment", no: "No", more: "Show more", bag: "My bag", brands: "Brand list", nobrand: "Brand not carried", nomen: "Menswear", sell: "Sell on the site", offtopic: "Off-topic", unknown: "Not understood" };
  const SKILLS = [["outfits", "Build complete outfits", "Looks for an occasion or around a piece, with the total price and “Add look”."], ["colors", "Colour advice", "Which colours go with a colour or a piece."], ["compare", "Compare pieces", "Side-by-side table of 2–3 pieces."], ["sizes", "Size help", "Size questions and matching body measurements to the size guide."], ["brands", "Brand search", "Understands brand names in English, Arabic, Franco and typos."], ["policies", "Store questions", "Delivery, exchanges, payment, order tracking, customer care, selling on the site."], ["gifts", "Gift ideas", "Suggests easy gifts (bags, accessories, knitwear)."], ["crossSell", "Suggest matching pieces after “Add”", "After a shopper adds a piece, shows pieces that go with it."], ["nudge", "Gentle pop-up hint", "Once per visit, a small hint after the shopper has looked around."], ["memory", "Remember the shopper’s size", "Shows pieces in their size first, saved in their browser."]];
  const REPLIES = [["hello", "Greeting reply", "Hello! What are you shopping for today: an occasion, a piece, or a colour you love?"], ["help", "“What can you do?”", "I can find pieces by type, colour, size or budget, build a complete outfit for an occasion, suggest colours that match, compare pieces, and answer questions about sizes, delivery, exchanges and payment. You can write in English, Arabic or Franco."], ["who", "“Who are you?”", "I’m the Malabisy stylist, a shopping assistant that only suggests pieces that are in stock right now."], ["delivery", "Delivery", "Malabisy delivers across Egypt, with fast delivery in Cairo & Giza. Delivery takes {days} working days, and it’s free on orders over {free}."], ["returns", "Exchanges", "Items can be exchanged within {exchange} days in their original condition."], ["payment", "Payment", "You can pay by {payments}. You choose at the payment step of checkout."], ["track", "Order tracking", "Your orders and their status are in My account → Orders."], ["human", "Talk to a person", "I can’t connect you to a person from this chat. The Customer care links at the bottom of every page cover order tracking, delivery and exchanges."], ["sell", "Selling on the site", "Brands can join the Marketplace through Sell on Malabisy."], ["thanks", "Thanks", "With pleasure. Anything else I can style for you?"], ["compliment", "Compliment", "Glad you like it! Want more like this, or shall I build a full look?"], ["no", "“No”", "No problem. Tell me what you’d prefer: a different colour, a lower budget, or another kind of piece."], ["nobrand", "Brand we don’t carry", "I couldn't find a brand called “{brand}” on Malabisy. These brands are available:"], ["nomen", "Menswear request", "Malabisy currently carries womenswear and kids’ pieces only, so I can’t suggest menswear."], ["offtopic", "Off-topic question", "That’s outside what I can help with here. I’m best at outfits, sizes, colours, delivery and payment."], ["unknown", "Didn’t understand", "Sorry, I didn’t understand “{word}”."], ["unknownHint", "…followed by", "Tell me a piece, a colour, an occasion or a budget, in English, Arabic or Franco."], ["off", "A switched-off skill was asked for", "That isn’t something I can help with here. I can suggest pieces by type, colour or budget."]];
  function stylistPage(tab = "overview") {
    const ed = can("stylist", "edit"), A = D.assistant || {}, logs = LS.get("mst_log", []), kb = LS.get("mst_kb", null);
    const TABS = [["overview", "Overview"], ["chats", `Conversations <em>${fmt(logs.length)}</em>`], ["skills", "Skills"], ["replies", "Replies"], ["knowledge", "Knowledge"], ["taught", `Taught answers <em>${(A.qa || []).length}</em>`], ["look", "Appearance"]];
    const on = !A.off;
    const head = `<div class="ad-tabs">${TABS.map(([k, l]) => `<a href="#stylist/${k}" class="${tab === k ? "on" : ""}">${l}</a>`).join("")}</div>`;
    let body = "";
    if (tab === "overview") {
      const wk = logs.filter((x) => Date.parse(x.at) > Date.now() - 7 * 864e5), ok = logs.filter((x) => x.ok).length, miss = logs.filter((x) => !x.ok);
      const by = {}; logs.forEach((x) => { by[x.i] = (by[x.i] || 0) + 1; }); const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8), mx = top.length ? top[0][1] : 1;
      const br = {}; logs.forEach((x) => { if (x.b) br[x.b] = (br[x.b] || 0) + 1; }); const topB = Object.entries(br).sort((a, b) => b[1] - a[1]).slice(0, 6);
      body = `<div class="ad-mini"><div><span>Status</span><b>${on ? "On" : "Off"}</b></div><div><span>Messages stored</span><b>${fmt(logs.length)}</b></div><div><span>Last 7 days</span><b>${fmt(wk.length)}</b></div><div><span>Understood</span><b>${logs.length ? Math.round((ok / logs.length) * 100) : 0}%</b></div><div><span>Not answered</span><b class="${miss.length ? "ad-warn" : ""}">${fmt(miss.length)}</b></div></div>
        <div class="ad-grid2"><div class="ad-col">${card("What shoppers ask for", top.length ? `<ul class="ad-hbars">${top.map(([k, n]) => `<li><span>${esc(INTENT_LABEL[k] || k)}</span><i><b style="width:${(n / mx) * 100}%"></b></i><em>${n}</em></li>`).join("")}</ul>` : empty("No conversations stored yet. Messages appear here as shoppers use the stylist."))}
          ${card(`Not answered yet <em class="ad-count">${miss.length}</em>`, miss.length ? `<ul class="ad-list">${miss.slice(0, 8).map((x) => `<li><span><b>“${esc(x.m)}”</b><small>${esc(INTENT_LABEL[x.i] || x.i)} · ${ago(x.at)}</small></span>${ed ? `<button class="ad-btn ad-btn--sm" data-teach="${esc(x.m)}">Teach an answer</button>` : ""}</li>`).join("")}</ul>` : empty("Everything was understood."), `<a class="ad-link" href="#stylist/chats?f=miss">See all</a>`)}</div>
          <div class="ad-col">${card("Most asked brands", topB.length ? `<ul class="ad-list">${topB.map(([b, n]) => `<li><span><b>${esc(b)}</b></span><span class="ad-muted">${n} message${n === 1 ? "" : "s"}</span></li>`).join("")}</ul>` : empty("No brand questions yet."))}
          ${card("What it stores", `<ul class="ad-list"><li><span><b>Conversation log</b><small>Each message, what it understood, the page, the time. Last 1,000 kept.</small></span></li><li><span><b>Shopper’s size</b><small>Only in that shopper’s browser, if “Remember size” is on.</small></span></li><li><span><b>Chat on screen</b><small>Kept for the visit only, cleared when the tab closes.</small></span></li></ul><small class="ad-hint">Prototype: the log is kept in this browser. A live store would save it on the server.</small>`)}</div></div>`;
    }
    if (tab === "chats") {
      const qs = new URLSearchParams((location.hash.split("?")[1]) || ""), f = qs.get("f") || "", t = (qs.get("q") || "").toLowerCase();
      let l = logs; if (f === "miss") l = l.filter((x) => !x.ok); if (f === "ok") l = l.filter((x) => x.ok); if (t) l = l.filter((x) => (x.m + " " + x.i + " " + x.b).toLowerCase().includes(t));
      body = card("", `<div class="ad-filters"><label class="ad-fsearch">${ico("search")}<input id="ch-q" placeholder="Search messages" value="${esc(t)}"></label><select id="ch-f" aria-label="Filter"><option value="">All messages</option><option value="miss" ${f === "miss" ? "selected" : ""}>Not answered</option><option value="ok" ${f === "ok" ? "selected" : ""}>Understood</option></select><span class="ad-muted">${fmt(l.length)} messages</span><button class="ad-btn ad-btn--sm" id="ch-exp">${ico("dl")}Export</button>${ed && logs.length ? `<button class="ad-btn ad-btn--sm ad-btn--danger" id="ch-clr">Clear log</button>` : ""}</div>
        ${l.length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>When</th><th>Message</th><th>Understood as</th><th>Brand</th><th>Page</th><th></th></tr></thead><tbody>${l.slice(0, 300).map((x) => `<tr><td title="${esc(dtime(x.at))}">${ago(x.at)}</td><td><b dir="auto">${esc(x.m)}</b></td><td>${x.ok ? esc(INTENT_LABEL[x.i] || x.i) : `<span class="ad-warn">${esc(INTENT_LABEL[x.i] || x.i)}</span>`}</td><td>${esc(x.b || "—")}</td><td>${esc(x.p || "")}</td><td class="num">${ed ? `<button class="ad-link" data-teach="${esc(x.m)}">Teach</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : empty("No messages here.")}`, "", "ad-card--flush");
    }
    if (tab === "skills") {
      body = `<div class="ad-grid2"><div class="ad-col">${card("What the stylist may do", `<p class="ad-p">Switch off anything you don’t want it to do. When a shopper asks for a switched-off skill, it gives the “switched-off skill” reply from the Replies tab.</p>${SKILLS.map(([k, l, h]) => F(`assistant${SEP}skills${SEP}${k}`, l, "switch", { hint: h, def: true })).join("")}`)}</div>
        <div class="ad-col">${card("Results", F(`assistant${SEP}limit`, "Pieces per answer", "number", { ph: "6", hint: "Between 2 and 12." }))}${card("Always on", `<p class="ad-p">It only suggests pieces that are <b>in stock</b>, and never invents product facts. Delivery, exchange and payment details come from Settings.</p>`)}</div></div>`;
    }
    if (tab === "replies") {
      body = card("Every reply it gives", `<p class="ad-p">Leave a box empty to keep the built-in text (shown greyed). You can use <code>{free}</code> free-delivery amount, <code>{days}</code> delivery days, <code>{exchange}</code> exchange days, <code>{payments}</code> payment methods, <code>{brand}</code> and <code>{word}</code> where shown, and <code>**bold**</code>.</p><div class="ad-replies">${REPLIES.map(([k, l, d]) => F(`assistant${SEP}replies${SEP}${k}`, l, "textarea", { rows: 2, ph: d })).join("")}</div>`);
    }
    if (tab === "knowledge") {
      const brandsAll = brandList().map((b) => b.name);
      const meanings = kb ? Object.entries(kb.meanings).filter(([m]) => !/^_/.test(m)).sort((a, b) => b[1].length - a[1].length) : [];
      body = `<div class="ad-mini">${kb ? [["Words & spellings it knows", fmt(kb.words)], ["Phrases", fmt(kb.phrases)], ["Brands", fmt(kb.brands)], ["Brands it knows we don’t carry", fmt(kb.notCarried.length)], ["Updated", ago(kb.at)]].map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("") : `<div><span>Knowledge</span><b>Open any store page once to load it</b></div>`}</div>
        <div class="ad-grid2"><div class="ad-col">${card("Add your own words", `<p class="ad-p">Teach it a word or phrase and what it means: a spelling, a nickname, slang. Example: “كاجوال شيك” means casual, “بدلة” means set.</p>
            ${(A.words || []).map((x, i) => `<div class="ad-row2 ad-rep">${F(`assistant${SEP}words${SEP}${i}${SEP}w`, "Word or phrase", "text", { ph: "e.g. بدلة" })}${F(`assistant${SEP}words${SEP}${i}${SEP}m`, "Means", "text", { ph: "e.g. set", hint: "An English word it already knows (see the list)." })}${ed ? `<button class="ad-link" data-rm="words" data-i="${i}">Remove</button>` : ""}</div>`).join("")}${ed ? `<button class="ad-btn" data-add="words">${ico("plus")}Add word</button>` : ""}`)}
          ${card("Extra brand spellings", `<p class="ad-p">Other ways shoppers write a brand you carry.</p>${(A.aliases || []).map((x, i) => `<div class="ad-row2 ad-rep">${F(`assistant${SEP}aliases${SEP}${i}${SEP}a`, "Spelling", "text", { ph: "e.g. كاروهات براند" })}${F(`assistant${SEP}aliases${SEP}${i}${SEP}b`, "Brand", "select", { options: [["", "Choose a brand"], ...brandsAll.map((b) => [b, b])] })}${ed ? `<button class="ad-link" data-rm="aliases" data-i="${i}">Remove</button>` : ""}</div>`).join("")}${ed ? `<button class="ad-btn" data-add="aliases">${ico("plus")}Add spelling</button>` : ""}`)}
          ${card("Brands we don’t carry", `${kb ? `<div class="ad-chips">${kb.notCarried.map((n) => `<span>${esc(n)}</span>`).join("")}</div>` : ""}${F(`assistant${SEP}notCarried`, "Add more (one per line)", "text", { list: true, rows: 3, hint: "When a shopper asks for these, it says plainly that the store doesn’t carry them." })}`)}</div>
          <div class="ad-col">${card("What it understands", kb ? `<label class="ad-fsearch">${ico("search")}<input id="kb-q" placeholder="Find a word, e.g. fostan or جاكيت"></label><div class="ad-kb" id="kb-list">${meanings.map(([m, ws]) => `<details data-kb="${esc((m + " " + ws.join(" ")).toLowerCase())}"><summary><b>${esc(m)}</b><span>${ws.length}</span></summary><div class="ad-chips">${ws.map((w) => `<span dir="auto">${esc(w)}</span>`).join("")}</div></details>`).join("")}</div>
            <h3 class="ad-h3">Colours</h3><div class="ad-chips">${kb.colors.map((c) => `<span>${esc(c)}</span>`).join("")}</div><h3 class="ad-h3">Occasions</h3><div class="ad-chips">${kb.occasions.map((c) => `<span>${esc(c)}</span>`).join("")}</div><h3 class="ad-h3">Categories</h3><div class="ad-chips">${kb.categories.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : empty("Open any store page once, then come back. The stylist writes what it knows when it loads."))}
          ${kb ? card("Brand spellings it knows", `<div class="ad-kb">${Object.entries(kb.aliases).map(([b, as]) => `<details><summary><b>${esc(b)}</b><span>${as.length}</span></summary><div class="ad-chips">${as.map((a) => `<span dir="auto">${esc(a)}</span>`).join("")}</div></details>`).join("")}</div>`) : ""}</div></div>`;
    }
    if (tab === "taught") {
      const qa = A.qa || [];
      body = card(`Taught answers <em class="ad-count">${qa.length}</em>`, `<p class="ad-p">When a message contains one of the words, the stylist replies with your answer, before anything else (English, Arabic and Franco).</p>${qa.map((x, i) => `<div class="ad-qa">${F(`assistant${SEP}qa${SEP}${i}${SEP}keys`, "Words or phrases (comma separated)", "text", { ph: "gift wrap, تغليف, taghlif" })}${F(`assistant${SEP}qa${SEP}${i}${SEP}answer`, "Answer", "textarea", { rows: 2 })}${ed ? `<button class="ad-link" data-rm="qa" data-i="${i}">Remove</button>` : ""}</div>`).join("")}${ed ? `<button class="ad-btn" data-add="qa">${ico("plus")}Add answer</button>` : ""}`);
    }
    if (tab === "look") {
      body = `<div class="ad-grid2"><div class="ad-col">${card("Conversation", F("assistant" + SEP + "greeting", "First message", "textarea", { rows: 3, ph: "Hi, I’m your Malabisy stylist…" }) + F("assistant" + SEP + "chips", "Suggested questions", "text", { list: true, rows: 4, ph: "Office look under LE 2,000" }))}</div>
        <div class="ad-col">${card("Names", F("assistant" + SEP + "name", "Name", "text", { ph: "Malabisy Stylist" }) + F("assistant" + SEP + "subtitle", "Subtitle", "text", { ph: "Personal shopping assistant" }) + F("assistant" + SEP + "launcher", "Button title", "text", { ph: "AI Stylist" }) + F("assistant" + SEP + "launcherSub", "Button subtitle", "text", { ph: "Outfits, colours & sizes" }))}</div></div>`;
    }
    shell("stylist", `AI stylist ${on ? pill("On") : pill("Off")}`, `${ed ? `<label class="ad-switch ad-switch--head"><input type="checkbox" role="switch" id="st-on" ${on ? "checked" : ""}><span class="ad-switch__ui"></span><span>${on ? "Turned on" : "Turned off"}</span></label>` : ""}<a class="ad-btn" href="index.html" target="_blank" rel="noopener">Try it in the store ${ico("ext")}</a>`, roBanner("stylist") + head + body);
    const sw = $("#st-on"); if (sw) sw.onchange = () => { if (!sw.checked && !confirm("Turn the AI stylist off? It disappears from the store for every shopper.")) { sw.checked = true; return; } D.assistant.off = !sw.checked; save(sw.checked ? "AI stylist on" : "AI stylist off", [sw.checked ? "Turned the AI stylist on" : "Turned the AI stylist off", "AI stylist"]); route(); };
    $$("[data-teach]").forEach((b) => b.onclick = () => { D.assistant.qa = D.assistant.qa || []; D.assistant.qa.push({ keys: b.dataset.teach.slice(0, 60), answer: "" }); save("Added. Write the answer.", ["Started a taught answer", b.dataset.teach.slice(0, 40)]); location.hash = "#stylist/taught"; });
    $$("[data-add]").forEach((b) => b.onclick = () => { const k = b.dataset.add; D.assistant[k] = D.assistant[k] || []; D.assistant[k].push(k === "qa" ? { keys: "", answer: "" } : k === "words" ? { w: "", m: "" } : { a: "", b: "" }); save("Added", ["Added " + { qa: "a taught answer", words: "a custom word", aliases: "a brand spelling" }[k], "AI stylist"]); route(); });
    $$("[data-rm]").forEach((b) => b.onclick = () => { D.assistant[b.dataset.rm].splice(+b.dataset.i, 1); save("Removed", ["Removed " + { qa: "a taught answer", words: "a custom word", aliases: "a brand spelling" }[b.dataset.rm], "AI stylist"]); route(); });
    const kq = $("#kb-q"); if (kq) kq.oninput = () => { const v = kq.value.trim().toLowerCase(); $$("#kb-list details").forEach((d) => { const hit = !v || d.dataset.kb.includes(v); d.hidden = !hit; d.open = !!v && hit; }); };
    const cq = $("#ch-q"); if (cq) { let tm; cq.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { const p = new URLSearchParams((location.hash.split("?")[1]) || ""); p.set("q", cq.value.trim()); location.hash = "#stylist/chats?" + p; }, 350); }; }
    const cf = $("#ch-f"); if (cf) cf.onchange = () => { const p = new URLSearchParams((location.hash.split("?")[1]) || ""); cf.value ? p.set("f", cf.value) : p.delete("f"); location.hash = "#stylist/chats?" + p; };
    const ce = $("#ch-exp"); if (ce) ce.onclick = () => csv("stylist-conversations", ["When", "Message", "Understood as", "Brand", "Page", "Answered"], logs.map((x) => [x.at, x.m, INTENT_LABEL[x.i] || x.i, x.b, x.p, x.ok ? "yes" : "no"]));
    const cc = $("#ch-clr"); if (cc) cc.onclick = () => { if (!confirm("Delete the stored conversation log? This cannot be undone (export first).")) return; localStorage.removeItem("mst_log"); log("Cleared the stylist conversation log"); toast("Log cleared"); route(); };
  }

  /* =========================================================
     SETTINGS
     ========================================================= */
  // Store status: maintenance mode and the AI stylist, the two "switch off" controls
  function statusCard(ed) {
    const m = (D.settings && D.settings.maintenance) || {}, aiOn = !(D.assistant && D.assistant.off), mOn = !!m.on;
    return `<section class="ad-card ad-status ${mOn ? "is-maint" : ""}"><div class="ad-card__hd"><h2>Store status</h2>${mOn ? pill("Maintenance") : pill("Active")}</div>
      <div class="ad-status__row"><label class="ad-switch"><input type="checkbox" role="switch" id="mt-on" ${mOn ? "checked" : ""} ${ed ? "" : "disabled"}><span class="ad-switch__ui"></span><span><b>Maintenance mode</b><small>${mOn ? "The store is closed to visitors. Signed-in team members still see it, with a red bar." : "Close the store to visitors while you work on it. They see a “back soon” page."}</small></span></label>
        <label class="ad-switch"><input type="checkbox" role="switch" id="ai-on" ${aiOn ? "checked" : ""} ${ed ? "" : "disabled"}><span class="ad-switch__ui"></span><span><b>AI stylist</b><small>${aiOn ? "On: shoppers see the stylist on every page." : "Off: the stylist is hidden from the store."} <a href="#stylist">All stylist settings</a></small></span></label></div>
      <details class="ad-maint" ${mOn ? "open" : ""}><summary>Maintenance page text</summary><div class="ad-grid2 ad-grid2--tight"><div class="ad-col">${F("settings" + SEP + "maintenance" + SEP + "title", "Title", "text", { ph: "We’ll be back soon" })}${F("settings" + SEP + "maintenance" + SEP + "message", "Message", "textarea", { rows: 3, ph: "We’re updating the store to make shopping better. Please check back shortly." })}</div><div class="ad-col">${F("settings" + SEP + "maintenance" + SEP + "until", "Expected back (optional)", "datetime-local")}<a class="ad-btn" href="index.html?maint-preview=1" target="_blank" rel="noopener">Preview the page ${ico("ext")}</a></div></div></details></section>`;
  }
  function bindStatus() {
    const mt = $("#mt-on"); if (mt) mt.onchange = () => { if (mt.checked && !confirm("Turn on maintenance mode? Visitors will see the “back soon” page until you turn it off.")) { mt.checked = false; return; } D.settings.maintenance = D.settings.maintenance || {}; D.settings.maintenance.on = mt.checked; save(mt.checked ? "Store closed for maintenance" : "Store is open again", [mt.checked ? "Turned maintenance mode on" : "Turned maintenance mode off", "Store status"]); route(); };
    const ai = $("#ai-on"); if (ai) ai.onchange = () => { if (!ai.checked && !confirm("Turn the AI stylist off for every shopper?")) { ai.checked = true; return; } D.assistant = D.assistant || {}; D.assistant.off = !ai.checked; save(ai.checked ? "AI stylist on" : "AI stylist off", [ai.checked ? "Turned the AI stylist on" : "Turned the AI stylist off", "Store status"]); route(); };
  }
  function settingsPage() {
    const S = "settings" + SEP, pays = D.settings.payments && D.settings.payments.length ? D.settings.payments : clone(PAY_DEFAULT), ed = can("settings", "edit");
    const size = new Blob([JSON.stringify(D)]).size, sampleN = orders().filter((o) => o.sample).length;
    shell("settings", "Settings", "",
      `${roBanner("settings")}${statusCard(ed)}<div class="ad-grid2"><div class="ad-col">${card("Delivery", `<div class="ad-row2">${F(S + "freeOver", "Free delivery from (LE)", "number", { ph: "3500" })}${F(S + "deliveryFee", "Delivery fee (LE)", "number", { ph: "70" })}</div>${F(S + "deliveryDays", "Delivery time (working days)", "text", { ph: "2–5" })}`)}
        ${card("Payment methods", `<ul class="ad-list">${pays.map((p, i) => `<li><label class="ad-check"><input type="checkbox" data-pay="${i}" data-k="on" ${p.on !== false ? "checked" : ""} ${ed ? "" : "disabled"}><span><b>${esc(p.name)}</b></span></label><input data-pay="${i}" data-k="note" value="${esc(p.note || "")}" aria-label="Note shown at checkout" ${ed ? "" : "disabled"}></li>`).join("")}</ul>`)}
        ${card("Store details", F(S + "footerText", "About text (footer)", "textarea", { rows: 2 }) + F(S + "copyright", "Copyright line", "text", { ph: "© 2026 Malabisy. All rights reserved." }) + F(S + "logo", "Logo", "image") + F(S + "logoWhite", "Logo on black", "image"))}</div>
        <div class="ad-col">${card("Exchanges", F(S + "exchangeDays", "Exchange window (days)", "number", { ph: "14" }))}
        ${isSuper() ? card("Data", `<p class="ad-p">This prototype has no server: everything is saved in this browser (${(size / 1024).toFixed(1)} KB of settings, ${orders().length} orders${sampleN ? `, ${sampleN} of them sample orders` : ""}).</p><div class="ad-row"><button class="ad-btn ad-btn--dark" id="dt-exp">${ico("dl")}Export everything</button><label class="ad-btn">Import<input type="file" id="dt-imp" accept="application/json" hidden></label></div>
          <div class="ad-row">${sampleN ? `<button class="ad-btn" id="sm-rm">Remove sample orders</button>` : `<button class="ad-btn" id="sm-add">Load sample orders</button>`}<button class="ad-btn ad-btn--danger" id="dt-reset">Reset store settings</button></div>`) : ""}</div></div>`);
    bindStatus();
    $$("[data-pay]").forEach((el) => el.onchange = () => { if (!ed) return; const list = D.settings.payments && D.settings.payments.length ? D.settings.payments : clone(PAY_DEFAULT); const p = list[+el.dataset.pay]; if (el.dataset.k === "on") p.on = el.checked; else p.note = el.value; if (!list.some((x) => x.on !== false)) { el.checked = true; p.on = true; return toast("Keep at least one payment method on"); } D.settings.payments = list; save("Saved", [(el.dataset.k === "on" ? (p.on ? "Turned on " : "Turned off ") : "Changed note for ") + p.name, "Payments"]); });
    const ex = $("#dt-exp"); if (ex) ex.onclick = () => { const blob = new Blob([JSON.stringify({ site: D, orders: orders(), users: users().map(({ hash, salt, ...u }) => u) }, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "store-" + new Date().toISOString().slice(0, 10) + ".json"; a.click(); log("Exported store data"); };
    const im = $("#dt-imp"); if (im) im.onchange = async (e) => { try { const j = JSON.parse(await e.target.files[0].text()); const site = j.site || j; if (!site || typeof site !== "object" || !("sections" in site)) throw 0; D = Object.assign(ST.empty(), site); if (Array.isArray(j.orders)) saveOrders(j.orders); save("Imported", ["Imported store data", ""]); route(); } catch { alert("That file is not an export from this dashboard."); } };
    const sa = $("#sm-add"); if (sa) sa.onclick = () => { saveOrders([...orders(), ...sampleOrders()]); log("Loaded sample orders"); toast("Sample orders loaded"); route(); };
    const sr = $("#sm-rm"); if (sr) sr.onclick = () => { saveOrders(orders().filter((o) => !o.sample)); log("Removed sample orders"); toast("Sample orders removed"); route(); };
    const rs = $("#dt-reset"); if (rs) rs.onclick = () => { if (!confirm("Reset every store setting, product edit, page and section to the original? Orders and team accounts are kept. This cannot be undone (export first).")) return; D = ST.empty(); save("Store reset", ["Reset store settings", ""]); route(); };
  }

  /* =========================================================
     TEAM & ROLES (super admin only)
     ========================================================= */
  function teamPage() {
    if (!isSuper()) return noAccess();
    const all = users();
    shell("team", `Team & roles <em class="ad-count">${all.length}</em>`, `<button class="ad-btn ad-btn--dark" id="tm-new">${ico("plus")}Add team member</button>`,
      `<div class="ad-grid2"><div class="ad-col">${card("", `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Member</th><th>Username</th><th>Role</th><th>Last sign-in</th><th>Status</th></tr></thead><tbody>${all.map((u) => `<tr data-go="#team/${esc(u.id)}"><td><span class="ad-prod"><span class="ad-av ad-av--sm">${esc(u.name.split(" ").map((x) => x[0]).join("").slice(0, 2))}</span><b>${esc(u.name)}</b>${u.id === ME.id ? ' <span class="ad-tag">you</span>' : ""}</span></td><td><code>${esc(u.username)}</code></td><td>${u.role === "super" ? pill("Super admin") : pill("Admin")}</td><td>${u.last ? ago(u.last) : "Never"}</td><td>${u.active ? pill("Active") : pill("Off")}</td></tr>`).join("")}</tbody></table></div>`, "", "ad-card--flush")}</div>
        <div class="ad-col">${card("How roles work", `<p class="ad-p"><b>Super admin</b> can do everything, including this page, settings and the activity log.</p><p class="ad-p"><b>Admin</b> sees only the sections you allow, either view-only or with editing. Open a member to set their permissions.</p>`)}</div></div>`);
    $("#tm-new").onclick = () => modal("Add team member", `<label class="ad-f"><span>Full name</span><input name="n" required autocomplete="off"></label><label class="ad-f"><span>Username</span><input name="u" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e.g. orders.team"></label><label class="ad-f"><span>Temporary password</span><input name="p" type="password" required minlength="8" autocomplete="new-password"></label><label class="ad-f"><span>Role</span><select name="r"><option value="admin">Admin (choose sections next)</option><option value="super">Super admin</option></select></label>`, async (f) => {
      const un = f.u.value.trim().toLowerCase(); if (!/^[a-z0-9._-]{3,30}$/.test(un)) return "Username: 3–30 letters, numbers, dots or dashes."; if (users().some((x) => x.username.toLowerCase() === un)) return "That username is taken."; if (f.p.value.length < 8) return "Password: at least 8 characters.";
      const salt = uid() + uid(), u = { id: "u-" + uid(), name: f.n.value.trim() || un, username: un, role: f.r.value, perms: clone(ADMIN_DEFAULT), salt, hash: await sha(salt + ":" + f.p.value), active: true, created: new Date().toISOString() };
      const all2 = users(); all2.push(u); saveUsers(all2); log("Added team member", u.name + " (" + (u.role === "super" ? "Super admin" : "Admin") + ")"); location.hash = "#team/" + u.id; return true;
    }, "Add member");
  }
  function memberPage(id) {
    if (!isSuper()) return noAccess();
    const all = users(), u = all.find((x) => x.id === id); if (!u) return notFound();
    const supers = all.filter((x) => x.role === "super" && x.active).length, lastSuper = u.role === "super" && supers <= 1;
    const perms = u.perms || clone(ADMIN_DEFAULT);
    shell("team", `<a class="ad-back" href="#team" aria-label="Back to team">←</a> ${esc(u.name)}`, `<button class="ad-btn" id="tm-pw">Reset password</button>${u.id !== ME.id ? `<button class="ad-btn ad-btn--danger" id="tm-del">Remove</button>` : ""}`,
      `<div class="ad-grid2"><div class="ad-col">${card("Permissions", u.role === "super" ? `<p class="ad-p">Super admins can see and change every section.</p>` : `<div class="ad-tablewrap"><table class="ad-table ad-perm"><thead><tr><th>Section</th><th>No access</th><th>View</th><th>Edit</th></tr></thead><tbody>${SECTIONS.map(([k, l]) => `<tr><td><span class="ad-prod">${ico(k)}<b>${l}</b></span></td>${["none", "view", "edit"].map((lv) => `<td><input type="radio" name="pm-${k}" value="${lv}" data-perm="${k}" ${(perms[k] || "none") === lv ? "checked" : ""} aria-label="${l}: ${lv}" ${k === "activity" && lv === "edit" ? "disabled" : ""}></td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="ad-row"><button class="ad-btn ad-btn--sm" data-preset="orders">Orders team</button><button class="ad-btn ad-btn--sm" data-preset="catalog">Catalog team</button><button class="ad-btn ad-btn--sm" data-preset="content">Content team</button><button class="ad-btn ad-btn--sm" data-preset="view">View everything</button></div>`, "", "ad-card--flush")}</div>
        <div class="ad-col">${card("Account", `<label class="ad-f"><span>Full name</span><input id="tm-n" value="${esc(u.name)}"></label><label class="ad-f"><span>Username</span><input value="${esc(u.username)}" disabled></label><label class="ad-f"><span>Role</span><select id="tm-r" ${lastSuper ? "disabled" : ""}><option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option><option value="super" ${u.role === "super" ? "selected" : ""}>Super admin</option></select>${lastSuper ? '<small class="ad-hint">The store needs at least one active super admin.</small>' : ""}</label><label class="ad-check"><input type="checkbox" id="tm-a" ${u.active ? "checked" : ""} ${u.id === ME.id ? "disabled" : ""}><span>Can sign in</span></label><p class="ad-muted">Added ${dlong(u.created || Date.now())} · last sign-in ${u.last ? ago(u.last) : "never"}</p>`)}
          ${card("Recent activity", (() => { const l = LS.get("mlb_admin_log", []).filter((x) => x.uid === u.id).slice(0, 8); return l.length ? `<ol class="ad-tl">${l.map((x) => `<li><b>${esc(x.action)}</b><small>${esc(x.target)}${x.target ? " · " : ""}${ago(x.at)}</small></li>`).join("")}</ol>` : `<p class="ad-muted">No activity yet.</p>`; })())}</div></div>`);
    const upd = (fn, what) => { const a = users(), x = a.find((y) => y.id === id); fn(x); saveUsers(a); log(what, x.name); toast("Saved"); route(); };
    $$("[data-perm]").forEach((r) => r.onchange = () => upd((x) => { x.perms = x.perms || clone(ADMIN_DEFAULT); x.perms[r.dataset.perm] = r.value; }, `Set ${SECTIONS.find((s) => s[0] === r.dataset.perm)[1]} to ${r.value} for`));
    const PRE = { orders: { dashboard: "view", orders: "edit", customers: "view", discounts: "view", products: "view", brands: "none", content: "none", stylist: "none", settings: "none", activity: "none" }, catalog: { dashboard: "view", orders: "view", customers: "none", discounts: "edit", products: "edit", brands: "edit", content: "none", stylist: "none", settings: "none", activity: "none" }, content: { dashboard: "view", orders: "none", customers: "none", discounts: "none", products: "view", brands: "view", content: "edit", stylist: "edit", settings: "none", activity: "none" }, view: Object.fromEntries(SECTIONS.map(([k]) => [k, "view"])) };
    $$("[data-preset]").forEach((b) => b.onclick = () => upd((x) => { x.perms = clone(PRE[b.dataset.preset]); }, `Applied “${b.textContent}” permissions to`));
    $("#tm-n").onchange = (e) => upd((x) => { x.name = e.target.value.trim() || x.name; }, "Renamed");
    $("#tm-r").onchange = (e) => upd((x) => { x.role = e.target.value; x.perms = x.perms || clone(ADMIN_DEFAULT); }, "Changed role of");
    $("#tm-a").onchange = (e) => upd((x) => { x.active = e.target.checked; }, e.target.checked ? "Allowed sign-in for" : "Blocked sign-in for");
    $("#tm-pw").onclick = () => modal(`Reset password for ${u.name}`, `<label class="ad-f"><span>New password</span><input name="p" type="password" minlength="8" required autocomplete="new-password"></label>`, async (f) => { if (f.p.value.length < 8) return "At least 8 characters."; const a = users(), x = a.find((y) => y.id === id); x.salt = uid() + uid(); x.hash = await sha(x.salt + ":" + f.p.value); saveUsers(a); log("Reset password for", x.name); toast("Password reset"); return true; }, "Reset");
    const del = $("#tm-del"); if (del) del.onclick = () => { if (lastSuper) return alert("The store needs at least one super admin."); if (!confirm(`Remove ${u.name} from the team?`)) return; saveUsers(users().filter((x) => x.id !== id)); log("Removed team member", u.name); location.hash = "#team"; };
  }

  /* =========================================================
     ACTIVITY LOG
     ========================================================= */
  function activityPage(q) {
    const who = q.get("u") || "", t = (q.get("q") || "").toLowerCase(); let l = LS.get("mlb_admin_log", []);
    if (who) l = l.filter((x) => x.uid === who); if (t) l = l.filter((x) => (x.action + " " + x.target + " " + x.name).toLowerCase().includes(t));
    const qs = (o) => "#activity?" + new URLSearchParams(Object.fromEntries(Object.entries({ u: who, q: t, ...o }).filter(([, v]) => v))).toString();
    shell("activity", "Activity log", `<button class="ad-btn" id="al-exp">${ico("dl")}Export</button>`,
      card("", `<div class="ad-filters"><label class="ad-fsearch">${ico("search")}<input id="al-q" placeholder="Search actions" value="${esc(t)}"></label><select id="al-u" aria-label="Team member"><option value="">Everyone</option>${users().map((u) => `<option value="${esc(u.id)}" ${u.id === who ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select><span class="ad-muted">${fmt(l.length)} entries</span></div>
        ${l.length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th></tr></thead><tbody>${l.slice(0, 200).map((x) => `<tr><td title="${esc(dtime(x.at))}">${ago(x.at)}</td><td><span class="ad-prod"><span class="ad-av ad-av--sm">${esc((x.name || "?").split(" ").map((y) => y[0]).join("").slice(0, 2))}</span>${esc(x.name)}</span></td><td>${esc(x.action)}</td><td>${esc(x.target || "—")}</td></tr>`).join("")}</tbody></table></div>` : empty("No activity yet.")}`, "", "ad-card--flush"));
    let tm; $("#al-q").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => (location.hash = qs({ q: e.target.value.trim() })), 350); };
    $("#al-u").onchange = (e) => (location.hash = qs({ u: e.target.value }));
    $("#al-exp").onclick = () => csv("activity", ["When", "Who", "Action", "On"], l.map((x) => [x.at, x.name, x.action, x.target]));
  }

  /* ---------- search ---------- */
  function searchPage() {
    const t = (sessionStorage.getItem("ad_q") || "").toLowerCase();
    const ps = can("products") ? products().filter((p) => (p.t + " " + p.v).toLowerCase().includes(t)).slice(0, 12) : [], os = can("orders") ? orders().filter((o) => (o.no + " " + JSON.stringify(o.address || {})).toLowerCase().includes(t)).slice(0, 12) : [], cs = can("customers") ? customerList().filter((c) => (c.name + " " + c.phone).toLowerCase().includes(t)).slice(0, 8) : [];
    shell("", `Search: “${esc(t)}”`, "", (can("orders") ? card(`Orders <em class="ad-count">${os.length}</em>`, ordersTable(os, { compact: true }), "", "ad-card--flush") : "") + (can("customers") ? card(`Customers <em class="ad-count">${cs.length}</em>`, cs.length ? `<ul class="ad-list">${cs.map((c) => `<li><a href="#customers/${encodeURIComponent(c.key)}"><span><b>${esc(c.name)}</b><small>${esc(c.phone)} · ${c.orders} orders</small></span></a></li>`).join("")}</ul>` : empty("No customers match.")) : "") + (can("products") ? card(`Products <em class="ad-count">${ps.length}</em>`, ps.length ? `<ul class="ad-list">${ps.map((p) => `<li><a href="#products/${encodeURIComponent(p.h)}"><img src="${esc(img(p.i[0], 100))}" alt=""><span><b>${esc(p.t)}</b><small>${esc(p.v)} · ${money(p.p)}</small></span></a></li>`).join("")}</ul>` : empty("No products match.")) : ""));
  }

  /* ---------- router ---------- */
  function route() {
    const s = session(); if (!s) { ME = null; return loginView(sessionStorage.getItem("ad_expired") ? "Your session ended. Sign in again." : ""); }
    ME = s.user; D = clone(ST.get());
    const [path, qs] = (location.hash.slice(1) || "dashboard").split("?"), q = new URLSearchParams(qs || ""), [sec, id] = path.split("/").map(decodeURIComponent);
    const map = { dashboard: dashboard, orders: () => (id ? orderPage(id) : ordersPage(q)), customers: () => (id ? customerPage(id) : customersPage(q)), discounts: () => (id !== undefined ? discountPage(id) : discountsPage()), products: () => (id ? productPage(id) : productsPage(q)), brands: () => (id ? brandPage(id) : brandsPage()), content: contentPage, stylist: () => stylistPage(id || "overview"), settings: settingsPage, team: () => (id ? memberPage(id) : teamPage()), activity: () => activityPage(q), search: searchPage };
    const key = map[sec] ? sec : "dashboard";
    if (key === "dashboard" && !can("dashboard")) { const first = SECTIONS.find(([k]) => can(k)); if (first && first[0] !== "dashboard") { location.hash = "#" + first[0]; return; } return noAccess(); }
    if (key !== "search" && key !== "team" && !can(key)) return noAccess();
    SEC = key;
    map[key]();
    scrollTo(0, 0);
  }
  function start() { if (!location.hash) location.hash = "#dashboard"; route(); }
  app.addEventListener("click", (e) => { if (e.target.closest("[data-stop], a, button, input, label, select")) return; const tr = e.target.closest("[data-go]"); if (tr) location.hash = tr.dataset.go; });
  addEventListener("hashchange", route);
  // the session ends after 8 hours, or at once if the account is blocked
  setInterval(() => { if (ME && !session()) { sessionStorage.setItem("ad_expired", "1"); route(); } }, 60000);
  route();
})();

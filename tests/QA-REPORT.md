# Malabisy — AI Fashion Stylist: Final QA Report

Date: 2026-11-24 · Scope: add-on feature to the existing prototype (`D:\Brandv\malabisy`), served locally on `http://localhost:5173`.
Baseline for regression: untouched copy at `D:\Brandv\malabisy-baseline`.

## 1. What changed (and nothing else)

| File | Change |
|---|---|
| `assets/js/stylist.js` | **New.** Self-contained module (IIFE). Aborts silently if the site bridge is missing. |
| `assets/css/stylist.css` | **New.** Every selector is scoped under `#mst-root` / `.mst-*`. No global rules. |
| `assets/js/app.js` | **+1 line**: read-only `window.MLB_API` bridge (catalog, prices, add-to-bag, open bag). No behaviour change. |
| 9 pages (`index, malabisy, marketplace, brands, brand, product, bag, account, sell`) | **+2 lines each**: one `<link>` and one `<script defer>`. |
| `tests/` | Test-only files (smoke test, preview fixture, screenshots, this report). Not linked from the site. |

A diff against the baseline confirms these are the only differences. Design, layout, typography, colours, navigation, product cards, cart and checkout are untouched.

## 2. Feature summary

Floating stylist avatar (bottom right) → expandable glass panel with a chat. It recommends real, in-stock catalogue items, builds full outfits (with total price and "Add look"), suggests colour pairings, compares products side by side, answers size and fabric questions, and cross-sells after an item is added. It reads the page context (on a product page it can "Complete this look"). Adds go into the site's real bag. Understands English and basic Arabic.

It moves out of the way: hides when search, the bag drawer, menus, the lightbox or filters are open; lifts above the sticky Add-to-bag bar; and fades out whenever it would cover a button, link or input.

## 3. Test results

### PASS
| Area | Test | Result |
|---|---|---|
| Regression | Smoke test, 11 page URLs, headless Edge: header, nav, product cards, filters, PDP buy box, footer counts | **Identical to baseline** (0 differences) |
| Regression | Console errors on all 11 pages, before and after | **0 / 0** |
| Regression | Filters, sort, quick add, wishlist, search, bag drawer, lightbox, size guide, PDP add to bag | PASS |
| Regression | Checkout end to end: validation, payment step, confirmation, order saved, bag cleared | PASS |
| Stylist engine | EN + Arabic queries (occasion, budget "under / between", colour, size, brand, label, sub-type such as sneakers / coats) | Real in-stock items, budget respected, 0 kids / homewear leaks |
| Stylist UI | Open / close, send, chat persists in session, Esc closes, focus returns to launcher | PASS |
| Stylist UI | Add without size → asks for size; add with size → bag + counter update; cross-sell shown | PASS |
| Stylist UI | Compare tray + comparison table | PASS |
| Stylist UI | Buttons, size pills, chips, "Add look" render styled (desktop + 375 px) | PASS (after fix B1) |
| Non-blocking | Launcher overlap scan against every control at 1440, 768, 375 px | 0 overlaps |
| Non-blocking | Hides for search / drawer / lightbox; lifts above sticky ATC | PASS |
| Responsive | Mobile 375 px: panel = viewport width, no horizontal scroll, nothing clipped | PASS |
| Accessibility | Launcher is a labelled button; panel `role="dialog"`; keyboard reachable; reduced-motion respected; small text darkened to meet contrast | PASS |
| Performance | No network calls, no extra libraries, `defer` loading; overlap check ≈0.55 ms with 476 controls | PASS |
| Syntax | `node --check` on JS files | PASS |

### FAIL
None open. All failures found during testing were fixed and retested (section 4).

### NOT TESTED
- Real phones and tablets (only emulated viewports).
- Lighthouse / Core Web Vitals scores.
- Screen readers (NVDA / VoiceOver). Only ARIA roles and keyboard flow were checked.
- Safari and Firefox. Only Edge/Chromium was used.
- Live Shopify: the prototype uses a catalogue snapshot, so stock and sizes are as of the snapshot.

## 4. Bugs found and fixed

| # | Bug | Fix | Retest |
|---|---|---|---|
| B1 | Stylist buttons, size pills and chips lost their styling (dark "Add" was invisible) because a reset rule had higher specificity | Reset moved to `:where()` (zero specificity); removed `!important` overrides | Screenshots desktop + mobile, PASS |
| B2 | Kids / homewear items appeared in outfits | Excluded unless asked for | PASS |
| B3 | Arabic queries not understood (`\b` does not work on Arabic) | Loose matching for Arabic words | PASS |
| B4 | Too-broad results (sneakers → loafers) and repeated colourways | Sub-type narrowing + one colourway per model, max 2 per brand | PASS |
| B5 | Launcher could cover small controls / content after re-render | Exact rectangle overlap check + DOM observer | 0 overlaps |
| B6 | Startup error "Cannot access queueDodge before initialization" | Declaration order fixed | 0 console errors |
| B7 | Small grey text in panel below contrast target | Darker grey | PASS |

## 5. Known limitations (honest notes)

- The stylist is a **rule-based engine** on the real catalogue, not a large language model. It does not invent products, but it understands a fixed set of intents and words. Connecting an LLM later needs a backend and an API key.
- Fabric advice uses product titles only (the catalogue has no fabric field).
- A few Arabic words for "sale" and "kids" use simpler matching than the rest.
- Pre-existing (not changed, per "don't change global colours"): the site's light grey muted text is about 3.5:1 contrast.
- `tests/stylist-preview.html` is a test fixture; delete the `tests/` folder before going live if preferred.

This report does not claim the site is bug-free: it covers what was tested above.

## 6. Update: the stylist understands Arabic, Franco and typos (2026-11-24)

**Problem:** any message the stylist did not recognise (e.g. "amaza") fell through to "recommend anything" and showed 6 random pieces.

**What changed (only `assets/js/stylist.js`):**
- A language layer that runs before the parser. It handles:
  - Egyptian Arabic, including prefixes (للفرح، بالاسود), ة/ه and أ/ا forms, and Arabic digits.
  - Franco-Arabic (3ayza, a7mar, ta7t 2000, lel fara7).
  - Typos, with an edit distance of 1–2, against product words only.
  - Elongated letters ("helloooo").
  - Money forms: 2k, ألف ونص, b 1500, "between / from … to", "around".
- New understood requests:
  - Delivery, exchanges, payment, order tracking, talking to a person, who are you, what can you do, selling on Malabisy.
  - Body measurements → size from the site's own size guide.
  - Height or weight only → honestly asks for measurements instead.
  - Gifts, modest wear, new arrivals, "best", excluded colours ("not black", "msh 3ayza eswed").
  - Menswear → honestly says the site carries womenswear and kids only.
  - Off-topic (weather, jokes).
- **Messages it cannot understand** get "Sorry, I didn't understand … Did you mean …?" with example chips. They no longer get random products.
- Brand names that are also colour words (e.g. "Ema Black & White") now need the full brand name.
- Results default to womenswear unless kids are asked for.
- All policy answers use the site's own text:
  - Delivery: 2–5 working days, free over LE 2,000.
  - Exchanges: within 14 days.
  - Payment: COD, card, Vodafone Cash, InstaPay, valU.

**Tests:** 89 typed messages in English, typos, Arabic, Franco and nonsense (`tests/stylist-nlu-cases.js`). They run through the real stylist in headless Edge with `node tests/stylist-nlu.mjs`, and each one also checks that there are in-stock results where products are expected.

| Result | Count |
|---|---|
| PASS | 89 / 89 |
| Regression smoke test (11 pages) | Same landmarks as before, 0 console errors |
| Checked by hand in the chat UI | "amaza", Franco dress request, Arabic delivery question, measurements |

**Limits:** it is still rule-based. It understands the words and patterns in its dictionary (about 820 English, Arabic and Franco word forms, plus phrases) and close misspellings of them. A sentence built only from words it has never seen is answered with "didn't understand", not a guess.

### Update: brand names
- Every brand on the site is recognised by:
  - its full name, the name written without spaces, and short forms ("carina", "mr joe", "xo").
  - Arabic spellings (كافا، كارينا، مستر جو، مروة العزبي، اكس او ستايل…).
  - misspellings ("carenawear", "mr jo", "xo stile", "amaza" → Amaze).
- Brand names that are also everyday words need the word "brand" next to them: Navy, Ward, SUWA, Karohat, Sheek. "navy dress" still means the colour.
- Brand results show up to 6 pieces from that brand, plus a link to the brand page.
- "What brands do you have?" lists the top brands.
- Brands we don't carry (Zara, H&M, Shein, Defacto, Nike…) and unknown names after "do you have / عندكم" get "I couldn't find that brand", with available brands and a link to Brands A–Z.
- Tests: 26 brand messages added. **115 / 115 PASS.** Smoke regression: same landmarks, 0 console errors.

## 7. Update: checkout, Admin and the visual editor (Customize)

### Checkout
- **3-step progress bar:** Bag → Delivery → Payment.
- **Free delivery from LE 3,500,** shown as a progress bar.
- **Discount codes** created in the Admin. There are three types: percent, fixed amount, and free delivery. A code can have a minimum order and an end date.
- **A full invoice at the end:** items grouped by seller, discount, delivery, payment status, and Print / save as PDF.
- **Order progress bar:** Placed → Confirmed → Shipped → Delivered, with the estimated delivery date. It is also shown in My account, and each order there can open its invoice.

### Admin (`admin.html`, the "Admin" button at the bottom of every page)
| Section | What it does |
|---|---|
| Home | Sales, orders, average order, items sold; 14-day sales chart; to-do list; recent orders; top products |
| Orders | Filter by status; order page with items, customer and address; change the status (customer sees it); cancel; internal note; print |
| Products | Search, filter (brand, department, active, hidden, on sale, sold out, added); 50 per page; bulk hide / show / put on sale % / end sale; edit title, description, images, price, compare-at, sizes in stock, hide, "New" label; add new products |
| Brands | Logo, about text (shown on the brand page), hide a brand with all its products, add a brand |
| Customers | Built from orders: name, phone, location, orders, total spent |
| Discounts | Create, edit, switch off and delete codes; see how many times each was used |
| Online store | Theme preview + Customize; create, delete and add pages to the menu; announcement bar; navigation |
| AI stylist | On / off, name, first message, suggested questions, taught answers |
| Settings | Free-delivery threshold, fee, delivery days, exchange days, payment methods, store details, logos, export / import / reset |

### Customize (the visual editor, opened from the Admin or the "Customize" button)
- Add 12 kinds of section to any page:
  - banner, text, image + text, live product grid, brand logos, promo strip, countdown, FAQ, gallery, video, custom HTML, spacer.
- Rewrite any text or replace any image by clicking it on the page.
- Hide any element.
- Change the theme (colours, fonts, buttons, logo, custom CSS), the menu and the footer.
- Create pages.
- Undo, and preview on phone, tablet and desktop.

### Tests (2026-11-24)
| Test | Result |
|---|---|
| Full order: discount EID20 → 20% of LE 3,949 = −LE 790 → total LE 3,229 on button, invoice and saved order | PASS |
| Admin "Mark as confirmed" → customer's order bar shows Confirmed | PASS |
| Admin bulk sale 25% on 2 products; hide product → gone from store; brand logo (brand name with a dot) → shown on Brands page | PASS |
| Admin: new brand + product → appears in the store and the AI stylist recognises the brand | PASS |
| Customize: add banner, product grid (KAVA), countdown; edit text on page and in footer (all pages); replace image; hide section; theme colour; undo; new page in menu; settings (free delivery, payment off) reach store and stylist | PASS |
| Every Admin section loads with 0 console errors; unknown page handled | PASS |
| Regression, 11 store pages, no edits: same landmarks as before, 0 errors | PASS |
| Stylist language tests | 115 / 115 PASS |

### Bugs found and fixed while testing
- Step classes clashed with the old `.done` style, which pushed the stepper down.
- Field paths broke on brand names with dots.
- A `$$` replacement bug hid the editor's tab clicks and corrupted the stylist's regex escaping.
- Product fields reloaded the page on every change. They now save, and refresh once.
- The countdown default was off by the time zone.

### NOT TESTED / limits
- **No server:** the Admin saves to this browser (localStorage), with export / import. Making it live for all visitors needs a backend and an admin login. The JSON structure is ready for that.
- **The Admin and the Edit button are open to anyone who opens the page.** In production they must sit behind a login.
- **Storage is limited:** uploaded images are compressed but use about 5 MB of browser storage, so image links are better for many images.
- Not tested in Safari or Firefox, or on real phones.

## 8. Update: dashboard with sign-in and roles (replaces the open admin)

**What changed**
- **Sign-in:** `admin.html` opens a sign-in page with no hints.
  - Passwords are stored only as salted SHA-256 hashes.
  - After 5 wrong attempts, sign-in is locked for 60 seconds.
  - A session lasts 8 hours.
  - The dummy accounts are in `D:\Brandv\ADMIN-ACCESS.md`, outside the website folder.
- **Roles:**
  - **Super admin** has everything.
  - **Admin** has per-section *no access / view / edit*, set by the super admin in Team & roles. Presets: Orders team, Catalog team, Content team, View everything.
  - View-only sections show locked fields and a note. Sections without access are hidden, and opening them directly says "No access".
- **The visual editor is no longer public:**
  - The store shows no buttons to visitors. `?edit` and the shortcut do nothing.
  - A signed-in team member sees a small "Dashboard" bar.
  - "Edit this page" appears only for members allowed to edit content.
- **Dashboard (Overview):**
  - 4 KPIs with sparklines and change against the previous period.
  - A period picker.
  - 11 widgets: sales chart vs previous period, orders by status, best sellers, busiest days, sales by brand, payment methods, repeat-customer gauge, top governorates, recent orders, needs-attention, discount codes.
  - **Customize dashboard:** add, hide and reorder widgets, saved per user. Plus CSV export.
- **Orders:**
  - Status tabs with counts, search, and filters for payment and date.
  - **Status changes inline** in the table.
  - **A floating bulk bar:** mark confirmed / shipped / delivered / cancel.
  - Order page with fulfilment steps, a timeline of who changed what, a customer link, internal notes, print, and previous / next order.
  - CSV export.
- **Customers:**
  - Segments: top 10%, repeat, new, lapsed. Sort, search, a customer page with their orders, CSV export.
- **Products:**
  - Stock summary, a low-stock tab, a stock bar per product, sort, and the bulk bar.
  - Product page with units sold.
- **Brands:** sales column, and an add-brand dialog with checks.
- **Discounts:** a create dialog with checks (code format, duplicates, value range), and the discount given per code.
- **Team & roles:** add a member, set their role and permissions, reset their password, block sign-in, and see their recent activity. The last super admin is protected.
- **Activity log:** who did what, when and on what; filter by member; CSV export.
- **Notifications bell:** orders waiting, sold-out products, discount codes ending soon.
- **Sample orders for demos** (240, clearly tagged "sample"). The super admin loads and removes them in Settings → Data.

**Tests (2026-11-24, headless Edge + browser pane)**
| Test | Result |
|---|---|
| Signed-out dashboard: only the sign-in page; no usernames or passwords in the page; 0 errors | PASS |
| Wrong password → generic message; 5 wrong → 60 s lock, correct password also refused while locked | PASS |
| Super admin: all 11 sections; sample orders → KPIs, 11 widgets render, no horizontal overflow at 1440 px | PASS |
| Orders: inline status, bulk "Mark shipped" on 2 orders, both written to the activity log with the member's name | PASS |
| Store as super admin: "Dashboard / Edit this page" bar, `?edit` opens the editor with a link back to the dashboard | PASS |
| Store signed out: no bar; `?edit` and Ctrl+Shift+E do nothing (editor file not loaded) | PASS |
| Admin role: Settings, Team and Content hidden and "No access"; AI stylist view-only (fields locked + note); orders editable; in the store only "Dashboard", no editor | PASS |
| Team: add member (password stored as hash only), apply "Content team" preset, log entries | PASS |
| Regression, 11 store pages: same landmarks, 0 errors; stylist 115 / 115; no plain-text password in the site folder | PASS |

**Bugs found and fixed:** the account and notification menus showed open (a `display` rule beat `hidden`); an arrow character appeared in page titles; a form's view-only state was decided before the section was known.

**Limits (honest):**
- Sign-in runs in the browser, so this is a **prototype** lock, not real security. Usernames are visible in the script and the hashes could be attacked offline. A live store needs server-side sign-in and permissions.
- Data is saved per browser.

## 9. Update: maintenance mode, AI stylist switch, full stylist control

- **Settings → Store status:**
  - **Maintenance mode.** Visitors see a "back soon" page on every store page, with a title, a message and an optional return time, which can be previewed. Signed-in team members still see the store, with a red bar.
  - **AI stylist on / off.** Both actions ask for confirmation and are recorded in the activity log.
- **AI stylist page, with 7 tabs:**
  - **Overview:** messages stored, last 7 days, % understood, not-answered list with "Teach an answer", what shoppers ask for, most-asked brands, and what it stores.
  - **Conversations:** every message, what it was understood as, the brand and the page. Search, filter, CSV export, clear.
  - **Skills:** 10 switches (outfits, colours, compare, sizes, brands, store questions, gifts, cross-sell, pop-up hint, remember size), plus pieces per answer.
  - **Replies:** all 18 built-in replies are editable, with `{free}` `{days}` `{exchange}` `{payments}` `{brand}` `{word}` placeholders.
  - **Knowledge:** the 840 words and spellings it knows, grouped by meaning and searchable; colours, occasions and categories; brand spellings; brands we don't carry. You can add your own words, brand spellings and not-carried brands.
  - **Taught answers** and **Appearance**.

| Test (2026-11-24) | Result |
|---|---|
| Store messages logged (5), "عندكم زارا؟" flagged not answered; knowledge snapshot 840 words / 52 brands | PASS |
| Compare skill off → "compare" gets the switched-off reply; custom delivery reply with {days}/{free} filled; custom word "bdla" → set | PASS |
| Maintenance on: visitor sees only the maintenance page (title updated); staff sees the full store + red bar; off → store back | PASS |
| AI stylist off → stylist not loaded on the store | PASS |
| Regression 11 pages: same landmarks, 0 errors; stylist 115 / 115 | PASS |

**Bugs fixed:** page titles had lost every "s" (a missing backslash from an earlier patch); the maintenance page kept the shop's tab title.

// Headless smoke/regression test for every page.
// Loads each page in headless Edge, captures console errors, and counts key DOM landmarks.
// Usage: node tests/smoke.mjs [label]   → writes tests/results-<label>.json and prints a summary.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:5173/";
const label = process.argv[2] || "run";
const pages = [
  ["home", "index.html"],
  ["label", "malabisy.html"],
  ["market", "marketplace.html"],
  ["market-filtered", "marketplace.html?g=Women&d=Footwear"],
  ["search-results", "marketplace.html?q=dress"],
  ["brands", "brands.html"],
  ["brand", "brand.html?b=clue"],
  ["product", "product.html?h=toggle-front-leather-jacket-black-ms52"],
  ["bag", "bag.html"],
  ["account", "account.html"],
  ["sell", "sell.html"],
];
const landmarks = {
  header: /<header class="hdr/g,
  navItems: /<li><a href="(marketplace|malabisy|brands)\.html[^"]*"/g,
  cards: /<article class="card"/g,
  footer: /<footer class="ftr"/g,
  filters: /id="filters"/g,
  pdpBuy: /id="atc"/g,
  stylistRoot: /id="mst-root"/g,
};
const results = {};
for (const [name, url] of pages) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "mlb-smoke-"));
  let dom = "", log = "";
  const r = spawnSync(EDGE, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${prof}`, "--enable-logging=stderr", "--v=0", "--virtual-time-budget=7000", "--window-size=1440,900", "--dump-dom", BASE + url], { encoding: "utf8", timeout: 90000, maxBuffer: 64 * 1024 * 1024 });
  dom = r.stdout || ""; log = r.stderr || "";
  const errs = [];
  for (const line of (log || "").split("\n")) if (/CONSOLE/.test(line) && /(Uncaught|Error|error|warn)/i.test(line)) errs.push(line.replace(/^.*CONSOLE\(\d+\)\]\s*/, "").slice(0, 220));
  const counts = {};
  for (const [k, re] of Object.entries(landmarks)) counts[k] = (dom.match(re) || []).length;
  results[name] = { url, domBytes: dom.length, errors: errs, ...counts };
  fs.rmSync(prof, { recursive: true, force: true });
}
fs.writeFileSync(path.resolve(`tests/results-${label}.json`), JSON.stringify(results, null, 2));
for (const [n, r] of Object.entries(results)) console.log(`${n.padEnd(16)} dom=${String(r.domBytes).padStart(8)} header=${r.header} nav=${r.navItems} cards=${String(r.cards).padStart(3)} filters=${r.filters} pdpBuy=${r.pdpBuy} footer=${r.footer} stylist=${r.stylistRoot} errors=${r.errors.length}`);

// Runs tests/stylist-nlu.html in headless Edge and prints PASS / FAIL for every message in tests/stylist-nlu-cases.js.
// Usage: node tests/stylist-nlu.mjs   → also writes tests/stylist-nlu-results.json
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "mlb-nlu-"));
const r = spawnSync(EDGE, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${prof}`, "--virtual-time-budget=15000", "--dump-dom", "http://localhost:5173/tests/stylist-nlu.html"], { encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
const m = (r.stdout || "").match(/NLU_JSON([\s\S]*?)NLU_END/);
if (!m) { console.error("No results. stderr:", (r.stderr || "").slice(-1500)); process.exit(1); }
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const rows = JSON.parse(dec(m[1]));
fs.writeFileSync(new URL("./stylist-nlu-results.json", import.meta.url), JSON.stringify(rows, null, 1));
let pass = 0;
for (const x of rows) {
  if (x.pass) pass++;
  console.log(`${x.pass ? "PASS" : "FAIL"} [${x.lang}] ${x.input}  →  ${x.intent}${x.cats.length ? " · " + x.cats.join("/") : ""}${x.colors.length ? " · " + x.colors.join("/") : ""}${x.notColors.length ? " · not " + x.notColors.join("/") : ""}${x.occasion ? " · " + x.occasion : ""}${x.max ? " · max " + x.max : ""}${x.min ? " · min " + x.min : ""}${x.sizes.length ? " · size " + x.sizes.join("/") : ""}${x.brand ? " · " + x.brand : ""}${x.flags.length ? " · " + x.flags.join(",") : ""}${x.results !== null ? " · " + x.results + " results" : ""}${x.fails.length ? "   ✗ " + x.fails.join("; ") + "   [norm: " + x.norm + "]" : ""}`);
}
console.log(`\n${pass} / ${rows.length} passed`);
process.exit(pass === rows.length ? 0 : 1);

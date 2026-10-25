#!/usr/bin/env node
/**
 * Poids gzip (niveau 9) des fichiers JS/CSS/HTML produits par `npm run build`.
 * Usage : node scripts/bundle-size.mjs [dist] [--json]
 * Sert à mesurer le surcoût d'une fonctionnalité : lancer avant / après et comparer les « TOTAL ».
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, extname } from "node:path";

const args = process.argv.slice(2);
const dist = args.find((a) => !a.startsWith("--")) ?? "dist";
const asJson = args.includes("--json");

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name === "assets" || dir === dist) walk(p); continue; }
    if ([".js", ".css", ".html"].includes(extname(p))) files.push(p);
  }
};
walk(dist);

const rows = files
  .map((p) => {
    const buf = readFileSync(p);
    return { file: p.replace(`${dist}/`, ""), raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
  })
  .sort((a, b) => b.gzip - a.gzip);
const sum = (list) => list.reduce((t, r) => ({ raw: t.raw + r.raw, gzip: t.gzip + r.gzip }), { raw: 0, gzip: 0 });
// « app » = ce que l'interface charge d'office ou à la demande (assets/ + index.html) ; le reste (moteur OCR, etc.) est à part
const isApp = (r) => r.file.startsWith("assets/") && !r.file.slice(7).includes("/") || r.file === "index.html";
const appRows = rows.filter(isApp);
const total = sum(rows);
const app = sum(appRows);

if (asJson) console.log(JSON.stringify({ rows, total, app }));
else {
  for (const r of rows) console.log(`${String(r.gzip).padStart(8)} o gzip  ${String(r.raw).padStart(8)} o brut  ${r.file}`);
  console.log(`${String(app.gzip).padStart(8)} o gzip  ${String(app.raw).padStart(8)} o brut  APP (assets/ + index.html, ${appRows.length} fichiers)`);
  console.log(`${String(total.gzip).padStart(8)} o gzip  ${String(total.raw).padStart(8)} o brut  TOTAL du dossier (${rows.length} fichiers, moteur OCR compris)`);
}

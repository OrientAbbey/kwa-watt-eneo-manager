#!/usr/bin/env node
/**
 * Valide la syntaxe des diagrammes Mermaid de docs/diagrams/*.mmd et les rend en PNG (contrôle visuel) avec Chromium
 * headless. Rien n'est ajouté à package.json :
 *
 *   npm i --no-save mermaid @sparticuz/chromium puppeteer-core
 *   node scripts/check-diagrams.mjs [dossier-de-sortie-png]
 *
 * Code de sortie ≠ 0 si un diagramme est invalide. Seule une mise en page lisible sur mobile se juge à l'œil : ouvrir les PNG.
 */
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const DIR = "docs/diagrams";
const OUT = process.argv[2] ?? "";
if (OUT) mkdirSync(OUT, { recursive: true });
const mermaidJs = readFileSync(require.resolve("mermaid/dist/mermaid.min.js"), "utf-8");
const files = readdirSync(DIR).filter((f) => f.endsWith(".mmd")).sort();

const browser = await puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: await chromium.executablePath(), headless: "shell" });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
await page.setContent("<html><body style='margin:0;background:#fff'><div id='out'></div></body></html>");
await page.addScriptTag({ content: mermaidJs });
await page.evaluate(() => mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" }));

let failed = 0;
for (const f of files) {
  const src = readFileSync(join(DIR, f), "utf-8");
  const res = await page.evaluate(async (code, id) => {
    try {
      await mermaid.parse(code);
      const { svg } = await mermaid.render(id, code);
      document.getElementById("out").innerHTML = svg;
      const r = document.querySelector("#out svg").getBoundingClientRect();
      return { ok: true, w: Math.round(r.width), h: Math.round(r.height) };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }, src, `d${files.indexOf(f)}`);
  if (!res.ok) {
    failed++;
    console.error(`✗ ${f} : ${res.error}`);
    continue;
  }
  console.log(`✓ ${f}  (${res.w} × ${res.h} px)`);
  if (OUT) {
    const el = await page.$("#out svg");
    await el.screenshot({ path: join(OUT, f.replace(/\.mmd$/, ".png")) });
  }
}
await browser.close();
process.exit(failed ? 1 : 0);

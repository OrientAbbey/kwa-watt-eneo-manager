#!/usr/bin/env node
/**
 * Contrôle de la page de présentation (site/) dans Chromium headless : requêtes tierces, violations de la politique CSP,
 * erreurs de console, accessibilité (axe-core), poids transféré (gzip), débordement horizontal, captures (clair / sombre,
 * mobile / bureau).
 *
 *   npm i --no-save axe-core @sparticuz/chromium puppeteer-core
 *   node scripts/check-site.mjs [dossier-de-captures]
 *
 * Le site est servi en local ; l'API GitHub (api.github.com) est bloquée dans cet environnement : le repli sans réseau
 * est donc exactement ce qui est testé. Code de sortie ≠ 0 si un contrôle échoue.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { extname, join, normalize } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf-8");
const SITE = "site";
const OUT = process.argv[2] ?? "";
if (OUT) mkdirSync(OUT, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".txt": "text/plain", ".xml": "application/xml" };

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  let file = join(SITE, path === "/" ? "index.html" : path);
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end("404"); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(4180);
const BASE = "http://localhost:4180/";

const pages = ["index.html", "confidentialite.html"];
const profiles = [
  { name: "mobile", vp: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { name: "bureau", vp: { width: 1280, height: 800, deviceScaleFactor: 1 } },
];
const schemes = ["light", "dark"];

const browser = await puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: await chromium.executablePath(), headless: "shell" });
let failures = 0;
const fail = (m) => { failures++; console.error("✗ " + m); };
const weights = new Map();

for (const pg of pages) for (const prof of profiles) for (const scheme of schemes) {
  const label = `${pg} · ${prof.name} · ${scheme}`;
  const page = await browser.newPage();
  await page.setViewport(prof.vp);
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  const external = new Set(), consoleErrors = [];
  await page.setRequestInterception(true);
  page.on("request", (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith("data:")) { external.add(new URL(r.url()).host); r.abort(); } else r.continue(); });
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("response", async (r) => {
    if (!r.url().startsWith(BASE) || prof.name !== "mobile" || scheme !== "light") return;
    try { const b = await r.buffer(); const t = r.headers()["content-type"] ?? ""; weights.set(`${pg}:${r.url().replace(BASE, "")}`, /image\/(webp|png)/.test(t) ? b.length : gzipSync(b, { level: 9 }).length); } catch {}
  });
  await page.goto(BASE + pg, { waitUntil: "networkidle0" });
  // défile jusqu'en bas pour déclencher le chargement différé, ATTEND que toutes les images soient chargées, puis remonte
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    window.scrollTo(0, document.body.scrollHeight);
    await Promise.race([
      Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    window.scrollTo(0, 0);
  });

  const unexpected = [...external].filter((h) => h !== "api.github.com");
  if (unexpected.length) fail(`${label} : requêtes tierces ${unexpected.join(", ")}`);
  const csp = consoleErrors.filter((t) => /Content Security Policy|Refused to/i.test(t));
  if (csp.length) fail(`${label} : violations CSP : ${csp[0]}`);
  // l'échec de l'appel à l'API (bloqué ici) est attendu et sans effet : on ignore uniquement celui-là
  const other = consoleErrors.filter((t) => !/api\.github\.com|net::ERR_FAILED|Failed to load resource/i.test(t) && !/Content Security Policy|Refused to/i.test(t));
  if (other.length) fail(`${label} : erreurs de console : ${other[0]}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) fail(`${label} : défilement horizontal de ${overflow}px`);
  const badImgs = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src")));
  if (badImgs.length) fail(`${label} : images non chargées ${badImgs.join(", ")}`);

  await page.evaluate(axeSource);
  const axe = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] })).violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.length} élément(s), ex. ${v.nodes[0].target.join(" ")}`));
  for (const v of axe) fail(`${label} : accessibilité ${v}`);
  if (OUT) {
    // pleine page seulement sur bureau (sur mobile, Chromium répète des tuiles au-delà de ~16 000 px : captures du haut et du milieu)
    const base = join(OUT, `${pg.replace(".html", "")}-${prof.name}-${scheme}`);
    if (prof.name === "bureau") await page.screenshot({ path: base + ".png", fullPage: true });
    else {
      for (const [i, y] of [0, 2600, 5200].entries()) { await page.evaluate((y) => window.scrollTo(0, y), y); await new Promise((r) => setTimeout(r, 200)); await page.screenshot({ path: `${base}-${i}.png` }); }
    }
  }
  console.log(`${failures === 0 ? "✓" : "·"} ${label}`);
  await page.close();
}
await browser.close();
server.close();

const total = [...weights.entries()].filter(([k]) => k.startsWith("index.html:"));
const htmlGz = gzipSync(readFileSync(join(SITE, "index.html")), { level: 9 }).length;
const sum = total.reduce((t, [, v]) => t + v, 0);
const all = readdirSync(SITE, { recursive: true }).filter((f) => statSync(join(SITE, f)).isFile());
const totalDisk = all.reduce((t, f) => t + statSync(join(SITE, f)).size, 0);
console.log(`\nPoids réellement chargé par index.html (mobile, images différées incluses, HTML/CSS/JS en gzip) : ${(sum + htmlGz).toFixed(0)} o ≈ ${((sum + htmlGz) / 1024).toFixed(1)} Ko`);
console.log(`Poids de tout le dossier site/ (sans compression, og.png inclus) : ${(totalDisk / 1024).toFixed(1)} Ko pour ${all.length} fichiers`);
process.exit(failures ? 1 : 0);

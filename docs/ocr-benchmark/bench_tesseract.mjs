// Banc d'essai Tesseract.js (même moteur WASM que l'application). Usage :
//   node bench_tesseract.mjs <corpus> <sortie.json> <config: best_int|fast_fra|fast_eng> <dossier_langues>
import { createWorker } from "tesseract.js";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [corpus, out, config, langDir] = process.argv.slice(2);
const cfg = {
  best_int: { lang: "fra", gzip: true },
  fast_fra: { lang: "fra", gzip: false },
  fast_eng: { lang: "eng", gzip: false },
}[config];
if (!cfg) throw new Error("config inconnue");

const t0 = performance.now();
const worker = await createWorker(cfg.lang, 1, { langPath: langDir, gzip: cfg.gzip, cacheMethod: "none" });
const initMs = performance.now() - t0;

if (process.env.PSM) await worker.setParameters({ tessedit_pageseg_mode: process.env.PSM });
const results = { config, initMs: Math.round(initMs), images: {} };
for (const f of readdirSync(corpus).filter((f) => /\.(png|jpg)$/.test(f)).sort()) {
  const t = performance.now();
  const { data } = await worker.recognize(readFileSync(join(corpus, f)));
  results.images[f] = { text: data.text, ms: Math.round(performance.now() - t) };
}
await worker.terminate();
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(config, "init", results.initMs, "ms;", Object.keys(results.images).length, "images");

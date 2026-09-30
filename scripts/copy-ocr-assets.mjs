// Copie le moteur OCR (Tesseract) dans public/tesseract pour qu'il soit servi en local par l'application
// (aucun script tiers autorisé par la CSP, fonctionne hors ligne une fois le modèle de langue téléchargé).
// Idempotent et tolérant : si tesseract.js n'est pas installé, la construction continue (l'OCR sera simplement indisponible).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "tesseract");
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // Cœur non-SIMD : fonctionne sur tous les téléphones (un peu plus lent, sans importance pour un SMS).
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  // Modèle français « best_int » (tessdata_best quantifié, ~0,7 Mo compressé) : embarqué pour un OCR 100 % hors ligne
  // (avant : téléchargé depuis un CDN au premier usage).
  ["node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz", "lang/fra.traineddata.gz"],
];

try {
  mkdirSync(out, { recursive: true });
  let copied = 0;
  for (const [from, to] of files) {
    const src = join(root, from);
    if (!existsSync(src)) {
      console.warn(`[ocr-assets] introuvable : ${from} (OCR indisponible)`);
      continue;
    }
    mkdirSync(dirname(join(out, to)), { recursive: true });
    copyFileSync(src, join(out, to));
    copied++;
  }
  console.log(`[ocr-assets] ${copied}/${files.length} fichiers copiés dans public/tesseract`);
} catch (e) {
  console.warn("[ocr-assets] copie impossible, l'OCR sera indisponible :", e?.message ?? e);
}

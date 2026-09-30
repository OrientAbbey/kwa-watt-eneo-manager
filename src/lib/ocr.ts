/**
 * OCR local (Tesseract, WebAssembly) pour lire un SMS / un reçu photographié depuis un AUTRE téléphone.
 * Chargé à la demande : n'alourdit pas le démarrage de l'application.
 *
 * Tout est servi par l'application elle-même (moteur ET modèle de langue, voir scripts/copy-ocr-assets.mjs) :
 * fonctionne hors ligne et aucune image ne quitte le téléphone.
 *
 * Choix du moteur (banc d'essai mesuré, voir docs/OCR_COMPARATIF.md) : Tesseract est l'option la plus légère
 * (≈ 2,2 Mo compressés au total contre ≈ 9,4 Mo pour PP-OCRv6 tiny + ONNX Runtime Web, ≈ 30 Mo pour PP-OCRv6 small
 * et ≈ 91 Mo + PyTorch pour EasyOCR) et la plus rapide en WebAssembly ; l'écart de précision de PP-OCR sur les chaînes de
 * chiffres est compensé par les contrôles de cohérence de l'écran d'import (compteur, prix unitaire).
 */

export type OcrProgress = (info: { status: string; progress: number }) => void;

/** Description affichée dans l'aide (onglet Aide → Fonctionnalités). */
export const OCR_ENGINE_INFO = {
  engine: "Tesseract 5 (réseau LSTM) via tesseract.js 7",
  model: "français « best_int » (tessdata_best quantifié)",
  runtime: "WebAssembly, exécuté sur le téléphone",
  payload: "≈ 2,2 Mo compressés (moteur 1,5 Mo + modèle 0,7 Mo)",
  offline: true,
} as const;

const OCR_TIMEOUT_MS = 90_000;
const BASE = "/tesseract";

/** Le modèle embarqué est-il présent ? (sinon, repli sur le CDN par défaut de tesseract.js.) */
async function hasLocalModel(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/lang/fra.traineddata.gz`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function recognizeText(image: string | Blob, onProgress?: OcrProgress): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const local = await hasLocalModel();
  const worker = await createWorker("fra", 1, {
    workerPath: `${BASE}/worker.min.js`,
    corePath: `${BASE}/tesseract-core-lstm.wasm.js`,
    workerBlobURL: false, // la CSP de l'application interdit les workers blob:
    ...(local ? { langPath: `${BASE}/lang`, gzip: true, cacheMethod: "none" as const } : {}),
    logger: (m: { status: string; progress: number }) => onProgress?.({ status: m.status, progress: m.progress }),
  });
  try {
    const result = await Promise.race([
      worker.recognize(image),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OCR trop long")), OCR_TIMEOUT_MS)),
    ]);
    return result.data.text || "";
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}

/**
 * OCR local (Tesseract, WebAssembly) pour lire un SMS / un reçu photographié depuis un AUTRE téléphone.
 * Chargé à la demande : n'alourdit pas le démarrage de l'application.
 * Le moteur est servi depuis /tesseract (voir scripts/copy-ocr-assets.mjs) ; seul le modèle de langue
 * est téléchargé au premier usage, puis conservé sur l'appareil.
 */

export type OcrProgress = (info: { status: string; progress: number }) => void;

const OCR_TIMEOUT_MS = 90_000;

export async function recognizeText(image: string | Blob, onProgress?: OcrProgress): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const base = "/";
  const worker = await createWorker("fra", 1, {
    workerPath: `${base}tesseract/worker.min.js`,
    corePath: `${base}tesseract/tesseract-core-lstm.wasm.js`,
    workerBlobURL: false, // la CSP de l'application interdit les workers blob:
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

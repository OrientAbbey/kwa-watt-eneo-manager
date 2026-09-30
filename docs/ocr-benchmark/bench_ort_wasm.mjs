// Temps d'inférence PP-OCR (mêmes tenseurs) : ORT-web WASM MONO-THREAD (cas d'une WebView Capacitor) vs ORT natif Python.
import * as ort from "onnxruntime-web";
import { readFileSync } from "node:fs";
ort.env.wasm.numThreads = 1;
const models = {
  "v6_tiny det": ["wheels/fp/models/tiny/det.onnx", [1, 3, 512, 960]],
  "v6_tiny rec": ["wheels/fp/models/tiny/rec.onnx", [9, 3, 48, 480]],
  "v5_mobile det": ["models/v5/pp-ocrv5_mobile_det.onnx", [1, 3, 512, 960]],
  "v5_mobile rec": ["models/v5/latin_pp-ocrv5_mobile_rec.onnx", [9, 3, 48, 480]],
};
for (const [name, [path, shape]] of Object.entries(models)) {
  const t0 = performance.now();
  const s = await ort.InferenceSession.create(readFileSync(path), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  const load = performance.now() - t0;
  const n = shape.reduce((a, b) => a * b, 1);
  const data = Float32Array.from({ length: n }, () => Math.random() * 2 - 1);
  const feed = { x: new ort.Tensor("float32", data, shape) };
  await s.run(feed); // warmup
  const times = [];
  for (let i = 0; i < 4; i++) { const t = performance.now(); await s.run(feed); times.push(performance.now() - t); }
  console.log(`${name.padEnd(14)} chargement ${Math.round(load)} ms | inférence WASM 1 thread ${Math.round(times.reduce((a, b) => a + b) / times.length)} ms`);
}

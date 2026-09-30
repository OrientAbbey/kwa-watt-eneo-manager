"""Banc d'essai PaddleOCR (modèles PP-OCR embarqués dans faster-paddle : v6 tiny / v6 small ; et v5 mobile via rapidocr).
Usage : python bench_paddle.py <corpus> <dossier_sortie> <v6_tiny|v6_small|v5_mobile> [dossier_modeles_v5]"""
import sys, os, json, time, glob

corpus, outdir, which = sys.argv[1:4]
os.makedirs(outdir, exist_ok=True)
files = sorted(f for f in os.listdir(corpus) if f.endswith((".png", ".jpg")))

t0 = time.perf_counter()
if which.startswith("v6"):
    from faster_paddle import OcrEngine
    engine = OcrEngine(model_size=which.split("_")[1])
    def run(path):
        r = engine.ocr(open(path, "rb").read())
        return r["text"] if isinstance(r, dict) else str(r)
else:
    from rapidocr import RapidOCR
    m = sys.argv[4]
    engine = RapidOCR(params={
        "Det.model_path": f"{m}/pp-ocrv5_mobile_det.onnx",
        "Rec.model_path": f"{m}/latin_pp-ocrv5_mobile_rec.onnx",
        "Rec.rec_keys_path": f"{m}/ppocrv5_latin_dict.txt",
        "Global.use_cls": False,
    })
    def run(path):
        r = engine(path)
        txts = getattr(r, "txts", None)
        return "\n".join(txts) if txts else ""
init_ms = round((time.perf_counter() - t0) * 1000)

res = {"config": which, "initMs": init_ms, "images": {}}
for f in files:
    t = time.perf_counter()
    text = run(os.path.join(corpus, f))
    res["images"][f] = {"text": text, "ms": round((time.perf_counter() - t) * 1000)}
json.dump(res, open(os.path.join(outdir, f"paddle_{which}.json"), "w"), ensure_ascii=False, indent=1)
print(which, "init", init_ms, "ms;", len(files), "images")

# Banc d'essai OCR (reproductible)

Résultats et décision : [`../OCR_COMPARATIF.md`](../OCR_COMPARATIF.md). Les scores sont calculés avec le **vrai parseur**
de l'application (`src/lib/smsParser.ts`) : on mesure « le bon montant / kWh / compteur / référence / jeton est-il
récupéré ? », pas seulement la ressemblance du texte.

> Ces scripts ne font pas partie du build de l'application et ne sont jamais exécutés par la CI.

## Fichiers

| Fichier | Rôle |
|---|---|
| `generate_images.py` | Rend les 3 SMS réels en captures (clair/sombre), photos dégradées et (`--extended`) 42 variantes aléatoires reproductibles (graine fixe) |
| `bench_tesseract.mjs` | Tesseract.js (le moteur WASM de l'app) sur un dossier d'images, pour un modèle de langue donné |
| `bench_paddle.py` | PP-OCRv6 tiny / small (paquet `faster-paddle`) et PP-OCRv5 mobile latin (paquet `rapidocr`) |
| `bench_ort_wasm.mjs` | Temps d'inférence PP-OCR en ONNX Runtime Web, WASM 1 thread (cas d'une WebView) |
| `preprocess.py` | Prétraitement d'image testé (sans gain) |
| `score.ts` | Note chaque moteur : champs critiques corrects, CER, temps |

## Reproduire

```bash
# 1. Corpus (Pillow + numpy)
python -m venv venv && . venv/bin/activate
pip install pillow numpy onnxruntime opencv-python-headless rapidocr faster-paddle
python docs/ocr-benchmark/generate_images.py corpus --extended

# 2. Tesseract.js (depuis la racine du dépôt, après npm install)
#    Modèles : @tesseract.js-data/fra (4.0.0_best_int/fra.traineddata.gz) ou tessdata_fast
#    (https://github.com/tesseract-ocr/tessdata_fast) dans un dossier <langues>
node docs/ocr-benchmark/bench_tesseract.mjs corpus results/tess_best_int.json best_int <langues>

# 3. PaddleOCR
python docs/ocr-benchmark/bench_paddle.py corpus results v6_tiny
python docs/ocr-benchmark/bench_paddle.py corpus results v6_small
#    PP-OCRv5 mobile : ONNX + dictionnaire dans models/v5/ (voir ci-dessous)
python docs/ocr-benchmark/bench_paddle.py corpus results v5_mobile models/v5

# 4. Score
npx tsx docs/ocr-benchmark/score.ts corpus results
```

### Où trouver les modèles utilisés

- **PP-OCRv6 tiny / small (ONNX)** : embarqués dans le paquet PyPI `faster-paddle` (`models/tiny/{det,rec}.onnx`,
  `char_dict.json`) — `pip download faster-paddle --no-deps` puis décompresser le `.whl`.
- **PP-OCRv5 mobile** : `pp-ocrv5_mobile_det.onnx` et `latin_pp-ocrv5_mobile_rec.onnx` dans les releases du dépôt
  `GreatV/oar-ocr` ; dictionnaire `ppocrv5_latin_dict.txt` dans `PaddlePaddle/PaddleOCR` (`ppocr/utils/dict/`).
- **EasyOCR** : non exécuté (PyTorch ≈ 555 Mo) ; tailles relevées sur les releases GitHub de `JaidedAI/EasyOCR`
  (`craft_mlt_25k.zip` ≈ 77,3 Mo, `latin_g2.zip` ≈ 14,3 Mo).

Les temps dépendent de la machine : comparez les moteurs entre eux sur la même machine, pas en valeur absolue.

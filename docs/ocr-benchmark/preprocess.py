"""Prétraitement testé avant OCR Tesseract : niveaux de gris, inversion si fond sombre, contraste, agrandissement.
Usage : python preprocess.py <corpus_in> <corpus_out>   (reproduit ce que fera l'application avec un <canvas>)"""
import sys, os, shutil
import numpy as np
from PIL import Image, ImageOps, ImageFilter
src, dst = sys.argv[1:3]
os.makedirs(dst, exist_ok=True)
TARGET_W = 1600
for f in os.listdir(src):
    p = os.path.join(src, f)
    if f.endswith(".txt"):
        shutil.copy(p, os.path.join(dst, f)); continue
    im = Image.open(p).convert("L")
    if np.asarray(im).mean() < 110:          # capture en mode sombre -> texte sombre sur fond clair
        im = ImageOps.invert(im)
    im = ImageOps.autocontrast(im, cutoff=1)
    if im.width < TARGET_W:                   # agrandit les petites photos (LANCZOS), jamais l'inverse
        r = TARGET_W / im.width
        im = im.resize((TARGET_W, int(im.height * r)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    im.save(os.path.join(dst, os.path.splitext(f)[0] + ".png"))
print("ok")

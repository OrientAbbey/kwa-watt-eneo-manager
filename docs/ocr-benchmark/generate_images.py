"""Génère le corpus de test OCR : les 3 SMS réels rendus en captures d'écran (clair/sombre) et en photos dégradées.
Usage : python generate_images.py <dossier_sortie>
Les textes sont ceux fournis par l'utilisateur (voir src/lib/smsParser.test.ts). Aucune donnée réelle sensible
(numéros de compteur/téléphone/token d'exemple)."""
import sys, io, os, textwrap, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else "corpus"
os.makedirs(OUT, exist_ok=True)
random.seed(7); np.random.seed(7)

MESSAGES = {
"orange_paiement": """Paiement ENEO PREPAID réussi par 690000000
ID Transaction: PS260925.1823.C00001;
N' Compteur: 01234567852;
Montant: 3000 FCFA;
Balance/generer Kwh: 38.0;
TVA: 0 FCFA; Frais: 100 FCFA;
Dette: 0 FCFA;
Token: 1111-2222-3333-4444-5555.
Appeler le 8010 pour le support.""",
"orange_consultation": """Consultation Token Eneo Prepaiement reussi par 690000000
Token : 1111-2222-3333-4444-5555
KWH Genere: 38
Montant : 3000 FCFA
N' de Compteur : 01234567852
Date de prepaiement : 25/09/2026.

Orange Money vous remercie""",
"mtn_paiement": "\n".join(textwrap.wrap(
"Paiement ENEO reussi par JEAN EXEMPLE,237690000000: Transaction ID 10000000001, Recu No 000000012345678, Compteur No 98765432109, Token 6666-7777-8888-9999-0000. Energie kWh : 40.0 Prix:2000 F Paiement : 2000 F Frais : 100 F TVA : 0 F Dette : 0 F. Appelez le 8010 pour assistance.", 44)),
}

def render(text, fg, bg, page_bg, size=34, width=1000, pad=36):
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
    lines = text.split("\n")
    lh = int(size * 1.35)
    h = pad * 2 + lh * len(lines) + 60
    img = Image.new("RGB", (width, h), page_bg)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((24, 24, width - 24, h - 24), radius=32, fill=bg)
    y = pad + 24
    for ln in lines:
        d.text((pad + 24, y), ln, font=font, fill=fg)
        y += lh
    return img

def degrade(img, scale, blur, noise, angle, quality, gradient=0.0):
    w, h = img.size
    img = img.rotate(angle, expand=True, fillcolor=(235, 235, 235), resample=Image.BICUBIC)
    img = img.resize((int(img.width * scale), int(img.height * scale)), Image.BILINEAR)
    img = img.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(img).astype(np.float32)
    if gradient:
        g = np.linspace(1 - gradient, 1 + gradient * 0.3, a.shape[1])[None, :, None]
        a = a * g
    a += np.random.normal(0, noise, a.shape)
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=quality); buf.seek(0)
    return Image.open(buf).convert("RGB")

for name, text in MESSAGES.items():
    open(f"{OUT}/{name}.txt", "w", encoding="utf-8").write(text)
    light = render(text, (28, 28, 30), (230, 230, 232), (255, 255, 255))
    dark = render(text, (236, 236, 238), (44, 45, 48), (18, 18, 20))
    light.save(f"{OUT}/{name}__light.png")
    dark.save(f"{OUT}/{name}__dark.png")
    degrade(light, 0.6, 1.1, 8, 1.8, 50, 0.10).save(f"{OUT}/{name}__photo.jpg", quality=50)
    degrade(light, 0.42, 1.7, 14, -3.0, 38, 0.25).save(f"{OUT}/{name}__photo_hard.jpg", quality=38)
print("ok", len(os.listdir(OUT)), "fichiers dans", OUT)

# ── Corpus étendu (--extended) : variations aléatoires reproductibles pour un score statistiquement moins fragile ──
if "--extended" in sys.argv:
    FONTS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
    def render_x(text, fontpath, size, dark):
        font = ImageFont.truetype(fontpath, size)
        lines = text.split("\n")
        lh = int(size * 1.35); width = 1000; pad = 30
        fg, bg, pg = ((236, 236, 238), (44, 45, 48), (18, 18, 20)) if dark else ((28, 28, 30), (230, 230, 232), (255, 255, 255))
        h = pad * 2 + lh * len(lines) + 40
        img = Image.new("RGB", (width, h), pg)
        d = ImageDraw.Draw(img); d.rounded_rectangle((16, 16, width - 16, h - 16), radius=28, fill=bg)
        y = pad + 16
        for ln in lines:
            d.text((pad + 16, y), ln, font=font, fill=fg); y += lh
        return img
    n = 0
    for name, text in MESSAGES.items():
        for i in range(14):
            base = render_x(text, random.choice(FONTS), random.randint(26, 46), random.random() < 0.3)
            img = degrade(base, random.uniform(0.5, 0.95), random.uniform(0.5, 1.5), random.uniform(3, 12),
                          random.uniform(-2.5, 2.5), random.randint(45, 85), random.uniform(0, 0.15))
            img.save(f"{OUT}/{name}__x{i:02d}.jpg", quality=random.randint(45, 85)); n += 1
    print("étendu:", n, "images")

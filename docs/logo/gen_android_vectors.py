"""Génère les drawables VECTORIELS Android du splash à partir de la géométrie du logo « jauge prépayée » (B).

Pourquoi des vecteurs : le splash raster (PNG par densité) était agrandi pour couvrir l'écran, et sur Android 12+ le
système agrandit l'icône adaptative (un PNG de 108 dp) : d'où un logo flou. Un vecteur reste net à toute taille.

Sorties (android/app/src/main/res/drawable/) :
  splash_logo.xml   logo complet (Android < 12 : ImageView centré sans mise à l'échelle)
  splash_icon.xml   même logo réduit à 80 % pour le cercle de l'écran de démarrage système d'Android 12+
Usage : python docs/logo/gen_android_vectors.py
"""
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "android", "app", "src", "main", "res", "drawable")

BOLT = "M455,90 L300,560 L470,560 L400,940 L735,430 L560,430 L665,90 Z"
TRACK = "M278.7,745.3 A330,330 0 1 1 745.3,745.3"   # arc de 270 degrés (piste de la jauge)
CREDIT = "M278.7,745.3 A330,330 0 1 1 779.3,318.5"  # ~70 % de la piste (crédit restant)

def body(indent):
    p = " " * indent
    return f"""{p}<!-- piste de la jauge -->
{p}<path
{p}    android:pathData="{TRACK}"
{p}    android:strokeColor="#29FFFFFF"
{p}    android:strokeWidth="64"
{p}    android:strokeLineCap="round" />
{p}<!-- crédit restant -->
{p}<path
{p}    android:pathData="{CREDIT}"
{p}    android:strokeColor="#FFFA991D"
{p}    android:strokeWidth="64"
{p}    android:strokeLineCap="round" />
{p}<!-- éclair -->
{p}<group
{p}    android:pivotX="512"
{p}    android:pivotY="515"
{p}    android:scaleX="0.66"
{p}    android:scaleY="0.66"
{p}    android:translateY="11">
{p}    <path
{p}        android:fillColor="#FFFFFFFF"
{p}        android:pathData="{BOLT}" />
{p}</group>"""

HEAD = '''<?xml version="1.0" encoding="utf-8"?>
<!-- GÉNÉRÉ par docs/logo/gen_android_vectors.py — ne pas modifier à la main. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="240dp"
    android:height="240dp"
    android:viewportWidth="1024"
    android:viewportHeight="1024">
'''

with open(os.path.join(OUT, "splash_logo.xml"), "w", encoding="utf-8") as f:
    f.write(HEAD + body(4) + "\n</vector>\n")

with open(os.path.join(OUT, "splash_icon.xml"), "w", encoding="utf-8") as f:
    f.write(HEAD + '''    <group
        android:pivotX="512"
        android:pivotY="512"
        android:scaleX="0.8"
        android:scaleY="0.8">
''' + body(8) + "\n    </group>\n</vector>\n")
print("ok")

# Logo de l'application

L'ancien logo était celui du framework **Flet** (icône et splash). Il est remplacé par un logo propre au projet.

## Logo retenu : « Jauge prépayée » (option B)

Une jauge de crédit (arc orange = crédit restant) autour d'un éclair : le suivi du crédit de kWh d'un compteur
prépayé, en une image. Couleurs de la marque de l'app : indigo `#312e81 → #1e1b4b`, orange `#f97316 → #fbbf24`.

## Les deux autres pistes (prêtes à l'emploi)

![Options de logo](./logo/options_logo.png)

| | Piste | Forces | Limites |
|---|---|---|---|
| A | `logo/A_eclair.svg` — éclair jaune-orange sur indigo | Très lisible même à 48 px | Générique (beaucoup d'apps utilisent un éclair) |
| **B** | `logo/B_jauge.svg` — jauge + éclair **(appliquée)** | Raconte « crédit prépayé » ; distinctive | Un peu plus de détails à très petite taille |
| C | `logo/C_jeton.svg` — pièce/jeton avec éclair | Évoque le jeton de recharge à 20 chiffres | Ressemble à une icône de « monnaie » |

Une piste « monogramme K » a été essayée puis abandonnée (les bras du K se chevauchaient mal avec l'éclair).

## Changer de logo

1. Copiez l'option voulue sur les fichiers `B_*.svg` (ou adaptez `docs/logo/export.cjs`) — `icon`, `foreground`, `background`.
2. `npm i --no-save sharp && node docs/logo/export.cjs` régénère `public/icon*.png` (puis `python docs/logo/gen_android_vectors.py` pour le splash vectoriel).
3. `npx @capacitor/assets generate --android --assetPath public` régénère les ressources Android (la CI le refait à
   chaque build ; les fichiers générés sont aussi committés pour rester cohérents en local).

## Splash screen : pourquoi il était flou, et le correctif

Deux causes, selon la version d'Android :

- **Android 12 et plus** : l'écran de démarrage est celui du système. Sans icône déclarée dans le thème, il reprend
  l'**icône adaptative**, un PNG de 108 dp qu'il agrandit environ 2,2 fois → flou.
- **Android 11 et moins** : le plugin Capacitor affichait `splash.png` (un PNG par densité) en `CENTER_CROP`, donc agrandi
  pour couvrir l'écran → flou.

Correctif : le splash est maintenant **vectoriel** (net à toute taille et toute densité).

| Ressource | Rôle |
|---|---|
| `res/drawable/splash_icon.xml` | Icône de l'écran de démarrage système (Android 12+), réduite à 80 % pour tenir dans son masque circulaire |
| `res/drawable/splash_logo.xml` | Logo complet affiché par le plugin Capacitor (Android < 12), centré sans mise à l'échelle (`androidScaleType: CENTER`) |
| `res/drawable/splash_screen.xml` | Fond de fenêtre du lancement (Android < 12) : couleur + logo centré |
| `res/values/splash_colors.xml` | Couleur `splash_background` (#1E1B4B), alignée sur `capacitor.config.ts` |

Les deux fichiers `splash_*.xml` du logo sont **générés** : `python docs/logo/gen_android_vectors.py` (même géométrie que le
logo B ; l'arc est en orange uni plutôt qu'en dégradé, par prudence côté compilation Android).
`@capacitor/assets` fabrique encore un petit `splash.png` à chaque build, mais plus rien ne le référence.

> Le rendu a été vérifié en reconvertissant ces vecteurs en image, **pas sur un téléphone** : à confirmer sur appareil
> (Android 12+ et, si possible, Android ≤ 11).

- `icon-foreground.png` est volontairement conçu **sans réduction préalable** : `@capacitor/assets` applique déjà un
  `inset` de 16,7 % dans `ic_launcher.xml` (zone de sécurité Android). Une double réduction rendait l'icône trop petite.
- Fond du splash `#1e1b4b` aligné dans `capacitor.config.ts` ; le spinner est désactivé (il se superposait au logo centré).
- L'icône de notification (barre d'état) reste une silhouette d'éclair monochrome (`res/drawable/ic_stat_notify.xml`).

# Comparatif OCR : Tesseract, PaddleOCR (PP-OCRv5 / v6) et EasyOCR

**Priorités demandées : taille minimale, puis performances.** Toutes les valeurs ci-dessous ont été **mesurées**
(sauf mention contraire) avec les scripts de [`docs/ocr-benchmark/`](./ocr-benchmark/README.md), à partir des trois SMS
réels fournis (Orange Money ×2, MTN MoMo) rendus en images.

## Décision

**On garde Tesseract.js** (moteur Tesseract 5 LSTM, WebAssembly), mais on corrige ses défauts :

1. le modèle de langue français est désormais **embarqué dans l'application** (avant : téléchargé depuis un CDN au
   premier usage → échec hors ligne, et une requête réseau à chaque appareil) ;
2. des **contrôles de cohérence** rattrapent les erreurs de chiffres (compteur du SMS comparé à vos compteurs, prix
   unitaire montant/kWh comparé à la grille tarifaire), car c'est là que Tesseract est le moins fiable.

Pourquoi pas PaddleOCR ? Il est un peu plus précis sur les longues chaînes de chiffres (≈ +4 points ici), mais coûte
**4× plus de poids** et est **≈ 2× plus lent en WebAssembly**. Avec votre priorité (taille, puis performance), l'écart
de précision ne justifie pas ce prix tant que l'utilisateur relit les valeurs avant d'enregistrer. Les conditions dans
lesquelles il faudrait changer d'avis sont détaillées en fin de document.

## 1. Taille réellement livrée (compressée, comme dans l'APK)

| Option | Moteur d'exécution | Modèles | **Total (gzip)** |
|---|---|---|---|
| **Tesseract.js + français `best_int` (retenu)** | 1,49 Mo | 0,71 Mo | **≈ 2,2 Mo** |
| Tesseract.js + français `fast` | 1,49 Mo | 0,61 Mo | ≈ 2,1 Mo |
| Tesseract.js + anglais `fast` | 1,49 Mo | 1,97 Mo | ≈ 3,5 Mo |
| ONNX Runtime Web + **PP-OCRv6 tiny** | 3,66 Mo | 5,72 Mo (det 1,83 + rec 4,46 Mo bruts) | ≈ 9,4 Mo |
| ONNX Runtime Web + PP-OCRv5 mobile (latin) | 3,66 Mo | 11,86 Mo | ≈ 15,5 Mo |
| ONNX Runtime Web + PP-OCRv6 small | 3,66 Mo | 26,55 Mo | ≈ 30,2 Mo |
| EasyOCR | PyTorch (wheel ≈ 555 Mo) | détecteur 77,3 Mo + reconnaissance latin 14,3 Mo | **≈ 91 Mo + PyTorch** |

- Les modèles ONNX (poids flottants) se compressent très peu, contrairement au WebAssembly : d'où le classement.
- **EasyOCR** n'est pas déployable sur téléphone tel quel : il tourne sous PyTorch. Un export ONNX existe en théorie
  mais n'a **pas été testé** ici, et les modèles resteraient 10× plus gros que Tesseract. Écarté d'emblée.
- PP-OCRv6 *tiny* ne fait que ≈ 1,5 M de paramètres (dictionnaire multilingue dont le français) : c'est le meilleur
  compromis de la famille Paddle, mais ONNX Runtime Web seul pèse déjà plus que tout Tesseract.

## 2. Précision (extraction des champs critiques par le parseur de l'application)

Champ critique = montant, kWh, n° de compteur, référence de transaction, jeton (tous exacts ou c'est raté).
Cellule = *champs critiques corrects* / *erreur de caractères* (CER).

| Moteur / modèle | Captures propres (6) | Photo modérée (3) | Variantes aléatoires modérées (42) | Photo très dégradée (3) |
|---|---|---|---|---|
| PP-OCRv6 small | 100 % / 1 % | 100 % / 2 % | **98 %** / 3 % | 22 % / 21 % |
| PP-OCRv6 tiny | 100 % / 6 % | 100 % / 3 % | 97 % / 4 % | 7 % / 40 % |
| PP-OCRv5 mobile (latin) | 100 % / 1 % | 100 % / 1 % | 96 % / 5 % | 0 % / 66 % |
| Tesseract anglais `fast` | 100 % / 1 % | 100 % / 1 % | 95 % / 4 % | 0 % / 82 % |
| **Tesseract français `best_int` (retenu)** | 93 % / 1 % | 100 % / 1 % | 93 % / 4 % | 0 % / 82 % |
| Tesseract français `fast` | 97 % / 1 % | 100 % / 1 % | 92 % / 3 % | 7 % / 81 % |

Lecture :
- Sur des **captures propres et des photos correctes**, tous les moteurs passent (les écarts sont des chiffres isolés).
- Sur les **42 variantes aléatoires**, PP-OCR devance Tesseract de ≈ 3 à 5 points, presque uniquement sur les
  **longues chaînes de chiffres** (compteur, référence) : p. ex. `012345677852` lu pour `01234567852`.
- Sur la **photo très dégradée** (430 px de large, floue, inclinée), personne n'est utilisable : l'app la traite comme
  un échec propre (l'utilisateur complète à la main).
- Un **prétraitement** (niveaux de gris, inversion du mode sombre, contraste, agrandissement) a été testé et **n'a pas
  aidé** Tesseract (il a même dégradé `best_int` sur les captures propres) : l'image est donc envoyée brute.

## 3. Vitesse

| Mesure (CPU de bureau) | Temps |
|---|---|
| Tesseract.js, WebAssembly, image complète (moyenne) | ≈ 280 – 330 ms |
| PP-OCRv6 tiny, ORT **natif** (Rust), image complète | ≈ 320 ms |
| PP-OCRv6 tiny, ORT-web **WASM 1 thread** : détection + reconnaissance (9 lignes), inférence seule | 230 + 295 ≈ **525 ms** |
| PP-OCRv5 mobile, ORT-web WASM 1 thread : détection + reconnaissance | 445 + 1005 ≈ **1 450 ms** |
| PP-OCRv5 mobile / v6 small, ORT natif, image complète | ≈ 1 160 ms / ≈ 1 680 ms |

Dans une WebView Capacitor, le WebAssembly est **mono-thread** (les threads WASM exigent une isolation cross-origin
absente ici) : c'est pourquoi la ligne « WASM 1 thread » est celle qui compte. Sur un téléphone d'entrée de gamme,
multipliez ces durées par 3 à 5 environ (estimation, non mesurée).

## 4. Limites de cette mesure (à lire avant de décider)

- Le corpus est **synthétique** : trois messages rendus avec la police DejaVu puis dégradés (flou, bruit, JPEG,
  rotation). Il ne reproduit pas les polices, moirages et reflets de vraies photos d'écran de téléphone.
- **Petits échantillons** (6 / 3 / 42 / 3 images) : un écart de 3 à 4 points correspond à quelques champs isolés et
  reste dans le bruit statistique. Le classement des quatre premiers n'est pas significatif ; l'écart de **taille**, lui, est certain.
- PP-OCRv6 tiny affiche une CER plus élevée (6 %) malgré 100 % de champs corrects sur captures propres : la cause
  (ponctuation, coupures de lignes) n'a pas été investiguée.
- Les temps PP-OCR « natifs » viennent de Python/Rust sur un CPU de bureau, pas d'un téléphone.
- Le parcours OCR **dans la WebView** (chargement du worker et du modèle embarqués) n'a pas pu être exécuté ici (pas de
  navigateur dans l'environnement de test) ; ce qui a été mesuré est le même moteur et le même modèle sous Node.

## 5. Quand changer d'avis

| Si… | Alors |
|---|---|
| vous acceptez **+7 Mo** et ≈ 2× plus de temps pour ≈ +4 points sur les chiffres | **PP-OCRv6 tiny** via ONNX Runtime Web : ≈ 250 lignes de JS à écrire et tester (prétraitement de détection, post-traitement DB, décodage CTC avec `char_dict.json`). Modèles `det.onnx` / `rec.onnx` extraits du paquet `faster-paddle` (voir le README du banc d'essai). |
| vous ciblez **uniquement Android** et voulez le plus petit et le plus rapide | **ML Kit Text Recognition** via `@capacitor-mlkit/text-recognition` (v8.2.1, compatible Capacitor 8 d'après son `peerDependencies`). D'après ce que je connais de ML Kit (**non vérifié ni mesuré dans cette session**), le modèle peut être soit embarqué (quelques Mo), soit fourni par Google Play Services (≈ 0 Mo dans l'APK) : à confirmer dans la documentation avant tout choix. Non retenu pour l'instant : plugin natif dont la compilation Gradle ne peut pas être vérifiée dans cet environnement, et dépendance à Google Play Services. |
| les photos réelles se révèlent bien plus dégradées que prévu | Commencer par ajouter des exemples réels au corpus (le banc d'essai est prêt) avant de changer de moteur. |

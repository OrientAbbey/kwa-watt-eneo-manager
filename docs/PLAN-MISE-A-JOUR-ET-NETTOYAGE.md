# Plan — mise à jour des packages et nettoyage du projet

**État général :** 🟢 Mises à jour, nettoyage et vérifications terminés
**Branche de travail :** `chore/update-dependencies-cleanup`
**Dernière mise à jour :** 2026-11-18

Ce document sert de suivi des décisions, modifications et vérifications. Les cases sont cochées uniquement après exécution et contrôle.

## Contexte et contraintes

- Le dépôt est une application React/TypeScript avec Capacitor/Android ; les dépendances applicatives sont gérées par npm (`package.json` et `package-lock.json`). Aucun manifeste Python n’a été repéré dans l’inventaire initial.
- Node.js `v24.19.0`, npm `12.0.2` et Python `3.12.10` sont disponibles sur l’environnement de travail.
- Le dépôt était propre sur `main` au début de cette tâche.
- Le Python demandé sera isolé dans un environnement local `.venv` créé explicitement avec Python 3.12. Il ne remplacera pas npm pour les dépendances JavaScript. N’ajouter aucune dépendance Python tant qu’un besoin réel n’est pas identifié.
- Ne pas appliquer de mise à jour forcée (`npm audit fix --force`) ni supprimer de fichiers/dépendances sans vérifier leur usage et leurs références.
- Conserver les fonctions existantes, les configurations Firebase/Android et les fichiers générés qui sont nécessaires à la compilation ou au dépôt.

## Étapes et suivi

### 0. Planification

- [x] Créer ce plan avant de modifier les dépendances ou les sources du projet.

### 1. État de référence et inventaire

- [x] Confirmer branche, propreté Git et fichiers déjà modifiés ; créer une branche dédiée sans écraser de travail existant.
- [x] Inventorier les manifestes, verrouillages, scripts npm, workflows CI, fichiers Python éventuels et sorties générées/ignorées.
- [x] Établir l’état initial : versions installées et souhaitées, tests, types et build. Le typecheck et le build web passent. La suite Vitest a échoué uniquement par timeouts de workers/tests sous forte charge machine (3 timeouts, 298 tests réussis) ; à relancer après stabilisation. L’audit npm a échoué côté registre (`ECONNRESET`) ; un audit intermédiaire indique 28 alertes (1 faible, 10 modérées, 15 élevées, 2 critiques) après retrait de paquets inutiles, contre 19 lors de l’installation initiale. À réévaluer après mise à jour.
- [x] Examiner les vulnérabilités une par une (sévérité, dépendance directe/transitive, chemin runtime/dev, disponibilité d’un correctif) ; ne pas exposer ni recopier de secrets.

### 2. Environnement Python 3.12 isolé

- [x] Créer `.venv` avec l’interpréteur Python 3.12 disponible (`py -3.12 -m venv .venv`).
- [x] Vérifier que `.venv` est exclu de Git et confirmer la version via `.venv` (`python --version`).
- [x] N’installer que les outils Python nécessaires à cette tâche, le cas échéant, dans `.venv` ; documenter leur rôle et versions si des dépendances sont ajoutées. Aucun paquet tiers requis : le contrôle ajouté n’utilise que la bibliothèque standard Python 3.12.
- [x] Si aucun outil Python n’est utile au projet, conserver l’environnement demandé sans inventer de paquet ou de manifeste Python. L’environnement sert à exécuter `scripts/check_dependency_manifest.py`, qui vérifie la cohérence des manifestes et l’hygiène Git.

### 3. Mise à jour maîtrisée des packages

- [x] Comparer les versions déclarées, verrouillées et disponibles ; vérifier la compatibilité Node 24, Capacitor 8, Vite, React et Android. Les sauts majeurs suivants sont volontairement différés : Vite 8 / plugin React 6 (peer Vite 8), Firebase 13, Lucide 1, Motion 14, jsdom 31, TypeScript 7 et types Node 26. `@capacitor/assets` 4 est retenu car il remplace `sharp` 0.32 par 0.35 (correctif de sécurité documenté) et conserve la même commande CLI.
- [x] Corriger les incohérences manifestes du manifeste (par exemple, vérifier le double classement de Vite avant de le déplacer/supprimer).
- [x] Mettre à jour les dépendances par groupes cohérents et petits lots ; examiner les changements du lockfile après chaque lot.
- [x] Pour chaque mise à jour majeure, consulter les notes de migration et tester les usages concernés avant de poursuivre. Seule `@capacitor/assets` 4 a été acceptée ; sa CLI `--android --assetPath` est inchangée et ses prérequis Node sont satisfaits.
- [x] Traiter les avis npm sans remédiation forcée ; expliquer dans ce plan toute vulnérabilité non corrigée avec sa justification et une date de réexamen.

### 4. Nettoyage du projet

- [x] Repérer les fichiers, scripts, dépendances et sorties réellement inutilisés par recherche de références, tests et workflows. `autoprefixer`, `@types/uuid`, `@testing-library/dom` et le doublon `vite` en dépendance runtime sont inutiles.
- [x] Supprimer uniquement les éléments confirmés comme obsolètes ; préserver les ressources Android/Capacitor et les artefacts attendus par la CI.
- [x] Vérifier les règles `.gitignore` pour l’environnement `.venv`, caches, builds et fichiers locaux sensibles, sans masquer des fichiers source suivis. Les clés de service Firebase et la copie locale de configuration distante restent bien ignorées et non suivies.
- [x] Vérifier que les scripts de nettoyage fonctionnent sur Windows et dans la CI Linux ; rendre leur comportement prévisible et limité aux sorties générées. `npm run clean` n’utilise plus `rm -rf`, et `scripts/bundle-size.mjs` normalise les séparateurs de chemins Windows (le total « APP » était à 0 à cause des `\`).

### 5. Validation finale et clôture

- [x] Installer à partir du lockfile avec `npm ci` et contrôler les éventuels scripts d’installation nécessaires. `npm ci --dry-run` valide le lockfile. Les scripts autorisés sont limités aux deux versions d’`esbuild` (binaires de build) ; ceux de `@firebase/util`, `protobufjs` et `tesseract.js` sont explicitement refusés (messages d’information uniquement).
- [x] Exécuter lint/typecheck, tests, build web et contrôles Android disponibles. Typecheck OK ; suite Vitest 5.1.0 : **36 fichiers, 366 tests réussis** ; build Vite 6.4.6 OK ; génération `@capacitor/assets` 4 et `cap sync android` OK (les ressources régénérées n’ont pas été commitées, la CI les recrée). Impact à surveiller : le chunk Firebase passe de ~106 Ko gzip à ~168 Ko gzip ; le total « APP » mesuré passe à ~572 Ko gzip.
- [x] Relancer et examiner l’audit npm ; comparer les résultats à l’état initial et documenter les risques résiduels.
- [x] Examiner `git diff`, vérifier qu’aucun secret, fichier `.venv` ou artefact indésirable n’est inclus, et confirmer l’état final du dépôt.
- [x] Mettre à jour ce tableau de suivi et résumer les changements, contrôles et limites avant tout commit/push.

## Traitement des avis npm (état final)

Audit final : **17 alertes** (0 critique, 9 élevées, 7 modérées, 1 faible), contre 19 au départ et 28 après le premier retrait de paquets. Les correctifs suivants ont été appliqués sans remédiation forcée : `source-map-js` 1.2.2, `brace-expansion` 5.0.13, `@trapezedev/project` 7.1.13 (remplace `xcode` 3 / `uuid` 7), Vite 6.4.6 et suppression de `sharp` 0.32 via `@capacitor/assets` 4.

Risques restants assumés, avec réexamen fixé au **2026-12-18** :

| Avis | Raison de l’acceptation |
|---|---|
| `firebase` / `@firebase/firestore` / `@grpc/grpc-js` 1.9.16 (élevé) | `@firebase/firestore` épingle `~1.9.0` ; l’avis concerne la configuration d’un serveur gRPC Node, alors que l’application utilise le client web Firestore (le bundle navigateur n’embarque pas ce chemin). `firebase-admin`, utilisé uniquement par le script local, dispose déjà de `@grpc/grpc-js` 1.14.5 corrigé. La seule « solution » de npm est un retour à Firebase 9.14.0, refusé. |
| `picomatch`, `fdir`, `tinyglobby` via Vite/Vitest (élevé) | Versions les plus récentes disponibles toujours signalées ; npm propose des rétrogradations (Vite 6.2.7, Vitest 3.1.4) comme correctif. Outils de build/test uniquement, jamais embarqués dans l’APK ou le site. |
| `gaxios`, `gcp-metadata`, `glob`, `minimatch`, `rimraf`, `google-gax`, `uuid` via `firebase-admin` (modéré) | Chaîne de dépendances du script d’administration Firebase, exécuté manuellement avec des identifiants locaux ; npm propose des rétrogradations plutôt que des correctifs. Aucune exposition dans l’application distribuée. |

## Journal

| Date | Étape | Résultat |
|---|---|---|
| 2026-11-18 | Plan | Plan créé avant toute modification des packages ou du code. Dépôt initial propre sur `main` ; Python 3.12.10, Node 24.19.0 et npm 12.0.2 disponibles. |
| 2026-11-18 | Inventaire / environnement | Branche `chore/update-dependencies-cleanup` créée depuis le dépôt propre. `.venv` créé et vérifié en Python 3.12.10 ; `.gitignore` ignore `.venv/`, `__pycache__` et bytecode. Pas de manifeste Python, seulement quelques outils/corpus documentaires Python. npm est le gestionnaire actif (lockfile v3, CI `npm ci`). Packages installés cohérents avec la résolution lockée ; `npm outdated` accessible, `npm audit` échoue actuellement sur `ECONNRESET`. Vérifications de tests/build/type lancées ; résultats attendus. Vite est redondamment déclaré dans `dependencies` et `devDependencies` et doit être normalisé au nettoyage. |
| 2026-11-18 | Nettoyage | Retrait de `autoprefixer`, `@types/uuid`, `@testing-library/dom` et du doublon `vite` (désormais uniquement en `devDependencies`). `clean` rendu portable (plus de `rm -rf`). Ajout de `scripts/check_dependency_manifest.py`, exécuté avec le `.venv` Python 3.12 : contrôle de cohérence des manifestes et vérification qu’aucun secret/environnement local n’est suivi par Git. |
| 2026-11-18 | Mises à jour | Plages de versions mises à jour dans `package.json` pour les majeures acceptées et tous les correctifs/mineures compatibles : Capacitor 8.6.2, `@capgo` 8.7.11, Tailwind 4.3.5, React 19.3.1, Firebase 12.19.0, Recharts 3.11.0, Vitest 5.1.0, etc. `@capacitor/assets` passe en 4.0.0 pour remplacer `sharp` 0.32 vulnérable. Installation `npm install --ignore-scripts --allow-remote=all` lancée en arrière-plan. |
| 2026-11-18 | Installation et scripts | Première installation terminée : versions directes conformes. Ajout correctif de `vite` en `devDependencies` (^6.4.6, il manquait après le retrait du doublon) et d’`overrides` ciblés (`source-map-js`, `@trapezedev/project`, `brace-expansion` sous `@capacitor/cli`). Seconde installation terminée. Scripts d’installation examinés : seuls les deux `esbuild` sont autorisés ; `@firebase/util`, `protobufjs` et `tesseract.js` sont refusés car leurs scripts ne servent qu’à afficher des messages. `tsx`, `vite` et la copie des assets OCR vérifiés manuellement. |
| 2026-11-18 | Audit | Audit final : 17 alertes (0 critique, 9 élevées, 7 modérées, 1 faible), en baisse de 19 au départ et 28 après le retrait initial. Les avis restants et leurs justifications sont consignés dans la section « Traitement des avis npm ». |
| 2026-11-18 | Tests | `npm run lint` passe. Suite Vitest 5.1.0 : 36 fichiers et 366 tests réussis. Les timeouts de l’état initial étaient bien dus à la charge concurrente, pas aux mises à jour. |
| 2026-11-18 | Build / Android | Build Vite 6.4.6 réussi (3 791 modules). `npm ci --dry-run` valide le lockfile. `npx @capacitor/assets generate --android --assetPath public` (v4) et `npx cap sync android` (Capacitor 8.6.2) réussissent ; 7 plugins détectés. Les PNG régénérés et les simples différences de fins de ligne ont été restaurés pour garder un diff ciblé. `scripts/bundle-size.mjs` corrigé pour Windows : APP = 571 893 o gzip, TOTAL = 2 059 268 o gzip. Le chunk Firebase a fortement grossi (106 → 168 Ko gzip) : à surveiller, sans blocage fonctionnel. |
| 2026-11-18 | Release / documentation | Version bumpée en **1.1.1** (`versionCode` Android 10101), `CHANGELOG.md` créé et `docs/DISTRIBUTION.md` complété avec l'historique des versions. Tag `v1.1.1` à publier après merge sur `main` pour déclencher la Release APK. |

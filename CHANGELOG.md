# Changelog

Toutes les modifications notables sont consignées dans ce fichier. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), avec des versions sémantiques.

## [1.1.1] - 2026-11-18

### Changed
- Mise à jour des dépendances npm dans les plages compatibles : Capacitor 8.6.2, React 19.3.1, Tailwind CSS 4.3.5, Firebase 12.19.0, Recharts 3.11.0, Vite 6.4.6, Vitest 5.1.0, `@capgo/capacitor-social-login` 8.7.11, etc.
- `@capacitor/assets` passe en 4.0.0 (remplace `sharp` 0.32 par 0.35). La commande de génération Android reste inchangée.
- Ajout d'`overrides` ciblés pour `source-map-js`, `@trapezedev/project` et `brace-expansion` afin de corriger des avis de sécurité sans rétrograder le projet.
- Scripts d'installation npm limités aux deux versions d'`esbuild` réellement nécessaires ; les scripts informatifs de `@firebase/util`, `protobufjs` et `tesseract.js` sont refusés.

### Fixed
- Suppression des dépendances inutilisées `autoprefixer`, `@types/uuid`, `@testing-library/dom` et du doublon `vite` déclaré en dépendance runtime.
- `npm run clean` ne dépend plus de `rm -rf` (fonctionne sur Windows et Linux).
- `scripts/bundle-size.mjs` gère les séparateurs Windows : le total « APP » n'était plus calculé (0 octet affiché).

### Added
- `scripts/check_dependency_manifest.py`, exécuté dans un environnement Python 3.12 isolé, vérifie la cohérence `package.json` / `package-lock.json` et qu'aucun secret ou environnement local n'est suivi par Git.
- `docs/PLAN-MISE-A-JOUR-ET-NETTOYAGE.md` : plan de suivi complet, inventaire, décisions, audit et vérifications.

### Security
- Audit npm : 28 alertes après le retrait initial, **17 alertes finales** (0 critique, 9 élevées, 7 modérées, 1 faible), contre 19 au départ.
- Les alertes restantes concernent surtout des outils de build/test et le script d'administration Firebase (`dev-only`, non embarqués dans l'APK ni le bundle web). Détail et date de réexamen (2026-12-18) dans le plan de suivi.

### Notes
- Impact à surveiller : le chunk Firebase passe d'environ 106 Ko à 168 Ko gzip ; le total « APP » mesuré est d'environ 572 Ko gzip.
- Vérifications : typecheck OK, 366 tests Vitest réussis, build web OK, `npm ci --dry-run` OK, génération des assets et `cap sync android` OK, CI Android verte.

## [1.1.0] - 2026-10-28

- Publication initiale de l'APK signé avec lien de téléchargement stable et procédure de distribution documentée.

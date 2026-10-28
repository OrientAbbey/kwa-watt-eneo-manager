# Distribuer l'application : APK, GitHub Releases et page de présentation

Deux workflows GitHub Actions font le travail ; il reste **quelques étapes manuelles** (une seule fois, sauf indication).

| Quoi | Où | Déclencheur |
|---|---|---|
| APK debug (développement) | `.github/workflows/android-build.yml` | push sur `main`, pull request |
| **Release** : APK `kwa-watt.apk` + SHA-256 | `.github/workflows/release-apk.yml` | tag `vX.Y.Z` |
| **Page de présentation** (`site/`) | `.github/workflows/pages.yml` | push sur `main` touchant `site/**` |

> **Honnêteté sur l'état de ces workflows.** Ils n'ont **pas pu être exécutés** dans l'environnement où ils ont été écrits
> (pas d'accès à GitHub Actions, pas de SDK Android). Ils ont été vérifiés par analyse statique (`actionlint 1.7.7` sans
> erreur, YAML valide) et la logique de version par des tests. **La première exécution est le vrai test** : lisez ses logs.
> Les versions des actions de Pages (`configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`) ont été relevées
> sur des dépôts publics en octobre 2026 ; si GitHub signale un problème, changez le numéro de version.

## 1. Étapes manuelles (une fois)

### 1.1 Activer GitHub Pages
1. Dépôt GitHub → **Settings** → **Pages**.
2. **Build and deployment → Source : GitHub Actions** (et non « Deploy from a branch »).
3. Poussez sur `main` (ou **Actions → Deploy site → Run workflow**). L'adresse sera
   `https://orientabbey.github.io/kwa-watt-eneo-manager/`.
4. Le dépôt doit être **public** (sinon Pages exige un plan payant).

### 1.2 Vérifier les droits des workflows
**Settings → Actions → General → Workflow permissions** : « Read and write permissions » n'est pas obligatoire (le workflow
déclare `contents: write` lui-même), mais **« Allow GitHub Actions to create and approve pull requests » n'est pas
nécessaire**. Vérifiez seulement qu'Actions est activé pour le dépôt.

### 1.3 Secrets de signature (Settings → Secrets and variables → Actions → New repository secret)

Choisissez **une** option. Sans aucun de ces secrets, la publication est **refusée** (une clé jetable changerait à chaque
version et empêcherait les mises à jour).

**Option A — clé de debug actuelle (acceptable pour une bêta).** Rien de nouveau si `DEBUG_KEYSTORE_B64` existe déjà
([`SIGNATURE_DEBUG.md`](./SIGNATURE_DEBUG.md)). Le SHA-1 est déjà enregistré dans Firebase, donc Google Sign-In natif
fonctionne. Inconvénients : APK **débogable**, signé avec une clé « debug », avertissements Play Protect plus marqués.

**Option B — vraie clé de release (recommandée pour une diffusion publique).**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore kwa-watt-release.keystore \
  -alias kwa-watt -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 kwa-watt-release.keystore > kwa-watt-release.keystore.b64     # une seule ligne
keytool -list -v -keystore kwa-watt-release.keystore -alias kwa-watt      # relever le SHA-1 et le SHA-256
```
Créez les 4 secrets : `RELEASE_KEYSTORE_B64` (contenu du `.b64`), `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS`
(`kwa-watt`), `RELEASE_KEY_PASSWORD`. Puis **enregistrez le SHA-1 de cette clé dans Firebase** (Paramètres du projet →
l'app Android `com.eneotool.app` → Ajouter une empreinte), sinon la connexion Google native échouera.
**Sauvegardez le fichier `.keystore` et ses mots de passe hors du dépôt** : s'il est perdu, plus aucune mise à jour ne
pourra être installée par-dessus les anciennes versions.

> **Changer de clé plus tard force une désinstallation** : Android refuse une mise à jour signée par une autre clé. Passer
> de A à B (ou publier d'abord en A) oblige donc les premiers utilisateurs à désinstaller puis réinstaller, en sauvegardant
> leurs données (synchronisation Google ou export). Si vous visez une diffusion publique, démarrez directement en B.

Si les deux jeux de secrets existent, **B est utilisée**.

## 2. Publier une version

1. Choisissez le numéro `X.Y.Z` (schéma ci-dessous) et mettez `package.json` à jour :
   ```bash
   npm version 1.2.0 --no-git-tag-version      # modifie package.json et package-lock.json
   ```
2. Lancez les contrôles : `npm run lint && npx vitest run && npm run build`.
3. Committez, poussez sur `main`, puis créez et poussez le tag **sur ce commit** :
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```
4. **Actions → Release APK** : suivez l'exécution. En cas de succès, une **Release** apparaît avec `kwa-watt.apk`,
   `kwa-watt.apk.sha256` et des notes (empreinte SHA-256 de l'APK et du certificat de signature).
5. Vérifiez le lien stable : `https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases/latest/download/kwa-watt.apk`
   et installez l'APK sur un téléphone (voir `docs/QA_CHECKLIST.md`).

Le workflow **refuse** de publier si : le tag n'est pas sur `main` ; le tag ne correspond pas à `package.json` ; `lint` ou
les tests échouent ; aucune clé stable n'est configurée ; la version lue dans l'APK ne correspond pas au tag.
Pour republier un tag existant : **Actions → Release APK → Run workflow** en donnant le tag (les fichiers sont remplacés).

### Schéma de version
Tag `vMAJEUR.MINEUR.CORRECTIF` = `version` de `package.json` = `versionName` Android (affiché dans Aide → À propos).
`versionCode = MAJEUR×10000 + MINEUR×100 + CORRECTIF` (1.1.0 → 10100). Il doit **toujours augmenter**, sinon Android refuse la
mise à jour. MINEUR et CORRECTIF vont jusqu'à 99. Valeurs par défaut des builds locaux : `android/app/build.gradle`
(un test vérifie qu'elles suivent `package.json`). Logique : `scripts/releaseVersion.mjs`.

## 3. La page de présentation
- Sources : `site/` (HTML / CSS / un peu de JS, **sans framework ni build**, polices système, aucune requête tierce hormis,
  facultatif, `api.github.com` pour afficher version / date / taille ; repli sans réseau).
- Le bouton pointe vers `releases/latest/download/kwa-watt.apk`. Tant qu'aucune version n'est publiée, le script remplace le
  bouton par « Voir les versions » (sans JavaScript, le lien renvoie une 404 jusqu'à la première release).
- Contrôle automatisé local : `node scripts/check-site.mjs` (voir le README) : aucune requête tierce, politique CSP respectée,
  accessibilité (axe-core), pas de débordement, poids.
- Modifier le texte de confidentialité en même temps que le comportement de l'application ; mettre à jour la date.
- Régénérer les images : `docs/CAPTURES.md`, puis redimensionner à 300 px de large (WebP qualité 72) dans `site/img/`.

## 4. Ce qui n'est PAS vérifié
- Exécution réelle des workflows (Actions, `gh release`, Pages), compilation de Gradle avec les nouvelles propriétés
  de version / de signature, installation de l'APK signé sur un téléphone, avertissements Play Protect.
- Affichage de la page sur un vrai téléphone (vérifiée dans Chromium headless à 390 px et 1280 px, clair et sombre).

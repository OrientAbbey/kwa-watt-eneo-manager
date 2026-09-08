# KWA-WATT — ENEO Manager (Cameroun)

Application de gestion de l'électricité prépayée ENEO : suivi de la consommation mensuelle, des recharges de crédit, alertes de seuils, calculatrice kWh ⇄ FCFA, multi-compteurs, synchronisation cloud (Firebase) et mode 100 % hors-ligne pour les invités.

- **Stack** : React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · Firebase (Auth + Firestore) · Recharts
- **Mobile** : Capacitor 8 (Android · applicationId `com.eneotool.app`)

## Prérequis

- Node.js 20+
- Un projet Firebase avec **Google Authentication** et **Firestore** activés
- (Optionnel) Android Studio + JDK 21 pour compiler l'APK

## Démarrage local

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build web

```bash
npm run build
npm run preview
```

## Build Android (APK)

```bash
npm run cap:build          # build web + npx cap sync android
# Ouvrir le sous-dossier android/ dans Android Studio
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Le CI (`.github/workflows/android-build.yml`) compile aussi un APK debug à chaque push sur `main`.

## Configuration Google Sign-In (mobile — erreur « connexion (10) »)

La connexion Google sur Android repose sur deux éléments : le **client OAuth** (Web Client ID) et le fichier **`google-services.json`**. S'ils sont manquants, Google renvoie l'erreur développeur `10`.

Procédure :

1. **Console Firebase** → sélectionne ton projet → **Ajouter une application** → **Android**,
   avec le package `com.eneotool.app`.
   - Renseigne l'empreinte **SHA-1** de ta clé de signature :
     - Debug (Android Studio / `cap:build`) : `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
     - Release : celle de ton keystore de production.
   - Télécharge le fichier **`google-services.json`** généré et dépose-le dans `android/app/`.
     > ⚠️ Ce fichier est **exclu de git** (`android/.gitignore`). Ne jamais le committer — il contient des identifiants pour ton app.
2. **Build.gradle** : le plugin `com.google.gms.google-services` est déjà appliqué automatiquement dès que le fichier existe (`android/app/build.gradle`). Puis relance `npx cap sync android` et recompiles.
3. **Google Cloud Console** → **API & Services** → **Identifiants** :
   - Le **Web Client ID** (`567954813184-…apps.googleusercontent.com`) est déjà utilisé dans `src/lib/firebase.ts` (`GOOGLE_WEB_CLIENT_ID`). Si tu crées un nouveau projet, crées-en ou récupères-en un et mets à jour cette constante.
   - Créé éventuellement le **client OAuth Android** (package `com.eneotool.app` + SHA-1) nécessaire à la vérification native.
4. Recompile l'application (`npm run cap:build`), réinstalle et reteste la connexion.

## Boilerplate technique

- `capacitor.config.ts` : `webClientId` et hostname — voir le guide ci-dessus.
- Les images d'aide officielles sont servies depuis `public/assets/help/`.
- Icône / splash : `public/icon.png` et `public/splash.png` (config `assets-config.json` pour `@capacitor/assets`).

## Documentation

Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour le détail des modules et de l'architecture.
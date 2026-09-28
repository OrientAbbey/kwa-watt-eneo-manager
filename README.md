# KWA-WATT — ENEO Manager (Cameroun)

Application de gestion de l'électricité prépayée ENEO : suivi de la consommation mensuelle, des recharges de crédit, alertes de seuils, calculatrice kWh ⇄ FCFA, multi-compteurs, synchronisation cloud (Firebase) et mode 100 % hors-ligne pour les invités.

- **Stack** : React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · Firebase (Auth + Firestore) · Recharts
- **Mobile** : Capacitor 8 (Android · applicationId `com.eneotool.app`)
- **Backend** : projet Firebase dédié **`kwa-watt-eneo-manager`** (`186942591566`) — Google Auth + Firestore `(default)` en `europe-west1`, règles déjà déployées

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

La connexion Google sur Android repose sur le **client OAuth** (Web Client ID) et le fichier **`google-services.json`**. S'ils sont manquants, Google renvoie l'erreur développeur `10`.

📖 **La procédure complète** (projet Firebase dédié, console Google Cloud, mise à jour des identifiants, tests et dépannage) est détaillée dans **[`GOOGLE_AUTH_SETUP.md`](./GOOGLE_AUTH_SETUP.md)** — l'**état actuel** (valeurs réelles du projet `kwa-watt-eneo-manager`, apps Android/Web, Web Client ID) est dans sa **section 3.0**.

✅ **Déjà configuré** : projet dédié créé, Google Auth activé, app Android + Web enregistrées, `google-services.json` en place (`android/app/`), Web Client ID et `loginMode: 'online'` dans `src/config.ts`, règles Firestore déployées.

En bref :
1. **Console Firebase** → crée un projet dédié → active **Google Authentication** + **Firestore**.
2. Ajoute l'application **Android** (`com.eneotool.app`) avec le **SHA-1** de ta clé de signature → télécharge **`google-services.json`** → dépose-le dans `android/app/` *(exclu de git)*.
3. **Google Cloud Console** → **Écran de consentement** + **ID client OAuth type « Application Web »**.
4. Mets à jour les identifiants dans les **deux fichiers centralisés** : `src/config.ts` (`webClientId`) et `firebase-applet-config.json` (projet/sdk).
5. `npx cap sync android` + recompile.

Boilerplate technique :
- Les images d'aide officielles sont servies depuis `public/assets/help/`.
- Icône / splash : `public/icon.png` et `public/splash.png` (config `assets-config.json` pour `@capacitor/assets`).
- Toutes les constantes applicatives (client ID, scopes, délais de synchro/session, appId, hostname…) sont dans **`src/config.ts`**.

## Configuration à distance (branding, liens, tarifs)

L'app lit un document Firestore public et facultatif `app_config/branding` au démarrage (mis en cache 24h,
repli automatique sur des valeurs par défaut intégrées si absent ou hors ligne — voir `src/lib/remoteConfig.ts`).
Cela permet de mettre à jour le nom de l'opérateur (ex. ENEO → SOCADEL), les liens utiles ou les codes USSD
**sans publier de nouvelle version de l'app** : il suffit de créer/modifier ce document dans la console Firebase.

## Signature debug / Google Sign-In natif

Voir [`docs/SIGNATURE_DEBUG.md`](./docs/SIGNATURE_DEBUG.md) — la clé de signature debug n'est plus committée
dans le dépôt et doit être fournie via le secret GitHub `DEBUG_KEYSTORE_B64`.

## Synchronisation cloud

Voir [`docs/SYNC_ET_REGLES.md`](./docs/SYNC_ET_REGLES.md) — modèle de données, fusion multi-appareils, et
déploiement des règles Firestore/Storage.

## Documentation

Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour le détail des modules et de l'architecture.
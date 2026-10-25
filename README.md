# KWA-WATT — ENEO Manager (Cameroun)

Application de gestion de l'électricité prépayée ENEO : suivi de la consommation mensuelle, des recharges de crédit, alertes de seuils, calculatrice kWh ⇄ FCFA, multi-compteurs, synchronisation cloud (Firebase) et mode 100 % hors-ligne pour les invités.

- **Stack** : React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · Firebase (Auth + Firestore) · Recharts
- **Mobile** : Capacitor 8 (Android · applicationId `com.eneotool.app`)
- **Backend** : projet Firebase dédié **`kwa-watt-eneo-manager`** (`186942591566`) — Google Auth + Firestore `(default)` en `europe-west1`, règles déjà déployées

## Captures d'écran

Données de démonstration fictives, rendu Chromium (pas une WebView Android : voir [`docs/CAPTURES.md`](./docs/CAPTURES.md)).

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/tableau-de-bord.webp" width="200" alt="Tableau de bord : énergie restante estimée, consommation du mois et prédiction de fin de crédit"><br><sub>Tableau de bord</sub></td>
    <td align="center"><img src="docs/screenshots/calcul.webp" width="200" alt="Outil de calcul : montant vers kWh selon la tranche tarifaire"><br><sub>Calcul et simulateur de tranche</sub></td>
    <td align="center"><img src="docs/screenshots/historique.webp" width="200" alt="Historique des consommations et des recharges"><br><sub>Historique</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/services-recharge.webp" width="200" alt="Onglet Services : recharge par MTN MoMo ou Orange Money"><br><sub>Services : recharge par codes</sub></td>
    <td align="center"><img src="docs/screenshots/credit-urgence.webp" width="200" alt="Crédit d'urgence 811 suivi comme une dette de kWh à rembourser"><br><sub>Crédit d'urgence 811</sub></td>
    <td align="center"><img src="docs/screenshots/import-sms.webp" width="200" alt="Import d'une recharge depuis un SMS : valeurs reconnues et contrôles du compteur"><br><sub>Import depuis un SMS</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/notifications.webp" width="200" alt="Cloche de notifications et liste des alertes en cours"><br><sub>Cloche de notifications</sub></td>
    <td align="center"><img src="docs/screenshots/mode-sombre.webp" width="200" alt="Tableau de bord en mode sombre"><br><sub>Mode sombre</sub></td>
    <td align="center"><img src="docs/screenshots/tiroir-navigation.webp" width="200" alt="Tiroir de navigation : tableau de bord, profil, paramètres, aide"><br><sub>Tiroir de navigation</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/visite-guidee.webp" width="200" alt="Visite guidée : surbrillance de la carte du solde avec explication"><br><sub>Visite guidée</sub></td>
    <td align="center" colspan="2"><img src="docs/screenshots/grand-ecran.webp" width="420" alt="Application sur grand écran : barre latérale et tableau de bord"><br><sub>Grand écran</sub></td>
  </tr>
</table>

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
repli automatique sur des valeurs par défaut intégrées si absent ou hors ligne — voir `src/lib/remoteConfigSchema.ts`).
Cela permet de mettre à jour le nom de l'opérateur (ex. ENEO → SOCADEL), les liens utiles ou les codes USSD
**sans publier de nouvelle version de l'app** : `npx tsx scripts/seed-remote-config.ts` (procédure complète,
y compris récupérer une clé d'administrateur Firebase, dans [`docs/CONFIG_A_DISTANCE.md`](./docs/CONFIG_A_DISTANCE.md)).

## Signature debug / Google Sign-In natif

Voir [`docs/SIGNATURE_DEBUG.md`](./docs/SIGNATURE_DEBUG.md) — la clé de signature debug n'est plus committée
dans le dépôt et doit être fournie via le secret GitHub `DEBUG_KEYSTORE_B64`.

## Notifications

Alertes persistantes dans la zone de notification Android (bouton « Supprimer », republication à l'ouverture) :
[`docs/NOTIFICATIONS.md`](./docs/NOTIFICATIONS.md).

## OCR, logo

- Lecture de photos/captures de SMS : Tesseract.js **embarqué et hors ligne** ; comparatif mesuré avec PaddleOCR et
  EasyOCR dans [`docs/OCR_COMPARATIF.md`](./docs/OCR_COMPARATIF.md) (banc d'essai reproductible dans `docs/ocr-benchmark/`).
- Logo (remplace celui de Flet) et pistes alternatives : [`docs/LOGO.md`](./docs/LOGO.md).

## Visite guidée

Présentation interactive au premier lancement, rejouable depuis Aide → À propos et Paramètres : [`docs/VISITE_GUIDEE.md`](./docs/VISITE_GUIDEE.md).

## Captures

Régénérables avec `node scripts/screenshots.mjs` : [`docs/CAPTURES.md`](./docs/CAPTURES.md).

## Synchronisation cloud

Voir [`docs/SYNC_ET_REGLES.md`](./docs/SYNC_ET_REGLES.md) — modèle de données, fusion multi-appareils, et
déploiement des règles Firestore/Storage.

## Documentation

Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour le détail des modules et de l'architecture.
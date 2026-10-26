<p align="center">
  <img src="docs/logo/B_icon.svg" width="112" height="112" alt="Logo KWA-WATT : jauge prépayée avec un éclair">
</p>

<h1 align="center">KWA-WATT</h1>

<p align="center">
  Suivi d'électricité prépayée au Cameroun : recharges, consommation, fin de crédit estimée.<br>
  Hors ligne d'abord, gratuit, sans publicité.
</p>

<p align="center">
  <a href="https://github.com/OrientAbbey/kwa-watt-eneo-manager/actions/workflows/android-build.yml"><img src="https://github.com/OrientAbbey/kwa-watt-eneo-manager/actions/workflows/android-build.yml/badge.svg" alt="État de la compilation Android"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/licence-Apache--2.0-blue" alt="Licence Apache 2.0"></a>
  <a href="https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases/latest"><img src="https://img.shields.io/github/v/release/OrientAbbey/kwa-watt-eneo-manager?label=version" alt="Dernière version"></a>
</p>

> **Application indépendante.** KWA-WATT n'est affiliée ni à ENEO / SOCADEL, ni à MTN, ni à Orange. Ces noms appartiennent
> à leurs propriétaires et ne servent qu'à désigner les services avec lesquels l'application aide à travailler.

## En bref

KWA-WATT s'adresse aux abonnés d'électricité à **compteur prépayé** (ENEO, devenu SOCADEL). Elle enregistre vos recharges et
vos relevés, calcule les kWh selon votre tranche tarifaire et estime la date de fin de votre crédit. Tout fonctionne **sans
connexion** en mode visiteur ; la synchronisation Google est facultative.

- **Stack** : React 19 · Vite · TypeScript · Tailwind CSS 4 · Capacitor 8 (Android) · Firebase (Auth Google + Firestore, facultatif)
- **Priorités** : taille minimale (données mobiles chères), performances, 100 % gratuit (aucun service payant, aucun serveur à héberger)

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

## Fonctionnalités

- **Tableau de bord** : énergie restante estimée, consommation du mois, prédiction de fin de crédit, alertes.
- **Calcul** : montant ⇄ kWh selon la tranche, simulateur de tranche (moyenne des 6 derniers mois).
- **Historique** : consommations et recharges, import / export, plusieurs compteurs.
- **Services** : recharge MTN MoMo / Orange Money par codes courts USSD, crédit d'urgence 811 suivi comme une dette de kWh,
  codes du compteur (800-825, 873), diagnostic TID, demande de facture par SMS ou WhatsApp, coupures.
- **Import d'une recharge depuis un SMS** : collage ou photo (OCR Tesseract embarqué, hors ligne), contrôles du compteur et du prix au kWh.
- **Notifications** : alertes persistantes (bouton « Supprimer », republication à l'ouverture), cloche, rappels de recharge.
- **Synchronisation** : fusion par enregistrement entre appareils, photos en sous-collection ; données privées.
- **Configuration à distance** : nom de l'opérateur, liens, codes USSD modifiables sans nouvelle version.
- **Visite guidée** interactive ([détails](./docs/VISITE_GUIDEE.md)), mode sombre, tiroir mobile et barre latérale sur grand écran.

## Installation (Android)

1. Téléchargez **[kwa-watt.apk](https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases/latest/download/kwa-watt.apk)**
   (dernière version publiée) ou rendez-vous sur la [page de présentation](https://orientabbey.github.io/kwa-watt-eneo-manager/).
2. Autorisez l'installation depuis cette source si Android le demande (« Sources inconnues »).
3. Facultatif mais recommandé : comparez l'empreinte **SHA-256** du fichier avec celle indiquée dans les notes de la version.

> Tant qu'aucune version n'a été publiée sur GitHub, le lien ci-dessus renvoie une erreur 404.

## Architecture

La logique métier est **pure et testée** (`src/lib`) ; les composants restent minces. Chaque schéma est une source Mermaid
versionnée dans [`docs/diagrams/`](./docs/diagrams) (rendu natif sur GitHub).

### Couches

```mermaid
flowchart TB
  subgraph UI["Interface React 19"]
    V["Vues et fonctions<br/>Dashboard, Calcul, Historique,<br/>Services, Profil, Paramètres, Aide<br/>import de SMS, cloche, visite guidée"]
  end
  subgraph ST["Contextes et hooks"]
    C["AppContext, NavContext,<br/>RemoteConfigContext,<br/>TourContext"]
    H["useAlertScheduler,<br/>useActiveAlerts,<br/>useForegroundTick"]
  end
  subgraph LIB["Logique pure testée : src/lib"]
    L["eneo, energy, smsParser, alerts,<br/>alertNotifications, merge, sync,<br/>photos, migrations, tourLogic"]
  end
  subgraph IO["Stockage et plateforme"]
    LS[("localStorage<br/>données + photos")]
    FB[("Firebase<br/>Auth + Firestore")]
    CAP["Capacitor<br/>notifications, caméra,<br/>partage"]
  end
  V --> C
  V --> H
  C --> L
  H --> L
  L --> LS
  L --> FB
  L --> CAP
```

*Les vues appellent des contextes et des hooks, qui délèguent à la logique pure. Seule cette couche touche au stockage local,
à Firebase et aux plugins Capacitor.*

### Modèle de données

```mermaid
erDiagram
  ETAT ||--|{ COMPTEUR : "contient"
  COMPTEUR ||--o{ CONSOMMATION : "releves"
  COMPTEUR ||--o{ RECHARGE : "achats"
  COMPTEUR ||--o{ CREDIT_URGENCE : "prets 811"
  ETAT {
    int schemaVersion
    string activeMeterId
    string theme
    json settings
  }
  COMPTEUR {
    string id PK
    string name
    json profile
    json tombstones
  }
  CONSOMMATION {
    string id PK
    string date
    float kwh
  }
  RECHARGE {
    string id PK
    string date
    int montant
    float kwh
    string transactionRef
    int fees
  }
  CREDIT_URGENCE {
    string id PK
    string date
    float kwh
    bool repaid
  }
```

*Un état contient des compteurs ; chaque compteur porte ses relevés mensuels, ses recharges et ses crédits d'urgence. Chaque
enregistrement a un `updatedAt` (utile à la fusion). `tombstones` mémorise les suppressions pendant 90 jours ; les photos du
profil sont stockées à part. Les réglages (tarifs, alertes) sont dans `settings`. Schéma réel : `src/types.ts`.*

### Synchronisation local-first

```mermaid
flowchart TD
  A["Modification locale<br/>ou retour au premier plan"] --> B["Enregistrement local<br/>2 clés : données et photos"]
  B --> C{"Connecté<br/>avec Google ?"}
  C -- "non : visiteur" --> Z["Tout reste sur l'appareil"]
  C -- oui --> D["Lire user_data/uid<br/>dans Firestore"]
  D --> E["Fusion par enregistrement<br/>le plus récent gagne<br/>tombstones respectées"]
  E --> F["planPhotoSync, photo par photo<br/>manifeste local contre cloud"]
  F --> G["Appliquer ici :<br/>take télécharge, removeLocal retire"]
  G --> H{"Données plus<br/>grosses que 900 Ko ?"}
  H -- oui --> I["Erreur too_large<br/>données conservées sur l'appareil"]
  H -- non --> J["Écrire le document d'état"]
  J --> K["Photos une à une :<br/>upload envoie, deleteRemote retire"]
  K --> L{"Échec durable<br/>règles, quota ?"}
  L -- oui --> M["Photos suspendues pour la session<br/>les données restent synchronisées"]
  L -- non --> N["Mémoriser le manifeste"]
```

*Rien n'est envoyé en mode visiteur. Connecté, l'état est fusionné enregistrement par enregistrement (le plus récent gagne,
les suppressions ne ressuscitent pas), puis chaque photo suit un plan indépendant : un échec de photo n'empêche jamais la
synchronisation des données. Détails : [`docs/SYNC_ET_REGLES.md`](./docs/SYNC_ET_REGLES.md).*

### Import d'une recharge depuis un SMS

```mermaid
flowchart TD
  A["Bouton +, Depuis un SMS<br/>ou carte Services"] --> B["Fenêtre d'import"]
  B --> C1["Coller le SMS"]
  B --> C2["Photo ou capture"]
  C2 --> OCR["OCR Tesseract<br/>hors ligne"]
  C1 --> T["Texte du SMS"]
  OCR --> T
  T --> P["parseRechargeSms<br/>montant, kWh, date, référence,<br/>reçu, compteur, frais"]
  P --> M{"Compteur<br/>du SMS ?"}
  M -- "autre" --> M1["Proposer de basculer"]
  M -- "inconnu" --> M2["Avertir"]
  M -- "actif" --> U
  M1 --> U
  M2 --> U
  U{"Prix par kWh<br/>cohérent ?"}
  U -- non --> W["Avertir"]
  U -- oui --> F
  W --> F["Formulaire pré-rempli<br/>vérifié par l'utilisateur"]
  F --> R["addRecharge"]
  R --> D{"Doublon<br/>exact ?"}
  D -- oui --> X["Refusé"]
  D -- non --> E["Recharge ajoutée<br/>et crédit 811 remboursé"]
```

*Le jeton du compteur n'est jamais enregistré. L'utilisateur vérifie toujours le formulaire avant l'ajout ; un doublon exact
est refusé, et une recharge enregistrée rembourse automatiquement un crédit d'urgence en cours.*

### Notifications persistantes

```mermaid
sequenceDiagram
  autonumber
  participant U as Utilisateur
  participant A as Application
  participant N as Zone de<br/>notification

  Note over A,N: Ouverture, retour au premier plan,<br/>changement de jour
  A->>N: lire les notifications présentes
  N-->>A: identifiants affichés
  A->>A: planAlertNotifications :<br/>alertes actives, présentes,<br/>supprimées cette session
  A->>N: publier les manquantes<br/>son la 1re fois du mois
  A->>N: retirer les inactives
  Note over N: notification permanente<br/>non balayable
  U->>N: bouton Supprimer
  N-->>A: notification retirée
  Note over A: pas de republication<br/>pendant cette session
  U->>A: rouvre l'application
  A->>A: alerte active, notification absente
  A->>N: republication sans son
  Note over N: Début du mois : déclencheur<br/>à minuit, même app fermée
```

*La zone de notification reflète les alertes actives : tant qu'une alerte est active elle réapparaît à la prochaine ouverture
(sans son), et elle est retirée quand elle n'est plus active. Détails : [`docs/NOTIFICATIONS.md`](./docs/NOTIFICATIONS.md).*

### Compilation Android (CI)

```mermaid
flowchart TD
  A["Push main, pull request<br/>ou lancement manuel"] --> B["Node 24, JDK 21, Gradle 8.14"]
  B --> C["npm ci"]
  C --> D["npm run build<br/>Vite : web dans dist"]
  D --> E["capacitor-assets<br/>icônes et splash Android"]
  E --> F["cap sync android"]
  F --> G{"Secret<br/>DEBUG_KEYSTORE_B64 ?"}
  G -- oui --> H["Restaurer la clé de debug stable"]
  G -- non --> I["Générer une clé jetable<br/>Google Sign-In natif indisponible"]
  H --> J["gradle assembleDebug"]
  I --> J
  J --> K["Artifact app-debug.apk<br/>conservé 7 jours"]
```

*Sans le secret `DEBUG_KEYSTORE_B64`, l'APK est quand même construit avec une clé jetable, mais la connexion Google native ne
fonctionnera pas avec lui. Voir [`docs/SIGNATURE_DEBUG.md`](./docs/SIGNATURE_DEBUG.md).*

## Démarrage développeur

Prérequis : Node.js 20+ ; JDK 21 et Android Studio uniquement pour compiler l'APK à la main.

```bash
npm install
npm run dev            # http://localhost:3000
npm run lint           # tsc --noEmit
npx vitest run         # tests (Vitest, jsdom + Testing Library pour les composants)
npm run build          # build web (dist/)
npm run cap:build      # build web + npx cap sync android, puis ouvrir android/ dans Android Studio
node scripts/bundle-size.mjs        # poids gzip du build, pour mesurer le surcoût d'une fonctionnalité
```

Outils facultatifs (n'ajoutent rien à `package.json`) :

```bash
npm i --no-save @sparticuz/chromium puppeteer-core mermaid
node scripts/screenshots.mjs        # régénère docs/screenshots  (voir docs/CAPTURES.md)
node scripts/check-diagrams.mjs     # valide les diagrammes Mermaid de docs/diagrams
```

Le CI compile un APK debug à chaque push sur `main` et à chaque pull request ; il **ne lance pas les tests** : lancez-les
avant de pousser.

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

## Index de la documentation

| Document | Contenu |
|---|---|
| [`DOCUMENTATION.md`](./DOCUMENTATION.md) | Modules et architecture, en détail |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | Guide utilisateur |
| [`docs/VISITE_GUIDEE.md`](./docs/VISITE_GUIDEE.md) | Visite guidée : contenu, persistance, ajout d'une étape |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | Document de conception |
| [`docs/SYNC_ET_REGLES.md`](./docs/SYNC_ET_REGLES.md) | Synchronisation, fusion, règles Firestore |
| [`docs/NOTIFICATIONS.md`](./docs/NOTIFICATIONS.md) | Alertes persistantes |
| [`docs/CONFIG_A_DISTANCE.md`](./docs/CONFIG_A_DISTANCE.md) | Document `app_config/branding` et script d'administration |
| [`docs/SIGNATURE_DEBUG.md`](./docs/SIGNATURE_DEBUG.md) | Clé de signature et Google Sign-In natif |
| [`GOOGLE_AUTH_SETUP.md`](./GOOGLE_AUTH_SETUP.md) | Connexion Google, de bout en bout |
| [`docs/OCR_COMPARATIF.md`](./docs/OCR_COMPARATIF.md) | Choix du moteur OCR (mesures) |
| [`docs/LOGO.md`](./docs/LOGO.md) | Logo et variantes |
| [`docs/CAPTURES.md`](./docs/CAPTURES.md) | Captures d'écran : méthode et limites |
| [`docs/QA_CHECKLIST.md`](./docs/QA_CHECKLIST.md) | Recette manuelle (web puis Android) |
| [`docs/diagrams/`](./docs/diagrams) | Sources des diagrammes Mermaid |

## Structure du projet

```text
src/
  components/    MainLayout, views/ (un fichier par onglet), features/ (cartes Services, import SMS, cloche…),
                 tour/ (visite guidée), ui/ (BottomSheet, Drawer, Card…)
  lib/           logique PURE et testée : tarifs, parseur de SMS, alertes, fusion, synchro, photos, migrations…
  store/         AppContext (état, persistance, synchro), NavContext, RemoteConfigContext
  hooks/         planificateur d'alertes, alertes actives, jour, premier plan
  config.ts      constantes centralisées (clés de stockage, client ID, délais)
android/         projet Capacitor (Gradle)
docs/            documentation, logo, captures, diagrammes
scripts/         configuration distante, assets OCR, captures, diagrammes, mesure de taille
.github/workflows/  compilation de l'APK
```

## Confidentialité

L'application fonctionne hors ligne ; en mode visiteur, vos données ne quittent pas le téléphone. Connecté avec Google, elles
sont synchronisées dans **votre** espace privé Firestore (seul votre compte peut le lire : [`firestore.rules`](./firestore.rules)).
Le code ne contient **aucune publicité ni outil de mesure d'audience**. Une réserve, par honnêteté : l'interface demande
ses polices (Inter, JetBrains Mono) à Google Fonts quand le téléphone est en ligne (`src/index.css`) ; hors ligne, une police
système est utilisée. Les SMS d'exemple du dépôt sont **fictifs**.

## Licence

[Apache License 2.0](./LICENSE). KWA-WATT est une application indépendante : voir l'avertissement en haut de ce fichier.

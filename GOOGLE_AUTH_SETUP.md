# Guide complet — Connexion Google (Google Sign-In) dans KWA-WATT

Ce guide décrit toute l'implémentation de la connexion Google dans le projet KWA-WATT (Capacitor + React + Firebase), de la **création d'un projet Firebase dédié** jusqu'à l'**obtention d'un APK fonctionnel**, en passant par la console **Google Cloud**.

---

## 1. Vue d'ensemble du flux d'authentification

```
[Utilisateur] ──clic "Continuer avec Google"──▶ [Plugin natif @capgo/capacitor-social-login]
                                                    │
                                                    │ Google Sign-In SDK (Android)
                                                    ▼
                                            ID Token (JWT Google)
                                                    │
                                                    ▼
                                  Firebase Auth: GoogleAuthProvider.credential(idToken)
                                                    │
                                                    ▼
                                  signInWithCredential(auth, credential)  →  user Firebase
                                                    │
                                                    ▼
                                    Synchronisation Cloud (Firestore /user_data/{uid})
```

- **Android (natif)** : le plugin utilise le SDK Google Sign-In natif (activé par `google-services.json` + les clients OAuth).
- **Web / PWA** : on utilise directement le SDK Firebase (`signInWithPopup`, repli `signInWithRedirect`) — aucun écran natif.

C'est dans `src/lib/firebase.ts` que tout est branché.

---

## 2. Prérequis et fichiers de configuration centralisés

Toutes les valeurs configurables du projet sont centralisées dans **deux fichiers** :

### 2.1 `src/config.ts` — configuration applicative

```ts
export const appConfig = {
  appId: 'com.eneotool.app',           // identifiant unique de l'app Android
  google: {
    webClientId: '186942591566-0ue10qur7se9aa19mros6otp1av2ghc3.apps.googleusercontent.com',  // Web Client ID OAuth 2.0 (Google Cloud)
    scopes: ['email', 'profile'],
    loginMode: 'online',               // 'online' renvoie l'ID Token (requis pour Firebase Auth côté client)
  },
  storage: {
    authMaxAgeMs: 30 * 24 * 60 * 60 * 1000,   // session locale expirée après 30 jours
    syncDebounceMs: 5000,                     // délai avant sauvegarde cloud après une modification
  },
  …
};
```

Il est consommé par :
- `src/lib/firebase.ts` → `google.webClientId`, `google.scopes`, `google.loginMode`
- `capacitor.config.ts` → `appId`, `appName`, `server.*`, `android.overrideUserAgent`
- `src/store/AppContext.tsx` → clés de stockage, expiration de session, debounce de synchro
- `src/components/views/HelpView.tsx` → chemin des images d'aide

### 2.2 `firebase-applet-config.json` — configuration Firebase (SDK)

```jsonc
{
  "apiKey": "AIzaSyBcEpU2NNiBPae4WeAP_x_TtHAoTEgdFig",  // clé publique web (restreignable dans Google Cloud)
  "authDomain": "kwa-watt-eneo-manager.firebaseapp.com",
  "projectId": "kwa-watt-eneo-manager",
  "storageBucket": "kwa-watt-eneo-manager.firebasestorage.app",
  "messagingSenderId": "186942591566",
  "appId": "1:186942591566:web:3eba92acea882bff12a91f",
  "firestoreDatabaseId": "(default)"  // base par défaut en europe-west1 (voir section 3.3)
  // "measurementId": "" (absent — Analytics non activé)
}
```

> Ces valeurs reflètent l'état actuel du projet dédié **`kwa-watt-eneo-manager`** (section 3).

Consommé par `src/lib/firebase.ts` (`initializeApp` + `getFirestore`).

> ✅ **Migration effectuée.** Depuis le 09/09/2026, les deux fichiers référencent le **projet dédié `kwa-watt-eneo-manager`** (numéro de projet `186942591566`). Les sections ci-dessous restent valables comme procédure, et l'état actuel réel est rappelé à la section **3.0**.

---

## 3. Création du projet Firebase dédié

> **Pourquoi migrer ?** Le projet d'origine (`gen-lang-client-0507777932`, base `ai-studio-c4996bb1-…`) était un projet temporaire généré par AI Studio. Un projet Firebase dédié donne la propriété complète (facturation tiers 0 possible, règles de sécurité, monitoring).

### 3.0 État actuel du projet dédié (09/09/2026)

| Élément | Valeur |
|---|---|
| Project ID | `kwa-watt-eneo-manager` |
| Numéro de projet | `186942591566` |
| App Android | `1:186942591566:android:368d9eb0926b689812a91f` (`com.eneotool.app`) |
| App Web | `1:186942591566:web:3eba92acea882bff12a91f` |
| API Key (Android) | `AIzaSyANufE5Gf7F5CwijLDdJsbFe2Fn618hwJQ` |
| API Key (Web) | `AIzaSyBcEpU2NNiBPae4WeAP_x_TtHAoTEgdFig` |
| Web Client ID (Google) | `186942591566-0ue10qur7se9aa19mros6otp1av2ghc3.apps.googleusercontent.com` |
| Auth Domain | `kwa-watt-eneo-manager.firebaseapp.com` |
| Firestore | base `(default)` en **europe-west1** — règles déployées via `firebase deploy --only firestore:rules` |
| Google Auth | ✅ activé (Identity Toolkit) |
| Signature APK (debug) | keystore dédié commité `android/app/kwa-watt-debug.p12` (alias `androiddebugkey`, mot de passe `android`) |
| SHA-1 signature | `AB:4B:46:38:3B:F8:09:2F:3A:62:36:4C:69:90:D8:4D:66:3B:CB:D5` — **à déclarer en console** (section 3.4) |
| `google-services.json` | présent dans `android/app/` *(exclu de git)* |

> Le **client secret** web OAuth est disponible dans la console Google Cloud (Identifiants). Il n'est pas utilisé côté app (le plugin renvoie uniquement l'ID Token) et **ne doit pas être commité**.

### 3.1 Procédure

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet**.
2. Donne un nom (ex. `kwa-watt-prod`), suis l'assistant (Google Analytics **non requis**).
3. Note le **`Project ID`** (ex. `kwa-watt-prod-12345`) : il servira dans `firebase-applet-config.json` et dans les URLs Google Cloud.

### 3.2 Activer l'authentification Google

1. Menu **Créer → Authentication** → **Commencer** → onglet **Méthode de connexion**.
2. Active **Google** :
   - *Nom du projet au niveau de la console d'accord sudo* : `KWA-WATT`
   - Ton email de support (pour l'écran de consentement).
3. Enregistre.

### 3.3 Créer la base Firestore

1. **Créer → Cloud Firestore** → **Créer une base de données**.
2. Mode production, choisis une région (ex. `europe-west1`).
3. Le **Database ID** s'affiche : pour la base par défaut c'est `(default)` → dans le code, `firestoreDatabaseId` vaudra `""` (chaîne vide) ou `"(default)"` selon le SDK. **Ce champ doit correspondre exactement** à ce que tu vois en console.
4. Applique les règles de sécurité (colle le contenu de `firestore.rules` du projet). Les règles actuelles n'autorisent que le propriétaire à lire/écrire `user_data/{userId}`.

### 3.4 Ajouter l'application Android

1. **Réglages du projet (⚙️) → Paramètres du projet → Vos applications → Ajouter une application → Android**.
2. **Nom du package Android** : `com.eneotool.app` (doit être identique à `appConfig.appId` et au `namespace`/`applicationId` de `android/app/build.gradle`).
3. **Empreinte SHA-1** : indispensable pour Google Sign-In natif (le plugin en mode **Credential Manager** annule silencieusement si aucun client OAuth Android ne correspond au package + SHA-1).
   - Depuis le 09/09/2026, le projet utilise un **keystore de signature stable commité** (`android/app/kwa-watt-debug.p12`), utilisé par **toutes** les builds debug (CI incluse) via `android/app/build.gradle` (`signingConfigs.debug`). Son SHA-1 est :
     ```
     AB:4B:46:38:3B:F8:09:2F:3A:62:36:4C:69:90:D8:4D:66:3B:CB:D5
     ```
   - **Coller cette empreinte dans Firebase** : *Réglages du projet → Vos applications → `com.eneotool.app` → Ajouter une empreinte* → sauvegarder. Firebase crée alors le **client OAuth Android** correspondant dans Google Cloud (quelques minutes de propagation).
   - ⚠️ Ne pas déclarer le SHA-1 de la clé debug *par défaut* d'Android Studio (`~/.android/debug.keystore`) : il diffère de celui ci-dessus (clé différente par machine) — seules les builds signées avec `kwa-watt-debug.p12` gèrent le sign-in Google.
4. Télécharge **`google-services.json`**.
5. **Dépose ce fichier dans `android/app/google-services.json`**.
   - ⚠️ Le fichier est **exclu de git** (`android/.gitignore`). Ne jamais le committer (clés privées du projet).
   - `android/app/build.gradle` applique automatiquement le plugin `com.google.gms.google-services` dès que le fichier est présent.
6. Après ajout de l'app, Firebase **crée automatiquement le client OAuth Android** correspondant dans Google Cloud (il apparaîtra dans les identifiants).

---

## 4. Configuration Google Cloud

1. Ouvre la **console Google Cloud** liée au projet Firebase : https://console.cloud.google.com/ → sélectionne le projet.
2. **API et services → Écran de consentement OAuth** :
   - Type d'utilisateur : **Externe** (si tu ne publies pas depuis un compte Workspace).
   - Renseigne le nom de l'app, l'email de support, les coordonnées du développeur.
   - **Scopes** : `email`, `profile` (ce sont les scopes demandés par `appConfig.google.scopes`).
   - État de publication : **En production** (pour éviter les limites de test).
3. **API et services → Identifiants → Créer des identifiants → ID client OAuth** :
   - **Type d'application : Application Web** → nom `KWA-WATT Web Client` → **Créer**.
   - Note le **ID client** généré (format `1234567890-abc.apps.googleusercontent.com`).
   - **Ce sera la valeur de `appConfig.google.webClientId`** (toutes plateformes, y compris Android — nécessaire au plugin `@capgo/capacitor-social-login`).
   - *URI de redirection autorisés* : pour la partie Web/PWA, ajoute si besoin les URL de ton domaine d'hébergement (ex. `https://<ton-domaine>/__/auth/handler`). Pour l'APK uniquement, non nécessaire.
4. (Optionnel mais recommandé) **Restreindre la clé API web** (`apiKey` de Firebase) : *API et services → Identifiants → clé API* → restrictions HTTP referers / packages pour éviter un usage abusif.

---

## 5. Mettre à jour la configuration dans le code

✅ **Déjà effectué** pour le projet `kwa-watt-eneo-manager` (valeurs réelles en section 3.0). Procédure pour un autre projet :

### 5.1 `firebase-applet-config.json`

Remplace toutes les valeurs par celles du **nouveau** projet. Tu les retrouves dans : **Paramètres du projet → Vos applications → application Web** (ou génère-en une nouvelle).
Pense à `firestoreDatabaseId` (section 3.3) : si la console affiche `(default)`, mets la valeur `"(default)"`, sinon mets l'ID exact de la base créée.

### 5.2 `src/config.ts`

```ts
google: {
  webClientId: 'TON_NEW_WEB_CLIENT_ID.apps.googleusercontent.com',
  loginMode: 'online',   // obligatoire : le mode 'offline' ne renvoie pas d'ID Token côté client
  …
},
```

C'est **le seul endroit** où le client ID est défini côté code.

> Les autres fichiers consomment la config : ne rien changer ailleurs.

---

## 6. Règles Firestore (`firestore.rules`)

Le fichier `firestore.rules` à la racine du projet doit être copié dans **Firestore → Règles** de la console du nouveau projet. Il restreint chaque document à son propriétaire :

```js
match /user_data/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  // et la validation de taille de la string state
}
```

Déploiement via CLI (**déjà fait** sur `kwa-watt-eneo-manager`) :

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project kwa-watt-eneo-manager
```

---

## 7. Compilation et test

### 7.1 Après migration de projet

Le `package-lock.json` doit être régénéré après tout changement de dépendances :

```bash
npm install
npm run lint          # tsc --noEmit
npm run build         # build web (Vite)
```

### 7.2 Synchronisation Capacitor + APK

```bash
npm run cap:build     # = vite build && npx cap sync
```

Puis dans **Android Studio** (ouvre le dossier `android/`) : **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

Ou en CLI :

```bash
cd android && gradle assembleDebug
```

L'APK est généré dans `android/app/build/outputs/apk/debug/app-debug.apk`.

Le **CI GitHub** (`.github/workflows/android-build.yml`) reproduit ce pipeline à chaque push sur `main` et publie l'APK en artefact.

### 7.3 Vérification

1. Installe `app-debug.apk`, lance l'app.
2. **Continuer avec Google** → l'écran Google Sign-In s'ouvre.
3. Connecte le compte test → l'app revient et affiche ton nom/photo.
4. Un document `user_data/<uid>` doit apparaître dans Firestore après ~5 s.

---

## 8. Dépannage

### 8.1 Erreur `10` (Developer error) au clic Google

C'est la cause initiale du bug sur mobile. Combinaison de 4 problèmes historiques (tous corrigés dans le code, reste la config) :

| Cause | Symptôme | Correction |
|---|---|---|
| `google-services.json` absent de `android/app/` | erreur 10 à l'ouverture du flux | section 3.4 — déposer le fichier du **bon** projet |
| SHA-1 absent ou différent de la signature de l'APK installé | erreur 10 | comparer le SHA-1 déclaré dans Firebase avec celui de l'APK : `keytool -printcert -jarfile app-debug.apk` |
| Plugin incompatible (`@codetrix-studio/…` bloqué en Capacitor 6) | erreur 10 / crash | déjà migré vers `@capgo/capacitor-social-login` (compatible Capacitor 8) |
| `webClientId` incohérent avec le client du projet | erreur 10 | aligner `appConfig.google.webClientId` sur le Web Client ID du **même** projet Firebase |

> Un APK re-signé avec une autre clé change le SHA-1 → re-déclarer le nouveau SHA-1 dans Firebase.

### 8.6 Erreur « Google Sign-in cancelled by user »

Ce message est renvoyé par le plugin pour une `GetCredentialCancellationException` (Credential Manager). Il n'est **pas toujours** une annulation réelle de l'utilisateur : dans **99 % des cas, l'écran Google ne s'ouvre même pas** et le flux s'auto-annule car **aucun client OAuth Android ne correspond au package + SHA-1** de l'APK installé.

| Cause | Correction |
|---|---|
| SHA-1 de la signature non déclaré dans Firebase (client OAuth Android absent) | section 3.4 point 3 — déclarer `AB:4B:46:38:3B:F8:09:2F:3A:62:36:4C:69:90:D8:4D:66:3B:CB:D5` |
| APK de la **CI** installé : la clé debug des runners GitHub est régénérée à chaque build | réinstaller un APK signé avec `kwa-watt-debug.p12` (artefact CI **après** le commit d'intégration de la clé) |
| API key restreinte qui bloque `google-services` ou le trafic OAuth | vérifier les restrictions de clé API (section 4 point 4) |

### 8.2 Erreurs `12500` / `12501` (cancel / internal)

- `12501` : utilisateur a annulé (normal).
- `12500` : signature APK ≠ SHA-1 déclaré, ou client OAuth Android absent. Vérifier section 3.4 + 8.1.

### 8.3 La connexion Web/PWA ne marche pas

- La Web utilise **Firebase SDK** (`signInWithPopup`) : il faut un **Web Client ID** valide sur le même projet.
- Si le popup est bloqué par le navigateur, le code bascule automatiquement sur `signInWithRedirect`.

### 8.4 La synchronisation cloud ne se fait pas après connexion

- Vérifier `hasLoadedFromCloud` / règles Firestore (le user est-il propriétaire ?).
- Vérifier que `firestoreDatabaseId` correspond à la base réelle du nouveau projet.

### 8.5 Le plugin `@capgo/capacitor-social-login` ne se retrouve pas dans Android Studio

Après `npm install` + `npm run cap:build`, le plugin est auto-enregistré dans `android/` lors du `npx cap sync`. Si besoin :
```bash
npx cap sync android
```

---

## 9. Rappels sécurité

- 🔒 **`google-services.json` et `.env` ne doivent jamais être commités** (le premier est déjà dans `.gitignore`).
- La clé `apiKey` Firebase est **publique par nature** (embarquée dans l'app) : la protéger par des **restrictions** (packages Android / referers web) dans Google Cloud.
- Les règles Firestore doivent toujours valider `request.auth.uid == userId`.
- La session locale expire après `authMaxAgeMs` (30 jours par défaut, réglable dans `src/config.ts`).
- Les photos capturées sont compressées avant sauvegarde (documents Firestore < 1 Mo).
- 🔒 **Revue sécurité 09/09/2026** : pas de secret committé (le client secret OAuth web reste hors repo) ; suppression autorisée sur son propre doc Firestore (`allow delete`), `npm ci` en CI (lockfile figé). `npm audit` signale 7 vulns dans `@capacitor/assets` (sharp/tar/uuid — **dev-only**, jamais embarquées dans l'APK ni le bundle web) : risque **accepté**, à revoir à la prochaine montée de version de `@capacitor/assets`.
- 🔑 **`kwa-watt-debug.p12` est volontairement commité** : clé **debug uniquement** (aucun accès aux stores ni données), nécessaire pour rendre le sign-in Google fonctionnel sur toutes les builds (CI et locales). Ne jamais la réutiliser comme clé de release.

---

## 10. Fichiers clés de l'implémentation

| Fichier | Rôle |
|---|---|
| `src/config.ts` | **Toute la configuration centralisée** (client ID, scopes, clés, délais) |
| `firebase-applet-config.json` | Identifiants du projet Firebase (SDK) |
| `src/lib/firebase.ts` | Connexion Google (plugin natif + fallback web), Firestore, déconnexion |
| `src/components/views/LoginView.tsx` | Écran de connexion (Google / visiteur) |
| `android/app/google-services.json` | Config native Android (non commitée) |
| `android/app/src/main/java/com/eneotool/app/MainActivity.java` | Récupération du résultat Google natif (`SocialLoginPlugin`) |
| `firestore.rules` | Règles de sécurité Firestore |
| `.github/workflows/android-build.yml` | Build APK automatique (push `main`) |
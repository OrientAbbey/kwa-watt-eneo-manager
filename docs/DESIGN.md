# KWA-WATT — Document de conception (DESIGN)

## Vue d'ensemble

Application Capacitor + React + Vite de gestion d'un compteur d'électricité
prépayé KWA-WATT : suivi des consommations/recharges, calcul des prix par
tranches, alertes, sauvegarde locale et cloud (Firebase), avec la même base de
code pour le **web** et le **mobile** (Android).

## Stratégie cross-platform

Pour chaque fonctionnalité sensible à la plateforme, on applique un **adaptateur
fin** guidé par `Capacitor.isNativePlatform()` — pas de duplication de logique :

| Fonction | Mobile (natif) | Web (navigateur) | Point d'entrée |
| --- | --- | --- | --- |
| Photos | `@capacitor/camera` (caméra/galerie) | input fichier + compression | `src/hooks/useImagePicker.tsx` |
| Notifications | `@capacitor/local-notifications` | `Notification` API | `src/lib/notifications.ts` |
| Export/Import | `Filesystem` + `Share` | téléchargement Blob / `<input type=file>` | `src/components/views/HistoryView.tsx` |
| Sign-in Google | Capacitor Google Auth | `getRedirectResult` | `src/lib/firebase.ts` |

Règle : si le comportement est identique sur les deux plateformes, il vit une
seule fois dans `src/lib/*` ; seul l'écart est cloisonné dans l'adaptateur.

## Architecture

```
src/
  lib/          # logique pure, testable (eneo, alerts, io, utils, notifications, sync, firebase)
  hooks/        # hooks React réutilisables (useImagePicker)
  store/        # AppContext : état global + persistance (local + cloud)
  components/
    ui/         # composants génériques (Card, SourcePicker, ImageViewer)
    views/      # écrans (Dashboard, Calculator, History, Profile, Settings, Help, Login)
  config.ts     # configuration centralisée
  constants.ts  # valeurs par défaut de l'état
```

## État et persistance

- **État** : `AppContext` (React Context). Poids-plume, aucune dépendance
  supplémentaire. Les mutations passent par des fonctions dédiées
  (`addConsumption`, `updateRecharge`, …).
- **Local** : `localStorage` (`eneo_app_data`), sérialisation complète
  **dé-bouncée** (400 ms) avec flush sur `pagehide`/`visibilitychange` pour ne
  pas écrire l'état en synchrone à chaque frappe.
- **Cloud** : Firestore, doc par utilisateur (`owner` = uid). Écriture
  dé-bouncée (5 s) + flush à la fermeture. ⚠️ Règles owner-only ; la taille
  d'un doc Firestore est limitée à 1 MiB — des photos Base64 volumineuses
  peuvent atteindre cette limite. Le profil photo compressé (720px, q=0.72)
  reste en dessous en usage normal.
- **Auth** : session rémanente localStorage (`eneo_app_auth`) avec
  expiration (30 jours). Visiteur = stockage local uniquement.

## Notifications

`getAlerts` (pur) calcule les alertes : début de mois, consommation au-dessus
du seuil, hausse anormale vs moyenne. `notifyAlerts` envoie **une fois par
jour** (clé `kwawatt_last_alert_notif`) :

- mobile : `LocalNotifications.schedule` (ordre de priorité : alerte stérile
  `ongoing` pour « début de mois », `autoCancel` sinon) ;
- web : `new Notification(...)` (fermées après 8 s).

Les permissions sont demandées **au moment de l'usage** (camera/fichiers),
avec une exception unique : au tout premier lancement, l'application propose
d'activer les notifications (décision mémorisée dans `kwawatt_notif_asked` pour
ne pas re-solliciter l'utilisateur).

## Unité monétaire

Une seule constante, `MONETARY_UNIT = 'U'` (`src/lib/utils.ts`), remplace les
littéraux disgracieux dans tous les écrans et les explications de calcul
(`src/lib/eneo.ts`).

## Calculs (eneo)

- Tranches `base` / `confort` par type de client (résidentiel / professionnel).
- `getUnitPrice` applique la TVA au-delà du seuil de cumul.
- `calculatePrice` (kWh → coût) et `calculateKwh` (coût → kWh) retournent
  `value` + `descriptionLines` (explications détaillées affichées dans
  l'Outil de calcul) — 100 % purs, testés.

## Échanges de données (io)

`src/lib/io.ts` centralise la sérialisation CSV/JSON et le parsing, testés par
round-trip. Format CSV : `type,id,date,kwh,montant`. ⚠️ Pas d'échappement de
virgules dans les identifiants (uuid générés sans virgule) — les futurs exports
avec champs libres devront ajouter l'échappement.

## Sécurité / confidentialité

- Règles Firestore : lecture/écriture/suppression réservées au propriétaire
  (`request.auth.uid == resource.data.owner`), mise à jour restreinte aux
  champs `state`/`updatedAt`.
- CSP définie dans `index.html`.
- `firebase-applet-config.json` contient une clé API publique (côté client) :
  normal pour une Web Apps, à ne pas traiter comme un secret.
- Le SVG d'avatar est rendu via `<img>` (pas de SVG inline injecté).

## Limites connues

- Bundle principal ~1,43 MB (gzip ~398 kB) — avertissement de chunk Vite ;
  un code-splitting par vue serait le prochain levier.
- Pas de CI/test sur appareil local : la vérification manuelle sur Android se
  fait via la checklist (`docs/QA_CHECKLIST.md`) et l'APK produit par GitHub
  Actions.

## Conventions

- Pas de commentaires superflus dans le code.
- Logique pure isolée dans `src/lib/*` et couverte par vitest
  (`*.test.ts`, 33 tests actuellement).
- Validation : `npm run lint` (tsc --noEmit) + `npm run build` avant chaque
  livraison.
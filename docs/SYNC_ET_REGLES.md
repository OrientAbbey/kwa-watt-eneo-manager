# Synchronisation cloud et règles Firestore

Ce document explique comment les données sont synchronisées et comment les redéployer si besoin (référencé
depuis le message d'erreur « les règles Firestore du projet ne sont pas à jour »).

## Modèle de données

- `user_data/{uid}` : document principal (`state`, JSON compact sans les photos, < 900 Ko) + `updatedAt`.
- `user_data/{uid}/photos/{clé}` : une photo Base64 par document (recto/verso carte, photo du compteur, photo
  de profil, images d'aide). Séparées du document principal pour ne jamais dépasser la limite de 1 Mio/document
  Firestore (voir `src/lib/photos.ts`).
- `app_config/branding` (public, lecture seule) : branding, liens utiles, codes USSD, montant minimum de
  recharge. Facultatif — sans ce document, l'application utilise ses valeurs par défaut intégrées
  (`src/lib/remoteConfig.ts`). Se modifie à la main dans la console Firebase, sans nouvelle version de l'app.

## Fusion multi-appareils

Chaque enregistrement (consommation, recharge, crédit d'urgence) porte un `updatedAt`. À la synchronisation,
`src/lib/merge.ts` fusionne l'état local et l'état cloud **enregistrement par enregistrement** (le plus récent
gagne), au lieu d'écraser tout le document. Les suppressions sont mémorisées par des pierres tombales
(`tombstones`, purgées après 90 jours) pour qu'un appareil resynchronisant après plusieurs mois ne fasse pas
réapparaître une donnée supprimée ailleurs.

## Déployer les règles

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Erreurs de synchronisation

`src/lib/syncErrors.ts` traduit les erreurs Firestore en messages actionnables : permission refusée (règles pas
à jour), quota gratuit atteint, document trop volumineux, ou réseau indisponible. Dans tous les cas, les données
restent sauvegardées localement (`localStorage`) : rien n'est jamais perdu, seule la synchronisation est
retardée. Un nouvel essai automatique est programmé (backoff exponentiel, 30 s à 5 min).

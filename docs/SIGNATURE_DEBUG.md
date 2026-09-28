# Clé de signature debug (Google Sign-In natif)

`android/app/build.gradle` signe les builds *debug* avec `android/app/kwa-watt-debug.p12` afin d'avoir un
SHA-1 **stable**, enregistré côté Firebase pour que la connexion Google native fonctionne (Play Services vérifie
la signature de l'APK). Ce fichier n'est **plus committé** dans le dépôt (il l'était avant ce changement — traitez
l'ancienne clé comme compromise, voir plus bas).

## Mise en place (une seule fois)

1. Une nouvelle clé debug a été générée pour vous lors de cette migration. Récupérez-la : c'est le fichier
   `kwa-watt-debug.p12.b64` fourni séparément (jamais commité). Empreintes de cette nouvelle clé :
   - SHA-1 : `B9:7E:AE:A9:FD:0A:63:45:43:11:20:A3:DC:5E:F9:A8:CD:E2:FB:A1`
   - SHA-256 : `8C:6F:46:4E:8A:13:A5:FB:4C:F3:FF:90:17:85:F9:44:BF:74:1B:0F:67:37:C5:B5:1D:DA:C8:1B:13:63:05:5A`
2. Dans la console Firebase → Paramètres du projet → vos apps Android → **Ajouter une empreinte** : collez le
   SHA-1 ci-dessus (en plus, ne retirez l'ancienne empreinte qu'une fois la migration terminée partout).
3. Dans GitHub → Settings → Secrets and variables → Actions → **New repository secret** :
   - Nom : `DEBUG_KEYSTORE_B64`
   - Valeur : le contenu de `kwa-watt-debug.p12.b64` (une seule ligne base64)
4. En local, placez le fichier décodé à `android/app/kwa-watt-debug.p12` (ignoré par git).
   ```bash
   base64 -d kwa-watt-debug.p12.b64 > android/app/kwa-watt-debug.p12
   ```

Tant que le secret n'est pas configuré, la CI reste verte : elle génère une clé jetable à la volée (avertissement
visible dans les logs), mais le Google Sign-In natif ne fonctionnera pas sur cet APK précis.

## Pourquoi l'ancienne clé doit être considérée compromise

Elle a été présente en clair dans l'historique Git. La retirer du dernier commit ne l'efface pas de l'historique :
un nettoyage complet nécessiterait de réécrire l'historique (`git filter-repo` + force-push), une opération lourde
qu'on n'a pas déclenchée ici pour ne pas casser vos autres clones/branches. La nouvelle clé ci-dessus n'a, elle,
jamais été commitée.

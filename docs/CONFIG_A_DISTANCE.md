# Configuration à distance (`app_config/branding`)

Permet de changer le branding (ex. ENEO → SOCADEL), les liens utiles, les codes USSD ou le montant minimum
de recharge **sans publier de nouvelle version de l'application** (voir `src/lib/remoteConfigSchema.ts` pour
la forme exacte des champs, et le README pour le principe général).

Ce document est **public en lecture** (n'importe qui peut le lire depuis l'app) mais **son écriture est
bloquée pour tout le monde** dans `firestore.rules` (`allow write: if false`). La seule façon de le modifier
est donc un script qui s'authentifie avec un **compte de service** (droits d'administrateur), lequel
contourne les règles de sécurité — d'où la procédure ci-dessous, à faire une fois, puis à répéter à chaque
mise à jour du contenu.

## Ce dont vous avez besoin

- Node.js installé (déjà nécessaire pour développer l'app) et avoir lancé `npm install` au moins une fois à
  la racine du projet (installe `firebase-admin` et `tsx`, tous deux en `devDependencies` : ils ne partent
  jamais dans l'application, uniquement utilisés par ce script).
- Un accès **Propriétaire ou Éditeur** au projet Firebase `kwa-watt-eneo-manager` dans la console.
- 5 minutes, la première fois seulement (les fois suivantes prennent 30 secondes).

## Étape 1 — Récupérer une clé de compte de service (une seule fois)

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com/), ouvrez le projet
   **kwa-watt-eneo-manager**.
2. ⚙️ **Paramètres du projet** → onglet **Comptes de service**.
3. Cliquez sur **Générer une nouvelle clé privée** → confirmez → un fichier `.json` se télécharge
   (nom du type `kwa-watt-eneo-manager-firebase-adminsdk-xxxxx.json`).
4. **Déplacez ce fichier HORS du dossier du projet** (par exemple dans `~/secrets/` sur votre machine), ou au
   moins ne le laissez jamais à la racine sans qu'il soit ignoré par git.
   ⚠️ **Ne le committez jamais** : cette clé donne un accès total en lecture/écriture à toute la base de
   données, sans passer par les règles de sécurité. `.gitignore` bloque déjà `scripts/*serviceAccount*.json`
   et `scripts/*service-account*.json` par précaution si vous le déposez quand même dans `scripts/`, mais le
   plus sûr reste de le garder complètement en dehors du dépôt.

## Étape 2 — Indiquer où se trouve cette clé

Dans votre terminal, avant de lancer le script :

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/absolu/vers/kwa-watt-eneo-manager-firebase-adminsdk-xxxxx.json
```

(Sur Windows PowerShell : `$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\chemin\vers\le\fichier.json"`.)

C'est une variable d'environnement standard reconnue directement par les outils Google — le script ne lit
jamais le chemin autrement que via cette variable.

## Étape 3 — Premier lancement : générer le fichier local éditable

```bash
npx tsx scripts/seed-remote-config.ts
```

Aucune configuration locale n'existe encore : le script crée **`scripts/remote-config.seed.json`**, pré-rempli
avec les valeurs par défaut déjà intégrées à l'application (celles que vous voyez déjà dans l'app aujourd'hui),
puis s'arrête **sans rien publier**. Ce fichier est ignoré par git (propre à votre machine) : ouvrez-le et
modifiez ce que vous voulez changer.

## Étape 4 — Publier

Relancez la même commande :

```bash
npx tsx scripts/seed-remote-config.ts
```

Cette fois, le fichier existe : le script le valide (toute valeur incorrecte — un lien non `https://`, un code
USSD invalide, un montant négatif — est silencieusement remplacée par sa valeur par défaut, avec un
avertissement affiché), montre le document final tel qu'il sera publié, et **demande confirmation** avant
d'écrire quoi que ce soit sur Firestore. Répondez `oui` pour publier, ou `non`/n'importe quoi d'autre pour
annuler sans rien modifier.

## Pour les mises à jour suivantes

Éditez `scripts/remote-config.seed.json`, relancez `npx tsx scripts/seed-remote-config.ts`, confirmez. C'est
tout — pas besoin de repasser par la console Firebase.

## Champs disponibles

| Champ | Rôle |
|---|---|
| `brand.name` / `brand.formerName` | Nom actuel affiché (ex. `SOCADEL`) / ancien nom encore reconnu (ex. `ENEO`), affichés comme « SOCADEL (ex-ENEO) » |
| `brand.tagline` | Phrase d'accroche sur l'écran de connexion |
| `minRechargeAmount` | Montant minimum d'achat de kWh (FCFA) — actuellement 1000 |
| `emergencyCreditKwh` | kWh accordés par le crédit d'urgence (code 811) — actuellement 10 |
| `contacts.infoLine` | Numéro SMS gratuit (actuellement 8010) |
| `contacts.whatsapp` / `whatsappCountryCode` | Numéro WhatsApp du service client et indicatif pays |
| `contacts.phone` | Numéro d'appel du service client |
| `ussd.mtnMenu` / `ussd.orangeRecharge` / `ussd.orangeTokenRecall` | Codes composés par les boutons de recharge rapide |
| `links[]` | Liens utiles affichés dans l'app (`id`, `label`, `url` en `https://` obligatoire, `description` facultative, `category` parmi `officiel`/`paiement`/`assistance`/`actualites`) |

## Vérifier que ça a fonctionné

- Dans la console Firebase → Firestore Database → collection `app_config` → document `branding` : le contenu
  doit correspondre à ce que le script a affiché avant publication.
- Côté application : les appareils déjà installés mettent jusqu'à **24h** à voir le changement (cache local
  de 24h, pour fonctionner hors ligne). Pour vérifier immédiatement sur votre propre téléphone, videz les
  données de l'application (ou désinstallez/réinstallez) : le prochain démarrage relit la configuration.

## Sécurité de la clé de compte de service

Cette clé équivaut à un accès administrateur complet à la base de données (bien plus que ce que les règles
Firestore autorisent normalement). Si vous pensez qu'elle a pu fuiter (commit accidentel, partage par erreur) :
Console Firebase → Paramètres du projet → Comptes de service → repérez la clé dans la liste → **supprimez-la**
(cela invalide immédiatement le fichier `.json` correspondant), puis générez-en une nouvelle en suivant
l'étape 1.

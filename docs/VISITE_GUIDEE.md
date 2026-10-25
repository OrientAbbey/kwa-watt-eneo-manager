# Visite guidée (présentation interactive)

Présentation de l'application au premier lancement, rejouable à tout moment depuis **Aide → À propos** et
**Paramètres → Visite guidée**. Implémentation maison, sans dépendance supplémentaire.

## Ce que voit l'utilisateur

- **Visite complète** : 9 étapes (bienvenue, tableau de bord, bouton « + », recharge par codes, crédit 811, codes du
  compteur / TID, import de SMS, notifications, menu / profil / synchronisation).
- **4 mini-visites par thème** : Enregistrer une recharge, Importer un SMS, Notifications, Crédit d'urgence.
- Surbrillance du VRAI élément (pas de capture) ; une cible plus haute que 40 % de l'écran (grande carte) n'est mise en avant
  que dans sa partie haute et alignée en haut de la zone défilante, pour laisser la place à la bulle ; si la cible n'existe pas (ex. la cloche sans alerte), la bulle devient
  une carte centrée avec un texte de repli.
- Boutons Suivant / Précédent / Passer, points de progression, **Échap** pour quitter, flèches ← → pour naviguer.
- Accessibilité : fenêtre modale (`role="dialog"`, `aria-modal`), titre et texte reliés, annonce vocale du changement
  d'étape (`aria-live`), focus placé sur la bulle puis rendu au bouton d'origine, `Tab` limité à la bulle, mouvements
  désactivés avec `prefers-reduced-motion`, mode sombre, bulle toujours ramenée dans l'écran.

## Qui voit la visite, et quand

La clé locale `kwawatt_tour_seen` contient le numéro de version de la visite déjà vue (`TOUR_VERSION`).

| Situation | Comportement |
|---|---|
| Nouvel utilisateur (clé absente, aucune donnée) | démarrage automatique, **une seule fois** |
| Utilisateur existant après mise à jour (clé absente, des données) | bandeau de **proposition** (« Voir la visite » / « Non merci »), jamais imposée |
| Clé = version courante | rien |
| Clé < version courante | bandeau « La visite guidée a évolué » (nouveautés) |

La visite n'écrit **que** cette clé : les données de l'utilisateur ne sont jamais modifiées. Les mini-visites n'écrivent
rien. Une visite qui ouvre une fenêtre (import de SMS) la referme à la fin.

## Modifier le contenu

Tout le texte et les cibles sont dans `src/lib/tourSteps.ts` (aucune logique). Un changement de texte mineur ne demande
rien d'autre. Pour annoncer des nouveautés à ceux qui ont déjà vu la visite : incrémenter `TOUR_VERSION`.

Une étape :

```ts
{
  id: "sms",
  title: "Recharge depuis un SMS",
  body: "…",
  fallbackBody: "…",                 // optionnel : texte si la cible est absente
  tab: "history",                    // onglet ouvert avant l'étape (optionnel)
  intent: { type: "paste-sms" },     // action NavContext (optionnel) : ouvre directement la fenêtre d'import
  targets: ['[data-tour="sms-actions"]'], // premier élément VISIBLE trouvé ; aucun = carte centrée
  placement: "auto",                 // "top" | "bottom" | "auto"
}
```

### Poser une cible

Ajouter `data-tour="nom"` sur l'élément (ou utiliser un `id` existant, ex. `#emergency-credit`). Plusieurs éléments peuvent
porter le même attribut (variantes mobile / bureau) : seul celui qui est affiché est mis en avant. Le test
`src/lib/tourSteps.test.ts` échoue si une étape vise un attribut ou un `id` qui n'existe plus dans les composants.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/tourSteps.ts` | contenu (textes, cibles, versions) |
| `src/lib/tourLogic.ts` | logique pure et testée : position de la bulle, choix de la cible, persistance, décision d'afficher |
| `src/components/tour/TourContext.tsx` | état de la visite (`start`, `next`, `prev`, `close`) ; charge l'affichage à la demande |
| `src/components/tour/TourOverlay.tsx` | surbrillance, bulle, clavier, focus (chargé uniquement quand une visite démarre) |
| `src/components/tour/TourGate.tsx` | démarrage automatique ou bandeau de proposition, une fois par ouverture |
| `src/components/tour/TourLauncher.tsx` | boutons « Revoir la présentation » + mini-visites (À propos et Paramètres) |
| `src/components/features/AboutCard.tsx` | À propos : version, licence, liens, indépendance |

## Interaction avec la navigation

La visite utilise `useNav().navigate(tab, intent)` comme le reste de l'application : elle ne navigue que si l'onglet
change ou si l'étape demande une action, et jamais entre deux étapes de même destination (la fenêtre d'import ne se
ferme pas et ne se rouvre pas). Avant chaque changement de destination, un `Échap` synthétique referme tiroir et
fenêtres restés ouverts (toutes se ferment avec Échap) ; il est marqué pour que la visite ne le prenne pas pour une
demande de fermeture.

## Taille

Surcoût mesuré avec `node scripts/bundle-size.mjs` (gzip niveau 9, hors moteur OCR) : **+7,6 Ko** au total, dont
**2,5 Ko** dans un fragment (`TourOverlay`) chargé seulement au démarrage d'une visite.

## Limites connues

- Vérifié par tests automatisés (jsdom : étapes, navigation, intents, clavier, focus, persistance), par les tests de
  position, et **visuellement** dans Chromium headless à 412 × 915 (les 9 étapes, `node scripts/screenshots.mjs <dossier>
  --tour-steps` ; ce contrôle a révélé deux étapes dont la bulle masquait le titre de la carte, corrigées).
  **Non vérifié sur téléphone** : rendu réel de la surbrillance, animations d'arrivée des vues pendant la
  mesure, comportement avec le clavier virtuel ouvert.
- Le bouton « Retour » matériel d'Android n'est pas intercepté : il quitte l'application comme d'habitude.
- Mini-visite « Enregistrer une recharge » : elle ouvre le formulaire vide ; il se referme en changeant d'onglet.
- Le texte « Supprimer / revient à l'ouverture » des notifications décrit le comportement documenté dans
  `docs/NOTIFICATIONS.md`.

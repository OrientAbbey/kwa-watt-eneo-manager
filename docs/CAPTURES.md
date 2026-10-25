# Captures d'écran du README

Les images de `docs/screenshots/` sont **produites automatiquement** par `scripts/screenshots.mjs` : Chromium headless
(`@sparticuz/chromium` + `puppeteer-core`) ouvre l'application construite (`vite preview`) avec un état de démonstration
**entièrement fictif** injecté dans le stockage local, puis photographie chaque écran.

## Régénérer

```bash
npm run build
npm i --no-save @sparticuz/chromium puppeteer-core     # n'ajoute rien à package.json
node scripts/screenshots.mjs                            # écrit dans docs/screenshots/
node scripts/screenshots.mjs /tmp/etapes --tour-steps   # option : une capture par étape de la visite (contrôle)
```

Format : WebP (qualité 82), viewport 412 × 915 à ×2 pour le mobile (≈ 27 à 92 Ko par image), 1280 × 800 pour le grand
écran. Poids total ≈ 0,7 Mo, contre un plafond fixé à 150 Ko par image.

## Données de démonstration (fictives)

Compteur « Maison (démo) » n° `98765432109` (numéro inventé, déjà utilisé dans les tests du dépôt), 12 mois de relevés,
4 recharges, un crédit d'urgence de 10 kWh non remboursé. Le SMS collé dans « Recharge depuis un SMS » est inventé
(nom, téléphone, référence, reçu et jeton fictifs) ; le format est celui des SMS MTN MoMo.

**Confidentialité :** n'ajoutez jamais de vraie capture sans l'avoir anonymisée (nom, téléphone, n° de compteur, jeton,
références de transaction). Le script n'envoie aucune requête hors de l'application.

## Ce que ces captures ne prouvent PAS

- Elles viennent d'un Chromium sur le web, **pas de la WebView d'un téléphone Android** : pas de barre d'état, pas de
  découpe d'écran, pas d'encoche, rendu des polices et des ombres légèrement différent.
- Les plugins Capacitor sont sans effet sur le web : notifications locales, caméra / galerie, presse-papiers natif,
  écran de démarrage, ouverture des liens et connexion Google ne sont pas exercés. La fenêtre des notifications montre donc
  le message « notifications désactivées » du navigateur ; sur téléphone, avec les notifications activées, c'est le texte
  sur le bouton « Supprimer » qui s'affiche.
- La police Inter n'est pas téléchargée (aucune requête externe) : le texte est rendu avec une police de repli.
- La lecture OCR d'une photo n'est pas exercée : l'import de SMS est montré avec un SMS collé.
- Les dates affichées sont celles du jour de la génération (les données sont calculées par rapport à la date courante).

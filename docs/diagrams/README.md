# Diagrammes (Mermaid)

Sources des schémas affichés dans le [README](../../README.md). GitHub les rend nativement. Le test
`src/readmeDiagrams.test.ts` vérifie que le README contient chaque source **à l'identique** : en modifier une, c'est
mettre à jour les deux (copier le contenu du `.mmd` dans le bloc ```` ```mermaid ```` correspondant).

| Fichier | Sujet |
|---|---|
| `architecture.mmd` | couches : vues → contextes / hooks → logique pure → stockage, Firebase, Capacitor |
| `modele-donnees.mmd` | état, compteurs, consommations, recharges, crédits d'urgence |
| `synchronisation.mmd` | synchro local-first : fusion par enregistrement, plan des photos |
| `import-sms.mmd` | import d'une recharge depuis un SMS (collage ou OCR) |
| `notifications.mmd` | alertes persistantes : publication, « Supprimer », republication |
| `ci-cd.mmd` | compilation de l'APK par la CI |

## Valider et prévisualiser

```bash
npm i --no-save mermaid @sparticuz/chromium puppeteer-core
node scripts/check-diagrams.mjs /tmp/diagrammes     # syntaxe (mermaid.parse) + rendu PNG dans Chromium
```

Validés avec Mermaid 12.2.0 et 10.9.3. Pour rester lisibles sur un téléphone, les schémas sont étroits (≈ 360 à 740 px
de large) et verticaux ; évitez les branches en éventail et les libellés longs.

Les schémas décrivent le code **à la date de leur rédaction** : en cas de doute, le code (`src/lib`, `src/store`) fait foi.

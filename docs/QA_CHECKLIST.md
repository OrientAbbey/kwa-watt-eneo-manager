# KWA-WATT — Checklist de recette manuelle

À exécuter **modèle web (navigateur)** puis **Android (APK CI)**.
Cocher chaque ligne ; toute anomalie = fiche avec reproduire → attendu → réel.

## 1. Connexion & profil

- [ ] Connexion Google fonctionne (web : popup/redirection ; mobile : bouton natif)
- [ ] Déconnexion fonctionne
- [ ] Après reconnexion, les données cloud sont restaurées
- [ ] Compteurs : créer / renommer / basculer / supprimer (garder min. 1)
- [ ] Photos profil : prise de vue (caméra) + galerie + retirer + enregistrer
- [ ] Zoom photo plein écran : pinch (mobile) / double-tap + molette (web), déplacement, fermeture
- [ ] Suppression du compte (Firebase) : confirmation demandée, redevient visiteur

## 2. Dashboard & alertes

- [ ] Graphiques consommation + coût affichés, unité « U » partout
- [ ] Solde/énergie restante cohérents avec les données saisies
- [ ] Bandeau d'alertes : déclenchement début de mois, seuil, anomalie
- [ ] Notifications activées → la permission est demandée à l'activation
- [ ] Notification reçue (mobile : tirage à l'écran ; web : toast navigateur)
- [ ] Au tout premier lancement : une seule demande de notifications (Oui/Non), mise en mémoire — ne se reproduit pas aux lancements suivants
- [ ] Pas de demande caméra/fichiers au premier lancement (déclenchées uniquement à l'usage)

## 3. Calculatrice

- [ ] kWh → U : montant correct (tranche + TVA), détail affiché
- [ ] U → kWh : énergie correcte, détail affiché
- [ ] Ajustements manuels (client, TVA, cumul, moyenne) pris en compte

## 4. Historique

- [ ] Ajout / modification / suppression consommation (mois) et recharge (jour)
- [ ] Tri ascendant/descendant
- [ ] Export CSV (+ CSV) téléchargable et ouvrable
- [ ] Export JSON valide
- [ ] Import CSV existant : mise à jour même date, ajout des nouvelles
- [ ] Import JSON : idem
- [ ] Import d'un fichier corrompu : message d'erreur, pas de crash
- [ ] « Tout supprimer » (section courante) avec confirmation

## 5. Paramètres & thème

- [ ] Thème clair / sombre / système appliqué immédiatement
- [ ] Tarifs modifiables et pris en compte dans la calculatrice
- [ ] Format d'export par défaut conservé
- [ ] Réinitialisation des paramètres d'alertes/export

## 6. Aide

- [ ] Ajout d'une image d'aide (galerie/caméra), suppression, zoom plein écran
- [ ] Navigation Aide accessible depuis la sidebar (web) et en mobile

## 7. Stabilité

- [ ] Rechargement de la page (web) / redémarrage (mobile) : données intactes
- [ ] Mode hors-ligne (web) : l'app s'ouvre et conserve les données locales
- [ ] Vider le cache du navigateur puis relancer : données restaurées du cloud si connecté
- [ ] Test sur petit écran (360-400 px) : pas de débordement de layout

## Valeurs de référence (calcul)

- Résidentiel, tranche 0–110 kWh : base 50 U, confort 94 U.
- 100 kWh, cumul 0, TVA 19.25 % mais sous le seuil (220) ?
  → base 50 U/kWh → **5 000 U** (pas de TVA sous le seuil).
- Validation automatique par les tests : `npm run test` (33 tests).
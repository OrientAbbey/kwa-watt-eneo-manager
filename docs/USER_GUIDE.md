# KWA-WATT — Guide utilisateur

## Prise en main

1. Ouvrez l'application (web ou mobile Android).
2. Sans compte : tout fonctionne, les données restent sur l'appareil
   (`localStorage`).
3. Pour la **sauvegarde cloud** : cliquez sur « Se connecter » dans le profil
   et connectez-vous avec Google. Vos données (compteurs, consommations,
   recharges, photos, paramètres) sont alors synchronisées automatiquement.

## Dashboard

- Vue d'ensemble du solde estimé : index, énergie restante, prévisions.
- Graphiques : consommation et coût mois par mois (unité : **U**, symbole de
  la monnaie locale équivalente).
- **Alertes** (bandeau) : début de mois, consommation au-dessus du seuil,
  hausse brutale par rapport à la moyenne.

## Outil de calcul

- Deux sens : **kWh → U** (montant à payer pour une consommation) et
  **U → kWh** (énergie obtenue pour une recharge).
- « Modifier les valeurs » permet d'ajuster type de client, TVA, cumul du mois
  et consommation moyenne — les valeurs par défaut suivent vos données.
- Le détail des tranches (base/confort, TVA) est affiché sous le résultat.

## Historique

- Onglets **Consommations** (par mois) et **Recharges** (par jour).
- Ajouter / modifier / supprimer des entrées ; tri par date.
- **Exporter** (CSV ou JSON, réglable dans les Paramètres) et **Importer** un
  fichier. Formats décrits dans l'aide de l'écran. L'import met à jour les
  entrées existantes (même date), ajoute les nouvelles.

## Profil

- Numéro de compteur, propriétaire, localisation, email.
- **Photos** : écran du compteur, recto/verso de la carte, photo de profil.
  Toucher une photo pour l'agrandir : **zoom** (pinch / double-tap / molette),
  **déplacement** (glisser), fermeture via Échap ou le bouton ✕.
- Compteurs multiples : créer / renommer / supprimer.
- Déconnexion et **suppression du compte** (Firebase + données).

## Paramètres

- Type de client (résidentiel / professionnel) et TVA.
- Tarifs ajustables (tranches base/confort).
- **Notifications** : autoriser l'appareil ou le navigateur à envoyer les
  alertes (demande de permission au moment de l'activation).
- Seuils d'alerte (début de mois, seuil haut de consommation, % d'anomalie,
  durée des toasts).
- Format d'export par défaut.

## Aide

- Description complète de chaque écran, formats d'import/export, et images
  d'aide personnalisables (bouton « + ») : ajoutez les vôtres (ex. capture de
  la grille tarifaire), visionnables en plein écran avec zoom.

## Conseils

- Exportez régulièrement vos données (désinstallation ou cache vidé = perte si
  non connecté au cloud).
- Activez les notifications pour ne pas manquer le début du mois ou un seuil
  atteint.
- Sur Android, autorisez les permissions (photos, fichiers, notifications)
  uniquement quand l'application les demande — elle ne les exige pas au
  démarrage.
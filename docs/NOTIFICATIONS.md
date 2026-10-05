# Notifications d'alerte (Android)

## Comportement voulu

La zone de notification du téléphone **reflète les alertes actives** de l'application (celles du tableau de bord) :

1. Une alerte active (ex. « Début du mois ») est affichée **en permanence** : notification « ongoing », qu'on ne peut pas balayer.
2. On ne la retire qu'avec le bouton **« Supprimer »** de la notification (visible en la dépliant).
3. À **chaque ouverture / retour au premier plan** de l'application, si l'alerte est toujours active et que sa notification a
   disparu, elle est **republiée**. Quand l'alerte n'est plus active, la notification est retirée.
4. Le bouton en cloche, au-dessus du bouton « + », indique le nombre d'alertes en cours (liste au toucher).

Rien n'est « posté une fois puis oublié » : à chaque passage, l'application compare l'état voulu (alertes actives) à l'état
réel (`getDeliveredNotifications`) et corrige l'écart. C'est idempotent (`src/lib/alertNotifications.ts`, testé).

## Détails

| Sujet | Choix |
|---|---|
| Première publication d'une alerte du mois | Canal « Alertes et rappels » : son + bandeau |
| Republication ensuite | Canal « Alertes persistantes (silencieuses) » : visible dans la zone de notification, sans son |
| « Début du mois » application fermée | Déclencheur mensuel programmé **à minuit** le jour de début (comme le tableau de bord), silencieux |
| Après « Supprimer » | Pas de republication pendant ce passage au premier plan ; republiée à l'ouverture **suivante** si l'alerte est toujours active |
| Désactiver les notifications (Réglages) | Retire tout (c'est le moyen de faire disparaître des notifications non balayables) |

## Limites à connaître (comportement du plugin Capacitor / d'Android)

- **« Supprimer » ouvre l'application.** Les boutons d'action du plugin sont des `PendingIntent.getActivity` : l'application
  s'ouvre brièvement. Elle retire alors la notification et ne la republie pas tant qu'elle reste au premier plan.
- **Un appui sur la notification la retire** (le plugin retire toute notification touchée, même « ongoing ») : l'application
  s'ouvre et la **republie aussitôt**, ce qui donne l'impression qu'elle est restée.
- **Fin de période sans ouvrir l'application** : si l'alerte n'est plus active mais que l'application n'est pas rouverte, la
  notification reste (elle ne se balaye pas) jusqu'à la prochaine ouverture, ou jusqu'à « Supprimer ». Le plugin n'expose pas
  de durée d'expiration.
- **Android 14 et plus** : certaines versions permettent de masquer des notifications persistantes depuis les réglages du
  système ; dans ce cas la prochaine ouverture de l'application les republie.
- **Notifications coupées dans les réglages du téléphone** : le plugin refuse de les afficher. Réglages → Notifications de
  l'application propose un test qui indique la cause exacte.

## Non vérifié

Le comportement a été testé **par des tests unitaires** (planificateur, événements) et en lisant le code source du plugin.
Il n'a **pas** été essayé sur un téléphone : à confirmer sur appareil (Android 13/14 si possible), notamment l'affichage du
bouton « Supprimer » et le démarrage à froid via ce bouton.

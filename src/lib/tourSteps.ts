import type { NavIntent, TabValue } from "../store/NavContext";

/**
 * CONTENU des visites guidées (textes en français + éléments à mettre en avant). Aucune logique ici : pour modifier une
 * visite, on ne touche qu'à ce fichier. Après un changement important, incrémenter TOUR_VERSION : les utilisateurs
 * qui ont déjà vu la visite se verront proposer les « nouveautés » (jamais imposées).
 */

/** Numéro de version du contenu de la visite principale (voir decideTourOffer dans tourLogic.ts). */
export const TOUR_VERSION = 1;

export type TourId = "main" | "recharge" | "sms" | "notifications" | "emergency";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /**
   * Sélecteurs CSS essayés dans l'ordre : le premier élément VISIBLE est mis en avant (ex. le bouton « + » flottant sur
   * mobile, le bouton « Ajouter » sur grand écran). Aucun sélecteur, ou cible absente : carte centrée.
   */
  targets?: string[];
  /** Texte affiché à la place de `body` quand la cible n'existe pas (ex. la cloche n'apparaît que s'il y a une alerte). */
  fallbackBody?: string;
  /** Onglet à ouvrir avant d'afficher l'étape. */
  tab?: TabValue;
  /** Action transmise à la navigation (ex. ouvrir directement la fenêtre d'import de SMS). */
  intent?: NavIntent;
  /** Côté préféré de la bulle (par défaut : automatique). */
  placement?: "auto" | "top" | "bottom";
}

export interface TourDef {
  id: TourId;
  title: string;
  summary: string;
  steps: TourStep[];
}

const ADD_BUTTON = ['[data-tour="add-fab"]', '[data-tour="add-header"]'];

export const TOURS: Record<TourId, TourDef> = {
  main: {
    id: "main",
    title: "Visite complète",
    summary: "Les fonctions principales en moins d'une minute.",
    steps: [
      {
        id: "welcome",
        title: "Bienvenue dans KWA-WATT",
        body: "Suivez vos recharges et votre consommation d'électricité prépayée, et estimez la fin de votre crédit. Cette visite dure environ une minute. KWA-WATT est une application indépendante, non affiliée à votre distributeur d'électricité ni aux opérateurs de paiement.",
      },
      {
        id: "dashboard",
        title: "Votre tableau de bord",
        body: "Voici l'énergie restante estimée. Juste en dessous : la consommation du mois et la date estimée de fin de crédit. Ce sont des estimations calculées à partir de vos recharges et relevés.",
        tab: "dashboard",
        targets: ['[data-tour="balance"]'],
      },
      {
        id: "add",
        title: "Le bouton « + »",
        body: "Il sert à enregistrer une recharge, un relevé de consommation, ou à lire une recharge directement depuis un SMS de confirmation.",
        targets: ADD_BUTTON,
      },
      {
        id: "services-recharge",
        title: "Recharger par codes courts",
        body: "L'onglet Services réunit tout ce qui concerne le compteur. Les boutons MTN MoMo et Orange Money ouvrent les codes courts de paiement sur votre téléphone.",
        tab: "services",
        targets: ["#quick-recharge"],
      },
      {
        id: "services-811",
        title: "Crédit d'urgence 811",
        body: "Vous avez activé le crédit d'urgence ? Notez-le ici : il est suivi comme une dette de kWh, à rembourser sur votre prochaine recharge.",
        tab: "services",
        targets: ["#emergency-credit"],
      },
      {
        id: "services-codes",
        title: "Codes du compteur et diagnostic TID",
        body: "Les codes du clavier du compteur (800-825, 873) se copient en un geste. Plus bas, le diagnostic TID aide à savoir si votre compteur a reçu sa mise à jour.",
        tab: "services",
        targets: ["#meter-codes"],
      },
      {
        id: "sms",
        title: "Recharge depuis un SMS",
        body: "Collez le SMS de confirmation (Orange Money ou MTN MoMo) ou photographiez-le : la lecture se fait sur votre téléphone, l'image n'est pas envoyée sur internet. Vous vérifiez tout avant d'enregistrer.",
        tab: "history",
        intent: { type: "paste-sms" },
        targets: ['[data-tour="sms-actions"]'],
      },
      {
        id: "notifications",
        title: "Notifications et cloche",
        body: "La cloche indique les alertes en cours. Dans la zone de notification du téléphone, utilisez le bouton « Supprimer » pour retirer une alerte : elle revient à la prochaine ouverture si elle est toujours active.",
        fallbackBody:
          "Dès qu'une alerte est active (par exemple « Début du mois »), une cloche apparaît au-dessus du bouton « + » avec le nombre d'alertes. Dans la zone de notification du téléphone, le bouton « Supprimer » retire une alerte : elle revient à la prochaine ouverture si elle est toujours active.",
        tab: "dashboard",
        targets: ['[data-tour="bell"]'],
      },
      {
        id: "menu",
        title: "Menu, profil et synchronisation",
        body: "Le menu donne accès au Profil, aux Paramètres et à l'Aide. L'icône nuage de la barre du haut indique la synchronisation : en mode visiteur, tout reste sur ce téléphone ; connectez-vous avec Google depuis le Profil pour sauvegarder. Vous pouvez revoir cette visite à tout moment dans Aide → À propos.",
        tab: "dashboard",
        targets: ['[data-tour="menu"]', '[data-tour="sidebar"]'],
      },
    ],
  },

  recharge: {
    id: "recharge",
    title: "Enregistrer une recharge",
    summary: "Saisir une recharge à la main, pas à pas.",
    steps: [
      {
        id: "recharge-add",
        title: "Ouvrir le formulaire",
        body: "Appuyez sur « + » puis sur « Enregistrer une recharge ».",
        targets: ADD_BUTTON,
      },
      {
        id: "recharge-form",
        title: "Remplir la recharge",
        body: "Indiquez la date, le montant payé pour l'énergie et les kWh reçus. La référence de transaction est facultative mais utile en cas de réclamation. Les frais du prestataire de paiement se notent à part.",
        tab: "history",
        intent: { type: "add-recharge" },
        targets: ['[data-tour="entry-form"]'],
      },
      {
        id: "recharge-result",
        title: "Le résultat",
        body: "Une fois enregistrée, la recharge met à jour l'énergie restante et la date estimée de fin de crédit.",
        tab: "dashboard",
        targets: ['[data-tour="balance"]'],
      },
    ],
  },

  sms: {
    id: "sms",
    title: "Importer un SMS",
    summary: "Coller ou photographier le SMS de confirmation.",
    steps: [
      {
        id: "sms-add",
        title: "Ouvrir l'import",
        body: "Appuyez sur « + » puis sur « Recharge depuis un SMS ».",
        targets: ADD_BUTTON,
      },
      {
        id: "sms-actions",
        title: "Coller ou photographier",
        body: "« Coller » reprend le SMS copié. « Photo (OCR) » lit une photo ou une capture d'écran, sur votre téléphone et sans envoi sur internet.",
        tab: "history",
        intent: { type: "paste-sms" },
        targets: ['[data-tour="sms-actions"]'],
      },
      {
        id: "sms-text",
        title: "Vérifier ce qui est reconnu",
        body: "Le texte apparaît ici, avec les valeurs reconnues (montant, kWh, date, référence, compteur). L'application signale un compteur différent du vôtre ou un prix au kWh incohérent. Relisez toujours avant d'enregistrer.",
        tab: "history",
        intent: { type: "paste-sms" },
        targets: ['[data-tour="sms-text"]'],
      },
    ],
  },

  notifications: {
    id: "notifications",
    title: "Notifications",
    summary: "Alertes, cloche et rappels de recharge.",
    steps: [
      {
        id: "notif-bell",
        title: "La cloche",
        body: "Elle indique le nombre d'alertes en cours et ouvre leur liste.",
        fallbackBody: "La cloche apparaît au-dessus du bouton « + » dès qu'une alerte est active (par exemple « Début du mois »), avec le nombre d'alertes en cours.",
        tab: "dashboard",
        targets: ['[data-tour="bell"]'],
      },
      {
        id: "notif-settings",
        title: "Régler les alertes",
        body: "Dans Paramètres, activez les notifications, le rappel de recharge avant la fin du crédit et les seuils d'alerte. Une alerte active reste dans la zone de notification du téléphone : utilisez « Supprimer » pour la retirer ; elle revient à la prochaine ouverture si elle est toujours active.",
        tab: "settings",
        targets: ['[data-tour="settings-alerts"]'],
      },
    ],
  },

  emergency: {
    id: "emergency",
    title: "Crédit d'urgence",
    summary: "Suivre le crédit 811 et son remboursement.",
    steps: [
      {
        id: "emergency-card",
        title: "Noter le crédit 811",
        body: "Après avoir activé le crédit d'urgence sur le compteur (code 811), enregistrez-le ici. Il est suivi comme une dette de kWh.",
        tab: "services",
        targets: ["#emergency-credit"],
      },
      {
        id: "emergency-balance",
        title: "Le remboursement",
        body: "Tant qu'il n'est pas remboursé, le tableau de bord indique les kWh à rembourser. Il est déduit de votre prochaine recharge enregistrée.",
        tab: "dashboard",
        targets: ['[data-tour="balance"]'],
      },
    ],
  },
};

/** Mini-visites proposées dans « À propos » et « Paramètres », dans cet ordre. */
export const MINI_TOUR_IDS: TourId[] = ["recharge", "sms", "notifications", "emergency"];

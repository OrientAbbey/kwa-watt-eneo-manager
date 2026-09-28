/**
 * Codes à composer sur le clavier de l'interface client (CIU) du compteur prépayé ENEO/SOCADEL.
 * Source : guide prépayé officiel (eneocameroon.cm) et FAQ « Mise à jour TID ».
 * Les codes `verified: false` proviennent d'autres exploitants de compteurs STS : ils fonctionnent sur certains
 * modèles mais ne figurent pas dans la documentation officielle ENEO — à essayer sans risque (lecture seule).
 */

export type MeterCodeGroup = "essentiel" | "historique" | "urgence" | "maintenance" | "autres";

export interface MeterCode {
  code: string;
  label: string;
  description: string;
  group: MeterCodeGroup;
  /** Documenté par l'opérateur. */
  verified: boolean;
  /** Action qui modifie l'état du compteur (à ne pas lancer par curiosité). */
  changesState?: boolean;
}

export const METER_CODE_GROUPS: Record<MeterCodeGroup, string> = {
  essentiel: "Consultation courante",
  historique: "Historique de consommation (6 derniers mois)",
  urgence: "Crédit d'urgence et alarme",
  maintenance: "Maintenance",
  autres: "Autres codes (non documentés par l'opérateur)",
};

export const METER_CODES: MeterCode[] = [
  { code: "800", label: "Consommation totale", description: "Énergie totale consommée depuis l'installation.", group: "essentiel", verified: true },
  { code: "801", label: "Solde de crédit", description: "Crédit (kWh) restant sur le compteur.", group: "essentiel", verified: true },
  { code: "802", label: "Date actuelle", description: "Date enregistrée dans le compteur.", group: "essentiel", verified: true },
  { code: "803", label: "Heure actuelle", description: "Heure enregistrée dans le compteur.", group: "essentiel", verified: true },
  { code: "804", label: "Numéro de compteur", description: "Affiche votre numéro de compteur (utile pour recharger).", group: "essentiel", verified: true },
  { code: "817", label: "Dernière recharge", description: "Montant de la dernière recharge enregistrée.", group: "essentiel", verified: true },

  { code: "820", label: "Consommation M-1", description: "Consommation du mois précédent (CM1).", group: "historique", verified: true },
  { code: "821", label: "Consommation M-2", description: "Consommation d'il y a 2 mois (CM2).", group: "historique", verified: true },
  { code: "822", label: "Consommation M-3", description: "Consommation d'il y a 3 mois (CM3).", group: "historique", verified: true },
  { code: "823", label: "Consommation M-4", description: "Consommation d'il y a 4 mois (CM4).", group: "historique", verified: true },
  { code: "824", label: "Consommation M-5", description: "Consommation d'il y a 5 mois (CM5).", group: "historique", verified: true },
  { code: "825", label: "Consommation M-6", description: "Consommation d'il y a 6 mois (CM6). La moyenne de ces 6 mois détermine votre tranche tarifaire.", group: "historique", verified: true },

  { code: "810", label: "Consulter le crédit de secours", description: "Vérifie la valeur du crédit de découvert / de secours disponible.", group: "urgence", verified: true },
  { code: "811", label: "Activer le crédit d'urgence", description: "Prête 10 kWh quand votre crédit est épuisé. Ce prêt est déduit de votre prochaine recharge.", group: "urgence", verified: true, changesState: true },
  { code: "812", label: "Couper l'alarme sonore", description: "Arrête le bip d'avertissement de crédit bas.", group: "urgence", verified: true },

  { code: "873", label: "Version STS (mise à jour TID)", description: "Affiche 01 (STS édition 1, mise à jour TID à faire) ou 02 (déjà à jour).", group: "maintenance", verified: true },

  { code: "808", label: "Puissance instantanée", description: "Puissance appelée en ce moment (modèles STS compatibles).", group: "autres", verified: false },
  { code: "813", label: "Consommation de la veille", description: "Énergie consommée la veille (modèles STS compatibles).", group: "autres", verified: false },
  { code: "814", label: "Consommation du mois en cours", description: "Énergie consommée ce mois-ci (modèles STS compatibles).", group: "autres", verified: false },
  { code: "815", label: "Date de la dernière recharge", description: "Modèles STS compatibles.", group: "autres", verified: false },
  { code: "816", label: "Heure de la dernière recharge", description: "Modèles STS compatibles.", group: "autres", verified: false },
  { code: "830", label: "Code de la dernière recharge", description: "Dernier jeton saisi (modèles STS compatibles).", group: "autres", verified: false },
];

export function groupedMeterCodes(): { group: MeterCodeGroup; title: string; codes: MeterCode[] }[] {
  return (Object.keys(METER_CODE_GROUPS) as MeterCodeGroup[])
    .map((group) => ({ group, title: METER_CODE_GROUPS[group], codes: METER_CODES.filter((c) => c.group === group) }))
    .filter((g) => g.codes.length > 0);
}

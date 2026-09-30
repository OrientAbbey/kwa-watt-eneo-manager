/**
 * Frais de l'opérateur mobile money pour un achat de kWh (ENEO prépayé). Ils s'AJOUTENT au montant de l'énergie :
 * on débite montant + frais. Ex. des SMS réels : « Montant : 3000 FCFA … Frais : 100 FCFA ».
 *
 * MTN MoMo : grille officielle « Frais Eneo prépayés » publiée sur
 * https://mtn.cm/fr/helppersonal/bill-payment-fees/ (consultée le 30/09/2026). Elle peut changer : vérifiez la page.
 * Orange Money : grille non trouvée publiquement ; les SMS d'exemple montrent 100 F pour 3000 F (même palier), donc on
 * n'affiche qu'une estimation prudente, signalée comme telle.
 */

export interface FeeTier {
  /** Borne haute incluse du palier (FCFA). */
  upTo: number;
  fee: number;
}

export const MTN_ENEO_PREPAID_FEES: FeeTier[] = [
  { upTo: 10_000, fee: 100 },
  { upTo: 20_000, fee: 200 },
  { upTo: 50_000, fee: 350 },
  { upTo: 100_000, fee: 500 },
  { upTo: 1_000_000, fee: 700 },
];

/** Frais MTN pour un montant donné, ou null si hors grille (montant ≤ 0 ou > 1 000 000 F). */
export function mtnEneoPrepaidFee(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const tier = MTN_ENEO_PREPAID_FEES.find((t) => amount <= t.upTo);
  return tier ? tier.fee : null;
}

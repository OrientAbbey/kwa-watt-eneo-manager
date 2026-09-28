import { TariffRange, getTariffRange } from "./eneo";

/**
 * Simulateur « changement de tranche ». Le tarif dépend de la moyenne des 6 derniers mois (codes 820-825 du compteur).
 * En consommant X kWh ce mois-ci, on remplace le plus ancien des 6 mois : on calcule la nouvelle moyenne, la tranche
 * qui en résulte et la marge en kWh avant de changer de tranche.
 */

export type ClientType = "residential" | "professional";

export interface TrancheSimulation {
  /** Nombre de mois utilisés dans la moyenne (jusqu'à 6). */
  monthsUsed: number;
  projectedAverage: number;
  range: TariffRange;
  /** Tranche de la moyenne actuelle (sans ce mois-ci), pour comparaison. */
  currentRange: TariffRange | null;
  /** kWh supplémentaires possibles ce mois-ci avant de passer à la tranche supérieure (null si dernière tranche). */
  headroomKwh: number | null;
  /** Consommation maximale ce mois-ci pour retomber dans la tranche inférieure (null si déjà la première). */
  dropToLowerKwh: number | null;
  status: "lower" | "same" | "higher";
}

/**
 * @param previousMonths consommations des mois précédents, du plus récent au plus ancien (M-1, M-2, …)
 * @param thisMonthKwh consommation (réelle ou envisagée) du mois en cours
 */
export function simulateNextTranche(
  previousMonths: number[],
  thisMonthKwh: number,
  clientType: ClientType,
  tariffs: Record<ClientType, TariffRange[]>
): TrancheSimulation {
  const others = previousMonths.filter((v) => Number.isFinite(v) && v >= 0).slice(0, 5);
  const monthsUsed = others.length + 1;
  const sumOthers = others.reduce((a, b) => a + b, 0);
  const x = Math.max(0, thisMonthKwh);
  const projectedAverage = (sumOthers + x) / monthsUsed;
  const range = getTariffRange(projectedAverage, clientType, tariffs);

  const ranges = tariffs[clientType];
  const idx = ranges.indexOf(range);
  const lower = idx > 0 ? ranges[idx - 1] : null;

  const prevWindow = previousMonths.filter((v) => Number.isFinite(v) && v >= 0).slice(0, 6);
  const currentAvg = prevWindow.length > 0 ? prevWindow.reduce((a, b) => a + b, 0) / prevWindow.length : null;
  const currentRange = currentAvg === null ? null : getTariffRange(currentAvg, clientType, tariffs);

  const headroomKwh = Number.isFinite(range.max) ? Math.max(0, Math.floor(range.max * monthsUsed - sumOthers - x)) : null;
  const dropToLowerKwh = lower ? Math.max(0, Math.floor(lower.max * monthsUsed - sumOthers)) : null;

  let status: TrancheSimulation["status"] = "same";
  if (currentRange) {
    const ci = ranges.indexOf(currentRange);
    status = idx > ci ? "higher" : idx < ci ? "lower" : "same";
  }
  return { monthsUsed, projectedAverage, range, currentRange, headroomKwh, dropToLowerKwh, status };
}

import { Consumption, EmergencyCredit, Recharge } from "../types";
import { EMERGENCY_CREDIT_KWH } from "./eneo";

/**
 * Logique du crédit d'urgence (code 811 sur le compteur) : c'est un PRÊT de 10 kWh, déduit automatiquement
 * de la prochaine recharge. On le suit donc comme une dette, jamais comme un bonus.
 */

export const outstandingEmergencyKwh = (credits: EmergencyCredit[] = []): number =>
  credits.filter((c) => !c.repaid).reduce((acc, c) => acc + c.kwh, 0);

export function createEmergencyCredit(id: string, date: string, kwh = EMERGENCY_CREDIT_KWH): EmergencyCredit {
  return { id, date, kwh, repaid: false };
}

/**
 * Applique une recharge (kWh bruts) aux crédits d'urgence non remboursés, du plus ancien au plus récent.
 * Un crédit n'est marqué remboursé que si la recharge le couvre entièrement.
 */
export function repayEmergencyCredits(credits: EmergencyCredit[], rechargeKwh: number, date: string, now = Date.now()): EmergencyCredit[] {
  let remaining = rechargeKwh;
  const order = credits
    .filter((c) => !c.repaid)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((c) => c.id);
  const repaidIds = new Set<string>();
  for (const id of order) {
    const credit = credits.find((c) => c.id === id)!;
    if (remaining >= credit.kwh) {
      remaining -= credit.kwh;
      repaidIds.add(id);
    } else break;
  }
  return credits.map((c) => (repaidIds.has(c.id) ? { ...c, repaid: true, repaidAt: date, updatedAt: now } : c));
}

/** kWh réellement crédités sur le compteur après déduction de la dette d'urgence. */
export const netKwhAfterEmergency = (grossKwh: number, outstanding: number): number => Math.max(0, grossKwh - outstanding);

/**
 * Énergie disponible estimée sur le mois courant :
 * kWh achetés − kWh consommés + crédit d'urgence encore dû (prêté mais consommé sans avoir été racheté).
 */
export function currentBalanceKwh(rechargeKwhThisMonth: number, consumedThisMonth: number, outstandingEmergency: number): number {
  return rechargeKwhThisMonth - consumedThisMonth + outstandingEmergency;
}

export function estimateDaysLeft(balanceKwh: number, average6Months: number): number | null {
  if (average6Months <= 0) return null;
  if (balanceKwh <= 0) return 0;
  return Math.floor(balanceKwh / (average6Months / 30));
}

export const sumRecharges = (recharges: Recharge[]) => recharges.reduce((acc, r) => acc + r.kwh, 0);
export const sumConsumptions = (cons: Consumption[]) => cons.reduce((acc, c) => acc + c.kwh, 0);

export interface EnergyStatus {
  average6Months: number;
  rechargeKwhThisMonth: number;
  consumedThisMonth: number;
  outstandingEmergency: number;
  /** null tant qu'il n'y a pas assez de données (aucune recharge ce mois-ci). */
  balanceKwh: number | null;
  daysLeft: number | null;
}

interface MeterLike {
  consumptions: Consumption[];
  recharges: Recharge[];
  emergencyCredits?: EmergencyCredit[];
}

/** Calcul unique partagé par le tableau de bord et le planificateur de rappels (mêmes chiffres partout). */
export function computeEnergyStatus(meter: MeterLike, now: Date = new Date()): EnergyStatus {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const sorted = [...meter.consumptions].sort((a, b) => a.date.localeCompare(b.date));
  const last6 = sorted.slice(-6);
  const average6Months = last6.length === 0 ? 0 : last6.reduce((a, c) => a + c.kwh, 0) / last6.length;
  const consumedThisMonth = sorted.find((c) => c.date === month)?.kwh ?? 0;
  const rechargeKwhThisMonth = sumRecharges(meter.recharges.filter((r) => r.date.startsWith(month)));
  const outstandingEmergency = outstandingEmergencyKwh(meter.emergencyCredits);
  const hasData = average6Months > 0 && (rechargeKwhThisMonth > 0 || outstandingEmergency > 0);
  const balanceKwh = hasData ? currentBalanceKwh(rechargeKwhThisMonth, consumedThisMonth, outstandingEmergency) : null;
  return {
    average6Months,
    rechargeKwhThisMonth,
    consumedThisMonth,
    outstandingEmergency,
    balanceKwh,
    daysLeft: balanceKwh === null ? null : estimateDaysLeft(balanceKwh, average6Months),
  };
}

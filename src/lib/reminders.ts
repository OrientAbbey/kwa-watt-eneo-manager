import { estimateDaysLeft } from "./energy";

/**
 * Rappel PROACTIF de recharge : on calcule la date d'épuisement estimée du crédit et on planifie à l'avance
 * des notifications natives (elles se déclenchent même si l'application reste fermée plusieurs jours).
 * Module pur : aucune dépendance à Capacitor, entièrement testable.
 */

export const REMINDER_ID_BEFORE = 91001;
export const REMINDER_ID_DAY = 91002;
export const REMINDER_IDS = [REMINDER_ID_BEFORE, REMINDER_ID_DAY];
const REMINDER_HOUR = 9;
const IMMEDIATE_DELAY_MS = 60_000;

export interface ReminderPlan {
  id: number;
  /** Clé stable : évite de renvoyer deux fois le même rappel à chaque modification des données. */
  key: string;
  at: Date;
  title: string;
  body: string;
}

export interface ReminderInput {
  /** Énergie disponible estimée (kWh). null = pas assez de données. */
  balanceKwh: number | null;
  average6Months: number;
  daysBefore: number;
  outstandingEmergencyKwh: number;
  minRechargeAmount: number;
  now: Date;
  meterLabel?: string;
}

const atHour = (d: Date, hour: number) => {
  const x = new Date(d);
  x.setHours(hour, 0, 0, 0);
  return x;
};
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtFcfa = (n: number) => n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

export function planRechargeReminders(input: ReminderInput): ReminderPlan[] {
  const { balanceKwh, average6Months, daysBefore, outstandingEmergencyKwh, minRechargeAmount, now } = input;
  if (balanceKwh === null || average6Months <= 0 || daysBefore < 0) return [];

  const daysLeft = estimateDaysLeft(balanceKwh, average6Months);
  if (daysLeft === null) return [];

  const depletion = new Date(now.getTime() + daysLeft * 24 * 3600 * 1000);
  const where = input.meterLabel ? ` (${input.meterLabel})` : "";
  const debt =
    outstandingEmergencyKwh > 0
      ? ` ${outstandingEmergencyKwh} kWh de crédit d'urgence seront déduits de votre prochaine recharge.`
      : "";
  const minInfo = `Achat minimum : ${fmtFcfa(minRechargeAmount)} FCFA.`;
  const plans: ReminderPlan[] = [];
  const earliest = new Date(now.getTime() + IMMEDIATE_DELAY_MS);

  // Rappel « J-N »
  let before = atHour(new Date(depletion.getTime() - daysBefore * 24 * 3600 * 1000), REMINDER_HOUR);
  if (before < earliest) before = earliest;
  if (before < depletion || daysLeft === 0) {
    plans.push({
      id: REMINDER_ID_BEFORE,
      key: `before:${dayKey(depletion)}:${daysBefore}`,
      at: before,
      title: daysLeft === 0 ? `Crédit presque épuisé${where}` : `Recharge à prévoir${where}`,
      body:
        daysLeft === 0
          ? `Votre crédit devrait être épuisé aujourd'hui. ${minInfo}${debt}`
          : `Crédit estimé pour environ ${daysLeft} jour${daysLeft > 1 ? "s" : ""}. ${minInfo}${debt}`,
    });
  }

  // Rappel le jour estimé de l'épuisement (uniquement s'il est au moins un jour plus tard)
  if (daysLeft >= 1) {
    let onDay = atHour(depletion, 8);
    if (onDay < earliest) onDay = earliest;
    plans.push({
      id: REMINDER_ID_DAY,
      key: `day:${dayKey(depletion)}`,
      at: onDay,
      title: `Crédit bientôt épuisé${where}`,
      body: `Votre crédit devrait s'arrêter aujourd'hui. En cas de coupure, le code 811 sur le compteur prête 10 kWh (à rembourser). ${minInfo}`,
    });
  }
  return plans.filter((p, i, arr) => arr.findIndex((q) => q.id === p.id) === i);
}

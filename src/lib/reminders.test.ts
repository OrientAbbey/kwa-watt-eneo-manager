import { describe, it, expect } from "vitest";
import { planRechargeReminders, REMINDER_ID_BEFORE, REMINDER_ID_DAY } from "./reminders";

const NOW = new Date(2026, 4, 10, 14, 0, 0); // 10 mai 2026, 14:00 (heure locale)
const base = { average6Months: 90, daysBefore: 3, outstandingEmergencyKwh: 0, minRechargeAmount: 1000, now: NOW };

describe("planRechargeReminders", () => {
  it("ne planifie rien sans données suffisantes", () => {
    expect(planRechargeReminders({ ...base, balanceKwh: null })).toEqual([]);
    expect(planRechargeReminders({ ...base, balanceKwh: 50, average6Months: 0 })).toEqual([]);
  });

  it("planifie J-3 à 09:00 et le jour J à 08:00 quand l'épuisement est lointain", () => {
    // 90 kWh/mois = 3 kWh/jour ; 60 kWh => 20 jours
    const plans = planRechargeReminders({ ...base, balanceKwh: 60 });
    expect(plans).toHaveLength(2);
    const before = plans.find((p) => p.id === REMINDER_ID_BEFORE)!;
    const day = plans.find((p) => p.id === REMINDER_ID_DAY)!;
    expect(before.at.getHours()).toBe(9);
    expect(before.at.getTime()).toBeLessThan(day.at.getTime());
    const depletion = new Date(NOW.getTime() + 20 * 24 * 3600 * 1000);
    expect(day.at.getDate()).toBe(depletion.getDate());
    expect(before.body).toContain("1 000 U");
  });

  it("déclenche rapidement quand le crédit est déjà dans la fenêtre d'alerte", () => {
    const plans = planRechargeReminders({ ...base, balanceKwh: 6 }); // 2 jours
    const before = plans.find((p) => p.id === REMINDER_ID_BEFORE)!;
    expect(before.at.getTime()).toBeGreaterThan(NOW.getTime());
    expect(before.at.getTime()).toBeLessThanOrEqual(NOW.getTime() + 2 * 60 * 1000);
  });

  it("crédit épuisé : un seul rappel immédiat", () => {
    const plans = planRechargeReminders({ ...base, balanceKwh: 0 });
    expect(plans).toHaveLength(1);
    expect(plans[0].title).toContain("presque épuisé");
  });

  it("mentionne le crédit d'urgence dû", () => {
    const plans = planRechargeReminders({ ...base, balanceKwh: 60, outstandingEmergencyKwh: 10 });
    expect(plans[0].body).toContain("10 kWh de crédit d'urgence");
  });

  it("produit une clé stable pour dédupliquer les rappels", () => {
    const a = planRechargeReminders({ ...base, balanceKwh: 60 });
    const b = planRechargeReminders({ ...base, balanceKwh: 60, now: new Date(NOW.getTime() + 5 * 60 * 1000) });
    expect(a.map((p) => p.key)).toEqual(b.map((p) => p.key));
  });
});

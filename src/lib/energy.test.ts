import { describe, it, expect } from "vitest";
import { createEmergencyCredit, netKwhAfterEmergency, outstandingEmergencyKwh, repayEmergencyCredits, currentBalanceKwh, estimateDaysLeft } from "./energy";

describe("crédit d'urgence = dette", () => {
  it("compte uniquement les crédits non remboursés", () => {
    const a = createEmergencyCredit("a", "2026-01-01");
    const b = { ...createEmergencyCredit("b", "2026-01-05"), repaid: true };
    expect(outstandingEmergencyKwh([a, b])).toBe(10);
    expect(outstandingEmergencyKwh([])).toBe(0);
  });

  it("rembourse le plus ancien en premier, seulement si la recharge le couvre", () => {
    const credits = [createEmergencyCredit("b", "2026-02-01"), createEmergencyCredit("a", "2026-01-01")];
    const after = repayEmergencyCredits(credits, 15, "2026-02-10", 42);
    expect(after.find((c) => c.id === "a")?.repaid).toBe(true);
    expect(after.find((c) => c.id === "a")?.repaidAt).toBe("2026-02-10");
    expect(after.find((c) => c.id === "b")?.repaid).toBe(false);
    expect(outstandingEmergencyKwh(after)).toBe(10);
  });

  it("ne rembourse rien si la recharge est trop petite", () => {
    const after = repayEmergencyCredits([createEmergencyCredit("a", "2026-01-01")], 5, "2026-01-02");
    expect(outstandingEmergencyKwh(after)).toBe(10);
  });

  it("calcule les kWh nets crédités après déduction", () => {
    expect(netKwhAfterEmergency(20, 10)).toBe(10);
    expect(netKwhAfterEmergency(6, 10)).toBe(0);
  });

  it("le solde tient compte du prêt non remboursé", () => {
    expect(currentBalanceKwh(50, 60, 10)).toBe(0);
    expect(currentBalanceKwh(50, 40, 0)).toBe(10);
  });

  it("estime les jours restants", () => {
    expect(estimateDaysLeft(30, 90)).toBe(10);
    expect(estimateDaysLeft(-5, 90)).toBe(0);
    expect(estimateDaysLeft(30, 0)).toBeNull();
  });
});

import { computeEnergyStatus } from "./energy";

describe("computeEnergyStatus", () => {
  const now = new Date(2026, 4, 10);
  const cons = (date: string, kwh: number) => ({ id: date, date, kwh });
  it("n'estime rien sans recharge ce mois-ci", () => {
    const s = computeEnergyStatus({ consumptions: [cons("2026-04", 90)], recharges: [] }, now);
    expect(s.balanceKwh).toBeNull();
    expect(s.daysLeft).toBeNull();
  });
  it("calcule solde et jours restants", () => {
    const s = computeEnergyStatus({
      consumptions: [cons("2026-03", 90), cons("2026-04", 90), cons("2026-05", 30)],
      recharges: [{ id: "r", date: "2026-05-02", montant: 5000, kwh: 60 }],
    }, now);
    expect(s.balanceKwh).toBe(30);
    expect(s.average6Months).toBe(70);
    expect(s.daysLeft).toBe(Math.floor(30 / (70 / 30)));
  });
  it("le crédit d'urgence dû est compté même sans recharge", () => {
    const s = computeEnergyStatus({
      consumptions: [cons("2026-04", 90), cons("2026-05", 10)],
      recharges: [],
      emergencyCredits: [createEmergencyCredit("e", "2026-05-08")],
    }, now);
    expect(s.balanceKwh).toBe(0);
    expect(s.daysLeft).toBe(0);
  });
});

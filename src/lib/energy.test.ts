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

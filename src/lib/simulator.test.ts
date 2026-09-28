import { describe, it, expect } from "vitest";
import { simulateNextTranche } from "./simulator";
import { TARIFFS } from "./eneo";

describe("simulateNextTranche", () => {
  it("calcule la nouvelle moyenne en remplaçant le plus ancien des 6 mois", () => {
    // M-1..M-6 = 100 ; on ne garde que M-1..M-5 + ce mois : (500 + 160) / 6 = 110
    const s = simulateNextTranche([100, 100, 100, 100, 100, 100], 160, "residential", TARIFFS);
    expect(s.monthsUsed).toBe(6);
    expect(s.projectedAverage).toBe(110);
    expect(s.range.min).toBe(0);
    expect(s.headroomKwh).toBe(0);
  });

  it("indique la marge avant la tranche supérieure", () => {
    const s = simulateNextTranche([100, 100, 100, 100, 100], 50, "residential", TARIFFS);
    // moyenne = 550/6 ≈ 91,7 ; plafond 110*6 = 660 → marge 660 - 500 - 50 = 110
    expect(s.range.min).toBe(0);
    expect(s.headroomKwh).toBe(110);
  });

  it("détecte un passage à la tranche supérieure", () => {
    const s = simulateNextTranche([100, 100, 100, 100, 100, 100], 400, "residential", TARIFFS);
    expect(s.range.min).toBe(111);
    expect(s.status).toBe("higher");
    expect(s.dropToLowerKwh).toBe(160);
  });

  it("détecte un retour à la tranche inférieure", () => {
    // moyenne actuelle 120 (tranche 111-220) ; avec 0 kWh ce mois-ci : 600/6 = 100 → tranche 0-110
    const s = simulateNextTranche([120, 120, 120, 120, 120, 120], 0, "residential", TARIFFS);
    expect(s.currentRange?.min).toBe(111);
    expect(s.range.min).toBe(0);
    expect(s.status).toBe("lower");
  });

  it("gère peu d'historique et la dernière tranche", () => {
    const few = simulateNextTranche([], 90, "residential", TARIFFS);
    expect(few.monthsUsed).toBe(1);
    expect(few.currentRange).toBeNull();
    const top = simulateNextTranche([900, 900, 900, 900, 900, 900], 900, "residential", TARIFFS);
    expect(top.headroomKwh).toBeNull();
  });

  it("ignore les valeurs invalides", () => {
    const s = simulateNextTranche([NaN, -5, 100], 100, "residential", TARIFFS);
    expect(s.monthsUsed).toBe(2);
    expect(s.projectedAverage).toBe(100);
  });
});

import { describe, it, expect } from "vitest";
import { lastMonths } from "./chartData";

describe("lastMonths", () => {
  it("génère des mois calendaires consécutifs, du plus ancien au plus récent", () => {
    const m = lastMonths(6, new Date(2026, 4, 15)); // mai 2026
    expect(m.map((x) => x.key)).toEqual(["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]);
  });
  it("affiche l'année au premier point et à chaque janvier seulement", () => {
    const m = lastMonths(6, new Date(2026, 4, 15));
    expect(m.filter((x) => x.showYear).map((x) => x.key)).toEqual(["2025-12", "2026-01"]);
  });
  it("gère 12 mois à cheval sur deux années", () => {
    const m = lastMonths(12, new Date(2026, 1, 1)); // février 2026
    expect(m[0].key).toBe("2025-03");
    expect(m[11].key).toBe("2026-02");
    expect(m.filter((x) => x.showYear).map((x) => x.key)).toEqual(["2025-03", "2026-01"]);
  });
  it("ne saute jamais de mois en fin de mois (31 → mois de 30 jours)", () => {
    const m = lastMonths(3, new Date(2026, 4, 31));
    expect(m.map((x) => x.key)).toEqual(["2026-03", "2026-04", "2026-05"]);
  });
});

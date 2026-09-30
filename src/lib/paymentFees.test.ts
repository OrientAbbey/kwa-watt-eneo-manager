import { describe, it, expect } from "vitest";
import { mtnEneoPrepaidFee } from "./paymentFees";

describe("mtnEneoPrepaidFee (grille MTN Eneo prépayé)", () => {
  it("applique 100 F jusqu'à 10 000 F — comme les frais des SMS réels (2000 F et 3000 F)", () => {
    expect(mtnEneoPrepaidFee(1000)).toBe(100);
    expect(mtnEneoPrepaidFee(2000)).toBe(100);
    expect(mtnEneoPrepaidFee(3000)).toBe(100);
    expect(mtnEneoPrepaidFee(10_000)).toBe(100);
  });
  it("change de palier exactement aux bornes", () => {
    expect(mtnEneoPrepaidFee(10_001)).toBe(200);
    expect(mtnEneoPrepaidFee(20_000)).toBe(200);
    expect(mtnEneoPrepaidFee(20_001)).toBe(350);
    expect(mtnEneoPrepaidFee(50_000)).toBe(350);
    expect(mtnEneoPrepaidFee(50_001)).toBe(500);
    expect(mtnEneoPrepaidFee(100_000)).toBe(500);
    expect(mtnEneoPrepaidFee(100_001)).toBe(700);
    expect(mtnEneoPrepaidFee(1_000_000)).toBe(700);
  });
  it("renvoie null hors grille ou pour une valeur invalide", () => {
    expect(mtnEneoPrepaidFee(0)).toBeNull();
    expect(mtnEneoPrepaidFee(-5)).toBeNull();
    expect(mtnEneoPrepaidFee(NaN)).toBeNull();
    expect(mtnEneoPrepaidFee(1_000_001)).toBeNull();
  });
});

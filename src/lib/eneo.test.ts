import { describe, it, expect } from 'vitest';
import {
  TARIFFS,
  TVA_RATE,
  getTariffRange,
  getUnitPrice,
  isTvaApplied,
  calculatePrice,
  calculateKwh,
} from './eneo';

describe('eneo tariffs', () => {
  it('provides residential and professional grids', () => {
    expect(TARIFFS.residential.length).toBeGreaterThan(0);
    expect(TARIFFS.professional.length).toBeGreaterThan(0);
  });

  it('getTariffRange selects the matching tranche', () => {
    const r = getTariffRange(50, 'residential');
    expect(r.min).toBe(0);
    expect(r.max).toBe(110);
  });

  it('getTariffRange falls back to the last tranche above the max', () => {
    const r = getTariffRange(10_000, 'professional');
    expect(r.max).toBe(Infinity);
  });
});

describe('eneo tva', () => {
  it('isTvaApplied applies only beyond the threshold', () => {
    expect(isTvaApplied(220, 220)).toBe(false);
    expect(isTvaApplied(221, 220)).toBe(true);
    expect(isTvaApplied(1, null)).toBe(true);
  });

  it('getUnitPrice applies the tva rate when applied', () => {
    expect(getUnitPrice(50, 220, 220)).toBeCloseTo(50);
    expect(getUnitPrice(50, 221, 220)).toBeCloseTo(50 * (1 + TVA_RATE));
  });
});

describe('calculatePrice (kWh -> amount)', () => {
  it('computes base tariff within the first tranche', () => {
    const res = calculatePrice(100, 0, 50, 'residential');
    expect(res.value).toBe(5000);
    expect(res.descriptionLines.length).toBeGreaterThan(0);
  });

  it('uses comfort tariff once the base limit is exhausted', () => {
    const res = calculatePrice(100, 220, 100, 'residential');
    expect(res.value).toBe(Math.ceil(100 * 94 * (1 + TVA_RATE)));
  });

  it('applies TVA on residential mid-range consumption', () => {
    const res = calculatePrice(50, 0, 300, 'residential');
    expect(res.value).toBe(Math.ceil(50 * 79 * (1 + TVA_RATE)));
  });
});

describe('calculateKwh (amount -> kWh)', () => {
  it('returns the exact kWh for a base-tariff payment', () => {
    const res = calculateKwh(5000, 0, 50, 'residential');
    expect(res.value).toBe(100);
  });

  it('falls back to comfort tariff when cumulated consumption exceeds the base limit', () => {
    const res = calculateKwh(5000, 220, 100, 'residential');
    const comfortPrice = 94 * (1 + TVA_RATE);
    expect(res.value).toBeCloseTo(Math.round((5000 / comfortPrice) * 100) / 100, 5);
  });
});
describe("getTariffRange — moyennes fractionnaires", () => {
  it("ne bascule pas sur la dernière tranche pour une moyenne entre deux tranches (110,4 kWh)", () => {
    expect(getTariffRange(110.4, "residential").min).toBe(111);
    expect(getTariffRange(220.5, "residential").min).toBe(221);
    expect(getTariffRange(400.2, "residential").min).toBe(401);
  });
  it("garde les bornes entières inchangées", () => {
    expect(getTariffRange(0, "residential").min).toBe(0);
    expect(getTariffRange(110, "residential").min).toBe(0);
    expect(getTariffRange(111, "residential").min).toBe(111);
    expect(getTariffRange(5000, "residential").min).toBe(801);
  });
});

import { checkUnitPrice, unitPriceBounds } from './eneo';

describe('checkUnitPrice — détection des erreurs de chiffres', () => {
  it('accepte les recharges réelles (SMS Orange 3000 F → 38 kWh, MTN 2000 F → 40 kWh)', () => {
    expect(checkUnitPrice(3000, 38).status).toBe('ok');
    expect(checkUnitPrice(2000, 40).status).toBe('ok');
  });
  it('repère un chiffre en trop sur les kWh (380 au lieu de 38)', () => {
    expect(checkUnitPrice(3000, 380).status).toBe('too_many_kwh');
  });
  it('repère un chiffre manquant sur les kWh (3.8 au lieu de 38)', () => {
    expect(checkUnitPrice(3000, 3.8).status).toBe('too_few_kwh');
  });
  it('gère des kWh nuls sans planter', () => {
    expect(checkUnitPrice(1000, 0).status).toBe('too_few_kwh');
  });
  it('a des bornes cohérentes avec la grille (≈ 45 à ≈ 130 FCFA/kWh)', () => {
    const b = unitPriceBounds();
    expect(b.min).toBeCloseTo(45, 0);
    expect(b.max).toBeGreaterThan(125);
    expect(b.max).toBeLessThan(135);
  });
});

import { MONETARY_UNIT } from './utils';

export const TVA_RATE = 0.1925; // 19.25%

/**
 * Montant minimum d'un achat de kWh (recharge prépayée) : 1000 FCFA.
 * Source : guide prépayé officiel ENEO/SOCADEL. Surchargeable via la config à distance.
 */
export const MIN_RECHARGE_AMOUNT = 1000;

/** Crédit d'urgence accordé par le code 811 sur le compteur, en kWh. */
export const EMERGENCY_CREDIT_KWH = 10;

export interface TariffRange {
  min: number;
  max: number;
  base: number;
  comfort: number;
  tva_thresh: number | null;
}

export const TARIFFS: Record<"residential" | "professional", TariffRange[]> = {
  residential: [
    { min: 0, max: 110, base: 50, comfort: 94, tva_thresh: 220 },
    { min: 111, max: 220, base: 79, comfort: 99, tva_thresh: 220 },
    { min: 221, max: 400, base: 79, comfort: 99, tva_thresh: null },
    { min: 401, max: 800, base: 94, comfort: 99, tva_thresh: null },
    { min: 801, max: Infinity, base: 99, comfort: 99, tva_thresh: null },
  ],
  professional: [
    { min: 0, max: 110, base: 84, comfort: 99, tva_thresh: null },
    { min: 111, max: 400, base: 92, comfort: 99, tva_thresh: null },
    { min: 401, max: Infinity, base: 99, comfort: 99, tva_thresh: null },
  ],
};

export function calculateAverageConsumption(consumptions: number[]): number {
  if (consumptions.length === 0) return 0;
  const conso = consumptions.slice(-6);
  const sum = conso.reduce((a, b) => a + b, 0);
  return Math.round((sum / conso.length) * 1000) / 1000;
}

export function getTariffRange(average: number, clientType: "residential" | "professional", tariffs: Record<"residential" | "professional", TariffRange[]> = TARIFFS): TariffRange {
  const type = clientType === "professional" ? "professional" : "residential";
  const ranges = tariffs[type];
  // Les tranches sont ordonnées et bornées par des entiers (0-110, 111-220…). Une moyenne fractionnaire
  // (ex. 110,4) tombait dans le « trou » entre deux tranches et basculait à tort sur la dernière tranche (800+).
  // On retient donc la première tranche dont le plafond n'est pas dépassé.
  for (const range of ranges) {
    if (average <= range.max) {
      return range;
    }
  }
  return ranges[ranges.length - 1];
}

export function isTvaApplied(kwhPosition: number, tvaThreshold: number | null): boolean {
  return tvaThreshold === null || kwhPosition > tvaThreshold;
}

export function getUnitPrice(rate: number, kwhPosition: number, tvaThreshold: number | null, tvaRate: number = TVA_RATE): number {
  if (isTvaApplied(kwhPosition, tvaThreshold)) {
    return rate * (1 + tvaRate);
  }
  return rate;
}

export interface CalculationResult {
  value: number;
  descriptionLines: string[];
}

export function calculatePrice(
  quantityKwh: number,
  cumulConsom: number,
  average6Months: number,
  clientType: "residential" | "professional",
  tvaRate: number = TVA_RATE,
  tariffs: Record<"residential" | "professional", TariffRange[]> = TARIFFS
): CalculationResult {
  const tranche = getTariffRange(average6Months, clientType, tariffs);
  
  const lines: string[] = [
    `Pour une quantité de ${quantityKwh.toFixed(2)} kWh :`,
    `- Tranche actuelle : ${tranche.min}-${tranche.max === Infinity ? '+' : tranche.max} kWh`,
    `- Consommation cumulée du mois en cours : ${cumulConsom.toFixed(2)} kWh`,
  ];
  
  const baseLimit = Math.max(0.0, tranche.max - cumulConsom);
  const partInBase = Math.min(quantityKwh, baseLimit);
  const partInComfort = quantityKwh - partInBase;
  
  let totalPrice = 0.0;
  let runningCumul = cumulConsom;
  
  if (partInBase > 0) {
    const nextKwhPosition = runningCumul + 1;
    const unitPriceBase = getUnitPrice(tranche.base, nextKwhPosition, tranche.tva_thresh, tvaRate);
    const costBase = partInBase * unitPriceBase;
    totalPrice += costBase;
    runningCumul += partInBase;
    
    lines.push(
      `${partInBase.toFixed(2)} kWh X ${unitPriceBase.toFixed(2)} ${MONETARY_UNIT}/kWh = ${costBase.toFixed(2)} ${MONETARY_UNIT} ` +
      `(tarif de base ${tranche.base} ${MONETARY_UNIT}${unitPriceBase > tranche.base ? ' + TVA' : ''})`
    );
  }
  
  if (partInComfort > 0) {
    const nextKwhPosition = runningCumul + 1;
    const unitPriceComfort = getUnitPrice(tranche.comfort, nextKwhPosition, tranche.tva_thresh, tvaRate);
    const costComfort = partInComfort * unitPriceComfort;
    totalPrice += costComfort;
    
    lines.push(
      `${partInComfort.toFixed(2)} kWh X ${unitPriceComfort.toFixed(2)} ${MONETARY_UNIT}/kWh = ${costComfort.toFixed(2)} ${MONETARY_UNIT} ` +
      `(tarif de confort ${tranche.comfort} ${MONETARY_UNIT}${unitPriceComfort > tranche.comfort ? ' + TVA' : ''})`
    );
  }
  
  const finalPrice = Math.ceil(totalPrice);
  lines.push(`Total à payer : ${finalPrice} ${MONETARY_UNIT}`);
  
  return { value: finalPrice, descriptionLines: lines };
}

export function calculateKwh(
  amountFcfa: number,
  cumulConsom: number,
  average6Months: number,
  clientType: "residential" | "professional",
  tvaRate: number = TVA_RATE,
  tariffs: Record<"residential" | "professional", TariffRange[]> = TARIFFS
): CalculationResult {
  const tranche = getTariffRange(average6Months, clientType, tariffs);
  
  const lines: string[] = [
    `Pour un paiement de ${amountFcfa.toFixed(0)} ${MONETARY_UNIT} :`,
    `- Tranche actuelle : ${tranche.min}-${tranche.max === Infinity ? '+' : tranche.max} kWh`,
    `- Consommation cumulée du mois en cours : ${cumulConsom.toFixed(2)} kWh`,
  ];
  
  let remainingPrice = amountFcfa;
  let totalKwh = 0.0;
  let runningCumul = cumulConsom;
  
  const baseLimit = Math.max(0.0, tranche.max - runningCumul);
  
  if (baseLimit > 0 && remainingPrice > 0) {
    const pos = runningCumul + 1;
    const unitPriceBase = getUnitPrice(tranche.base, pos, tranche.tva_thresh, tvaRate);
    const kwhFromBase = Math.min(baseLimit, remainingPrice / unitPriceBase);
    const costBase = kwhFromBase * unitPriceBase;
    
    lines.push(
      `${remainingPrice.toFixed(2)} ${MONETARY_UNIT} ÷ ${unitPriceBase.toFixed(2)} ${MONETARY_UNIT}/kWh = ${kwhFromBase.toFixed(2)} kWh ` +
      `(tarif de base ${tranche.base} ${MONETARY_UNIT}${unitPriceBase > tranche.base ? ' + TVA)' : ')'}`
    );
    
    remainingPrice -= costBase;
    totalKwh += kwhFromBase;
    runningCumul += kwhFromBase;
  }
  
  if (remainingPrice > 0) {
    const pos = runningCumul + 1;
    const unitPriceComfort = getUnitPrice(tranche.comfort, pos, tranche.tva_thresh, tvaRate);
    const kwhFromComfort = remainingPrice / unitPriceComfort;
    totalKwh += kwhFromComfort;
    
    lines.push(
      `${remainingPrice.toFixed(2)} ${MONETARY_UNIT} ÷ ${unitPriceComfort.toFixed(2)} ${MONETARY_UNIT}/kWh = ${kwhFromComfort.toFixed(2)} kWh ` +
      `(tarif de confort ${tranche.comfort} ${MONETARY_UNIT}${unitPriceComfort > tranche.comfort ? ' + TVA)' : ')'}`
    );
  }
  
  const finalKwh = Math.round(totalKwh * 100) / 100;
  lines.push(`Total énergie obtenue : ${finalKwh.toFixed(2)} kWh`);
  
  return { value: finalKwh, descriptionLines: lines };
}

/**
 * Bornes de prix unitaire plausibles (FCFA/kWh) : du tarif le plus bas au plus haut, TVA comprise, avec une marge.
 * Sert à repérer une erreur de lecture OCR ou de saisie (un chiffre en trop ou manquant sur les kWh ou le montant).
 */
export function unitPriceBounds(tariffs: Record<"residential" | "professional", TariffRange[]> = TARIFFS): { min: number; max: number } {
  const prices = [...tariffs.residential, ...tariffs.professional]
    .flatMap((r) => [r.base, r.comfort])
    .filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length === 0) return { min: 0, max: Infinity };
  return { min: Math.min(...prices) * 0.9, max: Math.max(...prices) * (1 + TVA_RATE) * 1.1 };
}

export type UnitPriceCheck = { status: "ok" | "too_many_kwh" | "too_few_kwh"; unitPrice: number };

/** Le rapport montant / kWh est-il compatible avec la grille tarifaire ? (« too_many_kwh » = prix unitaire trop bas.) */
export function checkUnitPrice(
  montant: number,
  kwh: number,
  tariffs: Record<"residential" | "professional", TariffRange[]> = TARIFFS
): UnitPriceCheck {
  const unitPrice = kwh > 0 ? montant / kwh : Infinity;
  const { min, max } = unitPriceBounds(tariffs);
  if (unitPrice < min) return { status: "too_many_kwh", unitPrice };
  if (unitPrice > max) return { status: "too_few_kwh", unitPrice };
  return { status: "ok", unitPrice };
}

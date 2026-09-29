/**
 * Extraction des informations d'une recharge depuis le texte d'un SMS de confirmation (Orange Money, MTN MoMo,
 * « Consultation Token »), COLLÉ par l'utilisateur ou lu par OCR sur une capture/photo. Aucune permission SMS :
 * le paiement peut avoir été fait depuis un autre téléphone. Le résultat pré-remplit un formulaire TOUJOURS relu
 * par l'utilisateur avant enregistrement.
 *
 * Formats réels pris en charge (voir smsParser.test.ts) :
 *  - Orange Money « Paiement ENEO PREPAID réussi… » : ID Transaction, N' Compteur, Montant, Balance/generer Kwh,
 *    TVA, Frais, Dette, Token ;
 *  - Orange Money « Consultation Token… » : Token, KWH Genere, Montant, N' de Compteur, Date de prepaiement ;
 *  - MTN MoMo « Paiement ENEO reussi… » : Transaction ID, Recu No, Compteur No, Token, Energie kWh, Prix, Paiement,
 *    Frais, TVA, Dette.
 *
 * Choix métier : `montant` = « Montant » / « Prix » (énergie achetée, c'est ce qui sert au calcul des kWh selon la
 * tranche). Les « Frais » du prestataire de paiement (ex. 100 F) sont à part et ne sont PAS inclus dans `montant`.
 *
 * Données sensibles : le nom et le téléphone du payeur ne sont volontairement PAS extraits ; le jeton n'est jamais
 * enregistré (uniquement proposé à la copie).
 */

export interface ParsedSms {
  /** Montant de l'achat d'énergie (FCFA), hors frais de paiement. */
  montant?: number;
  kwh?: number;
  /** yyyy-MM-dd */
  date?: string;
  /** D'où vient la date : écrite dans le SMS, ou déduite de la référence Orange Money (AAMMJJ). */
  dateSource?: "message" | "reference";
  /** Référence de transaction du prestataire (Orange : PS260925.1823.C00001 ; MTN : 10000000001). */
  transactionRef?: string;
  /** Numéro de reçu ENEO (MTN), utile pour une réclamation. */
  receiptNo?: string;
  /** Numéro de compteur concerné (chiffres uniquement). */
  meterNumber?: string;
  /** Frais du prestataire de paiement (FCFA). */
  fees?: number;
  tva?: number;
  /** « Dette » retenue sur l'achat (FCFA), si indiquée. */
  dette?: number;
  /** Jeton de crédit à 20 chiffres (jamais enregistré, seulement proposé à la copie). */
  token?: string;
}

// ─────────────────────────── normalisation ───────────────────────────

/** Texte sur une ligne, sans accents, apostrophes unifiées, espaces spéciaux remplacés. */
export function normalizeSmsText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00a0\u2007\u202f\u2009\u200b\ufeff]/g, " ")
    .replace(/[\u2018\u2019\u201b\u02bc`´]/g, "'")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\uff1a/g, ":")
    .replace(/\s+/g, " ")
    .trim();
}

/** Caractères souvent confondus avec des chiffres par un OCR (O→0, l/I/|→1). */
const fixDigits = (s: string) => s.replace(/[OoIl|]/g, (c) => (c === "O" || c === "o" ? "0" : "1"));

/**
 * Une capture « numérique » est plausible si elle contient au moins un quart de vrais chiffres (« 3OOO » = 3000 lu par
 * un OCR), ou, sans aucun chiffre, une suite de « O » éventuellement précédée d'un « I/l » (« IOOO » = 1000).
 * Un mot comme « lol » (→ 101) est rejeté.
 */
const mostlyDigits = (s: string) => {
  const compact = s.replace(/[\s.,-]/g, "");
  if (compact.length === 0) return false;
  const digits = compact.match(/\d/g)?.length ?? 0;
  if (digits === 0) return /^[Il|]?[Oo]{2,}$/.test(compact);
  return digits / compact.length >= 0.25;
};

// Nombre (avec confusions OCR tolérées) : « 3000 », « 3 000 », « 38.0 », « 1.500 », « 3OOO »
const NUM = String.raw`([0-9OoIl|]+(?:[ .,][0-9OoIl|]{3})*(?:[.,][0-9OoIl|]+)?)`;

function toNumber(raw: string): number | undefined {
  if (!mostlyDigits(raw)) return undefined;
  let s = fixDigits(raw).replace(/\s/g, "");
  // « 1.500 » / « 1,500 » = milliers ; « 12,5 » / « 12.5 » = décimales
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const first = (text: string, re: RegExp): string | undefined => text.match(re)?.[1];

function labelled(text: string, label: string): number | undefined {
  const raw = first(text, new RegExp(String.raw`\b${label}\b\s*[:=]?\s*${NUM}`, "i"));
  return raw === undefined ? undefined : toNumber(raw);
}

// ─────────────────────────── dates ───────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function validDate(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseExplicitDate(text: string): string | undefined {
  const iso = text.match(/(?<!\d)(20\d{2})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/);
  if (iso) return validDate(+iso[1], +iso[2], +iso[3]);
  const fr = text.match(/(?<![\d.])(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2}|\d{2})(?!\d)/);
  if (fr) {
    const y = fr[3].length === 2 ? 2000 + +fr[3] : +fr[3];
    return validDate(y, +fr[2], +fr[1]);
  }
  return undefined;
}

/**
 * Référence Orange Money : 2 lettres + AAMMJJ + « . » + HHMM + « . » + lettre/chiffres.
 * Ex. PS260925.1823.C00001 = 25/09/2026 à 18:23 (vérifié sur les SMS réels : la doc parlait de JJMMAA à tort).
 */
const ORANGE_REF = /\b([A-Z]{2})(\d{2})(\d{2})(\d{2})\.(\d{4})\.([A-Z]\d{3,8})\b/i;

function dateFromOrangeRef(ref: string): string | undefined {
  const m = ref.match(ORANGE_REF);
  if (!m) return undefined;
  return validDate(2000 + +m[2], +m[3], +m[4]);
}

// ─────────────────────────── analyse ───────────────────────────

const CURRENCY = String.raw`(?:FCFA|F\s?CFA|XAF|XOF|F)\b`;

export function parseRechargeSms(input: string): ParsedSms {
  const text = normalizeSmsText(input);
  const out: ParsedSms = {};
  if (!text) return out;

  // Jeton : 5 groupes de 4 chiffres. D'abord après le mot « Token » (OCR toléré), sinon motif strict.
  const tokenLabelled = first(text, /token\s*[:=]?\s*([0-9OoIl|]{4}(?:[\s.-]?[0-9OoIl|]{4}){4})(?![0-9])/i);
  const tokenStrict = first(text, /(?<!\d)(\d{4}(?:[\s.-]?\d{4}){4})(?!\d)/);
  const tokenRaw = tokenLabelled ?? tokenStrict;
  if (tokenRaw) {
    const digits = fixDigits(tokenRaw).replace(/\D/g, "");
    if (digits.length === 20) out.token = digits;
  }

  // Le texte sans jeton sert aux recherches numériques (évite qu'un groupe de 4 chiffres soit pris pour autre chose).
  const body = out.token && tokenRaw ? text.replace(tokenRaw, " ") : text;

  // Référence de transaction
  const orangeRef = body.match(ORANGE_REF)?.[0];
  const labelledRef = first(
    body,
    /(?:id\s*(?:de\s*)?transaction|transaction\s*id|id\s*trans\w*|transaction\s*n[o°º']?\.?|ref(?:erence)?\s*(?:de\s*)?(?:transaction|paiement)?)\s*[:#]?\s*([A-Z0-9][A-Z0-9.-]{5,})/i
  );
  const ref = orangeRef ?? labelledRef;
  if (ref) out.transactionRef = ref.replace(/[.,;:-]+$/, "").toUpperCase();

  // Reçu ENEO
  const receipt = first(body, /re[cç]u\s*(?:n[o°º']?\.?|numero)?\s*[:#]?\s*([0-9OoIl|]{6,20})/i);
  if (receipt && mostlyDigits(receipt)) out.receiptNo = fixDigits(receipt);

  // Numéro de compteur (8 à 14 chiffres) : « N' Compteur », « N' de Compteur », « Compteur No »
  const meter =
    first(body, /\bn\s*['°º.]?\s*(?:de\s*)?compteur\s*[:=]?\s*([0-9OoIl|]{8,14})(?![0-9])/i) ??
    first(body, /\bcompteur\s*(?:n\s*[o°º'.]*)?\s*[:=]?\s*([0-9OoIl|]{8,14})(?![0-9])/i);
  if (meter && mostlyDigits(meter)) out.meterNumber = fixDigits(meter);

  // Montant : « Montant » > « Prix » > « Paiement : » (les deux points sont exigés : « Paiement ENEO réussi » n'est pas un montant)
  const paiement = (() => {
    const raw = first(body, new RegExp(String.raw`\bpaiement\s*[:=]\s*${NUM}`, "i"));
    return raw === undefined ? undefined : toNumber(raw);
  })();
  const montant = labelled(body, "montant") ?? labelled(body, "prix") ?? paiement;
  if (montant !== undefined) {
    if (montant > 0 && montant <= 10_000_000) out.montant = montant;
  } else {
    // Dernier recours : premier « N FCFA » qui n'est pas précédé de frais / TVA / dette.
    const re = new RegExp(String.raw`(?<![0-9A-Za-z])${NUM}\s*${CURRENCY}`, "gi");
    for (const m of body.matchAll(re)) {
      const before = body.slice(Math.max(0, (m.index ?? 0) - 14), m.index ?? 0);
      if (/(frais|tva|dette|solde)\s*[:=]?\s*$/i.test(before)) continue;
      const n = toNumber(m[1]);
      if (n !== undefined && n > 0 && n <= 10_000_000) {
        out.montant = n;
        break;
      }
    }
  }

  // Énergie : « Balance/generer Kwh: 38.0 », « KWH Genere: 38 », « Energie kWh : 40.0 », « 63,5 kWh »
  const kwhPatterns: RegExp[] = [
    new RegExp(String.raw`kwh\s*gener\w*\s*[:=]?\s*${NUM}`, "i"),
    new RegExp(String.raw`gener\w*\s*kwh\s*[:=]?\s*${NUM}`, "i"),
    new RegExp(String.raw`energie\s*(?:\(?kwh\)?)?\s*[:=]?\s*${NUM}`, "i"),
    new RegExp(String.raw`\bkwh\s*[:=]\s*${NUM}`, "i"),
    new RegExp(String.raw`${NUM}\s*k\s?wh\b`, "i"),
  ];
  for (const re of kwhPatterns) {
    const raw = first(body, re);
    const n = raw === undefined ? undefined : toNumber(raw);
    if (n !== undefined && n > 0 && n <= 100_000) {
      out.kwh = n;
      break;
    }
  }

  const fees = labelled(body, String.raw`frais(?:\s*de\s*service)?`);
  if (fees !== undefined) out.fees = fees;
  const tva = labelled(body, "tva");
  if (tva !== undefined) out.tva = tva;
  const dette = labelled(body, "dette");
  if (dette !== undefined) out.dette = dette;

  // Date : écrite dans le SMS (« Date de prepaiement : 25/09/2026 »), sinon déduite de la référence Orange
  const bodyForDate = body.replace(ORANGE_REF, " ").replace(/\d{9,}/g, " ");
  const explicit = parseExplicitDate(bodyForDate);
  if (explicit) {
    out.date = explicit;
    out.dateSource = "message";
  } else if (orangeRef) {
    const fromRef = dateFromOrangeRef(orangeRef);
    if (fromRef) {
      out.date = fromRef;
      out.dateSource = "reference";
    }
  }

  return out;
}

/** Nombre d'informations utiles trouvées parmi montant, énergie, date, référence (pour dire si le SMS a été reconnu). */
export const parsedFieldCount = (p: ParsedSms): number =>
  [p.montant, p.kwh, p.date, p.transactionRef].filter((v) => v !== undefined).length;

/** Chiffres uniquement (comparaison de numéros de compteur saisis avec ou sans espaces/tirets). */
export const digitsOnly = (s: string | undefined): string => (s ?? "").replace(/\D/g, "");

/** Trouve, parmi les compteurs de l'utilisateur, celui dont le numéro correspond à celui du SMS. */
export function findMeterByNumber<T extends { profile: { meterNumber: string } }>(meters: T[], number: string | undefined): T | undefined {
  const target = digitsOnly(number);
  if (target.length < 6) return undefined;
  return meters.find((m) => digitsOnly(m.profile.meterNumber) === target);
}

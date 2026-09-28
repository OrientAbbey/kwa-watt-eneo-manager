/**
 * Extraction heuristique des informations d'une recharge depuis le texte d'un SMS de confirmation
 * (paiement Orange Money / MTN MoMo, SMS de jeton ENEO/SOCADEL) COLLÉ par l'utilisateur.
 * Aucune permission SMS n'est nécessaire : le paiement peut avoir été fait depuis un autre téléphone,
 * il suffit de copier/transférer le SMS. Le résultat pré-remplit un formulaire TOUJOURS relu par l'utilisateur.
 */

export interface ParsedSms {
  montant?: number;
  kwh?: number;
  /** yyyy-MM-dd */
  date?: string;
  transactionRef?: string;
  /** Jeton de crédit à 20 chiffres, s'il est présent (jamais enregistré, seulement proposé à la copie). */
  token?: string;
}

const toNumber = (raw: string): number | undefined => {
  // "1 500", "1.500", "1,500" (milliers) vs "12,5" / "12.5" (décimales)
  let s = raw.replace(/\s/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const pad = (n: number) => String(n).padStart(2, "0");

function parseDate(text: string): string | undefined {
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return validDate(+iso[1], +iso[2], +iso[3]);
  const fr = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2}|\d{2})\b/);
  if (fr) {
    const y = fr[3].length === 2 ? 2000 + +fr[3] : +fr[3];
    return validDate(y, +fr[2], +fr[1]);
  }
  return undefined;
}

function validDate(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseRechargeSms(input: string): ParsedSms {
  const text = input.replace(/\u00a0/g, " ");
  const out: ParsedSms = {};

  // Montant : « 5000 FCFA », « Montant: 5 000 », « 5000 XAF »
  const amountAfterLabel = text.match(/(?:montant|amount|paiement|payé|paye|pay[eé]s?)\D{0,15}(\d[\d\s.,]*\d|\d)/i);
  const amountWithCurrency = text.match(/(\d[\d\s.,]*\d|\d)\s*(?:FCFA|F\s?CFA|XAF|XOF)\b/i);
  const rawAmount = amountWithCurrency?.[1] ?? amountAfterLabel?.[1];
  if (rawAmount) {
    const n = toNumber(rawAmount);
    if (n !== undefined && n > 0) out.montant = n;
  }

  // kWh
  const kwh = text.match(/(\d+(?:[.,]\d+)?)\s*k\s?wh?\b/i);
  if (kwh) {
    const n = toNumber(kwh[1]);
    if (n !== undefined && n > 0) out.kwh = n;
  }

  // Référence de transaction : Orange Money (ex. BP260115.1234.A12345) ou libellé « ID/Réf transaction : … »
  const orange = text.match(/\b([A-Z]{2}\d{6}\.\d{4}\.[A-Z0-9]{3,10})\b/);
  const labelled = text.match(/(?:transaction\s*(?:id|n[°o]?)?|id\s*(?:de\s*)?transaction|r[eé]f(?:[eé]rence)?)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9.\-]{5,})/i);
  const ref = orange?.[1] ?? labelled?.[1];
  if (ref) out.transactionRef = ref.replace(/[.,;]+$/, "");

  const date = parseDate(text);
  if (date) out.date = date;

  // Jeton STS : 20 chiffres, souvent regroupés par 4
  const token = text.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/);
  if (token) out.token = token[1].replace(/\D/g, "");

  return out;
}

/** Nombre d'informations utiles trouvées (pour dire à l'utilisateur si le SMS a été reconnu). */
export const parsedFieldCount = (p: ParsedSms): number =>
  [p.montant, p.kwh, p.date, p.transactionRef].filter((v) => v !== undefined).length;

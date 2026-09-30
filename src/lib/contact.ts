/** Générateurs de liens d'action (composeur, SMS, WhatsApp). Fonctions pures, testées. */

/** Lien du composeur avec un code USSD ; `#` et `*` sont encodés pour que l'URI soit valide. */
export const telHref = (code: string): string => `tel:${encodeURIComponent(code)}`;

/** Lien SMS : le paramètre body est supporté par la plupart des applications SMS Android. */
export const smsHref = (number: string, body?: string): string =>
  `sms:${number}${body ? `?body=${encodeURIComponent(body)}` : ""}`;

export const whatsappHref = (countryCode: string, number: string, text?: string): string => {
  const digits = `${countryCode}${number}`.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

/** Ce que l'on envoie au 8010 / WhatsApp pour recevoir factures et reçus : le numéro de contrat. */
export const invoiceRequestText = (contractNumber?: string, meterNumber?: string): string =>
  (contractNumber || meterNumber || "").trim();

/**
 * Construit le code USSD de paiement direct à partir d'un modèle (`{meter}` et `{amount}`).
 * SÉCURITÉ : seuls des chiffres peuvent être injectés dans le code composé (numéro de compteur de 8 à 14 chiffres,
 * montant entier positif) — ni `*`, ni `#`, ni autre caractère saisi par l'utilisateur ne peut modifier le code.
 * Renvoie null si une valeur est invalide.
 */
export function buildUssdPayment(template: string, meterNumber: string, amount: number): string | null {
  const meter = meterNumber.replace(/[\s.-]/g, "");
  if (!/^\d{8,14}$/.test(meter)) return null;
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000) return null;
  if (!template.includes("{meter}") || !template.includes("{amount}")) return null;
  return template.replace("{meter}", meter).replace("{amount}", String(amount));
}

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

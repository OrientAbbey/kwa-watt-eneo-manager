import { EMERGENCY_CREDIT_KWH, MIN_RECHARGE_AMOUNT } from "./eneo";

/**
 * Schéma et valeurs par défaut de la configuration à distance : AUCUNE dépendance au SDK client Firebase
 * ni à `localStorage`. Ce module reste donc importable tel quel depuis un script Node (script
 * d'administration `scripts/seed-remote-config.ts`, tests) sans initialiser d'application Firebase ni
 * supposer un environnement navigateur. `remoteConfig.ts` (lecture Firestore + cache local) s'appuie sur
 * ce module ; n'y ajoutez pas de logique qui suppose un navigateur ou un client Firebase.
 */

/**
 * Configuration distante (gratuite) : un document Firestore public en lecture seule
 * `app_config/branding`, modifiable depuis la console Firebase sans publier de nouvelle version de l'app.
 * Si le document est absent ou illisible (hors ligne, règles non déployées), les valeurs par défaut
 * ci-dessous sont utilisées : l'application fonctionne donc toujours.
 */

export type LinkCategory = "officiel" | "paiement" | "assistance" | "actualites";

export interface UsefulLink {
  id: string;
  label: string;
  url: string;
  description?: string;
  category: LinkCategory;
}

export interface RemoteConfig {
  version: number;
  brand: {
    /** Nom actuel de l'opérateur (ex. SOCADEL). */
    name: string;
    /** Ancien nom, encore très utilisé (ex. ENEO). Vide si non pertinent. */
    formerName: string;
    tagline: string;
  };
  minRechargeAmount: number;
  emergencyCreditKwh: number;
  contacts: {
    infoLine: string; // ligne d'information gratuite (SMS)
    whatsapp: string; // numéro sans +, ex. 699119911
    whatsappCountryCode: string;
    phone: string;
  };
  ussd: {
    /** Menu guidé MTN MoMo (l'utilisateur suit les étapes : option 2 « Prepaid ENEO invoice »). */
    mtnMenu: string;
    /** Code direct MTN avec `{meter}` et `{amount}` à remplacer (ex. *126*2*1*2*{meter}*{amount}#). */
    mtnPay: string;
    /** Menu guidé Orange Money (option 1 « Recharge prépayée »). */
    orangeMenu: string;
    /** Code direct Orange avec `{meter}` et `{amount}` (ex. #150*3*1*4*1*{meter}*{amount}#). */
    orangePay: string;
    /** Menu Orange pour retrouver un jeton déjà acheté (option 2). */
    orangeTokenRecall: string;
  };
  links: UsefulLink[];
  /** Grille tarifaire diffusée à distance (max: null = illimité). */
  tariffs?: { version: number; values: unknown };
}

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  version: 1,
  brand: {
    name: "SOCADEL",
    formerName: "ENEO",
    tagline: "Suivez vos consommations et recharges d'électricité",
  },
  minRechargeAmount: MIN_RECHARGE_AMOUNT,
  emergencyCreditKwh: EMERGENCY_CREDIT_KWH,
  contacts: {
    infoLine: "8010",
    whatsapp: "699119911",
    whatsappCountryCode: "237",
    phone: "+237233430033",
  },
  ussd: {
    mtnMenu: "*126*21#",
    mtnPay: "*126*2*1*2*{meter}*{amount}#",
    orangeMenu: "#150*314#",
    orangePay: "#150*3*1*4*1*{meter}*{amount}#",
    orangeTokenRecall: "#150*314#",
  },
  links: [
    { id: "site", label: "Site officiel", url: "https://www.eneocameroon.cm/", description: "Actualités, agences, services en ligne", category: "officiel" },
    { id: "guide-prepaye", label: "Guide du prépayé", url: "https://eneocameroon.cm/index.php/fr/guide-prepaye-eneo", description: "Tarifs, codes du compteur, questions fréquentes", category: "officiel" },
    { id: "guide-pdf", label: "Guide d'utilisation du compteur (PDF)", url: "https://eneocameroon.cm/images/GUCPP_FR_12012023_x_DISI_x_SDCOM_x_2023.pdf", description: "Mode d'emploi complet de l'interface CIU", category: "officiel" },
    { id: "faq-pdf", label: "FAQ solution prépayée (PDF)", url: "https://www.eneocameroon.cm/images/FAQs_Solution_Prpaye_dEneo_Fr_0821.pdf", description: "Réponses aux questions fréquentes", category: "assistance" },
    { id: "tid", label: "Mise à jour TID du compteur", url: "https://eneocameroon.cm/index.php/fr/mise-a-jour-tid-des-compteurs-prepaye-faqs", description: "Procédure officielle et FAQ (STS édition 1 → 2)", category: "assistance" },
    { id: "mtn-eneo-prepaid", label: "MTN MoMo : payer l'ENEO prépayé", url: "https://mtn.cm/fr/helppersonal/eneo-prepaid-bill-payment/", description: "Procédure officielle MTN (code *126*21#, option 2)", category: "paiement" },
    { id: "mtn-fees", label: "MTN MoMo : frais de paiement des factures", url: "https://mtn.cm/fr/helppersonal/bill-payment-fees/", description: "Grille des frais ajoutés à un achat de kWh", category: "paiement" },
    { id: "mtn-token", label: "MTN MoMo : récupérer un token Eneo", url: "https://mtn.cm/fr/helppersonal/eneo-token-recovery/", description: "Jeton perdu ou non reçu", category: "assistance" },
    { id: "myeasylight", label: "Portail MyEasyLight (factures, paiement)", url: "https://my.eneocameroon.cm/", description: "Agence en ligne", category: "paiement" },
    { id: "arsel", label: "ARSEL — régulateur de l'électricité", url: "https://arsel-cm.org", description: "Tarifs réglementés, droits des consommateurs", category: "officiel" },
    { id: "x", label: "Communiqués et coupures programmées (X)", url: "https://x.com/InsideEneo", description: "Annonces de travaux et coupures par quartier", category: "actualites" },
  ],
};

const isHttps = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[^\s]+$/i.test(u);
const str = (v: unknown, fallback: string, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback);
const ussd = (v: unknown, fallback: string) => (typeof v === "string" && /^[*#0-9]{2,30}$/.test(v) ? v : fallback);
/** Modèle de code direct : chiffres, * et #, avec exactement un {meter} et un {amount}, terminé par #. */
const ussdTemplate = (v: unknown, fallback: string) =>
  typeof v === "string" &&
  v.length <= 60 &&
  /^(?:[*#0-9]|\{meter\}|\{amount\})+$/.test(v) &&
  v.split("{meter}").length === 2 &&
  v.split("{amount}").length === 2 &&
  v.endsWith("#")
    ? v
    : fallback;
const digits = (v: unknown, fallback: string) => (typeof v === "string" && /^\+?[0-9]{2,15}$/.test(v) ? v : fallback);
const CATEGORIES: LinkCategory[] = ["officiel", "paiement", "assistance", "actualites"];

/** Valide et assainit une configuration reçue : seules les valeurs sûres sont retenues, le reste tombe sur les défauts. */
export function sanitizeRemoteConfig(raw: unknown): RemoteConfig {
  const d = DEFAULT_REMOTE_CONFIG;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, any>;
  const links: UsefulLink[] = Array.isArray(r.links)
    ? r.links
        .filter((l: any) => l && isHttps(l.url) && typeof l.label === "string")
        .slice(0, 30)
        .map((l: any, i: number): UsefulLink => ({
          id: str(l.id, `link-${i}`, 60),
          label: str(l.label, "Lien", 100),
          url: l.url,
          description: typeof l.description === "string" ? l.description.slice(0, 200) : undefined,
          category: CATEGORIES.includes(l.category) ? l.category : "officiel",
        }))
    : [];
  return {
    version: num(r.version, d.version),
    brand: {
      name: str(r.brand?.name, d.brand.name, 40),
      formerName: typeof r.brand?.formerName === "string" ? r.brand.formerName.trim().slice(0, 40) : d.brand.formerName,
      tagline: str(r.brand?.tagline, d.brand.tagline, 120),
    },
    minRechargeAmount: num(r.minRechargeAmount, d.minRechargeAmount),
    emergencyCreditKwh: num(r.emergencyCreditKwh, d.emergencyCreditKwh),
    contacts: {
      infoLine: digits(r.contacts?.infoLine, d.contacts.infoLine),
      whatsapp: digits(r.contacts?.whatsapp, d.contacts.whatsapp),
      whatsappCountryCode: digits(r.contacts?.whatsappCountryCode, d.contacts.whatsappCountryCode),
      phone: digits(r.contacts?.phone, d.contacts.phone),
    },
    ussd: {
      mtnMenu: ussd(r.ussd?.mtnMenu, d.ussd.mtnMenu),
      mtnPay: ussdTemplate(r.ussd?.mtnPay, d.ussd.mtnPay),
      orangeMenu: ussd(r.ussd?.orangeMenu, d.ussd.orangeMenu),
      orangePay: ussdTemplate(r.ussd?.orangePay, d.ussd.orangePay),
      orangeTokenRecall: ussd(r.ussd?.orangeTokenRecall, d.ussd.orangeTokenRecall),
    },
    links: links.length > 0 ? links : d.links,
    tariffs:
      r.tariffs && typeof r.tariffs === "object" && typeof r.tariffs.version === "number" && r.tariffs.values
        ? { version: r.tariffs.version, values: r.tariffs.values }
        : undefined,
  };
}

/** "SOCADEL (ex-ENEO)" ou simplement "SOCADEL". */
export function brandLabel(cfg: RemoteConfig): string {
  const { name, formerName } = cfg.brand;
  return formerName && formerName.toLowerCase() !== name.toLowerCase() ? `${name} (ex-${formerName})` : name;
}

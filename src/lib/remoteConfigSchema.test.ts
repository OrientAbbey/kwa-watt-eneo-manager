import { describe, it, expect } from "vitest";
// Aucun mock nécessaire : ce module n'a AUCUNE dépendance à Firebase ni au navigateur
// (voir le commentaire en tête de remoteConfigSchema.ts). Si un import Firebase y était
// réintroduit par erreur, ce fichier de test échouerait au chargement — c'est le garde-fou voulu.
import { sanitizeRemoteConfig, DEFAULT_REMOTE_CONFIG, brandLabel } from "./remoteConfigSchema";

describe("sanitizeRemoteConfig", () => {
  it("retourne les valeurs par défaut pour une entrée invalide", () => {
    expect(sanitizeRemoteConfig(null)).toEqual(DEFAULT_REMOTE_CONFIG);
    expect(sanitizeRemoteConfig("x")).toEqual(DEFAULT_REMOTE_CONFIG);
  });

  it("rejette les liens non https (javascript:, http:)", () => {
    const cfg = sanitizeRemoteConfig({
      links: [
        { label: "ok", url: "https://exemple.cm/a" },
        { label: "mauvais", url: "javascript:alert(1)" },
        { label: "http", url: "http://exemple.cm" },
      ],
    });
    expect(cfg.links).toHaveLength(1);
    expect(cfg.links[0].url).toBe("https://exemple.cm/a");
  });

  it("revient aux liens par défaut si aucun lien valide", () => {
    expect(sanitizeRemoteConfig({ links: [{ label: "x", url: "ftp://a" }] }).links).toEqual(DEFAULT_REMOTE_CONFIG.links);
  });

  it("n'accepte que des codes USSD sûrs", () => {
    const cfg = sanitizeRemoteConfig({ ussd: { mtnMenu: "*126#", orangeMenu: "<script>" } });
    expect(cfg.ussd.mtnMenu).toBe("*126#");
    expect(cfg.ussd.orangeMenu).toBe(DEFAULT_REMOTE_CONFIG.ussd.orangeMenu);
  });

  it("applique le montant minimum distant s'il est valide", () => {
    expect(sanitizeRemoteConfig({ minRechargeAmount: 500 }).minRechargeAmount).toBe(500);
    expect(sanitizeRemoteConfig({ minRechargeAmount: -3 }).minRechargeAmount).toBe(1000);
    expect(DEFAULT_REMOTE_CONFIG.minRechargeAmount).toBe(1000);
  });

  it("gère le renommage de marque", () => {
    const cfg = sanitizeRemoteConfig({ brand: { name: "NOUVEAU", formerName: "SOCADEL" } });
    expect(brandLabel(cfg)).toBe("NOUVEAU (ex-SOCADEL)");
    expect(brandLabel(sanitizeRemoteConfig({ brand: { name: "X", formerName: "" } }))).toBe("X");
  });

  it("conserve la grille tarifaire distante versionnée", () => {
    const cfg = sanitizeRemoteConfig({ tariffs: { version: 3, values: { residential: [] } } });
    expect(cfg.tariffs?.version).toBe(3);
  });

  it("fournit les codes USSD officiels par défaut (MTN et Orange)", () => {
    const u = DEFAULT_REMOTE_CONFIG.ussd;
    expect(u.mtnMenu).toBe("*126*21#");
    expect(u.mtnPay).toBe("*126*2*1*2*{meter}*{amount}#");
    expect(u.orangeMenu).toBe("#150*314#");
    expect(u.orangePay).toBe("#150*3*1*4*1*{meter}*{amount}#");
  });

  it("n'accepte un modèle de paiement que s'il contient un {meter} et un {amount} sûrs", () => {
    const d = DEFAULT_REMOTE_CONFIG.ussd;
    const ok = sanitizeRemoteConfig({ ussd: { mtnPay: "*126*9*{meter}*{amount}#" } });
    expect(ok.ussd.mtnPay).toBe("*126*9*{meter}*{amount}#");
    for (const bad of ["*126*{meter}#", "*126*{amount}#", "*126*{meter}*{meter}*{amount}#", "*126*{meter}*{amount}", "*126*{meter}*{amount};rm#", "tel:{meter}{amount}#", "*126*{meter}*{amount}*{x}#"]) {
      expect(sanitizeRemoteConfig({ ussd: { mtnPay: bad } }).ussd.mtnPay).toBe(d.mtnPay);
    }
  });

  it("inclut les liens MTN demandés (paiement ENEO prépayé et frais)", () => {
    const urls = DEFAULT_REMOTE_CONFIG.links.map((l) => l.url);
    expect(urls).toContain("https://mtn.cm/fr/helppersonal/eneo-prepaid-bill-payment/");
    expect(urls).toContain("https://mtn.cm/fr/helppersonal/bill-payment-fees/");
  });
});

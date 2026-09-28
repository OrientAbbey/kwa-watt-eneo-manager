import { describe, it, expect, vi } from "vitest";

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), getDoc: vi.fn() }));

import { sanitizeRemoteConfig, DEFAULT_REMOTE_CONFIG, brandLabel } from "./remoteConfig";

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
    const cfg = sanitizeRemoteConfig({ ussd: { mtnMenu: "*126#", orangeRecharge: "<script>" } });
    expect(cfg.ussd.mtnMenu).toBe("*126#");
    expect(cfg.ussd.orangeRecharge).toBe(DEFAULT_REMOTE_CONFIG.ussd.orangeRecharge);
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
});

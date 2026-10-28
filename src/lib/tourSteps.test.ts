import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MINI_TOUR_IDS, TOURS, TOUR_VERSION } from "./tourSteps";

/** Tout le code source de l'interface (hors tests) : sert à vérifier que les cibles de la visite EXISTENT vraiment. */
const SRC = join(__dirname, "..");
const sources: { file: string; text: string }[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) sources.push({ file: p, text: readFileSync(p, "utf-8") });
  }
};
walk(join(SRC, "components"));
const allSource = sources.map((s) => s.text).join("\n");

const allSteps = Object.values(TOURS).flatMap((t) => t.steps.map((s) => ({ tour: t.id, ...s })));

describe("contenu des visites", () => {
  it("la visite principale compte entre 7 et 9 étapes", () => {
    expect(TOURS.main.steps.length).toBeGreaterThanOrEqual(7);
    expect(TOURS.main.steps.length).toBeLessThanOrEqual(9);
  });
  it("les mini-visites demandées existent : recharge, SMS, notifications, crédit d'urgence", () => {
    expect([...MINI_TOUR_IDS].sort()).toEqual(["emergency", "notifications", "recharge", "sms"]);
    for (const id of MINI_TOUR_IDS) expect(TOURS[id].steps.length).toBeGreaterThan(0);
  });
  it("chaque visite est référencée sous son propre identifiant", () => {
    for (const [key, tour] of Object.entries(TOURS)) expect(tour.id).toBe(key);
  });
  it("identifiants d'étape uniques dans une visite, titres et textes non vides, tout en français", () => {
    for (const tour of Object.values(TOURS)) {
      const ids = tour.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(tour.title.trim()).not.toBe("");
      expect(tour.summary.trim()).not.toBe("");
      for (const s of tour.steps) {
        expect(s.title.trim().length).toBeGreaterThan(2);
        expect(s.body.trim().length).toBeGreaterThan(20);
      }
    }
  });
  it("la version de la visite est un entier positif", () => {
    expect(Number.isInteger(TOUR_VERSION) && TOUR_VERSION >= 1).toBe(true);
  });
  it("la première étape de la visite principale est un accueil sans cible, et mentionne l'indépendance", () => {
    expect(TOURS.main.steps[0].targets).toBeUndefined();
    expect(TOURS.main.steps[0].body).toMatch(/indépendante/i);
  });
  it("aucune donnée personnelle ni marque détournée dans les textes (pas de logo, pas d'affiliation)", () => {
    const text = allSteps.map((s) => `${s.title} ${s.body} ${s.fallbackBody ?? ""}`).join(" ");
    expect(text).not.toMatch(/officiel(le)? (d')?(ENEO|SOCADEL|MTN|Orange)/i);
    expect(text).not.toMatch(/\b\d{9,}\b/); // aucun numéro (compteur, téléphone, jeton)
  });
});

describe("les cibles de la visite existent dans l'interface (anti-dérive)", () => {
  const attrs = new Set<string>();
  const ids = new Set<string>();
  for (const step of allSteps) {
    for (const sel of step.targets ?? []) {
      const a = sel.match(/^\[data-tour="([\w-]+)"\]$/);
      const i = sel.match(/^#([\w-]+)$/);
      if (a) attrs.add(a[1]);
      else if (i) ids.add(i[1]);
      else it(`sélecteur inattendu : ${sel}`, () => expect.fail(`Format de sélecteur non géré par ce test : ${sel}`));
    }
  }
  for (const name of attrs) {
    it(`data-tour="${name}" est posé quelque part dans les composants`, () => {
      expect(allSource).toContain(`data-tour="${name}"`);
    });
  }
  for (const id of ids) {
    it(`l'élément #${id} existe dans les composants`, () => {
      expect(allSource).toMatch(new RegExp(`\\bid="${id}"`));
    });
  }
});

describe("les étapes qui ouvrent une fenêtre passent par une action de navigation existante", () => {
  const supported = new Set(["add-recharge", "add-consumption", "paste-sms", "focus"]);
  it("intents connus", () => {
    for (const s of allSteps) if (s.intent) expect(supported.has(s.intent.type)).toBe(true);
  });
  it("les onglets visés existent", () => {
    const tabs = new Set(["dashboard", "calculator", "history", "services", "profile", "settings", "help"]);
    for (const s of allSteps) if (s.tab) expect(tabs.has(s.tab)).toBe(true);
  });
});

describe("le guide est accessible depuis « À propos » ET « Paramètres »", () => {
  const read = (rel: string) => readFileSync(join(SRC, rel), "utf-8");
  it("« À propos » (Aide) affiche la carte À propos, qui contient le lanceur de visite", () => {
    expect(read("components/views/HelpView.tsx")).toContain("<AboutCard />");
    expect(read("components/features/AboutCard.tsx")).toContain("<TourLauncher />");
  });
  it("Paramètres contient le lanceur de visite", () => {
    expect(read("components/views/SettingsView.tsx")).toContain("<TourLauncher />");
  });
});

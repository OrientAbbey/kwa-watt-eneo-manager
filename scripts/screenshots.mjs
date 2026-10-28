#!/usr/bin/env node
/**
 * Captures d'écran de l'application (WebView headless) avec des données de DÉMONSTRATION FICTIVES.
 *
 * Prérequis (hors dépendances du projet, rien n'est ajouté à package.json) :
 *   npm run build
 *   npm i --no-save @sparticuz/chromium puppeteer-core
 *   node scripts/screenshots.mjs [dossier-de-sortie]      (défaut : docs/screenshots)
 *
 * LIMITES (voir docs/CAPTURES.md) : rendu Chromium sur le web, pas la WebView Android. Les plugins Capacitor (notifications,
 * caméra, presse-papiers natif…) sont sans effet ; la police Inter n'est pas téléchargée (aucune requête externe) :
 * le texte s'affiche avec une police sans empattement de repli.
 */
import { spawn } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const OUT = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "docs/screenshots";
const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
mkdirSync(OUT, { recursive: true });

// ───────────── Données de démonstration (FICTIVES : aucun vrai nom, numéro de compteur, téléphone ni jeton) ─────────────
const now = new Date();
const ym = (back) => {
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const ymd = (back, day) => `${ym(back)}-${String(day).padStart(2, "0")}`;
// Mois courant d'abord. 150 kWh contre 120 le mois précédent : « hausse brutale » (alerte), solde positif grâce à la recharge du mois.
const KWH = [150, 120, 198, 176, 189, 205, 182, 171, 160, 190, 201, 185];
const demoState = (theme) => ({
  schemaVersion: 2,
  activeMeterId: "demo",
  theme,
  helpImages: [],
  meters: [
    {
      id: "demo",
      name: "Maison (démo)",
      consumptions: KWH.map((kwh, i) => ({ id: `c${i}`, date: ym(i), kwh })),
      recharges: [
        { id: "r1", date: ymd(0, 1), montant: 20000, kwh: 223, transactionRef: "BP000000.0000.A00001", source: "sms" },
        { id: "r2", date: ymd(1, 21), montant: 15000, kwh: 167.4, source: "manual" },
        { id: "r3", date: ymd(2, 14), montant: 15000, kwh: 167.4, source: "manual" },
        { id: "r4", date: ymd(3, 6), montant: 20000, kwh: 223, source: "manual" },
      ],
      emergencyCredits: [{ id: "e1", date: ymd(0, 20), kwh: 10, repaid: false }],
      profile: { meterNumber: "98765432109", ownerName: "", location: "", email: "" },
    },
  ],
});
// SMS d'exemple FICTIF (même format que les SMS MTN MoMo ; nom, numéros et jeton inventés)
const DEMO_SMS =
  "Paiement ENEO reussi par NOM EXEMPLE,237600000000: Transaction ID 10000000002, Recu No 000000000000002, " +
  "Compteur No 98765432109, Token 1111-2222-3333-4444-5555. Energie kWh : 55.5 Prix:5000 F Paiement : 5000 F Frais : 50 F TVA : 0 F Dette : 0 F.";

const MOBILE = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1280, height: 800, deviceScaleFactor: 1 };

// ───────────── Aides de pilotage ─────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (page, text, selector = "button, a, [role=button]") =>
  page.evaluate(
    (t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || "").trim().includes(t) || (e.getAttribute("aria-label") || "").includes(t));
      if (!el) throw new Error(`Élément introuvable : ${t}`);
      el.click();
    },
    text,
    selector
  );
const scrollTo = (page, selector) => page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), selector);

const baseScenarios = [
  { file: "tableau-de-bord", alt: "Tableau de bord : énergie restante estimée, consommation du mois et prédiction de fin de crédit", run: async () => {} },
  { file: "calcul", alt: "Outil de calcul : montant vers kWh selon la tranche tarifaire", run: async (p) => clickText(p, "Outil Calcul") },
  { file: "historique", alt: "Historique des consommations et des recharges", run: async (p) => clickText(p, "Historique") },
  { file: "services-recharge", alt: "Onglet Services : recharge par MTN MoMo ou Orange Money", run: async (p) => clickText(p, "Services") },
  {
    file: "credit-urgence",
    alt: "Crédit d'urgence 811 suivi comme une dette de kWh à rembourser",
    run: async (p) => {
      await clickText(p, "Services");
      await sleep(400);
      await scrollTo(p, "#emergency-credit");
    },
  },
  {
    file: "import-sms",
    alt: "Import d'une recharge depuis un SMS : valeurs reconnues et contrôles du compteur",
    run: async (p) => {
      await clickText(p, "Ajouter");
      await sleep(300);
      await clickText(p, "Recharge depuis un SMS");
      await sleep(400);
      await p.evaluate((sms) => {
        const ta = document.querySelector("textarea");
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, sms);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }, DEMO_SMS);
    },
  },
  {
    file: "notifications",
    alt: "Cloche de notifications et liste des alertes en cours",
    run: async (p) => {
      await clickText(p, "notification");
    },
  },
  { file: "mode-sombre", alt: "Tableau de bord en mode sombre", theme: "dark", run: async () => {} },
  {
    file: "tiroir-navigation",
    alt: "Tiroir de navigation : tableau de bord, profil, paramètres, aide",
    run: async (p) => {
      await clickText(p, "Ouvrir le menu");
    },
  },
  {
    file: "visite-guidee",
    alt: "Visite guidée : surbrillance du tableau de bord avec explication",
    run: async (p) => {
      await clickText(p, "Ouvrir le menu");
      await sleep(300);
      await clickText(p, "Aide");
      await sleep(500);
      await clickText(p, "Revoir la présentation");
      await sleep(500);
      await clickText(p, "Suivant");
      await sleep(900);
    },
  },
  { file: "grand-ecran", alt: "Application sur grand écran : barre latérale et tableau de bord", viewport: DESKTOP, run: async () => {} },
];

// Option --tour-steps : une capture par étape de la visite complète (contrôle visuel de la mise en page)
const tourSteps = Array.from({ length: 9 }, (_, i) => ({
  file: `visite-etape-${i + 1}`,
  alt: `Visite guidée, étape ${i + 1}`,
  run: async (p) => {
    await clickText(p, "Ouvrir le menu");
    await sleep(300);
    await clickText(p, "Aide");
    await sleep(500);
    await clickText(p, "Revoir la présentation");
    await sleep(500);
    for (let k = 0; k < i; k++) {
      await clickText(p, "Suivant");
      await sleep(450);
    }
    await sleep(900);
  },
}));
const scenarios = process.argv.includes("--tour-steps") ? tourSteps : baseScenarios;

// ───────────── Exécution ─────────────
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const cleanup = () => server.kill();
process.on("exit", cleanup);

for (let i = 0; i < 40; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {}
  await sleep(500);
}

const browser = await puppeteer.launch({
  args: [...chromium.args, "--no-sandbox"],
  executablePath: await chromium.executablePath(),
  headless: "shell",
});
const report = [];

for (const sc of scenarios) {
  const page = await browser.newPage();
  await page.setViewport(sc.viewport ?? MOBILE);
  // Aucune requête hors de l'application (polices Google, etc.)
  await page.setRequestInterception(true);
  page.on("request", (req) => (req.url().startsWith(BASE) || req.url().startsWith("data:") || req.url().startsWith("blob:") ? req.continue() : req.abort()));
  await page.evaluateOnNewDocument(
    (state, auth) => {
      localStorage.setItem("eneo_app_data", JSON.stringify(state));
      localStorage.setItem("eneo_app_auth", JSON.stringify(auth));
      localStorage.setItem("kwawatt_tour_seen", "1"); // pas de visite automatique
      localStorage.setItem("kwawatt_notif_asked", "1"); // pas d'invite de notifications
    },
    demoState(sc.theme ?? "light"),
    { type: "visitor", name: "Visiteur", lastActive: Date.now() }
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "load" });
  await sleep(1800);
  await sc.run(page);
  await sleep(900);
  const path = join(OUT, `${sc.file}.webp`);
  await page.screenshot({ path, type: "webp", quality: 82 });
  report.push({ file: sc.file, ko: Math.round(statSync(path).size / 1024), errors });
  await page.close();
}

await browser.close();
cleanup();
console.table(report.map((r) => ({ fichier: r.file + ".webp", "Ko": r.ko, erreurs_page: r.errors.length })));
for (const r of report) for (const e of r.errors) console.error(`[${r.file}] ${e}`);

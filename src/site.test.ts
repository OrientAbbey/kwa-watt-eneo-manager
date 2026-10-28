import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const SITE = join(ROOT, "site");
const read = (f: string) => readFileSync(join(SITE, f), "utf-8");
const index = read("index.html");
const privacy = read("confidentialite.html");
const pages = { "index.html": index, "confidentialite.html": privacy };
const DOWNLOAD = "https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases/latest/download/kwa-watt.apk";

describe("page de présentation : contenu et SEO", () => {
  it("balises essentielles : langue, titre, description, canonique, Open Graph", () => {
    expect(index).toMatch(/<html lang="fr">/);
    expect(index).toMatch(/<title>[^<]{20,}<\/title>/);
    const desc = /<meta name="description" content="([^"]+)"/.exec(index)?.[1] ?? "";
    expect(desc.length).toBeGreaterThan(70);
    expect(desc.length).toBeLessThanOrEqual(200);
    expect(index).toContain('<link rel="canonical" href="https://orientabbey.github.io/kwa-watt-eneo-manager/">');
    for (const p of ["og:title", "og:description", "og:image", "og:url", "og:type"]) expect(index).toContain(`property="${p}"`);
    expect(index).toContain('name="twitter:card"');
  });
  it("JSON-LD SoftwareApplication valide, gratuit, avec le lien de téléchargement stable", () => {
    const raw = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/.exec(index)?.[1] ?? "";
    const ld = JSON.parse(raw);
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.operatingSystem).toMatch(/Android/);
    expect(ld.offers.price).toBe("0");
    expect(ld.downloadUrl).toBe(DOWNLOAD);
    expect(ld.aggregateRating).toBeUndefined(); // aucune note inventée
  });
  it("contient les sections demandées : problème / solution, fonctions, 3 étapes, confidentialité, installation, FAQ", () => {
    for (const id of ["probleme", "fonctions", "comment", "confidentialite", "installer", "faq"]) expect(index).toContain(`id="${id}`);
    expect((index.match(/<ol class="steps">/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(index).toMatch(/SHA-256/);
    expect(index).toMatch(/Sources inconnues|sources inconnues|applications inconnues/);
  });
  it("mention d'indépendance (ENEO / SOCADEL, MTN, Orange) sur les deux pages ; aucun logo de marque", () => {
    for (const html of Object.values(pages)) expect(html).toMatch(/ni à ENEO \/ SOCADEL, ni à MTN, ni à Orange/);
    const files = readdirSync(join(SITE, "img"));
    expect(files.join(" ")).not.toMatch(/eneo|socadel|mtn|orange/i);
  });
  it("une seule balise h1 par page, hiérarchie des titres sans saut", () => {
    for (const [name, html] of Object.entries(pages)) {
      expect((html.match(/<h1[ >]/g) ?? []).length, name).toBe(1);
      const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `${name} : saut de titre`).toBeLessThanOrEqual(1);
    }
  });
});

describe("page de présentation : légèreté, vie privée, accessibilité", () => {
  it("CSP stricte, aucun script ni style en ligne, aucune ressource externe chargée", () => {
    for (const [name, html] of Object.entries(pages)) {
      expect(html, name).toContain("Content-Security-Policy");
      expect(html, name).not.toMatch(/\sstyle="/);
      expect(html, name).not.toMatch(/<style[ >]/);
      expect(html, name).not.toMatch(/<script(?![^>]*(src=|type="application\/ld\+json"))[^>]*>/);
      // aucune ressource tierce (script, feuille de style, image, police) : seuls des liens <a> sortants sont permis
      expect(html, name).not.toMatch(/<(?:script|img|iframe|source|video|audio)\b[^>]*\ssrc="https?:\/\//);
      expect(html, name).not.toMatch(/<link\b[^>]*rel="(?:stylesheet|icon|preload|modulepreload|prefetch|preconnect|dns-prefetch)"[^>]*href="https?:\/\//);
    }
    expect(index).toContain("connect-src https://api.github.com");
    expect(privacy).not.toContain("connect-src");
  });
  it("aucun traqueur ni police distante", () => {
    const all = readdirSync(SITE).filter((f) => /\.(html|css|js)$/.test(f)).map(read).join("\n");
    expect(all).not.toMatch(/google-analytics|googletagmanager|gtag|fbq\(|hotjar|plausible|matomo|fonts\.(googleapis|gstatic)|@import/i);
  });
  it("chaque image a un texte alternatif et des dimensions ; seule l'image principale est chargée tout de suite", () => {
    const imgs = [...index.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/logo\.svg/.test(t));
    expect(imgs.length).toBeGreaterThanOrEqual(5);
    for (const tag of imgs) {
      expect(tag).toMatch(/\balt="[^"]{10,}"/);
      expect(tag).toMatch(/\bwidth="\d+"/);
      expect(tag).toMatch(/\bheight="\d+"/);
    }
    const eager = imgs.filter((t) => !/loading="lazy"/.test(t));
    expect(eager).toHaveLength(1);
    expect(eager[0]).toContain("fetchpriority=\"high\"");
  });
  it("lien « passer au contenu » et liens externes sans fuite de contexte", () => {
    expect(index).toMatch(/class="skip" href="#contenu"/);
    expect(index).toContain('id="contenu"');
  });
  it("mode sombre et mouvement réduit gérés dans la feuille de style", () => {
    const css = read("style.css");
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(":focus-visible");
  });
  it("poids total du site (hors image de partage og.png, jamais chargée par les visiteurs) < 300 Ko", () => {
    const files = (readdirSync(SITE, { recursive: true }) as string[]).filter((f) => statSync(join(SITE, f)).isFile() && f !== "og.png");
    const total = files.reduce((t, f) => t + statSync(join(SITE, f)).size, 0);
    expect(total / 1024).toBeLessThan(300);
  });
  it("chaque image du dossier img/ pèse moins de 40 Ko", () => {
    for (const f of readdirSync(join(SITE, "img"))) expect(statSync(join(SITE, "img", f)).size / 1024, f).toBeLessThan(40);
  });
});

describe("page de présentation : liens et cohérence avec la publication", () => {
  it("tous les liens et ressources locaux existent", () => {
    for (const [name, html] of Object.entries(pages)) {
      for (const m of html.matchAll(/(?:src|href)="([^"#:]+)(?:#[^"]*)?"/g)) {
        const target = m[1] === "./" ? "index.html" : m[1];
        expect(existsSync(join(SITE, target)), `${name} : ${target} introuvable`).toBe(true);
      }
    }
  });
  it("les ancres internes (#…) existent dans la page", () => {
    const ids = new Set([...index.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of index.matchAll(/href="#([^"]+)"/g)) expect(ids.has(m[1]), `ancre #${m[1]}`).toBe(true);
  });
  it("le bouton de téléchargement et le workflow de publication utilisent le MÊME nom de fichier stable", () => {
    expect(index).toContain(DOWNLOAD);
    expect(readFileSync(join(ROOT, ".github/workflows/release-apk.yml"), "utf-8")).toContain("kwa-watt.apk");
    expect(readFileSync(join(ROOT, "README.md"), "utf-8")).toContain(DOWNLOAD);
    expect(readFileSync(join(SITE, "app.js"), "utf-8")).toContain('"kwa-watt.apk"');
  });
  it("tous les liens APK ont un fallback utilisable vers les versions, même sans JavaScript", () => {
    const links = [...index.matchAll(/<a([^>]*data-release-download[^>]*)>/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThanOrEqual(2); // héros + section d'installation
    for (const link of links) expect(link).toContain('href="https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases"');
    const main = /<a id="download"[^>]*href="([^"]+)"/.exec(index)?.[1];
    expect(main).toBe("https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases");
  });
  it("le script bascule tous les liens vers l'APK seulement si la release le fournit", () => {
    const js = read("app.js");
    expect(js).toMatch(/404/);
    expect(js).toContain('querySelectorAll("[data-release-download]")');
    expect(js).toContain("link.href = DOWNLOAD");
    expect(js).toContain("link.textContent = \"Télécharger l'APK (Android)\"");
  });
  it("la politique de confidentialité cite les points sensibles : Google Fonts, API GitHub, suppression du compte", () => {
    expect(privacy).toMatch(/Google Fonts/);
    expect(privacy).toMatch(/api\.github\.com/);
    expect(privacy).toMatch(/Supprimer mon compte/);
    expect(privacy).toMatch(/aucune publicité/i);
  });
  it("le workflow Pages publie le dossier site/", () => {
    const wf = readFileSync(join(ROOT, ".github/workflows/pages.yml"), "utf-8");
    expect(wf).toContain("path: site");
    expect(wf).toContain("actions/deploy-pages");
  });
});

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const readme = readFileSync(join(ROOT, "README.md"), "utf-8");
const dir = join(ROOT, "docs", "diagrams");
const sources = readdirSync(dir).filter((f) => f.endsWith(".mmd")).sort();

// Blocs ```mermaid du README
const blocks = [...readme.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);

describe("diagrammes Mermaid du README", () => {
  it("il y a un fichier source par diagramme demandé", () => {
    expect(sources).toEqual(["architecture.mmd", "ci-cd.mmd", "import-sms.mmd", "modele-donnees.mmd", "notifications.mmd", "synchronisation.mmd"]);
  });
  it("le README intègre chaque source docs/diagrams/*.mmd à l'identique (pas de dérive entre les deux)", () => {
    for (const f of sources) {
      const src = readFileSync(join(dir, f), "utf-8").trimEnd() + "\n";
      expect(blocks, `${f} absent du README ou différent de sa source`).toContain(src);
    }
  });
  it("le README ne contient aucun bloc Mermaid sans source versionnée", () => {
    const all = sources.map((f) => readFileSync(join(dir, f), "utf-8").trimEnd() + "\n");
    for (const b of blocks) expect(all).toContain(b);
  });
  it("chaque diagramme commence par un type Mermaid connu et reste simple (≤ 60 lignes)", () => {
    for (const f of sources) {
      const lines = readFileSync(join(dir, f), "utf-8").trim().split("\n");
      expect(lines[0]).toMatch(/^(flowchart (TB|TD|LR)|sequenceDiagram|erDiagram)$/);
      expect(lines.length).toBeLessThanOrEqual(60);
    }
  });
  it("les liens relatifs du README pointent vers des fichiers qui existent", () => {
    const links = [...readme.matchAll(/\]\((\.\/[^)#\s]+)\)/g)].map((m) => m[1]);
    const imgs = [...readme.matchAll(/src="(docs\/[^"]+)"/g)].map((m) => "./" + m[1]);
    for (const l of new Set([...links, ...imgs])) {
      expect(existsSync(join(ROOT, l)), `lien cassé : ${l}`).toBe(true);
    }
  });
  it("le README contient la mention d'indépendance et la licence", () => {
    expect(readme).toMatch(/Application indépendante/);
    expect(readme).toMatch(/ni à ENEO \/ SOCADEL, ni à MTN, ni à Orange/);
    expect(readme).toMatch(/Apache/);
  });
});

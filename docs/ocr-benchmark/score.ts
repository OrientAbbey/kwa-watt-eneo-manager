// Score chaque moteur OCR : (1) champs extraits correctement par le parseur de l'application, (2) taux d'erreur de
// caractères (CER), (3) temps. Usage : npx tsx docs/ocr-benchmark/score.ts <corpus> <dossier_resultats>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseRechargeSms, type ParsedSms } from "../../src/lib/smsParser.ts";

const [corpus, resDir] = process.argv.slice(2);
const FIELDS: (keyof ParsedSms)[] = ["montant", "kwh", "meterNumber", "transactionRef", "receiptNo", "fees", "token", "date"];
const CRITICAL: (keyof ParsedSms)[] = ["montant", "kwh", "meterNumber", "transactionRef", "token"];

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
function cer(ref: string, hyp: string): number {
  const a = squash(ref), b = squash(hyp);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length] / Math.max(1, a.length);
}

// Groupes : captures propres (claire+sombre), photo modérée, photo très dégradée (pire cas), 42 variantes aléatoires
const groupOf = (variant: string) =>
  variant === "light" || variant === "dark" ? "captures" : /^x\d+$/.test(variant) ? "aleatoire" : variant;
const variants = ["captures", "photo", "aleatoire", "photo_hard"];
const rows: string[] = [];
for (const f of readdirSync(resDir).filter((f) => f.endsWith(".json")).sort()) {
  const r = JSON.parse(readFileSync(join(resDir, f), "utf8"));
  const stat: Record<string, { all: number[]; crit: number[]; cer: number[]; ms: number[] }> = {};
  for (const v of variants) stat[v] = { all: [], crit: [], cer: [], ms: [] };
  for (const [img, { text, ms }] of Object.entries<{ text: string; ms: number }>(r.images)) {
    const [name, rawVariant] = img.replace(/\.(png|jpg)$/, "").split("__");
    const variant = groupOf(rawVariant);
    const truth = readFileSync(join(corpus, `${name}.txt`), "utf8");
    const ref = parseRechargeSms(truth);
    const got = parseRechargeSms(text);
    const score = (keys: (keyof ParsedSms)[]) => {
      const present = keys.filter((k) => ref[k] !== undefined);
      return present.filter((k) => got[k] === ref[k]).length / Math.max(1, present.length);
    };
    stat[variant].all.push(score(FIELDS));
    stat[variant].crit.push(score(CRITICAL));
    stat[variant].cer.push(cer(truth, text));
    stat[variant].ms.push(ms);
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  rows.push(
    `| ${r.config} | ${variants.map((v) => `${pct(avg(stat[v].crit))} / ${pct(avg(stat[v].cer))}`).join(" | ")} | ${Math.round(avg(variants.flatMap((v) => stat[v].ms)))} ms | ${r.initMs} ms |`
  );
}
console.log("| Moteur / modèle | Captures propres (6) | Photo modérée (3) | Aléatoire modéré (42) | Photo très dégradée (3) | Temps moyen / image | Init |");
console.log("|---|---|---|---|---|---|---|");
console.log(rows.join("\n"));
console.log("\nCellule = champs critiques corrects (montant, kWh, compteur, référence, jeton) / erreur de caractères (CER).");

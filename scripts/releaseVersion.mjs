#!/usr/bin/env node
/**
 * Schéma de version : tag git `vMAJEUR.MINEUR.CORRECTIF` = version de package.json = versionName Android.
 *   versionCode = MAJEUR × 10000 + MINEUR × 100 + CORRECTIF   (1.1.0 → 10100 ; toujours croissant avec le tag)
 * Le versionCode doit augmenter à chaque publication, sinon Android refuse la mise à jour par-dessus l'installation existante.
 *
 * CLI (utilisé par .github/workflows/release-apk.yml) :
 *   node scripts/releaseVersion.mjs v1.2.3 [--check-package]
 * écrit sur la sortie standard des lignes `clé=valeur` à ajouter à $GITHUB_OUTPUT ; code de sortie 1 + message si invalide.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TAG = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** @param {string} input tag (`v1.2.3`) ou version (`1.2.3`) */
export function parseVersion(input) {
  const m = TAG.exec(String(input).trim());
  if (!m) throw new Error(`Version invalide « ${input} » : attendu vMAJEUR.MINEUR.CORRECTIF (ex. v1.2.0), sans suffixe.`);
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (minor > 99 || patch > 99) throw new Error(`Version invalide « ${input} » : MINEUR et CORRECTIF doivent rester ≤ 99 (versionCode = M×10000 + m×100 + p).`);
  if (major > 200) throw new Error(`Version invalide « ${input} » : MAJEUR ≤ 200 (limite du versionCode Android).`);
  return { major, minor, patch, versionName: `${major}.${minor}.${patch}`, versionCode: major * 10000 + minor * 100 + patch, tag: `v${major}.${minor}.${patch}` };
}

/** Compare deux versions : négatif si a < b. */
export const compareVersions = (a, b) => parseVersion(a).versionCode - parseVersion(b).versionCode;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const [, , tag, ...flags] = process.argv;
    if (!tag) throw new Error("Usage : node scripts/releaseVersion.mjs v1.2.3 [--check-package]");
    const v = parseVersion(tag);
    if (flags.includes("--check-package")) {
      const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
      if (pkg.version !== v.versionName) {
        throw new Error(`Le tag ${v.tag} ne correspond pas à package.json (version « ${pkg.version} »). Mettez package.json à jour (npm version ${v.versionName} --no-git-tag-version), committez, puis recréez le tag.`);
      }
    }
    console.log(`version_name=${v.versionName}\nversion_code=${v.versionCode}\ntag=${v.tag}`);
  } catch (e) {
    console.error(`::error::${e.message}`);
    process.exit(1);
  }
}

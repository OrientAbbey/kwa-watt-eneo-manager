import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-ignore : module JavaScript pur (script de CI), sans déclaration de types
import { parseVersion, compareVersions } from "../../scripts/releaseVersion.mjs";

describe("schéma de version (tag → versionName / versionCode Android)", () => {
  it("1.1.0 → 10100 ; 2.0.3 → 20003 ; 0.9.12 → 912", () => {
    expect(parseVersion("v1.1.0")).toMatchObject({ versionName: "1.1.0", versionCode: 10100, tag: "v1.1.0" });
    expect(parseVersion("2.0.3").versionCode).toBe(20003);
    expect(parseVersion("v0.9.12").versionCode).toBe(912);
  });
  it("le versionCode augmente avec la version (condition d'une mise à jour Android)", () => {
    const order = ["1.0.0", "1.0.1", "1.0.99", "1.1.0", "1.99.99", "2.0.0", "10.0.0"];
    const codes = order.map((v) => parseVersion(v).versionCode);
    expect(codes).toEqual([...codes].sort((a, b) => a - b));
    expect(new Set(codes).size).toBe(codes.length);
    expect(compareVersions("1.2.0", "1.10.0")).toBeLessThan(0); // pas de comparaison alphabétique
  });
  it("la première version publiée dépasse le versionCode 1 de l'ancienne configuration", () => {
    expect(parseVersion("1.1.0").versionCode).toBeGreaterThan(1);
  });
  it.each(["1.1", "v1.1.0-beta", "1.1.0.1", "latest", "", "v01.1.0", "v1.100.0", "v1.0.100", "v999.0.0"])("refuse %j", (bad) => {
    expect(() => parseVersion(bad)).toThrow(/invalide/);
  });
  it("le tag publié doit correspondre à package.json (sinon la CI s'arrête)", () => {
    const run = (tag: string) => execFileSync("node", ["scripts/releaseVersion.mjs", tag, "--check-package"], { cwd: join(__dirname, "../.."), encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    const pkg = JSON.parse(execFileSync("node", ["-p", "JSON.stringify(require('./package.json'))"], { cwd: join(__dirname, "../.."), encoding: "utf-8" }));
    expect(run(`v${pkg.version}`)).toContain(`version_name=${pkg.version}`);
    expect(() => run("v9.9.9")).toThrow();
  });

  it("les valeurs par défaut de build.gradle suivent package.json (builds locaux cohérents avec la version affichée)", () => {
    const root = join(__dirname, "../..");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
    const gradle = readFileSync(join(root, "android/app/build.gradle"), "utf-8");
    const name = /findProperty\('appVersionName'\) \?: '([^']+)'/.exec(gradle)?.[1];
    const code = /findProperty\('appVersionCode'\) \?: '([^']+)'/.exec(gradle)?.[1];
    expect(name).toBe(pkg.version);
    expect(Number(code)).toBe(parseVersion(pkg.version).versionCode);
  });
  it("la signature de release n'est lue que dans l'environnement (aucun mot de passe de release dans le dépôt)", () => {
    const gradle = readFileSync(join(__dirname, "../../android/app/build.gradle"), "utf-8");
    expect(gradle).toContain("System.getenv('RELEASE_KEYSTORE_PASSWORD')");
    expect(gradle).not.toMatch(/release[\s\S]{0,200}storePassword\s+'/);
  });
});

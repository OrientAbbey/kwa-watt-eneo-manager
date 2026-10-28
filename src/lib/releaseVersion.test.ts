import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Android release version schema", () => {
  const root = join(__dirname, "../..");
  const run = (tag: string, checkPackage = false) =>
    execFileSync("node", ["scripts/releaseVersion.mjs", tag, ...(checkPackage ? ["--check-package"] : [])], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const versionCode = (tag: string) => Number(/^version_code=(\d+)$/m.exec(run(tag))?.[1]);

  it("calculates version name and Android version code", () => {
    expect(run("v1.1.0")).toContain("version_name=1.1.0");
    expect(versionCode("v1.1.0")).toBe(10100);
    expect(versionCode("2.0.3")).toBe(20003);
    expect(versionCode("v0.9.12")).toBe(912);
  });
  it("version code increases with the version components", () => {
    const order = ["1.0.0", "1.0.1", "1.0.99", "1.1.0", "1.99.99", "2.0.0", "10.0.0"];
    const codes = order.map(versionCode);
    expect(codes).toEqual([...codes].sort((a, b) => a - b));
    expect(new Set(codes).size).toBe(codes.length);
    expect(versionCode("1.2.0")).toBeLessThan(versionCode("1.10.0"));
  });
  it("first release version exceeds the previous default version code", () => {
    expect(versionCode("1.1.0")).toBeGreaterThan(1);
  });
  it.each(["1.1", "v1.1.0-beta", "1.1.0.1", "latest", "", "v01.1.0", "v1.100.0", "v1.0.100", "v999.0.0"])("rejects invalid tag %j", (bad) => {
    expect(() => run(bad)).toThrow();
  });
  it("requires the release tag to match package.json", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
    expect(run("v" + pkg.version, true)).toContain("version_name=" + pkg.version);
    expect(() => run("v9.9.9", true)).toThrow();
  });
  it("keeps the local Gradle defaults aligned with package.json", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
    const gradle = readFileSync(join(root, "android/app/build.gradle"), "utf-8");
    const name = /findProperty\('appVersionName'\) \?: '([^']+)'/.exec(gradle)?.[1];
    const code = /findProperty\('appVersionCode'\) \?: '([^']+)'/.exec(gradle)?.[1];
    expect(name).toBe(pkg.version);
    expect(Number(code)).toBe(versionCode(pkg.version));
  });
  it("reads release signing credentials from the environment, not source literals", () => {
    const gradle = readFileSync(join(root, "android/app/build.gradle"), "utf-8");
    expect(gradle).toContain("System.getenv('RELEASE_KEYSTORE_PASSWORD')");
    expect(gradle).not.toMatch(/release[\s\S]{0,200}storePassword\s+'/);
  });
});

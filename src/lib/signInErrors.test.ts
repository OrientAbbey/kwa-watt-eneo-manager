import { describe, it, expect } from "vitest";
import { describeSignInError, OFFLINE_MESSAGE } from "./signInErrors";
import { probeInternet } from "./connectivity";

describe("describeSignInError", () => {
  const cancelled = Object.assign(new Error("Google Sign-In cancelled by user"), { code: "USER_CANCELLED" });

  it("hors connexion : explique l'absence de réseau, quelle que soit l'erreur (même « cancelled by user »)", () => {
    const r = describeSignInError(cancelled, false);
    expect(r.kind).toBe("offline");
    expect(r.message).toBe(OFFLINE_MESSAGE);
    expect(r.message).toMatch(/Connexion internet absente/);
    expect(r.message).toMatch(/mode visiteur/);
  });
  it("en ligne et vraiment annulée : message d'annulation clair, sans le texte technique anglais", () => {
    const r = describeSignInError(cancelled, true);
    expect(r.kind).toBe("cancelled");
    expect(r.message).not.toMatch(/cancelled by user/i);
    expect(r.message).toMatch(/annulée/);
  });
  it("reconnaît les erreurs réseau (code Firebase ou texte)", () => {
    expect(describeSignInError({ code: "auth/network-request-failed" }, true).kind).toBe("network");
    expect(describeSignInError(new Error("Unable to resolve host accounts.google.com"), true).kind).toBe("network");
    expect(describeSignInError(new Error("timeout"), true).kind).toBe("network");
  });
  it("garde le détail pour une erreur inconnue", () => {
    const r = describeSignInError(new Error("Quelque chose d'inattendu"), true);
    expect(r.kind).toBe("unknown");
    expect(r.message).toContain("Quelque chose d'inattendu");
  });
  it("supporte les valeurs non-Error", () => {
    expect(describeSignInError("boom", true).message).toContain("boom");
    expect(describeSignInError(undefined, true).kind).toBe("unknown");
  });
});

describe("probeInternet", () => {
  it("vrai quand le point de contrôle répond", async () => {
    expect(await probeInternet(1000, (async () => new Response(null, { status: 204 })) as any)).toBe(true);
  });
  it("faux quand la requête échoue (pas d'internet malgré un Wi‑Fi connecté)", async () => {
    expect(await probeInternet(1000, (async () => { throw new TypeError("Failed to fetch"); }) as any)).toBe(false);
  });
  it("faux (et sans attendre indéfiniment) quand la requête ne répond jamais", async () => {
    const hang = ((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener("abort", () => rej(new Error("aborted"))))) as any;
    const t0 = Date.now();
    expect(await probeInternet(150, hang)).toBe(false);
    expect(Date.now() - t0).toBeLessThan(1500);
  });
});

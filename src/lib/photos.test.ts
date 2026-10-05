import { describe, it, expect } from "vitest";
import { extractPhotos, injectPhotos, hashString, photoKey } from "./photos";
import { INITIAL_STATE } from "../constants";
import { AppState } from "../types";

const withPhotos = (): AppState => ({
  ...INITIAL_STATE,
  meters: [{ ...INITIAL_STATE.meters[0], profile: { ...INITIAL_STATE.meters[0].profile, photoRecto: "data:image/jpeg;base64,AAA", photoMeter: "data:image/jpeg;base64,BBB" } }],
  helpImages: ["data:image/jpeg;base64,HHH", "https://exemple.cm/aide.png"],
});

describe("photos", () => {
  it("extrait les photos du state synchronisé", () => {
    const { stripped, photos } = extractPhotos(withPhotos());
    expect(stripped.meters[0].profile.photoRecto).toBeUndefined();
    expect(stripped.meters[0].profile.photoMeter).toBeUndefined();
    expect(stripped.helpImages).toEqual(["https://exemple.cm/aide.png"]);
    expect(Object.keys(photos).sort()).toEqual(["default-meter__photoMeter", "default-meter__photoRecto", "help__0"]);
    expect(JSON.stringify(stripped)).not.toContain("base64");
  });

  it("réinjecte les photos après extraction (aller-retour)", () => {
    const original = withPhotos();
    const { stripped, photos } = extractPhotos(original);
    const restored = injectPhotos(stripped, photos);
    expect(restored.meters[0].profile.photoRecto).toBe("data:image/jpeg;base64,AAA");
    expect(restored.helpImages).toContain("data:image/jpeg;base64,HHH");
    expect(restored.helpImages).toContain("https://exemple.cm/aide.png");
  });

  it("produit des clés valides pour les règles Firestore", () => {
    expect(photoKey("meter_123", "photoRecto")).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(photoKey("id avec espace/é", "photoMeter")).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("détecte un changement de contenu par le hash", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});

import { planPhotoSync, hashString as H } from "./photos";

describe("planPhotoSync", () => {
  const A = "data:image/jpeg;base64,AAA", B = "data:image/jpeg;base64,BBB", C = "data:image/jpeg;base64,CCC";
  const man = (o: Record<string, [string, number]>) => Object.fromEntries(Object.entries(o).map(([k, [d, t]]) => [k, { h: H(d), t }]));

  it("nouvel appareil : télécharge tout ce qui est dans le cloud", () => {
    const p = planPhotoSync({ local: {}, remote: { x: { data: A, t: 5 } }, manifest: {} });
    expect(p.take).toEqual({ x: A });
    expect(p.upload).toEqual([]);
  });
  it("une photo supprimée ICI n'est pas re-téléchargée : elle est supprimée du cloud", () => {
    const p = planPhotoSync({ local: {}, remote: { x: { data: A, t: 5 } }, manifest: man({ x: [A, 5] }) });
    expect(p.take).toEqual({});
    expect(p.deleteRemote).toEqual(["x"]);
  });
  it("supprimée ici mais modifiée ailleurs depuis : on garde la version distante", () => {
    const p = planPhotoSync({ local: {}, remote: { x: { data: B, t: 9 } }, manifest: man({ x: [A, 5] }) });
    expect(p.take).toEqual({ x: B });
    expect(p.deleteRemote).toEqual([]);
  });
  it("modifiée ailleurs seulement : adoptée", () => {
    const p = planPhotoSync({ local: { x: A }, remote: { x: { data: B, t: 9 } }, manifest: man({ x: [A, 5] }) });
    expect(p.take).toEqual({ x: B });
  });
  it("modifiée ici : envoyée ; conflit (modifiée des deux côtés) : cet appareil gagne", () => {
    expect(planPhotoSync({ local: { x: B }, remote: { x: { data: A, t: 5 } }, manifest: man({ x: [A, 5] }) }).upload).toEqual(["x"]);
    expect(planPhotoSync({ local: { x: B }, remote: { x: { data: C, t: 9 } }, manifest: man({ x: [A, 5] }) }).upload).toEqual(["x"]);
  });
  it("supprimée ailleurs (absente du cloud, connue ici et inchangée) : retirée d'ici", () => {
    const p = planPhotoSync({ local: { x: A }, remote: {}, manifest: man({ x: [A, 5] }) });
    expect(p.removeLocal).toEqual(["x"]);
  });
  it("supprimée ailleurs mais modifiée ici : renvoyée", () => {
    const p = planPhotoSync({ local: { x: B }, remote: {}, manifest: man({ x: [A, 5] }) });
    expect(p.upload).toEqual(["x"]);
    expect(p.removeLocal).toEqual([]);
  });
  it("nouvelle photo locale : envoyée ; identique des deux côtés : seulement mémorisée", () => {
    expect(planPhotoSync({ local: { n: A }, remote: {}, manifest: {} }).upload).toEqual(["n"]);
    expect(planPhotoSync({ local: { n: A }, remote: { n: { data: A, t: 1 } }, manifest: {} }).record).toEqual(["n"]);
  });
  it("synchro légère (sans listing du cloud) : n'envoie que le modifié et supprime ce qui a été retiré ici", () => {
    const p = planPhotoSync({ local: { a: A, b: C }, remote: null, manifest: man({ a: [A, 5], b: [B, 5], gone: [A, 5] }) });
    expect(p.upload).toEqual(["b"]);
    expect(p.deleteRemote).toEqual(["gone"]);
    expect(p.take).toEqual({});
    expect(p.removeLocal).toEqual([]);
  });
  it("ne ressuscite jamais une image d'aide supprimée au milieu de la liste (index décalés)", () => {
    // avant : help__0=I0, help__1=I1, help__2=I2 ; on supprime I0 → local : help__0=I1, help__1=I2
    const I0 = "data:i0", I1 = "data:i1", I2 = "data:i2";
    const p = planPhotoSync({
      local: { help__0: I1, help__1: I2 },
      remote: { help__0: { data: I0, t: 5 }, help__1: { data: I1, t: 5 }, help__2: { data: I2, t: 5 } },
      manifest: man({ help__0: [I0, 5], help__1: [I1, 5], help__2: [I2, 5] }),
    });
    expect(p.take).toEqual({});
    expect(p.upload.sort()).toEqual(["help__0", "help__1"]);
    expect(p.deleteRemote).toEqual(["help__2"]);
  });
  it("après un échec d'écriture locale : restaure depuis le cloud au lieu de l'y supprimer", () => {
    const p = planPhotoSync({ local: {}, remote: { x: { data: A, t: 5 } }, manifest: man({ x: [A, 5] }), trustLocalDeletions: false });
    expect(p.take).toEqual({ x: A });
    expect(p.deleteRemote).toEqual([]);
    const light = planPhotoSync({ local: {}, remote: null, manifest: man({ x: [A, 5] }), trustLocalDeletions: false });
    expect(light.deleteRemote).toEqual([]);
  });
});

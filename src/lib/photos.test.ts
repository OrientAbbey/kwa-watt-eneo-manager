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

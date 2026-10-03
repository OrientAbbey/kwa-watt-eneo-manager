import { describe, it, expect } from "vitest";
import {
  CANCELLED_MESSAGE,
  CONFIG_MESSAGE,
  GENERIC_MESSAGE,
  GoogleSignInError,
  OFFLINE_MESSAGE,
  describeSignInError,
  isOffline,
} from "./signInErrors";

const setOnline = (value: boolean) => {
  Object.defineProperty(globalThis.navigator, "onLine", { value, configurable: true });
};

describe("describeSignInError", () => {
  it("traduit « annulée par l'utilisateur » du plugin natif", () => {
    const e: any = new Error("Google Sign-In cancelled by user");
    e.code = "USER_CANCELLED";
    expect(describeSignInError(e)).toBe(CANCELLED_MESSAGE);
  });

  it("reconnaît l'annulation même sans le code du plugin", () => {
    expect(describeSignInError(new Error("Google Sign-In canceled by user"))).toBe(CANCELLED_MESSAGE);
    expect(describeSignInError(Object.assign(new Error("x"), { code: "auth/popup-closed-by-user" }))).toBe(CANCELLED_MESSAGE);
  });

  it("explique l'absence de connexion Internet quand le réseau manque", () => {
    expect(describeSignInError(Object.assign(new Error("x"), { code: "auth/network-request-failed" }))).toBe(OFFLINE_MESSAGE);
    expect(describeSignInError(new Error("Error resolving Google login: unable to resolve host"))).toBe(OFFLINE_MESSAGE);
  });

  it("déclare hors ligne même si l'erreur est muette", () => {
    setOnline(false);
    expect(isOffline()).toBe(true);
    expect(describeSignInError(new Error("Google Sign-In cancelled by user"))).toBe(OFFLINE_MESSAGE);
    setOnline(true);
    expect(isOffline()).toBe(false);
  });

  it("priorise l'annulation explicite quand le téléphone se croit en ligne", () => {
    setOnline(true);
    expect(describeSignInError(Object.assign(new Error("cancelled by user"), { code: "USER_CANCELLED" }))).toBe(CANCELLED_MESSAGE);
  });
  it("garde le message de configuration Android", () => {
    expect(describeSignInError(Object.assign(new Error("x"), { code: "10" }))).toBe(CONFIG_MESSAGE);
    expect(describeSignInError(new Error("Google Sign-In failed: Client ID is not set"))).toBe(CONFIG_MESSAGE);
  });

  it("retombe sur un message générique en français (jamais le texte brut du plugin)", () => {
    expect(describeSignInError(new Error("Something went sideways 42"))).toBe(GENERIC_MESSAGE);
    expect(describeSignInError(undefined)).toBe(GENERIC_MESSAGE);
    expect(describeSignInError("boom")).toBe(GENERIC_MESSAGE);
  });

  it("respecte le message déjà traduit de GoogleSignInError", () => {
    expect(describeSignInError(new GoogleSignInError("offline", OFFLINE_MESSAGE))).toBe(OFFLINE_MESSAGE);
    expect(describeSignInError(new GoogleSignInError("no-token", "Connexion Google annulée ou aucun jeton reçu."))).toBe(
      "Connexion Google annulée ou aucun jeton reçu."
    );
  });
});

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DEFAULT_REMOTE_CONFIG } from "../../lib/remoteConfigSchema";

const signInWithGoogle = vi.fn();
const probeInternet = vi.fn();
vi.mock("../../lib/firebase", () => ({ signInWithGoogle: (...a: unknown[]) => signInWithGoogle(...a) }));
vi.mock("../../store/AppContext", () => ({ useApp: () => ({ setCurrentUser: vi.fn() }) }));
vi.mock("../../store/RemoteConfigContext", () => ({ useRemoteConfig: () => ({ config: DEFAULT_REMOTE_CONFIG }) }));
vi.mock("../../lib/connectivity", async (orig) => ({ ...(await orig<typeof import("../../lib/connectivity")>()), probeInternet: (...a: unknown[]) => probeInternet(...a) }));

import LoginView from "./LoginView";

const cancelled = () => Object.assign(new Error("Google Sign-In cancelled by user"), { code: "USER_CANCELLED" });
const setOnLine = (v: boolean) => Object.defineProperty(navigator, "onLine", { value: v, configurable: true });
const clickGoogle = () => fireEvent.click(screen.getByRole("button", { name: /google/i }));

beforeEach(() => { signInWithGoogle.mockReset(); probeInternet.mockReset(); setOnLine(true); });
afterEach(cleanup);

describe("LoginView : connexion Google sans réseau", () => {
  it("hors connexion évidente : message clair, SANS ouvrir la fenêtre Google", async () => {
    setOnLine(false);
    render(<LoginView />);
    clickGoogle();
    await waitFor(() => expect(screen.getByText(/Connexion internet absente/)).toBeTruthy());
    expect(signInWithGoogle).not.toHaveBeenCalled();
    expect(screen.queryByText(/cancelled by user/i)).toBeNull();
  });

  it("Wi‑Fi connecté mais sans internet : « cancelled by user » devient « Connexion internet absente »", async () => {
    signInWithGoogle.mockRejectedValue(cancelled());
    probeInternet.mockResolvedValue(false);
    render(<LoginView />);
    clickGoogle();
    await waitFor(() => expect(screen.getByText(/Connexion internet absente/)).toBeTruthy());
    expect(screen.queryByText(/cancelled by user/i)).toBeNull();
  });

  it("en ligne et annulée volontairement : message d'annulation en français", async () => {
    signInWithGoogle.mockRejectedValue(cancelled());
    probeInternet.mockResolvedValue(true);
    render(<LoginView />);
    clickGoogle();
    await waitFor(() => expect(screen.getByText(/Connexion Google annulée/)).toBeTruthy());
  });

  it("affiche un avertissement dès l'ouverture quand l'appareil est hors connexion", () => {
    setOnLine(false);
    render(<LoginView />);
    expect(screen.getByRole("status").textContent).toMatch(/hors connexion/i);
  });

  it("le mode visiteur reste disponible hors connexion", () => {
    setOnLine(false);
    render(<LoginView />);
    expect(screen.getByRole("button", { name: /visiteur/i })).toBeTruthy();
  });
});

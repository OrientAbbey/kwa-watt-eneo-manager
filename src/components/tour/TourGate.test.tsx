// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { TOUR_SEEN_KEY } from "../../lib/tourLogic";

const start = vi.fn();
const markSeen = vi.fn();
let meters: unknown[] = [];

vi.mock("./TourContext", () => ({ useTour: () => ({ start, markSeen }) }));
vi.mock("../../store/AppContext", () => ({ useApp: () => ({ state: { meters } }) }));
// Version courante de la visite = 2 pour pouvoir tester « nouveautés » (un utilisateur qui a vu la version 1)
vi.mock("../../lib/tourSteps", async (orig) => ({ ...(await orig<typeof import("../../lib/tourSteps")>()), TOUR_VERSION: 2 }));

import TourGate from "./TourGate";

const emptyMeter = { consumptions: [], recharges: [], emergencyCredits: [], profile: { meterNumber: "" } };
const usedMeter = { ...emptyMeter, recharges: [{ id: "r1" }] };

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  start.mockReset();
  markSeen.mockReset();
  meters = [emptyMeter];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("TourGate : qui voit la visite à l'ouverture ?", () => {
  it("nouvel utilisateur : la visite démarre d'elle-même (après un court délai), sans bandeau", () => {
    render(<TourGate />);
    expect(start).not.toHaveBeenCalled(); // laisse l'interface se poser
    wait(1000);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith("main");
    expect(screen.queryByRole("region", { name: "Visite guidée" })).toBeNull();
  });

  it("utilisateur EXISTANT (données présentes) après mise à jour : bandeau de proposition, PAS de démarrage automatique", () => {
    meters = [usedMeter];
    render(<TourGate />);
    wait(5000);
    expect(start).not.toHaveBeenCalled();
    expect(screen.getByText("Nouveau : une visite guidée")).toBeTruthy();
    expect(screen.getByText(/Aide → À propos/)).toBeTruthy();
  });

  it("la proposition n'est faite qu'une fois : elle est mémorisée dès son affichage", () => {
    meters = [usedMeter];
    render(<TourGate />);
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it("« Voir la visite » lance la visite complète et masque le bandeau", () => {
    meters = [usedMeter];
    render(<TourGate />);
    fireEvent.click(screen.getByRole("button", { name: "Voir la visite" }));
    expect(start).toHaveBeenCalledWith("main");
    expect(screen.queryByRole("region", { name: "Visite guidée" })).toBeNull();
  });

  it("« Non merci » et la croix masquent le bandeau sans lancer la visite", () => {
    meters = [usedMeter];
    const { unmount } = render(<TourGate />);
    fireEvent.click(screen.getByRole("button", { name: "Non merci" }));
    expect(start).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Visite guidée" })).toBeNull();
    unmount();
    render(<TourGate />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("region", { name: "Visite guidée" })).toBeNull();
  });

  it("visite déjà vue (version courante) : ni démarrage, ni bandeau — même pour un nouvel utilisateur", () => {
    localStorage.setItem(TOUR_SEEN_KEY, "2");
    render(<TourGate />);
    wait(5000);
    expect(start).not.toHaveBeenCalled();
    expect(markSeen).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Visite guidée" })).toBeNull();
  });

  it("visite vue en version 1, contenu passé en version 2 : on propose les nouveautés, sans rien imposer", () => {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
    render(<TourGate />);
    wait(5000);
    expect(start).not.toHaveBeenCalled();
    expect(screen.getByText("La visite guidée a évolué")).toBeTruthy();
  });

  it("ne touche jamais aux données : seul le drapeau de visite est concerné (le contexte n'expose aucune écriture)", () => {
    localStorage.setItem("eneo_app_data", "{}");
    meters = [usedMeter];
    render(<TourGate />);
    expect(localStorage.getItem("eneo_app_data")).toBe("{}");
  });

  it("démontage avant le délai : aucun démarrage tardif", () => {
    const { unmount } = render(<TourGate />);
    unmount();
    wait(5000);
    expect(start).not.toHaveBeenCalled();
  });
});

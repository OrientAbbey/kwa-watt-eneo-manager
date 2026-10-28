// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MINI_TOUR_IDS, TOURS } from "../../lib/tourSteps";

const start = vi.fn();
vi.mock("../tour/TourContext", () => ({ useTour: () => ({ start }) }));

import AboutCard from "./AboutCard";
import TourLauncher from "../tour/TourLauncher";
import { APP_LICENSE, LICENSE_URL, REPO_URL } from "../../lib/appInfo";

beforeEach(() => start.mockReset());
afterEach(cleanup);

describe("À propos", () => {
  it("affiche la version, la licence et les liens du projet", () => {
    render(<AboutCard />);
    expect(screen.getByTestId("about-version").textContent).toMatch(/^(\d+\.\d+\.\d+|dev)$/);
    const licence = screen.getByRole("link", { name: new RegExp(APP_LICENSE) });
    expect(licence.getAttribute("href")).toBe(LICENSE_URL);
    expect(screen.getByRole("link", { name: /GitHub/ }).getAttribute("href")).toBe(REPO_URL);
    expect(screen.getByRole("link", { name: /signaler/i }).getAttribute("href")).toMatch(/\/issues$/);
  });

  it("mentionne l'indépendance vis-à-vis de l'opérateur d'électricité et des opérateurs de paiement", () => {
    render(<AboutCard />);
    expect(screen.getByText(/Application indépendante/).textContent).toMatch(/ni à ENEO \/ SOCADEL, ni à MTN, ni à Orange/);
  });

  it("« Revoir la présentation » lance la visite complète", () => {
    render(<AboutCard />);
    fireEvent.click(screen.getByRole("button", { name: /Revoir la présentation/ }));
    expect(start).toHaveBeenCalledWith("main");
  });

  it("propose les quatre mini-visites par thème, chacune lançant la bonne visite", () => {
    render(<AboutCard />);
    const list = screen.getByRole("list", { name: "Visites par thème" });
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(MINI_TOUR_IDS.length);
    for (const id of MINI_TOUR_IDS) {
      fireEvent.click(within(list).getByRole("button", { name: new RegExp(TOURS[id].title) }));
      expect(start).toHaveBeenLastCalledWith(id);
    }
    expect(["Enregistrer une recharge", "Importer un SMS", "Notifications", "Crédit d'urgence"].every((t) => screen.getByText(t))).toBe(true);
  });
});

describe("Lanceur de visite (aussi utilisé dans Paramètres)", () => {
  it("fonctionne seul : visite complète + mini-visites", () => {
    render(<TourLauncher />);
    fireEvent.click(screen.getByRole("button", { name: /Revoir la présentation/ }));
    fireEvent.click(screen.getByRole("button", { name: /Importer un SMS/ }));
    expect(start.mock.calls.map((c) => c[0])).toEqual(["main", "sms"]);
  });
});

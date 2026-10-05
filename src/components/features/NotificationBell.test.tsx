// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import NotificationBell from "./NotificationBell";
import { AppAlert } from "../../lib/alerts";

afterEach(cleanup);

const info: AppAlert = { id: "start", type: "info", title: "Début du mois", message: "Vérifiez votre crédit" };
const warn: AppAlert = { id: "high", type: "warning", title: "Seuil élevé", message: "Seuil dépassé" };
const props = (alerts: AppAlert[], enabled = true) => ({ alerts, notificationsEnabled: enabled, onGoSettings: vi.fn(), onGoDashboard: vi.fn() });

describe("NotificationBell", () => {
  it("n'affiche rien quand il n'y a aucune alerte", () => {
    const { container } = render(<NotificationBell {...props([])} />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche le nombre d'alertes actives", () => {
    render(<NotificationBell {...props([info, warn])} />);
    expect(screen.getByTestId("bell-count").textContent).toBe("2");
    expect(screen.getByRole("button", { name: "2 notifications" })).toBeTruthy();
  });

  it("accorde au singulier", () => {
    render(<NotificationBell {...props([info])} />);
    expect(screen.getByRole("button", { name: "1 notification" })).toBeTruthy();
  });

  it("est posé au-dessus du bouton flottant (bas = 10,5 rem) sur mobile", () => {
    render(<NotificationBell {...props([info])} />);
    expect(screen.getByRole("button", { name: /notification/ }).className).toContain("bottom-[10.5rem]");
  });

  it("un appui ouvre la liste des alertes", () => {
    render(<NotificationBell {...props([info, warn])} />);
    expect(screen.queryByText("Début du mois")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "2 notifications" }));
    expect(screen.getByText("Début du mois")).toBeTruthy();
    expect(screen.getByText("Seuil élevé")).toBeTruthy();
  });

  it("propose d'activer les notifications quand elles sont désactivées", () => {
    const p = props([info], false);
    render(<NotificationBell {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "1 notification" }));
    expect(screen.getByText(/désactivées/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Les activer/i));
    expect(p.onGoSettings).toHaveBeenCalled();
  });

  it("explique le bouton « Supprimer » quand les notifications sont activées", () => {
    render(<NotificationBell {...props([info], true)} />);
    fireEvent.click(screen.getByRole("button", { name: "1 notification" }));
    expect(screen.getByText(/bouton « Supprimer »/)).toBeTruthy();
  });
});

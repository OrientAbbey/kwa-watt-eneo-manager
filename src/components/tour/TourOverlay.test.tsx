// @vitest-environment jsdom
import React, { useEffect } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NavProvider, useNav, type NavIntent } from "../../store/NavContext";
import { TourProvider, useTour } from "./TourContext";
import { TOURS, TOUR_VERSION } from "../../lib/tourSteps";
import { TOUR_SEEN_KEY } from "../../lib/tourLogic";

// ── Décor : de faux éléments avec une position (jsdom ne fait aucune mise en page) ──
const originalRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  localStorage.clear();
  seenIntents.length = 0;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const [top, left, width, height] = (this.getAttribute("data-rect") ?? "0,0,0,0").split(",").map(Number);
    return { top, left, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} } as DOMRect;
  };
});
afterEach(() => {
  cleanup();
  Element.prototype.getBoundingClientRect = originalRect;
});

const seenIntents: NavIntent[] = [];

function Probe() {
  const { activeTab, consumeIntent, intentTick, navigate } = useNav();
  // Même rôle qu'une vue réelle : lit (et consomme) l'action demandée à chaque navigation
  useEffect(() => {
    const i = consumeIntent();
    if (i) seenIntents.push(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentTick]);
  return (
    <>
      <p data-testid="tab">{activeTab}</p>
      <p data-testid="ticks">{intentTick}</p>
      <button onClick={() => navigate("history")}>aller-historique</button>
    </>
  );
}

function Launchers() {
  const { start } = useTour();
  return (
    <>
      <button onClick={() => start("main")}>lancer-visite</button>
      <button onClick={() => start("sms")}>lancer-sms</button>
      <button onClick={() => start("notifications")}>lancer-notifications</button>
      <button onClick={() => start("recharge")}>lancer-recharge</button>
    </>
  );
}

/** Variante mobile par défaut : bouton « + » flottant visible, bouton « Ajouter » du bureau caché, menu visible, pas de barre latérale. */
function Page({ withBell = false }: { withBell?: boolean }) {
  return (
    <div>
      <button data-tour="menu" data-rect="10,8,40,40">menu</button>
      <aside data-tour="sidebar" data-rect="0,0,0,0">barre latérale (cachée)</aside>
      <button data-tour="add-header" data-rect="0,0,0,0">Ajouter</button>
      <button data-tour="add-fab" data-rect="700,300,56,56">+</button>
      <div data-tour="metrics" data-rect="120,16,360,300" />
      <div data-tour="balance" data-rect="120,16,360,90" />
      <div id="quick-recharge" data-rect="200,16,360,200" />
      <div id="emergency-credit" data-rect="420,16,360,200" />
      <div id="meter-codes" data-rect="640,16,360,100" />
      <div data-tour="sms-actions" data-rect="150,20,340,44" />
      <div data-tour="sms-text" data-rect="220,20,340,140" />
      <div data-tour="entry-form" data-rect="100,30,340,400" />
      <div data-tour="settings-alerts" data-rect="90,16,360,300" />
      {withBell && <button data-tour="bell" data-rect="620,320,44,44">cloche</button>}
    </div>
  );
}

const renderApp = (props: { withBell?: boolean } = {}) =>
  render(
    <NavProvider>
      <TourProvider>
        <Probe />
        <Launchers />
        <Page {...props} />
      </TourProvider>
    </NavProvider>
  );

const start = async (name = "lancer-visite") => {
  fireEvent.click(screen.getByText(name));
  return screen.findByRole("dialog");
};
const next = () => fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
const tab = () => screen.getByTestId("tab").textContent;
const stepLabel = () => screen.getByRole("status").textContent;

describe("visite guidée : affichage et navigation entre les étapes", () => {
  it("démarre sur une carte centrée de bienvenue, accessible (dialogue modal, titre, annonce vocale)", async () => {
    renderApp();
    const dialog = await start();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)!.textContent).toBe(TOURS.main.steps[0].title);
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)!.textContent).toContain("indépendante");
    await waitFor(() => expect(dialog.getAttribute("data-placement")).toBe("center"));
    expect(stepLabel()).toBe(`Étape 1 sur ${TOURS.main.steps.length} : ${TOURS.main.steps[0].title}`);
    expect(screen.queryByRole("button", { name: "Précédent" })).toBeNull(); // rien avant la première étape
  });

  it("Suivant / Précédent parcourent les étapes et mettent à jour l'annonce vocale", async () => {
    renderApp();
    await start();
    next();
    await waitFor(() => expect(stepLabel()).toContain("Étape 2 sur"));
    expect(screen.getByRole("heading", { name: TOURS.main.steps[1].title })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Précédent" }));
    await waitFor(() => expect(stepLabel()).toContain("Étape 1 sur"));
  });

  it("met en surbrillance le VRAI élément ciblé (position = celle de l'élément + marge)", async () => {
    renderApp();
    await start();
    next(); // tableau de bord → [data-tour="metrics"] à (120, 16, 360×300)
    const spot = await screen.findByTestId("tour-spotlight");
    expect(spot.style.top).toBe("114px");
    expect(spot.style.left).toBe("10px");
    expect(spot.style.width).toBe("372px");
    expect(spot.style.height).toBe("312px");
    // le mouvement de la surbrillance respecte prefers-reduced-motion
    expect(spot.className).toContain("motion-reduce:transition-none");
  });

  it("deux variantes d'un même bouton (mobile / bureau) : seule la VISIBLE est mise en avant", async () => {
    renderApp();
    await start();
    next();
    next(); // « + » : data-tour add-fab visible (700, 300), add-header caché
    await waitFor(() => expect(screen.getByTestId("tour-spotlight").style.top).toBe("694px"));
    expect(screen.getByTestId("tour-spotlight").style.left).toBe("294px");
  });

  it("cible proche du bas de l'écran : la bulle se pose AU-DESSUS (et pointe la cible)", async () => {
    renderApp();
    const dialog = await start();
    next();
    next();
    await waitFor(() => expect(dialog.getAttribute("data-placement")).toBe("top"));
  });

  it("cible absente (ex. cloche sans alerte) : carte centrée avec le texte de repli, sans erreur", async () => {
    renderApp({ withBell: false });
    const dialog = await start("lancer-notifications");
    expect(screen.getByRole("heading", { name: TOURS.notifications.steps[0].title })).toBeTruthy();
    expect(await screen.findByText(/apparaît au-dessus du bouton/, {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByTestId("tour-spotlight")).toBeNull();
    expect(dialog.getAttribute("data-placement")).toBe("center");
  }, 8000);

  it("cible présente (cloche visible) : texte normal et surbrillance", async () => {
    renderApp({ withBell: true });
    await start("lancer-notifications");
    await screen.findByTestId("tour-spotlight");
    expect(screen.getByText(TOURS.notifications.steps[0].body)).toBeTruthy();
  });

  it("dernière étape : bouton « Terminer », plus de « Passer »", async () => {
    renderApp();
    await start("lancer-recharge");
    next();
    next();
    expect(await screen.findByRole("button", { name: "Terminer" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suivant" })).toBeNull();
  });
});

describe("visite guidée : navigation de l'application et actions (intents) préservées", () => {
  it("change d'onglet selon l'étape, et revient en arrière avec Précédent", async () => {
    renderApp();
    await start();
    expect(tab()).toBe("dashboard");
    next(); // tableau de bord
    next(); // bouton +
    expect(tab()).toBe("dashboard");
    next(); // Services
    await waitFor(() => expect(tab()).toBe("services"));
    fireEvent.click(screen.getByRole("button", { name: "Précédent" }));
    fireEvent.click(screen.getByRole("button", { name: "Précédent" }));
    await waitFor(() => expect(tab()).toBe("dashboard"));
  });

  it("ne relance pas la navigation (et ne remonte pas la page) quand l'onglet est déjà le bon", async () => {
    renderApp();
    await start();
    const before = screen.getByTestId("ticks").textContent;
    next(); // tableau de bord : déjà sur dashboard
    next(); // « + » : aucun onglet imposé
    await waitFor(() => expect(stepLabel()).toContain("Étape 3"));
    expect(screen.getByTestId("ticks").textContent).toBe(before);
  });

  it("l'étape « SMS » ouvre l'import via l'action paste-sms de NavContext, lue par la vue comme d'habitude", async () => {
    renderApp();
    await start();
    for (let i = 0; i < 6; i++) next();
    await waitFor(() => expect(tab()).toBe("history"));
    expect(seenIntents).toEqual([{ type: "paste-sms" }]);
  });

  it("deux étapes de même destination (fenêtre d'import) : une seule navigation, la fenêtre n'est ni fermée ni rouverte", async () => {
    const escapes: boolean[] = [];
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && escapes.push(true);
    window.addEventListener("keydown", onKey);
    renderApp();
    await start("lancer-sms");
    next(); // → fenêtre d'import (history + paste-sms)
    await waitFor(() => expect(seenIntents).toHaveLength(1));
    const escapesBefore = escapes.length;
    next(); // → « vérifier ce qui est reconnu » : même destination
    await waitFor(() => expect(stepLabel()).toContain("Étape 3"));
    expect(seenIntents).toHaveLength(1);
    expect(escapes.length).toBe(escapesBefore);
    window.removeEventListener("keydown", onKey);
  });

  it("à chaque changement de destination, les fenêtres laissées ouvertes reçoivent un Échap synthétique — sans fermer la visite", async () => {
    const received: KeyboardEvent[] = [];
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && received.push(e);
    window.addEventListener("keydown", onKey);
    renderApp();
    await start("lancer-sms");
    const n = received.length;
    next();
    await waitFor(() => expect(received.length).toBeGreaterThan(n));
    expect(screen.getByRole("dialog")).toBeTruthy(); // la visite est toujours là
    window.removeEventListener("keydown", onKey);
  });

  it("une fois la visite fermée, la navigation normale fonctionne toujours", async () => {
    renderApp();
    await start();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByText("aller-historique"));
    expect(tab()).toBe("history");
  });
});

describe("visite guidée : fermeture, persistance, clavier, focus", () => {
  it("Échap quitte la visite complète et la marque comme vue (version courante)", async () => {
    renderApp();
    await start();
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe(String(TOUR_VERSION)); // marquée vue dès le démarrage
    localStorage.removeItem(TOUR_SEEN_KEY);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe(String(TOUR_VERSION));
  });

  it("« Passer » ferme la visite", async () => {
    renderApp();
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Passer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("« Terminer » ferme la visite ; une mini-visite n'écrit PAS le drapeau de la visite complète", async () => {
    renderApp();
    await start("lancer-recharge");
    next();
    next();
    fireEvent.click(await screen.findByRole("button", { name: "Terminer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
  });

  it("la visite ne modifie aucune autre clé du stockage local (données de l'utilisateur intactes)", async () => {
    localStorage.setItem("eneo_app_data", "{\"x\":1}");
    renderApp();
    await start();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(Object.keys(localStorage).sort()).toEqual(["eneo_app_data", TOUR_SEEN_KEY].sort());
    expect(localStorage.getItem("eneo_app_data")).toBe("{\"x\":1}");
  });

  it("flèches gauche / droite naviguent", async () => {
    renderApp();
    await start();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(stepLabel()).toContain("Étape 2"));
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => expect(stepLabel()).toContain("Étape 1"));
  });

  it("le focus va sur la bulle à l'ouverture et revient au bouton d'origine à la fermeture", async () => {
    renderApp();
    const launcher = screen.getByText("lancer-visite");
    launcher.focus();
    const dialog = await start();
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(launcher);
  });

  it("Tab reste prisonnier de la bulle (dernier → premier, Maj+Tab : premier → dernier)", async () => {
    renderApp();
    await start();
    const skip = screen.getByRole("button", { name: "Passer" });
    const nextBtn = screen.getByRole("button", { name: "Suivant" });
    nextBtn.focus();
    fireEvent.keyDown(nextBtn, { key: "Tab" });
    expect(document.activeElement).toBe(skip);
    fireEvent.keyDown(skip, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(nextBtn);
  });

  it("un clic sur le fond ne déclenche rien dans l'application (la visite bloque les interactions)", async () => {
    renderApp();
    await start();
    fireEvent.click(screen.getByTestId("tour-layer"));
    expect(tab()).toBe("dashboard");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

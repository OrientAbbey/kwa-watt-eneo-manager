// @vitest-environment jsdom
import React, { useEffect } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { NavProvider, useNav, NavIntent } from "./NavContext";

afterEach(cleanup);

/** Reproduit exactement le contrat des vues (HistoryView…) : lire l'action demandée à chaque changement de intentTick. */
function FakeHistoryView({ onIntent }: { onIntent: (i: NavIntent) => void }) {
  const { consumeIntent, intentTick } = useNav();
  useEffect(() => {
    const intent = consumeIntent();
    if (intent) onIntent(intent);
  }, [intentTick]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div>historique</div>;
}

let nav!: ReturnType<typeof useNav>;
function Harness({ onIntent }: { onIntent: (i: NavIntent) => void }) {
  nav = useNav();
  return nav.activeTab === "history" ? <FakeHistoryView onIntent={onIntent} /> : <div>{nav.activeTab}</div>;
}

describe("NavContext : actions demandées à une vue", () => {
  it("est traitée quand on arrive depuis un autre onglet", () => {
    const got: NavIntent[] = [];
    render(<NavProvider><Harness onIntent={(i) => got.push(i)} /></NavProvider>);
    act(() => nav.navigate("history", { type: "add-recharge" }));
    expect(got).toEqual([{ type: "add-recharge" }]);
  });

  it("est AUSSI traitée quand la vue est déjà affichée (le bug du bouton « + » dans l'Historique)", () => {
    const got: NavIntent[] = [];
    render(<NavProvider><Harness onIntent={(i) => got.push(i)} /></NavProvider>);
    act(() => nav.navigate("history")); // déjà sur Historique…
    expect(got).toEqual([]);
    act(() => nav.navigate("history", { type: "add-recharge" })); // …puis « Enregistrer une recharge » du bouton +
    act(() => nav.navigate("history", { type: "add-consumption" }));
    act(() => nav.navigate("history", { type: "paste-sms" }));
    expect(got).toEqual([{ type: "add-recharge" }, { type: "add-consumption" }, { type: "paste-sms" }]);
  });

  it("une action n'est traitée qu'une seule fois", () => {
    const got: NavIntent[] = [];
    render(<NavProvider><Harness onIntent={(i) => got.push(i)} /></NavProvider>);
    act(() => nav.navigate("history", { type: "add-recharge" }));
    act(() => nav.navigate("history")); // sans action : rien de plus
    expect(got).toHaveLength(1);
  });

  it("l'action destinée à une autre vue n'est pas perdue en passant par un onglet sans lecteur", () => {
    const got: NavIntent[] = [];
    render(<NavProvider><Harness onIntent={(i) => got.push(i)} /></NavProvider>);
    act(() => nav.navigate("history", { type: "paste-sms" }));
    act(() => nav.navigate("dashboard"));
    act(() => nav.navigate("history", { type: "add-consumption" }));
    expect(got.map((g) => g.type)).toEqual(["paste-sms", "add-consumption"]);
  });
});

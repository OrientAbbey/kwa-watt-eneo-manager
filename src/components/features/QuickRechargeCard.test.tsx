// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { INITIAL_STATE } from "../../constants";
import { DEFAULT_REMOTE_CONFIG } from "../../lib/remoteConfigSchema";

const profileMeter = "01234567852";
vi.mock("../../store/AppContext", () => ({
  useApp: () => ({
    currentMeter: { ...INITIAL_STATE.meters[0], profile: { ...INITIAL_STATE.meters[0].profile, meterNumber: profileMeter } },
    showToast: vi.fn(),
  }),
}));
vi.mock("../../store/RemoteConfigContext", () => ({
  useRemoteConfig: () => ({ config: DEFAULT_REMOTE_CONFIG, brand: "SOCADEL (ex-ENEO)", brandName: "SOCADEL" }),
}));
vi.mock("../../store/NavContext", () => ({ useNav: () => ({ navigate: vi.fn() }) }));
vi.mock("../../hooks/useClipboard", () => ({ useClipboard: () => vi.fn() }));

import QuickRechargeCard from "./QuickRechargeCard";

afterEach(cleanup);

const hrefs = () => Array.from(document.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");

describe("QuickRechargeCard : codes courts sur les boutons, codes longs en copier-coller", () => {
  it("les deux boutons ouvrent les codes COURTS (menus guidés)", () => {
    render(<QuickRechargeCard />);
    expect(hrefs()).toContain("tel:*126*21%23");
    expect(hrefs()).toContain("tel:%23150*314%23");
  });

  it("AUCUN lien n'embarque un code long, même après saisie du compteur et du montant", () => {
    render(<QuickRechargeCard />);
    fireEvent.change(screen.getByPlaceholderText(/minimum/i), { target: { value: "3000" } });
    const all = hrefs().join(" ");
    expect(all).not.toContain("126*2*1*2");
    expect(all).not.toContain("150*3*1*4");
    expect(all).not.toContain(profileMeter);
  });

  it("les codes longs sont affichés (à copier) une fois compteur et montant valides", () => {
    render(<QuickRechargeCard />);
    expect(screen.queryByText("*126*2*1*2*01234567852*3000#")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/minimum/i), { target: { value: "3000" } });
    expect(screen.getByText("*126*2*1*2*01234567852*3000#")).toBeTruthy();
    expect(screen.getByText("#150*3*1*4*1*01234567852*3000#")).toBeTruthy();
  });

  it("refuse un montant sous le minimum de 1000 : aucun code long n'est généré", () => {
    render(<QuickRechargeCard />);
    fireEvent.change(screen.getByPlaceholderText(/minimum/i), { target: { value: "500" } });
    expect(screen.queryByText(/\*126\*2\*1\*2\*/)).toBeNull();
    expect(screen.getAllByText(/Achat minimum/i).length).toBeGreaterThan(0);
  });

  it("indique que les codes longs ne marchent que pour certains abonnés", () => {
    render(<QuickRechargeCard />);
    expect(screen.getByText(/certains abonnés/i)).toBeTruthy();
  });
});

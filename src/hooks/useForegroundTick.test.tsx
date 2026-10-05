// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useForegroundTick } from "./useForegroundTick";
import { RESYNC_EVENT } from "../lib/notifications";

afterEach(cleanup);
const Probe = () => <span data-testid="tick">{useForegroundTick()}</span>;
const setVisibility = (v: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { value: v, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("useForegroundTick", () => {
  it("s'incrémente à chaque retour au premier plan, pas quand l'application passe en arrière-plan", () => {
    render(<Probe />);
    expect(screen.getByTestId("tick").textContent).toBe("0");
    act(() => setVisibility("hidden"));
    expect(screen.getByTestId("tick").textContent).toBe("0");
    act(() => setVisibility("visible"));
    expect(screen.getByTestId("tick").textContent).toBe("1");
    act(() => setVisibility("visible"));
    expect(screen.getByTestId("tick").textContent).toBe("2");
  });

  it("s'incrémente aussi quand on appuie sur une notification alors que l'application est déjà ouverte", () => {
    render(<Probe />);
    act(() => { window.dispatchEvent(new Event(RESYNC_EVENT)); });
    expect(screen.getByTestId("tick").textContent).toBe("1");
  });
});

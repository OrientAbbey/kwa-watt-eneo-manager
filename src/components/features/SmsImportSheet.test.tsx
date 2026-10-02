// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { INITIAL_STATE } from "../../constants";

// ── Doubles : le composant est testé isolé de Firebase, de la caméra et du moteur OCR ──
let pickerCallback: ((img: string) => void) | null = null;
let ocrResolve: ((t: string) => void) | null = null;

vi.mock("../../store/AppContext", () => ({
  useApp: () => ({
    state: INITIAL_STATE,
    currentMeter: INITIAL_STATE.meters[0],
    switchMeter: vi.fn(),
    updateProfile: vi.fn(),
    showToast: vi.fn(),
  }),
}));
vi.mock("../../hooks/useImagePicker", () => ({
  useImagePicker: (cb: (img: string) => void) => {
    pickerCallback = cb;
    return { openPicker: vi.fn(), picker: null };
  },
}));
vi.mock("../../lib/ocr", () => ({
  recognizeText: () => new Promise<string>((resolve) => { ocrResolve = resolve; }),
}));
vi.mock("../../lib/clipboard", () => ({ copyText: vi.fn() }));

import SmsImportSheet from "./SmsImportSheet";

const mount = (open = true) => render(<SmsImportSheet open={open} onClose={() => {}} onParsed={() => {}} />);
const textarea = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const pasteBtn = () => screen.getByRole("button", { name: /coller/i }) as HTMLButtonElement;

beforeEach(() => {
  pickerCallback = null;
  ocrResolve = null;
  Object.defineProperty(navigator, "clipboard", { value: { readText: vi.fn().mockResolvedValue("TEXTE COLLÉ") }, configurable: true });
});
afterEach(cleanup);

const startOcr = async () => {
  await act(async () => { pickerCallback!("data:image/jpeg;base64,xx"); });
};

describe("SmsImportSheet pendant la lecture OCR", () => {
  it("bloque « Coller » et la zone de texte tant que l'OCR tourne, puis les débloque", async () => {
    mount();
    expect(pasteBtn().disabled).toBe(false);
    expect(textarea().readOnly).toBe(false);

    await startOcr();
    expect(pasteBtn().disabled).toBe(true);
    expect(textarea().readOnly).toBe(true);

    await act(async () => { ocrResolve!("Montant: 3000 FCFA"); });
    expect(pasteBtn().disabled).toBe(false);
    expect(textarea().readOnly).toBe(false);
    expect(textarea().value).toContain("Montant: 3000 FCFA");
  });

  it("un clic forcé sur « Coller » pendant l'OCR n'écrit rien dans la zone", async () => {
    mount();
    await startOcr();
    await act(async () => { fireEvent.click(pasteBtn()); });
    expect(textarea().value).toBe("");
    expect((navigator.clipboard.readText as any)).not.toHaveBeenCalled();
  });

  it("« Coller » fonctionne normalement hors OCR", async () => {
    mount();
    await act(async () => { fireEvent.click(pasteBtn()); });
    expect(textarea().value).toBe("TEXTE COLLÉ");
  });

  it("si on ferme la fenêtre pendant la lecture, son résultat n'apparaît PAS à la réouverture", async () => {
    const view = mount(true);
    await startOcr();
    view.rerender(<SmsImportSheet open={false} onClose={() => {}} onParsed={() => {}} />);
    view.rerender(<SmsImportSheet open={true} onClose={() => {}} onParsed={() => {}} />);
    await act(async () => { ocrResolve!("RÉSULTAT PÉRIMÉ"); });
    expect(textarea().value).toBe("");
    expect(pasteBtn().disabled).toBe(false);
  });

  it("la zone de texte affiche une barre de défilement permanente", () => {
    mount();
    expect(textarea().className).toContain("scrollbar-visible");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { loadLocalState, saveLocalState, photosKeyFor, setPhotosIncomplete, isPhotosIncomplete, clearPhotosIncomplete } from "./localStore";
import { shouldNotifyOnce, resetNotifyOnceForTests } from "./notifyOnce";
import { INITIAL_STATE } from "../constants";
import { AppState } from "../types";

/** Faux localStorage avec quota (en caractères). */
class FakeStorage {
  data = new Map<string, string>();
  constructor(public quota = Infinity) {}
  getItem(k: string) { return this.data.get(k) ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) {
    const others = [...this.data.entries()].filter(([key]) => key !== k).reduce((a, [, val]) => a + val.length, 0);
    if (others + v.length > this.quota) throw new DOMException("quota", "QuotaExceededError");
    this.data.set(k, v);
  }
}

const withPhoto = (size: number): AppState => ({
  ...INITIAL_STATE,
  meters: [{ ...INITIAL_STATE.meters[0], consumptions: [{ id: "c", date: "2026-01", kwh: 100 }], profile: { ...INITIAL_STATE.meters[0].profile, photoMeter: "data:image/jpeg;base64," + "A".repeat(size) } }],
});

describe("persistance locale en deux clés", () => {
  it("aller-retour complet : données et photos", () => {
    const s = new FakeStorage();
    expect(saveLocalState(s, "k", withPhoto(1000))).toEqual({ coreOk: true, photosOk: true });
    const back = loadLocalState(s, "k")!;
    expect(back.meters[0].consumptions[0].kwh).toBe(100);
    expect(back.meters[0].profile.photoMeter).toHaveLength("data:image/jpeg;base64,".length + 1000);
  });
  it("le contenu des données ne contient aucune photo", () => {
    const s = new FakeStorage();
    saveLocalState(s, "k", withPhoto(1000));
    expect(s.getItem("k")).not.toContain("base64");
    expect(s.getItem(photosKeyFor("k"))).toContain("base64");
  });
  it("quota dépassé par les photos : les DONNÉES sont quand même enregistrées", () => {
    const s = new FakeStorage(5000);
    const r = saveLocalState(s, "k", withPhoto(20000));
    expect(r.coreOk).toBe(true);
    expect(r.photosOk).toBe(false);
    expect(loadLocalState(s, "k")!.meters[0].consumptions[0].kwh).toBe(100);
  });
  it("lit l'ancien format (photos intégrées aux données)", () => {
    const s = new FakeStorage();
    s.setItem("k", JSON.stringify(withPhoto(500)));
    const back = loadLocalState(s, "k")!;
    expect(back.meters[0].profile.photoMeter).toBeTruthy();
  });
  it("tolère une clé de photos corrompue", () => {
    const s = new FakeStorage();
    saveLocalState(s, "k", withPhoto(100));
    s.setItem(photosKeyFor("k"), "{pas du json");
    expect(loadLocalState(s, "k")!.meters[0].consumptions).toHaveLength(1);
    expect(loadLocalState(new FakeStorage(), "absent")).toBeNull();
  });
  it("marqueur « photos possiblement perdues »", () => {
    const s = new FakeStorage();
    expect(isPhotosIncomplete(s, "k")).toBe(false);
    setPhotosIncomplete(s, "k");
    expect(isPhotosIncomplete(s, "k")).toBe(true);
    clearPhotosIncomplete(s, "k");
    expect(isPhotosIncomplete(s, "k")).toBe(false);
  });
});

describe("shouldNotifyOnce", () => {
  beforeEach(() => resetNotifyOnceForTests());
  it("n'avertit qu'une fois par période, puis de nouveau après le délai", () => {
    const s = new FakeStorage();
    expect(shouldNotifyOnce("a", 1000, 0, s)).toBe(true);
    expect(shouldNotifyOnce("a", 1000, 500, s)).toBe(false);
    expect(shouldNotifyOnce("a", 1000, 1500, s)).toBe(true);
  });
  it("les clés sont indépendantes et le stockage plein n'empêche pas la limitation", () => {
    const full = new FakeStorage(0);
    expect(shouldNotifyOnce("x", 1000, 0, full)).toBe(true);
    expect(shouldNotifyOnce("x", 1000, 10, full)).toBe(false);
    expect(shouldNotifyOnce("y", 1000, 10, full)).toBe(true);
  });
});

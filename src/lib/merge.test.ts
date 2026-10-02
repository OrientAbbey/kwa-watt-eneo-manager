import { describe, it, expect } from "vitest";
import { mergeStates, statesEqual, TOMBSTONE_TTL_MS } from "./merge";
import { INITIAL_STATE } from "../constants";
import { AppState, MeterData } from "../types";

const NOW = 1_800_000_000_000;

const meter = (over: Partial<MeterData> = {}): MeterData => ({
  ...INITIAL_STATE.meters[0],
  consumptions: [],
  recharges: [],
  emergencyCredits: [],
  ...over,
});
const state = (meters: MeterData[], over: Partial<AppState> = {}): AppState => ({
  ...INITIAL_STATE,
  meters,
  activeMeterId: meters[0].id,
  ...over,
});

describe("mergeStates", () => {
  it("garde les ajouts faits sur deux appareils différents", () => {
    const a = state([meter({ consumptions: [{ id: "c1", date: "2026-01", kwh: 100, updatedAt: 10 }] })]);
    const b = state([meter({ consumptions: [{ id: "c2", date: "2026-02", kwh: 120, updatedAt: 20 }] })]);
    const merged = mergeStates(a, b, NOW);
    expect(merged.meters[0].consumptions.map((c) => c.id).sort()).toEqual(["c1", "c2"]);
  });

  it("le plus récent gagne pour un même enregistrement", () => {
    const a = state([meter({ recharges: [{ id: "r1", date: "2026-01-01", montant: 1000, kwh: 20, updatedAt: 50 }] })]);
    const b = state([meter({ recharges: [{ id: "r1", date: "2026-01-01", montant: 2000, kwh: 40, updatedAt: 90 }] })]);
    expect(mergeStates(a, b, NOW).meters[0].recharges[0].montant).toBe(2000);
    expect(mergeStates(b, a, NOW).meters[0].recharges[0].montant).toBe(2000);
  });

  it("une suppression n'est pas ressuscitée par un appareil en retard", () => {
    const stale = state([meter({ consumptions: [{ id: "c1", date: "2026-01", kwh: 100, updatedAt: 10 }] })]);
    const fresh = state([meter({ consumptions: [], tombstones: { c1: NOW - 500 } })]);
    const merged = mergeStates(fresh, stale, NOW);
    expect(merged.meters[0].consumptions).toHaveLength(0);
    expect(merged.meters[0].tombstones?.c1).toBe(NOW - 500);
  });

  it("un enregistrement recréé après suppression est conservé", () => {
    const recreated = state([meter({ consumptions: [{ id: "c1", date: "2026-01", kwh: 90, updatedAt: NOW - 100 }] })]);
    const deleted = state([meter({ tombstones: { c1: NOW - 500 } })]);
    expect(mergeStates(recreated, deleted, NOW).meters[0].consumptions).toHaveLength(1);
  });

  it("dédoublonne deux saisies du même mois créées hors ligne", () => {
    const a = state([meter({ consumptions: [{ id: "x", date: "2026-03", kwh: 100, updatedAt: 10 }] })]);
    const b = state([meter({ consumptions: [{ id: "y", date: "2026-03", kwh: 110, updatedAt: 20 }] })]);
    const merged = mergeStates(a, b, NOW);
    expect(merged.meters[0].consumptions).toHaveLength(1);
    expect(merged.meters[0].consumptions[0].kwh).toBe(110);
  });

  it("conserve deux recharges le même jour", () => {
    const a = state([meter({ recharges: [{ id: "r1", date: "2026-01-01", montant: 1000, kwh: 20, updatedAt: 1 }] })]);
    const b = state([meter({ recharges: [{ id: "r2", date: "2026-01-01", montant: 2000, kwh: 40, updatedAt: 2 }] })]);
    expect(mergeStates(a, b, NOW).meters[0].recharges).toHaveLength(2);
  });

  it("fusionne les compteurs et respecte la suppression d'un compteur", () => {
    const a = state([meter({ id: "m1", updatedAt: NOW - 5000 }), meter({ id: "m2", updatedAt: NOW - 5000 })]);
    const b = state([meter({ id: "m1", updatedAt: 5 }), meter({ id: "m3", updatedAt: 5 })]);
    expect(mergeStates(a, b, NOW).meters.map((m) => m.id).sort()).toEqual(["m1", "m2", "m3"]);
    const deleted = state([meter({ id: "m1", updatedAt: 5 })], { deletedMeters: { m2: NOW - 100 } });
    expect(mergeStates(deleted, a, NOW).meters.map((m) => m.id)).toEqual(["m1"]);
  });

  it("ne supprime jamais tous les compteurs", () => {
    const local = state([meter({ id: "m1", updatedAt: 1 })]);
    const remote = state([meter({ id: "m1", updatedAt: NOW - 20 })], { deletedMeters: { m1: NOW - 10 } });
    expect(mergeStates(local, remote, NOW).meters).toHaveLength(1);
  });

  it("les réglages les plus récents gagnent, le compteur actif reste local", () => {
    const local = state([meter({ id: "m1" }), meter({ id: "m2" })], { activeMeterId: "m2", theme: "light", updatedAt: 10 });
    const remote = state([meter({ id: "m1" }), meter({ id: "m2" })], { activeMeterId: "m1", theme: "dark", updatedAt: 99 });
    const merged = mergeStates(local, remote, NOW);
    expect(merged.theme).toBe("dark");
    expect(merged.activeMeterId).toBe("m2");
  });

  it("purge les pierres tombales expirées", () => {
    const old = NOW - TOMBSTONE_TTL_MS - 1000;
    const a = state([meter({ tombstones: { vieux: old, recent: NOW - 1000 } })]);
    const merged = mergeStates(a, a, NOW);
    expect(merged.meters[0].tombstones).toEqual({ recent: NOW - 1000 });
  });

  it("est idempotent : fusionner deux fois donne le même résultat", () => {
    const a = state([meter({ consumptions: [{ id: "c1", date: "2026-01", kwh: 1, updatedAt: 3 }], updatedAt: 3 })], { updatedAt: 3 });
    const b = state([meter({ consumptions: [{ id: "c2", date: "2026-02", kwh: 2, updatedAt: 4 }], updatedAt: 4 })], { updatedAt: 4 });
    const once = mergeStates(a, b, NOW);
    expect(statesEqual(mergeStates(once, b, NOW), once)).toBe(true);
    expect(statesEqual(mergeStates(once, once, NOW), once)).toBe(true);
  });

  it("un profil distant plus récent n'efface JAMAIS les photos locales (les photos ne sont pas dans le cloud)", () => {
    const local = state([meter({ id: "m1", updatedAt: 10, profile: { ...INITIAL_STATE.meters[0].profile, ownerName: "Ancien", photoMeter: "data:image/jpeg;base64,LOCAL" } })]);
    const remote = state([meter({ id: "m1", updatedAt: NOW - 10, profile: { ...INITIAL_STATE.meters[0].profile, ownerName: "Nouveau" } })]);
    const merged = mergeStates(local, remote, NOW);
    expect(merged.meters[0].profile.ownerName).toBe("Nouveau");
    expect(merged.meters[0].profile.photoMeter).toBe("data:image/jpeg;base64,LOCAL");
  });
  it("conserve les images d'aide locales même si les réglages distants sont plus récents", () => {
    const local = state([meter()], { helpImages: ["data:image/jpeg;base64,H1"], updatedAt: 5 });
    const remote = state([meter()], { helpImages: [], updatedAt: NOW - 5 });
    expect(mergeStates(local, remote, NOW).helpImages).toEqual(["data:image/jpeg;base64,H1"]);
  });
});

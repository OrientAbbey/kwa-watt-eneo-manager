import { describe, it, expect } from "vitest";
import { migrateState, detectSchemaVersion } from "./migrations";
import { CURRENT_SCHEMA_VERSION, INITIAL_STATE } from "../constants";
import { calculateKwh } from "./eneo";

describe("migrateState", () => {
  it("retourne l'état initial pour une entrée invalide", () => {
    expect(migrateState(null).meters).toHaveLength(1);
    expect(migrateState("abc").schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrateState([]).activeMeterId).toBe("default-meter");
  });

  it("détecte les versions de schéma", () => {
    expect(detectSchemaVersion({ consumptions: [] })).toBe(0);
    expect(detectSchemaVersion({ meters: [] })).toBe(1);
    expect(detectSchemaVersion({ schemaVersion: 2 })).toBe(2);
  });

  it("migre l'ancien format plat (v0) vers des compteurs", () => {
    const legacy = {
      consumptions: [{ id: "c1", date: "2025-01", kwh: 120 }],
      recharges: [{ id: "r1", date: "2025-01-02", montant: 5000, kwh: 90 }],
      profile: { meterNumber: "0123", ownerName: "A", location: "Douala", email: "" },
    };
    const s = migrateState(legacy);
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(s.meters).toHaveLength(1);
    expect(s.meters[0].consumptions[0].kwh).toBe(120);
    expect(s.meters[0].profile.meterNumber).toBe("0123");
    expect(s.meters[0].emergencyCredits).toEqual([]);
  });

  it("migre v1 vers v2 en ajoutant les crédits d'urgence", () => {
    const v1 = { meters: [{ id: "m1", name: "M", consumptions: [], recharges: [], profile: {} }], activeMeterId: "m1" };
    const s = migrateState(v1);
    expect(s.meters[0].emergencyCredits).toEqual([]);
    expect(s.settings.alerts.rechargeReminder).toBe(true);
  });

  it("corrige un activeMeterId invalide", () => {
    const s = migrateState({ schemaVersion: 2, meters: [{ id: "a" }], activeMeterId: "zzz" });
    expect(s.activeMeterId).toBe("a");
  });

  it("ne rétrograde jamais une version plus récente", () => {
    const s = migrateState({ ...INITIAL_STATE, schemaVersion: 99 });
    expect(s.schemaVersion).toBe(99);
  });

  it("rétablit Infinity sur la dernière tranche après un aller-retour JSON", () => {
    const roundTrip = JSON.parse(JSON.stringify(INITIAL_STATE));
    expect(roundTrip.settings.tariffs.residential.at(-1).max).toBeNull();
    const s = migrateState(roundTrip);
    expect(s.settings.tariffs.residential.at(-1)!.max).toBe(Infinity);
    // Le calcul sur la tranche 800+ doit rester cohérent (tarif de base 99 FCFA + TVA)
    const res = calculateKwh(5000, 0, 900, "residential", 0.1925, s.settings.tariffs);
    expect(res.value).toBeGreaterThan(0);
    expect(res.descriptionLines.join(" ")).not.toContain("null");
  });

  it("préserve les champs inconnus des compteurs", () => {
    const s = migrateState({ schemaVersion: 2, meters: [{ id: "a", futureField: 42 }] });
    expect((s.meters[0] as any).futureField).toBe(42);
  });
});

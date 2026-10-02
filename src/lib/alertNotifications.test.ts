import { describe, it, expect } from "vitest";
import { planAlertNotifications, planStartCron, periodKey, ALERT_NOTIFICATION_IDS, START_CRON_ID } from "./alertNotifications";
import { AppAlert } from "./alerts";

const start: AppAlert = { id: "start", type: "info", title: "Début du mois", message: "Vérifiez votre crédit" };
const high: AppAlert = { id: "high", type: "warning", title: "Seuil élevé", message: "Seuil dépassé" };
const at = (d: number, h = 12, m = 8) => new Date(2026, m, d, h, 0, 0); // septembre 2026 par défaut
const cron = { startCronPending: false, startDay: 1 };

describe("planAlertNotifications", () => {
  it("poste une alerte active qui n'a pas encore été postée ce mois-ci", () => {
    const r = planAlertNotifications([start], {}, at(2), cron);
    expect(r.post).toHaveLength(1);
    expect(r.post[0]).toMatchObject({ id: ALERT_NOTIFICATION_IDS.start, title: "Début du mois", autoCancel: false });
    expect(r.nextPosted.start).toBe("2026-09");
  });
  it("ne la reposte pas tant que la période est la même (pas de répétition quotidienne)", () => {
    const posted = { start: "2026-09" as const };
    expect(planAlertNotifications([start], posted, at(3), cron).post).toEqual([]);
    expect(planAlertNotifications([start], posted, at(5, 23), cron).post).toEqual([]);
  });
  it("la reposte le mois suivant", () => {
    const r = planAlertNotifications([start], { start: "2026-09" }, at(1, 12, 9), cron);
    expect(r.post).toHaveLength(1);
    expect(r.nextPosted.start).toBe("2026-10");
  });
  it("RETIRE la notification quand l'alerte n'est plus active (fin de la période du tableau de bord)", () => {
    const r = planAlertNotifications([], { start: "2026-09" }, at(6), cron);
    expect(r.post).toEqual([]);
    expect(r.removeIds).toContain(ALERT_NOTIFICATION_IDS.start);
    expect(r.removeIds).toContain(START_CRON_ID);
    expect(r.nextPosted.start).toBeUndefined();
  });
  it("la version immédiate remplace celle du déclencheur mensuel (jamais deux « Début du mois »)", () => {
    expect(planAlertNotifications([start], {}, at(2), cron).removeIds).toContain(START_CRON_ID);
  });
  it("le jour J avant 08:00, laisse le déclencheur mensuel publier à 08:00 (et ne marque rien comme posté)", () => {
    const r = planAlertNotifications([start], {}, at(1, 6), { startCronPending: true, startDay: 1 });
    expect(r.post).toEqual([]);
    expect(r.nextPosted.start).toBeUndefined();
    // …mais après 08:00, ou sans déclencheur, on poste
    expect(planAlertNotifications([start], {}, at(1, 9), { startCronPending: true, startDay: 1 }).post).toHaveLength(1);
    expect(planAlertNotifications([start], {}, at(1, 6), cron).post).toHaveLength(1);
  });
  it("gère plusieurs alertes indépendamment", () => {
    const r = planAlertNotifications([start, high], { start: "2026-09" }, at(3), cron);
    expect(r.post.map((p) => p.alertId)).toEqual(["high"]);
    expect(r.post[0].autoCancel).toBe(true);
    expect(r.nextPosted).toEqual({ start: "2026-09", high: "2026-09" });
  });
  it("ne modifie pas l'état d'entrée", () => {
    const posted = { start: "2026-09" as const };
    planAlertNotifications([], posted, at(6), cron);
    expect(posted).toEqual({ start: "2026-09" });
  });
});

describe("planStartCron", () => {
  it("programme seulement si les notifications ET l'alerte sont activées", () => {
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 1 }).schedule).toBe(true);
    expect(planStartCron({ enabled: false, startOfMonth: true, startDay: 1 }).schedule).toBe(false);
    expect(planStartCron({ enabled: true, startOfMonth: false, startDay: 1 }).schedule).toBe(false);
  });
  it("borne le jour à 1-28 (valable tous les mois)", () => {
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 31 }).day).toBe(28);
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 0 }).day).toBe(1);
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: NaN }).day).toBe(1);
  });
  it("change de signature quand le jour change (pour reprogrammer)", () => {
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 1 }).signature).not.toBe(planStartCron({ enabled: true, startOfMonth: true, startDay: 3 }).signature);
  });
});

describe("periodKey", () => {
  it("formate année-mois", () => expect(periodKey(new Date(2026, 0, 31))).toBe("2026-01"));
});

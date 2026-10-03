import { describe, it, expect } from "vitest";
import { planAlertNotifications, planStartCron, periodKey, forgetInactive, markPosted, alertIdForNotificationId, ALERT_NOTIFICATION_IDS, START_CRON_ID } from "./alertNotifications";
import { AppAlert } from "./alerts";

const start: AppAlert = { id: "start", type: "info", title: "Début du mois", message: "Vérifiez votre crédit" };
const high: AppAlert = { id: "high", type: "warning", title: "Seuil élevé", message: "Seuil dépassé" };
const anomaly: AppAlert = { id: "anomaly", type: "error", title: "Hausse inhabituelle", message: "Hausse détectée" };
const at = (d: number, h = 12, m = 8) => new Date(2026, m, d, h, 0, 0); // septembre 2026 par défaut
const cron = { startCronPending: false, startDay: 1 };
const none = new Set<AppAlert["id"]>();

describe("planAlertNotifications", () => {
  it("poste une alerte active absente de la zone de notification", () => {
    const r = planAlertNotifications([start], none, at(2), cron);
    expect(r.post).toHaveLength(1);
    expect(r.post[0]).toMatchObject({ id: ALERT_NOTIFICATION_IDS.start, title: "Début du mois", body: "Vérifiez votre crédit" });
  });
  it("NE la reposte pas si elle est déjà affichée (pas de doublon)", () => {
    const r = planAlertNotifications([start], new Set(["start"]), at(3), cron);
    expect(r.post).toEqual([]);
    expect(r.removeIds).toEqual([]);
  });
  it("la repose si elle a disparu de la zone de notification alors qu'elle est toujours active", () => {
    // swipe, nettoyage du système, reboot : plus rien d'affiché, l'app la remit
    expect(planAlertNotifications([start], none, at(3), cron).post).toHaveLength(1);
    expect(planAlertNotifications([start], none, at(5, 23), cron).post).toHaveLength(1);
  });
  it("RETIRE la notification quand l'alerte n'est plus active (fin de la période du tableau de bord)", () => {
    const r = planAlertNotifications([], new Set(["start", "high"]), at(6), cron);
    expect(r.post).toEqual([]);
    expect(r.removeIds).toContain(ALERT_NOTIFICATION_IDS.start);
    expect(r.removeIds).toContain(ALERT_NOTIFICATION_IDS.high);
    expect(r.removeIds).toContain(START_CRON_ID);
  });
  it("ne retire pas une alerte encore active (donc jamais de retrait inutile)", () => {
    expect(planAlertNotifications([start, high], new Set(["start"]), at(3), cron).removeIds).toEqual([]);
  });
  it("la version immédiate remplace celle du déclencheur mensuel (jamais deux « Début du mois »)", () => {
    expect(planAlertNotifications([start], none, at(2), cron).removeIds).toContain(START_CRON_ID);
  });
  it("ne poste rien si la version programmée de « Début du mois » est déjà affichée", () => {
    expect(planAlertNotifications([start], new Set(["start"]), at(1, 9), { startCronPending: true, startDay: 1 }).post).toEqual([]);
  });
  it("le jour J avant 08:00, laisse le déclencheur mensuel publier à 08:00", () => {
    expect(planAlertNotifications([start], none, at(1, 6), { startCronPending: true, startDay: 1 }).post).toEqual([]);
    // …mais après 08:00, ou sans déclencheur, on poste
    expect(planAlertNotifications([start], none, at(1, 9), { startCronPending: true, startDay: 1 }).post).toHaveLength(1);
    expect(planAlertNotifications([start], none, at(1, 6), cron).post).toHaveLength(1);
  });
  it("gère plusieurs alertes indépendamment", () => {
    const r = planAlertNotifications([start, high, anomaly], new Set(["start"]), at(3), cron);
    expect(r.post.map((p) => p.alertId)).toEqual(["high", "anomaly"]);
  });
  it("ne modifie pas l'ensemble d'entrée", () => {
    const delivered = new Set<AppAlert["id"]>(["start"]);
    planAlertNotifications([high], delivered, at(3), cron);
    expect([...delivered]).toEqual(["start"]);
  });
});

describe("alertIdForNotificationId", () => {
  it("associe chaque identifiant d'alerte à son alerte", () => {
    expect(alertIdForNotificationId(ALERT_NOTIFICATION_IDS.start)).toBe("start");
    expect(alertIdForNotificationId(ALERT_NOTIFICATION_IDS.high)).toBe("high");
    expect(alertIdForNotificationId(ALERT_NOTIFICATION_IDS.anomaly)).toBe("anomaly");
  });
  it("associe le déclencheur mensuel à « Début du mois »", () => {
    expect(alertIdForNotificationId(START_CRON_ID)).toBe("start");
  });
  it("ignore les notifications qui ne sont pas des alertes (rappels de recharge, test)", () => {
    expect(alertIdForNotificationId(71099)).toBeUndefined();
    expect(alertIdForNotificationId(71050)).toBeUndefined();
  });
});

describe("markPosted / forgetInactive (navigateur)", () => {
  it("marque la période des alertes postées sans muter l'entrée", () => {
    const before = { start: "2026-09" };
    const after = markPosted(before, ["high"], "2026-09");
    expect(after).toEqual({ start: "2026-09", high: "2026-09" });
    expect(before).toEqual({ start: "2026-09" });
  });
  it("oublie les alertes devenues inactives", () => {
    expect(forgetInactive({ start: "2026-09", high: "2026-09" }, ["start"])).toEqual({ start: "2026-09" });
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

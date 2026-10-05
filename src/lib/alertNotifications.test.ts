import { describe, it, expect } from "vitest";
import { planAlertNotifications, planStartCron, periodKey, alertIdFromNotificationId, ALERT_NOTIFICATION_IDS as IDS, START_CRON_ID } from "./alertNotifications";
import { AppAlert } from "./alerts";

const start: AppAlert = { id: "start", type: "info", title: "Début du mois", message: "Vérifiez votre crédit" };
const high: AppAlert = { id: "high", type: "warning", title: "Seuil élevé", message: "Seuil dépassé" };
const at = (d: number, h = 12, m = 8) => new Date(2026, m, d, h, 0, 0); // septembre 2026 par défaut
const none = new Set<number>();
const noDismiss = new Set<never>();
const plan = (alerts: AppAlert[], over: Partial<Parameters<typeof planAlertNotifications>[0]> = {}) =>
  planAlertNotifications({ alerts, presentIds: none, dismissedThisSession: noDismiss, posted: {}, now: at(2), ...over });

describe("planAlertNotifications — la zone de notification reflète les alertes actives", () => {
  it("publie une alerte active absente de la zone de notification (première fois : avec son)", () => {
    const r = plan([start]);
    expect(r.post).toHaveLength(1);
    expect(r.post[0]).toMatchObject({ id: IDS.start, title: "Début du mois", loud: true });
    expect(r.nextPosted.start).toBe("2026-09");
  });

  it("ne republie rien tant que la notification est présente (idempotent)", () => {
    const r = plan([start], { presentIds: new Set([IDS.start]), posted: { start: "2026-09" } });
    expect(r.post).toEqual([]);
    expect(r.removeIds).toEqual([]);
  });

  it("REPUBLIE si la notification a disparu alors que l'alerte est toujours active (silencieusement)", () => {
    const r = plan([start], { posted: { start: "2026-09" }, now: at(4) });
    expect(r.post).toHaveLength(1);
    expect(r.post[0].loud).toBe(false);
  });

  it("une alerte supprimée par « Supprimer » n'est pas republiée pendant ce passage au premier plan…", () => {
    const r = plan([start], { posted: { start: "2026-09" }, dismissedThisSession: new Set(["start" as const]) });
    expect(r.post).toEqual([]);
  });
  it("…mais l'est à l'ouverture suivante (ensemble de session vide) tant que l'alerte est active", () => {
    const r = plan([start], { posted: { start: "2026-09" }, dismissedThisSession: new Set() });
    expect(r.post).toHaveLength(1);
  });

  it("la présence du déclencheur mensuel (application fermée) compte comme présente", () => {
    const r = plan([start], { presentIds: new Set([START_CRON_ID]) });
    expect(r.post).toEqual([]);
    expect(r.nextPosted.start).toBe("2026-09");
  });
  it("jamais deux « Début du mois » : si les deux existent, on retire celle du déclencheur", () => {
    const r = plan([start], { presentIds: new Set([IDS.start, START_CRON_ID]) });
    expect(r.removeIds).toEqual([START_CRON_ID]);
  });

  it("RETIRE la notification quand l'alerte n'est plus active (fin de période)", () => {
    const r = plan([], { presentIds: new Set([IDS.start, START_CRON_ID]), posted: { start: "2026-09" }, now: at(6) });
    expect(r.removeIds.sort()).toEqual([IDS.start, START_CRON_ID].sort());
    expect(r.nextPosted.start).toBeUndefined();
  });
  it("ne retire rien d'inexistant", () => {
    expect(plan([], { posted: { start: "2026-09" } }).removeIds).toEqual([]);
  });

  it("nouveau mois : la republication redevient « avec son »", () => {
    const r = plan([start], { posted: { start: "2026-09" }, now: at(1, 12, 9) });
    expect(r.post[0].loud).toBe(true);
    expect(r.nextPosted.start).toBe("2026-10");
  });

  it("gère plusieurs alertes indépendamment", () => {
    const r = plan([start, high], { presentIds: new Set([IDS.start]), posted: { start: "2026-09" } });
    expect(r.post.map((p) => p.alertId)).toEqual(["high"]);
  });

  it("ne modifie pas ses entrées", () => {
    const posted = { start: "2026-09" as const };
    const present = new Set([IDS.start]);
    plan([], { posted, presentIds: present });
    expect(posted).toEqual({ start: "2026-09" });
    expect([...present]).toEqual([IDS.start]);
  });
});

describe("alertIdFromNotificationId", () => {
  it("retrouve l'alerte, y compris pour le déclencheur mensuel", () => {
    expect(alertIdFromNotificationId(IDS.high)).toBe("high");
    expect(alertIdFromNotificationId(START_CRON_ID)).toBe("start");
    expect(alertIdFromNotificationId(1)).toBeNull();
  });
});

describe("planStartCron", () => {
  it("programme seulement si les notifications ET l'alerte sont activées", () => {
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 1 }).schedule).toBe(true);
    expect(planStartCron({ enabled: false, startOfMonth: true, startDay: 1 }).schedule).toBe(false);
    expect(planStartCron({ enabled: true, startOfMonth: false, startDay: 1 }).schedule).toBe(false);
  });
  it("à minuit, comme le début de la période du tableau de bord", () => {
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 1 }).hour).toBe(0);
  });
  it("borne le jour à 1-28 et change de signature quand il change", () => {
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 31 }).day).toBe(28);
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: NaN }).day).toBe(1);
    expect(planStartCron({ enabled: true, startOfMonth: true, startDay: 1 }).signature).not.toBe(planStartCron({ enabled: true, startOfMonth: true, startDay: 3 }).signature);
  });
});

describe("periodKey", () => {
  it("formate année-mois", () => expect(periodKey(new Date(2026, 0, 31))).toBe("2026-01"));
});

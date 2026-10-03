import { AppAlert } from "./alerts";

/**
 * Notifications système des alertes (zone de notification Android). Planificateur PUR, sans Capacitor, testé.
 *
 * Règle voulue : la zone de notification REFLETE le tableau de bord. Tant qu'une alerte y est affichée, sa notification
 * est présente et y reste (Android `ongoing` : ni balayage ni appui ne la retirent) ; dès que l'alerte n'est plus active,
 * elle est retirée. La source de vérité est ce que le téléphone AFFICHE réellement — pas un compteur local — donc une
 * notification disparue pour une autre raison (balayage sur une surcouche, nettoyage du système…) est reposée à la
 * prochaine ouverture de l'application, et une alerte toujours active n'est jamais repostée en double.
 */

export const ALERT_NOTIFICATION_IDS = { start: 71001, high: 71002, anomaly: 71003 } as const;
/**
 * Déclencheur mensuel (« jour N à 08:00 », même application fermée). Identifiant DIFFÉRENT de la notification immédiate :
 * le plugin annule le minuteur d'un identifiant dès qu'on planifie une autre notification avec ce même identifiant.
 */
export const START_CRON_ID = 71010;
export const START_CRON_HOUR = 8;
export const TEST_NOTIFICATION_ID = 71099;

export type PostedState = Partial<Record<AppAlert["id"], string>>;

/** Alertes actuellement affichées dans la zone de notification du téléphone. */
export type DeliveredAlerts = ReadonlySet<AppAlert["id"]>;

export interface PlannedPost {
  id: number;
  alertId: AppAlert["id"];
  title: string;
  body: string;
}

export interface AlertNotificationActions {
  post: PlannedPost[];
  /** Identifiants à retirer de la zone de notification (alerte devenue inactive, ou remplacement du doublon du déclencheur). */
  removeIds: number[];
}

export const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Alerte à laquelle appartient un identifiant de notification (`START_CRON_ID` = version programmée de « Début du mois »). */
export function alertIdForNotificationId(id: number): AppAlert["id"] | undefined {
  if (id === START_CRON_ID) return "start";
  return (Object.keys(ALERT_NOTIFICATION_IDS) as AppAlert["id"][]).find((key) => ALERT_NOTIFICATION_IDS[key] === id);
}

export function planAlertNotifications(
  alerts: AppAlert[],
  delivered: DeliveredAlerts,
  now: Date,
  opts: { startCronPending: boolean; startDay: number }
): AlertNotificationActions {
  const post: PlannedPost[] = [];
  const removeIds: number[] = [];
  const active = new Set(alerts.map((a) => a.id));

  for (const alert of alerts) {
    if (delivered.has(alert.id)) continue; // déjà dans la zone de notification : on n'y touche pas
    // Le jour J avant 08:00 : le déclencheur mensuel publiera la notification à 08:00, inutile de la doubler maintenant
    if (alert.id === "start" && opts.startCronPending && now.getDate() === opts.startDay && now.getHours() < START_CRON_HOUR) continue;
    post.push({
      id: ALERT_NOTIFICATION_IDS[alert.id],
      alertId: alert.id,
      title: alert.title,
      body: alert.message,
    });
    // La version immédiate remplace celle du déclencheur mensuel (déjà affichée ou non) : jamais deux « Début du mois »
    if (alert.id === "start") removeIds.push(START_CRON_ID);
  }

  // Alertes qui ne sont plus actives : on les retire de la zone de notification
  for (const id of delivered) {
    if (active.has(id)) continue;
    removeIds.push(ALERT_NOTIFICATION_IDS[id]);
    if (id === "start") removeIds.push(START_CRON_ID);
  }
  return { post, removeIds: [...new Set(removeIds)] };
}

/**
 * Historique « une fois par période » du NAVIGATEUR (la Notification API ferme la fenêtre seule après quelques
 * secondes, il n'y a donc pas de zone de notification à interroger). Sans effet sur Android.
 */
export function markPosted(posted: PostedState, ids: readonly AppAlert["id"][], period: string): PostedState {
  const next = { ...posted };
  for (const id of ids) next[id] = period;
  return next;
}

export function forgetInactive(posted: PostedState, activeIds: readonly AppAlert["id"][]): PostedState {
  const active = new Set(activeIds);
  const next: PostedState = {};
  for (const [id, period] of Object.entries(posted) as [AppAlert["id"], string][]) {
    if (active.has(id)) next[id] = period;
  }
  return next;
}

export interface StartCronPlan {
  schedule: boolean;
  /** Jour du mois (1-28 : valable tous les mois). */
  day: number;
  hour: number;
  signature: string;
}

/** Faut-il (re)programmer le déclencheur mensuel « Début du mois » ? */
export function planStartCron(cfg: { enabled: boolean; startOfMonth: boolean; startDay: number }): StartCronPlan {
  const day = Math.min(28, Math.max(1, Math.round(cfg.startDay) || 1));
  const schedule = cfg.enabled && cfg.startOfMonth;
  return { schedule, day, hour: START_CRON_HOUR, signature: `${day}@${START_CRON_HOUR}` };
}

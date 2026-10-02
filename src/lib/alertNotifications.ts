import { AppAlert } from "./alerts";

/**
 * Notifications système des alertes (zone de notification Android). Planificateur PUR, sans Capacitor, testé.
 *
 * Règle voulue : une alerte reste dans la zone de notification AUSSI LONGTEMPS qu'elle est affichée dans le tableau de
 * bord (ex. « Début du mois » : du jour 1 au jour 5), puis disparaît quand elle n'est plus active. Elle n'est postée
 * qu'UNE fois par période (mois) : pas de répétition quotidienne, et si l'utilisateur la balaie, on respecte son choix.
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

export interface PlannedPost {
  id: number;
  alertId: AppAlert["id"];
  title: string;
  body: string;
  /** Faux = un appui sur la notification ouvre l'application SANS la retirer (elle reste tant que l'alerte est active). */
  autoCancel: boolean;
}

export interface AlertNotificationActions {
  post: PlannedPost[];
  /** Identifiants à retirer de la zone de notification (alerte devenue inactive, ou remplacement du doublon du déclencheur). */
  removeIds: number[];
  nextPosted: PostedState;
}

export const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function planAlertNotifications(
  alerts: AppAlert[],
  posted: PostedState,
  now: Date,
  opts: { startCronPending: boolean; startDay: number }
): AlertNotificationActions {
  const period = periodKey(now);
  const nextPosted: PostedState = { ...posted };
  const post: PlannedPost[] = [];
  const removeIds: number[] = [];
  const active = new Set(alerts.map((a) => a.id));

  for (const alert of alerts) {
    if (posted[alert.id] === period) continue; // déjà postée pour cette période
    // Le jour J avant 08:00 : le déclencheur mensuel publiera la notification à 08:00, inutile de la doubler maintenant
    if (alert.id === "start" && opts.startCronPending && now.getDate() === opts.startDay && now.getHours() < START_CRON_HOUR) continue;
    post.push({
      id: ALERT_NOTIFICATION_IDS[alert.id],
      alertId: alert.id,
      title: alert.title,
      body: alert.message,
      autoCancel: alert.id !== "start",
    });
    nextPosted[alert.id] = period;
    // La version immédiate remplace celle du déclencheur mensuel (déjà affichée ou non) : jamais deux « Début du mois »
    if (alert.id === "start") removeIds.push(START_CRON_ID);
  }

  // Alertes qui ne sont plus actives : on les retire de la zone de notification
  for (const id of Object.keys(posted) as AppAlert["id"][]) {
    if (active.has(id)) continue;
    removeIds.push(ALERT_NOTIFICATION_IDS[id]);
    if (id === "start") removeIds.push(START_CRON_ID);
    delete nextPosted[id];
  }
  return { post, removeIds: [...new Set(removeIds)], nextPosted };
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

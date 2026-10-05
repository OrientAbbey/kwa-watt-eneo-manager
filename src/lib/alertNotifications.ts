import { AppAlert } from "./alerts";

/**
 * Notifications système des alertes (zone de notification Android). Planificateur PUR, sans Capacitor, testé.
 *
 * Règle voulue — la zone de notification REFLÈTE les alertes actives de l'application :
 *  - une alerte active est affichée en permanence (notification « ongoing » : on ne peut pas la balayer) ;
 *  - on ne la retire qu'avec le bouton « Supprimer » de la notification ;
 *  - mais à chaque ouverture / retour au premier plan, si l'alerte est TOUJOURS active et que sa notification a disparu
 *    (bouton « Supprimer », ou le plugin retire une notification touchée), elle est republiée ;
 *  - quand l'alerte n'est plus active, la notification est retirée.
 * On compare donc l'état voulu (alertes actives) à l'état réel (notifications présentes) : c'est idempotent.
 */

export const ALERT_NOTIFICATION_IDS = { start: 71001, high: 71002, anomaly: 71003 } as const;
/**
 * Déclencheur mensuel « Début du mois » (même application fermée). Identifiant DIFFÉRENT de la notification immédiate :
 * le plugin annule le minuteur d'un identifiant dès qu'on planifie une autre notification avec ce même identifiant.
 */
export const START_CRON_ID = 71010;
/** Minuit : la notification apparaît dès le début de la période, comme sur le tableau de bord (publiée sans son). */
export const START_CRON_HOUR = 0;
export const TEST_NOTIFICATION_ID = 71099;

/** Type d'actions enregistré auprès du plugin et identifiant du bouton « Supprimer ». */
export const ALERT_ACTION_TYPE = "KWA_ALERT";
export const ALERT_ACTION_DISMISS = "dismiss";
export const ALERT_ACTION_LABEL = "Supprimer";

export type AlertId = AppAlert["id"];
export type PostedState = Partial<Record<AlertId, string>>;

/** Alerte correspondant à un identifiant de notification (ou null). Le déclencheur mensuel correspond à « start ». */
export function alertIdFromNotificationId(id: number): AlertId | null {
  if (id === START_CRON_ID) return "start";
  const entry = (Object.entries(ALERT_NOTIFICATION_IDS) as [AlertId, number][]).find(([, v]) => v === id);
  return entry ? entry[0] : null;
}

export interface PlannedPost {
  id: number;
  alertId: AlertId;
  title: string;
  body: string;
  /** Vrai = première publication de la période (son + bandeau). Faux = republication silencieuse. */
  loud: boolean;
}

export interface AlertNotificationActions {
  post: PlannedPost[];
  /** Identifiants à retirer (alerte devenue inactive, ou doublon du déclencheur mensuel). */
  removeIds: number[];
  nextPosted: PostedState;
}

export const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function planAlertNotifications(input: {
  alerts: AppAlert[];
  /** Identifiants des notifications actuellement affichées dans la zone de notification. */
  presentIds: ReadonlySet<number>;
  /** Alertes retirées par « Supprimer » PENDANT ce passage au premier plan : on les laisse tranquilles jusqu'à la prochaine ouverture. */
  dismissedThisSession: ReadonlySet<AlertId>;
  posted: PostedState;
  now: Date;
}): AlertNotificationActions {
  const { alerts, presentIds, dismissedThisSession, posted, now } = input;
  const period = periodKey(now);
  const nextPosted: PostedState = { ...posted };
  const post: PlannedPost[] = [];
  const removeIds: number[] = [];
  const active = new Set(alerts.map((a) => a.id));

  for (const alert of alerts) {
    const ownId = ALERT_NOTIFICATION_IDS[alert.id];
    const startPresent = alert.id === "start" && presentIds.has(START_CRON_ID);
    const present = presentIds.has(ownId) || startPresent;

    // Jamais deux « Début du mois » : si la version immédiate et celle du déclencheur sont là, on garde l'immédiate
    if (alert.id === "start" && presentIds.has(ownId) && presentIds.has(START_CRON_ID)) removeIds.push(START_CRON_ID);

    if (present) {
      nextPosted[alert.id] = period;
      continue;
    }
    if (dismissedThisSession.has(alert.id)) continue; // supprimée à l'instant par l'utilisateur
    post.push({
      id: ownId,
      alertId: alert.id,
      title: alert.title,
      body: alert.message,
      loud: posted[alert.id] !== period,
    });
    nextPosted[alert.id] = period;
  }

  // Alertes qui ne sont plus actives : on retire ce qui est affiché
  for (const id of Object.keys(ALERT_NOTIFICATION_IDS) as AlertId[]) {
    if (active.has(id)) continue;
    if (presentIds.has(ALERT_NOTIFICATION_IDS[id])) removeIds.push(ALERT_NOTIFICATION_IDS[id]);
    if (id === "start" && presentIds.has(START_CRON_ID)) removeIds.push(START_CRON_ID);
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

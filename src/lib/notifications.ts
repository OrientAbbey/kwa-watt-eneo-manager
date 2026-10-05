import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppAlert } from './alerts';
import { REMINDER_IDS, ReminderPlan } from './reminders';
import { ALERT_ACTION_DISMISS, ALERT_ACTION_LABEL, ALERT_ACTION_TYPE, ALERT_NOTIFICATION_IDS, AlertId, PostedState, START_CRON_ID, TEST_NOTIFICATION_ID, alertIdFromNotificationId, periodKey, planAlertNotifications, planStartCron } from './alertNotifications';

const isNativePlatform = Capacitor.isNativePlatform();
const scheduledKey = 'kwawatt_reminders_sched';

/** Canal Android dédié : sans canal explicite, certaines versions/surcouches n'affichent pas (ou rendent muettes) les notifications. */
export const NOTIFICATION_CHANNEL_ID = 'kwawatt-alerts';
/** Canal SILENCIEUX pour les alertes persistantes republiées (visibles dans la zone de notification, sans son ni bandeau). */
export const PERSISTENT_CHANNEL_ID = 'kwawatt-persistent';
/** Événement interne : relancer la réconciliation des notifications (ex. appui sur une notification pendant que l'application est ouverte). */
export const RESYNC_EVENT = 'kwawatt-resync-notifications';
/** Icône monochrome dans la barre d'état (res/drawable/ic_stat_notify.xml). */
export const NOTIFICATION_SMALL_ICON = 'ic_stat_notify';
export const NOTIFICATION_COLOR = '#F97316';

export function notificationsSupported(): boolean {
  if (isNativePlatform) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform) {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  }
  if (!notificationsSupported()) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

async function hasNativePermission(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

let channelReady: Promise<void> | null = null;

/** Crée les canaux de notification Android (idempotent). À appeler avant toute planification. */
export function ensureNotificationChannel(): Promise<void> {
  if (!isNativePlatform || Capacitor.getPlatform() !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = (async () => {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Alertes et rappels',
        description: 'Alertes de consommation et rappels de recharge',
        importance: 4, // IMPORTANCE_HIGH : s'affiche dans la zone de notification avec son et bandeau
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: NOTIFICATION_COLOR,
      });
      await LocalNotifications.createChannel({
        id: PERSISTENT_CHANNEL_ID,
        name: 'Alertes persistantes (silencieuses)',
        description: "Alertes toujours actives, affichées dans la zone de notification sans son ni bandeau",
        importance: 2, // IMPORTANCE_LOW : visible dans la zone de notification, silencieux
        visibility: 1,
        vibration: false,
      });
    })().catch((e) => {
      console.warn('Création des canaux de notification impossible', e);
      channelReady = null;
    });
  }
  return channelReady;
}

const nativeBase = {
  channelId: NOTIFICATION_CHANNEL_ID,
  smallIcon: NOTIFICATION_SMALL_ICON,
  iconColor: NOTIFICATION_COLOR,
};

/** Alertes persistantes : « ongoing » (non balayables), un appui n'est pas censé les retirer, bouton « Supprimer ». */
const persistentBase = (loud: boolean) => ({
  ...nativeBase,
  channelId: loud ? NOTIFICATION_CHANNEL_ID : PERSISTENT_CHANNEL_ID,
  ongoing: true,
  autoCancel: false,
  actionTypeId: ALERT_ACTION_TYPE,
});

// ─────────── Actions sur les notifications (bouton « Supprimer ») ───────────

/** Alertes supprimées via « Supprimer » pendant le passage au premier plan courant ; vidé quand l'application passe en arrière-plan. */
const dismissedThisSession = new Set<AlertId>();
let actionsInit: Promise<void> | null = null;

/**
 * À appeler UNE fois au démarrage, AVANT la première réconciliation. Enregistre le bouton « Supprimer » et écoute son
 * événement. Au démarrage à froid via ce bouton, l'événement est retenu par le plugin jusqu'à l'ajout de l'écouteur.
 */
export function initAlertNotificationActions(): Promise<void> {
  if (!isNativePlatform) return Promise.resolve();
  if (!actionsInit) {
    actionsInit = (async () => {
      await LocalNotifications.registerActionTypes({
        types: [{ id: ALERT_ACTION_TYPE, actions: [{ id: ALERT_ACTION_DISMISS, title: ALERT_ACTION_LABEL }] }],
      });
      await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        if (event.actionId !== ALERT_ACTION_DISMISS) {
          // Appui sur la notification : le plugin la retire. L'application est (ou va être) au premier plan : on republie
          // tout de suite, sinon elle ne reviendrait qu'à la prochaine ouverture.
          window.dispatchEvent(new Event(RESYNC_EVENT));
          return;
        }
        const alertId = alertIdFromNotificationId(event.notification?.id);
        if (alertId) dismissedThisSession.add(alertId);
      });
      document.addEventListener('visibilitychange', () => {
        // Quand l'utilisateur quitte l'application, la prochaine ouverture republiera ce qui est encore actif
        if (document.visibilityState === 'hidden') dismissedThisSession.clear();
      });
      // Laisse le temps à un événement « Supprimer » retenu (démarrage à froid) d'arriver avant la 1re réconciliation
      await new Promise((r) => setTimeout(r, 400));
    })().catch((e) => {
      console.warn('Actions de notification indisponibles', e);
      actionsInit = null;
    });
  }
  return actionsInit;
}

/** État d'autorisation des notifications côté téléphone. */
export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (isNativePlatform) {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'unsupported';
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

const postedKey = 'kwawatt_alert_notif_state';
const cronSigKey = 'kwawatt_start_cron_sig';

const loadPosted = (): PostedState => {
  try {
    return JSON.parse(localStorage.getItem(postedKey) || '{}');
  } catch {
    return {};
  }
};
const savePosted = (p: PostedState) => {
  try {
    localStorage.setItem(postedKey, JSON.stringify(p));
  } catch { /* sans conséquence : au pire l'alerte est reposée */ }
};

export interface AlertSyncConfig {
  /** Notifications activées dans l'application. */
  enabled: boolean;
  startOfMonth: boolean;
  startDay: number;
}

/**
 * Aligne la zone de notification sur les alertes ACTIVES du tableau de bord :
 *  - une alerte active est postée UNE fois par mois (immédiatement : aucune alarme, aucun délai, aucune permission
 *    « alarme exacte » nécessaire) et reste affichée tant qu'elle est active ;
 *  - une alerte qui n'est plus active est retirée ;
 *  - « Début du mois » est aussi programmé chaque mois à 08:00, même si l'application reste fermée.
 */
let syncChain: Promise<unknown> = Promise.resolve();

/** Les passages sont mis en file : deux réconciliations simultanées voyaient toutes deux la notification absente et la publiaient deux fois. */
export function syncAlertNotifications(alerts: AppAlert[], cfg: AlertSyncConfig, now: Date = new Date()): Promise<void> {
  const run = syncChain.then(() => doSyncAlertNotifications(alerts, cfg, now));
  syncChain = run.catch(() => undefined);
  return run;
}

async function doSyncAlertNotifications(alerts: AppAlert[], cfg: AlertSyncConfig, now: Date): Promise<void> {
  const cron = planStartCron({ enabled: cfg.enabled, startOfMonth: cfg.startOfMonth, startDay: cfg.startDay });

  if (!isNativePlatform) {
    // Navigateur : Notification API, une fois par période (pas de notification persistante hors Android)
    if (!cfg.enabled || !notificationsSupported() || Notification.permission !== 'granted') return;
    const prev = loadPosted();
    const plan = planAlertNotifications({ alerts, presentIds: new Set((Object.keys(prev) as AlertId[]).filter((k) => prev[k] === periodKey(now)).map((k) => ALERT_NOTIFICATION_IDS[k])), dismissedThisSession: new Set(), posted: prev, now });
    plan.post.forEach((p) => {
      const n = new Notification(p.title, { body: p.body, tag: p.alertId });
      setTimeout(() => n.close(), 8000);
    });
    savePosted(plan.nextPosted);
    return;
  }

  if (!cfg.enabled) {
    // Désactivées : on retire le déclencheur mensuel ET tout ce qui est affiché (les notifications persistantes ne
    // peuvent pas être balayées : c'est le moyen de les faire disparaître), et on oublie l'historique.
    await cancelStartCron();
    try {
      const ids = [...Object.values(ALERT_NOTIFICATION_IDS), START_CRON_ID];
      await LocalNotifications.removeDeliveredNotifications({ notifications: ids.map((id) => ({ id, title: '', body: '' })) });
    } catch { /* rien à retirer */ }
    savePosted({});
    return;
  }
  if (!(await hasNativePermission())) return;
  await ensureNotificationChannel();

  await initAlertNotificationActions();

  // 1) Déclencheur mensuel « Début du mois » : persistant, silencieux, à minuit (début de la période du tableau de bord)
  try {
    if (cron.schedule) {
      const pending = await LocalNotifications.getPending();
      const exists = pending.notifications.some((n) => n.id === START_CRON_ID);
      if (!exists || localStorage.getItem(cronSigKey) !== cron.signature) {
        await LocalNotifications.schedule({
          notifications: [{
            id: START_CRON_ID,
            title: 'Début du mois',
            body: "N'oubliez pas de vérifier votre crédit et de recharger si nécessaire.",
            // « chaque mois, le jour N à minuit » : le plugin se reprogramme tout seul après chaque déclenchement
            schedule: { on: { day: cron.day, hour: cron.hour, minute: 0, second: 0 }, allowWhileIdle: true },
            ...persistentBase(false),
          }],
        });
        try { localStorage.setItem(cronSigKey, cron.signature); } catch { /* sans conséquence */ }
      }
    } else {
      await cancelStartCron();
    }
  } catch (e) {
    console.warn('Programmation de « Début du mois » impossible', e);
  }

  // 2) Réconciliation : ce qui est affiché doit refléter les alertes ACTIVES
  let presentIds = new Set<number>();
  try {
    const { notifications } = await LocalNotifications.getDeliveredNotifications();
    presentIds = new Set(notifications.map((n) => n.id));
  } catch (e) {
    console.warn('Lecture des notifications affichées impossible', e);
  }
  const plan = planAlertNotifications({ alerts, presentIds, dismissedThisSession, posted: loadPosted(), now });
  const posted = { ...plan.nextPosted };
  if (plan.removeIds.length > 0) {
    try {
      await LocalNotifications.removeDeliveredNotifications({ notifications: plan.removeIds.map((id) => ({ id, title: '', body: '' })) });
    } catch (e) {
      console.warn('Retrait de notifications impossible', e);
    }
  }
  for (const p of plan.post) {
    try {
      // Sans `schedule` : le plugin affiche la notification immédiatement (pas d'alarme)
      await LocalNotifications.schedule({
        notifications: [{ id: p.id, title: p.title, body: p.body, ...persistentBase(p.loud) }],
      });
    } catch (e) {
      // ex. « Notifications not enabled on this device » : coupées dans les réglages du téléphone. On ne marque pas
      // comme postée pour réessayer dès que ce sera réparé.
      console.warn('Affichage de la notification impossible', p.alertId, e);
      delete posted[p.alertId];
    }
  }
  savePosted(posted);
}

async function cancelStartCron(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: START_CRON_ID }] });
    localStorage.removeItem(cronSigKey);
  } catch { /* rien à annuler */ }
}

export type TestNotificationResult = { ok: true } | { ok: false; reason: 'unsupported' | 'permission' | 'os_disabled' | 'channel_blocked' | 'error'; message: string };

/** Envoie tout de suite une notification de test : dit précisément pourquoi si elle ne peut pas s'afficher. */
export async function sendTestNotification(): Promise<TestNotificationResult> {
  if (!notificationsSupported()) return { ok: false, reason: 'unsupported', message: "Les notifications ne sont pas disponibles sur cet appareil." };
  if (!(await requestNotificationPermission())) {
    return { ok: false, reason: 'permission', message: "Autorisation refusée. Ouvrez Réglages du téléphone → Applications → KWA-WATT → Notifications et autorisez-les." };
  }
  if (!isNativePlatform) {
    new Notification('KWA-WATT', { body: 'Test : les notifications fonctionnent.' });
    return { ok: true };
  }
  try {
    await ensureNotificationChannel();
    const { channels } = await LocalNotifications.listChannels();
    const ours = channels.find((c) => c.id === NOTIFICATION_CHANNEL_ID);
    if (ours && (ours.importance as number) === 0) { // IMPORTANCE_NONE : catégorie désactivée par l'utilisateur
      return { ok: false, reason: 'channel_blocked', message: "La catégorie « Alertes et rappels » est désactivée : Réglages du téléphone → Applications → KWA-WATT → Notifications → Alertes et rappels." };
    }
    await LocalNotifications.schedule({
      notifications: [{ id: TEST_NOTIFICATION_ID, title: 'KWA-WATT', body: 'Test : les notifications fonctionnent. Vous pouvez fermer l\'application.', autoCancel: true, ...nativeBase }],
    });
    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (/not enabled/i.test(msg)) {
      return { ok: false, reason: 'os_disabled', message: "Les notifications de KWA-WATT sont désactivées dans les réglages du téléphone (Applications → KWA-WATT → Notifications)." };
    }
    return { ok: false, reason: 'error', message: `Envoi impossible : ${msg}` };
  }
}

type ScheduledMap = Record<string, number>;
const loadScheduled = (): ScheduledMap => {
  try {
    return JSON.parse(localStorage.getItem(scheduledKey) || '{}');
  } catch {
    return {};
  }
};

/**
 * Planifie (ou replanifie) les rappels de recharge à venir. Les anciens rappels sont annulés puis remplacés :
 * appeler cette fonction à chaque modification des données est donc sans danger (jamais de doublon).
 * Un rappel déjà délivré pour la même échéance n'est pas renvoyé.
 */
export async function syncRechargeReminders(plans: ReminderPlan[], now: number = Date.now()): Promise<void> {
  if (!isNativePlatform) return;
  if (!(await hasNativePermission())) return;
  await ensureNotificationChannel();

  const scheduled = loadScheduled();
  // purge des entrées de plus de 60 jours
  for (const [k, at] of Object.entries(scheduled)) if (now - at > 60 * 24 * 3600 * 1000) delete scheduled[k];

  try {
    await LocalNotifications.cancel({ notifications: REMINDER_IDS.map((id) => ({ id })) });
  } catch (e) {
    console.warn('Annulation des rappels impossible', e);
  }

  const toSchedule = plans.filter((p) => !(scheduled[p.key] !== undefined && scheduled[p.key] <= now));
  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({
      notifications: toSchedule.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
        autoCancel: true,
        ...nativeBase,
      })),
    });
    toSchedule.forEach((p) => { scheduled[p.key] = p.at.getTime(); });
  }
  try {
    localStorage.setItem(scheduledKey, JSON.stringify(scheduled));
  } catch { /* sans conséquence */ }
}

export async function cancelRechargeReminders(): Promise<void> {
  if (!isNativePlatform) return;
  try {
    await LocalNotifications.cancel({ notifications: REMINDER_IDS.map((id) => ({ id })) });
  } catch { /* rien à annuler */ }
}

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppAlert } from './alerts';
import { REMINDER_IDS, ReminderPlan } from './reminders';
import { ALERT_NOTIFICATION_IDS, PostedState, START_CRON_ID, TEST_NOTIFICATION_ID, planAlertNotifications, planStartCron } from './alertNotifications';

const isNativePlatform = Capacitor.isNativePlatform();
const scheduledKey = 'kwawatt_reminders_sched';

/** Canal Android dédié : sans canal explicite, certaines versions/surcouches n'affichent pas (ou rendent muettes) les notifications. */
export const NOTIFICATION_CHANNEL_ID = 'kwawatt-alerts';
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

/** Crée le canal de notification Android (idempotent). À appeler avant toute planification. */
export function ensureNotificationChannel(): Promise<void> {
  if (!isNativePlatform || Capacitor.getPlatform() !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Alertes et rappels',
      description: 'Alertes de consommation et rappels de recharge',
      importance: 4, // IMPORTANCE_HIGH : s'affiche dans la zone de notification avec son et bandeau
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: NOTIFICATION_COLOR,
    }).catch((e) => {
      console.warn('Création du canal de notification impossible', e);
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
export async function syncAlertNotifications(alerts: AppAlert[], cfg: AlertSyncConfig, now: Date = new Date()): Promise<void> {
  const cron = planStartCron({ enabled: cfg.enabled, startOfMonth: cfg.startOfMonth, startDay: cfg.startDay });

  if (!isNativePlatform) {
    // Navigateur : Notification API, une fois par période
    if (!cfg.enabled || !notificationsSupported() || Notification.permission !== 'granted') return;
    const plan = planAlertNotifications(alerts, loadPosted(), now, { startCronPending: false, startDay: cron.day });
    plan.post.forEach((p) => {
      const n = new Notification(p.title, { body: p.body, tag: p.alertId });
      setTimeout(() => n.close(), 8000);
    });
    savePosted(plan.nextPosted);
    return;
  }

  if (!cfg.enabled) {
    // Désactivées : on retire le déclencheur mensuel ET ce qui est déjà affiché, et on oublie l'historique
    // (réactivées plus tard dans le mois, les alertes encore actives seront reposées).
    await cancelStartCron();
    const posted = loadPosted();
    if (Object.keys(posted).length > 0) {
      try {
        const ids = [...(Object.keys(posted) as AppAlert['id'][]).map((k) => ALERT_NOTIFICATION_IDS[k]), START_CRON_ID];
        await LocalNotifications.removeDeliveredNotifications({ notifications: ids.map((id) => ({ id, title: '', body: '' })) });
      } catch { /* rien à retirer */ }
      savePosted({});
    }
    return;
  }
  if (!(await hasNativePermission())) return;
  await ensureNotificationChannel();

  // 1) Déclencheur mensuel « Début du mois » (re-programmé seulement s'il a changé ou a disparu)
  let cronPending = false;
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
            // « chaque mois, le jour N à 08:00 » : le plugin se reprogramme tout seul après chaque déclenchement
            schedule: { on: { day: cron.day, hour: cron.hour, minute: 0, second: 0 }, allowWhileIdle: true },
            autoCancel: false,
            ...nativeBase,
          }],
        });
        try { localStorage.setItem(cronSigKey, cron.signature); } catch { /* sans conséquence */ }
      }
      cronPending = true;
    } else {
      await cancelStartCron();
    }
  } catch (e) {
    console.warn('Programmation de « Début du mois » impossible', e);
  }

  // 2) Alertes actives : posées maintenant (immédiat) ; inactives : retirées
  const plan = planAlertNotifications(alerts, loadPosted(), now, { startCronPending: cronPending, startDay: cron.day });
  const posted = { ...plan.nextPosted };
  if (plan.removeIds.length > 0) {
    try {
      await LocalNotifications.removeDeliveredNotifications({ notifications: plan.removeIds.map((id) => ({ id, title: '', body: '' })) });
    } catch (e) {
      console.warn('Retrait de notifications impossible', e);
    }
  }
  if (plan.post.length > 0) {
    try {
      // Sans `schedule` : le plugin affiche la notification immédiatement (pas d'alarme)
      await LocalNotifications.schedule({
        notifications: plan.post.map((p) => ({ id: p.id, title: p.title, body: p.body, autoCancel: p.autoCancel, ...nativeBase })),
      });
    } catch (e) {
      // ex. « Notifications not enabled on this device » : coupées dans les réglages du téléphone. On ne marque pas
      // comme postée pour réessayer dès que ce sera réparé.
      console.warn('Affichage des notifications impossible', e);
      plan.post.forEach((p) => delete posted[p.alertId]);
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

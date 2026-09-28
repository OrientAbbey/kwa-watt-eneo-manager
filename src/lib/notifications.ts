import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppAlert } from './alerts';
import { REMINDER_IDS, ReminderPlan } from './reminders';

const isNativePlatform = Capacitor.isNativePlatform();
const lastNotifKey = 'kwawatt_last_alert_notif';
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

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function stableId(alertId: string): number {
  let hash = 0;
  for (let i = 0; i < alertId.length; i++) {
    hash = (hash * 31 + alertId.charCodeAt(i)) >>> 0;
  }
  return hash % 10000;
}

const nativeBase = {
  channelId: NOTIFICATION_CHANNEL_ID,
  smallIcon: NOTIFICATION_SMALL_ICON,
  iconColor: NOTIFICATION_COLOR,
};

/**
 * Envoie les alertes du jour, une seule fois par jour.
 * Mobile : notifications natives affichées dans la zone de notification Android (@capacitor/local-notifications).
 * Web : Notification API du navigateur.
 */
export async function notifyAlerts(alerts: AppAlert[]): Promise<void> {
  if (alerts.length === 0 || !notificationsSupported()) return;
  if (!(await requestNotificationPermission())) return;

  if (localStorage.getItem(lastNotifKey) === todayKey()) return;

  if (isNativePlatform) {
    await ensureNotificationChannel();
    await LocalNotifications.schedule({
      notifications: alerts.map((alert, i) => ({
        id: stableId(alert.id) + i,
        title: alert.title,
        body: alert.message,
        schedule: { at: new Date(Date.now() + (i + 1) * 1000), allowWhileIdle: true },
        // Une notification permanente (ongoing) ne peut pas être balayée : elle ressemblait à un bug.
        autoCancel: true,
        ...nativeBase,
      })),
    });
  } else {
    alerts.forEach((alert) => {
      const notification = new Notification(alert.title, { body: alert.message, tag: alert.id });
      setTimeout(() => notification.close(), 8000);
    });
  }

  localStorage.setItem(lastNotifKey, todayKey());
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

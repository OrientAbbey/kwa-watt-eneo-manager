import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppAlert } from './alerts';

const isNativePlatform = Capacitor.isNativePlatform();
const lastNotifKey = 'kwawatt_last_alert_notif';

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

/**
 * Envoie les alertes du jour, une seule fois par jour.
 * Mobile : notifications natives planifiées (@capacitor/local-notifications).
 * Web : Notification API du navigateur.
 */
export async function notifyAlerts(alerts: AppAlert[]): Promise<void> {
  if (alerts.length === 0 || !notificationsSupported()) return;
  if (!(await requestNotificationPermission())) return;

  if (localStorage.getItem(lastNotifKey) === todayKey()) return;

  if (isNativePlatform) {
    await LocalNotifications.schedule({
      notifications: alerts.map((alert, i) => ({
        id: stableId(alert.id) + i,
        title: alert.title,
        body: alert.message,
        schedule: { at: new Date(Date.now() + (i + 1) * 1000) },
        ongoing: alert.id === 'start',
        autoCancel: alert.id !== 'start',
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
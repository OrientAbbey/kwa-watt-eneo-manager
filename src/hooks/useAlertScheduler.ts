import { useEffect } from "react";
import { useApp } from "../store/AppContext";
import { useRemoteConfig } from "../store/RemoteConfigContext";
import { computeEnergyStatus } from "../lib/energy";
import { planRechargeReminders } from "../lib/reminders";
import { cancelRechargeReminders, notifyAlerts, syncRechargeReminders } from "../lib/notifications";
import { getAlerts } from "../lib/alerts";

/**
 * Monté UNE fois à la racine : les alertes et rappels ne dépendent plus de l'onglet ouvert.
 * - alertes du jour (début de mois, seuil, hausse) : une fois par jour ;
 * - rappels de recharge : replanifiés à chaque changement de données, pour tous les compteurs,
 *   et délivrés par le système même si l'application est fermée.
 */
export function useAlertScheduler() {
  const { state, currentMeter, currentUser } = useApp();
  const { config } = useRemoteConfig();
  const alertsCfg = state.settings.alerts;
  const enabled = !!currentUser && !!alertsCfg?.enableNotifications;

  // Alertes du jour
  useEffect(() => {
    if (!enabled) return;
    const alerts = getAlerts(state, currentMeter);
    notifyAlerts(alerts).catch((e) => console.error("Notifications failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, state.settings.alerts, currentMeter.consumptions]);

  // Rappels de recharge (compteur actif ; les rappels d'un autre compteur sont remplacés au changement)
  useEffect(() => {
    if (!enabled || !alertsCfg.rechargeReminder) {
      cancelRechargeReminders();
      return;
    }
    const timer = setTimeout(() => {
      const status = computeEnergyStatus(currentMeter);
      const plans = planRechargeReminders({
        balanceKwh: status.balanceKwh,
        average6Months: status.average6Months,
        daysBefore: alertsCfg.rechargeReminderDays ?? 3,
        outstandingEmergencyKwh: status.outstandingEmergency,
        minRechargeAmount: config.minRechargeAmount,
        now: new Date(),
        meterLabel: state.meters.length > 1 ? currentMeter.name : undefined,
      });
      syncRechargeReminders(plans).catch((e) => console.error("Rappels de recharge impossibles", e));
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    enabled,
    alertsCfg?.rechargeReminder,
    alertsCfg?.rechargeReminderDays,
    currentMeter.id,
    currentMeter.consumptions,
    currentMeter.recharges,
    currentMeter.emergencyCredits,
    config.minRechargeAmount,
    state.meters.length,
    currentMeter.name,
  ]);
}

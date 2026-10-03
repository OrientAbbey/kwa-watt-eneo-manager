import { useEffect } from "react";
import { useApp } from "../store/AppContext";
import { useRemoteConfig } from "../store/RemoteConfigContext";
import { computeEnergyStatus } from "../lib/energy";
import { planRechargeReminders } from "../lib/reminders";
import { cancelRechargeReminders, syncAlertNotifications, syncRechargeReminders } from "../lib/notifications";
import { useDayKey } from "./useDayKey";
import { getAlerts } from "../lib/alerts";

/**
 * Monté UNE fois à la racine : les alertes et rappels ne dépendent plus de l'onglet ouvert.
 * - alertes (début de mois, seuil, hausse) : la zone de notification reflète le tableau de bord — elles y restent
 *   tant qu'elles sont actives (Android `ongoing` : le balayage ne les retire pas) et sont reposées si elles en
 *   disparaissent, notamment à chaque retour dans l'application ;
 * - rappels de recharge : replanifiés à chaque changement de données, pour tous les compteurs,
 *   et délivrés par le système même si l'application est fermée.
 */
export function useAlertScheduler() {
  const { state, currentMeter, currentUser } = useApp();
  const { config } = useRemoteConfig();
  const alertsCfg = state.settings.alerts;
  const enabled = !!currentUser && !!alertsCfg?.enableNotifications;

  const day = useDayKey();

  // Alertes actives : postées dans la zone de notification et maintenues tant qu'elles sont actives (retirées quand elles
  // ne le sont plus). Recalculé au changement de jour ET à chaque retour dans l'application : si l'utilisateur a fermé
  // l'app puis que la notification a disparu (balayage, nettoyage du système), elle est reposée.
  useEffect(() => {
    const [startDay = 1] = alertsCfg?.startOfMonthDays ?? [1, 5];

    const sync = () => {
      // Notifications désactivées : on retire aussi ce qui était programmé
      const alerts = enabled ? getAlerts(state, currentMeter) : [];
      syncAlertNotifications(alerts, { enabled, startOfMonth: !!alertsCfg?.startOfMonth, startDay }).catch((e) => console.error("Notifications failed", e));
    };
    sync();

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, day, state.settings.alerts, currentMeter.consumptions]);

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

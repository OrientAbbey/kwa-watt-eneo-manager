import { useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getAlerts, AppAlert } from "../lib/alerts";
import { useDayKey } from "./useDayKey";

/** Alertes actives du compteur courant (mêmes que celles du tableau de bord), recalculées au changement de jour. */
export function useActiveAlerts(): AppAlert[] {
  const { state, currentMeter } = useApp();
  const day = useDayKey();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getAlerts(state, currentMeter), [state.settings.alerts, currentMeter.consumptions, day]);
}

import { AppState, MeterData } from '../types';

export interface AppAlert {
  id: 'start' | 'high' | 'anomaly';
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

function monthString(date: Date, offsetMonths = 0): string {
  const d = new Date(date.getFullYear(), date.getMonth() - offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getAlerts(state: AppState, meter: MeterData, now: Date = new Date()): AppAlert[] {
  const alerts: AppAlert[] = [];
  const a = state.settings.alerts;
  const currentDay = now.getDate();
  const [startDay = 1, endDay = 5] = a.startOfMonthDays;

  if (a.startOfMonth && currentDay >= startDay && currentDay <= endDay) {
    alerts.push({
      id: 'start',
      type: 'info',
      title: 'Début du mois',
      message: "N'oubliez pas de vérifier votre crédit et de recharger si nécessaire.",
    });
  }

  const currentMonth = monthString(now);
  const currentConso = meter.consumptions.find(c => c.date === currentMonth)?.kwh ?? 0;

  if (a.highConsumptionThreshold && currentConso >= a.highConsumptionThreshold) {
    alerts.push({
      id: 'high',
      type: 'warning',
      title: 'Seuil de consommation élevé',
      message: `Vous avez dépassé votre seuil d'alerte de ${a.highConsumptionThreshold} kWh.`,
    });
  }

  if (a.anomalyPercentage) {
    const lastMonthConso = meter.consumptions.find(c => c.date === monthString(now, 1))?.kwh ?? 0;
    if (lastMonthConso > 0) {
      const thresholdKwh = lastMonthConso * (1 + a.anomalyPercentage / 100);
      if (currentConso > thresholdKwh) {
        const increase = Math.round(((currentConso / lastMonthConso) - 1) * 100);
        alerts.push({
          id: 'anomaly',
          type: 'error',
          title: 'Hausse brutale détectée',
          message: `Votre consommation actuelle est anormalement plus élevée (+${increase}%) que le mois précédent.`,
        });
      }
    }
  }

  return alerts;
}

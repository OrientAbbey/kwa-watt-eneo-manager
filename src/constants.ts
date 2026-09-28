import { AppState } from "./types";
import { TARIFFS } from "./lib/eneo";

export const DEFAULT_ALERTS: AppState["settings"]["alerts"] = {
  startOfMonth: true,
  startOfMonthDays: [1, 5],
  highConsumptionThreshold: 300,
  anomalyPercentage: 20,
  toastDuration: 6,
  enableNotifications: false,
  rechargeReminder: true,
  rechargeReminderDays: 3,
};

export const DEFAULT_SETTINGS: AppState["settings"] = {
  clientType: "residential",
  tva: 19.25,
  tariffs: TARIFFS,
  tariffsVersion: 1,
  alerts: DEFAULT_ALERTS,
  exportFormat: "csv"
};

/** Version courante du schéma de données. À incrémenter avec une migration dans src/lib/migrations.ts. */
export const CURRENT_SCHEMA_VERSION = 2;

export const INITIAL_STATE: AppState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  meters: [
    {
      id: "default-meter",
      name: "Compteur Principal",
      consumptions: [],
      recharges: [],
      emergencyCredits: [],
      profile: {
        meterNumber: "",
        ownerName: "",
        location: "",
        email: "",
      }
    }
  ],
  activeMeterId: "default-meter",
  settings: DEFAULT_SETTINGS,
  theme: "system",
  helpImages: []
};

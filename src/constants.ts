import { AppState } from "./types";
import { TARIFFS } from "./lib/eneo";

export const DEFAULT_ALERTS: AppState["settings"]["alerts"] = {
  startOfMonth: true,
  startOfMonthDays: [1, 5],
  highConsumptionThreshold: 300,
  anomalyPercentage: 20,
  toastDuration: 6,
  enableNotifications: false
};

export const DEFAULT_SETTINGS: AppState["settings"] = {
  clientType: "residential",
  tva: 19.25,
  tariffs: TARIFFS,
  alerts: DEFAULT_ALERTS,
  exportFormat: "csv"
};

export const INITIAL_STATE: AppState = {
  meters: [
    {
      id: "default-meter",
      name: "Compteur Principal",
      consumptions: [],
      recharges: [],
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

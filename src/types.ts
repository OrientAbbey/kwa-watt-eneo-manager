import { TariffRange } from "./lib/eneo";

export interface Consumption {
  id: string;
  date: string; // YYYY-MM
  kwh: number;
}

export interface Recharge {
  id: string;
  date: string; // YYYY-MM-DD
  montant: number;
  kwh: number;
}

export interface UserProfile {
  meterNumber: string;
  ownerName: string;
  location: string;
  email: string;
  photoRecto?: string; // Base64
  photoVerso?: string; // Base64
  photoMeter?: string; // Base64
  photoProfile?: string; // Base64
}

export interface Settings {
  clientType: "residential" | "professional";
  tva: number;
  tariffs: Record<"residential" | "professional", TariffRange[]>;
  alerts: {
    startOfMonth: boolean;
    startOfMonthDays: [number, number];
    highConsumptionThreshold: number | null;
    anomalyPercentage: number | null;
    toastDuration: number;
    enableNotifications: boolean;
  };
  exportFormat: "csv" | "json";
}

export interface MeterData {
  id: string;
  name: string;
  consumptions: Consumption[];
  recharges: Recharge[];
  profile: UserProfile;
}

export interface AppState {
  meters: MeterData[];
  activeMeterId: string;
  settings: Settings;
  theme: "light" | "dark" | "system";
  helpImages: string[];
}

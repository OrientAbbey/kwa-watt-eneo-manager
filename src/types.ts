import { TariffRange } from "./lib/eneo";

export interface Consumption {
  id: string;
  date: string; // YYYY-MM
  kwh: number;
  updatedAt?: number; // epoch ms, sert à la fusion multi-appareils
}

export interface Recharge {
  id: string;
  date: string; // YYYY-MM-DD
  montant: number;
  kwh: number;
  /** Référence de transaction du SMS de confirmation (ex. BPJJMMAA…), utile pour toute réclamation. */
  transactionRef?: string;
  /** Comment la recharge a été saisie. */
  source?: "manual" | "sms";
  updatedAt?: number;
}

/** Crédit d'urgence (code 811 sur le compteur) : une dette de kWh déduite de la prochaine recharge. */
export interface EmergencyCredit {
  id: string;
  date: string; // YYYY-MM-DD (jour d'activation)
  kwh: number; // 10 kWh en principe
  repaid: boolean;
  repaidAt?: string; // YYYY-MM-DD
  updatedAt?: number;
}

export interface UserProfile {
  meterNumber: string;
  /** Numéro de contrat / d'abonné, demandé par le canal officiel SMS 8010 / WhatsApp. */
  contractNumber?: string;
  /** Année de pose du compteur, utilisée pour le diagnostic de mise à jour TID. */
  installYear?: number;
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
  /** Version de la grille tarifaire (config à distance) appliquée localement. */
  tariffsVersion?: number;
  alerts: {
    startOfMonth: boolean;
    startOfMonthDays: [number, number];
    highConsumptionThreshold: number | null;
    anomalyPercentage: number | null;
    toastDuration: number;
    enableNotifications: boolean;
    /** Rappel proactif de recharge avant épuisement estimé du crédit. */
    rechargeReminder: boolean;
    /** Nombre de jours avant épuisement estimé pour déclencher le rappel. */
    rechargeReminderDays: number;
  };
  exportFormat: "csv" | "json";
}

export interface MeterData {
  id: string;
  name: string;
  consumptions: Consumption[];
  recharges: Recharge[];
  emergencyCredits: EmergencyCredit[];
  profile: UserProfile;
  /** Dernière modification du nom / profil (fusion multi-appareils). */
  updatedAt?: number;
  /** Suppressions d'enregistrements (id -> epoch ms) pour éviter leur résurrection lors d'une fusion. */
  tombstones?: Record<string, number>;
}

export interface AppState {
  /** Version du schéma de données (voir src/lib/migrations.ts). */
  schemaVersion: number;
  meters: MeterData[];
  activeMeterId: string;
  settings: Settings;
  theme: "light" | "dark" | "system";
  helpImages: string[];
  /** Dernière modification des réglages / thème. */
  updatedAt?: number;
  /** Compteurs supprimés (id -> epoch ms). */
  deletedMeters?: Record<string, number>;
}

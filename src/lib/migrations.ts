import { AppState, MeterData } from "../types";
import { INITIAL_STATE, DEFAULT_SETTINGS, DEFAULT_ALERTS, CURRENT_SCHEMA_VERSION } from "../constants";
import { TARIFFS, TariffRange } from "./eneo";

type Raw = Record<string, any>;

/**
 * Chaque étape transforme un état de la version N vers la version N+1.
 * Pour changer le schéma : incrémenter CURRENT_SCHEMA_VERSION (constants.ts) et ajouter une étape ici.
 */
const MIGRATIONS: Record<number, (s: Raw) => Raw> = {
  // v0 -> v1 : ancien format "plat" (un seul compteur) -> tableau de compteurs
  0: (s) => {
    if (Array.isArray(s.meters)) return s;
    return {
      meters: [{
        id: "default-meter",
        name: "Compteur Principal",
        consumptions: s.consumptions || [],
        recharges: s.recharges || [],
        profile: s.profile || {},
      }],
      activeMeterId: "default-meter",
      settings: s.settings,
      theme: s.theme,
      helpImages: s.helpImages || [],
    };
  },
  // v1 -> v2 : crédits d'urgence, horodatages de fusion, version du schéma
  1: (s) => ({
    ...s,
    meters: (s.meters || []).map((m: Raw) => ({ ...m, emergencyCredits: m.emergencyCredits || [] })),
  }),
};

export function detectSchemaVersion(raw: Raw): number {
  if (typeof raw.schemaVersion === "number") return raw.schemaVersion;
  return Array.isArray(raw.meters) ? 1 : 0;
}

/**
 * JSON.stringify transforme Infinity en null : la dernière tranche tarifaire (max = Infinity)
 * revenait donc avec max = null après un rechargement, faussant les calculs. On le rétablit ici.
 */
export function normalizeTariffs(raw: unknown): Record<"residential" | "professional", TariffRange[]> {
  const out = {} as Record<"residential" | "professional", TariffRange[]>;
  for (const type of ["residential", "professional"] as const) {
    const list = (raw as Raw | undefined)?.[type];
    const source: TariffRange[] = Array.isArray(list) && list.length > 0 ? list : TARIFFS[type];
    out[type] = source.map((r) => ({
      min: Number(r.min) || 0,
      max: r.max === null || r.max === undefined || !Number.isFinite(Number(r.max)) ? Infinity : Number(r.max),
      base: Number(r.base) || 0,
      comfort: Number(r.comfort) || 0,
      tva_thresh: r.tva_thresh === null || r.tva_thresh === undefined ? null : Number(r.tva_thresh),
    }));
  }
  return out;
}

function normalizeMeter(raw: Raw, index: number): MeterData {
  const defaultProfile = INITIAL_STATE.meters[0].profile;
  return {
    ...raw,
    id: typeof raw.id === "string" && raw.id ? raw.id : `meter_migrated_${index}`,
    name: typeof raw.name === "string" && raw.name ? raw.name : `Compteur ${index + 1}`,
    consumptions: Array.isArray(raw.consumptions) ? raw.consumptions : [],
    recharges: Array.isArray(raw.recharges) ? raw.recharges : [],
    emergencyCredits: Array.isArray(raw.emergencyCredits) ? raw.emergencyCredits : [],
    profile: { ...defaultProfile, ...(raw.profile || {}) },
  } as MeterData;
}

/** Garantit un état structurellement valide (champs manquants, valeurs corrompues). */
export function normalizeState(raw: Raw): AppState {
  const meters = (Array.isArray(raw.meters) ? raw.meters : []).map(normalizeMeter);
  if (meters.length === 0) meters.push(...INITIAL_STATE.meters.map((m) => ({ ...m })));
  const activeMeterId = meters.some((m) => m.id === raw.activeMeterId) ? raw.activeMeterId : meters[0].id;
  const rawSettings: Raw = raw.settings || {};
  return {
    ...raw,
    schemaVersion: typeof raw.schemaVersion === "number" && raw.schemaVersion > CURRENT_SCHEMA_VERSION
      ? raw.schemaVersion
      : CURRENT_SCHEMA_VERSION,
    meters,
    activeMeterId,
    settings: {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      alerts: { ...DEFAULT_ALERTS, ...(rawSettings.alerts || {}) },
      tariffs: normalizeTariffs(rawSettings.tariffs),
    },
    theme: ["light", "dark", "system"].includes(raw.theme) ? raw.theme : INITIAL_STATE.theme,
    helpImages: Array.isArray(raw.helpImages) ? raw.helpImages : [],
  } as AppState;
}

/** Point d'entrée unique : localStorage, cloud et import passent tous par ici. */
export function migrateState(input: unknown): AppState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return structuredCloneSafe(INITIAL_STATE);
  }
  let state = { ...(input as Raw) };
  let version = detectSchemaVersion(state);
  // Un état issu d'une version plus récente de l'app n'est jamais "rétrogradé".
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (step) state = step(state);
    version += 1;
  }
  return normalizeState(state);
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_k, val) => (val === Infinity ? "__INF__" : val)), (_k, val) => (val === "__INF__" ? Infinity : val));
}

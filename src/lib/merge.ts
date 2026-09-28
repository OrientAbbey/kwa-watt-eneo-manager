import { AppState, Consumption, EmergencyCredit, MeterData, Recharge } from "../types";

/**
 * Fusion multi-appareils sans serveur : « dernier modifié gagne » PAR ENREGISTREMENT (et non plus pour tout
 * le document), avec des pierres tombales pour que les suppressions ne ressuscitent pas.
 * Fonction pure : aucune dépendance à Firebase, entièrement testable.
 */

export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type Stamped = { id: string; updatedAt?: number };

const ts = (x: { updatedAt?: number } | undefined) => x?.updatedAt ?? 0;

function mergeTombstones(a?: Record<string, number>, b?: Record<string, number>, now = Date.now()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const src of [a, b]) {
    for (const [id, t] of Object.entries(src || {})) {
      if (now - t > TOMBSTONE_TTL_MS) continue; // purge des pierres tombales trop anciennes
      out[id] = Math.max(out[id] ?? 0, t);
    }
  }
  return out;
}

function mergeRecords<T extends Stamped>(local: T[], remote: T[], tombstones: Record<string, number>): T[] {
  const byId = new Map<string, T>();
  for (const item of [...remote, ...local]) {
    const existing = byId.get(item.id);
    // À égalité, la version locale (traitée en dernier) l'emporte.
    if (!existing || ts(item) >= ts(existing)) byId.set(item.id, item);
  }
  return [...byId.values()].filter((item) => {
    const deletedAt = tombstones[item.id];
    return deletedAt === undefined || ts(item) > deletedAt;
  });
}

/** Deux enregistrements représentant le même mois / jour créés sur deux appareils sont dédoublonnés. */
function dedupeByDate<T extends { id: string; date: string; updatedAt?: number }>(items: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const item of items) {
    const existing = byDate.get(item.date);
    if (!existing || ts(item) > ts(existing)) byDate.set(item.date, item);
  }
  return [...byDate.values()];
}

function mergeMeter(local: MeterData, remote: MeterData, now: number): MeterData {
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones, now);
  const newer = ts(local) >= ts(remote) ? local : remote;
  return {
    ...newer,
    id: local.id,
    consumptions: dedupeByDate(mergeRecords<Consumption>(local.consumptions, remote.consumptions, tombstones)),
    // Plusieurs recharges le même jour sont légitimes côté cloud → pas de dédoublonnage par date ici.
    recharges: mergeRecords<Recharge>(local.recharges, remote.recharges, tombstones),
    emergencyCredits: mergeRecords<EmergencyCredit>(local.emergencyCredits || [], remote.emergencyCredits || [], tombstones),
    tombstones,
    updatedAt: Math.max(ts(local), ts(remote)),
  };
}

export function mergeStates(local: AppState, remote: AppState, now = Date.now()): AppState {
  const deletedMeters = mergeTombstones(local.deletedMeters, remote.deletedMeters, now);
  const remoteById = new Map(remote.meters.map((m) => [m.id, m]));
  const localById = new Map(local.meters.map((m) => [m.id, m]));

  const ids = [...new Set([...local.meters.map((m) => m.id), ...remote.meters.map((m) => m.id)])];
  const meters: MeterData[] = [];
  for (const id of ids) {
    const l = localById.get(id);
    const r = remoteById.get(id);
    const meter = l && r ? mergeMeter(l, r, now) : (l ?? r)!;
    const deletedAt = deletedMeters[id];
    if (deletedAt !== undefined && ts(meter) <= deletedAt) continue;
    meters.push(meter);
  }

  // Ne jamais se retrouver sans compteur.
  const safeMeters = meters.length > 0 ? meters : local.meters;
  const settingsSource = ts(local) >= ts(remote) ? local : remote;
  const activeMeterId = safeMeters.some((m) => m.id === local.activeMeterId) ? local.activeMeterId : safeMeters[0].id;

  return {
    ...settingsSource,
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    meters: safeMeters,
    activeMeterId, // le compteur actif est une préférence propre à l'appareil
    deletedMeters,
    updatedAt: Math.max(ts(local), ts(remote)),
    // Les images d'aide sont un contenu de l'appareil le plus récent
    helpImages: settingsSource.helpImages,
  };
}

/** Comparaison structurelle stable (Infinity-safe) pour éviter les boucles de synchronisation. */
export function statesEqual(a: AppState, b: AppState): boolean {
  const s = (v: AppState) => JSON.stringify(v, (_k, val) => (val === Infinity ? "__INF__" : val));
  return s(a) === s(b);
}

import { AppState, MeterData } from "../types";

/**
 * Les photos (Base64) ne sont plus stockées dans le document principal Firestore (limite de 1 Mo par document) :
 * elles sont extraites ici pour être synchronisées une par une dans une sous-collection.
 */

export const PHOTO_FIELDS = ["photoRecto", "photoVerso", "photoMeter", "photoProfile"] as const;
export type PhotoField = (typeof PHOTO_FIELDS)[number];

/** Taille maximale d'une photo Base64 acceptée par les règles Firestore (marge sous 1 Mo). */
export const MAX_PHOTO_CHARS = 900_000;

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");

export const photoKey = (meterId: string, field: PhotoField) => `${safeId(meterId)}__${field}`;
export const helpPhotoKey = (index: number) => `help__${index}`;

export function hashString(s: string): string {
  // FNV-1a 32 bits : suffisant pour détecter un changement, pas cryptographique.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16) + ":" + s.length;
}

export function extractPhotos(state: AppState): { stripped: AppState; photos: Record<string, string> } {
  const photos: Record<string, string> = {};
  const meters: MeterData[] = state.meters.map((m) => {
    const profile = { ...m.profile };
    for (const f of PHOTO_FIELDS) {
      const v = profile[f];
      if (typeof v === "string" && v) photos[photoKey(m.id, f)] = v;
      delete profile[f];
    }
    return { ...m, profile };
  });
  state.helpImages.forEach((img, i) => {
    if (typeof img === "string" && img.startsWith("data:")) photos[helpPhotoKey(i)] = img;
  });
  // Les images d'aide distantes (URL) restent dans l'état ; seules les images Base64 sont externalisées.
  const helpImages = state.helpImages.filter((img) => !(typeof img === "string" && img.startsWith("data:")));
  return { stripped: { ...state, meters, helpImages }, photos };
}

export function injectPhotos(state: AppState, photos: Record<string, string>): AppState {
  const meters = state.meters.map((m) => {
    const profile = { ...m.profile };
    for (const f of PHOTO_FIELDS) {
      const v = photos[photoKey(m.id, f)];
      if (v) profile[f] = v;
    }
    return { ...m, profile };
  });
  const help: string[] = [...state.helpImages];
  Object.keys(photos)
    .filter((k) => k.startsWith("help__"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .forEach((k) => help.push(photos[k]));
  return { ...state, meters, helpImages: help };
}

/** Complète `target` avec les photos de `source` là où `target` n'en a pas (sans jamais écraser). */
export function fillMissingPhotos(target: AppState, source: AppState): AppState {
  const sourceById = new Map(source.meters.map((m) => [m.id, m]));
  const meters = target.meters.map((m) => {
    const s = sourceById.get(m.id);
    if (!s) return m;
    let profile = m.profile;
    for (const f of PHOTO_FIELDS) {
      if (!profile[f] && s.profile[f]) profile = { ...profile, [f]: s.profile[f] };
    }
    return profile === m.profile ? m : { ...m, profile };
  });
  const help = target.helpImages.length === 0 && source.helpImages.length > 0 ? source.helpImages : target.helpImages;
  return { ...target, meters, helpImages: help };
}

// ───────────────────────── Planification de la synchro des photos (pure, testée) ─────────────────────────

export type PhotoManifest = Record<string, { h: string; t: number }>;
export interface RemotePhoto {
  data: string;
  t: number;
}

export interface PhotoSyncPlan {
  /** Photos à adopter depuis le cloud (nouvelles ou plus récentes ailleurs). */
  take: Record<string, string>;
  /** Photos supprimées sur un autre appareil : à retirer d'ici. */
  removeLocal: string[];
  /** Photos locales (nouvelles ou modifiées) à envoyer. */
  upload: string[];
  /** Photos supprimées ici : à retirer du cloud. */
  deleteRemote: string[];
  /** Photos déjà identiques des deux côtés : on ne fait que mémoriser leur état. */
  record: string[];
}

/**
 * Décide, photo par photo, quoi télécharger / envoyer / supprimer. Le manifeste (état connu à la dernière synchro de CET
 * appareil) permet de distinguer « supprimée ici » (ne pas la re-télécharger) de « nouvelle ailleurs » (à télécharger).
 * `remote = null` : synchro « légère » sans listing du cloud (on ne traite que ce qui vient de cet appareil).
 */
export function planPhotoSync(args: {
  local: Record<string, string>;
  remote: Record<string, RemotePhoto> | null;
  manifest: PhotoManifest;
  /**
   * Faux quand des photos ont pu être perdues localement par un échec d'écriture (stockage plein) : une photo absente
   * ici n'est alors PAS une suppression volontaire — on la restaure depuis le cloud au lieu de l'y effacer.
   */
  trustLocalDeletions?: boolean;
}): PhotoSyncPlan {
  const { local, remote, manifest } = args;
  const trust = args.trustLocalDeletions ?? true;
  const plan: PhotoSyncPlan = { take: {}, removeLocal: [], upload: [], deleteRemote: [], record: [] };

  for (const [key, data] of Object.entries(local)) {
    const known = manifest[key];
    const h = hashString(data);
    const r = remote?.[key];
    if (r) {
      const remoteChanged = !known || r.t > known.t;
      const localChanged = !known || known.h !== h;
      if (hashString(r.data) === h) plan.record.push(key); // identiques
      else if (known && !localChanged && remoteChanged) plan.take[key] = r.data; // modifiée ailleurs seulement
      else plan.upload.push(key); // modifiée ici (ou conflit : cet appareil gagne)
    } else if (remote && known) {
      // Connue de nous, absente du cloud : supprimée ailleurs. Si on l'a modifiée depuis, on la renvoie.
      if (known.h === h) plan.removeLocal.push(key);
      else plan.upload.push(key);
    } else if (!known || known.h !== h) {
      plan.upload.push(key); // nouvelle ou modifiée ici
    }
  }

  // Photos connues de nous mais retirées d'ici : suppression locale volontaire
  for (const key of trust ? Object.keys(manifest) : []) {
    if (key in local) continue;
    const r = remote?.[key];
    if (remote === null) plan.deleteRemote.push(key);
    else if (!r) plan.record.push(key); // déjà absente du cloud : on oublie simplement
    else if (r.t > manifest[key].t) plan.take[key] = r.data; // modifiée ailleurs après notre dernière synchro : on la garde
    else plan.deleteRemote.push(key);
  }

  // Photos présentes seulement dans le cloud (jamais vues ici) : nouvelles depuis un autre appareil
  if (remote) {
    for (const [key, r] of Object.entries(remote)) {
      if (key in local || (trust && key in manifest)) continue;
      plan.take[key] = r.data;
    }
  }
  return plan;
}

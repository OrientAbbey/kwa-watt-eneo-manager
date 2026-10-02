import { AppState } from "../types";
import { extractPhotos, injectPhotos } from "./photos";
import { migrateState } from "./migrations";

/**
 * Persistance locale en DEUX clés : les données (petites, essentielles) et les photos (lourdes). Un manque de place
 * dû aux photos ne peut ainsi jamais empêcher d'enregistrer une recharge ou un relevé.
 */

export const photosKeyFor = (coreKey: string) => `${coreKey}_photos`;
export const incompleteMarkerKey = (coreKey: string) => `${coreKey}_photos_incomplete`;

type Reader = Pick<Storage, "getItem">;
type Writer = Pick<Storage, "setItem" | "removeItem">;

export function loadLocalState(storage: Reader, coreKey: string): AppState | null {
  const raw = storage.getItem(coreKey);
  if (!raw) return null;
  let state = migrateState(JSON.parse(raw));
  const photosRaw = storage.getItem(photosKeyFor(coreKey));
  if (photosRaw) {
    try {
      const stored = JSON.parse(photosRaw);
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        // Ancien format : photos intégrées aux données -> elles priment sur la clé séparée
        const { stripped, photos: inline } = extractPhotos(state);
        state = injectPhotos(stripped, { ...(stored as Record<string, string>), ...inline });
      }
    } catch {
      /* clé de photos corrompue : on garde les données sans photos */
    }
  }
  return state;
}

export interface SaveResult {
  coreOk: boolean;
  photosOk: boolean;
}

export function saveLocalState(storage: Writer, coreKey: string, state: AppState): SaveResult {
  const { stripped, photos } = extractPhotos(state);
  let coreOk = true;
  let photosOk = true;
  try {
    storage.setItem(coreKey, JSON.stringify(stripped));
  } catch {
    coreOk = false;
  }
  try {
    storage.setItem(photosKeyFor(coreKey), JSON.stringify(photos));
  } catch {
    photosOk = false;
  }
  return { coreOk, photosOk };
}

/** Marqueur : « des photos ont pu être perdues localement » (écriture échouée). Voir planPhotoSync(trustLocalDeletions). */
export function setPhotosIncomplete(storage: Writer & Pick<Storage, "setItem">, coreKey: string): void {
  try {
    storage.setItem(incompleteMarkerKey(coreKey), "1");
  } catch {
    /* si même ce petit marqueur ne passe pas, le stockage est vraiment saturé */
  }
}
export const isPhotosIncomplete = (storage: Reader, coreKey: string): boolean => {
  try {
    return storage.getItem(incompleteMarkerKey(coreKey)) === "1";
  } catch {
    return false;
  }
};
export const clearPhotosIncomplete = (storage: Writer, coreKey: string): void => {
  try {
    storage.removeItem(incompleteMarkerKey(coreKey));
  } catch {
    /* sans conséquence */
  }
};

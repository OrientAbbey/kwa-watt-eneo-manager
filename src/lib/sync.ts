import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AppState } from "../types";
import { migrateState } from "./migrations";
import { mergeStates } from "./merge";
import { MAX_PHOTO_CHARS, extractPhotos, hashString, injectPhotos } from "./photos";
import { SyncError, classifySyncError } from "./syncErrors";

const COLLECTION_NAME = "user_data";
const PHOTOS_COLLECTION = "photos";
const MANIFEST_KEY = "kwawatt_photo_manifest";
/** Marge de sécurité sous la limite de 1 Mio par document Firestore. */
export const MAX_STATE_BYTES = 900_000;

type Manifest = Record<string, { h: string; t: number }>;

const loadManifest = (): Manifest => {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY) || "{}");
  } catch {
    return {};
  }
};
const saveManifest = (m: Manifest) => {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
  } catch {
    /* quota localStorage : sans conséquence, les photos seront simplement renvoyées */
  }
};

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export interface SyncResult {
  /** État fusionné (local + cloud), photos comprises. */
  merged: AppState;
  /** Nombre de photos qui n'ont pas pu être synchronisées (le reste est bien synchronisé). */
  photosFailed: number;
  /** Vrai si le cloud contenait des données que l'appareil n'avait pas. */
  changedFromRemote: boolean;
}

async function readRemoteState(uid: string): Promise<AppState | null> {
  const snap = await getDoc(doc(db, COLLECTION_NAME, uid));
  if (snap.exists() && typeof snap.data().state === "string") {
    return migrateState(JSON.parse(snap.data().state));
  }
  return null;
}

/** Télécharge les photos distantes et applique les règles de conflit (la plus récente gagne). */
async function pullPhotos(uid: string, state: AppState): Promise<{ state: AppState; failed: number }> {
  const manifest = loadManifest();
  let failed = 0;
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME, uid, PHOTOS_COLLECTION));
    const remote: Record<string, { data: string; t: number }> = {};
    snap.forEach((d) => {
      const v = d.data();
      if (typeof v.data === "string") remote[d.id] = { data: v.data, t: Number(v.updatedAt) || 0 };
    });
    const { photos: local } = extractPhotos(state);
    const take: Record<string, string> = {};
    for (const [key, r] of Object.entries(remote)) {
      const known = manifest[key];
      if (!local[key]) {
        take[key] = r.data;
        manifest[key] = { h: hashString(r.data), t: r.t };
      } else if (known && known.t < r.t && hashString(local[key]) === known.h) {
        // Photo modifiée ailleurs, sans modification locale depuis : on prend la version distante.
        take[key] = r.data;
        manifest[key] = { h: hashString(r.data), t: r.t };
      }
    }
    // Photo supprimée depuis un autre appareil (connue de nous, absente du cloud)
    const removedRemotely = Object.keys(manifest).filter((k) => !(k in remote) && local[k] && manifest[k].h === hashString(local[k]));
    let next = state;
    if (Object.keys(take).length > 0) {
      const { stripped, photos } = extractPhotos(state);
      next = injectPhotos(stripped, { ...photos, ...take });
    }
    if (removedRemotely.length > 0) {
      const { stripped, photos } = extractPhotos(next);
      for (const k of removedRemotely) {
        delete photos[k];
        delete manifest[k];
      }
      next = injectPhotos(stripped, photos);
    }
    saveManifest(manifest);
    return { state: next, failed };
  } catch (e) {
    console.warn("Pull photos impossible", e);
    failed += 1;
    return { state, failed };
  }
}

/** Envoie uniquement les photos modifiées et supprime celles qui n'existent plus. */
async function pushPhotos(uid: string, photos: Record<string, string>, allowDelete: boolean): Promise<number> {
  const manifest = loadManifest();
  let failed = 0;
  for (const [key, data] of Object.entries(photos)) {
    const h = hashString(data);
    if (manifest[key]?.h === h) continue;
    if (data.length > MAX_PHOTO_CHARS) {
      failed += 1;
      continue;
    }
    try {
      const t = Date.now();
      await setDoc(doc(db, COLLECTION_NAME, uid, PHOTOS_COLLECTION, key), { data, updatedAt: t });
      manifest[key] = { h, t };
    } catch (e) {
      console.warn("Envoi photo échoué", key, e);
      failed += 1;
    }
  }
  for (const key of allowDelete ? Object.keys(manifest) : []) {
    if (key in photos) continue;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, uid, PHOTOS_COLLECTION, key));
      delete manifest[key];
    } catch (e) {
      console.warn("Suppression photo distante échouée", key, e);
    }
  }
  saveManifest(manifest);
  return failed;
}

/**
 * Synchronise l'état avec le cloud : lit, fusionne enregistrement par enregistrement, puis écrit.
 * `write: false` sert au premier chargement après connexion (on récupère sans écraser).
 */
export async function syncUserData(local: AppState, options: { write?: boolean } = {}): Promise<SyncResult | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const write = options.write ?? true;
  try {
    const remote = await readRemoteState(user.uid);
    let merged = remote ? mergeStates(local, remote) : local;
    const changedFromRemote = remote ? JSON.stringify(extractPhotos(merged).stripped) !== JSON.stringify(extractPhotos(local).stripped) : false;

    // Récupération des photos avant tout (évite de supprimer côté cloud des photos qu'on n'a pas encore vues)
    const pulled = await pullPhotos(user.uid, merged);
    merged = pulled.state;
    let photosFailed = pulled.failed;

    if (write) {
      const { stripped, photos } = extractPhotos(merged);
      const json = JSON.stringify(stripped);
      if (byteLength(json) > MAX_STATE_BYTES) {
        throw new SyncError("too_large", "Vos données sont trop volumineuses pour la synchronisation.");
      }
      await setDoc(doc(db, COLLECTION_NAME, user.uid), { state: json, updatedAt: serverTimestamp() });
      // Si la récupération des photos a échoué, on ne supprime rien côté cloud (état local potentiellement incomplet).
      photosFailed += await pushPhotos(user.uid, photos, pulled.failed === 0);
    }
    return { merged, photosFailed, changedFromRemote };
  } catch (error) {
    throw classifySyncError(error);
  }
}

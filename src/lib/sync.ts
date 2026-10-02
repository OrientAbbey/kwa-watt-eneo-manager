import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AppState } from "../types";
import { migrateState } from "./migrations";
import { mergeStates } from "./merge";
import { MAX_PHOTO_CHARS, PhotoManifest, RemotePhoto, extractPhotos, hashString, injectPhotos, planPhotoSync } from "./photos";
import { SyncError, SyncErrorCode, classifySyncError } from "./syncErrors";

const COLLECTION_NAME = "user_data";
const PHOTOS_COLLECTION = "photos";
const MANIFEST_KEY = "kwawatt_photo_manifest";
/** Marge de sécurité sous la limite de 1 Mio par document Firestore. */
export const MAX_STATE_BYTES = 900_000;

const loadManifest = (): PhotoManifest => {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY) || "{}");
  } catch {
    return {};
  }
};
const saveManifest = (m: PhotoManifest) => {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
  } catch {
    /* quota localStorage : sans conséquence, les photos seront simplement revérifiées */
  }
};

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** Problème de synchro des PHOTOS (les données elles-mêmes restent synchronisées). */
export interface PhotoIssue {
  code: SyncErrorCode;
  /** Nombre de photos concernées (0 = inconnu : toute la synchro des photos a été suspendue). */
  count: number;
}

export interface SyncResult {
  /** État fusionné (local + cloud), photos comprises. */
  merged: AppState;
  photoIssue: PhotoIssue | null;
  /** Photos adoptées du cloud / retirées (supprimées ailleurs) : à appliquer à l'état courant, qui a pu changer pendant la synchro. */
  photoChanges: { take: Record<string, string>; removeLocal: string[] };
  /** Vrai si le cloud contenait des données que l'appareil n'avait pas. */
  changedFromRemote: boolean;
}

export interface SyncOptions {
  /** Écrit l'état fusionné dans le cloud (défaut : oui). */
  write?: boolean;
  /** Télécharge aussi la liste des photos du cloud (premier chargement, synchro manuelle). Sinon synchro « légère ». */
  pullPhotos?: boolean;
  /** Faux si des photos ont pu être perdues localement (voir planPhotoSync) : on les restaure au lieu de les supprimer du cloud. */
  trustLocalDeletions?: boolean;
}

/**
 * Tant qu'une erreur durable (règles Firestore refusant les photos…) est connue, on suspend la synchro des photos
 * pour la session au lieu de réessayer — et d'afficher une erreur — à chaque modification.
 */
let photoSuspended: SyncErrorCode | null = null;
export const resetPhotoSyncSuspension = () => {
  photoSuspended = null;
};
const isDurable = (c: SyncErrorCode) => c === "permission" || c === "too_large";

async function readRemoteState(uid: string): Promise<AppState | null> {
  const snap = await getDoc(doc(db, COLLECTION_NAME, uid));
  if (snap.exists() && typeof snap.data().state === "string") {
    return migrateState(JSON.parse(snap.data().state));
  }
  return null;
}

async function listRemotePhotos(uid: string): Promise<Record<string, RemotePhoto>> {
  const snap = await getDocs(collection(db, COLLECTION_NAME, uid, PHOTOS_COLLECTION));
  const out: Record<string, RemotePhoto> = {};
  snap.forEach((d) => {
    const v = d.data();
    if (typeof v.data === "string") out[d.id] = { data: v.data, t: Number(v.updatedAt) || 0 };
  });
  return out;
}

/**
 * Synchronise l'état avec le cloud : lit, fusionne enregistrement par enregistrement, puis écrit.
 * Les photos suivent un plan par photo (planPhotoSync) ; leurs échecs n'empêchent jamais la synchro des données.
 */
export async function syncUserData(local: AppState, options: SyncOptions = {}): Promise<SyncResult | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const write = options.write ?? true;
  const pull = options.pullPhotos ?? false;
  try {
    const remote = await readRemoteState(user.uid);
    let merged = remote ? mergeStates(local, remote) : local;
    const changedFromRemote = remote
      ? JSON.stringify(extractPhotos(merged).stripped) !== JSON.stringify(extractPhotos(local).stripped)
      : false;

    let issue: PhotoIssue | null = photoSuspended ? { code: photoSuspended, count: 0 } : null;
    const manifest = loadManifest();
    let plan: ReturnType<typeof planPhotoSync> | null = null;
    let remotePhotos: Record<string, RemotePhoto> | null = null;

    if (!photoSuspended) {
      try {
        remotePhotos = pull ? await listRemotePhotos(user.uid) : null;
      } catch (e) {
        const code = classifySyncError(e).code;
        console.warn("Liste des photos du cloud indisponible", code);
        if (isDurable(code)) photoSuspended = code;
        issue = { code, count: 0 };
      }
      if (!issue) {
        const { stripped, photos } = extractPhotos(merged);
        plan = planPhotoSync({ local: photos, remote: remotePhotos, manifest, trustLocalDeletions: options.trustLocalDeletions });
        if (Object.keys(plan.take).length > 0 || plan.removeLocal.length > 0) {
          const next = { ...photos, ...plan.take };
          plan.removeLocal.forEach((k) => delete next[k]);
          merged = injectPhotos(stripped, next);
          for (const [k, data] of Object.entries(plan.take)) manifest[k] = { h: hashString(data), t: remotePhotos?.[k]?.t ?? Date.now() };
          plan.removeLocal.forEach((k) => delete manifest[k]);
        }
        plan.record.forEach((k) => {
          const r = remotePhotos?.[k];
          if (r) manifest[k] = { h: hashString(r.data), t: r.t };
          else delete manifest[k];
        });
      }
    }

    if (write) {
      const { stripped, photos } = extractPhotos(merged);
      const json = JSON.stringify(stripped);
      if (byteLength(json) > MAX_STATE_BYTES) {
        throw new SyncError("too_large", "Vos données sont trop volumineuses pour la synchronisation.");
      }
      await setDoc(doc(db, COLLECTION_NAME, user.uid), { state: json, updatedAt: serverTimestamp() });

      if (plan && !issue) {
        let failed = 0;
        let firstCode: SyncErrorCode | null = null;
        const fail = (code: SyncErrorCode) => {
          failed += 1;
          firstCode = firstCode ?? code;
        };
        for (const key of plan.upload) {
          const data = photos[key];
          if (!data) continue;
          if (data.length > MAX_PHOTO_CHARS) {
            fail("too_large");
            continue;
          }
          try {
            const t = Date.now();
            await setDoc(doc(db, COLLECTION_NAME, user.uid, PHOTOS_COLLECTION, key), { data, updatedAt: t });
            manifest[key] = { h: hashString(data), t };
          } catch (e) {
            const code = classifySyncError(e).code;
            fail(code);
            if (isDurable(code)) {
              photoSuspended = code; // inutile d'insister sur les photos suivantes
              break;
            }
          }
        }
        for (const key of plan.deleteRemote) {
          try {
            await deleteDoc(doc(db, COLLECTION_NAME, user.uid, PHOTOS_COLLECTION, key));
            delete manifest[key];
          } catch (e) {
            const code = classifySyncError(e).code;
            if (isDurable(code)) {
              photoSuspended = code;
              break;
            }
          }
        }
        if (failed > 0 && firstCode) issue = { code: firstCode, count: failed };
      }
    }
    saveManifest(manifest);
    return { merged, photoIssue: issue, photoChanges: { take: plan?.take ?? {}, removeLocal: plan?.removeLocal ?? [] }, changedFromRemote };
  } catch (error) {
    throw classifySyncError(error);
  }
}

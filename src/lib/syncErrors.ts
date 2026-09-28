export type SyncErrorCode = "too_large" | "permission" | "network" | "quota" | "unknown";

export class SyncError extends Error {
  code: SyncErrorCode;
  constructor(code: SyncErrorCode, message: string) {
    super(message);
    this.name = "SyncError";
    this.code = code;
  }
}

/** Transforme une erreur Firestore brute en message clair et actionnable pour l'utilisateur. */
export function classifySyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  const code = String((error as any)?.code ?? "");
  const message = error instanceof Error ? error.message : String(error);
  if (code.includes("permission-denied") || message.includes("permission-denied") || /insufficient permissions/i.test(message)) {
    return new SyncError("permission", "Synchronisation refusée : les règles Firestore du projet ne sont pas à jour (voir docs/SYNC_ET_REGLES.md).");
  }
  if (code.includes("resource-exhausted") || /quota/i.test(message)) {
    return new SyncError("quota", "Quota Firebase gratuit atteint pour aujourd'hui. Vos données restent sur cet appareil et seront synchronisées plus tard.");
  }
  if (code.includes("invalid-argument") || /too large|exceeds the maximum|size/i.test(message)) {
    return new SyncError("too_large", "Vos données sont trop volumineuses pour la synchronisation. Supprimez quelques photos et réessayez.");
  }
  if (code.includes("unavailable") || code.includes("deadline-exceeded") || /network|offline|failed to fetch/i.test(message)) {
    return new SyncError("network", "Pas de connexion : vos données restent sur cet appareil et seront synchronisées au retour du réseau.");
  }
  return new SyncError("unknown", "La synchronisation a échoué. Vos données restent sauvegardées sur cet appareil.");
}

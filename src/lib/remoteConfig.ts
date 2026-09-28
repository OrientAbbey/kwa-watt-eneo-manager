import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { RemoteConfig, sanitizeRemoteConfig } from "./remoteConfigSchema";

// Réexporté pour ne rien casser côté appelants existants (RemoteConfigContext, tests…).
export * from "./remoteConfigSchema";

const CACHE_KEY = "kwawatt_remote_config";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function loadCachedRemoteConfig(): { config: RemoteConfig; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { config: sanitizeRemoteConfig(parsed.config), fresh: Date.now() - (parsed.fetchedAt || 0) < CACHE_TTL_MS };
  } catch {
    return null;
  }
}

export async function fetchRemoteConfig(): Promise<RemoteConfig | null> {
  try {
    const snap = await getDoc(doc(db, "app_config", "branding"));
    if (!snap.exists()) return null;
    const config = sanitizeRemoteConfig(snap.data());
    localStorage.setItem(CACHE_KEY, JSON.stringify({ config, fetchedAt: Date.now() }));
    return config;
  } catch (e) {
    // Hors ligne ou règles non déployées : on reste sur le cache / les valeurs par défaut.
    console.info("Remote config indisponible, valeurs locales utilisées", e);
    return null;
  }
}

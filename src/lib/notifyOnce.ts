/**
 * Évite d'afficher le même avertissement en boucle : au plus une fois par `ttlMs` pour une clé donnée
 * (mémoire de la session + trace dans localStorage, best effort).
 */
const memory = new Map<string, number>();
const PREFIX = "kwawatt_once_";

export function shouldNotifyOnce(key: string, ttlMs: number, now: number = Date.now(), storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage !== "undefined" ? localStorage : null): boolean {
  let last: number | null = memory.get(key) ?? null;
  if (last === null && storage) {
    try {
      const stored = storage.getItem(PREFIX + key);
      if (stored !== null && Number.isFinite(Number(stored))) last = Number(stored);
    } catch {
      /* ignoré */
    }
  }
  if (last !== null && now - last < ttlMs) return false;
  memory.set(key, now);
  try {
    storage?.setItem(PREFIX + key, String(now));
  } catch {
    /* stockage plein : la mémoire de session suffit */
  }
  return true;
}

export const resetNotifyOnceForTests = () => memory.clear();

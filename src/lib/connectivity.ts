import { useEffect, useState } from "react";

/**
 * Vrai test de connectivité : `navigator.onLine` est vrai dès qu'un Wi‑Fi est connecté, même sans accès à internet.
 * On tente donc d'atteindre un point de contrôle de connectivité de Google (réponse vide, 204), sans lire la réponse.
 */
export async function probeInternet(timeoutMs = 4000, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl("https://www.gstatic.com/generate_204", { mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** État « en ligne » du navigateur, tenu à jour (indication seulement ; voir probeInternet pour un test réel). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

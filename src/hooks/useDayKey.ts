import { useEffect, useState } from "react";

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Clé du jour courant, mise à jour au changement de jour (application laissée en arrière-plan toute la nuit) et
 * au retour au premier plan : les alertes dépendant de la date sont ainsi recalculées sans relancer l'application.
 */
export function useDayKey(): string {
  const [key, setKey] = useState(dayKey);
  useEffect(() => {
    const refresh = () => setKey((k) => {
      const next = dayKey();
      return next === k ? k : next;
    });
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, []);
  return key;
}

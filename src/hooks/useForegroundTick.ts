import { useEffect, useState } from "react";

/** Même nom que RESYNC_EVENT (lib/notifications) : dupliqué ici pour ne pas lier ce hook au plugin Capacitor. */
const RESYNC_EVENT = "kwawatt-resync-notifications";

/**
 * Compteur incrémenté chaque fois que l'application revient au premier plan (ouverture, retour depuis une autre
 * application, appui sur une notification — y compris quand l'application est déjà ouverte). Sert à relancer les calculs qui doivent être « frais » à chaque ouverture :
 * ici, republier les notifications d'alerte qui auraient été retirées.
 */
export function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(RESYNC_EVENT, bump);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(RESYNC_EVENT, bump);
    };
  }, []);
  return tick;
}

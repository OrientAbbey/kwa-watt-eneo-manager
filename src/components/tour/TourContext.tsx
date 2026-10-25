import React, { Suspense, createContext, lazy, useCallback, useContext, useMemo, useState } from "react";
import { TOURS, TOUR_VERSION, type TourId } from "../../lib/tourSteps";
import { writeTourSeen } from "../../lib/tourLogic";

// L'affichage de la visite (bulle, surbrillance) n'est chargé qu'au moment où une visite démarre
const TourOverlay = lazy(() => import("./TourOverlay"));

export interface ActiveTour {
  id: TourId;
  index: number;
}

interface TourContextType {
  active: ActiveTour | null;
  /** Démarre une visite (la visite complète par défaut). */
  start: (id?: TourId) => void;
  next: () => void;
  prev: () => void;
  /** Ferme la visite : « done » = terminée jusqu'au bout, « skip » = abandonnée. Dans les deux cas elle est considérée comme vue. */
  close: (reason: "done" | "skip") => void;
  /** Mémorise que la visite complète a été proposée / vue (version courante). */
  markSeen: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const markSeen = () => writeTourSeen(localStorage, TOUR_VERSION);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveTour | null>(null);

  const start = useCallback((id: TourId = "main") => {
    if (id === "main") markSeen();
    setActive({ id, index: 0 });
  }, []);

  const next = useCallback(() => {
    setActive((a) => (a && a.index < TOURS[a.id].steps.length - 1 ? { ...a, index: a.index + 1 } : a));
  }, []);

  const prev = useCallback(() => {
    setActive((a) => (a && a.index > 0 ? { ...a, index: a.index - 1 } : a));
  }, []);

  const close = useCallback((_reason: "done" | "skip") => {
    setActive((a) => {
      if (a?.id === "main") markSeen();
      return null;
    });
  }, []);

  const value = useMemo(() => ({ active, start, next, prev, close, markSeen }), [active, start, next, prev, close]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <Suspense fallback={null}>
          <TourOverlay active={active} />
        </Suspense>
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

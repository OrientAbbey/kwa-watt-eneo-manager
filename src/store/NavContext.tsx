import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type TabValue = "dashboard" | "calculator" | "history" | "services" | "profile" | "settings" | "help";

/** Action demandée à une vue au moment de la navigation (ex. ouvrir directement le formulaire de recharge). */
export type NavIntent =
  | { type: "add-recharge" }
  | { type: "add-consumption" }
  | { type: "paste-sms" }
  | { type: "focus"; section: string };

interface NavContextType {
  activeTab: TabValue;
  navigate: (tab: TabValue, intent?: NavIntent) => void;
  /** Récupère (et efface) l'action en attente pour la vue courante. */
  consumeIntent: () => NavIntent | null;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");
  const intentRef = useRef<NavIntent | null>(null);

  const navigate = useCallback((tab: TabValue, intent?: NavIntent) => {
    intentRef.current = intent ?? null;
    setActiveTab(tab);
    if (typeof document !== "undefined") {
      // Remonte en haut de la zone défilante à chaque changement d'onglet
      document.getElementById("scroll-area")?.scrollTo({ top: 0 });
    }
  }, []);

  const consumeIntent = useCallback(() => {
    const i = intentRef.current;
    intentRef.current = null;
    return i;
  }, []);

  const value = useMemo(() => ({ activeTab, navigate, consumeIntent }), [activeTab, navigate, consumeIntent]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within a NavProvider");
  return ctx;
}

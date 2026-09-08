import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, Consumption, Recharge, MeterData } from "../types";
import { INITIAL_STATE, DEFAULT_SETTINGS } from "../constants";
import { saveUserDataToBackend, loadUserDataFromBackend } from "../lib/sync";
import { generateAvatar } from "../lib/utils";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

export interface UserAuth {
  type: 'visitor' | 'google';
  email?: string;
  name?: string;
  avatar?: string;
  lastActive: number;
}

interface AppContextType {
  state: AppState;
  currentMeter: MeterData;
  currentUser: UserAuth | null;
  setCurrentUser: (user: UserAuth | null) => void;
  addMeter: (name: string) => void;
  switchMeter: (id: string) => void;
  deleteMeter: (id: string) => void;
  addConsumption: (c: Consumption) => void;
  updateConsumption: (c: Consumption) => void;
  deleteConsumption: (id: string) => void;
  addRecharge: (r: Recharge) => void;
  updateRecharge: (r: Recharge) => void;
  deleteRecharge: (id: string) => void;
  updateProfile: (profile: Partial<MeterData["profile"]>) => void;
  clearSection: (section: 'consumptions' | 'recharges') => void;
  updateMeterName: (name: string) => void;
  updateSettings: (settings: Partial<AppState["settings"]>) => void;
  updateTheme: (theme: "light" | "dark" | "system") => void;
  updateHelpImages: (images: string[]) => void;
  importData: (consumptions: Consumption[], recharges: Recharge[]) => void;
  resetData: () => void;
  toastInfo: { message: string, visible: boolean } | null;
  showToast: (message: string) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "eneo_app_data";
const AUTH_KEY = "eneo_app_auth";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAuth | null>(() => {
    try {
      const item = window.localStorage.getItem(AUTH_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Date.now() - (parsed.lastActive || 0) > 30 * 24 * 60 * 60 * 1000) {
           return null;
        }
        return { ...parsed, lastActive: Date.now() };
      }
    } catch (error) {}
    return null;
  });

  const [state, setState] = useState<AppState>(() => {
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      if (item) {
        const parsedState = JSON.parse(item);
        // Migration logic
        if (!parsedState.meters && (parsedState.consumptions || parsedState.profile)) {
          const migratedState: AppState = {
            meters: [{
              id: "default-meter",
              name: "Compteur Principal",
              consumptions: parsedState.consumptions || [],
              recharges: parsedState.recharges || [],
              profile: parsedState.profile || INITIAL_STATE.meters[0].profile
            }],
            activeMeterId: "default-meter",
            settings: parsedState.settings || DEFAULT_SETTINGS,
            theme: parsedState.theme || INITIAL_STATE.theme,
            helpImages: parsedState.helpImages || []
          };
          return { ...INITIAL_STATE, ...migratedState };
        }
        return { ...INITIAL_STATE, ...parsedState };
      }
    } catch (error) {
      console.warn("Failed to load local state", error);
    }
    return INITIAL_STATE;
  });

  const [toastInfo, setToastInfo] = useState<{ message: string, visible: boolean } | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Handle redirect result on mount
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        setCurrentUser({
          type: 'google',
          name: result.user.displayName || 'Utilisateur',
          email: result.user.email || '',
          avatar: result.user.photoURL || generateAvatar(result.user.displayName || ''),
          lastActive: Date.now()
        });
      }
    }).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          type: 'google',
          name: user.displayName || 'Utilisateur',
          email: user.email || '',
          avatar: user.photoURL || generateAvatar(user.displayName || ''),
          lastActive: Date.now()
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (currentUser?.type === 'google' && hasLoadedFromCloud) {
       const timer = setTimeout(() => {
          saveUserDataToBackend(stateRef.current).catch(console.error);
       }, 5000);
       return () => clearTimeout(timer);
    }
  }, [state, currentUser, hasLoadedFromCloud]);

  useEffect(() => {
    if (currentUser?.type !== 'google' || !hasLoadedFromCloud) return;
    const flush = () => saveUserDataToBackend(stateRef.current).catch(console.error);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser, hasLoadedFromCloud]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify({ ...currentUser, lastActive: Date.now() }));
    } else {
      window.localStorage.removeItem(AUTH_KEY);
      setHasLoadedFromCloud(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.type === 'google' && auth.currentUser && !hasLoadedFromCloud) {
       let isMounted = true;
       setLoading(true);
       loadUserDataFromBackend().then(cloudState => {
          if (isMounted) {
            if (cloudState) {
               setState(cloudState);
            }
            setHasLoadedFromCloud(true);
            setLoading(false);
          }
       }).catch(err => {
          console.error(err);
          if (isMounted) {
             setHasLoadedFromCloud(true); 
             setLoading(false);
          }
       });
       return () => { isMounted = false; };
    }
  }, [currentUser, hasLoadedFromCloud]);

  useEffect(() => {
    if (state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const showToast = (message: string) => {
    setToastInfo({ message, visible: true });
    const duration = state.settings?.alerts?.toastDuration || 6;
    setTimeout(() => {
      setToastInfo(prev => prev ? { ...prev, visible: false } : null);
    }, duration * 1000);
  };

  const currentMeter = state.meters.find(m => m.id === state.activeMeterId) || state.meters[0];

  const updateCurrentMeter = (updater: (m: MeterData) => MeterData) => {
    setState((s) => ({
      ...s,
      meters: s.meters.map(m => m.id === s.activeMeterId ? updater(m) : m)
    }));
  };

  const addMeter = (name: string) => {
    const newId = `meter_${Date.now()}`;
    setState(s => ({
      ...s,
      meters: [...s.meters, { ...INITIAL_STATE.meters[0], id: newId, name }],
      activeMeterId: newId
    }));
  };

  const switchMeter = (id: string) => {
    setState(s => ({ ...s, activeMeterId: id }));
  };

  const deleteMeter = (id: string) => {
    setState(s => {
      if (s.meters.length <= 1) return s; 
      const newMeters = s.meters.filter(m => m.id !== id);
      const newActiveId = s.activeMeterId === id ? newMeters[0].id : s.activeMeterId;
      return { ...s, meters: newMeters, activeMeterId: newActiveId };
    });
  };

  const addConsumption = (c: Consumption) =>
    updateCurrentMeter(m => {
      if (m.consumptions.some(x => x.date === c.date)) return m;
      return { ...m, consumptions: [...m.consumptions, c] };
    });

  const updateConsumption = (c: Consumption) =>
    updateCurrentMeter(m => ({ ...m, consumptions: m.consumptions.map(x => x.id === c.id ? c : x) }));

  const deleteConsumption = (id: string) =>
    updateCurrentMeter(m => ({ ...m, consumptions: m.consumptions.filter((c) => c.id !== id) }));

  const addRecharge = (r: Recharge) =>
    updateCurrentMeter(m => {
      if (m.recharges.some(x => x.date === r.date)) return m;
      return { ...m, recharges: [...m.recharges, r] };
    });

  const updateRecharge = (r: Recharge) =>
    updateCurrentMeter(m => ({ ...m, recharges: m.recharges.map(x => x.id === r.id ? r : x) }));

  const deleteRecharge = (id: string) =>
    updateCurrentMeter(m => ({ ...m, recharges: m.recharges.filter((r) => r.id !== id) }));

  const clearSection = (section: 'consumptions' | 'recharges') =>
    updateCurrentMeter(m => ({ ...m, [section]: [] }));

  const updateProfile = (profile: Partial<MeterData["profile"]>) =>
    updateCurrentMeter(m => ({ ...m, profile: { ...m.profile, ...profile } }));

  const updateMeterName = (name: string) =>
    updateCurrentMeter(m => ({ ...m, name }));

  const updateSettings = (settings: Partial<AppState["settings"]>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...settings } }));

  const updateTheme = (theme: "light" | "dark" | "system") =>
    setState((s) => ({ ...s, theme }));

  const updateHelpImages = (images: string[]) =>
    setState((s) => ({ ...s, helpImages: images }));

  const importData = (cons: Consumption[], rechs: Recharge[]) =>
    updateCurrentMeter(m => {
      const newCons = [...m.consumptions];
      cons.forEach(c => {
        const idx = newCons.findIndex(x => x.date === c.date);
        if (idx >= 0) newCons[idx] = { ...newCons[idx], ...c };
        else newCons.push(c);
      });
      const newRechs = [...m.recharges];
      rechs.forEach(r => {
        const idx = newRechs.findIndex(x => x.date === r.date);
        if (idx >= 0) newRechs[idx] = { ...newRechs[idx], ...r };
        else newRechs.push(r);
      });
      return { ...m, consumptions: newCons, recharges: newRechs };
    });

  const resetData = () => {
    setState({ ...INITIAL_STATE, helpImages: state.helpImages, settings: state.settings });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        currentMeter,
        currentUser,
        setCurrentUser,
        addMeter,
        switchMeter,
        deleteMeter,
        addConsumption,
        updateConsumption,
        deleteConsumption,
        addRecharge,
        updateRecharge,
        deleteRecharge,
        clearSection,
        updateProfile,
        updateMeterName,
        updateSettings,
        updateTheme,
        updateHelpImages,
        importData,
        resetData,
        toastInfo,
        showToast,
        isLoading,
        setLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

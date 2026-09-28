import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Consumption, EmergencyCredit, Recharge, MeterData } from "../types";
import { INITIAL_STATE } from "../constants";
import { syncUserData } from "../lib/sync";
import { classifySyncError } from "../lib/syncErrors";
import { mergeStates, statesEqual } from "../lib/merge";
import { fillMissingPhotos } from "../lib/photos";
import { migrateState } from "../lib/migrations";
import { createEmergencyCredit, repayEmergencyCredits } from "../lib/energy";
import { generateAvatar } from "../lib/utils";
import { appConfig } from "../config";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

export interface UserAuth {
  type: 'visitor' | 'google';
  email?: string;
  name?: string;
  avatar?: string;
  lastActive: number;
}

export type ToastType = 'success' | 'error' | 'info';
export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';
export type AddRechargeResult = 'added' | 'duplicate';

interface AppContextType {
  state: AppState;
  currentMeter: MeterData;
  currentUser: UserAuth | null;
  setCurrentUser: (user: UserAuth | null) => void;
  addMeter: (name: string) => void;
  switchMeter: (id: string) => void;
  deleteMeter: (id: string) => void;
  addConsumption: (c: Consumption) => boolean;
  updateConsumption: (c: Consumption) => void;
  deleteConsumption: (id: string) => void;
  addRecharge: (r: Recharge) => AddRechargeResult;
  updateRecharge: (r: Recharge) => void;
  deleteRecharge: (id: string) => void;
  activateEmergencyCredit: (kwh?: number) => void;
  deleteEmergencyCredit: (id: string) => void;
  updateProfile: (profile: Partial<MeterData["profile"]>) => void;
  clearSection: (section: 'consumptions' | 'recharges') => void;
  updateMeterName: (name: string) => void;
  updateSettings: (settings: Partial<AppState["settings"]>) => void;
  updateTheme: (theme: "light" | "dark" | "system") => void;
  updateHelpImages: (images: string[]) => void;
  importData: (consumptions: Consumption[], recharges: Recharge[]) => void;
  resetData: () => void;
  toastInfo: { message: string, visible: boolean, type: ToastType } | null;
  showToast: (message: string, type?: ToastType) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncAt: number | null;
  retrySync: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = appConfig.storage.dataKey;
const AUTH_KEY = appConfig.storage.authKey;
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 5 * 60_000;

const now = () => Date.now();

/** Stamp d'un enregistrement modifié (sert à la fusion multi-appareils). */
const stamp = <T extends object>(x: T): T & { updatedAt: number } => ({ ...x, updatedAt: now() });

const withTombstones = (m: MeterData, ids: string[]): MeterData => {
  if (ids.length === 0) return m;
  const t = now();
  const tombstones = { ...(m.tombstones || {}) };
  ids.forEach((id) => { tombstones[id] = t; });
  return { ...m, tombstones, updatedAt: t };
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAuth | null>(() => {
    try {
      const item = window.localStorage.getItem(AUTH_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Date.now() - (parsed.lastActive || 0) > appConfig.storage.authMaxAgeMs) {
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
      if (item) return migrateState(JSON.parse(item));
    } catch (error) {
      console.warn("Failed to load local state", error);
    }
    return INITIAL_STATE;
  });

  const [toastInfo, setToastInfo] = useState<{ message: string, visible: boolean, type: ToastType } | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);
  const localErrorShownRef = useRef(false);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToastInfo({ message, visible: true, type });
    const duration = (type === 'error' ? 10 : stateRef.current.settings?.alerts?.toastDuration) || 6;
    setTimeout(() => {
      setToastInfo(prev => prev && prev.message === message ? { ...prev, visible: false } : prev);
    }, duration * 1000);
  }, []);

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

  // Persistance locale (débouncée). Une erreur (stockage plein) est désormais signalée à l'utilisateur.
  useEffect(() => {
    const flush = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
        localErrorShownRef.current = false;
      } catch (e) {
        console.error("Local save failed", e);
        if (!localErrorShownRef.current) {
          localErrorShownRef.current = true;
          showToast("Stockage de l'appareil plein : vos dernières modifications ne sont pas sauvegardées localement. Supprimez des photos.", 'error');
        }
      }
    };
    const timer = setTimeout(flush, appConfig.storage.localDebounceMs);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, showToast]);

  const scheduleRetry = useCallback((run: () => void) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const delay = Math.min(RETRY_BASE_MS * 2 ** retryCountRef.current, RETRY_MAX_MS);
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(run, delay);
  }, []);

  /**
   * Synchronisation complète : lecture cloud, fusion par enregistrement, écriture. Ne perd jamais de
   * données (la fusion est appliquée à l'état le plus récent) et signale clairement tout échec.
   */
  const runSync = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    if (syncingRef.current) {
      pendingRef.current = true;
      return false;
    }
    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const result = await syncUserData(stateRef.current, { write: true });
      if (result) {
        const prev = stateRef.current;
        const next = fillMissingPhotos(mergeStates(prev, result.merged), result.merged);
        if (!statesEqual(prev, next)) {
          skipNextSaveRef.current = true; // le résultat de la fusion n'a pas besoin d'être renvoyé immédiatement
          setState(next);
        }
        if (result.photosFailed > 0) {
          showToast(`${result.photosFailed} photo(s) n'ont pas pu être synchronisées (trop lourdes ou réseau).`, 'info');
        }
      }
      setSyncError(null);
      setSyncStatus('ok');
      setLastSyncAt(now());
      retryCountRef.current = 0;
      lastErrorRef.current = null;
      return true;
    } catch (e) {
      const err = classifySyncError(e);
      console.error("Sync failed", err.code, err.message);
      setSyncError(err.message);
      setSyncStatus('error');
      // On n'affiche pas deux fois le même message d'erreur d'affilée
      if (lastErrorRef.current !== err.message) {
        lastErrorRef.current = err.message;
        showToast(err.message, 'error');
      }
      // Les erreurs de permission/taille ne se résolvent pas seules : inutile de réessayer en boucle
      if (err.code === 'network' || err.code === 'unknown' || err.code === 'quota') {
        scheduleRetry(() => { void runSync(); });
      }
      return false;
    } finally {
      syncingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        setTimeout(() => { void runSync(); }, 500);
      }
    }
  }, [showToast, scheduleRetry]);

  // Sauvegarde cloud débouncée après chaque modification
  useEffect(() => {
    if (currentUser?.type !== 'google' || !hasLoadedFromCloud) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const timer = setTimeout(() => { void runSync(); }, appConfig.storage.syncDebounceMs);
    return () => clearTimeout(timer);
  }, [state, currentUser, hasLoadedFromCloud, runSync]);

  // Synchro à la mise en arrière-plan et au retour du réseau
  useEffect(() => {
    if (currentUser?.type !== 'google' || !hasLoadedFromCloud) return;
    const flush = () => { void runSync(); };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const onOnline = () => { retryCountRef.current = 0; flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser, hasLoadedFromCloud, runSync]);

  useEffect(() => () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }, []);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify({ ...currentUser, lastActive: Date.now() }));
    } else {
      window.localStorage.removeItem(AUTH_KEY);
      setHasLoadedFromCloud(false);
      setSyncStatus('idle');
      setSyncError(null);
    }
  }, [currentUser]);

  // Premier chargement après connexion : on FUSIONNE cloud et données locales (avant, le cloud écrasait le local).
  useEffect(() => {
    if (currentUser?.type === 'google' && auth.currentUser && !hasLoadedFromCloud) {
       let isMounted = true;
       setLoading(true);
       runSync().finally(() => {
          if (isMounted) {
            setHasLoadedFromCloud(true);
            setLoading(false);
          }
       });
       return () => { isMounted = false; };
    }
  }, [currentUser, hasLoadedFromCloud, runSync]);

  useEffect(() => {
    if (state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

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
      meters: [...s.meters, { ...INITIAL_STATE.meters[0], id: newId, name, updatedAt: now() }],
      activeMeterId: newId,
      updatedAt: now(),
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
      return { ...s, meters: newMeters, activeMeterId: newActiveId, deletedMeters: { ...(s.deletedMeters || {}), [id]: now() }, updatedAt: now() };
    });
  };

  const addConsumption = (c: Consumption): boolean => {
    if (currentMeter.consumptions.some(x => x.date === c.date)) return false;
    updateCurrentMeter(m => ({ ...m, consumptions: [...m.consumptions, stamp(c)] }));
    return true;
  };

  const updateConsumption = (c: Consumption) =>
    updateCurrentMeter(m => ({ ...m, consumptions: m.consumptions.map(x => x.id === c.id ? stamp(c) : x) }));

  const deleteConsumption = (id: string) =>
    updateCurrentMeter(m => withTombstones({ ...m, consumptions: m.consumptions.filter((c) => c.id !== id) }, [id]));

  const addRecharge = (r: Recharge): AddRechargeResult => {
    // Plusieurs recharges le même jour sont normales ; seul un doublon exact est refusé.
    const duplicate = currentMeter.recharges.some(x =>
      x.date === r.date && x.montant === r.montant && x.kwh === r.kwh && (x.transactionRef || '') === (r.transactionRef || '')
    );
    if (duplicate) return 'duplicate';
    updateCurrentMeter(m => ({
      ...m,
      recharges: [...m.recharges, stamp(r)],
      // Le prêt d'urgence (811) est déduit automatiquement de la prochaine recharge
      emergencyCredits: repayEmergencyCredits(m.emergencyCredits || [], r.kwh, r.date),
    }));
    return 'added';
  };

  const updateRecharge = (r: Recharge) =>
    updateCurrentMeter(m => ({ ...m, recharges: m.recharges.map(x => x.id === r.id ? stamp(r) : x) }));

  const deleteRecharge = (id: string) =>
    updateCurrentMeter(m => withTombstones({ ...m, recharges: m.recharges.filter((r) => r.id !== id) }, [id]));

  const activateEmergencyCredit = (kwh?: number) =>
    updateCurrentMeter(m => ({
      ...m,
      emergencyCredits: [
        ...(m.emergencyCredits || []),
        stamp(createEmergencyCredit(`ec_${Date.now()}`, new Date().toISOString().slice(0, 10), kwh)),
      ],
      updatedAt: now(),
    }));

  const deleteEmergencyCredit = (id: string) =>
    updateCurrentMeter(m => withTombstones({ ...m, emergencyCredits: (m.emergencyCredits || []).filter((c: EmergencyCredit) => c.id !== id) }, [id]));

  const clearSection = (section: 'consumptions' | 'recharges') =>
    updateCurrentMeter(m => withTombstones({ ...m, [section]: [] }, m[section].map((x: { id: string }) => x.id)));

  const updateProfile = (profile: Partial<MeterData["profile"]>) =>
    updateCurrentMeter(m => ({ ...m, profile: { ...m.profile, ...profile }, updatedAt: now() }));

  const updateMeterName = (name: string) =>
    updateCurrentMeter(m => ({ ...m, name, updatedAt: now() }));

  const updateSettings = (settings: Partial<AppState["settings"]>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...settings }, updatedAt: now() }));

  const updateTheme = (theme: "light" | "dark" | "system") =>
    setState((s) => ({ ...s, theme, updatedAt: now() }));

  const updateHelpImages = (images: string[]) =>
    setState((s) => ({ ...s, helpImages: images, updatedAt: now() }));

  const importData = (cons: Consumption[], rechs: Recharge[]) =>
    updateCurrentMeter(m => {
      const newCons = [...m.consumptions];
      cons.forEach(c => {
        const idx = newCons.findIndex(x => x.date === c.date);
        if (idx >= 0) newCons[idx] = stamp({ ...newCons[idx], ...c, id: newCons[idx].id });
        else newCons.push(stamp(c));
      });
      const newRechs = [...m.recharges];
      rechs.forEach(r => {
        const idx = newRechs.findIndex(x => x.date === r.date && x.montant === r.montant);
        if (idx >= 0) newRechs[idx] = stamp({ ...newRechs[idx], ...r, id: newRechs[idx].id });
        else newRechs.push(stamp(r));
      });
      return { ...m, consumptions: newCons, recharges: newRechs, updatedAt: now() };
    });

  const resetData = () => {
    setState((s) => {
      // Tout est marqué "supprimé" pour que la fusion cloud ne ressuscite pas les anciennes données
      const t = now();
      const deletedMeters = { ...(s.deletedMeters || {}) };
      s.meters.forEach((m) => { if (m.id !== INITIAL_STATE.meters[0].id) deletedMeters[m.id] = t; });
      const old = s.meters.find((m) => m.id === INITIAL_STATE.meters[0].id);
      const allIds = s.meters.flatMap((m) => [
        ...m.consumptions.map((x) => x.id),
        ...m.recharges.map((x) => x.id),
        ...(m.emergencyCredits || []).map((x) => x.id),
      ]);
      const tombstones: Record<string, number> = { ...(old?.tombstones || {}) };
      allIds.forEach((id) => { tombstones[id] = t; });
      return {
        ...INITIAL_STATE,
        meters: [{ ...INITIAL_STATE.meters[0], tombstones, updatedAt: t }],
        deletedMeters,
        helpImages: s.helpImages,
        settings: s.settings,
        updatedAt: t,
      };
    });
  };

  const retrySync = () => {
    retryCountRef.current = 0;
    lastErrorRef.current = null;
    void runSync();
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
        activateEmergencyCredit,
        deleteEmergencyCredit,
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
        syncStatus,
        syncError,
        lastSyncAt,
        retrySync,
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


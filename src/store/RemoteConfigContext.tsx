import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_REMOTE_CONFIG,
  RemoteConfig,
  brandLabel,
  fetchRemoteConfig,
  loadCachedRemoteConfig,
} from "../lib/remoteConfig";

interface RemoteConfigContextType {
  config: RemoteConfig;
  /** Nom d'affichage de l'opérateur, ex. « SOCADEL (ex-ENEO) ». */
  brand: string;
  /** Nom court de l'opérateur, ex. « SOCADEL ». */
  brandName: string;
}

const RemoteConfigContext = createContext<RemoteConfigContextType>({
  config: DEFAULT_REMOTE_CONFIG,
  brand: brandLabel(DEFAULT_REMOTE_CONFIG),
  brandName: DEFAULT_REMOTE_CONFIG.brand.name,
});

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RemoteConfig>(() => loadCachedRemoteConfig()?.config ?? DEFAULT_REMOTE_CONFIG);

  useEffect(() => {
    if (loadCachedRemoteConfig()?.fresh) return;
    let cancelled = false;
    fetchRemoteConfig().then((c) => {
      if (c && !cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ config, brand: brandLabel(config), brandName: config.brand.name }),
    [config]
  );
  return <RemoteConfigContext.Provider value={value}>{children}</RemoteConfigContext.Provider>;
}

export function useRemoteConfig() {
  return useContext(RemoteConfigContext);
}

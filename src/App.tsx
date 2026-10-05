/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider } from "./store/AppContext";
import { NavProvider } from "./store/NavContext";
import { RemoteConfigProvider } from "./store/RemoteConfigContext";
import MainLayout from "./components/MainLayout";
import { useEffect } from "react";
import { markAppReady } from "./lib/appReady";

export default function App() {
  // L'interface est montée : on peut retirer l'écran d'amorçage et cacher le splash natif
  useEffect(() => { markAppReady(); }, []);
  return (
    <RemoteConfigProvider>
      <AppProvider>
        <NavProvider>
          <MainLayout />
        </NavProvider>
      </AppProvider>
    </RemoteConfigProvider>
  );
}

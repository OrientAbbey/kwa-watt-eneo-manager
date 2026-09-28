/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider } from "./store/AppContext";
import { NavProvider } from "./store/NavContext";
import { RemoteConfigProvider } from "./store/RemoteConfigContext";
import MainLayout from "./components/MainLayout";

export default function App() {
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

import { useCallback } from "react";
import { useApp } from "../store/AppContext";
import { copyText } from "../lib/clipboard";

/** Copie une valeur et confirme par un message (« N° de compteur copié »). */
export function useClipboard() {
  const { showToast } = useApp();
  return useCallback(
    async (value: string, label = "Valeur") => {
      if (!value) return false;
      const ok = await copyText(value);
      showToast(ok ? `${label} copié` : "Copie impossible sur cet appareil", ok ? "success" : "error");
      return ok;
    },
    [showToast]
  );
}

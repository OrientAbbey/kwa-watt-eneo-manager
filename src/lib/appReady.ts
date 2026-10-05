import { SplashScreen } from "@capacitor/splash-screen";

/** Durée minimale d'affichage du splash natif, pour qu'il ne « clignote » pas quand l'application démarre très vite. */
export const MIN_SPLASH_MS = 900;

/** Délai restant avant de cacher le splash, compte tenu du temps déjà écoulé depuis le début du chargement. */
export const computeHideDelay = (elapsedMs: number, minMs: number = MIN_SPLASH_MS): number => Math.max(0, Math.round(minMs - elapsedMs));

let done = false;

/**
 * À appeler quand l'interface est montée. Retire le fond d'amorçage de la page puis cache le splash natif — après deux
 * images, pour être sûr que l'interface est réellement PEINTE (sinon le blanc réapparaît entre les deux). Avant : le splash
 * se cachait au bout d'un délai fixe de 2 s, que l'application soit prête ou non.
 * Le plugin garde une durée maximale (`launchShowDuration`) : si ceci n'était jamais appelé, le splash se cache quand même.
 */
export function markAppReady(): void {
  if (done) return;
  done = true;
  const reveal = () => {
    document.documentElement.classList.add("app-ready");
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
    }, computeHideDelay(typeof performance !== "undefined" ? performance.now() : MIN_SPLASH_MS));
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(reveal));
  else reveal();
}

export const resetAppReadyForTests = () => {
  done = false;
};

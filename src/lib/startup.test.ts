import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@capacitor/splash-screen", () => ({ SplashScreen: { hide: vi.fn().mockResolvedValue(undefined) } }));
import { SplashScreen } from "@capacitor/splash-screen";
import { computeHideDelay, markAppReady, resetAppReadyForTests, MIN_SPLASH_MS } from "./appReady";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("démarrage : plus de page blanche entre le splash et l'interface", () => {
  const INDIGO = "#1e1b4b";

  it("la même couleur de fond partout : fenêtre Android, WebView, splash et page HTML", () => {
    expect(read("android/app/src/main/res/values/splash_colors.xml").toLowerCase()).toContain(INDIGO);
    const cfg = read("capacitor.config.ts").toLowerCase();
    expect(cfg).toContain(`backgroundcolor: '${INDIGO}'`); // WebView
    expect(cfg).toContain(`backgroundcolor: "${INDIGO}"`); // splash plugin
    expect(read("index.html").toLowerCase()).toContain(`background: ${INDIGO}`);
  });

  it("le thème appliqué APRÈS le splash n'a plus un fond de fenêtre blanc par défaut", () => {
    const styles = read("android/app/src/main/res/values/styles.xml");
    const noActionBar = styles.slice(styles.indexOf('name="AppTheme.NoActionBar"'), styles.indexOf("</style>", styles.indexOf('name="AppTheme.NoActionBar"')));
    expect(noActionBar).toContain('name="android:windowBackground">@color/splash_background');
  });

  it("index.html affiche un écran d'amorçage avec le logo AVANT le JavaScript", () => {
    const html = read("index.html");
    const rootDiv = html.slice(html.indexOf('<div id="root">'));
    expect(rootDiv).toContain('id="boot"');
    expect(rootDiv).toContain("<svg"); // le logo
    expect(rootDiv).toContain("KWA-WATT");
    expect(html).toContain("html:not(.app-ready)"); // le fond d'amorçage disparaît une fois l'interface prête
  });

  it("le splash natif n'a qu'une durée MAXIMALE : il est caché dès que l'interface est prête", () => {
    const cfg = read("capacitor.config.ts");
    expect(cfg).toContain("launchAutoHide: true");
    expect(cfg).toMatch(/launchShowDuration: 3000/);
  });
});

describe("appReady", () => {
  beforeEach(() => {
    resetAppReadyForTests();
    vi.useFakeTimers();
    (SplashScreen.hide as any).mockClear();
    (globalThis as any).document = { documentElement: { classList: { add: vi.fn() } } };
    (globalThis as any).requestAnimationFrame = (cb: () => void) => cb();
  });

  it("calcule le délai restant pour respecter la durée minimale", () => {
    expect(computeHideDelay(0)).toBe(MIN_SPLASH_MS);
    expect(computeHideDelay(300)).toBe(MIN_SPLASH_MS - 300);
    expect(computeHideDelay(5000)).toBe(0);
  });

  it("retire le fond d'amorçage puis cache le splash après le délai minimal, une seule fois", () => {
    markAppReady();
    markAppReady(); // idempotent
    expect((globalThis as any).document.documentElement.classList.add).toHaveBeenCalledTimes(1);
    expect((globalThis as any).document.documentElement.classList.add).toHaveBeenCalledWith("app-ready");
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MIN_SPLASH_MS + 50);
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});

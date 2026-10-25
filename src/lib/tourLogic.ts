/**
 * Logique PURE de la visite guidée (aucun React ici) : position de la bulle, choix de l'élément mis en avant,
 * persistance du drapeau « visite vue » et décision de proposer ou non la visite. Testée dans tourLogic.test.ts.
 */

/** Clé de stockage local : numéro de version de la visite que l'utilisateur a déjà vue (absente = jamais vue). */
export const TOUR_SEEN_KEY = "kwawatt_tour_seen";

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
export interface Size {
  width: number;
  height: number;
}

// ───────────────────────── Persistance ─────────────────────────

type Reader = Pick<Storage, "getItem">;
type Writer = Pick<Storage, "setItem">;

/** Version de la visite déjà vue (0 si jamais vue ou si la valeur est illisible). Ne lève jamais d'exception. */
export function readTourSeen(storage: Reader): number {
  try {
    const n = Number.parseInt(storage.getItem(TOUR_SEEN_KEY) ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0; // stockage indisponible : on se comporte comme « jamais vue »
  }
}

/** Enregistre la version vue. Ne touche à AUCUNE autre clé (les données de l'utilisateur ne sont jamais modifiées). */
export function writeTourSeen(storage: Writer, version: number): void {
  try {
    storage.setItem(TOUR_SEEN_KEY, String(version));
  } catch {
    /* stockage plein ou indisponible : la visite sera simplement reproposée */
  }
}

export type TourOffer =
  /** Nouvel utilisateur : la visite démarre d'elle-même. */
  | "auto"
  /** Utilisateur existant après une mise à jour : on PROPOSE la visite (bandeau), on ne l'impose pas. */
  | "offer"
  /** Visite déjà vue mais le contenu a changé : on propose les nouveautés. */
  | "whatsnew"
  | "none";

/**
 * Faut-il montrer la visite ? Un utilisateur qui possède déjà des données n'est jamais interrompu : on lui propose.
 * Un utilisateur qui a terminé (ou refusé) la version courante n'est plus sollicité.
 */
export function decideTourOffer(input: { seenVersion: number; currentVersion: number; hasUserData: boolean }): TourOffer {
  const { seenVersion, currentVersion, hasUserData } = input;
  if (seenVersion >= currentVersion) return "none";
  if (seenVersion > 0) return "whatsnew";
  return hasUserData ? "offer" : "auto";
}

/** L'utilisateur a-t-il déjà saisi quelque chose ? Sert à ne pas interrompre un utilisateur existant par la visite. */
export function hasUserData(
  meters: ReadonlyArray<{ consumptions?: unknown[]; recharges?: unknown[]; emergencyCredits?: unknown[]; profile?: { meterNumber?: string } }>
): boolean {
  return meters.some(
    (m) => (m.consumptions?.length ?? 0) > 0 || (m.recharges?.length ?? 0) > 0 || (m.emergencyCredits?.length ?? 0) > 0 || (m.profile?.meterNumber ?? "").trim() !== ""
  );
}

// ───────────────────────── Progression ─────────────────────────

export const clampIndex = (index: number, total: number): number => (total <= 0 ? 0 : Math.min(Math.max(index, 0), total - 1));

/**
 * Identifiant de la « destination » d'une étape (onglet + action). Deux étapes consécutives de même destination
 * (ex. deux étapes dans la fenêtre d'import de SMS) ne relancent PAS la navigation : la fenêtre ne se ferme pas et ne
 * se rouvre pas. Chaîne vide = l'étape n'impose aucun onglet.
 */
export const navKey = (step: { tab?: string; intent?: unknown } | undefined): string => (step?.tab ? JSON.stringify([step.tab, step.intent ?? null]) : "");

// ───────────────────────── Cible ─────────────────────────

/** Un élément est utilisable s'il occupe de la place à l'écran (exclut display:none, ex. les variantes mobile / bureau). */
export function isElementVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * Premier élément VISIBLE trouvé en essayant les sélecteurs dans l'ordre. Plusieurs éléments peuvent porter le même
 * attribut (bouton « + » mobile et bouton « Ajouter » bureau) : seul celui qui est affiché compte.
 * Un sélecteur invalide est ignoré (il ne doit jamais faire échouer la visite).
 */
export function pickTarget(selectors: readonly string[] | undefined, root: ParentNode, visible: (el: Element) => boolean = isElementVisible): Element | null {
  for (const sel of selectors ?? []) {
    let found: NodeListOf<Element>;
    try {
      found = root.querySelectorAll(sel);
    } catch {
      continue;
    }
    for (const el of Array.from(found)) if (visible(el)) return el;
  }
  return null;
}

export const toRect = (r: { top: number; left: number; width: number; height: number }): Rect => ({
  top: r.top,
  left: r.left,
  width: r.width,
  height: r.height,
});

/** Zone mise en surbrillance : la cible élargie d'une marge, ramenée dans l'écran. */
export function spotlightRect(target: Rect, viewport: Size, pad = 6): Rect {
  const left = Math.max(0, target.left - pad);
  const top = Math.max(0, target.top - pad);
  const right = Math.min(viewport.width, target.left + target.width + pad);
  const bottom = Math.min(viewport.height, target.top + target.height + pad);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

// ───────────────────────── Position de la bulle ─────────────────────────

export type Placement = "top" | "bottom" | "center";

export interface PopoverPosition {
  top: number;
  left: number;
  placement: Placement;
  /** Abscisse (dans la bulle) de la pointe de la flèche ; null si pas de flèche (carte centrée). */
  arrowLeft: number | null;
}

export interface PositionOptions {
  /** Écart entre la cible et la bulle. */
  gap?: number;
  /** Marge minimale avec les bords de l'écran. */
  margin?: number;
  prefer?: "auto" | "top" | "bottom";
}

/**
 * Où poser la bulle autour de la cible, sans jamais sortir de l'écran.
 * – sans cible : carte centrée ;
 * – sinon dessous si ça tient (ou dessus si on le demande/si dessous ne tient pas), horizontalement centrée sur la cible
 *   puis ramenée dans l'écran ;
 * – ni dessus ni dessous (grande cible, petit écran) : la bulle est posée sur la zone la plus dégagée, sans flèche.
 */
export function computePopoverPosition(target: Rect | null, popover: Size, viewport: Size, options: PositionOptions = {}): PopoverPosition {
  const gap = options.gap ?? 14;
  const margin = options.margin ?? 12;
  const prefer = options.prefer ?? "auto";

  const maxLeft = Math.max(margin, viewport.width - popover.width - margin);
  const maxTop = Math.max(margin, viewport.height - popover.height - margin);
  const clampLeft = (v: number) => Math.min(Math.max(v, margin), maxLeft);
  const clampTop = (v: number) => Math.min(Math.max(v, margin), maxTop);

  if (!target) {
    return { top: clampTop((viewport.height - popover.height) / 2), left: clampLeft((viewport.width - popover.width) / 2), placement: "center", arrowLeft: null };
  }

  const spaceBelow = viewport.height - (target.top + target.height) - gap - margin;
  const spaceAbove = target.top - gap - margin;
  const fitsBelow = spaceBelow >= popover.height;
  const fitsAbove = spaceAbove >= popover.height;

  let placement: Placement | null = null;
  if (prefer === "top" && fitsAbove) placement = "top";
  else if (prefer === "bottom" && fitsBelow) placement = "bottom";
  else if (fitsBelow) placement = "bottom";
  else if (fitsAbove) placement = "top";

  const left = clampLeft(target.left + target.width / 2 - popover.width / 2);

  if (placement === null) {
    // Aucune place des deux côtés : on se pose sur la moitié d'écran opposée au centre de la cible, sans flèche
    const targetCenterY = target.top + target.height / 2;
    const top = targetCenterY > viewport.height / 2 ? margin : maxTop;
    return { top: clampTop(top), left, placement: "center", arrowLeft: null };
  }

  const top = placement === "bottom" ? target.top + target.height + gap : target.top - gap - popover.height;
  const arrowMin = 16;
  const arrowMax = Math.max(arrowMin, popover.width - 16);
  const arrowLeft = Math.min(Math.max(target.left + target.width / 2 - left, arrowMin), arrowMax);
  return { top: clampTop(top), left, placement, arrowLeft };
}

// ───────────────────────── Fermeture des fenêtres ouvertes ─────────────────────────

/**
 * Les fenêtres de l'application (tiroir, feuilles) se ferment avec Échap. Avant d'afficher une étape on envoie donc un
 * Échap SYNTHÉTIQUE, marqué pour que la visite elle-même ne le prenne pas pour une demande de fermeture.
 */
const SYNTHETIC = "__kwaTourSynthetic";
export function dismissOpenOverlays(target: Window = window): void {
  const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
  (ev as unknown as Record<string, boolean>)[SYNTHETIC] = true;
  target.dispatchEvent(ev);
}
export const isSyntheticEscape = (ev: Event): boolean => (ev as unknown as Record<string, boolean>)[SYNTHETIC] === true;

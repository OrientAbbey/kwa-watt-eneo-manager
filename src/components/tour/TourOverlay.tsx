import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNav } from "../../store/NavContext";
import { TOURS, type TourStep } from "../../lib/tourSteps";
import {
  clampIndex,
  computePopoverPosition,
  dismissOpenOverlays,
  isElementVisible,
  isSyntheticEscape,
  navKey,
  pickTarget,
  spotlightRect,
  toRect,
  type PopoverPosition,
  type Rect,
} from "../../lib/tourLogic";
import { cn } from "../../lib/utils";
import { useTour, type ActiveTour } from "./TourContext";

const POPOVER_MAX_WIDTH = 352;
const POLL_MS = 150;
/** Délai maximal pour qu'une cible apparaisse (changement d'onglet, ouverture d'une fenêtre) avant la carte centrée. */
const TARGET_WAIT_MS = 1500;

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/**
 * Suit l'élément à mettre en avant : il peut apparaître après un changement d'onglet ou l'ouverture d'une fenêtre, ou
 * bouger (animation d'arrivée de la vue, rotation de l'écran). Une mesure périodique légère couvre tous ces cas.
 * `settled` passe à vrai dès que la cible est trouvée, ou que le délai est dépassé (→ carte centrée).
 */
function useTargetRect(step: TourStep) {
  const [state, setState] = useState<{ rect: Rect | null; settled: boolean }>({ rect: null, settled: false });

  useEffect(() => {
    setState({ rect: null, settled: false });
    if (!step.targets?.length) {
      setState({ rect: null, settled: true });
      return;
    }
    let el: Element | null = null;
    const startedAt = Date.now();

    const measure = () => {
      const current = el && el.isConnected && isElementVisible(el) ? el : pickTarget(step.targets, document);
      if (!current) {
        el = null;
        if (Date.now() - startedAt > TARGET_WAIT_MS) setState((s) => (s.settled && s.rect === null ? s : { rect: null, settled: true }));
        return;
      }
      if (current !== el) {
        el = current;
        // Amène la cible dans la zone visible (instantané : la mesure suivante voit la position finale)
        (el as HTMLElement).scrollIntoView?.({ block: "center", inline: "nearest" });
      }
      const rect = toRect(el.getBoundingClientRect());
      setState((s) => (s.settled && sameRect(s.rect, rect) ? s : { rect, settled: true }));
    };

    measure();
    const timer = setInterval(measure, POLL_MS);
    return () => clearInterval(timer);
  }, [step]);

  return state;
}

const FOCUSABLE = "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export default function TourOverlay({ active }: { active: ActiveTour }) {
  const { next, prev, close } = useTour();
  const { activeTab, navigate } = useNav();

  const tour = TOURS[active.id];
  const total = tour.steps.length;
  const index = clampIndex(active.index, total);
  const step = tour.steps[index];
  const isLast = index === total - 1;

  // ── Navigation vers l'étape (onglet, action) sans casser les actions d'origine de l'application ──
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const lastNavKey = useRef<string | null>(null);

  useEffect(() => {
    const key = navKey(step);
    const sameDestination = lastNavKey.current !== null && key !== "" && key === lastNavKey.current;
    lastNavKey.current = key;
    if (sameDestination) return; // même onglet et même fenêtre que l'étape précédente : on ne touche à rien
    dismissOpenOverlays(); // ferme tiroir et feuilles laissés ouverts par l'étape précédente
    if (step.tab && (step.tab !== activeTabRef.current || step.intent)) navigate(step.tab, step.intent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // À la fin (terminée ou abandonnée) : on referme la fenêtre éventuellement ouverte par la visite
  useEffect(() => () => dismissOpenOverlays(), []);

  // ── Cible et position de la bulle ──
  const { rect, settled } = useTargetRect(step);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const spot = rect ? spotlightRect(rect, viewport) : null;
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!settled || !popRef.current) return;
    const size = { width: popRef.current.offsetWidth, height: popRef.current.offsetHeight };
    setPos(computePopoverPosition(spot, size, viewport, { prefer: step.placement ?? "auto" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, rect, viewport, step]);

  // ── Focus : sur la bulle à chaque étape ; restitué à la fermeture ──
  const previousFocus = useRef<Element | null>(document.activeElement);
  useEffect(() => {
    const el = previousFocus.current as HTMLElement | null;
    return () => {
      if (el && el.isConnected) el.focus?.({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    popRef.current?.focus({ preventScroll: true });
  }, [step]);

  // ── Clavier : Échap = quitter, flèches = naviguer, Tab reste dans la bulle ──
  const handlers = useRef({ next, prev, close, isLast, index });
  handlers.current = { next, prev, close, isLast, index };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isSyntheticEscape(e)) return;
      const h = handlers.current;
      if (e.key === "Escape") {
        e.preventDefault();
        h.close("skip");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (h.isLast) h.close("done");
        else h.next();
      } else if (e.key === "ArrowLeft" && h.index > 0) {
        e.preventDefault();
        h.prev();
      } else if (e.key === "Tab" && popRef.current) {
        const items: HTMLElement[] = Array.from(popRef.current.querySelectorAll(FOCUSABLE)) as HTMLElement[];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (e.shiftKey && (current === first || current === popRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && current === last) {
          e.preventDefault();
          first.focus();
        } else if (!popRef.current.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const body = settled && !rect && step.fallbackBody ? step.fallbackBody : step.body;
  const popWidth = Math.min(POPOVER_MAX_WIDTH, viewport.width - 24);
  const arrowOnTop = pos?.placement === "bottom";
  const arrowOnBottom = pos?.placement === "top";

  return (
    <div className="fixed inset-0 z-[300]" data-testid="tour-layer">
      {/* Fond : sans cible, voile uniforme ; avec cible, le « trou » est la zone mise en avant (ombre portée géante) */}
      {spot ? (
        <div
          data-testid="tour-spotlight"
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl ring-2 ring-orange-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.74)] transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/75" />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        data-placement={pos?.placement ?? "pending"}
        className={cn(
          "fixed rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          !pos && "invisible"
        )}
        style={{ width: popWidth, top: pos?.top ?? 0, left: pos?.left ?? 0 }}
      >
        {pos?.arrowLeft != null && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute h-3 w-3 rotate-45 bg-white dark:bg-slate-900",
              arrowOnTop && "-top-1.5 border-l border-t border-slate-200 dark:border-slate-700",
              arrowOnBottom && "-bottom-1.5 border-b border-r border-slate-200 dark:border-slate-700"
            )}
            style={{ left: pos.arrowLeft - 6 }}
          />
        )}

        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
          {tour.title} · étape {index + 1} sur {total}
        </p>
        <h2 id="tour-title" className="mt-1 text-lg font-bold leading-snug text-slate-900 dark:text-white">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {body}
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
          {tour.steps.map((s, i) => (
            <span key={s.id} className={cn("h-1.5 rounded-full transition-all motion-reduce:transition-none", i === index ? "w-5 bg-orange-500" : "w-1.5 bg-slate-300 dark:bg-slate-600")} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {isLast ? (
            <span />
          ) : (
            <button onClick={() => close("skip")} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Passer
            </button>
          )}
          <div className="flex gap-2">
            {index > 0 && (
              <button onClick={prev} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                Précédent
              </button>
            )}
            <button
              onClick={() => (isLast ? close("done") : next())}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              {isLast ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>

      {/* Annonce vocale du changement d'étape */}
      <div aria-live="polite" role="status" className="sr-only">
        Étape {index + 1} sur {total} : {step.title}
      </div>
    </div>
  );
}

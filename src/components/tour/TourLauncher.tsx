import React from "react";
import { PlayCircle, ChevronRight } from "lucide-react";
import { MINI_TOUR_IDS, TOURS } from "../../lib/tourSteps";
import { useTour } from "./TourContext";

/** Boutons pour (re)lancer la visite complète et les mini-visites par thème. Utilisé dans « À propos » et « Paramètres ». */
export default function TourLauncher() {
  const { start } = useTour();
  return (
    <div className="space-y-3">
      <button
        onClick={() => start("main")}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
      >
        <PlayCircle size={20} /> Revoir la présentation
      </button>
      <ul className="space-y-2" aria-label="Visites par thème">
        {MINI_TOUR_IDS.map((id) => (
          <li key={id}>
            <button
              onClick={() => start(id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-slate-800 dark:text-slate-100">{TOURS[id].title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{TOURS[id].summary}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-slate-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

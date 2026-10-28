import React, { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { TOUR_VERSION } from "../../lib/tourSteps";
import { decideTourOffer, hasUserData, readTourSeen, type TourOffer } from "../../lib/tourLogic";
import { useTour } from "./TourContext";

/** Délai avant le démarrage automatique : laisse l'interface se poser et l'invite de notifications se résoudre. */
const AUTO_START_DELAY_MS = 800;

/**
 * Décide, UNE fois à l'ouverture de l'interface (après connexion), de ce qu'il faut faire de la visite :
 *  – nouvel utilisateur : démarrage automatique (une seule fois) ;
 *  – utilisateur existant après mise à jour : bandeau de PROPOSITION, jamais imposée, ses données ne sont pas touchées ;
 *  – visite déjà vue : rien.
 */
export default function TourGate() {
  const { state } = useApp();
  const { start, markSeen } = useTour();
  const [offer, setOffer] = useState<TourOffer>(() =>
    decideTourOffer({ seenVersion: readTourSeen(localStorage), currentVersion: TOUR_VERSION, hasUserData: hasUserData(state.meters) })
  );
  const [bannerOpen, setBannerOpen] = useState(true);

  useEffect(() => {
    if (offer === "auto") {
      const t = setTimeout(() => {
        start("main"); // mémorise aussi « vue » : on ne l'impose qu'une fois
        setOffer("none");
      }, AUTO_START_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (offer === "offer" || offer === "whatsnew") markSeen(); // proposée une fois : on ne harcèle pas à chaque ouverture
  }, [offer, start, markSeen]);

  if ((offer !== "offer" && offer !== "whatsnew") || !bannerOpen) return null;

  const whatsNew = offer === "whatsnew";
  return (
    <div
      role="region"
      aria-label="Visite guidée"
      className="fixed inset-x-3 top-[4.5rem] z-[60] rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl dark:border-indigo-900 dark:bg-slate-900 md:inset-x-auto md:right-8 md:top-24 md:w-96"
    >
      <button onClick={() => setBannerOpen(false)} aria-label="Fermer" className="absolute right-2 top-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
        <X size={16} />
      </button>
      <p className="flex items-center gap-2 pr-6 font-bold text-slate-900 dark:text-white">
        <Sparkles size={18} className="shrink-0 text-orange-500" />
        {whatsNew ? "La visite guidée a évolué" : "Nouveau : une visite guidée"}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {whatsNew ? "Découvrez les nouveautés en une minute." : "Découvrez les fonctions de l'application en une minute."} Vous pourrez la revoir dans Aide → À propos.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            setBannerOpen(false);
            start("main");
          }}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
        >
          Voir la visite
        </button>
        <button onClick={() => setBannerOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          Non merci
        </button>
      </div>
    </div>
  );
}

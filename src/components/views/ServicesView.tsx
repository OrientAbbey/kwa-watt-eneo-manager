import React, { useEffect } from "react";
import { useNav } from "../../store/NavContext";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import QuickRechargeCard from "../features/QuickRechargeCard";
import EmergencyCreditCard from "../features/EmergencyCreditCard";
import MeterCodesCard from "../features/MeterCodesCard";
import TidDiagnosticCard from "../features/TidDiagnosticCard";
import InvoiceChannelCard from "../features/InvoiceChannelCard";
import OutagesCard from "../features/OutagesCard";

/** Tout ce qui est propre au compteur prépayé et à l'opérateur, réuni en un seul onglet. */
export default function ServicesView() {
  const { consumeIntent, navigate } = useNav();
  const { brand } = useRemoteConfig();

  useEffect(() => {
    const intent = consumeIntent();
    if (intent?.type === "focus") {
      // Laisse le temps au rendu avant de faire défiler jusqu'à la carte demandée
      const t = setTimeout(() => document.getElementById(intent.section)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Services compteur</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recharge, crédit d'urgence, codes du compteur et démarches auprès de {brand}.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <QuickRechargeCard />
          <EmergencyCreditCard />
          <InvoiceChannelCard />
          <OutagesCard />
        </div>
        <div className="space-y-6">
          <MeterCodesCard />
          <TidDiagnosticCard />
          <button
            onClick={() => navigate("help", { type: "focus", section: "useful-links" })}
            className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <p className="font-semibold text-slate-800 dark:text-slate-100">Guides et liens utiles</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sites officiels, procédures MTN / Orange, frais de paiement : dans l'onglet Aide →</p>
          </button>
        </div>
      </div>
    </div>
  );
}

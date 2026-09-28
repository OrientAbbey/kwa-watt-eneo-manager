import React from "react";
import { Smartphone, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import CopyableValue from "../ui/CopyableValue";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import { telHref } from "../../lib/contact";
import { useApp } from "../../store/AppContext";
import { useNav } from "../../store/NavContext";
import { MONETARY_UNIT } from "../../lib/utils";

/** Raccourcis de recharge : ouvre le composeur avec le bon code USSD déjà saisi. */
export default function QuickRechargeCard({ compact = false }: { compact?: boolean }) {
  const { config } = useRemoteConfig();
  const { currentMeter } = useApp();
  const { navigate } = useNav();
  const meterNumber = currentMeter.profile.meterNumber;

  const operators = [
    { id: "mtn", name: "MTN Mobile Money", code: config.ussd.mtnMenu, hint: "Puis « Payer factures » → Eneo", cls: "bg-yellow-400 hover:bg-yellow-500 text-slate-900" },
    { id: "orange", name: "Orange Money", code: config.ussd.orangeRecharge, hint: "Recharge de compteur prépayé", cls: "bg-orange-500 hover:bg-orange-600 text-white" },
  ];

  return (
    <Card id="quick-recharge">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><Smartphone size={20} className="mr-2 text-emerald-600" /> Recharger mon compteur</CardTitle>
        {!compact && <p className="text-sm text-slate-500 dark:text-slate-400">Le code s'ouvre directement dans le composeur de votre téléphone.</p>}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {operators.map((op) => (
            <ExternalLink key={op.id} href={telHref(op.code)} showIcon={false} className={`justify-center flex-col py-3 px-4 rounded-xl font-bold text-center transition-colors ${op.cls}`}>
              <span>{op.name}</span>
              <span className="font-mono text-sm opacity-90">{op.code}</span>
            </ExternalLink>
          ))}
        </div>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
          {operators.map((op) => <li key={op.id}><strong>{op.name.split(" ")[0]}</strong> : {op.hint}</li>)}
        </ul>

        <div className="flex items-start gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3 text-xs text-indigo-900 dark:text-indigo-200">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            <strong>Achat minimum : {config.minRechargeAmount.toLocaleString("fr-FR")} {MONETARY_UNIT}.</strong> Les kWh reçus dépendent de votre tranche (moyenne des 6 derniers mois).
            Gardez le SMS de confirmation : sa référence de transaction vous servira en cas de réclamation.
          </p>
        </div>

        {meterNumber ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            Votre n° de compteur : <CopyableValue value={meterNumber} label="N° de compteur" className="font-semibold text-indigo-700 dark:text-indigo-400" />
          </p>
        ) : (
          <button onClick={() => navigate("profile")} className="text-xs text-indigo-600 underline">
            Renseignez votre numéro de compteur pour le copier ici en un geste
          </button>
        )}

        <button
          onClick={() => navigate("history", { type: "paste-sms" })}
          className="w-full text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 py-2.5 rounded-xl transition-colors"
        >
          Enregistrer la recharge à partir du SMS reçu
        </button>
      </CardContent>
    </Card>
  );
}

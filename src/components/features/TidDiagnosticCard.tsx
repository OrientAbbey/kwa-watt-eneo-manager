import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import { useApp } from "../../store/AppContext";
import { useNav } from "../../store/NavContext";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import { Sts873, TID_STEPS, assessTid } from "../../lib/tid";
import { cn } from "../../lib/utils";

/** « Mon compteur est-il concerné par la mise à jour TID ? » : diagnostic guidé par le code 873. */
export default function TidDiagnosticCard() {
  const { currentMeter } = useApp();
  const { navigate } = useNav();
  const { config } = useRemoteConfig();
  const [answer, setAnswer] = useState<Sts873>("unknown");
  const installYear = currentMeter.profile.installYear;
  const result = assessTid(answer, installYear);
  const link = config.links.find((l) => l.id === "tid");

  const tone =
    result.verdict === "done" || result.verdict === "unlikely"
      ? { box: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200", icon: <ShieldCheck size={22} className="text-emerald-600" /> }
      : result.verdict === "todo" || result.verdict === "likely"
        ? { box: "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900 text-orange-900 dark:text-orange-200", icon: <ShieldAlert size={22} className="text-orange-500" /> }
        : { box: "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200", icon: <ShieldQuestion size={22} className="text-slate-400" /> };

  const options: { value: Sts873; label: string }[] = [
    { value: "01", label: "Le compteur affiche 01" },
    { value: "02", label: "Le compteur affiche 02" },
    { value: "unknown", label: "Je n'ai pas encore vérifié" },
  ];

  return (
    <Card id="tid-diagnostic">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><ShieldCheck size={20} className="mr-2 text-indigo-600" /> Mise à jour TID du compteur</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Une partie des compteurs prépayés doit être mise à jour : sans cela, les nouvelles recharges peuvent être refusées.
          Tapez <span className="font-mono font-bold">873</span> sur le clavier du compteur et dites-nous ce qui s'affiche.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Résultat du code 873">
          {options.map((o) => (
            <button
              key={o.value}
              role="radio"
              aria-checked={answer === o.value}
              onClick={() => setAnswer(o.value)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors text-left sm:text-center",
                answer === o.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className={cn("flex items-start gap-3 rounded-xl border p-4", tone.box)}>
          <div className="shrink-0 mt-0.5">{tone.icon}</div>
          <div>
            <p className="font-bold text-sm">{result.title}</p>
            <p className="text-xs mt-1 opacity-90">{result.message}</p>
          </div>
        </div>

        {answer === "unknown" && !installYear && (
          <button onClick={() => navigate("profile")} className="text-xs text-indigo-600 underline">
            Indiquez l'année de pose de votre compteur (profil) pour affiner le diagnostic
          </button>
        )}

        {(result.verdict === "todo" || result.verdict === "likely") && (
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Procédure</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {TID_STEPS.map((step) => <li key={step}>{step}</li>)}
            </ol>
            {link && (
              <ExternalLink href={link.url} className="mt-3 text-sm font-medium text-indigo-600 hover:underline">
                Procédure officielle détaillée
              </ExternalLink>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
